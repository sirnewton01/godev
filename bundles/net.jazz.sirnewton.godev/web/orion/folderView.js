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
	'orion/Deferred',
	'orion/projects/projectView',
	// BEGIN GODEV CUSTOMIZATIONS
	'orion/xhr',
	// END GODEV CUSTOMIZATION
	'orion/section'
], function(messages, mGlobalCommands, mExplorerTable, mNavigatorRenderer, Selection, FileCommands, ExtensionCommands, mKeyBinding, mMarkdownView, mProjectEditor, PageUtil, URITemplate, lib, objects, Deferred, mProjectView,
// BEGIN GODEV CUSTOMIZATIONS
xhr,
// END GODEV CUSTOMIZATIONS
mSection) {
	
	var FileExplorer = mExplorerTable.FileExplorer;
	var KeyBinding = mKeyBinding.KeyBinding;
	var NavigatorRenderer = mNavigatorRenderer.NavigatorRenderer;
	
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	function FolderNavRenderer() {
		NavigatorRenderer.apply(this, arguments);
	}
	FolderNavRenderer.prototype = Object.create(NavigatorRenderer.prototype);
	objects.mixin(FolderNavRenderer.prototype, {
		showFolderImage: true,
		/**
		 * override NavigatorRenderer's prototype
		 */
		createFolderNode: function(folder) {
			var folderNode = mNavigatorRenderer.NavigatorRenderer.prototype.createFolderNode.call(this, folder);
			if (this.showFolderLinks && folderNode.tagName === "A") { //$NON-NLS-0$
				folderNode.href = uriTemplate.expand({resource: folder.Location}); //$NON-NLS-0$
			}
			folderNode.classList.add("folderNavFolder"); //$NON-NLS-0$
			folderNode.classList.add("navlink"); //$NON-NLS-0$
			folderNode.classList.add("targetSelector"); //$NON-NLS-0$
			folderNode.classList.remove("navlinkonpage"); //$NON-NLS-0$
			if (this.explorer.readonly && this.explorer.clickHandler) { //$NON-NLS-0$
				folderNode.href = "javascript:void(0)";
				folderNode.addEventListener("click", function(){this.explorer.clickHandler(folder.Location);}.bind(this)
				, false);
			}
			return folderNode;
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		updateFileNode: function(file, fileNode, isImage) {
			mNavigatorRenderer.NavigatorRenderer.prototype.updateFileNode.call(this, file, fileNode, isImage);
			if (this.explorer.readonly && fileNode.tagName === "A") { //$NON-NLS-0$
				if(this.explorer.clickHandler){
					fileNode.href = "javascript:void(0)";
					fileNode.addEventListener("click", function(){this.explorer.clickHandler(file.Location);}.bind(this)
					, false);
				} else {
					fileNode.href = uriTemplate.expand({resource: file.Location});
				}
			}
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		getCellHeaderElement: function(col_no) {
			if(this.explorer.breadCrumbMaker) {
				return null;
			}
			var td;
			if (col_no === 0) {
				td = document.createElement("th"); //$NON-NLS-0$
				td.colSpan = 1;
				var root = this.explorer.treeRoot;
				td.appendChild(document.createTextNode(root.Parents ? root.Name : this.explorer.fileClient.fileServiceName(root.Location)));
				return td;
			}
			return null;
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		emptyCallback: function(bodyElement) {
			if (this.explorer.readonly) {
				return;
			}
			mNavigatorRenderer.NavigatorRenderer.prototype.emptyCallback.call(this, bodyElement);
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		getExpandImage: function() {
			return null;
		}
	});
	
	function FolderNavExplorer(options) {
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
		this.readonly = options.readonly;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.clickHandler = options.clickHandler;
		this.treeRoot = {};
		this.parent = lib.node(options.parentId);	
		this.toolbarId = this.parent.id + "Tool"; //$NON-NLS-0$
		this.newActionsScope = this.parent.id + "NewScope"; //$NON-NLS-0$
		this.selectionActionsScope = this.parent.id + "SelectionScope"; //$NON-NLS-0$
		this.actionsSections = [this.newActionsScope, this.selectionActionsScope];
	}
	FolderNavExplorer.prototype = Object.create(FileExplorer.prototype);
	objects.mixin(FolderNavExplorer.prototype, /** @lends orion.FolderNavExplorer.prototype */ {
		loadRoot: function(root) {
			if (root) {
				this.load(root, "Loading " + root.Name).then(this.loaded.bind(this));
			} else {
				this.loadResourceList(PageUtil.matchResourceParameters().resource + "?depth=1", false).then(this.loaded.bind(this)); //$NON-NLS-0$
			}
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
			if(serviceRegistry) {
				FileCommands.createFileCommands(serviceRegistry, commandRegistry, this, fileClient);
			}
			return serviceRegistry ? ExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, selectionActionsScope, 0, "orion.folderNavSelectionGroup", true, this.commandsVisibleWhen, this.commandsId) : new Deferred().resolve();
		},
		updateCommands: function(selections) {
			if(this.serviceRegistry) {
				FileCommands.updateNavTools(this.serviceRegistry, this.commandRegistry, this, this.newActionsScope, this.selectionActionsScope, this.treeRoot, true);
			}
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
		this._metadata = options.metadata;
		this.fileClient = options.fileService;
		this.progress = options.progressService;
		this.serviceRegistry = options.serviceRegistry;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.preferences = options.preferences;
		this.readonly = typeof options.readonly === 'undefined' ? false : options.readonly;
		this.showProjectView = typeof options.showProjectView === 'undefined' ? true : options.showProjectView;
		this.showFolderNav = true;
		this.readmeHeaderClass = options.readmeHeaderClass;
		this.editorView = options.editorView;
		this._maxEditorHeight = options.maxEditorHeight;
		this.imageView = options.imageView;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.clickHandler = options.clickHandler;
		this._init();
	}
	FolderView.prototype = /** @lends orion.FolderView.prototype */ {
		_init: function(){
			if(this.serviceRegistry && this.serviceRegistry.getServiceReferences("orion.projects").length===0){
				this.showProjectView = false;
			}
			this.markdownView = new mMarkdownView.MarkdownView({
				fileClient : this.fileClient,
				canHide: !this.readonly,
				progress : this.progress
			});
			if(this.showProjectView){
				this.projectEditor = new mProjectEditor.ProjectEditor({
					fileClient : this.fileClient,
					progress : this.progress,
					serviceRegistry: this.serviceRegistry,
					commandRegistry: this.commandRegistry,
					preferences: this.preferences
				});
				this.projectView = new mProjectView.ProjectView({
					fileClient : this.fileClient,
					progress : this.progress,
					serviceRegistry: this.serviceRegistry,
					commandRegistry: this.commandRegistry
				});
			}
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if(mainSplitter) {
				mGlobalCommands.getMainSplitter().splitter.addEventListener("toggle", this._splitterToggleListener = function(e) { //$NON-NLS-0$
					[this.markdownView, this.projectEditor, this.projectView, this.folderNavExplorer].forEach(function(view) {
						if (view && view.setCommandsVisible) {
							view.setCommandsVisible(e.closed);
						}
					});
				}.bind(this));
			}
		},
		_isCommandsVisible: function() {
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if(mainSplitter) {
				return mainSplitter.splitter.isClosed();
			}
			return !this.readonly;
		},
		displayWorkspaceView: function(){
			var _self = this;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
			
			// BEGIN GODEV CUSTOMIZATION
			
			// In the case of the directory make sure to set focus to
			//  the main div so that users can scroll immediately and tab
			//  through the contents (tables, etc.)
			var tabIndex = this._parent.getAttribute("tabindex");
			
			if (!tabIndex || tabIndex === "") {
				this._parent.setAttribute("tabindex", "0");
			}
			
			this._parent.focus();
			
			// END GODEV CUSTOMIZATION
			
			if(this.showProjectView){
				var div = document.createElement("div"); //$NON-NLS-0$
				_self._node.appendChild(div);
				this.projectView.display(this._metadata, div);
				this.projectView.setCommandsVisible(this._isCommandsVisible());
			}
		},
		displayFolderView: function(root){
			var children = root.Children;
			var projectJson;
			var readmeMd;
			// BEGIN GODEV CUSTOMIZATION
			var goFiles;
			var goTestFiles;
			// END GODEV CUSTOMIZATION
			
			if(children) {
				for (var i=0; i<children.length; i++) {
					var child = children[i];
					if (!child.Directory && child.Name === "project.json") { //$NON-NLS-0$
						projectJson = child;
					}
					if (!child.Directory && child.Name && child.Name.toLowerCase() === "readme.md") { //$NON-NLS-0$
						readmeMd = child;
					}

					// BEGIN GODEV CUSTOMIZATION
					if (!goFiles && !child.Directory && child.Name.match(/\.go$/)) {
						goFiles = true;
					}
					if (!goTestFiles && !child.Directory && child.Name.match(/_test\.go$/)) {
						goTestFiles = true;
					}
					// END GODEV CUSTOMIZATION
				}
			}
			var div;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
			
			// BEGIN GODEV CUSTOMIZATION
			
			// In the case of the directory make sure to set focus to
			//  the main div so that users can scroll immediately and tab
			//  through the contents (tables, etc.)
			var tabIndex = this._parent.getAttribute("tabindex");
			
			if (!tabIndex || tabIndex === "") {
				this._parent.setAttribute("tabindex", "0");
			}
			
			this._parent.focus();
			
			//// Go Build
			var buildGoBuild = function(node) {
				var div2 = document.createElement("div"); //$NON-NLS-0$
				// TODO clone and customize the style class
				div2.className = "sectionWrapper toolComposite";
				
				var div = document.createElement("div");
				div.className = "sectionTable";
				div.setAttribute("style", "");
				
				var header = document.createElement("div");
				var s = document.createElement("span");
				s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-openarrow");
				s.setAttribute("style", "cursor: pointer;");
				header.appendChild(s);
				var d = document.createElement("div");
				d.appendChild(document.createTextNode("Go Build"));
				d.setAttribute("class", "sectionAnchor sectionTitle layoutLeft");
				d.setAttribute("style", "cursor: pointer;");
				header.appendChild(d);
				div2.appendChild(header);
				
				var f = function(evt) {
					if (div.getAttribute("style") === "") {
						div.setAttribute("style", "display: none;");
						s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-closedarrow");
					} else {
						div.setAttribute("style", "");
						s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-openarrow");
					}
				}
				
				s.addEventListener("click", f);
				d.addEventListener("click", f);
				
				var tools = document.createElement("ul");
				tools.setAttribute("class", "commmandList layoutRight");
				
				var refresh = document.createElement("button");
				refresh.setAttribute("class", "commandImage orionButton");
				refresh.setAttribute("aria-label", "Rebuild");
				
				var refreshImg = document.createElement("span");
				refreshImg.setAttribute("class", "commandSprite core-sprite-start");
				refresh.appendChild(refreshImg);
				tools.appendChild(refresh);
				header.appendChild(tools);
				
				var table = document.createElement("table");
				var tr = document.createElement("tr");
				table.appendChild(tr);
				var td = document.createElement("td");
				var content = document.createElement("div");
				
				if (root.Location.length > 6) {
					var pkg = root.Location.substring(6);
					pkg = pkg.replace("GOROOT/", "");
					
					var doRefresh = function(e) {
					div2.setAttribute("style", "");
					content.innerHTML = "Loading...";	
					
					xhr("GET", "/go/build?pkg=" + pkg,  {
						headers: {},
						timeout: 60000
					}).then(function (result) {
						var errors = JSON.parse(result.response);
						
						content.innerHTML = "";
						
						if (errors === null) {
							var success = document.createElement("img");
							success.src = "/images/success.png";
							content.appendChild(success);
							
							var text = document.createElement("span");
							text.innerHTML = " BUILD SUCCEEDED";
							content.appendChild(text);
						} else {
							div2.setAttribute("style", "background: #F33A3A; color: white;");
							var table = document.createElement("table");
							var tr;
							var icon;
							var locColumn;
							var locAnchor;
							var lineColumn;
							var msgColumn;
							var fileName;
							
							tr = document.createElement("tr");
							locColumn = document.createElement("th");
							locColumn.innerHTML = "File";
							tr.appendChild(locColumn);
							lineColumn = document.createElement("th");
							lineColumn.innerHTML = "Line";
							tr.appendChild(lineColumn);
							msgColumn = document.createElement("th");
							msgColumn.innerHTML = "Error Details";
							tr.appendChild(msgColumn);
							table.appendChild(tr);
							
							for (var idx = 0; idx < errors.length; idx++) {
								tr = document.createElement("tr");
								
								locColumn = document.createElement("td");
								icon = document.createElement("img");
								icon.src = "/images/error.png";
								locColumn.appendChild(icon);
								
								locAnchor = document.createElement("a");
								locAnchor.href = "/edit/edit.html#" + errors[idx].Location + ",line=" + errors[idx].Line;
								
								fileName = errors[idx].Location.split("/");
								fileName = fileName[fileName.length-1];
								locAnchor.innerHTML = " " + fileName;
								
								locAnchor.target="_blank";
								locColumn.appendChild(locAnchor);
								tr.appendChild(locColumn);
								
								lineColumn = document.createElement("td");
								lineColumn.innerHTML = "" + errors[idx].Line;
								tr.appendChild(lineColumn);
								
								msgColumn = document.createElement("td");
								msgColumn.innerHTML = "" + errors[idx].Msg;
								tr.appendChild(msgColumn);
								
								table.appendChild(tr);
							}
							
							content.appendChild(table);
						}
					}, function (error) {
						content.innerHTML = "ERROR";
					});
					};
					
					doRefresh();
					
					refresh.addEventListener("click", doRefresh);
				}
				
				td.appendChild(content);
				tr.appendChild(td);
				div.appendChild(table);
				node.appendChild(div2);
				node.appendChild(div);
			};
			
			//// Go Test
			var buildGoTest = function(node) {
				var div = document.createElement("div"); //$NON-NLS-0$
				// TODO clone and customize the style class
				div.className = "sectionTable";
				div.setAttribute("style", "");
				
				var div2 = document.createElement("div");
				div2.className = "sectionWrapper toolComposite";
				
				var header = document.createElement("div");
				var s = document.createElement("span");
				s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-openarrow");
				s.setAttribute("style", "cursor: pointer;");
				header.appendChild(s);
				var d = document.createElement("div");
				d.appendChild(document.createTextNode("Go Test"));
				d.setAttribute("class", "sectionAnchor sectionTitle layoutLeft");
				d.setAttribute("style", "cursor: pointer;");
				header.appendChild(d);
				div2.appendChild(header);
				
				var f = function(evt) {
					if (div.getAttribute("style") === "") {
						div.setAttribute("style", "display: none;");
						s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-closedarrow");
					} else {
						div.setAttribute("style", "");
						s.setAttribute("class", "modelDecorationSprite layoutLeft sectionTitleTwistie core-sprite-openarrow");
					}
				}
				
				s.addEventListener("click", f);
				d.addEventListener("click", f);
				
				var tools = document.createElement("ul");
				tools.setAttribute("class", "commmandList layoutRight");
				
				var race = false;
				
				var raceButton = document.createElement("button");
				raceButton.setAttribute("class", "commandImage orionButton");
				raceButton.setAttribute("title", "Enable the race detector");
				
				var raceButtonImg = document.createElement("span");
				raceButtonImg.setAttribute("class", "commandSprite core-sprite-check");
				raceButton.appendChild(raceButtonImg);
				tools.appendChild(raceButton);
				
				raceButton.addEventListener("click", function(e) {
					if (!race) {
						raceButtonImg.setAttribute("class", "commandSprite core-sprite-check_on");
						race = true;	
					} else {
						raceButtonImg.setAttribute("class", "commandSprite core-sprite-check");
						race = false;	
					}
				});
				
				var refresh = document.createElement("button");
				refresh.setAttribute("class", "commandImage orionButton");
				refresh.setAttribute("aria-label", "Rebuild");
				
				var refreshImg = document.createElement("span");
				refreshImg.setAttribute("class", "commandSprite core-sprite-start");
				refresh.appendChild(refreshImg);
				tools.appendChild(refresh);
				
				header.appendChild(tools);
				
				var table = document.createElement("table");
				var tr = document.createElement("tr");
				table.appendChild(tr);
				var td = document.createElement("td");
				var content = document.createElement("div");
				
				if (root.Location.length > 6) {
					var pkg = root.Location.substring(6);
					pkg = pkg.replace("GOROOT/", "");
					
					var doRefresh = function(e) {
					td.removeChild(content);
					content = document.createElement("div");
					td.appendChild(content);
					
					div2.setAttribute("style", "");

					var wsUrl = document.URL.replace("http://", "ws://") + "output";
					wsUrl = wsUrl.replace("https://", "wss://");
					wsUrl = wsUrl.substring(0, wsUrl.indexOf("/edit/edit.html#/file"));
					wsUrl = wsUrl + "/test?pkg=" +pkg;
					
					if (race) {
						wsUrl = wsUrl + "&race=true";
					}
					
					var table;
					
					function showError(data) {
						var errorMsg = JSON.parse(data);
						
						var success = document.createElement("img");
						success.src = "/images/failure.png";
						content.appendChild(success);
							
						var text = document.createElement("span");
						text.innerHTML = " TEST ERROR: " + errorMsg;
						content.appendChild(text);
					}
					
					var websocket = new WebSocket(wsUrl);
					websocket.onopen = function(evt) {
						table = document.createElement("table");
						var tr;
						var icon;
						var testIconColumn;
						var testNameColumn;
						var testDurationColumn;
						
						tr = document.createElement("tr");
						
						testIconColumn = document.createElement("th");
						tr.appendChild(testIconColumn);
						
						testNameColumn = document.createElement("th");
						testNameColumn.innerHTML = "Test";
						tr.appendChild(testNameColumn);
						
						testDurationColumn = document.createElement("th");
						testDurationColumn.innerHTML = "Duration (s)";
						tr.appendChild(testDurationColumn);
						
						table.appendChild(tr);
						content.appendChild(table);
					};
					
					websocket.onmessage = function(evt) {
						var data = JSON.parse(evt.data);
						
						// Errors are all strings
						if (typeof data === 'string') {
							showError(evt.data);
						}
																
						if (data.Finished) {
							tr = table.lastChild;
							
							var testNameColumn = tr.childNodes[1];
							var durationColumn = tr.childNodes[2];
							durationColumn.innerHTML = "" + data.Duration;
							var iconColumn = tr.childNodes[0];
							var icon = document.createElement("img");
							icon.setAttribute("style", "margin-left: auto; margin-right: auto; display: block;");
							iconColumn.appendChild(icon);
							
							if (data.Pass) {
								icon.src = "/images/success.png";
							} else {
								div2.setAttribute("style", "background: #F33A3A; color: white;");
								icon.src = "/images/error.png";
							}
						} else if (data.Log) {
							tr = table.lastChild;
							
							var messageDiv = document.createElement("div");
							messageDiv.style.textIndent = "1em";
							messageDiv.style.fontStyle = "italic";
							
							var locAnchor = document.createElement("a");
							locAnchor.href = "/edit/edit.html#" + data.Location + ",line=" + data.Line;
							locAnchor.target = "_blank";
							
							var fileName = data.Location.split("/");
							fileName = fileName[fileName.length-1];
							locAnchor.innerHTML = fileName + ":" + data.Line + " ";
							
							var msgSpan = document.createElement("span");
							msgSpan.innerHTML = data.Message;
							
							messageDiv.appendChild(locAnchor);
							messageDiv.appendChild(msgSpan);
							tr.childNodes[1].appendChild(messageDiv);
						} else if (data.Start) {
							var testNameColumn = document.createElement("td");
							testNameColumn.innerHTML = data.TestName;
						
							tr = document.createElement("tr");
							
							var iconColumn = document.createElement("td");
							iconColumn.src = "/images/progress_running.gif";
							
							tr.appendChild(iconColumn);
							tr.appendChild(testNameColumn);
							tr.appendChild(document.createElement("td"));
							
							table.appendChild(tr);
						} else if (data.Complete) {
							tr = document.createElement("tr");
							var iconColumn = document.createElement("td");
							var testNameColumn = document.createElement("td");
							testNameColumn.innerHTML = "TESTS COMPLETE";
							var durationColumn = document.createElement("td");
							durationColumn.innerHTML = "" + data.Duration;
							
							tr.appendChild(iconColumn);
							tr.appendChild(testNameColumn);
							tr.appendChild(durationColumn);
							
							table.appendChild(tr);
							
							if (div2.getAttribute("style") === "") {
								div2.setAttribute("style", "background: darkgreen; color: white;");
							}
						} else if (data.length && data.length > 0 && data[0].Entries) {
							var idx;
							var idx2;
							var idx3;
							
							var location;
							var line;
							
							for (idx = 0; idx < data.length; idx++) {
								tr = document.createElement("tr");
								iconColumn = document.createElement("td");
								testNameColumn = document.createElement("td");
								durationColumn = document.createElement("td");
								
								icon = document.createElement("img");
								icon.setAttribute("style", "margin-left: auto; margin-right: auto; display: block;");
								iconColumn.appendChild(icon);
								
								div2.setAttribute("style", "background: #F33A3A; color: white;");
								icon.src = "/images/chequered_flag.svg";
								icon.style.width = "30px";
								icon.style.height = "30px";
								
								tr.appendChild(iconColumn);
								tr.appendChild(testNameColumn);
								tr.appendChild(durationColumn);
								
								table.appendChild(tr);
								
								messageDiv = document.createElement("div");
								messageDiv.innerHTML = "DATA RACE:";
								testNameColumn.appendChild(messageDiv);
								
								for (idx2=0; idx2 < data[idx].Entries.length; idx2++) {
									messageDiv = document.createElement("div");
									messageDiv.style.textIndent = "1em";
									messageDiv.style.fontStyle = "italic";
									messageDiv.innerHTML = data[idx].Entries[idx2].Summary;
									testNameColumn.appendChild(messageDiv);
									
									for (idx3=0; idx3 < data[idx].Entries[idx2].Location.length; idx3++) {
										location = data[idx].Entries[idx2].Location[idx3].split(":")[0];
										line = data[idx].Entries[idx2].Location[idx3].split(":")[1];
									
										messageDiv = document.createElement("div");
										messageDiv.style.textIndent = "2em";
										messageDiv.style.fontStyle = "italic";
										
										locAnchor = document.createElement("a");
										locAnchor.href = "/edit/edit.html#/file" + location + ",line=" + line;
										locAnchor.target = "_blank";
										
										fileName = location.split("/");
										fileName = fileName[fileName.length-1];
										locAnchor.innerHTML = fileName + ":" + line + " ";
										
										messageDiv.appendChild(locAnchor);
										
										testNameColumn.appendChild(messageDiv);
									}
								}
							}
						}
					};
					websocket.onerror = function(evt) {
						showError(evt.data);
					};
				};
				}
				
				refresh.addEventListener("click", doRefresh);
				
				td.appendChild(content);
				tr.appendChild(td);
				div.appendChild(table);
				node.appendChild(div2);
				node.appendChild(div);
			};

			///// GODOC
			var buildGoDoc = function (node) {
				// First, add the special godoc style to the body
				var linkElement = document.createElement("link");
				linkElement.setAttribute("type", "text/css");
				linkElement.setAttribute("ref", "stylesheet");
				linkElement.setAttribute("href", "/godev/godoc/style.css");
				document.body.appendChild(linkElement);
				
				var div2 = document.createElement("div");
				div2.className = "sectionWrapper toolComposite";
				
				var div = document.createElement("div"); //$NON-NLS-0$
				// TODO clone and customize the style class
				div.className = "sectionTable";				
				
				var godocPageLink = document.createElement("a");
				godocPageLink.innerHTML = "Go Doc";
				div2.appendChild(godocPageLink);
				
				var table = document.createElement("table");
				var tr = document.createElement("tr");
				table.appendChild(tr);
				var td = document.createElement("td");
				var content = document.createElement("div");
				
				content.innerHTML = "Loading...";
				
				if (root.Location.length > 6) {
					var pkg = root.Location.substring(6);
					pkg = pkg.replace("GOROOT/", "");
					
					godocPageLink.href="/godoc/pkg/"+pkg;
					
					xhr("GET", "/godoc/pkg/" + pkg,  {
						headers: {},
						timeout: 60000
					}).then(function (result) {
						var resp = result.response;
						
						// Strip out the html header and footer
						resp = resp.substring(resp.indexOf("<!-- BEGIN -->"));
						resp = resp.substring(0, resp.indexOf("<!-- END -->"));
						
						// Convert intra-document references and anchors
						//  to work with the fragment that the folder viewer
						//  uses to represent the current folder.
						var pieces = resp.split('<a href="');
						var idx2 = -1;
						var refs = {};
						
						var fragment = document.URL.substring(document.URL.indexOf("#")+1);
						if (fragment.indexOf(",") !== -1) {
							fragment = fragment.substring(0, fragment.indexOf(","));
						}
						
						for (var idx = 1; idx < pieces.length; idx++) {
							idx2 = pieces[idx].indexOf('"');
							
							var href = pieces[idx].substring(0,idx2);
							
							// Fragment reference
							if (href.indexOf('#') === 0) {
								var name = href.substring(1);
								refs[name] = fragment + "," + name;
								
								pieces[idx] = "#" + refs[name] + pieces[idx].substring(idx2);
							// Inter-godoc reference
							} else if (href.indexOf('://') === -1 && href.charAt(0) !== '/') {
								pieces[idx] = "/godoc/pkg/" + pkg + "/" + href + pieces[idx].substring(idx2);
							}
						}
						
						resp = pieces.join('<a href="');
						
						var val;
						for (var key in refs) {
							resp = resp.replace(new RegExp('id="' + key + '"', "g"), 'id="' + refs[key] + '"');
						}
						
						content.innerHTML = resp;
						
						// Delete all of the uncollapsed now that they are incorporated into the
						//  page's DOM
						if (document.getElementsByClassName) {
							var elements = document.getElementsByClassName('toggleButton');
							
							for (idx = 0; idx < elements.length; idx++) {
								elements[idx].parentNode.removeChild(elements[idx]);
							}
						}
						
						// Navigate to the correct element in the DOM based on the
						//  URL fragment.
						var urlPieces = document.URL.split("#");
						if (urlPieces.length === 2) {
							var currentElement = document.getElementById(urlPieces[1]);
							if (currentElement) {
								currentElement.scrollIntoView(true);
							}
						}
					}, function (error) {
						content.innerHTML = "ERROR";
					});
				}
				
				td.appendChild(content);
				tr.appendChild(td);
				div.appendChild(table);
				node.appendChild(div2);
				node.appendChild(div);
			};			
			// END GODEV CUSTOMIZATION
			
			function renderSections(sectionsOrder){
				sectionsOrder.forEach(function(sectionName){
					if(sectionName === "project"){
						if(projectJson && this.showProjectView){
							div = document.createElement("div"); //$NON-NLS-0$
							this.projectEditor.displayContents(div, this._metadata);
							this._node.appendChild(div);
						}
					} else if(sectionName === "folderNav") {
						if (this.showFolderNav) {
							var navNode = document.createElement("div"); //$NON-NLS-0$
							navNode.id = "folderNavNode"; //$NON-NLS-0$
							var foldersSection = new mSection.Section(this._node, {id: "folderNavSection", title: "Files", canHide: !this.readonly});
							if(this.editorView) {//To embed an orion editor in the section
								foldersSection.setContent(this.editorView.getParent());
								this.editorView.create();
								var textView = this.editorView. editor.getTextView();
								textView.getModel().addEventListener("Changed", this._editorViewModelChangedListener = function(e){ //$NON-NLS-0$
									var textViewheight = textView.getLineHeight() * textView.getModel().getLineCount() + 20;
									if(this._maxEditorHeight && this._maxEditorHeight > 0 && textViewheight >this._maxEditorHeight) {
										textViewheight = this._maxEditorHeight;
									}
									this.editorView.getParent().style.height = textViewheight + "px"; //$NON-NLS-0$
								}.bind(this));
								this.editor = this.editorView.editor;
							} else if(this.imageView) {
								foldersSection.setContent(this.imageView.image);
							} else {
								this.folderNavExplorer = new FolderNavExplorer({
									parentId: navNode,
									readonly: this.readonly,
									breadCrumbMaker: this.breadCrumbMaker,
									clickHandler: this.clickHandler,
									serviceRegistry: this.serviceRegistry,
									fileClient: this.fileClient,
									commandRegistry: this.commandRegistry,
									contentTypeRegistry: this.contentTypeRegistry
								});
								foldersSection.embedExplorer(this.folderNavExplorer);
								this.folderNavExplorer.setCommandsVisible(this._isCommandsVisible());
								this.folderNavExplorer.loadRoot(this._metadata);
							}
							if(this.breadCrumbMaker) {
								var tileNode = foldersSection.getTitleElement();
								if(tileNode) {
									lib.empty(tileNode);
									var bcNode = document.createElement("div"); //$NON-NLS-0$
									tileNode.appendChild(bcNode);
									this.breadCrumbMaker(bcNode, foldersSection.getHeaderElement().offsetWidth - 24);
								}
							}
						}
					} else if(sectionName === "readme"){
						if (readmeMd) {
							div = document.createElement("div"); //$NON-NLS-0$
							this.markdownView.displayInFrame(div, readmeMd, this.readmeHeaderClass);
							this._node.appendChild(div);
						}
					}
					
					// BEGIN GODEV CUSTOMIZATION
					else if(sectionName === "goBuild" && goFiles) {
						buildGoBuild(this._node);
					} else if (sectionName === "goTest" && goFiles) {
						buildGoTest(this._node);
					} else if (sectionName === "goDoc" && goFiles) {
						buildGoDoc(this._node);
					}
					// END GODEV CUSTOMIZATION
				}.bind(this));
			}
			
			// BEGIN GODEV CUSTOMIZATION
			var sectionsOrder = ["goBuild","goTest", "project", "folderNav", "readme", "goDoc"];
			// END GODEV CUSTOMIZATION
			
			if(this.editorView) {
				renderSections.apply(this, [sectionsOrder]);
			} else {
				if(this.preferences) {
					this.preferences.getPreferences("/sectionsOrder").then(function(sectionsOrderPrefs){
						sectionsOrder = sectionsOrderPrefs.get("folderView") || sectionsOrder;
						renderSections.apply(this, [sectionsOrder]);
					}.bind(this), function(error){
						renderSections.apply(this, [sectionsOrder]);
						window.console.error(error);
					}.bind(this));
				} else {
					renderSections.apply(this, [sectionsOrder]);
				}
			}
		},
		create: function() {
			if(this._metadata.Projects){ //this is a workspace root
				this.displayWorkspaceView();
			}
			if(this.editorView || this.imageView) {
				this.displayFolderView(this._metadata);
			} else if(this._metadata.Children){
				this.displayFolderView(this._metadata);
			} else if(this._metadata.ChildrenLocation){
				this.progress.progress(this.fileClient.fetchChildren(this._metadata.ChildrenLocation), "Fetching children of " + this._metadata.Name).then(function(children) {
					this._metadata.Children = children;
					this.displayFolderView(this._metadata);
				}.bind(this));
			}
		},
		destroy: function() {
			if(this.editorView) {
				this.editorView. editor.getTextView().getModel().removeEventListener("Changed", this._editorViewModelChangedListener); //$NON-NLS-0$
				this.editorView.destroy();
				this.editor = null;
			}
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if(mainSplitter) {
				mainSplitter.splitter.removeEventListener("toggle", this._splitterToggleListener); //$NON-NLS-0$
			}
			if (this.folderNavExplorer) {
				this.folderNavExplorer.destroy();
			}
			this.folderNavExplorer = null;
			if (this._node && this._node.parentNode) {
				this._node.parentNode.removeChild(this._node);
			}
			if(this.projectView) {
				this.projectView.destroy();
			}
			if(this.projectEditor){
				this.projectEditor.destroy();
			}
			this._node = null;
		}
	};
	return {FolderView: FolderView};
});
