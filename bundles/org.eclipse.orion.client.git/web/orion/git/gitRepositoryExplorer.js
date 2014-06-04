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
define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/git/widgets/gitCommitList',
	'orion/git/widgets/gitBranchList',
	'orion/git/widgets/gitConfigList',
	'orion/git/widgets/gitTagList',
	'orion/git/widgets/gitRepoList',
	'orion/section',
	'orion/webui/littlelib',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/fileUtils',
	'orion/globalCommands',
	'orion/Deferred'
], function(require, messages, mGitCommitList, mGitBranchList, mGitConfigList, mGitTagList, mGitRepoList, mSection, lib, URITemplate, PageUtil, mFileUtils, mGlobalCommands, Deferred) {
var exports = {};
	
var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$

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
		this.gitClient = this.registry.getService("orion.git.provider"); //$NON-NLS-0$
		this.progressService = this.registry.getService("orion.page.progress"); //$NON-NLS-0$
		this.preferencesService = this.registry.getService("orion.core.preference"); //$NON-NLS-0$
		this.messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
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
		this.messageService.setProgressResult(display);
		
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
		}
	};
	
	GitRepositoryExplorer.prototype.displayRepositories2 = function(location, processURLs){
		var that = this;
		this.loadingDeferred = new Deferred();
		if(processURLs){
			this.loadingDeferred.then(function(){
				that.commandService.processURL(window.location.href);
			});
		}
		
		this.progressService.progress(this.gitClient.getGitClone(location), "Getting git repository details").then(
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
		this.progressService.progress(this.gitClient.getGitClone(location), "Getting git repository details").then(
			function(resp){
				
				// render navigation commands
				var pageNav = lib.node(that.pageNavId);
				if(pageNav){
					lib.empty(pageNav);
					that.commandService.renderCommands(that.pageNavId, pageNav, resp, that, "button"); //$NON-NLS-0$
				}
				if (!resp.Children) {
					return;
				}
				
				var repositories;
				if (resp.Children.length === 0) {
					that.initTitleBar({});
					that.displayRepositories([], "full"); //$NON-NLS-0$
				} else if (resp.Children.length && resp.Children.length === 1 && resp.Children[0].Type === "Clone") { //$NON-NLS-0$
					repositories = resp.Children;
					
					that.initTitleBar(repositories[0]);
					that.displayRepositories(repositories, "full"); //$NON-NLS-0$
					that.displayCommits(repositories[0]);
					that.displayBranches(repositories[0]);
					that.displayTags(repositories[0]);
					that.displayRemotes(repositories[0]);
					that.displayConfig(repositories[0]);
				} else if (resp.Children[0].Type === "Clone"){ //$NON-NLS-0$
					repositories = resp.Children;
					
					that.initTitleBar(repositories);
					that.displayRepositories(repositories, "full", true); //$NON-NLS-0$
				} else if (resp.Children[0].Type === "Branch"){ //$NON-NLS-0$
					var branches = resp.Children;
					
					that.progressService.progress(that.gitClient.getGitClone(branches[0].CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
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
					
					that.progressService.progress(that.gitClient.getGitClone(tags[0].CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
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
					that.progressService.progress(that.gitClient.getGitClone(resp.CloneLocation), "Getting git repository details").then( //$NON-NLS-0$
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
	
	GitRepositoryExplorer.prototype.displayRepositories = function(repositories, mode, links){
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		lib.empty(tableNode);
		var contentParent = document.createElement("div");
		tableNode.appendChild(contentParent);
					
		contentParent.innerHTML = '<div id="repositoryNode" class="mainPadding"></div>'; //$NON-NLS-0$
		var repoNavigator = new mGitRepoList.GitRepoListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId: "repositoryNode",
			actionScopeId: this.actionScopeId,
			handleError: this.handleError,
			repositories: repositories,
			mode: mode,
			links: links,
			loadingDeferred: this.loadingDeferred
		});
		repoNavigator.display();
	};
	
	// Git branches
	
	GitRepositoryExplorer.prototype.displayBranches = function(repository, mode){
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "branchSection", //$NON-NLS-0$
			title: messages['Branches'],
			iconClass: ["gitImageSprite", "git-sprite-branch"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="branchNode"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.preferencesService
		});
		var branchNavigator = new mGitBranchList.GitBranchListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId: "branchNode",
			actionScopeId: this.actionScopeId,
			section: titleWrapper,
			handleError: this.handleError,
			root: {
				Type: "LocalRoot",
				repository: repository,
				mode: mode
			}
		});
		branchNavigator.display();
	};
	
	// Git remote branches
	
	GitRepositoryExplorer.prototype.displayRemoteBranches = function(repository, mode){
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "remoteBranchSection", //$NON-NLS-0$
			title: "Remote Branches", //$NON-NLS-0$
			iconClass: ["gitImageSprite", "git-sprite-branch"], //$NON-NLS-1$ //$NON-NLS-0$
			content: '<div id="remoteBranchNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.preferencesService
		}); 

		var branchNavigator = new mGitBranchList.GitBranchListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId:"remoteBranchNode", //hack
			actionScopeId: this.actionScopeId,
			section: titleWrapper,
			handleError: this.handleError,
			root: {
				Type: "RemoteRoot",
				repository: repository,
				mode: mode
			}
		});
		branchNavigator.display();
	};

	// Git commits
		
	GitRepositoryExplorer.prototype.displayCommits = function(repository){	
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$

		var titleWrapper = new mSection.Section(tableNode, {
			id: "commitSection", //$NON-NLS-0$
			title: messages["Commits"],
			slideout: true,
			content: '<div id="commitNode"></div>', //$NON-NLS-0$
			canHide: true,
			preferenceService: this.preferencesService
		}); 
		
		var explorer = new mGitCommitList.GitCommitListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			selection: this.selection,
			actionScopeId: this.actionScopeId,
			parentId:"commitNode",
			section: titleWrapper,
			handleError: this.handleError,
			root: {
				Type: "CommitRoot",
				repository: repository
			}
		});
		explorer.display();
	};
	
	// Git tags
	
	GitRepositoryExplorer.prototype.displayTags = function(repository, mode){
		// render section even before initialRender
		var tableNode = lib.node("table");
		var titleWrapper = new mSection.Section(tableNode, {
			id : "tagSection",
			iconClass : ["gitImageSprite", "git-sprite-tag"], //$NON-NLS-1$ //$NON-NLS-0$
			title : ("Tags" + (mode === "full" ? "" : " (5 most recent)")),
			content : '<div id="tagNode"></div>',
			canHide : true,
			hidden : true,
			preferenceService : this.preferencesService
		});

		var tagsNavigator = new mGitTagList.GitTagListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId:"tagNode",
			actionScopeId: this.actionScopeId,
			section: titleWrapper,
			repository: repository,
			mode: mode
		});
		tagsNavigator.display();
	};
	
	// Git Remotes
	
	GitRepositoryExplorer.prototype.displayRemotes = function(repository, mode){

		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "remoteSection", //$NON-NLS-0$
			title: messages["Remotes"],
			iconClass: ["gitImageSprite", "git-sprite-remote"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="remoteNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			preferenceService: this.preferencesService
		});
		var branchNavigator = new mGitBranchList.GitBranchListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId:"remoteNode",
			actionScopeId: this.actionScopeId,
			section: titleWrapper,
			handleError: this.handleError,
			root: {
				Type: "RemoteRoot",
				repository: repository,
				mode: mode
			}
		});
		branchNavigator.display();
	};
	
	// Git Config
	
	GitRepositoryExplorer.prototype.displayConfig = function(repository, mode){
		
		var tableNode = lib.node( 'table' ); //$NON-NLS-0$
		
		var titleWrapper = new mSection.Section(tableNode, {
			id: "configSection", //$NON-NLS-0$
			title: messages['Configuration'] + (mode === "full" ? "" : " (user.*)"), //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="configNode" class="mainPadding"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			preferenceService: this.preferencesService
		});
			
		var configNavigator = new mGitConfigList.GitConfigListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId:"configNode",
			actionScopeId: this.actionScopeId,
			section: titleWrapper,
			handleError: this.handleError,
			root: {
				Type: "ConfigRoot",
				repository: repository,
				mode: mode
			}
		});
		configNavigator.display();
	};
	
	
	return GitRepositoryExplorer;
}());

return exports;

// end of define
});
