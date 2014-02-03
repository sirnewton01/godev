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
	'orion/objects',
	'orion/webui/littlelib',
	'orion/commands',
	'orion/URITemplate',
	'orion/URL-shim'
], function(objects, lib, Commands, URITemplate, _) {
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	/**
	 * @name orion.widgets.Filesystem.BranchSelector
	 * @class Filesystem switcher.
	 * @description Renders a toolbar that displays the filesystem a MiniNavExplorer is currently viewing,
	 * and provides a menu for changing the filesystem being viewed in the explorer.
	 * @param {orion.commands.CommandRegistry} params.commandRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {EventTarget} params.branchChangeListener the branchChange event listener that hadles the root change
	 * @param {EventTarget} params.branchChangeDispatcher the "filesystemChanged" event dispatcher
	 * @param {Element} params.node
	 */
	function BranchSelector(params) {
		this.commandRegistry = params.commandRegistry;
		this.branchChangeListener = params.branchChangeListener;
		this.branchChangeDispatcher = params.branchChangeDispatcher;
		this.fileClient = params.fileClient;
		this.branches = params.branches;
		this.fileBrowser = params.fileBrowser;
		this.activeBranchName = params.activeBranchName;
		this.node = params.node;
		this.listener = function(event) {
			this.refresh(event.root);
		}.bind(this);
		if(this.branchChangeListener){
			this.branchChangeListener.addEventListener("branchChanged", this.listener); //$NON-NLS-0$
		}
		this.render();
	}
	objects.mixin(BranchSelector.prototype, /** @lends orion.widgets.Filesystem.BranchSelector */ {
		destroy: function() {
			if(this.branchChangeListener) {
				this.branchChangeListener.removeEventListener("branchChanged", this.listener); //$NON-NLS-0$
			}
			this.commandRegistry.destroy(this.node);
			lib.empty(this.node);
			this.branchChangeListener = this.branchChangeDispatcher = this.listener = this.node = null;
		},
		registerCommands: function() {
			if (!this.commandsRegistered) {
				this.commandsRegistered = true;
				var commandRegistry = this.commandRegistry;
				var switchBrCommand = new Commands.Command({
					//name: "Choose Branch",
					imageClass: "core-sprite-openarrow", //$NON-NLS-0$
					//selectionClass: "dropdownSelection", //$NON-NLS-0$
					//tooltip: "Select a branch",
					id: "orion.browse.switchbr", //$NON-NLS-0$
					visibleWhen: function(item) {
						return true;
					},
					choiceCallback: this._switchBrMenuCallback.bind(this),
					positioningNode: this.node
				});
				commandRegistry.addCommand(switchBrCommand);
				commandRegistry.registerCommandContribution("orion.browse", "orion.browse.switchbr", 1); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		_switchBrMenuCallback: function(items) {
			var _self = this;
			return this.branches.map(function(branch) { //$NON-NLS-0$
				return {
					name: branch.Name,
					callback: _self.setActiveBranch.bind(_self, branch.Name, branch.Location)
				};
			});
		},
		render: function() {
			this.brName = document.createElement("div"); //$NON-NLS-0$
			this.brName.classList.add("browserBranchName"); //$NON-NLS-0$
			this.brName.classList.add("layoutLeft"); //$NON-NLS-0$
			this.menu = document.createElement("ul"); //$NON-NLS-0$
			this.menu.classList.add("BranchSelector"); //$NON-NLS-0$
			this.menu.classList.add("commandList"); //$NON-NLS-0$
			this.menu.classList.add("layoutRight"); //$NON-NLS-0$
			this.menu.classList.add("pageActions"); //$NON-NLS-0$
			this.node.appendChild(this.brName);
			this.node.appendChild(this.menu);

			this.registerCommands();

			this.brName.addEventListener("click", this._openMenu.bind(this)); //$NON-NLS-0$
		},
		_openMenu: function(event) {
			var menu = lib.$(".dropdownTrigger", this.menu); //$NON-NLS-0$
			if (menu) {
				var click = document.createEvent("MouseEvents"); //$NON-NLS-0$
				click.initEvent("click", true, true); //$NON-NLS-0$
				menu.dispatchEvent(click);
			}
		},
		/**
		 * @returns {String|DocumentFragment}
		 */
		_branchLabel: function(meta) {
			//TOTO figure out the branch name from any meta (e.g. sub folder)
			var fragment = document.createDocumentFragment();
			fragment.textContent = this.activeBranchName; //$NON-NLS-0$
			//lib.processDOMNodes(fragment, [document.createTextNode(name), document.createTextNode(hostname)]);
			return fragment;
		},
		refresh: function(location) {
			lib.empty(this.brName);
			this.brName.appendChild(this._branchLabel(location));
			this.commandRegistry.destroy(this.menu);
			this.commandRegistry.renderCommands("orion.browse", this.menu, {}, "menu"); //$NON-NLS-1$ //$NON-NLS-0$
		},
		/**
		 * @param {Object|String} location The ChildrenLocation, or an object with a ChildrenLocation field.
		 */
		setActiveBranch: function(name, location) {
			this.activeBranchName = name;
			window.location = uriTemplate.expand({resource: location}); //$NON-NLS-0$
			if(this.branchChangeDispatcher) {
				this.branchChangeDispatcher.dispatchEvent({ type: "branchChanged", newInput: location }); //$NON-NLS-0$
			}
		}
	});

	return {BranchSelector: BranchSelector};
});
