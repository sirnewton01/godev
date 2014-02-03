/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document Image window*/
define(['i18n!git/nls/gitmessages', 'require', 'orion/commandRegistry', 'orion/section', 'orion/i18nUtil', 'orion/webui/littlelib', 'orion/git/util', 'orion/URITemplate', 'orion/PageUtil', 'orion/dynamicContent', 'orion/fileUtils', 
        'orion/globalCommands', 'orion/git/gitCommands', 'orion/Deferred', 'orion/git/widgets/CommitTooltipDialog'], 
		function(messages, require, mCommands, mSection, i18nUtil, lib, mGitUtil, URITemplate, PageUtil, mDynamicContent, mFileUtils, mGlobalCommands, mGitCommands, Deferred,
				mCommitTooltip) {
var exports = {};
	
var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
var repoPageTemplate = new URITemplate("git/git-repository.html#{,resource,params*}?page=1&pageSize=20"); //$NON-NLS-0$
var statusTemplate = new URITemplate(mGitUtil.statusUILocation + "#{,resource,params*}"); //$NON-NLS-0$
var logTemplate = new URITemplate("git/git-log.html#{,resource,params*}?page=1"); //$NON-NLS-0$
var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$

exports.GitRepositoryExplorer = (function() {
	
	/**
	 * Creates a new Git repository explorer.
	 * @class Git repository explorer
	 * @name orion.git.GitRepositoryExplorer
	 * @param registry
	 * @param commandService
	 * @param linkService
	 * @param selection
	 * @param parentId
	 * @param actionScopeId
	 */
	function GitRepositoryExplorer(registry, commandService, linkService, selection, parentId, pageNavId, actionScopeId){
		this.parentId = parentId;
		this.registry = registry;
		this.linkService = linkService;
		this.commandService = commandService;
		this.selection = selection;
		this.parentId = parentId;
		this.pageNavId = pageNavId;
		this.actionScopeId = actionScopeId;
		this.checkbox = false;
	}
	
	GitRepositoryExplorer.prototype.handleError = function(error) {
		var display = {};
		display.Severity = "Error"; //$NON-NLS-0$
		display.HTML = false;
		try {
			var resp = JSON.parse(error.responseText);
			display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
		} catch (Exception) {
			display.Message = error.DetailedMessage || error.Message || error.message;
		}
		this.registry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
		
		if (error.status === 404) {
			this.initTitleBar();
			this.displayRepositories();
		}
	};
	
	GitRepositoryExplorer.prototype.setDefaultPath = function(defaultPath){
		this.defaultPath = defaultPath;
	};
	
	GitRepositoryExplorer.prototype.changedItem = function(parent, children) {
		// An item changed so we do not need to process any URLs
		this.redisplay(false);
	};
	
	GitRepositoryExplorer.prototype.redisplay = function(processURLs){
		// make sure to have this flag
		if(processURLs === undefined){
			processURLs = true;
		}
	
		var pageParams = PageUtil.matchResourceParameters();
		if (pageParams.resource) {
			this.displayRepository(pageParams.resource);
		} else {
			var path = this.defaultPath;
			var relativePath = mFileUtils.makeRelative(path);
			
			//NOTE: require.toURL needs special logic here to handle "gitapi/clone"
			var gitapiCloneUrl = require.toUrl("gitapi/clone._"); //$NON-NLS-0$
			gitapiCloneUrl = gitapiCloneUrl.substring(0, gitapiCloneUrl.length-2);
			
			this.displayRepositories2(relativePath[0] === "/" ? gitapiCloneUrl + relativePath : gitapiCloneUrl + "/" + relativePath, processURLs); //$NON-NLS-1$ //$NON-NLS-0$
		};
	};
	
	GitRepositoryExplorer.prototype.displayRepositories2 = function(location, processURLs){
		var that = this;
		this.loadingDeferred = new Deferred();
		if(processURLs){
			this.loadingDeferred.then(function(){
				that.commandService.processURL(window.location.href);
			});
		}
		
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitClone(location), "Getting git repository details").then( //$NON-NLS-0$
			function(resp){
				if (resp.Children.length === 0) {
					that.initTitleBar({});
					that.displayRepositories([], "full"); //$NON-NLS-0$
				} else if (resp.Children[0].Type === "Clone"){ //$NON-NLS-0$
					var repositories = resp.Children;
					
					that.initTitleBar(repositories);
					that.displayRepositories(repositories, "full", true); //$NON-NLS-0$
				}
				
				//that.commandService.processURL(window.location.href);
			}, function(error){
				that.handleError(error);
			}
		);
	};
	
	GitRepositoryExplorer.prototype.displayRepository = function(location){
		var that = this;
		this.loadingDeferred = new Deferred();
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitClone(location), "Getting git repository details").then( //$NON-NLS-0$
			function(resp){
				
				// render navigation commands
				var pageNav = lib.node(that.pageNavId);
				if(pageNav){
					lib.empty(pageNav);
					that.commandService.renderCommands(that.pageNavId, pageNav, resp, that, "button");
				}
				if (!resp.Children) {
					return;
				}
				
				if (resp.Children.length === 0) {
					that.initTitleBar({});
					that.displayRepositories([], "full"); //$NON-NLS-0$
				} else if (resp.Children.length && resp.Children.length === 1 && resp.Children[0].Type === "Clone") { //$NON-NLS-0$
					var repositories = resp.Children;
					
					that.initTitleBar(repositories[0]);
					that.displayRepositories(repositories);
					that.displayStatus(repositories[0]);
					that.displayCommits(repositories[0]);
					that.displayBranches(repositories[0]);
					that.displayTags(repositories[0]);
					that.displayRemotes(repositories[0]);
					that.displayConfig(repositories[0]);
				} else if (resp.Children[0].Type === "Clone"){ //$NON-NLS-0$
					var repositories = resp.Children;
					
					that.initTitleBar(repositories);
					that.displayRepositories(repositories, "full", true); //$NON-NLS-0$
				} else if (resp.Children[0].Type === "Branch"){ //$NON-NLS-0$
					var branches = resp.Children;
					
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitClone(branches[0].CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
						function(resp){
							var repositories = resp.Children;
							
							that.initTitleBar(repositories[0], "Branches"); //$NON-NLS-0$
							
							that.displayRepositories(repositories, "mini", true); //$NON-NLS-0$
							that.displayBranches(repositories[0], "full"); //$NON-NLS-0$
							that.displayRemoteBranches(repositories[0], "full"); //$NON-NLS-0$
						}, function (error) {
							that.handleError(error);
						}
					);
				} else if (resp.Children[0].Type === "Tag"){ //$NON-NLS-0$
					var tags = resp.Children;
					
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitClone(tags[0].CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
						function(resp){
							var repositories = resp.Children;
							
							that.initTitleBar(repositories[0], messages['Tags']);
							
							that.displayRepositories(repositories, "mini", true); //$NON-NLS-0$
							that.displayTags(repositories[0], "full"); //$NON-NLS-0$
						}, function (error) {
							that.handleError(error);
						}
					);
				} else if (resp.Children[0].Type === "Config"){ //$NON-NLS-0$
					that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitClone(resp.CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
						function(resp){
							var repositories = resp.Children;
							
							that.initTitleBar(repositories[0], messages["Configuration"]);
							
							that.displayRepositories(repositories, "mini", true); //$NON-NLS-0$
							that.displayConfig(repositories[0], "full"); //$NON-NLS-0$
						}, function (error) {
							that.handleError(error);
						}
					);
				}
			}, function(error){
				that.handleError(error);
			}
		);
	};
	
	var updatePageActions = function(registry, commandService, toolbarId, scopeId, item){
		var toolbar = lib.node(toolbarId);
		if (toolbar) {
			commandService.destroy(toolbar);
		} else {
			throw "could not find toolbar " + toolbarId; //$NON-NLS-0$
		}
		commandService.renderCommands(scopeId, toolbar, item, null, "button");  //$NON-NLS-0$
	};
	
	GitRepositoryExplorer.prototype.initTitleBar = function(resource, sectionName){
		var that = this;
		var item = {};
		var task = messages.Repo;
		var scopeId = "repoPageActions";

		var repository;
		if (resource && resource.Type === "Clone" && sectionName){ //$NON-NLS-0$
			repository = resource;
			item.Name = sectionName;
			item.Parents = [];
			item.Parents[0] = {};
			item.Parents[0].Name = repository.Name;
			item.Parents[0].Location = repository.Location;
			item.Parents[0].ChildrenLocation = repository.Location;
			item.Parents[1] = {};
			item.Parents[1].Name = messages.Repo;
			task = sectionName;
		} else if (resource && resource.Type === "Clone") { //$NON-NLS-0$
			repository = resource;
			item.Name = repository.Name;
			item.Parents = [];
			item.Parents[0] = {};
			item.Parents[0].Name = messages.Repo;
		} else {
			item.Name = messages.Repo;
			scopeId = "reposPageActions";
		}
		
		updatePageActions(that.registry, that.commandService, "pageActions", scopeId, repository || {}); //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.setPageTarget({task: messages.Repo, target: repository, breadcrumbTarget: item,
			makeBreadcrumbLink: function(seg, location) {
				seg.href = require.toUrl(repoTemplate.expand({resource: location || ""}));
			},
			serviceRegistry: this.registry, commandService: this.commandService}); 
	};
	
	// Git repo
	
	GitRepositoryExplorer.prototype.decorateRepository = function(repository, mode, deferred){
		var that = this;
		deferred = deferred || new Deferred();
		
		if(!mode){
			mode = "full";
		}
		
		
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.core.file").loadWorkspace(repository.ContentLocation + "?parts=meta"), "Loading workspace info").then( //$NON-NLS-1$ //$NON-NLS-0$
				function(resp){
					try{
						repository.Content = {};
						
						var path = "root / "; //$NON-NLS-0$
						if (resp.Parents !== null)
							for (var i=resp.Parents.length; i>0; i--){
								path += resp.Parents[i-1].Name + " / "; //$NON-NLS-0$
							}
							
						path += resp.Name;
						repository.Content.Path = path;
						
						if (mode !== "full"){ //$NON-NLS-0$
							deferred.resolve();
							return;
						}
						
						that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitStatus(repository.StatusLocation), "Getting status for " + repository.Name).then( //$NON-NLS-0$
							function(resp){
								try{
									repository.Status = resp;
		
									that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitBranch(repository.BranchLocation), "Getting branches for " + repository.Name).then( //$NON-NLS-0$
										function(resp){
											try{
												var branches = resp.Children || [];
												var currentBranch;
												for (var i=0; i<branches.length; i++){
													if (branches[i].Current){
														currentBranch = branches[i];
														break;
													}
												}
												
												if (!currentBranch || currentBranch.RemoteLocation[0] === null){
													deferred.resolve();
													return;
												}
												
												var tracksRemoteBranch = (currentBranch.RemoteLocation.length === 1 && currentBranch.RemoteLocation[0].Children.length === 1);
												
												if (tracksRemoteBranch && currentBranch.RemoteLocation[0].Children[0].CommitLocation){
													that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(currentBranch.RemoteLocation[0].Children[0].CommitLocation + "?page=1&pageSize=20", "HEAD"), "Getting incomming commits " + repository.Name).then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
														function(resp){
															if(resp.Children === undefined) { repository.CommitsToPush = 0; }
															else { repository.CommitsToPush = resp.Children.length; }
															deferred.resolve();
															return;
														}, function(resp){
															deferred.reject();
															return;
														}
													);
												} else {
													that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").doGitLog(currentBranch.CommitLocation + "?page=1&pageSize=20"), "Getting outgoing commits " + repository.Name).then(  //$NON-NLS-1$ //$NON-NLS-0$
														function(resp){	
															if(resp.Children === undefined) { repository.CommitsToPush = 0; }
															else { repository.CommitsToPush = resp.Children.length; }
															deferred.resolve();
															return;
														}, function(resp){
															deferred.reject();
															return;
														}
													);	
												}
											}catch(e){
												deferred.reject();
											}
										}, function(resp){
											deferred.reject();
											return;
										}
									);
								}catch(e){
									deferred.reject();
								}
							}, function(resp){
								deferred.reject();
								return;
							}	
						);
					}catch(e){
						deferred.reject(e);
					}
				}, function(resp){
					deferred.reject();
					return;
				 }
			);
		
		return deferred;
	};
	
	/**
	 * @name _repositorySorter
	 * @description Simple function to sort repositories by name
	 * @function
	 * @private
	 * @memberof GitRepositoryExplorer.prototype
	 * @param {Object} The repository to compare to
	 * @param {Object} The repository to compare
	 * @since 5.0
	 */
	GitRepositoryExplorer.prototype._repositorySorter = function(repo1, repo2) {
		return repo1.Name.localeCompare(repo2.Name);
	};
	
	GitRepositoryExplorer.prototype.displayRepositories = function(repositories, mode, links){
		var that = this;
		var progressService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
		if(repositories) {
			repositories.sort(that._repositorySorter);
		}
		var dynamicContentModel = new mDynamicContent.DynamicContentModel(repositories,
			function(i){
				return that.decorateRepository.bind(that)(repositories[i]);
			}
		);
		
		var dcExplorer = new mDynamicContent.DynamicContentExplorer(dynamicContentModel);
		var repositoryRenderer = {
		
			initialRender : function(){
				var tableNode = lib.node('table');	 //$NON-NLS-0$
				if (!tableNode) {
					return;
				}
				lib.empty(tableNode);
				
				if(!repositories || repositories.length === 0){
					var titleWrapper = new mSection.Section(tableNode, {
						id: "repositorySection", //$NON-NLS-0$
						title: "Repository",
						iconClass: ["gitImageSprite", "git-sprite-repository"] //$NON-NLS-1$ //$NON-NLS-0$
					});
					titleWrapper.setTitle(mode === "full" ? messages["No Repositories"] : messages["Repository Not Found"]); //$NON-NLS-0$
					that.loadingDeferred.resolve();
					return;
				}
				
				var contentParent = document.createElement("div");
				tableNode.appendChild(contentParent);
				
				contentParent.innerHTML = '<div id="repositoryNode" class="mainPadding"></div>'; //$NON-NLS-0$
			},
			
			cleanupRender : function(){
				that.loadingDeferred.resolve();
			},
			
			renderBeforeItemPopulation : function(i){
				// Title area
				var repoSection = document.createElement("div");
				repoSection.className = "sectionWrapper toolComposite";
				lib.node("repositoryNode").appendChild(repoSection);
				
				var sectionAnchor = document.createElement("div");
				sectionAnchor.className = "sectionAnchor sectionTitle layoutLeft";
				repoSection.appendChild(sectionAnchor);
				
				var title = document.createElement("span");
				sectionAnchor.appendChild(title);
				
				if (links){
					var link = document.createElement("a");
					link.href = require.toUrl(repoTemplate.expand({resource: repositories[i].Location}));
					link.appendChild(document.createTextNode(repositories[i].Name));
					title.appendChild(link);
				} else { 
					title.appendChild(document.createTextNode(repositories[i].Name)); 
				}
				
				//create indicator
				this.explorer.progressIndicators[i] = new this.explorer.progressIndicator(i, title);
					
				if (mode === "full"){
					var actionsArea = document.createElement("div");
					actionsArea.className = "layoutRight sectionActions";
					actionsArea.id = "repositoryActionsArea";
					repoSection.appendChild(actionsArea);
					that.commandService.renderCommands(that.actionScopeId, actionsArea, repositories[i], that, "tool"); //$NON-NLS-0$
				}
				
				// Content area
				var repoSectionContent = document.createElement("div");
				repoSectionContent.className = "sectionTable sectionTableItem";
				lib.node("repositoryNode").appendChild(repoSectionContent);
										
				var detailsView = document.createElement("div");
				detailsView.className = "stretch";
				repoSectionContent.appendChild(detailsView);
				
				var div = document.createElement("div");
				detailsView.appendChild(div);
				
				var span = document.createElement("span");
				span.textContent = (repositories[i].GitUrl !== null ? messages["git url:"] + repositories[i].GitUrl : messages["(no remote)"]);
				detailsView.appendChild(span);
				
				div = document.createElement("div");
				detailsView.appendChild(div);
				
				span = document.createElement("span");
				span.id = "location"+i;
				detailsView.appendChild(span);

				if (mode === "full"){
					div = document.createElement("div");
					div.style.paddingTop = "10px";
					detailsView.appendChild(div);
					
					span = document.createElement("span");
					span.id = "repositoryState"+i;
					span.style.paddingLeft = "10px";
					detailsView.appendChild(span);
					
					span = document.createElement("span");
					span.id = "workspaceState"+i;
					span.style.paddingLeft = "10px";
					detailsView.appendChild(span);
					
					span = document.createElement("span");
					span.id = "commitsState"+i;
					span.style.paddingLeft = "10px";
					detailsView.appendChild(span);
				}
			},
			
			renderAfterItemPopulation : function(i){
				that.renderRepository(repositories[i], i, repositories.length, mode, links);
			}
		};
		
		dcExplorer.use(repositoryRenderer);
		dcExplorer.render();
	};
	
	GitRepositoryExplorer.prototype.renderRepository = function(repository, index, length, mode, links){
		var locationnode = lib.node("location"+index);
		if (!locationnode) {
			return;
		}
		locationnode.textContent = messages["location: "] + repository.Content.Path;
		var status = repository.Status;
		
		if (mode === "full"){ //$NON-NLS-0$
			var unstaged = status.Untracked.length + status.Conflicting.length + status.Modified.length + status.Missing.length;
			var staged = status.Changed.length + status.Added.length + status.Removed.length;
			
			var workspaceState = ((unstaged > 0 || staged > 0) 
				? i18nUtil.formatMessage(messages["${0} file(s) to stage and ${1} file(s) to commit."], unstaged, staged)
				: messages["Nothing to commit."]);
			
			
			if (status.RepositoryState !== "SAFE"){
				lib.node("repositoryState"+index).textContent = messages["Rebase in progress!"];
			}
			
			lib.node("workspaceState"+index).textContent = workspaceState;
			
			var commitsState = repository.CommitsToPush;
			lib.node("commitsState"+index).textContent = ((commitsState > 0) ? commitsState + messages[" commit(s) to push."] : messages["Nothing to push."]);	
		}
	};
	
	// Git status
	
	GitRepositoryExplorer.prototype.displayStatus = function(repository){
		
		var statusLocation = repository.StatusLocation;
		
		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$

		var titleWrapper = new mSection.Section(tableNode, {
			id: "workingDirectorySection", //$NON-NLS-0$
			title: messages["Working Directory"], //$NON-NLS-0$
			content: '<div id="workingDirectoryNode" class="mainPadding"></div>' //$NON-NLS-0$
		});
		
		that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
		that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, 
			{"ViewAllLink":statusTemplate.expand({resource: repository.StatusLocation}), "ViewAllLabel": messages["See Full Status"], "ViewAllTooltip": messages["See the status"]}, that, "button"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		var progress = titleWrapper.createProgressMonitor();
		progress.begin("Loading status"); //$NON-NLS-0$
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(statusLocation), "Loading status").then( //$NON-NLS-0$
			function(resp){
				var status = resp;
				progress.done();
				that.renderStatus(repository, status);
			}, function(error){
				progress.done(error);
			}
		);
	};
		
	GitRepositoryExplorer.prototype.renderStatus = function(repository, status){
		var workingDirectoryNode = lib.node("workingDirectoryNode");
		if (workingDirectoryNode) {
			lib.empty(workingDirectoryNode);
		}
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem";
		workingDirectoryNode.appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);
		
		var unstaged = status.Untracked.length + status.Conflicting.length + status.Modified.length + status.Missing.length;
		var staged = status.Changed.length + status.Added.length + status.Removed.length;
		var workspaceState = messages["You have no changes to commit."];
		
		if (unstaged > 0 || staged > 0)
			workspaceState = messages["You have changes to commit in your workspace!"];

		var detailsView = document.createElement("div");
		detailsView.style.overflow = "vbox stretch details-view";
		horizontalBox.appendChild(detailsView);
		
		if (status.RepositoryState !== "SAFE"){
			var repositoryState = document.createElement("div");
			repositoryState.textContent = messages["Rebase in progress!"];
			detailsView.appendChild(repositoryState);
		}
		
		var title = document.createElement("div");
		title.textContent = workspaceState;
		detailsView.appendChild(title);

		var description = document.createElement("div");
		description.textContent = i18nUtil.formatMessage(messages['${0} file(s) to stage and ${1} file(s) to commit.'], unstaged, staged);
		detailsView.appendChild(description);
	};
	
	// Git branches
	
	GitRepositoryExplorer.prototype.decorateBranches = function(branches, deferred){
		var that = this;
		deferred = deferred || new Deferred();
		
		if (branches.length > 0) {
			this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").doGitLog(branches[0].CommitLocation + "?page=1&pageSize=1"), "Getting branch last commit " + branches[0].Name).then( //$NON-NLS-1$ //$NON-NLS-0$
				function(resp){
					branches[0].Commit = resp.Children[0];
					that.decorateBranches(branches.slice(1), deferred);
				}
			);
		} else {
			deferred.resolve();
		}
		
		return deferred;
	};
		
	GitRepositoryExplorer.prototype.displayBranches = function(repository, mode){
		
		var branchLocation = repository.BranchLocation;

		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "branchSection", //$NON-NLS-0$
			title: messages['Branches'],
			iconClass: ["gitImageSprite", "git-sprite-branch"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="branchNode"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.registry.getService("orion.core.preference") //$NON-NLS-0$
		});

		var progress = titleWrapper.createProgressMonitor();
		progress.begin("Getting branches"); //$NON-NLS-0$
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(branchLocation + (mode === "full" ? "?commits=1" : "?commits=1&page=1&pageSize=5")), "Getting branches " + repository.Name).then( //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			function(resp){
				var branches = resp.Children;
				progress.done();
				
				that.commandService.destroy(titleWrapper.actionsNode.id);
				
				if (mode !== "full" && branches.length !== 0){ //$NON-NLS-0$
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
					that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, 
						{"ViewAllLink":repoTemplate.expand({resource: branchLocation}), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all local and remote tracking branches"]}, that, "button"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
				
				that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.addBranch", 200); //$NON-NLS-0$
				that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, repository, that, "button"); //$NON-NLS-0$
				
				var branchesContainer = document.createElement("div");
				branchesContainer.className = "mainPadding";

				for(var i=0; i<branches.length;i++){
					branches[i].ParentLocation = branchLocation;
					that.renderBranch(branches[i], i, branchesContainer);
				}
				
				lib.empty(lib.node("branchNode"));
				lib.node("branchNode").appendChild(branchesContainer);
			}, function(error){
				progress.done();
				that.handleError(error);
			}
		);
	};
		
	GitRepositoryExplorer.prototype.renderBranch = function(branch, index, container){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem lightTreeTableRow";
		container.appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);	

		if (branch.Current){
			var span = document.createElement("span");
			span.className = "sectionIcon gitImageSprite git-sprite-branch-active";
			horizontalBox.appendChild(span);
		}
		
		var detailsView = document.createElement("div");
		detailsView.className = "stretch";
		horizontalBox.appendChild(detailsView);

		var title = document.createElement("span");
		title.className = (branch.Current ? "activeBranch" : "");
		title.textContent = branch.Name;
		detailsView.appendChild(title);

		var commit = branch.Commit.Children[0];
		
		var tracksMessage = ((branch.RemoteLocation.length && branch.RemoteLocation.length === 1 && branch.RemoteLocation[0].Children.length && branch.RemoteLocation[0].Children.length === 1) ? 
				i18nUtil.formatMessage(messages["tracks ${0}, "], branch.RemoteLocation[0].Children[0].Name) : messages["tracks no branch, "]);
				
		var description = document.createElement("div");
		description.textContent = tracksMessage + i18nUtil.formatMessage(messages["last modified ${0} by ${1}"], new Date(commit.Time).toLocaleString(), //$NON-NLS-0$
				commit.AuthorName);
		detailsView.appendChild(description);
		
		var actionsArea = document.createElement("div");
		actionsArea.className = "sectionTableItemActions";
		actionsArea.id = "branchActionsArea";
		horizontalBox.appendChild(actionsArea);
		
		this.commandService.renderCommands(this.actionScopeId, actionsArea, branch, this, "tool");	 //$NON-NLS-0$
	};
	
	// Git remote branches
	
	GitRepositoryExplorer.prototype.displayRemoteBranches = function(repository, mode){
		
		var remoteLocation = repository.RemoteLocation;
				
		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "remoteBranchSection", //$NON-NLS-0$
			title: "Remote Branches", //$NON-NLS-0$
			iconClass: ["gitImageSprite", "git-sprite-branch"], //$NON-NLS-1$ //$NON-NLS-0$
			content: '<div id="remoteBranchNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.registry.getService("orion.core.preference") //$NON-NLS-0$
		}); 

		var progress = titleWrapper.createProgressMonitor();
		progress.begin("Getting remote branches"); //$NON-NLS-0$
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitRemote(remoteLocation), "Getting remote branches " + repository.Name).then( //$NON-NLS-0$
			function(resp){
				var remotes = resp.Children;
				progress.done();
				if (remotes.length === 0){
					titleWrapper.setTitle(messages["No Remote Branches"]);
					return;
				}
				progress = titleWrapper.createProgressMonitor();
				progress.begin(messages["Rendering branches"]);
				that.displayRemoteBranches2(titleWrapper, remotes, repository).then(
					function(){
						progress.done();
					}, function(error){
						progress.done();
					}
				);
			}, function(error){
				progress.done(error);
			}
		);
	};
	
	GitRepositoryExplorer.prototype.displayRemoteBranches2 = function(titleWrapper, remotes, repository, deferred, anyRemoteBranch, previousRemoteBranches){
		var that = this;
		deferred = deferred || new Deferred();
		
		if (remotes.length > 0) {
			this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitRemote(remotes[0].Location), "Getting remote branches " + remotes[0].Name).then( //$NON-NLS-0$
				function(resp){
					var remoteBranches = resp.Children;
					for(var i=0; (i<remoteBranches.length);i++){
						remoteBranches[i].Repository = repository;
						that.renderRemoteBranch(remoteBranches[i], i);
					}
					
					that.displayRemoteBranches2(titleWrapper, remotes.slice(1), repository, deferred, (anyRemoteBranch || (remoteBranches.length > 0)), remoteBranches);
				}, function (error) {
					deferred.reject(error);
				}
			);
		} else {
			if (!anyRemoteBranch){
				titleWrapper.setTitle(messages['No Remote Branches']);
			}
			deferred.resolve();
		}
		
		return deferred;
	};
			
	GitRepositoryExplorer.prototype.renderRemoteBranch = function(remoteBranch, index){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem lightTreeTableRow";
		lib.node("remoteBranchNode").appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);	

		var detailsView = document.createElement("div");
		detailsView.className = "stretch";
		horizontalBox.appendChild(detailsView);

		var title = document.createElement("span");
		title.textContent = remoteBranch.Name;
		detailsView.appendChild(title);
		
		var actionsArea = document.createElement("div");
		actionsArea.className = "sectionTableItemActions";
		actionsArea.id = "branchActionsArea";
		horizontalBox.appendChild(actionsArea);
		
		this.commandService.renderCommands(this.actionScopeId, actionsArea, remoteBranch, this, "tool");	 //$NON-NLS-0$
	};

	// Git commits
		
	GitRepositoryExplorer.prototype.displayCommits = function(repository){	
		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$

		var titleWrapper = new mSection.Section(tableNode, {
			id: "commitSection", //$NON-NLS-0$
			title: messages["Commits"],
			slideout: true,
			content: '<div id="commitNode"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.registry.getService("orion.core.preference") //$NON-NLS-0$
		}); 

		var progress = titleWrapper.createProgressMonitor();
		progress.begin(messages["Getting current branch"]);

		var commitsContainer = document.createElement("div");
		commitsContainer.className = "mainPadding";
		
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(repository.BranchLocation), "Getting current branch " + repository.Name).then( //$NON-NLS-0$
			function(resp){
				var branches = resp.Children;
				var currentBranch;
				for (var i=0; i<branches.length; i++){
					if (branches[i].Current){
						currentBranch = branches[i];
						break;
					}
				}
				
				if (!currentBranch){
					progress.done();
					return;
				}
				
				var tracksRemoteBranch = (currentBranch.RemoteLocation.length === 1 && currentBranch.RemoteLocation[0].Children.length === 1);
				
				titleWrapper.setTitle(i18nUtil.formatMessage(messages["Commits for \"${0}\" branch"], currentBranch.Name)); //$NON-NLS-1$ //$NON-NLS-0$
				
				that.commandService.destroy(titleWrapper.actionsNode.id);

				that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
				that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, 
					{"ViewAllLink":logTemplate.expand({resource: currentBranch.CommitLocation}), "ViewAllLabel":messages["See Full Log"], "ViewAllTooltip":messages["See the full log"]}, that, "button"); //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				
				if (tracksRemoteBranch){
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.fetch", 100); //$NON-NLS-0$
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.merge", 100); //$NON-NLS-0$
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.rebase", 100); //$NON-NLS-0$
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.resetIndex", 100); //$NON-NLS-0$
					that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, currentBranch.RemoteLocation[0].Children[0], that, "button"); //$NON-NLS-0$
				}
				
				that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.push", 100); //$NON-NLS-0$
				that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, currentBranch, that, "button"); //$NON-NLS-0$
				
				if (currentBranch.RemoteLocation[0] === null){
					progress.done();
					that.renderNoCommit(commitsContainer);
					return;
				}
				
				progress.worked(i18nUtil.formatMessage(messages["Getting commits for \"${0}\" branch"], currentBranch.Name));
				if (tracksRemoteBranch && currentBranch.RemoteLocation[0].Children[0].CommitLocation){
					that.registry.getService("orion.git.provider").getLog(currentBranch.RemoteLocation[0].Children[0].CommitLocation + "?page=1&pageSize=20", "HEAD").then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						function(resp){
							progress.worked(messages["Rendering commits"]);
							
							var commitsCount = resp.Children.length;
							
							for (var i=0; i<resp.Children.length; i++){
								that.renderCommit(resp.Children[i], true, i, commitsContainer);
							}
							
							progress.worked(messages["Getting outgoing commits"]);
							that.registry.getService("orion.git.provider").getLog(currentBranch.CommitLocation + "?page=1&pageSize=20", currentBranch.RemoteLocation[0].Children[0].Id).then(  //$NON-NLS-1$ //$NON-NLS-0$
								function(resp){	
									progress.worked("Rendering commits"); //$NON-NLS-0$
									for (var i=0; i<resp.Children.length; i++){
										that.renderCommit(resp.Children[i], false, i + commitsCount, commitsContainer);
									}
									
									commitsCount = commitsCount + resp.Children.length; 
									
									if (commitsCount === 0){
										that.renderNoCommit(commitsContainer);
									}
									
									progress.done();
								},
								function(error){
									progress.done(error);
								}
							);	
						},
						function(error){
							progress.done(error);
						}
					);
				} else {
					that.registry.getService("orion.git.provider").doGitLog(currentBranch.CommitLocation + "?page=1&pageSize=20").then(  //$NON-NLS-1$ //$NON-NLS-0$
						function(resp){	
							progress.worked(messages['Rendering commits']);
							for (var i=0; i<resp.Children.length; i++){
								that.renderCommit(resp.Children[i], true, i, commitsContainer);
							}
							
							if (resp.Children.length === 0){
								that.renderNoCommit(commitsContainer);
							}	
								
							progress.done();
						},
						function(error) {
							progress.done(error);
						}
					);	
				}
			}
		);
		
		lib.empty(lib.node("commitNode"));
		lib.node("commitNode").appendChild(commitsContainer);
	};
	
	GitRepositoryExplorer.prototype.renderNoCommit = function(container){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem";
		container.appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);
		
		var detailsView = document.createElement("div");
		detailsView.className = "stretch";
		horizontalBox.appendChild(detailsView);

		var title = document.createElement("div");
		title.textContent = messages["The branch is up to date."];
		detailsView.appendChild(title);
		
		var description = document.createElement("div");
		description.textContent = messages["You have no outgoing or incoming commits."];
		detailsView.appendChild(description);
	};
		
	GitRepositoryExplorer.prototype.renderCommit = function(commit, outgoing, index, container){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem lightTreeTableRow";
		container.appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);

		var imgSpriteName = (outgoing ? "git-sprite-outgoing-commit" : "git-sprite-incoming-commit"); //$NON-NLS-1$ //$NON-NLS-0$
		
		var span = document.createElement("span");
		span.className = "sectionIcon gitImageSprite " + imgSpriteName;
		horizontalBox.appendChild(span);

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
		titleLink.href = require.toUrl(commitTemplate.expand({resource: commit.Location}));
		titleLink.textContent = commit.Message;
		detailsView.appendChild(titleLink);

		new mCommitTooltip.CommitTooltipDialog({commit: commit, triggerNode: titleLink});
		
		var div = document.createElement("div");
		detailsView.appendChild(div);
		
		var description = document.createElement("span");
		description.textContent = messages[" (SHA "] + commit.Name + messages[") by "] + commit.AuthorName + " on "
				+ new Date(commit.Time).toLocaleString();
		detailsView.appendChild(description);
		
		var actionsArea = document.createElement("div");
		actionsArea.className = "sectionTableItemActions";
		actionsArea.id = "branchActionsArea";
		horizontalBox.appendChild(actionsArea);
		
		this.commandService.renderCommands(this.actionScopeId, actionsArea, commit, this, "tool");	 //$NON-NLS-0$
	};

	// Git tags
	
	GitRepositoryExplorer.prototype.decorateTag = function(tag, deferred){
		deferred = deferred || new Deferred();
		
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").doGitLog(tag.CommitLocation + "?page=1&pageSize=1"), "Getting tag last commit " + tag.Name).then(
			function(resp){
				tag.Commit = resp.Children[0];
				deferred.resolve();
			}, function(err){
				deferred.reject();
			}
		);
		
		return deferred;
	};
	
	GitRepositoryExplorer.prototype.displayTags = function(repository, mode){
		var that = this;
		var href = window.location.href;
		
		var url = document.createElement("a");
		var pageParams = PageUtil.matchResourceParameters();
		url.href = pageParams.resource;	
		var pageQuery = (url.search? url.search : "?page=1&pageSize=20");
		
		// render section even before initialRender
		var tableNode = lib.node("table");
		var titleWrapper = new mSection.Section(tableNode, {
			id : "tagSection",
			iconClass : ["gitImageSprite", "git-sprite-tag"], //$NON-NLS-1$ //$NON-NLS-0$
			title : ("Tags" + (mode === "full" ? "" : " (5 most recent)")),
			content : '<div id="tagNode"></div>',
			canHide : true,
			hidden : true,
			preferenceService : that.registry.getService("orion.core.preference")
		});
						
		var progress = titleWrapper.createProgressMonitor();
		progress.begin(messages["Getting tags"]);

		var tagsContainer = document.createElement("div");
		tagsContainer.className = "mainPadding";
		
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(repository.TagLocation + (mode === "full" ? pageQuery : "?page=1&pageSize=5")), "Getting tags " + repository.Name).then(
			function(resp){
				var tags = resp.Children;
				
				var dynamicContentModel = new mDynamicContent.DynamicContentModel(tags,
					function(i){
						return that.decorateTag.bind(that)(tags[i]);
					});
						
				var dcExplorer = new mDynamicContent.DynamicContentExplorer(dynamicContentModel);
				var tagRenderer = {
					initialRender : function(){
						progress.done();
						var tagNode = lib.node("tagNode");
						if (!tagNode) {
							return;
						}
						lib.empty(tagNode);
						tagNode.appendChild(tagsContainer);
						
						that.commandService.destroy(titleWrapper.actionsNode.id);
						
						if (mode !== "full" && tags.length !== 0){ //$NON-NLS-0$
							that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
							that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id,
									{"ViewAllLink":require.toUrl(repoPageTemplate.expand({resource: repository.TagLocation})), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all tags"]}, that, "button"); //$NON-NLS-7$ //$NON-NLS-5$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						}
		
						if (tags.length === 0) {
							titleWrapper.setTitle(messages['No Tags']);
						}
					},
					
					renderBeforeItemPopulation : function(i){
						var sectionItem = document.createElement("div");
						sectionItem.className = "sectionTableItem lightTreeTableRow";
						tagsContainer.appendChild(sectionItem);

						var horizontalBox = document.createElement("div");
						horizontalBox.style.overflow = "hidden";
						sectionItem.appendChild(horizontalBox);
						
						var detailsView = document.createElement("div");
						detailsView.className = "stretch";
						horizontalBox.appendChild(detailsView);
						
						var title = document.createElement("span");
						title.textContent = tags[i].Name;
						detailsView.appendChild(title);
	
						this.explorer.progressIndicators[i] = new this.explorer.progressIndicator(i, title);
						
						var div = document.createElement("div");
						div.id = "tagDetailsView"+i;
						detailsView.appendChild(div);

						var actionsArea = document.createElement("div");
						actionsArea.className = "sectionTableItemActions";
						actionsArea.id = "tagActionsArea";
						horizontalBox.appendChild(actionsArea);
						
						that.commandService.renderCommands(that.actionScopeId, actionsArea, tags[i], that, "tool");	 //$NON-NLS-0$
					},
						
					renderAfterItemPopulation : function(i){
						that.renderTag(tags[i], i);
					}			
				};
				
				dcExplorer.use(tagRenderer);
				dcExplorer.render();
			
			}, function(err){
				progress.done();
				that.handleError(err);
			}
		);
	};
			
	GitRepositoryExplorer.prototype.renderTag = function(tag, i){
		var description = document.createElement("span");
		description.className = "tag-description";
		
		lib.empty(lib.node("tagDetailsView"+i));
		lib.node("tagDetailsView"+i).appendChild(description);

		var commit = tag.Commit;
		
		var link = document.createElement("a");
		link.className = "navlinkonpage";
		link.href = require.toUrl(commitTemplate.expand({resource: commit.Location}));
		link.textContent = commit.Message;
		description.appendChild(link);
		
		description.appendChild(document.createTextNode(messages[" by "] + commit.AuthorName + messages[" on "] + 
				new Date(commit.Time).toLocaleString()));
						
		 new mCommitTooltip.CommitTooltipDialog({commit: commit, triggerNode: link});
	};
	
	// Git Remotes
	
	GitRepositoryExplorer.prototype.displayRemotes = function(repository, mode){
		
		var remoteLocation = repository.RemoteLocation;
		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "remoteSection", //$NON-NLS-0$
			title: messages["Remotes"],
			iconClass: ["gitImageSprite", "git-sprite-remote"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="remoteNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			preferenceService: this.registry.getService("orion.core.preference") //$NON-NLS-0$
		});
		
		var progress = titleWrapper.createProgressMonitor();
		progress.begin("Getting remotes"); //$NON-NLS-0$
		
		that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.addRemote", 100); //$NON-NLS-0$
		that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, repository, that, "button"); //$NON-NLS-0$
				
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitRemote(remoteLocation), "Getting remotes " + repository.Name).then( //$NON-NLS-0$
			function(resp){
				var remotes = resp.Children;
				
				progress.worked(messages["Rendering remotes"]);
				if (remotes.length === 0){
					titleWrapper.setTitle(messages["No Remotes"]);
					progress.done();
					return;
				}
				
				for(var i=0; i<remotes.length ;i++){
					that.renderRemote(remotes[i], i);
				};
				progress.done();
			}, function(error){
				progress.done();
				that.handleError(error);
			}
		);
	};
	
	GitRepositoryExplorer.prototype.renderRemote = function(remote, index){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem lightTreeTableRow";
		lib.node("remoteNode").appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);

		var detailsView = document.createElement("div");
		detailsView.className = "stretch";
		horizontalBox.appendChild(detailsView);
		
		var title = document.createElement("div");
		title.textContent = remote.Name;
		detailsView.appendChild(title);
		
		var description = document.createElement("div");
		description.textContent = remote.GitUrl;
		detailsView.appendChild(description);

		var actionsArea = document.createElement("div");
		actionsArea.className = "sectionTableItemActions";
		actionsArea.id = "remoteActionsArea";
		horizontalBox.appendChild(actionsArea);

		this.commandService.renderCommands(this.actionScopeId, actionsArea, remote, this, "tool");	 //$NON-NLS-0$
	};
	
	// Git Config
	
	GitRepositoryExplorer.prototype.displayConfig = function(repository, mode){
		
		var configLocation = repository.ConfigLocation;
	
		var that = this;
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "configSection", //$NON-NLS-0$
			title: messages['Configuration'] + (mode === "full" ? "" : " (user.*)"), //$NON-NLS-2$ //$NON-NLS-1$
			slideout: true,
			content: '<div id="configNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			preferenceService: this.registry.getService("orion.core.preference") //$NON-NLS-0$
		});
		
		var progress = titleWrapper.createProgressMonitor();
		progress.begin(messages["Getting confituration"]);
				
		this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitCloneConfig(configLocation), "Getting configuration of " + repository.Name).then( //$NON-NLS-0$
			function(resp){
				progress.worked("Rendering configuration"); //$NON-NLS-0$
				var configurationEntries = resp.Children;
				
				if (mode !== "full" && configurationEntries.length !== 0){ //$NON-NLS-0$

					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
					that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id,
							{"ViewAllLink":repoTemplate.expand({resource: configLocation}), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all configuration entries"]}, that, "button"); //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
				
				if (mode === "full"){ //$NON-NLS-0$
					that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.addConfigEntryCommand", 1000); //$NON-NLS-0$
					that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, repository, that, "button"); //$NON-NLS-0$
				}
				
				if (configurationEntries.length === 0){
					titleWrapper.setTitle("No Configuration"); //$NON-NLS-0$
					progress.done();
					return;
				}
				
				for(var i=0; i<configurationEntries.length ;i++){
					if (mode === "full" || configurationEntries[i].Key.indexOf("user.") !== -1) //$NON-NLS-1$ //$NON-NLS-0$
						that.renderConfigEntry(configurationEntries[i], i);
				}
				progress.done();
			}, function(error){
				progress.done();
				that.handleError(error);
			}
		);
	};
	
	GitRepositoryExplorer.prototype.renderConfigEntry = function(configEntry, index){
		var sectionItem = document.createElement("div");
		sectionItem.className = "sectionTableItem lightTreeTableRow";
		lib.node("configNode").appendChild(sectionItem);

		var horizontalBox = document.createElement("div");
		horizontalBox.style.overflow = "hidden";
		sectionItem.appendChild(horizontalBox);
		
		var detailsView = document.createElement("div");
		detailsView.className = "stretch";
		horizontalBox.appendChild(detailsView);

		var keySpan = document.createElement("span");
		keySpan.textContent = configEntry.Key;
		detailsView.appendChild(keySpan);
		
		var valueSpan = document.createElement("span");
		valueSpan.style.paddingLeft = "10px";
		valueSpan.textContent = configEntry.Value;
		detailsView.appendChild(valueSpan);
		
		var actionsArea = document.createElement("div");
		actionsArea.className = "sectionTableItemActions";
		actionsArea.id = "configActionsArea";
		horizontalBox.appendChild(actionsArea);

		this.commandService.renderCommands(this.actionScopeId, actionsArea, configEntry, this, "tool"); //$NON-NLS-0$
	};
	
	return GitRepositoryExplorer;
}());

return exports;

// end of define
});
