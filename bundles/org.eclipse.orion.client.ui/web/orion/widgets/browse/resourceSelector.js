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
/*eslint-env browser, amd*/
define([
	'orion/objects',
	'orion/webui/littlelib',
	'orion/commands',
	'orion/URITemplate',
	'orion/URL-shim'
], function(objects, lib, Commands, URITemplate, _) {
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	/**
	 * @name orion.widgets.browse.ResourceSelector
	 * @class Resource selector.
	 * @description Renders a toolbar that displays the current resource name and a dropdown of all its siblings and provides a menu for changing the resource from the siblings.
	 * @param {orion.commands.CommandRegistry} params.commandRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {EventTarget} params.resourceChangeListener the resourceChange event listener that hadles the root change
	 * @param {EventTarget} params.resourceChangeDispatcher the "filesystemChanged" event dispatcher
	 * @param {Element} params.parentNode
	 */
	function ResourceSelector(params) {
		this.resourceChangeListener = params.resourceChangeListener;
		this.resourceChangeDispatcher = params.resourceChangeDispatcher;
		this.fetchChildren = params.fetchChildren;
		this.fileClient = params.fileClient;
		this.commandRegistry = params.commandRegistry;
		this.commandScopeId = params.commandScopeId;
		this.dropDownId = params.dropDownId;
		this.dropDownTooltip = params.dropDownTooltip;
		this.allItems = params.allItems;
		this.activeResourceLocation = params.activeResourceLocation;
		this.labelHeader = params.labelHeader;
		this.parentNode = params.parentNode;
		this.listener = function(event) {
			this.refresh(event.root);
		}.bind(this);
		if(this.resourceChangeListener){
			this.resourceChangeListener.addEventListener("resourceChanged", this.listener); //$NON-NLS-0$
		}
		this.render();
	}
	objects.mixin(ResourceSelector.prototype, /** @lends orion.widgets.Filesystem.ResourceSelector */ {
		destroy: function() {
			if(this.resourceChangeListener) {
				this.resourceChangeListener.removeEventListener("resourceChanged", this.listener); //$NON-NLS-0$
			}
			this.commandRegistry.destroy(this.parentNode);
			lib.empty(this.parentNode);
			this.resourceChangeListener = this.resourceChangeDispatcher = this.listener = this.parentNode = null;
		},
		registerCommands: function() {
			if (!this.commandsRegistered) {
				this.commandsRegistered = true;
				var commandRegistry = this.commandRegistry;
				var switchBrCommand = new Commands.Command({
					imageClass: "core-sprite-openarrow", //$NON-NLS-0$
					//selectionClass: "dropdownSelection", //$NON-NLS-0$
					//tooltip: this.dropDownTooltip,
					id: this.dropDownId,
					visibleWhen: function(item) {
						return true;
					},
					choiceCallback: this._switchBrMenuCallback.bind(this),
					positioningNode: this.parentNode
				});
				commandRegistry.addCommand(switchBrCommand);
				commandRegistry.registerCommandContribution(this.commandScopeId, this.dropDownId, 1); //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		_switchBrMenuCallback: function(items) {
			var _self = this;
			return this.allItems.map(function(resource) { //$NON-NLS-0$
				return {
					name: resource.Name,
					checked: resource.Location === _self.activeResourceLocation,
					callback: _self.setActiveResource.bind(_self, {resource: resource, changeHash: true})
				};
			});
		},
		render: function() {
			this.resourceName = document.createElement("div"); //$NON-NLS-0$
			this.resourceName.classList.add("browserResourceSelectorName"); //$NON-NLS-0$
			this.resourceName.classList.add("layoutLeft"); //$NON-NLS-0$
			this.menu = document.createElement("ul"); //$NON-NLS-0$
			this.menu.classList.add("commandList"); //$NON-NLS-0$
			this.menu.classList.add("layoutRight"); //$NON-NLS-0$
			this.parentNode.appendChild(this.resourceName);
			this.parentNode.appendChild(this.menu);

			this.registerCommands();

			//this.resourceName.addEventListener("click", this._openMenu.bind(this)); //$NON-NLS-0$
			this.parentNode.addEventListener("click", this._openMenu.bind(this)); //$NON-NLS-0$
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
		_resourceLabel: function() {
			var fragment = document.createDocumentFragment();
			if(this.labelHeader) {
				fragment.textContent = "${0} " + this.getActiveResource(this.activeResourceLocation).Name; //$NON-NLS-0$
				var nameLabel = document.createElement("span"); //$NON-NLS-0$
				nameLabel.appendChild(document.createTextNode(this.labelHeader + ":")); //$NON-NLS-0$
				nameLabel.classList.add("browserResourceSelectorNameLabel");
				lib.processDOMNodes(fragment, [nameLabel]);
			} else {
				fragment.textContent = this.getActiveResource(this.activeResourceLocation).Name; //$NON-NLS-0$
			}
			return fragment;
		},
		refresh: function() {
			lib.empty(this.resourceName);
			this.resourceName.appendChild(this._resourceLabel());
			this.commandRegistry.destroy(this.menu);
			this.commandRegistry.renderCommands(this.commandScopeId, this.menu, {}, "menu"); //$NON-NLS-1$ //$NON-NLS-0$
		},
		/**
		 * @param {Object|String} location The ChildrenLocation, or an object with a ChildrenLocation field.
		 */
		setActiveResource: function(params) {
			this.activeResourceLocation = params.resource.Location;
			if(this.fetchChildren) {//Lazy fetch
				if(params.resource.selectorAllItems){
					if(this.resourceChangeDispatcher) {
						this.resourceChangeDispatcher.dispatchEvent({ type: "resourceChanged", newResource: params.resource, defaultChild: params.defaultChild, changeHash: params.changeHash}); //$NON-NLS-0$
					}
				} else {
					this.fileClient.fetchChildren(params.resource.Location).then(function(contents){
						if(contents && contents.length > 0) {
							contents.sort(function(a, b) {
								var	n1 = a.Name && a.Name.toLowerCase();
								var	n2 = b.Name && b.Name.toLowerCase();
								if (n1 < n2) { return -1; }
								if (n1 > n2) { return 1; }
								return 0;
							}); 
							params.resource.selectorAllItems = contents;
							if(this.resourceChangeDispatcher) {
								this.resourceChangeDispatcher.dispatchEvent({ type: "resourceChanged", newResource: params.resource, defaultChild: params.defaultChild, changeHash: params.changeHash}); //$NON-NLS-0$
							}
						} else {
							params.resource.selectorAllItems = [{Name: "none", Location: params.resource.Location, Directory: true}];
							if(this.resourceChangeDispatcher) {
								this.resourceChangeDispatcher.dispatchEvent({ type: "resourceChanged", newResource: params.resource, defaultChild: params.defaultChild, changeHash: params.changeHash}); //$NON-NLS-0$
							}
						}
					}.bind(this),
					function(err) {
						console.log(err);
					}.bind(this));
				}
			} else {
				window.location = uriTemplate.expand({resource: params.resource.Location}); //$NON-NLS-0$
			}
		},
		getActiveResource: function(location){
			if(!location) {
				location = this.activeResourceLocation;
			}
			var activeResource = this.allItems[0];
			this.allItems.some(function(item){
				if(item.Location === location) {
					activeResource = item;
					return true;
				}
			});
			return activeResource;
		},
		setCommitInfo: function(location, commitInfo) {
			//if(commitInfo) {
				this.getActiveResource(location).LastCommit = commitInfo;
			//}
		},
		getCommitInfo: function() {
			var activeResource = this.getActiveResource();
			if(activeResource && activeResource.LastCommit) {
				return activeResource.LastCommit;
			}
			return null;
		}
	});

	return {ResourceSelector: ResourceSelector};
});
