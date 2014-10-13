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
	'orion/explorers/explorer',
	'orion/Deferred',
	'orion/git/gitCommands',
	'orion/i18nUtil',
	'orion/git/uiUtil',
	'orion/objects'
], function(messages, mExplorer, Deferred, mGitCommands, i18nUtil, uiUtil, objects) {

	function GitConfigListModel(options) {
		this.root = options.root;
		this.registry = options.registry;
		this.handleError = options.handleError;
		this.section = options.section;
		this.progressService = options.progressService;
		this.gitClient = options.gitClient;
		this.filterQuery = this.root.mode === "full" ? "" : "user."; //$NON-NLS-1$ //$NON-NLS-0$
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
			if (parentItem.Type === "ConfigRoot") { //$NON-NLS-0$
				progress = this.section.createProgressMonitor();
				var msg = i18nUtil.formatMessage(messages['Getting configuration of'], parentItem.repository.Name);
				progress.begin(msg);
				this.progressService.progress(this.gitClient.getGitCloneConfig(parentItem.repository.ConfigLocation), msg).then( function(resp){
					progress.worked("Rendering configuration"); //$NON-NLS-0$
					var children = [];
					resp.Children.forEach(function(entry) {
						if (entry.Value && entry.Value.length > 1) {
							for (var i =0; i<entry.Value.length; i++) {
								children.push(objects.mixin({index: i}, entry));							
							}
						} else if (entry.Value) {
							children.push(entry);
						}
					});
					var configurationEntries = children;
					progress.done();
					onComplete(that.processChildren(parentItem, configurationEntries));
				}, function(error){
					progress.done();
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
					return item.Key.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
				});
			}
			if (children.length === 0) {
				children = [{Type: "NoContent", selectable: false, isNotSelectable: true}]; //$NON-NLS-0$
			}
			children.forEach(function(item) {
				item.parent = parentItem;
			});
			parentItem.children = children;
			return children;
		},
		getId: function(item){
			return (item.Key ? item.Key + item.Value : item.Type) + (item.index !== undefined ? item.index : "");
		}
	});
	
	/**
	 * @class orion.git.GitConfigListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitConfigListExplorer(options) {
		var renderer = new GitConfigListRenderer({
			noRowHighlighting: true,
			registry: options.serviceRegistry,
			commandService: options.commandRegistry,
			actionScopeId: options.actionScopeId,
			cachePrefix: options.prefix + "Navigator", //$NON-NLS-0$
			checkbox: false
		}, this);
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.sectionActionScopeId = options.sectionActionScopeId;
		this.root = options.root;
		this.section = options.section;
		this.selectionPolicy = options.selectionPolicy;
		this.handleError = options.handleError;
		this.progressService = options.progressService;
		this.gitClient = options.gitClient;
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", this._modelListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "addConfig": //$NON-NLS-0$
			case "editConfig": //$NON-NLS-0$
			case "deleteConfig": //$NON-NLS-0$
				this.changedItem();
				break;
			}
		}.bind(this));
	}
	GitConfigListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitConfigListExplorer.prototype, /** @lends orion.git.GitConfigListExplorer.prototype */ {
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
				item.children = null;
			}
			model.getChildren(item, function(children) {
				item.removeAll = true;
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
			var model = new GitConfigListModel({
				root: this.root,
				registry: this.registry,
				progressService: this.progressService,
				gitClient: this.gitClient,
				section: this.section,
				handleError: this.handleError
			});
			this.createFilter();
			this.createTree(this.parentId, model, {
				setFocus: false, // do not steal focus on load
			});
			this.updateCommands();
		},
		isRowSelectable: function() {
			return false;
		},
		updateCommands: function() {
			var root = this.root;
			var section = this.section;
			var actionsNodeScope = this.sectionActionScopeId || section.actionsNode.id;
			var commandRegistry = this.commandService;
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.deleteConfigEntryCommand", 1000); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("itemLevelCommands", "eclipse.orion.git.editConfigEntryCommand", 100); //$NON-NLS-1$ //$NON-NLS-0$
			if (root.mode === "full"){ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.addConfigEntryCommand", 1000); //$NON-NLS-0$
				commandRegistry.renderCommands(actionsNodeScope, actionsNodeScope, root.repository, this, "button"); //$NON-NLS-0$
			}
		}
	});
	
	function GitConfigListRenderer(options) {
		options.cachePrefix = null; // do not persist table state
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitConfigListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitConfigListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			if (col_no > 1) return null;
			var div, td;
			td = document.createElement("td"); //$NON-NLS-0$
			div = document.createElement("div"); //$NON-NLS-0$
			td.appendChild(div);
			
			if (item.Type === "NoContent") { //$NON-NLS-0$
				if (col_no > 0) return null;
				var noContent = document.createElement("div"); //$NON-NLS-0$
				noContent.textContent = messages[item.Type];
				div.appendChild(noContent);
				return td;
			}
			
			switch (col_no) {
				case 0:
					var keyNode = document.createElement("div"); //$NON-NLS-0$
					keyNode.className = "gitConfigKey"; //$NON-NLS-0$
					keyNode.textContent = item.Key;
					if (item.index !== undefined) {
						keyNode.textContent += "[" + item.index + "]"; //$NON-NLS-0$ //$NON-NLS-1$
					}	
					div.appendChild(keyNode);
					var valueNode = document.createElement("div"); //$NON-NLS-0$
					valueNode.className = "gitConfigValue"; //$NON-NLS-0$
					valueNode.textContent = item.Value[item.index || 0];
					div.appendChild(valueNode);
					break;
				case 1:
					var actionsArea = document.createElement("ul"); //$NON-NLS-0$
					actionsArea.className = "sectionTableItemActions layoutRight commandList toolComposite"; //$NON-NLS-0$
					actionsArea.id = "configActionsArea"; //$NON-NLS-0$
					div.appendChild(actionsArea);
					this.commandService.renderCommands(this.actionScopeId, actionsArea, item, this.explorer, "tool"); //$NON-NLS-0$
					break;
			}
			return td;
		}
	});
	
	return {
		GitConfigListExplorer: GitConfigListExplorer,
		GitConfigListRenderer: GitConfigListRenderer
	};

});