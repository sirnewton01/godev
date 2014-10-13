/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/Deferred", "orion/EventTarget"], function(Deferred, EventTarget) {

	/**
	 * @name orion.serviceregistry.ServiceReference
	 * @description Creates a new service reference.
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
		 * @name getPropertyKeys
		 * @description Returns the names of the declarative properties of this service.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceReference.prototype
		 * @returns the names of the declarative properties of this service
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
		 * @name getProperty
		 * @description Returns the declarative service property with the given name, or <code>undefined</code>
		 * if this service does not have such a property.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceReference.prototype
		 * @param {String} propertyName The name of the service property to return
		 * @returns The {String} property with the given name or <code>undefined</code>
		 */
		getProperty: function(propertyName) {
			return this._properties[propertyName];
		}
	};
	ServiceReference.prototype.constructor = ServiceReference;

	/**
	 * @name orion.serviceregistry.ServiceRegistration
	 * @description Creates a new service registration. This constructor is private and should only be called by the service registry.
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
		 * @name unregister
		 * @description Unregister this service registration. Clients registered for <code>unregistering</code> service events
		 * will be notified of this change.
		 * @function
		 * @private
		 * @memberof orion.serviceregistry.ServiceRegistration.prototype
		 */
		unregister: function() {
			this._internalRegistry.unregisterService(this._serviceId);
		},

		/**
		 * @name getReference
		 * @description Returns the {@link orion.serviceregistry.ServiceReference} in this registration
		 * @function
		 * @private
		 * @memberof orion.serviceregistry.ServiceRegistration.prototype
		 * @param properties
		 * @returns the {@link orion.serviceregistry.ServiceReference} in this registration
		 * @throws An error is the service has been unregistered
		 */
		getReference: function() {
			if (!this._internalRegistry.isRegistered(this._serviceId)) {
				throw new Error("Service has already been unregistered: "+this._serviceId);
			}
			return this._serviceReference;
		},
		/**
		 * @name setProperties
		 * @description Sets the properties of this registration to the new given properties. Clients registered for <code>modified</code> service events
		 * will be notified of the change.
		 * @function
		 * @private
		 * @memberof orion.serviceregistry.ServiceRegistration.prototype
		 * @param {Object} properties
		 */
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

	/**
	 * @name orion.serviceregistry.DeferredService
	 * @description Creates a new service promise to resolve the service at a later time.
	 * @class A service that is resolved later
	 * @private
	 * @param {orion.serviceregistry.ServiceReference} implementation The implementation of the service
	 * @param {Function} isRegistered A function to call to know if the service is already registered
	 */
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

	/**
	 * @name orion.serviceregistry.ServiceEvent
	 * @description An event that is fired from the service registry. Clients must register to listen to events using 
	 * the {@link orion.serviceregistry.ServiceRegistry#addEventListener} function.
	 * <br> 
	 * There are three types of events that this registry will send:
	 * <ul>
	 * <li>modified - the service has been modified</li> 
	 * <li>registered - the service has been registered</li> 
	 * <li>unregistering - the service is unregistering</li>
	 * </ul> 
	 * @class A service event
	 * @param {String} type The type of the event, one of <code>modified</code>, <code>registered</code> or <code>unregistered</code>
	 * @param {orion.serviceregistry.ServiceReference} serviceReference the service reference the event is for
	 */
	function ServiceEvent(type, serviceReference) {
		this.type = type;
		this.serviceReference = serviceReference;
	}

	/**
	 * @name orion.serviceregistry.ServiceRegistry
	 * @description Creates a new service registry
	 * @class The Orion service registry
	 */
	function ServiceRegistry() {
		this._entries = [];
		this._namedReferences = {};
		this._serviceEventTarget = new EventTarget();
		var _this = this;
		this._internalRegistry = {
			/**
			 * @name isRegistered
			 * @description Returns if the service with the given identifier is registered or not.
			 * @function
			 * @private
			 * @memberof orion.serviceregistry.ServiceRegistry
			 * @param {String} serviceId the identifier of the service
			 * @returns <code>true</code> if the service with the given identifier is registered, <code>false</code> otherwise
			 */
			isRegistered: function(serviceId) {
				return _this._entries[serviceId] ? true : false;
			},
			
			/**
			 * @name unregisterService
			 * @description Unregisters a service with the given identifier. This function will notify
			 * clients registered for <code>unregistering</code> service events.
			 * @function
			 * @private
			 * @memberof orion.serviceregistry.ServiceRegistry
			 * @param {String} serviceId the identifier of the service
			 * @throws An error if the service has already been unregistered
			 * @see orion.serviceregistry.ServiceEvent
			 */
			unregisterService: function(serviceId) {
				var entry = _this._entries[serviceId];
				if (!entry) {
					throw new Error("Service has already been unregistered: "+serviceId);
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
			/**
			 * @name modifyService
			 * @description Notifies that the service with the given identifier has been modified. This function will notify clients
			 * registered for <code>modified</code> service events.
			 * @function
			 * @private
			 * @memberof orion.serviceregistry.ServiceRegistry
			 * @param {String} serviceId the identifier of the service
			 * @throws An error if the service for the given identifier does not exist
			 * @see orion.serviceregistry.ServiceEvent
			 */
			modifyService: function(serviceId) {
				var entry = _this._entries[serviceId];
				if (!entry) {
					throw new Error("Service not found while trying to send modified event: "+serviceId);
				}
				var reference = entry.reference;
				_this._serviceEventTarget.dispatchEvent(new ServiceEvent("modified", reference));
			}
		};
	}

	ServiceRegistry.prototype = /** @lends orion.serviceregistry.ServiceRegistry.prototype */
	{
		/**
		 * @name getService
		 * @description Returns the service with the given name or reference.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceRegistry.prototype
		 * @param {String|orion.serviceregistry.ServiceReference} nameOrServiceReference The service name or a service reference
		 * @returns {orion.serviceregistry.ServiceReference|null} The service implementation, or <code>null</code> if no such service was found.
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
		 * @name getServiceReferences
		 * @description Returns all references to the service with the given name.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceRegistry.prototype
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
		 * @name registerService
		 * @description Registers a service with this registry. This function will notify clients registered
		 * for <code>registered</code> service events.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceRegistry.prototype
		 * @param {String|String[]} names the name or names of the service being registered
		 * @param {Object} service The service implementation
		 * @param {Object} properties A JSON collection of declarative service properties
		 * @returns {orion.serviceregistry.ServiceRegistration} A service registration object for the service.
		 * @see orion.serviceregistry.ServiceEvent
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
		 * @name addEventListener
		 * @description Adds a listener for events on this registry.
		 * <br> 
		 * The events that this registry notifies about:
		 * <ul>
		 * <li>modified - the service has been modified</li> 
		 * <li>registered - the service has been registered</li> 
		 * <li>unregistering - the service is unregistering</li> 
		 * </ul> 
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceRegistry.prototype
		 * @param {String} eventName The name of the event to be notified about.
		 * @param {Function} listener The listener to add
		 * @see orion.serviceregistry.ServiceEvent
		 */
		addEventListener: function(eventName, listener) {
			this._serviceEventTarget.addEventListener(eventName, listener);
		},

		/**
		 * @name removeEventListener
		 * @description Removes a listener for service events in this registry.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceRegistry.prototype
		 * @param {String} eventName The name of the event to stop listening for
		 * @param {Function} listener The listener to remove
		 * @see orion.serviceregistry.ServiceEvent
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