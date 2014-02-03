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
	'orion/explorers/explorer-table',
	'orion/explorers/navigatorRenderer',
	'orion/markdownView', 
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/objects',
	'orion/Deferred',
	'orion/section'
], function(messages, mExplorerTable, mNavigatorRenderer, mMarkdownView, PageUtil, URITemplate, lib, objects, Deferred, mSection) {
	
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
		options.rendererFactory = function(explorer) {
			return new FolderNavRenderer({
				checkbox: false,
				cachePrefix: "FolderNavigator" //$NON-NLS-0$
			}, explorer, options.commandRegistry, options.contentTypeRegistry);
		};
		FileExplorer.apply(this, arguments);
		this.commandsId = ".folderNav"; //$NON-NLS-0$
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
			return new Deferred().resolve();
		},
		updateCommands: function(selections) {
		}
	});
	
	/** 
	 * Constructs a new BrowseView object.
	 * 
	 * @class 
	 * @name orion.BrowseView
	 */
	function BrowseView(options) {
		this._parent = options.parent;
		this._metadata = options.metadata;
		this.fileClient = options.fileService;
		this.progress = options.progressService;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.preferences = options.preferences;
		this.readonly = typeof options.readonly === 'undefined' ? false : options.readonly;
		this.showFolderNav = true;
		this.readmeHeaderClass = options.readmeHeaderClass;
		this.editorView = options.editorView;
		this._maxEditorLines = options.maxEditorLines;
		this.imageView = options.imageView;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.branchSelector = options.branchSelector;
		this.clickHandler = options.clickHandler;
		this._init();
	}
	BrowseView.prototype = /** @lends orion.BrowseView.prototype */ {
		_init: function(){
			this.markdownView = new mMarkdownView.MarkdownView({
				fileClient : this.fileClient,
				canHide: !this.readonly,
				progress : this.progress
			});
		},
		_isCommandsVisible: function() {
			return !this.readonly;
		},
		displayWorkspaceView: function(){
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
				this._node.classList.add("browse_inner_container"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
		},
		displayBrowseView: function(root){
			var children = root.Children;
			var readmeMd;
			if(children) {
				for (var i=0; i<children.length; i++) {
					var child = children[i];
					if (!child.Directory && child.Name && child.Name.toLowerCase() === "readme.md") { //$NON-NLS-0$
						readmeMd = child;
					}
	
				}
			}
			var div;
			if(!this._node){
				this._node = document.createElement("div"); //$NON-NLS-0$
				this._node.classList.add("browse_inner_container"); //$NON-NLS-0$
			}
			this._parent.appendChild(this._node);
			
			function renderSections(sectionsOrder){
				sectionsOrder.forEach(function(sectionName){
					if(sectionName === "folderNav") {
						if (this.showFolderNav) {
							var navNode = document.createElement("div"); //$NON-NLS-0$
							navNode.id = "folderNavNode"; //$NON-NLS-0$
							this._foldersSection = new mSection.Section(this._node, {id: "folderNavSection", title: "Files", canHide: !this.readonly});
							if(this.editorView) {//To embed an orion editor in the section
								this._foldersSection.setContent(this.editorView.getParent());
								this.editorView.getParent().style.height = "30px"; //$NON-NLS-0$
								this.editorView.create();
								var textView = this.editorView. editor.getTextView();
								textView.getModel().addEventListener("Changed", this._editorViewModelChangedListener = function(e){ //$NON-NLS-0$
									var linesToRender = textView.getModel().getLineCount();
									if(this._maxEditorLines && this._maxEditorLines > 0 && linesToRender >this._maxEditorLines) {
										linesToRender = this._maxEditorLines;
									}
									var textViewheight = textView.getLineHeight() * linesToRender + 20;
									this.editorView.getParent().style.height = textViewheight + "px"; //$NON-NLS-0$
								}.bind(this));
								this.editor = this.editorView.editor;
							} else if(this.imageView) {
								//this._foldersSection.setContent(this.imageView.image);
							} else {
								this.folderNavExplorer = new FolderNavExplorer({
									parentId: navNode,
									readonly: this.readonly,
									breadCrumbMaker: this.breadCrumbMaker,
									clickHandler: this.clickHandler,
									fileClient: this.fileClient,
									commandRegistry: this.commandRegistry,
									contentTypeRegistry: this.contentTypeRegistry
								});
								this._foldersSection.embedExplorer(this.folderNavExplorer, null, true);
								this.folderNavExplorer.setCommandsVisible(this._isCommandsVisible());
								this.folderNavExplorer.loadRoot(this._metadata);
							}
							if(this.breadCrumbMaker) {
								var tileNode = this._foldersSection.getTitleElement();
								if(tileNode) {
									lib.empty(tileNode);
									var bcNodeContainer = document.createElement("div"); //$NON-NLS-0$
									bcNodeContainer.classList.add("breadCrumbContainer"); 
									var bcNode = document.createElement("div"); //$NON-NLS-0$
									if(this.branchSelector) {
										tileNode.appendChild(this.branchSelector.node);
									}
									bcNodeContainer.appendChild(bcNode);
									tileNode.appendChild(bcNodeContainer);
									this.breadCrumbMaker(bcNode, this._foldersSection.getHeaderElement().offsetWidth - 150/*branch selector width*/ - 50);
									if(this.branchSelector) {
										this.branchSelector.refresh();
									}
									
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
				}.bind(this));
			}
			
			var sectionsOrder = ["folderNav", "readme"];
			renderSections.apply(this, [sectionsOrder]);
		},
		updateImage: function(image) {
			var imageTable = document.createElement("table");
			imageTable.classList.add("imageViewTable");
			var tr = document.createElement("tr");
			var td = document.createElement("td"); 
			var imageContent = document.createElement("div");
			imageContent.appendChild(image);
			td.appendChild(imageContent);
			tr.appendChild(td);
			imageTable.appendChild(tr);
			this._foldersSection.setContent(imageTable);
		},
		create: function() {
			if(this._metadata.Projects){ //this is a workspace root
				this.displayWorkspaceView();
			}
			if(this.editorView || this.imageView) {
				this.displayBrowseView(this._metadata);
			} else if(this._metadata.Children){
				this.displayBrowseView(this._metadata);
			} else if(this._metadata.ChildrenLocation){
				this.progress.progress(this.fileClient.fetchChildren(this._metadata.ChildrenLocation), "Fetching children of " + this._metadata.Name).then(function(children) {
					this._metadata.Children = children;
					this.displayBrowseView(this._metadata);
				}.bind(this));
			}
		},
		destroy: function() {
			if(this.editorView) {
				this.editorView. editor.getTextView().getModel().removeEventListener("Changed", this._editorViewModelChangedListener); //$NON-NLS-0$
				this.editorView.destroy();
				this.editor = null;
			}
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
	return {BrowseView: BrowseView};
});
