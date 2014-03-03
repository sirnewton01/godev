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

/*globals window document define confirm URL console*/
/*jslint nomen:false sub:true forin:false laxbreak:true eqeqeq:false*/

define(['i18n!git/nls/gitmessages', 'require', 'orion/Deferred', 'orion/i18nUtil', 'orion/webui/littlelib', 'orion/commands', 'orion/commandRegistry', 'orion/git/util', 'orion/compare/compareUtils', 'orion/git/gitPreferenceStorage', 'orion/git/gitConfigPreference',
        'orion/git/widgets/ConfirmPushDialog', 'orion/git/widgets/RemotePrompterDialog', 'orion/git/widgets/ReviewRequestDialog', 'orion/git/widgets/CloneGitRepositoryDialog', 
        'orion/git/widgets/GitCredentialsDialog', 'orion/git/widgets/OpenCommitDialog', 'orion/git/widgets/CommitDialog', 'orion/git/widgets/ApplyPatchDialog', 'orion/URL-shim', 'orion/PageLinks', 'orion/URITemplate'], 
        function(messages, require, Deferred, i18nUtil, lib, mCommands, mCommandRegistry, mGitUtil, mCompareUtils, GitPreferenceStorage, GitConfigPreference, mConfirmPush, mRemotePrompter,
        mReviewRequest, mCloneGitRepository, mGitCredentials, mOpenCommit, mCommit, mApplyPatch, _, PageLinks, URITemplate) {

/**
 * @namespace The global container for eclipse APIs.
 */
var exports = {};
//this function is just a closure for the global "doOnce" flag
(function() {
	var doOnce = false;
	
	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
	var logTemplate = new URITemplate("git/git-log.html#{,resource,params*}?page=1"); //$NON-NLS-0$
	var logTemplateNoPage = new URITemplate("git/git-log.html#{,resource,params*}"); //$NON-NLS-0$
	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$
	var statusTemplate = new URITemplate(mGitUtil.statusUILocation + "#{,resource,params*}"); //$NON-NLS-0$
	var editTemplate = new URITemplate("edit/edit.html#{,resource,params*}"); //$NON-NLS-0$
	function statusURL(statusLocation) {
		return require.toUrl(statusTemplate.expand({resource: statusLocation}));
	}
	
	exports.updateNavTools = function(registry, commandRegistry, explorer, toolbarId, selectionToolbarId, item, pageNavId) {
		var toolbar = lib.node(toolbarId);
		if (toolbar) {
			commandRegistry.destroy(toolbar);
		} else {
			throw "could not find toolbar " + toolbarId; //$NON-NLS-0$
		}
		commandRegistry.renderCommands(toolbarId, toolbar, item, explorer, "button");  //$NON-NLS-0$
		
		if (pageNavId) {
			var pageNav = lib.node(pageNavId);
			if (pageNav) {
				commandRegistry.destroy(pageNav);
				commandRegistry.renderCommands(pageNavId, pageNav, item, explorer, "button");   //$NON-NLS-0$
			}
		}
		
		if (selectionToolbarId) {
			var selectionTools = lib.node(selectionToolbarId);
			if (selectionTools) {
				commandRegistry.destroy(selectionToolbarId);
				commandRegistry.renderCommands(selectionToolbarId, selectionTools, null, explorer, "button");  //$NON-NLS-0$
			}
		}

		// Stuff we do only the first time
		if (!doOnce) {
			doOnce = true;
			registry.getService("orion.page.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
				var selectionTools = lib.node(selectionToolbarId);
				if (selectionTools) {
					commandRegistry.destroy(selectionTools);
					commandRegistry.renderCommands(selectionToolbarId, selectionTools, event.selections, explorer, "button"); //$NON-NLS-0$
				}
			});
		}
	};

	exports.handleKnownHostsError = function(serviceRegistry, errorData, options, func){
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

	exports.handleSshAuthenticationError = function(serviceRegistry, errorData, options, func, title){
		var repository = errorData ? errorData.Url : undefined;
		
		var failure = function(){
			var credentialsDialog = new mGitCredentials.GitCredentialsDialog({
				title: title,
				serviceRegistry: serviceRegistry,
				func: func,
				errordata: options.errordata,
				failedOperation: options.failedOperation
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

	exports.getDefaultSshOptions = function(serviceRegistry, item, authParameters){
		var def = new Deferred();
		var sshService = serviceRegistry.getService("orion.net.ssh"); //$NON-NLS-0$
		var sshUser =  authParameters && !authParameters.optionsRequested ? authParameters.valueFor("sshuser") : ""; //$NON-NLS-0$
		var sshPassword = authParameters && !authParameters.optionsRequested ? authParameters.valueFor("sshpassword") : ""; //$NON-NLS-0$
		
		var repository;
		
		//TODO This should be somehow unified
		if(item.GitUrl !== undefined) { repository = item.GitUrl; }
		else if(item.errorData !== undefined) { repository = item.errorData.Url; }
		else if(item.toRef !== undefined) { repository = item.toRef.RemoteLocation[0].GitUrl; }
		else if(item.RemoteLocation !== undefined){ repository = item.RemoteLocation[0].GitUrl; }

		if(!repository){
			def.resolve({
						knownHosts: "",
						gitSshUsername: sshUser,
						gitSshPassword: sshPassword,
						gitPrivateKey: "",
						gitPassphrase: ""
			});
			
			return def;
		}

		var repositoryURL = mGitUtil.parseSshGitUrl(repository);
		sshService.getKnownHostCredentials(repositoryURL.host, repositoryURL.port).then(function(knownHosts){
			def.resolve({
						knownHosts: knownHosts,
						gitSshUsername: sshUser,
						gitSshPassword: sshPassword,
						gitPrivateKey: "",
						gitPassphrase: ""
			});
		});
		
		return def;
	};
	
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

	exports.handleProgressServiceResponse = function(jsonData, options, serviceRegistry, callback, callee, title){

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
				exports.handleSshAuthenticationError(serviceRegistry, jsonData.JsonData, options, callee, title);
				return;
			case 400:
				if(jsonData.JsonData && jsonData.JsonData.HostKey){
					if(jsonData.failedOperation){
						options.failedOperation = jsonData.failedOperation;
					}
					exports.handleKnownHostsError(serviceRegistry, jsonData.JsonData, options, callee);
					return;
				} else if(jsonData.JsonData && jsonData.JsonData.Host){
					if(jsonData.JsonData){
						options.errordata = jsonData.JsonData;
					}
					if(jsonData.failedOperation){
						options.failedOperation = jsonData.failedOperation;
					}
					exports.handleSshAuthenticationError(serviceRegistry, jsonData.JsonData, options, callee, title);
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

	exports.gatherSshCredentials = function(serviceRegistry, data, title){
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
				errordata: errorData
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
	
	exports.handleGitServiceResponse = function(jsonData, serviceRegistry, callback, sshCallback){

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
				sshCallback(jsonData);
				return;
			case 400:
				if(jsonData.JsonData && jsonData.JsonData.HostKey){
					sshCallback(jsonData);
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

	exports.createFileCommands = function(serviceRegistry, commandService, explorer, toolbarId) {
		
		function displayErrorOnStatus(error) {
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
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		}

		var checkoutTagNameParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages["Local Branch Name:"])]); //$NON-NLS-1$ //$NON-NLS-0$
		var checkoutTagCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["Checkout the current tag, creating a local branch based on its contents."],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.checkoutTag", //$NON-NLS-0$
			parameters: checkoutTagNameParameters,
			callback: function(data) {
				var item = data.items;
				
				var checkoutTagFunction = function(repositoryLocation, itemName, name){
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					
					progress.showWhile(serviceRegistry.getService("orion.git.provider").checkoutTag(
							repositoryLocation, itemName, name), i18nUtil.formatMessage(messages["Checking out tag ${0}"], name)).then(function() {
						explorer.changedItem();
					}, displayErrorOnStatus);
				};
				
				var repositoryLocation = item.Repository ? item.Repository.Location : item.CloneLocation;
				if (data.parameters.valueFor("name") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					checkoutTagFunction(repositoryLocation, item.Name, data.parameters.valueFor("name")); //$NON-NLS-0$
				}
			},
			visibleWhen: function(item){
				return item.Type === "Tag"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(checkoutTagCommand);

		var checkoutBranchCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["Checkout the branch or corresponding local branch and make it active. If the remote tracking branch does not have a corresponding local branch, the local branch will be created first."],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.checkoutBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var messageService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				messageService.setProgressMessage(
					item.Name ? i18nUtil.formatMessage(messages["Checking out branch ${0}..."], item.Name) : messages["Checking out branch..."]);
					
				if (item.Type === "Branch") { //$NON-NLS-0$
					progressService.progress(service.checkoutBranch(item.CloneLocation, item.Name), "Checking out branch " + item.Name).then(
						function(){
							messageService.setProgressResult(messages["Branch checked out."]);
							explorer.changedItem(item.parent);
						},
						 function(error){
							displayErrorOnStatus(error);
						 }
					);
				} else {
					var branchLocation;
					if (item.Repository) {
						branchLocation = item.Repository.BranchLocation;
					} else {
						branchLocation = item.parent.parent.BranchLocation;
					}
					
					progressService.progress(service.addBranch(branchLocation, null, item.Name), "Adding branch " + item.Name).then(
						function(branch){
							progressService.progress(service.checkoutBranch(branch.CloneLocation, branch.Name), "Checking out branch " + item.Name).then(
								function(){
									messageService.setProgressResult(messages['Branch checked out.']);
									explorer.changedItem(item.Repository ? item.Repository.BranchLocation : item.parent.parent.parent);
								},
								function(error){
									displayErrorOnStatus(error);
								}
							);
						},
						function(error){
							displayErrorOnStatus(error);
						 }
					);
				}
			},
			visibleWhen: function(item) {
				return item.Type === "Branch" || item.Type === "RemoteTrackingBranch"; //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(checkoutBranchCommand);

		var branchNameParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', 'Name:')]); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		var addBranchCommand = new mCommands.Command({
			name: messages["New Branch"],
			tooltip: messages["Add a new local branch to the repository"],
			id: "eclipse.addBranch", //$NON-NLS-0$
			parameters: branchNameParameters,
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var createBranchFunction = function(branchLocation, name) {
					progress.progress(serviceRegistry.getService("orion.git.provider").addBranch(branchLocation, name), "Adding branch " + name).then(function() { //$NON-NLS-0$
						explorer.changedItem(item);
					}, displayErrorOnStatus);
				};
				
				var branchLocation;
				if (item.Type === "Clone") { //$NON-NLS-0$
					branchLocation = item.BranchLocation;
				} else {
					branchLocation = item.Location;
				}
				
				if (data.parameters.valueFor("name") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					createBranchFunction(branchLocation, data.parameters.valueFor("name")); //$NON-NLS-0$
				}
			},
			visibleWhen: function(item) {
				return (item.GroupNode && item.Name === "Branches") || (item.Type === "Clone" && explorer.parentId === "artifacts"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(addBranchCommand);

		var removeBranchCommand = new mCommands.Command({
			name: messages["Delete"], // "Delete Branch"
			tooltip: messages["Delete the local branch from the repository"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.removeBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete branch ${0}?"], item.Name))) {
					progress.progress(serviceRegistry.getService("orion.git.provider").removeBranch(item.Location), "Removing branch " + item.Name).then(function() { //$NON-NLS-0$
						if (explorer.changedItem)
							explorer.changedItem(item.parent);
						else if (explorer.displayBranches)
							explorer.displayBranches(item.ParentLocation, null);
					}, displayErrorOnStatus);
				}
			},
			visibleWhen: function(item) {
				return item.Type === "Branch" && !item.Current; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeBranchCommand);

		var removeRemoteBranchCommand = new mCommands.Command({
			name: messages['Delete'], // "Delete Remote Branch",
			tooltip: messages["Delete the remote tracking branch from the repository"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.removeRemoteBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if(confirm(i18nUtil.formatMessage(messages["You're going to delete remote branch ${0} and push the change."], item.Name)+"\n\n" + messages["Are you sure?"])) //$NON-NLS-1$
				exports.getDefaultSshOptions(serviceRegistry, item).then(function(options){
					var func = arguments.callee;
					var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(item.Location, "", false, false,
							options.gitSshUsername, options.gitSshPassword, options.knownHosts, options.gitPrivateKey,
							options.gitPassphrase), messages["Removing remote branch: "] + item.Name);
					progressService.createProgressMonitor(deferred, messages["Removing remote branch: "] + item.Name);
					deferred.then(function(remoteJsonData) {
						exports.handleProgressServiceResponse(remoteJsonData, options, serviceRegistry, function(jsonData) {
							if (jsonData.Result.Severity == "Ok") //$NON-NLS-0$
								explorer.changedItem(item.parent);
						}, func, messages["Delete Remote Branch"]);
					}, function(jsonData, secondArg) {
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Removing remote branch: '] + item.Name);
					});
				});
			},
			visibleWhen: function(item) {
				return item.Type === "RemoteTrackingBranch"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeRemoteBranchCommand);

		var addRemoteParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', 'Name:'),  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		                                                               		new mCommandRegistry.CommandParameter('url', 'url', 'Url:')]); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		var addRemoteCommand = new mCommands.Command({
			name: messages["New Remote"],
			tooltip: messages["Add a new remote to the repository"],
			id: "eclipse.addRemote", //$NON-NLS-0$
			parameters: addRemoteParameters,
			callback : function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var createRemoteFunction = function(remoteLocation, name, url) {
					progress.progress(serviceRegistry.getService("orion.git.provider").addRemote(remoteLocation, name, url), "Adding remote " + remoteLocation).then(function() { //$NON-NLS-0$
						explorer.changedItem(item);
					}, displayErrorOnStatus);
				};
				
				var remoteLocation;
				if (item.Type === "Clone") { //$NON-NLS-0$
					remoteLocation = item.RemoteLocation;
				} else {
					remoteLocation = item.Location;
				}
				
				if (data.parameters.valueFor("name") && data.parameters.valueFor("url")) { //$NON-NLS-1$ //$NON-NLS-0$
					createRemoteFunction(remoteLocation, data.parameters.valueFor("name"), data.parameters.valueFor("url")); //$NON-NLS-1$ //$NON-NLS-0$
				}
			},
			visibleWhen: function(item) {
				return (item.GroupNode && item.Name === "Remotes") ||  (item.Type === "Clone" && explorer.parentId === "artifacts"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(addRemoteCommand);

		var removeRemoteCommand = new mCommands.Command({
			name: messages['Delete'], // "Delete Remote",
			tooltip: messages["Delete the remote from the repository"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.removeRemote", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete remote ${0}?"], item.Name))) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.progress(serviceRegistry.getService("orion.git.provider").removeRemote(item.Location), "Removing remote " + item.Name).then(function() { //$NON-NLS-0$
						explorer.changedItem(item.parent);
					}, displayErrorOnStatus);
				}
			},
			visibleWhen: function(item) {
				return item.Type === "Remote"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeRemoteCommand);

		var pullCommand = new mCommands.Command({
			name : messages["Pull"],
			tooltip: messages["Pull from the repository"],
			imageClass: "git-sprite-pull", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pull", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var path = item.Location;
				var name = item.Name;
				exports.getDefaultSshOptions(serviceRegistry, item).then(function(options) {
					var func = arguments.callee;
					var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
					var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var pullDeferred = progress.progress(gitService.doPull(path, false,
							options.gitSshUsername,
							options.gitSshPassword,
							options.knownHosts,
							options.gitPrivateKey,
							options.gitPassphrase), messages["Pulling: "] + name);
 
					statusService.createProgressMonitor(pullDeferred, messages["Pulling: "] + name);
					var pullOperationLocation;
					pullDeferred.then(function(jsonData) {
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData) {
							if (item.Type === "Clone") { //$NON-NLS-0$
								explorer.changedItem(item);
							}
						}, func, "Pull Git Repository"); //$NON-NLS-0$
					}, function(jsonData, secondArg) {
						if(pullOperationLocation)
							jsonData.failedOperation = pullOperationLocation;
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, 
							function() {
								explorer.changedItem(item);
							}, func, messages["Pull Git Repository"]);
					}, function(operation){
						pullOperationLocation = operation.Location;
					});
				});
			},
			visibleWhen : function(item) {
				return item.Type === "Clone"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(pullCommand);

		var openGitLog = new mCommands.Command({
			name : messages["Git Log"],
			tooltip: messages["Open the log for the branch"],
			id : "eclipse.openGitLog", //$NON-NLS-0$
			hrefCallback : function(data) {
				var item = data.items;
				return require.toUrl(logTemplate.expand({resource: item.CommitLocation}));
			},
			visibleWhen : function(item) {
				return item.Type === "Branch" || item.Type === "RemoteTrackingBranch"; //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(openGitLog);

		var openGitLogAll = new mCommands.Command({
			name : messages['Git Log'],
			tooltip: messages["Open the log for the repository"],
			id : "eclipse.openGitLogAll", //$NON-NLS-0$
			imageClass: "git-sprite-log", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			hrefCallback : function(data) {
				var item = data.items;
				return require.toUrl(logTemplate.expand({resource: item.CommitLocation}));
			},
			visibleWhen : function(item) {
				// show only for a repo
				if (!item.CommitLocation || !item.StatusLocation)
					return false;
				return true;
			}
		});
		commandService.addCommand(openGitLogAll);
		
		var openGitStatus = new mCommands.Command({
			name : messages['Git Status'],
			tooltip: messages["Open the status for the repository"],
			id : "eclipse.openGitStatus", //$NON-NLS-0$
			hrefCallback : function(data) {
				return statusURL(data.items.StatusLocation);
			},
			visibleWhen : function(item) {
				if (!item.StatusLocation)
					return false;
				return true;
			}
		});
		commandService.addCommand(openGitStatus);

		var openCloneContent = new mCommands.Command({
			name : messages["ShowInEditor"],
			tooltip: messages["ShowInEditorTooltip"],
			id : "eclipse.openCloneContent", //$NON-NLS-0$
			hrefCallback : function(data) {
				return require.toUrl(editTemplate.expand({resource: data.items.ContentLocation}));
			},
			visibleWhen : function(item) {
				if (!item.ContentLocation)
					return false;
				return true;
			}
		});
		commandService.addCommand(openCloneContent);

		var compareGitCommits = new mCommands.Command({
			name : messages["Compare With Each Other"],
			id : "eclipse.compareGitCommits", //$NON-NLS-0$
			hrefCallback : function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				return progress.progress(serviceRegistry.getService("orion.git.provider").getDiff(item[1].DiffLocation, item[0].Name), "Generating Diff for " + item[0].Name + " and " + item[1].Name).then(function(diffLocation) {
					return mCompareUtils.generateCompareHref(diffLocation.Location, {readonly: true});
				});
			},
			visibleWhen : function(item) {
				if(explorer.isDirectory) return false;
				if (Array.isArray(item) && item.length === 2 && item[0].Type === "Commit" && item[1].Type === "Commit") { //$NON-NLS-1$ //$NON-NLS-0$
						return true;
				}
				return false;
			}
		});
		commandService.addCommand(compareGitCommits);

		var compareWithWorkingTree = new mCommands.Command({
			name : messages["Compare With Working Tree"],
			imageClass: "git-sprite-compare", //$NON-NLS-0$
			spriteClass: "gitCommandSprite",
			id : "eclipse.compareWithWorkingTree", //$NON-NLS-0$
			hrefCallback : function(data) {
				return mCompareUtils.generateCompareHref(data.items.DiffLocation, {});
			},
			visibleWhen : function(item) {
				return item.Type === "Commit" && item.ContentLocation !== null && !explorer.isDirectory; //$NON-NLS-0$
			}
		});
		commandService.addCommand(compareWithWorkingTree);

		var openGitCommit = new mCommands.Command({
			name : messages["Open"],
			id : "eclipse.openGitCommit", //$NON-NLS-0$
			imageClass: "git-sprite-open", //$NON-NLS-0$
			spriteClass: "gitCommandSprite",
			hrefCallback: function(data) {
				return require.toUrl(editTemplate.expand({resource: data.items.ContentLocation}));
			},
			visibleWhen : function(item) {
				return item.Type === "Commit" && item.ContentLocation != null && !explorer.isDirectory; //$NON-NLS-0$
			}
		});
		commandService.addCommand(openGitCommit);

		var fetchCommand = new mCommands.Command({
			name: messages["Fetch"],
			tooltip: messages["Fetch from the remote"],
			imageClass: "git-sprite-fetch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.fetch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var path = item.Location;
				var name = item.Name;
				var commandInvocation = data;
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				// HACK wrap logic into function
				var fetchLogic = function(){
					if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
						commandInvocation.parameters = null;
						commandInvocation.optionsRequested = true;
						commandService.collectParameters(commandInvocation);
						return;
					}
					
					if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						progress.removeOperation(commandInvocation.errorData.failedOperation);
					}
					
					exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
						function(options) {
							var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
							var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
							var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
							var deferred = progress.progress(gitService.doFetch(path, false,
									options.gitSshUsername,
									options.gitSshPassword,
									options.knownHosts,
									options.gitPrivateKey,
									options.gitPassphrase), messages["Fetching remote: "] + name);
							statusService.createProgressMonitor(deferred, messages["Fetching remote: "] + name);
							deferred.then(
								function(jsonData, secondArg) {
									exports.handleGitServiceResponse(jsonData, serviceRegistry, 
										function() {
											explorer.changedItem(item);
										}, function (jsonData) {
											handleResponse(jsonData, commandInvocation);
										}
									);
								}, function(jsonData, secondArg) {
									exports.handleGitServiceResponse(jsonData, serviceRegistry, 
										function() {
											explorer.changedItem(item);
										}, function (jsonData) {
											handleResponse(jsonData, commandInvocation);
										}
									);
								}
							);
						}
					);
				};
				
				//TODO HACK remoteTrackingBranch does not provide git url - we have to collect manually
				if(!commandInvocation.items.GitUrl){
					// have to determine manually
					var gitService = serviceRegistry.getService("orion.git.provider");
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.progress(gitService.getGitRemote(path), "Getting remote details " + name).then(
						function(resp){
							progress.progress(gitService.getGitClone(resp.CloneLocation), "Getting git repository information " + resp.Name).then(
								function(resp){
									commandInvocation.items.GitUrl = resp.Children[0].GitUrl;
									fetchLogic();
								}, displayErrorOnStatus
							);
						}, displayErrorOnStatus
					);
				} else { fetchLogic(); }
			},
			visibleWhen: function(item) {
				if (item.Type === "RemoteTrackingBranch") //$NON-NLS-0$
					return true;
				if (item.Type === "Remote") //$NON-NLS-0$
					return true;
				if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(fetchCommand);

		var fetchForceCommand = new mCommands.Command({
			name : messages["Force Fetch"],
			imageClass: "git-sprite-fetch",
			spriteClass: "gitCommandSprite",
			tooltip: messages["Fetch from the remote branch into your remote tracking branch overriding its current content"],
			id : "eclipse.orion.git.fetchForce", //$NON-NLS-0$
			callback: function(data) {			
				if(!confirm(messages["You're going to override content of the remote tracking branch. This can cause the branch to lose commits."]+"\n\n"+messages['Are you sure?'])) //$NON-NLS-1$
					return;
				
				var item = data.items;
				var path = item.Location;
				var name = item.Name;
				var commandInvocation = data;
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				var fetchForceLogic = function(){
					if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
						commandInvocation.parameters = null;
						commandInvocation.optionsRequested = true;
						commandService.collectParameters(commandInvocation);
						return;
					}
					
					
					if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						progress.removeOperation(commandInvocation.errorData.failedOperation);
					}
	
					exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
						function(options) {
							var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
							var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
							var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
							var deferred = progress.progress(gitService.doFetch(path, true,
									options.gitSshUsername,
									options.gitSshPassword,
									options.knownHosts,
									options.gitPrivateKey,
									options.gitPassphrase), messages['Fetching remote: '] + name);
							statusService.createProgressMonitor(deferred, messages['Fetching remote: '] + name);
							deferred.then(
								function(jsonData, secondArg) {
									exports.handleGitServiceResponse(jsonData, serviceRegistry, 
										function() {
											explorer.changedItem(item);
										}, function (jsonData) {
											handleResponse(jsonData, commandInvocation);
										}
									);
								}, function(jsonData, secondArg) {
									exports.handleGitServiceResponse(jsonData, serviceRegistry, 
										function() {
											explorer.changedItem(item);
										}, function (jsonData) {
											handleResponse(jsonData, commandInvocation);
										}
									);
								}
							);
						}
					);
				};
				
				//TODO HACK remoteTrackingBranch does not provide git url - we have to collect manually
				if(!commandInvocation.items.GitUrl){
					// have to determine manually
					var gitService = serviceRegistry.getService("orion.git.provider");
					gitService.getGitRemote(path).then(
						function(resp){
							gitService.getGitClone(resp.CloneLocation).then(
								function(resp){
									commandInvocation.items.GitUrl = resp.Children[0].GitUrl;
									fetchForceLogic();
								}
							);
						}
					);
				} else { fetchForceLogic(); }
			},
			visibleWhen : function(item) {
				if (item.Type === "RemoteTrackingBranch") //$NON-NLS-0$
					return true;
				if (item.Type === "Remote") //$NON-NLS-0$
					return true;
				if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(fetchForceCommand);

		var mergeCommand = new mCommands.Command({
			name : messages["Merge"],
			tooltip: messages["Merge the content from the branch to your active branch"],
			imageClass: "git-sprite-merge", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.merge", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				progress.progress(gitService.doMerge(item.HeadLocation, item.Name, false), "Merging " + item.Name).then(function(result){
					var display = {};

					if (result.Result === "FAST_FORWARD" || result.Result === "ALREADY_UP_TO_DATE"){ //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = result.Result;
					} else if(result.Result){
						var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$

						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + result.Result; //$NON-NLS-0$
						if(result.FailingPaths){
							var paths = "";
							var isFirstPath = true;
							for(var path in result.FailingPaths){
								if(!isFirstPath){
									paths+=", ";
								}
								isFirstPath = false;
								paths+=path;
							}
							if(!isFirstPath){
								display.Severity = "Error"; //$NON-NLS-0$
								display.Message+= ". " + i18nUtil.formatMessage(messages['Failing paths: ${0}'], paths);
							}
						}
						display.Message += i18nUtil.formatMessage(messages[". Go to ${0}."], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-1$ //$NON-NLS-0$
							+ "\">"+messages["Git Status page"]+"</a>")+"</span>"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-0$
					} else if(result.error) {
						var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Error"; //$NON-NLS-0$
						if(result.error.responseText && JSON.parse(result.error.responseText)){
							var resp = JSON.parse(result.error.responseText);
							display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
						}else{
							display.Message = result.error.message;
						}
						display.HTML = true;
						display.Message ="<span>" + display.Message + i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							+ "\">"+messages['Git Status page']+"</a>")+"</span>"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-0$
					}

					progressService.setProgressResult(display);
					explorer.changedItem(item);
				}, function (error, ioArgs) {
					var display = [];

					var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$

					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = true;
					display.Message = "<span>" + JSON.stringify(ioArgs.xhr.responseText).DetailedMessage //$NON-NLS-0$
					+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-0$//$NON-NLS-2$ //$NON-NLS-1$
					+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					explorer.changedItem(item);
				});
			},
			visibleWhen : function(item) {
				if (item.Type === "RemoteTrackingBranch") //$NON-NLS-0$
					return true;
				if (item.Type === "Branch" && !item.Current) //$NON-NLS-0$
					return true;
				if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(mergeCommand);
		
		var mergeSquashCommand = new mCommands.Command({
			name : messages["Merge Squash"],
			tooltip: messages["Squash the content of the branch to the index"],
			imageClass: "git-sprite-merge-squash", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.mergeSquash", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				progress.progress(gitService.doMerge(item.HeadLocation, item.Name, true), "Merging " + item.Name).then(function(result){
					var display = [];

					if (result.Result === "FAST_FORWARD_SQUASHED" || result.Result === "ALREADY_UP_TO_DATE"){ //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = result.Result;
					} else if(result.Result){
						var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$

						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + result.Result //$NON-NLS-0$
							+ i18nUtil.formatMessage(messages[". Go to ${0}."], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							+"\">"+messages["Git Status page"]+"</a>")+"</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
					} else if(result.error) {
						var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Error"; //$NON-NLS-0$
						if(result.error.responseText && JSON.parse(result.error.responseText)){
							var resp = JSON.parse(result.error.responseText);
							display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
						}else{
							display.Message = result.error.message;
						}
						display.HTML = true;
						display.Message ="<span>" + display.Message + i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
							+ "\">"+messages['Git Status page']+"</a>")+"</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
					}

					progressService.setProgressResult(display);
					explorer.changedItem(item);
				}, function (error, ioArgs) {
					var display = [];
					var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = true;
					display.Message = "<span>" + JSON.stringify(ioArgs.xhr.responseText).DetailedMessage //$NON-NLS-0$
					+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
					
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					explorer.changedItem(item);
				});
			},
			visibleWhen : function(item) {
				if (item.Type === "RemoteTrackingBranch") //$NON-NLS-0$
					return true;
				if (item.Type === "Branch" && !item.Current) //$NON-NLS-0$
					return true;
				if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(mergeSquashCommand);

		var rebaseCommand = new mCommands.Command({
			name : messages["Rebase"],
			tooltip: messages["Rebase your commits by removing them from the active branch, starting the active branch again based on the latest state of the selected branch "] +
					"and applying each commit again to the updated active branch.", //$NON-NLS-0$
			id : "eclipse.orion.git.rebase", //$NON-NLS-0$
			imageClass: "git-sprite-rebase", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doRebase(item.HeadLocation, item.Name, "BEGIN"), item.Name ? messages["Rebase on top of "] + item.Name: messages['Rebase']); //$NON-NLS-1$ //$NON-NLS-0$
				progressService.createProgressMonitor(deferred, 
				item.Name ? messages["Rebase on top of "] + item.Name: messages['Rebase']);
				deferred.then(
					function(jsonData){
						var display = [];
						var statusLocation = item.HeadLocation.replace("commit/HEAD", "status"); //$NON-NLS-1$ //$NON-NLS-0$
	
						if (jsonData.Result === "OK" || jsonData.Result === "FAST_FORWARD" || jsonData.Result === "UP_TO_DATE" ) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							// operation succeeded
							display.Severity = "Ok"; //$NON-NLS-0$
							display.HTML = false;
							display.Message = jsonData.Result;
						}
						// handle special cases
						else if (jsonData.Result === "STOPPED") { //$NON-NLS-0$
							display.Severity = "Warning"; //$NON-NLS-0$
							display.HTML = true;
							display.Message = "<span>" + jsonData.Result //$NON-NLS-0$
								+ messages[". Some conflicts occurred. Please resolve them and continue, skip patch or abort rebasing"]
								+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
						}
						else if (jsonData.Result === "FAILED_WRONG_REPOSITORY_STATE") { //$NON-NLS-0$
							display.Severity = "Error"; //$NON-NLS-0$
							display.HTML = true;
							display.Message = "<span>" + jsonData.Result //$NON-NLS-0$
								+ messages[". Repository state is invalid (i.e. already during rebasing)"]
								+ i18nUtil.formatMessage(". Go to ${0}.", "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
						}
						else if (jsonData.Result === "FAILED_UNMERGED_PATHS") { //$NON-NLS-0$
							display.Severity = "Error"; //$NON-NLS-0$
							display.HTML = true;
							display.Message = "<span>" + jsonData.Result //$NON-NLS-0$
								+ messages[". Repository contains unmerged paths"]
								+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$
	   							+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
						}
						else if (jsonData.Result === "FAILED_PENDING_CHANGES") { //$NON-NLS-0$
							display.Severity = "Error"; //$NON-NLS-0$
							display.HTML = true;
							display.Message = "<span>" + jsonData.Result //$NON-NLS-0$
								+ messages[". Repository contains pending changes. Please commit or stash them"]
								+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								+"\">"+"Git Status page"+"</a>")+".</span>"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						}
						// handle other cases
						else {
							display.Severity = "Warning"; //$NON-NLS-0$
							display.HTML = true;
							display.Message = "<span>" + jsonData.Result //$NON-NLS-0$
							+ i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							+"\">"+messages['Git Status page']+"</a>")+".</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
						} 
	
						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
						explorer.changedItem(item);
					}, 
					displayErrorOnStatus
				);
			},
			visibleWhen : function(item) {
				this.tooltip = messages["Rebase your commits by removing them from the active branch, "] +
					messages["starting the active branch again based on the latest state of '"] + item.Name + "' " +  //$NON-NLS-1$
					messages["and applying each commit again to the updated active branch."];

				return item.Type === "RemoteTrackingBranch" || (item.Type === "Branch" && !item.Current); //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(rebaseCommand);
		
		var pushCommand = new mCommands.Command({
			name : messages["Push All"],
			tooltip: messages["Push commits and tags from your local branch into the remote branch"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.push", //$NON-NLS-0$
			callback: function(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;
			
				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				
				var parts = item.CloneLocation.split("/");
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider");
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
					progress.removeOperation(commandInvocation.errorData.failedOperation);
				}
				
				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, true, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
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
							exports.handleProgressServiceResponse(error, {}, serviceRegistry);
						};
						
						exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
							function(options) {
								var result = new Deferred();
								
								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting git remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);
									
								}
						
								result.then(
									function(remotes){
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, false);
											return;
										}
									
										var dialog = new mRemotePrompter.RemotePrompterDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
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
										
										if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
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
												}
											});
										}
										
										dialog.show();
									}
								);
						
							}
						);
					}
				);
			},
			visibleWhen : function(item) {
				if (item.toRef)
					// for action in the git log
					return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation; //$NON-NLS-0$
				else
					// for action in the repo view
					return item.Type === "Branch" && item.Current && item.RemoteLocation; //$NON-NLS-0$
				
			}
		});
		commandService.addCommand(pushCommand);
		
		var pushBranchCommand = new mCommands.Command({
			name : messages["Push Branch"],
			tooltip: messages["Push commits without tags from your local branch into the remote branch"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushBranch", //$NON-NLS-0$
			callback: function(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;
			
				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				
				var parts = item.CloneLocation.split("/");
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider");
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
					progress.removeOperation(commandInvocation.errorData.failedOperation);
				}
				
				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, false, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
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
							exports.handleProgressServiceResponse(error, {}, serviceRegistry);
						};
						
						exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
							function(options) {
								var result = new Deferred();
								
								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting git remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);
									
								}
						
								result.then(
									function(remotes){
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, false);
											return;
										}
									
										var dialog = new mRemotePrompter.RemotePrompterDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
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
										
										if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
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
												}
											});
										}
										
										dialog.show();
									}
								);
						
							}
						);
					}
				);
			},
			visibleWhen : function(item) {
				if (item.toRef)
					// for action in the git log
					return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation; //$NON-NLS-0$
				else
					// for action in the repo view
					return item.Type === "Branch" && item.Current && item.RemoteLocation; //$NON-NLS-0$
				
			}
		});
		commandService.addCommand(pushBranchCommand);

		var pushToGerritCommand = new mCommands.Command({
			name : messages["Push for Review"],
			tooltip: messages["Push commits to Gerrit Code Review"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushToGerrit", //$NON-NLS-0$
			callback: function(data) {
				//previously saved target branch
				var itemTargetBranch = data.targetBranch;

				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;

				var parts = item.CloneLocation.split("/");

				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandInvocation.errorData.failedOperation = jsonData.failedOperation;
						commandService.collectParameters(commandInvocation);
					}
				};

				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider");
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$

				if(commandInvocation.errorData && commandInvocation.errorData.failedOperation){
					progress.removeOperation(commandInvocation.errorData.failedOperation);
				}

				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, false, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							exports.handleGitServiceResponse(jsonData, serviceRegistry,
								function() {
									explorer.changedItem();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
							exports.handleGitServiceResponse(jsonData, serviceRegistry,
								function() {
									explorer.changedItem();
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
							exports.handleProgressServiceResponse(error, {}, serviceRegistry);
						};

						exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
							function(options) {
								var result = new Deferred();

								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting git remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);

								}

								result.then(
									function(remotes){
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, false);
											return;
										}
										commandInvocation.targetBranch = item.RemoteLocation[0].Children[0];
										var branchLocation = item.RemoteLocation[0].Children[0].Location;
										var arr = branchLocation.split("/");
										var destination = "refs/for/master"; // for now we hardcode it
										arr[4] = encodeURIComponent(encodeURIComponent(destination));
										var remoteLocation = arr.join("/");
										commandInvocation.targetBranch.Location = remoteLocation;
										commandInvocation.targetBranch.Name = destination;

										dialog = new mConfirmPush.ConfirmPushDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
											dialog: null,
											location: destination,
											func: function(){
												handlePush(options, remoteLocation, "HEAD", destination, false);
											}
										});

										dialog.show();
									}
								);

							}
						);
					}
				);
			},
			visibleWhen : function(item) {
				if (item.toRef)
					// for action in the git log
					return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation //$NON-NLS-0$
						&& item.toRef.RemoteLocation[0].IsGerrit;
				else
					// for action in the repo view
					return item.Type === "Branch" && item.Current && item.RemoteLocation && item.RemoteLocation[0].IsGerrit; //$NON-NLS-0$

			}
		});
		commandService.addCommand(pushToGerritCommand);

		var pushForceCommand = new mCommands.Command({
			name : messages["Force Push All"],
			tooltip: messages["Push commits and tags from your local branch into the remote branch overriding its current content"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushForce", //$NON-NLS-0$
			callback: function(data) {
				// previously confirmed warnings
				var confirmedWarnings = data.confirmedWarnings;
				
				// previously target branch
				var itemTargetBranch = data.targetBranch;
				
				if(!confirmedWarnings){
					if(!confirm(messages["You're going to override content of the remote branch. This can cause the remote repository to lose commits."]+"\n\n"+messages['Are you sure?'])){ //$NON-NLS-1$
						return;	
					} else {
						data.confirmedWarnings = true;
						confirmedWarnings = true;
					}
				}
				
				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				
				var parts = item.CloneLocation.split("/");
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider");
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, true, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem(item);
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
						
						exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
							function(options) {
								var result = new Deferred();
								
								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);
									
								}
						
								result.then(
									function(remotes){
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, true);
											return;
										}
									
										var dialog = new mRemotePrompter.RemotePrompterDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
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
												
												var locationToUpdate = "/gitapi/config/" + "branch." + item.Name + ".remote"  + "/clone/file/" + parts[4];
												progress.progress(gitService.addCloneConfigurationProperty(locationToChange,"branch." + item.Name + ".remote" ,target.parent.Name), "Setting git configuration property " + item.Name).then(
													function(){
														commandInvocation.targetBranch = target;
														handlePush(options, target.Location, "HEAD",target.Name, true);
													}, function(err){
														if(err.status === 409){ //when confing entry is already defined we have to edit it
															progress.progres(gitService.editCloneConfigurationProperty(locationToUpdate,target.parent.Name), "Setting git configuration property " + target.parent.Name).then(
																function(){
																	commandInvocation.targetBranch = target;
																	handlePush(options, target.Location, "HEAD",target.Name, true);
																}
															);
														}
													}
												);
											}
										});
										
										if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
											var dialog2 = dialog;
											
											dialog = new mConfirmPush.ConfirmPushDialog({
												title: messages["Choose Branch"],
												serviceRegistry: serviceRegistry,
												gitClient: gitService,
												dialog: dialog2,
												location: item.RemoteLocation[0].Children[0].Name,
												func: function(){
													commandInvocation.targetBranch = item.RemoteLocation[0].Children[0];
													handlePush(options,item.RemoteLocation[0].Children[0].Location, "HEAD", item.Location, true);
												}
											});
										}
										
										dialog.show();
									}
								);
							}
						);
					}
				);			
			},
			visibleWhen : function(item) {
				if (item.toRef)
					// for action in the git log
					return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation; //$NON-NLS-0$		
			}
		});
		commandService.addCommand(pushForceCommand);
		
		var pushBranchForceCommand = new mCommands.Command({
			name : messages["Force Push Branch"],
			tooltip: messages["Push commits without tags from your local branch into the remote branch overriding its current content"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushForceBranch", //$NON-NLS-0$
			callback: function(data) {
				// previously confirmed warnings
				var confirmedWarnings = data.confirmedWarnings;
				
				// previously target branch
				var itemTargetBranch = data.targetBranch;
				
				if(!confirmedWarnings){
					if(!confirm(messages["You're going to override content of the remote branch. This can cause the remote repository to lose commits."]+"\n\n"+messages['Are you sure?'])){ //$NON-NLS-1$
						return;	
					} else {
						data.confirmedWarnings = true;
						confirmedWarnings = true;
					}
				}
				
				var target;
				var item = data.items;
				if (item.toRef) {
					item = item.toRef;
				}
				var commandInvocation = data;
				
				var parts = item.CloneLocation.split("/");
				
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
					}
				};
				
				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var gitService = serviceRegistry.getService("orion.git.provider");
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var handlePush = function(options, location, ref, name, force){
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var deferred = progress.progress(gitService.doPush(location, ref, false, force, //$NON-NLS-0$
							options.gitSshUsername, options.gitSshPassword, options.knownHosts,
							options.gitPrivateKey, options.gitPassphrase), messages['Pushing remote: '] + name);
					progressService.createProgressMonitor(deferred, messages['Pushing remote: '] + name);
					deferred.then(
						function(jsonData){
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem();
								}, function (jsonData) {
									handleResponse(jsonData, commandInvocation);
								}
							);
						}, function(jsonData, secondArg) {
							exports.handleGitServiceResponse(jsonData, serviceRegistry, 
								function() {
									explorer.changedItem(item);
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
						
						exports.gatherSshCredentials(serviceRegistry, commandInvocation).then(
							function(options) {
								var result = new Deferred();
								
								if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
									result = progress.progress(gitService.getGitRemote(remoteLocation), "Getting remote details " + item.Name);
								} else {
									var remotes = {};
									remotes.Children = item.RemoteLocation;
									result.resolve(remotes);
									
								}
						
								result.then(
									function(remotes){
										if(itemTargetBranch){
											handlePush(options, itemTargetBranch.Location, "HEAD", itemTargetBranch.Name, true);
											return;
										}
									
										var dialog = new mRemotePrompter.RemotePrompterDialog({
											title: messages["Choose Branch"],
											serviceRegistry: serviceRegistry,
											gitClient: gitService,
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
												
												var locationToUpdate = "/gitapi/config/" + "branch." + item.Name + ".remote"  + "/clone/file/" + parts[4];
												progress.progress(gitService.addCloneConfigurationProperty(locationToChange,"branch." + item.Name + ".remote" ,target.parent.Name), "Setting git configuration property " + item.Name).then(
													function(){
														commandInvocation.targetBranch = target;
														handlePush(options, target.Location, "HEAD",target.Name, true);
													}, function(err){
														if(err.status === 409){ //when confing entry is already defined we have to edit it
															progress.progres(gitService.editCloneConfigurationProperty(locationToUpdate,target.parent.Name), "Setting git configuration property " + target.parent.Name).then(
																function(){
																	commandInvocation.targetBranch = target;
																	handlePush(options, target.Location, "HEAD",target.Name, true);
																}
															);
														}
													}
												);
											}
										});
										
										if (item.RemoteLocation.length === 1 && item.RemoteLocation[0].Children.length === 1) { //when we push next time - chance to switch saved remote
											var dialog2 = dialog;
											
											dialog = new mConfirmPush.ConfirmPushDialog({
												title: messages["Choose Branch"],
												serviceRegistry: serviceRegistry,
												gitClient: gitService,
												dialog: dialog2,
												location: item.RemoteLocation[0].Children[0].Name,
												func: function(){
													commandInvocation.targetBranch = item.RemoteLocation[0].Children[0];
													handlePush(options,item.RemoteLocation[0].Children[0].Location, "HEAD", item.Location, true);
												}
											});
										}
										
										dialog.show();
									}
								);
							}
						);
					}
				);			
			},
			visibleWhen : function(item) {
				if (item.toRef)
					// for action in the git log
					return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation; //$NON-NLS-0$		
			}
		});
		commandService.addCommand(pushBranchForceCommand);

		var previousLogPage = new mCommands.Command({
			name : messages["< Previous Page"],
			tooltip: messages["Show previous page of git log"],
			id : "eclipse.orion.git.previousLogPage", //$NON-NLS-0$
			hrefCallback : function(data) {
				return require.toUrl(logTemplateNoPage.expand({resource: data.items.PreviousLocation}));
			},
			visibleWhen : function(item) {
				if(item.Type === "RemoteTrackingBranch" || (item.toRef && item.toRef.Type === "Branch") || item.RepositoryPath !== null){ //$NON-NLS-1$ //$NON-NLS-0$
					return item.PreviousLocation !== undefined;
				}
				return false;
			}
		});
		commandService.addCommand(previousLogPage);

		var nextLogPage = new mCommands.Command({
			name : messages["Next Page >"],
			tooltip: messages["Show next page of git log"],
			id : "eclipse.orion.git.nextLogPage", //$NON-NLS-0$
			hrefCallback : function(data) {
				return require.toUrl(logTemplateNoPage.expand({resource: data.items.NextLocation}));
			},
			visibleWhen : function(item) {
				if(item.Type === "RemoteTrackingBranch" ||(item.toRef && item.toRef.Type === "Branch") || item.RepositoryPath !== null){ //$NON-NLS-1$ //$NON-NLS-0$
					return item.NextLocation !== undefined;
				}
				return false;
			}
		});
		commandService.addCommand(nextLogPage);
		
		var previousTagPage = new mCommands.Command({
			name : messages["< Previous Page"],
			tooltip : messages["Show previous page of git tags"],
			id : "eclipse.orion.git.previousTagPage",
			hrefCallback : function(data) {
				return require.toUrl(repoTemplate.expand({resource: data.items.PreviousLocation}));
			},
			visibleWhen : function(item){
				if(item.Type === "Tag"){
					return item.PreviousLocation !== undefined;
				}
				return false;
			}
		});
		commandService.addCommand(previousTagPage);
		
		var nextTagPage = new mCommands.Command({
			name : messages["Next Page >"],
			tooltip : messages["Show next page of git tags"],
			id : "eclipse.orion.git.nextTagPage",
			hrefCallback : function(data){
				return require.toUrl(repoTemplate.expand({resource: data.items.NextLocation}));
			},
			visibleWhen : function(item){
				if(item.Type === "Tag"){
					return item.NextLocation !== undefined;
				}
				return false;
			}
		});
		commandService.addCommand(nextTagPage);

		var resetIndexCommand = new mCommands.Command({
			name : messages['Reset'],
			tooltip: messages["Reset your active branch to the state of the selected branch. Discard all staged and unstaged changes."],
			id : "eclipse.orion.git.resetIndex", //$NON-NLS-0$
			imageClass: "git-sprite-reset", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				if(confirm(i18nUtil.formatMessage(messages["GitResetIndexConfirm"], item.Name))) { //$NON-NLS-0$
					var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var deferred = progress.progress(service.resetIndex(item.IndexLocation, item.Name), "Resetting git index for " + item.Name);
					progressService.createProgressMonitor(deferred, messages["Resetting index..."]);
					deferred.then(
						function(result){
							var display = {};
							display.Severity = "Info"; //$NON-NLS-0$
							display.HTML = false;
							display.Message = "Ok"; //$NON-NLS-0$
							explorer.changedItem(item);
							progressService.setProgressResult(display);
						}, function (error){
							var display = {};
							display.Severity = "Error"; //$NON-NLS-0$
							display.HTML = false;
							display.Message = error.message;
							progressService.setProgressResult(display);
						}
					);
				}
			},
			visibleWhen : function(item) {
				return item.Type === "RemoteTrackingBranch"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(resetIndexCommand);

		var tagNameParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages['Name:'])]); //$NON-NLS-1$ //$NON-NLS-0$

		var addTagCommand = new mCommands.Command({
			name : messages["Tag"],
			tooltip: messages["Create a tag for the commit"],
			imageClass: "git-sprite-tag", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.addTag", //$NON-NLS-0$
			parameters: tagNameParameters,
			callback: function(data) {
				var item = data.items;
				
				var createTagFunction = function(commitLocation, tagName) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.progress(serviceRegistry.getService("orion.git.provider").doAddTag(commitLocation, tagName), "Adding tag " + tagName).then(function() { //$NON-NLS-0$
						explorer.changedItem(item);
					}, displayErrorOnStatus);
				};
				
				var commitLocation = item.Location;
				
				if (data.parameters.valueFor("name") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					createTagFunction(commitLocation, data.parameters.valueFor("name")); //$NON-NLS-0$
				}
			},
			visibleWhen : function(item) {
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(addTagCommand);

		var removeTagCommand = new mCommands.Command({
			name: messages['Delete'],
			tooltip: messages["Delete the tag from the repository"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.removeTag", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete tag ${0}?"], item.Name))) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.progress(serviceRegistry.getService("orion.git.provider").doRemoveTag(item.Location), "Removing tag " + item.Name).then(function() { //$NON-NLS-0$
						explorer.changedItem(item.parent);
					}, displayErrorOnStatus);
				}
			},
			visibleWhen: function(item) {
				return item.Type === "Tag"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeTagCommand);
		
		var notificationParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('reviewer', 'text', messages["Reviewer name"])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
		

		var askForReviewCommand = new mCommands.Command({
			name : messages["Ask for review"],
			tooltip : messages["Ask for review tooltip"],
			imageClass : "core-sprite-tag", //$NON-NLS-0$
			id : "eclipse.orion.git.askForReviewCommand", //$NON-NLS-0$
			parameters : notificationParameters,
			callback : function(data) {
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var sshCheck = function(gitUrl) {
					var url = gitUrl;
					var parser = document.createElement('a');
					parser.href = url;
					var scheme = parser.protocol;
					
					if (scheme === "ssh:") {
						var indexOfAt = url.indexOf("@");
						if (indexOfAt !== -1) {
							var urlNoUser = "ssh://" + url.substr(indexOfAt + 1);
							url = urlNoUser;
						}
					}
					return url;
				};
				
				var sendNotificationFunction = function(reviewerName) {
					var item = data.items;
					var headLocation = item.Location.replace(item.Name, "HEAD");
					var authorName = item.AuthorName;
					var commitName = item.Name;
					var commitMessage = item.Message;
					progress.progress(serviceRegistry.getService("orion.git.provider").getGitClone(item.CloneLocation), 
							"Getting repository details " + item.Name).then(
						function(clone) {
							var nonHash = window.location.href.split('#')[0]; //$NON-NLS-0$
							var orionHome = PageLinks.getOrionHome();
							var url = sshCheck(clone.Children[0].GitUrl);
							var reviewRequestUrl = orionHome + "/git/reviewRequest.html#" + url + "_" + item.Name;
							progress.progress(
									serviceRegistry.getService("orion.git.provider").sendCommitReviewRequest(commitName, headLocation,
											reviewerName, reviewRequestUrl, authorName, commitMessage),
									"Sending review request for " + commitName).then(function(result) {
								var display = {};
								display.Severity = "Ok"; //$NON-NLS-0$
								display.HTML = false;
								display.Message = result.Result;
								serviceRegistry.getService("orion.page.message").setProgressResult(display);
							}, displayErrorOnStatus);
						});
				};
				
				if (data.parameters.valueFor("reviewer") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					sendNotificationFunction(data.parameters.valueFor("reviewer")); //$NON-NLS-0$
				} else {
					var item = data.items;
					progress.progress(serviceRegistry.getService("orion.git.provider").getGitClone(item.CloneLocation),
							"Getting git details " + item.Name).then(function(clone) {
						var nonHash = window.location.href.split('#')[0]; //$NON-NLS-0$
						var orionHome = PageLinks.getOrionHome();
						var url = sshCheck(clone.Children[0].GitUrl);
						var reviewRequestUrl = orionHome + "/git/reviewRequest.html#" + url + "_" + item.Name;
						var dialog = new mReviewRequest.ReviewRequestDialog({
							title : messages["Contribution Review Request"],
							url : reviewRequestUrl,
							func : sendNotificationFunction
						});
						dialog.show();
					}, displayErrorOnStatus);
				}
			},
			visibleWhen : function(item) {
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(askForReviewCommand);

		var cherryPickCommand = new mCommands.Command({
			name : messages["Cherry-Pick"],
			tooltip: messages["Apply the change introduced by the commit to your active branch"],
			id : "eclipse.orion.git.cherryPick", //$NON-NLS-0$
			imageClass: "git-sprite-cherry-pick", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var headLocation = item.Location.replace(item.Name, "HEAD"); //$NON-NLS-0$
				progress.progress(service.doCherryPick(headLocation, item.Name), "Cherry picking " + item.Name).then(function(jsonData) {
					var display = [];

					// TODO we should not craft locations in the code
					var statusLocation = item.Location.replace("commit/" + item.Name, "status"); //$NON-NLS-1$ //$NON-NLS-0$

					if (jsonData.Result === "OK") { //$NON-NLS-0$
						// operation succeeded
						display.Severity = "Ok"; //$NON-NLS-0$
						if (jsonData.HeadUpdated) {
							display.HTML = false;
							display.Message = jsonData.Result;
						} else {
							display.HTML = true;
							display.Message = "<span>"+messages["Nothing changed."]+"</span>"; //$NON-NLS-2$ //$NON-NLS-0$
						}
					}
					// handle special cases
					else if (jsonData.Result === "CONFLICTING") { //$NON-NLS-0$
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						var link = i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-0$ //$NON-NLS-1$
						+"\">"+messages['Git Status page']+"</a>")+"</span>"; //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
						
						display.Message = "<span>" + jsonData.Result + messages[". Some conflicts occurred"] + link; //$NON-NLS-0$
						
					} else if (jsonData.Result === "FAILED") { //$NON-NLS-0$
						display.Severity = "Error"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + jsonData.Result;  //$NON-NLS-0$
						if(jsonData.FailingPaths){
							var paths = "";
							var isFirstPath = true;
							for(var path in jsonData.FailingPaths){
								if(!isFirstPath){
									paths+=", ";
								}
								isFirstPath = false;
								paths +=path;
							}
							if(!isFirstPath){
								display.Message+= ". " + i18nUtil.formatMessage(messages['Failing paths: ${0}'], paths);
								}
						}
						display.Message += i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-0$ //$NON-NLS-1$
						+"\">"+messages['Git Status page']+"</a>")+"</span>";					} //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-0$
					// handle other cases
					else {
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
				}, displayErrorOnStatus);

			},
			visibleWhen : function(item) {
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(cherryPickCommand);
		
		var revertCommand = new mCommands.Command({
			name : messages["Revert"],
			tooltip: messages["Revert changes introduced by the commit into your active branch"],
			id : "eclipse.orion.git.revert", //$NON-NLS-0
			imageClass: "git-sprite-reset", //$NON-NLS-0$ //TODO: Change to custom revert icon when provided
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var headLocation = item.Location.replace(item.Name, "HEAD"); //$NON-NLS-0$
				progress.progress(service.doRevert(headLocation, item.Name), "Reverting " + item.Name).then(function(jsonData) {
					var display = [];

					// TODO we should not craft locations in the code
					var statusLocation = item.Location.replace("commit/" + item.Name, "status"); //$NON-NLS-1$ //$NON-NLS-0$

					if (jsonData.Result === "OK") { //$NON-NLS-0$
						// operation succeeded
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					// handle special cases
					else if (jsonData.Result === "FAILURE") { //$NON-NLS-0$
						var link = i18nUtil.formatMessage(messages['. Go to ${0}.'], "<a href=\"" + statusURL(statusLocation) //$NON-NLS-0$ //$NON-NLS-1$
						+"\">"+messages['Git Status page']+"</a>")+"</span>"; //$NON-NLS-0$ //$NON-NLS-2$ //$NON-NLS-0$
					
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + jsonData.Result + messages[". Could not revert into active branch"] + link; //$NON-NLS-0$
					} 
					// handle other cases
					else {
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
				}, displayErrorOnStatus);

			},
			visibleWhen : function(item) {
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(revertCommand);
	};
	

	exports.createGitClonesCommands = function(serviceRegistry, commandService, explorer, toolbarId, selectionTools, fileClient) {
		
		function displayErrorOnStatus(error) {
			var display = {};
			display.Severity = "Error"; //$NON-NLS-0$
			display.HTML = false;
			
			try {
				var resp = JSON.parse(error.responseText);
				display.Message = resp.DetailedMessage ? resp.DetailedMessage : 
					(resp.Message ? resp.Message : messages["Problem while performing the action"]);
			} catch (Exception) {
				display.Message = messages["Problem while performing the action"];
			}
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		}
		
		// Git repository configuration
		
		var addConfigParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('key', 'text', messages['Key:']),  //$NON-NLS-1$ //$NON-NLS-0$
		                                                               		new mCommandRegistry.CommandParameter('value', 'text', messages['Value:'])]); //$NON-NLS-1$ //$NON-NLS-0$
		
		var addConfigEntryCommand = new mCommands.Command({
			name: messages["New Configuration Entry"],
			tooltip: "Add a new entry to the repository configuration", //$NON-NLS-0$
			id: "eclipse.orion.git.addConfigEntryCommand", //$NON-NLS-0$
			parameters: addConfigParameters,
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if (data.parameters.valueFor("key") && data.parameters.valueFor("value")){ //$NON-NLS-1$ //$NON-NLS-0$
					progress.progress(gitService.addCloneConfigurationProperty(item.ConfigLocation, data.parameters.valueFor("key"), data.parameters.valueFor("value")), "Setting configuration propetry: " + data.parameters.valueFor("key")).then( //$NON-NLS-1$ //$NON-NLS-0$
						function(jsonData){
							explorer.changedItem(item);
						}, displayErrorOnStatus
					);
				}
			}
		});
		commandService.addCommand(addConfigEntryCommand);
		
		var editConfigParameters = new mCommandRegistry.ParametersDescription([], null, function(commandInvocation) {
			var items = commandInvocation.items;
			var val;
			if(items) {
				val = items.Value;
			}
			return [new mCommandRegistry.CommandParameter('value', 'text', messages['Value:'], val)]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		});
		
		var editConfigEntryCommand = new mCommands.Command({
			name: messages["Edit"],
			tooltip: messages["Edit the configuration entry"],
			imageClass: "core-sprite-edit", //$NON-NLS-0$
			id: "eclipse.orion.git.editConfigEntryCommand", //$NON-NLS-0$
			parameters: editConfigParameters,
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if (data.parameters.valueFor("value")){ //$NON-NLS-0$
					progress.progress(gitService.editCloneConfigurationProperty(item.Location, data.parameters.valueFor("value")), "Editing configuration property " + item.Key).then( //$NON-NLS-0$
						function(jsonData){
							explorer.changedItem(item);
						}, displayErrorOnStatus
					);
				}
			},
			visibleWhen: function(item) {
				return (item.Key && item.Value && item.Location);
			}
		});
		commandService.addCommand(editConfigEntryCommand);
		
		var deleteConfigEntryCommand = new mCommands.Command({
			name: messages['Delete'],
			tooltip: messages["Delete the configuration entry"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.orion.git.deleteConfigEntryCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete ${0}?"], item.Key))) {
					progress.progress(gitService.deleteCloneConfigurationProperty(item.Location), "Deleting configuration property " + item.Key).then(
						function(jsonData) {
							explorer.changedItem(item);
						}, displayErrorOnStatus
					);
				}
			},
			visibleWhen: function(item) {
				return (item.Key && item.Value && item.Location);
			}
		});
		commandService.addCommand(deleteConfigEntryCommand);
		
		var cloneParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("url", "url", messages['Repository URL:'])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$

		function forceSingleItem(item) {
			if (Array.isArray(item)) {
				if (item.length > 1) {
					item = {};
				} else {
					item = item[0];
				}
			}
			return item;
		}
		
		var createGitProjectCommand = new mCommands.Command({
			name : messages["Clone Repository"],
			tooltip : messages["Clone an existing Git repository to a folder"],
			id : "eclipse.createGitProject", //$NON-NLS-0$
			callback : function(data) {
				var item = data.items;
				
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var cloneFunction = function(gitUrl, path, name) {
					
					item.GitUrl = gitUrl;
					exports.getDefaultSshOptions(serviceRegistry, item).then(function(options) {
						var func = arguments.callee;
						var gitConfigPreference = new GitConfigPreference(serviceRegistry);
						
						serviceRegistry.getService("orion.page.message").setProgressMessage("Your project is being set up. This may take a minute...");
						gitConfigPreference.getConfig().then(function(userInfo){
							var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, options.gitSshUsername, options.gitSshPassword, options.knownHosts, //$NON-NLS-0$
									options.gitPrivateKey, options.gitPassphrase, userInfo, true), "Cloning repository " + name);
							deferred.then(function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData) {
									gitService.getGitClone(jsonData.Location).then(
										function(repoJson){
											var pDescContent = "";
											for(var k in item.projectDescription){
												pDescContent += k + "=" + item.projectDescription[k] + "\n";
											}

											fileClient.write(repoJson.Children[0].ContentLocation + '.git/.projectInfo', pDescContent).then(
												function(){
													var editLocation = require.toUrl(editTemplate.expand({resource: repoJson.Children[0].ContentLocation}));
													window.location = editLocation;
												}
											);
										}
									);
								}, func, messages['Clone Git Repository']);
							}, function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Clone Git Repository']);
							});
						});
					});
				};
				
				if (item.url && item.projectDescription.name){
					serviceRegistry.getService("orion.page.message").setProgressMessage("Looking for project " + item.projectDescription.name);
					fileClient.loadWorkspace().then(function(projects){
						for(var i=0; i<projects.Children.length; ++i){
							var p = projects.Children[i];
							if(p.Name === item.projectDescription.name){
								if (p.Git){
									gitService.getGitClone(p.Git.CloneLocation).then(
										function(repoJson){
											if (repoJson.Children[0].GitUrl === item.url){
												window.location = require.toUrl(editTemplate.expand({
													resource: repoJson.Children[0].ContentLocation
												}));
											} else {
												console.info("Folder project is used");
											}
										}
									);
								} else {
									console.info("Folder project is used");
								}
								return;
							}
						}	
						
						cloneFunction(item.url, null, item.projectDescription.name);	
					});
				}
			},
			visibleWhen : function(item) {
				return true;
			}
		});
		commandService.addCommand(createGitProjectCommand);

		var cloneGitRepositoryCommand = new mCommands.Command({
			name : messages["Clone Repository"],
			tooltip : messages["Clone an existing Git repository to a folder"],
			id : "eclipse.cloneGitRepository", //$NON-NLS-0$
			parameters: cloneParameters,
			callback : function(data) {
				var item = data.items;
				
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var cloneFunction = function(gitUrl, path, name) {
					
					item.GitUrl = gitUrl;
					exports.getDefaultSshOptions(serviceRegistry, item).then(function(options) {
						var func = arguments.callee;
						var gitConfigPreference = new GitConfigPreference(serviceRegistry);
						gitConfigPreference.getConfig().then(function(userInfo){
							var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, options.gitSshUsername, options.gitSshPassword, options.knownHosts, //$NON-NLS-0$
									options.gitPrivateKey, options.gitPassphrase, userInfo), "Cloning repository " + name);
							serviceRegistry.getService("orion.page.message").createProgressMonitor(deferred,
									messages["Cloning repository: "] + gitUrl);
							deferred.then(function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData) {
									if (explorer.changedItem) {
										explorer.changedItem();
									}
								}, func, messages['Clone Git Repository']);
							}, function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Clone Git Repository']);
							});
						});
					});
				};
				if (data.parameters.valueFor("url") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					cloneFunction(data.parameters.valueFor("url")); //$NON-NLS-0$
				} else {
					var dialog = new mCloneGitRepository.CloneGitRepositoryDialog({
						serviceRegistry: serviceRegistry,
						fileClient: fileClient,
						url: data.parameters.valueFor("url"), //$NON-NLS-0$
						alwaysShowAdvanced: data.parameters.optionsRequested,
						func: cloneFunction
					});
							
					dialog.show();
				}
			},
			visibleWhen : function(item) {
				return true;
			}
		});
		commandService.addCommand(cloneGitRepositoryCommand);
		
		var cloneGitRepositoryCommandReviewReq = new mCommands.Command({
			name : messages["Clone Repository"],
			tooltip : messages["Clone an existing Git repository to a folder"],
			id : "eclipse.cloneGitRepositoryReviewReq", //$NON-NLS-0$
			//parameters: cloneParameters,
			callback : function(data) {
				var item = data.items;
				
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var cloneFunction = function(gitUrl, path, name) {
					
					item.GitUrl = gitUrl;
					exports.getDefaultSshOptions(serviceRegistry, item).then(function(options) {
						var func = arguments.callee;
						var gitConfigPreference = new GitConfigPreference(serviceRegistry);
						gitConfigPreference.getConfig().then(function(userInfo){
							var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, options.gitSshUsername, options.gitSshPassword, options.knownHosts, //$NON-NLS-0$
									options.gitPrivateKey, options.gitPassphrase, userInfo), "Cloning git repository " + name);
							serviceRegistry.getService("orion.page.message").createProgressMonitor(deferred,
									messages["Cloning repository: "] + gitUrl);
							deferred.then(function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData) {
									if (explorer.changedItem) {
										explorer.changedItem();
									}
								}, func, messages['Clone Git Repository']);
							}, function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Clone Git Repository']);
							});
						});
					});
				};
				var dialog = new mCloneGitRepository.CloneGitRepositoryDialog({
					serviceRegistry: serviceRegistry,
					fileClient: fileClient,
					url: data.userData,
					alwaysShowAdvanced: false,
					func: cloneFunction
				});
						
				dialog.show();
			},
			visibleWhen : function(item) {
				return true;
			}
		});
		commandService.addCommand(cloneGitRepositoryCommandReviewReq);

		var addRemoteReviewRequestCommand = new mCommands.Command({
			name : messages["Add Remote"],
			tooltip : messages["Add a new remote to the repository"],
			id : "eclipse.addRemoteReviewRequestCommand", //$NON-NLS-0$
			imageClass: "git-sprite-fetch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback : function(data) {
				// check if we know the remote name
				if(data.parameters && data.parameters.valueFor("remoteName")){
					data.remoteName = data.parameters.valueFor("remoteName");
				}
			
				var commandInvocation = data;
				var handleResponse = function(jsonData, commandInvocation){
					if (jsonData.JsonData.HostKey){
						commandInvocation.parameters = null;
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
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
								commandService.collectParameters(commandInvocation);
							}
						);
					} else {
						commandInvocation.errorData = jsonData.JsonData;
						commandService.collectParameters(commandInvocation);
					}
				};

				if (commandInvocation.parameters && commandInvocation.parameters.optionsRequested){
					commandInvocation.parameters = null;
					commandInvocation.optionsRequested = true;
					commandService.collectParameters(commandInvocation);
					return;
				}
				var createRemoteFunction = function(remoteLocation, name, selectedRepository) {		
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					progress.progress(serviceRegistry.getService("orion.git.provider").addRemote(remoteLocation, name, data.userData), "Adding git remote " + name).then(function() { //$NON-NLS-0$
						exports.gatherSshCredentials(serviceRegistry, data).then(
							function(options) {
								serviceRegistry.getService("orion.git.provider").getGitRemote(selectedRepository.RemoteLocation).then(
								function(remotes){
									var remoteToFetch;
									for(var i=0;i<remotes.Children.length;i++){
										if(remotes.Children[i].Name === name){
											remoteToFetch = remotes.Children[i];
										}
									}
									var item = selectedRepository;
									var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
									var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
									var deferred = progress.progress(gitService.doFetch(remoteToFetch.Location, false,
										options.gitSshUsername,
										options.gitSshPassword,
										options.knownHosts,
										options.gitPrivateKey,
										options.gitPassphrase), "Fetching remote " + name);
									statusService.createProgressMonitor(deferred, messages["Fetching remote: "] + remoteToFetch.Location);
									deferred.then(
												function(jsonData, secondArg) {
												exports.handleGitServiceResponse(jsonData, serviceRegistry, 
													function() {
														progress.progress(gitService.getGitRemote(remoteToFetch.Location), "Getting remote details " + name).then(
															function(jsonData){
																explorer.changedItem(item);
															}, displayErrorOnStatus
														);
													}, function (jsonData) {
														handleResponse(jsonData, data);
													}
												);
											},function(jsonData, secondArg) {
												exports.handleGitServiceResponse(jsonData, serviceRegistry, 
													function() {
														explorer.changedItem(item);
													}, function (jsonData) {
														handleResponse(jsonData, commandInvocation);
													}
												);
										}
											);
						});
						});
					}, displayErrorOnStatus);
				};
					
				if(commandInvocation.remoteName){
					// known remote name, execute without prompting
					createRemoteFunction(commandInvocation.items.RemoteLocation,
										commandInvocation.remoteName,
										commandInvocation.items);
				} else {
					commandInvocation.parameters = new mCommandRegistry.ParametersDescription([
						new mCommandRegistry.CommandParameter("remoteName", "text", messages["Remote Name:"])
					], {hasOptionalParameters : false});
					
					commandService.collectParameters(commandInvocation);
				}

			},
			visibleWhen : function(item) {
				return true;
			}
		});
		commandService.addCommand(addRemoteReviewRequestCommand);

		var initRepositoryParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("folderName", "text", messages['New folder:'])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
		
		var initGitRepositoryCommand = new mCommands.Command({
			name : messages["Init Repository"],
			tooltip : messages["Create a new Git repository in a new folder"],
			id : "eclipse.initGitRepository", //$NON-NLS-0$
			parameters: initRepositoryParameters,
			callback : function(data) {
				var item = data.items;
				
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var initRepositoryFunction = function(gitUrl, path, name) {
					
					item.GitUrl = gitUrl;
					exports.getDefaultSshOptions(serviceRegistry, item).then(function(options){
						var func = arguments.callee;
						var gitConfigPreference = new GitConfigPreference(serviceRegistry);
						gitConfigPreference.getConfig().then(function(userInfo){
							var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, null, null, null, null, null, userInfo), messages["Initializing repository: "] + name); //$NON-NLS-0$
							serviceRegistry.getService("orion.page.message").createProgressMonitor(deferred,
									messages["Initializing repository: "] + name);
							deferred.then(function(jsonData, secondArg){
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData){
									if(explorer.changedItem) {
										explorer.changedItem();
									}
								}, func, messages["Init Git Repository"]);
							}, function(jsonData, secondArg) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Init Git Repository']);
							});
						});
					});
				};
				
				if (data.parameters.valueFor("folderName") && !data.parameters.optionsRequested) { //$NON-NLS-0$
					initRepositoryFunction(null, null, data.parameters.valueFor("folderName")); //$NON-NLS-0$
				} else {
					var dialog = new mCloneGitRepository.CloneGitRepositoryDialog({
						serviceRegistry: serviceRegistry,
						title: messages['Init Git Repository'],
						fileClient: fileClient,
						advancedOnly: true,
						func: initRepositoryFunction
					});
							
					dialog.show();
				}
			},
			visibleWhen : function(item) {
				return true;
			}
		});
		commandService.addCommand(initGitRepositoryCommand);

		var deleteCommand = new mCommands.Command({
			name: messages['Delete'], // "Delete Repository"
			tooltip: messages["Delete the repository"],
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.git.deleteClone", //$NON-NLS-0$
			visibleWhen: function(item) {
				return item.Type === "Clone";
			},
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if(Array.isArray(item)){
					if(confirm(i18nUtil.formatMessage(messages["Are you sure you want do delete ${0} repositories?"], item.length))){
						var alreadyDeleted = 0;
						for(var i=0; i<item.length; i++){
							progress.progress(gitService.removeGitRepository(item[i].Location), "Removing repository " + item.Name).then(
									function(jsonData){
										alreadyDeleted++;
										if(alreadyDeleted >= item.length && explorer.changedItem){
											explorer.changedItem();
										}
									}, displayErrorOnStatus);
						}
					}
				} else {
					if(confirm(i18nUtil.formatMessage(messages['Are you sure you want to delete ${0}?'], item.Name)))
						progress.progress(gitService.removeGitRepository(item.Location), "Removing repository " + item.Name).then(
							function(jsonData){
								if(explorer.changedItem){
									window.location = require.toUrl(repoTemplate.expand({})); //reset the location
									explorer.changedItem();
								}
							},
							displayErrorOnStatus);
				}
				
			}
		});
		commandService.addCommand(deleteCommand);

		var applyPatchCommand = new mCommands.Command({
			name : messages['Apply Patch'],
			tooltip: messages["Apply a patch on the selected repository"],
			id : "eclipse.orion.git.applyPatch", //$NON-NLS-0$
			imageClass: "git-sprite-apply-patch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = forceSingleItem(data.items);
				var deferred = new Deferred();
				var dialog = new mApplyPatch.ApplyPatchDialog({
					title: messages['Apply Patch'],
					diffLocation: item.DiffLocation,
					deferred: deferred
				});
				dialog.show();
				var messageService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				deferred.then(function(result){
					var message;
					try{
						var jsonResult = JSON.parse(result);
						if(jsonResult.JsonData && jsonResult.JsonData.modifiedFieles){
							message = "Patch applied, files modified: ";
							var isFirst = true;
							for(var i=0; i<jsonResult.JsonData.modifiedFieles.length; i++){
								if(!isFirst){
									message+=", ";
								}
								message+=jsonResult.JsonData.modifiedFieles[i];
								isFirst = false;
							}
							
							var display = [];
							display.Severity = "Info"; //$NON-NLS-0$
							display.HTML = false;
							display.Message = message;
							messageService.setProgressResult(display); //$NON-NLS-0$
							return;
						}
					} catch (e){
					}
					message = "Patch applied";
					messageService.setMessage(message);
				}, function(error){
					var jsonError = JSON.parse(error);
					var message = "Apply patch failed.";
					if(jsonError.DetailedMessage){
						message += " "; 
						message += jsonError.DetailedMessage;
					} else if(jsonError.Message){
						message += " "; 
						message += jsonError.Message;
					}
					var display = [];
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = false;
					display.Message = message;
					messageService.setProgressResult(display); //$NON-NLS-0$
				});
			},
			visibleWhen : function(item) {
				return item.Type === "Clone" ; //$NON-NLS-0$
			}
		});
		commandService.addCommand(applyPatchCommand);
		
		var openCommitParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("commitName", "text", messages["Commit name:"])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
		
		var openCommitCommand = new mCommands.Command({
			name : messages["Open Commit"],
			tooltip: messages["Open the commit with the given name"],
			id : "eclipse.orion.git.openCommitCommand", //$NON-NLS-0$
			imageClass: "git-sprite-apply-patch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			parameters: openCommitParameters,
			callback: function(data) {
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var findCommitLocation = function (repositories, commitName, deferred) {
					if (deferred == null)
						deferred = new Deferred();
					
					if (repositories.length > 0) {
						progress.progress(serviceRegistry.getService("orion.git.provider").doGitLog( //$NON-NLS-0$
							"/gitapi/commit/" + data.parameters.valueFor("commitName") + repositories[0].ContentLocation + "?page=1&pageSize=1", null, null, messages['Looking for the commit']), "Looking for commit " + data.parameters.valueFor("commitName")).then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							function(resp){
								deferred.resolve(resp.Children[0].Location);
							},
							function(error) {
								findCommitLocation(repositories.slice(1), commitName, deferred);
							}
						);
					} else {
						deferred.reject();
					}
					
					return deferred;
				};
				
				var openCommit = function(repositories) {
					if (data.parameters.optionsRequested) {
						new mOpenCommit.OpenCommitDialog(
							{repositories: repositories, serviceRegistry: serviceRegistry, commitName: data.parameters.valueFor("commitName")} //$NON-NLS-0$
						).show();
					} else {
						serviceRegistry.getService("orion.page.message").setProgressMessage(messages['Looking for the commit']); //$NON-NLS-0$
						findCommitLocation(repositories, data.parameters.valueFor("commitName")).then( //$NON-NLS-0$
							function(commitLocation){
								if(commitLocation){
									var commitPageURL = require.toUrl(commitTemplate.expand({resource: commitLocation})); //$NON-NLS-0$
									window.open(commitPageURL);
								}
								serviceRegistry.getService("orion.page.message").setProgressMessage(""); //$NON-NLS-0$
							}, function () {
								var display = [];
								display.Severity = "warning"; //$NON-NLS-0$
								display.HTML = false;
								display.Message = messages["No commits found"];
								serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
							}
						);
					}	
				};

				if (data.items.Type === "Clone") { //$NON-NLS-0$
					var repositories = [data.items];
					openCommit(repositories);
				} else if (data.items.CloneLocation){
					progress.progress(serviceRegistry.getService("orion.git.provider").getGitClone(data.items.CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
						function(jsonData){
							var repositories = jsonData.Children;
							openCommit(repositories);
						}
					);
				} else {
					var repositories = data.items;
					openCommit(repositories);
				}
			},
			visibleWhen : function(item) {
				return item.Type === "Clone" || item.CloneLocation || (item.length > 1 && item[0].Type === "Clone") ; //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(openCommitCommand);
	};

	exports.createGitStatusCommands = function(serviceRegistry, commandService, explorer) {
		
		function displayErrorOnStatus(error) {
			var display = {};
			display.Severity = "Error"; //$NON-NLS-0$
			display.HTML = false;
			
			try {
				var resp = JSON.parse(error.responseText);
				display.Message = resp.DetailedMessage ? resp.DetailedMessage : 
					(resp.Message ? resp.Message : messages["Problem while performing the action"]);
			} catch (Exception) {
				display.Message = messages["Problem while performing the action"];
			}
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		}
		
		function forceArray(item) {
			if (!Array.isArray(item)) {
				item = [item];
			}
			return item;
		}
		
		var stageCommand = new mCommands.Command({
			name: messages['Stage'],
			tooltip: messages['Stage the change'],
			imageClass: "git-sprite-stage", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.stageCommand", //$NON-NLS-0$
			callback: function(data) {
				var items = forceArray(data.items);
				
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				if (items.length === 1){
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").stage(items[0].indexURI), messages["Staging changes"]); //$NON-NLS-0$ 
					progressService.createProgressMonitor(
						deferred,
						messages["Staging changes"]);
					deferred.then(
						function(jsonData){
							explorer.changedItem(items);
						}, displayErrorOnStatus
					);
				} else {
					var paths = [];
					for (var i = 0; i < items.length; i++) {
						paths[i] = items[i].name;
					}
					
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").stageMultipleFiles(data.userData.Clone.IndexLocation, paths),  messages["Staging changes"]);
					progressService.createProgressMonitor(
						deferred, //$NON-NLS-0$
						"Staging changes");
					deferred.then( //$NON-NLS-0$
						function(jsonData){
							explorer.changedItem(items);
						}, displayErrorOnStatus
					);
				}			
			},
			visibleWhen: function(item) {
				var items = forceArray(item);
				if (items.length === 0)
					return false;

				for (var i = 0; i < items.length; i++) {
					if (!mGitUtil.isChange(items[i]) || mGitUtil.isStaged(items[i]))
						return false; 
				}
				return true;
			}
		});	
		
		commandService.addCommand(stageCommand);
		
		var unstageCommand = new mCommands.Command({
			name: messages['Unstage'],
			tooltip: messages['Unstage the change'],
			imageClass: "git-sprite-unstage", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.unstageCommand", //$NON-NLS-0$
			callback: function(data) {
				var items = forceArray(data.items);
				
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$

				if (items.length === 1){				
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstage(items[0].indexURI, items[0].name), 'Unstaging changes');
					progressService.createProgressMonitor(
						deferred, //$NON-NLS-0$
						messages['Staging changes']);
					deferred.then(
						function(jsonData){
							explorer.changedItem(items);
						}, displayErrorOnStatus
					);
				} else {
					var paths = [];
					for (var i = 0; i < items.length; i++) {
						paths[i] = items[i].name;
					}
					
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstage(data.userData.Clone.IndexLocation, paths), 'Unstaging changes'); //$NON-NLS-0$
					progressService.createProgressMonitor(
						deferred,
						messages['Staging changes']);
					deferred.then(
						function(jsonData){
							explorer.changedItem(items);
						}, displayErrorOnStatus
					);
				}
			},
			visibleWhen: function(item) {
				var items = forceArray(item);
				if (items.length === 0)
					return false;

				for (var i = 0; i < items.length; i++) {
					if (!mGitUtil.isChange(items[i]) || !mGitUtil.isStaged(items[i]))
						return false; 
				}
				return true;
			}
		});	
		
		commandService.addCommand(unstageCommand);
		
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
		
		var commitMessageParameters = new mCommandRegistry.ParametersDescription(
			[new mCommandRegistry.CommandParameter('name', 'text', messages['Commit message:'], "", 4), //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-3$
			 new mCommandRegistry.CommandParameter('amend', 'boolean', messages['Amend:'], false, null, amendEventListener), //$NON-NLS-0$  //$NON-NLS-1$
			 new mCommandRegistry.CommandParameter('changeId', 'boolean', messages['ChangeId:'], false)], //$NON-NLS-0$  //$NON-NLS-1$
			 {hasOptionalParameters: true});
		
		var commitCommand = new mCommands.Command({
			name: messages["Commit"],
			tooltip: messages["Commit"],
			id: "eclipse.orion.git.commitCommand", //$NON-NLS-0$
			parameters: commitMessageParameters,
			callback: function(data) {
				var item = data.items.status;
				
				var commitFunction = function(body){		
					var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").commitAll(item.Clone.HeadLocation, null, JSON.stringify(body)), messages["Committing changes"]); //$NON-NLS-0$ 
					progressService.createProgressMonitor(
						deferred,
						messages["Committing changes"]);
					deferred.then(
						function(jsonData){
							explorer.changedItem(item);
						}, displayErrorOnStatus
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
					var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doGitLog(item.CommitLocation + "?page=1&pageSize=1"), messages["Committing changes"]); //$NON-NLS-0$ 
					progressService.createProgressMonitor(
						deferred,
						messages["Committing changes"]);
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
			},
			visibleWhen: function(item) {
				return true;
			}
		});	

		commandService.addCommand(commitCommand);

		var resetCommand = new mCommands.Command({
			name: messages['Reset'],
			tooltip: messages['Reset the branch, discarding all staged and unstaged changes'],
			imageClass: "core-sprite-refresh", //$NON-NLS-0$
			id: "eclipse.orion.git.resetCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				
				var dialog = serviceRegistry.getService("orion.page.dialog"); //$NON-NLS-0$
				dialog.confirm(messages['All unstaged and staged changes in the working directory and index will be discarded and cannot be recovered.']+"\n" + //$NON-NLS-1$
					messages['Are you sure you want to continue?'],
					function(doit) {
						if (!doit) {
							return;
						}
						var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstageAll(item.IndexLocation, "HARD"), messages["Resetting local changes"]); //$NON-NLS-1$ //$NON-NLS-0$ 
						progressService.createProgressMonitor(
							deferred,
							messages["Resetting local changes"]);
						deferred.then(
							function(jsonData){
								explorer.changedItem(item);
							}, displayErrorOnStatus
						);		
					}
				);
			},
			
			visibleWhen: function(item) {
				return mGitUtil.hasStagedChanges(item) || mGitUtil.hasUnstagedChanges(item);;
			}
		});

		commandService.addCommand(resetCommand);

		var checkoutCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["Checkout all the selected files, discarding all changes"],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.checkoutCommand", //$NON-NLS-0$
			callback: function(data) {				
				var items = forceArray(data.items);
				
				var dialog = serviceRegistry.getService("orion.page.dialog"); //$NON-NLS-0$
				dialog.confirm(messages["Your changes to the selected files will be discarded and cannot be recovered."] + "\n" + //$NON-NLS-1$
					messages['Are you sure you want to continue?'],
					function(doit) {
						if (!doit) {
							return;
						}
						
						var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						
						var paths = [];
						for (var i = 0; i < items.length; i++) {
							paths[i] = items[i].name;
						}
						
						var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").checkoutPath(data.userData.Clone.Location, paths), messages['Resetting local changes']); //$NON-NLS-0$
						progressService.createProgressMonitor(
							deferred,
							messages['Resetting local changes']);
						deferred.then(
							function(jsonData){
								explorer.changedItem(items);
							}, displayErrorOnStatus
						);				
					}
				);
			},
			visibleWhen: function(item) {
				var items = forceArray(item);
				if (items.length === 0)
					return false;

				for (var i = 0; i < items.length; i++) {
					if (!mGitUtil.isChange(items[i]) || mGitUtil.isStaged(items[i]))
						return false; 
				}
				return true;
			}
		});

		commandService.addCommand(checkoutCommand);

		var showPatchCommand = new mCommands.Command({
			name: messages["Show Patch"],
			tooltip: messages["Show workspace changes as a patch"],
			id: "eclipse.orion.git.showPatchCommand", //$NON-NLS-0$
			hrefCallback : function(data) {
				var items = forceArray(data.items);
				
				var url = data.userData.Clone.DiffLocation + "?parts=diff"; //$NON-NLS-0$
				for (var i = 0; i < items.length; i++) {
					url += "&Path="; //$NON-NLS-0$
					url += items[i].name;
				}
				return url;
			},
			visibleWhen: function(item) {
				var items = forceArray(item);
				if (items.length === 0)
					return false;

				for (var i = 0; i < items.length; i++) {
					if (mGitUtil.isStaged(items[i]))
						return false; 
				}
				return true;
			}
		});
		
		commandService.addCommand(showPatchCommand);
		
		// Rebase commands
		
		function _rebase(HeadLocation, action){
			var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			
			var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doRebase(HeadLocation, "", action), "Rebasing git repository"); //$NON-NLS-0$ 
			progressService.createProgressMonitor(
				deferred,
				action);
			deferred.then(
				function(jsonData){
					if (jsonData.Result === "OK" || jsonData.Result === "ABORTED" || jsonData.Result === "FAST_FORWARD" || jsonData.Result === "UP_TO_DATE") { //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						var display = [];
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
						
						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
						explorer.changedItem({});
					}
					
					if (jsonData.Result === "STOPPED") { //$NON-NLS-0$
						var display = [];
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result + messages['. Repository still contains conflicts.'];
						
						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
						explorer.changedItem({});
					} else if (jsonData.Result === "FAILED_UNMERGED_PATHS") { //$NON-NLS-0$
						var display = [];
						display.Severity = "Error"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result + messages['. Repository contains unmerged paths. Resolve conflicts first.'];
						
						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					}
					
				}, displayErrorOnStatus
			);
		}
		
		var rebaseContinueCommand = new mCommands.Command({
			name: messages["Continue"],
			tooltip: messages["Contibue Rebase"],
			id: "eclipse.orion.git.rebaseContinueCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				return _rebase(item.Clone.HeadLocation, "CONTINUE"); //$NON-NLS-0$
			},
			
			visibleWhen: function(item) {
				return item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
			}
		});
		
		commandService.addCommand(rebaseContinueCommand);
		
		var rebaseSkipPatchCommand = new mCommands.Command({
			name: messages["Skip Patch"],
			tooltip: messages['Skip Patch'],
			id: "eclipse.orion.git.rebaseSkipPatchCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				return _rebase(item.Clone.HeadLocation, "SKIP"); //$NON-NLS-0$
			},
			
			visibleWhen: function(item) {
				return item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
			}
		});
		
		commandService.addCommand(rebaseSkipPatchCommand);
		
		var rebaseAbortCommand = new mCommands.Command({
			name: messages["Abort"],
			tooltip: messages["Abort Rebase"],
			id: "eclipse.orion.git.rebaseAbortCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				return _rebase(item.Clone.HeadLocation, "ABORT"); //$NON-NLS-0$
			},
			
			visibleWhen: function(item) {
				return item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
			}
		});
		
		commandService.addCommand(rebaseAbortCommand);	
	};

}());

return exports;	

});
