/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document window */

define(['orion/bootstrap', 'orion/status', 'orion/progress', 'orion/operationsClient', 'orion/commandRegistry', 'orion/fileClient', 'orion/searchClient', 'orion/globalCommands',
		'orion/contentTypes', 'orion/PageUtil', 'orion/compare/compareTreeExplorer'],
		function(mBootstrap, mStatus, mProgress, mOperationsClient, mCommandRegistry, mFileClient, mSearchClient, mGlobalCommands, mContentTypes, PageUtil, mCompareTreeExplorer) {
	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
		// File operations
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var searcher = new mSearchClient.Searcher({
			serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient
		});
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		mGlobalCommands.generateBanner("orion-compare-tree", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$

		var startWidget = function(){
			var compareParams = PageUtil.matchResourceParameters();
			var compareTreeExplorer = new mCompareTreeExplorer.CompareTreeExplorer(serviceRegistry, "compare-tree-results", commandRegistry); //$NON-NLS-0$
			compareTreeExplorer.startup(compareParams);
		};
		startWidget();
		// every time the user manually changes the hash, we need to reastart the compare widget.
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			startWidget();
		}, false);		
	});
});