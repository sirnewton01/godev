/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define console */
define(['orion/serviceTracker'], function(ServiceTracker) {
	var METATYPE_SERVICE = 'orion.cm.metatype', SETTING_SERVICE = 'orion.core.setting'; //$NON-NLS-0$ //$NON-NLS-1$
	var SETTINGS_PROP = 'settings'; //$NON-NLS-0$
	var DEFAULT_CATEGORY = 'unsorted'; //$NON-NLS-0$

	/**
	 * @param {Object} value
	 * @param {orion.metatype.AttributeDefinition} attributeDefinition
	 */
	function equalsDefaultValue(value, attributeDefinition) {
		var defaultValue = attributeDefinition.getDefaultValue();
		var result = value === defaultValue;
		if (attributeDefinition.getType() === 'string') { //$NON-NLS-0$
			result = result || (value === '' && defaultValue === null);
		}
		return result;
	}

	/**
	 * @name orion.settings.Setting
	 * @class Represents the definition of a setting.
	 * @description Represents the definition of a setting.
	 */
		/**
		 * @name orion.settings.Setting#isDefaults
		 * @function
		 * @description
		 * @param {Object} properties A map of AttributeDefinition IDs to values.
		 * @returns {Boolean} <code>true</code> if <code>properties</code> contains a key for each of this setting's
		 * AttributeDefinitions, and the corresponding value equals the AttributeDefinition's default value.
		 */
		/**
		 * @name orion.settings.Setting#getCategory
		 * @function
		 * @description
		 * @returns {String} The category of this setting.
		 */
		/**
		 * @name orion.settings.Setting#getPid
		 * @function
		 * @description
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getObjectClassDefinitionId
		 * @function
		 * @description
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getName
		 * @function
		 * @description
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getAttributeDefinitions
		 * @function
		 * @description
		 * @returns {orion.metatype.AttributeDefinition[]}
		 */
		/**
		 * @name orion.settings.Setting#getTags
		 * @function
		 * @description
		 * @returns {String[]}
		 */
	function SettingImpl(json) {
		this.pid = json.pid;
		this.isRef = typeof json.classId === 'string'; //$NON-NLS-0$
		this.classId = this.isRef ? json.classId : this.pid + '.type'; //$NON-NLS-0$
		this.name = typeof json.name === 'string' ? json.name : null; //$NON-NLS-0$
		this.properties = null;
		this.category = json.category;
		this.tags = json.tags;
		if (!this.pid) { throw new Error('Missing "pid" property'); } //$NON-NLS-0$
	}
	SettingImpl.prototype = {
		getName: function() { return this.name; },
		getPid: function() { return this.pid; },
		getObjectClassDefinitionId: function() { return this.classId; },
		getAttributeDefinitions: function() { return this.properties; },
		getCategory: function() { return this.category || null; },
		getTags: function() { return this.tags || []; },
		isDefaults: function(properties) {
			return this.getAttributeDefinitions().every(function(attributeDefinition) {
				return equalsDefaultValue(properties[attributeDefinition.getId()], attributeDefinition);
			});
		}
	};

	/**
	 * Tracks dynamic registration/unregistration of settings and registers/unregisters the corresponding MetaType service.
	 */
	function SettingTracker(serviceRegistry, metaTypeRegistry, settingsMap, categoriesMap) {
		var serviceRegistrations = {};

		function _addSetting(settingJson) {
			var setting = new SettingImpl(settingJson);
			var classId = setting.getObjectClassDefinitionId();
			var serviceProperties = {
				designates: [{
					pid: setting.getPid(),
					classId: classId
				}]
			};
			if (!setting.isRef && !metaTypeRegistry.getObjectClassDefinition(classId)) {
				// The ObjectClassDefinition doesn't exist yet so we'll define it here
				serviceProperties.classes = [{
					id: classId,
					properties: settingJson.properties
				}];
			}
			serviceRegistrations[setting.getPid()] = serviceRegistry.registerService(METATYPE_SERVICE, {}, serviceProperties);
			var ocd = metaTypeRegistry.getObjectClassDefinition(classId);
			setting.properties = ocd.getAttributeDefinitions();
			settingsMap[setting.getPid()] = setting;
			var category = setting.getCategory() || DEFAULT_CATEGORY;
			if (!categoriesMap[category]) {
				categoriesMap[category] = [];
			}
			categoriesMap[category].push(setting.getPid());
		}

		function _deleteSetting(pid, category) {
			var serviceRegistration = serviceRegistrations[pid];
			serviceRegistration.unregister();
			delete serviceRegistrations[pid];
			delete settingsMap[pid];
			var pids = categoriesMap[category || DEFAULT_CATEGORY];
			pids.splice(pids.indexOf(pid), 1);
			if (!pids.length) {
				delete categoriesMap[category];
			}
		}

		ServiceTracker.call(this, serviceRegistry, SETTING_SERVICE);
		this.addingService = function(serviceRef) {
			var settings = serviceRef.getProperty(SETTINGS_PROP);
			if (!settings || !settings.length) {
				return null;
			}
			for (var i=0; i < settings.length; i++) {
				_addSetting(settings[i]);
			}
			return ServiceTracker.prototype.addingService.call(this, serviceRef);
		};
		this.removedService = function(serviceRef, service) {
			var settings = serviceRef.getProperty(SETTINGS_PROP);
			for (var i=0; i < settings.length; i++) {
				_deleteSetting(settings[i].pid, settings[i].category);
			}
		};
	}

	/**
	 * @name orion.settings.SettingsRegistry
	 * @class Maintains a registry of settings.
	 * @description A SettingsRegistry provides access to information about settings registered with the service registry.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to monitor.
	 * @param {orion.metatype.MetaTypeRegistry} metaTypeRegistry The metatype registry to look up Object Class Definitions in.
	 */
	function SettingsRegistry(serviceRegistry, metaTypeRegistry) {
		this.settingsMap = Object.create(null); // PID -> Setting
		this.categories = Object.create(null);  // Category -> PID[]
		var tracker = new SettingTracker(serviceRegistry, metaTypeRegistry, this.settingsMap, this.categories);
		tracker.open();
	}
	SettingsRegistry.prototype = /** @lends orion.settings.SettingsRegistry.prototype */ {
		/**
		 * Returns settings.
		 * @param {String} [category] If passed, returns only the settings in the given category. Otherwise, returns all settings.
		 * @returns {orion.settings.Setting[]}
		 */
		getSettings: function(category) {
			var settingsMap = this.settingsMap;
			var pids = (typeof category === 'string') ? this.categories[category] : Object.keys(settingsMap);
			if (!pids) {
				return [];
			}
			return pids.map(function(pid) {
				return settingsMap[pid];
			});
		},
		/**
		 * Returns all setting categories.
		 * @returns {String[]}
		 */
		getCategories: function() {
			return Object.keys(this.categories);
		}
	};

	return SettingsRegistry;
});