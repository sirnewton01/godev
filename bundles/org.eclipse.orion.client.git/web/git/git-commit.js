/*******************************************************************************
 * @license Copyright (c) 2011, 2013 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

 /*global define document window */

var eclipse;

define(['i18n!git/nls/gitmessages', 'require', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/commands', 'orion/keyBinding', 'orion/dialogs', 'orion/selection',
		'orion/fileClient', 'orion/operationsClient', 'orion/searchClient', 'orion/globalCommands', 'orion/git/gitCommitExplorer', 'orion/git/gitCommands', 'orion/widgets/themes/ThemePreferences', 'orion/widgets/themes/editor/ThemeData',
		'orion/git/gitClient', 'orion/links', 'orion/contentTypes', 'orion/PageUtil'],
		function(messages, require, mBootstrap, mStatus, mProgress, CommandRegistry,
		Commands, KeyBinding, mDialogs, mSelection, mFileClient, mOperationsClient, mSearchClient, mGlobalCommands, mGitCommitExplorer, mGitCommands, mThemePreferences, mThemeData, mGitClient, mLinks,
		mContentTypes, PageUtil) {

	mBootstrap.startup().then(
		function(core) {
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;

			new mDialogs.DialogService(serviceRegistry);
			var selection = new mSelection.Selection(serviceRegistry);
			var commandRegistry = new CommandRegistry.CommandRegistry({selection: selection});
			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
			var themePreferences = new mThemePreferences.ThemePreferences(preferences, new mThemeData.ThemeData());
			themePreferences.apply();

			// ...
			var linkService = new mLinks.TextLinkService({serviceRegistry: serviceRegistry});
			var gitClient = new mGitClient.GitService(serviceRegistry);
			var fileClient = new mFileClient.FileClient(serviceRegistry);
			var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
			var searcher = new mSearchClient.Searcher({
				serviceRegistry: serviceRegistry,
				commandService: commandRegistry,
				fileService: fileClient
			});

			var explorer = new mGitCommitExplorer.GitCommitExplorer(serviceRegistry, commandRegistry, linkService, /* selection */null,
				"artifacts", "pageActions", null, "itemLevelCommands"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			mGlobalCommands.generateBanner("orion-git-commit", serviceRegistry, commandRegistry, preferences, searcher, explorer); //$NON-NLS-0$

			// define commands
			mGitCommands.createFileCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools"); //$NON-NLS-1$ //$NON-NLS-0$
			mGitCommands.createGitClonesCommands(serviceRegistry, commandRegistry, explorer, "pageActions", "selectionTools", fileClient); //$NON-NLS-1$ //$NON-NLS-0$

			// define the command contributions - where things appear, first
			// the groups
			commandRegistry.addCommandGroup("pageActions", "eclipse.gitGroup", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.cherryPick", 100, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.revert", 101, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("pageActions", "eclipse.orion.git.askForReviewCommand", 102, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(
				"pageActions", "eclipse.orion.git.openCommitCommand", 102, "eclipse.gitGroup", true, new KeyBinding.KeyBinding('h', true, true)); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			// object contributions
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.removeTag", 1000); //$NON-NLS-1$ //$NON-NLS-0$

			var showDiffCommand = new Commands.Command({ 
				name: messages["Working Directory Version"],
				tooltip: messages["View the working directory version of the file"],
				id: "eclipse.orion.git.diff.showCurrent", //$NON-NLS-0$
				hrefCallback: function(data) {
					return require.toUrl("edit/edit.html") + "#" + data.items.ContentLocation; //$NON-NLS-1$ //$NON-NLS-0$
				},
				visibleWhen: function(item) {
					return item.Type === "Diff"; //$NON-NLS-0$
				}
			});

			commandRegistry.addCommand(showDiffCommand);
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.diff.showCurrent", 2000); //$NON-NLS-1$ //$NON-NLS-0$

			var pageParams = PageUtil.matchResourceParameters();
			explorer.display(pageParams.resource);

			window.addEventListener("hashchange", function() { //$NON-NLS-0$
				var pageParams = PageUtil.matchResourceParameters();
				explorer.display(pageParams.resource);
			}, false);
		}
	);
}); // end of define