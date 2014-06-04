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
/*jslint mocha:true node:true amd:true*/
(function(root, factory) {
	if (typeof exports === "object") //$NON-NLS-0$
		module.exports = factory(require, exports, module, require("assert"), require("../../../lib/eslint"));
	else if(typeof define === "function" && define.amd) //$NON-NLS-0$
		define(["require", "exports", "module", "chai/chai", "eslint"], factory);
}(this, function(require, exports, module, assert, eslint) {
	assert = assert.assert /*chai*/ || assert;

	var RULE_ID = "no-undef";

	/**
	 * TODO remove this shim once we have permission to use `chai`
	 */
	assert.include = assert.include || function(actual, expected, message) {
		var has = false;
		if (typeof actual === "string" || Array.isArray(actual)) {
			has = actual.indexOf(expected) !== -1;
		} else if (actual && typeof actual === "object") {
			has = Object.prototype.hasOwnProperty.call(actual, expected);
		}
		if (!has) {
			assert.fail(actual, expected, message || "Expected actual to include expected", "include");
		}
	};

	describe(RULE_ID, function() {

		//------------------------------------------------------------------------------
		// Test undeclared globals
		//------------------------------------------------------------------------------
		describe("undeclared globals", function() {

			it("should report violation when evaluating write to undeclared global", function() {
				var topic = "a = 1;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'a' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should report violation (undeclared global) on read of undeclared global", function() {
				var topic = "var a = b;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should not report a violation when evaluating reference to variable defined in global scope", function() {
				var topic = "var a = 1, b = 2; a;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should report a violation when evaluating reference to undeclared global from function scope", function() {
				var topic = "function f() { b; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should not report a violation when evaluating reference to declared global from function scope", function() {
				var topic = "/*global b*/ function f() { b; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violation when evaluating references to several declared globals", function() {
				var topic = "/*global b a:false*/  a;  function f() { b; a; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violation when evaluating call to function declared at global scope", function() {
				var topic = "function a(){}  a();";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violation when evaluating reference to parameter", function() {
				var topic = "function f(b) { b; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			// https://bugs.eclipse.org/bugs/show_bug.cgi?id=422715
			it("should not flag declared variables as undeclared when 'eval' is used in scope", function() {
				var topic = "(function() { var a = 1; eval(); })();";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});

		//------------------------------------------------------------------------------
		// Test readonly
		//------------------------------------------------------------------------------
		describe("readonly", function() {

			it("should not report a violation when evaluating write to an explicitly declared variable in global scope", function() {
				var topic = "var a; a = 1; a++;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violation when evaluating write to an explicitly declared variable in global scope from function scope", function() {
				var topic = "var a; function f() { a = 1; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violationwhen evaluating write to a declared writeable global", function() {
				var topic = "/*global b:true*/ b++;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should report a violation (readonly) when evaluating write to a declared readonly global", function() {
				var topic = "/*global b:false*/ function f() { b = 1; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is read only.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should report a violation (readonly) when evaluating read+write to a declared readonly global", function() {
				var topic = "/*global b:false*/ function f() { b++; }";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is read only.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should report a violation (readonly) when evaluating write to a declared global that is readonly by default", function() {
				var topic = "/*global b*/ b = 1;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is read only.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should report a violation (readonly) when evaluating write to a redefined global that is readonly", function() {
				var topic = "/*global b:false*/ var b = 1;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'b' is read only.");
				assert.include(messages[0].node.type, "Identifier");
			});
		});

		//------------------------------------------------------------------------------
		// Test browser:true flags
		//------------------------------------------------------------------------------
		describe("browser environment", function() {
			it("should report a violation (undeclared global) when evaluating reference to a browser global", function() {
				var topic = "window;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'window' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should not report a violation when evaluating reference to a browser global with 'jslint browser:true'", function() {
				var topic = "/*jslint browser:true*/ window;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should not report a violation when evaluating reference to a browser global with 'jshint browser:true'", function() {
				var topic = "/*jshint browser:true*/ window;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should report a violation (undeclared global) when evaluating reference to a browser global with 'jshint browser:false'", function() {
				var topic = "/*jshint browser:false*/ window;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'window' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});
		});

		//------------------------------------------------------------------------------
		// Test node:true flags
		//------------------------------------------------------------------------------
		describe("node environment", function() {
			it("should report a violation (undeclared global) when evaluating reference to a node global", function() {
				var topic = "require(\"a\");";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'require' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should not report a violation when evaluating reference to a node global with 'jshint node:true'", function() {
				var topic = "/*jshint node:true*/ require(\"a\");";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should report a violation (undeclared global) when evaluating reference to a node global with 'jshint node:false'", function() {
				var topic = "/*jshint node:false*/ require(\"a\");";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'require' is not defined.");
				assert.include(messages[0].node.type, "Identifier");
			});
		});

		//------------------------------------------------------------------------------
		// Test references to builtins
		//------------------------------------------------------------------------------
		describe("builtins", function() {
			it("should not report a violation when evaluating reference to a builtin", function() {
				var topic = "Object; isNaN();";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});

			it("should report a violation (readonly) when evaluating write to a builtin", function() {
				var topic = "Array = 1;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 1);
				assert.equal(messages[0].ruleId, RULE_ID);
				assert.equal(messages[0].message, "'Array' is read only.");
				assert.include(messages[0].node.type, "Identifier");
			});

			it("should not report a violation when Typed Array globals are used", function() {
				var topic = "ArrayBuffer; DataView; Uint32Array;";

				var config = { rules: {} };
				config.rules[RULE_ID] = 1;

				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});

	});
}));