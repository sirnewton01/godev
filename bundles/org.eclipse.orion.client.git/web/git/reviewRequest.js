/*******************************************************************************
 * @license Copyright (c) 2012 IBM Corporation and others. All rights reserved.
 *          This program and the accompanying materials are made available under
 *          the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*globals define window*/
var eclipse;

define([ 'i18n!git/nls/gitmessages', 'require', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/dialogs', 'orion/selection',
		'orion/fileClient', 'orion/operationsClient', 'orion/searchClient', 'orion/globalCommands', 'orion/git/gitReviewRequestExplorer',
		'orion/git/gitCommands', 'orion/git/gitClient', 'orion/ssh/sshTools', 'orion/links', 'orion/contentTypes', 'orion/PageUtil' ], function(messages,
		require, mBootstrap, mStatus, mProgress, mCommandRegistry, mDialogs, mSelection, mFileClient, mOperationsClient, mSearchClient, mGlobalCommands,
		mGitReviewRequestExplorer, mGitCommands, mGitClient, mSshTools, mLinks, mContentTypes, PageUtil) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;

		new mDialogs.DialogService(serviceRegistry);
		var selection = new mSelection.Selection(serviceRegistry);
		new mSshTools.SshService(serviceRegistry);
		var commandRegistry = new mCommandRegistry.CommandRegistry({ selection: selection });
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		// ...
		var linkService = new mLinks.TextLinkService({ serviceRegistry : serviceRegistry
		});
		var gitClient = new mGitClient.GitService(serviceRegistry);
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var searcher = new mSearchClient.Searcher({ serviceRegistry : serviceRegistry,
		commandService : commandRegistry,
		fileService : fileClient
		});

		var explorer = new mGitReviewRequestExplorer.GitReviewRequestExplorer(fileClient, commandRegistry, serviceRegistry, gitClient); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.setPageCommandExclusions([ "eclipse.git.status2", "eclipse.git.status" ]); //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.generateBanner("orion-reviewRequest", serviceRegistry, commandRegistry, preferences, searcher, explorer); //$NON-NLS-0$

		// define commands
		mGitCommands.createFileCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools"); //$NON-NLS-1$ //$NON-NLS-0$
		mGitCommands.createGitClonesCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools", fileClient); //$NON-NLS-1$ //$NON-NLS-0$

		// page command contributions
		commandRegistry.addCommandGroup("pageActions", "eclipse.gitGroup", 100); //$NON-NLS-1$ //$NON-NLS-0$

		commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.resetCommand", 100, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.rebaseContinueCommand", 200, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.rebaseSkipPatchCommand", 300, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.rebaseAbortCommand", 400, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		var pageParams = PageUtil.matchResourceParameters();
		explorer.display(pageParams.resource);

		window.addEventListener("hashchange", function() {
			var pageParams = PageUtil.matchResourceParameters();
			explorer.display(pageParams.resource);
		}, false);
	});
}); // end of define
