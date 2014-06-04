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

define(['i18n!git/nls/gitmessages','orion/commandRegistry','orion/git/widgets/ConfirmPushDialog','orion/git/gitPreferenceStorage','orion/git/logic/gitCommon','orion/Deferred'
        ,'orion/git/widgets/RemotePrompterDialog'], 
		function(messages,mCommandRegistry,mConfirmPush,GitPreferenceStorage, mGitCommon, Deferred,mRemotePrompter) {
	
	var handleGitServiceResponse = mGitCommon.handleGitServiceResponse;
	var handleProgressServiceResponse = mGitCommon.handleProgressServiceResponse;
	var gatherSshCredentials = mGitCommon.gatherSshCredentials;
	
	/**
	 * Acts as a factory for push related functions.
	 * @param dependencies All required objects and values to perform the command
	 */
	return function(dependencies) {
		
		var serviceRegistry = dependencies.serviceRegistry;
		var commandService = dependencies.commandService;
		var explorer = dependencies.explorer;
		var toolbarId = dependencies.toolbarId; 
		var tags = dependencies.tags;
		
		//Callbacks
		var success = dependencies.success;
		var error = dependencies.error;
		var confirmCallback = dependencies.confirmDialogCloseCallback;
		var remoteCallback = dependencies.remotePrompterDialogCloseCallback;
		var sshCredentialsCallback = dependencies.sshCredentialsDialogCloseCallback;
		var sshSlideoutCallback = dependencies.sshSlideoutCloseCallback;
        
		var perform = function(data) {
			var d = new Deferred();
				
			var confirmDialogCallback = function () {
				if (typeof(confirmCallback) == "function") confirmCallback();
				d.reject();
			};
				
			var remotePrompterDialogCallback = function () {
				if (typeof(remoteCallback) == "function") remoteCallback();
				d.reject();
			};
				
			var sshCredentialsDialogCallback = function () {
				if (typeof(sshCredentialsCallback) == "function") sshCredentialsCallback();
				d.reject();
			};
				
			var sshSlideoutCloseCallback = function () {
				if (typeof(sshSlideoutCallback) == "function") sshSlideoutCallback();
				d.reject();
			};
				
			function command(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;
			
				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				if (!commandInvocation.command) {
					commandInvocation.command = {};
					commandInvocation.command.callback = command;
				}

				var parts = item.CloneLocation.split("/");
				
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
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
									else
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-0$
								} else {
									if (jsonData.JsonData.User)
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
									else
										commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-1$ //$NON-NLS-0$
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
				var gitService = serviceRegistry.getService("orion.git.provider");
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
									d.resolve();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
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

				progress.progress(gitService.getGitClone(item.CloneLocation), "Getting git repository details " + item.Name).then(
					function(clone){
						var remoteLocation = clone.Children[0].RemoteLocation;
						var locationToChange = clone.Children[0].ConfigLocation;
						
						var handleError = function(error){
							handleProgressServiceResponse(error, {}, serviceRegistry);
							d.reject(error);
						};
						
						gatherSshCredentials(serviceRegistry, commandInvocation,null,sshCredentialsDialogCallback).then(
							function(options) {
								var result = new Deferred();
								
								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting git remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);
									
								}
						
								result.then(
									function(remotes) {
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, false);
											return;
										}

										var dialog = new mRemotePrompter.RemotePrompterDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
											closeCallback : remotePrompterDialogCallback,
											treeRoot: {
												Children: remotes.Children
											},
											hideNewBranch: false,
											func: function(targetBranch, remote, optional) {
												if(targetBranch === null){
													target = optional;
												}
												else{
													target = targetBranch;
												}
												var configKey = "branch." + item.Name + ".remote";
												progress.progress(gitService.addCloneConfigurationProperty(locationToChange, configKey ,target.parent.Name), "Adding git configuration property "+ item.Name).then(
													function(){
														commandInvocation.targetBranch = target;
														handlePush(options, target.Location, "HEAD",target.Name, false);
													}, function(err){
														if(err.status === 409){ //when confing entry is already defined we have to edit it
															gitService.getGitCloneConfig(locationToChange).then(function(config){
																if(config.Children){
																	for(var i=0; i<config.Children.length; i++){
																		if(config.Children[i].Key===configKey){
																			var locationToUpdate = config.Children[i].Location;
																			progress.progress(gitService.editCloneConfigurationProperty(locationToUpdate,target.parent.Name), "Updating configuration property " + target.parent.Name).then(
																					function(){
																						commandInvocation.targetBranch = target;
																						commandInvocation.items.RemoteLocation = [];
																						commandInvocation.items.RemoteLocation.push( {GitUrl: target.parent.GitUrl});
																						handlePush(options, target.Location, "HEAD",target.Name, false);
																					},
																					handleError
																			);
																			break;
																		}
																	}
																}
																
															}, handleError);
														} else {
															handleError(err);
														}
													}
												);
											}
										});
										
										if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
											var dialog2 = dialog;
											
											dialog = new mConfirmPush.ConfirmPushDialog({
												title: messages["Choose Branch"],
												serviceRegistry: serviceRegistry,
												gitClient: gitService,
												dialog: dialog2,
												location: item.RemoteLocation[0].Children[0].Name,
												func: function(){
													commandInvocation.targetBranch = item.RemoteLocation[0].Children[0];
													handlePush(options,item.RemoteLocation[0].Children[0].Location, "HEAD", item.Name, false);
												},
												closeCallback : confirmDialogCallback
											});
										}
										
										dialog.show();
									}
								);
						
							}
						);
					}
				);
			};
			command(data);
			return d;
		};
		return {
			perform:perform
		};
	};
});