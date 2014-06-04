/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window define document*/
/*browser:true*/

define(['i18n!orion/search/nls/messages', 'require', 'orion/browserCompatibility', 'orion/bootstrap', 'orion/status', 'orion/progress','orion/dialogs',
        'orion/commandRegistry', 'orion/searchClient', 'orion/fileClient', 'orion/operationsClient', 'orion/searchResults', 'orion/globalCommands', 
        'orion/contentTypes', 'orion/searchUtils', 'orion/PageUtil','orion/webui/littlelib', 'orion/globalSearch/advSearchOptContainer'], 
		function(messages, require, mBrowserCompatibility, mBootstrap, mStatus, mProgress, mDialogs, mCommandRegistry, 
				mSearchClient, mFileClient, mOperationsClient, mSearchResults, mGlobalCommands, mContentTypes, mSearchUtils, PageUtil, lib, mAdvSearchOptContainer) {
	
	function setPageInfo(serviceRegistry, fileClient, commandService, searcher, searchResultsGenerator, searchBuilder, searchParams, progress){
		var searchLoc = searchParams.resource;
		var title = searchParams.replace ? messages["Replace All Matches"] : messages["Search Results"];
		if(searchLoc){
			if(searchLoc === fileClient.fileServiceRootURL(searchLoc)){
				searcher.setRootLocationbyURL(searchLoc);
				searcher.setLocationbyURL(searchLoc);
				mGlobalCommands.setPageTarget({task: "Search", title: title, serviceRegistry: serviceRegistry, //$NON-NLS-0$
					commandService: commandService, searchService: searcher, fileService: fileClient, breadcrumbRootName: "Search", staticBreadcrumb: true}); //$NON-NLS-0$
				searcher.setChildrenLocationbyURL(searchLoc);
				searchBuilder.loadSearchParams(searchParams);
				searchResultsGenerator.loadResults(searchParams);
			} else {
				(progress ? progress.progress(fileClient.read(searchLoc, true), "Loading file metadata " + searchLoc) : fileClient.read(searchLoc, true)).then( //$NON-NLS-0$
					function(metadata) {
						mGlobalCommands.setPageTarget({task: "Search", title: title, target: metadata, serviceRegistry: serviceRegistry,  //$NON-NLS-0$
							fileService: fileClient, commandService: commandService, searchService: searcher, staticBreadcrumb: true, breadcrumbRootName: "Search"}); //$NON-NLS-0$
						searchBuilder.loadSearchParams(searchParams);
						searchResultsGenerator.loadResults(searchParams);
					}.bind(this),
					function(error) {
						window.console.error("Error loading file metadata: " + error.message); //$NON-NLS-0$
					}.bind(this)
				);
			}
		} else {
			mGlobalCommands.setPageTarget({task: "Search", title: title, serviceRegistry: serviceRegistry,  //$NON-NLS-0$
				commandService: commandService, searchService: searcher, fileService: fileClient, staticBreadcrumb: true, breadcrumbRootName: "Search"}); //$NON-NLS-0$
			searchBuilder.loadSearchParams(searchParams);
			searchResultsGenerator.loadResults(searchParams);
		}
	}
	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;

		var dialogService = new mDialogs.DialogService(serviceRegistry);
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
		var progress = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
		// saved searches

		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
	
		var searchOptionsContainer = new mAdvSearchOptContainer.AdvSearchOptContainer("searchBuilder", searcher, serviceRegistry, commandRegistry);
		var searchBuilder = searchOptionsContainer.getRenderer();
		
		mGlobalCommands.generateBanner("orion-searchResults", serviceRegistry, commandRegistry, preferences, searcher, searcher, null, false); //$NON-NLS-0$
		
		var searchResultsGenerator = new mSearchResults.SearchResultsGenerator(serviceRegistry, "results", commandRegistry, fileClient, searcher, false/*crawling*/); //$NON-NLS-0$

		var startWidget = function(){
	        var filterNode = lib.node("filterBox");
	        if (filterNode) {
	            lib.empty(filterNode);
	        }
			var searchParams = PageUtil.matchResourceParameters();
			mSearchUtils.convertSearchParams(searchParams);
			setPageInfo(serviceRegistry, fileClient, commandRegistry, searcher, searchResultsGenerator, searchBuilder, searchParams, progress);
			var toolbar = document.getElementById("pageActions"); //$NON-NLS-0$
			if (toolbar) {	
				commandRegistry.destroy(toolbar);
				commandRegistry.renderCommands(toolbar.id, toolbar, searcher, searcher, "button"); //$NON-NLS-0$
			}
		};
		//every time the user manually changes the hash, we need to load the results with that name
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			startWidget();
		}, true);		
		startWidget();
		
	});
});


