/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global window console define */
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'orion/widgets/input/Select', 'orion/widgets/input/Checkbox'], 
	function(messages, Select, Checkbox) {

		function LocalEditorSettings(preferences, editorPrefs){			
			this.preferences = preferences;
			this.editorPreferences = editorPrefs;
		}
		
		LocalEditorSettings.prototype.template =
			'<div id="themeContainer">' + //$NON-NLS-0$
				'<span class="settingsPanelLabel">' + //$NON-NLS-0$
					'Theme:' +
				'</span>' + //$NON-NLS-0$
				'<div class="settingsPanelValue" id="themepicker"></div>' + //$NON-NLS-0$
			'</div>' + //$NON-NLS-0$
			'<div id="sizecontainer">' + //$NON-NLS-0$
				'<span class="settingsPanelLabel">' + //$NON-NLS-0$
					'Font Size:' +
				'</span>' + //$NON-NLS-0$
				'<div class="settingsPanelValue" id="fontsizepicker"></div>' + //$NON-NLS-0$
			'</div>' + //$NON-NLS-0$
			'<div id="keyscontainer">' + //$NON-NLS-0$
				'<span class="settingsPanelLabel">' + //$NON-NLS-0$
					'Key Bindings:' +
				'</span>' + //$NON-NLS-0$
				'<div class="settingsPanelValue" id="keyspicker"></div>' + //$NON-NLS-0$
			'</div>' + //$NON-NLS-0$
			'<div id="autoSaveContainer" style="display:none;">' + //$NON-NLS-0$
				'<span class="settingsPanelLabel">' + //$NON-NLS-0$
					'Auto Save:' +
				'</span>' + //$NON-NLS-0$
				'<div class="settingsPanelValue" id="autosavecheck"></div>' + //$NON-NLS-0$
			'</div>'; //$NON-NLS-0$

		function isDescendant(parent, child) {
		     var node = child.parentNode;
		     while (node !== null) {
		         if (node === parent) {
		             return true;
		         }
		         node = node.parentNode;
		     }
		     return false;
		}
		
		LocalEditorSettings.prototype.isDescendant = isDescendant;
												
		function removeSettings( event ){
		
			if( !isDescendant( this.container, event.target ) ){

				this.destroy();
				
				window.removeEventListener( this.listener );

				if( this.container ){
					this.container.parentNode.removeChild( this.container );
					this.container = null;
				}
			}
		}
		
		LocalEditorSettings.prototype.removeSettings = removeSettings;
		
		function onRemove( callback ){
			this.removeCall = callback;
		}
		
		LocalEditorSettings.prototype.onRemove = onRemove;
		
		function updateContent( contentNode, callback ){
		
			this.container = contentNode;
			this.preferences.getTheme(function(themeStyles) {
				this.editorPreferences.getPrefs(function(prefs) {
					this.editorPrefs = prefs;
					contentNode.innerHTML = this.template;
					this.addThemePicker(themeStyles);	
					this.addFontSizePicker(themeStyles);
					this.addKeysPicker(prefs);
					if (prefs.autoSaveVisible) {
						var container = document.getElementById( 'autoSaveContainer' ); //$NON-NLS-0$
						container.style.display = "block"; //$NON-NLS-0$
						this.addAutoSave(prefs);	
					}
					callback();
				}.bind(this));
			}.bind(this));
				
		}
		
		LocalEditorSettings.prototype.updateContent = updateContent;	
		
		function selectTheme( name ) {
			this.preferences.setTheme(name);
		}
		
		LocalEditorSettings.prototype.selectTheme = selectTheme;

		function selectFontSize( size ){
			this.preferences.setFontSize(size);
		}
		
		LocalEditorSettings.prototype.selectFontSize = selectFontSize;
		
		function selectKeys( keys ){
			this.editorPrefs.keyBindings = keys;
			this.editorPreferences.setPrefs(this.editorPrefs);
		}
		
		LocalEditorSettings.prototype.selectKeys = selectKeys;
		
		function addFontSizePicker( themeStyles ){
			this.fontSize = themeStyles.style.fontSize;
			
			var options = [];
			for( var size = 8; size < 19; size++ ){
			
				var set = {
					value: size + 'pt', //$NON-NLS-0$
					label: size + 'pt' //$NON-NLS-0$
				};
				
				if( set.label === this.fontSize ){
					set.selected = true;
				}
				
				options.push(set);
			}	
			
			var picker = document.getElementById( 'fontsizepicker' ); //$NON-NLS-0$
			this.sizeSelect = new Select( { options: options }, picker );
			this.sizeSelect.setStorageItem = this.selectFontSize.bind(this);
			this.sizeSelect.show();
		}
		
		LocalEditorSettings.prototype.addFontSizePicker = addFontSizePicker;
		
		function addThemePicker( themeStyles ){
			var styles = themeStyles.styles;
			var options = [];
			for( var theme= 0; theme < styles.length; theme++ ){
			
				var set = {
					value: styles[theme].name,
					label: styles[theme].name
				};	
				
				if( styles[theme].name === themeStyles.style.name ){
					set.selected = true;
				}
				
				options.push(set);
			}	
		
			var picker = document.getElementById( 'themepicker' ); //$NON-NLS-0$
			this.themeSelect = new Select( { options: options }, picker );
			this.themeSelect.setStorageItem = this.selectTheme.bind(this);
			this.themeSelect.show();
		}
		
		LocalEditorSettings.prototype.addThemePicker = addThemePicker;

		function addKeysPicker( prefs ){
			var keys = [
				messages.Default,
				"Emacs", //$NON-NLS-0$
				"vi" //$NON-NLS-0$
			];
			var options = [];
			for( var i= 0; i < keys.length; i++ ){
				var key = keys[i];
				var set = {
					value: key,
					label: key
				};	
				if( key === prefs.keyBindings ){
					set.selected = true;
				}
				options.push(set);
			}	
		
			var picker = document.getElementById( 'keyspicker' ); //$NON-NLS-0$
			this.keysSelect = new Select( { options: options }, picker );
			this.keysSelect.setStorageItem = this.selectKeys.bind(this);
			this.keysSelect.show();
		}
		
		LocalEditorSettings.prototype.addKeysPicker = addKeysPicker;

		function addAutoSave( prefs ){
			var check = document.getElementById( 'autosavecheck' ); //$NON-NLS-0$
			this.autoSaveCheck = new Checkbox({}, check); //$NON-NLS-0$
			this.autoSaveCheck.setChecked(prefs.autoSaveEnabled);
			this.autoSaveCheck.myfield.addEventListener('change', function () { //$NON-NLS-0$
				this.editorPrefs.autoSaveEnabled = this.autoSaveCheck.myfield.checked;
				this.editorPreferences.setPrefs(this.editorPrefs);
			}.bind(this));
			this.autoSaveCheck.show();
		}
		
		LocalEditorSettings.prototype.addAutoSave = addAutoSave;
		
		function destroy(){}
		
		LocalEditorSettings.prototype.destroy = destroy;

		return LocalEditorSettings;
	}
);
