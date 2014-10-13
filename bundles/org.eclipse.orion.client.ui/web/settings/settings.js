/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Anton McConville (IBM Corporation) - initial API and implementation
 *
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/settings/nls/messages', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/commands', 'orion/keyBinding', 'orion/profile/usersClient',
		'orion/operationsClient', 'orion/fileClient', 'orion/searchClient', 'orion/dialogs', 'orion/globalCommands', 'orion/webui/littlelib', 'orion/metatype', 'orion/settings/settingsRegistry', 'orion/widgets/settings/SettingsContainer'],
		function(messages, mBootstrap, mStatus, mProgress, mCommandRegistry, mCommands, KeyBinding, mUsersClient, mOperationsClient, mFileClient, mSearchClient, 
			mDialogs, mGlobalCommands, lib, mMetaType, SettingsRegistry, SettingsContainer) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var pluginRegistry = core.pluginRegistry;

		// Register services
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var preferencesStatusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
		new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry,
			fileService: fileClient
		});
		
		var usersClient = new mUsersClient.UsersClient(serviceRegistry, pluginRegistry);
		// would be nice to have a "restore defaults" command for each settings page but until that can be done,
		// add a command with a "secret key binding" for blowing away the preferences.
		var clearPrefsCommand  = new mCommands.Command({
			name: messages['clearThemeAndEditorSettings.name'],  //$NON-NLS-0$
			tooltip: messages['clearThemeAndEditorSettings.tooltip'],  //$NON-NLS-0$
			id: "orion.clearThemes", //$NON-NLS-0$
			callback: function(data) {
				preferences.getPreferences('/themes', 2).then(function(prefs) { //$NON-NLS-0$
					prefs.put("styles", null); //$NON-NLS-0$
					prefs.put("selected", null); //$NON-NLS-0$
					preferencesStatusService.setMessage("Theme settings have been cleared.");
				});
			}});
		commandRegistry.addCommand(clearPrefsCommand);
		// add as a binding only command
		commandRegistry.registerCommandContribution("globalActions", "orion.clearThemes", 1,  null, true, new KeyBinding.KeyBinding('t', true, true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var preferenceDialogService = new mDialogs.DialogService(serviceRegistry);
		mGlobalCommands.generateBanner("orion-settings", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$

		var settingsRegistry = new SettingsRegistry(serviceRegistry, new mMetaType.MetaTypeRegistry(serviceRegistry));

		preferencesStatusService.setMessage(messages["Loading..."]);
		
		/* Note 'pageActions' is the attach id for commands in the toolbar */
		
		var containerParameters = { preferences: preferences, 
									registry: serviceRegistry,
									preferencesStatusService: preferencesStatusService,
									commandService: commandRegistry,
									preferenceDialogService: preferenceDialogService,
									settingsCore: core,
									pageActions: "pageActions", //$NON-NLS-0$
									userClient: usersClient,
									settingsRegistry: settingsRegistry
									};
									
		lib.node("categoriesTitle").innerHTML = messages["Categories"]; //$NON-NLS-1$ //$NON-NLS-0$
		var settingsContainer = new SettingsContainer( containerParameters, lib.node("categoriesContainer"), lib.node("settings")); //$NON-NLS-0$
		settingsContainer.show();

		preferencesStatusService.setMessage("");
	});
});