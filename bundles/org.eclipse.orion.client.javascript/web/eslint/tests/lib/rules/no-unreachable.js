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

	var RULE_ID = "no-unreachable";
	
	describe(RULE_ID, function() {
		it("should flag function decl return", function() {
			var topic = "function f() {return\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag function decl throw", function() {
			var topic = "function f() {throw e;\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag function decl multi return", function() {
			var topic = "function f() {return\ntrue;\nfalse;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Unreachable code.");
			assert.equal(messages[1].node.type, "ExpressionStatement");
		});
		it("should flag while throw", function() {
			var topic = "while(true) {throw e;\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag while continue", function() {
			var topic = "while(true) {continue\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag while break", function() {
			var topic = "while(true) {break\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag while break multi", function() {
			var topic = "while(true) {break\ntrue;\nfalse;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Unreachable code.");
			assert.equal(messages[1].node.type, "ExpressionStatement");
		});
		it("should flag for continue", function() {
			var topic = "for(true;;) {continue\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for break", function() {
			var topic = "for(true;;) {break\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for throw", function() {
			var topic = "for(true;;) {throw e;\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for throw multi", function() {
			var topic = "for(true;;) {throw e;\ntrue;\nfalse;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Unreachable code.");
			assert.equal(messages[1].node.type, "ExpressionStatement");
		});
		it("should flag for-in continue", function() {
			var topic = "for(var p in o) {continue\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for-in break", function() {
			var topic = "for(var p in o) {break\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for-in throw", function() {
			var topic = "for(var p in o) {throw e;\ntrue;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
		});
		it("should flag for-in continue multi", function() {
			var topic = "for(var p in o) {continue\ntrue;\nfalse;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 2);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unreachable code.");
			assert.equal(messages[0].node.type, "ExpressionStatement");
			assert.equal(messages[1].ruleId, RULE_ID);
			assert.equal(messages[1].message, "Unreachable code.");
			assert.equal(messages[1].node.type, "ExpressionStatement");
		});
		it("should not flag hoisted func decl in func decl", function() {
			var topic = "function f() {return\nfunction r(){}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag hoisted var decl func decl", function() {
			var topic = "function f() {return\nvar t = r;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag EmptyStatement", function() {
			var topic = "function f() {return;;}";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));