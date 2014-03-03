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
		 * @description Checks a set of tokens for the given node to see if the trailing one
		 * is a semicolon
		 * @private
		 * @param {Object} node The AST node
		 */
		function checkForSemicolon(node) {
			var tokens = context.getTokens(node);
			var len = tokens.length;
			var t = tokens[len - 1];
			if (t && t.type === "Punctuator" && t.value === ";") {
				return;
			}
			context.report(node, "Missing semicolon.", null, t /* expose the bad token */);
		}

		/**
		 * @description Checks a set of tokens for a variable declaration to see if the trailing one
		 * is a semicolon iff it is not part of a for-statement
		 * @private
		 * @param {Object} node The AST node
		 */
		function checkVariableDeclaration(node) {
			var ancestors = context.getAncestors(node),
			    parent = ancestors[ancestors.length - 1],
			    parentType = parent.type;
			if ((parentType === "ForStatement" && parent.init === node) || (parentType === "ForInStatement" && parent.left === node)){
				// One of these cases, no semicolon token is required after the VariableDeclaration:
				// for(var x;;)
				// for(var x in y)
				return;
			}
			checkForSemicolon(node);
		}

		return {
			"VariableDeclaration": checkVariableDeclaration,
			"ExpressionStatement": checkForSemicolon,
			"ReturnStatement": checkForSemicolon,
		};
	};
	return module.exports;
}));
