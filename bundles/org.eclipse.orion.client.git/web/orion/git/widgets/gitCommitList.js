/*******************************************************************************
 * @license Copyright (c) 2014 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document Image*/

define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/Deferred',
	'orion/explorers/explorer',
	'orion/URITemplate',
	'orion/git/util',
	'orion/i18nUtil',
	'orion/PageUtil',
	'orion/explorers/navigationUtils',
	'orion/git/widgets/CommitTooltipDialog',
	'orion/objects'
], function(require, messages, Deferred, mExplorer, URITemplate, util, i18nUtil, PageUtil, mNavUtils, mCommitTooltip, objects) {
	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$
	var logTemplate = new URITemplate("git/git-log.html#{,resource,params*}?page=1"); //$NON-NLS-0$
		
	function GitCommitListModel(commits) {
		this.commits = commits;
	}
	GitCommitListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitCommitListModel.prototype, /** @lends orion.git.GitCommitListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.commits);
		},
		getChildren: function(parentItem, onComplete){	
			if (parentItem instanceof Array && parentItem.length > 0) {
				onComplete(parentItem);
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			return item.Name;
		}
	});
	
	/**
	 * @class orion.git.GitCommitListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitCommitListExplorer(options) {
		var renderer = new GitCommitListRenderer({registry: options.serviceRegistry, commandService: options.commandRegistry, actionScopeId: options.actionScopeId, cachePrefix: "LogNavigator", checkbox: false}, this); //$NON-NLS-0$
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.section = options.section;
		this.root = options.root;
		this.handleError = options.handleError;
		this.location = options.location;
	}
	GitCommitListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitCommitListExplorer.prototype, /** @lends orion.git.GitCommitListExplorer.prototype */ {
		display: function() {
			if (this.root.Type === "CommitRoot") {
				return this.displayCommits();
			} else {
				return this.displayLog();
			}
		},
		displayCommits:function() {
			var that = this;
			var repository = this.root.repository;
			var commandService = this.commandService;
			var section = this.section;
			var handleError = this.handleError;
			var progress = section.createProgressMonitor();
			progress.begin(messages['Getting current branch']);
			return this.registry
				.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(repository.BranchLocation), "Getting current branch " + repository.Name).then( //$NON-NLS-0$
					function(resp) {
						var branches = resp.Children;
						var currentBranch;
						for (var i = 0; i < branches.length; i++) {
							if (branches[i].Current) {
								currentBranch = branches[i];
								break;
							}
						}

						if (!currentBranch){
							progress.done();
							return;
						}

						var tracksRemoteBranch = (currentBranch.RemoteLocation.length === 1 && currentBranch.RemoteLocation[0].Children.length === 1);

						section.setTitle(i18nUtil.formatMessage(messages["Commits for \"${0}\" branch"], currentBranch.Name));
						commandService.destroy(section.actionsNode.id);
						commandService.registerCommandContribution(section.actionsNode.id,
								"eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
						commandService.renderCommands(
							section.actionsNode.id,
							section.actionsNode.id,
							{	"ViewAllLink" : logTemplate.expand({resource: currentBranch.CommitLocation}),
								"ViewAllLabel" : messages['See Full Log'],
								"ViewAllTooltip" : messages["See the full log"]
							}, that, "button"); //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

						if (tracksRemoteBranch) {
							commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.fetch", 100); //$NON-NLS-0$
							commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.merge", 100); //$NON-NLS-0$
							commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.rebase", 100); //$NON-NLS-0$
							commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.resetIndex", 100); //$NON-NLS-0$
							
							currentBranch.RemoteLocation[0].Children[0].GitUrl = currentBranch.RemoteLocation[0].GitUrl
							
							commandService.renderCommands(section.actionsNode.id, section.actionsNode.id,
								currentBranch.RemoteLocation[0].Children[0], that, "button"); //$NON-NLS-0$
						}

						commandService.addCommandGroup(section.actionsNode.id, "eclipse.gitPushGroup", 1000, "Push", null, null, null, "Push", null, "eclipse.orion.git.push"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.push", 1100, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.pushBranch", 1200, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.pushToGerrit", 1200, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						
						commandService.renderCommands(section.actionsNode.id, section.actionsNode.id, currentBranch, that, "button"); //$NON-NLS-0$

						if (currentBranch.RemoteLocation[0] === null) {
							progress.done();
							return;
						}

						progress.worked(i18nUtil.formatMessage(messages['Getting commits for \"${0}\" branch'], currentBranch.Name));

						if (tracksRemoteBranch && currentBranch.RemoteLocation[0].Children[0].CommitLocation) {
							that.registry
								.getService("orion.page.progress")
								.progress(
									that.registry.getService("orion.git.provider").getLog(
										currentBranch.RemoteLocation[0].Children[0].CommitLocation + "?page=1&pageSize=20", "HEAD"),
									i18nUtil.formatMessage(messages['Getting commits for \"${0}\" branch'], currentBranch.Name)).then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									function(outgoingResp) {
										that.registry
											.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(currentBranch.CommitLocation + "?page=1&pageSize=20", currentBranch.RemoteLocation[0].Children[0].Id), messages['Getting outgoing commits']).then( //$NON-NLS-1$ //$NON-NLS-0$
											function(incomingResp) {
												progress.worked(messages['Rendering commits']);
												that.incomingCommits = incomingResp.Children;
												that.outgoingCommits = outgoingResp.Children;
												var commits = that.outgoingCommits.concat(that.incomingCommits);
												that.createTree(that.parentId, new GitCommitListModel(commits));
												progress.done();
											}, function(error) {
												progress.done(error);
											});
									}, function(error) {
										progress.done(error);
									});
						} else {
							that.registry.getService("orion.page.progress").progress(
								that.registry.getService("orion.git.provider").doGitLog(currentBranch.CommitLocation + "?page=1&pageSize=20"),
								i18nUtil.formatMessage(messages['Getting commits for \"${0}\" branch'], currentBranch.Name)).then( //$NON-NLS-1$ //$NON-NLS-0$
								function(outgoingResp) {
									progress.worked(messages['Rendering commits']);
									that.incomingCommits = [];
									that.outgoingCommits = outgoingResp.Children;
									var commits = that.outgoingCommits.concat(that.incomingCommits);
									that.createTree(that.parentId, new GitCommitListModel(commits));
									progress.done();
								}, function(error) {
									progress.done(error);
								}
							);
						}
					},
				handleError);
		},
		//
		getOutgoingIncomingChanges: function(resource){
			var that = this;
			var d = new Deferred();
			
			var progressService = this.registry.getService("orion.page.message");
			progressService.showWhile(d, messages["Getting git incoming changes..."]);
		
			var processRemoteTrackingBranch = function(remoteResource) {
				var newRefEncoded = encodeURIComponent(remoteResource.FullName);
				
				var pageParams = PageUtil.matchResourceParameters();
				
				that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(remoteResource.HeadLocation, newRefEncoded), "Getting log for " + remoteResource.Name).then(function(scopedCommitsJsonData) {
					that.incomingCommits = scopedCommitsJsonData.Children;
					that.outgoingCommits = [];
					
					var url = document.createElement("a");
					url.href = pageParams.resource;	
					
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").doGitLog(remoteResource.CommitLocation + url.search), "Getting incomming changes for " + remoteResource.Name).then(function(jsonData) { //$NON-NLS-0$
						remoteResource.Children = jsonData.Children;
						if(jsonData.NextLocation){
							var url = document.createElement("a");
							url.href = jsonData.NextLocation;
							remoteResource.NextLocation = remoteResource.Location + url.search; //$NON-NLS-0$
						}
						
						if(jsonData.PreviousLocation ){
							var url = document.createElement("a");
							url.href = jsonData.PreviousLocation;
							remoteResource.PreviousLocation  = remoteResource.Location + url.search; //$NON-NLS-0$
						}
						
						d.resolve(remoteResource);
					});
				});
			};
												
			if (resource.Type === "RemoteTrackingBranch"){ //$NON-NLS-0$
				processRemoteTrackingBranch(resource);
			} else if (resource.Type === "Commit" && resource.toRef.Type === "RemoteTrackingBranch"){ //$NON-NLS-1$ //$NON-NLS-0$
				processRemoteTrackingBranch(resource.toRef);
			} else if (resource.toRef){
				if (resource.toRef.RemoteLocation && resource.toRef.RemoteLocation.length===1 && resource.toRef.RemoteLocation[0].Children && resource.toRef.RemoteLocation[0].Children.length===1){
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitRemote(resource.toRef.RemoteLocation[0].Children[0].Location), "Getting log for " + resource.Name).then(
						function(remoteJsonData, secondArg) {
							that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(remoteJsonData.CommitLocation, "HEAD"), "Getting outgoing changes for " + resource.Name).then(function(scopedCommitsJsonData) { //$NON-NLS-0$
								that.incomingCommits = [];
								that.outgoingCommits = scopedCommitsJsonData.Children;
								d.resolve(resource);
							});
						}
					);
				} else {
					d.resolve(resource);
				}
			} else {
				d.resolve(resource);
			}
			
			return d;
		},
		loadResource: function(location){
			var that = this;
			var progressService = this.registry.getService("orion.page.message");
			var gitService = this.registry.getService("orion.git.provider"); //$NON-NLS-0$
			var loadingDeferred = this.registry.getService("orion.page.progress").progress(gitService.doGitLog(location), "Getting git log").then(
				function(resp) {
					var resource = resp;
					return that.registry.getService("orion.page.progress").progress(gitService.getGitClone(resource.CloneLocation), "Getting repository details for " + resource.Name).then(
						function(resp){
							var clone = resp.Children[0];	
							resource.Clone = clone;
							resource.ContentLocation = clone.ContentLocation;
							return that.registry.getService("orion.page.progress").progress(gitService.getGitBranch(clone.BranchLocation), "Getting default branch details for " + resource.Name).then(
								function(branches){
									for(var i=0; i<branches.Children.length; i++){
										var branch = branches.Children[i];
										
										if (branch.Current === true){
											resource.Clone.ActiveBranch = branch.CommitLocation;
											return resource;
										}
									}
								}
							);
						}
					);
				}
			);
			progressService.showWhile(loadingDeferred, messages['Loading git log...']);
			return loadingDeferred;
		},
		displayLog: function(){
			var that = this;
			var progressService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			
			var loadingDeferred = new Deferred();
			progressService.showWhile(loadingDeferred, messages['Loading...']);
			
			that.loadResource(this.location).then(
				function(resp){
					var resource = resp;
					
					that.getOutgoingIncomingChanges(resource).then(function(items){
						that.incomingCommits = that.outgoingCommits = [];
						that.createTree(that.parentId, new GitCommitListModel(items.Children));
						loadingDeferred.resolve({resource: resource, items: items});
					});
				},
				function(err){
					loadingDeferred.reject(err);
					that.handleError(err);
				}
			);
			return loadingDeferred;
		}
	});
	
	function GitCommitListRenderer(options, explorer) {
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitCommitListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitCommitListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var commit = item;
			
			switch(col_no){
			case 0:	
				var td = document.createElement("td"); //$NON-NLS-0$

				var sectionItem = document.createElement("div");
				sectionItem.className = "sectionTableItem";
				td.appendChild(sectionItem);

				var horizontalBox = document.createElement("div");
				horizontalBox.style.overflow = "hidden";
				sectionItem.appendChild(horizontalBox);
				
				var incomingCommits = this.explorer.incomingCommits || [];
				var outgoingCommits = this.explorer.outgoingCommits || [];
				
				var incomingCommit = false;
				var comm, i;
				for(i=0; i<incomingCommits.length; i++){
					comm = incomingCommits[i];
					if (commit.Name === comm.Name){
						incomingCommit = true;
						break;
					}
				}
					
				var outgoingCommit = false;
				if (!incomingCommit) {
					for(i=0; i<outgoingCommits.length; i++){
						comm = outgoingCommits[i];
						if (commit.Name === comm.Name){
							outgoingCommit = true;
							break;
						}
					}
				}
				
				if(!incomingCommit && !outgoingCommit){
					var direction = document.createElement("span");
					horizontalBox.appendChild(direction);
				} else {
					var imgSpriteName = (outgoingCommit ? "git-sprite-outgoing-commit" : "git-sprite-incoming-commit");
					var direction = document.createElement("span");
					direction.className = "sectionIcon gitImageSprite " + imgSpriteName;
					horizontalBox.appendChild(direction);
				}
				
				if (commit.AuthorImage) {
					var authorImage = document.createElement("div");
					authorImage.style["float"] = "left";
					var image = new Image();
					image.src = commit.AuthorImage;
					image.name = commit.AuthorName;
					image.className = "git-author-icon";
					authorImage.appendChild(image);
					horizontalBox.appendChild(authorImage);
				}
				
				var detailsView = document.createElement("div");
				detailsView.className = "stretch";
				horizontalBox.appendChild(detailsView);

				var titleLink = document.createElement("a");
				titleLink.className = "navlinkonpage";
				titleLink.href = require.toUrl(commitTemplate.expand({resource: commit.Location})); //$NON-NLS-0$
				titleLink.textContent = util.trimCommitMessage(commit.Message);
				detailsView.appendChild(titleLink);
				
				//Add the commit page link as the first grid of the row
				mNavUtils.addNavGrid(this.explorer.getNavDict(), item, titleLink);
				
				new mCommitTooltip.CommitTooltipDialog({commit: commit, triggerNode: titleLink});

				var d = document.createElement("div");
				detailsView.appendChild(d);

				var description = document.createElement("span");
				description.textContent = messages[" (SHA "] + commit.Name + messages[") by "] + commit.AuthorName + messages[" on "]
						+ new Date(commit.Time).toLocaleString();
				detailsView.appendChild(description);

				return td;
				
				break;
			case 1:
				var actionsColumn = this.getActionsColumn(item, tableRow, null, null, true);
				return actionsColumn;
				break;
			}
		},
		emptyCallback:function(bodyElement) {
			var tr = document.createElement("tr"); //$NON-NLS-0$
			var td = document.createElement("td"); //$NON-NLS-0$
			td.colSpan = 1;
			var noCommit = document.createElement("div"); //$NON-NLS-0$
			noCommit.classList.add("sectionTableItem"); //$NON-NLS-0$
			
			var title = document.createElement("div");
			title.textContent = messages["The branch is up to date."];
			noCommit.appendChild(title);
			
			var description = document.createElement("div");
			description.textContent = messages["You have no outgoing or incoming commits."];
			noCommit.appendChild(description);
			
			td.appendChild(noCommit);
			tr.appendChild(td);
			bodyElement.appendChild(tr);
		}
	});
	
	return {
		GitCommitListExplorer: GitCommitListExplorer,
		GitCommitListRenderer: GitCommitListRenderer
	};

});