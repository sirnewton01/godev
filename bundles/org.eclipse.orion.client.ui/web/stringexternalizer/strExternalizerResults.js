/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['orion/searchExplorer', 'stringexternalizer/strExternalizerModel', 'stringexternalizer/nonnlsSearchUtil'], function(mSearchExplorer, mStrExternalizerModel, mSearchUtils){

	/**
	 * Creates a new search results generator.
	 * @name orion.searchResults.SearchResultsGenerator
	 * @class A search results generator for display search results to an end user
	 */
	function SearchResultsGenerator(serviceRegistry, resultsId, commandService, fileService) {
		this.registry = serviceRegistry;
		this.fileService = fileService;
		this.resultsId = resultsId;
		this.commandService = commandService;
		this.explorer = new mSearchExplorer.SearchResultExplorer(this.registry, this.commandService);
	}

	SearchResultsGenerator.prototype = /** @lends orion.searchResults.SearchResultsGenerator.prototype */ {
		_renderSearchResult: function(resultsNode, jsonData) {
			resultsNode.innerHTML = "";
	        var searchModel = new mStrExternalizerModel.StrExternalizerModel(this.registry, this.explorer.fileClient,jsonData);
	        if(this.config){
	        	searchModel.setConfig(this.config);
	        }
			this.explorer.setResult(resultsNode, searchModel);
			this.explorer.startUp();
		},

		/**
		 * Runs a search and displays the results under the given DOM node.
		 * @public
		 * @param {DOMNode} resultsNode Node under which results will be added.
		 */
		_search: function(resultsNode, root) {
			var progress = this.registry.getService("orion.page.progress");
			var search = new mSearchUtils.NonNlsSearch(this.fileService, root, progress);
			try{
				var self = this;
				search.getNonNls().then(function(nonNLS){
					self._renderSearchResult(resultsNode, nonNLS);
				}, function(error){
					throw error;
				});
			}
			catch(error){
				this.registry.getService("orion.page.message").setErrorMessage(error);	 //$NON-NLS-0$
			}
		},

		/**
		 * Performs the given query and generates the user interface 
		 * representation of the search results.
		 * @param {String} query The search query
		 */
		loadResults: function(root) {
			this.root = root;
			var parent = document.getElementById(this.resultsId);
			parent.innerHTML = "";
			parent.appendChild(document.createTextNode("Searching for non externalized strings..."));
			this._search(parent, root);
		},
		
		setConfig: function(config){
			this.config = config;
			if(this.explorer.model){
				this.explorer.model.setConfig(config);
			}
			this.explorer.buildPreview();
		}
		
	};
	SearchResultsGenerator.prototype.constructor = SearchResultsGenerator;
	//return module exports
	return {SearchResultsGenerator:SearchResultsGenerator};
});