/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["orion/Deferred", "orion/EventTarget", "orion/URL-shim"], function(Deferred, EventTarget) {

    function _equal(obj1, obj2) {
        var keys1 = Object.keys(obj1);
        var keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) {
            return false;
        }
        keys1.sort();
        keys2.sort();
        for (var i = 0, len = keys1.length; i < len; i++) {
            var key = keys1[i];
            if (key !== keys2[i]) {
                return false;
            }
            var value1 = obj1[key],
                value2 = obj2[key];
            if (value1 === value2) {
                continue;
            }
            if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                return false;
            }
        }
        return true;
    }

    var httpOrHttps = new RegExp("^http[s]?", "i");

    function _normalizeURL(url) {
        if (url.indexOf("://") === -1) { //$NON-NLS-0$
            try {
                return new URL(url, location.href).href;
            } catch (e) {
                // URL SyntaxError, etc.
            }
        }
        return url;
    }

    function _asStorage(obj) {
        var _keys = null;

        function _getKeys() {
            return (_keys = _keys || Object.keys(obj));
        }

        var result = {
            key: function(index) {
                return _getKeys()[index];
            },
            getItem: function(key) {
                return obj[key];
            },
            setItem: function(key, value) {
                obj[key] = value;
                _keys = null;
            },
            removeItem: function(key) {
                delete obj[key];
                _keys = null;
            },
            clear: function() {
                _getKeys().forEach(function(key) {
                    delete obj[key];
                }.bind(this));
                _keys = null;
            }
        };
        Object.defineProperty(result, "length", {
            get: function() {
                return _getKeys().length;
            }
        });
        return result;
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

    function PluginEvent(type, plugin) {
        this.type = type;
        this.plugin = plugin;
    }

    function ObjectReference(objectId, methods) {
        this.__objectId = objectId;
        this.__methods = methods;
    }

    /**
     * Creates a new plugin. This constructor is private and should only be called by the plugin registry.
     * @class Represents a single plugin in the plugin registry.
     * @description
     * <p>At any given time, a plugin is in exactly one of the following six states:</p>
     *
     * <dl>
     *
     * <dt><code>"uninstalled"</code></dt>
     * <dd>The plugin has been uninstalled and may not be used.
     * <p>The <code>uninstalled</code> state is only visible after a plugin has been uninstalled; the plugin is unusable, but
     * references to its <code>Plugin</code> object may still be available and used for introspection.
     * </dd>
     *
     * <dt><code>"installed"</code></dt>
     * <dd>The plugin is installed, but not yet resolved.
     * <p></p>
     * </dd>
     *
     * <dt><code>"resolved"</code></dt>
     * <dd>The plugin is resolved and is able to be started.
     * <p>Note that the plugin is not active yet. A plugin must be in the <code>resolved</code> state before it can be started.</p>
     * <p>The <code>resolved</code> state is reserved for future use. Future versions of the framework may require successful
     * dependency resolution before moving a plugin to the <code>resolved</code> state.</p>
     * </dd>
     *
     * <dt><code>"starting"</code></dt>
     * <dd>The plugin is in the process of starting.
     * <p>A plugin is in the <code>starting</code> state when its {@link #start} method has been called but has not yet resolved.
     * Once the start call resolves, the plugin has successfully started and moves to the <code>active</code> state.</p>
     * <p>If the plugin has a lazy activation policy, it may remain in the <code>starting</code> state for some time until the
     * activation is triggered.</p>
     * </dd>
     *
     * <dt><code>"stopping"</code></dt>
     * <dd>The plugin is in the process of stopping. 
     * <p>A plugin is in the <code>stopping</code> state when its {@link #stop} method has been called but not yet resolved.
     * Once the stop call resolves, the plugin moves to the <code>resolved</code> state.</dd>
     *
     * <dt><code>"active"</code></dt>
     * <dd>The plugin is running. It has been successfully started and activated.
     * <p>In the <code>active</code> state, any services the plugin provides are available for use.</p></dd>
     *
     * </dl>
     *
     * @name orion.pluginregistry.Plugin
     */
    function Plugin(_url, _manifest, _internalRegistry) {
        var _this = this;
        _manifest = _manifest || {};
        var _created = _manifest.created || new Date().getTime();
        var _headers = _manifest.headers || {};
        var _services = _manifest.services || [];
        var _autostart = _manifest.autostart;
        var _lastModified = _manifest.lastModified || 0;

        var _state = "installed";

        var _deferredStateChange;
        var _deferredLoad;

        var _channel;
        var _parent;
        var _remoteServices = {};

        var _currentMessageId = 0;
        var _currentObjectId = 0;
        //var _currentServiceId = 0; not supported yet...

        var _requestReferences = {};
        var _responseReferences = {};
        var _objectReferences = {};
        var _serviceReferences = {};


        function _notify(message) {
            if (!_channel) {
                return;
            }
            _internalRegistry.postMessage(message, _channel);
        }

        function _request(message) {
            if (!_channel) {
                return new Deferred().reject(new Error("plugin not connected"));
            }

            message.id = String(_currentMessageId++);
            var d = new Deferred();
            _responseReferences[message.id] = d;
            d.then(null, function(error) {
                if (_state === "active" && error instanceof Error && error.name === "Cancel") {
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
            _internalRegistry.postMessage(message, _channel);
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


        var _update; // this is a forward reference to a function declared above this.update

        function _messageHandler(message) {
            try {
                if (message.method) { // request
                    var method = message.method,
                        params = message.params || [];
                    if ("serviceId" in message) {
                        var service = _serviceReferences[message.serviceId];
                        if (!service) {
                            _throwError(message.id, "service not found");
                        }
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
                        if (method in object) {
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
                        if ("plugin" === message.method) { //$NON-NLS-0$
                        	_channel.connected();
                            var manifest = message.params[0];
                            _update({
                                headers: manifest.headers,
                                services: manifest.services
                            }).then(function() {
                            	if (_deferredLoad) {
                                	_deferredLoad.resolve(_this);
                                }
                            });
                        } else if ("timeout" === message.method) {
                            if (_deferredLoad) {
                                _deferredLoad.reject(message.error);
                            }
                        } else {
                            throw new Error("Bad method: " + message.method);
                        }
                    }
                } else {
                    var deferred = _responseReferences[String(message.id)];
                    delete _responseReferences[String(message.id)];
                    if (message.error) {
                        var error = _internalRegistry.handleServiceError(_this, message.error);
                        deferred.reject(error);
                    } else {
                        deferred.resolve(message.result);
                    }
                }
            } catch (e) {
                console.log("Plugin._messageHandler " + e);
            }
        }

        function _createServiceProxy(service) {
            var serviceProxy = {};
            if (service.methods) {
                service.methods.forEach(function(method) {
                    serviceProxy[method] = function() {
                        var message = {
                            serviceId: service.serviceId,
                            method: method,
                            params: Array.prototype.slice.call(arguments)
                        };
                        if (_state === "active") {
                            return _request(message);
                        } else {
                            return _this.start({
                                "transient": true
                            }).then(function() {
                                return _request(message);
                            });
                        }
                    };
                });

                if (serviceProxy.addEventListener && serviceProxy.removeEventListener) {
                    var eventTarget = new EventTarget();
                    var objectId = _currentObjectId++;
                    _objectReferences[objectId] = {
                        handleEvent: eventTarget.dispatchEvent.bind(eventTarget)
                    };
                    var listenerReference = new ObjectReference(objectId, ["handleEvent"]);

                    var _addEventListener = serviceProxy.addEventListener;
                    serviceProxy.addEventListener = function(type, listener) {
                        if (!eventTarget._namedListeners[type]) {
                            _addEventListener(type, listenerReference);
                        }
                        eventTarget.addEventListener(type, listener);
                    };
                    var _removeEventListener = serviceProxy.removeEventListener;
                    serviceProxy.removeEventListener = function(type, listener) {
                        eventTarget.removeEventListener(type, listener);
                        if (!eventTarget._namedListeners[type]) {
                            _removeEventListener(type, listenerReference);
                        }
                    };
                }
            }
            return serviceProxy;
        }

        function _createServiceProperties(service) {
            var properties = JSON.parse(JSON.stringify(service.properties));
            properties.__plugin__ = _url; //TODO: eliminate
            var objectClass = service.names || service.type || [];
            if (!Array.isArray(objectClass)) {
                objectClass = [objectClass];
            }
            properties.objectClass = objectClass;
            return properties;
        }

        function _registerService(service) {
            var serviceProxy = _createServiceProxy(service);
            var properties = _createServiceProperties(service);
            var registration = _internalRegistry.registerService(service.names || service.type, serviceProxy, properties);
            _remoteServices[service.serviceId] = {
                registration: registration,
                proxy: serviceProxy
            };
        }

        function _persist() {
            _internalRegistry.persist(_url, {
                created: _created,
                headers: _headers,
                services: _services,
                autostart: _autostart,
                lastModified: _lastModified
            });
        }
        
        this._default = false; // used to determine if a plugin is part of the configuration

        this._persist = _persist;

        this._resolve = function() {
            // check manifest dependencies when we support them
            _state = "resolved";
            _internalRegistry.dispatchEvent(new PluginEvent("resolved", _this));
        };

        this._getAutostart = function() {
            return _autostart;
        };

        this._getCreated = function() {
            return _created;
        };

        /**
         * Returns the URL location of this plugin.
         * @name orion.pluginregistry.Plugin#getLocation
         * @return {String} The URL of this plugin.
         * @function
         */
        this.getLocation = function() {
            return _url;
        };

        /**
         * Returns the headers of this plugin.
         * @name orion.pluginregistry.Plugin#getHeaders
         * @return {Object} The plugin headers.
         * @function
         */
        this.getHeaders = function() {
            return JSON.parse(JSON.stringify(_headers));
        };

        this.getName = function() {
            var headers = this.getHeaders();
            if (headers) {
                return headers.name || "";
            }
            return null;
        };

        this.getVersion = function() {
            var headers = this.getHeaders();
            if (headers) {
                return headers.version || "0.0.0";
            }
            return null;
        };

        this.getLastModified = function() {
            return _lastModified;
        };

        /**
         * Returns the service references provided by this plugin.
         * @name orion.pluginregistry.Plugin#getServiceReferences
         * @return {orion.serviceregistry.ServiceReference[]} The service references provided by this plugin.
         * @function 
         */
        this.getServiceReferences = function() {
            var result = [];
            Object.keys(_remoteServices).forEach(function(serviceId) {
                result.push(_remoteServices[serviceId].registration.getReference());
            });
            return result;
        };

        /**
         * Sets the parent of this plugin.
         * @name orion.pluginregistry.Plugin#setParent
         * @param {DOMElement} [parent=null] the plugin parent. <code>null</code> puts the plugin in the default parent of the plugin registry
         * @return {orion.Promise} A promise that will resolve when the plugin parent has been set.
         * @function 
         */
        this.setParent = function(parent) {
        	if (_parent !== parent) {
        		_parent = parent;
        		return _this.stop({
                    "transient": true
                }).then(function() {
					if ("started" === _autostart) {
		                return _this.start({
		                    "transient": true
		                });
					} else if ("lazy" === _autostart) {
                		return _this.start({	
                    		"lazy": true,
							"transient": true
						});
            		}
				});	
			}
			return new Deferred().resolve();
        };

        /**
         * Returns this plugin's current state.
         * @name orion.pluginregistry.Plugin#getState
         * @returns {String} This plugin's state.
         * @function
         */
        this.getState = function() {
            return _state;
        };
        
         /**
         * @name orion.pluginregistry.Plugin#getProblemLoading
         * @description Returns true if there was a problem loading this plug-in, false otherwise. This function is not API and may change in future releases.
         * @private
         * @function
         * @returns {String} Return an true if there was a problem loading this plug-in.
         */
        this.getProblemLoading = function() {
            if (_this._problemLoading){
            	return true;
            }
            return false;
        };

        this.start = function(optOptions) {
            if (_state === "uninstalled") {
                return new Deferred().reject(new Error("Plugin is uninstalled"));
            }

            if (_deferredStateChange) {
                return _deferredStateChange.promise.then(this.start.bind(this, optOptions));
            }

            if (_state === "active") {
                return new Deferred().resolve();
            }

            if (!optOptions || !optOptions.transient) {
                var autostart = optOptions && optOptions.lazy ? "lazy" : "started";
                if (autostart !== _autostart) {
                    _autostart = autostart;
                    _persist();
                }
            }

            var frameworkState = _internalRegistry.getState();
            if (frameworkState !== "starting" && frameworkState !== "active") {
                if (optOptions.transient) {
                    return new Deferred().reject(new Error("start transient error"));
                }
                return new Deferred().resolve();
            }

            if (_state === "installed") {
                try {
                    this._resolve();
                } catch (e) {
                    return new Deferred().reject(e);
                }
            }

            if (_state === "resolved") {
                _services.forEach(function(service) {
                    _registerService(service);
                });
            }

            if (optOptions && optOptions.lazy) {
                if (_state !== "starting") {
                    _state = "starting";
                    _internalRegistry.dispatchEvent(new PluginEvent("lazy activation", _this));
                }
                return new Deferred().resolve();
            }
            
            var deferredStateChange = new Deferred();
            _deferredStateChange = deferredStateChange;
            _state = "starting";
            _this._problemLoading = null;
            _internalRegistry.dispatchEvent(new PluginEvent("starting", _this));
            _deferredLoad = new Deferred();
            _channel = _internalRegistry.connect(_url, _messageHandler, _parent);
            _deferredLoad.then(function() {
                _deferredLoad = null;
                _state = "active";
                _internalRegistry.dispatchEvent(new PluginEvent("started", _this));
                _deferredStateChange = null;
                deferredStateChange.resolve();
            }, function() {
                _deferredLoad = null;
                _state = "stopping";
                _internalRegistry.dispatchEvent(new PluginEvent("stopping", _this));
                Object.keys(_remoteServices).forEach(function(serviceId) {
                    _remoteServices[serviceId].registration.unregister();
                    delete _remoteServices[serviceId];
                });
                _internalRegistry.disconnect(_channel);
                _channel = null;
                _state = "resolved";
                _deferredStateChange = null;
                _internalRegistry.dispatchEvent(new PluginEvent("stopped", _this));
                _this._problemLoading = true;
                deferredStateChange.reject(new Error("Failed to load plugin: " + _url));
                if (_this._default) {
                	_lastModified = 0;
                	_persist();
                }
            });
            return deferredStateChange.promise;
        };

        this.stop = function(optOptions) {
            if (_state === "uninstalled") {
                return new Deferred().reject(new Error("Plugin is uninstalled"));
            }

            if (_deferredStateChange) {
                return _deferredStateChange.promise.then(this.stop.bind(this, optOptions));
            }

            if (!optOptions || !optOptions.transient) {
                if ("stopped" !== _autostart) {
                    _autostart = "stopped";
                    _persist();
                }
            }

            if (_state !== "active" && _state !== "starting") {
                return new Deferred().resolve();
            }

            var deferredStateChange = new Deferred();
            _deferredStateChange = deferredStateChange;

            _state = "stopping";
            _internalRegistry.dispatchEvent(new PluginEvent("stopping", _this));
            Object.keys(_remoteServices).forEach(function(serviceId) {
                _remoteServices[serviceId].registration.unregister();
                delete _remoteServices[serviceId];
            });
            if (_channel) {
                _internalRegistry.disconnect(_channel);
                _channel = null;
            }
            _state = "resolved";
            _deferredStateChange = null;
            _internalRegistry.dispatchEvent(new PluginEvent("stopped", _this));
            deferredStateChange.resolve();

            return deferredStateChange.promise;
        };

        _update = function(input) {
        	_this.problemLoading = null;
        	
            if (_state === "uninstalled") {
                return new Deferred().reject(new Error("Plugin is uninstalled"));
            }

            if (!input) {
                if (_lastModified === 0) {
                    _lastModified = new Date().getTime();
                    _persist();
                }
                return _internalRegistry.loadManifest(_url).then(_update, function() {
                	_this._problemLoading = true;
                	if (_this._default) {
                		_lastModified = 0;
                		_persist();
                	}
                	console.log("Failed to load plugin: " + _url);
                });
            }

            var oldHeaders = _headers;
            var oldServices = _services;
            var oldAutostart = _autostart;
            _headers = input.headers || {};
            _services = input.services || [];
            _autostart = input.autostart || _autostart;

            if (input.lastModified) {
                _lastModified = input.lastModified;
            } else {
                _lastModified = new Date().getTime();
                _persist();
            }

            if (_equal(_headers, oldHeaders) && _equal(_services, oldServices) && _autostart === oldAutostart) {
                return new Deferred().resolve();
            }

            if (_state === "active" || _state === "starting") {
                var serviceIds = [];
                Object.keys(_services).forEach(function(serviceId) {
                    var service = _services[serviceId];
                    serviceIds.push(serviceId);
                    var remoteService = _remoteServices[serviceId];
                    if (remoteService) {
                        if (_equal(service.methods, Object.keys(remoteService.proxy))) {
                            var properties = _createServiceProperties(service);
                            var reference = remoteService.registration.getReference();
                            var currentProperties = {};
                            reference.getPropertyKeys().forEach(function(name) {
                                currentProperties[name] = reference.getProperty(name);
                            });
                            if (!_equal(properties, currentProperties)) {
                                remoteService.registration.setProperties(properties);
                            }
                            return;
                        }
                        remoteService.registration.unregister();
                        delete _remoteServices[serviceId];
                    }
                    _registerService(service);
                });
                Object.keys(_remoteServices).forEach(function(serviceId) {
                    if (serviceIds.indexOf(serviceId) === -1) {
                        _remoteServices[serviceId].registration.unregister();
                        delete _remoteServices[serviceId];
                    }
                });
            }

            if (_state === "active") {
                _internalRegistry.disconnect(_channel);
                _deferredLoad = new Deferred();
                _channel = _internalRegistry.connect(_url, _messageHandler, _parent);
                _deferredLoad.then(function() {
                    _deferredLoad = null;
                }, function() {
                    _deferredLoad = null;
                    _state = "stopping";
                    _internalRegistry.dispatchEvent(new PluginEvent("stopping"), _this);
                    Object.keys(_remoteServices).forEach(function(serviceId) {
                        _remoteServices[serviceId].registration.unregister();
                        delete _remoteServices[serviceId];
                    });
                    _internalRegistry.disconnect(_channel);
                    _channel = null;
                    _state = "resolved";
                    _internalRegistry.dispatchEvent(new PluginEvent("stopped", _this));
                });
            }
            return new Deferred().resolve();
        };

        this.update = function(input) {
            return _update(input).then(function() {
                _internalRegistry.dispatchEvent(new PluginEvent("updated", _this));
            });
        };

        /**
         * Uninstalls this plugin.
         * @name orion.pluginregistry.Plugin#uninstall
         * @return {orion.Promise} A promise that will resolve when the plugin has been uninstalled.
         * @function
         */
        this.uninstall = function() {
            if (_state === "uninstalled") {
                return new Deferred().reject(new Error("Plugin is uninstalled"));
            }

            if (_state === "active" || _state === "starting" || _state === "stopping") {
                return this.stop().then(this.uninstall.bind(this), this.uninstall.bind(this));
            }

            _internalRegistry.removePlugin(this);
            _state = "uninstalled";
            _internalRegistry.dispatchEvent(new PluginEvent("uninstalled", _this));
            return new Deferred().resolve();
        };
    }

    /**
     * Dispatched when a plugin has been installed. The type of this event is <code>"installed"</code>.
     * @name orion.pluginregistry.PluginRegistry#installed
     * @event
     */
    /**
     * Dispatched when a plugin has been resolved. The type of this event is <code>"resolved"</code>.
     * @name orion.pluginregistry.PluginRegistry#resolved
     * @event
     */
    /**
     * Dispatched when a plugin is starting due to a lazy activation. The type of this event is <code>"lazy activation"</code>.
     * @name orion.pluginregistry.PluginRegistry#lazy_activation
     * @event
     */
    /**
     * Dispatched when a plugin is starting. The type of this event is <code>"starting"</code>.
     * @name orion.pluginregistry.PluginRegistry#starting
     * @event
     */
    /**
     * Dispatched when a plugin is started. The type of this event is <code>"started"</code>.
     * @name orion.pluginregistry.PluginRegistry#started
     * @event
     */
    /**
     * Dispatched when a plugin is stopping. The type of this event is <code>"stopping"</code>.
     * @name orion.pluginregistry.PluginRegistry#stopping
     * @event
     */
    /**
     * Dispatched when a plugin is stopped. The type of this event is <code>"stopped"</code>.
     * @name orion.pluginregistry.PluginRegistry#stopped
     * @event
     */
    /**
     * Dispatched when a plugin has been updated. The type of this event is <code>"updated"</code>.
     * @name orion.pluginregistry.PluginRegistry#updated
     * @event
     */
    /**
     * Dispatched when a plugin has been uninstalled. The type of this event is <code>"uninstalled"</code>.
     * @name orion.pluginregistry.PluginRegistry#uninstalled
     * @event
     */

    /**
     * Creates a new plugin registry.
     * @class The Orion plugin registry
     * @name orion.pluginregistry.PluginRegistry
     * @description The plugin registry maintains a list of {@link orion.pluginregistry.Plugin}s, which can provide services
     * to the given <code>serviceRegistry</code>.
     *
     * <p>The plugin registry dispatches plugin events when one of its plugins changes state. Each such event contains a
     * <code>plugin</code> field giving the affected {@link orion.pluginregistry.Plugin}.
     * </p>
     *
     * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to register plugin-provided services with.
     * @param {Object} [opt_storage=localStorage] Target object to read and write plugin metadata from.
     * @param {Boolean} [opt_visible=false] Whether a loaded plugin's iframe will be displayed. By default it is not displayed.
     * @borrows orion.serviceregistry.EventTarget#addEventListener as #addEventListener
     * @borrows orion.serviceregistry.EventTarget#removeEventListener as #removeEventListener
     */
    function PluginRegistry(serviceRegistry, configuration) {
        configuration = configuration || {};
        var _storage = configuration.storage || localStorage;
        if (!_storage.getItem) {
            _storage = _asStorage(_storage);
        }
        var _state = "installed";
        var _parent;
        var _plugins = [];
        var _channels = [];
        var _pluginEventTarget = new EventTarget();
        var _installing = {};

        var internalRegistry = {
            registerService: serviceRegistry.registerService.bind(serviceRegistry),
            connect: function(url, handler, parent, timeout) {
                var channel = {
                    handler: handler,
                    url: url
                };

                function sendTimeout(message) {
                    var error = new Error(message);
                    error.name = "timeout";
                    handler({
                        method: "timeout",
                        error: error
                    });
                }

                var loadTimeout = setTimeout(sendTimeout.bind(null, "Load timeout for: " + url), timeout || 15000);
                var iframe = document.createElement("iframe"); //$NON-NLS-0$
                iframe.name = url + "_" + new Date().getTime();
                iframe.src = url;
                iframe.onload = function() {
                    clearTimeout(loadTimeout);
                    loadTimeout = setTimeout(sendTimeout.bind(null, "Plugin handshake timeout for: " + url), 5000);
                };
                iframe.sandbox = "allow-scripts allow-same-origin"; //$NON-NLS-0$
        		iframe.style.width = iframe.style.height = "100%"; //$NON-NLS-0$
	        	iframe.frameBorder = 0;
                (parent || _parent).appendChild(iframe);
                channel.target = iframe.contentWindow;
                channel.connected = function() {
                	clearTimeout(loadTimeout);
                };
                channel.close = function() {
                    clearTimeout(loadTimeout);
                    if (iframe) {
                    	var parent = iframe.parentNode;
                        if (parent) {
                        	parent.removeChild(iframe);
                        }
                        iframe = null;
                    }
                };
                _channels.push(channel);
                return channel;
            },
            disconnect: function(channel) {
                for (var i = 0; i < _channels.length; i++) {
                    if (channel === _channels[i]) {
                        _channels.splice(i, 1);
                        try {
                            channel.close();
                        } catch (e) {
                            // best effort
                        }
                        break;
                    }
                }
            },
            removePlugin: function(plugin) {
                for (var i = 0; i < _plugins.length; i++) {
                    if (plugin === _plugins[i]) {
                        _plugins.splice(i, 1);
                        break;
                    }
                }
                _storage.removeItem("plugin." + plugin.getLocation());
            },
            persist: function(url, manifest) {
                _storage.setItem("plugin." + url, JSON.stringify(manifest)); //$NON-NLS-0$
            },
            postMessage: function(message, channel) {
                channel.target.postMessage((channel.useStructuredClone ? message : JSON.stringify(message)), channel.url);
            },
            dispatchEvent: function(event) {
                try {
                    _pluginEventTarget.dispatchEvent(event);
                } catch (e) {
                    if (console) {
                        console.log("PluginRegistry.dispatchEvent " + e);
                    }
                }
            },
            loadManifest: function(url) {
                var d = new Deferred();
                var channel = internalRegistry.connect(url, function(message) {
                    if (!channel || !message.method) {
                        return;
                    }
                    if ("manifest" === message.method || "plugin" === message.method) { //$NON-NLS-0$
                        var manifest = message.params[0];
                        internalRegistry.disconnect(channel);
                        channel = null;
                        d.resolve(manifest);
                    } else if ("timeout" === message.method) {
                        internalRegistry.disconnect(channel);
                        channel = null;
                        d.reject(message.error);
                    }
                });
                return d.promise;
            },
            getState: function() {
                return _state;
            },
            handleServiceError: function(plugin, error) {
                if (error && error.status === 401) {
                    var headers = plugin.getHeaders();
                    var name = plugin.getName() || plugin.getLocation();
                    var span = document.createElement("span");
                    span.appendChild(document.createTextNode("Authentication required for: " + name + "."));
                    if (headers.login) {
                        span.appendChild(document.createTextNode(" "));
                        var anchor = document.createElement("a");
                        anchor.target = "_blank";
                        anchor.textContent = "Login";
                        anchor.href = headers.login;
                        if (!httpOrHttps.test(anchor.href)) {
                            console.log("Illegal Login URL: " + headers.login);
                        } else {
                            span.appendChild(anchor);
                            span.appendChild(document.createTextNode(" and re-try the request."));
                        }
                    }
                    var serializer = new XMLSerializer();
                    return {
                        Severity: "Error",
                        HTML: true,
                        Message: serializer.serializeToString(span)
                    };
                }
                if (error.__isError) {
                    var original = error;
                    error = new Error(original.message);
                    Object.keys(original).forEach(function(key) {
                        error[key] = original[key];
                    });
                    delete error.__isError;
                }
                return error;
            }
        };

        this.getLocation = function() {
            return "System";
        };

        this.getHeaders = function() {
            return {};
        };

        this.getName = function() {
            return "System";
        };

        this.getVersion = function() {
            return "0.0.0";
        };

        this.getLastModified = function() {
            return 0;
        };

        this.getState = internalRegistry.getState;


        function _messageHandler(event) { //$NON-NLS-0$
            var source = event.source;
            _channels.some(function(channel) {
                if (source === channel.target) {
                    try {
                        var message;
                        if (typeof channel.useStructuredClone === "undefined") {
                            var useStructuredClone = typeof event.data !== "string"; //$NON-NLS-0$
                            message = useStructuredClone ? event.data : JSON.parse(event.data);
                            channel.useStructuredClone = useStructuredClone;
                        } else {
                            message = channel.useStructuredClone ? event.data : JSON.parse(event.data);
                        }
                        channel.handler(message);
                    } catch (e) {
                        // not a valid message -- ignore it
                    }
                    return true; // e.g. break
                }
            });
        }


        this.init = function() {
            if (_state === "starting" || _state === "active" || _state === "stopping") {
                return;
            }
            addEventListener("message", _messageHandler, false);
            var storageKeys = [];
            for (var i = 0, length = _storage.length; i < length; i++) {
                storageKeys.push(_storage.key(i));
            }
            storageKeys.forEach(function(key) {
                if (key.indexOf("plugin.") === 0) {
                    var url = key.substring("plugin.".length);
                    var manifest = JSON.parse(_storage.getItem(key));
                    if (manifest.created) {
                        _plugins.push(new Plugin(url, manifest, internalRegistry));
                    }
                }
            });
            _plugins.sort(function(a, b) {
                return a._getCreated() < b._getCreated() ? -1 : 1;
            });
            
            if (configuration.parent) {
            	_parent = configuration.parent;
            } else {
	            _parent = document.createElement("div"); //$NON-NLS-0$
	            if (!configuration.visible) {
                    _parent.style.display = "none"; //$NON-NLS-0$
                    _parent.style.visibility = "hidden"; //$NON-NLS-0$
                }
	            document.body.appendChild(_parent);
            }

            if (configuration.plugins) {
                Object.keys(configuration.plugins).forEach(function(url) {
                    url = _normalizeURL(url);
                    //					if (!httpOrHttps.test(url)) {
                    //						console.log("Illegal Plugin URL: " + url);
                    //						return;
                    //					}
                    var plugin = this.getPlugin(url);
                    if (!plugin) {
                        var manifest = configuration.plugins[url];
                        if (typeof manifest !== "object") {
                        	manifest = {};
                        }
                        manifest.autostart = manifest.autostart || configuration.defaultAutostart || "lazy";
                        plugin = new Plugin(url, manifest, internalRegistry);
                        plugin._default = true;
                        _plugins.push(plugin);
                    } else {
                    	plugin._default = true;
                    }
                }.bind(this));
            }
            _state = "starting";
        };

        /**
         * Starts the plugin registry.
         * @name orion.pluginregistry.PluginRegistry#start
         * @return {orion.Promise} A promise that will resolve when the registry has been fully started.
         * @function 
         */
        this.start = function() {
            if (_state !== "starting") {
                this.init();
            }
            if (_state !== "starting") {
                return new Deferred().reject("Cannot start framework. Framework is already " + _state + ".");
            }
            var deferreds = [];
            var now = new Date().getTime();
            _plugins.forEach(function(plugin) {
                var autostart = plugin._getAutostart();
                if (plugin.getLastModified() === 0) {
                    deferreds.push(plugin.update().then(function() {
                        if ("started" === autostart) {
                            return plugin.start({
                                "transient": true
                            });
                        }
                        if ("lazy" === autostart) {
                            return plugin.start({
                                "lazy": true,
                                    "transient": true
                            });
                        }
                        plugin._resolve();
                    }));
                    return;
                }

                if ("started" === autostart) {
                    deferreds.push(plugin.start({
                        "transient": true
                    }));
                } else if ("lazy" === autostart) {
                    deferreds.push(plugin.start({
                        "lazy": true,
                            "transient": true
                    }));
                    if (now > plugin.getLastModified() + 86400000) { // 24 hours
                        plugin.update();
                    }
                } else {
                    plugin._resolve();
                }
            });
            return Deferred.all(deferreds, function(e) {
                console.log("PluginRegistry.stop " + e);
            }).then(function() {
                _state = "active";
            });
        };

        /**
         * Shuts down the plugin registry.
         * @name orion.pluginregistry.PluginRegistry#stop
         * @function 
         * @returns {orion.Promise} A promise that will resolve when the registry has been stopped.
         */
        this.stop = function() {
            if (_state !== "starting" && _state !== "active") {
                return new Deferred().reject("Cannot stop registry. Registry is already " + _state + ".");
            }
            _state = "stopping";
            var deferreds = [];
            _plugins.forEach(function(plugin) {
                deferreds.push(plugin.stop({
                    "transient": true
                }));
            });
            return Deferred.all(deferreds, function(e) {
                console.log("PluginRegistry.stop " + e);
            }).then(function() {
				if (!configuration.parent) {
            		var parentNode = _parent.parentNode;
            		if (parentNode) {
		            	parentNode.removeChild(_parent);
            		}
            	}
            	_parent = null;
                removeEventListener("message", _messageHandler);
                _state = "resolved";
            });
        };

        this.update = function() {
            this.stop().then(this.start.bind(this));
        };

        this.uninstall = function() {
            return new Deferred().reject("Cannot uninstall registry");
        };


        /**
         * Installs the plugin at the given location into the plugin registry.
         * @name orion.pluginregistry.PluginRegistry#installPlugin
         * @param {String} url The location of the plugin.
         * @param {Object} [optManifest] The plugin metadata.
         * @returns {orion.Promise} A promise that will resolve when the plugin has been installed.
         * @function 
         */
        this.installPlugin = function(url, optManifest) {
            url = _normalizeURL(url);
            //			if (!httpOrHttps.test(url)) {
            //				return new Deferred().reject("Illegal Plugin URL: " + url);
            //			}
            var plugin = this.getPlugin(url);
            if (plugin) {
                return new Deferred().resolve(plugin);
            }

            if (_installing[url]) {
                return _installing[url];
            }

            if (optManifest) {
                plugin = new Plugin(url, optManifest, internalRegistry);
                _plugins.push(plugin);
                plugin._persist();
                internalRegistry.dispatchEvent(new PluginEvent("installed", plugin));
                return new Deferred().resolve(plugin);
            }

            var promise = internalRegistry.loadManifest(url).then(function(manifest) {
                plugin = new Plugin(url, manifest, internalRegistry);
                _plugins.push(plugin);
                plugin._persist();
                delete _installing[url];
                internalRegistry.dispatchEvent(new PluginEvent("installed", plugin));
                return plugin;
            }, function(error) {
                delete _installing[url];
                throw error;
            });
            _installing[url] = promise;
            return promise;
        };

        /**
         * Returns all installed plugins.
         * @name orion.pluginregistry.PluginRegistry#getPlugins
         * @return {orion.pluginregistry.Plugin[]} An array of all installed plugins.
         * @function 
         */
        this.getPlugins = function() {
            return _plugins.slice();
        };

        /**
         * Returns the installed plugin with the given URL.
         * @name orion.pluginregistry.PluginRegistry#getPlugin
         * @return {orion.pluginregistry.Plugin} The installed plugin matching the given URL, or <code>null</code>
         * if no such plugin is installed.
         * @function 
         */
        this.getPlugin = function(url) {
            var result = null;
            url = _normalizeURL(url);
            _plugins.some(function(plugin) {
                if (url === plugin.getLocation()) {
                    result = plugin;
                    return true;
                }
            });
            return result;
        };

        this.addEventListener = _pluginEventTarget.addEventListener.bind(_pluginEventTarget);

        this.removeEventListener = _pluginEventTarget.removeEventListener.bind(_pluginEventTarget);

        this.resolvePlugins = function() {
            var allResolved = true;
            _plugins.forEach(function(plugin) {
                allResolved = allResolved && plugin._resolve();
            });
            return allResolved;
        };
    }
    return {
        Plugin: Plugin,
        PluginRegistry: PluginRegistry
    };
});