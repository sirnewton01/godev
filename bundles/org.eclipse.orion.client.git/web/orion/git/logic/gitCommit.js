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

/*globals document define*/

define(['i18n!git/nls/gitmessages','orion/commandRegistry','orion/Deferred','orion/git/widgets/CommitDialog',
        'orion/git/logic/gitCommon', 'orion/i18nUtil'], 
		function(messages,mCommandRegistry,Deferred,mCommit,mGitCommon,i18nUtil) {
	
	var handleProgressServiceResponse = mGitCommon.handleProgressServiceResponse;
	
	/**
	 * Acts as a factory for commit related functions.
	 * @param dependencies All required objects and values to perform the command
	 */
	return function(dependencies) {
		
		var serviceRegistry = dependencies.serviceRegistry;
		var commandService = dependencies.commandService;
		
		/* Fetches the appropriate commit message when the 'amend' flag is used */
		var amendEventListener = new mCommandRegistry.CommandEventListener('change', function(event, commandInvocation){ //$NON-NLS-0$
			var target = event.target;
			var item = commandInvocation.items.status;
			var commitMessageBox = document.getElementById("name" + "parameterCollector"); //$NON-NLS-0$//$NON-NLS-1$
				
			if(target.checked){
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doGitLog(item.CommitLocation + "?page=1&pageSize=1"), messages["Fetching previous commit message"]); //$NON-NLS-0$ 
					
				progressService.createProgressMonitor(deferred, messages["Fetching previous commit message"], deferred.then(function(resp){
					// use the last commit message
					var message = resp.Children[0].Message;
					commitMessageBox.value = message;
				}), function(error){
					commitMessageBox.value = ""; //$NON-NLS-0$
				});
			} else {
				commitMessageBox.value = ""; //$NON-NLS-0$
			}
		});
		
		var parameters = new mCommandRegistry.ParametersDescription(
				[new mCommandRegistry.CommandParameter('name', 'text', messages['Commit message:'], "", 4), //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-3$
				 new mCommandRegistry.CommandParameter('amend', 'boolean', messages['Amend:'], false, null, amendEventListener), //$NON-NLS-0$  //$NON-NLS-1$
				 new mCommandRegistry.CommandParameter('changeId', 'boolean', messages['ChangeId:'], false)], //$NON-NLS-0$  //$NON-NLS-1$
				 {hasOptionalParameters: true});
		
		var setGitCloneConfig = function(key,value,location) {
			var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
			var deferred = new Deferred();
			gitService.addCloneConfigurationProperty(location, key, value).then(function() { deferred.resolve(); },
				function(err) {
					if(err.status === 409) { // when confing entry is already defined we have to edit it
						var configDeffered = gitService.getGitCloneConfig(location);
						configDeffered.then(function(config){
							if(config.Children){
								for(var i=0; i<config.Children.length; i++){
									if(config.Children[i].Key===key){
										var locationToUpdate = config.Children[i].Location;
										gitService.editCloneConfigurationProperty(locationToUpdate,value).then(
											function(){ deferred.resolve(); },
											function(err) {
												deferred.reject(err);
											}
										);
									break;
								}
							}
						}
					}, function(err) {
						deferred.reject(err);
					});
					} else {
						deferred.reject(err);
 					}
			});
			return deferred;
		};
		
		var displayErrorOnStatus = function(error) {
			var display = {};
			display.Severity = "Error"; //$NON-NLS-0$
			display.HTML = false;
			
			try {
				var resp = JSON.parse(error.responseText);
				if (error.status === 401) {
					display.HTML = true;
					display.Message = "<span>"; //$NON-NLS-0$
					display.Message += i18nUtil.formatMessage(messages["Authentication required for: ${0}. ${1} and re-try the request."], resp.label, "<a target=\"_blank\" href=\"" + resp.SignInLocation //$NON-NLS-1$ //$NON-NLS-0$
					+ "\">" + messages["Login"] + "</a>") + "</span>"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				} else {
					display.Message = resp.DetailedMessage ? resp.DetailedMessage : (resp.Message ? resp.Message : messages["Problem while performing the action"]);
				}
			} catch (Exception) {
				display.Message = messages["Problem while performing the action"];
			}
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); 
		};
		
		var perform = function(data) {
			var d = new Deferred();
				
			var item = data.items.status;
			var location = item.Clone.ConfigLocation;
			var handleError = function(error){
				handleProgressServiceResponse(error, {}, serviceRegistry);
			};
			var commitFunction = function(body){
				if (body.persist) {
					setGitCloneConfig("user.name",body.CommitterName,location).then(function() { //$NON-NLS-0$
							setGitCloneConfig("user.email", body.CommitterEmail, location).then(function() {}, //$NON-NLS-0$
								function(err) {
									handleError(err);
									d.reject(err);
								});	
							},
							function(err) {
								handleError(err);
								d.reject(err);
							});	
					}
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").commitAll(item.Clone.HeadLocation, null, JSON.stringify(body)), messages["Committing changes"]); //$NON-NLS-0$ //$NON-NLS-1$
				progressService.createProgressMonitor(
					deferred,
					messages["Committing changes"]); //$NON-NLS-0$
				deferred.then(
					function(jsonData){
						d.resolve();
					}, 
					function(err) {
						displayErrorOnStatus(err),
						d.reject(err);
					}
				);
			};
					
			var gatherCommitInformation = function(body, config){
				for (var i=0; i < config.length; i++){
					if (config[i].Key === "user.name"){ //$NON-NLS-0$
						body.CommitterName = config[i].Value;
						body.AuthorName = config[i].Value;
					} else if (config[i].Key === "user.email"){ //$NON-NLS-0$
						body.CommitterEmail = config[i].Value;
						body.AuthorEmail = config[i].Value;
					}
				}
					
				if (body.Message && body.CommitterName && body.CommitterEmail && !data.parameters.optionsRequested) {
					commitFunction(body);
				} else {
					var dialog = new mCommit.CommitDialog({
						body: body,
						func: commitFunction
					});
						dialog.show();
					}
				};
					
			var body = {};
			body.Message = data.parameters.valueFor("name"); //$NON-NLS-0$
			body.Amend = data.parameters.valueFor("amend"); //$NON-NLS-0$
			body.ChangeId = data.parameters.valueFor("changeId"); //$NON-NLS-0$
				
			var config = item.Clone.Config;
			if(body.Amend && !body.Message){
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doGitLog(item.CommitLocation + "?page=1&pageSize=1"), messages["Committing changes"]); //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ 
				progressService.createProgressMonitor(
					deferred,
					messages["Committing changes"]); //$NON-NLS-0$
				deferred.then(
					function(resp){
						// use the last commit message
						body.Message = resp.Children[0].Message;
						gatherCommitInformation(body, config);
					}, function(error){
						//unexpected error, fall back to default
						gatherCommitInformation(body, config);
					}
				);
			} else {
					gatherCommitInformation(body, config);
			}
			return d;
		};
		return {
			perform:perform,
			parameters:parameters,
			displayErrorOnStatus:displayErrorOnStatus,
			amendEventListener:amendEventListener,
			setGitCloneConfig: setGitCloneConfig
		};
	};
});