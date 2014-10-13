/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd, node*/
(function(root, factory) { // UMD
    if (typeof define === "function" && define.amd) { //$NON-NLS-0$
        define(["orion/Deferred"], factory);
    } else if (typeof exports === "object") { //$NON-NLS-0$
        module.exports = factory(require("orion/Deferred"));
    } else {
        root.orion = root.orion || {};
        root.orion.PluginProvider = factory(root.orion.Deferred);
    }
}(this, function(Deferred) {
    function ObjectReference(objectId, methods) {
        this.__objectId = objectId;
        this.__methods = methods;
    }

    function PluginProvider(headers) {
        var _headers = headers;
        var _connected = false;
        var _target = null;

        var _currentMessageId = 0;
        var _currentObjectId = 0;
        var _currentServiceId = 0;

        var _requestReferences = {};
        var _responseReferences = {};
        var _objectReferences = {};
        var _serviceReferences = {};

        function _publish(message) {
            if (_target) {
                if (typeof(ArrayBuffer) === "undefined") { //$NON-NLS-0$
                    message = JSON.stringify(message);
                }
                if (_target === self) {
                    _target.postMessage(message);
                } else {
                    _target.postMessage(message, "*"); //$NON-NLS-0$
                }
            }
        }
        var _notify = _publish;

        function _getPluginData() {
            var services = [];
            // we filter out the service implementation from the data
            Object.keys(_serviceReferences).forEach(function(serviceId) {
                var serviceReference = _serviceReferences[serviceId];
                services.push({
                    serviceId: serviceId,
                    names: serviceReference.names,
                    methods: serviceReference.methods,
                    properties: serviceReference.properties
                });
            });
            return {
                headers: _headers || {},
                services: services
            };
        }

        function _jsonXMLHttpRequestReplacer(name, value) {
            if (value && value instanceof XMLHttpRequest) {
                var status, statusText;
                try {
                    status = value.status;
                    statusText = value.statusText;
                } catch (e) {
                    // https://bugs.webkit.org/show_bug.cgi?id=45994
                    status = 0;
                    statusText = ""; //$NON-NLS-0
                }
                return {
                    status: status || 0,
                    statusText: statusText
                };
            }
            return value;
        }

        function _serializeError(error) {
            var result = error ? JSON.parse(JSON.stringify(error, _jsonXMLHttpRequestReplacer)) : error; // sanitizing Error object
            if (error instanceof Error) {
                result.__isError = true;
                result.message = result.message || error.message;
                result.name = result.name || error.name;
            }
            return result;
        }

        function _request(message) {
            if (!_target) {
                return new Deferred().reject(new Error("plugin not connected"));
            }

            message.id = String(_currentMessageId++);
            var d = new Deferred();
            _responseReferences[message.id] = d;
            d.then(null, function(error) {
                if (_connected && error instanceof Error && error.name === "Cancel") {
                    _notify({
                        requestId: message.id,
                        method: "cancel",
                        params: error.message ? [error.message] : []
                    });
                }
            });

            var toString = Object.prototype.toString;
            message.params.forEach(function(param, i) {
                if (toString.call(param) === "[object Object]" && !(param instanceof ObjectReference)) {
                    var candidate, methods;
                    for (candidate in param) {
                        if (toString.call(param[candidate]) === "[object Function]") {
                            methods = methods || [];
                            methods.push(candidate);
                        }
                    }
                    if (methods) {
                        var objectId = _currentObjectId++;
                        _objectReferences[objectId] = param;
                        var removeReference = function() {
                            delete _objectReferences[objectId];
                        };
                        d.then(removeReference, removeReference);
                        message.params[i] = new ObjectReference(objectId, methods);
                    }
                }
            });
            _notify(message);
            return d.promise;
        }

        function _throwError(messageId, error) {
            if (messageId || messageId === 0) {
                _notify({
                    id: messageId,
                    result: null,
                    error: error
                });
            } else {
                console.log(error);
            }

        }

        function _callMethod(messageId, implementation, method, params) {
            params.forEach(function(param, i) {
                if (param && typeof param.__objectId !== "undefined") {
                    var obj = {};
                    param.__methods.forEach(function(method) {
                        obj[method] = function() {
                            return _request({
                                objectId: param.__objectId,
                                method: method,
                                params: Array.prototype.slice.call(arguments)
                            });
                        };
                    });
                    params[i] = obj;
                }
            });
            var response = typeof messageId === undefined ? null : {
                id: messageId,
                result: null,
                error: null
            };
            try {
                var promiseOrResult = method.apply(implementation, params);
                if (!response) {
                    return;
                }

                if (promiseOrResult && typeof promiseOrResult.then === "function") { //$NON-NLS-0$
                    _requestReferences[messageId] = promiseOrResult;
                    promiseOrResult.then(function(result) {
                        delete _requestReferences[messageId];
                        response.result = result;
                        _notify(response);
                    }, function(error) {
                        if (_requestReferences[messageId]) {
                            delete _requestReferences[messageId];
                            response.error = _serializeError(error);
                            _notify(response);
                        }
                    }, function() {
                        _notify({
                            responseId: messageId,
                            method: "progress",
                            params: Array.prototype.slice.call(arguments)
                        }); //$NON-NLS-0$
                    });
                } else {
                    response.result = promiseOrResult;
                    _notify(response);
                }
            } catch (error) {
                if (response) {
                    response.error = _serializeError(error);
                    _notify(response);
                }
            }
        }

        function _handleMessage(event) {
            if (event.source !== _target && typeof window !== "undefined") {
                return;
            }
            var message = (typeof event.data !== "string" ? event.data : JSON.parse(event.data)); //$NON-NLS-0$
            try {
                if (message.method) { // request
                    var method = message.method,
                        params = message.params || [];
                    if ("serviceId" in message) {
                        var service = _serviceReferences[message.serviceId];
                        if (!service) {
                            _throwError(message.id, "service not found");
                        }
                        service = service.implementation;
                        if (method in service) {
                            _callMethod(message.id, service, service[method], params);
                        } else {
                            _throwError(message.id, "method not found");
                        }
                    } else if ("objectId" in message) {
                        var object = _objectReferences[message.objectId];
                        if (!object) {
                            _throwError(message.id, "object not found");
                        }
                        if (!method in object) {
                            _callMethod(message.id, object, object[method], params);
                        } else {
                            _throwError(message.id, "method not found");
                        }
                    } else if ("requestId" in message) {
                        var request = _requestReferences[message.requestId];
                        if (request && method === "cancel" && request.cancel) {
                            request.cancel.apply(request, params);
                        }
                    } else if ("responseId" in message) {
                        var response = _responseReferences[message.responseId];
                        if (response && method === "progress" && response.progress) {
                            response.progress.apply(response, params);
                        }
                    } else {
                        throw new Error("Bad method: " + message.method);
                    }
                } else {
                    var deferred = _responseReferences[String(message.id)];
                    delete _responseReferences[String(message.id)];
                    if (message.error) {
                        deferred.reject(message.error);
                    } else {
                        deferred.resolve(message.result);
                    }
                }
            } catch (e) {
                console.log("Plugin._messageHandler " + e);
            }
        }

        this.updateHeaders = function(headers) {
            if (_connected) {
                throw new Error("Cannot update headers. Plugin Provider is connected");
            }
            _headers = headers;
        };

        this.registerService = function(names, implementation, properties) {
            if (_connected) {
                throw new Error("Cannot register service. Plugin Provider is connected");
            }

            if (typeof names === "string") {
                names = [names];
            } else if (!Array.isArray(names)) {
                names = [];
            }

            var method = null;
            var methods = [];
            for (method in implementation) {
                if (typeof implementation[method] === 'function') { //$NON-NLS-0$
                    methods.push(method);
                }
            }
            _serviceReferences[_currentServiceId++] = {
                names: names,
                methods: methods,
                implementation: implementation,
                properties: properties || {},
                listeners: {}
            };
        };
        this.registerServiceProvider = this.registerService;

        this.connect = function(callback, errback) {
            if (_connected) {
                if (callback) {
                    callback();
                }
                return;
            }

            if (typeof(window) === "undefined") { //$NON-NLS-0$
                _target = self;
            } else if (window !== window.parent) {
                _target = window.parent;
            } else if (window.opener !== null) {
                _target = window.opener;
            } else {
                if (errback) {
                    errback("No valid plugin target");
                }
                return;
            }
            addEventListener("message", _handleMessage, false); //$NON-NLS-0$
            var message = {
                method: "plugin", //$NON-NLS-0$
                params: [_getPluginData()]
            };
            _publish(message);
            _connected = true;
            if (callback) {
                callback();
            }
        };

        this.disconnect = function() {
            if (_connected) {
                removeEventListener("message", _handleMessage); //$NON-NLS-0$
                _target = null;
                _connected = false;
            }
            // Note: re-connecting is not currently supported
        };
    }
    return PluginProvider;
}));