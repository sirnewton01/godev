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

/*global define window*/
/*jslint regexp:false browser:true forin:true*/

define(['i18n!orion/search/nls/messages', 'orion/i18nUtil','require', 'orion/webui/littlelib', 'orion/searchExplorer', 'orion/searchModel', 'orion/searchUtils', 'orion/crawler/searchCrawler'], function(messages, i18nUtil, require, lib, mSearchExplorer, mSearchModel, mSearchUtils, mSearchCrawler){

	/**
	 * Creates a new search results generator.
	 * @name orion.searchResults.SearchResultsGenerator
	 * @class A search results generator for display search results to an end user
	 */
	function SearchResultsGenerator(serviceRegistry, resultsId, commandService, fileService, searcher, crawling) {
		this.registry = serviceRegistry;
		this.fileService = fileService;
		this.resultsId = resultsId;
		this.commandService = commandService;
		this.searcher = searcher;
		this.crawling = crawling;
		this.explorer = new mSearchExplorer.SearchResultExplorer(this.registry, this.commandService);
	}

	SearchResultsGenerator.prototype = /** @lends orion.searchResults.SearchResultsGenerator.prototype */ {

		_renderSearchResult: function(crawling, resultsNode, searchParams, jsonData, incremental) {
			var foundValidHit = false;
			var resultLocation = [];
			lib.empty(lib.node(resultsNode));
			if (jsonData.response.numFound > 0) {
				for (var i=0; i < jsonData.response.docs.length; i++) {
					var hit = jsonData.response.docs[i];
					if (!hit.Directory) {
						if (!foundValidHit) {
							foundValidHit = true;
						}
						var loc = hit.Location;
						resultLocation.push({linkLocation: require.toUrl("edit/edit.html") +"#" + loc, location: loc, path: hit.Path ? hit.Path : loc, name: hit.Name, lastModified: hit.LastModified}); //$NON-NLS-1$ //$NON-NLS-0$
						
					}
				}
			}
			this.explorer.setCrawling(crawling);
			var that = this;
	        var searchModel = new mSearchModel.SearchResultModel(this.registry, this.explorer.fileClient, resultLocation, jsonData.response.numFound, searchParams, {
	            onMatchNumberChanged: function(fileItem) {
	                that.explorer.renderer.replaceFileElement(fileItem);
	            }
	        });
			this.explorer.setResult(resultsNode, searchModel);
			if(incremental){
				this.explorer.incrementalRender();
			} else {
				this.explorer.startUp();
			}
		},

		/**
		 * Runs a search and displays the results under the given DOM node.
		 * @public
		 * @param {DOMNode} resultsNode Node under which results will be added.
		 * @param {String} query URI of the query to run.
		 * @param {String} [excludeFile] URI of a file to exclude from the result listing.
		 * @param {Boolean} [generateHeading] generate a heading for the results
		 * @param {Function(DOMNode)} [onResultReady] If any results were found, this is called on the resultsNode.
		 * @param {Boolean} [hideSummaries] Don't show the summary of what matched beside each result.
		 * @param {Boolean} [useSimpleFormat] Use simple format that only shows the file name to show the result, other wise use a complex format with search details.
		 */
		_search: function(resultsNode, searchParams) {
			//For crawling search, temporary
			//TODO: we need a better way to render the progress and allow user to be able to cancel hte crawling search
			this.crawling = searchParams.regEx || searchParams.caseSensitive;
			var parent = lib.node(this.resultsId);
			var that = this, crawler;
			lib.empty(lib.node("pageNavigationActions")); //$NON-NLS-0$
			lib.empty(lib.node("pageActions")); //$NON-NLS-0$
			//If there is no search keyword defined, then we treat the search just as the scope change.
			if(typeof searchParams.keyword === "undefined"){ //$NON-NLS-0$
				lib.empty(parent);
				return;
			}
			if(this.crawling){
				lib.empty(parent);
				parent.appendChild(document.createTextNode(""));
				crawler = new mSearchCrawler.SearchCrawler(this.registry, this.fileService, searchParams, {childrenLocation: this.searcher.getChildrenLocation()});
				crawler.search(function(jsonData, incremental){that._renderSearchResult(true, resultsNode, searchParams, jsonData, incremental);});
			} else {
				lib.empty(parent);
				this.registry.getService("orion.page.message").setProgressMessage(messages["Searching..."]); //$NON-NLS-0$
				try{
					this.registry.getService("orion.page.progress").progress(this.fileService.search(searchParams), "Searching " + searchParams.keyword).then( //$NON-NLS-1$ //$NON-NLS-0$
						function(jsonData) {
							this.registry.getService("orion.page.message").setProgressMessage(""); //$NON-NLS-0$
							this._renderSearchResult(false, resultsNode, searchParams, jsonData);
						}.bind(this),
						function(error) {
							var message = i18nUtil.formatMessage(messages["${0}. Try your search again."], error && error.error ? error.error : "Error"); //$NON-NLS-0$
							this.registry.getService("orion.page.message").setProgressResult({Message: message, Severity: "Error"}); //$NON-NLS-0$
						}.bind(this)
					);
				}
				catch(error){
					lib.empty(parent);
					parent.appendChild(document.createTextNode(""));
					if(typeof(error) === "string" && error.indexOf("search") > -1){ //$NON-NLS-1$ //$NON-NLS-0$
						crawler = new mSearchCrawler.SearchCrawler(this.registry, this.fileService, searchParams, {childrenLocation: this.searcher.getChildrenLocation()});
						crawler.search(function(jsonData, incremental){that._renderSearchResult(true, resultsNode, searchParams, jsonData, incremental);});
					} else {
						this.registry.getService("orion.page.message").setErrorMessage(error);	 //$NON-NLS-0$
					}
				}
			}
		},

		/**
		 * Performs the given query and generates the user interface 
		 * representation of the search results.
		 * @param {String} query The search query
		 */
		loadResults: function(query) {
			// console.log("loadResourceList old " + this._lastHash + " new " + path);
			var parent = lib.node(this.resultsId);
			this._search(parent, query);
		}
		
	};
	SearchResultsGenerator.prototype.constructor = SearchResultsGenerator;
	//return module exports
	return {SearchResultsGenerator:SearchResultsGenerator};
});
