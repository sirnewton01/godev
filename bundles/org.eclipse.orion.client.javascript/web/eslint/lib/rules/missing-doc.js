/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define module require exports console */
/**
 * Rule configuration is passed in context.options[0] which should be an object.
 * Settings are:
 * * context.options[0].expr If the value of this field is a number > 0, FunctionExpressions are checked
 * * context.options[0].decl If the value of this field is a number > 0, FunctionDeclarations are checked
 */
(function(root, factory) {
	if(typeof exports === 'object') {  //$NON-NLS-0$
		module.exports = factory(require, exports, module);
	}
	else if(typeof define === 'function' && define.amd) {  //$NON-NLS-0$
		define(['require', 'exports', 'module'], factory);
	}
	else {
		var req = function(id) {return root[id];},
			exp = root,
			mod = {exports: exp};
		root.rules.noundef = factory(req, exp, mod);
	}
}(this, function(require, exports, module) {
	/**
	 * @name module.exports
	 * @description Rule exports
	 * @function
	 * @param context
	 * @returns {Object} Rule exports
	 */
	module.exports = function(context) {
		"use strict";  //$NON-NLS-0$

		var config = (context.options && context.options[0]) || {},
		    declEnabled = Number(config.decl) > 0,
		    exprEnabled = Number(config.expr) > 0;

		/**
		 * @name checkDoc
		 * @description Call-back to check the currently visited node
		 * @private
		 * @param {Object} node The currently visited AST node
		 */
		function checkDoc(node) {
			try {
				if(!declEnabled && !exprEnabled) {
					return;
				}
				var comments;
				var name;
				switch(node.type) {
					case 'Property':  //$NON-NLS-0$
						if(exprEnabled && node.value && (node.value.type === 'FunctionExpression')) {  //$NON-NLS-0$  //$NON-NLS-1$
							comments = context.getComments(node);
							if(!comments || comments.leading.length < 1) {
								switch(node.key.type) { 
									case 'Identifier':  //$NON-NLS-0$
										name = node.key.name;
										break;
									case 'Literal':  //$NON-NLS-0$
										name = node.key.value;
										break;
								}
								reportMissingDoc(node.key, name, "expr"); //$NON-NLS-0$
							}
						}
						break;
					case 'FunctionDeclaration':  //$NON-NLS-0$
						if(declEnabled) {  //$NON-NLS-0$
							comments = context.getComments(node);
							if(!comments || comments.leading.length < 1) {
								reportMissingDoc(node.id, node.id.name, "decl"); //$NON-NLS-0$
							}
						}
						break;
					case 'ExpressionStatement':  //$NON-NLS-0$
						if(exprEnabled && node.expression && node.expression.type === 'AssignmentExpression') {  //$NON-NLS-0$  //$NON-NLS-1$
							var anode = node.expression;
							if(anode.right && (anode.right.type === 'FunctionExpression') && anode.left && (anode.left.type === 'MemberExpression')) {  //$NON-NLS-0$  //$NON-NLS-1$
								//comments are attached to the enclosing expression statement
								comments = context.getComments(node);
								if(!comments || comments.leading.length < 1) {
									name = anode.left.computed === true ? anode.left.property.value : anode.left.property.name;
									reportMissingDoc(anode.left.property, name, "expr"); //$NON-NLS-0$
								}
							}
						}
						break;
				}
			}
			catch(ex) {
				console.log(ex);
			}
		}
		
		/**
		 * @name reportMissingDoc
		 * @description Creates a new error marker in the context
		 * @private
		 */
		function reportMissingDoc(node, name, kind) {
			context.report(node, 'Missing documentation for function \'{{name}}\'', {name: name}, { type: kind });
		}
		
		return {
			"Property": checkDoc,  //$NON-NLS-0$
			"FunctionDeclaration": checkDoc,  //$NON-NLS-0$
			"ExpressionStatement": checkDoc  //$NON-NLS-0$
		};
	};
	return module.exports;
}));
