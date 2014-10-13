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

	var RULE_ID = "use-isnan";
	
	describe(RULE_ID, function() {
		it("should flag < on LHS", function() {
			var topic = "if (NaN < 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag < on RHS", function() {
			var topic = "if (1 < NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag > on LHS", function() {
			var topic = "if (NaN > 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag > on RHS", function() {
			var topic = "if (1 > NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag <= on LHS", function() {
			var topic = "if (NaN <= 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag <= on RHS", function() {
			var topic = "if (1 <= NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag >= on LHS", function() {
			var topic = "if (NaN >= 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag >= on RHS", function() {
			var topic = "if (1 >= NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag == on LHS", function() {
			var topic = "if (NaN == 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag == on RHS", function() {
			var topic = "if (1 == NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag != on LHS", function() {
			var topic = "if (NaN != 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag != on RHS", function() {
			var topic = "if (1 != NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag === on LHS", function() {
			var topic = "if (NaN === 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag === on RHS", function() {
			var topic = "if (1 === NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag !== on LHS", function() {
			var topic = "if (NaN !== 1) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("should flag !== on LHS", function() {
			var topic = "if (1 !== NaN) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Use the isNaN function to compare with NaN.");
			assert.equal(messages[0].node.type, "Identifier");
		});
	});
}));