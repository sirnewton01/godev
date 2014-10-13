/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/browserCompatibility', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/fileClient', 'orion/operationsClient',
		'orion/searchClient', 'orion/selection', 'orion/dialogs', 'orion/globalCommands', 'orion/sites/siteUtils', 'orion/sites/siteCommands', 
		'orion/sites/sitesExplorer', 'i18n!orion/sites/nls/messages'], 
	function(mBrowserCompatibility, mBootstrap, mStatus, mProgress, mCommandRegistry, mFileClient, mOperationsClient, mSearchClient, mSelection, mDialogs, mGlobalCommands, mSiteUtils, mSiteCommands, SitesExplorer, messages) {
		mBootstrap.startup().then(function(core) {
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			// Register services
			var dialogService = new mDialogs.DialogService(serviceRegistry);
			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			var selection = new mSelection.Selection(serviceRegistry);
			var commandRegistry = new mCommandRegistry.CommandRegistry({ });
			var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

			var fileClient = new mFileClient.FileClient(serviceRegistry);
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});

			function createCommands() {
				var errorHandler = statusService.setProgressResult.bind(statusService);
				var goToUrl = function(url) {
					window.location = url;
				};
				mSiteCommands.createSiteServiceCommands(serviceRegistry, commandRegistry, {
					createCallback: goToUrl,
					errorHandler: errorHandler
				});
				mSiteCommands.createSiteCommands(serviceRegistry, commandRegistry);
			}
			
			mGlobalCommands.generateBanner("orion-sites", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
			mGlobalCommands.setPageTarget({task: messages["Sites"]});
			
			var explorer = new SitesExplorer(serviceRegistry, selection, commandRegistry, "table"); //$NON-NLS-0$
			createCommands();
			explorer.display();
	});
});