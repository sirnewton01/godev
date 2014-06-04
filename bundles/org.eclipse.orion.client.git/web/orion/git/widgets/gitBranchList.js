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

/*global define document */

define([
	'i18n!git/nls/gitmessages',
	'orion/explorers/explorer',
	'orion/URITemplate',
	'orion/i18nUtil',
	'orion/objects'
], function(messages, mExplorer, URITemplate, i18nUtil, objects) {

	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$

	function GitBranchListModel(options) {
		this.root = options.root;
		this.registry = options.registry;
		this.handleError = options.handleError;
		this.section = options.section;
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
			var progress;
			if (parentItem.Type === "LocalRoot") {
				progress = this.section.createProgressMonitor();
				progress.begin("Getting branches");
				this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(parentItem.repository.BranchLocation + (parentItem.mode === "full" ? "?commits=1" : "?commits=1&page=1&pageSize=5")), "Getting branches " + parentItem.repository.Name).then(function(resp) { //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					var branches = resp.Children;
					branches.forEach(function(item) {
						item.parent = parentItem;
					});
					progress.done();
					onComplete(branches);
				}, function(error){
					progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "RemoteRoot") {
				progress = this.section.createProgressMonitor();
				progress.begin("Getting remote branches"); //$NON-NLS-0$
				this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitRemote(parentItem.repository.RemoteLocation), "Getting remote branches " + parentItem.repository.Name).then(function (resp) { //$NON-NLS-0$
					var remotes = resp.Children;
					remotes.forEach(function(item) {
						item.parent = parentItem;
					});
					progress.done();
					if (remotes.length === 0){
						this.section.setTitle(messages["No Remote Branches"]);
					}
					onComplete(remotes);
				}, function(error){
					progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "Remote") {
				progress = this.section.createProgressMonitor();
				progress.begin(messages["Rendering branches"]);
				this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitRemote(parentItem.Location), "Getting remote branches " + parentItem.Name).then(function (resp) { //$NON-NLS-0$
					var remotes = resp.Children;
					remotes.forEach(function(item) {
						item.parent = parentItem;
					});
					progress.done();
					onComplete(remotes);
				}, function(error){
					progress.done();
					that.handleError(error);
				});
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			if (item.Type === "LocalRoot") {
				return "LocalRoot"; //$NON-NLS-0$
			} else {
				return item.Name;
			}
		}
	});
	
	/**
	 * @class orion.git.GitBranchListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitBranchListExplorer(options) {
		var renderer = new GitBranchListRenderer({registry: options.serviceRegistry, commandService: options.commandRegistry, actionScopeId: options.actionScopeId, cachePrefix: options.prefix + "Navigator", checkbox: false}, this); //$NON-NLS-0$
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.root = options.root;
		this.section = options.section;
		this.handleError = options.handleError;
	}
	GitBranchListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitBranchListExplorer.prototype, /** @lends orion.git.GitBranchListExplorer.prototype */ {
		display: function() {
			this.createTree(this.parentId, new GitBranchListModel({root: this.root, registry: this.registry, section: this.section, handleError: this.handleError}));
			this.updateCommands();
		},
		isRowSelectable: function(modelItem) {
			return false;
		},
//		getItemCount: function() {
//			return this.branches.length;
//		},
		updateCommands: function() {
			var root = this.root;
			var section = this.section;
			var actionsNodeScope = section.actionsNode.id;
			if (root.Type === "LocalRoot") {
				if (root.mode !== "full" /*&& branches.length !== 0*/){ //$NON-NLS-0$
					this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
					this.commandService.renderCommands(actionsNodeScope, actionsNodeScope, 
						{"ViewAllLink":repoTemplate.expand({resource: root.repository.BranchLocation}), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all local and remote tracking branches"]}, this, "button"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
				
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.addBranch", 200); //$NON-NLS-0$
				this.commandService.renderCommands(actionsNodeScope, actionsNodeScope, root.repository, this, "button"); //$NON-NLS-0$
			} else {
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.addRemote", 100); //$NON-NLS-0$
				this.commandService.renderCommands(actionsNodeScope, actionsNodeScope, root.repository, this, "button"); //$NON-NLS-0$
			}
		}
	});
	
	function GitBranchListRenderer(options, explorer) {
		mExplorer.SelectionRenderer.apply(this, arguments);
		this.registry = options.registry;
	}
	GitBranchListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitBranchListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var div, td;
			switch (col_no) {
				case 0:
					td = document.createElement("td"); //$NON-NLS-0$
					div = document.createElement("div"); //$NON-NLS-0$
					div.className = "sectionTableItem lightTreeTableRow"; //$NON-NLS-0$
					td.appendChild(div);
					var horizontalBox = document.createElement("div");
					horizontalBox.style.overflow = "hidden";
					div.appendChild(horizontalBox);	
					var actionsArea, detailsView, title, description;
					if (item.parent.Type === "LocalRoot") {
						var branch = item;
						if (branch.Current){
							var span = document.createElement("span");
							span.className = "sectionIcon gitImageSprite git-sprite-branch-active";
							horizontalBox.appendChild(span);
						}
	
						detailsView = document.createElement("div");
						detailsView.className = "stretch";
						horizontalBox.appendChild(detailsView);
				
						title = document.createElement("span");
						title.className = (branch.Current ? "activeBranch" : "");
						title.textContent = branch.Name;
						detailsView.appendChild(title);
				
						var commit = branch.Commit.Children[0];
						
						var tracksMessage = ((branch.RemoteLocation.length && branch.RemoteLocation.length === 1 && branch.RemoteLocation[0].Children.length && branch.RemoteLocation[0].Children.length === 1) ? 
								i18nUtil.formatMessage(messages["tracks ${0}, "], branch.RemoteLocation[0].Children[0].Name) : messages["tracks no branch, "]);
								
						description = document.createElement("div");
						description.textContent = tracksMessage + i18nUtil.formatMessage(messages["last modified ${0} by ${1}"], new Date(commit.Time).toLocaleString(), //$NON-NLS-0$
								commit.AuthorName);
						detailsView.appendChild(description);
						
						actionsArea = document.createElement("div");
						actionsArea.className = "sectionTableItemActions";
						actionsArea.id = "branchActionsArea";
						horizontalBox.appendChild(actionsArea);
						
					} else if (item.parent.Type === "RemoteRoot") {
						var expandContainer = document.createElement("div");
						expandContainer.style.display = "inline-block";
						expandContainer.style.styleFloat = "left";
						expandContainer.style.cssFloat = "left";
						this.getExpandImage(tableRow, expandContainer);
						horizontalBox.appendChild(expandContainer);
							
						detailsView = document.createElement("div");
						detailsView.className = "stretch";
						horizontalBox.appendChild(detailsView);
						
						title = document.createElement("div");
						var remote = item;
						title.textContent = remote.Name;
						detailsView.appendChild(title);
						
						description = document.createElement("div");
						description.textContent = remote.GitUrl;
						detailsView.appendChild(description);
				
						actionsArea = document.createElement("div");
						actionsArea.className = "sectionTableItemActions";
						actionsArea.id = "remoteActionsArea";
						horizontalBox.appendChild(actionsArea);
					} else if (item.parent.Type === "Remote") {
						detailsView = document.createElement("div");
						detailsView.className = "stretch";
						horizontalBox.appendChild(detailsView);
				
						title = document.createElement("span");
						title.textContent = item.Name;
						detailsView.appendChild(title);
						
						actionsArea = document.createElement("div");
						actionsArea.className = "sectionTableItemActions";
						actionsArea.id = "branchActionsArea";
						horizontalBox.appendChild(actionsArea);
					} 
					this.commandService.renderCommands(this.actionScopeId, actionsArea, item, this.explorer, "tool");	 //$NON-NLS-0$	
					return td;
			}
		}
	});
	
	return {
		GitBranchListExplorer: GitBranchListExplorer,
		GitBranchListRenderer: GitBranchListRenderer
	};

});