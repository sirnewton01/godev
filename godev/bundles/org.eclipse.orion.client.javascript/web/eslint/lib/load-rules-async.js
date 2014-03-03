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
/*global define require*/
/**
 * Implements eslint's load-rules API for AMD. Our rules are loaded as AMD modules.
 */
define([
	"eslint/rules/eqeqeq",
	"eslint/rules/no-redeclare",
	"eslint/rules/no-undef",
	"eslint/rules/no-unused-vars",
	"eslint/rules/no-use-before-define",
	"eslint/rules/semi",
	"eslint/rules/no-extra-semi",
	"eslint/rules/missing-doc"
], function(eqeqeq, no_redeclare, no_undef, no_unused_vars, no_use_before_define, semi, no_extra_semi, missing_doc) {
	return function() {
		return {
			"eqeqeq": eqeqeq,
			"no-redeclare": no_redeclare,
			"no-undef": no_undef,
			"no-unused-vars": no_unused_vars,
			"no-use-before-define": no_use_before_define,
			"semi": semi,
			"no-extra-semi": no_extra_semi,
			"missing-func-decl-doc" : missing_doc,
			"missing-func-expr-doc" : missing_doc
		};
	};
});
