/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 VMware, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 Andy Clement (VMware) - initial API and implementation
 *	 Andrew Eisenberg (VMware) - implemented visitor pattern
 *   IBM Corporation - Various improvements
 ******************************************************************************/

/*global esprima doctrine*/
/*jslint amd:true*/
define([
	'javascript/contentAssist/typeEnvironment', 
	'javascript/contentAssist/typeInference', 
	'javascript/contentAssist/typeUtils', 
	'javascript/contentAssist/proposalUtils', 
	'orion/Deferred',
	'orion/objects',
	'esprima',
	'estraverse'
], function(typeEnv, typeInf, typeUtils, proposalUtils, Deferred, Objects, Esprima, Estraverse) {

	/**
	 * @description Convert an array of parameters into a string and also compute linked editing positions
	 * @param {String} name The name of the function
	 * @param {Object} typeObj The type object of the function
	 * @param {Number} offset The offset into the source
	 * @return {Object} The function proposal object
	 */
	function calculateFunctionProposal(name, typeObj, offset) {
		var params = typeObj.params || [];
		var positions = [];
		var completion = name + '(';
		var plen = params.length;
		for (var p = 0; p < plen; p++) {
			if (params[p].name === 'new' || params[p].name === 'this') {
				continue;
			}
			if (p > 0) {
				completion += ', ';
			}
			var param = params[p];
			var optional, rest;
			if (param.type === 'OptionalType') {
				param = param.expression;
				optional=true;
			}

			if (param.type === 'RestType') {
				param = param.expression;
				rest = true;
			}

			var argName = param.name || 'arg' + p;
			if (rest) {
				argName = '...' + argName;
			}
			if (optional) {
				argName = '[' + argName + ']';
			}
			positions.push({offset:offset+completion.length+1, length: argName.length});
			completion += argName;
		}
		completion += ')';
		return {completion: completion, positions: positions.length === 0 ? null : positions};
	}

	/**
	 * @description Determines if we should bother visiting the AST to compute proposals
	 * @param {Object} ast The backing AST to visit
	 * @param {Number} offset The offset into the source
	 * @param {String} prefix The text prefix to complete on
	 * @param {String} contents The text of the file
	 * @return {Object} Returns the deferred node and the completion kind 
	 */
	function shouldVisit(ast, offset, prefix, contents) {
		var parents = [];
		Estraverse.traverse(ast, {
			skipped: false,
			enter: function(node) {
				this.skipped = false;
				// extras prop is where we stuff everything that we have added
				if (!node.extras) {
					node.extras = {};
				}
				// the program node is always in range even if the range numbers do not line up
				if ((node.range && proposalUtils.inRange(offset-1, node.range)) || 
					node.type === Estraverse.Syntax.Program) {
					if (node.type === Estraverse.Syntax.Identifier) {
						return Estraverse.VisitorOption.Break;
					}
					parents.push(node);
					if ((node.type === Estraverse.Syntax.FunctionDeclaration || 
							node.type === Estraverse.Syntax.FunctionExpression) &&
							node.nody && proposalUtils.isBefore(offset, node.body.range)) {
						// completion occurs on the word "function"
						return Estraverse.VisitorOption.Break;
					}
					// special case where we are completing immediately after a '.'
					if (node.type === Estraverse.Syntax.MemberExpression && 
							!node.property && proposalUtils.afterDot(offset, node, contents)) {
						return Estraverse.VisitorOption.Break;
					}
				} else {
					this.skipped = true;
					return Estraverse.VisitorOption.Skip;
				}
			},
			leave: function(node) {
				if(!this.skipped) {
					// if we have reached the end of an inRange block expression then
					// this means we are completing on an empty expression
					if (node.type === Estraverse.Syntax.Program || (node.type === Estraverse.Syntax.BlockStatement) &&
							proposalUtils.inRange(offset, node.range)) {
								return Estraverse.VisitorOption.Break;
					}
					parents.pop();
				}
			}
		});

		// determine if we need to defer infering the enclosing function block
		var toDefer;
		if (parents && parents.length) {
			var parent = parents.pop();
			for (var i = 0; i < parents.length; i++) {
				if ((parents[i].type === Estraverse.Syntax.FunctionDeclaration || 
						parents[i].type === Estraverse.Syntax.FunctionExpression) &&
						!(parents[i].id && proposalUtils.inRange(offset, parents[i].id.range, true))) {
					toDefer = parents[i];
					break;
				}
			}
			switch(parent.type) {
				case Estraverse.Syntax.MemberExpression: 
					if (parent.property && proposalUtils.inRange(offset-1, parent.property.range)) {
						// on the right hand side of a property, eg: foo.b^
						return { kind : "member", toDefer : toDefer };
					} else if (proposalUtils.inRange(offset-1, parent.range) && proposalUtils.afterDot(offset, parent, contents)) {
						// on the right hand side of a dot with no text after, eg: foo.^
						return { kind : "member", toDefer : toDefer };
					}
					break
				case Estraverse.Syntax.Program:
				case Estraverse.Syntax.BlockStatement:
					// completion at a new expression
					if (!prefix) {
					}
					break;
				case Estraverse.Syntax.VariableDeclarator:
					if(!parent.init || proposalUtils.isBefore(offset, parent.init.range)) {
						return null;
					}
					break;
				case Estraverse.Syntax.FunctionDeclaration:
				case Estraverse.Syntax.FunctionExpression:
					if(proposalUtils.isBefore(offset, parent.body.range)) {
						return true;						
					}
					break;
			}
		}
		return { kind : "top", toDefer : toDefer };
	}

	/**
	 * @description Extracts all doccomments that fall inside the given range.
	 * Side effect is to remove the array elements
	 * @param Array.<{range:Array.<Number}>> doccomments
	 * @param Array.<Number> range
	 * @return {{value:String,range:Array.<Number>}} array elements that are removed
	 */
	function extractDocComments(doccomments, range) {
		var start = 0, end = 0, i, docStart, docEnd;
		for (i = 0; i < doccomments.length; i++) {
			docStart = doccomments[i].range[0];
			docEnd = doccomments[i].range[1];
			if (!proposalUtils.isBefore(docStart, range) || !proposalUtils.isBefore(docEnd, range)) {
				break;
			}
		}
		if (i < doccomments.length) {
			start = i;
			for (i = i; i < doccomments.length; i++) {
				docStart = doccomments[i].range[0];
				docEnd = doccomments[i].range[1];
				if (!proposalUtils.inRange(docStart, range, true) || !proposalUtils.inRange(docEnd, range, true)) {
					break;
				}
			}
			end = i;
		}
		return doccomments.splice(start, end-start);
	}

	/**
	 * @description Create the description portion of the proposal
	 * @private
	 * @param {Object} propType The type description
	 * @param {Object} env The currently computed type environment
	 * @returns {String} the description for the proposal
	 */
	function createProposalDescription(propType, env) {
		switch(propType.type) {
			case 'FunctionType':
				if(propType.result && propType.result.type === "UndefinedLiteral") {
					return "";
				}
				break;
		}
		return " : " + typeUtils.createReadableType(propType, env);
	}

	/**
	 * @description Create the array of inferred proposals
	 * @param {String} targetTypeName The name of the type to find
	 * @param {Object} env The backing type environment
	 * @param {String} completionKind The kind of the completion
	 * @param {String} prefix The start of the expression to complete
	 * @param {Number} replaceStart The offset into the source where to start the completion
	 * @param {Object} proposals The object that attach computed proposals to
	 * @param {Number} relevance The ordering relevance of the proposals
	 */
	function createInferredProposals(targetTypeName, env, completionKind, prefix, replaceStart, proposals, relevance) {
		var prop, propTypeObj, propName, res, type = env.lookupQualifiedType(targetTypeName), proto = type.$$proto;
		if (!relevance) {
			relevance = 100;
		}
		// start at the top of the prototype hierarchy so that duplicates can be removed
		if (proto) {
			createInferredProposals(proto.typeObj.name, env, completionKind, prefix, replaceStart, proposals, relevance - 10);
		}

		// add a separator proposal
		proposals['---dummy' + relevance] = {
			proposal: '',
			name: '',
			description: '---------------------------------',
			relevance: relevance -1,
			style: 'hr',
			unselectable: true
		};

		// need to look at prototype for global and window objects
		// so need to traverse one level up prototype hierarchy if
		// the next level is not Object
		var realProto = Object.getPrototypeOf(type);
		var protoIsObject = !Object.getPrototypeOf(realProto);
		for (prop in type) {
			if (type.hasOwnProperty(prop) || (!protoIsObject && realProto.hasOwnProperty(prop))) {
				if (prop.charAt(0) === "$" && prop.charAt(1) === "$") {
					// special property
					continue;
				}
				if (!proto && prop.indexOf("$_$") === 0) {
					// no prototype that means we must decode the property name
					propName = prop.substring(3);
				} else {
					propName = prop;
				}
				if (propName === "this" && completionKind === "member") {
					// don't show "this" proposals for non-top-level locations
					// (eg- this.this is wrong)
					continue;
				}
				if (!type[prop].typeObj) {
					// minified files sometimes have invalid property names (eg- numbers).  Ignore them)
					continue;
				}
				if (proposalUtils.looselyMatches(prefix, propName)) {
					propTypeObj = type[prop].typeObj;
					// if propTypeObj is a reference to a function type,
					// extract the actual function type
					if ((env._allTypes[propTypeObj.name]) && (env._allTypes[propTypeObj.name].$$fntype)) {
						propTypeObj = env._allTypes[propTypeObj.name].$$fntype;
					}
					if (propTypeObj.type === 'FunctionType') {
						res = calculateFunctionProposal(propName,
								propTypeObj, replaceStart - 1);
						proposals["$"+propName] = {
							proposal: res.completion,
							name: res.completion,
							description: createProposalDescription(propTypeObj, env),
							positions: res.positions,
							escapePosition: replaceStart + res.completion.length,
							// prioritize methods over fields
							relevance: relevance + 5,
							style: 'emphasis',
							overwrite: true
						};
					} else {
						proposals["$"+propName] = {
							proposal: propName,
							relevance: relevance,
							name: propName,
							description: createProposalDescription(propTypeObj, env),
							style: 'emphasis',
							overwrite: true
						};
					}
				}
			}
		}
	}

	function createNoninferredProposals(environment, prefix, replaceStart, proposals) {
		var proposalAdded = false;
		// a property to return is one that is
		//  1. defined on the type object
		//  2. prefixed by the prefix
		//  3. doesn't already exist
		//  4. is not an internal property
		function isInterestingProperty(type, prop) {
			return type.hasOwnProperty(prop) && prop.indexOf(prefix) === 0 && !proposals['$' + prop] && prop !== '$$proto'&& prop !== '$$isBuiltin' &&
			prop !== '$$fntype' && prop !== '$$newtype' && prop !== '$$prototype';
		}
		function forType(type) {
			for (var prop in type) {
				if (isInterestingProperty(type, prop)) {
					var propType = type[prop].typeObj;
					if (propType.type === 'FunctionType') {
						var res = calculateFunctionProposal(prop, propType, replaceStart - 1);
						proposals[prop] = {
							proposal: res.completion.substring(prefix.length),
							name: prop,
							description: createProposalDescription(propType, environment),
							positions: res.positions,
							escapePosition: replaceStart + res.completion.length,
							// prioritize methods over fields
							relevance: -99,
							style: 'noemphasis'
						};
						proposalAdded = true;
					} else {
						proposals[prop] = {
							proposal: prop.substring(prefix.length),
							name: prop,
							description: createProposalDescription(propType, environment),
							relevance: -100,
							style: 'noemphasis'
						};
						proposalAdded = true;
					}
				}
			}
		}
		var allTypes = environment.getAllTypes();
		for (var typeName in allTypes) {
			// need to traverse into the prototype
			if (allTypes[typeName].$$proto) {
				forType(allTypes[typeName]);
			}
		}

		if (proposalAdded) {
			proposals['---dummy'] = {
				proposal: '',
				name: '',
				description: 'Non-inferred proposals',
				relevance: -98,
				style: 'noemphasis',
				unselectable: true
			};
		}
	}

	function visitTypeStructure(typeObj, operation) {
		if (typeof typeObj !== 'object') {
			return;
		}
		switch (typeObj.type) {
			case 'NullableLiteral':
			case 'AllLiteral':
			case 'NullLiteral':
			case 'UndefinedLiteral':
			case 'VoidLiteral':
				// leaf nodes
				return;
			case 'NameExpression':
				operation(typeObj, operation);
				return;
			case 'ArrayType':
				visitTypeStructure(typeObj.expression, operation);
				// fall-through
			case 'UnionType':
				if (typeObj.elements) {
					typeObj.elements.forEach(function(elt) { visitTypeStructure(elt, operation); });
				}
				return;
			case 'RecordType':
				if (typeObj.fields) {
					typeObj.fields.forEach(function(elt) { visitTypeStructure(elt, operation); });
				}
				return;
			case 'FieldType':
				visitTypeStructure(typeObj.expression, operation);
				return;
			case 'FunctionType':
				// do we need to check for serialized functions???
				if (typeObj.params) {
					typeObj.params.forEach(function(elt) { visitTypeStructure(elt, operation); });
				}
				if (typeObj.result) {
					visitTypeStructure(typeObj.result, operation);
				}
				return;
			case 'ParameterType':
				// TODO FIXADE uncomment to make the size of summaries smaller
				// by not including parameter types in summary.
//				typeObj.expression = { name: 'Object', type: 'NameExpression' };
				visitTypeStructure(typeObj.expression, operation);
				return;

			case 'TypeApplication':
				if (typeObj.applications) {
					typeObj.applications.forEach(function(elt) { visitTypeStructure(elt, operation); });
				}
				// fall-through
			case 'RestType':
			case 'NonNullableType':
			case 'OptionalType':
			case 'NullableType':
				visitTypeStructure(typeObj.expression, operation);
				return;
		}
	}

	// finds unreachable types from the given type name
	// and marks them as already seen
	function findUnreachable(currentTypeName, allTypes, alreadySeen) {
		var currentType = allTypes[currentTypeName];
		var operation = function(typeObj, operation) {
			if (alreadySeen[typeObj.name]) {
				// prevent infinite recursion for circular refs
				return;
			}
			alreadySeen[typeObj.name] = true;
			findUnreachable(typeObj.name, allTypes, alreadySeen);
		};
		if (currentType) {
			for(var prop in currentType) {
				if (currentType.hasOwnProperty(prop) && prop !== '$$isBuiltin' ) {
					var propType = prop === '$$fntype' ? currentType[prop] : currentType[prop].typeObj;
					// don't count $$newtype as keeping a type reachable, since we inline function types
					if (prop === '$$newtype') { continue; }
					// must visit the type strucutre
					visitTypeStructure(propType, operation);
				}
			}
		}
	}

	/**
	 * Before we can remove empty objects from the type graph, we need to update
	 * the properties currently pointing to those types.  Make them point to the
	 * closest non-empty type in their prototype hierarchy (most likely, this is Object).
	 */
	function fixMissingPointers(currentTypeObj, allTypes, empties, alreadySeen) {
		alreadySeen = alreadySeen || {};
		var operation = function(typeObj, operation) {
			while (empties[typeObj.name]) {
				// change this to the first non-epty prototype of the empty type
				typeObj.name = allTypes[typeObj.name].$$proto.typeObj.name;
				if (!typeObj.name) {
					typeObj.name = 'Object';
				}
			}
			if (alreadySeen[typeObj.name]) {
				return;
			}
			alreadySeen[typeObj.name] = true;
			var currentType = allTypes[typeObj.name];
			if (currentType) {
				for(var prop in currentType) {
					if (currentType.hasOwnProperty(prop) && prop !== '$$isBuiltin' ) {
						var propType = prop === '$$fntype' ? currentType[prop] : currentType[prop].typeObj;
						// must visit the type strucutre
						visitTypeStructure(propType, operation);
					}
				}
			}
		};

		visitTypeStructure(currentTypeObj, operation);
	}

	/**
	 * Is typeObj a reference to a function type?
	 */
	function fnTypeRef(typeObj, allTypes) {
		return typeObj.type === "NameExpression" &&
			allTypes[typeObj.name] && allTypes[typeObj.name].$$fntype;
	}

	/**
	 * Inline all the function types referenced from the function type
	 * def, by replacing references to object types with a $$fntype
	 * property to the value of the $$fntype property
	 */
	function inlineFunctionTypes(def,allTypes,fnTypes) {
		if (def.params) {
			for (var i = 0; i < def.params.length; i++) {
				var paramType = def.params[i];
				if (fnTypeRef(paramType, allTypes)) {
					if (fnTypes) { fnTypes[paramType.name] = true; }
					inlineFunctionTypes(allTypes[paramType.name].$$fntype,allTypes,fnTypes);
					def.params[i] = allTypes[paramType.name].$$fntype;
				}
			}
		}
		if (def.result) {
			if (fnTypeRef(def.result, allTypes)) {
				if (fnTypes) { fnTypes[def.result.name] = true; }
				inlineFunctionTypes(allTypes[def.result.name].$$fntype,allTypes,fnTypes);
				def.result = allTypes[def.result.name].$$fntype;
			}
		}
	}

	/**
	 * filters types from the environment that should not be exported
	 */
	function filterTypes(environment, kind, moduleTypeObj, provided) {
		var moduleTypeName = doctrine.type.stringify(moduleTypeObj, {compact: true});
		var allTypes = environment.getAllTypes();
		allTypes.clearDefaultGlobal();


		// recursively walk the type tree to find unreachable types and delete them, too
		var reachable = { };
		var wasReachable = true;
		if (moduleTypeObj.type !== "NameExpression") {
			// TODO FIXADE duplicated code
			visitTypeStructure(moduleTypeObj, function(typeObj, operation) {
				if (reachable[typeObj.name]) {
					// prevent infinite recursion for circular refs
					return;
				}
				reachable[typeObj.name] = true;
				findUnreachable(typeObj.name, allTypes, reachable);
			});
		} else {
			// first remove any types that are unreachable
			findUnreachable(moduleTypeName, allTypes, reachable);
			if (!reachable[moduleTypeName]) {
				// not really reachable, but need to keep it for now to track empties
				reachable[moduleTypeName] = true;
				wasReachable = false;
			}
		}
		for (var prop in allTypes) {
			if (allTypes.hasOwnProperty(prop) && !reachable[prop]) {
				delete allTypes[prop];
			}
		}

		// now find empty types
		var empties = {};
		Object.keys(allTypes).forEach(function(key) {
			if (typeUtils.isEmpty(key, allTypes)) {
				empties[key] = true;
			}
		});
		// now fix up pointers to empties
		fixMissingPointers(moduleTypeObj, allTypes, empties);

		if (!wasReachable) {
			delete allTypes[moduleTypeName];
		}
		// don't need the empty types any more
		Object.keys(empties).forEach(function(key) {
			delete allTypes[key];
		});

		// for now, we delete *all* object types representing functions,
		// "inlining" the function type wherever it appears
		// TODO devise a serialized representation for function types with
		// properties
		var fnTypes = {};

		// now reformat the types so that they are combined and serialized
		Object.keys(allTypes).forEach(function(typeName) {
		    var type = allTypes[typeName];
			for (var defName in type) {
				if (type.hasOwnProperty(defName)) {
					var def = type[defName];
					if (defName === '$$fntype') {
						// here, we still need to "inline" function types for parameters
						// and result
						// TODO make this a visitor?
						inlineFunctionTypes(def, allTypes, fnTypes);
					} else {
						var typeObj = def.typeObj;
						if (fnTypeRef(typeObj, allTypes)) {
							fnTypes[typeObj.name] = true;
							typeObj = allTypes[typeObj.name].$$fntype;
						}
						def.typeSig = doctrine.type.stringify(typeObj, {compact: true});
						delete def._typeObj;
					}
				}
			}
		});

		if (typeof provided === 'object') {
			for (var defName in provided) {
				if (provided.hasOwnProperty(defName)) {
					var def = provided[defName];
					if (defName === '$$fntype') {
						inlineFunctionTypes(def, allTypes, fnTypes);
					} else {
						if (def.typeObj) {
							var typeObj = def.typeObj;
							if (fnTypeRef(typeObj, allTypes)) {
								fnTypes[typeObj.name] = true;
								typeObj = allTypes[typeObj.name].$$fntype;
							}
							def.typeSig = doctrine.type.stringify(typeObj, {compact: true});
							delete def._typeObj;
						}
					}
				}
			}
		}

		// finally, delete all function types
		Object.keys(fnTypes).forEach(function(key) {
			delete allTypes[key];
		});

	}

	var browserRegExp = /browser\s*:\s*true/;
	var nodeRegExp = /node\s*:\s*true/;
	var amdRegExp = /amd\s*:\s*true/;
	function findGlobalObject(comments, lintOptions) {

		for (var i = 0; i < comments.length; i++) {
			var comment = comments[i];
			if (comment.type === "Block" && (comment.value.substring(0, "jslint".length) === "jslint" ||
											  comment.value.substring(0,"jshint".length) === "jshint")) {
				// the lint options section.  now look for the browser or node
				if (comment.value.match(browserRegExp) || comment.value.match(amdRegExp)) {
					return "Window";
				} else if (comment.value.match(nodeRegExp)) {
					return "Module";
				} else {
					return "Global";
				}
			}
		}
		if (lintOptions && lintOptions.options) {
			if (lintOptions.options.browser === true) {
				return "Window";
			} else if (lintOptions.options.node === true) {
				return "Module";
			}
		}
		return "Global";
	}

	function filterAndSortProposals(proposalsObj) {
		// convert from object to array
		var proposals = [];
		for (var prop in proposalsObj) {
			if (proposalsObj.hasOwnProperty(prop)) {
				proposals.push(proposalsObj[prop]);
			}
		}
		proposals.sort(function(l,r) {
			// sort by relevance and then by name
			if (l.relevance > r.relevance) {
				return -1;
			} else if (r.relevance > l.relevance) {
				return 1;
			}

			var ldesc = l.name.toLowerCase();
			var rdesc = r.name.toLowerCase();
			if (ldesc < rdesc) {
				return -1;
			} else if (rdesc < ldesc) {
				return 1;
			}
			return 0;
		});

		// filter trailing and leading dummies, as well as double dummies
		var toRemove = [];

		// now remove any leading or trailing dummy proposals as well as double dummies
		var i = proposals.length -1;
		while (i >= 0 && proposals[i].description.indexOf('---') === 0) {
			toRemove[i] = true;
			i--;
		}
		i = 0;
		while (i < proposals.length && proposals[i].description.indexOf('---') === 0) {
			toRemove[i] = true;
			i++;
		}
		i += 1;
		while (i < proposals.length) {
			if (proposals[i].description.indexOf('---') === 0 && proposals[i-1].description.indexOf('---') === 0) {
				toRemove[i] = true;
			}
			i++;
		}

		var newProposals = [];
		for (i = 0; i < proposals.length; i++) {
			if (!toRemove[i]) {
				newProposals.push(proposals[i]);
			}
		}

		return newProposals;
	}


	/**
	 * @description Creates a new JSContentAssist object
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager An AST manager to create ASTs with
	 * @param {Object} [indexer] An indexer to load / work with supplied indexes
	 * @param {Object} lintOptions the given jslint options from the source
	 */
	function JSContentAssist(astManager, indexer, lintOptions) {
		this.astManager = astManager;
		this.indexer = indexer;
		this.lintOptions = lintOptions;
	}

	/**
	 * Main entry point to provider
	 */
	Objects.mixin(JSContentAssist.prototype, {

		/**
		 * @description Implements the Orion content assist API v4.0
		 */
		computeContentAssist: function(editorContext, params) {
			var self = this;
			return Deferred.all([
				this.astManager.getAST(editorContext),
				editorContext.getText(), // TODO Can we avoid getText() here? The AST should have all we need.
				this._createIndexData(editorContext, params)
			]).then(function(results) {
				var ast = results[0], buffer = results[1];
				return self._computeProposalsFromAST(ast, buffer, params);
			});
		},
		/**
		 * Reshapes typedefs into the expected format, sets up indexData
		 * @returns {orion.Promise}
		 */
		_createIndexData: function(editorContext, context) {
			if (!this.indexer) {
				// No need to load indexes
				return new Deferred().resolve();
			}
			if (!this.indexDataPromise) {
				var self = this;
				var defs = context.typeDefs || {}, promises = [];
				Object.keys(defs).forEach(function(id) {
					var props = defs[id];
					if (props.type === "tern") {
						promises.push(editorContext.getTypeDef(id));
					}
				});
				this.indexDataPromise = Deferred.all(promises).then(function(typeDefs) {
					self.indexer.setIndexData(typeDefs);
					return self.indexData;
				});
			}
			return this.indexDataPromise;
		},
		_computeProposalsFromAST: function(ast, buffer, context) {
			function emptyArrayPromise() {
				var d = new Deferred();
				d.resolve([]);
				return d.promise;
			}
			if (context.selection && context.selection.start !== context.selection.end) {
				// only propose if an empty selection.
				return emptyArrayPromise();
			}

			var root = ast;
			if (!root) {
				// assume a bad parse
				return emptyArrayPromise();
			}

			var offset = context.offset;
			// note that if selection has length > 0, then just ignore everything past the start
			var completionKind = shouldVisit(root, offset, context.prefix, buffer);
			if (completionKind) {
				var self = this;
				return typeEnv.createEnvironment({
					buffer: buffer,
					uid : "local",
					offset : offset,
					indexer: self.indexer,
					globalObjName : findGlobalObject(root.comments, self.lintOptions),
					comments : root.comments
				}).then(function(environment) {
					// must defer inferring the containing function block until the end
					environment.defer = completionKind.toDefer;
					if (environment.defer) {
						// remove these comments from consideration until we are inferring the deferred
						environment.deferredComments = extractDocComments(environment.comments, environment.defer.range);
					}
					var target = typeInf.inferTypes(root, environment, self.lintOptions);
					var proposalsObj = { };
					createInferredProposals(target, environment, completionKind.kind, context.prefix, offset - context.prefix.length, proposalsObj);
					if (context.includeNonInferred) {
						// include the entire universe as potential proposals
						createNoninferredProposals(environment, context.prefix, offset - context.prefix.length, proposalsObj);
					}
					return filterAndSortProposals(proposalsObj);
				});
			} else {
				// invalid completion location
				return emptyArrayPromise();
			}
		}
	});
	
	return {
		JSContentAssist : JSContentAssist
	};
});
