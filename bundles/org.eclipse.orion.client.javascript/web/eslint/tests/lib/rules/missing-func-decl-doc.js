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
	flagDecl.rules[RULE_ID] = [1, {decl: 1}];
	
	describe("missing-doc - function declaration", function() {
		describe("should not flag", function() {
			it("for root function declaration", function() {
				var topic = "var v;\n/**foo*/function f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive white space", function() {
				var topic = "var v;\n/**foo*/\n\n\nfunction f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for line comment", function() {
				var topic = "var v;\n//foo\nfunction f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with line comment", function() {
				var topic = "var v;\n//foo\n\n\n\nfunction f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for inner block comment", function() {
				var topic = "var v;\n/***/function o() {/***/function f() {};};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with inner block comment", function() {
				var topic = "var v;\n/***/function o() {/***/\n\n\n\nfunction f() {};};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for inner line comment", function() {
				var topic = "var v;\n/***/function o() {//foo\nfunction f() {};};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
			it("for excessive space with inner line comment", function() {
				var topic = "var v;\n/***/function o() {//foo\n\n\n\nfunction f() {};};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
		describe("should flag", function() {
			it("for function f", function() {
				var topic = "var foo;\nfunction f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'f\'.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("for inner function declaration", function() {
				var topic = "var foo;\n/***/\nfunction o() {\nfunction f() {}; };";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'f\'.");
				assert.equal(messages[0].node.type, "Identifier");
			});
			it("for root node", function() {
				/**
				 * This test covers the Estraverse bug:
				 * https://github.com/Constellation/estraverse/issues/20
				 * 
				 * Fixed with https://bugs.eclipse.org/bugs/show_bug.cgi?id=434994
				 * we no longer require Estraverse to attach comments
				 */
				var topic = "/***/function f() {};";
		
				var config = flagDecl;
		
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
				/*assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "Missing documentation for function \'f\'");
				assert.equal(messages[0].node.type, "Identifier");*/
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