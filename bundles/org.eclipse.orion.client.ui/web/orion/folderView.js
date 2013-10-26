/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define document window*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/globalCommands',
	'orion/explorers/explorer-table',
	'orion/explorers/navigatorRenderer',
	'orion/selection',
	'orion/fileCommands',
	'orion/extensionCommands',
	'orion/keyBinding',
	'orion/markdownView', 
	'orion/projects/projectEditor',
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/objects',
	'orion/projects/projectView'
], function(messages, mGlobalCommands, mExplorerTable, mNavigatorRenderer, Selection, FileCommands, ExtensionCommands, mKeyBinding, mMarkdownView, mProjectEditor, PageUtil, URITemplate, lib, objects, mProjectView) {
	
	var FileExplorer = mExplorerTable.FileExplorer;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;
	
	function FolderNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
		this.selectionPolicy = this.explorer.getCommandsVisible() ? null : "cursorOnly"; //$NON-NLS-0$
	}
	FolderNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(FolderNavRenderer.prototype, {
		showFolderImage: true,
		createFolderNode: function(folder) {
			var folderNode = mNavigatorRenderer.NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (this.showFolderLinks && folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.href = new URITemplate("#{,resource,params*}").expand({resource: folder.Location}); //$NON-NLS-0$
			}
			folderNode.classList.add("folderNavFolder"); //$NON-NLS-0$
			folderNode.classList.add("navlink"); //$NON-NLS-0$
			folderNode.classList.add("targetSelector"); //$NON-NLS-0$
			folderNode.classList.remove("navlinkonpage"); //$NON-NLS-0$
			return folderNode;
		},
		getCellHeaderElement: function(col_no) {
			var td;
			if (col_no === 0) {
				td = document.createElement("th"); //$NON-NLS-0$
				td.colSpan = 1;
				var root = this.explorer.treeRoot;
				td.appendChild(document.createTextNode(root.Parents ? root.Name : this.explorer.fileClient.fileServiceName(root.Location)));
				return td;
			} else if (col_no === 1) {
				td = document.createElement("th"); //$NON-NLS-0$
				td.colSpan = 2;
				var span = document.createElement("span"); //$NON-NLS-0$
				span.id = this.explorer.toolbarId;
				td.appendChild(span);
				window.setTimeout(function() {
					this.explorer.updateCommands();
				}.bind(this), 0);
				return td;
			}
			return null;
		},
		getExpandImage: function() {
			return null;
		}
	});
	
	function FolderNavExplorer(options) {
		var self = this;
		options.setFocus = false;   // do not steal focus on load
		options.cachePrefix = null; // do not persist table state
		options.dragAndDrop = FileCommands.uploadFile;
		options.modelEventDispatcher = FileCommands.getModelEventDispatcher();
		options.rendererFactory = function(explorer) {
			return new FolderNavRenderer({
				checkbox: false,
				cachePrefix: "FolderNavigator" //$NON-NLS-0$
			}, explorer, options.commandRegistry, options.contentTypeRegistry);
		};
		FileExplorer.apply(this, arguments);
		this.commandsId = ".folderNav"; //$NON-NLS-0$
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.treeRoot = {};
		var parent = lib.node(this.parentId);	
		this.toolbarId = parent.id + "Tool"; //$NON-NLS-0$
		this.newActionsScope = parent.id + "New"; //$NON-NLS-0$
		this.selectionActionsScope = parent.id + "Selection"; //$NON-NLS-0$
		this.selection = new Selection.Selection(this.serviceRegistry, "folderNavFileSelection"); //$NON-NLS-0$
		this.selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
			self.updateCommands(event.selections);
		});
	}
	FolderNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(FolderNavExplorer.prototype, /** @lends orion.FolderNavExplorer.prototype */ {
		loadRoot: function(root) {
			var self = this;
			function loaded() {
				self.registerCommands().then(function() {
					self.updateCommands();
				});
			}
			if (root) {
				this.load(root, "Loading " + root.Name).then(loaded);
			} else {
				this.loadResourceList(PageUtil.matchResourceParameters().resource + "?depth=1", false).then(loaded); //$NON-NLS-0$
			}
		},
		destroy: function() {
			FileExplorer.prototype.destroy.call(this);
			var _self = this;
			[this.newActionsScope, this.selectionActionsScope].forEach(function(id) {
				delete _self[id];
			});
		},
		createActionSections: function(toolbar) {
			[this.newActionsScope, this.selectionActionsScope].forEach(function(id) {
				if (!lib.node(id)) {
					var elem = document.createElement("ul"); //$NON-NLS-0$
					elem.id = id;
					elem.classList.add("commandList"); //$NON-NLS-0$
					elem.classList.add("layoutRight"); //$NON-NLS-0$
//					elem.classList.add("pageActions"); //$NON-NLS-0$
					toolbar.appendChild(elem);
				}
			});
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.serviceRegistry;
			var newActionsScope = this.newActionsScope;
			var selectionActionsScope = this.selectionActionsScope;
			commandRegistry.addCommandGroup(newActionsScope, "orion.folderNavNewGroup", 1000, messages.New, null, null, "core-sprite-expandAll", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(selectionActionsScope, "orion.folderNavSelectionGroup", 100, messages.Actions, null, null, "core-sprite-gear", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerSelectionService(selectionActionsScope, this.selection);

			var parent = lib.node(this.parentId);
			var renameBinding = new KeyBinding(113); // F2
			var delBinding = new KeyBinding(46); // Delete
			var copySelections = new KeyBinding('c', true); /* Ctrl+C */
			var pasteSelections = new KeyBinding('v', true); /* Ctrl+V */
			pasteSelections.domScope = copySelections.domScope = delBinding.domScope = renameBinding.domScope = parent.id; //$NON-NLS-0$
			pasteSelections.scopeName = copySelections.scopeName = delBinding.scopeName = renameBinding.scopeName = messages.FolderNavigator; //$NON-NLS-0$

			// commands that don't appear but have keybindings
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.copySelections" + this.commandsId, 1, null, true, copySelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.pasteSelections" + this.commandsId, 1, null, true, pasteSelections);//$NON-NLS-1$ //$NON-NLS-0$

			// New file and new folder (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFile" + this.commandsId, 1, "orion.folderNavNewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFolder" + this.commandsId, 2, "orion.folderNavNewGroup", false, null/*, new mCommandRegistry.URLBinding("newFolder", "name")*/); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// New project creation in the toolbar (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.project" + this.commandsId, 1, "orion.folderNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.linkProject" + this.commandsId, 2, "orion.folderNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.renameResource" + this.commandsId, 2, "orion.folderNavSelectionGroup", false, renameBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.copyFile" + this.commandsId, 3, "orion.folderNavSelectionGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.moveFile" + this.commandsId, 4, "orion.folderNavSelectionGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.deleteFile" + this.commandsId, 5, "orion.folderNavSelectionGroup", false, delBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWithEachOther" + this.commandsId, 6, "orion.folderNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWith" + this.commandsId, 7, "orion.folderNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importZipURL" + this.commandsId, 1, "orion.folderNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.import" + this.commandsId, 2, "orion.folderNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.downloadFile" + this.commandsId, 3, "orion.folderNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importSFTP" + this.commandsId, 4, "orion.folderNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.exportSFTPCommand" + this.commandsId, 5, "orion.folderNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			FileCommands.createFileCommands(serviceRegistry, commandRegistry, this, fileClient);
			return ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.folderNavSelectionGroup", true, this.commandsVisibleWhen, this.commandsId);
		},
		getCommandsVisible: function() {
			return mGlobalCommands.getMainSplitter().splitter.isClosed();
		},
		setCommandsVisible: function(visible) {
			if (visible) {
				this.updateCommands();
			} else {
				this.commandRegistry.destroy(this.newActionsScope);
				this.commandRegistry.destroy(this.selectionActionsScope);
			}
			var selectionPolicy = visible ? null : "cursorOnly"; //$NON-NLS-0$
			this.renderer.selectionPolicy = selectionPolicy;
			var navHandler = this.getNavHandler();
			if (navHandler) {
				navHandler.setSelectionPolicy(selectionPolicy);
			}
		},
		updateCommands: function(selections) {
			var toolbar = lib.node(this.toolbarId);
			if (!toolbar || !this.getCommandsVisible()) {
				return;
			}
			this.createActionSections(toolbar);
			FileCommands.updateNavTools(this.registry, this.commandRegistry, this, this.newActionsScope, this.selectionActionsScope, this.treeRoot, true);
		}
	});
	
	/** 
	 * Constructs a new FolderView object.
	 * 
	 * @class 
	 * @name orion.FolderView
	 */
	function FolderView(options) {
		this._parent = options.parent;
		this._input = options.input;
		this._metadata = options.metadata;
		this.fileClient = options.fileService;
		this.progress = options.progress;
		this.serviceRegistry = options.serviceRegistry;
		this.commandService = options.commandService;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.showProjectView = true;
		this.showFolderNav = true;
		this._init();
	}
	FolderView.prototype = /** @lends orion.FolderView.prototype */ {
		_init: function(){
			if(this.serviceRegistry.getServiceReferences("orion.projects").length===0){
				this.showProjectView = false;
			}
			this.markdownView = new mMarkdownView.MarkdownView({
				fileClient : this.fileClient,
				progress : this.progress
			});
			if(this.showProjectView){
				this.projectEditor = new mProjectEditor.ProjectEditor({
					fileClient : this.fileClient,
					progress : this.progress,
					serviceRegistry: this.serviceRegistry,
					commandService: this.commandService
				});
				this.projectView = new mProjectView.ProjectView({
					fileClient : this.fileClient,
					progress : this.progress,
					serviceRegistry: this.serviceRegistry,
					commandService: this.commandService
				});
			}
			mGlobalCommands.getMainSplitter().splitter.addEventListener("toggle", this._splitterToggleListener = function(e) { //$NON-NLS-0$
				[this.markdownView, this.projectEditor, this.projectView, this.folderNavExplorer].forEach(function(view) {
					if (view && view.setCommandsVisible) {
						view.setCommandsVisible(e.closed);
					}
				});
			}.bind(this));
		},
		displayWorkspaceView: function(){
			var _self = this;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
			
			if(this.showProjectView){
				var div = document.createElement("div"); //$NON-NLS-0$
				_self._node.appendChild(div);
				this.projectView.display(this._metadata, div);
			}
		},
		displayFolderView: function(root){
			var children = root.Children;
			var projectJson;
			var readmeMd;
			for (var i=0; i<children.length; i++) {
				var child = children[i];
				if (!child.Directory && child.Name === "project.json") { //$NON-NLS-0$
					projectJson = child;
				}
				if (!child.Directory && child.Name && child.Name.toLowerCase() === "readme.md") { //$NON-NLS-0$
					readmeMd = child;
				}

			}
			var div;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
				
			if(projectJson && this.showProjectView){
				div = document.createElement("div"); //$NON-NLS-0$
				this.projectEditor.displayContents(div, this._metadata);
				this._node.appendChild(div);
			}
			
			if (this.showFolderNav) {
				var navNode = document.createElement("div"); //$NON-NLS-0$
				navNode.className = "folderNav"; //$NON-NLS-0$
				navNode.id = "folderNavNode"; //$NON-NLS-0$
				this.folderNavExplorer = new FolderNavExplorer({
					parentId: navNode,
					serviceRegistry: this.serviceRegistry,
					fileClient: this.fileClient,
					commandRegistry: this.commandService,
					contentTypeRegistry: this.contentTypeRegistry
				});
				this.folderNavExplorer.loadRoot(this._metadata);
				this._node.appendChild(navNode);
			}
			
			if (readmeMd) {
				div = document.createElement("div"); //$NON-NLS-0$
				this.markdownView.displayInFrame(div, readmeMd);
				this._node.appendChild(div);
			}
		},
		create: function() {
			if(this._metadata.Projects){ //this is a workspace root
				this.displayWorkspaceView();
			}
			if(this._metadata.Children){
				this.displayFolderView(this._metadata);
			} else if(this._metadata.ChildrenLocation){
				this.progress.progress(this.fileClient.fetchChildren(this._metadata.ChildrenLocation), "Fetching children of " + this._metadata.Name).then(function(children) {
					this._metadata.Children = children;
					this.displayFolderView(this._metadata);
				}.bind(this));
			}
		},
		destroy: function() {
			mGlobalCommands.getMainSplitter().splitter.removeEventListener("toggle", this._splitterToggleListener); //$NON-NLS-0$
			if (this.folderNavExplorer) {
				this.folderNavExplorer.destroy();
			}
			this.folderNavExplorer = null;
			if (this._node && this._node.parentNode) {
				this._node.parentNode.removeChild(this._node);
			}
			this._node = null;
		}
	};
	return {FolderView: FolderView};
});
