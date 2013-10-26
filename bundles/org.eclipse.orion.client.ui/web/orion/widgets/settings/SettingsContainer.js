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
/*global window console define localStorage*/
/*jslint browser:true sub:true*/

/* This SettingsContainer widget manages a left and right side. The left is for choosing a 
   category, the right shows the resulting HTML for that category. */

define([
	'i18n!orion/settings/nls/messages',
	'orion/Deferred',
	'orion/globalCommands',
	'orion/PageUtil',
	'orion/webui/littlelib',
	'orion/objects',
	'orion/URITemplate',
	'orion/widgets/themes/ThemeBuilder',
	'orion/settings/ui/PluginSettings',
	'orion/widgets/themes/ThemePreferences',
	'orion/widgets/themes/editor/ThemeData',
	'orion/widgets/themes/container/ThemeData',
	'orion/widgets/settings/SplitSelectionLayout',
	'orion/widgets/plugin/PluginList',
	'orion/widgets/settings/UserSettings',
	'orion/widgets/settings/GitSettings',
	'orion/widgets/settings/EditorSettings',
	'orion/editorPreferences'
], function(messages, Deferred, mGlobalCommands, PageUtil, lib, objects, URITemplate, 
		ThemeBuilder, SettingsList, mThemePreferences, editorThemeData, containerThemeData, SplitSelectionLayout, PluginList, UserSettings,
		GitSettings,
		EditorSettings, mEditorPreferences) {

	/**
	 * @param {Object} options
	 * @param {DomNode} node
	 */
	var superPrototype = SplitSelectionLayout.prototype;
	function SettingsContainer(options, node) {
		SplitSelectionLayout.apply(this, arguments);

		var getPluginsRefs = this.registry.getServiceReferences("orion.core.getplugins"); //$NON-NLS-0$
		this.pluginsUri = getPluginsRefs[0] && getPluginsRefs[0].getProperty("uri"); //$NON-NLS-0$

		this.settingsCategories = [];
	}
	SettingsContainer.prototype = Object.create(superPrototype);
	objects.mixin(SettingsContainer.prototype, {
		/**
		 * @returns {orion.Promise}
		 */
		loadTranslatedPluginSettings: function() {
			return this.settingsRegistry.loadI18n();
		},

		show: function() {
			var _self = this;

			Deferred.all([this.preferences.getPreferences('/settingsContainer'), this.loadTranslatedPluginSettings()]).then(function(results){
				var prefs = results[0];
				var categories = prefs.get( 'categories' ) || {};
				if (categories.showUserSettings === undefined || categories.showUserSettings) {
					_self.settingsCategories.push({
						id: "userSettings", //$NON-NLS-0$
						textContent: messages["User Profile"],
						show: _self.showUserSettings
					});
				}
				
				if (categories.showGitSettings === undefined || categories.showGitSettings) {
					_self.settingsCategories.push({
						id: "gitSettings", //$NON-NLS-0$
						textContent: messages["Git Settings"],
						show: _self.showGitSettings
					});
				}
				
				if (categories.showEditorSettings === undefined || categories.showEditorSettings) {
					_self.settingsCategories.push({
						id: "editorSettings", //$NON-NLS-0$
						textContent: messages.Editor,
						show: _self.showEditor
					});
				}
				
				if (categories.showThemeSettings === undefined || categories.showThemeSettings) {
					_self.settingsCategories.push({
						id: "themeBuilder", //$NON-NLS-0$
						textContent: messages["UI Theme"],
						show: _self.showThemeBuilder
					});
				}

				if (categories.showPluginSettings === undefined || categories.showPluginSettings) {
					_self.settingsCategories.push({
						id: "plugins", //$NON-NLS-0$
						textContent: messages["Plugins"],
						show: _self.showPlugins
					});
				}

				_self.settingsCategories.forEach(function(item) {
					item.show = item.show.bind(_self, item.id);
				}.bind(_self));

				// Add plugin-contributed extension categories
				var settingsRegistry = _self.settingsRegistry;
				settingsRegistry.getCategories().map(function(category, i) {
					return {
						category: category,
						label: settingsRegistry.getCategoryLabel(category) || messages[category] || category
					};
				}).sort(function byLabel(a, b) {
					return a.label.localeCompare(b.label);
				}).forEach(function(currData) {
					var category = currData.category;
					_self.settingsCategories.push({
						id: category,
						textContent: currData.label,
						show: _self.showPluginSettings.bind(_self, category)
					});
				});

				_self.itemToIndexMap = {};
				_self.toolbar = lib.node( _self.pageActions );
	
				_self.manageDefaultData(prefs);
				
				_self.drawUserInterface();
	
				window.addEventListener("hashchange", _self.processHash.bind(_self)); //$NON-NLS-0$
	
				mGlobalCommands.setPageTarget({task: 'Settings', serviceRegistry: _self.registry, commandService: _self.commandService});
			});
		},
		
		processHash: function() {
			var pageParams = PageUtil.matchResourceParameters();
			
			var container = this;
			
			this.preferences.getPreferences('/settingsContainer').then(function(prefs){

				var selection = prefs.get( 'selection' );

				var category = pageParams.category || selection; //$NON-NLS-0$

				if(container.selectedCategory){
					if( container.selectedCategory.id === category){
						//No need to reselect the category
						return;
					}
				}

				container.showByCategory(category);
				
			} );
			
			window.setTimeout(function() {this.commandService.processURL(window.location.href);}.bind(this), 0);
		},
		
		showThemeBuilder: function(id){
		
			this.selectCategory(id);
			
			this.updateToolbar(id);
		
			if(this.themeWidget) {
				this.themeWidget.destroy();
			}
			
			var containerTheme = new containerThemeData.ThemeData();
			var themePreferences = new mThemePreferences.ThemePreferences(this.preferences, containerTheme);
		
			this.themeWidget = new ThemeBuilder({ commandService: this.commandService, preferences: themePreferences, themeData: containerTheme });
			
			lib.empty(this.table);

			var themeNode = document.createElement('div'); //$NON-NLS-0$
			this.table.appendChild(themeNode);

			this.themeWidget.renderData( themeNode, 'INITIALIZE' );
		},
		
		showEditor: function(id){
		
			this.selectCategory(id);
			
			
			lib.empty(this.table);
		
			if (this.editorSettingWidget) {
				this.editorSettingWidget.destroy();
			}

			this.updateToolbar(id);

			var editorSettingsNode = document.createElement('div'); //$NON-NLS-0$
			this.table.appendChild(editorSettingsNode);

			var editorTheme = new editorThemeData.ThemeData();
			var themePreferences = new mThemePreferences.ThemePreferences(this.preferences, editorTheme);
			
			var editorThemeWidget = new ThemeBuilder({ commandService: this.commandService, preferences: themePreferences, themeData: editorTheme, toolbarId: 'editorThemeSettingsToolActionsArea'}); //$NON-NLS-0$
				
			var command = { name:messages.Import, tip:messages['Import a theme'], id:0, callback: editorTheme.importTheme.bind(editorTheme) };
			editorThemeWidget.addAdditionalCommand( command );

			var editorPreferences = new mEditorPreferences.EditorPreferences (this.preferences);
			
			this.editorSettings = new EditorSettings({
				registry: this.registry,
				preferences: editorPreferences,
				themePreferences: themePreferences,
				editorThemeWidget: editorThemeWidget,
				statusService: this.preferencesStatusService,
				dialogService: this.preferenceDialogService,
				commandService: this.commandService,
				userClient: this.userClient
			}, editorSettingsNode);
			
			this.editorSettings.show();
		},
		
		showUserSettings: function(id){

			this.selectCategory(id);

			lib.empty(this.table);

			if (this.userWidget) {
				this.userWidget.destroy();
			}

			this.updateToolbar(id);
			
			var userNode = document.createElement('div'); //$NON-NLS-0$
			this.table.appendChild(userNode);

			this.userWidget = new UserSettings({
				registry: this.registry,
				settings: this.settingsCore,
				preferences: this.preferences,
				statusService: this.preferencesStatusService,
				dialogService: this.preferenceDialogService,
				commandService: this.commandService,
				userClient: this.userClient
			}, userNode);
			
			this.userWidget.show();
		},
		
		showGitSettings: function(id){
		
			this.selectCategory(id);

			lib.empty(this.table);

			if (this.gitWidget) {
				this.gitWidget.destroy();
			}

			this.updateToolbar(id);
			
			var userNode = document.createElement('div'); //$NON-NLS-0$
			this.table.appendChild(userNode);

			this.gitWidget = new GitSettings({
				registry: this.registry,
				settings: this.settingsCore,
				preferences: this.preferences,
				statusService: this.preferencesStatusService,
				dialogService: this.preferenceDialogService,
				commandService: this.commandService,
				userClient: this.userClient
			}, userNode);
			
			this.gitWidget.show();
		},
		
		initPlugins: function(id){
			lib.empty(this.table);

			if (this.pluginWidget) {
				this.pluginWidget.destroy();
			}

			var pluginNode = document.createElement('div');
			this.table.appendChild(pluginNode);

			this.pluginWidget = new PluginList({
				settings: this.settingsCore,
				preferences: this.preferences,
				statusService: this.preferencesStatusService,
				dialogService: this.preferenceDialogService,
				commandService: this.commandService,
				registry: this.registry,
				pluginsUri: this.pluginsUri
			}, pluginNode);
			
			this.pluginWidget.show();
		},

		initPluginSettings: function(category) {
			function settingsCompare(a, b) {
				var nameA = a.getName(), nameB = b.getName();
				if (typeof nameA === 'string' && typeof nameB === 'string') {
					return nameA.localeCompare(nameB);
				}
				return a.getPid().localeCompare(b.getPid());
			}

			lib.empty(this.table);

			if (this.pluginSettingsWidget) {
				this.pluginSettingsWidget.destroy();
			}

			var settingsInCategory = this.settingsRegistry.getSettings(category).sort(settingsCompare);
			this.pluginSettingsWidget = new SettingsList({
				parent: this.table,
				serviceRegistry: this.registry,
				settings: settingsInCategory,
				title: messages[category] || category
			});
		},

/*	showPlugins - iterates over the plugin array, reads
	meta-data and creates a dom entry for each plugin.
	
	This HTML structure is a special case - the other 
	settings cases should follow more of the JSEditor
	pattern. */

		showPlugins: function(id) {

			this.selectCategory(id);
			
			this.updateToolbar(id);

			this.initPlugins(id);
		},

		showPluginSettings: function(category) {
			var id = category;
			this.selectCategory(id);
			
			this.updateToolbar(id);

			this.initPluginSettings(category);
		},
		
		selectCategory: function(id) {
			this.preferences.getPreferences('/settingsContainer').then(function(prefs){
				prefs.put( 'selection', id );
			} );

			superPrototype.selectCategory.apply(this, arguments);

			var params = PageUtil.matchResourceParameters();
			if (params.category !== id) {
				params.category = id;
				delete params.resource;
				window.location = new URITemplate("#,{params*}").expand({ //$NON-NLS-0$
					params: params
				});
			}
		},

		showByCategory: function(id) {
			
			this.updateToolbar(id);

			var isDefaultCategory = this.settingsCategories.some(function(category) {
				if (category.id === id) {
					category.show();
					return true;
				}
			});

			if (!isDefaultCategory) {
				this.selectCategory(id);
			}
		},

		addCategory: function(category) {
			category['class'] = (category['class'] || '') + ' navbar-item'; //$NON-NLS-1$ //$NON-NLS-0$
			category.role = "tab";
			category.tabindex = -1;
			category["aria-selected"] = "false"; //$NON-NLS-1$ //$NON-NLS-0$
			category.onclick = category.show;
			superPrototype.addCategory.apply(this, arguments);
		},

		addCategories: function() {
			var self = this;
			this.settingsCategories.forEach(function(category, i) {
				self.addCategory(category);
			});
		},

		drawUserInterface: function(settings) {

			superPrototype.drawUserInterface.apply(this, arguments);

			this.addCategories();

			this.processHash();

		},
		
		handleError: function( error ){
			console.log( error );
		},

		manageDefaultData: function(prefs) {
			var selection = prefs.get( 'selection' );
			if (!selection) {
				prefs.put( 'selection', 'userSettings' );
			}
		}
	});
	return SettingsContainer;
});
