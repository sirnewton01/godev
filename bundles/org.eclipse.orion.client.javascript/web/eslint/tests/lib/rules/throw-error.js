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

	var RULE_ID = "throw-error";
	
	describe(RULE_ID, function() {
		describe("should", function() {
			it("flag thrown Literal", function() {
				var topic = "throw 'a'";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].node.type, "Literal");
			});
			it("flag thrown ObjectExpression", function() {
				var topic = "throw {};";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].node.type, "ObjectExpression");
			});
			it("flag thrown ArrayExpression", function() {
				var topic = "throw [];";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].node.type, "ArrayExpression");
			});
		});
		describe("should not", function() {
			it("flag thrown Identifier", function() {
				var topic = "throw a";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown MemberExpression", function() {
				var topic = "throw a.b";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown NewExpression", function() {
				var topic = "throw new Error()";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown CallExpression", function() {
				var topic = "throw Error()";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown ConditionalExpression", function() {
				var topic = "throw (1 ? 2 : 3);";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown LogicalExpression", function() {
				var topic = "throw 1||2;";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("flag thrown SequenceExpression", function() {
				var topic = "throw 1,2;";
		
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
	});
}));