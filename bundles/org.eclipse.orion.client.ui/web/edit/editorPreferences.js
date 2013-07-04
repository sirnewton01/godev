/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:  IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/

define([], function() {

	var SETTINGS_SECTION = "/editor/settings"; //$NON-NLS-0$
	var SETTINGS_KEY = "editorSettings"; //$NON-NLS-0$

	var defaults = {	
		autoSaveEnabled:false, 
		autoSaveTimeout:1000,
		autoSaveVisible:true,
		autoLoadEnabled:true,
		autoLoadVisible:true,
		tabSize:4,
		tabSizeVisible:true,
		expandTab:false,
		expandTabVisible:true,
		scrollAnimationEnabled: true,
		scrollAnimation:300,
		scrollAnimationVisible:true,
		keyBindingsVisible: true,
		keyBindings: "Default"
	};

	function EditorPreferences(preferences, callback) {
		this._preferences = preferences;
		this._callback = callback;
		if (callback) {
			var storageKey = preferences.listenForChangedSettings(SETTINGS_SECTION, function (e) {
				if (e.key === storageKey) {
					callback();	
				}
			}.bind(this));
		}
	}
	
	EditorPreferences.prototype = /** @lends edit.EditorPreferences.prototype */ {
		_initialize: function(prefs) {
			var settings = prefs.get(SETTINGS_KEY) || {};
			for (var property in defaults) {
				if (!settings.hasOwnProperty(property)) {
					settings[property] = defaults[property];
				}
			}
			return settings;
		},
		getPrefs: function(callback) {
			this._preferences.getPreferences(SETTINGS_SECTION).then(function(prefs) {
				var object = this._initialize(prefs);
				if (typeof object === "string") { //$NON-NLS-0$
					object = JSON.parse(object);
				}
				callback(object);
			}.bind(this));
		},
		setPrefs: function(object, callback) {
			this._preferences.getPreferences(SETTINGS_SECTION).then(function(prefs) {
				prefs.put(SETTINGS_KEY, object);
				object = this._initialize(prefs);
				if (callback) {
					callback(object);
				}
				if (this._callback) {
					this._callback(object);
				}
			}.bind(this));
		}
	};
	
	return  {EditorPreferences : EditorPreferences};
});	
	