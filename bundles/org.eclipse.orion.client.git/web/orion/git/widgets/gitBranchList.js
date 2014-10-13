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
	'orion/git/widgets/gitCommitList',
	'orion/explorers/explorer',
	'orion/i18nUtil',
	'orion/Deferred',
	'orion/git/util',
	'orion/git/uiUtil',
	'orion/git/gitCommands',
	'orion/webui/littlelib',
	'orion/objects'
], function(messages, mGitCommitList, mExplorer, i18nUtil, Deferred, util, uiUtil, mGitCommands, lib, objects) {

	var pageQuery = "commits=0&page=1&pageSize=100"; //$NON-NLS-0$

	function GitBranchListModel(options) {
		this.root = options.root;
		this.showHistory = options.showHistory === undefined || options.showHistory;
		this.showTags = options.showTags === undefined || options.showTags;
		this.showStashes = options.showStashes === undefined || options.showStashes;
		this.registry = options.registry;
		this.handleError = options.handleError;
		this.section = options.section;
		this.progressService = options.progressService;
		this.parentId = options.parentId;
		this.gitClient = options.gitClient;
		this.filterQuery = "";
	}
	GitBranchListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitBranchListModel.prototype, /** @lends orion.git.GitBranchListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.root);
		},
		getChildren: function(parentItem, onComplete){
			var that = this;
			var progress, msg;
			var repository = parentItem.repository || parentItem.parent.repository;
			if (parentItem.children && !parentItem.more) {
				onComplete(parentItem.children);
			} else if (parentItem.Type === "LocalRoot") { //$NON-NLS-0$
				progress = this.section && !parentItem.parent ? this.section.createProgressMonitor() : null;
				msg = i18nUtil.formatMessage(messages["Getting remote branches"], repository.Name);
				if (progress) progress.begin(msg);
				Deferred.when(this.progressService.progress(this.gitClient.getGitBranch(parentItem.location ? parentItem.location : repository.BranchLocation + util.generateQuery([pageQuery, that.filterQuery])), msg), function(resp) {
					if (progress) progress.done();
					var children = resp.Children || resp;
					onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, children, resp, "MoreBranches"))); //$NON-NLS-0$
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "StashRoot") { //$NON-NLS-0$
				progress = this.section && !parentItem.parent  ? this.section.createProgressMonitor() : null;
				msg = messages["Getting stashed changes..."];
				if (progress) progress.begin(msg);
				return that.progressService.progress(that.gitClient.doStashList(parentItem.location ? parentItem.location : repository.StashLocation + util.generateQuery([pageQuery, that.filterQuery])), msg).then(function(resp) {
					if (progress) progress.done();
					var children = resp.Children || resp;
					onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, children, resp, "MoreStashes"))); //$NON-NLS-0$
				}, function(error){
					that.handleError(error);
				});
			} else if (parentItem.Type === "TagRoot") { //$NON-NLS-0$
				progress = this.section && !parentItem.parent  ? this.section.createProgressMonitor() : null;
				msg = i18nUtil.formatMessage(messages["Getting remote branches"], repository.Name);
				if (progress) progress.begin(msg);
				Deferred.when(this.progressService.progress(this.gitClient.getGitBranch(parentItem.location ? parentItem.location : repository.TagLocation + util.generateQuery([pageQuery, that.filterQuery])), msg), function(resp) {
					if (progress) progress.done();
					var children = resp.Children || resp;
					onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, children, resp, "MoreTags"))); //$NON-NLS-0$
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "RemoteRoot") { //$NON-NLS-0$
				progress = this.section && !parentItem.parent  ? this.section.createProgressMonitor() : null;
				msg = i18nUtil.formatMessage(messages["Getting remote branches"], parentItem.repository.Name);
				if (progress) progress.begin(msg);
				this.progressService.progress(this.gitClient.getGitRemote(parentItem.repository.RemoteLocation), msg).then(function (resp) {
					if (progress) progress.done();
					var remotes = resp.Children;
					remotes.unshift(that.localRoot = {Type: "LocalRoot", Name: messages["Local"]}); //$NON-NLS-0$
					if (that.showTags) {
						remotes.push(that.tagRoot = {Type: "TagRoot", Name: messages["tags"]}); //$NON-NLS-0$
					}
					if (that.showStashes) {
						remotes.push(that.stashRoot = {Type: "StashRoot", Name: messages["stashes"]}); //$NON-NLS-0$
					}
					onComplete(that.processChildren(parentItem, remotes));
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "Remote") { //$NON-NLS-0$
				progress = this.section && !parentItem.parent  ? this.section.createProgressMonitor() : null;
				msg = i18nUtil.formatMessage(messages["Getting remote branches"], parentItem.Name);
				if (progress) progress.begin(msg);
				this.progressService.progress(this.gitClient.getGitRemote(parentItem.Location + util.generateQuery([that.filterQuery])), msg).then(function (resp) {
					if (progress) progress.done();
					var children = resp.Children || resp;
					onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, children, resp, "MoreBranches"))); //$NON-NLS-0$
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else if (this.showHistory && (parentItem.Type === "Branch" || parentItem.Type === "RemoteTrackingBranch" || parentItem.Type === "Tag" || parentItem.Type === "StashCommit")) { //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				onComplete(that.processChildren(parentItem, [{Type: "CommitList"}]));  //$NON-NLS-0$
			} else {
				onComplete([]);
			}
		},
		processChildren: function(parentItem, children) {
			if (children.length === 0) {
				children = [{Type: "NoContent", selectable: false, isNotSelectable: true}]; //$NON-NLS-0$
			}
			children.forEach(function(item) {
				item.parent = parentItem;
			});
			parentItem.children = children;
			return children;
		},
		processMoreChildren: function(parentItem, children, item, type) {
			var fullList = parentItem.children;
			if (fullList) {
				var args = [fullList.length - 1, 1].concat(children);
				Array.prototype.splice.apply(fullList, args);
			} else {
				fullList = children;
			}
			if (item.NextLocation) {
				fullList.push({Type: type, NextLocation: item.NextLocation, selectable: false, isNotSelectable: true}); //$NON-NLS-0$
			}
			return fullList;
		},
		getId: function(/* item */ item){
			return this.parentId + (item.Name ? item.Name : "") + (item.Type ? item.Type : ""); //$NON-NLS-0$
		}
	});
	
	/**
	 * @class orion.git.GitBranchListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitBranchListExplorer(options) {
		var renderer = new GitBranchListRenderer({
			noRowHighlighting: true,
			registry: options.serviceRegistry,
			commandService: options.commandRegistry,
			actionScopeId: options.actionScopeId,
			cachePrefix: options.prefix + "Navigator", //$NON-NLS-0$
//			noRowHighlighting: true,
			checkbox: false
		}, this);
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.showHistory = options.showHistory === undefined || options.showHistory;
		this.showTags = options.showTags;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.sectionActionScodeId = options.sectionActionScodeId;
		this.root = options.root;
		this.section = options.section;
		this.selectionPolicy = options.selectionPolicy;
		this.handleError = options.handleError;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", this._modelListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "addBranch": //$NON-NLS-0$
				this.changedItem(this.model.localRoot, true);
				break;
			case "removeBranch": //$NON-NLS-0$
				var local = event.branch.Type === "Branch"; //$NON-NLS-0$
				this.changedItem(local ? this.model.localRoot : null, local);
				break;
			case "addRemote": //$NON-NLS-0$
			case "removeRemote": //$NON-NLS-0$
				this.changedItem(); //$NON-NLS-0$
				break;
			case "addTag": //$NON-NLS-0$
			case "removeTag": //$NON-NLS-0$
				this.changedItem(this.model.tagRoot, true);
				break;
			case "stash": //$NON-NLS-0$
			case "dropStash": //$NON-NLS-0$
			case "popStash": //$NON-NLS-0$
				this.changedItem(this.model.stashRoot, true);
				break;
			}
		}.bind(this));
	}
	GitBranchListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitBranchListExplorer.prototype, /** @lends orion.git.GitBranchListExplorer.prototype */ {
		destroy: function(){
			mGitCommands.getModelEventDispatcher().removeEventListener("modelChanged", this._modelListener); //$NON-NLS-0$
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		changedItem: function(item, forceExpand) {
			var deferred = new Deferred();
			var model = this.model;
			if (!item) {
				model.getRoot(function(root) {
					item = root;
				});
			}
			var that = this;
			if (!item.more) {
				item.children = null;
			}
			model.getChildren(item, function(children) {
				item.removeAll = true;
				that.myTree.refresh.bind(that.myTree)(item, children, forceExpand);
				deferred.resolve(children);
			});
			return deferred;
		},
		createFilter: function() {
			uiUtil.createFilter(this.section, messages["Filter items"],  function(value) {
				this.model.filterQuery = "filter=" + encodeURIComponent(value); //$NON-NLS-0$
				this.changedItem().then(function () {
					if (this.model.filterQuery)
					for (var i=0; i<this.model.root.children.length; i++) {
						this.myTree.expand(this.model.root.children[i]); 
					}
				}.bind(this));
			}.bind(this));
		},
		display: function() {
			var deferred = new Deferred();
			var model = new GitBranchListModel({
				root: this.root,
				registry: this.registry,
				progressService: this.progressService,
				gitClient: this.gitClient,
				section: this.section,
				showHistory: this.showHistory,
				showTags: this.showTags,
				parentId: this.parentId,
				handleError: this.handleError
			});
			this.createFilter();
			this.createTree(this.parentId, model, {
				setFocus: false, // do not steal focus on load
				selectionPolicy: this.selectionPolicy,
				onComplete: function() {
					deferred.resolve();
				}
			});
			this.updateCommands();
			return deferred;
		},
		isRowSelectable: function() {
			return !!this.selection;
		},
		refreshSelection: function() {
		},
		updateCommands: function() {
			var root = this.root;
			var section = this.section;
			if (!section) return;
			var actionsNodeScope = this.sectionActionScodeId || section.actionsNode.id;
			var commandRegistry = this.commandService;
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.applyStash", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.dropStash", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.removeBranch", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.removeRemoteBranch", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.removeRemote", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.removeTag", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.checkoutTag", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.checkoutBranch", 100); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.fetchRemote", 100); //$NON-NLS-1$ //$NON-NLS-0$
			if (root.Type === "RemoteRoot") { //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.addBranch", 200); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.addRemote", 100); //$NON-NLS-0$
				commandRegistry.renderCommands(actionsNodeScope, actionsNodeScope, root.repository, this, "button"); //$NON-NLS-0$
			}
		}
	});
	
	function GitBranchListRenderer(options) {
		options.cachePrefix = null; // do not persist table state
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitBranchListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitBranchListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var div, td;
			switch (col_no) {
				case 0:
					var commit, explorer = this.explorer;
					td = document.createElement("td"); //$NON-NLS-0$
					
					if (item.Type === "MoreBranches" || item.Type === "MoreTags" || item.Type === "MoreStashes") { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						td.classList.add("gitCommitListMore"); //$NON-NLS-0$
						var moreButton = document.createElement("button"); //$NON-NLS-0$
						moreButton.className = "commandButton"; //$NON-NLS-0$
						moreButton.textContent = i18nUtil.formatMessage(messages[item.Type], item.parent.Name);
						td.appendChild(moreButton);
						var listener;
						moreButton.addEventListener("click", listener = function() { //$NON-NLS-0$
							moreButton.removeEventListener("click", listener); //$NON-NLS-0$
							moreButton.textContent = i18nUtil.formatMessage(messages[item.Type + "Progress"], item.parent.Name);
							item.parent.location = item.NextLocation;
							item.parent.more = true;
							explorer.changedItem(item.parent).then(function() {
								item.parent.more = false;
							});
						});
						return td;
					}
				
					div = document.createElement("div"); //$NON-NLS-0$
					div.className = "sectionTableItem"; //$NON-NLS-0$
					td.appendChild(div);
					var horizontalBox = document.createElement("div"); //$NON-NLS-0$
					horizontalBox.className = "gitListCell"; //$NON-NLS-0$
					div.appendChild(horizontalBox);	
					
					var that = this;
					function createExpand() {
						var expandContainer = document.createElement("div"); //$NON-NLS-0$
						expandContainer.style.display = "inline-block"; //$NON-NLS-0$
						expandContainer.style.styleFloat = expandContainer.style.cssFloat = "left"; //$NON-NLS-0$
						that.getExpandImage(tableRow, expandContainer);
						horizontalBox.appendChild(expandContainer);
					}
					
					var actionsID, title, description, subDescription, titleClass = "gitBranchTitle", titleLink; //$NON-NLS-0$
					if (item.Type === "NoContent") { //$NON-NLS-0$
						title = messages[item.Type];
						titleClass = "";
					} else if (item.parent.Type === "LocalRoot") { //$NON-NLS-0$
						if (explorer.showHistory) createExpand();
						var branch = item;
						if (branch.Current){
							var span = document.createElement("span"); //$NON-NLS-0$
							span.className = "sectionIcon gitImageSprite git-sprite-branch-active"; //$NON-NLS-0$
							horizontalBox.appendChild(span);
							titleClass = "activeBranch"; //$NON-NLS-0$
						}
						if (branch.Commit) {
							commit = branch.Commit.Children[0];
							var tracksMessage = util.tracksRemoteBranch(branch) ? i18nUtil.formatMessage(messages["tracks"], branch.RemoteLocation[0].Children[0].Name) : messages["tracksNoBranch"];
							description = tracksMessage;
							subDescription = i18nUtil.formatMessage(messages["last modified ${0} by ${1}"], new Date(commit.Time).toLocaleString(), commit.AuthorName); //$NON-NLS-0$
						}
						actionsID = "branchActionsArea"; //$NON-NLS-0$
					} else if (item.parent.Type === "TagRoot") { //$NON-NLS-0$
						if (explorer.showHistory) createExpand();
						if (item.Commit) {
							commit = item.Commit.Children[0];
//							description = util.trimCommitMessage(commit.Message);
//							subDescription = i18nUtil.formatMessage(messages["authored by 0 (1) on 2"], commit.AuthorName, commit.AuthorEmail, new Date(commit.Time).toLocaleString()); //$NON-NLS-0$
						}
						actionsID = "tagActionsArea"; //$NON-NLS-0$
					} else if (item.parent.Type === "StashRoot") { //$NON-NLS-0$
						if (explorer.showHistory) createExpand();
						commit = item;
						title = i18nUtil.formatMessage(messages["stashIndex"], item.parent.children.indexOf(item), item.Message); //$NON-NLS-0$
					} else if (item.parent.Type === "RemoteRoot") { //$NON-NLS-0$
						createExpand();
						if (item.Type !== "TagRoot" && item.Type !== "StashRoot") { //$NON-NLS-1$ //$NON-NLS-0$
							description = item.GitUrl || item.Description || item.parent.repository.ContentLocation;
						}
						actionsID = "remoteActionsArea"; //$NON-NLS-0$
					} else if (item.parent.Type === "Remote") { //$NON-NLS-0$
						if (explorer.showHistory) createExpand();
						actionsID = "branchActionsArea"; //$NON-NLS-0$
						description = "";
					} else if (item.Type === "CommitList") { //$NON-NLS-0$
						tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
					
						setTimeout(function() {
							var parentRow = lib.node(explorer.model.getId(item.parent));
							that.updateExpandVisuals(parentRow, "progress"); //$NON-NLS-0$
							
							var loading = document.createElement("div"); //$NON-NLS-0$
							loading.textContent = messages["Loading..."];
							loading.className = "gitLoading"; //$NON-NLS-0$
							horizontalBox.appendChild(loading);

							horizontalBox.id = "commitListContent" + item.parent.Name; //$NON-NLS-0$
							var commitListExplorer = new mGitCommitList.GitCommitListExplorer({
								serviceRegistry: explorer.registry,
								commandRegistry: explorer.commandService,
								fileClient: explorer.fileClient,
								gitClient: explorer.gitClient,
								progressService: explorer.progressService,
								statusService: explorer.statusService,
								parentId: horizontalBox,
								location: (item.parent.CommitLocation || item.parent.Location) + "?page=1&pageSize=10", //$NON-NLS-0$
								simpleLog: true,
								handleError: explorer.handleError,
								root: {
									Type: "CommitRoot", //$NON-NLS-0$
									repository: explorer.model.root.repository,
									Name: item.parent.Name
								}
							});
						
							commitListExplorer.display().then(function() {
								horizontalBox.classList.add("gitCommitListLoaded"); //$NON-NLS-0$
								that.updateExpandVisuals(parentRow, true);
							}, function() {
								that.updateExpandVisuals(parentRow, true);
							});
						}, 0);
						return td;
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

					var actionsArea = document.createElement("div"); //$NON-NLS-0$
					actionsArea.className = "sectionTableItemActions toolComposite"; //$NON-NLS-0$
					actionsArea.id = actionsID;
					horizontalBox.appendChild(actionsArea);
					this.commandService.renderCommands(this.actionScopeId, actionsArea, item, this.explorer, "tool"); //$NON-NLS-0$	
					return td;
			}
		}
	});
	
	return {
		GitBranchListExplorer: GitBranchListExplorer,
		GitBranchListRenderer: GitBranchListRenderer
	};

});