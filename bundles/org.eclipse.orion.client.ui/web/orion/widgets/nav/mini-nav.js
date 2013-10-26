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
	'orion/i18nUtil',
	'orion/keyBinding',
	'orion/commands',
	'orion/fileCommands',
	'orion/projectCommands',
	'orion/extensionCommands',
	'orion/selection',
	'orion/EventTarget',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/Deferred',
	'orion/URL-shim'
], function(messages, objects, lib, mExplorer, mNavigatorRenderer, mExplorerNavHandler, i18nUtil, mKeyBinding, Commands,
		FileCommands, ProjectCommands, ExtensionCommands, Selection, EventTarget, URITemplate, PageUtil, Deferred, _) {
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
		params.modelEventDispatcher = FileCommands.getModelEventDispatcher();
		FileExplorer.apply(this, arguments);
		this.commandRegistry = params.commandRegistry;
		this.editorInputManager = params.editorInputManager;
		this.progressService = params.progressService;
		var sidebarNavInputManager = this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;

		this.newActionsScope = this.toolbarNode.id + "New"; //$NON-NLS-0$
		this.selectionActionsScope = this.toolbarNode.id + "Selection"; //$NON-NLS-0$
		this.folderNavActionsScope = this.toolbarNode.id + "Folder"; //$NON-NLS-0$

		var initialRoot = { };
		this.treeRoot = initialRoot; // Needed by FileExplorer.prototype.loadResourceList
		var _self = this;
		this.editorInputListener = function(event) {
			_self.reveal(event.metadata, true);
		};
		this.editorInputManager.addEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
		if (sidebarNavInputManager) {
			// Broadcast changes of our explorer root to the sidebarNavInputManager
			this.addEventListener("rootChanged", function(event) { //$NON-NLS-0$
				_self.sidebarNavInputManager.dispatchEvent(event);
				_self.sidebarNavInputManager.dispatchEvent({type: "InputChanged", input: event.root.ChildrenLocation}); //$NON-NLS-0$
			});
			sidebarNavInputManager.setInput = function(input) {
				if (_self.treeRoot && _self.treeRoot.ChildrenLocation !== input) {
					_self.loadRoot(input).then(function() {
						_self.updateCommands();
					});
				}
			};
		}


		// Listen to model changes from fileCommands
		var dispatcher = this.modelEventDispatcher;
		var onChange = this._modelListener = this.onFileModelChange.bind(this);
		["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
			dispatcher.addEventListener(type, onChange);
		});
		this.selection = new Selection.Selection(this.registry, "miniNavFileSelection"); //$NON-NLS-0$
		this._selectionListener = function(event) { //$NON-NLS-0$
			_self.updateCommands(event.selections);
		};
		this.selection.addEventListener("selectionChanged", this._selectionListener);
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
			var dispatcher = this.modelEventDispatcher;
			["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
				dispatcher.removeEventListener(type, _self._modelListener);
			});
			FileExplorer.prototype.destroy.call(this);
			[this.newActionsScope, this.selectionActionsScope, this.folderNavActionsScope].forEach(function(id) {
				delete _self[id];
			});
			this.sidebarNavInputManager.removeEventListener("InputChanged", this.navInputListener); //$NON-NLS-0$
			this.editorInputManager.removeEventListener("InputChanged", this.editorInputListener); //$NON-NLS-0$
			this.selection.removeEventListener("selectionChanged", this._selectionListener);
		},
		/**
		 * Roots this explorer at the parent directory of the given file (or, at the top of the filesystem, if <code>top</code> is passed).
		 * Then reveals the given file.
		 * @param {Object} fileMetadata The file we want to reveal.
		 * @param {Boolean} [top=false] <code>true</code> roots this explorer at the top of the filesystem.
		 * <code>false</code> roots the explorer at the the direct parent of <code>fileMetadata</code>.
		 */
		loadParentOf: function(fileMetadata, top) {
			if (fileMetadata) {
				var parent = fileMetadata.Parents && fileMetadata.Parents[0];
				if (!top && parent) {
					if (this.treeRoot && this.treeRoot.ChildrenLocation === parent.ChildrenLocation) {
						// Do we still need to handle this case?
						this.reveal(fileMetadata);
						return;
					}
				} else {
					parent = this.fileClient.fileServiceRootURL(fileMetadata.Location); //$NON-NLS-0$
				}
				return this.loadRoot(parent);
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
		reveal: function(fileMetadata, expand){
			if (!fileMetadata) {
				return;
			}
			if (!expand) {
				var navHandler = this.getNavHandler();
				if (navHandler) {
					navHandler.cursorOn(fileMetadata, true);
					navHandler.setSelection(fileMetadata);
				}
				return;
			}
			
			var _self = this;
			var func = function () {
				var tree = _self.myTree;
				if (!tree) { return; }
				if (!fileMetadata.Parents) {
					return;
				}
				var startIndex = -1;
				for (var i=0; i<fileMetadata.Parents.length; i++) {
					var parent = fileMetadata.Parents[i];
					if (parent.Location === _self.treeRoot.Location || tree.isExpanded(parent)) {
						startIndex = i;
						break;
					}
				}
				if (startIndex === -1) {
					startIndex = fileMetadata.Parents.length;
				}
				var postExpand = function (startIndex) {
					if (startIndex < 0) {
						_self.reveal(fileMetadata);
						return;
					}
					tree.expand(fileMetadata.Parents[startIndex], postExpand, [startIndex-1]);
				};
				postExpand(startIndex-1);
			};
			
			if (this.fileInCurrentTree(fileMetadata)) {
				func();
			} else if (!PageUtil.matchResourceParameters().navigate) {
				this.loadParentOf(fileMetadata, true /* reveal from the top */).then(func);
			}
		},
		scopeUp: function() {
			var root = this.treeRoot;
			this.loadParentOf(root).then(this.reveal.bind(this, root));
		},
		scopeDown: function(item) {
			this.loadRoot(item).then();
		},
		fileInCurrentTree: function(fileMetadata) {
			var fileClient = this.fileClient, treeRoot = this.treeRoot;
			if (treeRoot && fileClient.fileServiceRootURL(fileMetadata.Location) !== fileClient.fileServiceRootURL(treeRoot.Location)) {
				return false;
			}
			// Already at the workspace root?
			if (!treeRoot.Parents) { return true; }
			if (fileMetadata && fileMetadata.Parents && treeRoot && treeRoot.ChildrenLocation) {
				for (var i=0; i<fileMetadata.Parents.length; i++) {
					if (fileMetadata.Parents[i].ChildrenLocation === treeRoot.ChildrenLocation) {
						return true;
					}
				}
			}
			return false;
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			// Selection based command contributions in sidebar mini-nav
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
			var newActionsScope = this.newActionsScope;
			var selectionActionsScope = this.selectionActionsScope;
			var folderNavActionsScope = this.folderNavActionsScope;
			commandRegistry.addCommandGroup(newActionsScope, "orion.miniNavNewGroup", 1000, messages["New"], null, null, "core-sprite-addcontent", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(selectionActionsScope, "orion.miniNavSelectionGroup", 100, messages["Actions"], null, null, "core-sprite-gear", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerSelectionService(selectionActionsScope, this.selection);

			var renameBinding = new KeyBinding(113); // F2
			var delBinding = new KeyBinding(46); // Delete
			var copySelections = new KeyBinding('c', true); /* Ctrl+C */ //$NON-NLS-0$
			var pasteSelections = new KeyBinding('v', true); /* Ctrl+V */ //$NON-NLS-0$
			var upFolder = new KeyBinding(38, false, false, true); /* Alt+UpArrow */
			var downFolder = new KeyBinding(40, false, false, true); /* Alt+UpArrow */
			downFolder.domScope = upFolder.domScope = pasteSelections.domScope = copySelections.domScope = delBinding.domScope = renameBinding.domScope = "sidebar"; //$NON-NLS-0$
			downFolder.scopeName = upFolder.scopeName = pasteSelections.scopeName = copySelections.scopeName = delBinding.scopeName = renameBinding.scopeName = messages.Navigator; //$NON-NLS-0$

			// commands that don't appear but have keybindings
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.copySelections", 1, null, true, copySelections); //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.pasteSelections", 1, null, true, pasteSelections); //$NON-NLS-0$

			// New file and new folder (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFile", 1, "orion.miniNavNewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFolder", 2, "orion.miniNavNewGroup", false, null/*, new mCommandRegistry.URLBinding("newFolder", "name")*/); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// New project creation in the toolbar (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.project", 1, "orion.miniNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.linkProject", 2, "orion.miniNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// Folder nav actions
			commandRegistry.registerCommandContribution(folderNavActionsScope, "eclipse.upFolder", 1, null, false, upFolder); //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(selectionActionsScope, "eclipse.downFolder", 1, "orion.miniNavSelectionGroup", false, downFolder); //$NON-NLS-1$ //$NON-NLS-0$
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
			var fileCommandsRegistered = ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.miniNavSelectionGroup", true); //$NON-NLS-0$
			
			if(serviceRegistry.getServiceReferences("orion.projects").length>0){
				commandRegistry.addCommandGroup(newActionsScope, "orion.projectsNewGroup", 100, "New Project", "orion.miniNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				
				commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.basic", 1, "orion.miniNavNewGroup/orion.projectsNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.fromfile", 2, "orion.miniNavNewGroup/orion.projectsNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				
				var projectClient = serviceRegistry.getService("orion.project.client");
				var dependencyTypesDef = new Deferred();
				projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
					for(var i=0; i<dependencyTypes.length; i++){
						commandRegistry.registerCommandContribution(newActionsScope, "orion.project.createproject." + dependencyTypes[i], i+3, "orion.miniNavNewGroup/orion.projectsNewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
					}
					
					ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, projectClient, dependencyTypes).then(dependencyTypesDef.resolve, dependencyTypesDef.resolve);
				}.bind(this), dependencyTypesDef.resolve);
				
				return Deferred.all([fileCommandsRegistered, dependencyTypesDef]);
			} else {
				return fileCommandsRegistered;
			}
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
			if (this.showFolderLinks && folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.href = new URITemplate("#{,resource,params*}").expand({resource: folder.Location}); //$NON-NLS-0$
				folderNode.classList.add("miniNavFolder"); //$NON-NLS-0$
				// TODO wasteful. Should attach 1 listener to parent element, then get folder model item from nav handler
				folderNode.addEventListener("click", this.toggleFolderExpansionState.bind(this, folder, false)); //$NON-NLS-0$
			} else {
				folderNode.classList.add("nav_fakelink"); //$NON-NLS-0$
			}
			return folderNode;
		},
		/**
		 * @param {Object} folder
		 * @param {Boolean} preventDefault
		 * @param {Event} evt
		 */
		toggleFolderExpansionState: function(folder, preventDefault, evt) {
			var navHandler = this.explorer.getNavHandler();
			if (!navHandler) {
				return;
			}
			navHandler.cursorOn(folder);
			navHandler.setSelection(folder, false);
			// now toggle its expand/collapse state
			var curModel = navHandler._modelIterator.cursor();
			if (navHandler.isExpandable(curModel)){
				if (!navHandler.isExpanded(curModel)){
						this.explorer.myTree.expand(curModel);
				} else {
						this.explorer.myTree.collapse(curModel);
				}
				if (preventDefault) {
					evt.preventDefault();
				}
				return false;
			}
		}
	});

	/**
	 * @name orion.sidebar.MiniNavViewMode.FilesystemSwitcher
	 * @class Filesystem switcher.
	 * @description Renders a toolbar that displays the filesystem a MiniNavExplorer is currently viewing,
	 * and provides a menu for changing the filesystem being viewed in the explorer.
	 * @param {orion.commands.CommandRegistry} params.commandRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {orion.sidebar.MiniNavExplorer} params.explorer
	 * @param {Element} params.node
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 */
	function FilesystemSwitcher(params) {
		this.commandRegistry = params.commandRegistry;
		this.explorer = params.explorer;
		this.fileClient = params.fileClient;
		this.node = params.node;
		this.serviceRegistry = params.serviceRegistry;
		var _self = this;
		this.listener = function(event) {
			_self.refresh(event.root);
		};
		this.explorer.addEventListener("rootChanged", this.listener); //$NON-NLS-0$
		this.render();
	}
	objects.mixin(FilesystemSwitcher.prototype, /** @lends orion.sidebar.MiniNavViewMode.FilesystemSwitcher.prototype */ {
		destroy: function() {
			this.explorer.removeEventListener("rootChanged", this.listener); //$NON-NLS-0$
			this.commandRegistry.destroy(this.node);
			lib.empty(this.node);
			this.explorer = this.listener = this.node = null;
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
			this.explorer.sidebarNavInputManager.dispatchEvent({ type: "filesystemChanged", newInput: rootURL }); //$NON-NLS-0$
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
				dragAndDrop: FileCommands.uploadFile,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				rendererFactory: function(explorer) {
					var renderer = new MiniNavRenderer({
						checkbox: false,
						cachePrefix: "MiniNav"
					}, explorer, _self.commandRegistry, _self.contentTypeRegistry); //$NON-NLS-0$
					return renderer;
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: modeToolbarNode
			});

			// Create switcher here
			this.fsSwitcher = new FilesystemSwitcher({
				commandRegistry: this.commandRegistry,
				explorer: this.explorer,
				fileClient: this.fileClient,
				node: this.fsToolbar,
				serviceRegistry: this.serviceRegistry
			});

			var params = PageUtil.matchResourceParameters();
			var navigate = params.navigate, resource = params.resource;
			if (!navigate) {
				var root = this.lastRoot || this.fileClient.fileServiceRootURL(resource || ""); //$NON-NLS-0$
				this.explorer.loadRoot(root).then(function(){
					if (!_self.explorer) { return; }
					_self.explorer.updateCommands();
					_self.explorer.reveal(_self.editorInputManager.getFileMetadata(), true);
				});
			}
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
