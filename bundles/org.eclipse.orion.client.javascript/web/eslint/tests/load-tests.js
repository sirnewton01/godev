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
/*jslint amd:true node:true*/
/**
 * This file loads the AMD modules containing tests for eslint.
 */
(function(root, factory) {
	if (typeof exports === "object") {
		// Tolerate being loaded in Node (to avoid breaking Node test scripts), but do nothing.
		module.exports = {};
	} else if (typeof define === "function" && define.amd) {
		define([
			"js-tests/javascript/eslintEventTests",
			"eslint/tests/lib/eslint",
			"eslint/tests/lib/util",
			"eslint/tests/lib/rules/curly",
			"eslint/tests/lib/rules/eqeqeq",
			"eslint/tests/lib/rules/missing-func-decl-doc",
			"eslint/tests/lib/rules/missing-func-expr-doc",
			"eslint/tests/lib/rules/new-parens",
			"eslint/tests/lib/rules/no-debugger",
			"eslint/tests/lib/rules/no-dupe-keys",
			"eslint/tests/lib/rules/no-eval",
			"eslint/tests/lib/rules/no-extra-semi",
			"eslint/tests/lib/rules/no-new-array",
			"eslint/tests/lib/rules/no-new-func",
			"eslint/tests/lib/rules/no-new-object",
			"eslint/tests/lib/rules/no-new-wrappers",
			"eslint/tests/lib/rules/no-redeclare",
			"eslint/tests/lib/rules/no-undef",
			"eslint/tests/lib/rules/no-unused-params",
			"eslint/tests/lib/rules/no-unused-vars",
			"eslint/tests/lib/rules/no-use-before-define",
			"eslint/tests/lib/rules/semi",
			"eslint/tests/lib/rules/use-isnan"
		], factory);
	}
}(this, function() {
	// exports are ignored
}));