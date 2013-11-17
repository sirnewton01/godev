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
	'orion/explorers/navigatorRenderer', 'orion/explorers/explorerNavHandler', 'orion/i18nUtil', 'orion/keyBinding', 'orion/fileCommands', 'orion/projectCommands',
	'orion/extensionCommands', 'orion/selection', 'orion/Deferred','orion/EventTarget', 'orion/URITemplate', 'orion/PageUtil', 'orion/section', 'orion/projectClient'
	],
	function(require, messages, objects, lib, mExplorer, mNavigatorRenderer, mExplorerNavHandler, i18nUtil, mKeyBinding, FileCommands, ProjectCommands,
		ExtensionCommands, Selection, Deferred, EventTarget, URITemplate, PageUtil, mSection, mProjectClient) {
	var FileExplorer = mExplorer.FileExplorer;
	var FileModel = mExplorer.FileModel;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;


	function ProjectNavModel(serviceRegistry, root, fileClient, idPrefix, excludeFiles, excludeFolders){
		FileModel.apply(this, arguments);
		this.project = root;
	}
	
	ProjectNavModel.prototype = Object.create(FileModel.prototype);
	objects.mixin(ProjectNavModel.prototype, /** @lends orion.sidebar.FilesNavExplorer.prototype */ {
		processParent: function(item, children){
			var res = FileModel.prototype.processParent.call(this, item, children);
			if(!item.Project){
				item.Project = this.project;
			}
			for(var i=0; i<children.length; i++){
				children[i].Project = this.project;
			}
			return children;
		},
		getChildren : function(parentItem, /* function(items) */ onComplete) {
			if(parentItem.children){
				onComplete(parentItem.children);
				return;
			}
			var self = this;
			if(parentItem.type==="Project"){
				this.fileClient.loadWorkspace(parentItem.ContentLocation).then(function(content){
					var children = [];
					content.type = "ProjectRoot";
					children.push(content);
					if(parentItem.Dependencies){
						for(var i=0; i<parentItem.Dependencies.length; i++){
							children.push({Dependency: parentItem.Dependencies[i]});
						}
					}
					this.processParent(parentItem, children);
					onComplete(children);
				}.bind(this));
			} else if(parentItem.Dependency){
				if(parentItem.FileMetadata){
					FileModel.prototype.getChildren.call(this, parentItem.FileMetadata, function(children){
						this.processParent(parentItem, children);
						onComplete(children);
					}.bind(this));
				} else {
					onComplete([]);
					return;
				}
			}
			return FileModel.prototype.getChildren.call(this, parentItem, /* function(items) */ onComplete);
		},
		getId: function(item){
			if(item.type==="Project"){
				return FileModel.prototype.getId.call(this, {Location: item.ContentLocation});
			}
			if(item.Dependency){
				return FileModel.prototype.getId.call(this, item.Dependency);
			}
			return FileModel.prototype.getId.call(this, item);
		},
		hasChildren: function(){
			return true;
		}
	});

	/**
	 * @class orion.sidebar.ProjectNavExplorer
	 * @extends orion.explorers.FileExplorer
	 */
	function FilesNavExplorer(params, projectExplorer) {
		params.setFocus = false;   // do not steal focus on load
		params.cachePrefix = null; // do not persist table state
		params.modelEventDispatcher = FileCommands.getModelEventDispatcher();
		FileExplorer.apply(this, arguments);
		this.commandRegistry = params.commandRegistry;
		this.projectClient = params.projectClient;
		this.editorInputManager = params.editorInputManager;
		this.progressService = params.progressService;
		var sidebarNavInputManager = this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.scopeUp = params.scopeUp;
		this.projectExplorer = projectExplorer;

		this.newActionsScope = params.newActionsScope;
		this.selectionActionsScope = params.selectionActionsScope;
		this.goUpActionsScope = "GoUpActions"; //$NON-NLS-0$

		this.followEditor = true;
		var initialRoot = { };
		this.treeRoot = initialRoot; // Needed by FileExplorer.prototype.loadResourceList
		var _self = this;

		// Listen to model changes from fileCommands
		var dispatcher = this.modelEventDispatcher;
		var onChange = this._modelListener = this.onFileModelChange.bind(this);
		["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
			dispatcher.addEventListener(type, onChange);
		});
		this.selection = new Selection.Selection(this.registry, "projectNavFileSelection"); //$NON-NLS-0$
		this._selectionListener =  function(event) { //$NON-NLS-0$
			_self.updateCommands(event.selections);
		};
		this._editorInputListener = function(event){
			_self.onEditorInputChanged.call(_self, event);
		};
		this.selection.addEventListener("selectionChanged", this._selectionListener);
		this.editorInputManager.addEventListener("InputChanged", this._editorInputListener);
		this.commandsRegistered = this.registerCommands();
	}
	FilesNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(FilesNavExplorer.prototype, /** @lends orion.sidebar.FilesNavExplorer.prototype */ {
		onEditorInputChanged : function(event){
			this.expandToItem(event.metadata, function(){
				this.reveal(event.metadata, true);
			}.bind(this));
		},
		onFileModelChange: function(event) {
			var oldValue = event.oldValue, newValue = event.newValue;
			// Detect if we moved/renamed/deleted the current file being edited, or an ancestor thereof.
			if(oldValue.ChildrenLocation === this.treeRoot.ContentLocation){
				this.sidebarNavInputManager.dispatchEvent({
					type: "editorInputMoved", //$NON-NLS-0$
					parent: newValue ? (newValue.ChildrenLocation || newValue.ContentLocation) : null,
					newInput: newValue ? (newValue.ChildrenLocation || newValue.ContentLocation) : null
				});
				return;
			}
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
					newInput = (newValue && newValue.ContentLocation) ||(newValue && newValue.ChildrenLocation) || (newValue && newValue.Location) || null;
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
		destroy: function() {
			var _self = this;
			var dispatcher = this.modelEventDispatcher;
			["move", "delete"].forEach(function(type) { //$NON-NLS-1$ //$NON-NLS-0$
				dispatcher.removeEventListener(type, _self._modelListener);
			});
			this.editorInputManager.removeEventListener("InputChanged", this._editorInputListener);
			this.selection.removeEventListener("selectionChanged", this._selectionListener);
			FileExplorer.prototype.destroy.call(this);
		},
		/**
		 * Loads the given children location as the root.
		 * @param {String|Object} The childrenLocation or an object with a ChildrenLocation field.
		 */
		loadRoot: function(childrenLocation, force) {
			childrenLocation = (childrenLocation && childrenLocation.ChildrenLocation) || childrenLocation || ""; //$NON-NLS-0$
			var _self = this;
			return this.commandsRegistered.then(function() {
				if (childrenLocation && typeof childrenLocation === "object"){
					return _self.load.call(_self, childrenLocation);
				} else {
					return _self.loadResourceList.call(_self, childrenLocation, force);
				}
			});
		},
		load: function(root){
			var self = this;
				self.treeRoot = root;
				self.model = new ProjectNavModel(self.registry, self.treeRoot, self.fileClient, self.parentId, self.excludeFiles, self.excludeFolders);
				var deferred = new Deferred();
				if (self.dragAndDrop) {
					if (self._hookedDrag) {
						// rehook on the parent to indicate the new root location
						self._makeDropTarget(self.treeRoot, parent, true);
					} else {
						// uses two different techniques from Modernizr
						// first ascertain that drag and drop in general is supported
						var supportsDragAndDrop = parent && (('draggable' in parent) || ('ondragstart' in parent && 'ondrop' in parent));  //$NON-NLS-2$  //$NON-NLS-1$  //$NON-NLS-0$ 
						// then check that file transfer is actually supported, since this is what we will be doing.
						// For example IE9 has drag and drop but not file transfer
						supportsDragAndDrop = supportsDragAndDrop && !!(window.File && window.FileList && window.FileReader);
						self._hookedDrag = true;
						if (supportsDragAndDrop) {
							self._makeDropTarget(self.treeRoot, parent, true);
						} else {
							self.dragAndDrop = null;
							window.console.log("Local file drag and drop is not supported in this browser."); //$NON-NLS-0$
						}
					}
				}
				
				if (self.model.hasChildren()) {
					self.createTree(self.parentId, self.model, {
						navHandlerFactory: self.navHandlerFactory,
						setFocus: (typeof self.setFocus === "undefined" ? true : self.setFocus), 
						selectionPolicy: self.renderer.selectionPolicy, 
						onCollapse: function(model) {
							if(self.getNavHandler()){
								self.getNavHandler().onCollapse(model);
							}
						}
					});
					deferred.resolve();
				} else {
					lib.empty(parent);
					var noFile = document.createElement("div"); //$NON-NLS-0$
					noFile.classList.add("noFile"); //$NON-NLS-0$
					noFile.textContent = messages["NoFile"];
					var plusIcon = document.createElement("span"); //$NON-NLS-0$
					plusIcon.classList.add("core-sprite-addcontent"); //$NON-NLS-0$
					plusIcon.classList.add("icon-inline"); //$NON-NLS-0$
					plusIcon.classList.add("imageSprite"); //$NON-NLS-0$
					lib.processDOMNodes(noFile, [plusIcon]);
					parent.appendChild(noFile);
					deferred.resolve();
				}
				return deferred;
		},
		reveal: function(fileMetadata, expand) {
			if (!fileMetadata) {
				return;
			}

			var navHandler = this.getNavHandler();
			if (navHandler) {
				if(fileMetadata.Location === this.treeRoot.Location && fileMetadata.Children && fileMetadata.Children.length){
					navHandler.cursorOn(fileMetadata.Children[0], true, false, false);
					navHandler.setSelection(fileMetadata.Children[0]);
				} else {
					navHandler.cursorOn(fileMetadata, true, false, false);
					navHandler.setSelection(fileMetadata);
				}
			}
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			// Selection based command contributions in sidebar project-nav
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
			var newActionsScope = this.newActionsScope;
			var selectionActionsScope = this.selectionActionsScope; 
			var goUpActionsScope = this.goUpActionsScope;

			commandRegistry.addCommandGroup(newActionsScope, "orion.miniExplorerNavNewGroup", 1000, messages["Add"], null, null, "core-sprite-addcontent"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(selectionActionsScope, "orion.miniNavSelectionGroup", 100, messages["Actions"], null, null, "core-sprite-gear"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerSelectionService(selectionActionsScope, this.selection);

			// commands that don't appear but have keybindings
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.copySelections", 1, null, true, new KeyBinding('c', true) /* Ctrl+C */); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.pasteSelections", 1, null, true, new KeyBinding('v', true) /* Ctrl+V */);//$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(goUpActionsScope, "eclipse.upFolder", 1); //$NON-NLS-1$ //$NON-NLS-0$

			// New file and new folder (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFile", 1, "orion.miniExplorerNavNewGroup/orion.newContentGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "eclipse.newFolder", 2, "orion.miniExplorerNavNewGroup/orion.newContentGroup", false, null/*, new mCommandRegistry.URLBinding("newFolder", "name")*/); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
			commandRegistry.registerCommandContribution(newActionsScope, "orion.project.addFolder", 1, "orion.miniExplorerNavNewGroup/orion.projectDepenencies"); //$NON-NLS-1$ //$NON-NLS-0$
			var projectCommandsDef = new Deferred();
			this.projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
				for(var i=0; i<dependencyTypes.length; i++){
					commandRegistry.registerCommandContribution(newActionsScope, "orion.project.adddependency." + dependencyTypes[i], i+1, "orion.miniExplorerNavNewGroup/orion.projectDepenencies"); //$NON-NLS-1$ //$NON-NLS-0$
				}
				
				ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, this.projectClient, dependencyTypes).then(projectCommandsDef.resolve, projectCommandsDef.resolve);
			}.bind(this), projectCommandsDef.resolve);
			commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.readme", 2,"orion.miniExplorerNavNewGroup/orion.newContentGroup"); 

		
			// New project creation in the toolbar (in a group)
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.project", 1, "orion.miniExplorerNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(newActionsScope, "orion.new.linkProject", 2, "orion.miniExplorerNavNewGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.connect", 1); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.disconnect", 2); //$NON-NLS-0$

			var renameBinding = new KeyBinding(113); // F2
			renameBinding.domScope = "sidebar"; //$NON-NLS-0$
			renameBinding.scopeName = messages["Navigator"]; //$NON-NLS-0$
			var delBinding = new KeyBinding(46); // Delete
			delBinding.domScope = "sidebar"; //$NON-NLS-0$
			delBinding.scopeName = messages["Navigator"];
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
			var fileCommandsDef = ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.miniNavSelectionGroup", true);
			return Deferred.all([projectCommandsDef, fileCommandsDef]);
		},
		createActionSections: function() {
			var _self = this;
			[this.newActionsScope, this.selectionActionsScope, this.goUpActionsScope].forEach(function(id) {
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

		updateCommands: function(selections) {
			if((this._lastSelections && this._lastSelections.length===1 && selections && selections.length===1) && this._lastSelections[0].Location === selections[0].Location){
				return;
			}
			this._lastSelections = selections;
			this.createActionSections();
			var selectionTools = this.selectionActionsScope;
			var treeRoot = this.treeRoot, commandRegistry = this.commandRegistry;
			if((!selections || selections.length===0) && treeRoot.children){
				this.selection.setSelections(treeRoot.children[0]);
			}
			var goUpActions = lib.node(this.goUpActionsScope);
			if (goUpActions) {
				commandRegistry.destroy(goUpActions);
			}
			FileCommands.updateNavTools(this.registry, commandRegistry, this, this.newActionsScope, selectionTools, treeRoot, true);
			if(treeRoot.children){
				commandRegistry.renderCommands(this.goUpActionsScope, goUpActions, treeRoot.children[0], this, "tool");
			}
		},
		expandToItem: function(item, afterExpand){
			if(!item || !this.model){
				return;
			}
			var itemId = this.model.getId(item);
			var itemNode = lib.node(itemId);
			if(itemNode){
				if(this.myTree.isExpanded(item)){
					afterExpand();
				} else {
					this.myTree.expand(itemId, afterExpand);
				}
			} else if(item.Parents && item.Parents.length>0) {
				item.Parents[0].Parents = item.Parents.slice(1);
				this.expandToItem(item.Parents[0], function(){
					this.myTree.expand(itemId, afterExpand);					
				}.bind(this));
			}
		},
		changedItem: function(item, forceExpand){
			if(!item || !this.model){
				this.projectExplorer.changedItem.call(this.projectExplorer, item, true);
				return;
			}
			if(item.Projects){
				return;
			}
			var res;
			if(item.Location && forceExpand){
				res =  FileExplorer.prototype.changedItem.call(this, item, forceExpand);
			}
			this.model.processParent(item, item.children ? item.children : []);
			this.renderer.updateRow(item, lib.node(this.model.getId(item)));
			return res;
		}
	});

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	function FilesNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
	}
	FilesNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(FilesNavRenderer.prototype, {
		showFolderLinks: true,
		oneColumn: true,
		createFolderNode: function(folder) {
			var folderNode = NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.classList.add("projectNavFolder"); //$NON-NLS-0$
				folderNode.href = uriTemplate.expand({resource: folder.Location}); //$NON-NLS-0$
			}
			return folderNode;
		},
		updateRow: function(item, tableRow){
			if(!tableRow){
				return;
			}
			lib.empty(tableRow);
			var i = 0;
			var cell = this.getCellElement(i, item, tableRow);
			while(cell){
				tableRow.appendChild(cell);
				if (i===0) {
					if(this.getPrimColumnStyle){
						cell.classList.add(this.getPrimColumnStyle()); //$NON-NLS-0$
					} else {
						cell.classList.add("navColumn"); //$NON-NLS-0$
					}
				} else {
					if(this.getSecondaryColumnStyle){
						cell.classList.add(this.getSecondaryColumnStyle()); //$NON-NLS-0$
					} else {
						cell.classList.add("secondaryColumn"); //$NON-NLS-0$
					}
				}
				cell = this.getCellElement(++i, item, tableRow);
			}
		},
		
		getCellElement: function(col_no, item, tableRow){
			if((item.Dependency || item.type==="ProjectRoot") && col_no===0){
				var col = document.createElement('td'); //$NON-NLS-0$
				col.className = item.type==="ProjectRoot" ? "projectNavColumn projectPrimaryNavColumn" : "projectNavColumn";
				var span = document.createElement("span"); //$NON-NLS-0$
				span.id = tableRow.id+"MainCol"; //$NON-NLS-0$
				span.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
				col.appendChild(span);
				col.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
				span.className = "mainNavColumn projectInformationNode"; //$NON-NLS-0$
					// defined in ExplorerRenderer.  Sets up the expand/collapse behavior
				var image = this.getExpandImage(tableRow, span);
				var nameText = item.Dependency ? item.Dependency.Name : (item.Project ? item.Project.Name : item.Name);
				var itemNode = document.createElement("a");
				if(item.disconnected){
					nameText += " (disconnected)";
				} else {
					if(item.Dependency && item.FileMetadata){
						itemNode.href = uriTemplate.expand({ //$NON-NLS-0$
							resource: item.FileMetadata.Location
						});
					} else if(item.Location){
						itemNode.href = uriTemplate.expand({ //$NON-NLS-0$
							resource: item.Location
						});
					}
				}
				itemNode.appendChild(document.createTextNode(nameText));
				
				if(item.Dependency){
					var actions = document.createElement("span");
					actions.className = "mainNavColumn"; //$NON-NLS-0$
					actions.style.cssFloat = "right";
					this.explorer.commandRegistry.renderCommands("dependencyCommands", actions, item, this, "tool");
					col.appendChild(actions);
				}
	
				span.appendChild(itemNode);
				this.explorer._makeDropTarget(item, itemNode);
				this.explorer._makeDropTarget(item, tableRow);

				// orion.explorers.FileExplorer#getNameNode
				itemNode.id = tableRow.id + "NameLink"; //$NON-NLS-0$

				return col;
			}
			return NavigatorRenderer.prototype.getCellElement.call(this, col_no, item, tableRow);
		}
	});
	
		
	function ProjectNavRenderer(options){
		this.parentNode = options.parentNode;
		this.serviceRegistry = options.serviceRegistry;
	}
	
	ProjectNavRenderer.prototype = {
		render: function(projectData){

		var projectInfoNode = document.createElement("div");
		projectInfoNode.id = "projectInfoNode";
		var a = document.createElement("a");
		a.style.color = "black";
		a.href = uriTemplate.expand({ //$NON-NLS-0$
				resource: projectData.ContentLocation
			});
		
		this.parentNode.appendChild(projectInfoNode);
		
		},
		constructor: ProjectNavRenderer
	};
	
	function ProjectNavExplorer(params){
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.parentId = params.parentId;
		this.parentNode = params.parentNode;
		this.toolbarNode = params.toolbarNode;
		this.serviceRegistry = params.serviceRegistry;
		this.projectClient = params.projectClient;
		this.renderer = new ProjectNavRenderer({
												parentNode:this.parentNode,
												serviceRegistry: this.serviceRegistry
											});
		this.rendererFactory = params.rendererFactory;
		params.parentId = "projectInfoNode";
		this.addActionsScope = this.toolbarNode.id + "Add"; //$NON-NLS-0$
		params.newActionsScope = this.addActionsScope;
		this.selectionActionsScope = params.selectionActionsScope = "filesSectionSelectionArea";
		this.fileExplorer = new FilesNavExplorer(params, this);
		this.explorer = null;
		this.createToolbar();
		this.registerCommands();
	}
	
	ProjectNavExplorer.prototype = {
		display: function(fileMetadata, redisplay){
		
		if(!fileMetadata){
			return;
		}
		
		this.fileMetadata = fileMetadata;
		var that = this;
		
		var parentProject;
		if (fileMetadata && fileMetadata.Parents && fileMetadata.Parents.length===0){
			parentProject = fileMetadata;
		} else if(fileMetadata && fileMetadata.Parents){
			parentProject = fileMetadata.Parents[fileMetadata.Parents.length-1];
		}
		
		if(!redisplay &&  parentProject && parentProject.Location === this.projectLocation){
			return;
		}
		this.fileClient.loadWorkspace().then(function(workspaceMetadata){
		this.projectClient.readProject(fileMetadata, workspaceMetadata).then(function(projectData){
			if(projectData) {
				projectData.Workspace = workspaceMetadata;
				lib.empty(this.parentNode);
				this.projectLocation = parentProject ? parentProject.Location : null;
				projectData.type = "Project";
				projectData.Directory = true;
				
				if(projectData.Dependencies){
					for(var i=0; i<projectData.Dependencies.length; i++){
						(function(dependency_no){
							this.projectClient.getDependencyFileMetadata(projectData.Dependencies[i], projectData.WorkspaceLocation).then(function(dependencyMetadata){
								this.fileExplorer.changedItem({Dependency: projectData.Dependencies[dependency_no], FileMetadata: dependencyMetadata, Location: dependencyMetadata.Location, ChildrenLocation: dependencyMetadata.ChildrenLocation}, true);
								return;
							}.bind(this), function(error){
								this.fileExplorer.changedItem({Dependency: projectData.Dependencies[dependency_no], disconnected: true});
							}.bind(this));
						}.bind(this))(i);
					}
				}
				this.renderer.render(projectData);
				this.fileExplorer.loadRoot(projectData, redisplay).then(function(){
					setTimeout(function(){ //The root might not have been loaded yet
						that.fileExplorer.expandToItem.bind(that.fileExplorer)(fileMetadata,function(){
								that.fileExplorer.reveal.bind(that.fileExplorer)(fileMetadata);
							});
					}, 500);
				});
			} else {
				lib.empty(this.parentNode);
				this.projectLocation = null;

				if(parentProject){
					var noProject = document.createElement("div"); //$NON-NLS-0$
					noProject.classList.add("noFile"); //$NON-NLS-0$
					noProject.textContent = messages["NoProject"];
					var plusIcon = document.createElement("span"); //$NON-NLS-0$
					plusIcon.classList.add("core-sprite-initproject"); //$NON-NLS-0$
					plusIcon.classList.add("icon-inline"); //$NON-NLS-0$
					plusIcon.classList.add("imageSprite"); //$NON-NLS-0$
					var projectName = document.createElement("b");
					projectName.appendChild(document.createTextNode(parentProject.Name));
					lib.processDOMNodes(noProject, [projectName, plusIcon]);
					this.parentNode.appendChild(noProject);
					parentProject.type = "Folder";
					ProjectCommands.updateNavTools(this.serviceRegistry, this.commandRegistry, this, this.addActionsScope, this.selectionActionsScope, parentProject, true);
					
				}
			}
		}.bind(this));
		}.bind(this));
		},
		createToolbar : function(){
			var elem = document.createElement("ul"); //$NON-NLS-0$
			elem.id = this.addActionsScope;
			elem.classList.add("commandList"); //$NON-NLS-0$
			elem.classList.add("layoutLeft"); //$NON-NLS-0$
			elem.classList.add("pageActions"); //$NON-NLS-0$
			this.toolbarNode.appendChild(elem);
		},
		changedItem: function(fileMetadata){
			if(fileMetadata){
				this.display(fileMetadata);
				return;
			}
			this.display(this.fileMetadata, true);
		},
		registerCommands : function(){
			var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.serviceRegistry;
			commandRegistry.addCommandGroup(this.addActionsScope, "orion.projectNavInitGroup", 1001, "Init Project", null, null, "core-sprite-initproject"); //$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.registerCommandContribution(this.addActionsScope, "orion.project.initProject", 1, "orion.projectNavInitGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			
			ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, this.projectClient);
		},
		updateCommands: function(treeRoot) {

		},
		destroy : function(){
			if (this.fileExplorer) {
				this.fileExplorer.destroy();
				this.fileExplorer = null;
			}
		},
		constructor: ProjectNavExplorer
	};

	

	/**
	 * @name orion.sidebar.ProjectNavViewMode
	 * @class
	 */
	function ProjectNavViewMode(params) {
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.parentNode = params.parentNode;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.serviceRegistry = params.serviceRegistry;
		this.projectClient = this.serviceRegistry.getService("orion.project.client");
		this.scopeUp = params.scopeUp;
		this.explorer = null;
		var _self = this;
		if(this.sidebarNavInputManager){
			this.navInputListener = function(event) {
				_self.navigatorInput = event.input;
			};
			this.sidebarNavInputManager.addEventListener("InputChanged", this.navInputListener); //$NON-NLS-0$
		}
	}
	objects.mixin(ProjectNavViewMode.prototype, {
		label: messages["Project"],
		create: function() {
			var _self = this;
			this.explorer = new ProjectNavExplorer({
				commandRegistry: this.commandRegistry,
				dragAndDrop: FileCommands.uploadFile,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				parentNode: this.parentNode,
				projectClient: this.projectClient,
				rendererFactory: function(explorer) {
					var renderer = new FilesNavRenderer({
						checkbox: false,
						cachePrefix: "ProjectNav"}, explorer, _self.commandRegistry, _self.contentTypeRegistry); //$NON-NLS-0$
					return renderer;
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode,
				scopeUp: this.scopeUp
			});
			// If there is a target in the navigator, open this target
			if(this.editorInputManager.getFileMetadata()){
				this.explorer.display(this.editorInputManager.getFileMetadata());
			} else {
				this.fileClient.loadWorkspace(this.navigatorInput, true).then(function(fileMetadata){
					_self.explorer.display(fileMetadata);
				}, function(error){
					_self.serviceRegistry.getService("orion.page.progress").setProgressResult(error);
				});				
			}
		},
		destroy: function() {
			if (this.explorer) {
				this.explorer.destroy();
			}
			this.explorer = null;
		}
	});

	return ProjectNavViewMode;
});
