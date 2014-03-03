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

/*global define exports module*/
/*jslint eqeq: true */

// This is an implementation of CommonJS UnitTesting 1.0 Assert
(function(root, factory) { // UMD
    if (typeof define === "function" && define.amd) { //$NON-NLS-0$
        define(factory);
    } else if (typeof exports === "object") { //$NON-NLS-0$
        module.exports = factory();
    } else {
        root.orion = root.orion || {};
        root.orion.assert = factory();
    }
}(this, function() {
    function _stringify(obj) {
        try {
            return obj === undefined ? "undefined" : JSON.stringify(obj);
        } catch (ignore) {}
        return String(obj);
    }

    function _deepEqual(actual, expected) {
        if (actual === expected) {
            return true;
        } else if (actual === null || expected === null || typeof actual === "undefined" || typeof expected === "undefined") {
            return false;
        } else if (actual instanceof Date) {
            if (!expected instanceof Date) {
                return false;
            }
            return actual.getTime() === expected.getTime();
        } else if (actual instanceof RegExp) {
            if (!expected instanceof RegExp) {
                return false;
            }
            return actual.toString() === expected.toString();
        } else if (typeof actual !== 'object' && typeof expected !== 'object') {
            return actual == expected; // use of == is defined in spec
        } else {
            if (actual.prototype !== expected.prototype) {
                return false;
            }

			var actualKeys, expectedKeys;
            try {
                actualKeys = Object.keys(actual);
                expectedKeys = Object.keys(expected);
            } catch (e) {
                return false;
            }
            
            if (actualKeys.length !== expectedKeys.length) {
                return false;
            }
            actualKeys.sort();
            expectedKeys.sort();

            var i;
            var length = actualKeys.length;
            for (i = 0; i < length; i++) {
                if (actualKeys[i] !== expectedKeys[i]) {
                    return false;
                }
            }
            for (i = 0; i < length; i++) {
                var key = actualKeys[i];
                if (!_deepEqual(actual[key], expected[key])) {
                    return false;
                }
            }
            return true;
        }
    }

    function AssertionError(options) {
        if (options) {
            this.message = options.message;
            this.actual = options.actual;
            this.expected = options.expected;
        }
        Error.call(this, this.message);

        if (!this.stack) {
            if (this.stacktrace) {
                this.stack = this.stacktrace;
            } else {
                var e = new Error();
                if (e.stack) {
                    this.stack = e.stack;
                }
                if (!e.stack && e.stacktrace) {
                    this.stack = this.stacktrace = e.stacktrace;
                }
            }
        }
    }
    AssertionError.prototype = Object.create(Error.prototype);
    AssertionError.prototype.constructor = AssertionError;
    AssertionError.prototype.toString = function() {
        var result = "AssertionError";
        if (this.message) {
            result += ": " + this.message;
        }
        if (this.actual !== this.expected) {
            result += " - expected: [" + _stringify(this.expected) + "], actual: [" + _stringify(this.actual) + "].";
        }
        return result;
    };

    var assert = function(guard, message_opt) {
        if ( !! !guard) {
            throw new AssertionError({
                message: message_opt || "ok failed",
                expected: true,
                actual: guard
            });
        }
    };
    assert.AssertionError = AssertionError;
    assert.ok = assert;
    assert.equal = function(actual, expected, message_opt) {
        if (actual != expected) { // use of != is defined in spec
            throw new AssertionError({
                message: message_opt || "equal failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.notEqual = function(actual, expected, message_opt) {
        if (actual == expected) { // use of == is defined in spec
            throw new AssertionError({
                message: message_opt || "notEqual failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.deepEqual = function(actual, expected, message_opt) {
        if (!_deepEqual(actual, expected)) {
            throw new AssertionError({
                message: message_opt || "deepEqual failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.notDeepEqual = function(actual, expected, message_opt) {
        if (_deepEqual(actual, expected)) {
            throw new AssertionError({
                message: message_opt || "notDeepEqual failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.strictEqual = function(actual, expected, message_opt) {
        if (actual !== expected) {
            throw new AssertionError({
                message: message_opt || "strictEqual failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.notStrictEqual = function(actual, expected, message_opt) {
        if (actual === expected) {
            throw new AssertionError({
                message: message_opt || "notStrictEqual failed",
                expected: expected,
                actual: actual
            });
        }
    };
    assert.fail = function(message_opt) {
        var message = "Failed";
        if (message_opt) {
            message += ": " + message_opt;
        }
        throw new AssertionError({
            message: message
        });
    };
    assert.throws = function(block, Error_opt, message_opt) {
        if (typeof Error_opt === "string") {
            message_opt = Error_opt;
            Error_opt = undefined;
        }

        try {
            block();
            throw new AssertionError({
                message: message_opt || "throws failed"
            });
        } catch (e) {
            if (Error_opt && !(e instanceof Error_opt)) {
                throw e;
            }
        }
    };
    return assert;
}));