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
/*global define*/
/*jslint browser:true devel:true sub:true*/
define(['require', 'i18n!orion/edit/nls/messages', 'orion/objects', 'orion/webui/littlelib', 'orion/explorers/explorer-table',
	'orion/explorers/navigatorRenderer', 'orion/explorers/explorerNavHandler', 'orion/i18nUtil', 'orion/keyBinding', 'orion/fileCommands',
	'orion/extensionCommands', 'orion/selection', 'orion/EventTarget', 'orion/URITemplate', 'orion/PageUtil'
	],
	function(require, messages, objects, lib, mExplorer, mNavigatorRenderer, mExplorerNavHandler, i18nUtil, mKeyBinding, FileCommands,
		ExtensionCommands, Selection, EventTarget, URITemplate, PageUtil) {
	var FileExplorer = mExplorer.FileExplorer;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;

	/**
	 * @class orion.sidebar.MiniNavExplorer
	 * @extends orion.explorers.FileExplorer
	 */
	function MiniNavExplorer(params) {
		params.setFocus = false;   // do not steal focus on load
		params.cachePrefix = null; // do not persist table state
		FileExplorer.apply(this, arguments);
		this.commandRegistry = params.commandRegistry;
		this.editorInputManager = params.editorInputManager;
		this.progressService = params.progressService;
		var sidebarNavInputManager = this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;

		this.newActionsScope = this.toolbarNode.id + "New"; //$NON-NLS-0$
		this.selectionActionsScope = this.toolbarNode.id + "Selection"; //$NON-NLS-0$
		this.folderNavActionsScope = this.toolbarNode.id + "Folder"; //$NON-NLS-0$

		this.followEditor = true;
		var initialRoot = { };
		this.treeRoot = initialRoot; // Needed by FileExplorer.prototype.loadResourceList
		var _self = this;
		this.editorInputListener = function(event) {
			var editorInput = _self.editorInput = event.metadata;
			if (_self.treeRoot === initialRoot && _self.followEditor) {
				// Initial load: parent folder of editor input gives our current root
				_self.loadParentOf(editorInput);
			} else {
				// The folder URLs are impacted by the change of editor input (eg. #someFileToEdit.js,navigate=/some/folder/to/view)
				_self.renderer.updateFolderLinks(lib.node(_self._parentId));
				_self.reveal(editorInput);
			}
		};
		this.editorInputManager.addEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
		if (sidebarNavInputManager) {
			this.navInputListener = function(event) {
				_self.followEditor = false;
				_self.loadRoot(event.input).then(function() {
					_self.updateCommands();
				});
			};
			sidebarNavInputManager.addEventListener("InputChanged", this.navInputListener); //$NON-NLS-0$

			// Broadcast changes of our explorer root to the sidebarNavInputManager
			this.addEventListener("rootChanged", function(event) { //$NON-NLS-0$
				_self.sidebarNavInputManager.dispatchEvent(event);
			});
		}


		// Listen to model changes from fileCommands
		var dispatcher = this.modelEventDispatcher;
		var onChange = this.onFileModelChange.bind(this);
		["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
			dispatcher.addEventListener(type, onChange);
		});
		this.selection = new Selection.Selection(this.registry, "miniNavFileSelection"); //$NON-NLS-0$
		this.selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
			_self.updateCommands(event.selections);
		});
		this.commandsRegistered = this.registerCommands();
	}
	MiniNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(MiniNavExplorer.prototype, /** @lends orion.sidebar.MiniNavExplorer.prototype */ {
		onFileModelChange: function(event) {
			var oldValue = event.oldValue, newValue = event.newValue;
			// Detect if we moved/renamed/deleted the current file being edited, or an ancestor thereof.
			var editorFile = this.editorInputManager.getFileMetadata();
			if (!editorFile) {
				return;
			}
			var affectedAncestor;
			[editorFile].concat(editorFile.Parents || []).some(function(ancestor) {
				if (oldValue.Location === ancestor.Location) {
					affectedAncestor = oldValue;
					return true;
				}
				return false;
			});
			if (affectedAncestor) {
				var newInput;
				if (affectedAncestor.Location === editorFile.Location) {
					// Current file was the target, see if we know its new name
					newInput = (newValue && newValue.Location) || null;
				} else {
					newInput = null;
				}
				this.sidebarNavInputManager.dispatchEvent({
					type: "editorInputMoved", //$NON-NLS-0$
					parent: this.treeRoot.ChildrenLocation,
					newInput: newInput
				});
			}
		},
		createActionSections: function() {
			var _self = this;
			// Create some elements that we can hang actions on. Ideally we'd have just 1, but the
			// CommandRegistry seems to require dropdowns to have their own element.
			[this.newActionsScope, this.selectionActionsScope, this.folderNavActionsScope].forEach(function(id) {
				if (!_self[id]) {
					var elem = document.createElement("ul"); //$NON-NLS-0$
					elem.id = id;
					elem.classList.add("commandList"); //$NON-NLS-0$
					elem.classList.add("layoutLeft"); //$NON-NLS-0$
					elem.classList.add("pageActions"); //$NON-NLS-0$
					_self.toolbarNode.appendChild(elem);
					_self[id] = elem;
				}
			});
		},
		destroy: function() {
			var _self = this;
			[this.newActionsScope, this.selectionActionsScope, this.folderNavActionsScope].forEach(function(id) {
				delete _self[id];
			});
			this.sidebarNavInputManager.removeEventListener("InputChanged", this.navInputListener); //$NON-NLS-0$
			this.editorInputManager.removeEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
		},
		/**
		 * Loads the parent directory of the given file as the root, then reveals the file.
		 * @param {Object} fileMetadata The file whose parent directory we want to load.
		 */
		loadParentOf: function(fileMetadata) {
			if (fileMetadata) {
				var parent = fileMetadata.Parents && fileMetadata.Parents[0];
				if (parent) {
					if (this.treeRoot && this.treeRoot.ChildrenLocation === parent.ChildrenLocation) {
						// Do we still need to handle this case?
						this.reveal(fileMetadata);
						return;
					}
				} else {
					parent = this.fileClient.fileServiceRootURL(fileMetadata.Location); //$NON-NLS-0$
				}
				return this.loadRoot(parent).then(this.reveal.bind(this, fileMetadata));
			}
		},
		/**
		 * Loads the given children location as the root.
		 * @param {String|Object} The childrenLocation or an object with a ChildrenLocation field.
		 */
		loadRoot: function(childrenLocation) {
			childrenLocation = (childrenLocation && childrenLocation.ChildrenLocation) || childrenLocation || ""; //$NON-NLS-0$
			var _self = this;
			return this.commandsRegistered.then(function() {
				return _self.loadResourceList.call(_self, childrenLocation);
			});
		},
		reveal: function(fileMetadata) {
			if (!fileMetadata) {
				return;
			}
			var navHandler = this.getNavHandler();
			if (navHandler) {
				navHandler.cursorOn(fileMetadata, true, false, false);
				navHandler.setSelection(fileMetadata);
			}
		},
		scopeUp: function() {
			var root = this.treeRoot, parents = root && root.Parents;
			if (parents) {
				var deferred;
				if (parents.length === 0) {
					var fileServiceRoot = this.fileClient.fileServiceRootURL(this.treeRoot.Location);
					deferred = this.loadRoot(fileServiceRoot).then(this.reveal.bind(this, this.treeRoot));
				} else {
					deferred = this.loadParentOf(this.treeRoot);
				}
				var _self = this;
				deferred.then(function() {
					_self.dispatchEvent({ type: "rootChanged", root: _self.treeRoot, force: true });
				});
			}
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			// Selection based command contributions in sidebar mini-nav
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
			var newActionsScope = this.newActionsScope;
			var selectionActionsScope = this.selectionActionsScope;
			var folderNavActionsScope = this.folderNavActionsScope;
			commandRegistry.addCommandGroup(newActionsScope, "orion.miniNavNewGroup", 1000, messages["New"], null, null, "core-sprite-addcontent"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(selectionActionsScope, "orion.miniNavSelectionGroup", 100, messages["Actions"], null, null, "core-sprite-gear"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerSelectionService(selectionActionsScope, this.selection);

			// commands that don't appear but have keybindings
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.copySelections", 1, null, true, new KeyBinding('c', true) /* Ctrl+C */); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.pasteSelections", 1, null, true, new KeyBinding('v', true) /* Ctrl+V */);//$NON-NLS-1$ //$NON-NLS-0$

			// New file and new folder (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFile", 1, "orion.miniNavNewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFolder", 2, "orion.miniNavNewGroup", false, null/*, new mCommandRegistry.URLBinding("newFolder", "name")*/); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// New project creation in the toolbar (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.project", 1, "orion.miniNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.linkProject", 2, "orion.miniNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// Folder nav actions
			commandRegistry.registerCommandContribution(folderNavActionsScope, "eclipse.upFolder", 1, null, false, new KeyBinding(38, false, false, true) /* Alt+UpArrow */); //$NON-NLS-0$

			var renameBinding = new KeyBinding(113); // F2
			renameBinding.domScope = "sidebar"; //$NON-NLS-0$
			renameBinding.scopeName = messages["Navigator"]; //$NON-NLS-0$
			var delBinding = new KeyBinding(46); // Delete
			delBinding.domScope = "sidebar"; //$NON-NLS-0$
			delBinding.scopeName = messages["Navigator"];
//			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.makeFavorite", 1, "orion.miniNavSelectionGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.renameResource", 2, "orion.miniNavSelectionGroup", false, renameBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.copyFile", 3, "orion.miniNavSelectionGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.moveFile", 4, "orion.miniNavSelectionGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.deleteFile", 5, "orion.miniNavSelectionGroup", false, delBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWithEachOther", 6, "orion.miniNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWith", 7, "orion.miniNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importZipURL", 1, "orion.miniNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.import", 2, "orion.miniNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.downloadFile", 3, "orion.miniNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importSFTP", 4, "orion.miniNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.exportSFTPCommand", 5, "orion.miniNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			FileCommands.createFileCommands(serviceRegistry, commandRegistry, this, fileClient);
			return ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.miniNavSelectionGroup", true);
		},
		updateCommands: function(selections) {
			this.createActionSections();
			var selectionTools = this.selectionActionsScope;
			var treeRoot = this.treeRoot, commandRegistry = this.commandRegistry;
			FileCommands.updateNavTools(this.registry, commandRegistry, this, this.newActionsScope, selectionTools, treeRoot, true);
			commandRegistry.destroy(this.folderNavActionsScope);
			commandRegistry.renderCommands(this.folderNavActionsScope, this.folderNavActionsScope, this.treeRoot, this, "tool"); //$NON-NLS-0$
		}
	});

	function MiniNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
	}
	MiniNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(MiniNavRenderer.prototype, {
		showFolderLinks: true,
		oneColumn: true,
		createFolderNode: function(folder) {
			var folderNode = NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.classList.add("miniNavFolder"); //$NON-NLS-0$
				var editorFile = this.explorer.editorInput && this.explorer.editorInput.Location;
				this.setFolderHref(folderNode, editorFile || "", folder.ChildrenLocation);
			}
			return folderNode;
		},
		setFolderHref: function(linkElement, resource, navigate) {
			linkElement.href = new URITemplate("#{,resource,params*}").expand({ //$NON-NLS-0$
				resource: resource,
				params: {
					navigate: navigate
				}
			});
		},
		// Called when the editor file has changed
		updateFolderLinks: function(rootNode) {
			var editorFile = this.explorer.editorInput && this.explorer.editorInput.Location;
			var _self = this;
			Array.prototype.slice.call(lib.$$("a.miniNavFolder", rootNode)).forEach(function(folderLink) { //$NON-NLS-0$
				var folderLocation = PageUtil.matchResourceParameters(folderLink.href).navigate;
				_self.setFolderHref(folderLink, editorFile || "", folderLocation); //$NON-NLS-0$
			});
		}
	});

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
		this.explorer = null;
	}
	objects.mixin(MiniNavViewMode.prototype, {
		label: messages["Navigator"],
		create: function() {
			var _self = this;
			this.explorer = new MiniNavExplorer({
				commandRegistry: this.commandRegistry,
				dragAndDrop: FileCommands.uploadFile,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				rendererFactory: function(explorer) {
					var renderer = new MiniNavRenderer({
						checkbox: false,
						cachePrefix: "MiniNav"}, explorer, _self.commandRegistry, _self.contentTypeRegistry); //$NON-NLS-0$
					return renderer;
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode
			});
			// On initial page load, metadata may not be loaded yet, but that's ok -- InputChanged will inform us later
			this.explorer.loadParentOf(this.editorInputManager.getFileMetadata());
		},
		destroy: function() {
			if (this.explorer) {
				this.explorer.destroy();
			}
			this.explorer = null;
		}
	});

	return MiniNavViewMode;
});
