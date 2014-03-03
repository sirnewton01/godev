/*******************************************************************************
 *
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint browser:true devel:true sub:true*/
/*global define console eclipse:true orion:true window URL*/

define([
	'orion/PageUtil', 
	'orion/inputManager',
	'orion/breadcrumbs',
	'orion/widgets/browse/browseView',
	'orion/explorers/navigatorRenderer',
	'orion/widgets/browse/readonlyEditorView',
	'orion/widgets/browse/resourceSelector',
	'orion/markdownView',
	'orion/commandRegistry',
	'orion/fileClient',
	'orion/contentTypes',
	'orion/widgets/browse/staticDataSource',
	'orion/widgets/browse/emptyFileClient',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/objects',
	'orion/EventTarget',
	'text!orion/widgets/browse/repoUrlTrigger.html',
	'text!orion/widgets/browse/repoAndBaseUrlTrigger.html',
	'orion/commands',
	'orion/webui/littlelib',
	'orion/URL-shim'
], function(
	PageUtil, mInputManager, mBreadcrumbs, mBrowseView, mNavigatorRenderer, mReadonlyEditorView, mResourceSelector, mMarkdownView,
	mCommandRegistry, mFileClient, mContentTypes, mStaticDataSource, mEmptyFileClient, Deferred, URITemplate, objects, EventTarget, RepoURLTriggerTemplate, RepoAndBaseURLTriggerTemplate, mCommands, lib
) {
	
	function ResourceChangeHandler(options) {
		EventTarget.attach(this);
		//this.resourceSelector = options.resourceSelector;
	}
	
	function statusService(fileBrowser){
		this.fileBrowser = fileBrowser;
	}
	objects.mixin(statusService.prototype, {
		setProgressResult: function(error){
			if(this.fileBrowser._currentEditorView && this.fileBrowser._currentEditorView.messageView) {
				this.fileBrowser._currentEditorView.updateMessageContents(error.Message, ["messageViewTable"], "errorMessageViewTable");
			} else {
				var browseViewOptons = {
					parent: this.fileBrowser._parentDomNode,
					messageView: {message: error.Message, classes: ["messageViewTable"], tdClass: "errorMessageViewTable"}
				};
				this.fileBrowser._switchView(new mBrowseView.BrowseView(browseViewOptons));
			}
		}
	});
	
	function repoURLHandler(repoURL, baseURL){
		this.repoURL = repoURL;
		this.baseURL = baseURL;
		if(this.baseURL) {
			this.RepoURLTriggerTemplate = RepoAndBaseURLTriggerTemplate;
			var found = this.repoURL.match(/\/([^\/]+)\/([^\/]+)$/);
			if (found) {
				this.promptValue = "teamRepository=" + this.baseURL + "\n" +
								   "userId=" + decodeURIComponent(found[1]) + "\n" + 
								   "userName=" + decodeURIComponent(found[1]) + "\n" + 
								   "projectAreaName=" + decodeURIComponent(found[1]) + " | " + decodeURIComponent(found[2]);
			} else {
				this.promptValue = this.baseURL;
			}
		} else {
			this.RepoURLTriggerTemplate = RepoURLTriggerTemplate;
			this.promptValue = this.repoURL;
		}
	}
	
	/**
	 * @class This object describes the options for the readonly file system browser.
	 * <p>
	 * <b>See:</b><br/>
	 * {@link orion.browse.FileBrowser}<br/>
	 * </p>		 
	 * @name orion.browse.FileBrowserOptions
	 *
	 * @property {String|DOMElement} parent the parent element for the file browser, it can be either a DOM element or an ID for a DOM element.
	 * @property {Number} maxEditorLines the max number of lines that are allowed in the editor DIV. When displaying a file, if not defined 0 is used to represent that editor will use the full contents height.
	 * @property {orion.fileClient.FileClient} fileClient the file client implementation that has all the interfaces from orion.fileClient.FileClient.
	 * @property {orion.highlight.SyntaxHighlighter} optional syntaxHighlighter the syntax highlighter that hihglights  a supported language file. If not defined a static default one is used.
	 * @property {orion.core.ContentType} contentTypeService optional the content type service that knows a file's content type. If not defined a static default one is used.
	 * @property {orion.preferences.PreferencesService} [preferences=null] the editor preferences. If not defined the default editor preferences is used.
	 */
	/**
	 * Constructs a new readonly file system browser.
	 * 
	 * @param {orion.browse.FileBrowserOptions} options the browser options.
	 * 
	 * @class A FileBrowser is a user interface for browsing a readonly file system.
	 * @name orion.browse.FileBrowser
	 */
	function FileBrowser(options) {
		this._parentDomNode = lib.node(options.parent);//Required
		this._parentDomNode.classList.add("browserParentDome");
		if(options.fileClient) {
			this._fileClient = options.fileClient;
		} else if(options.serviceRegistry) {
			this._fileClient = new mFileClient.FileClient(options.serviceRegistry);
		} else if(!options.init){
			this._fileClient = new mEmptyFileClient.FileClient();		
		}
		this.repoURL = options.repoURL;
		this.baseURL = options.baseURL;
		this.codeURL = options.codeURL;
		this._syntaxHighlighter = options.syntaxHighlighter;//Required
		if(!this._syntaxHighlighter) {
			this._syntaxHighlighter =  new mStaticDataSource.SyntaxHighlighter();
		}
		this._contentTypeService = options.contentTypeService;//Required
		if(!this._contentTypeService) {
			this._contentTypeService =  new mContentTypes.ContentTypeRegistry(mStaticDataSource.ContentTypes);
		}
		this._preferences = options.preferences;//Optional
		this.rootName = options.rootName;
		this.shouldLoadWorkSpace = options.shouldLoadWorkSpace;
		if(typeof options.selectorNumber === "number") {
			if(options.selectorNumber >= 1) {
				this._showBranch = true;
			} 
			if(options.selectorNumber >= 2) {
				this._showComponent = true;
			} 
		}
		this._breadCrumbInHeader= options.breadCrumbInHeader;
		this._resourceChangeHandler = new ResourceChangeHandler(options.repo);
		this._resourceChangeHandler.addEventListener("resourceChanged", function(event){
			if(!this._componentSelector || !event || !event.newResource || !event.newResource.selectorAllItems) {
				return;
			}
			this._componentSelector.allItems = event.newResource.selectorAllItems;
			var currentComponentLocation = event.defaultChild;
			if(!currentComponentLocation) {
				event.newResource.selectorAllItems.some(function(component){
					if(component.Directory) {
						currentComponentLocation = component.Location;
						return true;
					}
				});
				if(event.changeHash) {
					window.location = new URITemplate("#{,resource,params*}").expand({resource:currentComponentLocation});
				} else {
					this.refresh(new URITemplate("{,resource}").expand({resource:currentComponentLocation}));
				}
			}
			var activeComp = this._componentSelector.getActiveResource(currentComponentLocation);
			this._componentSelector.activeResourceName = activeComp.Name;
			this._componentSelector.activeResourceLocation = activeComp.Location;
			this._componentSelector.refresh();
		}.bind(this)); 
		this._init(options);
	}
	objects.mixin(FileBrowser.prototype, {
		_init: function(options){
			this._commandRegistry = new mCommandRegistry.CommandRegistry({});
			this._maxEditorLines = options.maxEditorLines;
			
			var browseViewOptons = {
				parent: this._parentDomNode,
				messageView: {message: "Loading..."}
			};
			this._statusService = new statusService(this);
			this._switchView(new mBrowseView.BrowseView(browseViewOptons));
			
			this._uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
			
			window.addEventListener("hashchange", function() { //$NON-NLS-0$
				this.refresh(PageUtil.hash());
			}.bind(this));
			if(this._fileClient) {
				this.startup();
			}
		},
		_registerCommands: function() {
			var editCodeCommand = new mCommands.Command({
				imageClass: "core-sprite-edit", //$NON-NLS-0$
				id: "orion.browse.gotoEdit",
				visibleWhen: function(item) {
					return true;
				},
				hrefCallback : function(data) {
					return this.codeURL ? this.codeURL : (new URL("code", window.location.href)).href;
				}.bind(this)			
			});
			this._commandRegistry.addCommand(editCodeCommand);
			this._commandRegistry.registerCommandContribution("orion.browse.sectionActions", "orion.browse.gotoEdit", 1); //$NON-NLS-1$ //$NON-NLS-0$
		},
		startup: function(serviceRegistry) {
			if(serviceRegistry) {
				this._fileClient = new mFileClient.FileClient(serviceRegistry);	
			}
			if(this.repoURL) {
				this.repoURLHandler = new repoURLHandler(this.repoURL, this.baseURL);
			}
			this._registerCommands();
			this._inputManager = new mInputManager.InputManager({
				fileClient: this._fileClient,
				statusReporter: this._statusReport,
				statusService: this._statusService,
				contentTypeRegistry: this._contentTypeService
			});
			//We have to overide the inputManager's function here if the widget does not need to call loadWorkSpace on file service.
			if(!this.shouldLoadWorkSpace){
				this._inputManager._maybeLoadWorkspace = function(resource) {
					return new Deferred().resolve(resource);
				};
			}
			
			this._inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				if(!evt.metadata || !evt.input) {
					return;
				}
				var metadata = evt.metadata;
				if(this._branches && this._branchSelector){
					var activeBranchName = this._branches[0].Name;
					this._activeBranchLocation = this._branches[0].Location;
					this._activeComponentLocation = null;
					var newLocation = null;
					if(metadata.Parents) {
						if(metadata.Parents.length > 0) {
							activeBranchName = metadata.Parents[metadata.Parents.length-1].Name;
							this._activeBranchLocation = metadata.Parents[metadata.Parents.length-1].Location;
							if(metadata.Parents.length > 1) {
								this._activeComponentLocation = metadata.Parents[metadata.Parents.length-2].Location;
							} else {
								this._activeComponentLocation = metadata.Location;
							}
						} else {
							activeBranchName = metadata.Name;
							this._activeBranchLocation = metadata.Location;
						}
					} else {
						this._branches.some(function(branch){
							if(branch.Name.toLowerCase() === "master") { //$NON-NLS-0$
								activeBranchName = branch.Name;
								this._activeBranchLocation = branch.Location;
								newLocation = branch.Location;
								return true;
							}
						}.bind(this));
						newLocation = newLocation || this._branches[0].Location;
						this._activeBranchLocation = this._activeBranchLocation || this._branches[0].Location;
					}
					this._branchSelector.activeResourceName = activeBranchName;
					this._branchSelector.activeResourceLocation = this._activeBranchLocation;
					
					if(this._showComponent) {
						this._branchSelector.setActiveResource({resource: this._branchSelector.getActiveResource(this._activeBranchLocation), changeHash: metadata.Parents,  defaultChild: this._activeComponentLocation});
						if(!this._activeComponentLocation) {
							return;
						}
					} else if(newLocation){
						this.refresh(new URITemplate("{,resource}").expand({resource:newLocation}));
						return;
					}
				}
				this._breadCrumbName = evt.name;
				this._breadCrumbTarget = metadata;
				if (evt.input === null || evt.input === undefined) {
					this._breadCrumbName = this._lastRoot ? this._lastRoot.Name : "";
					this._breadCrumbTarget = this._lastRoot;
				}
				//this._breadCrumbMaker("localBreadCrumb");
				var view = this._getEditorView(evt.input, evt.contents, metadata);
				this._setEditor(view ? view.editor : null);
				evt.editor = this._editor;
			}.bind(this));

			var editorContainer = document.createElement("div"); //$NON-NLS-0$
			var editorOptions = {
				parent: editorContainer,
				syntaxHighlighter: this._syntaxHighlighter,
				inputManager: this._inputManager,
				preferences: this._preferences,
				statusReporter: function(message, type, isAccessible) {this._statusReport(message, type, isAccessible);}.bind(this)
			};
			this._editorView = new mReadonlyEditorView.ReadonlyEditorView(editorOptions);
			if(this._showBranch) {
				var branchSelectorContainer = document.createElement("div"); //$NON-NLS-0$
				branchSelectorContainer.classList.add("resourceSelectorContainer"); //$NON-NLS-0$
				var rootURL = this._fileClient.fileServiceRootURL("");
				this._fileClient.fetchChildren(rootURL).then(function(contents){
					if(contents && contents.length > 0) {
						this._branches = contents;
						this._branchSelector = new mResourceSelector.ResourceSelector({
							commandRegistry: this._commandRegistry,
							fileClient: this._fileClient,
							parentNode: branchSelectorContainer,
							labelHeader: this._showComponent ? "Stream" : "Branch",
							resourceChangeDispatcher: this._showComponent ? this._resourceChangeHandler : null,
							fetchChildren: this._showComponent ? true : false,
							commandScopeId: "orion.browse.brSelector", //$NON-NLS-0$
							dropDownId: "orion.browse.switchbr", //$NON-NLS-0$
							dropDownTooltip: this._showComponent ? "Select a stream" : "Select a branch", //$NON-NLS-0$
							activeResourceName: "default",
							allItems: contents
						});
						if(this._showComponent){
							var compSelectorContainer = document.createElement("div"); //$NON-NLS-0$
							compSelectorContainer.classList.add("resourceSelectorContainer"); //$NON-NLS-0$
							compSelectorContainer.classList.add("componentSelectorContainer"); //$NON-NLS-0$
							this._componentSelector = new mResourceSelector.ResourceSelector({
								commandRegistry: this._commandRegistry,
								fileClient: this._fileClient,
								parentNode: compSelectorContainer,
								labelHeader: "Component",
								commandScopeId: "orion.browse.compSelector", //$NON-NLS-0$
								dropDownId: "orion.browse.switchcomp", //$NON-NLS-0$
								dropDownTooltip: "Select a componet", //$NON-NLS-0$
								activeResourceName: "default",
								allItems: contents
							});
						}
					}
					this.refresh(PageUtil.hash());
				}.bind(this),
				function(error){
					console.log(error);
					mInputManager.handleError(this._statusService, error);
				}.bind(this));
			} else {
				this.refresh(PageUtil.hash());
			}
		},
		_switchView: function(view) {
			if (this._currentEditorView !== view) {
				if (this._currentEditorView) {
					this._currentEditorView.destroy();
				}
				this._currentEditorView = view;
				if (this._currentEditorView) {
					this._currentEditorView.create();
				}
			}
			return this._currentEditorView;
		},
		_breadCrumbMaker: function(bcContainer, maxLength){
			this._renderBreadCrumb({
				task: "Browse", //$NON-NLS-0$
				name: this._breadCrumbName,
				target: this._breadCrumbTarget,
				breadCrumbContainer: bcContainer,
				makeBreadcrumbLink: function(segment, folderLocation, folder) {this._makeBreadCrumbLink(segment, folderLocation, folder);}.bind(this),
				makeBreadcrumFinalLink: false,
				fileClient: this._fileClient,
				maxLength: maxLength
			});
		},
		
		_setEditor: function(newEditor) {
			if (this._editor === newEditor) { return; }
			this._editor = newEditor;
		},
		_statusReport: function(message, type, isAccessible) {
			if (type === "progress") { //$NON-NLS-0$
				//TODO: Render message in the section header?
			} else if (type === "error") { //$NON-NLS-0$
				//TODO: Render message in the section header?
			} else {
				//TODO: Render message in the section header?
			}
		},
		_makeBreadCrumbLink: function(segment, folderLocation, folder) {
			var resource = folder ? folder.Location : null;
			if(!resource) {
				resource = folderLocation ? folderLocation : this._fileClient.fileServiceRootURL(folderLocation);
			}
			segment.href = this._uriTemplate.expand({resource: resource});
		},
		_renderBreadCrumb: function(options) {
			var fileSystemRootName;
			var breadcrumbRootName = options.breadcrumbRootName;
			var fileClient = options.fileClient;
			if (options.target) { // we have metadata
				if (fileClient && !options.breadcrumbTarget) {
					fileSystemRootName = breadcrumbRootName ? breadcrumbRootName + " " : ""; //$NON-NLS-1$ //$NON-NLS-0$
					fileSystemRootName = fileSystemRootName + fileClient.fileServiceName(options.target.Location);
					breadcrumbRootName = null;
				}
			} else {
				if (!options.breadcrumbTarget) {
					breadcrumbRootName = breadcrumbRootName || options.task || options.name;
				}
			}
			var locationNode = lib.node(options.breadCrumbContainer);
			if (locationNode) {
				lib.empty(locationNode);
				var resource = options.breadcrumbTarget || options.target;
				if(this._componentSelector) {
					if(resource.Parents) {
						if(resource.Parents.length === 1) {//Skip the branch level parents
							resource.Parents[resource.Parents.length -1].skip = true;
							resource.skip = true;
						} else if(resource.Parents.length > 1) {//Skip the componet level parents
							resource.Parents[resource.Parents.length -1].skip = true;
							resource.Parents[resource.Parents.length -2].skip = true;
						}
					}
				} else if(this._branchSelector && resource.Parents) {
					if(resource.Parents.length > 0) {
						resource.Parents[resource.Parents.length -1].skip = true;
					} else {
						resource.skip = true;
					}
				}
				var workspaceRootURL = (fileClient && resource && resource.Location) ? fileClient.fileServiceRootURL(resource.Location) : null;
				new mBreadcrumbs.BreadCrumbs({
					container: locationNode,
					maxLength: options.maxLength,
					resource: resource,
					rootSegmentName: breadcrumbRootName,
					workspaceRootSegmentName: this.rootName ? this.rootName : workspaceRootURL,
					workspaceRootURL: this._calculateRootURL(workspaceRootURL),
					makeFinalHref: options.makeBreadcrumFinalLink,
					makeHref: options.makeBreadcrumbLink
				});
			}
		},
		_calculateRootURL: function(workspaceRootURL) {
			if(this._activeComponentLocation && this._componentSelector) {
				return this._activeComponentLocation;
			} else if(this._activeBranchLocation && this._branchSelector) {
				return this._activeBranchLocation;
			}
			return workspaceRootURL;
		},
		_getEditorView: function(input, contents, metadata) {
			var view = null;
			if (metadata && input) {
				var browseViewOptons = {
					parent: this._parentDomNode,
					maxEditorLines: this._maxEditorLines,
					breadCrumbInHeader: this._breadCrumbInHeader,
					metadata: metadata,
					branchSelector: this._branchSelector,
					componentSelector: this._componentSelector,
					commandRegistry: this._commandRegistry,
					contentTypeRegistry: this._contentTypeService,
					inputManager: this._inputManager,
					repoURLHandler: this.repoURLHandler,
					fileService: this._fileClient,
					//clickHandler: function(location) {this.refresh(location);}.bind(this),
					breadCrumbMaker: function(bcContainer, maxLength) {this._breadCrumbMaker(bcContainer, maxLength);}.bind(this)
				};
				if (!metadata.Directory) {
					var cType = this._contentTypeService.getFileContentType(metadata);
					if(!cType) {
						browseViewOptons.editorView = this._editorView;
					} else if(cType.id === "text/x-markdown") {
						browseViewOptons.isMarkdownView = true;
					} else if(!mNavigatorRenderer.isImage(cType)) {
						browseViewOptons.editorView = this._editorView;
					} else {
						var objectURL = URL.createObjectURL(new Blob([contents],{type: cType.id}));
						var image = document.createElement("img"); //$NON-NLS-0$
						image.src = objectURL;
						image.classList.add("readonlyImage"); //$NON-NLS-0$
						browseViewOptons.imageView = {image: image};
					}
				}
				view = new mBrowseView.BrowseView(browseViewOptons);
			}
			return this._switchView(view);
		},
		refresh: function(uri) {
			if(!uri) {
				uri = new URITemplate("{,resource}").expand({resource:this._fileClient.fileServiceRootURL("")});
			}
			this._inputManager.setInput(uri);
		},
		create: function() {
		},
		destroy: function() {
		}
	});
	return {FileBrowser: FileBrowser};
});
