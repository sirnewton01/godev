/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global console define setTimeout*/
define([
	'orion/Deferred',
	'orion/serviceTracker',
	'orion/objects'
], function(Deferred, ServiceTracker, objects) {

var ManagedServiceTracker, ConfigAdminFactory, ConfigStore, ConfigAdminImpl, ConfigImpl;

var PROPERTY_PID = 'pid'; //$NON-NLS-0$
var MANAGED_SERVICE = 'orion.cm.managedservice'; //$NON-NLS-0$

/**
 * @name orion.cm.impl.ManagedServiceTracker
 * @class Tracks ManagedServices in a ServiceRegistry. Delivers updated() notifications to tracked ManagedServices.
 * This class also tracks the loading of {@link orion.pluginregistry.Plugin}s in a PluginRegistry, and provides 
 * the following guarantee: if a Plugin is being loaded and it provides a ManagedService, its updated() method
 * will be called prior to any other service method.
 * @private
 */
ManagedServiceTracker = /** @ignore */ function(serviceRegistry, pluginRegistry, store) {
	ServiceTracker.call(this, serviceRegistry, MANAGED_SERVICE); //$NON-NLS-0$

	var managedServiceRefs = {};
	var managedServices = {};
	var pluginLoadedListener = function(event) {
		var managedServiceUpdates = [];
		event.plugin.getServiceReferences().forEach(function(serviceRef) {
			if (serviceRef.getProperty('objectClass').indexOf(MANAGED_SERVICE) !== -1) { //$NON-NLS-0$
				var pid = serviceRef.getProperty(PROPERTY_PID);
				var managedService = serviceRegistry.getService(serviceRef);
				if (pid && managedService) {
					var configuration = store._find(pid);
					var properties = configuration && configuration.getProperties();
					managedServiceUpdates.push(managedService.updated(properties));
				}
			}
		});
		return Deferred.all(managedServiceUpdates);
	};

	function add(pid, serviceRef, service) {
		if (!managedServiceRefs[pid]) {
			managedServiceRefs[pid] = [];
		}
		if (!managedServices[pid]) {
			managedServices[pid] = [];
		}
		managedServiceRefs[pid].push(serviceRef);
		managedServices[pid].push(service);
	}
	function remove(pid, serviceRef, service) {
		var serviceRefs = managedServiceRefs[pid];
		var services = managedServices[pid];
		if (serviceRefs.length > 1) {
			serviceRefs.splice(serviceRefs.indexOf(serviceRef), 1);
		} else {
			delete managedServiceRefs[pid];
		}
		if (services.length > 1) {
			services.splice(services.indexOf(service), 1);
		} else {
			delete managedServices[pid];
		}
	}
	function getManagedServiceReferences(pid) {
		return managedServiceRefs[pid] || [];
	}
	function getManagedServices(pid) {
		return managedServices[pid] || [];
	}
	function asyncUpdated(serviceRefs, services, properties) {
		services.forEach(function(service, i) {
			try {
				// Plugin load is expensive, so don't trigger it just to call updated() on a Managed Service.
				// pluginLoadedListener will catch the plugin when (if) it loads.
				var pluginUrl = serviceRefs[i].getProperty('__plugin__'); //$NON-NLS-0$
				var plugin = pluginUrl && pluginRegistry.getPlugin(pluginUrl);
				if (!pluginUrl || (plugin && plugin.getState() === 'active')) {
					services[i].updated(properties);
				}
			} catch(e) {
				if (typeof console !== 'undefined') { //$NON-NLS-0$
					console.log(e);
				}
			}
		});
	}
	this.addingService = function(serviceRef) {
		var pid = serviceRef.getProperty(PROPERTY_PID);
		var managedService = serviceRegistry.getService(serviceRef);
		if (!pid || !managedService) {
			return null;
		}
		add(pid, serviceRef, managedService);
		return managedService;
	};
	this.onServiceAdded = function(serviceRef, service) {
		var pid = serviceRef.getProperty(PROPERTY_PID);
		var configuration = store._find(pid);
		asyncUpdated([serviceRef], [service], (configuration && configuration.getProperties()));
	};
	this.onOpen = function() {
		pluginRegistry.addEventListener('started', pluginLoadedListener); //$NON-NLS-0$
	};
	this.onClose = function() {
		pluginRegistry.removeEventListener('started', pluginLoadedListener); //$NON-NLS-0$
	};
	this.notifyUpdated = function(configuration) {
		var pid = configuration.getPid();
		asyncUpdated(getManagedServiceReferences(pid), getManagedServices(pid), configuration.getProperties());
	};
	this.notifyDeleted = function(configuration) {
		var pid = configuration.getPid();
		asyncUpdated(getManagedServiceReferences(pid), getManagedServices(pid), null);
	};
	this.removedService = function(serviceRef, service) {
		var pid = serviceRef.getProperty(PROPERTY_PID);
		remove(pid, serviceRef, service);
	};
};
/**
 * @name orion.cm.impl.ConfigAdminFactory
 * @class
 * @private
 */
ConfigAdminFactory = /** @ignore */ (function() {
	/** @private */
	function ConfigAdminFactory(serviceRegistry, pluginRegistry, prefsService) {
		this.store = new ConfigStore(this, prefsService);
		this.configAdmin = new ConfigAdminImpl(this, this.store);
		this.tracker = new ManagedServiceTracker(serviceRegistry, pluginRegistry, this.store);
	}
	ConfigAdminFactory.prototype = {
		// TODO this should be synchronous but requires sync Prefs API
		getConfigurationAdmin: function() {
			var self = this;
			return this.configAdmin._init().then(function(configAdmin) {
				self.tracker.open();
				return configAdmin;
			});
		},
		notifyDeleted: function(configuration) {
			this.tracker.notifyDeleted(configuration);
		},
		notifyUpdated: function(configuration) {
			this.tracker.notifyUpdated(configuration);
		}
	};
	return ConfigAdminFactory;
}());

/**
 * @name orion.cm.ConfigAdminImpl
 * @class
 * @private
 */
ConfigAdminImpl = /** @ignore */ (function() {
	function ConfigAdminImpl(factory, store) {
		this.factory = factory;
		this.store = store;
	}
	ConfigAdminImpl.prototype = {
		_init: function() {
			var self = this;
			return this.store._init().then(function() {
				return self;
			});
		},
		getConfiguration: function(pid) {
			return this.store.get(pid);
		},
		listConfigurations: function() {
			return this.store.list();
		}
	};
	return ConfigAdminImpl;
}());

/**
 * @name orion.cm.ConfigStore
 * @class Manages Configurations and handles persisting them to preferences.
 * @private
 */
var CONFIG_PREF_NODE = '/cm/configurations'; //$NON-NLS-0$
ConfigStore = /** @ignore */ (function() {
	function ConfigStore(factory, prefsService) {
		this.factory = factory;
		this.prefsService = prefsService;
		this.configs = Object.create(null); // PID -> Configuration
		this.pref = null; // Preferences node. Pref keys are PIDs, pref values are properties objects.
		var self = this;
		this.initPromise = this.prefsService.getPreferences(CONFIG_PREF_NODE).then(function(pref) {	
			self.pref = pref;
			pref.keys().forEach(function(pid) {
				if (!self.configs[pid]) {
					var properties = pref.get(pid);
					if (typeof properties === 'object' && properties !== null && Object.keys(properties).length > 0) { //$NON-NLS-0$
						properties[PROPERTY_PID] = pid;
						self.configs[pid] = new ConfigImpl(self.factory, self, properties);
					}
				}
			});
		});
	}
	ConfigStore.prototype = {
		_init: function() {
			return this.initPromise;
		},
		_find: function(pid) {
			return this.configs[pid] || null;
		},
		get: function(pid) {
			var configuration = this._find(pid);
			if (!configuration) {
				// only pid is in the properties here
				configuration = new ConfigImpl(this.factory, this, pid);
				this.configs[pid] = configuration;
			}
			return configuration;
		},
		list: function() {
			var self = this;
			var currentConfigs = [];
			this.pref.keys().forEach(function(pid) {
				var config = self._find(pid);
				if (config && config.getProperties() !== null) {
					currentConfigs.push(config);
				}
			});
			return currentConfigs;
		},
		remove: function(pid) {
			this.pref.remove(pid);
			delete this.configs[pid];
		},
		save: function(pid, configuration) {
			this.pref.put(pid, configuration.getProperties(true) || {});
		}
	};
	return ConfigStore;
}());

/**
 * @name orion.cm.impl.ConfigImpl
 * @class 
 * @private
 */
ConfigImpl = /** @ignore */ (function() {
	function setProperties(configuration, newProps) {
		// Configurations cannot have nested properties, so a shallow clone is sufficient.
		newProps = objects.clone(newProps);
		delete newProps[PROPERTY_PID];
		configuration.properties = newProps;
	}
	function ConfigImpl(factory, store, pidOrProps) {
		this.factory = factory;
		this.store = store;
		if (pidOrProps !== null && typeof pidOrProps === 'object') { //$NON-NLS-0$
			this.pid = pidOrProps[PROPERTY_PID];
			setProperties(this, pidOrProps);
		} else if (typeof pidOrProps === 'string') { //$NON-NLS-0$
			this.pid = pidOrProps;
			this.properties = null;
		} else {
			throw new Error('Invalid pid/properties ' + pidOrProps); //$NON-NLS-0$
		}
	}
	ConfigImpl.prototype = {
		_checkRemoved: function() {
			if (this._removed) {
				throw new Error('Configuration was removed'); //$NON-NLS-0$
			}
		},
		getPid: function() {
			this._checkRemoved();
			return this.pid;
		},
		getProperties: function(omitPid) {
			this._checkRemoved();
			var props = null;
			if (this.properties) {
				props = objects.clone(this.properties);
				if (!omitPid) {
					props[PROPERTY_PID] = this.pid;
				}
			}
			return props;
		},
		remove: function() {
			this._checkRemoved();
			this.factory.notifyDeleted(this);
			this.store.remove(this.pid);
			this._removed = true;
		},
		update: function(props) {
			this._checkRemoved();
			setProperties(this, props);
			this.store.save(this.pid, this);
			this.factory.notifyUpdated(this);
		},
		toString: function() {
			return '[ConfigImpl pid: ' + this.pid + ', properties: ' + JSON.stringify(this.properties) + ']';
		}
	};
	return ConfigImpl;
}());

/**
 * @name orion.cm.Configuration
 * @class The configuration information for a {@link orion.cm.ManagedService}.
 * @description A <code>Configuration</code> object contains configuration properties. Services wishing to receive those
 * properties do not deal with Configurations directly, but instead register a {@link orion.cm.ManagedService} with the
 * Service Registry.
 */
	/**
	 * @name getPid
	 * @function
	 * @memberOf orion.cm.Configuration.prototype
	 * @returns {String} The PID of this Configuration.
	 */
	/**
	 * @name getProperties
	 * @function
	 * @memberOf orion.cm.Configuration.prototype
	 * @returns {orion.cm.ConfigurationProperties} A private copy of this Configuration's properties, or <code>null</code>
	 * if the configuration has never been updated.
	 */
	/**
	 * @name remove
	 * @function
	 * @memberOf orion.cm.Configuration.prototype
	 * @description Deletes this Configuration. Any {@link orion.cm.ManagedService} that registered interest in this 
	 * Configuration's PID will have its {@link orion.cm.ManagedService#updated} method called with <code>null</code> properties. 
	 */
	/**
	 * @name update
	 * @function
	 * @memberOf orion.cm.Configuration.prototype
	 * @param {Object} [properties] The new properties to be set in this Configuration. The <code>pid</code> 
	 * property will be added or overwritten and set to this Configuration's PID.
	 * @description Updates the properties of this Configuration. Any {@link orion.cm.ManagedService} that registered
	 * interest in this Configuration's PID will have its {@link orion.cm.ManagedService#updated} method called.
	 */

/**
 * @name orion.cm.ConfigurationAdmin
 * @class Service for managing configuration data.
 */
	/**
	 * @name getConfiguration
	 * @memberOf orion.cm.ConfigurationAdmin.prototype
	 * @description Gets the configuration having the given PID, creating a new one if necessary. Newly created configurations
	 * have <code>null</code> properties.
	 * @param {String} pid
	 * @returns {orion.cm.Configuration} The configuration.
	 */
	/**
	 * @name listConfigurations
	 * @memberOf orion.cm.ConfigurationAdmin.prototype
	 * @description Returns all Configurations having non-<code>null</code> properties.
	 * @returns {orion.cm.Configuration[]} An array of configurations.
	 */

/**
 * @name orion.cm.ManagedService
 * @class Interface for a service that needs configuration data.
 * @description A <code>ManagedService</code> is a service that needs configuration properties from a {@link orion.cm.ConfigurationAdmin}.
 * <p>A ManagedService is registered with the Service Registry using the service name <code>'orion.cm.managedservice'</code>.
 * The ManagedService's service properties must contain a <code>pid</code> property giving a unique identifier called a PID.
 * <p>When a change occurs to a Configuration object corresponding to the PID, the service's {@link #updated} method is 
 * called with the configuration's properties.
 */
	/**
	 * @name updated
	 * @memberOf orion.cm.ManagedService.prototype
	 * @description Invoked after a Configuration has been updated.
	 * @param {orion.cm.ConfigurationProperties} properties The properties of the {@link orion.cm.Configuration} that was
	 * updated. This parameter will be <code>null</code> if the Configuration does not exist or was deleted.
	 */
/**
 * @name orion.cm.ConfigurationProperties
 * @class A dictionary that holds configuration data.
 * @description A <code>ConfigurationProperties</code> carries the properties of a {@link orion.cm.Configuration}. Minimally a ConfigurationProperties
 * will have a {@link #pid} <code>pid</code> property. Other properties may also be present.
 * @property {String} pid Gives the PID of the {@link orion.cm.Configuration} whose properties this object represents.
 */
	return {
		ConfigurationAdminFactory: ConfigAdminFactory
	};
});