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
	if(typeof exports === 'object') {  //$NON-NLS-0$
		module.exports = factory(require, exports, module, require('../util')); //$NON-NLS-0$
	}
	else if(typeof define === 'function' && define.amd) { //$NON-NLS-0$
		define(['require', 'exports', 'module', '../util'], factory);
	}
	else {
		var req = function(id) {return root[id];},
			exp = root,
			mod = {exports: exp};
		root.rules.noundef = factory(req, exp, mod);
	}
}(this, function(require, exports, module, util) {

	/**
	 * @name module.exports
	 * @description Rule exports
	 * @function
	 * @param context
	 * @returns {Object} Rule exports
	 */
	module.exports = function(context) {

		var wrappers = ["String", "Number", "Math", "Boolean", "JSON"]; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		return util.createNewBuiltinRule(wrappers, function(context, node, symbol) {
			context.report(node, "Do not use %s as a constructor.".replace("%s", symbol)); //$NON-NLS-1$
		}, context);
	};

	return module.exports;
}));
