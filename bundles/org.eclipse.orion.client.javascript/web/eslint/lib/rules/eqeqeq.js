/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define([
'logger'
], function(Logger) {
	/**
	 * @description gets the operator token
	 * @param {Object} context The eslint context
	 * @param {Object} node The AST node
	 * @returns {Object} The token object for the nodes operator or null
	 */
	function getOperatorToken(context, node) {
		var tokens = context.getTokens(node), len = tokens.length, operator = node.operator;
		for (var i=0; i < len; i++) {
			var t = tokens[i];
			if (t.value === operator) {
				return t;
			}
		}
		return null;
	}

	/**
	 * @description Ruturns if the given node is an identifier and is one of 'null' or 'undefined'
	 * @param {Object} node The AST node
	 * @returns {Boolean} If the the node is referring to nullness (null or undefined)
	 */
	function isNullness(node) {
		if(node && node.type) {
			return (node.type === 'Literal' && node.value == null) || (node.type === 'Identifier' && node.name === 'undefined');  //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-2$
		}
		return false;
	}

	return function(context) {
		"use strict";  //$NON-NLS-0$
		return {
			/**
			 * @name BinaryExpression
			 * @description Linting for BinaryExpressions
			 * @function
			 * @param node
			 */
			"BinaryExpression": function(node) {  //$NON-NLS-0$
				try {
					if(isNullness(node.left) || isNullness(node.right)) {
						return;
					}
					var op = node.operator;
					var expected = null;
					if (op === "==") {  //$NON-NLS-0$
					    expected = '===';
						context.report(node, "Expected '${0}' and instead saw '${1}'.", {0: expected, 1:op}, getOperatorToken(context, node));
					} else if (op === "!=") {  //$NON-NLS-0$
					    expected = '!==';
						context.report(node, "Expected '${0}' and instead saw '${1}'.", {0:expected, 1:op}, getOperatorToken(context, node));
					}
				}
				catch(ex) {
					Logger.log(ex);
				}
			}
		};
	};
});
