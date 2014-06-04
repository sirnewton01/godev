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
	'i18n!git/nls/gitmessages',
	'orion/Deferred',
	'orion/explorers/explorer',
	'orion/git/uiUtil',
	'orion/webui/tooltip',
	'orion/selection',
	'orion/webui/littlelib',
	'orion/objects'
], function(messages, Deferred, mExplorer, mGitUIUtil, mTooltip, mSelection , lib, objects) {
	
	var interestedUnstagedGroup = [ "Missing", "Modified", "Untracked", "Conflicting" ]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var interestedStagedGroup = [ "Added", "Changed", "Removed" ]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
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
		this.handleError = options.handleError;
		this.changes = options.changes;
	}
	GitChangeListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitChangeListModel.prototype, /** @lends orion.git.GitChangeListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.changes || {Type: "Root"});
		},
		getChildren: function(parentItem, onComplete){	
			if (parentItem instanceof Array && parentItem.length > 0) {
				onComplete(parentItem);
			} else if (parentItem.Type === "Root") {
				var that = this;
				if (that.status) {
					onComplete(that._sortBlock(that.prefix === "staged" ? interestedStagedGroup : interestedUnstagedGroup));
					return;
				}
				var progressService = this.registry.getService("orion.page.progress");
				var location = this.location;
				progressService.progress(this.registry.getService("orion.git.provider").getGitStatus(location), messages['Loading...']).then( //$NON-NLS-0$
				function(resp) {
					if (resp.Type === "Status") { //$NON-NLS-0$
						var status = that.status = that.items = resp;
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

													status.Clone = that.repository = repositories[0];
													status.Clone.Config = [];

													for (var i = 0; i < config.length; i++) {
														if (config[i].Key === "user.name" || config[i].Key === "user.email") //$NON-NLS-1$ //$NON-NLS-0$
															status.Clone.Config.push(config[i]);
													}
													var children = parentItem.children = that._sortBlock(that.prefix === "staged" ? interestedStagedGroup : interestedUnstagedGroup);
													children.forEach(function(child) {
														child.parent = parentItem;
													});
													onComplete(children);

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
			} else if (mGitUIUtil.isChange(parentItem) || parentItem.Type === "Diff") {
			// lazy creation, this is required for selection  model to be able to traverse into children
				if (!parentItem.children) {
					parentItem.children = [];
					parentItem.children.push({ DiffLocation : parentItem.DiffLocation, Type : "Compare", parent : parentItem});//$NON-NLS-0$
				}
				onComplete(parentItem.children);
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			var prefix = this.prefix;
			if (item instanceof Array && item.length > 0) {
				return prefix + "Root"; //$NON-NLS-0$
			} else if (mGitUIUtil.isChange(item)) {
				return  prefix + item.name; 
			} else {
				return  prefix + item.DiffLocation;
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
		var renderer = new GitChangeListRenderer({registry: options.serviceRegistry, commandService: options.commandRegistry, actionScopeId: options.actionScopeId, cachePrefix: options.prefix + "Navigator", checkbox: false}, this); //$NON-NLS-0$
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.prefix = options.prefix;
		this.changes = options.changes;
		this.section = options.section;
		this.location = options.location;
		this.editableInComparePage = options.editableInComparePage;
		this.handleError = options.handleError;
		this.createSelection();
		this.updateCommands();
	}
	GitChangeListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitChangeListExplorer.prototype, /** @lends orion.git.GitChangeListExplorer.prototype */ {
		destroy: function() {
			if (this._selectionListener) {
				this.selection.removeEventListener("selectionChanged", this._selectionListener);
				this._selectionListener = null;
			}
		},
		display: function() {
			var that = this;
			var deferred = new Deferred();
			var model =  new GitChangeListModel({registry: this.registry, prefix: this.prefix, location: this.location, handleError: this.handleError, changes: this.changes});
			this.createTree(this.parentId, model, {onComplete: function() {
				that.status = model.status;
				deferred.resolve();
			}});
			return deferred;
		},
		isRowSelectable: function(modelItem) {
			return mGitUIUtil.isChange(modelItem);
		},
//		getItemCount: function() {
//			return this.changes.length; //TODO: Could be null
//		},
		updateCommands: function() {
			mExplorer.createExplorerCommands(this.commandService);
			var actionsNodeScope = this.section.actionsNode.id;
			var selectionNodeScope = this.section.selectionNode.id;
			this.commandService.registerCommandContribution(actionsNodeScope, "orion.explorer.expandAll", 200); //$NON-NLS-0$
			this.commandService.registerCommandContribution(actionsNodeScope, "orion.explorer.collapseAll", 300); //$NON-NLS-0$
			if (this.prefix === "staged") {
                this.commandService.addCommandGroup(actionsNodeScope, "eclipse.gitCommitGroup", 1000, "Commit", null, null, null, "Commit", null, "eclipse.orion.git.commitCommand"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ 	549
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.commitCommand", 100, "eclipse.gitCommitGroup"); //$NON-NLS-0$ 	550
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.commitAndPushCommand", 200, "eclipse.gitCommitGroup"); //$NON-NLS-0$ 
				this.commandService.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-0$
				this.commandService.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.unstageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$
			} else if (this.prefix === "unstaged") {
				this.commandService.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.showPatchCommand", 100); //$NON-NLS-0$
				this.commandService.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.stageCommand", 200); //$NON-NLS-0$
				this.commandService.registerCommandContribution(selectionNodeScope, "eclipse.orion.git.checkoutCommand", 300); //$NON-NLS-0$
				this.commandService.registerCommandContribution("DefaultActionWrapper", "eclipse.orion.git.stageCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$
			}
			this.commandService.renderCommands(actionsNodeScope, actionsNodeScope, this, this, "button"); //$NON-NLS-0$
			
		},
		createSelection: function(){
			if (!this.selection) {
				this.selection = new mSelection.Selection(this.registry, "orion.selection." + this.prefix + "Section"); //$NON-NLS-1$ //$NON-NLS-0$
				this.commandService.registerSelectionService(this.section.selectionNode.id, this.selection);
				var section = this.section;
				var commandService = this.commandService;
				var that = this;
				this.selection.addEventListener("selectionChanged", this._selectionListener =  function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					var selectionTools = lib.node(section.selectionNode.id);
					if (selectionTools) {
						commandService.destroy(selectionTools);
						commandService.renderCommands(section.selectionNode.id, selectionTools, event.selections, that,
							"button", {"Clone" : that.model.repository}); //$NON-NLS-1$ //$NON-NLS-0$
					}
				});
			}
		}
	});
	
	function GitChangeListRenderer(options, explorer) {
		mExplorer.SelectionRenderer.apply(this, arguments);
		this.registry = options.registry;
	}
	GitChangeListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitChangeListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var div, td, navGridHolder;
			var explorer = this.explorer;
			switch (col_no) {
				case 0:
					if (mGitUIUtil.isChange(item) || item.Type === "Diff") {
						td = document.createElement("td"); //$NON-NLS-0$
						div = document.createElement("div"); //$NON-NLS-0$
						div.className = "sectionTableItem"; //$NON-NLS-0$
						td.appendChild(div);
	
						this.getExpandImage(tableRow, div);
	
						navGridHolder = explorer.getNavDict() ? explorer.getNavDict().getGridNavHolder(item, true) : null;
						var diffActionWrapper = document.createElement("span"); //$NON-NLS-0$
						diffActionWrapper.id = explorer.prefix + item.name + "DiffActionWrapper"; //$NON-NLS-0$
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
	
						var itemLabel = document.createElement("span"); //$NON-NLS-0$
						itemLabel.textContent = item.name;
						div.appendChild(itemLabel);
	
						return td;
					} else {
						// render the compare widget
						td = document.createElement("td"); //$NON-NLS-0$
						td.colSpan = 2;
	
						div = document.createElement("div"); //$NON-NLS-0$
						div.className = "sectionTableItem"; //$NON-NLS-0$
						td.appendChild(div);
	
						var actionsWrapper = document.createElement("div"); //$NON-NLS-0$
						actionsWrapper.className = "sectionExplorerActions"; //$NON-NLS-0$
						div.appendChild(actionsWrapper);

						var diffActionWrapper = document.createElement("span"); //$NON-NLS-0$
						diffActionWrapper.id = explorer.prefix + item.parent.name + "DiffActionWrapperChange"; //$NON-NLS-0$
						actionsWrapper.appendChild(diffActionWrapper);

						var compareWidgetActionWrapper = document.createElement("span"); //$NON-NLS-0$
						compareWidgetActionWrapper.id = explorer.prefix + item.parent.name + "CompareWidgetActionWrapper"; //$NON-NLS-0$
						actionsWrapper.appendChild(compareWidgetActionWrapper);
	
						var diffContainer = document.createElement("div"); //$NON-NLS-0$
						diffContainer.id = "diffArea_" + item.DiffLocation; //$NON-NLS-0$
						diffContainer.style.height = "420px"; //$NON-NLS-0$
						diffContainer.style.border = "1px solid lightgray"; //$NON-NLS-0$
						diffContainer.style.overflow = "hidden"; //$NON-NLS-0$
						div.appendChild(diffContainer);
	
						navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
						var hasConflict = item.parent.type === "Conflicting";
						mGitUIUtil.createCompareWidget(
							explorer.registry,
							explorer.commandService,
							item.DiffLocation,
							hasConflict,
							diffContainer,
							compareWidgetActionWrapper.id,
							explorer.editableInComparePage,
							{
								navGridHolder : navGridHolder,
								additionalCmdRender : function(gridHolder) {
									explorer.commandService.destroy(diffActionWrapper.id);
									explorer.commandService.renderCommands(
										"itemLevelCommands", diffActionWrapper.id, item.parent, explorer, "tool", false, gridHolder); //$NON-NLS-0$
								},
								before : true
							}
						);
						return td;
					}
					break;
			}
		}
	});
	
	return {
		GitChangeListExplorer: GitChangeListExplorer,
		GitChangeListRenderer: GitChangeListRenderer,
		GitChangeListModel: GitChangeListModel
	};

});
