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

/*eslint-env browser, amd*/
define(['i18n!orion/operations/nls/messages', 'orion/bootstrap', 'orion/commandRegistry', 'orion/selection', 'orion/fileClient', 'orion/searchClient', 'orion/operationsClient', 'orion/status', 'orion/progress', 'orion/globalCommands',
        'orion/operationsTable', 'orion/operationsCommands'], 
		function(messages, mBootstrap, mCommandRegistry, mSelection, mFileClient, mSearchClient, mOperationsClient, mStatus, mProgress, mGlobalCommands, mOperationsTable, mOperationsCommands) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var selection = new mSelection.Selection(serviceRegistry);	
		var commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
			
		var operationsTable = new mOperationsTable.OperationsExplorer(serviceRegistry, commandRegistry, selection, operationsClient, "tasks-list", "pageActions", "selectionTools", "operationItems"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		// global commands
		mGlobalCommands.generateBanner("orion-operationList", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({task: "Operations", serviceRegistry: serviceRegistry, commandService: commandRegistry});
		mOperationsCommands.createOperationsCommands(commandRegistry, operationsTable, operationsClient);
		
		commandRegistry.addCommandGroup("pageActions", "eclipse.taskGroup.unlabeled", 100); //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.addCommandGroup("selectionTools", "eclipse.selectionGroup", 500, messages["More"]); //$NON-NLS-1$ //$NON-NLS-0$
		
		commandRegistry.registerCommandContribution("pageActions", "eclipse.removeCompletedOperations", 1, "eclipse.taskGroup.unlabeled"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("operationItems", "eclipse.removeOperation", 1); //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("selectionTools", "eclipse.removeOperation", 1, "eclipse.selectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("operationItems", "eclipse.cancelOperation", 2); //$NON-NLS-1$ //$NON-NLS-0$
		commandRegistry.registerCommandContribution("selectionTools", "eclipse.cancelOperation", 2, "eclipse.selectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		operationsTable.loadOperations.bind(operationsTable)();
		
	});
});
