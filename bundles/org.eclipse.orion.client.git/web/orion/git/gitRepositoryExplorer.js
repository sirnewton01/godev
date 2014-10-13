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
/*eslint-env browser, amd*/
define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/git/widgets/gitChangeList',
	'orion/git/widgets/gitCommitList',
	'orion/git/widgets/gitBranchList',
	'orion/git/widgets/gitConfigList',
	'orion/git/widgets/gitRepoList',
	'orion/section',
	'orion/selection',
	'orion/webui/littlelib',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/git/util',
	'orion/fileUtils',
	'orion/i18nUtil',
	'orion/globalCommands',
	'orion/git/gitCommands',
	'orion/Deferred'
], function(require, messages, mGitChangeList, mGitCommitList, mGitBranchList, mGitConfigList, mGitRepoList, mSection, mSelection, lib, URITemplate, PageUtil, util, mFileUtils, i18nUtil, mGlobalCommands, mGitCommands, Deferred) {
	
	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
	
	function compare(s1, s2, props) {
		if (s1 === s2) { return true; }
		if (s1 && !s2 || !s1 && s2) { return false; }
		if ((s1 && s1.constructor === String) || (s2 && s2.constructor === String)) { return false; }
		if (s1 instanceof Array || s2 instanceof Array) {
			if (!(s1 instanceof Array && s2 instanceof Array)) { return false; }
			if (s1.length !== s2.length) { return false; }
			for (var i = 0; i < s1.length; i++) {
				if (!compare(s1[i], s2[i])) {
					return false;
				}
			}
			return true;
		}
		if (!(s1 instanceof Object) || !(s2 instanceof Object)) { return false; }
		var p;
		for (p in (props || s1)) {
			if (s1.hasOwnProperty(p)) {
				if (!s2.hasOwnProperty(p)) { return false; }
				if (!compare(s1[p], s2[p])) {return false; }
			}
		}
		if (!props) {
			for (p in s2) {
				if (!s1.hasOwnProperty(p)) { return false; }
			}
		}
		return true;
	}
	
	function compareLocation(s1, s2) {
		return compare(s1, s2, {Location: ""});
	}

	/**
	 * Creates a new Git repository explorer.
	 * @class Git repository explorer
	 * @name orion.git.GitRepositoryExplorer
	 * @param options
	 * @param options.parentId
	 * @param options.registry
	 * @param options.linkService
	 * @param options.commandService
	 * @param options.fileClient
	 * @param options.gitClient
	 * @param options.progressService
	 * @param options.preferencesService
	 * @param options.statusService
 	 * @param options.pageNavId
	 * @param options.actionScopeId
	 */
	function GitRepositoryExplorer(options) {
		this.parentId = options.parentId;
		this.registry = options.registry;
		this.linkService = options.linkService;
		this.commandService = options.commandService;
		this.fileClient = options.fileClient;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
		this.preferencesService = options.preferencesService;
		this.statusService = options.statusService;
		this.pageNavId = options.pageNavId;
		this.actionScopeId = options.actionScopeId;
		this.checkbox = false;
		
		var that = this;
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "rebase": //$NON-NLS-0$
			case "merge": //$NON-NLS-0$
			case "mergeSquash": //$NON-NLS-0$
				if (event.failed || event.rebaseAction) {
					that.changedItem();
				}
				break;
			case "checkout": //$NON-NLS-0$
				if (that.repository) {
					window.location.href = require.toUrl(repoTemplate.expand({resource: that.lastResource = that.repository.Location}));
				}
				that.changedItem();
				break;
			case "removeClone": //$NON-NLS-0$
				if (that.repository && event.items.some(function(repo) { return repo.Location === that.repository.Location; })) {
					window.location.href = require.toUrl(repoTemplate.expand({resource: that.lastResource = ""}));
					that.changedItem();
				}
				break;
			case "removeBranch": //$NON-NLS-0$
			case "removeRemote": //$NON-NLS-0$
			case "removeTag": //$NON-NLS-0$
			case "dropStash": //$NON-NLS-0$
				var ref = event.branch || event.tag || event.remote || event.stash;
				if (that.reference && ref && ref.Location === that.reference.Location) {
					window.location.href = require.toUrl(repoTemplate.expand({resource: that.lastResource = that.repository.Location}));
					that.changedItem();
				}
				break;
			case "applyPatch": //$NON-NLS-0$
				that.repository.status = null;
				that.changes = null;
				that.setSelectedChanges(that.changes);
				break;
			}
		});
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
		this.statusService.setProgressResult(display);
		
		if (error.status === 404) {
			this.initTitleBar();
			this.displayRepositories();
		}
	};
	
	GitRepositoryExplorer.prototype.setDefaultPath = function(defaultPath){
		this.defaultPath = defaultPath;
	};
	
	GitRepositoryExplorer.prototype.changedItem = function() {
		// An item changed so we do not need to process any URLs
		this.redisplay(false, true);
	};
	
	GitRepositoryExplorer.prototype.redisplay = function(processURLs, force) {
		// make sure to have this flag
		if (processURLs === undefined) {
			processURLs = true;
		}
		if (force) {
			this.lastResource = null;
		}
		var pageParams = PageUtil.matchResourceParameters();
		var selection = pageParams.resource;
		var path = this.defaultPath;
		var relativePath = mFileUtils.makeRelative(path);
		
		//NOTE: require.toURL needs special logic here to handle "gitapi/clone"
		var gitapiCloneUrl = require.toUrl("gitapi/clone._"); //$NON-NLS-0$
		gitapiCloneUrl = gitapiCloneUrl.substring(0, gitapiCloneUrl.length-2);
		
		var location = relativePath[0] === "/" ? gitapiCloneUrl + relativePath : gitapiCloneUrl + "/" + relativePath; //$NON-NLS-1$ //$NON-NLS-0$
		this.display(location, selection, processURLs);
	};
	
	GitRepositoryExplorer.prototype.destroyRepositories = function() {
		if (this.repositoriesLabel) {
			var parent = this.repositoriesLabel.parentNode;
			if (parent) parent.removeChild(this.repositoriesLabel);
			this.repositoriesLabel = null;
		}
		if (this.repositoriesNavigator) {
			this.repositoriesNavigator.destroy();
			this.repositoriesNavigator = null;
		}
		if (this.repositoriesSection) {
			this.repositoriesSection.destroy();
			this.repositoriesSection = null;
		}
	};
	
	GitRepositoryExplorer.prototype.destroyBranches = function() {
		if (this.branchesLabel) {
			var parent = this.branchesLabel.parentNode;
			if (parent) parent.removeChild(this.branchesLabel);
			this.branchesLabel = null;
		}
		if (this.branchesNavigator) {
			this.branchesNavigator.destroy();
			this.branchesNavigator = null;
		}
		if (this.branchesSection) {
			this.branchesSection.destroy();
			this.branchesSection = null;
		}
	};
	
	GitRepositoryExplorer.prototype.destroyStatus = function() {
		if (this.statusNavigator) {
			this.statusNavigator.destroy();
			this.statusNavigator = null;
		}
		if (this.statusSection) {
			this.statusSection.destroy();
			this.statusSection = null;
		}
	};
	
	GitRepositoryExplorer.prototype.destroyCommits = function() {
		if (this.commitsNavigator) {
			this.commitsNavigator.destroy();
			this.commitsNavigator = null;
		}
		if (this.commitsSection) {
			this.commitsSection.destroy();
			this.commitsSection = null;
		}
	};
	
	GitRepositoryExplorer.prototype.destroyConfig = function() {
		if (this.configNavigator) {
			this.configNavigator.destroy();
			this.configNavigator = null;
		}
		if (this.configSection) {
			this.configSection.destroy();
			this.configSection = null;
		}
	};

	GitRepositoryExplorer.prototype.destroyDiffs = function() {
		if (this.diffsNavigator) {
			this.diffsNavigator.destroy();
			this.diffsNavigator = null;
		}
		if (this.diffsSection) {
			this.diffsSection.destroy();
			this.diffsSection = null;
		}
	};

	GitRepositoryExplorer.prototype.destroy = function() {
		lib.empty(lib.node('sidebar')); //$NON-NLS-0$
		lib.empty(lib.node('table')); //$NON-NLS-0$
		this.destroyRepositories();
		this.destroyBranches();
		this.destroyCommits();
		this.destroyStatus();
		this.destroyConfig();
		this.destroyDiffs();
	};
	
	
	GitRepositoryExplorer.prototype.setSelectedRepository = function(repository, force) {
		var that = this;
		var setRepoSelection =  function(repository, force) {
			if (!force) {
				if (compareLocation(that.repository, repository)) return;
			}
			that.repository = repository;
			that.initTitleBar(repository || {});
			if (repository) {
				that.preferencesService.getPreferences("/git/settings").then(function(prefs) {  //$NON-NLS-0$
					prefs.put("lastRepo", {Location: that.repository.Location});  //$NON-NLS-0$
				});
				that.repositoriesNavigator.select(that.repository);
				that.repositoriesSection.setTitle(repository.Name);
				that.displayBranches(repository); 
				that.displayConfig(repository, "full"); //$NON-NLS-0$
				that.setSelectedReference(that.reference);
			}
		};
	
		if (!repository && this.repositoriesNavigator && this.repositoriesNavigator.model) {
			this.preferencesService.getPreferences("/git/settings").then(function(prefs) {  //$NON-NLS-0$
				var lastRepo = prefs.get("lastRepo"); //$NON-NLS-0$
				if (lastRepo) {
					that.repositoriesNavigator.model.repositories.some(function(repo){
						if (repo.Location === lastRepo.Location) {
							repository = repo;
							return true;
						}
						return false;
					});
				}
				if (!repository) {
					repository = that.repositoriesNavigator.model.repositories[0];
				}
				setRepoSelection (repository, force);
			});
		} else {
			setRepoSelection (repository, force);
		}
		
	};
	
	GitRepositoryExplorer.prototype.setSelectedReference = function(ref) {
		this.reference = ref;
		this.setSelectedChanges(this.changes);
		this.displayCommits(this.repository);
	};
	
	GitRepositoryExplorer.prototype.setSelectedChanges = function(changes) {
		lib.empty(lib.node('table')); //$NON-NLS-0$
		var title;
		this.changes = changes = changes || (this.repository.status ? [this.repository.status] : []);
		if (changes.length === 2) {
			if (changes[0].Type === "Commit" && changes[1].Type === "Commit") { //$NON-NLS-1$ //$NON-NLS-0$
				title = i18nUtil.formatMessage(messages["CompareChanges"], util.shortenRefName(changes[0]), util.shortenRefName(changes[1]));
				this.displayDiffs(this.repository, null, changes[0].DiffLocation, changes[1].Name, title);
			} else {
				var status = changes[0].Type === "Status"; //$NON-NLS-0$
				title = i18nUtil.formatMessage(messages["CompareChanges"], util.shortenRefName(changes[status ? 1 : 0]), messages["Working Directory"]); 
				this.displayDiffs(this.repository, null, status ? changes[1].DiffLocation : changes[0].DiffLocation, null, title);
			}
			return;
		} else if (changes.length === 1 && this.changes[0] && this.changes[0].Type === "Commit") { //$NON-NLS-0$
			title = i18nUtil.formatMessage(messages[changes[0].Type + ' (${0})'], util.shortenRefName(changes[0])); //$NON-NLS-0$
			this.displayDiffs(this.repository, changes[0], null, null, title);
			this.statusDeferred = new Deferred().resolve(); //HACK
			return;
		}
		this.statusDeferred = this.displayStatus(this.repository).then(function() {
			if (changes.length === 0) {
				this.changes = [this.repository.status];
			}
		}.bind(this));
	};

	GitRepositoryExplorer.prototype.display = function(location, resource, processURLs) {
		if (this.lastResource === resource) return; //$NON-NLS-0$
		this.lastResource = resource; //$NON-NLS-0$
		this.destroy();
		var that = this;
		this.changes = this.reference = this.repository = this.log = null;
		this.loadingDeferred = new Deferred();
		if (processURLs){
			this.loadingDeferred.then(function(){
				that.commandService.processURL(window.location.href);
			});
		}
		this.repositoriesLocation = location;
		this.destroy();
		this.displayRepositories(location, "").then(function() {
			if (resource) {
				that.progressService.progress(that.gitClient.getGitClone(resource), messages["Getting git repository details"]).then(function(selection){
					var repository;
					if (selection.Type === "Clone") { //$NON-NLS-0$
						repository = selection.Children[0];
						that.setSelectedRepository(repository);
					} else if (selection.CloneLocation) {
						that.progressService.progress(that.gitClient.getGitClone(selection.CloneLocation), messages["Getting git repository details"]).then(function(clone){
							if (selection.Type === "Commit") { //$NON-NLS-0$
								that.log = selection;
								that.changes = [selection.Children[0]];
							} else if (selection.Type === "Branch" || selection.Type === "RemoteTrackingBranch" || selection.Type === "Tag") { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								that.reference = selection;
							}
							repository = clone.Children[0];
							that.setSelectedRepository(repository);
						}, function(error){
							that.handleError(error);
						});
					} else {
						that.setSelectedRepository();
					}
				}, function(error){
					that.handleError(error);
				});
			} else {
				that.setSelectedRepository();
			}
		}, function(error){
			that.handleError(error);
		});
	};
	
	GitRepositoryExplorer.prototype.initTitleBar = function(resource) {
		var item = {};
		var task = messages.Repo;
		var repository = resource;
		item.Name = messages["Git"];
		item.Parents = [];
		mGitCommands.updateNavTools(this.registry, this.commandService, this, "pageActions", "selectionTools", this.repository, this.pageNavId); //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: task,
			target: repository,
			breadcrumbTarget: item,
			makeBreadcrumbLink: function(seg, location) {
				seg.href = require.toUrl(repoTemplate.expand({resource: location || ""}));
			},
			serviceRegistry: this.registry,
			commandService: this.commandService
		});
	};
	
	GitRepositoryExplorer.prototype.createLabel = function(parent, str, sibling) {
		var label = document.createElement("div"); //$NON-NLS-0$
		label.className = "gitSectionLabel"; //$NON-NLS-0$
		label.textContent = str;
		if (sibling) {
			parent.insertBefore(label, sibling);
		} else {
			parent.appendChild(label);
		}
		return label;
	};
	
	GitRepositoryExplorer.prototype.displayRepositories = function(location, mode, links) {
		this.destroyRepositories();
		var parent = lib.node('pageToolbar'); //$NON-NLS-0$
		
		this.repositoriesLabel = this.createLabel(parent, messages["Repository:"]);
		
		var section = this.repositoriesSection = new mSection.Section(parent, {
			id: "repoSection", //$NON-NLS-0$
			title: messages["Repo"],
//			iconClass: ["gitImageSprite", "git-sprite-repository"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="repositoryNode" class="repoDropdownList"></div><div id="dropdownRepositoryActionsNode" class="sectionDropdownActions toolComposite"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			dropdown: true,
			noTwistie: true,
			preferenceService: this.preferencesService
		});
		
		var selection = this.repositoriesSelection = new mSelection.Selection(this.registry, "orion.selection.repo"); //$NON-NLS-0$
		selection.addEventListener("selectionChanged", function(e) { //$NON-NLS-0$
			var selected = e.selection;
			if (!selected || compareLocation(this.repository, selected)) return;
			mGitCommands.preStateChanged().then(function(doIt) {
				if(doIt) {
					this.changes = this.reference = this.log = null;
					section.setHidden(true);
					this.setSelectedRepository(selected);
					window.location.href = require.toUrl(repoTemplate.expand({resource: this.lastResource = selected.Location}));
				} else {
					return;
				}
			}.bind(this));
		}.bind(this));
		var explorer = this.repositoriesNavigator = new mGitRepoList.GitRepoListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			fileClient: this.fileClient,
			gitClient: this.gitClient,
			progressService: this.progressService,
			parentId: "repositoryNode", //$NON-NLS-0$
			actionScopeId: this.actionScopeId,
			sectionActionScodeId: "dropdownRepositoryActionsNode", //$NON-NLS-0$
			handleError: this.handleError.bind(this),
			location: location || this.repositoriesLocation,
			section: section,
			selection: selection,
			selectionPolicy: "singleSelection", //$NON-NLS-0$
			mode: mode,
			showLinks: links,
		});
		return explorer.display().then(function() {
			this.loadingDeferred.resolve();
		}.bind(this), this.loadingDeferred.reject);
	};
	
	GitRepositoryExplorer.prototype.displayBranches = function(repository) {
		this.destroyBranches();
		var parent = lib.node('pageToolbar'); //$NON-NLS-0$
		
		this.branchesLabel = this.createLabel(parent, messages["Reference:"]);
		
		var section = this.branchesSection = new mSection.Section(parent, {
			id: "branchSection", //$NON-NLS-0$
			title: this.previousBranchTitle || "\u00A0", //$NON-NLS-0$
//			iconClass: ["gitImageSprite", "git-sprite-branch"], //$NON-NLS-1$ //$NON-NLS-0$
			slideout: true,
			content: '<div id="branchNode" class="branchDropdownList"></div><div id="dropdownBranchesActionsNode" class="sectionDropdownActions toolComposite"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			dropdown: true,
			noTwistie: true,
			preferenceService: this.preferencesService
		});

		var selection = this.branchesSelection = new mSelection.Selection(this.registry, "orion.selection.ref"); //$NON-NLS-0$
		selection.addEventListener("selectionChanged", function(e) { //$NON-NLS-0$
			var selected = e.selection;
			if (!selected || compareLocation(this.reference, selected)) return;
			mGitCommands.preStateChanged().then(function(doIt) {
				if(doIt) {
					switch (selected.Type) {
						case "Branch": //$NON-NLS-0$
						case "RemoteTrackingBranch": //$NON-NLS-0$
						case "Tag": //$NON-NLS-0$
						case "StashCommit": //$NON-NLS-0$
							break;
						case "Remote": //$NON-NLS-0$
							var activeBranch = this.commitsNavigator.model.getActiveBranch();
							if (!activeBranch) return;
							var newBranch;
							for (var i = 0; i < activeBranch.RemoteLocation.length; i++) {
								if (selected.Location === activeBranch.RemoteLocation[i].Location) {
									var children = activeBranch.RemoteLocation[i].Children;
									newBranch = children[children.length - 1];
									break;
								}
							}
							if (util.isNewBranch(newBranch)) {
								selected = newBranch;
								break;
							}
							return;
						default:
							return;
					}
					this.changes = this.reference = this.log = null;
					section.setHidden(true);
					this.setSelectedReference(selected);
					if (!util.isNewBranch(selected)) {
						window.location.href = require.toUrl(repoTemplate.expand({resource: this.lastResource = selected.Location}));
					}
				} else {
					return;
				}
			}.bind(this));
		}.bind(this));
		var explorer = this.branchesNavigator = new mGitBranchList.GitBranchListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			fileClient: this.fileClient,
			gitClient: this.gitClient,
			progressService: this.progressService,
			parentId: "branchNode", //$NON-NLS-0$
			actionScopeId: this.actionScopeId,
			sectionActionScodeId: "dropdownBranchesActionsNode", //$NON-NLS-0$
			section: section,
			selection: selection,
			selectionPolicy: "singleSelection", //$NON-NLS-0$
			handleError: this.handleError.bind(this),
			showTags: !this.showTagsSeparately,
			showHistory: false,
			root: {
				Type: "RemoteRoot", //$NON-NLS-0$
				repository: repository,
			}
		});
		return explorer.display().then(function() {
			if (this.reference) {
				explorer.select(this.reference);
			}
		}.bind(this));
	};
	
	GitRepositoryExplorer.prototype.setBranchesTitle = function() {
		var title = this.showTagsSeparately ? messages["Branches"] : messages['BranchesTags'];
		var explorer = this.commitsNavigator;
		if (!explorer) return;
		var activeBranch = explorer.model.getActiveBranch();
		var targetRef = explorer.model.getTargetReference();
		if (activeBranch && targetRef) {
			var targetName =  util.shortenRefName(targetRef);
			title = activeBranch.Name + " => " + targetName;  //$NON-NLS-0$
		} else if (!activeBranch && !targetRef) {
			title = messages["NoActiveBranch"] + " => " + messages["NoRef"];  //$NON-NLS-0$
		} else if (!activeBranch && targetRef) {
			title = messages["NoActiveBranch"] + " => " +  util.shortenRefName(targetRef);  //$NON-NLS-0$
		} else {
			title = util.shortenRefName(activeBranch || targetRef);
		}
		this.branchesSection.setTitle(this.previousBranchTitle = title);
	};

	GitRepositoryExplorer.prototype.displayStatus = function(repository) {	
		this.destroyStatus();
		var parent = lib.node('table'); //$NON-NLS-0$
		var section = this.statusSection = new mSection.Section(parent, {
			id: "statusSection", //$NON-NLS-0$
			title: messages["WorkingDirChanges"],
			slideout: true,
			content: '<div id="statusNode"></div>', //$NON-NLS-0$
			canHide: false,
			noTwistie: true,
			preferenceService: this.preferencesService
		});
		
		var explorer  = this.statusNavigator = new mGitChangeList.GitChangeListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			parentId:"statusNode", //$NON-NLS-0$
			prefix: "all", //$NON-NLS-0$
			repository: repository,
			section: section,
			editableInComparePage: true,
			handleError: this.handleError.bind(this),
			gitClient: this.gitClient,
			progressService: this.progressService,
			preferencesService: this.preferencesService
		});
		return explorer.display();
	};

	GitRepositoryExplorer.prototype.displayCommits = function(repository) {	
		this.destroyCommits();
		var parent = lib.node('sidebar'); //$NON-NLS-0$
		var section = this.commitsSection = new mSection.Section(parent, {
			id: "commitsSection", //$NON-NLS-0$
			title: messages["Diffs"],
			slideout: false,
			content: '<div id="commitsNode"></div>', //$NON-NLS-0$
			canHide: false,
			noTwistie: true,
			preferenceService: this.preferencesService
		});
		
		// Set the branches section title when the active and target references are available
		var that = this;
		var oldSetTitle = section.setTitle;
		section.setTitle = function(str) {
			oldSetTitle.call(section, str);
			that.setBranchesTitle();
		};
		
		var selection = this.commitsSelection = new mSelection.Selection(this.registry, "orion.selection.commit"); //$NON-NLS-0$
		selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
			var selected = event.selections;
			if (compareLocation(this.changes, selected)) return;
			mGitCommands.preStateChanged().then(function(doIt) {
				if(doIt) {
					this.setSelectedChanges(selected);
//					window.location.href = require.toUrl(repoTemplate.expand({resource: this.lastResource = selected.Location}));
				} else {
					return;
				}
			}.bind(this));
		}.bind(this));
		var explorer = this.commitsNavigator = new mGitCommitList.GitCommitListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			fileClient: this.fileClient,
			gitClient: this.gitClient,
			progressService: this.progressService,
			statusService: this.statusService,
			actionScopeId: this.actionScopeId,
			parentId:"commitsNode", //$NON-NLS-0$
			section: section,
			selection: selection,
			targetRef: this.reference,
			log: this.log,
			simpleLog: !!this.log,
			autoFetch: this.autoFetch === undefined || this.autoFetch,
			handleError: this.handleError.bind(this),
			root: {
				Type: "CommitRoot", //$NON-NLS-0$
				repository: repository
			}
		});
		this.autoFetch = false;
		return this.statusDeferred.then(function() {
			return explorer.display().then(function() {
				if (!this.reference) {
					this.reference = this.commitsNavigator.model.getTargetReference();
				}
				if (this.changes && this.changes.length) {
					this.changes.forEach(function(c) {
						explorer.select(c);
					});
				} else {
					explorer.select(repository.status);
				}
			}.bind(this));
		}.bind(this));
	};

	GitRepositoryExplorer.prototype.displayDiffs = function(repository, commit, location, commitName, title) {
		this.destroyDiffs();
		var parent = lib.node('table'); //$NON-NLS-0$
		var section = this.diffsSection = new mSection.Section(parent, {
			id : "diffSection", //$NON-NLS-0$
			title : title || messages["CommitChanges"],
			content : '<div id="diffNode"></div>', //$NON-NLS-0$
			canHide : false,
			noTwistie: true,
			preferencesService : this.preferencesService
		});

		var explorer = this.diffsNavigator = new mGitChangeList.GitChangeListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			selection: null,
			parentId:"diffNode", //$NON-NLS-0$
			actionScopeId: "diffSectionItemActionArea", //$NON-NLS-0$
			prefix: "diff", //$NON-NLS-0$
			repository: repository,
			commit: commit,
			changes: commit ? commit.Diffs : null,
			location: location,
			commitName: commitName,
			section: section,
			gitClient: this.gitClient,
			progressService: this.progressService,
			preferencesService : this.preferencesService,
			handleError: this.handleError.bind(this)
		});
		return explorer.display();
	};
	
	GitRepositoryExplorer.prototype.displayConfig = function(repository, mode) {
		this.destroyConfig();
		var parent = lib.node('pageToolbar'); //$NON-NLS-0$
		
		var section = this.configSection = new mSection.Section(parent, {
			id: "configSection", //$NON-NLS-0$
			title: "\u200B", //$NON-NLS-0$
			iconClass: ["core-sprite-wrench"], //$NON-NLS-0$
			slideout: true,
			content: '<div id="configNode" class="configDropdownList mainPadding"></div><div id="dropdownConfigActionsNode" class="sectionDropdownActions toolComposite"></div>', //$NON-NLS-0$
			canHide: true,
			hidden: true,
			dropdown: true,
			noTwistie: true,
			noArrow: true,
			preferenceService: this.preferencesService
		});
			
		var configNavigator = this.configNavigator = new mGitConfigList.GitConfigListExplorer({
			serviceRegistry: this.registry,
			commandRegistry: this.commandService,
			fileClient: this.fileClient,
			gitClient: this.gitClient,
			progressService: this.progressService,
			parentId:"configNode", //$NON-NLS-0$
			actionScopeId: this.actionScopeId,
			sectionActionScopeId: "dropdownConfigActionsNode", //$NON-NLS-0$
			section: section,
			handleError: this.handleError.bind(this),
			root: {
				Type: "ConfigRoot", //$NON-NLS-0$
				repository: repository,
				mode: mode
			}
		});
		return configNavigator.display();
	};

	return {
		GitRepositoryExplorer: GitRepositoryExplorer
	};
});
