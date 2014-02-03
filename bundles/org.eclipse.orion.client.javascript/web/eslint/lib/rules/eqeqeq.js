/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define module require exports */
(function(root, factory) {
	if(typeof exports === 'object') {
		module.exports = factory(require, exports, module);
	}
	else if(typeof define === 'function' && define.amd) {
		define(['require', 'exports', 'module'], factory);
	}
	else {
		var req = function(id) {return root[id];},
			exp = root,
			mod = {exports: exp};
		root.rules.noundef = factory(req, exp, mod);
	}
}(this, function(require, exports, module) {

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

	module.exports = function(context) {
		"use strict";
		return {
			"BinaryExpression": function(node) {
				var op = node.operator;
				if (op === "==") {
					context.report(node, "Expected '===' and instead saw '=='.", null, getOperatorToken(context, node));
				} else if (op === "!=") {
					context.report(node, "Expected '!==' and instead saw '!='.", null, getOperatorToken(context, node));
				}
			}
		};
	};
	return module.exports;
}));
