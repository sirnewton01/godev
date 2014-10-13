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

	var RULE_ID = "no-eval";
	
	describe(RULE_ID, function() {
		it("should flag eval() use in if", function() {
			var topic = "if (a == b) {eval();}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag eval() use in function decl", function() {
			var topic = "function f() {eval();}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag eval() use in function expr", function() {
			var topic = "var f = function() {eval();}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag eval() use in global", function() {
			var topic = "eval();";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag eval() use in case", function() {
			var topic = "var v = 0; switch(v) {case 0: eval(); break;};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag eval() use in object", function() {
			var topic = "var v = {v: function() {eval();}}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "\'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag setInterval() use call literal arg", function() {
			var topic = "function setInterval() {} setInterval('code', 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Implicit \'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag setInterval() use call infer literal arg", function() {
			var topic = "function setInterval() {} var s = 'code'; setInterval(s, 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Implicit \'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should not flag setInterval() use call non literal", function() {
			var topic = "function setInterval() {} setInterval({}, 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should flag setTimeout() use call literal arg", function() {
			var topic = "function setTimeout() {} setTimeout('code', 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Implicit \'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag setTimeout() use call infer literal arg", function() {
			var topic = "function setTimeout() {} var s = 'code'; setTimeout(s, 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Implicit \'eval\' function calls are discouraged.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should not flag setTimeout() use call non-literal", function() {
			var topic = "function setTimeout() {} setTimeout({}, 300);";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));