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
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'orion/widgets/input/Select', 'orion/widgets/input/Checkbox'], 
	function(messages, Select, Checkbox) {

		function MiniThemeChooser(preferences, editorPrefs){			
			this.preferences = preferences;
			this.editorPreferences = editorPrefs;
		}
		
		MiniThemeChooser.prototype.template =	'<div id="themeContainer">' +
													'<div id="pickercontainer" style="display:block;">' +
														'<span class="settingsPanelLabel">Theme:</span>' + 
														'<div id="themepicker"></div>' +
													'</div>' +
													'<div id="sizecontainer">' +
														'<span class="settingsPanelLabel">Font Size:</span>' + 
														'<div id="fontsizepicker"></div>' +
													'</div>';
												
		MiniThemeChooser.prototype.autoSaveTemplate = '<div id="autoSavecontainer">' +
														'<span class="settingsPanelLabel">AutoSave:</span>' + 
														'<div id="autosavecheck"></div>' +
													'</div>' +
												'</div>';
												
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
		
		MiniThemeChooser.prototype.isDescendant = isDescendant;
												
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
		
		MiniThemeChooser.prototype.removeSettings = removeSettings;
		
		function onRemove( callback ){
			this.removeCall = callback;
		}
		
		MiniThemeChooser.prototype.onRemove = onRemove;
		
		function appendTo( node ){
		
			this.container = node;
			this.preferences.getTheme(function(themeStyles) {
				this.editorPreferences.getPrefs(function(prefs) {
				var template =  this.template;
					if (prefs.autoSaveVisible) {
						template += this.autoSaveTemplate;
						node.style.height =  '200px';
						this.addAutoSave();	
					}
					node.innerHTML = template;
					this.addThemePicker(themeStyles);	
					this.addFontSizePicker(themeStyles);
				}.bind(this));
			}.bind(this));
				
		}
		
		MiniThemeChooser.prototype.appendTo = appendTo;	
		
		function selectTheme( name ) {
			this.preferences.setTheme(name);
		}
		
		MiniThemeChooser.prototype.selectTheme = selectTheme;

		function selectFontSize( size ){
			this.preferences.setFontSize(size);
		}
		
		MiniThemeChooser.prototype.selectFontSize = selectFontSize;
		
		function addFontSizePicker( themeStyles ){
			this.fontSize = themeStyles.style.fontSize;
			
			var options = [];
			for( var size = 8; size < 19; size++ ){
			
				var set = {
					value: size + 'pt',
					label: size + 'pt'
				};
				
				if( set.label === this.fontSize ){
					set.selected = true;
				}
				
				options.push(set);
			}	
			
			var picker = document.getElementById( 'fontsizepicker' );
			this.sizeSelect = new Select( { options: options }, picker );
			this.sizeSelect.setStorageItem = this.selectFontSize.bind(this);
			this.sizeSelect.show();
		}
		
		MiniThemeChooser.prototype.addFontSizePicker = addFontSizePicker;
		
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
		
			var picker = document.getElementById( 'themepicker' );
			this.themeSelect = new Select( { options: options }, picker );
			this.themeSelect.setStorageItem = this.selectTheme.bind(this);
			this.themeSelect.show();
		}
		
		MiniThemeChooser.prototype.addThemePicker = addThemePicker;
		
		function addAutoSave(){
			this.editorPreferences.getPrefs(function (editorPrefs) {
				this.editorPrefs = editorPrefs;
				if (editorPrefs.autoSaveVisible) {
					var check = document.getElementById( 'autosavecheck' ); //$NON-NLS-0$
					this.autoSaveCheck = new Checkbox({}, check); //$NON-NLS-0$
					this.autoSaveCheck.setChecked(editorPrefs.autoSaveEnabled);
					this.autoSaveCheck.myfield.addEventListener('change', function () { //$NON-NLS-0$
						this.editorPrefs.autoSaveEnabled = this.autoSaveCheck.myfield.checked;
						this.editorPreferences.setPrefs(this.editorPrefs);
					}.bind(this));
					this.autoSaveCheck.show();
				}
				return editorPrefs.autoSaveVisible;
			}.bind(this));
		}
		
		MiniThemeChooser.prototype.addAutoSave = addAutoSave;
		
		function destroy(){}
		
		MiniThemeChooser.prototype.destroy = destroy;

		return{
			MiniThemeChooser:MiniThemeChooser,
			destroy:destroy
		};
	}
);
