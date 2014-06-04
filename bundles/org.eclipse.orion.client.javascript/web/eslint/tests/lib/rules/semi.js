/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint mocha:true node:true amd:true*/
(function(root, factory) {
	if (typeof exports === "object") //$NON-NLS-0$
		module.exports = factory(require, exports, module, require("assert"), require("../../../lib/eslint"));
	else if(typeof define === "function" && define.amd) //$NON-NLS-0$
		define(["require", "exports", "module", "chai/chai", "eslint"], factory);
}(this, function(require, exports, module, assert, eslint) {
	assert = assert.assert /*chai*/ || assert;

	var RULE_ID = "semi";
	
	describe(RULE_ID, function() {
		it("should flag variable declaration lacking ;", function() {
			var topic = "var a=1";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
		});
		it("should flag variable declaration lacking ; with multiple declarators", function() {
			var topic = "var a=1, b";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
		});
		it("should flag function call lacking ;", function() {
			var topic = "x()";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag bare expression lacking ;", function() {
			var topic = "x";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag 'for' with body statement lacking ;", function() {
			var topic = "for (;;) { var x }";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
		});
		it("should flag var x;ny()", function() {
			var topic = "var x;\ny()";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Missing semicolon.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should indicate the problematic token in 'related' field", function() {
			var topic = "f(1)";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, ")");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in return of call expression", function() {
			var topic = "function f() {return f()}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, ")");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in return of object", function() {
			var topic = "function f2() {return {}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, "}");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in return of string", function() {
			var topic = "function f3() {return 'foo'}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "String");
			assert.equal(messages[0].related.value, "\'foo\'");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in return of number", function() {
			var topic = "function f4() {return 2}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Numeric");
			assert.equal(messages[0].related.value, "2");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in function expression return of number", function() {
			var topic = "var o = {f: function() {return 2}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Numeric");
			assert.equal(messages[0].related.value, "2");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in function expression return of string", function() {
			var topic = "var o = {f: function() {return 'foo'}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "String");
			assert.equal(messages[0].related.value, "\'foo\'");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in function expression return of object", function() {
			var topic = "var o = {f: function() {return {}}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, "}");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in function expression return of call expression", function() {
			var topic = "var o = {f: function() {return this.f()}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, ")");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should indicate the problematic token in function expression with nested function decl and return of call expression", function() {
			var topic = "var o = {f: function() {function inner() {};return inner()}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, ")");
		});
		/**
		 * Used to be not flagged, but not now that we handle call expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should flag 1-liner function call", function() {
			var topic = "foo(function() { x = 1; })";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].related.type, "Punctuator");
			assert.equal(messages[0].related.value, ")");
		});
		//------------------------------------------------------------------------------
		// Should nots
		//------------------------------------------------------------------------------
		it("should not flag 'for' with initializer", function() {
			var topic = "for (var i;;){}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag 'for' with no BlockStatement", function() {
			var topic = "for (;;)x;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag 'for in' with VariableDeclaration", function() {
			var topic = "for (var x in ({}));";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag 'for in'", function() {
			var topic = "for (x in ({}));";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should not flag call expression root", function() {
			var topic = "function f() {} f();";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should not flag call expression return statement", function() {
			var topic = "function f() {return f();}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should not flag call expression return statement from function expression", function() {
			var topic = "var o = {fo: function() {return this.fo();}};o.fo = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427930
		 */
		it("should not flag call expression return statement from nested in function expression", function() {
			var topic = "var o = {fo: function() {function f() {return f();};}};o.fo = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag function expression with nested function decl", function() {
			var topic = "var o = {f: function() {function inner() {}}};o.f = null;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));