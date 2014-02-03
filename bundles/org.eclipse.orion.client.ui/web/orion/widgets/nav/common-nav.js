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
	'orion/explorers/explorer-table',
	'orion/explorers/navigatorRenderer',
	'orion/explorers/explorerNavHandler',
	'orion/keyBinding',
	'orion/fileCommands',
	'orion/extensionCommands',
	'orion/selection',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/Deferred',
	'orion/webui/contextmenu'
], function(
	messages, objects, lib, mExplorer, mNavigatorRenderer, mExplorerNavHandler, mKeyBinding,
	FileCommands, ExtensionCommands, Selection, URITemplate, PageUtil, Deferred, mContextMenu
) {
	var FileExplorer = mExplorer.FileExplorer;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	
	/**
	 * @class orion.sidebar.CommonNavExplorer
	 * @extends orion.explorers.FileExplorer
	 */
	function CommonNavExplorer(params) {
		params.setFocus = false;   // do not steal focus on load
		params.cachePrefix = null; // do not persist table state
		params.modelEventDispatcher = FileCommands.getModelEventDispatcher();
		params.dragAndDrop = FileCommands.uploadFile;
		FileExplorer.apply(this, arguments);
		this.commandRegistry = params.commandRegistry;
		this.editorInputManager = params.editorInputManager;
		this.progressService = params.progressService;
		var sidebarNavInputManager = this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.newActionsScope = this.toolbarNode.id + "New"; //$NON-NLS-0$
		this.selectionActionsScope = this.toolbarNode.id + "Selection"; //$NON-NLS-0$
		this.folderNavActionsScope = this.toolbarNode.id + "Folder"; //$NON-NLS-0$
		this.additionalNavActionsScope = this.toolbarNode.id + "Extra"; //$NON-NLS-0$
		
		this._parentNode = lib.node(this.parentId);
		this._sidebarContextMenuNode = document.createElement("ul"); //$NON-NLS-0$
		this._sidebarContextMenuNode.className = "dropdownMenu"; //$NON-NLS-0$
		this._sidebarContextMenuNode.setAttribute("role", "menu"); //$NON-NLS-1$ //$NON-NLS-0$
		this._sidebarContextMenuNode.id = this.parentId + "ContextMenu"; //$NON-NLS-0$
		
		this._parentNode.parentNode.insertBefore(this._sidebarContextMenuNode, this._parentNode);
		
		this.contextMenuActionsScope = this._sidebarContextMenuNode.id + "commonNavContextMenu"; //$NON-NLS-0$

		this.treeRoot = {}; // Needed by FileExplorer.prototype.loadResourceList
		var _self = this;
		this.editorInputListener = function(event) {
			_self.reveal(event.metadata);
		};
		this.editorInputManager.addEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
		if (sidebarNavInputManager) {
			sidebarNavInputManager.reveal = function(metadata) {
				_self.reveal(metadata);
			};
		}
		var dispatcher = this.modelEventDispatcher;
		var onChange = this._modelListener = this.onFileModelChange.bind(this);
		["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
			dispatcher.addEventListener(type, onChange);
		});
		this.selection = new Selection.Selection(this.registry, "commonNavFileSelection"); //$NON-NLS-0$
		this._selectionListener = function(event) { //$NON-NLS-0$
			_self.updateCommands(event.selections);
			if (sidebarNavInputManager) {
				_self.sidebarNavInputManager.dispatchEvent(event);
			}
		};
		this.selection.addEventListener("selectionChanged", this._selectionListener); //$NON-NLS-0$
		this.commandsRegistered = this.registerCommands();
		
		this._createContextMenu();
	}
	CommonNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(CommonNavExplorer.prototype, /** @lends orion.sidebar.CommonNavExplorer.prototype */ {
		onLinkClick: function(event) {
			FileExplorer.prototype.onLinkClick.call(this, event);
			//Redispatch to nav input manager
			this.sidebarNavInputManager.dispatchEvent(event);
			var navHandler = this.getNavHandler();
			if (!navHandler || !event.item.Directory) {
				return;
			}
			var folder = event.item;
			navHandler.cursorOn(folder);
			navHandler.setSelection(folder, false);
			// now toggle its expand/collapse state
			var curModel = navHandler._modelIterator.cursor();
			if (navHandler.isExpandable(curModel)){
				if (!navHandler.isExpanded(curModel)){
					this.myTree.expand(curModel);
				} else {
					this.myTree.collapse(curModel);
				}
			}
		},
		onModelCreate: function(event) {
			return FileExplorer.prototype.onModelCreate.call(this, event).then(function () {
				this.sidebarNavInputManager.dispatchEvent(event);
			}.bind(this));
		},
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
					newInput = (newValue && newValue.ChildrenLocation) || (newValue && newValue.ContentLocation) || (newValue && newValue.Location) || null;
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
			[this.newActionsScope, this.selectionActionsScope, this.folderNavActionsScope, this.additionalNavActionsScope].forEach(function(id) {
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
			var dispatcher = this.modelEventDispatcher;
			["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
				dispatcher.removeEventListener(type, _self._modelListener);
			});
			FileExplorer.prototype.destroy.call(this);
			[this.newActionsScope, this.selectionActionsScope, this.folderNavActionsScope, this.additionalNavActionsScope].forEach(function(id) {
				delete _self[id];
			});
			this.editorInputManager.removeEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
			this.selection.removeEventListener("selectionChanged", this._selectionListener); //$NON-NLS-0$
			
			if (this._contextMenu) {
				this._contextMenu.destroy();
				this._contextMenu = null;
			}
			if (this._sidebarContextMenuNode) {
				this._parentNode.parentNode.removeChild(this._sidebarContextMenuNode);
				this._sidebarContextMenuNode = null;
			}
		},
		display: function(root, force) {
			return this.loadRoot(root, force).then(function(){
				this.updateCommands();
				return this.reveal(this.editorInputManager.getFileMetadata());
			}.bind(this));	
		},
		/**
		 * Loads the given children location as the root.
		 * @param {String|Object} childrentLocation The childrenLocation or an object with a ChildrenLocation field.
		 * @returns {orion.Promise}
		 */
		loadRoot: function(childrenLocation, force) {
			childrenLocation = (childrenLocation && childrenLocation.ChildrenLocation) || childrenLocation || ""; //$NON-NLS-0$
			return this.commandsRegistered.then(function() {
				if (childrenLocation && typeof childrenLocation === "object") { //$NON-NLS-0$
					return this.load(childrenLocation);
				} else {
					return this.loadResourceList(childrenLocation, force);
				}
			}.bind(this));
		},
		scope: function(childrenLocation) {
			childrenLocation = (childrenLocation && childrenLocation.ChildrenLocation) || childrenLocation || ""; //$NON-NLS-0$
			var params = PageUtil.matchResourceParameters();
			var resource = params.resource;
			delete params.resource;
			if (childrenLocation) {
				if (params.navigate === childrenLocation) {
					return;
				}
				params.navigate = childrenLocation;
			} else {
				delete params.navigate;
			}
			window.location.href = uriTemplate.expand({resource: resource, params: params});
		},
		scopeUp: function() {
			var navigate;
			var root = this.treeRoot;
			var parent = root.Parents && root.Parents[0];
			if (parent) {
				navigate = parent.ChildrenLocation;
			} else {
				navigate = this.fileClient.fileServiceRootURL(root.Location);
			}
			this.scope(navigate);
		},
		scopeDown: function(item) {
			this.scope(item.ChildrenLocation);
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
			var newActionsScope = this.newActionsScope;
			var selectionActionsScope = this.selectionActionsScope;
			var folderNavActionsScope = this.folderNavActionsScope;
			var contextMenuActionsScope = this.contextMenuActionsScope;
			commandRegistry.addCommandGroup(newActionsScope, "orion.commonNavNewGroup", 1000, messages["New"], null, null, "core-sprite-addcontent", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			// action gear groups
			commandRegistry.addCommandGroup(selectionActionsScope, "orion.commonNavSelectionGroup", 100, messages["Actions"], null, null, "core-sprite-gear", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(selectionActionsScope, 
				"orion.importExportGroup", //$NON-NLS-0$
				1000, 
				messages["ImportExport"], //$NON-NLS-0$
				"orion.commonNavSelectionGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$
				
			// context menu groups
			commandRegistry.addCommandGroup(contextMenuActionsScope, "orion.commonNavContextMenuSelectionGroup", 100, null, null, null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(contextMenuActionsScope, 
				"orion.OpenWith", //$NON-NLS-0$
				1000, 
				messages["OpenWith"], //$NON-NLS-0$
				"orion.commonNavContextMenuSelectionGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$
			commandRegistry.addCommandGroup(contextMenuActionsScope, 
				"orion.ImportExportGroup", //$NON-NLS-0$
				1000, 
				messages["ImportExport"], //$NON-NLS-0$
				"orion.commonNavContextMenuSelectionGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$			
			commandRegistry.addCommandGroup(contextMenuActionsScope, 
				"orion.Extensions", //$NON-NLS-0$
				1000, 
				messages["Extensions"], //$NON-NLS-0$
				"orion.commonNavContextMenuSelectionGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$
			
			commandRegistry.registerSelectionService(selectionActionsScope, this.selection);
			commandRegistry.registerSelectionService(contextMenuActionsScope, this.selection);

			var renameBinding = new KeyBinding(113); // F2
			var delBinding = new KeyBinding(46); // Delete
			var cutBinding = new KeyBinding('x', true); /* Ctrl+X */ //$NON-NLS-0$
			var copySelections = new KeyBinding('c', true); /* Ctrl+C */ //$NON-NLS-0$
			var pasteSelections = new KeyBinding('v', true); /* Ctrl+V */ //$NON-NLS-0$
			var upFolder = new KeyBinding(38, false, false, true); /* Alt+UpArrow */
			var downFolder = new KeyBinding(40, false, false, true); /* Alt+DownArrow */
			downFolder.domScope = upFolder.domScope = pasteSelections.domScope = copySelections.domScope = delBinding.domScope = renameBinding.domScope = "sidebar"; //$NON-NLS-0$
			downFolder.scopeName = upFolder.scopeName = pasteSelections.scopeName = copySelections.scopeName = delBinding.scopeName = renameBinding.scopeName = messages.Navigator; //$NON-NLS-0$

			// New file and new folder (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFile", 1, "orion.commonNavNewGroup/orion.newContentGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFolder", 2, "orion.commonNavNewGroup/orion.newContentGroup", false, null/*, new mCommandRegistry.URLBinding("newFolder", "name")*/); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// New project creation in the toolbar (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.project", 3, "orion.commonNavNewGroup/orion.newContentGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.linkProject", 4, "orion.commonNavNewGroup/orion.newContentGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// Folder nav actions
			commandRegistry.registerCommandContribution(folderNavActionsScope, "eclipse.upFolder", 1, null, false, upFolder); //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.cut", 1, "orion.commonNavSelectionGroup", false, cutBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.copySelections", 2, "orion.commonNavSelectionGroup", false, copySelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.pasteSelections", 3, "orion.commonNavSelectionGroup", false, pasteSelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.deleteFile", 4, "orion.commonNavSelectionGroup", false, delBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.renameResource", 5, "orion.commonNavSelectionGroup", false, renameBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.downFolder", 6, "orion.commonNavSelectionGroup", false, downFolder); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWithEachOther", 7, "orion.commonNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.compareWith", 8, "orion.commonNavSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importZipURL", 1, "orion.commonNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.import", 2, "orion.commonNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.downloadFile", 3, "orion.commonNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "orion.importSFTP", 4, "orion.commonNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.exportSFTPCommand", 5, "orion.commonNavSelectionGroup/orion.importExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			
			// Context menu actions
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.cut", 1, "orion.commonNavContextMenuSelectionGroup", false, cutBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.copySelections", 2, "orion.commonNavContextMenuSelectionGroup", false, copySelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.pasteSelections", 3, "orion.commonNavContextMenuSelectionGroup", false, pasteSelections); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.deleteFile", 4, "orion.commonNavContextMenuSelectionGroup", false, delBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.renameResource", 5, "orion.commonNavContextMenuSelectionGroup", false, renameBinding); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.compareWith", 6, "orion.commonNavContextMenuSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.compareWithEachOther", 7, "orion.commonNavContextMenuSelectionGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			
			// Context menu ImportExportGroup group
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.importZipURL", 1, "orion.commonNavContextMenuSelectionGroup/orion.ImportExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.import", 2, "orion.commonNavContextMenuSelectionGroup/orion.ImportExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.downloadFile", 3, "orion.commonNavContextMenuSelectionGroup/orion.ImportExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "orion.importSFTP", 4, "orion.commonNavContextMenuSelectionGroup/orion.ImportExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(contextMenuActionsScope, "eclipse.exportSFTPCommand", 5, "orion.commonNavContextMenuSelectionGroup/orion.ImportExportGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			
			FileCommands.createFileCommands(serviceRegistry, commandRegistry, this, fileClient);
			return ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.commonNavSelectionGroup", true).then(function() { //$NON-NLS-0$
				// Context menu OpenWith group
				var openWithCommands = ExtensionCommands.getOpenWithCommands(commandRegistry);
				openWithCommands.forEach(function(command){
					commandRegistry.registerCommandContribution(contextMenuActionsScope, command.id, 1, "orion.commonNavContextMenuSelectionGroup/orion.OpenWith"); //$NON-NLS-0$
				});
								
				// Context menu Extensions group
				var fileCommandIds = ExtensionCommands.getFileCommandIds();
				fileCommandIds.forEach(function(commandId){
					commandRegistry.registerCommandContribution(contextMenuActionsScope, commandId, 1, "orion.commonNavContextMenuSelectionGroup/orion.Extensions"); //$NON-NLS-0$
				});
			}); //$NON-NLS-0$
		},
		updateCommands: function(selections) {
			this.createActionSections();
			var selectionTools = this.selectionActionsScope;
			var treeRoot = this.treeRoot, commandRegistry = this.commandRegistry;
			FileCommands.updateNavTools(this.registry, commandRegistry, this, this.newActionsScope, selectionTools, treeRoot, true);
			commandRegistry.destroy(this.folderNavActionsScope);
			commandRegistry.destroy(this.additionalNavActionsScope);
			commandRegistry.renderCommands(this.folderNavActionsScope, this.folderNavActionsScope, this.treeRoot, this, "tool"); //$NON-NLS-0$
			commandRegistry.renderCommands(this.additionalNavActionsScope, this.additionalNavActionsScope, selections || this.treeRoot, this, "tool"); //$NON-NLS-0$
			if (this._sidebarContextMenuNode) {
				this._populateContextMenu(this._sidebarContextMenuNode);
			}
		},
		
		_populateContextMenu: function(contextMenuNode) {
			var selectionService = this.selection;
			var selections = selectionService.getSelections();
			var items = null;
			
			this.commandRegistry.destroy(contextMenuNode); // remove previous content
			
			this.commandRegistry.renderCommands(this.newActionsScope, contextMenuNode, this.treeRoot, this, "menu");  //$NON-NLS-0$
				
			if (!selections || (Array.isArray(selections) && !selections.length)) {
				//no selections, use this.treeRoot to determine commands
				items = this.treeRoot;
			}
			this.commandRegistry.renderCommands(this.contextMenuActionsScope, contextMenuNode, items, this, "menu");  //$NON-NLS-0$	
		},
			
		_createContextMenu: function() {
			//function called when the context menu is triggered to set the nav selection properly
			var contextMenuTriggered = function(eventWrapper) {
				var navHandler = this.getNavHandler();
				var navDict = this.getNavDict();
				var event = eventWrapper.event;
				var item = null;
				
				if (event.target) {
					var node = event.target;
					while (this._parentNode.contains(node)) {
						if ("TR" === node.nodeName) {	//$NON-NLS-0$ //TODO this is brittle, see if a better way exists
							var rowId = node.id;
							item = navDict.getValue(rowId);
							break;
						}
						node = node.parentNode;
					}
					
					if (item && !navHandler.isDisabled(item.rowDomNode)) {
						// only modify the selection if the item that the context menu
						// was triggered on isn't already part of the selection
						var existingSels = navHandler.getSelection();
						if (-1 === existingSels.indexOf(item.model)) {
							navHandler.cursorOn(item.model, true, false, true);
							navHandler.setSelection(item.model, false, true);
						}
					} else {
						// context menu was triggered on sidebar itself,
						// clear previous selections
						this.selection.setSelections(null);
						navHandler.refreshSelection(true, true);
					}
				}
			}.bind(this);
			
			var contextMenu = new mContextMenu.ContextMenu({
				dropdown: this._sidebarContextMenuNode,
				triggerNode: this._parentNode
			});
			
			contextMenu.addEventListener("triggered", contextMenuTriggered); //$NON-NLS-0$
			
			this._contextMenu = contextMenu;
		}
	});

	function CommonNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
	}
	CommonNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(CommonNavRenderer.prototype, {
		showFolderLinks: true,
		oneColumn: true,
		createFolderNode: function(folder) {
			var folderNode = NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (this.showFolderLinks && folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.href = uriTemplate.expand({resource: folder.Location});
				folderNode.classList.add("commonNavFolder"); //$NON-NLS-0$
			} else {
				folderNode.classList.add("nav_fakelink"); //$NON-NLS-0$
			}
			return folderNode;
		},
		emptyCallback: function() {
		}
	});
	
	/**
	 * Overrides NavigatorRenderer.prototype.rowCallback
	 * @param {Element} rowElement
	 */
	CommonNavRenderer.prototype.rowCallback = function(rowElement, model) {
		NavigatorRenderer.prototype.rowCallback.call(this, rowElement, model);
		
		// Search for the model in the Cut buffer and disable it if it is found
		var cutBuffer = FileCommands.getCutBuffer();
		if (cutBuffer) {
			var matchFound = cutBuffer.some(function(cutModel) {
				return FileCommands.isEqualToOrChildOf(model, cutModel);
			});
			
			if (matchFound) {
				var navHandler = this.explorer.getNavHandler();
				navHandler.disableItem(model);
			}
		}
	};
	
	return {
		CommonNavExplorer: CommonNavExplorer,
		CommonNavRenderer: CommonNavRenderer
	};
});
