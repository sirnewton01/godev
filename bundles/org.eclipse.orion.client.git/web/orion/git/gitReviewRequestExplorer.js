/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document window*/

define(['i18n!git/nls/gitmessages', 'require', 'orion/section', 'orion/i18nUtil', 'orion/URITemplate', 'orion/PageUtil', 'orion/webui/littlelib', 'orion/globalCommands',
        'orion/git/gitCommands', 'orion/Deferred', 'orion/git/widgets/CommitTooltipDialog'], 
		function(messages, require, mSection, i18nUtil, URITemplate, PageUtil, lib, mGlobalCommands, mGitCommands, Deferred, mCommitTooltip) {
	var exports = {};
	
	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$

	exports.GitReviewRequestExplorer = (function() {

		/**
		 * Creates a new Git Review Request explorer.
		 * @class Git Review Request explorer
		 * @name orion.git.GitReviewRequestExplorer
		 * @param fileClient
		 * @param commandService
		 * @param serviceRegistry
		 * @param gitClient
		 */
		function GitReviewRequestExplorer(fileClient, commandService, serviceRegistry, gitClient){
			this.fileClient = fileClient;
			this.registry = serviceRegistry;
			this.gitClient = gitClient;
			this.commandService = commandService;
		}
		
		GitReviewRequestExplorer.prototype.changedItem = function(parent, children) {
			this.redisplay();
		};
		
		GitReviewRequestExplorer.prototype.redisplay = function(){
			var pageParams = PageUtil.matchResourceParameters();
			this.display(pageParams.resource);
		};
		
		GitReviewRequestExplorer.prototype.display = function(remote_sha){
			this.progressService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			this.loadingDeferred = new Deferred();
			this.progressService.showWhile(this.loadingDeferred, messages["Loading Contribution Review Request..."]); //$NON-NLS-0$
			var that = this;
			var params = [];
			var n = remote_sha.lastIndexOf("_");
			var url = remote_sha.substring(0,n);
			params[1] = remote_sha.substring(n+1);
			params[0] = this.sshCheck(url);
			var redundant = params[0].split(".");
			var index = redundant.length - 1;
			if(redundant[index] === "git"){
				var m = params[0].lastIndexOf(".");
				params[2] = params[0].substring(0,m);
			}
			else{
				params[2] = params[0] + ".git";
			}
			this.url = params[2];
			this.initTitleBar(params[1], params[0]);

			lib.empty(lib.node("welcomeDiv"));
			lib.empty(lib.node("cloneDiv"));
			lib.empty(lib.node("commitDiv"));
			lib.empty(lib.node("fetchDiv"));
			lib.empty(lib.node("remoteDiv"));
			
			 this.registry.getService("orion.page.progress").progress(this.fileClient.loadWorkspace(), "Loading default workspace info").then(
				function(workspace){
					that.defaultPath = workspace.ChildrenLocation;
					that.commandService.registerCommandContribution("fetch", "eclipse.orion.git.fetch", 200);
					that.commandService.registerCommandContribution("fetch", "eclipse.orion.git.fetchForce", 250);
					that.commandService.registerCommandContribution("add", "eclipse.addRemoteReviewRequestCommand", 300);
					var tableNode = lib.node("cloneDiv");
					
					var descriptionHeader = document.createElement("div");
					descriptionHeader.id = "descriptionHeader";
					descriptionHeader.className = "stretch";
					lib.node("welcomeDiv").appendChild(descriptionHeader);
					
					var div = document.createElement("div");
					div.style.paddingTop = "30px";
					lib.node("welcomeDiv").appendChild(div);
					
					var titleWrapper1 = new mSection.Section(lib.node("commitDiv"), {
						id: "open commit from existing repository", //$NON-NLS-0$
						title: messages["The commit can be found in the following repositories"], //$NON-NLS-0$
						slideout: true,
						canHide: true,
						preferenceService: that.registry.getService("orion.core.preference"),
						content: '<div id="commitNode" class="mainPadding"></div>' //$NON-NLS-0$
					});
					
					var titleWrapper2 = new mSection.Section(lib.node("fetchDiv"), {
						id: "fetch section", //$NON-NLS-0$
						title: messages["Try to update your repositories"], //$NON-NLS-0$
						slideout: true,
						canHide: true,
						preferenceService: that.registry.getService("orion.core.preference"),
						content: '<div id="fetchNode" class="mainPadding"></div>' //$NON-NLS-0$
					});
					
					var titleWrapper3 = new mSection.Section(tableNode, {
						id: "create new clone", //$NON-NLS-0$
						title: messages["Create new repository"], //$NON-NLS-0$
						content: '<div id="cloneNode" class="mainPadding"></div>' //$NON-NLS-0$
					});
					
					var titleWrapper4 = new mSection.Section(lib.node("remoteDiv"), {
						id: "add", //$NON-NLS-0$
						title: messages["Attach the remote to one of your existing repositories"], //$NON-NLS-0$
						slideout: true,
						canHide: true,
						hidden: true,
						content: '<div id="remoteNode" class="mainPadding"></div>' //$NON-NLS-0$
					});
					
					lib.node("commitDiv").style.display = " none ";
					lib.node("fetchDiv").style.display = " none ";
					lib.node("remoteDiv").style.display = " none ";
					lib.node("moreOptionsDiv").style.display = " none ";
					
					var text = i18nUtil.formatMessage(messages["You are reviewing contribution ${0} from ${1}"], params[1], params[2]);
					var text2 = messages["Unfortunately the commit can not be found in your workspace. To see it try one of the following: "];
					lib.node("moreOptionsDiv").textContent = messages["To review the commit you can also:"];
					
					var description = document.createElement("span");
					description.id = "welcome";
					description.style.padding = "5px";
					description.style.display = "block";
					description.textContent = text;
					lib.node("descriptionHeader").appendChild(description);
					
					var description2 = document.createElement("span");
					description2.id = "instruction";
					description2.style.display = "block";
					description2.textContent = text2;
					lib.node("descriptionHeader").appendChild(description2);
					
					that.renderCloneSection(params);
					
					var repositories = [];
					for(var i=0; i<workspace.Children.length; i++){
						if(workspace.Children[i].Git){
							repositories.push(workspace.Children[i]);
						}
					}
					
					if(repositories.length === 0){
						lib.node("instruction").style.display = " block ";
						return;
					}
					that.renderSections(repositories, params[0], params[2], params[1]);
				}
				
			);
		};
		
		GitReviewRequestExplorer.prototype.renderCloneSection = function(params){
			var that = this;
			that.progressService.setProgressMessage("");
			that.commandService.registerCommandContribution("clone", "eclipse.cloneGitRepositoryReviewReq", 200);
			that.commandService.renderCommands("clone", lib.node("cloneNode"), "clone", that, "button", params[0]);
			
			var mainDescription = document.createElement("span");
			mainDescription.style.padding = "0px";
			mainDescription.style.textAlign = "left";
			mainDescription.textContent = " using " + params[0];
			lib.node("cloneNode").appendChild(mainDescription);
		};
		
		GitReviewRequestExplorer.prototype.renderSections = function(repositories, url1, url2, sha){
			var that = this;

			var findCommitLocation = function (repositories, commitName, deferred, that) {
				if (deferred === null)
					deferred = new Deferred();
				if (repositories.length > 0) {
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").doGitLog( //$NON-NLS-0$
						"/gitapi/commit/" + sha + repositories[0].Location + "?page=1&pageSize=1", null, null, messages['Looking for the commit']), "Looking for commit " + sha).then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						function(resp){
							that.currentCommit = resp;
							deferred.resolve(resp.Children[0].Location);
						},
						function(error) {
							deferred.reject();
						}
					);
				} else {
					deferred.reject();
				}
				
				return deferred;
			};
			if (repositories.length > 0) {
				repositories[0].Content = {};
				var path = "root / "; //$NON-NLS-0$
				if (repositories[0].Parents !== null && repositories[0].Parents !== undefined){
					for (var i=repositories[0].Parents.length; i>0; i--){
						path += repositories[0].Parents[i-1].Name + " / "; //$NON-NLS-0$
					}
				}
				path += repositories[0].Name;
				repositories[0].Content.Path = path;
				
				that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitClone(repositories[0].Git.CloneLocation), "Getting repository properties " + repositories[0].Name).then(
					function(resp){
						resp.Children[0].Id = repositories[0].Id;
						that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitRemote("/gitapi/remote" + repositories[0].Location), "Getting remotes for " + repositories[0].Name).then(
							function(remotes){
								var foundRemote = false;
								for(var i=0;i<remotes.Children.length;i++){
									var url = that.sshCheck(remotes.Children[i].GitUrl);
									if(url === url1 || url === url2){
										foundRemote = true;
									}
								}
								if(foundRemote){
									findCommitLocation(repositories, sha, null, that).then(	
										function(commitLocation){
											var commitPageURL = require.toUrl(commitTemplate.expand({resource: commitLocation})); //$NON-NLS-1$ //$NON-NLS-0$
											var repoURL = require.toUrl(repoTemplate.expand({resource: resp.Children[0].Location})); //$NON-NLS-1$ //$NON-NLS-0$
											
											var sectionItem = document.createElement("div");
											sectionItem.className = "sectionTableItem lightTreeTableRow";
											lib.node("commitNode").appendChild(sectionItem);
											
											var div = document.createElement("div");
											div.className = "stretch";
											sectionItem.appendChild(div);
											
											var divCommands = document.createElement("div");
											divCommands.className = "sectionTableItemActions";
											sectionItem.appendChild(divCommands);

											var link2 = document.createElement("a");
											link2.href = repoURL;
											link2.textContent = repositories[0].Name;
											link2.style.display = "inline-block";
											link2.style.width = "150px";
											div.appendChild(link2);
											
											var span = document.createElement("span");
											span.textContent = messages["location: "] + repositories[0].Content.Path;
											div.appendChild(span);
											
											var link = document.createElement("a");
											link.href = commitPageURL;
											link.textContent = messages["Open Commit"];
											divCommands.appendChild(link);
											
											lib.node("commitDiv").style.display = " block ";
											lib.node("moreOptionsDiv").style.display = " block ";
											lib.node("instruction").style.display = " none ";
											
											new mCommitTooltip.CommitTooltipDialog({commit: that.currentCommit.Children[0], triggerNode: link});
										},
										function(){
											var index;
											for(var i=0;i<remotes.Children.length;i++){
												var url = that.sshCheck(remotes.Children[i].GitUrl);
												if(url === url1 || url === url2){
													index = i;
												}
											}
											var repoURL = require.toUrl(repoTemplate.expand({resource: resp.Children[0].Location})); //$NON-NLS-1$ //$NON-NLS-0$
											
											var sectionItem = document.createElement("div");
											sectionItem.className = "sectionTableItem lightTreeTableRow";
											lib.node("fetchNode").appendChild(sectionItem);
											
											var div = document.createElement("div");
											div.className = "stretch";
											sectionItem.appendChild(div);
											
											var divCommands = document.createElement("div");
											divCommands.className = "sectionTableItemActions";
											sectionItem.appendChild(divCommands);

											var link = document.createElement("a");
											link.href = repoURL;
											link.textContent = resp.Children[0].Name;
											link.style.display = "inline-block";
											link.style.width = "150px";
											div.appendChild(link);
											
											var span = document.createElement("span");
											span.textContent = messages["location: "] + repositories[0].Content.Path;
											div.appendChild(span);

											that.commandService.renderCommands("fetch", divCommands, remotes.Children[index], that, "tool");
											lib.node("fetchDiv").style.display = " block ";
										}
									);	
								} else {
									var repoURL = require.toUrl(repoTemplate.expand({resource: resp.Children[0].Location})); //$NON-NLS-1$ //$NON-NLS-0$
									
									var sectionItem = document.createElement("div");
									sectionItem.className = "sectionTableItem lightTreeTableRow";
									lib.node("remoteNode").appendChild(sectionItem);
									
									var div = document.createElement("div");
									div.className = "stretch";
									sectionItem.appendChild(div);
									
									var divCommands = document.createElement("div");
									divCommands.className = "sectionTableItemActions";
									sectionItem.appendChild(divCommands);
									
									var link = document.createElement("a");
									link.href = repoURL;
									link.textContent = resp.Children[0].Name;
									link.style.display = "inline-block";
									link.style.width = "150px";
									div.appendChild(link);
									
									var span = document.createElement("span");
									span.textContent = messages["location: "] + repositories[0].Content.Path;
									div.appendChild(span);

									that.commandService.renderCommands("add", divCommands, resp.Children[0], that, "tool",  url1);
									lib.node("remoteDiv").style.display = " block ";
									
									for(var i=0;i<remotes.Children.length;i++){											
										resp.Children[0].RemoteLocation = "/gitapi/remote" + repositories[0].Location;
										
										var remoteDiv = document.createElement("div");
										remoteDiv.style.padding = "6px 150px 0";
										remoteDiv.textContent = remotes.Children[i].Name + " : " + remotes.Children[i].GitUrl;
										div.appendChild(remoteDiv);
									}
								}
								
								that.renderSections(repositories.slice(1), url1, url2, sha);
							}
						);
					}
				);
			}
		};
		
		GitReviewRequestExplorer.prototype.initTitleBar = function(commit, url){
			var title = i18nUtil.formatMessage(messages["Contribution Review Request for ${0} on ${1}"], commit, url);
			
			var item = {};
			item.Name = title;
			
			mGlobalCommands.setPageTarget({
				task: "Contribution Review Request",
				breadcrumbTarget: item,
				serviceRegistry: this.registry, commandService: this.commandService
			});
		};
		
		GitReviewRequestExplorer.prototype.sshCheck = function(gitUrl) {
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
		
		return GitReviewRequestExplorer;
	}());
	
	return exports;
}); // end of define
