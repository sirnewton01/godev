/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define window */

define(['i18n!git/nls/gitmessages', 'require', 'orion/browserCompatibility', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry',
        'orion/dialogs', 'orion/selection', 'orion/fileClient', 'orion/operationsClient', 'orion/searchClient', 'orion/globalCommands', 'orion/git/gitClient',
        'orion/ssh/sshTools', 'orion/git/gitLogExplorer', 'orion/git/gitCommands',
	    'orion/links', 'orion/PageUtil'], 
		function(messages, require, mBrowserCompatibility, mBootstrap, mStatus, mProgress, mCommandRegistry, mDialogs, mSelection, mFileClient, mOperationsClient,
					mSearchClient, mGlobalCommands, mGitClient, mSshTools, mGitLogExplorer, mGitCommands, mLinks, PageUtil) {

		mBootstrap.startup().then(function(core) {
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			
			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			new mDialogs.DialogService(serviceRegistry);
			var selection = new mSelection.Selection(serviceRegistry);
			new mSshTools.SshService(serviceRegistry);
			var commandService = new mCommandRegistry.CommandRegistry({selection: selection});
			new mProgress.ProgressService(serviceRegistry, operationsClient, commandService);
			var linkService = new mLinks.TextLinkService({serviceRegistry: serviceRegistry});
		
			// Git operations
			var gitClient = new mGitClient.GitService(serviceRegistry);
			var fileClient = new mFileClient.FileClient(serviceRegistry);
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, fileService: fileClient, commandService: commandService});

			// Git log explorer
			var explorer = new mGitLogExplorer.GitLogExplorer(serviceRegistry, fileClient, commandService, selection, 
					null, "table", "pageTitle", "pageActions", "selectionTools", "pageNavigationActions", "itemLevelCommands");
			mGlobalCommands.setPageCommandExclusions(["eclipse.git.remote", "eclipse.git.log"]); //$NON-NLS-1$ //$NON-NLS-0$
			mGlobalCommands.generateBanner("orion-gitlog", serviceRegistry, commandService, preferences, searcher, explorer); //$NON-NLS-0$
			
			//TODO this should be removed and contributed by a plug-in
			mGitCommands.createFileCommands(serviceRegistry, commandService, explorer, "pageActions", "selectionTools"); //$NON-NLS-1$ //$NON-NLS-0$
			
			// define the command contributions - where things appear, first the groups
			commandService.addCommandGroup("itemLevelCommands", "eclipse.gitGroup.nav", 200, messages["More"]); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.addCommandGroup("pageActions", "eclipse.gitGroup.page", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.addCommandGroup("selectionTools", "eclipse.selectionGroup", 500, "More"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			// commands appearing directly in local actions column
			commandService.registerCommandContribution("itemLevelCommands", "eclipse.openGitCommit", 1); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("itemLevelCommands", "eclipse.compareWithWorkingTree", 2); //$NON-NLS-1$ //$NON-NLS-0$
		
			// selection based command contributions in nav toolbar
			commandService.registerCommandContribution("selectionTools", "eclipse.compareGitCommits", 1, "eclipse.selectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			// git contributions
			commandService.registerCommandContribution("pageActions", "eclipse.orion.git.fetch", 100, "eclipse.gitGroup.page"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("pageActions", "eclipse.orion.git.fetchForce", 100, "eclipse.gitGroup.page"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("pageActions", "eclipse.orion.git.merge", 100, "eclipse.gitGroup.page"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("pageActions", "eclipse.orion.git.push", 100, "eclipse.gitGroup.page"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("pageActions", "eclipse.orion.git.pushForce", 100, "eclipse.gitGroup.page"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.addTag", 3); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.cherryPick", 3); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.revert", 3); //$NON-NLS-1$ //$NON-NLS-0$
			// page navigation actions
			commandService.registerCommandContribution("pageNavigationActions", "eclipse.orion.git.previousLogPage", 1); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution("pageNavigationActions", "eclipse.orion.git.nextLogPage", 2); //$NON-NLS-1$ //$NON-NLS-0$

			var pageParams = PageUtil.matchResourceParameters();
			explorer.display(pageParams.resourceRaw);

			window.addEventListener("hashchange", function() {
				var pageParams = PageUtil.matchResourceParameters();
				explorer.display(pageParams.resourceRaw);
			}, false);
		});
	});
