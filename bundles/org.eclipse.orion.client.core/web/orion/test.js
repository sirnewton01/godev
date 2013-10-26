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
/*jslint regexp: true */
/*global define window console top self setTimeout*/

define(['orion/Deferred', 'orion/assert', 'orion/EventTarget', 'require'], function(Deferred, assert, EventTarget, require) {
    // Time to wait before declaring an async test failed. A test function can override this by defining a 'timeout' property.
    var DEFAULT_TIMEOUT = 30000;

    function _serializeTasks(tasks) {
        var length = tasks.length;
        var current = 0;
        var promise = new Deferred();

        function _next() {
            while (current !== length) {
                try {
                    var result = tasks[current++]();
                    if (result && typeof result.then === "function") {
                        result.then(_next, _next);
                        return promise;
                    }
                } catch (e) {}
            }
            promise.resolve();
            return promise;
        }
        return _next();
    }

    function _list(prefix, obj) {
        var result = [],
            property,
            test,
            testName;

        for (property in obj) {
            if (property.match(/^test/)) {
                test = obj[property];
                testName = prefix ? prefix + "." + property : property;
                if (typeof test === "function") {
                    result.push(testName);
                } else if (typeof test === "object") {
                    result = result.concat(_list(testName, test, result));
                }
            }
        }
        return result;
    }


    function Test() {
        var _namedListeners = {};

        function _dispatchEvent(event) {
            if (!event.type) {
                throw new Error("unspecified type");
            }
            var listeners = _namedListeners[event.type];
            if (!listeners) {
                return;
            }
            listeners.forEach(function(listener) {
                try {
                    if (typeof listener === "function") {
                        listener(event);
                    } else {
                        listener.handleEvent(event);
                    }
                } catch (e) {
                    if (typeof console !== 'undefined') {
                        console.log(e); // for now, probably should dispatch an ("error", e)
                    }
                }
            });
        }

        function _testDone(name, result, startTime, message, stack) {
            var event = {
                type: "testDone",
                name: name,
                result: result,
                elapsed: new Date().getTime() - startTime
            };
            if (typeof message !== 'undefined') {
                event.message = message;
            }
            if (typeof stack !== 'undefined') {
                event.stack = stack;
            }
            _dispatchEvent(event);
        }

        function _createTestWrapper(name, test) {
            return function() {
                _dispatchEvent({
                    type: "testStart",
                    name: name
                });
                var startTime = new Date().getTime();
                try {
                    var testResult = test();
                    if (testResult && typeof testResult.then === "function") {
                        var calledBack = false;
                        var d = new Deferred();
                        setTimeout(function() {
                            if (!calledBack) {
                                d.reject("Timed out");
                            }
                        }, (typeof test.timeout === 'number' ? test.timeout : DEFAULT_TIMEOUT));
                        testResult.then(d.resolve, d.reject);
                        return d.then(function() {
                            calledBack = true;
                            _testDone(name, true, startTime);
                        }, function(e) {
                            calledBack = true;
                            _testDone(name, false, startTime, e && e.toString(), e && (e.stack || e.stacktrace));
                        });
                    } else {
                        _testDone(name, true, startTime);
                        return testResult;
                    }
                } catch (e) {
                    _testDone(name, false, startTime, e.toString(), e.stack || e.stacktrace);
                    return e;
                }
            };
        }

        function _createRunWrapper(prefix, obj) {
            return function(optTestName) {
                var tasks = [];
                _dispatchEvent({
                    type: "runStart",
                    prefix: prefix
                });
                for (var property in obj) {
                    if (property.match(/^test/)) {
                        var name = prefix ? prefix + "." + property : property;
                        var test = obj[property];
                        if (typeof test === "function") {
                            if (!optTestName || name === optTestName) {
                                tasks.push(_createTestWrapper(name, test));
                            }
                        } else if (typeof test === "object") {
                            tasks.push(_createRunWrapper(name, test));
                        }
                    }
                }

                return _serializeTasks(tasks).then(function() {
                    _dispatchEvent({
                        type: "runDone",
                        prefix: prefix
                    });
                });
            };
        }

        this.addEventListener = function(eventName, listener) {
            _namedListeners[eventName] = _namedListeners[eventName] || [];
            _namedListeners[eventName].push(listener);
        };

        this.removeEventListener = function(eventName, listener) {
            var listeners = _namedListeners[eventName];
            if (listeners) {
                for (var i = 0; i < listeners.length; i++) {
                    if (listeners[i] === listener) {
                        if (listeners.length === 1) {
                            delete _namedListeners[eventName];
                        } else {
                            _namedListeners[eventName].splice(i, 1);
                        }
                        break;
                    }
                }
            }
        };

        this.hasEventListener = function(eventName) {
            if (!eventName) {
                return !!(_namedListeners.runStart || _namedListeners.runDone || _namedListeners.testStart || _namedListeners.testDone);
            }
            return !!_namedListeners[eventName];
        };

        this.list = function(name, obj) {
            if (typeof obj === "undefined") {
                obj = name;
                name = "";
            }

            if (!obj || typeof obj !== "object") {
                throw new Error("not a test object");
            }
            return _list(name, obj);
        };

        window._gTestPluginProviderRegistered = false;
        this.run = function(obj, optTestName) {
            if (!obj || typeof obj !== "object") {
                throw new Error("not a test object");
            }
            var _run = _createRunWrapper("", obj);
            var that = this;

            if (!this.useLocal && top !== self) {
                var result = new Deferred();
                try {
                    require(["orion/plugin"], function(PluginProvider) {
                        if (window._gTestPluginProviderRegistered) {
                            result.reject("Error: skipping test provider -- only one top-level test provider is allowed");
                        }

                        var provider = new PluginProvider();
                        window._gTestPluginProviderRegistered = true;
                        var impl = {
                            run: function() {
                                var testName = arguments[0] || optTestName;
                                Deferred.when(_run(testName), result.resolve.bind(result));
                                return result;
                            },
                            list: function() {
                                return _list("", obj);
                            }
                        };
                        EventTarget.attach(impl);
                        provider.registerService("orion.test.runner", impl);

                        provider.connect(function() {
                            that.addEventListener("runStart", function(event) {
                                impl.dispatchEvent(event);
                            });
                            that.addEventListener("runDone", function(event) {
                                impl.dispatchEvent(event);
                            });
                            that.addEventListener("testStart", function(event) {
                                impl.dispatchEvent(event);
                            });
                            that.addEventListener("testDone", function(event) {
                                impl.dispatchEvent(event);
                            });
                            //that.addConsoleListeners();
                        }, function() {
                            if (!that.hasEventListener()) {
                                that.addConsoleListeners();
                            }
                            Deferred.when(_run(optTestName), result.resolve.bind(result));
                        });
                    });
                    return result;
                } catch (e) {
                    // fall through
                    console.log(e);
                }
            }
            // if no listeners add the console
            if (!this.hasEventListener()) {
                this.addConsoleListeners();
            }
            return _run(optTestName);
        };
    }

    Test.prototype.addConsoleListeners = function() {
        var times = {};
        var testCount = 0;
        var failures = 0;
        var top;

        this.addEventListener("runStart", function(event) {
            var name = event.prefix ? event.prefix : "<top>";
            if (!top) {
                top = name;
            }
            console.log("[Test Run] - " + name + " start");
            times[name] = new Date().getTime();
        });
        this.addEventListener("runDone", function(event) {
            var name = event.prefix ? event.prefix : "<top>";
            var result = [];
            result.push("[Test Run] - " + name + " done - ");
            if (name === top) {
                result.push("[Failures:" + failures + (name === top ? ", Test Count:" + testCount : "") + "] ");
            }
            result.push("(" + (new Date().getTime() - times[name]) / 1000 + "s)");
            delete times[name];
            console.log(result.join(""));
        });
        this.addEventListener("testStart", function(event) {
            times[event.name] = new Date().getTime();
            testCount++;
        });
        this.addEventListener("testDone", function(event) {
            var result = [];
            result.push(event.result ? " [passed] " : " [failed] ");
            if (!event.result) {
                failures++;
            }
            result.push(event.name);
            result.push(" (" + (new Date().getTime() - times[event.name]) / 1000 + "s)");
            delete times[event.name];
            if (!event.result) {
                result.push("\n  " + event.message);
                if (event.stack) {
                    result.push("\n Stack Trace:\n" + event.stack);
                }
            }
            console.log(result.join(""));
        });
    };

    var exports = new Test();
    exports.Test = Test;
    return exports;
});