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
		
		return {
			/**
			 * @name EmptyStatement
			 * @description Linting for EmptyStatements
			 * @function
			 * @param node
			 * @returns returns
			 */
			"EmptyStatement": function(node) {  //$NON-NLS-0$
				try {
					var tokens = context.getTokens(node);
					var t = tokens[tokens.length - 1];
					if (t && t.type === "Punctuator" && t.value === ";") {  //$NON-NLS-0$  //$NON-NLS-1$
						context.report(node, "Unnecessary semicolon.", null, t /* expose the bad token */);
					}
				}
				catch(ex) {
					console.log(ex);
				}
			}
		};
	};
	return module.exports;
}));
