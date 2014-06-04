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

	var RULE_ID = "no-dupe-keys";
	
	describe(RULE_ID, function() {
		it("should not flag single prototypal property", function() {
			var topic = "var o = {toString: function() {}, two: 2, one: 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should flag double prototypal property", function() {
			var topic = "var o = {toString: function() {}, two: 2, \'toString\': 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'toString'");
			assert.equal(messages[0].node.type, "Property");
		});
		it("should not flag single literal prototypal property", function() {
			var topic = "var o = {\'toString\': function() {}, two: 2, one: 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should flag double literal prototypal property", function() {
			var topic = "var o = {\'toString\': function() {}, two: 2, toString: 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'toString'");
			assert.equal(messages[0].node.type, "Property");
		});
		it("should flag single dupe", function() {
			var topic = "var o = {one: 1, two: 2, one: 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
		});
		it("should flag single literal dupe", function() {
			var topic = "var o = {\'one\': 1, two: 2, one: 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
		});
		it("should flag double literal dupe", function() {
			var topic = "var o = {\'one\': 1, two: 2, \'one\': 3}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
		});
		it("should flag multi dupe", function() {
			var topic = "var o = {one: 1, two: 2, one: 3, two: 4}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Duplicate object key 'two'");
			assert.equal(messages[1].node.type, "Property");
		});
		it("should flag multi dupe of same key", function() {
			var topic = "var o = {one: 1, two: 2, one: 3, three: 4, one: 5}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Duplicate object key 'one'");
			assert.equal(messages[1].node.type, "Property");
		});
		it("should flag multi dupe of multi keys", function() {
			var topic = "var o = {one: 1, two: 2, one: 3, two: 7, three: 4, one: 5, two: 6}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 4);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Duplicate object key 'one'");
			assert.equal(messages[0].node.type, "Property");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Duplicate object key 'two'");
			assert.equal(messages[1].node.type, "Property");
			assert.equal(messages[2].ruleId, RULE_ID);
			assert.equal(messages[2].message, "Duplicate object key 'one'");
			assert.equal(messages[2].node.type, "Property");
			assert.equal(messages[3].ruleId, RULE_ID);
			assert.equal(messages[3].message, "Duplicate object key 'two'");
			assert.equal(messages[3].node.type, "Property");
		});
	});
}));