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

/*global define document*/

define([
	'i18n!git/nls/gitmessages',
	'orion/explorers/explorer',
	'orion/URITemplate',
	'orion/objects'
], function(messages, mExplorer, URITemplate, objects) {

	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$		
		
	function GitConfigListModel(options) {
		this.root = options.root;
		this.registry = options.registry;
		this.handleError = options.handleError;
		this.section = options.section;
	}
	GitConfigListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitConfigListModel.prototype, /** @lends orion.git.GitConfigListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.root);
		},
		getChildren: function(parentItem, onComplete){	
			var that = this;
			var progress;
			if (parentItem.Type === "ConfigRoot") {
				progress = this.section.createProgressMonitor();
				progress.begin(messages["Getting confituration"]);
				this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitCloneConfig(parentItem.repository.ConfigLocation), "Getting configuration of " + parentItem.repository.Name).then( function(resp){  //$NON-NLS-0$
					progress.worked("Rendering configuration"); //$NON-NLS-0$
					var configurationEntries = resp.Children;
					
					if (configurationEntries.length === 0){
						that.section.setTitle("No Configuration"); //$NON-NLS-0$
					}
					
					var filteredConfig = [];
					for(var i=0; i<configurationEntries.length ;i++){
						if (parentItem.mode === "full" || configurationEntries[i].Key.indexOf("user.") !== -1) //$NON-NLS-1$ //$NON-NLS-0$
							filteredConfig.push(configurationEntries[i]);
					}
					progress.done();
					onComplete(filteredConfig);
				}, function(error){
					progress.done();
					that.handleError(error);
				});
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			if (item.Type === "ConfigRoot") {
				return "ConfigRoot"; //$NON-NLS-0$
			} else {
				return item.Name;
			}
		}
	});
	
	/**
	 * @class orion.git.GitConfigListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitConfigListExplorer(options) {
		var renderer = new GitConfigListRenderer({registry: options.serviceRegistry, commandService: options.commandRegistry, actionScopeId: options.actionScopeId, cachePrefix: options.prefix + "Navigator", checkbox: false}, this); //$NON-NLS-0$
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.root = options.root;
		this.section = options.section;
		this.handleError = options.handleError;
	}
	GitConfigListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitConfigListExplorer.prototype, /** @lends orion.git.GitConfigListExplorer.prototype */ {
		display: function() {
			this.createTree(this.parentId, new GitConfigListModel({root: this.root, registry: this.registry, section: this.section, handleError: this.handleError}));
			this.updateCommands();
		},
		isRowSelectable: function(modelItem) {
			return false;
		},
		updateCommands: function() {
			var root = this.root;
			var section = this.section;
			var actionsNodeScope = section.actionsNode.id;
			if (root.mode !== "full"/* && configurationEntries.length !== 0*/){ //$NON-NLS-0$
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
				this.commandService.renderCommands(actionsNodeScope, actionsNodeScope,
						{"ViewAllLink":repoTemplate.expand({resource: root.repository.ConfigLocation}), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all configuration entries"]}, this, "button"); //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		
			if (root.mode === "full"){ //$NON-NLS-0$
				this.commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.addConfigEntryCommand", 1000); //$NON-NLS-0$
				this.commandService.renderCommands(actionsNodeScope, actionsNodeScope, root.repository, this, "button"); //$NON-NLS-0$
			}
		}
	});
	
	function GitConfigListRenderer(options, explorer) {
		mExplorer.SelectionRenderer.apply(this, arguments);
		this.registry = options.registry;
	}
	GitConfigListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitConfigListRenderer.prototype, {
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
					
					var detailsView = document.createElement("div");
					detailsView.className = "stretch";
					horizontalBox.appendChild(detailsView);
			
					var keySpan = document.createElement("span");
					keySpan.textContent = item.Key;
					detailsView.appendChild(keySpan);
					
					var valueSpan = document.createElement("span");
					valueSpan.style.paddingLeft = "10px";
					valueSpan.textContent = item.Value;
					detailsView.appendChild(valueSpan);
					
					var actionsArea = document.createElement("div");
					actionsArea.className = "sectionTableItemActions";
					actionsArea.id = "configActionsArea";
					horizontalBox.appendChild(actionsArea);
			
					this.commandService.renderCommands(this.actionScopeId, actionsArea, item, this.explorer, "tool"); //$NON-NLS-0$
					return td;
			}
		}
	});
	
	return {
		GitConfigListExplorer: GitConfigListExplorer,
		GitConfigListRenderer: GitConfigListRenderer
	};

});