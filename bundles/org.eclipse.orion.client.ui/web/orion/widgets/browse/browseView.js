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
	'orion/webui/dropdown',
	'orion/widgets/browse/commitInfoRenderer',
	'orion/section'
], function(messages, mExplorerTable, mNavigatorRenderer, mMarkdownView, PageUtil, URITemplate, lib, objects, Deferred, mDropdown, mCommitInfoRenderer, mSection) {
	
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
				this.explorer.folderViewer.updateMessageContents("This folder is empty.", ["emptyViewTable"], null, true);
				return;
			}
			mNavigatorRenderer.NavigatorRenderer.prototype.emptyCallback.call(this, bodyElement);
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		getExpandImage: function() {
			return null;
		},
		/**
		 * override NavigatorRenderer's prototype
		 */
		getDisplayTime: function(timeStamp) {
			return mCommitInfoRenderer.calculateTime(timeStamp);
		}
	});
	
	function FolderNavExplorer(options) {
		options.setFocus = false;   // do not steal focus on load
		options.cachePrefix = null; // do not persist table state
		options.rendererFactory = function(explorer) {
			return new FolderNavRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				cachePrefix: "FolderNavigator" //$NON-NLS-0$
			}, explorer, options.commandRegistry, options.contentTypeRegistry);
		};
		FileExplorer.apply(this, arguments);
		this.commandsId = ".folderNav"; //$NON-NLS-0$
		this.fileClient = options.fileClient;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.readonly = options.readonly;
		this.folderViewer = options.folderViewer;
		this.editorInputManager = options.editorInputManager;
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
		loaded: function(){
		},
		// Returns a deferred that completes once file command extensions have been processed
		registerCommands: function() {
			return new Deferred().resolve();
		},
		updateCommands: function(selections) {
		},
		setCommandsVisible: function(section, visible) {
			section.actionsNode.style.visibility = visible ? "" : "hidden";
			var selectionPolicy = visible ? null : "cursorOnly"; //$NON-NLS-0$
			this.renderer.selectionPolicy = selectionPolicy;
			var navHandler = this.getNavHandler();
			if (navHandler) {
				navHandler.setSelectionPolicy(selectionPolicy);
			}
			if (visible) {
				this.updateCommands();
			} else {
				if(this.actionsSections) {
					this.actionsSections.forEach(function(id) {
						if(lib.node(id)) {
							this.commandRegistry.destroy(id);
						}
					}.bind(this));
				}
			}
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
		this._browser = options.browser;
		this._metadata = options.metadata;
		this.editorInputManager = options.inputManager;
		this.fileClient = options.fileService;
		this.progress = options.progressService;
		this.commandRegistry = options.commandRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.preferences = options.preferences;
		this.readonly = true;
		this.editorView = options.editorView;
		this._maxEditorLines = options.maxEditorLines;
		this.binaryView = options.binaryView;
		this.messageView = options.messageView;
		this.breadCrumbInHeader = options.breadCrumbInHeader;
		this.isMarkdownView = options.isMarkdownView;
		this.infoDropDownHandlers =  options.infoDropDownHandlers;
		this.snippetShareOptions = options.snippetShareOptions;
		this.breadCrumbMaker = options.breadCrumbMaker;
		this.branchSelector = options.branchSelector;
		this.componentSelector = options.componentSelector;
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
			var children = root && root.Children;
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
						var navNode = document.createElement("div"); //$NON-NLS-0$
						navNode.id = "folderNavNode"; //$NON-NLS-0$
						this._foldersSection = new mSection.Section(this._node, {id: "folderNavSection", headerClass: ["sectionTreeTableHeader"], title: "Browse", canHide: !this.readonly});
						this.sectionContents = document.createElement("div"); //$NON-NLS-0$
						this.sectionContents.classList.add("browseSectionWrapper"); 
						this._foldersSection.setContent(this.sectionContents);
						//Render the action node
						if(!this.messageView && this.infoDropDownHandlers && this.infoDropDownHandlers.length > 0) {
							var actionNode = this._foldersSection.getActionElement();
							if(actionNode) {
								lib.empty(actionNode);
								this._destroyInfoDropDowns();
								var letfNode = document.createElement("div"), rightNode=document.createElement("div");
								letfNode.classList.add("layoutLeft");
								rightNode.classList.add("layoutRight");
								actionNode.appendChild(letfNode);
								actionNode.appendChild(rightNode);
								this.actionNode = rightNode;
								
								this.infoDropDownHandlers.forEach(function(handler) {
									var dropdownHolder = document.createElement("div")
									dropdownHolder.classList.add("infoDropDownHolder");
									letfNode.appendChild(dropdownHolder);
									var range = document.createRange();
									range.selectNode(dropdownHolder);
									var infoFragment = range.createContextualFragment(handler.popupTemplate);
									dropdownHolder.appendChild(infoFragment);
									var infoDropDown = new mDropdown.Dropdown({
										triggerNode: lib.node(handler.triggerNodeId), 
										dropdown: lib.node(handler.dropdownNodeId)
									});
									infoDropDown.getItems = function() {
										var inputNode = lib.node(handler.popupTextAreaId);
										inputNode.value = handler.getTextAreaValue();
										return [inputNode];
									};
									infoDropDown._focusDropdownNode = function() {
										lib.node(handler.popupTextAreaId).select();
									};
									infoDropDown._positionDropdown = function() {
										this._dropdownNode.style.left = "";
										this._dropdownNode.style.top = "";
										this._dropdownNode.style.left = this._triggerNode.offsetLeft + this._triggerNode.offsetWidth - this._dropdownNode.offsetWidth  + "px";
									}.bind(infoDropDown);
									this.infoDropDowns.push(infoDropDown);
								}.bind(this));
							}
						} else if (!this.messageView) {
							this.actionNode =  this._foldersSection.getActionElement();
						}
						if(!this.messageView && this.commandRegistry) {
							this.commandRegistry.renderCommands("orion.browse.sectionActions", this.actionNode, {}, "button");
						}
						//Render the branch and component selector 
						var titleNode = this._foldersSection.getTitleElement();
						if(titleNode) {
							lib.empty(titleNode);
							if(this.branchSelector) {
								titleNode.appendChild(this.branchSelector.parentNode);
								this.branchSelector.refresh();
							}
							if(this.componentSelector) {
								titleNode.appendChild(this.componentSelector.parentNode);
								this.componentSelector.refresh();
							}
							if(this.snippetShareOptions && this.snippetShareOptions.oHref) {
								var titleLink = document.createElement("a"); //$NON-NLS-0$
								titleLink.href = this.snippetShareOptions.oHref;
								titleLink.appendChild(document.createTextNode("Click here to see the original file."));
								titleLink.classList.add("downloadLinkName"); //$NON-NLS-0$
								titleNode.appendChild(titleLink);
							}
						}
						//Render the bread crumb 
						if(this.breadCrumbMaker) {
							var bcNodeContainer = document.createElement("div"), bcNode=document.createElement("div");
							bcNodeContainer.appendChild(bcNode);
							if(this.breadCrumbInHeader) {
								bcNodeContainer.classList.add("breadCrumbContainerInHeader"); 
								titleNode.appendChild(bcNodeContainer);
								this.breadCrumbMaker(bcNode, this._foldersSection.getHeaderElement().offsetWidth - 150/*branch selector width*/ - 50);
							} else {
								bcNodeContainer.classList.add("breadCrumbContainer"); 
								this.sectionContents.appendChild(bcNodeContainer);
								this.breadCrumbMaker(bcNode, this._foldersSection.getHeaderElement().offsetWidth - 5);
							}
						}
						//Render the branch level commit information 
						var commitInfo = this.branchSelector ? this.branchSelector.getCommitInfo() : null;
						if(commitInfo) {
							var commitNodeContainer = document.createElement("div");
							commitNodeContainer.classList.add("commitInfoContainer"); 
							this.sectionContents.appendChild(commitNodeContainer);
							new mCommitInfoRenderer.CommitInfoRenderer({parent: commitNodeContainer, commitInfo: commitInfo}).render(this.componentSelector ? "Delivery" : "Commit", true);
						}
						//Render the section contents
						if(this.messageView) {
							if(typeof this.messageView.message === "string") {
								this.updateMessageContents(this.messageView.message, this.messageView.classes ? this.messageView.classes : ["messageViewTable"], this.messageView.tdClass);
							}						
						} else if(this.editorView) {//To embed an orion editor in the section
							this.sectionContents.appendChild(this.editorView.getParent());
							this.editorView.getParent().style.height = "30px"; //$NON-NLS-0$
							this.editorView.create();
							this.resetTextModel = this.snippetShareOptions && this.snippetShareOptions.e ? true : false;
							var textView = this.editorView.editor.getTextView();
							textView.getModel().addEventListener("Changed", this._editorViewModelChangedListener = function(e){ //$NON-NLS-0$
								var textModel = textView.getModel();
								if(this.resetTextModel) {
									var newContents = textModel.getText(this.snippetShareOptions.s ?  this.snippetShareOptions.s : 0, this.snippetShareOptions.e);
									this.resetTextModel = false;
									textModel.setText(newContents);
									return;
								}
								var linesToRender = textModel.getLineCount();
								if(this._maxEditorLines && this._maxEditorLines > 0 && linesToRender >this._maxEditorLines) {
									linesToRender = this._maxEditorLines;
								}
								var textViewheight = textView.getLineHeight() * linesToRender + 20;
								this.editorView.getParent().style.height = textViewheight + "px"; //$NON-NLS-0$
								if(this._browser) {
									this._browser.onTextViewCreated(textView);
								}
							}.bind(this));
							this.editor = this.editorView.editor;
						} else if(this.isMarkdownView) {
							div = document.createElement("div"); //$NON-NLS-0$
							this.markdownView.displayContents(div, this._metadata);
							this.sectionContents.appendChild(div);
						} else if(this.binaryView) {
							if(this.binaryView.domElement) {
								this.updateBinaryView(this.binaryView.domElement, this.binaryView.message);
							}						
						} else {
							this.folderNavExplorer = new FolderNavExplorer({
								parentId: navNode,
								folderViewer: this,
								readonly: this.readonly,
								breadCrumbMaker: this.breadCrumbMaker,
								clickHandler: this.clickHandler,
								fileClient: this.fileClient,
								editorInputManager: this.editorInputManager,
								commandRegistry: this.commandRegistry,
								contentTypeRegistry: this.contentTypeRegistry
							});
							this.sectionContents.appendChild(this.folderNavExplorer.parent);
							this.folderNavExplorer.setCommandsVisible(this._foldersSection, this._isCommandsVisible());
							this.folderNavExplorer.loadRoot(this._metadata);
						}
					} else if(sectionName === "readme"){
						if (readmeMd) {
							div = document.createElement("div"); //$NON-NLS-0$
							this.markdownView.displayInFrame(div, readmeMd,  ["sectionTreeTableHeader", "readmeHeader"], "readmeTitle");
							this._node.appendChild(div);
						}
					}
				}.bind(this));
			}
			
			var sectionsOrder = ["folderNav", "readme"];
			renderSections.apply(this, [sectionsOrder]);
		},
		updateBinaryView: function(domElement, message) {
			var binaryTable = document.createElement("table");
			binaryTable.classList.add("binaryViewTable");
			var tr, td;
			tr = document.createElement("tr");
			td = document.createElement("td"); 
			if(message){
				var messageDiv = document.createElement("div");
				messageDiv.textContent = message;
				messageDiv.classList.add("binaryViewMessage");
				td.appendChild(messageDiv);
			}
			var binaryContent = document.createElement("div");
			binaryContent.appendChild(domElement);
			td.appendChild(binaryContent);
			tr.appendChild(td);
			binaryTable.appendChild(tr);
			this.sectionContents.appendChild(binaryTable);
		},
		updateMessageContents: function(message, messageClasses, tdClass, doNotEmpty) {
			var messageTable = document.createElement("table");
			if(messageClasses){
				messageClasses.forEach( function(messageClass) {
					messageTable.classList.add(messageClass);
				});
			}
			var tr = document.createElement("tr");
			var td = document.createElement("td"); 
			if(tdClass) {
				td.classList.add(tdClass);
			}
			var messageContent = document.createElement("div");
			messageContent.appendChild(document.createTextNode(message));
			td.appendChild(messageContent);
			tr.appendChild(td);
			messageTable.appendChild(tr);
			if(!doNotEmpty) {
				lib.empty(this.sectionContents);
			}
			this.sectionContents.appendChild(messageTable);
		},
		create: function() {
			if(this._metadata && this._metadata.Projects){ //this is a workspace root
				this.displayWorkspaceView();
			}
			if(this.editorView || this.binaryView || this.isMarkdownView || this.messageView) {
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
		_destroyInfoDropDowns: function() {
			if(this.infoDropDowns) {
				this.infoDropDowns.forEach(function(infoDropDown){
					infoDropDown.destroy();
				});
			}
			this.infoDropDowns = [];
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
			this._destroyInfoDropDowns();
			this.folderNavExplorer = null;
			if (this._node && this._node.parentNode) {
				this._node.parentNode.removeChild(this._node);
			}
			this._node = null;
		}
	};
	return {BrowseView: BrowseView};
});
