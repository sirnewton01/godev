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
	'orion/widgets/nav/common-nav',
	'orion/fileCommands',
	'orion/projectCommands',
	'orion/PageUtil',
	'orion/Deferred',
	'orion/widgets/filesystem/filesystemSwitcher',
	'orion/URL-shim'
], function(messages, objects, lib, mCommonNav, FileCommands, ProjectCommands, PageUtil, Deferred, mFilesystemSwitcher, _) {
	var CommonNavExplorer = mCommonNav.CommonNavExplorer;
	var CommonNavRenderer = mCommonNav.CommonNavRenderer;

	/**
	 * @class orion.sidebar.MiniNavExplorer
	 * @extends orion.explorers.CommonNavExplorer
	 */
	function MiniNavExplorer(params) {
		CommonNavExplorer.apply(this, arguments);
		var sidebarNavInputManager = this.sidebarNavInputManager;
		if (sidebarNavInputManager) {
			var _self = this;
			// Broadcast changes of our explorer root to the sidebarNavInputManager
			this.addEventListener("rootChanged", function(event) { //$NON-NLS-0$
				_self.sidebarNavInputManager.dispatchEvent(event);
				_self.sidebarNavInputManager.dispatchEvent({type: "InputChanged", input: event.root.ChildrenLocation}); //$NON-NLS-0$
			});
			sidebarNavInputManager.setInput = function(input) {
				if (_self.treeRoot && _self.treeRoot.ChildrenLocation !== input) {
					_self.loadRoot(input).then(function() {
						_self.updateCommands();
						var fileMetadata = _self.editorInputManager.getFileMetadata();
						_self.reveal(fileMetadata, false);
					});
				}
			};
		}
	}
	MiniNavExplorer.prototype = Object.create(CommonNavExplorer.prototype);
	objects.mixin(MiniNavExplorer.prototype, /** @lends orion.sidebar.MiniNavExplorer.prototype */ {
		/**
		 * Re-roots the tree so that the given item is displayable.
		 * @param {Object} The item to be expanded.
		 * @returns {orion.Promise}
		 */
		reroot: function(item) {
			this.scope("");
			return this.loadRoot(this.fileClient.fileServiceRootURL(item.Location)).then(function() {
				return this.showItem(item, false); // call with reroot=false to avoid recursion
			}.bind(this));
		},
		registerCommands: function() {
			return CommonNavExplorer.prototype.registerCommands.call(this).then(function() {
				var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
				var newActionsScope = this.newActionsScope;
				var selectionActionsScope = this.selectionActionsScope;
				if (serviceRegistry.getServiceReferences("orion.projects").length > 0) { //$NON-NLS-0$
					commandRegistry.addCommandGroup(newActionsScope, "orion.projectsNewGroup", 100, "New Project", "orion.commonNavNewGroup/orion.newContentGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					
					commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.basic", 1, "orion.commonNavNewGroup/orion.newContentGroup/orion.projectsNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.fromfile", 2, "orion.commonNavNewGroup/orion.newContentGroup/orion.projectsNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					// TODO: comment out create project from an SFTP site for 5.0 M1
					//commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.sftp", 3, "orion.commonNavNewGroup/orion.newContentGroup/orion.projectsNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					
					var projectClient = serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
					var dependencyTypesDef = new Deferred();
					projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
						for(var i=0; i<dependencyTypes.length; i++){
							commandRegistry.registerCommandContribution(newActionsScope, "orion.project.createproject." + dependencyTypes[i], i+3, "orion.commonNavNewGroup/orion.newContentGroup/orion.projectsNewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
						}
						
						ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, projectClient, dependencyTypes).then(dependencyTypesDef.resolve, dependencyTypesDef.resolve);
					}.bind(this), dependencyTypesDef.resolve);
	
					commandRegistry.registerCommandContribution(selectionActionsScope, "orion.project.initProject", 0, "orion.commonNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
	
					return dependencyTypesDef;
				}
			}.bind(this));
		}
	});

	function MiniNavRenderer() {
		CommonNavRenderer.apply(this, arguments);
	}
	MiniNavRenderer.prototype = Object.create(CommonNavRenderer.prototype);

	/**
	 * @name orion.sidebar.MiniNavViewMode
	 * @class
	 */
	function MiniNavViewMode(params) {
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.parentNode = params.parentNode;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.serviceRegistry = params.serviceRegistry;

		this.fsToolbar = null;
		this.explorer = null;
		this.lastRoot = null;
		var _self = this;
		//store the last root just in case we switch between two view modes
		this.sidebarNavInputManager.addEventListener("InputChanged", function(event){ //$NON-NLS-0$
			_self.lastRoot = event.input;
		});
	}
	objects.mixin(MiniNavViewMode.prototype, {
		label: messages["Navigator"],
		create: function() {
			// Create Filesystem switcher toolbar before the sidebar content element
			var modeToolbarNode = this.toolbarNode;
			if (!this.fsToolbar) {
				var fsToolbar = this.fsToolbar = document.createElement("div"); //$NON-NLS-0$
				fsToolbar.classList.add("fsToolbarLayout"); //$NON-NLS-0$
				fsToolbar.classList.add("fsToolbar"); //$NON-NLS-0$
				this.parentNode.parentNode.insertBefore(fsToolbar, this.parentNode);
				this.parentNode.classList.add("miniNavToolbarTarget"); //$NON-NLS-0$
			}

			var _self = this;
			this.explorer = new MiniNavExplorer({
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				rendererFactory: function(explorer) {
					return new MiniNavRenderer({
						checkbox: false,
						cachePrefix: "MiniNav" //$NON-NLS-0$
					}, explorer, _self.commandRegistry, _self.contentTypeRegistry); //$NON-NLS-0$
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: modeToolbarNode
			});

			// Create switcher here
			this.fsSwitcher = new mFilesystemSwitcher.FilesystemSwitcher({
				commandRegistry: this.commandRegistry,
				rootChangeListener: this.explorer,
				filesystemChangeDispatcher: this.explorer.sidebarNavInputManager,
				fileClient: this.fileClient,
				node: this.fsToolbar,
				serviceRegistry: this.serviceRegistry
			});

			var params = PageUtil.matchResourceParameters();
			var navigate = params.navigate, resource = params.resource;
			var root = navigate || this.lastRoot || this.fileClient.fileServiceRootURL(resource || ""); //$NON-NLS-0$
			this.explorer.display(root);
		},
		destroy: function() {
			if (this.explorer) {
				this.explorer.destroy();
				this.explorer = null;
			}
			if (this.fsSwitcher) {
				// Cleanup the FS switcher elements, as we are leaving this view mode.
				this.fsSwitcher.destroy();
				this.fsToolbar.parentNode.removeChild(this.fsToolbar);
				this.fsToolbar = null;
				this.parentNode.classList.remove("miniNavToolbarTarget"); //$NON-NLS-0$
			}
		}
	});

	return MiniNavViewMode;
});
