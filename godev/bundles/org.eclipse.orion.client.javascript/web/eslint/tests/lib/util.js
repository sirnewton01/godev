/**
 * @fileoverview Tests for util.
 */
/*global describe it require*/
//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var assert = require("assert"),
    mocha = require("mocha"),
    util = require("../../lib/util");

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("util", function() {
    describe("#mixin", function() {
        var topic = function() {
            var a = {}, b = { foo: "f", bar: 1 };
            util.mixin(a, b);
            return [a, b];
        };

        it("should add properties to target object", function() {
            var a = topic()[0];
            assert.equal(Object.keys(a).length, 2);
            assert.equal(a.foo, "f");
            assert.equal(a.bar, 1);
        });

        it("should not change the source object", function() {
            var b = topic()[1];
            assert.equal(Object.keys(b).length, 2);
            assert.equal(b.foo, "f");
            assert.equal(b.bar, 1);
        });
    });
});
