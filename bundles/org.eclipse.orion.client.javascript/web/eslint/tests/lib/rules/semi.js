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
/*global describe it module require*/

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("assert"),
	mocha = require("mocha"),
	eslint = require("../../../lib/eslint");

//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

var RULE_ID = "semi";

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
describe(RULE_ID, function() {
	it("should flag variable declaration lacking ;", function() {
		var topic = "var a=1";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "VariableDeclaration");
	});
	it("should flag variable declaration lacking ; with multiple declarators", function() {
		var topic = "var a=1, b";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "VariableDeclaration");
	});
	it("should flag function call lacking ;", function() {
		var topic = "x()";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "ExpressionStatement");
	});
	it("should flag bare expression lacking ;", function() {
		var topic = "x";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "ExpressionStatement");
	});
	it("should flag 'for' with body statement lacking ;", function() {
		var topic = "for (;;) { var x }";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "VariableDeclaration");
	});
	it("should flag var x; \ny()", function() {
		var topic = "var x;\ny()";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].message, "Missing semicolon.");
		assert.equal(messages[0].node.type, "ExpressionStatement");
	});
	it("should indicate the problematic token in 'related' field", function() {
		var topic = "f(1)";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 1);
		assert.equal(messages[0].ruleId, RULE_ID);
		assert.equal(messages[0].related.type, "Punctuator");
		assert.equal(messages[0].related.value, ")");
	});

	//------------------------------------------------------------------------------
	// Should nots
	//------------------------------------------------------------------------------
	it("should not flag 'for' with initializer", function() {
		var topic = "for (var i;;){}";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 0);
	});
	it("should not flag 1-liner function call", function() {
		var topic = "foo(function() { x = 1; });";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 0);
	});
	it("should not flag 'for' with no BlockStatement", function() {
		var topic = "for (;;)x;";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 0);
	});
	it("should not flag 'for in' with VariableDeclaration", function() {
		var topic = "for (var x in ({}));";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 0);
	});
	it("should not flag 'for in'", function() {
		var topic = "for (x in ({}));";

		var config = { rules: {} };
		config.rules[RULE_ID] = 1;

		var messages = eslint.verify(topic, config);
		assert.equal(messages.length, 0);
	});
});
