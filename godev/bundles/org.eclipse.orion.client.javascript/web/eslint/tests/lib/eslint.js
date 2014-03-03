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
/*global describe it require*/

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("assert"),
	mocha = require("mocha"),
	eslint = require("../../lib/eslint");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------
describe("eslint", function() {
	describe("#getScope", function() {
		var topic = "function f() {} \n var g = function() {}";

		it("should return global scope when called from Program", function() {
			var config = { rules: {} };

			eslint.reset();
			eslint.on("Program", function(node) {
				var scope = eslint.getScope();
				assert.equal(scope.type, "global");
				assert.equal(scope.block, node);
			});

			eslint.verify(topic, config, true /* do not reset */);
		});
		it("should return function scope when called from FunctionDeclaration", function() {
			var config = { rules: {} };

			eslint.reset();
			eslint.on("FunctionDeclaration", function(node) {
				var scope = eslint.getScope();
				assert.equal(scope.type, "function");
				assert.equal(scope.block, node);
			});

			eslint.verify(topic, config, true);
		});
		it("should return function scope when called from FunctionExpression", function() {
			var config = { rules: {} };

			eslint.reset();
			eslint.on("FunctionExpression", function(node) {
				var scope = eslint.getScope();
				assert.equal(scope.type, "function");
				assert.equal(scope.block, node);
			});

			eslint.verify(topic, config, true);
		});
	});
});
