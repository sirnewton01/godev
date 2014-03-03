/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global describe it*/
/*jslint node:true*/

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("assert"),
	eslint = require("../../../lib/eslint");

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

var RULE_ID = "no-unused-vars";

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
describe(RULE_ID, function() {
	describe("should", function() {
		it("flag unused var in Program", function() {
			var topic = "var a;";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("flag unused var in FunctionExpression", function() {
			var topic = "(function() { var a; }); ";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "'a' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("flag unused var in FunctionDeclaration", function() {
			var topic = "function f() {var b;} f();";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;


			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "'b' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("flag var that is written but never read", function() {
			var topic = "var a=1; a=2;";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "'a' is never read.");
			assert.equal(messages[0].node.type, "Identifier");
		});
		it("flag function that is never called", function() {
			var topic = "function f() {}";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "'f' is never used.");
			assert.equal(messages[0].node.type, "Identifier");
		});
	});

	describe("should not", function() {
		it("flag unused param in FunctionExpression", function() {
			var topic = "(function(a) {} ());";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag unused parameters in FunctionDeclaration", function() {
			var topic = "function f(a, b) {} f();";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag var that appears in an Expression context", function() {
			var topic = "var a; a;";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag function that is called", function() {
			var topic = "function f() {} f();";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag var from Program scope that is used in a child scope", function() {
			var topic = "var a; (function() { a; });";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag var from upper scope that is used in a child scope", function() {
			var topic = "(function() { var a; (function() { a; }); });";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("flag var that is used in a read+write reference", function() {
			var topic = "var b; b=1; a.foo = b++;";

			var config = { rules: {} };
			config.rules[RULE_ID] = 1;

			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
});
