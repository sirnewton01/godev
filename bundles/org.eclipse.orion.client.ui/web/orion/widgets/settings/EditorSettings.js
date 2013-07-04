/*globals define document*/

define("orion/widgets/settings/EditorSettings", //$NON-NLS-0$
[
	'require', //$NON-NLS-0$
	'orion/widgets/themes/ThemeBuilder', //$NON-NLS-0$
	'orion/widgets/themes/ThemePreferences', //$NON-NLS-0$
	'orion/widgets/themes/editor/ThemeData', //$NON-NLS-0$
	'orion/util', //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'orion/webui/littlelib', //$NON-NLS-0$
	'i18n!orion/settings/nls/messages', //$NON-NLS-0$ 
	'orion/widgets/input/LabeledTextfield', 'orion/widgets/input/LabeledCheckbox',  //$NON-NLS-0$  //$NON-NLS-1$ 
	'orion/widgets/input/LabeledSelect', //$NON-NLS-0$ 
	'orion/section', //$NON-NLS-0$ 
	'orion/widgets/settings/Subsection', //$NON-NLS-0$
	'orion/commands'//$NON-NLS-0$ 
], function(require, ThemeBuilder, mThemePreferences, editorThemeData, util, objects, lib, messages, LabeledTextfield, LabeledCheckbox, LabeledSelect, mSection, Subsection, commands)  {
    var KEY_MODES = [
	    messages.Default,
		"Emacs", //$NON-NLS-0$
		"vi" //$NON-NLS-0$
	];
				
	function EditorSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
		this._editorPref = options.preferences;
	}
	objects.mixin( EditorSettings.prototype, {
		templateString: '<div class="sections"></div>', //$NON-NLS-0$
		commandTemplate:'<div id="commandButtons">' + //$NON-NLS-0$
				'<div id="editorCommands" class="layoutRight sectionActions"></div>' + //$NON-NLS-0$
				'</div>', //$NON-NLS-0$
		createElements: function() {
			this.node.innerHTML = this.templateString;
			var commandArea = document.getElementById( 'pageActions' ); //$NON-NLS-0$
			commandArea.innerHTML = this.commandTemplate;
			this.sections = lib.$('.sections', this.node); //$NON-NLS-0$
			this.createSections();
		},
		createSections: function(){
		
			this.editorThemeSection = new mSection.Section(this.sections, {
				id: "editorThemeSettings", //$NON-NLS-0$
				title: messages.EditorThemes,
				canHide: true,
				slideout: true
			});
			
			var editorTheme = new editorThemeData.ThemeData();
			var themePreferences = new mThemePreferences.ThemePreferences(this._editorPref._preferences, editorTheme);
		
			this.editorThemeWidget = new ThemeBuilder({ commandService: this.commandService, preferences: themePreferences, themeData: editorTheme, toolbarId: 'editorThemeSettingsToolActionsArea'}); //$NON-NLS-0$
			
			var command = { name:messages.Import, tip:messages['Import a theme'], id:0, callback: editorTheme.importTheme.bind(editorTheme) };
			
			this.editorThemeWidget.addAdditionalCommand( command );
			this.editorThemeWidget.renderData( this.editorThemeSection.getContentElement(), 'INITIALIZE' ); //$NON-NLS-0$
		
			this.settingsSection = new mSection.Section(this.sections, {
				id: "editorSettings", //$NON-NLS-0$
				title: messages.EditorSettings,
				canHide: true,
				slideout: true
			});
			
			var fileMgtFields = [];
			if (this.oldPrefs.autoSaveVisible) {
				fileMgtFields.push(this.autoSaveCheck = new LabeledCheckbox( {fieldlabel:messages['Autosave Enabled']}));
				fileMgtFields.push(this.autoSaveField = new LabeledTextfield( {fieldlabel:messages['Save interval']}));
			}
			if (this.oldPrefs.autoLoadVisible) {
				fileMgtFields.push(this.autoLoadCheck = new LabeledCheckbox( {fieldlabel:messages['Autoload Enabled']}));
			}
			if (fileMgtFields.length > 0) {
				var fileMgtSubsection = new Subsection( {sectionName: messages.FileMgt, parentNode: this.settingsSection.getContentElement(), children: fileMgtFields} );
				fileMgtSubsection.show();
			}
		
			var kbFields = [];
			if (this.oldPrefs.keyBindingsVisible) {
				var keys = KEY_MODES;
				var options = [];
				for( var i= 0; i < keys.length; i++ ){
					var key = keys[i];
					var set = {
						value: key,
						label: key
					};	
					if( key === this.oldPrefs.keyBindings ){
						set.selected = true;
					}
					options.push(set);
				}	
				kbFields.push(this.kbSelect = new LabeledSelect( {fieldlabel:messages.Scheme, options:options}));
				var kbSubsection = new Subsection( {sectionName:messages.KeyBindings, parentNode: this.settingsSection.getContentElement(), children: kbFields } );
				kbSubsection.show();
			}
		
			var tabsFields = [];
			if (this.oldPrefs.tabSizeVisible) {
				tabsFields.push(this.tabField = new LabeledTextfield( {fieldlabel:messages.TabSize}));
			}
			if (this.oldPrefs.expandTabVisible) {
				tabsFields.push(this.expandTabCheck = new LabeledCheckbox( {fieldlabel:messages.ExpandTab}));
			}
			if (tabsFields.length > 0) {
				var tabsSubsection = new Subsection( {sectionName:messages.Tabs, parentNode: this.settingsSection.getContentElement(), children: tabsFields } );
				tabsSubsection.show();
			}
					
			var scrollingFields = [];
			if (this.oldPrefs.scrollAnimationVisible) {
				scrollingFields.push(this.scrollAnimationCheck = new LabeledCheckbox( {fieldlabel:messages.ScrollAnimationEnabled}));
				scrollingFields.push(this.scrollAnimationField = new LabeledTextfield( {fieldlabel:messages.ScrollAnimationTimeout}));
			}
			if (scrollingFields.length > 0) {
				var scrollingSubsection = new Subsection( {sectionName:messages.ScrollAnimation, parentNode: this.settingsSection.getContentElement(), children: scrollingFields } );
				scrollingSubsection.show();
			}

			var toolbar = lib.node( 'editorSettingsToolActionsArea' ); //$NON-NLS-0$
			var restoreCommand = new commands.Command({
				name: messages.Restore,
				tooltip: messages["Restore default Editor Settings"],
				id: "orion.restoreeditorsettings", //$NON-NLS-0$
				callback: function(data){
					this.restore(data.items);
				}.bind(this)
			});
			this.commandService.addCommand(restoreCommand);
			this.commandService.registerCommandContribution('restoreEditorSettingCommand', "orion.restoreeditorsettings", 2); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.renderCommands('restoreEditorSettingCommand', toolbar, this, this, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$			

			var updateCommand = new commands.Command({
				name: messages.Update,
				tooltip: messages["Update Editor Settings"],
				id: "orion.updateeditorsettings", //$NON-NLS-0$
				callback: function(data){
					this.update(data.items);
				}.bind(this)
			});
			this.commandService.addCommand(updateCommand);
			this.commandService.registerCommandContribution('editorSettingCommand', "orion.updateeditorsettings", 1); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.renderCommands('editorSettingCommand', toolbar, this, this, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$		
		},
		valueChanged: function() {
			var currentPrefs = {};
			for (var property in this.oldPrefs) {
				if (this.oldPrefs.hasOwnProperty(property)) {
					currentPrefs[property] = this.oldPrefs[property];
				}
			}
			this.getValues(currentPrefs);
			for (var prop in currentPrefs) {
				if (currentPrefs.hasOwnProperty(prop)) {
					if (currentPrefs[prop] !== this.oldPrefs[prop]) {
						return currentPrefs;
					}
				}
			}
			return undefined;
		},
		validate: function(prefs) {
			if (isNaN(prefs.autoSaveTimeout) || !isFinite(prefs.autoSaveTimeout)) {
				return messages["Invalid save interval."];
			}
			if (isNaN(prefs.scrollAnimation) || !isFinite(prefs.scrollAnimation)) {
				return messages["Invalid scrolling duration."];
			}
			if (!(1 <= prefs.tabSize && prefs.tabSize <= 16)) {
				return messages["Invalid tab size."];
			}
			return "";
		},
		update: function() {
			var currentPrefs = this.valueChanged();
			if (currentPrefs) {
				var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
				var msg = this.validate(currentPrefs);
				if (msg) {
					messageService.setProgressResult({Message:msg,Severity:"Error"}); //$NON-NLS-0$
					return;
				}
				var self = this;
				this._editorPref.setPrefs(currentPrefs, function () { 
					self.setValues(self.oldPrefs = currentPrefs);
					messageService.setProgressResult( {Message:messages["Editor preferences updated"], Severity:"Normal"} ); //$NON-NLS-0$
				});
			} else {
				this.setValues(this.oldPrefs);
			}
		},
		restore: function() {
			this._editorPref.setPrefs({}, function (editorPrefs){ 
				var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
				messageService.setProgressResult( {Message:messages["Editor defaults restored"], Severity:"Normal"} ); //$NON-NLS-0$
				this._show(editorPrefs);
			}.bind(this));
		},
		show: function() {
			this._editorPref.getPrefs(function (editorPrefs) {
				this._show(editorPrefs);
			}.bind(this));
		},
		_show: function(editorPrefs) {
			this.oldPrefs = editorPrefs;
			this.createElements();
			this.setValues(editorPrefs);
		},
		getValues: function(editorPrefs) {
			if (this.autoSaveCheck) {
				editorPrefs.autoSaveEnabled = this.autoSaveCheck.isChecked();
			}
			if (this.autoSaveField) {
				editorPrefs.autoSaveTimeout = parseInt(this.autoSaveField.getValue(), 10);
			}
			if (this.autoLoadCheck) {
				editorPrefs.autoLoadEnabled = this.autoLoadCheck.isChecked();
			}
			if (this.tabField) {
				editorPrefs.tabSize = parseInt(this.tabField.getValue(), 10);
			} 
			if (this.expandTabCheck) {
				editorPrefs.expandTab = this.expandTabCheck.isChecked();
			}
			if (this.scrollAnimationCheck) {
				editorPrefs.scrollAnimationEnabled = this.scrollAnimationCheck.isChecked();
			}
			if (this.scrollAnimationField) {
				editorPrefs.scrollAnimation = parseInt(this.scrollAnimationField.getValue(), 10);
			}
			if (this.kbSelect) {
				editorPrefs.keyBindings = this.kbSelect.getSelected();
			}
		},
		setValues: function(editorPrefs) {
			if (this.autoSaveCheck) {
				this.autoSaveCheck.setChecked(editorPrefs.autoSaveEnabled);
			}
			if (this.autoSaveField) {
				this.autoSaveField.setValue(editorPrefs.autoSaveTimeout);
			}
			if (this.autoLoadCheck) {
				this.autoLoadCheck.setChecked(editorPrefs.autoLoadEnabled);
			}
			if (this.tabField) {
				this.tabField.setValue(editorPrefs.tabSize);
			} 
			if (this.expandTabCheck) {
				this.expandTabCheck.setChecked(editorPrefs.expandTab);
			} 
			if (this.scrollAnimationCheck) {
				this.scrollAnimationCheck.setChecked(editorPrefs.scrollAnimationEnabled);
			}
			if (this.scrollAnimationField) {
				this.scrollAnimationField.setValue(editorPrefs.scrollAnimation);
			}
			if (this.kbSelect) {
				this.kbSelect.setSelectedIndex(Math.max(KEY_MODES.indexOf(editorPrefs.keyBindings),0));
			}
		},
		destroy: function() {
			if (this.node) {
				this.node = null;
			}
			if (this.editorThemeWidget) {
				this.editorThemeWidget.destroy();
				this.editorThemeWidget = null;
			}
		}
	});
	
	return EditorSettings;
});