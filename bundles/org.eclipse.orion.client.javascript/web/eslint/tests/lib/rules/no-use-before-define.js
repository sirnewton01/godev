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

	var RULE_ID = "no-use-before-define";
	
	describe(RULE_ID, function() {
		it("should not flag reference to builtin", function() {
			var topic = "isNaN(Math.sqrt(-1)); Object.keys(a);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag reference to parameter", function() {
			var topic = "(function(a) { a; }())";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag reference to 'arguments' object", function() {
			var topic = "(function() { arguments; }())";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		describe("'vars' option only", function() {
			it("should flag var use that precedes declaration in Program", function() {
				var topic = "a; var a;";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, true, false];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should flag var use that precedes declaration in FunctionDeclaration", function() {
				var topic = "function f() { alert(a); var a; }";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, true, false];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should flag var use that precedes declaration in FunctionExpression", function() {
				var topic = "(function() { a; var a; }());";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, true, false];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should not flag funcs", function() {
				var topic = "f(); function f(){}";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, true, false];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
		describe("'funcs' option only", function() {
			it("should flag function call that precedes declaration in Program", function() {
				var topic = "f(); function f() {}";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, false, true];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'f' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should flag function call that precedes function declaration in FunctionDeclaration", function() {
				var topic = "function g() { f(); function f() {} }";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, false, true];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'f' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should not flag vars", function() {
				var topic = "a; var a;";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, false, true];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
		describe("both 'vars' and 'funcs' options", function() {
			it("should flag both", function() {
				var topic = "a; f; var a; function f() {}";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = [1, true, true];
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 2);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' was used before it was defined.");
				assert.equal(messages[1].ruleId, RULE_ID);
				assert.equal(messages[1].message, "'f' was used before it was defined.");
			});
		});
		describe("default options", function() {
			it("should flag only vars", function() {
				var topic = "a; f; var a; function f() {}";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' was used before it was defined.");
				assert.equal(messages[0].node.type, "Identifier");
			});
		});
	});
}));