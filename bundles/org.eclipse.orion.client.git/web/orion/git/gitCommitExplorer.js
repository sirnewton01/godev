/*******************************************************************************
 * @license Copyright (c) 2011, 2013 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window console document Image */

define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/section',
	'orion/git/widgets/gitChangeList',
	'orion/git/widgets/gitTagList',
	'orion/git/widgets/gitCommitInfo',
	'orion/explorers/explorer',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/webui/littlelib',
	'orion/globalCommands',
	'orion/git/gitCommands'
], function(require, messages, mSection, mGitChangeList, mGitTagList, mGitCommitInfo, mExplorer, URITemplate, PageUtil, lib, mGlobalCommands, mGitCommands) {
			var exports = {};
			var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
			exports.GitCommitExplorer = (function() {

				/**
				 * Creates a new Git commit explorer.
				 * 
				 * @class Git commit explorer
				 * @name orion.git.GitCommitExplorer
				 * @param registry
				 * @param commandService
				 * @param linkService
				 * @param selection
				 * @param parentId
				 * @param toolbarId
				 * @param sectionToolsId
				 * @param actionScopeId
				 */
				function GitCommitExplorer(registry, commandService, linkService, selection, parentId, toolbarId, selectionToolsId, actionScopeId) {
					this.parentId = parentId;
					this.registry = registry;
					this.commandService = commandService;
					this.linkService = linkService;
					this.selection = selection;
					this.parentId = parentId;
					this.toolbarId = toolbarId;
					this.selectionToolsId = selectionToolsId;
					this.checkbox = false;
					this.actionScopeId = actionScopeId;
					mExplorer.createExplorerCommands(commandService);
				}

				GitCommitExplorer.prototype.handleError = function(error) {
					var display = {};
					display.Severity = "Error"; //$NON-NLS-0$
					display.HTML = false;
					try {
						var resp = JSON.parse(error.responseText);
						display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
					} catch (Exception) {
						display.Message = error.message;
					}
					this.registry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$

					if (error.status === 404) {
						this.initTitleBar();
						this.displayCommit();
					}
				};

				GitCommitExplorer.prototype.changedItem = function(parent, children) {
					this.redisplay();
				};

				GitCommitExplorer.prototype.redisplay = function() {
					var pageParams = PageUtil.matchResourceParameters();
					this.display(pageParams.resource);
				};

				GitCommitExplorer.prototype.display = function(location) {
					var that = this;
					var progressService = this.registry.getService("orion.page.progress"); //$NON-NLS-0$

					progressService
							.showWhile(this.registry.getService("orion.git.provider").getGitClone(location), "Getting repository details").then( //$NON-NLS-0$
									function(resp) {
										if (resp.Children.length === 0) {
											that.initTitleBar();
											that.displayCommit();
										} else if (resp.Children.length === 1 && resp.Children[0].Type === "Commit") { //$NON-NLS-0$
											var commits = resp.Children;

											progressService
													.progress(
															that.registry.getService("orion.git.provider").getGitClone(resp.CloneLocation), "Getting repository details " + resp.Name).then( //$NON-NLS-0$
													function(resp) {
														var repositories = resp.Children;
														that.initTitleBar(commits[0], repositories[0]);
														that.displayCommit(commits[0]);
														that.displayTags(commits[0], repositories[0]);
														that.displayDiffs(commits[0], repositories[0]);

														commits[0].CloneLocation = repositories[0].Location;

														// render commands
														mGitCommands.updateNavTools(that.registry, that.commandService, that, "pageActions", "selectionTools", commits[0]); //$NON-NLS-1$ //$NON-NLS-0$
													}, function(error) {
														that.handleError(error);
													});
										}
									}, function(error) {
										that.handleError(error);
									});
				};

				GitCommitExplorer.prototype.initTitleBar = function(commit, repository) {
					var that = this;
					var item = {};

					commit.GitUrl = repository.GitUrl;
					commit.ContentLocation = repository.ContentLocation;

					if (commit) {
						item = {};
						item.Name = commit.Name;
						item.Parents = [];
						item.Parents[0] = {};
						item.Parents[0].Name = repository.Name;
						item.Parents[0].Location = repository.Location;
						item.Parents[0].ChildrenLocation = repository.Location;
						item.Parents[1] = {};
						item.Parents[1].Name = messages["Repositories"];
					}
					mGlobalCommands.setPageTarget({ task : "Commit",
					target : commit,
					breadcrumbTarget : item,
					makeBreadcrumbLink : function(seg, location) {
						seg.href = require.toUrl(repoTemplate.expand({resource: location || ""}));
					},
					serviceRegistry : that.registry,
					commandService : that.commandService
					});
				};

				GitCommitExplorer.prototype.displayCommit = function(commit) {

					var tableNode = lib.node('table'); //$NON-NLS-0$
					lib.empty(tableNode);

					if (!commit) {
						var titleWrapper = new mSection.Section(tableNode, { id : "commitSection", //$NON-NLS-0$
						title : messages["No Commits"],
						iconClass : "core-sprite-file" //$NON-NLS-0$
						});
						return;
					}

					var contentParent = document.createElement("div");
					contentParent.className = "sectionTable";
					tableNode.appendChild(contentParent);

					var commitNode = document.createElement("div");
					commitNode.className = "mainPadding";
					commitNode.id = "commitNode";
					contentParent.appendChild(commitNode);
					
					var detailsView = document.createElement("div");
					detailsView.className = "sectionTableItem";
					commitNode.appendChild(detailsView);

					var info = new mGitCommitInfo.GitCommitInfo({
						parent: detailsView,
						commit: commit,
						showTags: false,
						commitLink: false
					});
					info.display();
					
				};

				// Git tags

				GitCommitExplorer.prototype.displayTags = function(commit, repository) {
					var tags = commit.Tags;

					var tableNode = lib.node('table'); //$NON-NLS-0$

					var titleWrapper = new mSection.Section(tableNode, { id : "tagSection", //$NON-NLS-0$
						title : ((tags && tags.length > 0) ? messages["Tags:"] : messages["No Tags"]),
						iconClass : [ "gitImageSprite", "git-sprite-tag" ], //$NON-NLS-1$ //$NON-NLS-0$
						slideout : true,
						content : '<div id="tagNode"></div>', //$NON-NLS-0$
						canHide : true,
						preferenceService : this.registry.getService("orion.core.preference") //$NON-NLS-0$
					});

					var tagsNavigator = new mGitTagList.GitTagListExplorer({
						serviceRegistry: this.registry,
						commandRegistry: this.commandService,
						parentId:"tagNode",
						actionScopeId: this.actionScopeId,
						section: titleWrapper,
						repository: repository,
						mode: "full",
						commit: commit
					});
					tagsNavigator.display();
				};


				// Git diffs

				GitCommitExplorer.prototype.displayDiffs = function(commit, repository) {

					var diffs = commit.Diffs;

					diffs.forEach(function(item) {
						var path = item.OldPath;
						if (item.ChangeType === "ADD") { //$NON-NLS-0$
							path = item.NewPath;
						} 
						item.name = path;
						item.type = item.ChangeType;
					});
					var tableNode = lib.node('table'); //$NON-NLS-0$

					var section = new mSection.Section(tableNode, { id : "diffSection", //$NON-NLS-0$
						title : messages["Diffs"],
						content : '<div id="diffNode"></div>', //$NON-NLS-0$
						canHide : true,
						preferenceService : this.registry.getService("orion.core.preference") //$NON-NLS-0$
					});
					
					if (this.diffNavigator) {
						this.diffNavigator.destroy(); 
					}
					this.diffNavigator = new mGitChangeList.GitChangeListExplorer({
						serviceRegistry: this.registry,
						commandRegistry: this.commandService,
						selection: null,
						parentId:"diffNode",
						actionScopeId: "diffSectionItemActionArea",
						prefix: "diff",
						changes: diffs,
						section: section,
						repository: repository
					});
					this.diffNavigator.display();
				};

				return GitCommitExplorer;
			}());

			return exports;
		}); // end of define
