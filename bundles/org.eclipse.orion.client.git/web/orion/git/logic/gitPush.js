/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define([
	'i18n!git/nls/gitmessages',
	'orion/commandRegistry',
	'orion/git/gitPreferenceStorage',
	'orion/git/logic/gitCommon',
	'orion/Deferred',
	'orion/objects'
], function(messages,mCommandRegistry,GitPreferenceStorage, mGitCommon, Deferred, objects) {
	
	var handleGitServiceResponse = mGitCommon.handleGitServiceResponse;
	var gatherSshCredentials = mGitCommon.gatherSshCredentials;
	
	/**
	 * Acts as a factory for push related functions.
	 * @param dependencies All required objects and values to perform the command
	 */
	return function(dependencies) {
		
		var serviceRegistry = dependencies.serviceRegistry;
		var commandService = dependencies.commandService;
		var tags = dependencies.tags;
		var force = dependencies.force;

		//Callbacks
		var sshCredentialsCallback = dependencies.sshCredentialsDialogCloseCallback;
		var sshSlideoutCallback = dependencies.sshSlideoutCloseCallback;
		
		var perform = function(data) {
			var d = new Deferred();
				
			var sshCredentialsDialogCallback = function () {
				if (typeof(sshCredentialsCallback) === "function") sshCredentialsCallback(); //$NON-NLS-0$
				d.reject();
			};
				
			var sshSlideoutCloseCallback = function () {
				if (typeof(sshSlideoutCallback) === "function") sshSlideoutCallback(); //$NON-NLS-0$
				d.reject();
			};
				
			function command(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;
				
				var confirmedWarnings = data.confirmedWarnings;
				if(force && !confirmedWarnings){
					if(!confirm(messages["OverrideContentOfRemoteBr"]+"\n\n"+messages['Are you sure?'])){ //$NON-NLS-0$
						d.reject();
						return;
					} else {
						data.confirmedWarnings = true;
						confirmedWarnings = true;
					}
				}
			
				var item = data.items;
				if (item.Remote) {
					itemTargetBranch = item.Remote;
				}
				if (item.LocalBranch) {
					item = item.LocalBranch;
				}
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				if (!commandInvocation.command) {
					commandInvocation.command = {};
					commandInvocation.command.callback = command;
				}

				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
					} else if (!commandInvocation.optionsRequested){
						var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
						gitPreferenceStorage.isEnabled().then(
							function(isEnabled){
								if(isEnabled){
									if (jsonData.JsonData.User)
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									else
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								} else {
									if (jsonData.JsonData.User)
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
									else
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
								}
								
								commandInvocation.errorData = jsonData.JsonData;
								commandInvocation.errorData.failedOperation = jsonData.failedOperation;
								commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
					}
				};
				
				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation,sshSlideoutCloseCallback);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
					progress.removeOperation(commandInvocation.errorData.failedOperation);
				}
				
				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, tags, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									if (itemTargetBranch && !itemTargetBranch.Id) {
										gitService.getGitBranch(itemTargetBranch.Location).then(function(remote) {
											objects.mixin(itemTargetBranch, remote);
											d.resolve();
										}, d.resolve);
									} else {
										d.resolve();
									}
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData) {
							handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									d.resolve();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}
					);
				};

				gatherSshCredentials(serviceRegistry, commandInvocation,null,sshCredentialsDialogCallback).then(
					function(options) {
						if(itemTargetBranch){
							handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, force); //$NON-NLS-0$
							return;
						} else {
							d.reject();
						}
					}
				);
			} 
			command(data);
			return d;
		};
		return {
			perform:perform,
		};
	};
});
