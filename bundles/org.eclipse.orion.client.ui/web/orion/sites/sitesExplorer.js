/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document*/
/*jslint sub:true*/
define(['i18n!orion/sites/nls/messages', 'orion/i18nUtil', 'orion/explorers/explorer', 'orion/Deferred', 'orion/commands', 'orion/keyBinding', 'orion/section', 'orion/globalCommands',
		'orion/selection', 'orion/sites/siteUtils', 'orion/explorers/navigationUtils', 'orion/sites/siteClient', 'orion/sites/siteCommands', 'orion/webui/treetable', 'orion/webui/littlelib'],
		function(messages, i18nUtil, mExplorer, Deferred, mCommands, mKeyBinding, mSection, mGlobalCommands, mSelection, mSiteUtils, mNavUtils, mSiteClient, mSiteCommands, treetable, lib) {
	var SiteServicesExplorer, SitesRenderer, SiteTreeModel;

	/** 
	 * Generates an explorer showing the sites on each site service.
	 * 
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry
	 * @param registry [required] service registry
	 * @param selection [required] selection service
	 * @param commandRegistry [required] command registry
	 * @param parentId [required] parent node id
	 * @returns SiteServicesExplorer object
	 */
	SiteServicesExplorer = (function() {
		
		function SiteServicesExplorer(registry, selection, commandRegistry, parentId) {
			this.registry = registry;
			this.checkbox = false;
			this.parentId = parentId;
			this.selection = selection;
			this.commandService = commandRegistry;
			
			this.pageActionsWrapperId = "pageActions";
			this.selectionActionsWrapperId = "selectionTools";
			this.defaultActionWrapperId = "DefaultActionWrapper";
		}
		
		SiteServicesExplorer.prototype = new mExplorer.Explorer();
		
		SiteServicesExplorer.prototype._updatePageActions = function(registry, item){
			var toolbar = document.getElementById(this.pageActionsWrapperId);
			if (toolbar) {
				this.commandService.destroy(toolbar);
			} else {
				throw "could not find toolbar " + this.pageActionsWrapperId; //$NON-NLS-0$
			}
			this.commandService.renderCommands(this.pageActionsWrapperId, toolbar, item, this, "button", this.getRefreshHandler());  //$NON-NLS-0$
		};
		
		SiteServicesExplorer.prototype._getSiteConfigurations = function(siteServices, result, deferred){
			var that = this;
			
			if (!deferred)
				deferred = new Deferred();
			
			if (!result)
				result = [];
			
			if (siteServices.length > 0) {
				siteServices[0].getSiteConfigurations().then(
					function(/**Array*/ siteConfigurations) {
						var item = {};
						item.siteService = siteServices[0];
						if (siteConfigurations) {
							item.siteConfigurations = siteConfigurations.sort(function(a, b) {
								var n1 = a.Name && a.Name.toLowerCase();
								var n2 = b.Name && b.Name.toLowerCase();
								if (n1 < n2) { return -1; }
								if (n1 > n2) { return 1; }
								return 0;
							});
						} else {
							item.siteConfigurations = [];
						}
						
						result.push(item);
						that._getSiteConfigurations(siteServices.slice(1), result, deferred);
					}
				);					
			} else {
				deferred.resolve(result);
			}
			
			return deferred;
		};
		
		SiteServicesExplorer.prototype.display = function(){
			var that = this;
			
			var progressService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			var loadingDeferred = new Deferred();
			progressService.showWhile(loadingDeferred, messages['Loading...']);
			
			var siteServiceRefs = this.registry.getServiceReferences('orion.site'); //$NON-NLS-0$

			this.siteClients = [];
			for (var i=0; i < siteServiceRefs.length; i++) {
				var siteServiceRef = siteServiceRefs[i];
				var siteService = this.registry.getService(siteServiceRef);
				this.siteClients.push(new mSiteClient.SiteClient(this.registry, siteService, siteServiceRef));
			}

			var commandService = this.commandService;
			this._getSiteConfigurations(this.siteClients).then(
				function(siteConfigurations){
					that.renderer = new SitesRenderer({registry: that.registry, commandService: that.commandService, actionScopeId: "sdsd", cachePrefix: "SitesExplorer", checkbox: false}, that); //$NON-NLS-0$

					commandService.registerCommandContribution(that.pageActionsWrapperId, 'orion.site.create', 100); //$NON-NLS-0$
					
					commandService.registerCommandContribution(that.selectionActionsWrapperId, 'orion.site.start', 20); //$NON-NLS-0$
					commandService.registerCommandContribution(that.selectionActionsWrapperId, 'orion.site.stop', 30); //$NON-NLS-0$
					commandService.registerCommandContribution(that.selectionActionsWrapperId, 'orion.site.delete', 40, null, false, new mKeyBinding.KeyBinding(lib.KEY.DEL)); //$NON-NLS-0$
					
					commandService.registerCommandContribution(that.defaultActionWrapperId, 'orion.site.start', 20); //$NON-NLS-0$
					commandService.registerCommandContribution(that.defaultActionWrapperId, 'orion.site.stop', 30); //$NON-NLS-0$
					
					for (var i=0; i<siteConfigurations.length; i++){
						var siteServiceId = siteConfigurations[i].siteService._id;
						if	(siteConfigurations.length > 1){
							var titleWrapper = new mSection.Section(document.getElementById(that.parentId), {
								id: siteServiceId + "_Section", //$NON-NLS-0$
								title: siteConfigurations[i].siteService._name,
								content: '<div id="' + siteServiceId + '_Node" class="mainPadding"></list>', //$NON-NLS-1$ //$NON-NLS-0$
								canHide: true
							});
						} else {
							var contentParent = document.createElement("div"); //$NON-NLS-0$
							contentParent.setAttribute("role", "region"); //$NON-NLS-1$ //$NON-NLS-0$
							contentParent.classList.add("sectionTable"); //$NON-NLS-0$
							document.getElementById(that.parentId).appendChild(contentParent);
							var div = document.createElement("div"); //$NON-NLS-0$
							div.id = siteServiceId + '_Node';
							div.classList.add("mainPadding"); //$NON-NLS-0$
							contentParent.appendChild(div);
						}
					
						that.createTree(siteServiceId + "_Node", new SiteTreeModel(siteConfigurations[i].siteConfigurations), {setFocus: true});
					}
					
					// TODO should show Create per each site service
					that._updatePageActions(that.registry, siteServiceRefs[0]); //$NON-NLS-1$ //$NON-NLS-0$
					
					if (!that.doOnce){
						that.registry.getService("orion.page.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
							var selectionTools = document.getElementById(that.selectionActionsWrapperId);
							if (selectionTools) {
								commandService.destroy(selectionTools);						
								commandService.renderCommands(that.selectionActionsWrapperId, selectionTools, event.selections, that, "button", that.getRefreshHandler()); //$NON-NLS-1$ //$NON-NLS-0$
							}
						});
						
						that.doOnce = true;
					}
					
					loadingDeferred.resolve();
					progressService.setProgressMessage("");
				}
			);
		};
		
		SiteServicesExplorer.prototype.getRefreshHandler = function(){
			return {
				startCallback: this.refresh.bind(this),
				stopCallback: this.refresh.bind(this),
				deleteCallback: this.refresh.bind(this),
				errorCallback: this.refresh.bind(this)
			};
		};
		
		SiteServicesExplorer.prototype.refresh = function(){
			var that = this;

			this._getSiteConfigurations(this.siteClients).then(
				function(siteConfigurations){
					for (var i=0; i<siteConfigurations.length; i++){
						var siteServiceId = siteConfigurations[i].siteService._id + "_Node";
						lib.empty(lib.node(siteServiceId));
						that.createTree(siteServiceId, new SiteTreeModel(siteConfigurations[i].siteConfigurations), {setFocus: true});
					}
				}
			);
		};
		
		return SiteServicesExplorer;
	}());
	
	SitesRenderer = (function() {
		
		SitesRenderer.prototype = new mExplorer.SelectionRenderer();
		
		/**
		 * @name orion.sites.SitesRenderer
		 * @class A renderer for a list of site configurations obtained from a site service.
		 * @see orion.treetable.TableTree
		 * @private
		 */
		function SitesRenderer(options, explorer) {
			this._init(options);
			this.options = options;
			this.explorer = explorer;
			this.registry = options.registry;
			this.commandService = options.commandService;
		}
		
		SitesRenderer.prototype.getCellElement = function(col_no, item, tableRow){					
			switch(col_no){
				case 0:
					var td = document.createElement("td"); //$NON-NLS-0$
					var div = document.createElement( "div"); //$NON-NLS-0$
					div.classList.add("sectionTableItem"); //$NON-NLS-0$
					td.appendChild(div); //$NON-NLS-0$
					
					var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
					
					// Site config column
					var href = mSiteUtils.generateEditSiteHref(item);
					var nameLink = document.createElement("a"); //$NON-NLS-0$
					nameLink.href = href;
					div.appendChild(nameLink);
					
					nameLink.appendChild(document.createTextNode(item.Name));
					mNavUtils.addNavGrid(this.explorer.getNavDict(), item, nameLink);
					
					var statusField = document.createElement("span"); //$NON-NLS-0$
					statusField.classList.add("statusField"); //$NON-NLS-0$
					div.appendChild(statusField);
					
					// Status, URL columns
					var status = item.HostingStatus;
					if (typeof status === "object") { //$NON-NLS-0$
						if (status.Status === "started") { //$NON-NLS-0$
							statusField.appendChild(document.createTextNode("(" + messages["Started"] + " ")); //TODO NLS fragment (
							
							var link = document.createElement("a");
							link.textContent = status.URL;
							statusField.appendChild(link);
							mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);

							statusField.appendChild(document.createTextNode(")")); //TODO NLS fragment )
							
							var inlineAction = document.createElement("span"); //$NON-NLS-0$
							inlineAction.classList.add("inlineAction"); //$NON-NLS-0$
							statusField.appendChild(inlineAction);
							this.commandService.renderCommands("DefaultActionWrapper", inlineAction, item, this.explorer, "button", this.explorer.getRefreshHandler(), navGridHolder); //$NON-NLS-1$ //$NON-NLS-0$
							
							var statusString = "this site.";
							statusField.appendChild(document.createTextNode(statusString));
							
							link.href = status.URL;
						} else {
							var statusString = "(" + status.Status.substring(0,1).toUpperCase() + status.Status.substring(1) + ")";
							statusField.appendChild(document.createTextNode(statusString));
							
							var inlineAction = document.createElement("span"); //$NON-NLS-0$
							inlineAction.classList.add("inlineAction"); //$NON-NLS-0$
							statusField.appendChild(inlineAction);
							this.commandService.renderCommands("DefaultActionWrapper", inlineAction, item, this.explorer, "button", this.explorer.getRefreshHandler(), navGridHolder); //$NON-NLS-1$ //$NON-NLS-0$
							
							statusField.appendChild(document.createTextNode("this site"));
						}
					} else {
						statusField.appendChild(document.createTextNode(messages["Unknown"]));
					}
	
					return td;
				break;
			}
		};
				
		return SitesRenderer;
	}());
	
	SiteTreeModel = (function() {
		/**
		 * @name orion.sites.SiteTreeModel
		 * @class Tree model for powering a tree of site configurations.
		 * @see orion.treetable.TableTree
		 * @private
		 */
		function SiteTreeModel(siteConfigurations, id) {
			this._siteConfigurations = siteConfigurations;
			this._root = {};
			this._id = id;
		}
		SiteTreeModel.prototype = /** @lends orion.sites.SiteTreeModel.prototype */{
			getRoot: function(/**function*/ onItem) {
				onItem(this._root);
			},
			
			getChildren: function(/**Object*/ parentItem, /**Function(items)*/ onComplete) {
				if (parentItem.children) {
					// The parent already has the children fetched
					onComplete(parentItem.children);
				} else if (parentItem === this._root) {
					parentItem.children = this._siteConfigurations;
					onComplete(this._siteConfigurations);
				} else {
					return onComplete([]);
				}
			},
			getId: function(/**Object|String*/ item) {
				return (item === this._root || item === this._id) ? this._id : item.Id;
			}
		};
		return SiteTreeModel;
	}());

	return SiteServicesExplorer;
});