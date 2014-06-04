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
/*jslint node:true amd:true*/
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

		function check(node) {
			try {
				var scope = context.getScope();
				var kids = scope.childScopes;
				if(scope.functionExpressionScope && kids && kids.length) {
					scope = kids[0];
				}
				scope.variables.forEach(function(variable) {
					if (!variable.defs.length || variable.defs[0].type !== "Parameter") { // only care about parameters  //$NON-NLS-0$
						return;
					}
					var node = variable.defs[0].name;
					if (!variable.references.length) {
						context.report(node, "Parameter '{{name}}' is never used.", {name: node.name}); //$NON-NLS-0
					}
				});
			}
			catch(ex) {
				console.log(ex);
			}
		}

		return {
			"FunctionDeclaration": check,  //$NON-NLS-0$
			"FunctionExpression": check  //$NON-NLS-0$
		};
	};
	return module.exports;
}));
