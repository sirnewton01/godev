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

/* This PluginList widget provides a HTML list placeholder for PluginEntries, and
   provides JavaScript functions for user management of Orion plugins. It is designed
   to contain PluginEntry widgets */

define(['i18n!orion/settings/nls/messages', 'require', 'orion/Deferred', 'orion/commands', 'orion/commandRegistry', 'orion/commonHTMLFragments', 'orion/objects', 'orion/webui/littlelib',
		'orion/widgets/plugin/PluginEntry', 'orion/explorers/explorer', 'orion/URITemplate', 'orion/PageLinks'
		], function(messages, require, Deferred, mCommands, mCommandRegistry, mHTMLFragments, objects, lib, PluginEntry, mExplorer, URITemplate, PageLinks) {

	var Explorer = mExplorer.Explorer;
	var SelectionRenderer = mExplorer.SelectionRenderer;

	var defaultPluginURLs = {};
	
	function _normalizeURL(location) {
		if (location.indexOf("://") === -1) { //$NON-NLS-0$
			var temp = document.createElement('a'); //$NON-NLS-0$
			temp.href = location;
	        return temp.href;
		}
		return location;
	}
	
	// This is temporary see Bug 368481 - Re-examine localStorage caching and lifecycle
	var defaultPluginsStorage = localStorage.getItem("/orion/preferences/default/plugins"); //$NON-NLS-0$
	if (defaultPluginsStorage) {
		var pluginsPreference = JSON.parse(defaultPluginsStorage);
		Object.keys(pluginsPreference).forEach(function(pluginURL) {
			defaultPluginURLs[_normalizeURL(require.toUrl(pluginURL))] = true;
		});
	}

	/**
	 * PluginListRenderer
	 */
	function PluginListRenderer(commandService, explorer) {
		SelectionRenderer.call(this, {}, explorer);
		this.commandService = commandService;
	}
	PluginListRenderer.prototype = Object.create(SelectionRenderer.prototype);
	PluginListRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
		if (col_no === 0) {
			var pluginEntry = new PluginEntry( {plugin: item, commandService: this.commandService}  );
			pluginEntry.show();
			return pluginEntry.node;
		}
	};

	/**
	 * PluginListExplorer
	 */
	function PluginListExplorer(commandService) {
		this.renderer = new PluginListRenderer(commandService, this);
	}
	PluginListExplorer.prototype = Object.create(Explorer.prototype);

	/**
	 * PluginList
	 * UI interface element showing a list of plugins
	 */
	function PluginList(options, parentNode) {
		objects.mixin(this, options);
		this.node = parentNode || document.createElement("div"); //$NON-NLS-0$
	}
	objects.mixin(PluginList.prototype, {
		templateString: '' +  //$NON-NLS-0$
						'<div id="pluginSectionHeader" class="pluginSectionHeader sectionWrapper toolComposite">' +  /* pluginSectionHeader */ //$NON-NLS-0$
							'<div class="sectionAnchor sectionTitle layoutLeft"></div>' + /* pluginTitle */ //$NON-NLS-0$
							'<div class="sectionItemCount layoutLeft">0</div>' + /* pluginCount */ //$NON-NLS-0$
							'<div id="pluginCommands" class="pluginCommands layoutRight sectionActions"></div>' + /* pluginCommands */ //$NON-NLS-0$
						'</div>' + //$NON-NLS-0$

				        '<div class="displaytable layoutBlock sectionTable">' + //$NON-NLS-0$
							'<div class="plugin-list-container">' + //$NON-NLS-0$
								'<div class="plugin-list" id="plugin-list" style="overflow:hidden;"></div>' + //$NON-NLS-0$ /* pluginList */
							'</div>' + //$NON-NLS-0$
						'</div>', //$NON-NLS-0$
				
		pluginDialogState: false,
		
		includeMaker: false,
		
		target: "_self", //$NON-NLS-0$

		createElements: function() {
			this.node.innerHTML = this.templateString;
			this.pluginSectionHeader = lib.$(".pluginSectionHeader", this.node); //$NON-NLS-0$
			this.pluginTitle = lib.$(".sectionAnchor", this.node); //$NON-NLS-0$
			this.pluginCount = lib.$(".sectionItemCount", this.node); //$NON-NLS-0$
			this.pluginCommands = lib.$(".pluginCommands", this.node); //$NON-NLS-0$	
			this.pluginList = lib.$(".plugin-list", this.node); //$NON-NLS-0$
			this.postCreate();
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.pluginSectionHeader = this.pluginTitle = this.pluginCount = this.pluginCommands = this.pluginList = null;
			}
		},
				
		postCreate: function(){
			var _this = this;
			if (this.pluginSectionHeader) {
				// add a slideout
				var slideoutFragment = mHTMLFragments.slideoutHTMLFragment("pluginSlideout"); //$NON-NLS-0$
				var range = document.createRange();
				range.selectNode(this.pluginSectionHeader);
				slideoutFragment = range.createContextualFragment(slideoutFragment);
				this.pluginSectionHeader.appendChild(slideoutFragment);
			}
			this.render();

			this.registry.registerService("orion.cm.managedservice", //$NON-NLS-0$
				{	updated: function(properties) {
						var target;
						if (properties && properties["links.newtab"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
							target = properties["links.newtab"] ? "_blank" : "_self"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						} else {
							target = "_self"; //$NON-NLS-0$
						}
						_this.setTarget(target);
					}.bind(this)
				}, {pid: "nav.config"}); //$NON-NLS-0$
		},

		updateToolbar: function(id){
			if(this.pluginCommands) {
				this.commandService.destroy(this.pluginCommands);
			}
		},
				
		show: function(){
			this.createElements();

			this.updateToolbar();
			
			if( this.pluginsUri ){
			
			var findMorePluginsCommand = new mCommands.Command({
				name: messages['Get Plugins'],
				tooltip: messages["Find More Orion Plugins"],
				id: "orion.findMorePluginsCommand", //$NON-NLS-0$
				hrefCallback: function(data){
					return this.getPluginsLink(data.items);
				}.bind(this)
			});
			
			this.commandService.addCommand(findMorePluginsCommand);
			this.commandService.registerCommandContribution("pluginCommands", "orion.findMorePluginsCommand", 1); //$NON-NLS-1$ //$NON-NLS-0$

			}

			// set up the toolbar level commands	
			var installPluginCommand = new mCommands.Command({
				name: messages["Install"],
				tooltip: messages["Install a plugin by specifying its URL"],
				id: "orion.installPlugin", //$NON-NLS-0$
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('url', 'url', messages['Plugin URL:'], '')]), //$NON-NLS-1$ //$NON-NLS-0$
				callback: function(data) {
					if (data.parameters) {
						var location = data.parameters.valueFor('url'); //$NON-NLS-0$
						if (location) {
							this.installHandler(location);
						}
					}
				}.bind(this)
			});
			
			this.commandService.addCommand(installPluginCommand);
			
			this.commandService.registerCommandContribution("pluginCommands", "orion.installPlugin", 2, /* not grouped */ null, false, /* no key binding yet */ null, new mCommandRegistry.URLBinding("installPlugin", "url")); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var reloadAllPluginsCommand = new mCommands.Command({
				name: messages["Reload all"],
				tooltip: messages["Reload all installed plugins"],
				id: "orion.reloadAllPlugins", //$NON-NLS-0$
				callback: this.reloadPlugins.bind(this)
			});
			this.commandService.addCommand(reloadAllPluginsCommand);
			// register these with the toolbar
			this.commandService.registerCommandContribution("pluginCommands", "orion.reloadAllPlugins", 3); //$NON-NLS-1$ //$NON-NLS-0$

			var createPluginCommand = new mCommands.Command({
				name: messages['Create'],
				tooltip: messages["Create a new Orion Plugin"],
				id: "orion.createPlugin", //$NON-NLS-0$
				callback: function(data){
					this.createPlugin(data.items);
				}.bind(this)
			});
			
			this.commandService.addCommand(createPluginCommand);		
	
			if( this.includeMaker === true ){
				this.commandService.registerCommandContribution("pluginCommands", "orion.createPlugin", 2); //$NON-NLS-1$ //$NON-NLS-0$
			}

			// Render the commands in the heading, emptying any old ones.
			this.commandService.renderCommands("pluginCommands", "pluginCommands", this, this, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
	
		render: function(referenceplugin){
		
			// Declare row-level commands so they will be rendered when the rows are added.
			var reloadPluginCommand = new mCommands.Command({
				name: messages["Reload"],
				tooltip: messages["Reload the plugin"],
				id: "orion.reloadPlugin", //$NON-NLS-0$
				imageClass: "core-sprite-refresh", //$NON-NLS-0$
				visibleWhen: function(items) {  // we expect a URL
					return typeof items === "string"; //$NON-NLS-0$
				},
				callback: function(data) {
					this.reloadPlugin(data.items);
				}.bind(this)
			});			
			this.commandService.addCommand(reloadPluginCommand);
			this.commandService.registerCommandContribution("pluginCommand", "orion.reloadPlugin", 1); //$NON-NLS-1$ //$NON-NLS-0$

			var uninstallPluginCommand = new mCommands.Command({
				name: messages["Delete"],
				tooltip: messages["Delete this plugin from the configuration"],
				imageClass: "core-sprite-delete", //$NON-NLS-0$
				id: "orion.uninstallPlugin", //$NON-NLS-0$
				visibleWhen: function(url) {  // we expect a URL
					return !defaultPluginURLs[url]; //$NON-NLS-0$
				},
				callback: function(data) {
					this.removePlugin(data.items);
				}.bind(this)
			});			
			this.commandService.addCommand(uninstallPluginCommand);
			this.commandService.registerCommandContribution("pluginCommand", "orion.uninstallPlugin", 2); //$NON-NLS-1$ //$NON-NLS-0$


			var pluginRegistry = this.settings.pluginRegistry;
			var disablePluginCommand = new mCommands.Command({
				name: messages["Disable"],
				tooltip: messages["DisableTooltip"],
				id: "orion.disablePlugin", //$NON-NLS-0$
				imageClass: "core-sprite-stop", //$NON-NLS-0$
				visibleWhen: function(url) {  // we expect a URL
					if (defaultPluginURLs[url]) {
						return false;
					}
					var plugin = pluginRegistry.getPlugin(url);
					return plugin._getAutostart() !== "stopped"; //$NON-NLS-0$
				},
				callback: function(data) {
					this.disablePlugin(data.items);
				}.bind(this)
			});			
			this.commandService.addCommand(disablePluginCommand);
			this.commandService.registerCommandContribution("pluginCommand", "orion.disablePlugin", 3); //$NON-NLS-1$ //$NON-NLS-0$

			
			var enablePluginCommand = new mCommands.Command({
				name: messages["Enable"],
				tooltip: messages["EnableTooltip"],
				id: "orion.enablePlugin", //$NON-NLS-0$
				imageClass: "core-sprite-start", //$NON-NLS-0$
				visibleWhen: function(url) {  // we expect a URL
					if (defaultPluginURLs[url]) {
						return false;
					}
					var plugin = pluginRegistry.getPlugin(url);
					return plugin._getAutostart() === "stopped"; //$NON-NLS-0$
				},
				callback: function(data) {
					this.enablePlugin(data.items);
				}.bind(this)
			});			
			this.commandService.addCommand(enablePluginCommand);
			this.commandService.registerCommandContribution("pluginCommand", "orion.enablePlugin", 4); //$NON-NLS-1$ //$NON-NLS-0$

		
			var list = this.pluginList;
		
			if(referenceplugin){
				list = referenceplugin.pluginList;
			}

			// mamacdon: re-rendering the list starts here
//			lib.empty( list );
			var plugins = this.settings.pluginRegistry.getPlugins();
			this.pluginTitle.textContent = messages['Plugins'];
			this.pluginCount.textContent = plugins.length;

			// TODO maybe this should only be done once
			this.explorer = new PluginListExplorer(this.commandService);
			this.pluginListTree = this.explorer.createTree(this.pluginList.id, new mExplorer.SimpleFlatModel(plugins, "plugin", function(item) { //$NON-NLS-1$ //$NON-NLS-0$
				return item.getLocation();
			}), { setFocus: false });

//			for( var p = 0; p < plugins.length; p++ ){
//				var pluginEntry = new PluginEntry( {plugin: plugins[p], commandService:this.commandService}  );
//				list.appendChild( pluginEntry.node );
//				pluginEntry.show();
//			}
		},
				
		pluginURLFocus: function(){
			this.pluginUrlEntry.value = '';
			this.pluginUrlEntry.style.color = "" ; //$NON-NLS-0$
		},
		
		pluginURLBlur: function(){
			if( this.pluginUrlEntry.value === '' ){
				this.pluginUrlEntry.value = messages['Type a plugin url here ...'];
				this.pluginUrlEntry.style.color = "#AAA" ; //$NON-NLS-0$
			}
		},
		
		createPlugin: function( data ){
			var path = require.toUrl("settings/maker.html"); //$NON-NLS-0$
			window.open( path, this.target );
		},
		
		addPlugin: function( pluginUrl ){
			this.statusService.setMessage(messages["Installed "] + pluginUrl, 5000, true);
			this.settings.preferences.getPreferences("/plugins").then(function(plugins) { //$NON-NLS-0$
				plugins.put(pluginUrl, true);
			}); // this will force a sync
			
			this.render();
		},
		
		getPluginsLink: function( data ){		
			return this.pluginsUri;
		},

		pluginError: function( error ){
			this.statusService.setErrorMessage(error);
		},
		
		installHandler: function(newPluginUrl){
			if (/^\S+$/.test(newPluginUrl.trim())) {
				this.statusService.setMessage(messages["Installing "] + newPluginUrl + "...", null, true);
				if( this.settings.pluginRegistry.getPlugin(newPluginUrl) ){
					this.statusService.setErrorMessage(messages["Already installed"]);
				} else {
					this.settings.pluginRegistry.installPlugin(newPluginUrl).then(function(plugin) {
						plugin.start({lazy:true}).then(this.addPlugin.bind(this, plugin.getLocation()), this.pluginError.bind(this));
					}.bind(this), this.pluginError.bind(this));
				}
			}
		},
		
		reloaded: function(){
			var settingsPluginList = this.settings.pluginRegistry.getPlugins();
			this.statusService.setMessage( messages["Reloaded "] + settingsPluginList.length + messages[" plugin"] + ( settingsPluginList.length===1 ? "": "s") + ".", 5000, true );
			this.render();
		},
		
		/* reloads a single plugin */
		reloadPlugin: function(url) {
			var plugin = this.settings.pluginRegistry.getPlugin(url);
			if (plugin) {
				plugin.update().then(this.render.bind(this));
				this.statusService.setMessage(messages['Reloaded '] + url, 5000, true);
			}
		},
		
		disablePlugin: function(url){
			var plugin = this.settings.pluginRegistry.getPlugin(url);
			if (plugin) {
				plugin.stop();
				this.statusService.setMessage("Disabled " + url, 5000, true);
				this.settings.preferences.getPreferences("/plugins").then(function(plugins) { //$NON-NLS-0$
					plugins.put(url, false);
					this.render(this);
				}.bind(this)); // this will force a sync
				this.render();
			}
		},
	
		enablePlugin: function(url){
			var plugin = this.settings.pluginRegistry.getPlugin(url);
			if (plugin) {
				plugin.start({lazy:true});
				this.statusService.setMessage("Enabled " + url, 5000, true);
				this.settings.preferences.getPreferences("/plugins").then(function(plugins) { //$NON-NLS-0$
					plugins.put(url, false);
					this.render(this);
				}.bind(this)); // this will force a sync
				this.render();
			}
		},

		setTarget: function(target) {
			this.target = target;
		},
		
		/* reloads all of the plugins - sometimes useful for reaffirming plugin initialization */

		reloadPlugins: function(){
			var plugins = this.settings.pluginRegistry.getPlugins();
			var updates = [];
			plugins.forEach(function(plugin){
				updates.push(plugin.update());
			});
			Deferred.all(updates, function(){}).then(this.reloaded.bind(this));
		},
		
		forceRemove: function(url){
			var plugin = this.settings.pluginRegistry.getPlugin(url);
			if (plugin) {
				plugin.uninstall().then(function() {
					this.statusService.setMessage(messages["Uninstalled "] + url, 5000, true);
					this.settings.preferences.getPreferences("/plugins").then(function(plugins) { //$NON-NLS-0$
						plugins.keys().some(function(key) {
							if (_normalizeURL(require.toUrl(key)) === _normalizeURL(url)) {
								plugins.remove(key);
								return true;
							}
						});
					}.bind(this)); // this will force a sync
					this.render();
				}.bind(this));
			}
		},
		
		/* removePlugin - removes a plugin by url */

		removePlugin: function( url ){

			/* The id of the source element is programmed with the
				url of the plugin to remove. */
				
			// TODO: Should be internationalized
				
			var confirmMessage = messages["Are you sure you want to uninstall '"] + url + "'?"; //$NON-NLS-1$
			if (window.confirm(confirmMessage)) {
				this.forceRemove(url);
			}
		}
	});
	return PluginList;
});