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
	'orion/markdownView', 
	'orion/projects/projectEditor',
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/objects',
	'orion/Deferred',
	'orion/projects/projectView',
	'orion/section'
], function(messages, mGlobalCommands, mExplorerTable, mNavigatorRenderer, Selection, FileCommands, mMarkdownView, mProjectEditor, PageUtil, URITemplate, lib, objects, Deferred, mProjectView, mSection) {
	
	var FileExplorer = mExplorerTable.FileExplorer;
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
				folderNode.href = "javascript:void(0)"; //$NON-NLS-0$
				folderNode.addEventListener("click", function(){this.explorer.clickHandler(folder.Location);}.bind(this), false); //$NON-NLS-0$
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
					fileNode.href = "javascript:void(0)"; //$NON-NLS-0$
					fileNode.addEventListener("click", function(){this.explorer.clickHandler(file.Location);}.bind(this), false); //$NON-NLS-0$
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
				treeTableClass: "sectionTreeTable", //$NON-NLS-0$
				cachePrefix: "FolderNavigator" //$NON-NLS-0$
			}, explorer, options.commandRegistry, options.contentTypeRegistry);
		};
		FileExplorer.apply(this, arguments);
		this.menuBar = options.menuBar;
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.editorInputManager = options.editorInputManager;
		this.readonly = options.readonly;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.clickHandler = options.clickHandler;
		this.treeRoot = {};
		this.parent = lib.node(options.parentId);	
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
		isCommandsVisible: function() {
			if (!this.selection) {
				return false;
			}
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if (mainSplitter) {
				return mainSplitter.splitter.isClosed();
			}
			return !this.readonly;
		},
		scope: function(childrenLocation) {
			window.location.href = uriTemplate.expand({resource: childrenLocation});
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
			return new Deferred().resolve();
		},
		updateCommands: function(selections) {
			if (this.menuBar) {
				this.menuBar.setActiveExplorer(this);
				this.menuBar.updateCommands();
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
		this.menuBar = options.menuBar;
		this.fileClient = options.fileService;
		this.progress = options.progressService;
		this.serviceRegistry = options.serviceRegistry;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.editorInputManager = options.inputManager;
		this.preferences = options.preferences;
		this.readonly = options.readonly === undefined ? false : options.readonly;
		this.showProjectView = options.showProjectView === undefined ? true : options.showProjectView;
		this.showFolderNav = true;
		this.editorView = options.editorView;
		this._maxEditorHeight = options.maxEditorHeight;
		this.imageView = options.imageView;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.clickHandler = options.clickHandler;
		this._init();
	}
	FolderView.prototype = /** @lends orion.FolderView.prototype */ {
		_init: function(){
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
			if(children) {
				for (var i=0; i<children.length; i++) {
					var child = children[i];
					if (!child.Directory && child.Name === "project.json") { //$NON-NLS-0$
						projectJson = child;
					}
					if (!child.Directory && child.Name && child.Name.toLowerCase() === "readme.md") { //$NON-NLS-0$
						readmeMd = child;
					}
	
				}
			}
			var div;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
			
			function renderSections(sectionsOrder, sectionNames){
				sectionsOrder.forEach(function(sectionName){
					if(sectionName === "project"){ //$NON-NLS-0$
						if(projectJson && this.showProjectView){
							div = document.createElement("div"); //$NON-NLS-0$
							this.projectEditor.displayContents(div, this._metadata);
							this._node.appendChild(div);
						}
					} else if(sectionName === "folderNav") { //$NON-NLS-0$
						if (this.showFolderNav) {
							var navNode = document.createElement("div"); //$NON-NLS-0$
							navNode.id = "folderNavNode"; //$NON-NLS-0$
							var title = sectionNames[sectionName] || "Files";
							var foldersSection = new mSection.Section(this._node, {id: "folderNavSection", headerClass: ["sectionTreeTableHeader"], title: title, canHide: !this.readonly}); //$NON-NLS-0$
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
									view: this,
									readonly: this.readonly,
									menuBar: this.menuBar,
									breadCrumbMaker: this.breadCrumbMaker,
									clickHandler: this.clickHandler,
									serviceRegistry: this.serviceRegistry,
									fileClient: this.fileClient,
									editorInputManager: this.editorInputManager,
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
					} else if(sectionName === "readme"){ //$NON-NLS-0$
						if (readmeMd) {
							div = document.createElement("div"); //$NON-NLS-0$
							this.markdownView.displayInFrame(div, readmeMd, ["sectionTreeTableHeader"], null, sectionNames[sectionName]);
							this._node.appendChild(div);
						}
					}
				}.bind(this));
			}
			
			var sectionsOrder = ["project", "folderNav", "readme"]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var	sectionNames = {};
			if(this.editorView) {
				renderSections.apply(this, [sectionsOrder, sectionNames]);
			} else {
				if(this.preferences) {
					this.preferences.getPreferences("/sectionsOrder").then(function(sectionsOrderPrefs){ //$NON-NLS-0$
						sectionNames = sectionsOrderPrefs.get("folderViewNames") || sectionNames;
						sectionsOrder = sectionsOrderPrefs.get("folderView") || sectionsOrder; //$NON-NLS-0$
						renderSections.apply(this, [sectionsOrder, sectionNames]);
					}.bind(this), function(error){
						renderSections.apply(this, [sectionsOrder, sectionNames]);
						window.console.error(error);
					}.bind(this));
				} else {
					renderSections.apply(this, [sectionsOrder, sectionNames]);
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
