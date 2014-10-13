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
/*eslint-env amd*/
/**
 * Implements eslint's load-rules API for AMD. Our rules are loaded as AMD modules.
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
	"eslint/rules/throw-error",
	"eslint/rules/use-isnan",
	'eslint/rules/no-unreachable',
	'eslint/rules/no-fallthrough',
	'eslint/rules/no-jslint',
	'eslint/rules/no-empty-block'
], function(curly, eqeqeq, missing_doc, new_parens, no_debugger, no_dupe_keys, no_eval,
		no_extra_semi, no_new_array, no_new_func, no_new_object, no_new_wrappers, no_redeclare,
		no_undef, no_unused_params, no_unused_vars, no_use_before_define, semi, throw_error, use_isnan,
		no_unreachable, no_fallthrough, no_jslint, no_empty_block) {
		    
     var rules = {
        "curly" : {rule: curly, description: 'Require curly braces for all control statements'},
		"eqeqeq": {rule: eqeqeq, description: 'Require the use of === and !=='},
		"missing-doc" : {rule: missing_doc, description: 'Require JSDoc for all functions'},
		"new-parens" : {rule: new_parens, description: 'Require parenthesis for constructors'},
		"no-debugger" : {rule: no_debugger, description: 'Disallow use of the debugger keyword'},
		"no-dupe-keys" : {rule: no_dupe_keys, description: 'Warn when object contains duplicate keys'},
		"no-eval" : {rule: no_eval, description: 'Disallow use of eval function'},
		"no-extra-semi": {rule: no_extra_semi, description: 'Warn about extraneous semi colons'},
		"no-new-array": {rule: no_new_array, description: 'Disallow use of the Array constructor'},
		"no-new-func": {rule: no_new_func, description: 'Disallow use of the Function constructor'},
		"no-new-object": {rule: no_new_object, description: 'Disallow use of the Object constructor'},
		"no-new-wrappers": {rule: no_new_wrappers, description: 'Disabllow creating new String, Number or Boolean via their constructor'},
		"no-redeclare": {rule: no_redeclare, description: 'Warn when variable or function is redeclared'},
		"no-undef": {rule: no_undef, description: 'Warn when used variable or function has not been defined'},
		"no-unused-params" : {rule: no_unused_params, description: 'Warn when function parameters are not used'},
		"no-unused-vars": {rule: no_unused_vars, description: 'Warn when declared variables are not used'},
		"no-use-before-define": {rule: no_use_before_define, description: 'Warn when a variable or function is used before it is defined'},
		"semi": {rule: semi, description: 'Warn about missing semi colons'},
		"throw-error": {rule: throw_error, description: 'Warn when a non-Error object is used in a throw statement'},
		"use-isnan" : {rule: use_isnan, description: 'Disallow comparison to the value NaN'},
		'no-unreachable' : {rule: no_unreachable, description: 'Warn when code is not reachable'},
		'no-fallthrough' : {rule: no_fallthrough, description: 'Warn when a switch case falls through'},
		'no-jslint': {rule: no_jslint, description: 'Warn when the jslint/jshint directive is used'},
		'no-empty-block' : {rule: no_empty_block, description: 'Warn when a code block is empty'}
    };
    
    /**
     * @name getRules
     * @description The raw rule object
     * @returns {Object} The raw rule object
     */
    function getRules() {
        return rules;
    }
    
    /**
     * @name getESLintRules
     * @description Returns the rule object for ESLint
     * @returns {Object} The rule object
     * @since 7.0
     */
    function getESLintRules() {
        var ruleobj = Object.create(null);
        var keys = Object.keys(rules);
        for (var i=0; i<keys.length; i++) {
            var rule = keys[i];
            ruleobj[rule] = rules[rule].rule;
        }
        return ruleobj;
    }
		    
	return {
	    getRules: getRules,
	    getESLintRules: getESLintRules
	};
});
