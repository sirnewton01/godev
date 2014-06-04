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

	var RULE_ID = "no-unused-params";
	
	//------------------------------------------------------------------------------
	// Tests
	//------------------------------------------------------------------------------
	describe(RULE_ID, function() {
		it("Should flag unused param simple func decl", function() {
			var topic = "function f(a) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param nested func decl", function() {
			var topic = "function f() {function g(b) {}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'b' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param closed func decl", function() {
			var topic = "(function f(a) {});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param closed nested func decl", function() {
			var topic = "(function f() {function g(b) {}});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'b' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param simple func expr", function() {
			var topic = "var v = function(a) {};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param nested func expr", function() {
			var topic = "var v = function() {var c = function(a) {};};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param closed simple func expr", function() {
			var topic = "var v = function(a) {};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param in closed nested func expr", function() {
			var topic = "var v = function() {var c = function(a) {};};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param object prop func expr ", function() {
			var topic = "var v = {one: function(a) {}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param closed object prop func expr", function() {
			var topic = "var v = {one: function(a) {}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param nested object prop func expr", function() {
			var topic = "var v = {one: function() {var c = {two: function(a) {}};}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param closed nested object prop func expr", function() {
			var topic = "var v = {one: function() {var c = {two: function(a) {}};}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should flag unused param func expr as param", function() {
			var topic = "function f() {}f(function(a) {});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Parameter 'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("Should not flag used param simple use func decl", function() {
			var topic = "function f(a) {var b = a;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param closed simple use func decl", function() {
			var topic = "(function f(a) {var b = a;});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param nested use func decl", function() {
			var topic = "function f(a) {function g() {var b = a;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param closed nested use func decl", function() {
			var topic = "(function f(a) {function g() {var b = a;}});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param simple use func expr", function() {
			var topic = "var v = function(a) {var b = a;};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param closed simple use func expr", function() {
			var topic = "var v = function(a) {var b = a;};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param nested use func expr", function() {
			var topic = "var v = function(a) {var c = function() {var b = a;};};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param closed nested use func expr", function() {
			var topic = "var v = function(a) {var c = function() {var b = a;};};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param object prop simple use func expr", function() {
			var topic = "var v = {one: function(a) {var b = a;}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param object prop closed simple use func expr", function() {
			var topic = "var v = {one: function(a) {var b = a;}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param object prop nested use func expr", function() {
			var topic = "var v = {one: function(a) {var c = {two: function() {var b = a;}};}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param object prop closed nested use func expr", function() {
			var topic = "var v = {one: function(a) {var c = {two: function() {var b = a;}};}};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("Should not flag used param func expr param", function() {
			var topic = "function f() {}f(function(a) {var b = a;});";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));