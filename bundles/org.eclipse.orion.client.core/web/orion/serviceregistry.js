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
/*global define console */

define(["orion/Deferred", "orion/EventTarget"], function(Deferred, EventTarget) {

	/**
	 * Creates a new service reference.
	 *
	 * @name orion.serviceregistry.ServiceReference
	 * @class A reference to a service in the Orion service registry
	 * @param {String} serviceId The symbolic id of this service instance
	 * @param {String} name The service name
	 * @param {Object} properties A JSON object containing the service's declarative properties
	 */

	function ServiceReference(serviceId, objectClass, properties) {
		this._properties = properties || {};
		this._properties["service.id"] = serviceId;
		this._properties.objectClass = objectClass;
		this._properties["service.names"] = objectClass;
	}

	ServiceReference.prototype = /** @lends orion.serviceregistry.ServiceReference.prototype */
	{
		/**
		 * Returns the names of the declarative properties of this service.
		 */
		getPropertyKeys: function() {
			var result = [];
			var name;
			for (name in this._properties) {
				if (this._properties.hasOwnProperty(name)) {
					result.push(name);
				}
			}
			return result;
		},
		/**
		 * Returns the declarative service property with the given name, or undefined
		 * if this service does not have such a property.
		 * @param {String} propertyName The name of the service property to return
		 */
		getProperty: function(propertyName) {
			return this._properties[propertyName];
		}
	};
	ServiceReference.prototype.constructor = ServiceReference;

	/**
	 * Creates a new service registration. This constructor is private and should only be called by the service registry.
	 *
	 * @name orion.serviceregistry.ServiceRegistration
	 * @class A reference to a registered service in the Orion service registry
	 * @param {String} serviceId The symbolic id of this service
	 * @param {String} serviceReference A reference to the service
	 * @param {Object} internalRegistry A JSON object containing the service's declarative properties
	 */

	function ServiceRegistration(serviceId, serviceReference, internalRegistry) {
		this._serviceId = serviceId;
		this._serviceReference = serviceReference;
		this._internalRegistry = internalRegistry;
	}

	ServiceRegistration.prototype = /** @lends orion.serviceregistry.ServiceRegistration.prototype */
	{
		/**
		 * Unregister this service registration.
		 */
		unregister: function() {
			this._internalRegistry.unregisterService(this._serviceId);
		},

		/**
		 * Returns a reference to this registered service.
		 */
		getReference: function() {
			if (!this._internalRegistry.isRegistered(this._serviceId)) {
				throw new Error("already unregistered");
			}
			return this._serviceReference;
		},
		setProperties: function(properties) {
			var oldProperties = this._serviceReference._properties;
			this._serviceReference._properties = properties || {};
			properties["service.id"] = this._serviceId;
			properties.objectClass = oldProperties.objectClass;
			properties["service.names"] = oldProperties["service.names"];
			this._internalRegistry.modifyService(this._serviceId);
		}
	};
	ServiceRegistration.prototype.constructor = ServiceRegistration;

	function DeferredService(implementation, isRegistered) {

		function _createServiceCall(methodName) {
			return function() {
					var d;
					try {
						if (!isRegistered()) {
							throw new Error("Service was unregistered");
						}
						var result = implementation[methodName].apply(implementation, Array.prototype.slice.call(arguments));
						if (result && typeof result.then === "function") {
							return result;
						} else {
							d = new Deferred();
							d.resolve(result);
						}
					} catch (e) {
							d = new Deferred();
							d.reject(e);
					}
					return d.promise;
			};
		}

		var method;
		for (method in implementation) {
			if (typeof implementation[method] === 'function') {
				this[method] = _createServiceCall(method);
			}
		}
	}
	
	function ServiceEvent(type, serviceReference) {
		this.type = type;
		this.serviceReference = serviceReference;
	}

	/**
	 * Creates a new service registry
	 * 
	 * @name orion.serviceregistry.ServiceRegistry
	 * @class The Orion service registry
	 */

	function ServiceRegistry() {
		this._entries = [];
		this._namedReferences = {};
		this._serviceEventTarget = new EventTarget();
		var _this = this;
		this._internalRegistry = {
			isRegistered: function(serviceId) {
				return _this._entries[serviceId] ? true : false;
			},
			unregisterService: function(serviceId) {
				var entry = _this._entries[serviceId];
				if (!entry) {
					throw new Error("already unregistered");
				}				
				var reference = entry.reference;
				_this._serviceEventTarget.dispatchEvent(new ServiceEvent("unregistering", reference));
				_this._entries[serviceId] = null;
				var objectClass = reference.getProperty("objectClass");
				objectClass.forEach(function(type) {
					var namedReferences = _this._namedReferences[type];
					for (var i = 0; i < namedReferences.length; i++) {
						if (namedReferences[i] === reference) {
							if (namedReferences.length === 1) {
								delete _this._namedReferences[type];
							} else {
								namedReferences.splice(i, 1);
							}
							break;
						}
					}
				});
			},
			modifyService: function(serviceId) {
				var entry = _this._entries[serviceId];
				if (!entry) {
					throw new Error("already unregistered");
				}				
				var reference = entry.reference;
				_this._serviceEventTarget.dispatchEvent(new ServiceEvent("modified", reference));
			}
		};
	}
	
	ServiceRegistry.prototype = /** @lends orion.serviceregistry.ServiceRegistry.prototype */
	{

		/**
		 * Returns the service with the given name or reference.
		 * @param {String|orion.serviceregistry.ServiceReference} nameOrServiceReference The service name or a service reference
		 * @returns {Object|null} The service implementation, or <code>null</code> if no such service was found.
		 */
		getService: function(typeOrServiceReference) {
			var service;
			if (typeof typeOrServiceReference === "string") {
				var references = this._namedReferences[typeOrServiceReference];
				if (references) {
					references.some(function(reference) {
						service = this._entries[reference.getProperty("service.id")].service;
						return !!service;
					}, this);
				}
			} else {
				var entry = this._entries[typeOrServiceReference.getProperty("service.id")];
				if (entry) {
					service = entry.service;
				}
			}
			return service || null;
		},

		/**
		 * Returns all references to the service with the given name
		 * @param {String} name The name of the service to return
		 * @returns {orion.serviceregistry.ServiceReference[]} An array of service references
		 */
		getServiceReferences: function(name) {
			if (name) {
				return this._namedReferences[name] ? this._namedReferences[name] : [];
			}
			var result = [];
			this._entries.forEach(function(entry) {
				if (entry) {
					result.push(entry.reference);
				}
			});
			return result;
		},
		/**
		 * Registers a service with this registry.
		 * @param {String|String[]} names the name or names of the service being registered
		 * @param {Object} service The service implementation
		 * @param {Object} properties A JSON collection of declarative service properties
		 * @returns {orion.serviceregistry.ServiceRegistration} A service registration object for the service.
		 */
		registerService: function(names, service, properties) {
			if (typeof service === "undefined" ||  service === null) {
				throw new Error("invalid service");
			}
			
			if (typeof names === "string") {
				names = [names];
			} else if (!Array.isArray(names)) {
				names = [];
			}
			
			var serviceId = this._entries.length;			
			var reference = new ServiceReference(serviceId, names, properties);
			var namedReferences = this._namedReferences;
			names.forEach(function(name) {
				namedReferences[name] = namedReferences[name] || [];
				namedReferences[name].push(reference);
			});
			var deferredService = new DeferredService(service, this._internalRegistry.isRegistered.bind(null, serviceId));
			this._entries.push({
				reference: reference,
				service: deferredService
			});
			var internalRegistry = this._internalRegistry;
			this._serviceEventTarget.dispatchEvent(new ServiceEvent("registered", reference));
			return new ServiceRegistration(serviceId, reference, internalRegistry);
		},

		/**
		 * Adds a listener for events on this registry
		 * @param {String} eventName The name of the event to listen for
		 * @param {Function} listener The listener to add
		 */
		addEventListener: function(eventName, listener) {
			this._serviceEventTarget.addEventListener(eventName, listener);
		},

		/**
		 * Removes a listener for events on this registry
		 * @param {String} eventName The name of the event to stop listening for
		 * @param {Function} listener The listener to remove
		 */
		removeEventListener: function(eventName, listener) {
			this._serviceEventTarget.removeEventListener(eventName, listener);
		}
	};
	ServiceRegistry.prototype.constructor = ServiceRegistry;

	//return the module exports
	return {
		ServiceRegistry: ServiceRegistry
	};
});