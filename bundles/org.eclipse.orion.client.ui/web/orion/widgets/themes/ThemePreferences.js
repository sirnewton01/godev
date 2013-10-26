/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:  IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define */

define([], function() {

	function ThemePreferences(preferences, themeData) {
		this._preferences = preferences;
		this._themeData = themeData;
		var themeInfo = themeData.getThemeStorageInfo();
		var storageKey = preferences.listenForChangedSettings(themeInfo.storage, 2, function(e) {
			if (e.key === storageKey) {
				this.apply();
			}
		}.bind(this));
	}
	
	ThemePreferences.prototype = /** @lends orion.editor.ThemePreferences.prototype */ {
		_initialize: function(themeInfo, themeData, prefs) {
			var styles = prefs.get(themeInfo.styleset); 
			if (!styles){
				styles = themeData.getStyles();
				prefs.put(themeInfo.styleset, JSON.stringify(styles)); 
			}
			var selected = prefs.get('selected'); //$NON-NLS-0$
			if (selected) {
				selected = JSON.parse(selected);
			}
			if (!selected || selected[themeInfo.selectedKey] === undefined) {
				selected = selected || {}; 
				selected[themeInfo.selectedKey] = themeInfo.defaultTheme;
				prefs.put('selected', JSON.stringify(selected)); //$NON-NLS-0$
			}
		},
		apply: function() {
			this.setTheme();
		},
		getTheme: function(callback) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();
			this._preferences.getPreferences(themeInfo.storage, 2).then(function(prefs) {
				this._initialize(themeInfo, themeData, prefs);
				var selected = JSON.parse(prefs.get('selected')); //$NON-NLS-0$
				var styles = JSON.parse(prefs.get(themeInfo.styleset)), style;
				if (styles) {	
					for (var i = 0; i < styles.length; i++ ){
						if( styles[i].name === selected[themeInfo.selectedKey] ){
							style = styles[i];
							break;
						}
					}
				}
				callback({
					style: style,
					styles: styles
				});
			}.bind(this));
		},
		setTheme: function(name, styles) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();
			this._preferences.getPreferences(themeInfo.storage, 2).then(function(prefs) {
				this._initialize(themeInfo, themeData, prefs);
				var selected = JSON.parse(prefs.get('selected')); //$NON-NLS-0$
				if (!name) {
					name = selected[themeInfo.selectedKey];
				}
				selected[themeInfo.selectedKey] = name;
				prefs.put('selected', JSON.stringify(selected)); //$NON-NLS-0$
				if (styles) {
					prefs.put(themeInfo.styleset, JSON.stringify(styles)); 
				} else {
					styles = JSON.parse(prefs.get(themeInfo.styleset));
				}
				for (var i = 0; i <styles.length; i++) {
					if (styles[i].name === selected[themeInfo.selectedKey]) {
						themeData.processSettings(styles[i]);
						break;
					}	
				}
			}.bind(this));
		},
		setFontSize: function(size) {
			var themeData = this._themeData;
			var themeInfo = themeData.getThemeStorageInfo();
			this._preferences.getPreferences(themeInfo.storage, 2).then(function(prefs) {
				this._initialize(themeInfo, themeData, prefs);
				var selected = JSON.parse(prefs.get('selected')); //$NON-NLS-0$
				var styles = JSON.parse(prefs.get(themeInfo.styleset)), style;
				if (styles) {	
					for( var s = 0; s < styles.length; s++ ){
						styles[s].fontSize = size;
						if( styles[s].name ===  selected[themeInfo.selectedKey] ){
							style = styles[s];
						}
						
					}
				}
				prefs.put(themeInfo.styleset , JSON.stringify(styles));
				themeData.processSettings(style);
			}.bind(this));
		}
	};

	return{
		ThemePreferences: ThemePreferences
	};
});