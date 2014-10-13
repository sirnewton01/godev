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

	var RULE_ID = "missing-doc";
	var flagDecl = { rules: {} };
	var flagExpr = { rules: {} };
	flagDecl.rules[RULE_ID] = [1, {decl: 1}];
	flagExpr.rules[RULE_ID] = [1, {expr: 1}];

	describe("missing-doc - function expression", function() {
		describe("should not flag", function() {
			it("for object property function expression", function() {
				var topic = "var foo = {/**foo*/f: function() {}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive white space", function() {
				var topic = "var foo = {/**foo*/\n\n\n\nf: function() {}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for line comment", function() {
				var topic = "var foo = {//foo\nf: function() {}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with line comment", function() {
				var topic = "var foo = {//foo\n\n\n\n\n\nf: function() {}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for inner block comment", function() {
				var topic = "var foo = {/**foo*/o: function() { var bar = { /***/f: function() {}}}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with inner block comment", function() {
				var topic = "var foo = {/**foo*/o: function() { var bar = { /***/\n\n\n\n\nf: function() {}}}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for inner line comment", function() {
				var topic = "var foo = {/**foo*/o: function() { var bar = { //foo\nf: function() {}}}};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with inner line comment", function() {
				var topic = "var foo = {/**foo*/o: function() { var bar = { //foo\n\n\n\n\n\nf: function() {}}}};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member expression assignment", function() {
				var topic = "var Foo; /***/Foo.bar = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member literal expression assignment", function() {
				var topic = "var Foo; /***/Foo[\'bar\'] = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member expression assignment excessive space", function() {
				var topic = "var Foo; /***/\n\n\n\n\nFoo.bar = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("nfor member literal expression assignment excessive space", function() {
				var topic = "var Foo; /***/\n\n\n\n\nFoo[\'bar\'] = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member expression assignment line comment", function() {
				var topic = "var Foo; //comment\nFoo.bar = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member literal expression assignment line comment", function() {
				var topic = "var Foo; //comment\nFoo[\'bar\'] = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member expression assignment line comment excessive space", function() {
				var topic = "var Foo; //comment\n\n\n\n\n\nFoo.bar = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for member literal expression assignment line comment excessive space", function() {
				var topic = "var Foo; //comment\n\n\n\n\n\nFoo[\'bar\'] = function() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
		describe("should flag", function() {
			it("for function expression f", function() {
				var topic = "var foo = { f: function() {}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'f\'.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("for function expression member", function() {
				var topic = "var Foo; Foo.member = function() {};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'member\'.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("for function expression literal member", function() {
				var topic = "var Foo; Foo[\'member\'] = function() {};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'member\'.");
				assert.equal(messages[0].node.type, "Literal");
			});
			it("for inner function expression", function() {
				var topic = "var foo = {/**foo*/o: function() { var bar = { f: function() {}}}};";
		
				var config = flagExpr;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'f\'.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("should include {type: 'decl'} as related object", function() {
				var topic = "var foo;\nfunction f() {};";

				var config = flagDecl;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].related.type, "decl");
			});
		});
	});
}));