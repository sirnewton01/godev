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

	var RULE_ID = "no-extra-semi";
	
	describe(RULE_ID, function() {
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should flag statement multi", function() {
			var topic = "var a=1;;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unnecessary semicolon.");
			assert.equal(messages[0].node.type, "EmptyStatement");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should flag function expresson statement multi", function() {
			var topic = "var a = function() {};;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unnecessary semicolon.");
			assert.equal(messages[0].node.type, "EmptyStatement");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should flag function declaration", function() {
			var topic = "function a() {};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unnecessary semicolon.");
			assert.equal(messages[0].node.type, "EmptyStatement");
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should flag empty line", function() {
			var topic = ";";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "Unnecessary semicolon.");
			assert.equal(messages[0].node.type, "EmptyStatement");
		});
		
		//------------------------------------------------------------------------------
		// Should nots
		//------------------------------------------------------------------------------
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should not flag function expression", function() {
			var topic = "var a = function() {};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should not flag expression", function() {
			var topic = "var a = 4;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428040
		 */
		it("should not flag object expression", function() {
			var topic = "var a = {};";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));