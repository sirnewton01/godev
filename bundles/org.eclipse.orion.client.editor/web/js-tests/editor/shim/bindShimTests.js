/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*eslint-env amd, browser, mocha*/

define(["chai/chai", "orion/editor/editor"], function(chai, mEditor) {
	var assert = chai.assert;

	describe("shim", function() {

		// ************************************************************************************************
		// Test Function.prototype.bind function
		// The implementation of this function may be provided by editor.js
		var bind = Function.prototype.bind;
		describe("Function.prototype.bind", function() {
			// Test our implementation of "bind"
			it("invokes bound func with the correct 'this'", function() {
				var outerThis = {},
				    innerThis,
				    func = bind.call(
						function () {
							innerThis = this;
						}, outerThis);
				func();
				assert.strictEqual(outerThis, innerThis);
			});
			it("passes param to bound function", function() {
				var outerThis = {},
				    innerThis,
				    param,
				    func = bind.call(
						function(p1) {
							innerThis = this;
							param = p1;
						}, outerThis);
				func("foo");
				assert.strictEqual(outerThis, innerThis);
				assert.strictEqual(param, "foo");
			});
			it("passes multiple params to bound function", function() {
				var outerThis = {},
				    innerThis,
				    param1,
				    param2,
				    func = bind.call(
						function(p1, p2) {
							innerThis = this;
							param1 = p1;
							param2 = p2;
						}, outerThis, "a", "b");
				func();
				assert.strictEqual(outerThis, innerThis);
				assert.strictEqual(param1, "a");
				assert.strictEqual(param2, "b");
			});
			it("passes fixed params before call site params", function() {
				var outerThis = {},
				    innerThis,
				    param1, param2, param3, param4,
				    func = bind.call(
						function(p1, p2, p3, p4) {
							innerThis = this;
							param1 = p1;
							param2 = p2;
							param3 = p3;
							param4 = p4;
						}, outerThis, "a", "b");
				func("c", "d");
				assert.strictEqual(outerThis, innerThis);
				assert.strictEqual(param1, "a");
				assert.strictEqual(param2, "b");
				assert.strictEqual(param3, "c");
				assert.strictEqual(param4, "d");
			});
		}); // bind
	}); // shim
});