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

	var RULE_ID = "no-jslint";
	
	describe(RULE_ID, function() {
		it("should flag jslint 1", function() {
			var topic = "/* jslint node:true */ if (a == b) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'jslint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jslint 2", function() {
			var topic = "/*jslint node:true*/if (a != b) {} else var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'jslint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jslint 3", function() {
			var topic = "while(true) /*jslint browser:false*/ var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'jslint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jslint 4", function() {
			var topic = "while(true) /*JSLint browser:false*/ var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'JSLint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jshint 1", function() {
			var topic = "/*jshint ecma:true*/ for(true;;) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'jshint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jshint 2", function() {
			var topic = "var o = {}; /* jshint browser:true */ for(var p in o) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'jshint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should flag jshint 3", function() {
			var topic = "var o = {}; /* JSHint browser:true */ for(var p in o) var i = 1;";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 1);
			assert.equal(messages[0].ruleId, RULE_ID);
			assert.equal(messages[0].message, "The 'JSHint' directive is unsupported, please use eslint-env.");
			assert.equal(messages[0].node.type, "BlockComment");
		});
		it("should not flag jslint 1", function() {
			var topic = "/*jslint */ if (a != null) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jslint 2", function() {
			var topic = "/*jslint is not supported*/ if (null != a) {} else {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jslint 3", function() {
			var topic = "/*jslint node: false*/ if (a != undefined) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jslint 4", function() {
			var topic = "//jslint node:false\n if (a != undefined) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jshint 1", function() {
			var topic = "/*jshint */ if (a != null) {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jshint 2", function() {
			var topic = "/*jshint is not supported*/ if (null != a) {} else {var i = 1;}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jshint 3", function() {
			var topic = "/*jshint node: false*/ if (a != undefined) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
		it("should not flag jshint 4", function() {
			var topic = "//jshint node:false\n if (a != undefined) {}";
	
			var config = { rules: {} };
			config.rules[RULE_ID] = 1;
	
			var messages = eslint.verify(topic, config);
			assert.equal(messages.length, 0);
		});
	});
}));