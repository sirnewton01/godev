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
	'orion/Deferred',
	'orion/git/logic/gitCommon',
	'orion/i18nUtil',
], 
function(messages, Deferred, mGitCommon, i18nUtil) {
	
	var handleProgressServiceResponse = mGitCommon.handleProgressServiceResponse;
	
	/**
	 * Acts as a factory for commit related functions.
	 * @param dependencies All required objects and values to perform the command
	 */
	return function(dependencies) {
		
		var serviceRegistry = dependencies.serviceRegistry;
		
		var getAmendMessage = function(location) {
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var deferred = new Deferred();
			progress.progress(serviceRegistry.getService("orion.git.provider").doGitLog(location + "?page=1&pageSize=1"), messages["Fetching previous commit message"]).then(function(resp) { //$NON-NLS-1$ //$NON-NLS-0$ 
				deferred.resolve(resp.Children[0].Message);
			}, function(){
				deferred.resolve("");
			});
			return deferred;
		};
		
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
		
		var getGitCloneConfig = function(config) {
			var result = {};
			for (var i=0; i < config.length; i++){
				if (config[i].Key === "user.name"){ //$NON-NLS-0$
					result.CommitterName = config[i].Value;
					result.AuthorName = config[i].Value;
				} else if (config[i].Key === "user.email"){ //$NON-NLS-0$
					result.CommitterEmail = config[i].Value;
					result.AuthorEmail = config[i].Value;
				}
			}
			return result;
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
					display.Message += i18nUtil.formatMessage(messages["AuthMsgLink"], resp.label, resp.SignInLocation, messages["Login"]); //$NON-NLS-0$
				} else {
					display.Message = resp.DetailedMessage ? resp.DetailedMessage : (resp.Message ? resp.Message : messages["Problem while performing the action"]);
				}
			} catch (Exception) {
				display.Message = messages["Problem while performing the action"];
			}
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		};
		
		var perform = function(data) {
			var d = new Deferred();
				
			var item = data.items.status || data.handler.status;
			var location = item.Clone.ConfigLocation;
			var handleError = function(error){
				handleProgressServiceResponse(error, {}, serviceRegistry);
			};
			var commitFunction = function(body){
				if (body.persist) {
					setGitCloneConfig("user.name",body.CommitterName,location).then(function() { //$NON-NLS-0$
						setGitCloneConfig("user.email", body.CommitterEmail, location).then(function() { //$NON-NLS-0$
						}, function(err) {
							handleError(err);
							d.reject(err);
						});	
					}, function(err) {
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
					function(){
						d.resolve();
					}, 
					function(err) {
						displayErrorOnStatus(err),
						d.reject(err);
					}
				);
			};
					
			var body = data.userData;
			if (body.Amend && !body.Message){
				getAmendMessage(item.CommitLocation).then(function(msg) {
					body.Message = msg;
					commitFunction(body);
				});
			} else {
				commitFunction(body);
			}
			return d;
		};
		return {
			perform:perform,
			displayErrorOnStatus:displayErrorOnStatus,
			getAmendMessage: getAmendMessage,
			getGitCloneConfig: getGitCloneConfig,
			setGitCloneConfig: setGitCloneConfig
		};
	};
});