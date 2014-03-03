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
	module.exports = function(context) {
		"use strict";
		
		/**
		 * @description Checks a set of tokens to see if we have an unnecessary semicolon
		 * @private
		 * @param {Object} node The AST node
		 */
		function report(node) {
			var tokens = context.getTokens(node);
			var t = tokens[tokens.length - 1];
			if (t && t.type === "Punctuator" && t.value === ";") {
				context.report(node, "Unnecessary semicolon.", null, t /* expose the bad token */);
			}
		}
		return {
			"EmptyStatement": report
		};
	};
	return module.exports;
}));
