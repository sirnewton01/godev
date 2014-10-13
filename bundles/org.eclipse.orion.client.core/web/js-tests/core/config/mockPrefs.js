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
/*eslint-env browser, amd, mocha*/
define([
	"orion/Deferred",
	"orion/preferences", // Only used for constant field values, no API calls
], function(Deferred, mPreferences) {
	var RealPrefsService = mPreferences.PreferencesService;

	function Preferences(name, providers) {
		this.name = name;
		this.providers = providers;
	}
	Preferences.prototype = {
		clear: function() {
			// Clear all stores
			this.providers.forEach(function(provider) {
				provider.clear();
			});
		},
		keys: function() {
			var keySet = Object.create(null);
			this.providers.forEach(function(provider) {
				var providerMap = provider.map;
				Object.keys(providerMap).forEach(function(key) {
					keySet[key] = 1;
				});
			});
			return Object.keys(keySet);
		},
		get: function(key) {
			// Get key the first provider that has it defined
			var value;
			this.providers.some(function(provider) {
				value = provider.get(key);
				if (typeof value === "undefined")
					return false;
				return true;
			});
			return value; // undefined or value
		},
		put: function(key, value) {
			// Put into the first provider
			this.providers[0].put(key, value);
		},
		remove: function(key) {
			// Remove from the first provider
			this.providers[0].remove(key);
		},
		_all: function() {
			var _self = this, result = Object.create(null);
			this.keys().forEach(function(key) {
				var value = _self.get(key);
				if (typeof result[key] === "undefined")
					result[key] = value;
			});
			return result;
		},
		/**
		 * Search for a string in the entire preferences JSON blob
		 * @internal
		 */
		_contains: function(str) {
			return JSON.stringify(this._all()).indexOf(str) !== -1;
		}
	};

	// Mock preferences Provider, written synchronously
	function Provider(map) {
		this.map = map;
	}
	Provider.prototype = {
		clear: function() {
			this.map = Object.create(null);
		},
		get: function(key) {
			var value = this.map[key];
			return value && typeof value === 'string' ? JSON.parse(value) : undefined;
		},
		put: function(key, value) {
			if (value === null) {
				throw new Error('Preferences does not allow null values');
			}
			this.map[key] = JSON.stringify(value);
		},
		remove: function(key) {
			delete this.map[key];
		},
	};

	function MockPrefsService() {
		// This is the fake back-end storage shared among providers of the same scope
		var defaultData = Object.create(null),
		    localData = Object.create(null),
		    userData = Object.create(null);

		this._defaultsProvider = new Provider(defaultData);
		this._localProvider = new Provider(localData);
		this._userProvider = new Provider(userData);
	}
	MockPrefsService.DEFAULT_SCOPE = RealPrefsService.DEFAULT_SCOPE;
	MockPrefsService.LOCAL_SCOPE = RealPrefsService.LOCAL_SCOPE;
	MockPrefsService.USER_SCOPE = RealPrefsService.USER_SCOPE;
	MockPrefsService.prototype = {
		getPreferences: function(name, optScope) {
			if (!optScope || typeof(optScope) !== "number" || optScope > 7 || optScope < 1) { //$NON-NLS-0$
				optScope = MockPrefsService.DEFAULT_SCOPE | MockPrefsService.LOCAL_SCOPE | MockPrefsService.USER_SCOPE;
			}
			var providers = [];
			if ((MockPrefsService.USER_SCOPE & optScope)) {
				providers.push(this._userProvider);
			}
			if (MockPrefsService.LOCAL_SCOPE & optScope) {
				providers.push(this._localProvider);
			}
			if (MockPrefsService.DEFAULT_SCOPE & optScope) {
				providers.push(this._defaultsProvider);
			}
			var d = new Deferred();
			setTimeout(function() {
				d.resolve(new Preferences(name, providers));
			}, 0);
			return d;
		}
	};
	return MockPrefsService;
});