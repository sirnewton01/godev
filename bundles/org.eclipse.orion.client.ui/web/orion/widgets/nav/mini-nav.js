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
	'i18n!orion/edit/nls/messages',
	'orion/objects',
	'orion/widgets/nav/common-nav',
	'orion/PageUtil',
	'orion/widgets/filesystem/filesystemSwitcher',
	'orion/URL-shim'
], function(messages, objects, mCommonNav, PageUtil, mFilesystemSwitcher) {
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
		this.preferences = params.preferences;
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.parentNode = params.parentNode;
		this.sidebar = params.sidebar;
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
			var _self = this;
			this.explorer = new MiniNavExplorer({
				preferences: this.preferences,
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebar: this.sidebar,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				rendererFactory: function(explorer) {
					return new MiniNavRenderer({
						checkbox: false,
						treeTableClass: "miniNavTreeTable",
						cachePrefix: "MiniNav" //$NON-NLS-0$
					}, explorer, _self.commandRegistry, _self.contentTypeRegistry); //$NON-NLS-0$
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode
			});

			// Create switcher here
			this.fsSwitcher = new mFilesystemSwitcher.FilesystemSwitcher({
				commandRegistry: this.commandRegistry,
				rootChangeListener: this.explorer,
				filesystemChangeDispatcher: this.explorer.sidebarNavInputManager,
				fileClient: this.fileClient,
				node: this.toolbarNode,
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
			}
		}
	});

	return MiniNavViewMode;
});
