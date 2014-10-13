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
/*eslint-env amd, node, mocha*/
(function(root, factory) {
	if (typeof exports === "object") {//$NON-NLS-0$
		module.exports = factory(require, exports, module, require("assert"), require("../../../lib/eslint"));
	} else if(typeof define === "function" && define.amd) { //$NON-NLS-0$
		define(["require", "exports", "module", "chai/chai", "eslint"], factory);
	}
}(this, function(require, exports, module, assert, eslint) {
	assert = assert.assert /*chai*/ || assert;

	var RULE_ID = "curly";
	
	describe(RULE_ID, function() {
		it("should flag if statement", function() {
			var topic = "if (a == b) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Statement should be enclosed in braces.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
			assert.equal(messages[0].related.type, "Keyword");
		});
		it("should flag else", function() {
			var topic = "if (a != b) {} else var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Statement should be enclosed in braces.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
			assert.equal(messages[0].related.type, "Keyword");
		});
		it("should flag while", function() {
			var topic = "while(true) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Statement should be enclosed in braces.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
			assert.equal(messages[0].related.type, "Keyword");
		});
		it("should flag for", function() {
			var topic = "for(true;;) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Statement should be enclosed in braces.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
			assert.equal(messages[0].related.type, "Keyword");
		});
		it("should flag for-in", function() {
			var topic = "var o = {}; for(var p in o) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Statement should be enclosed in braces.");
			assert.equal(messages[0].node.type, "VariableDeclaration");
			assert.equal(messages[0].related.type, "Keyword");
		});
		it("should not flag if with block", function() {
			var topic = "if (a != null) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag else with block", function() {
			var topic = "if (null != a) {} else {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag != for undefined check RHS", function() {
			var topic = "if (a != undefined) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag while with block", function() {
			var topic = "while(true) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag for with block", function() {
			var topic = "for(true;;) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag for-in with block", function() {
			var topic = "var o = {}; for(var p in o) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		
		it("should not flag else-if with no block", function() {
			var topic = "if(true) {var i = 1;}else if(false) {var t = 8;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));