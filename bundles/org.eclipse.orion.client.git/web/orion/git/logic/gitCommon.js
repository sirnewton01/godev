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
/**
 * Holds common functions that can be shared by various commands
 */

/*globals confirm define*/

define(['orion/git/util','orion/i18nUtil','orion/git/gitPreferenceStorage','orion/git/widgets/GitCredentialsDialog','orion/Deferred','i18n!git/nls/gitmessages'],
		function(mGitUtil,i18nUtil,GitPreferenceStorage,mGitCredentials,Deferred,messages) {
	
	
	function translateResponseToStatus(response) {
		var json;
		try {
			json = JSON.parse(response.responseText);
		} catch (e) {
			json = { 
				Message : messages["Problem while performing the action"]
			};
		}
		json.HttpCode = response.status;
		return json;
	};
	
	function translateGitStatusMessages(message){
		if (message === "REJECTED_NONFASTFORWARD")
			return messages["REJECTED_NONFASTFORWARD"];
		return message;
	}
	
	var handleKnownHostsError = function(serviceRegistry, errorData, options, func){
		if(confirm(i18nUtil.formatMessage(messages["Would you like to add ${0} key for host ${1} to continue operation? Key fingerpt is ${2}."],
				errorData.KeyType, errorData.Host, errorData.HostFingerprint))){
			
			var hostURL = mGitUtil.parseSshGitUrl(errorData.Url);
			var hostCredentials = {
					host : errorData.Host,
					keyType : errorData.KeyType,
					hostKey : errorData.HostKey,
					port : hostURL.port
				};
			
			var sshService = serviceRegistry.getService("orion.net.ssh"); //$NON-NLS-0$
			sshService.addKnownHost(hostCredentials).then(function(knownHosts){ //$NON-NLS-1$ //$NON-NLS-0$
				options.knownHosts = knownHosts;
				if(typeof options.failedOperation !== "undefined"){
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.removeOperation(options.failedOperation);
				}
				
				func(options);
			});
		}
	};
	
	var handleSshAuthenticationError = function(serviceRegistry, errorData, options, func, title, closeCallback){
		var repository = errorData ? errorData.Url : undefined;
		
		var failure = function(){
			var credentialsDialog = new mGitCredentials.GitCredentialsDialog({
				title: title,
				serviceRegistry: serviceRegistry,
				func: func,
				errordata: options.errordata,
				failedOperation: options.failedOperation,
				closeCallback : closeCallback
			});

			credentialsDialog.show();
		};
		
		if((options.gitSshUsername && options.gitSshUsername!=="") ||
			(options.gitSshPassword && options.gitSshPassword!=="") ||
			(options.gitPrivateKey && options.gitPrivateKey!=="")){
			failure();
		} else {
			var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
			gitPreferenceStorage.get(repository).then(
				function(credentials){
					if(credentials.gitPrivateKey !== "" || credentials.gitSshUsername !== "" || credentials.gitSshPassword !== ""){
						if(typeof options.failedOperation !== "undefined"){
							var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
							progress.removeOperation(options.failedOperation);
						}
						func({knownHosts: options.knownHosts, gitSshUsername: credentials.gitSshUsername, gitSshPassword: credentials.gitSshPassword, gitPrivateKey: credentials.gitPrivateKey, gitPassphrase: credentials.gitPassphrase}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						return;
					}
					
					failure();
				}, failure
			);
		}
	};
	
	var handleGitServiceResponse = function(jsonData, serviceRegistry, callback, sshCallback){

		if (jsonData && jsonData.status !== undefined) {
			jsonData = translateResponseToStatus(jsonData);
		}

		if (!jsonData || !jsonData.HttpCode) {
			if (callback) {
				callback(jsonData);
			}
			return;
		}
		
		switch (jsonData.HttpCode) {
			case 401:
				
				/* authentication error, clear remaining credentials */
				var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
				gitPreferenceStorage.isEnabled().then(function(isEnabled){
					if(isEnabled && jsonData.JsonData.Url !== undefined){
						gitPreferenceStorage.remove(jsonData.JsonData.Url).then(function(){
							sshCallback(jsonData);
						});
					} else {
						/* nothing to delete, proceed */
						sshCallback(jsonData);
					}
				});
				
				break;
			case 400:
				if(jsonData.JsonData && jsonData.JsonData.HostKey){
					sshCallback(jsonData);
					return;
				}
			default:
				var display = [];
				display.Severity = "Error"; //$NON-NLS-0$
				display.HTML = false;
				display.Message = translateGitStatusMessages(jsonData.DetailedMessage ? jsonData.DetailedMessage : jsonData.Message);
				serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
				
				if (callback) {
					callback(jsonData);
				}
				break;
		}
			
	};
	
	var gatherSshCredentials = function(serviceRegistry, data, title, closeCallback){
		var def = new Deferred();
		var repository;
		
		//TODO This should be somehow unified
		if(data.items.RemoteLocation !== undefined){ repository = data.items.RemoteLocation[0].GitUrl; }
		else if(data.items.GitUrl !== undefined) { repository = data.items.GitUrl; }
		else if(data.items.errorData !== undefined) { repository = data.items.errorData.Url; }
		else if(data.items.toRef !== undefined) { repository = data.items.toRef.RemoteLocation[0].GitUrl; }

		var sshService = serviceRegistry.getService("orion.net.ssh");
		var repositoryURL = mGitUtil.parseSshGitUrl(repository);

		var triggerCallback = function(sshObject){
			serviceRegistry.getService("orion.net.ssh").getKnownHostCredentials(repositoryURL.host, repositoryURL.port).then(function(knownHosts){ //$NON-NLS-0$
				data.sshObject = sshObject;
				def.resolve({
					knownHosts: knownHosts,
					gitSshUsername: sshObject.gitSshUsername,
					gitSshPassword: sshObject.gitSshPassword,
					gitPrivateKey: sshObject.gitPrivateKey,
					gitPassphrase: sshObject.gitPassphrase
				});
			});
		};
		
		var errorData = data.errorData;
		
		// if this is a known hosts error, show a prompt always
		if (errorData && errorData.HostKey) {
			if(confirm(i18nUtil.formatMessage(messages['Would you like to add ${0} key for host ${1} to continue operation? Key fingerpt is ${2}.'],
					errorData.KeyType, errorData.Host, errorData.HostFingerprint))){
				
				var hostURL = mGitUtil.parseSshGitUrl(errorData.Url);
				var hostCredentials = {
						host : errorData.Host,
						keyType : errorData.KeyType,
						hostKey : errorData.HostKey,
						port : hostURL.port
					};
				
				sshService.addKnownHost(hostCredentials).then( //$NON-NLS-1$ //$NON-NLS-0$
					function(){
						if(data.sshObject && (data.sshObject.gitSshUsername!=="" || data.sshObject.gitSshPassword!=="" || data.sshObject.gitPrivateKey!=="")){
							triggerCallback({
								gitSshUsername: "",
								gitSshPassword: "",
								gitPrivateKey: "",
								gitPassphrase: ""
							});
						} else {
							var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
							gitPreferenceStorage.get(repository).then(
								function(credentials){
									triggerCallback(credentials);
								},
								function(){
									triggerCallback({
										gitSshUsername: "",
										gitSshPassword: "",
										gitPrivateKey: "",
										gitPassphrase: ""
									});
								}
							);
						}
					}
				);
			} else {
				if (typeof(closeCallback) === 'function') closeCallback();
			}
			return def;
		}
		
		var failure = function(){
			if (!data.parameters && !data.optionsRequested){
				triggerCallback({gitSshUsername: "", gitSshPassword: "", gitPrivateKey: "", gitPassphrase: ""}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				return;
			}
		
			// try to gather creds from the slideout first
			if (data.parameters && !data.optionsRequested) {
				var sshUser = (data.parameters && data.parameters.valueFor("sshuser")) ? data.parameters.valueFor("sshuser") : data.errorData.User; //$NON-NLS-0$
				var sshPassword = data.parameters ? data.parameters.valueFor("sshpassword") : "";	 //$NON-NLS-0$
				var saveCredentials = (data.parameters && data.parameters.valueFor("saveCredentials")) ? data.parameters.valueFor("saveCredentials") : false;
				
				var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
				if(saveCredentials){
					gitPreferenceStorage.put(repository, {
						gitSshUsername : sshUser,
						gitSshPassword : sshPassword
					}).then(
						function(){
							triggerCallback({gitSshUsername: sshUser, gitSshPassword: sshPassword, gitPrivateKey: "", gitPassphrase: ""}); //$NON-NLS-0$
						}
					);
					return;
				} else {
					triggerCallback({gitSshUsername: sshUser, gitSshPassword: sshPassword, gitPrivateKey: "", gitPassphrase: ""}); //$NON-NLS-0$
					return;
				}
			}
				
			// use the old creds dialog
			var credentialsDialog = new mGitCredentials.GitCredentialsDialog({
				title: title,
				serviceRegistry: serviceRegistry,
				func: triggerCallback,
				errordata: errorData,
				closeCallback: closeCallback
			});
			
			credentialsDialog.show();
			return;
		};

		if(data.sshObject && (data.sshObject.gitSshUsername!=="" || data.sshObject.gitSshPassword!=="" || data.sshObject.gitPrivateKey!=="")){
			failure();
		} else {
			var gitPreferenceStorage = new GitPreferenceStorage(serviceRegistry);
			gitPreferenceStorage.get(repository).then(
				function(credentials){
					if(credentials.gitPrivateKey !== "" || credentials.gitSshUsername !== "" || credentials.gitSshPassword !== ""){
						triggerCallback(credentials);
						return;
					}
					
					failure();
				}, failure
			);
		}
		
		return def;
	};
	
	var handleProgressServiceResponse = function(jsonData, options, serviceRegistry, callback, callee, title){

		if (jsonData && jsonData.status !== undefined) {
			jsonData = translateResponseToStatus(jsonData);
		}

		if (!jsonData || jsonData.HttpCode===undefined) {
			if (callback) {
				callback(jsonData);
			}
			return;
		}
		
		switch (jsonData.HttpCode) {
			case 401:
				if(jsonData.JsonData){
					options.errordata = jsonData.JsonData;
				}
				if(jsonData.failedOperation){
					options.failedOperation = jsonData.failedOperation;
				}
				handleSshAuthenticationError(serviceRegistry, jsonData.JsonData, options, callee, title);
				return;
			case 400:
				if(jsonData.JsonData && jsonData.JsonData.HostKey){
					if(jsonData.failedOperation){
						options.failedOperation = jsonData.failedOperation;
					}
					handleKnownHostsError(serviceRegistry, jsonData.JsonData, options, callee);
					return;
				} else if(jsonData.JsonData && jsonData.JsonData.Host){
					if(jsonData.JsonData){
						options.errordata = jsonData.JsonData;
					}
					if(jsonData.failedOperation){
						options.failedOperation = jsonData.failedOperation;
					}
					handleSshAuthenticationError(serviceRegistry, jsonData.JsonData, options, callee, title);
					return;
				}
			default:
				var display = [];
				display.Severity = "Error"; //$NON-NLS-0$
				display.HTML = false;
				display.Message = jsonData.DetailedMessage ? jsonData.DetailedMessage : jsonData.Message;
				serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
				
				if (callback) {
					callback(jsonData);
				}
				break;
		}
	};
	
	return {
		handleGitServiceResponse : handleGitServiceResponse,
		handleProgressServiceResponse : handleProgressServiceResponse,
		gatherSshCredentials : gatherSshCredentials,
		handleSshAuthenticationError : handleSshAuthenticationError,
		handleKnownHostsError : handleKnownHostsError
	};
});