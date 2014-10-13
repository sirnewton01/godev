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

	var RULE_ID = "no-fallthrough";
	
	describe(RULE_ID, function() {
		it("should flag simple case 1", function() {
			var topic = "switch(a) {case 1: foo; case 2: foo;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Switch case may be entered by falling through the previous case. If intended, add a new comment //$FALLTHROUGH$ on the line above.");
			assert.equal(messages[0].node.type, "SwitchCase");
		});
		it("should flag simple case 2", function() {
			var topic = "switch(a) {case 1:{ foo;} case 2:{ foo;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Switch case may be entered by falling through the previous case. If intended, add a new comment //$FALLTHROUGH$ on the line above.");
			assert.equal(messages[0].node.type, "SwitchCase");
		});
		it("should flag nested case", function() {
			var topic = "switch(a) {case 1: switch(b) {case 1: foo; case 2: foo;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Switch case may be entered by falling through the previous case. If intended, add a new comment //$FALLTHROUGH$ on the line above.");
			assert.equal(messages[0].node.type, "SwitchCase");
		});
		it("should flag default", function() {
			var topic = "switch(a) {case 1: foo; default:break;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Switch case may be entered by falling through the previous case. If intended, add a new comment //$FALLTHROUGH$ on the line above.");
			assert.equal(messages[0].node.type, "SwitchCase");
		});
		it("should not flag break;", function() {
			var topic = "switch(a) {case 1: foo; break; case 2: foo;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag throw", function() {
			var topic = "switch(a) {case 1: foo; throw e; case 2: foo;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag continue", function() {
			var topic = "while(c) {switch(a) {case 1: foo; continue; case 2: foo;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag return", function() {
			var topic = "function f() {switch(a) {case 1: foo; return; case 2: foo;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag empty case 1", function() {
			var topic = "switch(a) {case 1: case 2: foo;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag empty case 2", function() {
			var topic = "switch(a) {case 1: {} case 2: foo;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag doc'd fallthrough 1", function() {
			var topic = "switch(a) {case 1: foo; //$FALLTHROUGH$\ndefault:break;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		
		it("should not flag doc'd fallthrough 2", function() {
			var topic = "switch(a) {case 1: switch(b) {case 1: foo; //$FALLTHROUGH$\ncase 2: foo;}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));
