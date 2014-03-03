/******************************************************************************* 
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/
/*jslint amd:true*/
define([
	"orion/objects",
	"orion/serviceTracker"
], function(objects, ServiceTracker) {

	function err(msg, serviceRef) {
		throw new Error(msg + " [service id: " + serviceRef.getProperty("service.id") + "]"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ 
	}

	/**
	 * @name orion.core.TypeDef
	 * @class
	 * @description Represents a Type Definition. The shape of a Type Definition is not defined by Orion.
	 */

	/**
	 * @name orion.core.TypeDefProperties
	 * @class
	 * @description Represents the properties associated with a Type Definition. Minimally an {@link #id} property is defined.
	 */
	/**
	 * @name orion.core.TypeDefProperties#id
	 * @property
	 * @type String
	 * @description The ID of the TypeDef this properties object is for.
	 */

	/**
	 * @name orion.core.TypeDefRegistry
	 * @class
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @description Tracks type definitions registered with a Service Registry.
	 */
	function TypeDefRegistry(serviceRegistry) {
		this.props = Object.create(null); // String -> Object, maps id to properties
		this.defs = Object.create(null);  // String -> TypeDef, maps id to type def
		this.registration = null;

		var tracker = new ServiceTracker(serviceRegistry, "orion.core.typedef"); //$NON-NLS-0$
		var _self = this;
		tracker.onServiceAdded = function(serviceRef) {
			var id = serviceRef.getProperty("id"), defs = serviceRef.getProperty("defs"); //$NON-NLS-1$ //$NON-NLS-0$
			if (!id || !defs)
				err("TypeDef registration missing required 'id' or 'defs'", serviceRef); //$NON-NLS-0$

			var properties = {};
			serviceRef.getPropertyKeys().forEach(function(key) {
				if (key !== "defs" && key !== "service.id" && key !== "service.names" && key !== "objectClass") //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$
					properties[key] = serviceRef.getProperty(key);
			});
			_self.props[id] = properties;
			_self.defs[id] = defs;
			_self._updateRegistration();
		};
		tracker.removedService = function(serviceRef) {
			var id = serviceRef.getProperty("id"); //$NON-NLS-0$
			delete _self.props[id];
			delete _self.defs[id];
			_self._updateRegistration();
		};
		tracker.open();

		// Register accessor service that exposes TypeDef info to editorContext
		this.registration = serviceRegistry.registerService("orion.edit.context", { //$NON-NLS-0$
			getTypeDef: this.getTypeDef.bind(this)
		}, null);
		this._updateRegistration();
	}
	objects.mixin(TypeDefRegistry.prototype, /** @lends orion.core.TypeDefRegistry.prototype */ {
		_updateRegistration: function() {
			if (this.registration) {
				this.registration.setProperties({ typeDefs: this.getAllProperties() });
			}
		},
		/**
		 * Gets a TypeDef.
		 * @param {String} id The ID of the desired TypeDef.
		 * @returns {orion.core.TypeDef|null} The TypeDef object.
		 */
		getTypeDef: function(id) {
			return this.defs[id] || null;
		},
		/**
		 * Gets the properties for a TypeDef.
		 * @param {String} id The ID of the TypeDef to get properties for.
		 * @returns {orion.core.TypeDefProperties|null} The properties object.
		 */
		getProperties: function(id) {
			return this.props[id] || null;
		},
		/**
		 * Gets the properties of all TypeDefs in the registry.
		 * @returns {Object} A map of all properties. The keys are TypeDef IDs and the values are 
		 * the {@link orion.core.TypeDefProperties} returned by {@link #getProperties(id)}.
		 */
		getAllProperties: function() {
			return this.props;
		}
	});

	return TypeDefRegistry;
});
