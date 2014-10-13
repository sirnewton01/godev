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
/*globals confirm*/

define([
	'i18n!git/nls/gitmessages',
	'require',
	'orion/EventTarget',
	'orion/Deferred',
	'orion/i18nUtil',
	'orion/webui/littlelib',
	'orion/commands',
	'orion/commandRegistry',
	'orion/git/util',
	'orion/git/gitPreferenceStorage',
	'orion/git/gitConfigPreference',
	'orion/git/widgets/CloneGitRepositoryDialog',
	'orion/git/widgets/ApplyPatchDialog',
	'orion/URITemplate',
	'orion/git/logic/gitCommon',
	'orion/git/logic/gitPush',
	'orion/git/logic/gitStash',
	'orion/git/logic/gitCommit',
	'orion/objects',
	'orion/URL-shim'
], function(
	messages, require, EventTarget, Deferred, i18nUtil, lib, mCommands, mCommandRegistry, mGitUtil, GitPreferenceStorage,
	GitConfigPreference, mCloneGitRepository, mApplyPatch, URITemplate, mGitCommonLogic, mGitPushLogic, 
	mGitStashLogic, mGitCommitLogic, objects) {

/**
 * @namespace The global container for eclipse APIs.
 */
var exports = {};
//this function is just a closure for the global "doOnce" flag
(function() {
	var doOnce = false;
	
	var editTemplate = new URITemplate("edit/edit.html#{,resource,params*}"); //$NON-NLS-0$
	
	var sharedModelEventDispatcher;
	exports.getModelEventDispatcher = function() {
		if (!sharedModelEventDispatcher) {
			sharedModelEventDispatcher = new EventTarget();
		}
		return sharedModelEventDispatcher;
	};
	
	function dispatchModelEventOn(event) {
		var dispatcher = sharedModelEventDispatcher;
		if (dispatcher && typeof dispatcher.dispatchEvent === "function") { //$NON-NLS-0$
			dispatcher.dispatchEvent(event);
		}
	}
	
	function preCallback(action, data) {
		var evt = {type: "stateChanging", action: action};
		dispatchModelEventOn(evt); //$NON-NLS-1$ //$NON-NLS-0$
		if(evt.preCallback) {
			return evt.preCallback();
		}
		return  new Deferred().resolve(true);
	}
	
	exports.preStateChanged = function() {
		return preCallback("selectionChanged");
	};
	
	exports.updateNavTools = function(registry, commandRegistry, explorer, toolbarId, selectionToolbarId, item, pageNavId) {
		var toolbar = lib.node(toolbarId);
		if (toolbar) {
			commandRegistry.destroy(toolbar);
		} else {
			throw new Error("could not find toolbar " + toolbarId); //$NON-NLS-0$
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

	exports.handleKnownHostsError = mGitCommonLogic.handleKnownHostsError;

	exports.handleSshAuthenticationError = mGitCommonLogic.handleSshAuthenticationError;

	exports.handleProgressServiceResponse = mGitCommonLogic.handleProgressServiceResponse;

	exports.gatherSshCredentials = mGitCommonLogic.gatherSshCredentials;

	exports.getDefaultSshOptions = mGitCommonLogic.getDefaultSshOptions;
	
	exports.handleGitServiceResponse = mGitCommonLogic.handleGitServiceResponse;
	
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
					display.Message += i18nUtil.formatMessage(messages["AuthMsgLink"], resp.label, resp.SignInLocation, messages["Login"]); //$NON-NLS-0$
				} else {
					display.Message = resp.DetailedMessage ? resp.DetailedMessage : (resp.Message ? resp.Message : messages["Problem while performing the action"]);
				}
			} catch (Exception) {
				display.Message = messages["Problem while performing the action"];
			}
			
			serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		}
		
		function checkoutCallback(data) {
			var item = data.items;
			var checkoutTagFunction = function(repositoryLocation, itemName, name){
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				progress.showWhile(serviceRegistry.getService("orion.git.provider").checkoutTag( //$NON-NLS-0$
						repositoryLocation, itemName, name), i18nUtil.formatMessage(messages["Checking out ${0}"], name)).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "checkout"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, displayErrorOnStatus);
			};
			var repositoryLocation = item.Repository ? item.Repository.Location : item.CloneLocation;
			if (data.parameters.valueFor("name") && !data.parameters.optionsRequested) { //$NON-NLS-0$
				checkoutTagFunction(repositoryLocation, item.Name, data.parameters.valueFor("name")); //$NON-NLS-0$
			}
		}

		var checkoutNameParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages["Local Branch Name:"])]); //$NON-NLS-1$ //$NON-NLS-0$

		var checkoutTagCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["CheckoutTagTooltip"],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.checkoutTag", //$NON-NLS-0$
			parameters: checkoutNameParameters,
			callback: checkoutCallback,
			visibleWhen: function(item){
				return item.Type === "Tag"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(checkoutTagCommand);

		var checkoutCommitCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["CheckoutCommitTooltip"],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.checkoutCommit", //$NON-NLS-0$
			parameters: checkoutNameParameters,
			callback: checkoutCallback,
			visibleWhen: function(item){
				if (item.outgoing && item.top) {
					return false;
				}
				return item.Type === "Commit";	//$NON-NLS-0$
			}
		});
		commandService.addCommand(checkoutCommitCommand);

		var checkoutBranchCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["CheckoutBranchMsg"],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.checkoutBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var messageService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var msg = item.Name ? i18nUtil.formatMessage(messages["Checking out branch ${0}..."], item.Name) : messages["Checking out branch..."];
				messageService.setProgressMessage(msg);
					
				if (item.Type === "Branch") { //$NON-NLS-0$
					progressService.progress(service.checkoutBranch(item.CloneLocation, item.Name), msg).then(
						function(){
							messageService.setProgressResult(messages["Branch checked out."]);
							dispatchModelEventOn({type: "modelChanged", action: "checkout"}); //$NON-NLS-1$ //$NON-NLS-0$
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
						branchLocation = item.parent.parent.repository.BranchLocation;
					}
					
					var addMsg = i18nUtil.formatMessage(messages["Adding branch ${0}..."], item.Name);
					progressService.progress(service.addBranch(branchLocation, null, item.Name), addMsg).then(
						function(branch){
							progressService.progress(service.checkoutBranch(branch.CloneLocation, branch.Name), msg).then(
								function(){
									messageService.setProgressResult(messages['Branch checked out.']);
									dispatchModelEventOn({type: "modelChanged", action: "checkout"}); //$NON-NLS-1$ //$NON-NLS-0$
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
				return item.Type === "Branch" || (item.Type === "RemoteTrackingBranch" && item.Id); //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(checkoutBranchCommand);

		var branchNameParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages['Name:'])]); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		var addBranchCommand = new mCommands.Command({
			name: messages["New Branch"],
			tooltip: messages["Add a new local branch to the repository"],
			id: "eclipse.addBranch", //$NON-NLS-0$
			parameters: branchNameParameters,
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var createBranchFunction = function(branchLocation, name) {
					var addMsg = i18nUtil.formatMessage(messages["Adding branch ${0}..."], name);
					progress.progress(serviceRegistry.getService("orion.git.provider").addBranch(branchLocation, name), addMsg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "addBranch", branch: name}); //$NON-NLS-1$ //$NON-NLS-0$
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
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.removeBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if (confirm(i18nUtil.formatMessage(messages["DelBrConfirm"], item.Name))) {
 					var msg = i18nUtil.formatMessage(messages["Removing branch ${0}..."], item.Name);
					progress.progress(serviceRegistry.getService("orion.git.provider").removeBranch(item.Location), msg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "removeBranch", branch: item}); //$NON-NLS-1$ //$NON-NLS-0$
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
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.removeRemoteBranch", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if(confirm(i18nUtil.formatMessage(messages["RemoveRemoteBranchConfirm"], item.Name))) //$NON-NLS-1$
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
							if (!jsonData || jsonData.Result.Severity === "Ok") //$NON-NLS-0$
								dispatchModelEventOn({type: "modelChanged", action: "removeBranch", branch: item}); //$NON-NLS-1$ //$NON-NLS-0$
						}, func, messages["Delete Remote Branch"]);
					}, function(jsonData) {
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Removing remote branch: '] + item.Name);
					});
				});
			},
			visibleWhen: function(item) {
				return item.Type === "RemoteTrackingBranch" && item.Id; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeRemoteBranchCommand);

		var addRemoteParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', messages['Name:']),  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		                                                               		new mCommandRegistry.CommandParameter('url', 'url', messages['URL:'])]); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		var addRemoteCommand = new mCommands.Command({
			name: messages["New Remote"],
			tooltip: messages["Add a new remote to the repository"],
			id: "eclipse.addRemote", //$NON-NLS-0$
			parameters: addRemoteParameters,
			callback : function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var createRemoteFunction = function(remoteLocation, name, url) {
					var msg = i18nUtil.formatMessage(messages["Adding remote ${0}..."], remoteLocation);
					progress.progress(serviceRegistry.getService("orion.git.provider").addRemote(remoteLocation, name, url), msg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "addRemote", remote: name}); //$NON-NLS-1$ //$NON-NLS-0$
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
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.removeRemote", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete remote ${0}?"], item.Name))) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var msg = i18nUtil.formatMessage(messages["Removing remote ${0}..."], item.Name);
					progress.progress(serviceRegistry.getService("orion.git.provider").removeRemote(item.Location), msg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "removeRemote", remote: item}); //$NON-NLS-1$ //$NON-NLS-0$
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
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {
							if (item.Type === "Clone") { //$NON-NLS-0$
								dispatchModelEventOn({type: "modelChanged", action: "pull", item: item}); //$NON-NLS-1$ //$NON-NLS-0$
							}
						}, func, "Pull Git Repository"); //$NON-NLS-0$
					}, function(jsonData) {
						if(pullOperationLocation)
							jsonData.failedOperation = pullOperationLocation;
						exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, 
							function() {
								dispatchModelEventOn({type: "modelChanged", action: "pull", item: item}); //$NON-NLS-1$ //$NON-NLS-0$
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

		var showDiffCommand = new mCommands.Command({ 
			name: messages["WorkingDirVer"],
			tooltip: messages["ViewWorkingDirVer"],
			id: "eclipse.orion.git.diff.showCurrent", //$NON-NLS-0$
			imageClass: "core-sprite-edit",  //$NON-NLS-0$
			hrefCallback: function(data) {
				return require.toUrl(editTemplate.expand({resource: data.items.ContentLocation || data.items.location}));
			},
			visibleWhen: function(item) {
				switch (item.type) {
				case "Modified": //$NON-NLS-0$
				case "Untracked": //$NON-NLS-0$
				case "Conflicting": //$NON-NLS-0$
				case "Added": //$NON-NLS-0$
				case "Changed": //$NON-NLS-0$
					return !!item.location;
				}
				
				return item.Type === "Diff" && !!item.ContentLocation; //$NON-NLS-0$
			}
		});
		commandService.addCommand(showDiffCommand);

		var openGitCommit = new mCommands.Command({
			name : messages["Open"],
			id : "eclipse.openGitCommit", //$NON-NLS-0$
			tooltip: messages["OpenGitCommitTip"], //$NON-NLS-0$
			imageClass: "core-sprite-outline", //$NON-NLS-0$
			hrefCallback: function(data) {
				return require.toUrl(editTemplate.expand({resource: data.items.TreeLocation}));
			},
			visibleWhen : function(item) {
				return item.Type === "Commit" && item.TreeLocation; //$NON-NLS-0$ 
			}
		});
		commandService.addCommand(openGitCommit);
		
		var openGitDiff = new mCommands.Command({
			name : messages["OpenCommitVersion"],  //$NON-NLS-0$
			id : "eclipse.openGitDiff", //$NON-NLS-0$
			tooltip: messages["ViewCommitVersionTip"], //$NON-NLS-0$
			imageClass: "core-sprite-outline",  //$NON-NLS-0$
			hrefCallback: function(data) {
				return require.toUrl(editTemplate.expand({resource: data.items.TreeLocation}));
			},
			visibleWhen : function(item) {
				return item.Type === "Diff" && item.TreeLocation; //$NON-NLS-0$ 
			}
		});
		commandService.addCommand(openGitDiff);
		
		var fetchCallback = function(data, force, confirmMsg) {
			var d = new Deferred();
			if (confirmMsg && !confirm(confirmMsg)) {
				d.reject();
				return d;
			}

			var item = data.items;
			var noAuth = false;
			if (item.LocalBranch && item.Remote) {
				noAuth = item.noAuth;
				item = item.Remote;
			}
			
			if (item.Remote) {
				noAuth = item.noAuth;
				item = item.Remote;
			}
			
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
									commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								else
									commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:']), new mCommandRegistry.CommandParameter("saveCredentials", "boolean", messages["Don't prompt me again:"])], {hasOptionalParameters: true}); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							} else {
								if (jsonData.JsonData.User)
									commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-1$ //$NON-NLS-0$
								else
									commandInvocation.parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("sshuser", "text", messages['User Name:']), new mCommandRegistry.CommandParameter("sshpassword", "password", messages['Password:'])], {hasOptionalParameters: true}); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
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
				
				exports.gatherSshCredentials(serviceRegistry, commandInvocation, null).then(
					function(options) {
						var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
						var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						var deferred = progress.progress(gitService.doFetch(path, force,
								options.gitSshUsername,
								options.gitSshPassword,
								options.knownHosts,
								options.gitPrivateKey,
								options.gitPassphrase), messages["Fetching remote: "] + name);
						statusService.createProgressMonitor(deferred, messages["Fetching remote: "] + name);
						deferred.then(
							function(jsonData) {
								exports.handleGitServiceResponse(jsonData, serviceRegistry, 
									function() {
										d.resolve();
									}, function (jsonData) {
										handleResponse(jsonData, commandInvocation);
									}
								);
							}, function(jsonData) {
								var code = jsonData.status || jsonData.HttpCode;
								if (noAuth && (code === 400 || code === 401)) {
									d.reject();
									return;
								}
								exports.handleGitServiceResponse(jsonData, serviceRegistry, 
									function() {
										d.resolve();
									}, function (jsonData) {
										handleResponse(jsonData, commandInvocation);
									}
								);
							}
						);
					},
					d.reject
				);
			};
			
			fetchLogic();
			return d;
		};
		var fetchVisibleWhen = function(item) {
			if (item.LocalBranch && item.Remote) {
				item = item.Remote;
			}
			if (item.Type === "RemoteTrackingBranch" && item.Id) //$NON-NLS-0$
				return true;
			if (item.Type === "Remote") //$NON-NLS-0$
				return true;
			if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
				return true;
			return false;
		};

		var fetchCommand = new mCommands.Command({
			name: messages["Fetch"],
			tooltip: messages["Fetch from the remote"],
			imageClass: "git-sprite-fetch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.fetch", //$NON-NLS-0$
			callback: function(data) {
				return fetchCallback(data, false).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "fetch", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: fetchVisibleWhen
		});
		commandService.addCommand(fetchCommand);

		var fetchRemoteCommand = new mCommands.Command({
			name: messages["Fetch"],
			tooltip: messages["Fetch from the remote"],
			imageClass: "git-sprite-fetch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.fetchRemote", //$NON-NLS-0$
			callback: function(data) {
				return fetchCallback(data, false).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "fetch", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: function(item) {
				if (item.LocalBranch && item.Remote) {
					item = item.Remote;
				}
				if (item.Remote) {
					item = item.Remote;
				}
				if (item.Type === "Remote") //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(fetchRemoteCommand);

		var fetchForceCommand = new mCommands.Command({
			name : messages["Force Fetch"],
			imageClass: "git-sprite-fetch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			tooltip: messages["FetchRemoteBranch"],
			id : "eclipse.orion.git.fetchForce", //$NON-NLS-0$
			callback: function(data) {
				var confirm = messages["OverrideContentRemoteTrackingBr"]+"\n\n"+messages['Are you sure?']; //$NON-NLS-0$
				fetchCallback(data, true, confirm).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "fetch", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : fetchVisibleWhen
		});
		commandService.addCommand(fetchForceCommand);

		var mergeCommand = new mCommands.Command({
			name : messages["Merge"],
			tooltip: messages["MergeContentFrmBr"],
			imageClass: "git-sprite-merge", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.merge", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var msg = i18nUtil.formatMessage(messages["Merging ${0}"], item.Name);
				progress.progress(gitService.doMerge(item.HeadLocation, item.Name, false), msg).then(function(result){
					var display = {};

					if (result.Result === "FAST_FORWARD" || result.Result === "ALREADY_UP_TO_DATE"){ //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = result.Result;
					} else if(result.Result){
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + result.Result; //$NON-NLS-0$
						if(result.FailingPaths){
							var paths = "";
							var isFirstPath = true;
							for(var path in result.FailingPaths){
								if(!isFirstPath){
									paths+=", "; //$NON-NLS-0$
								}
								isFirstPath = false;
								paths+=path;
							}
							if(!isFirstPath){
								display.Severity = "Error"; //$NON-NLS-0$
								display.Message+= ". " + i18nUtil.formatMessage(messages['Failing paths: ${0}'], paths); //$NON-NLS-0$
							}
						}
						display.Message += "</span>"; //$NON-NLS-0$
					} else if(result.error) {
						display.Severity = "Error"; //$NON-NLS-0$
						if(result.error.responseText && JSON.parse(result.error.responseText)){
							var resp = JSON.parse(result.error.responseText);
							display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
						}else{
							display.Message = result.error.message;
						}
						display.HTML = true;
						display.Message ="<span>" + display.Message +"</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					}

					progressService.setProgressResult(display);
					dispatchModelEventOn({type: "modelChanged", action: "merge", item: item}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function (error, ioArgs) {
					error = null;//hide warning
					var display = {};
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = true;
					display.Message = "<span>" + JSON.stringify(ioArgs.xhr.responseText).DetailedMessage  + "</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					dispatchModelEventOn({type: "modelChanged", action: "merge", item: item, failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : function(item) {
				if (item.Type === "RemoteTrackingBranch" && item.Id) //$NON-NLS-0$
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
				var msg = i18nUtil.formatMessage(messages["Merging ${0}"], item.Name);
				progress.progress(gitService.doMerge(item.HeadLocation, item.Name, true), msg).then(function(result){
					var display = [];

					if (result.Result === "FAST_FORWARD_SQUASHED" || result.Result === "ALREADY_UP_TO_DATE"){ //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = result.Result;
					} else if(result.Result){
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + result.Result +"</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					} else if(result.error) {
						display.Severity = "Error"; //$NON-NLS-0$
						if(result.error.responseText && JSON.parse(result.error.responseText)){
							var resp = JSON.parse(result.error.responseText);
							display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
						}else{
							display.Message = result.error.message;
						}
						display.HTML = true;
						display.Message ="<span>" + display.Message +"</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					}

					progressService.setProgressResult(display);
					dispatchModelEventOn({type: "modelChanged", action: "mergeSquash", item: item}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function (error, ioArgs) {
					error = null;//hide warning
					var display = [];
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = true;
					display.Message = "<span>" + JSON.stringify(ioArgs.xhr.responseText).DetailedMessage + ".</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					dispatchModelEventOn({type: "modelChanged", action: "mergeSquash", item: item, failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : function(item) {
				if (item.Type === "RemoteTrackingBranch" && item.Id) //$NON-NLS-0$
					return true;
				if (item.Type === "Branch" && !item.Current) //$NON-NLS-0$
					return true;
				if (item.Type === "Commit" && item.toRef && item.toRef.Type === "RemoteTrackingBranch") //$NON-NLS-1$ //$NON-NLS-0$
					return true;
				return false;
			}
		});
		commandService.addCommand(mergeSquashCommand);
		
		var rebaseCallback = function(data) {
			var d = new Deferred();
			var item = data.items;
			if (item.LocalBranch && item.Remote) {
				item = item.Remote;
			}
			var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doRebase(item.HeadLocation, item.Name, "BEGIN"), item.Name ? messages["Rebase on top of "] + item.Name: messages['Rebase']); //$NON-NLS-1$ //$NON-NLS-0$
			progressService.createProgressMonitor(deferred, 
			item.Name ? messages["Rebase on top of "] + item.Name: messages['Rebase']);
			deferred.then(
				function(jsonData){
					var display = {};
					switch (jsonData.Result) {
						case "OK": //$NON-NLS-0$
						case "FAST_FORWARD": //$NON-NLS-0$
						case "UP_TO_DATE": //$NON-NLS-0$
							display.Severity = "Ok"; //$NON-NLS-0$
							break;
						case "FAILED_WRONG_REPOSITORY_STATE": //$NON-NLS-0$
						case "FAILED_UNMERGED_PATHS": //$NON-NLS-0$
						case "FAILED_PENDING_CHANGES": //$NON-NLS-0$
						case "UNCOMMITTED_CHANGES": //$NON-NLS-0$
							display.Severity = "Error"; //$NON-NLS-0$
							break;
						case "STOPPED": //$NON-NLS-0$
						default:
							display.Severity = "Warning"; //$NON-NLS-0$
							break;
							
					}
					if (display.Severity === "Ok") { //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
						d.resolve(jsonData);
					} else {
						display.HTML = true;
						var msg = messages["Rebase" + jsonData.Result];
						display.Message = "<span>" + jsonData.Result + (msg ? msg : "") + "</span>"; //$NON-NLS-1$ //$NON-NLS-0$ 
						d.reject(jsonData);
					}
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
				}, function(error) {
					displayErrorOnStatus(error);
					d.reject();
				}
			);
			return d;
		};

		var rebaseCommand = new mCommands.Command({
			name : messages["Rebase"],
			tooltip: messages["RebaseCommitsMsg"] +
					"and applying each commit again to the updated active branch.", //$NON-NLS-0$
			id : "eclipse.orion.git.rebase", //$NON-NLS-0$
			imageClass: "git-sprite-rebase", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				rebaseCallback(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "rebase", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function() {
					dispatchModelEventOn({type: "modelChanged", action: "rebase", item: data.items, failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : function(item) {
				this.tooltip = i18nUtil.formatMessage(messages["RebaseTip"], item.Name);
				return (item.Type === "RemoteTrackingBranch" && item.Id) || (item.Type === "Branch" && !item.Current); //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(rebaseCommand);
		
		var pushOptions = {
			serviceRegistry : serviceRegistry,
			commandService : commandService,
			explorer : explorer,
			toolbarId : toolbarId,
		};
		var pushCallbackTags = mGitPushLogic(objects.mixin(pushOptions, {tags: true, force: false})).perform;
		var pushCallbackNoTags = mGitPushLogic(objects.mixin(pushOptions, {tags: false, force: false})).perform;
		var pushCallbackTagsForce = mGitPushLogic(objects.mixin(pushOptions, {tags: true, force: true})).perform;
		var pushCallbackNoTagsForce = mGitPushLogic(objects.mixin(pushOptions, {tags: false, force: true})).perform;
		var pushVisibleWhen = function(item) {
			if (item.LocalBranch && item.Remote) {
				if (item.Remote.Type !== "RemoteTrackingBranch") { //$NON-NLS-0$
					return false;
				}
				item = item.LocalBranch;
			}
			if (item.toRef)
				// for action in the git log
				return item.RepositoryPath === "" && item.toRef.Type === "Branch" && item.toRef.Current && item.toRef.RemoteLocation; //$NON-NLS-0$
			else
				// for action in the repo view
				return item.Type === "Branch" && item.Current && item.RemoteLocation; //$NON-NLS-0$
		};
		
		var syncCommand = new mCommands.Command({
			name : messages["Sync"],
			tooltip: messages["SyncTooltip"],
			extraClass: "primaryButton",  //$NON-NLS-0$
//			imageClass: "git-sprite-push", //$NON-NLS-0$
//			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.sync", //$NON-NLS-0$
			callback: function(data) {
				return fetchCallback(data).then(function() {
					return rebaseCallback(data).then(function() {
						var progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
						var item = data.items;
						progressService.progress(service.getLog(item.Remote.CommitLocation, item.LocalBranch.Name), messages['Getting outgoing commits']).then(function(resp) {
							var done = function() {
								dispatchModelEventOn({type: "modelChanged", action: "sync", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
							};
							if (resp.Children.length > 0) {
								return pushCallbackTags(data).then(done);
							} else {
								done();
							}
						});
					}, function() {
						dispatchModelEventOn({type: "modelChanged", action: "rebase", item: data.items, failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
					});
				});
			},
			visibleWhen: pushVisibleWhen
		});
		commandService.addCommand(syncCommand);
		
		var pushCommand = new mCommands.Command({
			name : messages["Push All"],
			tooltip: messages["PushCommitsTagsFrmLocal"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.push", //$NON-NLS-0$
			callback: function(data) {
				pushCallbackTags(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "push", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: pushVisibleWhen
		});
		commandService.addCommand(pushCommand);
		
		var pushBranchCommand = new mCommands.Command({
			name : messages["Push Branch"],
			tooltip: messages["PushCommitsWithoutTags"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushBranch", //$NON-NLS-0$
			callback:  function(data) {
				pushCallbackNoTags(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "push", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: pushVisibleWhen
		});
		commandService.addCommand(pushBranchCommand);

		var pushForceCommand = new mCommands.Command({
			name : messages["Force Push All"],
			tooltip: messages["PushCommitsTagsFrmLocalBr"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushForce", //$NON-NLS-0$
			callback: function(data) {
				pushCallbackTagsForce(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "push", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: pushVisibleWhen
		});
		commandService.addCommand(pushForceCommand);
		
		var pushBranchForceCommand = new mCommands.Command({
			name : messages["Force Push Branch"],
			tooltip: messages["PushCommitsWithoutTagsOverridingCurrentContent"],
			imageClass: "git-sprite-push", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.pushForceBranch", //$NON-NLS-0$
			callback: function(data) {
				pushCallbackNoTagsForce(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "push", item: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: pushVisibleWhen
		});
		commandService.addCommand(pushBranchForceCommand);

		var resetCallback = function(data, refId, mode) {
			var location = data.items.IndexLocation;
			if (!location) {
				var temp = data.items.parent;
				while (temp) {
					if (temp.repository) {
						location = temp.repository.IndexLocation;
					}
					temp = temp.parent;
				}
			}
				
			var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
			var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var msg = i18nUtil.formatMessage(messages["Resetting git index for ${0}"], refId);
			var deferred = progress.progress(service.resetIndex(location, refId, mode), msg);
			progressService.createProgressMonitor(deferred, messages["Resetting index..."]);
			deferred.then(
				function(){
					var display = {};
					display.Severity = "Info"; //$NON-NLS-0$
					display.HTML = false;
					display.Message = messages["OK"];
					dispatchModelEventOn({type: "modelChanged", action: "reset", mode: mode}); //$NON-NLS-1$ //$NON-NLS-0$
					progressService.setProgressResult(display);
				}, function (error){
					var display = {};
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = false;
					display.Message = error.message;
					progressService.setProgressResult(display);
				}
			);
		};

		var okCancelOptions = {getSubmitName: function(){return messages.OK;}, getCancelName: function(){return messages.Cancel;}};
		
		var resetParameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('soft', 'boolean', messages.KeepWorkDir)], objects.mixin({}, okCancelOptions)); //$NON-NLS-1$ //$NON-NLS-0$

		var resetIndexCommand = new mCommands.Command({
			name : messages['Reset'],
			tooltip: messages["ResetActiveBr"],
			id : "eclipse.orion.git.resetIndex", //$NON-NLS-0$
			imageClass: "git-sprite-reset", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			parameters: resetParameters,
			callback: function(data) {
				resetCallback(data, data.items.Name, data.parameters.valueFor("soft") ? "SOFT" : "HARD"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			},
			visibleWhen : function(item) {
				if (item.outgoing && item.top) {
					return false;
				}
				resetParameters.message = i18nUtil.formatMessage(messages.GitResetIndexConfirm, mGitUtil.shortenRefName(item), messages.KeepWorkDir);
				return (item.Type === "RemoteTrackingBranch"  && item.Id) || item.Type === "Branch" || item.Type === "Commit"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(resetIndexCommand);

		var undoParameters = new mCommandRegistry.ParametersDescription([],objects.mixin({}, okCancelOptions)); //$NON-NLS-1$ //$NON-NLS-0$

		var undoCommand = new mCommands.Command({
			name : messages['Undo'],
			tooltip: messages["UndoTooltip"],
			imageClass: "git-sprite-undo-commit", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id : "eclipse.orion.git.undoCommit", //$NON-NLS-0$
			parameters: undoParameters,
			callback: function(data) {
				resetCallback(data, "HEAD^", "SOFT"); //$NON-NLS-1$ //$NON-NLS-0$
			},
			visibleWhen : function(item) {
				undoParameters.message  = i18nUtil.formatMessage(messages.UndoConfirm, mGitUtil.shortenRefName(item));
				return item.Type === "Commit" && item.parent && item.parent.Type === "Outgoing" && item.parent.children && item.parent.children[0].Name === item.Name; //$NON-NLS-1$ //$NON-NLS-0$
			}
		});
		commandService.addCommand(undoCommand);
		
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
					var msg = i18nUtil.formatMessage(messages["Adding tag {$0}"], tagName);
					progress.progress(serviceRegistry.getService("orion.git.provider").doAddTag(commitLocation, tagName), msg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "addTag", commit: item, tag: tagName}); //$NON-NLS-1$ //$NON-NLS-0$
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
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.removeTag", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete tag ${0}?"], item.Name))) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var msg = i18nUtil.formatMessage(messages["Removing tag {$0}"], item.Name);
					progress.progress(serviceRegistry.getService("orion.git.provider").doRemoveTag(item.Location), msg).then(function() { //$NON-NLS-0$
						dispatchModelEventOn({type: "modelChanged", action: "removeTag", tag: item}); //$NON-NLS-1$ //$NON-NLS-0$
					}, displayErrorOnStatus);
				}
			},
			visibleWhen: function(item) {
				return item.Type === "Tag"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(removeTagCommand);
		
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
				var msg = i18nUtil.formatMessage(messages["CherryPicking"], item.Name);
				progress.progress(service.doCherryPick(headLocation, item.Name), msg).then(function(jsonData) {
					var display = {};
					if (jsonData.Result === "OK") { //$NON-NLS-0$
						// operation succeeded
						display.Severity = "Ok"; //$NON-NLS-0$
						if (jsonData.HeadUpdated) {
							display.HTML = false;
							display.Message = jsonData.Result;
						} else {
							display.HTML = true;
							display.Message = "<span>"+messages["Nothing changed."]+"</span>"; //$NON-NLS-1$ //$NON-NLS-0$
						}
					}
					// handle special cases
					else if (jsonData.Result === "CONFLICTING") { //$NON-NLS-0$
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + jsonData.Result + messages[". Some conflicts occurred"] +"</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					} else if (jsonData.Result === "FAILED") { //$NON-NLS-0$
						display.Severity = "Error"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + jsonData.Result;  //$NON-NLS-0$
						if(jsonData.FailingPaths){
							var paths = "";
							var isFirstPath = true;
							for(var path in jsonData.FailingPaths){
								if(!isFirstPath){
									paths+=", "; //$NON-NLS-0$
								}
								isFirstPath = false;
								paths +=path;
							}
							if(!isFirstPath){
								display.Message+= ". " + i18nUtil.formatMessage(messages['Failing paths: ${0}'], paths); //$NON-NLS-0$
							}
						}
						display.Message += "</span>"; //$NON-NLS-0$
					}
					// handle other cases
					else {
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					dispatchModelEventOn({type: "modelChanged", action: "cherrypick"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, displayErrorOnStatus);

			},
			visibleWhen : function(item) {
				if (item.outgoing) {
					return false;
				}
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(cherryPickCommand);
		
		var revertCommand = new mCommands.Command({
			name : messages["Revert"],
			tooltip: messages["Revert changes introduced by the commit into your active branch"],
			id : "eclipse.orion.git.revert", //$NON-NLS-0$
			imageClass: "git-sprite-revert", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var service = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var headLocation = item.Location.replace(item.Name, "HEAD"); //$NON-NLS-0$
				var msg = i18nUtil.formatMessage(messages["RevertingCommit"], item.Name);
				progress.progress(service.doRevert(headLocation, item.Name), msg).then(function(jsonData) {
					var display = [];
					if (jsonData.Result === "OK") { //$NON-NLS-0$
						// operation succeeded
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					// handle special cases
					else if (jsonData.Result === "FAILURE") { //$NON-NLS-0$
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = true;
						display.Message = "<span>" + jsonData.Result + messages[". Could not revert into active branch"] + "</span>"; //$NON-NLS-1$ //$NON-NLS-0$
					} 
					// handle other cases
					else {
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
					}
					serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					dispatchModelEventOn({type: "modelChanged", action: "revert"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, displayErrorOnStatus);

			},
			visibleWhen : function(item) {
				if (item.outgoing && item.top) {
					return false;
				}
				return item.Type === "Commit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(revertCommand);
	};
	

	exports.createGitClonesCommands = function(serviceRegistry, commandService, explorer, toolbarId, selectionTools, fileClient) {
		toolbarId = selectionTools = null;//make warning go away

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
				var key = data.parameters.valueFor("key"); //$NON-NLS-0$
				var value = data.parameters.valueFor("value"); //$NON-NLS-0$
				if (key && value){
					var msg = i18nUtil.formatMessage(messages["AddingConfig"], key, value);
					progress.progress(gitService.addCloneConfigurationProperty(item.ConfigLocation, key, value), msg).then(
						function(){
							dispatchModelEventOn({type: "modelChanged", action: "addConfig", key: key, value: value}); //$NON-NLS-1$ //$NON-NLS-0$
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
				val = items.Value[items.index || 0];
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
				var key = item.Key;
				var value = data.parameters.valueFor("value"); //$NON-NLS-0$
				if (value){ //$NON-NLS-0$
					var msg = i18nUtil.formatMessage(messages["EditingConfig"], key, value);
					item.Value[item.index || 0] = value;
					progress.progress(gitService.editCloneConfigurationProperty(item.Location, item.Value), msg).then(
						function(){
							dispatchModelEventOn({type: "modelChanged", action: "editConfig", key: key, value: value}); //$NON-NLS-1$ //$NON-NLS-0$
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
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.orion.git.deleteConfigEntryCommand", //$NON-NLS-0$
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var key = item.Key;
				var value = item.Value;
				if (confirm(i18nUtil.formatMessage(messages["Are you sure you want to delete ${0}?"], key))) {
					var msg = i18nUtil.formatMessage(messages["DeletingConfig"], key);
					var query = item.index !== undefined ? "?index=" + item.index : ""; //$NON-NLS-0$
					progress.progress(gitService.deleteCloneConfigurationProperty(item.Location + query), msg).then(
						function() {
							dispatchModelEventOn({type: "modelChanged", action: "deleteConfig", key: key, value: value}); //$NON-NLS-1$ //$NON-NLS-0$
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
						
						serviceRegistry.getService("orion.page.message").setProgressMessage(messages.ProjectSetup); //$NON-NLS-0$
						gitConfigPreference.getConfig().then(function(userInfo){
							var msg = i18nUtil.formatMessage(messages["AddClone"], name);
							var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, options.gitSshUsername, options.gitSshPassword, options.knownHosts,
									options.gitPrivateKey, options.gitPassphrase, userInfo, true), msg);
							deferred.then(function(jsonData) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(jsonData) {
									gitService.getGitClone(jsonData.Location).then(
										function(repoJson){
											var pDescContent = "";
											for(var k in item.projectDescription){
												pDescContent += k + "=" + item.projectDescription[k] + "\n"; //$NON-NLS-1$ //$NON-NLS-0$
											}

											fileClient.write(repoJson.Children[0].ContentLocation + '.git/.projectInfo', pDescContent).then( //$NON-NLS-0$
												function(){
													var editLocation = require.toUrl(editTemplate.expand({resource: repoJson.Children[0].ContentLocation}));
													window.location = editLocation;
												}
											);
										}
									);
								}, func, messages['Clone Git Repository']);
							}, function(jsonData) {
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {}, func, messages['Clone Git Repository']);
							});
						});
					});
				};
				
				if (item.url && item.projectDescription.name){
					var msg = i18nUtil.formatMessage(messages["AddClone"], item.projectDescription.name);
					serviceRegistry.getService("orion.page.message").setProgressMessage(msg); //$NON-NLS-0$
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
//												console.info("Folder project is used");
											}
										}
									);
								} else {
//									console.info("Folder project is used");
								}
								return;
							}
						}	
						
						cloneFunction(item.url, null, item.projectDescription.name);	
					});
				}
			},
			visibleWhen : function() {
				return true;
			}
		});
		commandService.addCommand(createGitProjectCommand);
		
		var cloneCallback = function(data) {
			var item = data.items;
			
			var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var cloneFunction = function(gitUrl, path, name) {
				
				item.GitUrl = gitUrl;
				exports.getDefaultSshOptions(serviceRegistry, item).then(function(options) {
					var func = arguments.callee;
					var gitConfigPreference = new GitConfigPreference(serviceRegistry);
					gitConfigPreference.getConfig().then(function(userInfo){
						var msg = i18nUtil.formatMessage(messages["AddClone"], name);
						var deferred = progress.progress(gitService.cloneGitRepository(name, gitUrl, path, explorer.defaultPath, options.gitSshUsername, options.gitSshPassword, options.knownHosts, //$NON-NLS-0$
								options.gitPrivateKey, options.gitPassphrase, userInfo), msg);
						serviceRegistry.getService("orion.page.message").createProgressMonitor(deferred, //$NON-NLS-0$
								messages["Cloning repository: "] + gitUrl);
						deferred.then(function(jsonData) {
							exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function() {
								dispatchModelEventOn({type: "modelChanged", action: "addClone", name: name, gitUrl: gitUrl}); //$NON-NLS-1$ //$NON-NLS-0$
							}, func, messages['Clone Git Repository']);
						}, function(jsonData) {
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
		};

		var cloneGitRepositoryCommand = new mCommands.Command({
			name : messages["Clone Repository"],
			tooltip : messages["Clone an existing Git repository to a folder"],
			id : "eclipse.cloneGitRepository", //$NON-NLS-0$
			parameters: cloneParameters,
			callback : cloneCallback,
			visibleWhen : function() {
				return true;
			}
		});
		commandService.addCommand(cloneGitRepositoryCommand);
		
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
							serviceRegistry.getService("orion.page.message").createProgressMonitor(deferred, messages["Initializing repository: "] + name); //$NON-NLS-0$
							deferred.then(function(jsonData){
								exports.handleProgressServiceResponse(jsonData, options, serviceRegistry, function(){
									dispatchModelEventOn({type: "modelChanged", action: "addClone", name: name, gitUrl: gitUrl}); //$NON-NLS-1$ //$NON-NLS-0$
								}, func, messages["Init Git Repository"]);
							}, function(jsonData) {
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
			visibleWhen : function() {
				return true;
			}
		});
		commandService.addCommand(initGitRepositoryCommand);

		var deleteCommand = new mCommands.Command({
			name: messages['Delete'], // "Delete Repository"
			tooltip: messages["Delete the repository"],
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.git.deleteClone", //$NON-NLS-0$
			visibleWhen: function(item) {
				return item.Type === "Clone"; //$NON-NLS-0$
			},
			callback: function(data) {
				var item = data.items;
				var gitService = serviceRegistry.getService("orion.git.provider"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				if(Array.isArray(item)){
					if(confirm(i18nUtil.formatMessage(messages["Are you sure you want do delete ${0} repositories?"], item.length))){
						var alreadyDeleted = 0;
						for(var i=0; i<item.length; i++){
							var msg = i18nUtil.formatMessage(messages["Removing repository ${0}"], item.Name);
							progress.progress(gitService.removeGitRepository(item[i].Location), msg).then(
									function(){
										alreadyDeleted++;
										if(alreadyDeleted >= item.length){
											dispatchModelEventOn({type: "modelChanged", action: "removeClone", items: item}); //$NON-NLS-1$ //$NON-NLS-0$
										}
									}, displayErrorOnStatus);
						}
					}
				} else {
					if(confirm(i18nUtil.formatMessage(messages['Are you sure you want to delete ${0}?'], item.Name)))
						var msg1 = i18nUtil.formatMessage(messages["Removing repository ${0}"], item.Name);
						progress.progress(gitService.removeGitRepository(item.Location), msg1).then(
							function(){
								dispatchModelEventOn({type: "modelChanged", action: "removeClone", items: [item]}); //$NON-NLS-1$ //$NON-NLS-0$
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
			preCallback: function(data) {
				return preCallback("applyPatch", data);
			},
			callback: function(data) {
				var item = forceSingleItem(data.items);
				var deferred = new Deferred();
				var dialog = new mApplyPatch.ApplyPatchDialog({
					title: messages['Apply Patch'],
					diffLocation: item.DiffLocation || item.repository.DiffLocation,
					deferred: deferred
				});
				dialog.show();
				var messageService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				deferred.then(function(result){
					var message;
					try{
						var jsonResult = JSON.parse(result);
						if(jsonResult.JsonData){
							var display = {};
							display.Severity = "Info"; //$NON-NLS-0$
							display.HTML = false;
							display.Message = messages["PatchApplied"];
							messageService.setProgressResult(display); //$NON-NLS-0$
							dispatchModelEventOn({type: "modelChanged", action: "applyPatch"});  //$NON-NLS-1$  //$NON-NLS-0$
							return;
						}
					} catch (e){
					}
					message = messages["PatchApplied"];
					messageService.setMessage(message);
				}, function(error){
					var jsonError = JSON.parse(error);
					var display = {};
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = false;
					display.Message = i18nUtil.formatMessage(messages["PatchFailed"], jsonError.DetailedMessage || jsonError.Message || "");
					messageService.setProgressResult(display); //$NON-NLS-0$
				});
			},
			visibleWhen : function(item) {
				return item.Type === "Clone" || item.repository; //$NON-NLS-0$
			}
		});
		commandService.addCommand(applyPatchCommand);
	};

	exports.createGitStatusCommands = function(serviceRegistry, commandService) {
		var commitOptions = {
			serviceRegistry : serviceRegistry,
			commandService : commandService,
		};
		
		var logic = mGitCommitLogic(commitOptions);
		var commitCallback = logic.perform;
		var displayErrorOnStatus = logic.displayErrorOnStatus;
		
		function forceArray(item) {
			if (!Array.isArray(item)) {
				item = [item];
			}
			return item;
		}
		
		var stageCommand = new mCommands.Command({
			name: messages['Stage'],
			tooltip: messages['Stage the change'],
			imageClass: "git-sprite-stage", //$NON-NLS-0$ //$NON-NLS-1$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$ //$NON-NLS-1$
			id: "eclipse.orion.git.stageCommand", //$NON-NLS-0$
			callback: function(data) {
				var items = forceArray(data.items);
				
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var deferred;
				if (items.length === 1){
					deferred = progress.progress(serviceRegistry.getService("orion.git.provider").stage(items[0].indexURI), messages["Staging changes"]); //$NON-NLS-0$ 
					progressService.createProgressMonitor(
						deferred,
						messages["Staging changes"]);
					deferred.then(
						function(){
							dispatchModelEventOn({type: "modelChanged", action: "stage", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
						}, displayErrorOnStatus
					);
				} else {
					var paths = [];
					for (var i = 0; i < items.length; i++) {
						paths[i] = items[i].name;
					}
					
					deferred = progress.progress(serviceRegistry.getService("orion.git.provider").stageMultipleFiles(data.userData.Clone.IndexLocation, paths),  messages["Staging changes"]); //$NON-NLS-0$
					progressService.createProgressMonitor(
						deferred, //$NON-NLS-0$
						messages["Staging changes"]);
					deferred.then( //$NON-NLS-0$
						function(){
							dispatchModelEventOn({type: "modelChanged", action: "stage", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
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
		
		var doUnstage = function(data) {
			var items = forceArray(data.items);
				
			var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var deferred;
			if (items.length === 1){				
				deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstage(items[0].indexURI, items[0].name), messages['Unstaging changes']); //$NON-NLS-0$
				progressService.createProgressMonitor(
					deferred, //$NON-NLS-0$
					messages['Staging changes']);
			} else {
				var paths = [];
				for (var i = 0; i < items.length; i++) {
					paths[i] = items[i].name;
				}
				
				deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstage(data.userData.Clone.IndexLocation, paths), messages['Unstaging changes']); //$NON-NLS-0$
				progressService.createProgressMonitor(
					deferred,
					messages['Staging changes']);
			}
			return deferred.then(function() {return items;});
		};
		
		var unstageCommand = new mCommands.Command({
			name: messages['Unstage'],
			tooltip: messages['Unstage the change'],
			imageClass: "git-sprite-unstage", //$NON-NLS-0$  //$NON-NLS-1$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$ //$NON-NLS-1$
			id: "eclipse.orion.git.unstageCommand", //$NON-NLS-0$
			callback: function(data) {
				doUnstage(data).then(
					function(items){
						dispatchModelEventOn({type: "modelChanged", action: "unstage", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
					}, displayErrorOnStatus
				);
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
		
		var commitCommand = new mCommands.Command({
			name: messages["Commit"], //$NON-NLS-0$
			tooltip: messages["Commit"], //$NON-NLS-0$
			id: "eclipse.orion.git.commitCommand", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("commit", data);
			},
			callback: function(data) {
				commitCallback(data).then(function() {
					dispatchModelEventOn({type: "modelChanged", action: "commit"}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen: function() {
				return true;
			}
		});	

		commandService.addCommand(commitCommand);

		var resetCommand = new mCommands.Command({
			name: messages['Reset'],
			tooltip: messages['ResetBranchDiscardChanges'],
			imageClass: "core-sprite-refresh", //$NON-NLS-0$
			id: "eclipse.orion.git.resetCommand", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("reset", data);
			},
			callback: function(data) {
				var item = data.items;
				
				var dialog = serviceRegistry.getService("orion.page.dialog"); //$NON-NLS-0$
				dialog.confirm(messages['ResetConfirm'],
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
							function(){
								dispatchModelEventOn({type: "modelChanged", action: "reset", mode: "HARD"}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							}, displayErrorOnStatus
						);		
					}
				);
			},
			
			visibleWhen: function(item) {
				if (item.Type !== "Status") { //$NON-NLS-0$
					return false;
				}
				return mGitUtil.hasStagedChanges(item) || mGitUtil.hasUnstagedChanges(item);
			}
		});

		commandService.addCommand(resetCommand);

		var checkoutCommand = new mCommands.Command({
			name: messages['Checkout'],
			tooltip: messages["CheckoutSelectedFiles"],
 			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.orion.git.checkoutCommand", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("checkoutFile", data);
			},
			callback: function(data) {				
				var items = forceArray(data.items);
				
				var dialog = serviceRegistry.getService("orion.page.dialog"); //$NON-NLS-0$
				dialog.confirm(messages["CheckoutConfirm"],
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
							function(){
								dispatchModelEventOn({type: "modelChanged", action: "checkoutFile", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
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
		
		var checkoutStagedCommand = new mCommands.Command({
			name: messages['Discard'],
			tooltip: messages["CheckoutSelectedFiles"],
 			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			id: "eclipse.orion.git.checkoutStagedCommand", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("checkoutFile", data);
			},
			callback: function(data) {				
				var dialog = serviceRegistry.getService("orion.page.dialog"); //$NON-NLS-0$
				dialog.confirm(messages["CheckoutConfirm"],
					function(doit) {
						if (!doit) {
							return;
						}
						
						doUnstage(data).then(function(items) {
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
							return deferred.then(
								function(){
									dispatchModelEventOn({type: "modelChanged", action: "checkoutFile", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
								}, displayErrorOnStatus
							);
						});				
					}
				);
			},
			visibleWhen: function() {
				return true;
			}
		});

		commandService.addCommand(checkoutStagedCommand);

		var ignoreCommand = new mCommands.Command({
			name: messages["Ignore"],
			tooltip: messages["AddFilesToGitignore"],
			imageClass: "git-sprite-checkout", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			id: "eclipse.orion.git.ignoreCommand", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("ignoreFile", data);
			},
			callback: function(data) {
				
				var items = data.items;
				var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				
				var paths = [];
				for (var i = 0; i < items.length; i++) {
					paths[i] = items[i].name;
				}
				
				var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").ignorePath(data.userData.Clone.IgnoreLocation, paths), messages["Writing .gitignore rules"]); //$NON-NLS-0$ //$NON-NLS-1$
				progressService.createProgressMonitor(
					deferred,
					messages["Writing .gitignore rules"]);
				
				return deferred.then(
					function(){
						
						deferred = progress.progress(serviceRegistry.getService("orion.git.provider").unstage(data.userData.Clone.IndexLocation, paths), messages['Resetting local changes']); //$NON-NLS-0$ //$NON-NLS-1$
						progressService.createProgressMonitor(
							deferred,
							messages['Resetting local changes']);
						
						return deferred.then(function(){
							dispatchModelEventOn({type: "modelChanged", action: "ignoreFile", items: items}); //$NON-NLS-1$ //$NON-NLS-0$
						}, displayErrorOnStatus);
						
					}, displayErrorOnStatus
				);
			},
			visibleWhen: function() {
				return true;
			}
		});
		
		commandService.addCommand(ignoreCommand);
		
		var showPatchCommand = new mCommands.Command({
			name: messages["Show Patch"],
			imageClass: "git-sprite-save-patch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
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
		
		var showPatchCallback = function(data) {
			var items = forceArray(data.items);
			var url, i;
			if (data.userData && data.userData.Clone && data.userData.Clone.DiffLocation) {
				url = data.userData.Clone.DiffLocation.replace("\/Default\/", "\/Cached\/") + "?parts=diff"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				for (i = 0; i < items.length; i++) {
					url += "&Path="; //$NON-NLS-0$
					url += items[i].name;
				}
			} else if (data.items && data.items.Diffs) {
				var baseLocation = data.items.Diffs[0].DiffLocation;
				var newPath = data.items.Diffs[0].NewPath;
				url = baseLocation.substring(0, baseLocation.length - newPath.length);
				url += "?parts=diff";  //$NON-NLS-0$
				for (i = 0; i < data.items.Diffs.length; i++) {
					url += "&Path="; //$NON-NLS-0$
					url += data.items.Diffs[i].NewPath;
				}
			}
			window.open(url);
		};
			
		var showStagedPatchCommand = new mCommands.Command({
			name: messages["Show Patch"],
			imageClass: "git-sprite-save-patch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			tooltip: messages["Show checked changes as a patch"],
			id: "eclipse.orion.git.showStagedPatchCommand", //$NON-NLS-0$
			callback: showPatchCallback,
			visibleWhen: function() {
				return true;
			}
		});
		commandService.addCommand(showStagedPatchCommand);
		
		var showCommitPatchCommand = new mCommands.Command({
			name: messages["Show Patch"],
			imageClass: "git-sprite-save-patch", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			tooltip: messages["ShowCommitPatchTip"],
			id: "eclipse.orion.git.showCommitPatchCommand", //$NON-NLS-0$
			callback: showPatchCallback,
			visibleWhen: function() {
				return true;
			}
		});
		commandService.addCommand(showCommitPatchCommand);
		
		// Rebase commands
		
		function _rebase(HeadLocation, action){
			var progressService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			
			var deferred = progress.progress(serviceRegistry.getService("orion.git.provider").doRebase(HeadLocation, "", action), messages["RebasingRepo"]); //$NON-NLS-1$ //$NON-NLS-0$ 
			progressService.createProgressMonitor(
				deferred,
				action);
			deferred.then(
				function(jsonData){
					var display = {};
					if (jsonData.Result === "OK" || jsonData.Result === "ABORTED" || jsonData.Result === "FAST_FORWARD" || jsonData.Result === "UP_TO_DATE") { //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						display.Severity = "Ok"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result;
						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					} else if (jsonData.Result === "STOPPED") { //$NON-NLS-0$
						display.Severity = "Warning"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result + messages['RepoConflict'];
 						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					} else if (jsonData.Result === "FAILED_UNMERGED_PATHS") { //$NON-NLS-0$
						display.Severity = "Error"; //$NON-NLS-0$
						display.HTML = false;
						display.Message = jsonData.Result + messages['RepoUnmergedPathResolveConflict'];
 						serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
					}
					dispatchModelEventOn({type: "modelChanged", action: "rebase", rebaseAction: action, result: jsonData.Result, failed: display.Severity !== "Ok"}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					
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
				return item.RepositoryState && item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
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
				return item.RepositoryState && item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
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
				return item.RepositoryState && item.RepositoryState.indexOf("REBASING") !== -1; //$NON-NLS-0$
			}
		});
		
		commandService.addCommand(rebaseAbortCommand);	
	};
	
	exports.createSharedCommands = function(serviceRegistry, commandService, explorer, toolbarId) {
		
		//used both as confirm and remotePrompter dialogs callback
		var refresh = function(data) { 
			if (data && data.handler.changedItem) {
				data.handler.changedItem();
			} else { 
				explorer.changedItem(); 
			}
		};
		
		var pushOptions = {
			serviceRegistry : serviceRegistry,
			commandService : commandService,
			explorer : explorer,
			toolbarId : toolbarId,
			tags : true,
			sshCredentialsDialogCloseCallback : refresh,
			sshSlideoutCloseCallback : refresh,
		};
		
		var commitOptions = {
			serviceRegistry : serviceRegistry,
			commandService : commandService,
		};
		
		var pushLogic = mGitPushLogic(pushOptions);
		var stashLogic = mGitStashLogic(pushOptions);
		var commitLogic = mGitCommitLogic(commitOptions);
		
		var commitCallback = commitLogic.perform;
		var displayErrorOnStatus = commitLogic.displayErrorOnStatus;
		var pushCallback = pushLogic.perform;
		
		
		var commitAndPushCommand = new mCommands.Command({
			name: messages["CommitPush"],
			tooltip: messages["Commits and pushes files to the default remote"],
			id: "eclipse.orion.git.commitAndPushCommand", //$NON-NLS-0$
			callback: function(data) {
				commitCallback(data).then(function() {
					serviceRegistry.getService("orion.git.provider").getGitBranch(data.items.Clone.BranchLocation).then( //$NON-NLS-0$
							function(resp) { 
								var branches = resp.Children;
								var currentBranch;
								for (var i = 0; i < branches.length; i++) {
									if (branches[i].Current) {
										currentBranch = branches[i];
										break;
									}
								}
								//Stripping additional info
								data.command = undefined;
								data.targetBranch = undefined;
								data.parameters = undefined;
								
								data.items.LocalBranch = currentBranch;
								data.items.Remote = currentBranch.RemoteLocation[0].Children[0];
								
								pushCallback(data).then(function() {
									refresh();
								});
							},
							function(err) {
								displayErrorOnStatus(err);
								refresh();
							});
				},
				function(err) {
					displayErrorOnStatus(err);
				});
			},
			visibleWhen: function() {
				return true;
			}
		});
		commandService.addCommand(commitAndPushCommand);
		
		var createStashCommand = new mCommands.Command({
			name : messages["Stash"],
			imageClass: "git-sprite-stash-changes", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			tooltip : messages["Stash all current changes away"],
			id : "eclipse.orion.git.createStash", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("stash", data);
			},
			callback : function(data){
				stashLogic.stashAll(data).then(function(){
					dispatchModelEventOn({type: "modelChanged", action: "stash"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function(error){
					displayErrorOnStatus(error);
				});
			},
			visibleWhen : function(){
				return true;
			}
		});
		commandService.addCommand(createStashCommand);
		
		var dropStashCommand = new mCommands.Command({
			name : messages["Drop"],
			imageClass: "core-sprite-trashcan", //$NON-NLS-0$
			tooltip : messages["Drop the commit from the stash list"],
			id : "eclipse.orion.git.dropStash", //$NON-NLS-0$
			callback : function(data){
				stashLogic.drop(data).then(function(){
					dispatchModelEventOn({type: "modelChanged", action: "dropStash", stash: data.items}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function(error){
					displayErrorOnStatus(error);
				});
			},
			visibleWhen : function(item){
				return item.Type === "StashCommit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(dropStashCommand);
		
		var applyStashCommand = new mCommands.Command({
			name : messages["Apply"],
			tooltip : messages["Apply the change introduced by the commit to your active branch"],
			id : "eclipse.orion.git.applyStash", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("applyStash", data);
			},
			callback : function(data){
				stashLogic.apply(data).then(function(){
					dispatchModelEventOn({type: "modelChanged", action: "applyStash"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function(error){
					displayErrorOnStatus(error);
					dispatchModelEventOn({type: "modelChanged", action: "applyStash", failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : function(item){
				return item.Type === "StashCommit"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(applyStashCommand);
		
		var popStashCommand = new mCommands.Command({
			name : messages["Pop Stash"],
			imageClass: "git-sprite-pop-changes", //$NON-NLS-0$
			spriteClass: "gitCommandSprite", //$NON-NLS-0$
			tooltip : messages["Apply the most recently stashed change to your active branch and drop it from the stashes"],
			id : "eclipse.orion.git.popStash", //$NON-NLS-0$
			preCallback: function(data) {
				return preCallback("popStash", data);
			},
			callback : function(data){
				stashLogic.pop(data).then(function(){
					dispatchModelEventOn({type: "modelChanged", action: "popStash"}); //$NON-NLS-1$ //$NON-NLS-0$
				}, function(error){
					displayErrorOnStatus(error);
					dispatchModelEventOn({type: "modelChanged", action: "popStash", failed: true}); //$NON-NLS-1$ //$NON-NLS-0$
				});
			},
			visibleWhen : function(item){
				return item.Type === "Clone"; //$NON-NLS-0$
			}
		});
		commandService.addCommand(popStashCommand);
	};

}());

return exports;	

});
