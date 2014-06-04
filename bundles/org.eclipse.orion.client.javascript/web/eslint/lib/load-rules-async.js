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
/*jslint amd:true*/
/**
 * Implements eslint"s load-rules API for AMD. Our rules are loaded as AMD modules.
 */
define([
	"eslint/rules/curly",
	"eslint/rules/eqeqeq",
	"eslint/rules/missing-doc",
	"eslint/rules/new-parens",
	"eslint/rules/no-debugger",
	"eslint/rules/no-dupe-keys",
	"eslint/rules/no-eval",
	"eslint/rules/no-extra-semi",
	"eslint/rules/no-new-array",
	"eslint/rules/no-new-func",
	"eslint/rules/no-new-object",
	"eslint/rules/no-new-wrappers",
	"eslint/rules/no-redeclare",
	"eslint/rules/no-undef",
	"eslint/rules/no-unused-params",
	"eslint/rules/no-unused-vars",
	"eslint/rules/no-use-before-define",
	"eslint/rules/semi",
	"eslint/rules/use-isnan",
], function(curly, eqeqeq, missing_doc, new_parens, no_debugger, no_dupe_keys, no_eval,
		no_extra_semi, no_new_array, no_new_func, no_new_object, no_new_wrappers, no_redeclare,
		no_undef, no_unused_params, no_unused_vars, no_use_before_define, semi, use_isnan) {
	return function() {
		return {
			"curly" : curly,
			"eqeqeq": eqeqeq,
			"missing-doc" : missing_doc,
			"new-parens" : new_parens,
			"no-debugger" : no_debugger,
			"no-dupe-keys" : no_dupe_keys,
			"no-eval" : no_eval,
			"no-extra-semi": no_extra_semi,
			"no-new-array": no_new_array,
			"no-new-func": no_new_func,
			"no-new-object": no_new_object,
			"no-new-wrappers": no_new_wrappers,
			"no-redeclare": no_redeclare,
			"no-undef": no_undef,
			"no-unused-params" : no_unused_params,
			"no-unused-vars": no_unused_vars,
			"no-use-before-define": no_use_before_define,
			"semi": semi,
			"use-isnan" : use_isnan,
		};
	};
});
