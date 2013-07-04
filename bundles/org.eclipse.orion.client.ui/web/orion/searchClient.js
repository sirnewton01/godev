/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors:
 * IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*global define window document console*/
/*jslint forin:true regexp:false sub:true*/

define([
	'i18n!orion/search/nls/messages', 'require', 'orion/webui/littlelib', 'orion/i18nUtil', 'orion/searchUtils', 'orion/crawler/searchCrawler',
	'orion/explorers/navigatorRenderer', 'orion/extensionCommands', 'orion/Deferred'
	],
function(messages, require, lib, i18nUtil, mSearchUtils, mSearchCrawler, navigatorRenderer, extensionCommands, Deferred){

	//default search renderer until we factor this out completely
	function DefaultSearchRenderer(serviceRegistry, commandRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.commandRegistry = commandRegistry;
		this.openWithCommands = null;
	}
	/**
	 * Create a renderer to display search results.
	 * @public
     * @param {DOMNode} resultsNode Node under which results will be added.
	 * @param {String} [heading] the heading text, or null if none required
	 * @param {Function(DOMNode)} [onResultReady] If any results were found, this is called on the resultsNode.
	 * @param {Function(DOMNode)} [decorator] A function to be called that knows how to decorate each row in the result table
	 *   This function is passed a <td> element.
	 * @returns a render function.
	 */
	DefaultSearchRenderer.prototype.makeRenderFunction = function(contentTypeService, resultsNode, heading, onResultReady, decorator) {
		var serviceRegistry = this.serviceRegistry, commandRegistry = this.commandRegistry;
		this.openWithCommands = this.openWithCommands || extensionCommands.createOpenWithCommands(serviceRegistry, contentTypeService, commandRegistry);

		/**
		 * Displays links to resources under the given DOM node.
		 * @param {Object[]} resources array of resources. The shape of a resource is {name, path, lineNumber, directory, isExternalResource}
		 *	Both directory and isExternalResource cannot be true at the same time.
		 * @param {String} [queryName] A human readable name to display when there are no matches.  If 
		 *  not used, then there is nothing displayed for no matches
		 * @param {String} [error] A human readable error to display.
		 */
		var _self = this;
		function render(resources, queryName, error) {
			Deferred.when(_self.openWithCommands, function(openWithCommands) {
				if (error) {
					lib.empty(resultsNode);
					var message = document.createElement("div"); //$NON-NLS-0$
					message.appendChild(document.createTextNode(messages["Search failed."]));
					resultsNode.appendChild(message);
					if (typeof(onResultReady) === "function") { //$NON-NLS-0$
						onResultReady(resultsNode);
					}
					return;
				} 
			
				//Helper function to append a path String to the end of a search result dom node 
				var appendPath = (function() { 
				
					//Map to track the names we have already seen. If the name is a key in the map, it means
					//we have seen it already. Optionally, the value associated to the key may be a function' 
					//containing some deferred work we need to do if we see the same name again.
					var namesSeenMap = {};
					
					function doAppend(domElement, resource) {
						var path = resource.folderName ? resource.folderName : resource.path;
						var pathNode = document.createElement('span'); //$NON-NLS-0$
						pathNode.id = path.replace(/[^a-zA-Z0-9_\.:\-]/g,'');
						pathNode.appendChild(document.createTextNode(' - ' + path + ' ')); //$NON-NLS-1$ //$NON-NLS-0$
						domElement.appendChild(pathNode);
					}
					
					function appendPath(domElement, resource) {
						var name = resource.name;
						if (namesSeenMap.hasOwnProperty(name)) {
							//Seen the name before
							doAppend(domElement, resource);
							var deferred = namesSeenMap[name];
							if (typeof(deferred)==='function') { //$NON-NLS-0$
								//We have seen the name before, but prior element left some deferred processing
								namesSeenMap[name] = null;
								deferred();
							}
						} else {
							//Not seen before, so, if we see it again in future we must append the path
							namesSeenMap[name] = function() { doAppend(domElement, resource); };
						}
					}
					return appendPath;
				}()); //End of appendPath function
	
				var foundValidHit = false;
				lib.empty(resultsNode);
				if (resources && resources.length > 0) {
					var table = document.createElement('table'); //$NON-NLS-0$
					table.setAttribute('role', 'presentation'); //$NON-NLS-1$ //$NON-NLS-0$
					for (var i=0; i < resources.length; i++) {
						var resource = resources[i];
						var col;
						if (!foundValidHit) {
							foundValidHit = true;
							// Every caller is passing heading === false, consider removing this code.
							if (heading) {
								var headingRow = table.insertRow(0);
								col = headingRow.insertCell(0);
								col.textContent = heading;
							}
						}
						var row = table.insertRow(-1);
						col = row.insertCell(0);
						col.colspan = 2;
						if (decorator) {
							decorator(col);
						}
	
						// Transform into File object that navigatorRenderer can consume
						var item = {
							Name: resource.name,
							Directory: resource.directory,
							Location: resource.path || resource.location /*is location ever provided?*/
						};
						var resourceLink = navigatorRenderer.createLink(require.toUrl("navigate/table.html"), item, commandRegistry, contentTypeService,
							openWithCommands, null /*defaultEditor*/, {
								"aria-describedby": (resource.folderName ? resource.folderName : resource.path).replace(/[^a-zA-Z0-9_\.:\-]/g,''), //$NON-NLS-0$
								style: {
									verticalAlign: "middle" //$NON-NLS-0$
								}
							});
						if (resource.LineNumber) { // FIXME LineNumber === 0 
							resourceLink.appendChild(document.createTextNode(' (Line ' + resource.LineNumber + ')'));
						}
	
						col.appendChild(resourceLink);
						appendPath(col, resource);
					}
					resultsNode.appendChild(table);
					if (typeof(onResultReady) === "function") { //$NON-NLS-0$
						onResultReady(resultsNode);
					}
				}
				if (!foundValidHit) {
					// only display no matches found if we have a proper name
					if (queryName) {
						var errorStr = i18nUtil.formatMessage(messages["No matches found for ${0}"], queryName); 
						lib.empty(resultsNode);
						resultsNode.appendChild(document.createTextNode(errorStr)); 
						if (typeof(onResultReady) === "function") { //$NON-NLS-0$
							onResultReady(resultsNode);
						}
					}
				} 
			});
		} // end render
		return render;
	};//end makeRenderFunction

	/**
	 * Creates a new search client.
	 * @param {Object} options The options object
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry
	 * @name orion.searchClient.Searcher
	 * @class Provides API for searching the workspace.
	 */
	function Searcher(options) {
		this.registry= options.serviceRegistry;
		this._commandService = options.commandService;
		this._fileService = options.fileService;
		this.defaultRenderer = new DefaultSearchRenderer(this.registry, this._commandService); //default search renderer until we factor this out completely
		if(!this._fileService){
			console.error("No file service on search client"); //$NON-NLS-0$
		}
	}
	Searcher.prototype = /**@lends orion.searchClient.Searcher.prototype*/ {
		/**
		 * Runs a search and displays the results under the given DOM node.
		 * @public
		 * @param {Object} searchParams The search parameters.
		 * @param {String} [excludeFile] URI of a file to exclude from the result listing.
		 * @param {Function(JSONObject)} Callback function that receives the results of the query.
		 */
		search: function(searchParams, excludeFile, renderer) {
			var transform = function(jsonData) {
				var transformed = [];
				for (var i=0; i < jsonData.response.docs.length; i++) {
					var hit = jsonData.response.docs[i];
					transformed.push({name: hit.Name, 
									  path: hit.Location, 
									  folderName: mSearchUtils.path2FolderName(hit.Path ? hit.Path : hit.Location, hit.Name),
									  directory: hit.Directory, 
									  lineNumber: hit.LineNumber});
				}
				return transformed;
			};
			if(this._crawler && searchParams.nameSearch){
				this._crawler.searchName(searchParams, function(jsonData){renderer(transform(jsonData), null);});
			} else {
				try {
					this.registry.getService("orion.page.progress").progress(this._fileService.search(searchParams), "Searching " + searchParams.keyword).then(function(jsonData) { //$NON-NLS-1$ //$NON-NLS-0$
						/**
						 * transforms the jsonData so that the result conforms to the same
						 * format as the favourites list. This way renderer implementation can
						 * be reused for both.
						 * jsonData.response.docs{ Name, Location, Directory, LineNumber }
						 */
						var token = searchParams.keyword;//jsonData.responseHeader.params.q;
						token= token.substring(token.indexOf("}")+1); //$NON-NLS-0$
						//remove field name if present
						token= token.substring(token.indexOf(":")+1); //$NON-NLS-0$
						renderer(transform(jsonData), token);
					}, function(error) {
						renderer(null, null, error);
					});
				}
				catch(error){
					if(typeof(error) === "string" && error.indexOf("search") > -1 && this._crawler){ //$NON-NLS-1$ //$NON-NLS-0$
						this._crawler.searchName(searchParams, function(jsonData){renderer(transform(jsonData), null);});
					} else if(typeof(error) === "string" && error.indexOf("search") > -1 && !searchParams.nameSearch){ //$NON-NLS-1$ //$NON-NLS-0$
						var crawler = new mSearchCrawler.SearchCrawler(this.registry, this._fileService, searchParams, {childrenLocation: this.getChildrenLocation()});
						crawler.search(function(jsonData){renderer(transform(jsonData), null);});
					} else {
						this.registry.getService("orion.page.message").setErrorMessage(error);	 //$NON-NLS-0$
					}
				}
			}
		},
		getFileService: function(){
			return this._fileService;
		},
		setCrawler: function(crawler){
			this._crawler = crawler;
		},
		handleError: function(response, resultsNode) {
			console.error(response);
			lib.empty(resultsNode);
			resultsNode.appendChild(document.createTextNode(response));
			return response;
		},
		setLocationByMetaData: function(meta, useParentLocation){
			var locationName = "";
			var noneRootMeta = null;
			this._searchRootLocation = this._fileService.fileServiceRootURL(meta.Location);
			if(useParentLocation && meta && meta.Parents && meta.Parents.length > 0){
				if(useParentLocation.index === "last"){ //$NON-NLS-0$
					noneRootMeta = meta.Parents[meta.Parents.length-1];
				} else {
					noneRootMeta = meta.Parents[0];
				}
			} else if(meta &&  meta.Directory && meta.Location && meta.Parents){
				noneRootMeta = meta;
			} 
			if(noneRootMeta){
				this.setLocationbyURL(noneRootMeta.Location);
				locationName = noneRootMeta.Name;
				this._childrenLocation = noneRootMeta.ChildrenLocation;
			} else if(meta){
				this.setLocationbyURL(this._searchRootLocation);
				locationName = this._fileService.fileServiceName(meta.Location);
				this._childrenLocation = meta.ChildrenLocation;
			}
			var searchInputDom = lib.node("search"); //$NON-NLS-0$
			if(!locationName){
				locationName = "";
			}
			if(searchInputDom && searchInputDom.placeholder){
				searchInputDom.value = "";
				var placeHolder = i18nUtil.formatMessage(messages["Search ${0}"], locationName);
				
				if(placeHolder.length > 30){
					searchInputDom.placeholder = placeHolder.substring(0, 27) + "..."; //$NON-NLS-0$
				} else {
					searchInputDom.placeholder = i18nUtil.formatMessage(messages["Search ${0}"], locationName);
				}
			}
			if(searchInputDom && searchInputDom.title){
				searchInputDom.title = messages["Type a keyword or wild card to search in "] + locationName;
			}
		},
		setLocationbyURL: function(locationURL){
			this._searchLocation = locationURL;
		},
		setRootLocationbyURL: function(locationURL){
			this._searchRootLocation = locationURL;
		},
		setChildrenLocationbyURL: function(locationURL){
			this._childrenLocation = locationURL;
		},
		getSearchLocation: function(){
			if(this._searchLocation){
				return this._searchLocation;
			} else {
				return this._fileService.fileServiceRootURL();
			}
		},
		getSearchRootLocation: function(){
			if(this._searchRootLocation){
				return this._searchRootLocation;
			} else {
				return this._fileService.fileServiceRootURL();
			}
		},
		getChildrenLocation: function(){
			if(this._childrenLocation){
				return this._childrenLocation;
			} else {
				return this._fileService.fileServiceRootURL();
			}
		},
		/**
		 * Returns a query object for search. The return value has the propertyies of resource and parameters.
		 * @param {String} keyword The text to search for, or null when searching purely on file name
		 * @param {Boolean} [nameSearch] The name of a file to search for
		 * @param {Boolean} [useRoot] If true, do not use the location property of the searcher. Use the root url of the file system instead.
		 */
		createSearchParams: function(keyword, nameSearch, useRoot, advancedOptions)  {
			var searchOn = useRoot ? this.getSearchRootLocation(): this.getSearchLocation();
			if (nameSearch) {
				//assume implicit trailing wildcard if there isn't one already
				//var wildcard= (/\*$/.test(keyword) ? "" : "*"); //$NON-NLS-0$
				return {
					resource: searchOn,
					sort: "NameLower asc", //$NON-NLS-0$
					rows: 100,
					start: 0,
					nameSearch: true,
					keyword: keyword
				};
			}
			return {
				resource: searchOn,
				sort: advancedOptions && advancedOptions.sort ? advancedOptions.sort : "Path asc", //$NON-NLS-0$
				rows: advancedOptions && advancedOptions.rows ? advancedOptions.rows : 40,
				start: 0,
				caseSensitive: advancedOptions ? advancedOptions.caseSensitive : undefined,
				regEx: advancedOptions ? advancedOptions.regEx : undefined,
				fileType: advancedOptions ? advancedOptions.fileType : undefined,
				keyword: keyword,
				replace: advancedOptions ? advancedOptions.replace : undefined
			};
		}
	};

	Searcher.prototype.constructor = Searcher;
	//return module exports
	return {Searcher:Searcher};
});
