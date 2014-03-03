/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define console */
define([
	'orion/Deferred',
	'orion/i18nUtil',
	'orion/serviceTracker'
], function(Deferred, i18nUtil, ServiceTracker) {
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

	function getStringOrNull(obj, property) {
		return typeof obj[property] === 'string' ? obj[property] : null;
	}

	/**
	 * @name orion.settings.Setting
	 * @class Represents the definition of a setting.
	 * @description Represents the definition of a setting.
	 */
		/**
		 * @name orion.settings.Setting#isDefaults
		 * @function
		 * @param {Object} properties A map of AttributeDefinition IDs to values.
		 * @description Returns whether a given properties map equals the default value of this setting. This
		 * tests if the following two conditions hold:
		 * <ul>
		 * <li>The ID of every AttributeDefinition in this setting appears as a key in the map, and</li>
		 * <li>The key's corresponding value equals the AttributeDefinition's default value.</li>
		 * </ul>
		 * @returns {Boolean} <code>true</code> if the given <code>properties</code> map equals the defaults.
		 */
		/**
		 * @name orion.settings.Setting#getCategory
		 * @function
		 * @description Returns the category.
		 * @returns {String} The category. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getCategoryKey
		 * @function
		 * @description Returns the category key.
		 * @returns {String} The category key. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getCategoryLabel
		 * @function
		 * @description Returns the category label.
		 * @returns {String} The category label. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getPid
		 * @function
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getObjectClassDefinitionId
		 * @function
		 * @returns {String}
		 */
		/**
		 * @name orion.settings.Setting#getName
		 * @function
		 * @description Returns the name.
		 * @returns {String} The name. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getNameKey
		 * @function
		 * @see #getNls
		 * @description Returns the name key.
		 * @returns {String} The name key. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getNls
		 * @function
		 * @see #getNameKey
		 * @description Returns the NLS path.
		 * @returns {String} The NLS path. May be <code>null</code>.
		 */
		/**
		 * @name orion.settings.Setting#getAttributeDefinitions
		 * @function
		 * @returns {orion.metatype.AttributeDefinition[]}
		 */
		/**
		 * @name orion.settings.Setting#getTags
		 * @function
		 * @returns {String[]}
		 */
	function SettingImpl(json) {
		this.pid = json.pid;
		this.isRef = getStringOrNull(json, 'classId'); //$NON-NLS-0$
		this.classId = this.isRef ? json.classId : this.pid + '.type'; //$NON-NLS-0$
		this.name = getStringOrNull(json, 'name'); //$NON-NLS-0$
		this.nameKey = getStringOrNull(json, 'nameKey'); //$NON-NLS-0$
		this.nls = getStringOrNull(json, 'nls'); //$NON-NLS-0$
		this.properties = null;
		this.category = json.category || null;
		this.categoryKey = json.categoryKey || null;
		this.tags = json.tags;
		if (!this.pid) { throw new Error('Missing "pid" property'); } //$NON-NLS-0$
	}
	SettingImpl.prototype = {
		getName: function() {
			return this._nlsName || this.name;
		},
		getNameKey: function() {
			return this.nameKey;
		},
		getNls: function() {
			return this.nls;
		},
		getPid: function() {
			return this.pid;
		},
		getObjectClassDefinitionId: function() {
			return this.classId;
		},
		getAttributeDefinitions: function() {
			return this.properties;
		},
		getCategory: function() {
			return this.category;
		},
		getCategoryLabel: function() {
			return this._nlsCategoryLabel;
		},
		getCategoryKey: function() {
			return this.categoryKey;
		},
		getTags: function() {
			return this.tags || [];
		},
		isDefaults: function(properties) {
			return this.getAttributeDefinitions().every(function(attributeDefinition) {
				return equalsDefaultValue(properties[attributeDefinition.getId()], attributeDefinition);
			});
		},
		// Private, for translation
		_setNlsName: function(value) {
			this._nlsName = value;
		},
		// Private, for translation
		_setNlsCategory: function(value) {
			this._nlsCategoryLabel = value;
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
					nameKey: setting.getNameKey(),
					nls: setting.getNls(),
					properties: settingJson.properties
				}];
			}
			serviceRegistrations[setting.getPid()] = serviceRegistry.registerService(METATYPE_SERVICE, {}, serviceProperties);
			var ocd = metaTypeRegistry.getObjectClassDefinition(classId);
			setting.properties = ocd.getAttributeDefinitions();
			settingsMap[setting.getPid()] = setting;
			var category = setting.getCategory() || DEFAULT_CATEGORY;
			if (!Object.prototype.hasOwnProperty.call(categoriesMap, category)) {
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
		this.settingsMap = Object.create(null);    // PID -> Setting
		this.categories = Object.create(null);     // Category -> PID[]
		this.categoryLabels = Object.create(null); // Category -> String
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
			var pids = (typeof category === 'string') ? this.categories[category] : Object.keys(settingsMap); //$NON-NLS-0$
			if (!pids) {
				return [];
			}
			return pids.map(function(pid) {
				return settingsMap[pid];
			});
		},
		/**
		 * Returns all setting categories.
		 * @returns {String[]} The categories.
		 */
		getCategories: function() {
			return Object.keys(this.categories);
		},
		/**
		 * Returns the localized label for a category.
		 * @returns {String} The category label, or <code>null</code> if no localized label is available.
		 */
		getCategoryLabel: function(category) {
			return this.categoryLabels[category] || null;
		},
		/**
		 * Loads the localizations for settings in the registry. After this method resolves, the Settings and AttributeDefinitions
		 * will return localized values from their name and label getters.
		 * @returns {orion.Promise} A promise that resolves when localizations have been loaded.
		 */
		loadI18n: function() {
			function continueOnError(err) {
				return null;
			}
			function translateSetting(messages, setting) {
				setting._setNlsName(messages[setting.getNameKey()]);
				setting._setNlsCategory(messages[setting.getCategoryKey()]);
				setting.getAttributeDefinitions().forEach(function(attr) {
					attr._setNlsName(messages[attr.getNameKey()]);
					var labelKeys = attr.getOptionLabelKeys();
					if (labelKeys) {
						var translatedLabels = labelKeys.map(function(key) {
							return messages[key];
						});
						attr._setNlsOptionLabels(translatedLabels);
					}
				});
			}

			var toTranslate = Object.create(null);    // {String} bundle name -> {Setting[]}
			var bundles = Object.create(null);        // {String} bundle name -> {Object} messages
			var bundlePromises = [];

			this.getSettings().forEach(function(setting) {
				var bundleName = setting.getNls();
				if (!bundleName) {
					return;
				}
				bundlePromises.push(i18nUtil.getMessageBundle(bundleName).then(function(messages) {
					bundles[bundleName] = messages;
				}));
				toTranslate[bundleName] = toTranslate[bundleName] || [];
				toTranslate[bundleName].push(setting);
			});

			var loadBundles = Deferred.all(bundlePromises, continueOnError);
			var _self = this;
			return loadBundles.then(function() {
				Object.keys(bundles).forEach(function(bundleName) {
					var messages = bundles[bundleName];
					toTranslate[bundleName].forEach(translateSetting.bind(null, messages));
				});

				// Update the categoryLabels
				_self.getCategories().forEach(function(category) {
					// Find a setting that provides a label for the category
					_self.getSettings(category).some(function(setting) {
						var label = setting.getCategoryLabel();
						if (!label) {
							return false;
						}
						_self.categoryLabels[category] = label;
						return true;
					});
				});
			});
		}
	};

	return SettingsRegistry;
});