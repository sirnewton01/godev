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
	'orion/i18nUtil',
	'orion/Deferred',
	'orion/explorers/explorer',
	'orion/git/uiUtil',
	'orion/git/util',
	'orion/webui/tooltip',
	'orion/selection',
	'orion/webui/littlelib',
	'orion/git/gitCommands',
	'orion/commands',
	'orion/git/logic/gitCommit',
	'orion/objects'
], function(messages, i18nUtil, Deferred, mExplorer, mGitUIUtil, mGitUtil, mTooltip, mSelection , lib, mGitCommands, mCommands, gitCommit, objects) {
	
	var interestedUnstagedGroup = [ "Missing", "Modified", "Untracked", "Conflicting" ]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var interestedStagedGroup = [ "Added", "Changed", "Removed" ]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var allGroups = interestedUnstagedGroup.concat(interestedStagedGroup);
	var conflictType = "Conflicting"; //$NON-NLS-0$
	function isConflict(type) {
		return type === conflictType;
	}
	
	var statusTypeMap = {
		"Missing" : { imageClass: "gitImageSprite git-sprite-removal", tooltip: messages['Unstaged removal'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Removed" : { imageClass: "gitImageSprite git-sprite-removal", tooltip: messages['Staged removal'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Modified" : { imageClass: "gitImageSprite git-sprite-file", tooltip: messages['Unstaged change'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Changed" : { imageClass: "gitImageSprite git-sprite-file", tooltip: messages['Staged change'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Untracked" : { imageClass: "gitImageSprite git-sprite-addition", tooltip: messages["Unstaged addition"] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Added" : { imageClass: "gitImageSprite git-sprite-addition", tooltip: messages["Staged addition"] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"Conflicting" : { imageClass: "gitImageSprite git-sprite-conflict-file", tooltip: messages['Conflicting'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		"ADD" : { imageClass: "gitImageSprite git-sprite-addition", tooltip: messages['Addition'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"MODIFY" : { imageClass: "gitImageSprite git-sprite-file", tooltip: messages['Deletion'] }, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"DELETE" : { imageClass: "gitImageSprite git-sprite-removal", tooltip: messages['Diffs'] } //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
			
	function GitChangeListModel(options) {
		this.changes = options.changes;
		this.registry = options.registry;
		this.prefix = options.prefix;
		this.location = options.location;
		this.commitName = options.commitName;
		this.repository = options.repository;
		this.handleError = options.handleError;
		this.changes = options.changes;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
		this.section = options.section;
	}
	GitChangeListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitChangeListModel.prototype, /** @lends orion.git.GitChangeListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.changes || (this.root || (this.root = {Type: "Root"}))); //$NON-NLS-0$
		},
		getGroups: function(prefix) {
			switch(prefix) {
				case "all": //$NON-NLS-0$
					return allGroups;
				case "staged": //$NON-NLS-0$
					return interestedStagedGroup;
				case "unstaged": //$NON-NLS-0$
					return interestedUnstagedGroup;
			}
		},
		_processDiffs: function(diffs) {
			diffs.forEach(function(item) {
				var path = item.OldPath;
				if (item.ChangeType === "ADD") { //$NON-NLS-0$
					path = item.NewPath;
				} 
				item.name = path;
				item.type = item.ChangeType;
			});
			if (diffs.length > 0) {
				diffs.unshift({Type: "ExplorerSelection", selectable: true}); //$NON-NLS-0$
			}
			return diffs;
		},
		processChildren: function(parentItem, children) {
			parentItem.children = children;
			children.forEach(function(child) {
				child.parent = parentItem;
			});
			return children;
		},
		getChildren: function(parentItem, onComplete){
			var that = this;
			if (parentItem.children) {
				onComplete(parentItem.children);
			} else if (parentItem instanceof Array && parentItem.length > 0) {
				onComplete(that.processChildren(parentItem, this._processDiffs(parentItem.slice(0))));
			} else if (parentItem.Type === "Root") { //$NON-NLS-0$
				var location = this.location; 
				var progressService = this.progressService;
				var gitClient = this.gitClient;
				var progress = this.section.createProgressMonitor();
				progress.begin(messages["Getting changes"]);
				var repository = that.repository;
				if (location) {
					function doDiff(loc) {
						gitClient.doGitDiff(loc + "?parts=diffs").then(function(resp) { //$NON-NLS-0$
							progress.done();
							onComplete(that.processChildren(parentItem, that._processDiffs(resp.Children)));
						}, function(error) {
							progress.done();
							that.handleError(error);
						});
					}
					if (this.commitName) {
						gitClient.getDiff(location, this.commitName).then(function(resp) {
							doDiff(resp.Location);
						}, function(error) {
							progress.done();
							that.handleError(error);
						});
					} else {
						doDiff(location);
					}
					return;
				}
				location = repository.StatusLocation;
				Deferred.when(repository.status || (repository.status = progressService.progress(gitClient.getGitStatus(location), messages["Getting changes"])), function(resp) {//$NON-NLS-0$
					var status = that.status = that.items = resp;
					Deferred.when(that.repository || progressService.progress(gitClient.getGitClone(status.CloneLocation), messages["Getting git repository details"]), function(resp) {
						var repository = resp.Children ? resp.Children[0] : resp;
						repository.status = status;
						progressService.progress(gitClient.getGitCloneConfig(repository.ConfigLocation), "Getting repository configuration ", repository.Name).then(function(resp) { //$NON-NLS-0$
							var config = resp.Children;
												
							status.Clone = repository;
							status.Clone.Config = [];

							for (var i = 0; i < config.length; i++) {
								if (config[i].Key === "user.name" || config[i].Key === "user.email") //$NON-NLS-1$ //$NON-NLS-0$
									status.Clone.Config.push(config[i]);
							}
							var children = that._sortBlock(that.getGroups(that.prefix));
							if (that.prefix === "all") { //$NON-NLS-0$
								if (children.length > 0) {
									children.unshift({Type: "ExplorerSelection", selectable: true}); //$NON-NLS-0$
								}
								children.unshift({Type: "CommitMsg", selectable: false}); //$NON-NLS-0$
							}
							progress.done();
							onComplete(that.processChildren(parentItem, children));
						}, function(error) {
							progress.done();
							that.handleError(error);
						});
					}, function(error) {
						progress.done();
						that.handleError(error);
					});
				}, function(error) {
					progress.done();
					that.handleError(error);
				});
			} else if (mGitUIUtil.isChange(parentItem) || parentItem.Type === "Diff") { //$NON-NLS-0$
				// lazy creation, this is required for selection  model to be able to traverse into children
				if (!parentItem.children) {
					parentItem.children = [];
					parentItem.children.push({ DiffLocation : parentItem.DiffLocation, Type : "Compare", parent : parentItem, selectable: this.prefix !== "all"}); //$NON-NLS-1$ //$NON-NLS-0$
				}
				onComplete(parentItem.children);
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			var prefix = this.prefix;
			if (item instanceof Array && item.length > 0 || item.Type === "Root") { //$NON-NLS-0$
				return prefix + "Root"; //$NON-NLS-0$
			} else if (mGitUIUtil.isChange(item)) {
				return  prefix + item.type + item.name; 
			} else if (item.Type === "ExplorerSelection" || item.Type === "CommitMsg") { //$NON-NLS-1$ //$NON-NLS-0$
				return prefix + item.Type;
			} else {
				return  prefix + item.type + item.DiffLocation;
			}
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
				if (itemsInDetectGroup.length === Math.max(0, conflictPattern.length - 2)) {
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
		_sortBlock: function(interestedGroup) {
			var retValue = [];
			for (var i = 0; i < interestedGroup.length; i++) {
				var groupName = interestedGroup[i];
				var groupData = this.getGroupData(groupName);
				if (!groupData)
					continue;
				for (var j = 0; j < groupData.length; j++) {
					var renderType = this.getModelType(groupData[j], groupName);
					if (renderType) {
						retValue.push({
							name : groupData[j].Name,
							type : renderType,
							location : groupData[j].Location,
							path : groupData[j].Path,
							commitURI : groupData[j].Git.CommitLocation,
							indexURI : groupData[j].Git.IndexLocation,
							DiffLocation : groupData[j].Git.DiffLocation,
							CloneLocation : this.items.CloneLocation, //will die here
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
		},
		getGroupData: function(groupName) {
			return this.items[groupName];
		},
		isStaged: function(type) {
			for (var i = 0; i < interestedStagedGroup.length; i++) {
				if (type === interestedStagedGroup[i]) {
					return true;
				}
			}
			return false;
		},
		getClass: function(item) {
			return statusTypeMap[item.type].imageClass;
		},
		getTooltip: function(item) {
			return statusTypeMap[item.type].tooltip;
		}
	});
	
	/**
	 * @class orion.git.GitChangeListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitChangeListExplorer(options) {
		this.checkbox = options.prefix === "all"; //$NON-NLS-0$
		var renderer = new GitChangeListRenderer({
			noRowHighlighting: true,
			registry: options.serviceRegistry,
			commandService: options.commandRegistry,
			actionScopeId: options.actionScopeId,
			cachePrefix: options.prefix + "Navigator", //$NON-NLS-0$
			checkbox: this.checkbox}, this);
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.prefix = options.prefix;
		this.changes = options.changes;
		this.commit = options.commit;
		this.section = options.section;
		this.location = options.location;
		this.commitName = options.commitName;
		this.repository = options.repository;
		this.editableInComparePage = options.editableInComparePage;
		this.handleError = options.handleError;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
		this.preferencesService = options.preferencesService;
		this.explorerSelectionScope = "explorerSelection";  //$NON-NLS-0$
		this.explorerSelectionStatus = "explorerSelectionStatus";  //$NON-NLS-0$
		this.createSelection();
		this.createCommands();
		if (this.prefix !== "all") { //$NON-NLS-0$
			this.updateCommands();
		}
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", this._modelListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "commit": //$NON-NLS-0$
			case "stash": //$NON-NLS-0$
				if (this.messageTextArea) {
					this.messageTextArea.value = ""; //$FALLTHROUGH$
				}
			case "reset": //$NON-NLS-0$
			case "applyPatch":  //$NON-NLS-0$
			case "stage": //$NON-NLS-0$
			case "unstage": //$NON-NLS-0$
			case "checkoutFile": //$NON-NLS-0$
			case "applyStash": //$NON-NLS-0$
			case "popStash": //$NON-NLS-0$
			case "ignoreFile": //$NON-NLS-0$
				this.changedItem(event.items);
				break;
			}
		}.bind(this));
		mGitCommands.getModelEventDispatcher().addEventListener("stateChanging", this._modelChangingListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "commit": //$NON-NLS-0$
			case "stash": //$NON-NLS-0$
			case "reset": //$NON-NLS-0$
			case "applyPatch":  //$NON-NLS-0$
			//case "stage": //$NON-NLS-0$
			//case "unstage": //$NON-NLS-0$
			case "checkoutFile": //$NON-NLS-0$
			case "applyStash": //$NON-NLS-0$
			case "popStash": //$NON-NLS-0$
			case "ignoreFile": //$NON-NLS-0$
			case "selectionChanged": //$NON-NLS-0$
				event.preCallback = this.unhookCompareWidget.bind(this);
				break;
			}
		}.bind(this));
	}
	GitChangeListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitChangeListExplorer.prototype, /** @lends orion.git.GitChangeListExplorer.prototype */ {
		changedItem: function(items) {
			this.model.repository.status = "";
			var deferred = new Deferred();
			if (this.prefix === "all") { //$NON-NLS-0$
				var parent = this.model.root;
				var commitInfo = this.getCommitInfo();
				var moreVisible = this.getMoreVisible();
				var that = this;
				parent.children = parent.Children = null;
				this.model.getChildren(parent, function(children) {
					parent.removeAll = true;
					that.myTree.refresh.bind(that.myTree)(parent, children, false);
					var selection = children.filter(function(item) {
						return that.model.isStaged(item.type);
					});
					that.selection.setSelections(selection);
					that.setMoreVisible(moreVisible);
					that.setCommitInfo(commitInfo);
					deferred.resolve(children);
				});
			} else {
				deferred.resolve();
			}
			return deferred;
		},
		destroy: function() {
			if (this._modelListener) {
				mGitCommands.getModelEventDispatcher().removeEventListener("modelChanged", this._modelListener); //$NON-NLS-0$
				this._modelListener = null;
			}
			if (this._modelChangingListener) {
				mGitCommands.getModelEventDispatcher().removeEventListener("modelChanged", this._modelChangingListener); //$NON-NLS-0$
				this._modelChangingListener = null;
			}
			if (this._selectionListener) {
				this.selection.removeEventListener("selectionChanged", this._selectionListener); //$NON-NLS-0$
				this._selectionListener = null;
			}
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		//This function is called when any of the compare widgets in the explorer are hooked up and need to be unhooked
		unhookCompareWidget: function() {
			if(!this.model.root) {
				return new Deferred().resolve(true);
			}
			var modelList = this.model.root.children || this.model.root.Children;
			if(!modelList) {
				return new Deferred().resolve(true);
			}
			var isDirty = modelList.some( function(child) {
				if(child.children && child.children.length === 1 && child.children[0].resourceComparer && child.children[0].resourceComparer.isDirty()) {
					return true;
				}
			});
			if(isDirty) {
				var doSave = window.confirm(messages.confirmUnsavedChanges);
				if(!doSave) {
					return new Deferred().resolve();
				}
				var promises = [];
				modelList.forEach( function(child) {
					if(child.children && child.children.length === 1 && child.children[0].resourceComparer && child.children[0].resourceComparer.isDirty() && child.children[0].resourceComparer.save) {
						promises.push(child.children[0].resourceComparer.save(doSave));
					}
				});				
				return Deferred.all(promises);
			} else {
				return new Deferred().resolve(true);
			}
		},
		//This function is called when the collapseAll command is excuted.
		preCollapseAll: function() {
			return this.unhookCompareWidget();
		},
		display: function() {
			var that = this;
			var deferred = new Deferred();
			var model =  new GitChangeListModel({
				registry: this.registry,
				progress: this.progressService,
				prefix: this.prefix,
				location: this.location,
				commitName: this.commitName,
				repository: this.repository,
				handleError: this.handleError,
				changes: this.changes,
				gitClient: this.gitClient,
				progressService: this.progressService,
				section: this.section
			});
			this.createTree(this.parentId, model, {
				setFocus: false, // do not steal focus on load
				preCollapse: function(rowItem) {
					if(rowItem && rowItem.children && rowItem.children.length === 1 && rowItem.children[0].resourceComparer) {
						if(!rowItem.children[0].resourceComparer.isDirty()) {
							return new Deferred().resolve(true);
						}
						var doSave = window.confirm(messages.confirmUnsavedChanges);
						return rowItem.children[0].resourceComparer.save(doSave);
					}
					return new Deferred().resolve(true);
				},
				onComplete: function(tree) {
					var model = that.model;
					if (that.prefix === "all") { //$NON-NLS-0$
						that.updateCommands();
						that.selection.setSelections(model._sortBlock(model.getGroups("staged"))); //$NON-NLS-0$
					}
					if (that.prefix === "diff") { //$NON-NLS-0$
						that.updateCommands();
					}
					that.status = model.status;
					var children = [];
					that.model.getRoot(function(root) {
						that.model.getChildren(root, function(c) {
							children = c;
						});
					});
					if (that._getDiffCount(children) === 1) {
						that.expandSections(tree, children).then(function() {
							deferred.resolve();
						});
						return;
					}
					deferred.resolve();
				}
			});
			return deferred;
		},
		expandSections: function(tree, children) {
			var deferreds = [];
			for (var i = 0; i < children.length; i++) {
				var deferred = new Deferred();
				deferreds.push(deferred);
				tree.expand(this.model.getId(children[i]), function (d) {
					d.resolve();
				}, [deferred]);
			}
			return Deferred.all(deferreds);
		},
		isRowSelectable: function(modelItem) {
			return this.prefix === "all" ? false : mGitUIUtil.isChange(modelItem); //$NON-NLS-0$
		},
		isRebasing: function() {
			var repository = this.model.repository;
			return repository && repository.status && repository.status.RepositoryState === "REBASING_INTERACTIVE"; //$NON-NLS-0$
		},
		getItemCount: function() {
			var result = 0;
			var model = this.model;
			if (model) {
				var that = this;
				model.getRoot(function(root) {
					model.getChildren(root, function(children) {
						result = that._getDiffCount(children);
					});
				});
			}
			return result;
		},
		_getDiffCount: function(children) {
			// -2 for the commit message item and explorer selection
			return Math.max(0, children.length - (this.model.prefix === "all" ? 2 : 1)); //$NON-NLS-0$
		},
		updateCommands: function() {
			mExplorer.createExplorerCommands(this.commandService);
			var actionsNodeScope = this.section.selectionNode.id;
			var selectionNodeScope = this.section.actionsNode.id;
			
			var commandRegistry = this.commandService;
			var explorerSelectionScope = this.prefix === "all" || this.prefix === "diff" ? this.explorerSelectionScope : actionsNodeScope; //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution(explorerSelectionScope, "orion.explorer.expandAll", 200); //$NON-NLS-0$
			commandRegistry.registerCommandContribution(explorerSelectionScope, "orion.explorer.collapseAll", 300); //$NON-NLS-0$
			
			var node;
			node = lib.node(actionsNodeScope);
			if (node) {
				this.commandService.destroy(node);
			}
			node = lib.node(selectionNodeScope);
			if (node) {
				this.commandService.destroy(node);
			}

			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.openGitDiff", 2000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.diff.showCurrent", 1000); //$NON-NLS-1$ //$NON-NLS-0$

			if (this.prefix === "staged") { //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.commitAndPushCommand", 200, "eclipse.gitCommitGroup"); //$NON-NLS-1$ //$NON-NLS-0$ 
				commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-0$
				commandRegistry.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$
			} else if (this.prefix === "unstaged") { //$NON-NLS-0$
				commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.showPatchCommand", 100); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.stageCommand", 200); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.checkoutCommand", 300); //$NON-NLS-0$
				commandRegistry.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.stageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$
			}  else if (this.prefix === "all") { //$NON-NLS-0$
				if (!this.isRebasing()) {
					commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.applyPatch", 300); //$NON-NLS-1$ //$NON-NLS-0$
					commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.popStash", 100); //$NON-NLS-1$ //$NON-NLS-0$
					commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.precreateStashCommand", 200); //$NON-NLS-0$
	
					commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.showStagedPatchCommand", 100); //$NON-NLS-0$
					commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.checkoutStagedCommand", 200); //$NON-NLS-0$
					
	//				commandRegistry.addCommandGroup(selectionNodeScope, "eclipse.gitCommitGroup", 1000, "Commit", null, null, null, "Commit", null, "eclipse.orion.git.precommitCommand", "primaryButton"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ 	549
	//				commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.precommitAndPushCommand", 200, "eclipse.gitCommitGroup"); //$NON-NLS-0$
					commandRegistry.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.precommitCommand", 400); //$NON-NLS-0$
	
					commandRegistry.renderCommands(selectionNodeScope, selectionNodeScope, [], this, "tool", {Clone : this.model.repository}); //$NON-NLS-1$ //$NON-NLS-0$
					commandRegistry.renderCommands(actionsNodeScope, actionsNodeScope, this.model ? this.model.repository : this, this, "tool"); //$NON-NLS-0$	
				}
			} else if (this.prefix === "diff" && this.commit) { //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.checkoutCommit", 1); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.undoCommit", 2); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.resetIndex", 3); //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.addTag", 4); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.cherryPick", 5); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.revert", 6); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.openGitCommit", 7); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.showCommitPatchCommand", 8); //$NON-NLS-1$ //$NON-NLS-0$

				commandRegistry.renderCommands(actionsNodeScope, actionsNodeScope, this.commit, this, "tool"); //$NON-NLS-0$
			}
			node = lib.node(explorerSelectionScope);
			if (node) {
				this.commandService.destroy(node);
				this.commandService.renderCommands(explorerSelectionScope, explorerSelectionScope, this, this, "button"); //$NON-NLS-0$	
			}
		},
		updateSelectionStatus: function(selections) {
			if (!selections) selections = this.selection.getSelections();
			var count = selections ? selections.length : 0;
			var msg = i18nUtil.formatMessage(messages[count === 1 ? "FileSelected" : "FilesSelected"], count);
			if (!count && this.messageTextArea.value && !this.amendCheck.checked) {
				this.explorerSelectionStatus.classList.add("invalidFileCount"); //$NON-NLS-0$
			} else {
				this.explorerSelectionStatus.classList.remove("invalidFileCount"); //$NON-NLS-0$
			}
			this.explorerSelectionStatus.textContent = msg;
		},
		createCommands: function(){
			if (this.prefix !== "all") { //$NON-NLS-0$
				return;
			}
			var that = this;
			var selectAllCommand = new mCommands.Command({
				tooltip : messages["Select all"],
				imageClass : "core-sprite-check", //$NON-NLS-0$
				id: "orion.explorer.selectAllCommandChangeList", //$NON-NLS-0$
				visibleWhen : function() {
					var result = false;
					that.model.getRoot(function(root) {
						if (root.children) {
							var selection = root.children.filter(function(item) {
								return !that.model.isStaged(item.type) && mGitUtil.isChange(item);
							});
							result = selection.length > 0;
						}
					});
					return result;
				},
				callback : function() {
					that.model.getRoot(function(root) {
						var selection = root.children.filter(function(item) {
							return !that.model.isStaged(item.type) && mGitUtil.isChange(item);
						});
						that.commandService.runCommand("eclipse.orion.git.stageCommand", selection, that, null, that.status); //$NON-NLS-0$
					});
				}
			});
			
			var deselectAllCommand = new mCommands.Command({
				tooltip : messages["Deselect all"],
				imageClass : "core-sprite-check_on", //$NON-NLS-0$
				id: "orion.explorer.deselectAllCommandChangeList", //$NON-NLS-0$
				visibleWhen : function() {
					var result = false;
					that.model.getRoot(function(root) {
						if (root.children && root.children.length > 1) {
							var selection = root.children.filter(function(item) {
								return that.model.isStaged(item.type);
							});
							result = selection.length === Math.max(0, root.children.length - 2);
						}
					});
					return result;
				},
				callback : function() {
					that.model.getRoot(function(root) {
						var selection = root.children.filter(function(item) {
							return that.model.isStaged(item.type);
						});
						that.commandService.runCommand("eclipse.orion.git.unstageCommand", selection, that, null, that.status); //$NON-NLS-0$
					});
				}
			});
			
			var toggleMaximizeCommand = new mCommands.Command({
				name: messages['MaximizeCmd'],
				tooltip: messages["MaximizeTip"],
				id: "eclipse.orion.git.toggleMaximizeCommand", //$NON-NLS-0$
				imageClass: "git-sprite-open", //$NON-NLS-0$
				spriteClass: "gitCommandSprite", //$NON-NLS-0$
				type: "toggle", //$NON-NLS-0$
				callback: function(data) {
					var diffContainer = lib.node(data.handler.options.parentDivId);
					diffContainer.style.height = ""; //$NON-NLS-0$
					var maximized = false;
					var div = diffContainer.parentNode;
					if (div.classList.contains("gitChangeListCompareMaximized")) { //$NON-NLS-0$
						div.classList.remove("gitChangeListCompareMaximized"); //$NON-NLS-0$
						diffContainer.classList.remove("gitChangeListCompareContainerMaximized"); //$NON-NLS-0$
					} else {
						div.classList.add("gitChangeListCompareMaximized"); //$NON-NLS-0$
						diffContainer.classList.add("gitChangeListCompareContainerMaximized"); //$NON-NLS-0$
						maximized = true;
					}
					data.handler.options.maximized = maximized;
					if(data.handler.options.titleIds && data.handler.options.titleIds.length === 2) {
						var dirtyIndicator = lib.node(data.handler.options.titleIds[1]); //$NON-NLS-0$
						if ( dirtyIndicator) {
							dirtyIndicator.textContent = data.handler.isDirty() && maximized ? "*" : "";
						}
					}
					(data.handler._editors || [data.handler._editor]).forEach(function(editor) {
						editor.resize();
					});
				},
				visibleWhen: function() {
					return true;
				}
			});
			
			var precommitCommand = new mCommands.Command({
				name: messages['Commit'],
				tooltip: messages["CommitTooltip"],
				id: "eclipse.orion.git.precommitCommand", //$NON-NLS-0$
				extraClass: "primaryButton", //$NON-NLS-0$
				callback: function(data) {
					var info = that.getCommitInfo(true);
					if (!info) return;
					that.commandService.runCommand("eclipse.orion.git.commitCommand", data.items, data.handler, null, info); //$NON-NLS-0$
				},
				visibleWhen: function() {
					return true;
				}
			});
			
			var precreateStashCommand = new mCommands.Command({
				name: messages["Stash"],
				imageClass: "git-sprite-stash-changes", //$NON-NLS-0$
				spriteClass: "gitCommandSprite", //$NON-NLS-0$
				tooltip: messages["Stash all current changes away"],
				id: "eclipse.orion.git.precreateStashCommand", //$NON-NLS-0$
				callback: function(data) {
					var name = that.messageTextArea.value.trim();
					that.commandService.runCommand("eclipse.orion.git.createStash", data.items, data.handler, null, {name: name}); //$NON-NLS-0$
				},
				visibleWhen: function() {
					return true;
				}
			});
			
			var precommitAndPushCommand = new mCommands.Command({
				name: messages["CommitPush"],
				tooltip: messages["Commits and pushes files to the default remote"],
				id: "eclipse.orion.git.precommitAndPushCommand", //$NON-NLS-0$
				callback: function(data) {
					var info = that.getCommitInfo(true);
					if (!info) return;
					that.commandService.runCommand("eclipse.orion.git.commitAndPushCommand", data.items, data.handler, null, info); //$NON-NLS-0$
				},
				visibleWhen: function() {
					return true;
				}
			});

			this.commandService.addCommand(precommitCommand);
			this.commandService.addCommand(selectAllCommand);
			this.commandService.addCommand(deselectAllCommand);
			this.commandService.addCommand(toggleMaximizeCommand);
			this.commandService.addCommand(precommitAndPushCommand);
			this.commandService.addCommand(precreateStashCommand);
		},
		createSelection: function(){
			if (!this.selection) {
				var section = this.section;
				var selectionTools = section.actionsNode;
				this.selection = new mSelection.Selection(this.registry, "orion.selection." + this.prefix + "Section"); //$NON-NLS-1$ //$NON-NLS-0$
				this.commandService.registerSelectionService(selectionTools.id, this.selection);
				var commandService = this.commandService;
				var that = this;
				this.selection.addEventListener("selectionChanged", this._selectionListener =  function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					if (selectionTools) {
						commandService.destroy(selectionTools);
						commandService.renderCommands(selectionTools.id, selectionTools, event.selections, that, "tool", {"Clone" : that.model.repository}); //$NON-NLS-1$ //$NON-NLS-0$
					}
					if (that.prefix === "all") { //$NON-NLS-0$
						var titleTools = section.titleActionsNode;
						if (titleTools) {
							commandService.destroy(titleTools);
						}
						commandService.renderCommands(titleTools.id, titleTools, that, that, "button"); //$NON-NLS-0$
					}
					if (that.explorerSelectionStatus) {
						that.updateSelectionStatus(event.selections);
					}
				});
				
			}
		},
		refreshSelection: function() {
			//Do nothing
		}
	});
	
	function GitChangeListRenderer(options) {
		options.cachePrefix = null; // do not persist table state
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitChangeListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitChangeListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var div, td, navGridHolder, itemLabel, diffActionWrapper;
			var explorer = this.explorer;
			switch (col_no) {
				case 0:
					td = document.createElement("td"); //$NON-NLS-0$
					div = document.createElement("div"); //$NON-NLS-0$
					div.className = "sectionTableItem"; //$NON-NLS-0$
					td.appendChild(div);
					if (item.Type === "CommitMsg") { //$NON-NLS-0$
						tableRow.classList.add("gitCommitMessageSection"); //$NON-NLS-0$
						var outerDiv = document.createElement("div"); //$NON-NLS-0$
						outerDiv.id = "gitCommitMessage"; //$NON-NLS-0$
						outerDiv.className = "gitCommitMessage toolComposite"; //$NON-NLS-0$
						td.colSpan = 2;
						tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
						
						var topRow = document.createElement("div"); //$NON-NLS-0$
						topRow.className = "gitCommitMessageTopRow"; //$NON-NLS-0$
						
						var textArea = explorer.messageTextArea = document.createElement("textarea"); //$NON-NLS-0$
						textArea.rows = 2;
						textArea.type = "textarea"; //$NON-NLS-0$
						textArea.id = "nameparameterCollector"; //$NON-NLS-0$
						textArea.placeholder = messages["SmartCommit"];
						textArea.classList.add("parameterInput"); //$NON-NLS-0$
						textArea.addEventListener("keyup", function() { //$NON-NLS-0$
							textArea.parentNode.classList.remove("invalidParam"); //$NON-NLS-0$
							explorer.updateSelectionStatus();
						});
						topRow.appendChild(textArea);

						var bottomRow = document.createElement("div"); //$NON-NLS-0$
						bottomRow.className = "gitCommitMessageBottomRow"; //$NON-NLS-0$

						var bottomRight = document.createElement("span"); //$NON-NLS-0$
						bottomRight.className = "layoutRight"; //$NON-NLS-0$
						bottomRow.appendChild(bottomRight);

						var bottomLeft = document.createElement("span"); //$NON-NLS-0$
						bottomLeft.className = "layoutLeft"; //$NON-NLS-0$
						bottomRow.appendChild(bottomLeft);
						
						function createInput(parent, id, key, placeholderKey, value, isCheck) {
							var div = document.createElement("span"); //$NON-NLS-0$
							var label = document.createElement("label"); //$NON-NLS-0$
							label.classList.add(isCheck ? "gitChangeListCheckLabel" : "gitChangeListInputLabel"); //$NON-NLS-1$ //$NON-NLS-0$
							label.setAttribute("for", id); //$NON-NLS-0$
							label.textContent = messages[key];
							var input = document.createElement("input"); //$NON-NLS-0$
							if (isCheck) input.type = "checkbox"; //$NON-NLS-0$
							if (value) input.value = value;
							input.classList.add(isCheck ? "gitChangeListCheck" : "gitChangeListInput"); //$NON-NLS-1$ //$NON-NLS-0$
							if (placeholderKey) input.placeholder = messages[placeholderKey];
							input.id = id;
							input.addEventListener("input", function() { //$NON-NLS-0$
								if (input.value) input.classList.remove("invalidParam"); //$NON-NLS-0$
							});
							div.appendChild(!isCheck ? label : input);
							div.appendChild(isCheck ? label : input);
							parent.appendChild(div);
							return input;
						}
						
						function createGroup(parent, key) {
							var div = document.createElement("div"); //$NON-NLS-0$
							div.classList.add("gitChangeListGroup"); //$NON-NLS-0$
							var label = document.createElement("div"); //$NON-NLS-0$
							label.textContent = messages[key];
							label.classList.add("gitChangeListInputLabel"); //$NON-NLS-0$
							div.appendChild(label);
							var content = document.createElement("div"); //$NON-NLS-0$
							content.classList.add("gitChangeListGroupContent"); //$NON-NLS-0$
							div.appendChild(content);
							parent.appendChild(div);
							return content;
						}

						var commitLogic = gitCommit({serviceRegistry: explorer.registry, commandService: explorer.commandService});
						var config = commitLogic.getGitCloneConfig(explorer.model.status.Clone.Config);
						
						var amendCheck = explorer.amendCheck = createInput(bottomLeft, "amendCheck", "SmartAmend", null, null, true); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						explorer.changeIDCheck = createInput(bottomLeft, "changeIDCheck", 'SmartChangeId', null, null, true); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						amendCheck.addEventListener("change", function() { //$NON-NLS-0$
							if (amendCheck.checked) {
								var repository = explorer.model.repository;
								commitLogic.getAmendMessage(repository.ActiveBranch || repository.CommitLocation).then(function(msg) {
									textArea.value = msg;
									textArea.parentNode.classList.remove("invalidParam"); //$NON-NLS-0$
								});
							} else {
								textArea.value = "";
							}
							explorer.updateSelectionStatus();
						});
						
						var moreDiv = document.createElement("div"); //$NON-NLS-0$
						bottomLeft.appendChild(moreDiv);
						
						var div1Content = createGroup(moreDiv, "Author:"); //$NON-NLS-0$
						explorer.authorNameInput = createInput(div1Content, "authorNameInput", "Name:", "AuthorNamePlaceholder", config.AuthorName); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						explorer.authorEmailInput = createInput(div1Content, "authorEmailInput", "Email:", "AuthorEmailPlaceholder", config.AuthorEmail); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

						var div2Content = createGroup(moreDiv, "Committer:"); //$NON-NLS-0$
						explorer.committerNameInput = createInput(div2Content, "committerNameInput", "Name:", "CommitterNamePlaceholder", config.CommitterName); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						explorer.committerEmailInput = createInput(div2Content, "committerEmailInput", "Email:", "CommitterEmailPlaceholder", config.CommitterEmail); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						explorer.persistCheck = createInput(div2Content, "persitCheck", "Save", null, null, true); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

						var more;
						explorer.setMoreVisible = function (visible) {
							if (visible) {
								moreDiv.style.display = "block"; //$NON-NLS-0$
								more.textContent = messages["less"];
							} else {
								moreDiv.style.display = "none"; //$NON-NLS-0$
								more.textContent = messages["more"];
							}
						};
						explorer.getMoreVisible = function() {
							return moreDiv.style.display !== "none"; //$NON-NLS-0$
						};
						explorer.getCommitInfo = function (check) {
							function checkParam (node, invalidNode, show) {
								if (!check) return true;
								if (!node.value.trim()) {
									(invalidNode || node).classList.add("invalidParam"); //$NON-NLS-0$
									if (show) explorer.setMoreVisible(true);
									node.select();
									return false;
								}
								(invalidNode || node).classList.remove("invalidParam"); //$NON-NLS-0$
								return true;
							}
							if (!checkParam(explorer.messageTextArea, explorer.messageTextArea.parentNode)) return null;
							if (!checkParam(explorer.authorNameInput, null, true)) return null;
							if (!checkParam(explorer.authorEmailInput, null, true)) return null;
							if (!checkParam(explorer.committerNameInput, null, true)) return null;
							if (!checkParam(explorer.committerEmailInput, null, true)) return null;
							return {
								Message: explorer.messageTextArea.value.trim(),
								Amend: explorer.amendCheck.checked,
								ChangeId: explorer.changeIDCheck.checked,
								AuthorName: explorer.authorNameInput.value.trim(),
								AuthorEmail: explorer.authorEmailInput.value.trim(),
								CommitterName: explorer.committerNameInput.value.trim(),
								CommitterEmail: explorer.committerEmailInput.value.trim(),
								persist: explorer.persistCheck.checked,
							};
						};
						explorer.setCommitInfo = function (info) {
							explorer.messageTextArea.value = info.Message;
							explorer.amendCheck.checked = info.Amend;
							explorer.changeIDCheck.checked = info.ChangeId;
							explorer.authorNameInput.value = info.AuthorName;
							explorer.authorEmailInput.value = info.AuthorEmail;
							explorer.committerNameInput.value = info.CommitterName;
							explorer.committerEmailInput.value = info.CommitterEmail;
							explorer.persistCheck.checked = info.persist;
						};
						
						more = document.createElement("button"); //$NON-NLS-0$
						more.classList.add("gitCommitMore"); //$NON-NLS-0$
						bottomRight.appendChild(more);
						more.addEventListener("click", function(){ //$NON-NLS-0$
							explorer.setMoreVisible(!explorer.getMoreVisible());
						});
						explorer.setMoreVisible(false);

						outerDiv.appendChild(topRow);
						outerDiv.appendChild(bottomRow);
						div.appendChild(outerDiv);
					}
					else if (mGitUIUtil.isChange(item) || item.Type === "Diff") { //$NON-NLS-0$
	
						this.getExpandImage(tableRow, div);
	
						navGridHolder = explorer.getNavDict() ? explorer.getNavDict().getGridNavHolder(item, true) : null;
						diffActionWrapper = document.createElement("span"); //$NON-NLS-0$
						diffActionWrapper.id = explorer.prefix + item.name + item.type + "DiffActionWrapper"; //$NON-NLS-0$
						diffActionWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
						div.appendChild(diffActionWrapper);
				
						explorer.commandService.destroy(diffActionWrapper);
						explorer.commandService.renderCommands(
							"DefaultActionWrapper", diffActionWrapper, item, explorer, "tool", null, navGridHolder); //$NON-NLS-1$ //$NON-NLS-0$
				
						var icon = document.createElement("span"); //$NON-NLS-0$
						icon.className = explorer.model.getClass(item);
						icon.commandTooltip = new mTooltip.Tooltip({
							node: icon,
							text: explorer.model.getTooltip(item),
							position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						});
						div.appendChild(icon);
	
						itemLabel = document.createElement("span"); //$NON-NLS-0$
						itemLabel.textContent = item.name;
						itemLabel.id = explorer.prefix + item.name + item.type + "FileItemId"; //$NON-NLS-0$
						div.appendChild(itemLabel);
					} else if (item.Type === "ExplorerSelection") { //$NON-NLS-0$
						td.colSpan = 2;
						
						if (explorer.prefix === "all") { //$NON-NLS-0$
							itemLabel = document.createElement("span"); //$NON-NLS-0$
							itemLabel.className = "gitChangeListSelectAll"; //$NON-NLS-0$
							itemLabel.textContent =  messages["SelectAll"];
							div.appendChild(itemLabel);
							
							var selectionLabel = explorer.explorerSelectionStatus = document.createElement("div"); //$NON-NLS-0$
							selectionLabel.className = "gitChangeListSelectionStatus"; //$NON-NLS-0$
							explorer.updateSelectionStatus();
							div.appendChild(selectionLabel);
						} else {
							var changedLabel = explorer.explorerChangedStatus = document.createElement("div"); //$NON-NLS-0$
							changedLabel.className = "gitChangeListChangedStatus"; //$NON-NLS-0$
							var changed = item.parent.children.length - 1;
							changedLabel.textContent = i18nUtil.formatMessage(messages[changed === 1 ? 'FileChanged' : "FilesChanged"], changed);
							div.appendChild(changedLabel);
						}
						
						var actionsArea = document.createElement("div"); //$NON-NLS-0$
						actionsArea.className = "layoutRight commandList"; //$NON-NLS-0$
						actionsArea.id = explorer.explorerSelectionScope;
						div.appendChild(actionsArea);
						explorer.commandService.renderCommands(actionsArea.id, actionsArea, explorer, explorer, "button"); //$NON-NLS-0$	
					} else {
						tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
						
						// render the compare widget
						td.colSpan = 2;
						var actionsWrapper = document.createElement("div"); //$NON-NLS-0$
						actionsWrapper.className = "gitChangeListCompareActions"; //$NON-NLS-0$LS-0$
						div.appendChild(actionsWrapper);

						var prefix = explorer.prefix + item.parent.name + item.parent.type;

						var compareWidgetActionWrapper = document.createElement("ul"); //$NON-NLS-0$
						compareWidgetActionWrapper.className = "layoutRight commandList"; //$NON-NLS-0$
						compareWidgetActionWrapper.id = prefix + "CompareWidgetActionWrapper"; //$NON-NLS-0$
						actionsWrapper.appendChild(compareWidgetActionWrapper);

						var compareWidgetLeftActionWrapper = document.createElement("ul"); //$NON-NLS-0$
						compareWidgetLeftActionWrapper.className = "layoutLeft commandList"; //$NON-NLS-0$
						compareWidgetLeftActionWrapper.id = prefix + "CompareWidgetLeftActionWrapper"; //$NON-NLS-0$
						actionsWrapper.appendChild(compareWidgetLeftActionWrapper);
						var dirtyindicator = document.createElement("span"); //$NON-NLS-0$
						dirtyindicator.className = "layoutLeft"; //$NON-NLS-0$
						dirtyindicator.id = prefix + "DirtyId"; //$NON-NLS-0$
						actionsWrapper.appendChild(dirtyindicator);
						
						diffActionWrapper = document.createElement("ul"); //$NON-NLS-0$
						diffActionWrapper.className = "layoutRight commandList"; //$NON-NLS-0$
						diffActionWrapper.id = prefix + "DiffActionWrapperChange"; //$NON-NLS-0$
						actionsWrapper.appendChild(diffActionWrapper);
						explorer.commandService.registerCommandContribution(prefix + "CompareWidgetLeftActionWrapper", "eclipse.orion.git.toggleMaximizeCommand", 1000); //$NON-NLS-1$ //$NON-NLS-0$

						var diffContainer = document.createElement("div"); //$NON-NLS-0$
						diffContainer.className = "gitChangeListCompare"; //$NON-NLS-0$
						diffContainer.id = "diffArea_" + item.DiffLocation; //$NON-NLS-0$
						div.appendChild(diffContainer);
	
						navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
						var hasConflict = item.parent.type === "Conflicting"; //$NON-NLS-0$
						window.setTimeout(function() {
							mGitUIUtil.createCompareWidget(
								explorer.registry,
								explorer.commandService,
								item.DiffLocation,
								hasConflict,
								diffContainer,
								compareWidgetActionWrapper.id,
								explorer.editableInComparePage ? !this.explorer.model.isStaged(item.parent.type) : false,
								{
									navGridHolder : navGridHolder,
									additionalCmdRender : function(gridHolder) {
										explorer.commandService.destroy(diffActionWrapper.id);
										explorer.commandService.renderCommands("itemLevelCommands", diffActionWrapper.id, item.parent, explorer, "tool", false, gridHolder); //$NON-NLS-1$ //$NON-NLS-0$
										explorer.commandService.renderCommands(diffActionWrapper.id, diffActionWrapper.id, item.parent, explorer, "tool", false, gridHolder); //$NON-NLS-0$
									},
									before : true
								},
								undefined,
								compareWidgetLeftActionWrapper.id,
								explorer.preferencesService,
								item.parent.Type === "Diff" ? null : compareWidgetLeftActionWrapper.id,//saveCmdContainerId
								item.parent.Type === "Diff" ? null : "compare.save." + item.DiffLocation, //saveCmdId
								//We pass an array of two title Ids here in order for the resource comparer to render the dirty indicator optionally
								//If the widget is not maximized, the dirty indicator, if any, is rendered at the end of the file name
								//If the widget is maximized, as the file name is not visible, the "*" is rendered right beside the left hand action wrapper
								item.parent.Type === "Diff" ? null : [explorer.prefix + item.parent.name + item.parent.type + "FileItemId", dirtyindicator.id],//$NON-NLS-0$ //The compare widget title where the dirty indicator can be inserted
								//We need to attach the compare widget reference to the model. Also we need the widget to be destroy when the model is destroyed.
								item
							);
						}.bind(this), 0);
					}
					return td;
			}
		},
		onCheckedFunc: function(rowId, checked, manually, item) {
			this.explorer.unhookCompareWidget().then(function(result) {
				if(!result) {
					return;
				}
				if (item.Type === "ExplorerSelection") { //$NON-NLS-0$
					if (checked) {
						this.explorer.commandService.runCommand("orion.explorer.selectAllCommandChangeList", this.explorer, this.explorer); //$NON-NLS-0$
					} else {
						this.explorer.commandService.runCommand("orion.explorer.deselectAllCommandChangeList", this.explorer, this.explorer); //$NON-NLS-0$
					}
				} else {
					//stage or unstage
					if (checked) {
						this.explorer.commandService.runCommand("eclipse.orion.git.stageCommand", [item], this.explorer); //$NON-NLS-0$
					} else {
						this.explorer.commandService.runCommand("eclipse.orion.git.unstageCommand", [item], this.explorer); //$NON-NLS-0$
					}
				}
			}.bind(this));
		}, 
		getCheckedFunc: function(item){
			if (item.Type === "ExplorerSelection") { //$NON-NLS-0$
				return !this.explorer.commandService.findCommand("orion.explorer.selectAllCommandChangeList").visibleWhen(this.explorer); //$NON-NLS-0$
			}
			
			return this.explorer.model.isStaged(item.type);
		}
	});
	
	return {
		GitChangeListExplorer: GitChangeListExplorer,
		GitChangeListRenderer: GitChangeListRenderer,
		GitChangeListModel: GitChangeListModel
	};

});
