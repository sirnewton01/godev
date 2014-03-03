/*******************************************************************************
 * @license Copyright (c) 2012, 2013 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document window Image*/
define(['require', 'i18n!git/nls/gitmessages', 'orion/explorers/explorer', 'orion/selection', 'orion/section', 'orion/URITemplate', 'orion/PageUtil', 'orion/webui/littlelib',
		'orion/i18nUtil', 'orion/globalCommands', 'orion/git/uiUtil',	'orion/git/gitCommands', 'orion/Deferred', 'orion/git/widgets/CommitTooltipDialog',
		'orion/webui/tooltip'],
		function(require, messages, mExplorer, mSelection, mSection, URITemplate, PageUtil, lib, i18nUtil, mGlobalCommands, mGitUIUtil, mGitCommands,
				Deferred, mCommitTooltip, Tooltip) {

	var exports = {};
	var conflictTypeStr = "Conflicting"; //$NON-NLS-0$

	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
	var logTemplate = new URITemplate("git/git-log.html#{,resource,params*}?page=1"); //$NON-NLS-0$
	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$

	function isConflict(type) {
		return type === conflictTypeStr;
	}

	var GitStatusModel = (function() {
		function GitStatusModel() {
			this.selectedFileId = undefined;
			this.selectedItem = undefined;
			this.interestedUnstagedGroup = [ "Missing", "Modified", "Untracked", "Conflicting" ]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.interestedStagedGroup = [ "Added", "Changed", "Removed" ]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.conflictPatterns = [
				[ "Both", "Modified", "Added", "Changed", "Missing" ], [ "RemoteDelete", "Untracked", "Removed" ], [ "LocalDelete", "Modified", "Added", "Missing" ] ]; //$NON-NLS-11$ //$NON-NLS-10$ //$NON-NLS-9$ //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.conflictType = "Conflicting"; //$NON-NLS-0$

			this.statusTypeMap = {
				"Missing" : { imageClass: "gitImageSprite git-sprite-removal", tooltip: messages['Unstaged removal'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Removed" : { imageClass: "gitImageSprite git-sprite-removal", tooltip: messages['Staged removal'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Modified" : { imageClass: "gitImageSprite git-sprite-file", tooltip: messages['Unstaged change'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Changed" : { imageClass: "gitImageSprite git-sprite-file", tooltip: messages['Staged change'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Untracked" : { imageClass: "gitImageSprite git-sprite-addition", tooltip: messages["Unstaged addition"] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Added" : { imageClass: "gitImageSprite git-sprite-addition", tooltip: messages["Staged addition"] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				"Conflicting" : { imageClass: "gitImageSprite git-sprite-conflict-file", tooltip: messages['Conflicting'] } //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			};
		}

		GitStatusModel.prototype = {
			destroy: function() {},

			interestedCategory: function() {},

			init: function(jsonData) {
				this.items = jsonData;
			},

			getModelType: function(groupItem, groupName) {
				return groupName;
			},

			_markConflict: function(conflictPattern) {
				// if git status server API response a file with "Modified"
				// ,"Added", "Changed","Missing" states , we treat it as a
				// conflicting file
				// And we add additional attribute to that groupItem :
				// groupItem.Conflicting = true;
				var baseGroup = this.getGroupData(conflictPattern[1]);
				if (!baseGroup)
					return;
				for (var i = 0; i < baseGroup.length; i++) {
					if (baseGroup[i].Conflicting)
						continue;
					var fileLocation = baseGroup[i].Location;
					var itemsInDetectGroup = [];

					for (var j = 2; j < conflictPattern.length; j++) {
						var groupName = conflictPattern[j];
						var groupData = this.getGroupData(groupName);
						if (!groupData)
							continue;
						var item = this._findSameFile(fileLocation, groupData);
						if (item) {
							itemsInDetectGroup.push(item);
						} else {
							continue;
						}
					}

					// we have the same file at "Modified" ,"Added",
					// "Changed","Missing" groups
					if (itemsInDetectGroup.length === (conflictPattern.length - 2)) {
						baseGroup[i].Conflicting = conflictPattern[0];
						for (var k = 0; k < itemsInDetectGroup.length; k++) {
							itemsInDetectGroup[k].Conflicting = "Hide"; //$NON-NLS-0$
						}
					}
				}
			},

			_findSameFile: function(fileLocation, groupData) {
				for (var j = 0; j < groupData.length; j++) {
					if (groupData[j].Conflicting)
						continue;
					if (fileLocation === groupData[j].Location)
						return groupData[j];
				}
				return undefined;
			},

			getGroupData: function(groupName) {
				return this.items[groupName];
			},

			isStaged: function(type) {
				for (var i = 0; i < this.interestedStagedGroup.length; i++) {
					if (type === this.interestedStagedGroup[i]) {
						return true;
					}
				}
				return false;
			},

			getClass: function(type) {
				return this.statusTypeMap[type].imageClass;
			},

			getTooltip: function(type) {
				return this.statusTypeMap[type].tooltip;
			}
		};

		return GitStatusModel;
	}());

	exports.GitStatusExplorer = (function() {
		/**
		 * Creates a new Git status explorer.
		 *
		 * @class Git status explorer
		 * @name orion.git.GitStatusExplorer
		 * @param registry
		 * @param commandService
		 * @param linkService
		 * @param selection
		 * @param parentId
		 * @param toolbarId
		 * @param selectionToolsId
		 * @param actionScopeId
		 */
		function GitStatusExplorer(registry, commandService, linkService, selection, parentId, toolbarId, selectionToolsId, actionScopeId) {
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

		GitStatusExplorer.prototype.handleError = function(error) {
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
				this.displayCommit();
			}
		};

		GitStatusExplorer.prototype.changedItem = function(parent, children) {
			this.redisplay();
		};

		GitStatusExplorer.prototype.redisplay = function() {
			var pageParams = PageUtil.matchResourceParameters();
			this.display(pageParams.resource);
		};

		GitStatusExplorer.prototype.display = function(location) {
			var that = this;
			var progressService = this.registry.getService("orion.page.progress"); //$NON-NLS-0$

			progressService
				.progress(this.registry.getService("orion.git.provider").getGitStatus(location), messages['Loading...']).then( //$NON-NLS-0$
				function(resp) {
					if (resp.Type === "Status") { //$NON-NLS-0$
						var status = resp;
						that._model = new GitStatusModel();
						that._model.init(status);

						progressService
							.progress(
								that.registry.getService("orion.git.provider").getGitClone(status.CloneLocation), "Getting repository information").then( //$NON-NLS-0$
								function(resp) {
									var repositories = resp.Children;

									progressService
										.progress(
											that.registry
												.getService("orion.git.provider").getGitCloneConfig(repositories[0].ConfigLocation), "Getting repository configuration ", repositories[0].Name).then( //$NON-NLS-0$
												function(resp) {
													var config = resp.Children;

													status.Clone = repositories[0];
													status.Clone.Config = [];

													for (var i = 0; i < config.length; i++) {
														if (config[i].Key === "user.name" || config[i].Key === "user.email") //$NON-NLS-1$ //$NON-NLS-0$
															status.Clone.Config.push(config[i]);
													}

													var tableNode = lib.node('table'); //$NON-NLS-0$
													lib.empty(tableNode);
													that.initTitleBar(status, repositories[0]);
													that.displayUnstaged(status, repositories[0]);
													that.displayStaged(status, repositories[0]);
													that.displayCommits(repositories[0]);

													// render
													// commands
													mGitCommands.updateNavTools(that.registry, that.commandService, that,
														"pageActions", "selectionTools", status); //$NON-NLS-1$ //$NON-NLS-0$
												}, function(error) {
													that.handleError(error);
												});
								}, function(error) {
									that.handleError(error);
								});
					}
				}, function(error) {
					that.handleError(error);
				});
		};

		GitStatusExplorer.prototype.initTitleBar = function(status, repository) {
			var item = {};

			// TODO add info about branch or detached
			item.Name = messages["Status"] + ((status.RepositoryState && status.RepositoryState.indexOf("REBASING") !== -1) ? messages[" (Rebase in Progress)"] : ""); //$NON-NLS-1$
			item.Parents = [];
			item.Parents[0] = {};
			item.Parents[0].Name = repository.Name;
			item.Parents[0].Location = repository.Location;
			item.Parents[0].ChildrenLocation = repository.Location;
			item.Parents[1] = {};
			item.Parents[1].Name = messages.Repo;

			mGlobalCommands.setPageTarget({
				task : messages["Status"],
				target : repository,
				breadcrumbTarget : item,
				makeBreadcrumbLink : function(seg, location) {
					seg.href = require.toUrl(repoTemplate.expand({resource: location || ""})); //$NON-NLS-0$
				},
				serviceRegistry : this.registry,
				commandService : this.commandService
			});
		};

		// helpers

		GitStatusExplorer.prototype._sortBlock = function(interestedGroup) {
			var retValue = [];
			for (var i = 0; i < interestedGroup.length; i++) {
				var groupName = interestedGroup[i];
				var groupData = this._model.getGroupData(groupName);
				if (!groupData)
					continue;
				for (var j = 0; j < groupData.length; j++) {
					var renderType = this._model.getModelType(groupData[j], groupName);
					if (renderType) {
						retValue.push({
							name : groupData[j].Name,
							type : renderType,
							location : groupData[j].Location,
							path : groupData[j].Path,
							commitURI : groupData[j].Git.CommitLocation,
							indexURI : groupData[j].Git.IndexLocation,
							diffURI : groupData[j].Git.DiffLocation,
							CloneLocation : this._model.items.CloneLocation,
							conflicting : isConflict(renderType)
						});
					}
				}
			}
			retValue.sort(function(a, b) {
				var n1 = a.name && a.name.toLowerCase();
				var n2 = b.name && b.name.toLowerCase();
				if (n1 < n2) {
					return -1;
				}
				if (n1 > n2) {
					return 1;
				}
				return 0;
			});
			return retValue;
		};

		// Git unstaged changes

		GitStatusExplorer.prototype.displayUnstaged = function(status, repository) {
			var that = this;
			var unstagedSortedChanges = this._sortBlock(this._model.interestedUnstagedGroup);
			var tableNode = lib.node('table'); //$NON-NLS-0$
			var unstagedSection = new mSection.Section(tableNode, {
				id : "unstagedSection", //$NON-NLS-0$
				title : unstagedSortedChanges.length > 0 ? messages['Unstaged'] : messages["No Unstaged Changes"],
				content : '<div id="unstagedNode"></div>', //$NON-NLS-0$
				canHide : true,
				onExpandCollapse : function(isExpanded, section) {
					that.commandService.destroy(section.selectionNode);
					if (isExpanded) {
						that.commandService.renderCommands(section.selectionNode.id, section.selectionNode, null, that, "button", {"Clone" : repository}); //$NON-NLS-1$ //$NON-NLS-0$
					}
				}
			});

			this.commandService.registerCommandContribution(unstagedSection.actionsNode.id, "orion.explorer.expandAll", 200); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(unstagedSection.actionsNode.id, "orion.explorer.collapseAll", 300); //$NON-NLS-1$ //$NON-NLS-0$

			this.commandService.registerCommandContribution(unstagedSection.selectionNode.id, "eclipse.orion.git.showPatchCommand", 100); //$NON-NLS-0$
			this.commandService.registerCommandContribution(unstagedSection.selectionNode.id, "eclipse.orion.git.stageCommand", 200); //$NON-NLS-0$
			this.commandService.registerCommandContribution(unstagedSection.selectionNode.id, "eclipse.orion.git.checkoutCommand", 300); //$NON-NLS-0$

			if (!this.unstagedOnce) {
				if (!this.unstagedSelection) {
					this.unstagedSelection = new mSelection.Selection(this.registry, "orion.unstagedSection.selection"); //$NON-NLS-0$
					this.commandService.registerSelectionService(unstagedSection.selectionNode.id, this.unstagedSelection);
				}

				this.registry.getService("orion.unstagedSection.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					var selectionTools = lib.node(unstagedSection.selectionNode.id);
					if (selectionTools) {
						that.commandService.destroy(selectionTools);
						that.commandService.renderCommands(unstagedSection.selectionNode.id, selectionTools, event.selections, that,
							"button", {"Clone" : repository}); //$NON-NLS-1$ //$NON-NLS-0$
					}
				});
				this.unstagedOnce = true;
			}

			this.commandService.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.stageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$

			var UnstagedModel = (function() {
				function UnstagedModel() {}

				UnstagedModel.prototype = {
					destroy : function() {},

					getRoot : function(onItem) {
						onItem(unstagedSortedChanges);
					},

					getChildren : function(parentItem, onComplete) {
						if (parentItem instanceof Array && parentItem.length > 0) {
							onComplete(parentItem);
						} else if (mGitUIUtil.isChange(parentItem)) {
							if (!parentItem.children) {// lazy creation,
														// this is required
														// for selection
														// model to be able
														// to traverse into
														// children
								parentItem.children = [];
								parentItem.children.push({ "diffUri" : parentItem.diffURI, "Type" : "Diff", parent : parentItem}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							}
							onComplete(parentItem.children); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						} else {
							onComplete([]);
						}
					},

					getId : function(/* item */item) {
						if (item instanceof Array && item.length > 0) {
							return "unstagedRoot"; //$NON-NLS-0$
						} else if (mGitUIUtil.isChange(item)) {
							return "unstaged" + item.name; //$NON-NLS-0$
						} else {
							return "unstaged" + item.diffUri; //$NON-NLS-0$
						}
					}
				};

				return UnstagedModel;
			}());

			var UnstagedRenderer = (function() {
				function UnstagedRenderer(options, explorer) {
					this._init(options);
					this.options = options;
					this.explorer = explorer;
					this.registry = options.registry;
				}

				UnstagedRenderer.prototype = new mExplorer.SelectionRenderer();

				UnstagedRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
					switch (col_no) {
						case 0:
							if (mGitUIUtil.isChange(item)) {
								var td = document.createElement("td"); //$NON-NLS-0$
								var div = document.createElement("div"); //$NON-NLS-0$
								div.className = "sectionTableItem"; //$NON-NLS-0$
								td.appendChild(div);

								this.getExpandImage(tableRow, div);

								var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;

								var diffActionWrapper = document.createElement("span"); //$NON-NLS-0$
								diffActionWrapper.id = "unstaged" + item.name + "DiffActionWrapper"; //$NON-NLS-0$
								diffActionWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
								div.appendChild(diffActionWrapper);

								that.commandService.destroy(diffActionWrapper);
								that.commandService.renderCommands(
											"DefaultActionWrapper", diffActionWrapper, item, that, "tool", null, navGridHolder); //$NON-NLS-1$ //$NON-NLS-0$

								var icon = document.createElement("span"); //$NON-NLS-0$
								icon.className = that._model.getClass(item.type);
								icon.commandTooltip = new Tooltip.Tooltip({
									node: icon,
									text: that._model.getTooltip(item.type),
									position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								});
								div.appendChild(icon);

								var itemLabel = document.createElement("span"); //$NON-NLS-0$
								itemLabel.textContent = item.name;
								div.appendChild(itemLabel);

								return td;
							} else {
								// render the compare widget
								var td = document.createElement("td"); //$NON-NLS-0$
								td.colSpan = 2;

								var div = document.createElement("div"); //$NON-NLS-0$
								div.className = "sectionTableItem"; //$NON-NLS-0$
								td.appendChild(div);

								var compareWidgetActionWrapper = document.createElement("div"); //$NON-NLS-0$
								compareWidgetActionWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
								compareWidgetActionWrapper.id = "unstaged" + item.parent.name + "CompareWidgetActionWrapper"; //$NON-NLS-1$ //$NON-NLS-0$
								div.appendChild(compareWidgetActionWrapper);

								var diffContainer = document.createElement("div"); //$NON-NLS-0$
								diffContainer.id = "diffArea_" + item.diffUri; //$NON-NLS-0$
								diffContainer.style.height = "420px"; //$NON-NLS-0$
								diffContainer.style.border = "1px solid lightgray"; //$NON-NLS-0$
								diffContainer.style.overflow = "hidden"; //$NON-NLS-0$
								div.appendChild(diffContainer);

								var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
								mGitUIUtil.createCompareWidget(
									that.registry,
									that.commandService,
									item.diffUri,
									isConflict(item.parent.type),
									diffContainer,
									compareWidgetActionWrapper.id,
									true, //editableInComparePage
									{navGridHolder: navGridHolder} //gridRenderer
								);

								return td;
							}

							break;
					}
				};

				return UnstagedRenderer;
			}());

			var UnstagedNavigator = (function() {
				function UnstagedNavigator(registry, selection, parentId, actionScopeId) {
					this.registry = registry;
					this.checkbox = false;
					this.parentId = parentId;
					this.selection = selection;
					this.actionScopeId = actionScopeId;
					this.renderer = new UnstagedRenderer({ registry : this.registry,/*
																					 * actionScopeId:
																					 * sectionItemActionScopeId,
																					 */
					cachePrefix : "UnstagedNavigator", checkbox : false}, this); //$NON-NLS-0$
					this.createTree(this.parentId, new UnstagedModel(), { setFocus : true
					});
				}

				UnstagedNavigator.prototype = new mExplorer.Explorer();

				// provide to the selection model that if a row is
				// selectable
				UnstagedNavigator.prototype.isRowSelectable = function(modelItem) {
					return mGitUIUtil.isChange(modelItem);
				};
				// provide to the expandAll/collapseAll commands
				UnstagedNavigator.prototype.getItemCount = function() {
					return unstagedSortedChanges.length;
				};
				return UnstagedNavigator;
			}());

			var unstagedNavigator = new UnstagedNavigator(this.registry, this.unstagedSelection, "unstagedNode" /*
																												 * ,
																												 * sectionItemActionScopeId
																												 */); //$NON-NLS-0$
			this.commandService.renderCommands(unstagedSection.actionsNode.id, unstagedSection.actionsNode.id, unstagedNavigator, unstagedNavigator,
				"button"); //$NON-NLS-0$
		};

		// Git staged changes

		GitStatusExplorer.prototype.displayStaged = function(status, repository) {
			var that = this;
			var stagedSortedChanges = this._sortBlock(this._model.interestedStagedGroup);
			var tableNode = lib.node('table'); //$NON-NLS-0$
			var stagedSection = new mSection.Section(tableNode, {
				id : "stagedSection", //$NON-NLS-0$
				title : stagedSortedChanges.length > 0 ? messages['Staged'] : messages["No Staged Changes"],
				content : '<div id="stagedNode"></div>', //$NON-NLS-0$
				slideout : true,
				canHide : true,
				onExpandCollapse : function(isExpanded, section) {
					that.commandService.destroy(section.selectionNode);
					if (isExpanded) {
						that.commandService.renderCommands(section.selectionNode.id, section.selectionNode, null, that, "button", { "Clone" : repository}); //$NON-NLS-0$ //$NON-NLS-1$
					}
				}
			});

			this.commandService.registerCommandContribution(stagedSection.actionsNode.id, "eclipse.orion.git.commitCommand", 100); //$NON-NLS-0$
			this.commandService.registerCommandContribution(stagedSection.actionsNode.id, "orion.explorer.expandAll", 200); //$NON-NLS-0$
			this.commandService.registerCommandContribution(stagedSection.actionsNode.id, "orion.explorer.collapseAll", 300); //$NON-NLS-0$
			this.commandService.registerCommandContribution(stagedSection.selectionNode.id, "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-0$

			if (!this.stagedOnce) {
				if (!this.stagedSelection) {
					this.stagedSelection = new mSelection.Selection(this.registry, "orion.stagedSection.selection"); //$NON-NLS-0$
					this.commandService.registerSelectionService(stagedSection.selectionNode.id, this.stagedSelection);
				}

				this.registry.getService("orion.stagedSection.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					var selectionTools = lib.node(stagedSection.selectionNode.id);
					if (selectionTools) {
						that.commandService.destroy(selectionTools);
						that.commandService.renderCommands(stagedSection.selectionNode.id, selectionTools, event.selections, that,
							"button", {"Clone" : repository}); //$NON-NLS-1$ //$NON-NLS-0$
					}
				});
				this.stagedOnce = true;
			}

			this.commandService.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$

			var StagedModel = (function() {
				function StagedModel() {}

				StagedModel.prototype = {
					destroy : function() {},

					getRoot : function(onItem) {
						onItem(stagedSortedChanges);
					},

					getChildren : function(parentItem, onComplete) {
						if (parentItem instanceof Array && parentItem.length > 0) {
							onComplete(parentItem);
						} else if (mGitUIUtil.isChange(parentItem)) {
							if (!parentItem.children) {// lazy creation,
														// this is required
														// for selection
														// model to be able
														// to trverse into
														// children
								parentItem.children = [];
								parentItem.children.push({ "diffUri" : parentItem.diffURI, "Type" : "Diff", parent : parentItem});//$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							}
							onComplete(parentItem.children);
						} else {
							onComplete([]);
						}
					},

					getId : function(/* item */item) {
						if (item instanceof Array && item.length > 0) {
							return "stagedRoot"; //$NON-NLS-0$
						} else if (mGitUIUtil.isChange(item)) {
							return "staged" + item.name; //$NON-NLS-0$
						} else {
							return "staged" + item.diffUri; //$NON-NLS-0$
						}
					}
				};

				return StagedModel;
			}());

			var StagedRenderer = (function() {
				function StagedRenderer(options, explorer) {
					this._init(options);
					this.options = options;
					this.explorer = explorer;
					this.registry = options.registry;
				}

				StagedRenderer.prototype = new mExplorer.SelectionRenderer();

				StagedRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
					switch (col_no) {
						case 0:
							if (mGitUIUtil.isChange(item)) {
								var td = document.createElement("td"); //$NON-NLS-0$
								var div = document.createElement("div"); //$NON-NLS-0$
								div.className = "sectionTableItem"; //$NON-NLS-0$
								td.appendChild(div);

								this.getExpandImage(tableRow, div);

								var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;

								var diffActionWrapper = document.createElement("span"); //$NON-NLS-0$
								diffActionWrapper.id = "staged" + item.name + "DiffActionWrapper"; //$NON-NLS-0$
								diffActionWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
								div.appendChild(diffActionWrapper);

								that.commandService.destroy(diffActionWrapper);
								that.commandService.renderCommands(
									"DefaultActionWrapper", diffActionWrapper, item, that, "tool", null, navGridHolder); //$NON-NLS-1$ //$NON-NLS-0$

								var icon = document.createElement("span"); //$NON-NLS-0$
								icon.className = that._model.getClass(item.type);
								icon.commandTooltip = new Tooltip.Tooltip({
									node: icon,
									text: that._model.getTooltip(item.type),
									position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
								});
								div.appendChild(icon);

								var itemLabel = document.createElement("span"); //$NON-NLS-0$
								itemLabel.textContent = item.name;
								div.appendChild(itemLabel);

								return td;
							} else {
								// render the compare widget
								var td = document.createElement("td"); //$NON-NLS-0$
								td.colSpan = 2;

								var div = document.createElement("div"); //$NON-NLS-0$
								div.className = "sectionTableItem"; //$NON-NLS-0$
								td.appendChild(div);

								var compareWidgetActionWrapper = document.createElement("div"); //$NON-NLS-0$
								compareWidgetActionWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
								compareWidgetActionWrapper.id = "staged" + item.parent.name + "CompareWidgetActionWrapper"; //$NON-NLS-1$ //$NON-NLS-0$
								div.appendChild(compareWidgetActionWrapper);

								var diffContainer = document.createElement("div"); //$NON-NLS-0$
								diffContainer.id = "diffArea_" + item.diffUri; //$NON-NLS-0$
								diffContainer.style.height = "420px"; //$NON-NLS-0$
								diffContainer.style.border = "1px solid lightgray"; //$NON-NLS-0$
								diffContainer.style.overflow = "hidden"; //$NON-NLS-0$
								div.appendChild(diffContainer);

								var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
								var hasConflict = isConflict(item.parent.type);
								mGitUIUtil.createCompareWidget(
									that.registry,
									that.commandService,
									item.diffUri,
									isConflict(item.parent.type),
									diffContainer,
									compareWidgetActionWrapper.id,
									false, //editableInComparePage
									{navGridHolder: navGridHolder} //gridRenderer
								);

								return td;
							}

							break;
					}
				};

				return StagedRenderer;
			}());

			var StagedNavigator = (function() {
				function StagedNavigator(registry, selection, parentId, actionScopeId) {
					this.registry = registry;
					this.checkbox = false;
					this.parentId = parentId;
					this.status = status;
					this.selection = selection;
					this.actionScopeId = actionScopeId;
					this.renderer = new StagedRenderer({ registry : this.registry, /*
																					* actionScopeId:
																					* sectionItemActionScopeId,
																					*/
					cachePrefix : "StagedNavigator", checkbox : false}, this); //$NON-NLS-0$
					this.createTree(this.parentId, new StagedModel());
				}

				StagedNavigator.prototype = new mExplorer.Explorer();

				// provide to the selection model that if a row is
				// selectable
				StagedNavigator.prototype.isRowSelectable = function(modelItem) {
					return mGitUIUtil.isChange(modelItem);
				};
				// provide to the expandAll/collapseAll commands
				StagedNavigator.prototype.getItemCount = function() {
					return stagedSortedChanges.length;
				};
				return StagedNavigator;
			}());

			var stagedNavigator = new StagedNavigator(this.registry, this.stagedSelection, "stagedNode" /*
																										 * ,
																										 * sectionItemActionScopeId
																										 */); //$NON-NLS-0$
			this.commandService.renderCommands(stagedSection.actionsNode.id, stagedSection.actionsNode.id, stagedNavigator, stagedNavigator, "button"); //$NON-NLS-0$
		};

		// Git commits

		GitStatusExplorer.prototype.displayCommits = function(repository) {
			var that = this;
			var tableNode = lib.node('table'); //$NON-NLS-0$
			var titleWrapper = new mSection.Section(tableNode, {
				id : "commitSection", //$NON-NLS-0$
				title : messages['Commits'],
				content : '<div id="commitNode" class="mainPadding"></div>', //$NON-NLS-0$
				slideout : true,
				canHide : true,
				preferenceService : this.registry.getService("orion.core.preference") //$NON-NLS-0$
			});

			var progress = titleWrapper.createProgressMonitor();

			progress.begin(messages['Getting current branch']);
			this.registry
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

						titleWrapper.setTitle(i18nUtil.formatMessage(messages["Commits for \"${0}\" branch"], currentBranch.Name));
						that.commandService.destroy(titleWrapper.actionsNode.id);
						that.commandService.registerCommandContribution(titleWrapper.actionsNode.id,
								"eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
						that.commandService.renderCommands(
							titleWrapper.actionsNode.id,
							titleWrapper.actionsNode.id,
							{	"ViewAllLink" : logTemplate.expand({resource: currentBranch.CommitLocation}),
								"ViewAllLabel" : messages['See Full Log'],
								"ViewAllTooltip" : messages["See the full log"]
							}, that, "button"); //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

						if (tracksRemoteBranch) {
							that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.fetch", 100); //$NON-NLS-0$
							that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.merge", 100); //$NON-NLS-0$
							that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.rebase", 100); //$NON-NLS-0$
							that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.resetIndex", 100); //$NON-NLS-0$
							that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id,
								currentBranch.RemoteLocation[0].Children[0], that, "button"); //$NON-NLS-0$
						}

						that.commandService.addCommandGroup(titleWrapper.actionsNode.id, "eclipse.gitPushGroup", 1000, "Push", null, null, null, "Push", null, "eclipse.orion.git.push"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.push", 1100, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.pushBranch", 1200, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						that.commandService.registerCommandContribution(titleWrapper.actionsNode.id, "eclipse.orion.git.pushToGerrit", 1200, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
						
						that.commandService.renderCommands(titleWrapper.actionsNode.id, titleWrapper.actionsNode.id, currentBranch, that, "button"); //$NON-NLS-0$

						if (currentBranch.RemoteLocation[0] === null) {
							progress.done();
							that.renderNoCommit();
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
									function(resp) {
										progress.worked(messages['Rendering commits']);

										var commitsCount = resp.Children.length;

										for (var i = 0; i < resp.Children.length; i++) {
											that.renderCommit(resp.Children[i], true, i);
										}

										progress.worked(messages['Getting outgoing commits']);
										that.registry
											.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(currentBranch.CommitLocation + "?page=1&pageSize=20", currentBranch.RemoteLocation[0].Children[0].Id), messages['Getting outgoing commits']).then( //$NON-NLS-1$ //$NON-NLS-0$
											function(resp) {
												progress.worked(messages['Rendering commits']);
												for (var i = 0; i < resp.Children.length; i++) {
													that.renderCommit(resp.Children[i], false, i + commitsCount);
												}

												commitsCount = commitsCount + resp.Children.length;

												if (commitsCount === 0) {
													that.renderNoCommit();
												}

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
								function(resp) {
									progress.worked(messages['Rendering commits']);
									for (var i = 0; i < resp.Children.length; i++) {
										that.renderCommit(resp.Children[i], true, i);
									}

									if (resp.Children.length === 0) {
										that.renderNoCommit();
									}

									progress.done();
								}, function(error) {
									progress.done(error);
								}
							);
						}
					},
					that.handleError.bind(that));
		};

		GitStatusExplorer.prototype.renderNoCommit = function() {
			var commitNode = lib.node("commitNode"); //$NON-NLS-0$
			commitNode.innerHTML = ""; //$NON-NLS-0$
			var sectionItem = document.createElement("div"); //$NON-NLS-0$
			sectionItem.className = "sectionTableItem"; //$NON-NLS-0$
			commitNode.appendChild(sectionItem);

			var detailsView = document.createElement("div"); //$NON-NLS-0$
			sectionItem.appendChild(detailsView);

			var title = document.createElement("div"); //$NON-NLS-0$
			title.appendChild(document.createTextNode(messages['The branch is up to date.']));
			detailsView.appendChild(title);

			var description = document.createElement("div"); //$NON-NLS-0$
			description.appendChild(document.createTextNode(messages['You have no outgoing or incoming commits.']));
			detailsView.appendChild(description);
		};

		GitStatusExplorer.prototype.renderCommit = function(commit, outgoing, index) {
			var commitNode = lib.node("commitNode"); //$NON-NLS-0$
			var sectionItem = document.createElement("div"); //$NON-NLS-0$
			sectionItem.className = "sectionTableItem lightTreeTableRow"; //$NON-NLS-0$
			commitNode.appendChild(sectionItem);

			var horizontalBox = document.createElement("div"); //$NON-NLS-0$
			horizontalBox.className = "sectionTableItem"; //$NON-NLS-0$
			horizontalBox.style.overflow = "hidden"; //$NON-NLS-0$
			sectionItem.appendChild(horizontalBox);

			var imgSpriteName = (outgoing ? "git-sprite-outgoing-commit" : "git-sprite-incoming-commit"); //$NON-NLS-1$ //$NON-NLS-0$

			var direction = document.createElement("span"); //$NON-NLS-0$
			direction.className = "sectionIcon gitImageSprite " + imgSpriteName; //$NON-NLS-0$
			horizontalBox.appendChild(direction);

			if (commit.AuthorImage) {
				var authorImage = document.createElement("div"); //$NON-NLS-0$
				authorImage.style['float'] = "left"; //$NON-NLS-0$
				var image = new Image();
				image.src = commit.AuthorImage;
				image.name = commit.AuthorName;
				image.className = "git-author-icon"; //$NON-NLS-0$
				authorImage.appendChild(image);
				horizontalBox.appendChild(authorImage);
			}

			var detailsView = document.createElement("div"); //$NON-NLS-0$
			detailsView.className = "stretch"; //$NON-NLS-0$
			horizontalBox.appendChild(detailsView);

			var titleLink = document.createElement("a"); //$NON-NLS-0$
			titleLink.className = "navlinkonpage"; //$NON-NLS-0$
			titleLink.href = require.toUrl(commitTemplate.expand({resource: commit.Location})); //$NON-NLS-0$
			titleLink.textContent = commit.Message;
			detailsView.appendChild(titleLink);

			new mCommitTooltip.CommitTooltipDialog({commit: commit, triggerNode: titleLink});

			var description = document.createElement("div"); //$NON-NLS-0$
			description.textContent = " (SHA " + commit.Name + ") by " + commit.AuthorName //$NON-NLS-1$ //$NON-NLS-0$
				+ " on " + new Date(commit.Time).toLocaleString(); //$NON-NLS-0$
			detailsView.appendChild(description);
		};

		return GitStatusExplorer;
	}());

	return exports;
}); // end of define