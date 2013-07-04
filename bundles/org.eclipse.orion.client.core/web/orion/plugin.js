/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global window ArrayBuffer addEventListener removeEventListener self XMLHttpRequest define*/ (function() {
	var global = this;
	if (!global.define) {
		global.define = function(f) {
			global.orion = global.orion || {};
			global.orion.PluginProvider = f();
			global.eclipse = global.orion; // (deprecated) backward compatibility 
			delete global.define;
		};
	}
}());

define(function() {
	function PluginProvider(headers) {
		var _headers = headers;
		var _services = [];
		var _connected = false;
		var _activePromises = {};
		var _target = null;

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

		function _getPluginData() {
			var services = [];
			// we filter out the service implementation from the data
			for (var i = 0; i < _services.length; i++) {
				services.push({
					serviceId: i,
					names: _services[i].names,
					methods: _services[i].methods,
					properties: _services[i].properties
				});
			}
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

		function _createListener(serviceId) {
			return function(event) {
				if (_connected) {
					var message = {
						serviceId: serviceId,
						method: "dispatchEvent", //$NON-NLS-0$
						params: [event]
					};
					_publish(message);
				}
			};
		}

		function _handleRequest(event) {
			if (event.source !== _target) {
				return;
			}
			var message = (typeof event.data !== "string" ? event.data : JSON.parse(event.data)); //$NON-NLS-0$
			if (typeof message.cancel === "string") {
				var promise = _activePromises[message.id];
				if (promise) {
					delete _activePromises[message.id];
					if (promise.cancel) {
						promise.cancel(message.cancel);
					}
				}
				return;
			}
			var serviceId = message.serviceId;
			var methodName = message.method;
			var params = message.params;
			var service = _services[serviceId];
			var implementation = service.implementation;
			var method = implementation[methodName];

			var type;
			if (methodName === "addEventListener") {
				type = params[0];
				service.listeners[type] = service.listeners[type] || _createListener(serviceId);
				params = [type, service.listeners[type]];
			} else if (methodName === "removeEventListener") {
				type = params[0];
				params = [type, service.listeners[type]];
				delete service.listeners[type];
			}

			var response = {
				id: message.id,
				result: null,
				error: null
			};
			try {
				var promiseOrResult = method.apply(implementation, params);
				if (promiseOrResult && typeof promiseOrResult.then === "function") { //$NON-NLS-0$
					_activePromises[message.id] = promiseOrResult;
					promiseOrResult.then(function(result) {
						delete _activePromises[message.id];
						response.result = result;
						_publish(response);
					}, function(error) {
						if (_activePromises[message.id]) {
							delete _activePromises[message.id];
							response.error = _serializeError(error);
							_publish(response);
						}
					}, function() {
						_publish({
							requestId: message.id,
							method: "progress",
							params: Array.prototype.slice.call(arguments)
						}); //$NON-NLS-0$
					});
				} else {
					response.result = promiseOrResult;
					_publish(response);
				}
			} catch (error) {
				response.error = _serializeError(error);
				_publish(response);
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
			var serviceId = _services.length;
			_services[serviceId] = {
				names: names,
				methods: methods,
				implementation: implementation,
				properties: properties || {},
				listeners: {}
			};
		};
		this.registerServiceProvider = this.registerService; // (deprecated) backwards compatibility only

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
			addEventListener("message", _handleRequest, false); //$NON-NLS-0$
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
				removeEventListener("message", _handleRequest); //$NON-NLS-0$
				_target = null;
				_connected = false;
			}
			// Note: re-connecting is not currently supported
		};
	}
	return PluginProvider;
});