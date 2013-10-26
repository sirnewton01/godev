/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 ******************************************************************************/

/*jslint browser:true*/
/*global define orion console */
define(['orion/plugin', "orion/Deferred"], function(PluginProvider, Deferred) {

	function isOccurrenceInSelScope(oScope, wScope) {
		if (oScope.global && wScope.global) {
			return true;
		}
		if (!oScope.global && !wScope.global && (oScope.name === wScope.name) && (oScope.loc.start.line === wScope.loc.start.line) &&
			(oScope.loc.start.column === wScope.loc.start.column)) {
			return true;
		}
		return false;
	}

	function filterOccurrences(context) {
		if (!context.mScope) {
			return null;
		}
		var matches = [];
		for (var i = 0; i < context.occurrences.length; i++) {
			if (isOccurrenceInSelScope(context.occurrences[i].scope, context.mScope)) {
				matches.push({
					readAccess: context.occurrences[i].readAccess,
					line: context.occurrences[i].node.loc.start.line,
					start: context.occurrences[i].node.loc.start.column + 1,
					end: context.occurrences[i].node.loc.end.column,
					description: (context.occurrences[i].readAccess ? 'Occurrence of "' : 'Write occurrence of "') + context.word + '"'	//$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
				});
			}
		}
		return matches;
	}

	function updateScope(node, scope) {
		if (!node || !node.type || !scope) {
			return;
		}
		switch (node.type) {
		case 'FunctionDeclaration': //$NON-NLS-0$
			scope.pop();
			break;
		case 'FunctionExpression':	//$NON-NLS-0$
			scope.pop();
			break;
		}
	}

	function traverse(node, context, func) {
		if (func(node, context)) {
			return false;	// stop traversal
		}
		for (var key in node) {
			if (node.hasOwnProperty(key)) {
				var child = node[key];
				if (child && typeof child === 'object' && child !== null) { //$NON-NLS-0$
					if (Array.isArray(child)) {
						for (var i=0; i<child.length; i++) {
							if (!traverse(child[i], context, func)) {
								return false;
							}
						}
					} else {
						if (!traverse(child, context, func)) {
							return false;
						}
					}
				}
			}
		}
		updateScope(node, context.scope);
		return true;
	}

	function checkIdentifier(node, context) {
		if (node && node.type === 'Identifier') { //$NON-NLS-0$
			if (node.name === context.word) {
				return true;
			}
		}
		return false;
	}

	function findMatchingDeclarationScope(scope) {
		for (var i = scope.length - 1; i >= 0; i--) {
			if (scope[i].decl) {
				return scope[i];
			}
		}
		return null;
	}

	function addOccurrence(node, context, readAccess) {
		if (node) {
			if (readAccess === undefined) {
				readAccess = true;
			}

			var mScope = findMatchingDeclarationScope(context.scope);
			if (!mScope) {
				return;
			}

			if ((node.range[0] <= context.start) && (context.end <= node.range[1])) {
				if (mScope) {
					context.mScope = mScope;
				} else {
					console.error("matching declaration scope for selected type not found " + context.word); //$NON-NLS-0$
				}
			}

			context.occurrences.push({
				readAccess: readAccess,
				node: node,
				scope: mScope
			});
		}
	}

	function findOccurrence(node, context) {
		if (!node || !node.type) {
			return null;
		}
		var varScope, curScope, i;
		switch (node.type) {
		case 'Program': //$NON-NLS-0$
			curScope = {
				global: true,
				name: null,
				decl: false
			};
			context.scope.push(curScope);
			break;
		case 'VariableDeclarator': //$NON-NLS-0$
			if (checkIdentifier(node.id, context)) {
				varScope = context.scope.pop();
				varScope.decl = true;
				context.scope.push(varScope);
				addOccurrence(node.id, context, false);
			}
			if (node.init) {
				if (checkIdentifier(node.init, context)) {
					addOccurrence(node.init, context);
					break;
				}
				if (node.init.type === 'ObjectExpression') { //$NON-NLS-0$
					var properties = node.init.properties;
					for (i = 0; i < properties.length; i++) {
						//if (checkIdentifier (properties[i].key, context)) {
						//	var varScope = scope.pop();
						//	varScope.decl = true;
						//	scope.push(varScope);
						//	addOccurrence (scope, properties[i].key, context, occurrences, false);
						//}
						if (checkIdentifier(properties[i].value, context)) {
							addOccurrence(properties[i].value, context);
						}
					}
				}
			}
			break;
		case 'ArrayExpression': //$NON-NLS-0$
			if (node.elements) {
				for (i = 0; i < node.elements.length; i++) {
					if (checkIdentifier(node.elements[i], context)) {
						addOccurrence(node.elements[i], context);
					}
				}
			}
			break;
		case 'AssignmentExpression': //$NON-NLS-0$
			var leftNode = node.left;
			if (checkIdentifier(leftNode, context)) {
				addOccurrence(leftNode, context, false);
			}
			if (leftNode.type === 'MemberExpression') { //$NON-NLS-0$
				if (checkIdentifier(leftNode.object, context)) {
					addOccurrence(leftNode.object, context, false);
				}
			}
			var rightNode = node.right;
			if (checkIdentifier(rightNode, context)) {
				addOccurrence(rightNode, context);
			}
			break;
		case 'MemberExpression': //$NON-NLS-0$
			if (checkIdentifier(node.object, context)) {
				addOccurrence(node.object, context);
			}
			if (node.computed) { //computed = true for [], false for . notation
				if (checkIdentifier(node.property, context)) {
					addOccurrence(node.property, context);
				}
			}
			break;
		case 'BinaryExpression': //$NON-NLS-0$
			if (checkIdentifier(node.left, context)) {
				addOccurrence(node.left, context);
			}
			if (checkIdentifier(node.right, context)) {
				addOccurrence(node.right, context);
			}
			break;
		case 'UnaryExpression': //$NON-NLS-0$
			if (checkIdentifier(node.argument, context)) {
				addOccurrence(node.argument, context, node.operator === 'delete' ? false : true); //$NON-NLS-0$
			}
			break;
		case 'IfStatement': //$NON-NLS-0$
			if (checkIdentifier(node.test, context)) {
				addOccurrence(node.test, context);
			}
			break;
		case 'SwitchStatement': //$NON-NLS-0$
			if (checkIdentifier(node.discriminant, context)) {
				addOccurrence(node.discriminant, context, false);
			}
			break;
		case 'UpdateExpression': //$NON-NLS-0$
			if (checkIdentifier(node.argument, context)) {
				addOccurrence(node.argument, context, false);
			}
			break;
		case 'ConditionalExpression': //$NON-NLS-0$
			if (checkIdentifier(node.test, context)) {
				addOccurrence(node.test, context);
			}
			if (checkIdentifier(node.consequent, context)) {
				addOccurrence(node.consequent, context);
			}
			if (checkIdentifier(node.alternate, context)) {
				addOccurrence(node.alternate, context);
			}
			break;
		case 'FunctionDeclaration': //$NON-NLS-0$
			curScope = {
				global: false,
				name: node.id.name,
				loc: node.loc,
				decl: false
			};
			context.scope.push(curScope);
			if (node.params) {
				for (i = 0; i < node.params.length; i++) {
					if (checkIdentifier(node.params[i], context)) {
						varScope = context.scope.pop();
						varScope.decl = true;
						context.scope.push(varScope);
						addOccurrence(node.params[i], context, false);
					}
				}
			}
			break;
		case 'FunctionExpression': //$NON-NLS-0$
			curScope = {
				global: false,
				name: null,
				loc: node.loc,
				decl: false
			};
			context.scope.push(curScope);
			if (!node.params) {
				break;
			}
			for (i = 0; i < node.params.length; i++) {
				if (checkIdentifier(node.params[i], context)) {
					varScope = context.scope.pop();
					varScope.decl = true;
					context.scope.push(varScope);
					addOccurrence(node.params[i], context, false);
				}
			}
			break;
		case 'CallExpression': //$NON-NLS-0$
			if (!node.arguments) {
				break;
			}
			for (var j = 0; j < node.arguments.length; j++) {
				if (checkIdentifier(node.arguments[j], context)) {
					addOccurrence(node.arguments[j], context);
				}
			}
			break;
		case 'ReturnStatement': //$NON-NLS-0$
			if (checkIdentifier(node.argument, context)) {
				addOccurrence(node.argument, context);
			}
		}
		return null;
	}

	function getOccurrences(ast, context) {
		if (ast) {
			traverse(ast, context, function(node, context) {
				var found = false;
				if (node.range && node.name && (node.range[0] <= context.start) && (context.end <= node.range[1])) {
					context.word = node.name;
					found = true;
				}
				return found;
			});

			if (!context || !context.word) {
				return null;
			}
			context.scope = [];
			context.occurrences = [];
			traverse(ast, context, findOccurrence);
			return filterOccurrences(context);
		}
		console.error("ast is null");	//$NON-NLS-0$
		return null;
	}

	var headers = {
		name: "Occurrence Plugin",	//$NON-NLS-0$
		version: "0.1",	//$NON-NLS-0$
		description: "Esprima-based mark occurrences plugin."	//$NON-NLS-0$
	};
	var provider = new PluginProvider(headers);

	// Create the service implementation for getting selected text
	var serviceImpl = {
		computeOccurrences: function(editorContext, ctx) {
			var d = new Deferred();
			editorContext.getAST().then(function(ast) {
				var context = {
					start: ctx.selection.start,
					end: ctx.selection.end,
					mScope: null
				};
				d.resolve(getOccurrences (ast, context));
			});
			return d;
		}
	};

	 var serviceProperties = {
		name: 'Mark Occurrences',	//$NON-NLS-0$
		id: 'markoccurrences.editor',	//$NON-NLS-0$
		tooltip: 'Mark Occurrences',	//$NON-NLS-0$
		key: ['M', true, true], // Ctrl+Shift+M	//$NON-NLS-0$
		contentType: ['application/javascript']	//$NON-NLS-0$
	};

	provider.registerService("orion.edit.occurrences", serviceImpl, serviceProperties);	//$NON-NLS-0$
	provider.connect();
});

