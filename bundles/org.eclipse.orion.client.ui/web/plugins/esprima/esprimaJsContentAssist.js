/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * Copyright (c) 2013 IBM Corporation.
 *
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *	 Andy Clement (VMware) - initial API and implementation
 *	 Andrew Eisenberg (VMware) - implemented visitor pattern
 *       Manu Sridharan (IBM) - Various improvements
 ******************************************************************************/

/*global define esprima doctrine inferencerPostOp*/
define(["plugins/esprima/esprimaVisitor", "plugins/esprima/typeEnvironment", "plugins/esprima/typeInference", "plugins/esprima/typeUtils", "plugins/esprima/proposalUtils", "plugins/esprima/scriptedLogger", "orion/Deferred", "esprima/esprima"],
		function(mVisitor, typeEnv, typeInf, typeUtils, proposalUtils, scriptedLogger, Deferred) {


	/**
	 * Convert an array of parameters into a string and also compute linked editing positions
	 * @param {String} name name of the function
	 * @param {{}} typeObj the type object of the function
	 * @param {Number} offset offset
	 * @return {{ completion:String, positions:[Number] }}
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
	 * @return "top" if we are at a start of a new expression fragment (eg- at an empty line,
	 * or a new parameter).  "member" if we are after a dot in a member expression.  false otherwise
	 * @return {Boolean|String}
	 */
	function shouldVisit(root, offset, prefix, contents) {
		/**
		 * A visitor that finds the parent stack at the given location
		 * @param node the AST node being visited
		 * @param parents stack of parent nodes for the current node
		 * @param isInitialVisit true iff this is the first visit of the node, false if this is
		 *   the end visit of the node
		 */
		var findParent = function(node, parents, isInitialVisit) {
			// extras prop is where we stuff everything that we have added
			if (!node.extras) {
				node.extras = {};
			}

			if (!isInitialVisit) {

				// if we have reached the end of an inRange block expression then
				// this means we are completing on an empty expression
				if (node.type === "Program" || (node.type === "BlockStatement") &&
						proposalUtils.inRange(offset, node.range)) {
					throw "done";
				}

				parents.pop();
				// return value is ignored
				return false;
			}

			// the program node is always in range even if the range numbers do not line up
			if ((node.range && proposalUtils.inRange(offset-1, node.range)) || node.type === "Program") {
				if (node.type === "Identifier") {
					throw "done";
				}
				parents.push(node);
				if ((node.type === "FunctionDeclaration" || node.type === "FunctionExpression") &&
						node.nody && proposalUtils.isBefore(offset, node.body.range)) {
					// completion occurs on the word "function"
					throw "done";
				}
				// special case where we are completing immediately after a '.'
				if (node.type === "MemberExpression" && !node.property && proposalUtils.afterDot(offset, node, contents)) {
					throw "done";
				}
				return true;
			} else {
				return false;
			}
		};
		var parents = [];
		try {
			mVisitor.visit(root, parents, findParent, findParent);
		} catch (done) {
			if (done !== "done") {
				// a real error
				throw(done);
			}
		}

		// determine if we need to defer infering the enclosing function block
		var toDefer;
		if (parents && parents.length) {
			var parent = parents.pop();
			for (var i = 0; i < parents.length; i++) {
				if ((parents[i].type === "FunctionDeclaration" || parents[i].type === "FunctionExpression") &&
						// don't defer if offset is over the function name
						!(parents[i].id && proposalUtils.inRange(offset, parents[i].id.range, true))) {
					toDefer = parents[i];
					break;
				}

			}

			if (parent.type === "MemberExpression") {
				if (parent.property && proposalUtils.inRange(offset-1, parent.property.range)) {
					// on the right hand side of a property, eg: foo.b^
					return { kind : "member", toDefer : toDefer };
				} else if (proposalUtils.inRange(offset-1, parent.range) && proposalUtils.afterDot(offset, parent, contents)) {
					// on the right hand side of a dot with no text after, eg: foo.^
					return { kind : "member", toDefer : toDefer };
				}
			} else if (parent.type === "Program" || parent.type === "BlockStatement") {
				// completion at a new expression
				if (!prefix) {
				}
			} else if (parent.type === "VariableDeclarator" && (!parent.init || proposalUtils.isBefore(offset, parent.init.range))) {
				// the name of a variable declaration
				return false;
			} else if ((parent.type === "FunctionDeclaration" || parent.type === "FunctionExpression") &&
					proposalUtils.isBefore(offset, parent.body.range)) {
				// a function declaration
				return false;
			}
		}
		return { kind : "top", toDefer : toDefer };
	}

	/**
	 * Extracts all doccomments that fall inside the given range.
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
	 * the prefix of a completion should not be included in the completion itself
	 * must explicitly remove it
	 */
	function removePrefix(prefix, string) {
		return string.substring(prefix.length);
	}

	function createProposalDescription(propName, propType, env) {
		return propName + " : " + typeUtils.createReadableType(propType, env);
	}

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
						var funcDesc = res.completion + " : " + typeUtils.createReadableType(propTypeObj, env);
						proposals["$"+propName] = {
							proposal: res.completion,
							description: funcDesc,
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
							description: createProposalDescription(propName, propTypeObj, env),
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
							proposal: removePrefix(prefix, res.completion),
							description: createProposalDescription(prop, propType, environment),
							positions: res.positions,
							escapePosition: replaceStart + res.completion.length,
							// prioritize methods over fields
							relevance: -99,
							style: 'noemphasis'
						};
						proposalAdded = true;
					} else {
						proposals[prop] = {
							proposal: removePrefix(prefix, prop),
							description: createProposalDescription(prop, propType, environment),
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
	function findGlobalObject(comments, lintOptions) {

		for (var i = 0; i < comments.length; i++) {
			var comment = comments[i];
			if (comment.type === "Block" && (comment.value.substring(0, "jslint".length) === "jslint" ||
											  comment.value.substring(0,"jshint".length) === "jshint")) {
				// the lint options section.  now look for the browser or node
				if (comment.value.match(browserRegExp)) {
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

			var ldesc = l.description.toLowerCase();
			var rdesc = r.description.toLowerCase();
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
	 * indexer is optional.  When there is no indexer passed in
	 * the indexes will not be consulted for extra references
	 * @param {{hasDependency,performIndex,retrieveSummary,retrieveGlobalSummaries}} indexer
	 * @param {{global:[],options:{browser:Boolean}}=} lintOptions optional set of extra lint options that can be overridden in the source (jslint or jshint)
	 */
	function EsprimaJavaScriptContentAssistProvider(indexer, lintOptions) {
		this.indexer = indexer;
		this.lintOptions = lintOptions;
	}

	/**
	 * Main entry point to provider
	 */
	EsprimaJavaScriptContentAssistProvider.prototype = {

		/**
		 * Implements the Orion content assist API v4.0
		 */
		computeContentAssist: function(editorContext, context) {
			var self = this;
			// TODO Can we avoid getText() here? The AST should have all we need.
			return Deferred.all([editorContext.getAST(), editorContext.getText()]).then(function(results) {
				var ast = results[0], buffer = results[1];
				return self._computeProposalsFromAST(ast, buffer, context);
			});
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

			try {
				var root = ast;
				if (!root) {
					// assume a bad parse
					return emptyArrayPromise();
				}

				var offset = context.offset;
				// note that if selection has length > 0, then just ignore everything past the start
				var completionKind = shouldVisit(root, offset, context.prefix, buffer);
				if (completionKind) {
					var environmentPromise = typeEnv.createEnvironment({ buffer: buffer, uid : "local", offset : offset, indexer : this.indexer, globalObjName : findGlobalObject(root.comments, this.lintOptions), comments : root.comments });
					var self = this;
					var result = environmentPromise.then(function (environment) {
						// must defer inferring the containing function block until the end
						environment.defer = completionKind.toDefer;
						if (environment.defer) {
							// remove these comments from consideration until we are inferring the deferred
							environment.deferredComments = extractDocComments(environment.comments, environment.defer.range);
						}
						try {
							var target = typeInf.inferTypes(root, environment, self.lintOptions);
							var proposalsObj = { };
							createInferredProposals(target, environment, completionKind.kind, context.prefix, offset - context.prefix.length, proposalsObj);
							if (!context.inferredOnly) {
								// include the entire universe as potential proposals
								createNoninferredProposals(environment, context.prefix, offset - context.prefix.length, proposalsObj);
							}
							return filterAndSortProposals(proposalsObj);
						} catch (e) {
							if (typeof scriptedLogger !== "undefined") {
								scriptedLogger.error(e.message, "CONTENT_ASSIST");
								scriptedLogger.error(e.stack, "CONTENT_ASSIST");
							}
							throw (e);
						}
					});
					return result;
				} else {
					// invalid completion location
					return emptyArrayPromise();
				}
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				}
				throw (e);
			}
		},


		_internalFindDefinition : function(buffer, offset, findName) {
			var toLookFor;
			var root = mVisitor.parse(buffer);
			if (!root) {
				// assume a bad parse
				return null;
			}
			var funcList = [];
			var environment = typeEnv.createEnvironment({ buffer: buffer, uid : "local", offset : offset, indexer : this.indexer, globalObjName : findGlobalObject(root.comments, this.lintOptions), comments : root.comments });
			var findIdentifier = function(node) {
				if ((node.type === "Identifier" || node.type === "ThisExpression") && proposalUtils.inRange(offset, node.range, true)) {
					toLookFor = node;
					// cut visit short
					throw "done";
				}
				// FIXADE esprima bug...some call expressions have incorrect slocs.
				// This is fixed in trunk of esprima.
				// after next upgrade of esprima if the following has correct slocs, then
				// can remove the second part of the &&
				// mUsers.getUser().name
				if (node.range[0] > offset &&
						(node.type === "ExpressionStatement" ||
						 node.type === "ReturnStatement" ||
						 node.type === "ifStatement" ||
						 node.type === "WhileStatement" ||
						 node.type === "Program")) {
					// not at a valid hover location
					throw "no hover";
				}

				// the last function pushed on is the one that we need to defer
				if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression") {
					funcList.push(node);
				}
				return true;
			};

			try {
				mVisitor.visit(root, {}, findIdentifier, function(node) {
					if (node === funcList[funcList.length-1]) {
						funcList.pop();
					}
				});
			} catch (e) {
				if (e === "no hover") {
					// not at a valid hover location
					return null;
				} else if (e === "done") {
					// valid hover...continue
				} else {
					// a real exception
					throw e;
				}
			}
			if (!toLookFor) {
				// no hover target found
				return null;
			}
			// must defer inferring the containing function block until the end
			environment.defer = funcList.pop();
			if (environment.defer && toLookFor === environment.defer.id) {
				// don't defer if target is name of function
				delete environment.defer;
			}

			if (environment.defer) {
				// remove these comments from consideration until we are inferring the deferred
				environment.deferredComments = extractDocComments(environment.comments, environment.defer.range);
			}

			var target = typeInf.inferTypes(root, environment, this.lintOptions);
			var lookupName = toLookFor.type === "Identifier" ? toLookFor.name : 'this';
			var maybeType = environment.lookupTypeObj(lookupName, toLookFor.extras.target || target, true);
			if (maybeType) {
				// if it's a reference to a function type, suck out $$fntype
				var allTypes = environment.getAllTypes();
				if (fnTypeRef(maybeType.typeObj,allTypes)) {
					inlineFunctionTypes(allTypes[maybeType.typeObj.name].$$fntype,allTypes);
					maybeType.typeObj = allTypes[maybeType.typeObj.name].$$fntype;
				}
				var hover = typeUtils.styleAsProperty(lookupName, findName) + " : " + typeUtils.createReadableType(maybeType.typeObj, environment, true, 0, findName);
				maybeType.hoverText = hover;
				return maybeType;
			} else {
				return null;
			}

		},
		/**
		 * Computes the hover information for the provided offset
		 */
		computeHover: function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, true);
		},

		findDefinition : function(buffer, offset) {
			return this._internalFindDefinition(buffer, offset, false);
		},

		/**
		 * Computes a summary of the file that is suitable to be stored locally and used as a dependency
		 * in another file
		 * @param {String} buffer
		 * @param {String} fileName
		 */
		computeSummary: function(buffer, fileName) {
			var root = mVisitor.parse(buffer);
			if (!root) {
				// assume a bad parse
				return null;
			}
			var environment = typeEnv.createEnvironment({ buffer: buffer, uid : fileName, globalObjName : findGlobalObject(root.comments, this.lintOptions), comments : root.comments, indexer : this.indexer });
			try {
				typeInf.inferTypes(root, environment, this.lintOptions);
			} catch (e) {
				if (typeof scriptedLogger !== "undefined") {
					scriptedLogger.error("Problem inferring in: " + fileName, "CONTENT_ASSIST");
					scriptedLogger.error(e.message, "CONTENT_ASSIST");
					scriptedLogger.error(e.stack, "CONTENT_ASSIST");
				}
				throw (e);
			}
			var providedType;
			var kind;
			var modTypeObj;
			if (environment.amdModule) {
				// provide the exports of the AMD module
				// the exports is the return value of the final argument
				var args = environment.amdModule["arguments"];
				if (args && args.length > 0) {
					modTypeObj = typeUtils.extractReturnType(environment.getFnType(args[args.length-1]));
				} else {
					modTypeObj = typeUtils.OBJECT_TYPE;
				}
				kind = "AMD";
			} else if (environment.commonjsModule) {
				// a wrapped commonjs module
				// we have already checked the correctness of this function
				var exportsParam = environment.commonjsModule["arguments"][0].params[1];
				modTypeObj = exportsParam.extras.inferredTypeObj;
				providedType = environment.findType(modTypeObj);

			} else {
				// assume a non-module
				providedType = environment.globalScope();

				// if there is an exports global or a module.exports global, then assume commonjs
				var maybeExports = providedType.exports ||
						(providedType.module && environment.getAllTypes()[providedType.module.typeObj.name] &&
						environment.getAllTypes()[providedType.module.typeObj.name].exports);

				if (maybeExports) {
					// actually, commonjs
					kind = "commonjs";
					modTypeObj = maybeExports.typeObj;
				} else {
					kind = "global";
					modTypeObj = providedType['this'].typeObj;
				}
			}

			// simplify the exported type
			if (!typeUtils.isFunctionOrConstructor(modTypeObj) &&
				!environment.findType(modTypeObj).$$isBuiltin) {

				// this module provides a composite type
				providedType = environment.findType(modTypeObj);
			}

			var allTypes = environment.getAllTypes();

			// now filter the builtins since they are always available
			filterTypes(environment, kind, modTypeObj, providedType);

			// Cases when provided type is not a record type.  store as a string
			// warning...not all cases handled here...eg- union types
			if (typeUtils.isFunctionOrConstructor(modTypeObj) ||
				(environment.findType(modTypeObj) && environment.findType(modTypeObj).$$isBuiltin)) {
				providedType = doctrine.type.stringify(modTypeObj, {compact: true});
			} else if (providedType.$$fntype) {
				providedType = doctrine.type.stringify(providedType.$$fntype, {compact: true});
			}

			return {
				provided : providedType,
				types : allTypes,
				kind : kind
			};
		}
	};
	return {
		EsprimaJavaScriptContentAssistProvider : EsprimaJavaScriptContentAssistProvider
	};
});
