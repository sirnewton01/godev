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

/*eslint-env browser, amd*/

define([
	'i18n!git/nls/gitmessages',
	'orion/commandRegistry',
	'orion/explorers/explorer',
	'orion/URITemplate',
	'orion/i18nUtil',
	'orion/git/uiUtil',
	'orion/git/util',
	'orion/Deferred',
	'orion/git/gitCommands',
	'orion/objects'
], function(messages, mCommandRegistry, mExplorer, URITemplate, i18nUtil, uiUtil, util, Deferred, mGitCommands, objects) {
		
	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$

	function GitRepoListModel(options) {
		this.root = options.root;
		this.registry = options.registry;
		this.handleError = options.handleError;
		this.section = options.section;
		this.location = options.location;
		this.repositories = options.repositories;
		this.progressService = options.progressService;
		this.parentId = options.parentId;
		this.fileClient = options.fileClient;
		this.gitClient = options.gitClient;
		this.mode = options.mode;
	}
	GitRepoListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitRepoListModel.prototype, /** @lends orion.git.GitRepoListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.root);
		},
		loadRepositoryInfo: function(repository) {
			var that = this;
			var deferred = new Deferred();
			this.progressService.progress(this.fileClient.loadWorkspace(repository.ContentLocation + "?parts=meta"), "Loading workspace info").then(function(resp) {//$NON-NLS-1$ //$NON-NLS-0$
				try {
					repository.Content = {};
					var path = "root / "; //$NON-NLS-0$
					if (resp.Parents !== null) {
						for (var i=resp.Parents.length; i>0; i--) {
							path += resp.Parents[i-1].Name + " / "; //$NON-NLS-0$
						}
					}
					path += resp.Name;
					repository.Content.Path = path;
					
					if (that.mode !== "full"){ //$NON-NLS-0$
						return deferred.resolve();
					}
					
					Deferred.when(repository.status || (repository.status = that.progressService.progress(that.gitClient.getGitStatus(repository.StatusLocation), messages['Getting changes'])), function(resp) {
						try{
							repository.status = resp;
							var currentBranchMsg = i18nUtil.formatMessage(messages['GettingCurrentBranch'], repository.Name);
							that.progressService.progress(that.gitClient.getGitBranch(repository.BranchLocation + "?commits=0&page=1&pageSize=1"), currentBranchMsg).then(function(resp) { //$NON-NLS-0$
								var currentBranch = resp.Children[0];
								if (!currentBranch || currentBranch.RemoteLocation[0] === null){
									deferred.resolve();
									return;
								}
								if (util.tracksRemoteBranch(currentBranch) && currentBranch.RemoteLocation[0].Children[0].CommitLocation){
									that.progressService.progress(that.gitClient.getLog(currentBranch.RemoteLocation[0].Children[0].CommitLocation + "?page=1&pageSize=20", "HEAD"), "Getting incomming commits " + repository.Name).then(function(resp){ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
										if(resp.Children === undefined) { repository.CommitsToPush = 0; }
										else { repository.CommitsToPush = resp.Children.length; }
										deferred.resolve();
										return;
									}, deferred.reject);
								} else {
									that.progressService.progress(that.gitClient.doGitLog(currentBranch.CommitLocation + "?page=1&pageSize=20"), "Getting outgoing commits " + repository.Name).then(function(resp){ //$NON-NLS-1$ //$NON-NLS-0$
										if(resp.Children === undefined) { repository.CommitsToPush = 0; }
										else { repository.CommitsToPush = resp.Children.length; }
										deferred.resolve();
										return;
									}, deferred.reject);	
								}
							}, deferred.reject);
						} catch(e){
							deferred.reject();
						}
					}, deferred.reject);
				} catch(e){
					deferred.reject(e);
				}
			}, deferred.reject);
			return deferred;
		},
		getChildren: function(parentItem, onComplete){	
			var that = this;
			var progress, msg;
			progress = this.section ? this.section.createProgressMonitor() : null;
			msg = messages["Getting git repository details"];
			if (progress) progress.begin(msg);
			if (parentItem.children && !parentItem.more) {
				onComplete(parentItem.children);
			} else if (parentItem.Type === "RepoRoot") { //$NON-NLS-0$
				Deferred.when (this.repositories || this.progressService.progress(this.gitClient.getGitClone(that.location), messages["Getting git repository details"]), function(resp){
					var repositories = that.repositories = resp.Children || resp;
					var allInfoDeferreds = repositories.map(function(repo) {
						return repo.infoDeferred = that.loadRepositoryInfo(repo);
					});
					function done() {
						if (progress) progress.done();
					}
					Deferred.all(allInfoDeferreds).then(done, done);
					onComplete(that.processChildren(parentItem, repositories));
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else {
				onComplete([]);
			}
		},
		processChildren: function(parentItem, children) {
			var filter = this.filterQuery;
			if (filter) {
				children = children.filter(function(item) {
					return item.Name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
				});
			}
			if (children.length === 0) {
				children = [{Type: "NoContent", selectable: false, isNotSelectable: true}]; //$NON-NLS-0$
			}
			children.forEach(function(item) {
				item.parent = parentItem;
			});
			children.sort(function(repo1, repo2) {
				return repo1.Name.localeCompare(repo2.Name);
			});
			parentItem.children = children;
			return children;
		},
		getId: function(/* item */ item){
			return this.parentId + (item.Name ? item.Name : "") + (item.Type ? item.Type : ""); //$NON-NLS-0$
		}
	});
	
	/**
	 * @class orion.git.GitRepoListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitRepoListExplorer(options) {
		this.checkbox = false;
		var renderer = new GitRepoListRenderer({
			noRowHighlighting: true,
			registry: options.serviceRegistry,
			commandService: options.commandRegistry,
			actionScopeId: options.actionScopeId,
			cachePrefix: options.prefix + "Navigator", //$NON-NLS-0$
			checkbox: this.checkbox
		}, this);
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.sectionActionScodeId = options.sectionActionScodeId;
		this.repositories = options.repositories;
		this.mode = options.mode;
		this.showLinks = options.showLinks;
		this.location = options.location;
		this.section = options.section;
		this.selectionPolicy = options.selectionPolicy;
		this.handleError = options.handleError;
		this.gitClient = options.gitClient;
		this.fileClient = options.fileClient;
		this.singleRepository = options.singleRepository;
		this.progressService = options.progressService;
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", this._modelListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "addClone": //$NON-NLS-0$
			case "removeClone": //$NON-NLS-0$
				this.changedItem();
				break;
			}
		}.bind(this));
	}
	GitRepoListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitRepoListExplorer.prototype, /** @lends orion.git.GitRepoListExplorer.prototype */ {
		destroy: function() {
			if (this._modelListener) {
				mGitCommands.getModelEventDispatcher().removeEventListener("modelChanged", this._modelListener); //$NON-NLS-0$
				this._modelListener = null;
			}
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		changedItem: function(item) {
			var deferred = new Deferred();
			var model = this.model;
			if (!item) {
				model.getRoot(function(root) {
					item = root;
				});
			}
			var that = this;
			if (!item.more) {
				that.repositories = model.repositories = item.children = null;
			}
			model.getChildren(item, function(children) {
				item.removeAll = true;
				that.repositories = children;
				that.myTree.refresh.bind(that.myTree)(item, children, false);
				deferred.resolve(children);
			});
			return deferred;
		},
		createFilter: function() {
			uiUtil.createFilter(this.section, messages["Filter items"],  function(value) {
				this.model.filterQuery = value;
				this.changedItem();
			}.bind(this));
		},
		display: function() {
			var that = this;
			var deferred = new Deferred();
			var model = new GitRepoListModel({
				root: {Type: "RepoRoot"}, //$NON-NLS-0$
				registry: this.registry,
				progressService: this.progressService,
				gitClient: this.gitClient,
				fileClient: this.fileClient,
				section: this.section,
				repositories: this.repositories,
				location: this.location,
				mode: this.mode,
				parentId: this.parentId,
				handleError: this.handleError
			});
			this.createFilter();
			this.createTree(this.parentId, model, {
				setFocus: false, // do not steal focus on load
				selectionPolicy: this.selectionPolicy,
				onComplete: function() {
					that.updateCommands();
					deferred.resolve();
				}
			});
			return deferred;
		},
		isRowSelectable: function() {
			return !!this.selection;
		},
		updateCommands: function() {
			var section = this.section;
			if (!section) return;
			var commandRegistry = this.commandService;
			var actionsNodeScope = this.sectionActionScodeId || section.actionsNode.id;
//			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.pull", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.git.deleteClone", 200); //$NON-NLS-1$ //$NON-NLS-0$
			if (this.singleRepository) {
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.popStash", 100); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.applyPatch", 200); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.pull", 300); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				commandRegistry.addCommandGroup(actionsNodeScope, "eclipse.gitGroup", 100); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.cloneGitRepository", 100, "eclipse.gitGroup", false, null, new mCommandRegistry.URLBinding("cloneGitRepository", "url")); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.createGitProject", 300, "eclipse.gitGroup", true, null, new mCommandRegistry.URLBinding("createProjectContext", "name")); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.initGitRepository", 200, "eclipse.gitGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
			commandRegistry.renderCommands(actionsNodeScope, actionsNodeScope, this.model.repositories[0], this, "button"); //$NON-NLS-0$
		}
	});
	
	function GitRepoListRenderer(options) {
		options.cachePrefix = null; // do not persist table state
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitRepoListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitRepoListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var div, td;
			switch (col_no) {
				case 0:
					var explorer = this.explorer;
					var repo = item;
				
					td = document.createElement("td"); //$NON-NLS-0$
					div = document.createElement("div"); //$NON-NLS-0$
					div.className = "sectionTableItem"; //$NON-NLS-0$
					td.appendChild(div);
					var horizontalBox = document.createElement("div"); //$NON-NLS-0$
					horizontalBox.className = "gitListCell"; //$NON-NLS-0$
					div.appendChild(horizontalBox);	
					
					var actionsID, title, description, subDescription, extraDescriptions = [], titleClass = "", titleLink;
					if (item.Type === "NoContent") { //$NON-NLS-0$
						title = messages[item.Type];
					} else if (item.parent.Type === "RepoRoot") { //$NON-NLS-0$
						if (explorer.showLinks) {
							titleLink = require.toUrl(repoTemplate.expand({resource: repo.Location}));
						} else {
							titleClass = "gitRepoTitle"; //$NON-NLS-0$
						}
						if (!explorer.section) { //$NON-NLS-0$
							tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
						} else {
							var ellipses = "..."; //$NON-NLS-0$
							description = repo.GitUrl ? messages["git url:"] + repo.GitUrl : messages["(no remote)"];
							subDescription = repo.Content ? messages["location: "] + repo.Content.Path : ellipses;
							if (explorer.mode === "full") { //$NON-NLS-0$
								var status = repo.status;
								if (status) {
									if (status.RepositoryState !== "SAFE"){ //$NON-NLS-0$
										extraDescriptions.push(messages["Rebase in progress!"]);
									}
									
									var unstaged = status.Untracked.length + status.Conflicting.length + status.Modified.length + status.Missing.length;
									var staged = status.Changed.length + status.Added.length + status.Removed.length;
									extraDescriptions.push(((unstaged > 0 || staged > 0) 
										? i18nUtil.formatMessage(messages["NumFilesStageAndCommit"], unstaged, staged)
										: messages["Nothing to commit."]));
								}
								var commitsState = repo.CommitsToPush;
								if (commitsState !== undefined) {
									extraDescriptions.push(commitsState > 0 ? i18nUtil.formatMessage(messages["NCommitsToPush"], commitsState) : messages["Nothing to push."]);
								}
							}
							if (repo.infoDeferred) {
								title = repo.Name + ellipses;
								if (explorer.mode === "full") extraDescriptions.push(ellipses); //$NON-NLS-0$
								repo.infoDeferred.then(function() {
									if (explorer.destroyed) return;
									explorer.myTree.redraw(item);
								});
								repo.infoDeferred = null;
							}
						}
					}
					
					var detailsView = document.createElement("div"); //$NON-NLS-0$
					detailsView.className = "stretch"; //$NON-NLS-0$
					horizontalBox.appendChild(detailsView);
					
					var titleDiv = document.createElement(titleLink ? "a" : "span"); //$NON-NLS-1$ //$NON-NLS-0$
					titleDiv.className = titleClass;
					if (titleLink) {
						titleDiv.href = titleLink;
					}
					titleDiv.textContent = title || item.Name;
					detailsView.appendChild(titleDiv);
					
					var descriptionDiv = document.createElement("div"); //$NON-NLS-0$
					if (description) {
						descriptionDiv.textContent = description;
					}
					detailsView.appendChild(descriptionDiv);
					
					if (subDescription) {
						var subDescriptionDiv = document.createElement("div"); //$NON-NLS-0$
						subDescriptionDiv.textContent = subDescription;
						detailsView.appendChild(subDescriptionDiv);
					}
					
					if (extraDescriptions.length) {
						var section = document.createElement("div"); //$NON-NLS-0$
						section.className = "gitRepoExtraDescriptionSection"; //$NON-NLS-0$
						detailsView.appendChild(section);						
						extraDescriptions.forEach(function(extraDescription) {
							var span = document.createElement("span"); //$NON-NLS-0$
							span.className = "gitRepoExtraDescription"; //$NON-NLS-0$
							span.textContent = extraDescription;
							section.appendChild(span);
						});
					}

					if (explorer.singleRepository) {
						tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
					} else {
						var actionsArea = document.createElement("div"); //$NON-NLS-0$
						actionsArea.className = "sectionTableItemActions"; //$NON-NLS-0$
						actionsArea.id = actionsID;
						horizontalBox.appendChild(actionsArea);
						this.commandService.renderCommands(this.actionScopeId, actionsArea, item, explorer, explorer.section ? "tool" : "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$	
					}
					return td;
			}
		}
	});
	
	return {
		GitRepoListExplorer: GitRepoListExplorer,
		GitRepoListRenderer: GitRepoListRenderer
	};

});
