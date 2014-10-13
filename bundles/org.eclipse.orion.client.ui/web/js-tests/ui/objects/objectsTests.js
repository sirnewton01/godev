/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define([
	"chai/chai",
	"orion/objects"
], function(chai, objects) {
	var assert = chai.assert;
	describe("Test Objects", function() {
		it("clone_object", function() {
			var foo = {
				a: "hi",
				b: [-1, 0, 1, NaN],
				c: false,
				d: null,
				e: undefined
			};
			var clone = objects.clone(foo);
	
			assert.notStrictEqual(foo, clone);
			assert.deepEqual(foo, clone);
			assert.strictEqual(foo.b, clone.b); // clone() is shallow, so array should be copied by reference
		});
		it("clone_object_preserves_prototype", function() {
			function Fizz() {
				this.a = 1;
			}
			Fizz.prototype.b = 2;
	
			var foo = new Fizz();
			var clone = objects.clone(foo);
	
			assert.equal(clone.a, 1);
			assert.equal(clone.b, 2);
			assert.equal(Object.getPrototypeOf(clone), Fizz.prototype);
		});
		it("clone_array", function() {
			var foo = ['a', 65535, /a+b/];
			var clone = objects.clone(foo);
	
			assert.deepEqual(foo, clone);
		});
		it("mixin", function() {
			var source = {
				a: false,
				b: "hello"
			};
			var target = {
				c: "world"
			};
			objects.mixin(target, source);
	
			assert.equal(Object.keys(target).length, 3);
			assert.equal(target.a, false);
			assert.equal(target.b, "hello");
			assert.equal(target.c, "world");
		});
		it("mixin_vargs", function() {
			var source1 = { a: 1, b: 2 };
			var source2 = { c: "3" };
			var source3=  { d: "4" };
			var target = {};
			objects.mixin(target, source1, source2, source3);
	
			assert.equal(Object.keys(target).length, 4);
			assert.equal(target.a, 1);
			assert.equal(target.b, 2);
			assert.equal(target.c, "3");
			assert.equal(target.d, "4");
		});
		it("mixin_doesnt_modify_source", function() {
			var source = { a: 1 };
			var target = {};
			objects.mixin(target, source);
	
			assert.equal(Object.keys(source).length, 1);
			assert.equal(source.a, 1);
		});
		it("toArray", function() {
			var arr = ['a'];
			assert.strictEqual(objects.toArray(arr), arr);
	
			var a = null, arrayA = objects.toArray(a);
			assert.equal(arrayA.length, 1);
			assert.strictEqual(arrayA[0], null);
		});
	});
});
