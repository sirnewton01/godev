/*******************************************************************************
 * @license
 * Copyright (c) 2010-2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global define setTimeout clearTimeout addEventListener removeEventListener document console localStorage location URL Worker XMLSerializer*/

define(["orion/Deferred", "orion/EventTarget", "orion/URL-shim"], function(Deferred, EventTarget, _){

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
			var value1 = obj1[key], value2 = obj2[key];
			if (value1 === value2) {
				continue;
			}
			if (JSON.stringify(value1) !== JSON.stringify(value2)) {
				return false;
			}
		}
		return true;		
	}
	
	var httpOrHttps = new RegExp("^http[s]?","i");
	
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
		
		return {
			key: function(index) {
				return _getKeys()[index];
			},
			getItem: function(key) {
				return obj[key];
			},
			setItem : function(key, value) {
				obj[key] = value;
				_keys = null;
			},
			removeItem : function(key) {
				delete obj[key];
				_keys = null;
			},
			clear : function() {
				_getKeys().forEach(function(key) {
					delete obj[key];
				}.bind(this));
				_keys = null;
			}
		};
	}

	function PluginEvent(type, plugin) {
		return {type: type, plugin: plugin};
	}
	
	/**
	 * Creates a new plugin. This constructor is private and should only be called by the plugin registry.
	 * @class Represents a single plugin in the plugin registry.
	 * @description
	 * <p>A plugin can be in one of three states:</p>
	 * <dl>
	 * <dt>{@link orion.pluginregistry.Plugin.INSTALLED}</dt>
	 * <dd>The plugin is not running, and is present in the plugin registry.
	 * <p>From the <code>INSTALLED</code> state, the plugin will become <code>LOADED</code> if a service method provided by one
	 * of the plugin's service references is called through the service registry.</p>
	 * </dd>
	 *
	 * <dt>{@link orion.pluginregistry.Plugin.LOADED}</dt>
	 * <dd>The plugin is running, and is present in the plugin registry.
	 * <p>From the <code>LOADED</code> state, the plugin will become <code>UNINSTALLED</code> if its {@link #uninstall} method
	 * is called.</p>
	 * </dd>
	 *
	 * <dt>{@link orion.pluginregistry.Plugin.UNINSTALLED}</dt>
	 * <dd>The plugin is not running, and has been removed from the plugin registry.
	 * <p>Any services formerly provided by the plugin have been unregistered and cannot be called. Although uninstalled plugins
	 * do not appear in the plugin registry, they can be observed if references to a Plugin instance are kept after its
	 * {@link #uninstall} method has been called.
	 * <p>From the <code>UNINSTALLED</code> state, the plugin cannot change to any other state.</p>
	 * </dd>
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
		var _registeredServices = {};
		var _currentMessageId = 0;
		var _deferredResponses = {};
		
		function _callService(serviceId, method, params) {
			if (!_channel) {
				return new Deferred().reject(new Error("plugin not connected"));
			}

			var requestId = _currentMessageId++;
			var d = new Deferred();
			d.then(null, function(error) {
				if (_state === "active" && error instanceof Error && error.name === "Cancel") {
					_internalRegistry.postMessage({
						id: requestId,
						cancel: error.message || "Cancel"
					}, _channel);
				}
			});
			_deferredResponses[String(requestId)] = d;
			var message = {
				id: requestId,
				serviceId: serviceId,
				method: method,
				params: params
			};
			_internalRegistry.postMessage(message, _channel);
			return d.promise;
		}
	
		function _createServiceProxy(service) {
			var serviceProxy = {};
			if (service.methods) {
				service.methods.forEach(function(method) {
					serviceProxy[method] = function() {
						var params = Array.prototype.slice.call(arguments);
						if (_state === "active") {
							return _callService(service.serviceId, method, params);
						} else {
							return _this.start({"transient":true}).then(function() {
								return _callService(service.serviceId, method, params);
							});
						}
					};
				});
				
				if (serviceProxy.addEventListener && serviceProxy.removeEventListener) {
					var eventTarget = new EventTarget();
					serviceProxy.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
					var _addEventListener = serviceProxy.addEventListener;
					serviceProxy.addEventListener = function(type, listener) {
						if (!eventTarget._namedListeners[type]) {
							_addEventListener(type);
						}
						eventTarget.addEventListener(type, listener);
					};
					var _removeEventListener = serviceProxy.removeEventListener;
					serviceProxy.removeEventListener = function(type, listener) {
						eventTarget.removeEventListener(type, listener);
						if (eventTarget._namedListeners[type]) {
							_removeEventListener(type);
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
			_registeredServices[service.serviceId] = {registration: registration, proxy: serviceProxy};
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
		
		var _update; // this is a forward reference to a function declared above this.update
		
		function _responseHandler(message) {
			var deferred;
			try {
				if (message.method) {
					if ("manifest" === message.method || "plugin" === message.method) { //$NON-NLS-0$
						var manifest = message.params[0];
						_update({headers: manifest.headers, services: manifest.services}).then(function() {
							_deferredLoad.resolve(_this);
						});
					} else if ("dispatchEvent" === message.method){ //$NON-NLS-0$
						var proxy = _registeredServices[message.serviceId].proxy;
						proxy.dispatchEvent.apply(proxy, message.params);		
					} else if ("progress" === message.method){ //$NON-NLS-0$
						deferred = _deferredResponses[String(message.requestId)];
						deferred.progress.apply(deferred, message.params);	
					} else if ("timeout" === message.method){
						if (_deferredLoad) {
							_deferredLoad.reject(message.error);
						}
					} else {
						throw new Error("Bad response method: " + message.method);
					}		
				} else {
					deferred = _deferredResponses[String(message.id)];
					delete _deferredResponses[String(message.id)];
					if (message.error) {
						var error = _internalRegistry.handleServiceError(_this, message.error);
						deferred.reject(error);
					} else {
						deferred.resolve(message.result);
					}
				}
			} catch (e) {
				console.log("Plugin._responseHandler " + e);
			}
		}
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
		 * Returns the URL location of this plugin
		 * @name orion.pluginregistry.Plugin#getLocation
		 * @return {String} The URL of this plugin
		 * @function
		 */
		this.getLocation = function() {
			return _url;
		};
		
		/**
		 * Returns the headers of this plugin
		 * @name orion.pluginregistry.Plugin#getHeaders
		 * @return {Object} The plugin headers
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
		 * Returns the service references provided by this plugin
		 * @name orion.pluginregistry.Plugin#getServiceReferences
		 * @return {orion.serviceregistry.ServiceReference} The service references provided
		 * by this plugin.
		 * @function 
		 */
		this.getServiceReferences = function() {
			var result = [];
			Object.keys(_registeredServices).forEach(function(serviceId){
				result.push(_registeredServices[serviceId].registration.getReference());
			});
			return result;
		};
		
		
		/**
		 * Returns this plugin's current state.
		 * @name orion.pluginregistry.Plugin#getState
		 * @returns {Number} This plugin's state. The value is one of:
		 * <ul>
		 * <li>{@link orion.pluginregistry.Plugin.INSTALLED}</li>
		 * <li>{@link orion.pluginregistry.Plugin.LOADED}</li>
		 * <li>{@link orion.pluginregistry.Plugin.UNINSTALLED}</li>
		 * </ul>
		 * @function
		 */
		this.getState = function() {
			return _state;
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
			
			if (!optOptions || !optOptions["transient"]) {
				var autostart = optOptions && optOptions.lazy ? "lazy" : "started";
				if (autostart !== _autostart) {
					_autostart = autostart;
					_persist();
				}
			}
			
			var frameworkState = _internalRegistry.getState();
			if (frameworkState !== "starting" && frameworkState !== "active") {
				if (optOptions["transient"]) {
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
			_internalRegistry.dispatchEvent(new PluginEvent("starting", _this));
			_deferredLoad = new Deferred();
			_channel = _internalRegistry.connect(_url, _responseHandler);
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
				Object.keys(_registeredServices).forEach(function(serviceId) {
					_registeredServices[serviceId].registration.unregister();
					delete _registeredServices[serviceId];
				});
				_internalRegistry.disconnect(_channel);
				_channel = null;
				_state = "resolved";
				_deferredStateChange = null;
				_internalRegistry.dispatchEvent(new PluginEvent("stopped", _this));
				deferredStateChange.reject(new Error("plugin activation error"));
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

			if (!optOptions || !optOptions["transient"]) {
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
			Object.keys(_registeredServices).forEach(function(serviceId) {
				_registeredServices[serviceId].registration.unregister();
				delete _registeredServices[serviceId];
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
			if (_state === "uninstalled") {
				return new Deferred().reject(new Error("Plugin is uninstalled"));
			}
			
			if (!input) {
				if (_lastModified === 0) {
					_lastModified = new Date().getTime();
					_persist();
				}
				return _internalRegistry.loadManifest(_url).then(_update);
			}
			
			var oldHeaders = _headers;
			var oldServices = _services;
			var oldAutostart = _autostart;
			_headers = input.headers || {};
			_services = input.services || {};
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
					var registeredService = _registeredServices[serviceId];
					if (registeredService) {
						if (_equal(service.methods, Object.keys(registeredService.proxy))) {
							var properties = _createServiceProperties(service);
							var reference = registeredService.registration.getReference();
							var currentProperties = {};
							reference.getPropertyKeys().forEach(function(name){
								currentProperties[name] = reference.getProperty(name);
							});
							if (!_equal(properties, currentProperties)) {
								registeredService.registration.setProperties(properties);
							}
							return;
						}
						registeredService.registration.unregister();
						delete _registeredServices[serviceId];
					}
					_registerService(service);
				});
				Object.keys(_registeredServices).forEach(function(serviceId) {
					if (serviceIds.indexOf(serviceId) === -1) {
						_registeredServices[serviceId].registration.unregister();
						delete _registeredServices[serviceId];
					}
				});
			}
			
			if (_state === "active") {
				_internalRegistry.disconnect(_channel);
				_deferredLoad = new Deferred();
				_channel = _internalRegistry.connect(_url, _responseHandler);
				_deferredLoad.then(function() {
					_deferredLoad = null;
				}, function() {
					_deferredLoad = null;
					_state = "stopping";
					_internalRegistry.dispatchEvent(new PluginEvent("stopping"), _this);
					Object.keys(_registeredServices).forEach(function(serviceId) {
						_registeredServices[serviceId].registration.unregister();
						delete _registeredServices[serviceId];
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
		 * Uninstalls this plugin
		 * @name orion.pluginregistry.Plugin#uninstall
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
	 * Dispatched when a plugin has been installed. The type of this event is <code>'pluginInstalled'</code>.
	 * @name orion.pluginregistry.PluginRegistry#pluginInstalled
	 * @event
	 * @param {orion.pluginregistry.Plugin} plugin The plugin that was installed.
	 */
	/**
	 * Dispatched when a plugin has been loaded. The type of this event is <code>'pluginLoaded'</code>.
	 * @name orion.pluginregistry.PluginRegistry#pluginLoaded
	 * @event
	 * @param {orion.pluginregistry.Plugin} plugin The plugin that was loaded.
	 */
	/**
	 * Dispatched when a plugin has been uninstalled. The type of this event is <code>'pluginUninstalled'</code>.
	 * @name orion.pluginregistry.PluginRegistry#pluginUninstalled
	 * @event
	 * @param {orion.pluginregistry.Plugin} plugin The plugin that was uninstalled.
	 */
	/**
	 * Dispatched when a plugin has been updated. The type of this event is <code>'pluginUpdated'</code>.
	 * @name orion.pluginregistry.PluginRegistry#pluginUpdated
	 * @event
	 * @param {orion.pluginregistry.Plugin} plugin The plugin that was updated.
	 */
	
	/**
	 * Creates a new plugin registry.
	 * @class The Orion plugin registry
	 * @name orion.pluginregistry.PluginRegistry
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
		var _plugins = [];
		var _channels = [];
		var _pluginEventTarget = new EventTarget();
		var _installing = {};
	
		var internalRegistry = {
			registerService: serviceRegistry.registerService.bind(serviceRegistry),
			connect: function(url, handler, timeout) {
				var channel = {
					handler: handler,
					url: url
				};
				
				function sendTimeout(message) {
					var error = new Error(message);
					error.name ="timeout";
					handler({method:"timeout", error: error});
				}
				
				var loadTimeout = setTimeout(sendTimeout.bind(null, "Load timeout for: " + url), timeout || 15000);
				var iframe = document.createElement("iframe"); //$NON-NLS-0$
				iframe.name = url + "_" + new Date().getTime();
				if (!configuration.visible) {
					iframe.style.display = "none"; //$NON-NLS-0$
					iframe.style.visibility = "hidden"; //$NON-NLS-0$
				}
				iframe.src = url;
				iframe.onload = function() {
					clearTimeout(loadTimeout);
					setTimeout(sendTimeout.bind(null, "Plugin handshake timeout for: " + url), 5000);
				};
				iframe.sandbox = "allow-scripts allow-same-origin";
				document.body.appendChild(iframe);
				channel.target = iframe.contentWindow;
				channel.close = function() {
					if (iframe) {
						document.body.removeChild(iframe);
						iframe = null;
					}
				};
				_channels.push(channel);
				return channel;
			},
			disconnect: function(channel) {
				for (var i = 0; i < _channels.length; i++) {
					if (channel === _channels[i]) {
						_channels.splice(i,1);
						try {
							channel.close();
						} catch(e) {
							// best effort
						}
						break;
					}
				}
			},
			removePlugin: function(plugin) {
				for (var i = 0; i < _plugins.length; i++) {
					if (plugin === _plugins[i]) {
						_plugins.splice(i,1);
						break;
					}
				}
				_storage.removeItem("plugin."+plugin.getLocation());
			},
			persist: function(url, manifest) {
				_storage.setItem("plugin."+url,JSON.stringify(manifest)); //$NON-NLS-0$
			},
			postMessage: function(message, channel) {
				channel.target.postMessage((channel.useStructuredClone ? message : JSON.stringify(message)), channel.url);
			},
			dispatchEvent: function(event) {
				try {
					_pluginEventTarget.dispatchEvent(event);
				} catch (e) {
					if (console) {
						console.log("PluginRegistry.dispatchEvent " +  e);
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
					} else if ("timeout" === message.method){
						internalRegistry.disconnect(channel);
						channel = null;
						d.reject(message.error);
					}
				});
				return d.promise;
			},
			getState : function() {
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
					return {Severity: "Error", HTML: true, Message: serializer.serializeToString(span)};
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
			_channels.some(function(channel){
				if (source === channel.target) {
					if (typeof channel.useStructuredClone === "undefined") { //$NON-NLS-0$
						channel.useStructuredClone = typeof event.data !== "string"; //$NON-NLS-0$
					}
					channel.handler(channel.useStructuredClone ? event.data : JSON.parse(event.data));
					return true; // e.g. break
				}
			});
		}

		/**
		 * Starts the plugin registry
		 * @name orion.pluginregistry.PluginRegistry#startup
		 * @return A promise that will resolve when the registry has been fully started
		 * @function 
		 */
		this.init = function() {
			if (_state === "starting" || _state === "active" || _state === "stopping") {
				return;
			}
			addEventListener("message", _messageHandler, false);
			var storageKeys = [];
			for (var i = 0, length = _storage.length; i < length;i++) {
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
			_plugins.sort(function (a, b) {
				return a._getCreated() < b._getCreated() ? -1 : 1;
			});
			
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
						manifest = typeof manifest === "object" || {};
						manifest.autostart = manifest.autostart || configuration.defaultAutostart || "lazy";
						_plugins.push(new Plugin(url, manifest, internalRegistry));
					}
				}.bind(this));
			}
			_state = "starting";
		};

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
							return plugin.start({"transient":true});
						}
						if ("lazy" === autostart) {
							return plugin.start({"lazy":true, "transient":true});
						}
						plugin._resolve();
					}));
					return;
				}
			
				if ("started" === autostart) {
					deferreds.push(plugin.start({"transient":true}));
				} else if ("lazy" === autostart) {
					deferreds.push(plugin.start({"lazy":true, "transient":true}));
					if (now > plugin.getLastModified() + 86400000) { // 24 hours
						plugin.update();
					}
				} else {
					plugin._resolve();
				}
			});
			return Deferred.all(deferreds, function(e){
				console.log("PluginRegistry.stop " + e);
			}).then(function() {
				_state = "active";
			});
		};
		
		/**
		 * Shuts down the plugin registry
		 * @name orion.pluginregistry.PluginRegistry#stop
		 * @function 
		 */
		this.stop = function() {
			if (_state !== "starting" && _state !== "active") {
				return new Deferred().reject("Cannot stop registry. Registry is already " + _state + ".");
			}
			_state = "stopping";
			var deferreds = [];
			_plugins.forEach(function(plugin) {
				deferreds.push(plugin.stop({"transient":true}));
			});
			return Deferred.all(deferreds, function(e){
				console.log("PluginRegistry.stop " +  e);
			}).then(function() {
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
		 * Installs the plugin at the given location into the plugin registry
		 * @name orion.pluginregistry.PluginRegistry#installPlugin
		 * @param {String} url The location of the plugin
		 * @param {Object} [optManifest] The plugin metadata
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
		 * Returns all installed plugins
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
			_plugins.some(function(plugin){
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
			_plugins.forEach(function(plugin){
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