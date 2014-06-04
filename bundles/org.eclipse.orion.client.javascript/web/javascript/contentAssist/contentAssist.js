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

/*global doctrine:true define:true */
define([
	'javascript/contentAssist/typeEnvironment',  //$NON-NLS-0$
	'javascript/contentAssist/typeInference',  //$NON-NLS-0$
	'javascript/contentAssist/typeUtils',  //$NON-NLS-0$
	'javascript/contentAssist/proposalUtils',  //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/stylers/application_javascript/syntax', //$NON-NLS-0$
	'javascript/contentAssist/templates',  //$NON-NLS-0$
	'orion/Deferred',  //$NON-NLS-0$
	'orion/objects',  //$NON-NLS-0$
	'estraverse',  //$NON-NLS-0$
	'javascript/contentAssist/indexer'  //$NON-NLS-0$
], function(typeEnv, typeInf, typeUtils, proposalUtils, mTemplates, JSSyntax, Templates, Deferred, Objects, Estraverse, Indexer) {

	/**
	 * @description Creates a new delegate to create keyword and template proposals
	 */
	function TemplateProvider() {
 	}
 	
	TemplateProvider.prototype = new mTemplates.TemplateContentAssist(JSSyntax.keywords, []);
	Objects.mixin(TemplateProvider.prototype, {
		uninterestingChars: ":!@#$^&*.?<>", //$NON-NLS-0$
		/**
		 * @description Override from TemplateContentAssist
		 */
		isValid: function(prefix, buffer, offset/*, context*/) {
			var char = buffer.charAt(offset-prefix.length-1);
			return !char || this.uninterestingChars.indexOf(char) === -1;
		},
		
		/**
		 * @desription override
		 */
		getKeywordProposals: function(prefix, completionKind) {
			var proposals = [];
			switch(completionKind.kind) {
				case 'top':
					proposals = this._createKeywordProposals(this._keywords, prefix);
					break;
				case 'prop':
					proposals = this._createKeywordProposals(['false', 'function', 'new', 'null', 'this', 'true', 'typeof', 'undefined'], prefix);
					break;
			}
			if(proposals.length > 0) {
				proposals.splice(0, 0,{
					proposal: '',
					description: 'Keywords', //$NON-NLS-0$
					style: 'noemphasis_title_keywords', //$NON-NLS-0$
					unselectable: true
				});	
			}
			return proposals;
		},
		
		/**
		 * @description Creates proposal entries from the given array of candidate keywords
		 * @function
		 * @private
		 * @param {Array} keywords The array of keywords
		 * @param {String} prefix The completion prefix
		 * @returns {Array} The array of proposal objects
		 * @since 6.0
		 */
		_createKeywordProposals: function(keywords, prefix) {
			var proposals = [];
			var len = keywords.length;
			for (var i = 0; i < len; i++) {
				if (keywords[i].slice(0, prefix.length) === prefix) {
					proposals.push({
						proposal: keywords[i].slice(prefix.length), 
						description: keywords[i], 
						style: 'noemphasis_keyword'//$NON-NLS-0$
					});
				}
			}
			return proposals;
		},
		
		/**
		 * @description override
		 */
		getTemplateProposals: function(prefix, offset, context, completionKind) {
			var proposals = [];
			var templates = Templates.getTemplatesForKind(completionKind.kind); //this.getTemplates();
			for (var t = 0; t < templates.length; t++) {
				var template = templates[t];
				if (template.match(prefix)) {
					var proposal = template.getProposal(prefix, offset, context);
					this.removePrefix(prefix, proposal);
					proposals.push(proposal);
				}
			}
			
			if (0 < proposals.length) {
				//sort the proposals by name
				proposals.sort(function(p1, p2) {
					if (p1.name < p2.name) {
						return -1;
					}
					if (p1.name > p2.name) {
						return 1;
					}
					return 0;
				});
				// if any templates were added to the list of 
				// proposals, add a title as the first element
				proposals.splice(0, 0, {
					proposal: '',
					description: 'Templates', //$NON-NLS-0$
					style: 'noemphasis_title', //$NON-NLS-0$
					unselectable: true
				});
			}
			
			return proposals;
		},
	});

	/**
	 * @description Creates a new JSContentAssist object
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager An AST manager to create ASTs with
	 * @param {Object} [indexer] An indexer to load / work with supplied indexes
	 * @param {Object} lintOptions the given jslint options from the source
	 */
	function JSContentAssist(astManager, lintOptions) {
		this.astManager = astManager;
		this.indexer = new Indexer();
		this.lintOptions = lintOptions;
		this.provider = new TemplateProvider();
	}

	/**
	 * Main entry point to provider
	 */
	Objects.mixin(JSContentAssist.prototype, {

		browserRegExp: /browser\s*:\s*true/,
		nodeRegExp: /node\s*:\s*true/,
		amdRegExp: /amd\s*:\s*true/,

		/**
		 * Called by the framework to initialize this provider before any <tt>computeContentAssist</tt> calls.
		 */
		initialize: function() {
		},

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
		 * @description Reshapes typedefs into the expected format, sets up indexData
		 * @function
		 * @private
		 * @param {orion.editor.EditorContext} editorContext The editor context
		 * @param {Object} context The selection context from the editor
		 * @returns {orion.Promise} The promise to compute the indices
		 * @since 5.0
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
		
		/**
		 * @description Computes inferred proposals from the backing AST
		 * @function
		 * @private
		 * @param {Object} ast The AST
		 * @param {String} buffer The text for the backing compilation unit
		 * @param {Object} context The assist context
		 */
		_computeProposalsFromAST: function(ast, buffer, context) {
			if(!ast || (context.selection && context.selection.start !== context.selection.end)) {
				return this._noProposals();
			}
			var offset = context.offset;
			// note that if selection has length > 0, then just ignore everything past the start
			var completionKind = this._getCompletionContext(ast, offset, buffer);
			if (completionKind) {
				var self = this;
				return typeEnv.createEnvironment({
					buffer: buffer,
					uid : "local",
					offset : offset,
					indexer: self.indexer,
					globalObjName : self._findGlobalObject(ast.comments, self.lintOptions),
					comments : ast.comments
				}).then(function(environment) {
					// must defer inferring the containing function block until the end
					environment.defer = completionKind.toDefer;
					if (environment.defer) {
						// remove these comments from consideration until we are inferring the deferred
						environment.deferredComments = proposalUtils.extractDocComments(environment.comments, environment.defer.range);
					}
					var target = typeInf.inferTypes(ast, environment, self.lintOptions);
					var proposalsObj = { };
					self._createInferredProposals(target, environment, completionKind.kind, context.prefix, offset - context.prefix.length, proposalsObj);
					return [].concat(self._filterAndSortProposals(proposalsObj), 
									 self._createTemplateProposals(context, completionKind, buffer),
									 self._createKeywordProposals(context, completionKind, buffer));
				});
			} else {
				// invalid completion location
				return this._noProposals();
			}
		},
		
		/**
		 * @description The promoise for reporting no proposals
		 * @function
		 * @private
		 * @returns {orion.Promise} The promise to return an empty array
		 * @since 6.0
		 */
		_noProposals: function() {
			var d = new Deferred();
			d.resolve([]);
			return d.promise;
		},
		
		/**
		 * @description Create the keyword proposals
		 * @function
		 * @private
		 * @param {Object} context The completion context
		 * @param {Object} completionKind The computed completion kind to make
		 * @param {String} buffer The compilation unit buffer
		 * @returns {Array} The array of keyword proposals
		 * @since 6.0
		 */
		_createKeywordProposals: function(context, completionKind, buffer) {
			if((typeof context.keyword === 'undefined' || context.keyword) && 
					this.provider.isValid(context.prefix, buffer, context.offset, context)) {
				return this.provider.getKeywordProposals(context.prefix, completionKind);
			}
			return [];
		},
		
		/**
		 * @description Create the template proposals
		 * @function
		 * @private
		 * @param {Object} context The completion context
		 * @param {Object} completionKind The computed completion kind to make
		 * @param {String} buffer The compilation unit buffer
		 * @returns {Array} The array of template proposals
		 * @since 6.0
		 */
		_createTemplateProposals: function(context, completionKind, buffer) {
			if((typeof context.template === 'undefined' || context.template) && 
					this.provider.isValid(context.prefix, buffer, context.offset, context)) {
				return this.provider.getTemplateProposals(context.prefix, context.offset, context, completionKind);
			}
			return [];
		},
		
		/**
		 * @description Create the array of inferred proposals
		 * @function
		 * @private
		 * @param {String} targetTypeName The name of the type to find
		 * @param {Object} env The backing type environment
		 * @param {String} completionKind The kind of the completion
		 * @param {String} prefix The start of the expression to complete
		 * @param {Number} replaceStart The offset into the source where to start the completion
		 * @param {Object} proposals The object that attach computed proposals to
		 * @param {Number} relevance The ordering relevance of the proposals
		 * @param {Object} visited Those types visited thus far while computing proposals (to detect cycles)
		 */
		_createInferredProposals: function(targetTypeName, env, completionKind, prefix, replaceStart, proposals, relevance, visited) {
			var prop, propTypeObj, propName, res, type = env.lookupQualifiedType(targetTypeName), proto = type.$$proto;
			if (!relevance) {
				relevance = 100;
			}
			// start at the top of the prototype hierarchy so that duplicates can be removed
			if (proto) {
				var cycle = false;
				if (visited) {
					if (visited[proto.typeObj.name]) {
						cycle = true;
					}
				} else {
					visited = {};
				}
				if (!cycle) {
					visited[proto.typeObj.name] = true;
					this._createInferredProposals(proto.typeObj.name, env, completionKind, prefix, replaceStart, proposals, relevance - 10, visited);
				}
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
							res = this._calculateFunctionProposal(propName,
									propTypeObj, replaceStart - 1);
							proposals["$"+propName] = {
								proposal: res.completion,
								name: res.completion,
								description: this._createProposalDescription(propTypeObj, env),
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
								description: this._createProposalDescription(propTypeObj, env),
								style: 'emphasis',
								overwrite: true
							};
						}
					}
				}
			}
		},
		
		/**
		 * @description Convert an array of parameters into a string and also compute linked editing positions
		 * @function
		 * @private
		 * @param {String} name The name of the function
		 * @param {Object} typeObj The type object of the function
		 * @param {Number} offset The offset into the source
		 * @return {Object} The function proposal object
		 */
		_calculateFunctionProposal: function(name, typeObj, offset) {
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
		},
		
		/**
		 * @description Create the description portion of the proposal
		 * @function
		 * @private
		 * @param {Object} propType The type description
		 * @param {Object} env The currently computed type environment
		 * @returns {String} the description for the proposal
		 */
		_createProposalDescription: function(propType, env) {
			switch(propType.type) {
				case 'FunctionType':
					if(propType.result && propType.result.type === "UndefinedLiteral") {
						return "";
					}
					break;
			}
			return " : " + typeUtils.createReadableType(propType, env);
		},
		
		/**
		 * @description Filter and sort the completion proposals from the given proposal collector.
		 * Proposals are sorted by relevance and name and added to an array.
		 * @function
		 * @private
		 * @param {Object} proposalsObj The object with all of the completion proposals
		 * @returns {Array} The sorted proposals array
		 */
		_filterAndSortProposals: function(proposalsObj) {
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
		},
		
		/**
		 * @description Find the global objects given the AST comments and the lint options
		 * @function
		 * @private
		 * @param {Array} comments The array of comment nodes from the AST
		 * @param {Object} lintOptions The lint options
		 */
		_findGlobalObject: function(comments, lintOptions) {
			for (var i = 0; i < comments.length; i++) {
				var comment = comments[i];
				if (comment.type === "Block" && (comment.value.substring(0, "jslint".length) === "jslint" ||
												  comment.value.substring(0,"jshint".length) === "jshint")) {
					// the lint options section.  now look for the browser or node
					if (comment.value.match(this.browserRegExp) || comment.value.match(this.amdRegExp)) {
						return "Window";
					} else if (comment.value.match(this.nodeRegExp)) {
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
		},
		
		/**
		 * @description Computes the context for the completion to take place
		 * @param {Object} ast The backing AST to visit
		 * @param {Number} offset The offset into the source
		 * @param {String} contents The text of the file
		 * @return {Object} Returns the deferred node and the completion kind
		 * @since 6.0
		 */
		_getCompletionContext: function(ast, offset, contents) {
			var parents = [];
			Estraverse.traverse(ast, {
				skipped: false,
				/*override*/
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
								node.body && proposalUtils.isBefore(offset, node.body.range)) {
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
				/*override*/
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
				for (var i = parents.length - 1; i >= 0; i--) {
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
							return { kind : 'member', toDefer : toDefer };
						} else if (proposalUtils.inRange(offset-1, parent.range) && proposalUtils.afterDot(offset, parent, contents)) {
							// on the right hand side of a dot with no text after, eg: foo.^
							return { kind : 'member', toDefer : toDefer };
						}
						break
					case Estraverse.Syntax.Program:
					case Estraverse.Syntax.BlockStatement:
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
					case Estraverse.Syntax.Property:
						if(proposalUtils.inRange(offset-1, parent.value.range)) {
							return { kind : 'prop', toDefer : toDefer };
						}
						return null;
					case Estraverse.Syntax.SwitchStatement:
						return {kind: 'swtch', toDefer: toDefer};
				}
			}
			return { kind : 'top', toDefer : toDefer };
		}
	});
	
	return {
		JSContentAssist : JSContentAssist
	};
});
