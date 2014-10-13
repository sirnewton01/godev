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

	var RULE_ID = "no-new-wrappers";
	
	function assertMessages(messages) {
		messages.forEach(function(message) {
			assert.equal(message.ruleId, RULE_ID);
			assert.ok(/Do not use \'\w+\' as a constructor\./.test(message.message), "Has expected message");
			assert.equal(message.node.type, "Identifier");
		});
	}
	
	describe(RULE_ID, function() {
		describe("should", function() {
			// String Number Math Boolean JSON
			it("flag in global scope", function() {
				var topic = "new String; new Number; new Math; new Boolean; new JSON;";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 5);
				assertMessages(messages);
			});
			it("flag when symbol is declared in /*global block", function() {
				var topic = "/*global String Number Math Boolean JSON*/ new String; new Number; new Math; new Boolean; new JSON;";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 5);
				assertMessages(messages);
			});
			it("flag in inner scope", function() {
				var topic = "(function f() { new new String; new Number; new Math; new Boolean; new JSON; }());";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 5);
				assertMessages(messages);
			});
		});
	
		describe("shalt not", function() {
			it("flag when symbol refers to in-scope var - global", function() {
				var topic = "var String, Number, Math, Boolean, JSON; new String; new Number; new Math; new Boolean; new JSON;";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
	
			it("flag when symbol refers to in-scope var - non-global", function() {
				var topic = "var String, Number, Math, Boolean, JSON; function f() { new String; new Number; new Math; new Boolean; new JSON; }";
	
				var config = { rules: {} };
				config.rules[RULE_ID] = 1;
	
				var messages = eslint.verify(topic, config);
				assert.equal(messages.length, 0);
			});
		});
	});
}));