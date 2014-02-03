/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 VMware, Inc. and others.
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

/*global define inferencerPostOp */
define([
'javascript/contentAssist/esprimaVisitor',
'javascript/contentAssist/typeUtils',
'javascript/contentAssist/proposalUtils'
], function (mVisitor, typeUtils, proposalUtils) {

	var RESERVED_WORDS = {
		"break" : true, "case" : true, "catch" : true, "continue" : true, "debugger" : true, "default" : true, "delete" : true, "do" : true, "else" : true, "finally" : true,
		"for" : true, "function" : true, "if" : true, "in" : true, "instanceof" : true, "new" : true, "return" : true, "switch" : true, "this" : true, "throw" : true, "try" : true, "typeof" : true,
		"var" : true, "void" : true, "while" : true, "with" : true
	};

	/**
	 * finds the right-most segment of a dotted MemberExpression
	 * if it is an identifier, or null otherwise
	 * @return {{name:String}}
	 */
	function findRightMost(node) {
		if (!node) {
			return null;
		} else if (node.type === "Identifier") {
			return node;
		} else if (node.type === "MemberExpression") {
			if (node.computed) {
				if (node.property.type === "Literal" && typeof node.property.value === "string") {
					return node.property;
				} else {
					// an array access
					return node;
				}
			} else {
				return findRightMost(node.property);
			}
		} else if (node.type === "ArrayExpression") {
			return node;
		} else {
			return null;
		}
	}

	/**
	 * Recursively generates a name based on the given expression
	 * @param {{type:String,name:String}} node
	 * @return {String}
	 */
	function findDottedName(node) {
		if (!node) {
			return "";
		} else if (node.type === "Identifier") {
			return node.name;
		} else if (node.type === "MemberExpression") {
			var left = findDottedName(node.object);
			var right = findDottedName(node.property);
			if (left.length > 0 && right.length > 0) {
				return left + "." + right;
			}
			return left + right;
		} else if (node.type === "CallExpression") {
			return findDottedName(node.callee);
		} else {
			return "";
		}
	}
	
	/**
	 * add variable names from inside a lint global directive
	 */
	function addLintGlobals(env, lintOptions) {
		var i, globName;
		if (lintOptions && Array.isArray(lintOptions.global)) {
			for (i = 0; i < lintOptions.global.length; i++) {
				globName = lintOptions.global[i];
				if (!env.lookupTypeObj(globName)) {
					env.addOrSetVariable(globName);
				}
			}
		}
		var comments = env.comments;
		if (comments) {
			for (i = 0; i < comments.length; i++) {
				var range = comments[i].range;
				if (comments[i].type === "Block" && comments[i].value.substring(0, "global".length) === "global") {
					var globals = comments[i].value;
					var splits = globals.split(/\s+/);
					// start with 1 to avoid 'global'
					for (var j = 1; j < splits.length; j++) {
						if (splits[j].length > 0) {
							var colonIdx = splits[j].indexOf(':');
							if (colonIdx >= 0) {
								globName = splits[j].substring(0,colonIdx).trim();
							} else {
								globName = splits[j].trim();
							}
							if (!env.lookupTypeObj(globName)) {
								env.addOrSetVariable(globName, null, null, range);
							}
						}
					}
					break;
				}
			}
		}
	}

	/**
	 * Adds global variables defined in dependencies
	 */
	function addIndexedGlobals(env) {
		// no indexer means that we should not consult indexes for extra type information
		if (env.indexer) {
			// get the list of summaries relevant for this file
			// add it to the global scope
			var summaries = env.indexer.retrieveGlobalSummaries();
			for (var fileName in summaries) {
				if (summaries.hasOwnProperty(fileName)) {
					env.mergeSummary(summaries[fileName], env.globalTypeName());
				}
			}
		}
	}
	
	/**
	 * checks to see if this file looks like an AMD module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForAMD(node) {
		var body = node.body;
		if (body && body.length >= 1 && body[0]) {
			if (body[0].type === "ExpressionStatement" &&
				body[0].expression &&
				body[0].expression.type === "CallExpression" &&
				body[0].expression.callee.name === "define") {

				// found it.
				return body[0].expression;
			}
		}
		return null;
	}
	
	/**
	 * checks to see if this file looks like a wrapped commonjs module
	 * Assumes that there are one or more calls to define at the top level
	 * and the first statement is a define call
	 * @return true iff there is a top-level call to 'define'
	 */
	function checkForCommonjs(node) {
		var body = node.body;
		if (body && body.length >= 1) {
			for (var i = 0; i < body.length; i++) {
				if (body[i] &&
					body[i].type === "ExpressionStatement" &&
					body[i].expression &&
					body[i].expression.type === "CallExpression" &&
					body[i].expression.callee.name === "define") {

					var callee = body[i].expression;
					if (callee["arguments"] &&
						callee["arguments"].length === 1 &&
						callee["arguments"][0].type === "FunctionExpression" &&
						callee["arguments"][0].params.length === 3) {

						var params = callee["arguments"][0].params;
						if (params[0].name === "require" &&
							params[1].name === "exports" &&
							params[2].name === "module") {

							// found it.
							return body[i].expression;
						}
					}
				}
			}
		}
		return null;
	}
		
	/**
	 * Finds the closest doc comment to this node
	 * @param {{range:Array.<Number>}} node
	 * @param {Array.<{range:Array.<Number>}>} doccomments
	 * @return {{value:String,range:Array.<Number>}}
	 */
	function findAssociatedCommentBlock(node, doccomments) {
		// look for closest doc comment that is before the start of this node
		// just shift all the other ones
		var candidate;
		while (doccomments.length > 0 && doccomments[0].range[0] < node.range[0]) {
			candidate = doccomments.shift();
		}
		return candidate || { value : null };
	}
	
	/**
	 * checks to see if this function is a module definition
	 * and if so returns an array of module definitions
	 *
	 * if this is not a module definition, then just return an array of Object for each typ
	 */
	function findModuleDefinitions(fnode, env) {
		var paramTypes = [], params = fnode.params, i;
		if (params.length > 0) {
			if (!fnode.extras) {
				fnode.extras = {};
			}
			if (env.indexer && fnode.extras.amdDefn) {
				var args = fnode.extras.amdDefn["arguments"];
				// the function definition must be the last argument of the call to define or require
				if (args.length > 1 && args[args.length-1] === fnode) {
					// the module names could be the first or second argument
					var moduleNames = null;
					if (args.length === 3 && args[0].type === "Literal" && args[1].type === "ArrayExpression") {
						moduleNames = args[1].elements;
					} else if (args.length === 2 && args[0].type === "ArrayExpression") {
						moduleNames = args[0].elements;
					}
					if (moduleNames) {
						for (i = 0; i < params.length; i++) {
							if (i < moduleNames.length && moduleNames[i].type === "Literal") {
								// resolve the module name from the indexer
								var summary = env.indexer.retrieveSummary(moduleNames[i].value, env);
								if (summary) {
									var typeName;
									var mergeTypeName;
									if (typeof summary.provided === "string") {
										mergeTypeName = typeName = summary.provided;
									} else {
										// module provides a composite type
										// must create a type to add the summary to
										mergeTypeName = typeName = env.newScope();
										env.popScope();
									}
									env.mergeSummary(summary, mergeTypeName);
									paramTypes.push(typeName);
								} else {
									paramTypes.push(env.newFleetingObject());
								}
							} else {
								paramTypes.push(typeUtils.OBJECT_TYPE);
							}
						}
					}
				}
			}
		}
		if (paramTypes.length === 0) {
			for (i = 0; i < params.length; i++) {
				paramTypes.push(env.newFleetingObject());
			}
		}
		return paramTypes;
	}

	/**
	 * This function takes the current AST node and does the first inferencing step for it (the top-down pass).
	 * @param node the AST node to visit
	 * @param env the context for the visitor.  See computeProposals below for full description of contents
	 */
	function inferencer(node, env) {
		var type = node.type, name, i, property, params, newTypeObj, jsdocResult, jsdocType, docComment;

		// extras prop is where we stuff everything that we have added
		if (!node.extras) {
			node.extras = {};
		}

		switch(type) {
		case "Program":
			// check for module kind
			env.commonjsModule = checkForCommonjs(node);
			if (!env.commonjsModule) {
				// can't be both amd and commonjs
				env.amdModule = checkForAMD(node);
			}
			break;
		case "BlockStatement":
			node.extras.inferredTypeObj = env.newScopeObj();
			if (node.extras.stop) {
				// this BlockStatement inferencing is deferred until after the rest of the file is inferred
				inferencerPostOp(node, env);
				delete node.extras.stop;
				return false;
			}
			break;
		case "Literal":
			break;
		case "ArrayExpression":
			node.extras.inferredTypeObj = typeUtils.ARRAY_TYPE;
			break;
		case "ObjectExpression":
			if (node.extras.fname) {
				// this object expression is contained inside another object expression
				env.pushName(node.extras.fname);
			}

			// for object literals, create a new object type so that we can stuff new properties into it.
			// we might be able to do better by walking into the object and inferring each RHS of a
			// key-value pair
			newTypeObj = env.newObject(null, node.range);
			node.extras.inferredTypeObj = newTypeObj;
			for (i = 0; i < node.properties.length; i++) {
				property = node.properties[i];
				// only remember if the property is an identifier
				if (property.key && property.key.name) {
					// first just add as an object property (or use jsdoc if exists).
					// after finishing the ObjectExpression, go and update
					// all of the variables to reflect their final inferred type
					docComment = findAssociatedCommentBlock(property.key, env.comments);
					jsdocResult = typeUtils.parseJSDocComment(docComment);
					jsdocType = jsdocResult.type && typeUtils.convertJsDocType(jsdocResult.type, env);
					if (!property.key.extras) {
						property.key.extras = {};
					}
					var keyType;
					if (jsdocType) {
						property.key.extras.inferredType = property.key.extras.jsdocType = keyType = jsdocType;
					} else {
						keyType = typeUtils.OBJECT_TYPE;
					}
					env.addVariable(property.key.name, node, keyType, property.key.range, docComment.range);
					property.key.extras.associatedComment = docComment;
					// remember that this is the LHS so that we don't add the identifier to global scope
					property.key.extras.isLHS = property.key.extras.isDecl = true;

					if (property.value.type === "FunctionExpression" || property.value.type === "ObjectExpression") {
						if (!property.value.extras) {
							property.value.extras = {};
						}
						// RHS is a function, remember the name in case it is a constructor
						property.value.extras.fname = property.key.name;
						property.value.extras.cname = env.getQualifiedName() + property.key.name;

						if (property.value.type === "FunctionExpression") {
							// now remember the jsdocResult so it doesn't need to be recomputed
							property.value.extras.jsdocResult = jsdocResult;
						}
					}
				}
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			var nameRange;
			if (node.id) {
				// true for function declarations
				name = node.id.name;
				nameRange = node.id.range;
			} else if (node.extras.fname) {
				// true for rhs of assignment to function expression
				name = node.extras.fname;
				nameRange = node.range;
			}
			params = [];
			if (node.params) {
				for (i = 0; i < node.params.length; i++) {
					params[i] = node.params[i].name;
				}
			}

			if (node.extras.jsdocResult) {
				jsdocResult = node.extras.jsdocResult;
				docComment = { range : null };
			} else {
				docComment = node.extras.associatedComment || findAssociatedCommentBlock(node, env.comments);
				jsdocResult = typeUtils.parseJSDocComment(docComment);
			}

			// assume that function name that starts with capital is
			// a constructor
			var isConstructor;
			if (name && node.body && typeUtils.isUpperCaseChar(name)) {
				if (node.extras.cname) {
					// RHS of assignment
					name = node.extras.cname;
				}
				// a new object for "this" is created inside the initFunctionType
				// call below
				newTypeObj = typeUtils.createNameType(name);
				isConstructor = true;
			} else {
				if (jsdocResult.rturn) {
					var jsdocReturn = typeUtils.convertJsDocType(jsdocResult.rturn, env);
					// keep track of the return type for the way out
					node.extras.jsdocReturn = jsdocReturn;
					newTypeObj = jsdocReturn;
					node.extras.inferredTypeObj = jsdocReturn;
				} else {
					// temporarily use "undefined" as type, but this may change once we
					// walk through to get to a return statement
					newTypeObj = typeUtils.UNDEFINED_TYPE;
				}
				isConstructor = false;
			}

			var callArgs = new Array(params.length);
			if (node.extras.paramTypeObj && node.extras.paramTypeObj.type === 'FunctionType') {
				// this function is an anonymous function being passed as an argument
				// to another function and we have a hint of what the function type is
				// shunt the argument types to this function's arguments
				var paramTypes = node.extras.paramTypeObj.params;
				var len = Math.min(params.length || 0, paramTypes.length || 0);
				for (i = 0; i < len; i++) {
					callArgs[i] = paramTypes[i];
				}
			}
			if (!node.body.extras) {
				node.body.extras = {};
			}
			node.body.extras.isConstructor = isConstructor;

			// add parameters to the current scope
			var paramTypeObjs = [];
			if (params.length > 0) {
				var moduleDefs = findModuleDefinitions(node, env);
				for (i = 0; i < params.length; i++) {
					// choose jsdoc tags over module definitions and both of those over call args
					var jsDocParam = jsdocResult.params[params[i]];
					var paramTypeObj = null;
					if (jsDocParam) {
						paramTypeObj = typeUtils.convertJsDocType(jsDocParam, env);
					} else {
						paramTypeObj = moduleDefs[i];
					}
					if (callArgs[i] && typeUtils.leftTypeIsMoreGeneral(paramTypeObj, callArgs[i], env)) {
						// unwrap parameter type since name is probably wrong
						// TODO if param is wrapped in a RestType, then problem
						paramTypeObj = callArgs[i].type === 'ParameterType' ? callArgs[i].expression : callArgs[i];
					}

					paramTypeObjs.push(typeUtils.createParamType(params[i], paramTypeObj));
				}
			}

			var functionTypeObj = typeUtils.createFunctionType(paramTypeObjs, newTypeObj, isConstructor);
			// we use an object to represent the function type, to allow for properties
			var newFunctionType = env.newFleetingObject();
			if (name && !proposalUtils.isBefore(env.offset, node.range)) {
				// if we have a name, then add it to the scope.  make sure we add the name
				// *before* calling initFunctionType(), which creates a new scope for within
				// the function
				env.addVariable(name, node.extras.target, newFunctionType, nameRange, docComment.range);
			}
			env.initFunctionType(functionTypeObj,node,newFunctionType,isConstructor ? newTypeObj.name : undefined);
			if (isConstructor) {
				// assume that constructor will be available from global scope using qualified name
				// this is not correct in all cases
				env.addOrSetGlobalVariable(name, newFunctionType, nameRange, docComment.range);
			}

			node.extras.inferredTypeObj = newFunctionType;


			env.addVariable("arguments", node.extras.target, typeUtils.createNameType("Arguments"), node.range);


			// now determine if we need to add 'this'.  If this function has an appliesTo, the we know it is being assigned as a property onto something else
			// the 'something else' is the 'this' type.
			// eg- var obj={};var obj.fun=function() { ... };
			var appliesTo = node.extras.appliesTo;
			if (appliesTo) {
				var appliesToOwner = appliesTo.extras.target;
				if (appliesToOwner) {
					var ownerTypeName = env.scope(appliesToOwner);
					// for the special case of adding to the prototype, we want to make sure that we also add to the 'this' of
					// the instantiated types
					if (typeUtils.isPrototypeName(ownerTypeName)) {
						ownerTypeName = typeUtils.extractReturnType(ownerTypeName);
					}
					env.addVariable("this", node.extras.target, typeUtils.createNameType(ownerTypeName), nameRange, docComment.range);
				}
			}

			// add variables for all parameters
			for (i = 0; i < params.length; i++) {
				env.addVariable(params[i], node.extras.target, paramTypeObjs[i].expression, node.params[i].range);
			}
			break;
		case "VariableDeclarator":
			if (node.id.name) {
				// remember that the identifier is an LHS
				// so, don't create a type for it
				if (!node.id.extras) {
					node.id.extras = {};
				}
				node.id.extras.isLHS = node.id.extras.isDecl = true;
				if (node.init && !node.init.extras) {
					node.init.extras = {};
				}
				if (node.init && node.init.type === "FunctionExpression") {
					// RHS is a function, remember the name in case it is a constructor
					node.init.extras.fname = node.id.name;
					node.init.extras.cname = env.getQualifiedName() + node.id.name;
					node.init.extras.fnameRange = node.id.range;
				} else {
					// not the RHS of a function, check for jsdoc comments
					docComment = findAssociatedCommentBlock(node, env.comments);
					jsdocResult = typeUtils.parseJSDocComment(docComment);
					jsdocType = jsdocResult.type && typeUtils.convertJsDocType(jsdocResult.type, env);
					node.extras.docRange = docComment.range;
					if (jsdocType) {
						node.extras.inferredTypeObj = jsdocType;
						node.extras.jsdocType = jsdocType;
						env.addVariable(node.id.name, node.extras.target, jsdocType, node.id.range, docComment.range);
					}
				}
			}
			env.pushName(node.id.name);
			break;
		case "AssignmentExpression":
			var rightMost = findRightMost(node.left);
			var qualName = env.getQualifiedName() + findDottedName(node.left);
			if (rightMost && (rightMost.type === "Identifier" || rightMost.type === "Literal")) {
				if (!rightMost.extras) {
					rightMost.extras = {};
				}
				if (node.right.type === "FunctionExpression") {
					// RHS is a function, remember the name in case it is a constructor
					if (!node.right.extras) {
						node.right.extras = {};
					}
					node.right.extras.appliesTo = rightMost;
					node.right.extras.fname = rightMost.name;
					node.right.extras.cname = qualName;
					node.right.extras.fnameRange = rightMost.range;

					if (!node.left.extras) {
						node.left.extras = {};
					}
				}
				docComment = findAssociatedCommentBlock(node, env.comments);
				jsdocResult = typeUtils.parseJSDocComment(docComment);
				jsdocType = jsdocResult.type && typeUtils.convertJsDocType(jsdocResult.type, env);
				node.extras.docRange = docComment.range;
				if (jsdocType) {
					node.extras.inferredTypeObj = jsdocType;
					node.extras.jsdocType = jsdocType;
					env.addVariable(rightMost.name, node.extras.target, jsdocType, rightMost.range, docComment.range);
				}
			}
			env.pushName(qualName);
			break;
		case "CatchClause":
			// create a new scope for the catch parameter
			node.extras.inferredTypeObj = env.newScope();
			if (node.param) {
				if (!node.param.extras) {
					node.param.extras = {};
				}
				var inferredTypeObj = typeUtils.createNameType("Error");
				node.param.extras.inferredTypeObj = inferredTypeObj;
				env.addVariable(node.param.name, node.extras.target, inferredTypeObj, node.param.range);
			}
			break;
		case "MemberExpression":
			if (node.property) {
				if (!node.computed ||  // like this: foo.prop
					(node.computed && node.property.type === "Literal" && typeof node.property.value === "string")) {  // like this: foo['prop']

					// keep track of the target of the property expression
					// so that its type can be used as the seed for finding properties
					if (!node.property.extras) {
						node.property.extras = {};
					}
					node.property.extras.target = node.object;
				} else { // like this: foo[prop] or foo[0]
					// do nothing
				}
			}
			break;
		case "CallExpression":
			if (node.callee.name === "define" || node.callee.name === "require") {
				// check for AMD definition
				var args = node["arguments"];
				if (args.length > 1 &&
					args[args.length-1].type === "FunctionExpression" &&
					args[args.length-2].type === "ArrayExpression") {

					// assume definition
					if (!args[args.length-1].extras) {
						args[args.length-1].extras = {};
					}
					args[args.length-1].extras.amdDefn = node;
				}
			} else {
				// the type of the function call may help infer the types of the parameters
				// keep track of that here
				rightMost = findRightMost(node.callee);
				if (rightMost && rightMost.type === "Identifier") {
					rightMost.extras = rightMost.extras || {};
					rightMost.extras.callArgs = node["arguments"];
				}
			}
			break;
		}

		// defer the inferencing of the function's children containing the offset.
		if (node === env.defer) {
			node.extras.associatedComment = findAssociatedCommentBlock(node, env.comments);
			node.extras.inferredTypeObj = node.extras.inferredTypeObj || typeUtils.OBJECT_TYPE; // will be filled in later
			// need to remember the scope to place this function in for later
			node.extras.scope = env.scope(node.extras.target);

			// need to infer the body of this function later
			node.body.extras.stop = true;
		}

		return true;
	}

	/**
	 * if this method call ast node is a call to require with a single string constant
	 * argument, then look that constant up in the indexer to get a summary
	 * if a summary is found, then apply it to the current scope
	 */
	function extractRequireModule(call, env) {
		if (!env.indexer && !env.nodeJSModule) {
			return;
		}
		if (call.type === "CallExpression" && call.callee.type === "Identifier" &&
			call.callee.name === "require" && call["arguments"].length === 1) {

			var arg = call["arguments"][0];
			if (arg.type === "Literal" && typeof arg.value === "string") {
				// we're in business
				if (env.indexer) {
					var summary = env.indexer.retrieveSummary(arg.value, env);
					if (summary) {
						var typeName;
						var mergeTypeName;
						if (typeof summary.provided === "string") {
							mergeTypeName = typeName = summary.provided;
						} else {
							// module provides a composite type
							// must create a type to add the summary to
							mergeTypeName = typeName = env.newScope();
							env.popScope();
						}
						env.mergeSummary(summary, mergeTypeName);
						return typeUtils.ensureTypeObject(typeName);
					}
				}
			}
		}

		return;
	}

	/**
	 * finds the final return statement of a function declaration
	 * @param node an ast statement node
	 * @return the lexically last ReturnStatment AST node if there is one, else
	 * null if there is no return statement
	 */
	function findReturn(node) {
		if (!node) {
			return null;
		}
		var type = node.type, maybe, i, last;
		// since we are finding the last return statement, start from the end
		switch(type) {
		case "BlockStatement":
			if (node.body && node.body.length > 0) {
				last = node.body[node.body.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;
		case "WhileStatement":
		case "DoWhileStatement":
		case "ForStatement":
		case "ForInStatement":
		case "CatchClause":

			return findReturn(node.body);
		case "IfStatement":
			maybe = findReturn(node.alternate);
			if (!maybe) {
				maybe = findReturn(node.consequent);
			}
			return maybe;
		case "TryStatement":
			maybe = findReturn(node.finalizer);
			var handlers = node.handlers;
			if (!maybe && handlers) {
				// start from the last handler
				for (i = handlers.length-1; i >= 0; i--) {
					maybe = findReturn(handlers[i]);
					if (maybe) {
						break;
					}
				}
			}
			if (!maybe) {
				maybe = findReturn(node.block);
			}
			return maybe;
		case "SwitchStatement":
			var cases = node.cases;
			if (cases) {
				// start from the last handler
				for (i = cases.length-1; i >= 0; i--) {
					maybe = findReturn(cases[i]);
					if (maybe) {
						break;
					}
				}
			}
			return maybe;
		case "SwitchCase":
			if (node.consequent && node.consequent.length > 0) {
				last = node.consequent[node.consequent.length-1];
				if (last.type === "ReturnStatement") {
					return last;
				} else {
					return findReturn(last);
				}
			}
			return null;

		case "ReturnStatement":
			return node;
		default:
			// don't visit nested functions
			// expression statements, variable declarations,
			// or any other kind of node
			return null;
		}
	}




	/**
	 * called as the post operation for the proposalGenerator visitor.
	 * In a bottom-up AST pass, finishes off the inferencing and adds all proposals
	 */
	function inferencerPostOp(node, env) {
		var type = node.type, name, inferredTypeObj, newTypeObj, rightMost, kvps, i;

		switch(type) {
		case "Program":
			if (env.defer) {
				// finally, we can infer the deferred target function

				// now use the comments that we deferred until later
				env.comments = env.deferredComments;

				var defer = env.defer;
				env.defer = null;
				env.targetTypeName = null;
				env.pushScope(defer.extras.scope);
				mVisitor.visit(defer.body, env, inferencer, inferencerPostOp);
				env.popScope();
			}

			// in case we haven't stored target yet, do so now.
			env.storeTarget();

			// TODO FIXADE for historical reasons we end visit by throwing exception.  Should chamge
			throw env.targetTypeName;
		case "BlockStatement":
		case "CatchClause":
			if (proposalUtils.inRange(env.offset, node.range)) {
				// if we've gotten here and we are still in range, then
				// we are completing as a top-level entity with no prefix
				env.storeTarget();
			}

			env.popScope();
			break;
		case "MemberExpression":
			if (proposalUtils.afterDot(env.offset, node, env.contents)) {
				// completion after a dot with no prefix
				env.storeTarget(env.scope(node.object));
			}

			// for arrays, inferred type is the dereferncing of the array type
			// for non-arrays inferred type is the type of the property expression
			if (typeUtils.isArrayType(node.object.extras.inferredTypeObj) && node.computed) {
				// inferred type of expression is the type of the dereferenced array
				node.extras.inferredTypeObj = typeUtils.extractArrayParameterType(node.object.extras.inferredTypeObj);
			} else if (node.computed && node.property && node.property.type !== "Literal") {
				// we don't infer parameterized objects, but we have something like this: 'foo[at]'  just assume type is object
				node.extras.inferredTypeObj = typeUtils.OBJECT_TYPE;
			} else {
				// a regular member expression: foo.bar or foo['bar']
				// node.propery will be null for mal-formed asts
				node.extras.inferredTypeObj = node.property ?
					node.property.extras.inferredTypeObj :
					node.object.extras.inferredTypeObj;
			}
			break;
		case "CallExpression":
			// first check to see if this is a require call
			var fnTypeObj = extractRequireModule(node, env);

			// otherwise, apply the function
			if (!fnTypeObj) {
				fnTypeObj = typeUtils.extractReturnType(env.getFnType(node.callee));
			}
			node.extras.inferredTypeObj = fnTypeObj;
			break;
		case "NewExpression":
			// FIXADE we have a problem here.
			// constructors that are called like this: new foo.Bar()  should have an inferred type of foo.Bar,
			// This ensures that another constructor new baz.Bar() doesn't conflict.  However,
			// we are only taking the final prefix and assuming that it is unique.
			node.extras.inferredTypeObj = env.getNewType(node.callee);
			break;
		case "ObjectExpression":
			// now that we know all the types of the values, use that to populate the types of the keys
			kvps = node.properties;
			for (i = 0; i < kvps.length; i++) {
				if (kvps[i].hasOwnProperty("key")) {
					// only do this for keys that are identifiers
					// set the proper inferred type for the key node
					// and also update the variable
					name = kvps[i].key.name;
					if (name) {
						// now check for the special case where the rhs value is an identifier.
						// we want to shortcut the navigation and go through to the definition
						// of the identifier, BUT only do this if the identifier points to a function
						// and the key and value names match.
						var range = null;
						if (name === kvps[i].value.name) {
							var def = env.lookupTypeObj(kvps[i].value.name, null, true);
							if (def && def.range && (typeUtils.isFunctionOrConstructor(def.typeObj))) {
								range = def.range;
							}
						}
						if (!range) {
							range = kvps[i].key.range;
						}

						inferredTypeObj =  kvps[i].key.extras.jsdocType || kvps[i].value.extras.inferredTypeObj;
						var docComment = kvps[i].key.extras.associatedComment;
						env.addVariable(name, node, inferredTypeObj, range, docComment.range);
						if (proposalUtils.inRange(env.offset-1, kvps[i].key.range)) {
							// We found it! rmember for later, but continue to the end of file anyway
							env.storeTarget(env.scope(node));
						}
					}
				}
			}
			// now, we update the types of any function expressions assigned to literal properties,
			// adding all the object literal's properties to each such type.  This is a heuristic
			// based on the likelihood of the literal itself being passed as the 'this' argument
			// to such functions
			for (i = 0; i < kvps.length; i++) {
				if (kvps[i].hasOwnProperty("key")) {
					name = kvps[i].key.name;
					if (name && kvps[i].value.type === "FunctionExpression") {
						env.updateObjLitFunctionType(node,name,kvps[i].value);
					}
				}
			}
			if (node.extras.fname) {
				// this object expression is contained inside another object expression
				env.popName();
			}
			env.popScope();
			break;
		case "LogicalExpression":
		case "BinaryExpression":
			switch (node.operator) {
				case '+':
					// special case: if either side is a string, then result is a string
					if (node.left.extras.inferredTypeObj.name === "String" ||
						node.right.extras.inferredTypeObj.name === "String") {

						node.extras.inferredTypeObj = typeUtils.STRING_TYPE;
					} else {
						node.extras.inferredTypeObj = typeUtils.NUMBER_TYPE;
					}
					break;
				case '-':
				case '/':
				case '*':
				case '%':
				case '&':
				case '|':
				case '^':
				case '<<':
				case '>>':
				case '>>>':
					// Numeric and bitwise operations always return a number
					node.extras.inferredTypeObj = typeUtils.NUMBER_TYPE;
					break;
				case '&&':
				case '||':
					// will be the type of the left OR the right
					// for now arbitrarily choose the left
					node.extras.inferredTypeObj = node.left.extras.inferredTypeObj;
					break;

				case '!==':
				case '!=':
				case '===':
				case '==':
				case '<':
				case '<=':
				case '>':
				case '>=':
					node.extras.inferredTypeObj = typeUtils.BOOLEAN_TYPE;
					break;


				default:
					node.extras.inferredTypeObj = typeUtils.OBJECT_TYPE;
			}
			break;
		case "UpdateExpression":
		case "UnaryExpression":
			if (node.operator === '!') {
				node.extras.inferredTypeObj = typeUtils.BOOLEAN_TYPE;
			} else {
				// includes all unary operations and update operations
				// ++ -- - and ~
				node.extras.inferredTypeObj = typeUtils.NUMBER_TYPE;
			}
			break;
		case "FunctionDeclaration":
		case "FunctionExpression":
			env.popScope();
			if (node.body) {
				var fnameRange;
				if (node.body.extras.isConstructor) {
					if (node.id) {
						fnameRange = node.id.range;
					} else {
						fnameRange = node.extras.fnameRange;
					}

					// now add a reference to the constructor
					env.addOrSetVariable(typeUtils.extractReturnType(node.extras.inferredTypeObj), node.extras.target, node.extras.inferredTypeObj, fnameRange);
				} else {
					// a regular function.  if we don't already know the jsdoc return,
					// try updating to a more explicit return type
					if (!node.extras.jsdocReturn) {
						var returnStatement = findReturn(node.body);
						var returnType;
						if (returnStatement && returnStatement.extras && returnStatement.extras.inferredTypeObj) {
							returnType = returnStatement.extras.inferredTypeObj;
						} else {
							returnType = typeUtils.UNDEFINED_TYPE;
						}
						env.updateReturnType(node.extras.inferredTypeObj, returnType);
					}
					// if there is a name, then update that as well
					var fname;
					if (node.id) {
						// true for function declarations
						fname = node.id.name;
						fnameRange = node.id.range;
					} else if (node.extras.appliesTo) {
						// true for rhs of assignment to function expression
						fname = node.extras.fname;
						fnameRange = node.extras.fnameRange;
					}
					if (fname) {
						env.addOrSetVariable(fname, node.extras.target, node.extras.inferredTypeObj, fnameRange);
					}
				}
			}
			break;
		case "VariableDeclarator":
			if (node.init) {
				inferredTypeObj = node.init.extras.inferredTypeObj;
			} else {
				inferredTypeObj = env.newFleetingObject();
			}
			node.id.extras.inferredTypeObj = inferredTypeObj;
			if (!node.extras.jsdocType) {
				node.extras.inferredTypeObj = inferredTypeObj;
				env.addVariable(node.id.name, node.extras.target, inferredTypeObj, node.id.range, node.extras.docRange);
			}
			if (proposalUtils.inRange(env.offset-1, node.id.range)) {
				// We found it! rmember for later, but continue to the end of file anyway
				env.storeTarget(env.scope(node.id.extras.target));
			}
			env.popName();
			break;

		case "Property":
			if (node.key.extras.jsdocType) {
				// use jsdoc instead of whatever we have inferred
				node.extras.inferredTypeObj = node.key.extras.jsdocType;
			} else {
				node.extras.inferredTypeObj = node.key.extras.inferredTypeObj = node.value.extras.inferredTypeObj;
			}
			break;

		case "AssignmentExpression":
			if (node.extras.jsdocType) {
				// use jsdoc instead of whatever we have inferred
				inferredTypeObj = node.extras.jsdocType;
			} else if (node.operator === '=') {
				// standard assignment
				inferredTypeObj = node.right.extras.inferredTypeObj;
			} else {
				// +=, -=, *=, /=, >>=, <<=, >>>=, &=, |=, or ^=.
				if (node.operator === '+=' && node.left.extras.inferredTypeObj.name === 'String') {
					inferredTypeObj = typeUtils.STRING_TYPE;
				} else {
					inferredTypeObj = typeUtils.NUMBER_TYPE;
				}
			}

			node.extras.inferredTypeObj = inferredTypeObj;
			// when we have 'this.that.theOther.f' need to find the right-most identifier
			rightMost = findRightMost(node.left);
			if (rightMost && (rightMost.type === "Identifier" || rightMost.type === "Literal")) {
				name = rightMost.name ? rightMost.name : rightMost.value;
				rightMost.extras.inferredTypeObj = inferredTypeObj;
				env.addOrSetVariable(name, rightMost.extras.target, inferredTypeObj, rightMost.range, node.extras.docRange);
				if (proposalUtils.inRange(env.offset-1, rightMost.range)) {
					// We found it! remember for later, but continue to the end of file anyway
					env.storeTarget(env.scope(rightMost.extras.target));
				}
			} else {
				// might be an assignment to an array, like:
				//   foo[at] = bar;
				if (node.left.computed) {
					rightMost = findRightMost(node.left.object);
					if (rightMost && !(rightMost.type === 'Identifier' && rightMost.name === 'prototype')) {
						// yep...now go and update the type of the array
						// (also don't turn refs to prototype into an array. this breaks things)
						var arrayType = typeUtils.parameterizeArray(inferredTypeObj);
						node.left.extras.inferredTypeObj = inferredTypeObj;
						node.left.object.extras.inferredTypeObj = arrayType;
						env.addOrSetVariable(rightMost.name, rightMost.extras.target, arrayType, rightMost.range, node.extras.docRange);
					}
				}
			}
			env.popName();
			break;
		case 'Identifier':
			name = node.name;
			newTypeObj = env.lookupTypeObj(name, node.extras.target);
			if (newTypeObj && !node.extras.isDecl) {
				// name already exists but we are redeclaring it and so not being overridden
				node.extras.inferredTypeObj = newTypeObj;
				if (proposalUtils.inRange(env.offset, node.range, true)) {
					// We found it! rmember for later, but continue to the end of file anyway
					env.storeTarget(env.scope(node.extras.target));
				}

				// if this identifier refers to a function call, and we know the argument types, then push on to the arg nodes
				if (node.extras.callArgs) {
					if (newTypeObj.type === 'FunctionType') {
						// match param types with args
						var paramTypes = newTypeObj.params;
						var args = node.extras.callArgs;
						var len = Math.min(args.length || 0, paramTypes.length || 0);
						for (i = 0; i < len; i++) {
							args[i].extras = args[i].extras || {};
							args[i].extras.paramTypeObj = paramTypes[i].type === 'ParameterType' ? paramTypes[i].expression : paramTypes[i];
						}
					}
				}

				if (node.extras.paramTypeObj) {
					// this identifier is an argument of a function call whose type we know
					if (typeUtils.leftTypeIsMoreGeneral(newTypeObj, node.extras.paramTypeObj, env)) {
						// the param type is more specific, use that one instead of the otherwise inferred type
						node.extras.inferredTypeObj = newTypeObj = node.extras.paramTypeObj;
						env.addOrSetVariable(name, node.extras.target /* should be null */, newTypeObj);
					}
				}

			} else if (!node.extras.isLHS) {
				if (!proposalUtils.inRange(env.offset, node.range, true) && RESERVED_WORDS[name] !== true) {
					// we have encountered a read of a variable/property that we have never seen before

					if (node.extras.target) {
						// this is a property on an object.  just add to the target
						env.addVariable(name, node.extras.target, env.newFleetingObject(), node.range);
					} else {
						// add as a global variable
						node.extras.inferredTypeObj = env.addOrSetGlobalVariable(name, null, node.range).typeObj;
					}
				} else {
					// We found it! rmember for later, but continue to the end of file anyway
					env.storeTarget(env.scope(node.extras.target));
				}
			} else {
				// if this node is an LHS of an assign, don't store target yet,
				// we need to first apply the RHS before applying.
				// This will happen in the enclosing assignment or variable declarator
			}
			break;
		case "ThisExpression":
			node.extras.inferredTypeObj = env.lookupTypeObj("this");
			if (proposalUtils.inRange(env.offset-1, node.range)) {
				// We found it! rmember for later, but continue to the end of file anyway
				env.storeTarget(env.scope());
			}
			break;
		case "ReturnStatement":
			if (node.argument) {
				node.extras.inferredTypeObj = node.argument.extras.inferredTypeObj;
			}
			break;

		case "Literal":
			if (node.extras.target && typeof node.value === "string") {
				// we are inside a computed member expression.
				// find the type of the property referred to if exists
				name = node.value;
				newTypeObj = env.lookupTypeObj(name, node.extras.target);
				node.extras.inferredTypeObj = newTypeObj;
			} else if (node.extras.target && typeof node.value === "number") {
				// inside of an array access
				node.extras.inferredTypeObj = typeUtils.NUMBER_TYPE;
			} else {
				var oftype = (typeof node.value);
				node.extras.inferredTypeObj = typeUtils.createNameType(oftype[0].toUpperCase() + oftype.substring(1, oftype.length));
			}
			break;

		case "ConditionalExpression":
			var target = node.consequent ? node.consequent : node.alternate;
			if (target) {
				node.extras.inferredTypeObj = target.extras.inferredTypeObj;
			}
			break;

		case "ArrayExpression":
			// parameterize this array by the type of its first non-null element
			if (node.elements) {
				for (i = 0; i < node.elements.length; i++) {
					if (node.elements[i]) {
						node.extras.inferredTypeObj = typeUtils.parameterizeArray(node.elements[i].extras.inferredTypeObj);
					}
				}
			}
		}

		if (!node.extras.inferredTypeObj) {
			node.extras.inferredTypeObj = typeUtils.OBJECT_TYPE;
		}
	}

	/**
	 * infers types for an AST root, storing them in an environment object.  
	 */
	function inferTypes(root, environment, lintOptions) {
		// first augment the global scope with things we know
		addLintGlobals(environment, lintOptions);
		addIndexedGlobals(environment);

		// now we can remove all non-doc comments from the comments list
		var newComments = [];
		for (var i = 0; i < environment.comments.length; i++) {
			if (environment.comments[i].value.charAt(0) === '*') {
				newComments.push(environment.comments[i]);
			}
		}
		environment.comments = newComments;

		try {
			mVisitor.visit(root, environment, inferencer, inferencerPostOp);
		} catch (done) {
			if (typeof done !== "string") {
				// a real error
				throw done;
			}
			return done;
		}
		throw new Error("The visit function should always end with a throwable");
	}
	return {
		inferTypes: inferTypes
	};
});