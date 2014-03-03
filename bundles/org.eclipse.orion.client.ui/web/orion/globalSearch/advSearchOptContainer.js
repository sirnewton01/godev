/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window document console*/
/*jslint sub:true*/

define([
	'i18n!orion/search/nls/messages', 
	'require', 
	'orion/fileClient', 
	'orion/searchUtils', 
	'orion/contentTypes', 
	'orion/i18nUtil', 
	'orion/webui/littlelib', 
	'orion/inputCompletion/inputCompletion', 
	'orion/Deferred', 
	'orion/commands', 
	'orion/section', 
	'orion/objects',
	'orion/EventTarget',
	'orion/widgets/filesystem/filesystemSwitcher',
	'text!orion/globalSearch/searchBuilder.html'], 
		function(messages, require, mFileClient, mSearchUtils, mContentTypes, i18nUtil, lib, mInputCompletion, Deferred, mCommands, mSection, objects, EventTarget, mFilesystemSwitcher, optionTemplate){

	/**
	 * @name orion.search.AdvSearchOptRenderer
	 * @class AdvSearchOptRenderer.
	 * @description The renderer to render all search parameters.
	 * @param {Dome node} parentDiv.
	 * @param {orion.search.Searcher} A searcher that knows how to start a search.
	 * @param {orion.commands.CommandRegistry} commandService
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 */
	function AdvSearchOptRenderer(parentDiv, searcher, serviceRegistry, commandService) {
		EventTarget.attach(this);
		this._parentDiv = parentDiv;
		this._searcher = searcher;
		this._serviceRegistry = serviceRegistry;
		this._commandService = commandService;
        this.fileClient = new mFileClient.FileClient(this._serviceRegistry);
        this.fsToolbar = null;
        this.fileSysChangeListener = function(evt) {
			var href = mSearchUtils.generateSearchHref({resource : evt.newInput});
			window.location = href;
        };
		this.addEventListener("filesystemChanged", this.fileSysChangeListener);
		if (!this.fsToolbar) {
			var fsToolbar = this.fsToolbar = document.createElement("div"); //$NON-NLS-0$
			fsToolbar.classList.add("fsToolbarLayout"); //$NON-NLS-0$
			fsToolbar.classList.add("fsToolbar"); //$NON-NLS-0$
			this._parentDiv.parentNode.insertBefore(fsToolbar, this._parentDiv);
		}
		// Create switcher here
		this.fsSwitcher = new mFilesystemSwitcher.FilesystemSwitcher({
			commandRegistry: this._commandService,
			rootChangeListener: this,
			filesystemChangeDispatcher: this,
			fileClient: this.fileClient,
			node: this.fsToolbar,
			serviceRegistry: this._serviceRegistry
		});
	}
	
	objects.mixin(AdvSearchOptRenderer.prototype, /** @lends orion.search.AdvSearchOptRenderer */ {
		destroy: function() {
			this.removeEventListener("filesystemChanged", this.fileSysChangeListener); //$NON-NLS-0$
			this.fileSysChangeListener = null;
		},
		
		getOptions: function(includeLocation){
			var resource;
			if(includeLocation) {
				resource = this._searchParams ? this._searchParams.resource : this._searcher.getSearchRootLocation();
			}
			return {keyword: this._searchBox.value,
					sort: this._sortBy.options[this._sortBy.selectedIndex].value,
					rows: 40,
					start: 0,
					replace:this._replaceBox.value ? this._replaceBox.value : undefined,
					caseSensitive: this._caseSensitiveCB.checked,
			        regEx: this._regExCB.checked,
			        fileType: this._fileTypes.options[this._fileTypes.selectedIndex].value,
			        resource: resource
			};
		},
	
		loadSearchParams: function(searchParams){
			this._searchParams = searchParams;
			this._locationName = null;
			this.dispatchEvent({ type: "rootChanged", root: this.fileClient.fileServiceRootURL(this._searchParams.resource) }); //$NON-NLS-0$
	        if (this._searchParams.resource.length > 0) {
	            this._serviceRegistry.getService("orion.page.progress").progress(this.fileClient.read(this._searchParams.resource, true), "Getting file metadata " + this._searchParams.resource).then( //$NON-NLS-1$ //$NON-NLS-0$
	            function(meta) {
	                var parentName = meta.Parents ? mSearchUtils.fullPathNameByMeta(meta.Parents) : "";
	                this._locationName = parentName.length === 0 ? meta.Name : parentName + "/" + meta.Name; //$NON-NLS-0$
		            if(this._searchNameBox){
						this._searchNameBox.value = this._getDefaultSaveName();
					}
	            }.bind(this),
	
	            function(error) {
	                this._locationName = "root"; //$NON-NLS-0$
		            if(this._searchNameBox){
						this._searchNameBox.value = this._getDefaultSaveName();
					}
	            }.bind(this));
	        } else {
	            this._locationName = "root"; //$NON-NLS-0$
	            if(this._searchNameBox){
					this._searchNameBox.value = this._getDefaultSaveName();
				}
	        }
	        //this._searchHelper = mSearchUtils.generateSearchHelper(searchParams);
			this._loadSearchParams();
		},
	
		_loadSearchParams: function(){
			if(!this._init || !this._searchParams){
				return;
			}
			this._searchBox.value = this._searchParams.keyword ? this._searchParams.keyword : "";
			this._replaceBox.value = this._searchParams.replace ? this._searchParams.replace : "";
			this._caseSensitiveCB.checked = this._searchParams.caseSensitive;
			this._regExCB.checked = this._searchParams.regEx;
			var x;
			for (x = 0; x < this._fileTypes.options.length; x++) {
			    if(this._fileTypes.options[x].value === this._searchParams.fileType){
					this._fileTypes.selectedIndex = x;
					break;
			    }
			}		
			for (x = 0; x < this._sortBy.options.length; x++) {
			    if(this._sortBy.options[x].value === this._searchParams.sort){
					this._sortBy.selectedIndex = x;
					break;
			    }
			}		
		},
	
		render: function(){
			var contentTypeService = this._serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			if(!contentTypeService){
				contentTypeService = new mContentTypes.ContentTypeRegistry(this._serviceRegistry);
				this.contentTypesCache = contentTypeService.getContentTypes();
				this._render();
			} else {
				contentTypeService.getContentTypes().then(function(ct) {
					this.contentTypesCache = ct;
					this._render();
				}.bind(this));
			}
		},
	
		_render: function(){
			this._parentDiv.innerHTML = optionTemplate;
			this._initHTMLLabels();
		    this._initControls();
			this._searchBox.focus();
			
		},
		
		_submitSearch: function(){
			var options = this.getOptions();
			options.replace = null;
			mSearchUtils.doSearch(this._searcher, this._serviceRegistry, options.keyword, options);
		},
		
		_replacePreview: function(){
			var options = this.getOptions();
			if(!options.replace){
				options.replace = "";
			}
			if(options.keyword){
				mSearchUtils.doSearch(this._searcher, this._serviceRegistry, options.keyword, options);
			}
		},
		
	    _saveSearch: function() {
			if(this._searchBox.value && this._searchNameBox.value){
				var searchParams = this.getOptions(true);
			    var query = mSearchUtils.generateSearchHref(searchParams).split("#")[1]; //$NON-NLS-0$
				this._serviceRegistry.getService("orion.core.savedSearches").addSearch(this._searchNameBox.value, query); //$NON-NLS-0$
			}
	    },
	
	    _getDefaultSaveName: function() {
	        if (this._searchBox && this._searchBox.value) {
	            var qName = "\'" + this._searchBox.value + "\' in "; //$NON-NLS-1$ //$NON-NLS-0$
	            var locName = "root"; //$NON-NLS-0$
	            if(this._locationName){
					locName = this._locationName;
	            }
	            return qName + locName;
	        } 
	        return "";
	    },
	
	    _initCompletion: function() {
			//Required. Reading recent&saved search from user preference. Once done call the uiCallback
			var defaultProposalProvider = function(uiCallback){
				mSearchUtils.getMixedSearches(this._serviceRegistry, true, false, function(searches){
					var i, fullSet = [], hasSavedSearch = false, hasRecentSearch = false;
					for (i in searches) {
						if(searches[i].label && searches[i].value){
							if(!hasSavedSearch){
								fullSet.push({type: "category", label: messages["Saved searches"]});//$NON-NLS-0$
								hasSavedSearch = true;
							}
							fullSet.push({type: "proposal", value: {name: searches[i].label, value: require.toUrl("search/search.html") + "#" + searches[i].value, type: "link"}});  //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							//fullSet.push({type: "proposal", label: searches[i].label, value: searches[i].name});//$NON-NLS-0$
						} else {
							if(!hasRecentSearch){
								fullSet.push({type: "category", label: messages["Recent searches"]});//$NON-NLS-0$
								hasRecentSearch = true;
							}
							fullSet.push({type: "proposal", label: searches[i].name, value: searches[i].name});//$NON-NLS-0$
						}
					}
					uiCallback(fullSet);
				});
			}.bind(this);
			//Optional. Reading extended search proposals by asking plugins, if any.
			//If there are multiple plugins then merge all the proposals and call uiCallBack.
			//Plugins(with service id "orion.search.proposal") should define the property "filterForMe" to true or false. Which means:
			//If true the inputCompletion class will filter the proposals returned by the plugin.
			//If false the inputCompletion class assumes that the proposals are already filtered by hte given kerword. 
			//The false case happens when a plugin wants to use the keyword to ask for a set of filtered proposal from a web service by the keyword and Orion does not need to filter it again.
			var exendedProposalProvider = function(keyWord, uiCallback){
				var serviceReferences = this._serviceRegistry.getServiceReferences("orion.search.proposal"); //$NON-NLS-0$
				if(!serviceReferences || serviceReferences.length === 0){
					uiCallback(null);
					return;
				}
	            var promises = [];
	            var renderer = this;
				serviceReferences.forEach(function(serviceRef) {
					var filterForMe = serviceRef.getProperty("filterForMe");  //$NON-NLS-0$
					promises.push( this._serviceRegistry.getService(serviceRef).run(keyWord).then(function(returnValue) {
						//The return value has to be an array of {category : string, datalist: [string,string,string...]}
						var proposalList = {filterForMe: filterForMe, proposals: []};
						for (var i = 0; i < returnValue.length; i++) {
							proposalList.proposals.push({type: "category", label: returnValue[i].category});//$NON-NLS-0$
							for (var j = 0; j < returnValue[i].datalist.length; j++) {
								proposalList.proposals.push({type: "proposal", label: returnValue[i].datalist[j], value: returnValue[i].datalist[j]});//$NON-NLS-0$
							}
						}
						return proposalList;
					}));
				}.bind(renderer));
				Deferred.all(promises).then(function(returnValues) {
					//Render UI
					uiCallback(returnValues);
				});
			}.bind(this);
			//Create and hook up the inputCompletion instance with the search box dom node.
			//The defaultProposalProvider provides proposals from the recent and saved searches.
			//The exendedProposalProvider provides proposals from plugins.
			this._completion = new mInputCompletion.InputCompletion(this._searchBox, defaultProposalProvider, {serviceRegistry: this._serviceRegistry, group: "globalSearch", extendedProvider: exendedProposalProvider, //$NON-NLS-0$
				onDelete: function(item, evtTarget) {
					mSearchUtils.removeRecentSearch(this._serviceRegistry, item, evtTarget);
				}.bind(this),
				deleteToolTips: messages['Click or use delete key to delete the search term']
			});
	    },
	    
		_initControls: function(){
			this._searchBox = document.getElementById("advSearchInput"); //$NON-NLS-0$
			this._replaceBox = document.getElementById("advReplaceInput"); //$NON-NLS-0$
			this._searchNameBox = document.getElementById("advSaveSearchInput"); //$NON-NLS-0$
			this._fileTypes = document.getElementById("advSearchTypes"); //$NON-NLS-0$
			this._sortBy = document.getElementById("advSortBy"); //$NON-NLS-0$
			this._caseSensitiveCB = document.getElementById("advSearchCaseSensitive"); //$NON-NLS-0$
			this._regExCB = document.getElementById("advSearchRegEx"); //$NON-NLS-0$
			//Load file types content type provider
			var fTypes = [ {label: messages["All types"], value: mSearchUtils.ALL_FILE_TYPE} ];
			for(var i = 0; i < this.contentTypesCache.length; i++){
				if(this.contentTypesCache[i]['extends'] === "text/plain" || this.contentTypesCache[i].id === "text/plain"){ //$NON-NLS-2$  //$NON-NLS-1$ //$NON-NLS-0$
					for(var j = 0; j < this.contentTypesCache[i].extension.length; j++){
						fTypes.push({label: this.contentTypesCache[i].extension[j], value: this.contentTypesCache[i].extension[j]});
					}
				}
			}
			fTypes.forEach(function(fType) {
			    var option = document.createElement('option'); //$NON-NLS-0$
			    var text = document.createTextNode(fType.label);
			    option.appendChild(text);
			    this._fileTypes.appendChild(option);
			    option.value = fType.value;
			}.bind(this));
			var sortByData = [{label: messages["Path name"], value: "Path asc"}, {label: messages["File name"], value: "NameLower asc"}]; //$NON-NLS-1$ //$NON-NLS-0$
			sortByData.forEach(function(sortBy) {
			    var option = document.createElement('option'); //$NON-NLS-0$
			    var text = document.createTextNode(sortBy.label);
			    option.appendChild(text);
			    this._sortBy.appendChild(option);
			    option.value = sortBy.value;
			}.bind(this));
			
			this._init = true;
			this._loadSearchParams();
			this._initCompletion();
			//Add listeners
			this._searchBox.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if(e.defaultPrevented){// If the key event was handled by other listeners and preventDefault was set on(e.g. input completion handled ENTER), we do not handle it here
					return;
				}
				var keyCode= e.charCode || e.keyCode;
				if (keyCode === 13 ) {// ENTER
					this._submitSearch();
				} 
			}.bind(this));
			
			this._searchBox.addEventListener("change", function(e) { //$NON-NLS-0$
				this._searchNameBox.value = this._getDefaultSaveName();
			}.bind(this));
			
			
			this._replaceBox.addEventListener("keydown", function(e) { //$NON-NLS-0$
				var keyCode= e.charCode || e.keyCode;
				if (keyCode === 13 ) {// ENTER
					this._replacePreview();
				} 
			}.bind(this));
			
			this._fileTypes.addEventListener("change", function(e) { //$NON-NLS-0$
				var type = this._fileTypes.options[this._fileTypes.selectedIndex].value;
				if(type === mSearchUtils.ALL_FILE_TYPE){
					this._searchBox.placeholder = messages["Type a search term"];
				} else {
					this._searchBox.placeholder =i18nUtil.formatMessage(messages["All ${0} files"], type);
				}
			}.bind(this));
			
	        var searchCommand = new mCommands.Command({
	            name: messages["Search"],
	            //tooltip: messages["Hide compare view of changes"],
	            id: "orion.globalSearch.search", //$NON-NLS-0$
	            callback: function(data) {
	                this._submitSearch();
	            }.bind(this),
	            visibleWhen: function(item) {
	                return true;
	            }
	        });
	
	        var previewCurrentPageCommand = new mCommands.Command({
	            name: messages['Replace'],
	            //tooltip: messages["Replace all matches with..."],
	            id: "orion.globalSearch.previewCurrentPage", //$NON-NLS-0$
	            callback: function(data) {
	                this._replacePreview();
	            }.bind(this),
	            visibleWhen: function(item) {
	                return true;
	            }
	        });
			
	        var saveSearchCommand = new mCommands.Command({
	            name: messages["Save"],
	            tooltip: messages["Save the current search"],
	            id: "orion.globalSearch.saveSearch", //$NON-NLS-0$
	            callback: function(data) {
	                this._saveSearch();
	            },
	            visibleWhen: function(item) {
	                return true;
	            }
	        });
			/*
			//Init the "More..." option section
			var tableNode = lib.node('moreOptions'); //$NON-NLS-0$
			var moreOptionsSection = new mSection.Section(tableNode, {
				id : "moreOptionsSection", //$NON-NLS-0$
				title : "More...", //$NON-NLS-0$
				content : moreOptionTemplate,
				canHide : true,
				useAuxStyle: true,
				hidden: true,
				onExpandCollapse : function(isExpanded, section) {
				}
			});
			*/
			this._commandService.addCommand(searchCommand);	
			this._commandService.addCommand(previewCurrentPageCommand);	
			this._commandService.addCommand(saveSearchCommand);	
	        this._commandService.registerCommandContribution("advSearchCmd", "orion.globalSearch.search", 1);//$NON-NLS-1$ //$NON-NLS-0$
	        var domWrapperList = [];
	        this._commandService.renderCommands("advSearchCmd", "advSearchCmd", this, this, "button", null, domWrapperList); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	        domWrapperList[0].domNode.classList.add("search-button"); //$NON-NLS-0$
	        this._commandService.registerCommandContribution("advReplacePreviewCmd", "orion.globalSearch.previewCurrentPage", 1);//$NON-NLS-1$ //$NON-NLS-0$
			domWrapperList = [];
	        this._commandService.renderCommands("advReplacePreviewCmd", "advReplacePreviewCmd", this, this, "button", null, domWrapperList); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	        domWrapperList[0].domNode.classList.add("search-button"); //$NON-NLS-0$
	        this._commandService.registerCommandContribution("advSaveSearchCmd", "orion.globalSearch.saveSearch", 1);//$NON-NLS-1$ //$NON-NLS-0$
			domWrapperList = [];
	        this._commandService.renderCommands("advSaveSearchCmd", "advSaveSearchCmd", this, this, "button", null, domWrapperList); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	        domWrapperList[0].domNode.classList.add("search-button"); //$NON-NLS-0$
		},
		
		_initHTMLLabels: function(){
			//document.getElementById("advSearchLabel").appendChild(document.createTextNode(messages["Files that contain:"])); //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSearchInput").placeholder = messages["Type a search term"]; //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advReplaceInput").placeholder = messages["Type a replace term"]; //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSaveSearchInput").placeholder = messages["Type a name for the search"]; //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSearchTypeLabel").appendChild(document.createTextNode(messages["File type"])); //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSearchCaseSensitiveLabel").appendChild(document.createTextNode(messages["Case sensitive"])); //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSearchRegExLabel").appendChild(document.createTextNode(messages["Regular expression"])); //$NON-NLS-0$ //$NON-NLS-0$
			document.getElementById("advSortByLabel").appendChild(document.createTextNode(messages["Sort by"])); //$NON-NLS-0$ //$NON-NLS-0$
		}
	});
	
	/**
	 * AdvSearchOptContainer is the container for all search options.
	 * @param {String|DOMElement} parent the parent element for the container, it can be either a DOM element or an ID for a DOM element.
	 */
	function AdvSearchOptContainer(parent, searcher, serviceRegistry, commandService) {
		this._parent = lib.node(parent);
		this._optRenderer = new AdvSearchOptRenderer(this._parent, searcher, serviceRegistry, commandService);
		this._optRenderer.render();	
	}
	
	AdvSearchOptContainer.prototype.getRenderer = function(){
		return this._optRenderer;
	};
	
	AdvSearchOptContainer.prototype.constructor = AdvSearchOptContainer;
	
	//return module exports
	return {
		AdvSearchOptContainer: AdvSearchOptContainer,
		AdvSearchOptRenderer: AdvSearchOptRenderer
	};
});
