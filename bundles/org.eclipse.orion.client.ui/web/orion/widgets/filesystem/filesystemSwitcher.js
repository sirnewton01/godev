/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define URL*/
/*jslint browser:true sub:true*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/commands',
	'orion/URL-shim'
], function(messages, objects, lib, i18nUtil, Commands, _) {

	/**
	 * @name orion.widgets.Filesystem.FilesystemSwitcher
	 * @class Filesystem switcher.
	 * @description Renders a toolbar that displays the filesystem a MiniNavExplorer is currently viewing,
	 * and provides a menu for changing the filesystem being viewed in the explorer.
	 * @param {orion.commands.CommandRegistry} params.commandRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {EventTarget} params.rootChangeListener the rootChange event listener that hadles the root change
	 * @param {EventTarget} params.filesystemChangeDispatcher the "filesystemChanged" event dispatcher
	 * @param {Element} params.node
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 */
	function FilesystemSwitcher(params) {
		this.commandRegistry = params.commandRegistry;
		this.rootChangeListener = params.rootChangeListener;
		this.filesystemChangeDispatcher = params.filesystemChangeDispatcher;
		this.fileClient = params.fileClient;
		this.node = params.node;
		this.serviceRegistry = params.serviceRegistry;
		var _self = this;
		this.listener = function(event) {
			_self.refresh(event.root);
		};
		if(this.rootChangeListener){
			this.rootChangeListener.addEventListener("rootChanged", this.listener); //$NON-NLS-0$
		}
		this.render();
	}
	objects.mixin(FilesystemSwitcher.prototype, /** @lends orion.widgets.Filesystem.FilesystemSwitcher */ {
		destroy: function() {
			if(this.rootChangeListener) {
				this.rootChangeListener.removeEventListener("rootChanged", this.listener); //$NON-NLS-0$
			}
			this.commandRegistry.destroy(this.node);
			lib.empty(this.node);
			this.rootChangeListener = this.filesystemChangeDispatcher = this.listener = this.node = null;
		},
		registerCommands: function() {
			if (!this.commandsRegistered) {
				this.commandsRegistered = true;
				var commandRegistry = this.commandRegistry, serviceRegistry = this.serviceRegistry;
				var switchFsCommand = new Commands.Command({
					name: messages["ChooseFS"],
					imageClass: "core-sprite-openarrow", //$NON-NLS-0$
					selectionClass: "dropdownSelection", //$NON-NLS-0$
					tooltip: messages["ChooseFSTooltip"], //$NON-NLS-0$
					id: "orion.nav.switchfs", //$NON-NLS-0$
					visibleWhen: function(item) {
						return serviceRegistry.getServiceReferences("orion.core.file").length > 1; //$NON-NLS-0$
					},
					choiceCallback: this._switchFsMenuCallback.bind(this)
				});
				commandRegistry.addCommand(switchFsCommand);
				commandRegistry.registerCommandContribution("orion.mininav", "orion.nav.switchfs", 1); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		_switchFsMenuCallback: function(items) {
			var serviceRegistry = this.serviceRegistry;
			var _self = this;
			return serviceRegistry.getServiceReferences("orion.core.file").map(function(fileServiceRef) { //$NON-NLS-0$
				var top = fileServiceRef.getProperty("top"); //$NON-NLS-0$
				return {
					// TODO indicate which FS is currently active with bullet, etc
					name: _self._fileServiceLabel(top, true),
					callback: _self.setActiveFilesystem.bind(_self, top)
				};
			});
		},
		render: function() {
			this.fsName = document.createElement("div"); //$NON-NLS-0$
			this.fsName.classList.add("filesystemName"); //$NON-NLS-0$
			this.fsName.classList.add("layoutLeft"); //$NON-NLS-0$
			this.menu = document.createElement("ul"); //$NON-NLS-0$
			this.menu.classList.add("filesystemSwitcher"); //$NON-NLS-0$
			this.menu.classList.add("commandList"); //$NON-NLS-0$
			this.menu.classList.add("layoutRight"); //$NON-NLS-0$
			this.menu.classList.add("pageActions"); //$NON-NLS-0$
			this.node.appendChild(this.fsName);
			this.node.appendChild(this.menu);

			this.registerCommands();

			this.fsName.addEventListener("click", this._openMenu.bind(this)); //$NON-NLS-0$
		},
		_openMenu: function(event) {
			var menu = lib.$(".dropdownTrigger", this.menu); //$NON-NLS-0$
			if (menu) {
				var click = document.createEvent("MouseEvents"); //$NON-NLS-0$
				click.initEvent("click", true, true); //$NON-NLS-0$
				menu.dispatchEvent(click);
			}
		},
		_fileServiceHostname: function(location) {
			var rootURL = this.fileClient.fileServiceRootURL(location);
			if (rootURL.indexOf("filesystem:") === 0) { //$NON-NLS-0$
				rootURL = rootURL.substr("filesystem:".length); //$NON-NLS-0$
			}
			var hostname = rootURL;
			try {
				hostname = new URL(rootURL, window.location.href).hostname;
			} catch (e) {}
			return hostname;
		},
		/**
		 * @returns {String|DocumentFragment}
		 */
		_fileServiceLabel: function(location, plainText) {
			// Assume this fileClient was not created with a service filter so it knows about every fileservice in the registry.
			var name = this.fileClient.fileServiceName(location);
			var hostname = this._fileServiceHostname(location);
			if (plainText) {
				return i18nUtil.formatMessage(messages["FSTitle"], name, hostname);
			}
			var fragment = document.createDocumentFragment();
			fragment.textContent = messages["FSTitle"]; //$NON-NLS-0$
			lib.processDOMNodes(fragment, [document.createTextNode(name), document.createTextNode(hostname)]);
			return fragment;
		},
		refresh: function(location) {
			var target = location;
			if (location.ChildrenLocation) {
				target = location.ChildrenLocation;
			}
			lib.empty(this.fsName);
			this.fsName.appendChild(this._fileServiceLabel(target));

			this.commandRegistry.destroy(this.menu);
			this.commandRegistry.renderCommands("orion.mininav", this.menu, {}, "menu"); //$NON-NLS-1$ //$NON-NLS-0$
		},
		/**
		 * @param {Object|String} location The ChildrenLocation, or an object with a ChildrenLocation field.
		 */
		setActiveFilesystem: function(location) {
			var target = location;
			if (location.ChildrenLocation) {
				target = location.ChildrenLocation;
			}
			var rootURL = this.fileClient.fileServiceRootURL(target);
			if(this.filesystemChangeDispatcher) {
				this.filesystemChangeDispatcher.dispatchEvent({ type: "filesystemChanged", newInput: rootURL }); //$NON-NLS-0$
			}
		}
	});

	return {FilesystemSwitcher: FilesystemSwitcher};
});
