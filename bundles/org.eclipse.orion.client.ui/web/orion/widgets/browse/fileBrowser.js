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
/*eslint-env browser, amd*/
/*global URL*/
define([
	'orion/PageUtil', 
	'orion/inputManager',
	'orion/breadcrumbs',
	'orion/widgets/browse/browseView',
	'orion/explorers/navigatorRenderer',
	'orion/widgets/browse/readonlyEditorView',
	'orion/widgets/browse/resourceSelector',
	'orion/commandRegistry',
	'orion/fileClient',
	'orion/contentTypes',
	'orion/widgets/browse/staticDataSource',
	'orion/widgets/browse/emptyFileClient',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/objects',
	'orion/EventTarget',
	'text!orion/widgets/browse/repoAndBaseUrlTrigger.html',
	'text!orion/widgets/browse/repoUrlTrigger.html',
	'text!orion/widgets/browse/shareSnippetTrigger.html',
	'text!orion/widgets/browse/shareCodeTrigger.html',
	'orion/commands',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/fileDownloader',
	'orion/util',
	'orion/xhr',
	'orion/URL-shim'
], function(
	PageUtil, mInputManager, mBreadcrumbs, mBrowseView, mNavigatorRenderer, mReadonlyEditorView, mResourceSelector,
	mCommandRegistry, mFileClient, mContentTypes, mStaticDataSource, mEmptyFileClient, Deferred, URITemplate, objects, 
	EventTarget, RepoAndBaseURLTriggerTemplate, RepoURLTriggerTemplate, ShareSnippetTriggerTemplate, ShareCodeTriggerTemplate, mCommands, lib, i18nUtil, mFileDownloader, util, xhr
) {
	
	function ResourceChangeHandler() {
		EventTarget.attach(this);
	}
	
	function statusService(fileBrowser){
		this.fileBrowser = fileBrowser;
	}
	objects.mixin(statusService.prototype, {
		setProgressResult: function(error){
			if(error.Cancel) {
				return;
			}
			var messageTdClass = "warningMessageViewTable";
			if(this.fileBrowser._currentEditorView && this.fileBrowser._currentEditorView.messageView) {
				this.fileBrowser._currentEditorView.updateMessageContents(error.Message, ["messageViewTable"], messageTdClass);
			} else {
				var browseViewOptons = {
					parent: this.fileBrowser._parentDomNode,
					messageView: {message: error.Message, classes: ["messageViewTable"], tdClass: messageTdClass}
				};
				this.fileBrowser._switchView(new mBrowseView.BrowseView(browseViewOptons));
			}
		}
	});
	
	function repoURLHandler(repoURL, baseURL, fileBrowser){
		this.triggerNodeId = "orion.browse.repoURLTrigger";
		this.dropdownNodeId = "orion.browse.repoURLDropdown";
		this.popupTextAreaId = "orion.browse.repoURLInput";
		
		this.baseURL = baseURL;
		this.repoURL = repoURL;
		this.fileBrowser = fileBrowser;
		
		if (this.baseURL) {
			this.popupTemplate = RepoAndBaseURLTriggerTemplate;
		} else {
			this.popupTemplate = RepoURLTriggerTemplate;
		}
		
		this._generateInviteText = function(userId, userName, found, reject) {
			this.popupTextAreaValue = "teamRepository=" + this.baseURL + "\n" +
							   "userId=" + userId + "\n" + 
							   "userName=" + userName + "\n" + 
							   "projectAreaName=" + decodeURIComponent(found[1]) + " | " + decodeURIComponent(found[2]);
			// Check if we can find a stream ID to put into the configuration
			var file = this.fileBrowser._branchSelector.getActiveResource(this.fileBrowser._branchSelector.activeResourceLocation);
			
			if (file && file.RTCSCM && file.RTCSCM.ItemId) {
				this.popupTextAreaValue = this.popupTextAreaValue + "\nstreamId="+ file.RTCSCM.ItemId;
			}
			return new Deferred().resolve(this.popupTextAreaValue); 
		}.bind(this);
		
		this._requestProjectInviteInfo = function(found) {
			var relativeURL = "/manage/service/com.ibm.team.jazzhub.common.service.ICurrentUserService";
			var absURL = new URL(relativeURL, window.location.href);
			var requestURL = absURL.href;
			var _this = this;
			return xhr("GET", requestURL, {
				timeout: 15000
			}).then(function(result) {
				var currentUser = JSON.parse(result.response);
				if(currentUser && currentUser.userId && currentUser.name) {
					return _this._generateInviteText(currentUser.userId, currentUser.name, found);
				}
				return _this._generateInviteText(decodeURIComponent(found[1]), decodeURIComponent(found[1]), found);
			}, function() {
				return _this._generateInviteText(decodeURIComponent(found[1]), decodeURIComponent(found[1]), found);
			});
		}.bind(this);
		
		this.init = function() {
		};
		this.getTextAreaValue = function() {
			if(this.baseURL) {
				var found = this.repoURL.match(/\/([^\/]+)\/([^\/]+)$/);
				if (found) {
					return this._requestProjectInviteInfo(found);
				} else {
					this.popupTextAreaValue = this.baseURL;
				}
			} else {
				this.popupTextAreaValue = this.repoURL;
			}
			return new Deferred().resolve(this.popupTextAreaValue);
		}.bind(this);
	}
	
	function shareSnippetHandler(widgetSource){
		this.widgetSource = widgetSource;
		this.triggerNodeId = "orion.browse.shareSnippetTrigger";
		this.dropdownNodeId = "orion.browse.shareSnippetDropdown";
		this.popupTextAreaId = "orion.browse.shareSnippetInput";
		this.popupTemplate = ShareSnippetTriggerTemplate;
		this.tags = '<div id="${0}"></div><link rel="stylesheet" type="text/css" href="${1}"/><script src="${2}"></script>' +
					'<script> orion.browse.browser("${3}","${4}",${5},null,{maxL:20,oHref:"${6}",fURI:"${7}",s:${8},e:${9}});</script>';
		this.init = function() {
		};
		this.getTextAreaValue = function() {
			if(this.textView) {
				var snippetContainerId = "snippet_container_" + Math.floor((Math.random()*1000000)+1);
				var selection = this.textView.getSelection();
				var start = 0;
				var end = 0;
				if(selection.start !== selection.end) {
					start = selection.start;
					end = selection.end;
				}
				var originalHref = new URITemplate("#{,resource,params*}").expand({resource:this.currentResourceURI, params: {start: start, end: end}});
				var url = new URL(window.location.href);
				url.hash = originalHref;
				var base = this.widgetSource.base ? '"' + this.widgetSource.base + '"' : 'null';
	
            	var tagString = i18nUtil.formatMessage(this.tags, snippetContainerId, this.widgetSource.css, this.widgetSource.js, snippetContainerId, 
            										   this.widgetSource.repo, base, url.href, this.currentResourceURI, start, end);
				return new Deferred().resolve(tagString);
			}
			return new Deferred().resolve("Nothing to share");
		}.bind(this);
	}
	
	function shareCodeHandler(){
		this.triggerNodeId = "orion.browse.shareCodeTrigger";
		this.dropdownNodeId = "orion.browse.shareCodeDropdown";
		this.popupTextAreaId = "orion.browse.shareCodeInput";
		this.popupTemplate = ShareCodeTriggerTemplate;
		this.init = function() {
			var node = lib.node(this.triggerNodeId);
			if(node) {
				node.style.display = "none";
			}
		};
		this.getTextAreaValue = function() {
			if(this.textView) {
				var selection = this.textView.getSelection();
				var textModel = this.textView.getModel();
				var startL = 1;
				var endL = 1;
				if(textModel && selection.start !== selection.end) {
					startL = textModel.getLineAtOffset(selection.start) + 1;
					endL = textModel.getLineAtOffset(selection.end -1) + 1;
				}
				var originalHref = new URITemplate("#{,resource,params*}").expand({resource:this.currentResourceURI, params: {startL: startL, endL: endL}});
				var url = new URL(window.location.href);
				url.hash = originalHref;
				return new Deferred().resolve(url.href);
			}
			return new Deferred().resolve("Nothing to share");
		}.bind(this);
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
		var url = new URL(window.location.href);
		this.shareCode = true;
		this.shareSnippet = url.query.get("shareSnippet") === "true" && options.widgetSource;
		if(this.shareSnippet) {
			this.widgetSource = options.widgetSource;
		}
		this._parentDomNode = lib.node(options.parent);//Required
		this.snippetShareOptions = options.snippetShareOptions;
		if(!this.snippetShareOptions) {
			this._parentDomNode.classList.add("browserParentDom");
		} 
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
		this._resourceChangeHandler = new ResourceChangeHandler();
		this._resourceChangeHandler.addEventListener("resourceChanged", function(event){
			if(!this._componentSelector || !event || !event.newResource || !event.newResource.selectorAllItems) {
				return;
			}
			this._componentSelector.allItems = event.newResource.selectorAllItems;
			var currentComponentLocation = event.defaultChild;
			if(!currentComponentLocation) {
				var firstDirLocation = null;
				event.newResource.selectorAllItems.some(function(component){
					if(component.Directory) {
						if(!firstDirLocation) {//Remember the first directory in the component list
							firstDirLocation = component.Location;
						}
						//If the component name contains "default", we should set it as default in the selector
						if(component.Name && component.Name.toLowerCase().indexOf("default") >= 0) { //$NON-NLS-0$
							currentComponentLocation = component.Location;
							return true;
						}
					}
				});
				if(!currentComponentLocation) {//If no component name contains "default", use the first directory as the defaul. 
					currentComponentLocation = firstDirLocation;
				}
				if(event.changeHash) {
					window.location = new URITemplate("#{,resource,params*}").expand({resource:currentComponentLocation});
				} else {
					this.refresh(new URITemplate("{,resource}").expand({resource:currentComponentLocation}));
				}
			}
			var activeComp = this._componentSelector.getActiveResource(currentComponentLocation);
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
			
			if(!this.snippetShareOptions) {
				window.addEventListener("hashchange", function() { //$NON-NLS-0$
					this.refresh(PageUtil.hash());
				}.bind(this));
			}
			if(this._fileClient) {
				this.startup();
			}
		},
		_registerCommands: function() {
			var editCodeCommand = new mCommands.Command({
				imageClass: "core-sprite-edit", //$NON-NLS-0$
				id: "orion.browse.gotoEdit",
				visibleWhen: function() {
					return true;
				},
				hrefCallback : function() {
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
			if(this.shareCode) {
				this.shareCodeHandler = new shareCodeHandler(this.widgetSource);
			}
			if(this.shareSnippet) {
				this.shareSnippetHandler = new shareSnippetHandler(this.widgetSource);
			}
			if(this.repoURL) {
				this.repoURLHandler = this.snippetShareOptions ? null : new repoURLHandler(this.repoURL, this.baseURL, this);
			}
			if(!this.snippetShareOptions) {
				//this._registerCommands();
			}
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
			this._inputManager._unknownContentTypeAsText = function() {
				return true;
			};
			this._inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				if(!evt.metadata || !evt.input) {
					return;
				}
				var metadata = evt.metadata;
				if(!this.snippetShareOptions) {
					if(this._branches && this._branchSelector){
						this._activeBranchLocation = this._branches[0].Location;
						this._activeComponentLocation = null;
						var newLocation = null;
						if(metadata.Parents) {
							if(metadata.Parents.length > 0) {//The input change happens on a sub folder of a branch, we need to find the branch in its parent chain
								this._activeBranchLocation = metadata.Parents[metadata.Parents.length-1].Location;
								if(metadata.Parents.length > 1) {
									this._activeComponentLocation = metadata.Parents[metadata.Parents.length-2].Location;
								} else {
									this._activeComponentLocation = metadata.Location;
								}
							} else {//The input change happens jsut on a branch, we need to we need to set the commit information in the branch selector
								this._activeBranchLocation = metadata.Location;
								this._activeComponentLocation = metadata.Location;
							}
							//TODO: in the future if the root fetchChildren provides the commit information in each child that represents a branch, we dod not nee to do this
							this._branchSelector.setCommitInfo(this._activeBranchLocation, metadata.LastCommit);
						} else {//The input change happens on the root directory of a repo, we need to set the default to "master" if it exist
							this._branches.some(function(branch){
								if(branch.Name.toLowerCase() === "master") { //$NON-NLS-0$
									this._activeBranchLocation = branch.Location;
									newLocation = branch.Location;
									return true;
								}
							}.bind(this));
							newLocation = newLocation || this._branches[0].Location;
							this._activeBranchLocation = this._activeBranchLocation || this._branches[0].Location;
						}
						this._branchSelector.activeResourceLocation = this._activeBranchLocation;
						
						if(this._showComponent) {
							this._branchSelector.setActiveResource({resource: this._branchSelector.getActiveResource(this._activeBranchLocation), changeHash: false,  defaultChild: this._activeComponentLocation});
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
				}
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
			if(!this.snippetShareOptions) {
				if(this._showBranch) {
					var branchSelectorContainer = document.createElement("div"); //$NON-NLS-0$
					branchSelectorContainer.classList.add("resourceSelectorContainer"); //$NON-NLS-0$
					var rootURL = this._fileClient.fileServiceRootURL("");
					this._fileClient.fetchChildren(rootURL).then(function(contents){
						if(contents && contents.length > 0) {
							contents.sort(function(a, b) {
								var	n1 = a.Name && a.Name.toLowerCase();
								var	n2 = b.Name && b.Name.toLowerCase();
								if (n1 < n2) { return -1; }
								if (n1 > n2) { return 1; }
								return 0;
							}); 
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
									dropDownTooltip: "Select a component", //$NON-NLS-0$
									allItems: contents
								});
							}
						}
						this.refresh(PageUtil.hash());
					}.bind(this),
					function(error){
						mInputManager.handleError(this._statusService, error);
					}.bind(this));
				} else {
					this.refresh(PageUtil.hash());
				}
			} else {
				this.refresh(new URITemplate("{,resource}").expand({resource:this.snippetShareOptions.fURI}));
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
		_breadCrumbMaker: function(bcContainer){
			this._renderBreadCrumb({
				task: "Browse", //$NON-NLS-0$
				name: this._breadCrumbName,
				target: this._breadCrumbTarget,
				breadCrumbContainer: bcContainer,
				makeBreadcrumbLink: function(segment, folderLocation, folder) {this._makeBreadCrumbLink(segment, folderLocation, folder);}.bind(this),
				makeBreadcrumFinalLink: false,
				fileClient: this._fileClient
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
							resource.Parents[0].skip = true;
							resource.skip = true;
						} else if(resource.Parents.length > 1) {//Skip the component level parents
							resource.Parents[resource.Parents.length -1].skip = true;
							resource.Parents[resource.Parents.length -2].skip = true;
						} else {
							resource.skip = true;
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
				var bcRootName = this.rootName ? this.rootName : workspaceRootURL;
				if(this._componentSelector) {
					//TODO: We need a better way to show the root of a repo
					//bcRootName = "Component Root(" + this._componentSelector.getActiveResource().Name + ")";
				} else {
					//TODO: We need a better way to show the root of a repo
					//bcRootName = "Branch Root(" + this._branchSelector.getActiveResource().Name + ")";
				}
				if (this._currentBreadcrumb) {
					this._currentBreadcrumb.destroy();
				}
				this._currentBreadcrumb = new mBreadcrumbs.BreadCrumbs({
					container: locationNode,
					resource: resource,
					rootSegmentName: breadcrumbRootName,
					workspaceRootSegmentName: bcRootName,
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
		onTextViewCreated: function(textView) {
			if(this.shareCodeHandler) {
				this.shareCodeHandler.textView = textView;
				this.shareCodeHandler.currentResourceURI = (this._currentURI && this._currentURI.length > 0) ? this._currentURI : "";
			}
			if(this.shareSnippetHandler) {
				this.shareSnippetHandler.textView = textView;
				this.shareSnippetHandler.currentResourceURI = (this._currentURI && this._currentURI.length > 0) ? this._currentURI : "";
			}
		},
		_isBrowserRenderable: function(cType) {
			var renderableType = this._contentTypeService.getContentType("application/browser-renderable"); //$NON-NLS-0$
			return this._contentTypeService.isExtensionOf(cType, renderableType);
		},
		_testBlobURLSupported: function(contents, cType) {
			var blobObj= new Blob([contents],{type: cType.id});
			var objectURLLink = URL.createObjectURL(blobObj);
		   	var downloadLink = document.createElement("image"); 
		   	downloadLink.setAttribute("src", objectURLLink); 
		   	//downloadLink.style.width = 640+"px"; 
			//downloadLink.style.height = 480+"px"; 
			downloadLink.onerror = function() {
				this._statusService.setProgressResult({Severity: "error", Message: "This type of file is not supportef in Safri. Please use Chrome or FireFox."});									
			}.bind(this);
		},
		_generateViewLink: function(contents, metadata, cType, browseViewOptons, message) {
			var downloadLink = document.createElement("a"); //$NON-NLS-0$
			var blobObj = new Blob([contents],{type: cType.id});
			downloadLink.href = URL.createObjectURL(blobObj);
			downloadLink.classList.add("downloadLinkName"); //$NON-NLS-0$
			downloadLink.appendChild(document.createTextNode("View " + metadata.Name));
			browseViewOptons.binaryView = {domElement: downloadLink, message: message};
		},
		_generateDownloadLink: function(contents, metadata, cType, browseViewOptons, message) {
			var downloader = new mFileDownloader.FileDownloader(this._fileClient);
			var linkElement = downloader.downloadFromBlob(contents, metadata.Name, cType, true, true);
			linkElement.classList.add("downloadLinkName"); //$NON-NLS-0$
			linkElement.appendChild(document.createTextNode("Download " + metadata.Name));
			browseViewOptons.binaryView = {domElement: linkElement, message: message};
		},
		_getEditorView: function(input, contents, metadata) {
			var view = null;
			if (metadata && input) {
				this._currentURI = metadata.Location;
				var browseViewOptons = {
					parent: this._parentDomNode,
					browser: this,
					maxEditorLines: this._maxEditorLines,
					breadCrumbInHeader: this._breadCrumbInHeader,
					metadata: metadata,
					branchSelector: this._branchSelector,
					componentSelector: this._componentSelector,
					commandRegistry: this._commandRegistry,
					contentTypeRegistry: this._contentTypeService,
					inputManager: this._inputManager,
					infoDropDownHandlers: this.repoURLHandler ? [this.repoURLHandler] : [],
					fileService: this._fileClient,
					snippetShareOptions: this.snippetShareOptions,
					//clickHandler: function(location) {this.refresh(location);}.bind(this),
					breadCrumbMaker: this.snippetShareOptions ? null: function(bcContainer) {this._breadCrumbMaker(bcContainer);}.bind(this)
				};
				if (!metadata.Directory) {
					if(this.shareSnippetHandler) {
						this.shareSnippetHandler.textView = null;
					}
					var cType = this._contentTypeService.getFileContentType(metadata);
					if(!cType) {//The content type is not registered
						if(this._inputManager._unknownContentTypeAsText) {//If we treate 
							browseViewOptons.editorView = this._editorView;
							if(this.shareCodeHandler) {
								browseViewOptons.infoDropDownHandlers.unshift(this.shareCodeHandler);
							}
							if(this.shareSnippetHandler) {
								browseViewOptons.infoDropDownHandlers.unshift(this.shareSnippetHandler);
							}
						} else {
							this.makeDownloadLink();
						}
					} else if(mContentTypes.isBinary(cType)) {
						if(mFileDownloader.downloadSupported()) {
							this._generateDownloadLink(contents, metadata, cType, browseViewOptons);
						} else {
							this._generateViewLink(contents, metadata, {id: "text/plain"}, browseViewOptons, 
							'Directly downloading the contents of files is not supported in your browser. You can click the link below, then save the resulting page using "Save As...".');
						}
					} else if(this._isBrowserRenderable(cType)) {
						if(util.isIE) {//IE(tested on 10 and 11) does not support objectURL on a link yet. http://stackoverflow.com/questions/17951644/can-i-open-object-url-in-ie
							this._generateDownloadLink(contents, metadata, cType, browseViewOptons);
						} else {
							this._generateViewLink(contents, metadata, cType, browseViewOptons);
						}
					} else if(cType.id === "text/x-markdown") {
						browseViewOptons.isMarkdownView = true;
					} else if(!mContentTypes.isImage(cType)) {
						browseViewOptons.editorView = this._editorView;
						if(this.shareCodeHandler) {
							browseViewOptons.infoDropDownHandlers.unshift(this.shareCodeHandler);
						}
						if(this.shareSnippetHandler) {
							browseViewOptons.infoDropDownHandlers.unshift(this.shareSnippetHandler);
						}
					} else {
						var objectURL = URL.createObjectURL(new Blob([contents],{type: cType.id}));
						var image = document.createElement("img"); //$NON-NLS-0$
						image.src = objectURL;
						image.classList.add("readonlyImage"); //$NON-NLS-0$
						image.onload = function() {
							URL.revokeObjectURL(objectURL);
						};
						browseViewOptons.binaryView = {domElement: image};
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
