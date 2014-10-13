/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/sites/nls/messages', 'orion/explorers/explorer', 'orion/Deferred', 'orion/section', 'orion/sites/siteUtils', 'orion/sites/siteClient', 'orion/webui/littlelib'],
		function(messages, mExplorer, Deferred, mSection, mSiteUtils, mSiteClient, lib) {
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
			
			this.pageActionsWrapperId = "pageActions"; //$NON-NLS-0$
			this.selectionActionsWrapperId = "selectionTools"; //$NON-NLS-0$
			this.defaultActionWrapperId = "DefaultActionWrapper"; //$NON-NLS-0$
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
		
		// @returns {{ siteService: Service, siteConfigurations: SiteConfiguration[] }}[]
		SiteServicesExplorer.prototype._getSiteConfigurations = function(siteServices){
			var promises = siteServices.map(function(siteService) {
				return siteService.getSiteConfigurations().then(function(siteConfigurations) {
					siteConfigurations = siteConfigurations || [];
					var item = {};
					item.siteService = siteService;
					item.siteConfigurations = siteConfigurations.sort(function(a, b) {
						var n1 = a.Name && a.Name.toLowerCase();
						var n2 = b.Name && b.Name.toLowerCase();
						if (n1 < n2) { return -1; }
						if (n1 > n2) { return 1; }
						return 0;
					});
					return item;
				});
			});
			return Deferred.all(promises);
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
					that.renderer = new SitesRenderer({registry: that.registry, commandService: that.commandService, actionScopeId: "sdsd", cachePrefix: "SitesExplorer", checkbox: false}, that); //$NON-NLS-0$  //$NON-NLS-1$

					commandService.registerCommandContribution(that.pageActionsWrapperId, 'orion.site.create', 100); //$NON-NLS-0$
					
					commandService.registerCommandContribution(that.defaultActionWrapperId, 'orion.site.start', 20); //$NON-NLS-0$
					commandService.registerCommandContribution(that.defaultActionWrapperId, 'orion.site.stop', 30); //$NON-NLS-0$
					commandService.registerCommandContribution(that.defaultActionWrapperId, 'orion.site.delete', 40, null, false); //$NON-NLS-0$

					var areConfigurations = siteConfigurations.some(function(sc) {
						return sc.siteConfigurations && sc.siteConfigurations.length > 0;
					});

					// If there are no configurations, put up an info box					
					if (!areConfigurations){
						that.renderNoSites(document.getElementById(that.parentId), siteServiceRefs[0]);
					} else {				
						for (var i=0; i<siteConfigurations.length; i++){
							var siteServiceId = siteConfigurations[i].siteService._id;
							// If there are multiple site config types, organize them into a tree
							if (siteConfigurations.length > 1){
								new mSection.Section(document.getElementById(that.parentId), {
									id: siteServiceId + "_Section", //$NON-NLS-0$
									title: siteConfigurations[i].siteService._name,
									content: '<div id="' + siteServiceId + '_Node" class="mainPadding siteGroup"></list>', //$NON-NLS-1$ //$NON-NLS-0$
									canHide: true
								});
							// If there are sites of just one config type, put them in a table
							} else {
								var contentParent = document.createElement("div"); //$NON-NLS-0$
								contentParent.setAttribute("role", "region"); //$NON-NLS-1$ //$NON-NLS-0$
								document.getElementById(that.parentId).appendChild(contentParent);
								var div = document.createElement("div"); //$NON-NLS-0$
								div.id = siteServiceId + '_Node'; //$NON-NLS-0$
								div.classList.add("mainPadding"); //$NON-NLS-0$
								contentParent.appendChild(div);
							}
						
							that.createTree(siteServiceId + "_Node", new SiteTreeModel(siteConfigurations[i].siteConfigurations), {setFocus: false, noSelection: true}); //$NON-NLS-0$
						}
					}
					
					// TODO should show Create per each site service
					that._updatePageActions(that.registry, siteServiceRefs[0]); //$NON-NLS-1$ //$NON-NLS-0$
					
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
					// TODO Code is very similar to initial tree display				
					var areConfigurations = false;
					for (var i=0; i<siteConfigurations.length; i++){
						// Remove deleted sites
						var siteServiceId = siteConfigurations[i].siteService._id + "_Node"; //$NON-NLS-0$
						lib.empty(lib.node(siteServiceId));
						
						// Check if there are any configurations left and create the tree
						if (siteConfigurations[i].siteConfigurations && siteConfigurations[i].siteConfigurations.length > 0){
							areConfigurations = true;
							that.createTree(siteServiceId, new SiteTreeModel(siteConfigurations[i].siteConfigurations), {setFocus: false, noSelection: true});
						}
					}
					
					// If there are no sites defined, tell the user with a button to create a site
					if (!areConfigurations){
						var siteServiceRefs = that.registry.getServiceReferences('orion.site'); //$NON-NLS-0$
						that.renderNoSites(document.getElementById(that.parentId), siteServiceRefs[0]);
					}
				}
			);
		};
		
		/**
		 * @name renderNoSites
		 * @description Generates an explorer showing the sites on each site service.
		 * @private
		 * 
		 * @param DOM element that the no sites content should be rendered in
		 * @param Site service reference to use to create the commands
		 */
		SiteServicesExplorer.prototype.renderNoSites = function(parentElement, siteServiceRef){
			// If there are no sites defined, tell the user with a button to create a site
			var that = this;
			var noSites = document.createElement("div"); //$NON-NLS-0$
			noSites.className = "sitesPanel sectionWrapper sectionTitle"; //$NON-NLS-0$
			
			// Insert the create action into the no sites text
			var actions = document.createElement("span"); //$NON-NLS-0$
			that.commandService.renderCommands(that.pageActionsWrapperId, actions, siteServiceRef, that, "button", that.getRefreshHandler()); //$NON-NLS-0$
			noSites.appendChild(actions);
			
			var textNode = document.createElement("span");  //$NON-NLS-0$
			textNode.textContent = messages["SitesExplorer.NoSitesText"];
			lib.processDOMNodes(textNode, [actions]);
			
			noSites.appendChild(textNode);
			parentElement.appendChild(noSites);
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
		
		SitesRenderer.prototype.render = function(item, tableRow){
			// The explorer enters inline style info to remove padding, create a filler item
			var filler = document.createElement("div"); //$NON-NLS-0$
			tableRow.appendChild(filler);
			
			// Title area
			var siteTitle = document.createElement("div"); //$NON-NLS-0$
			siteTitle.className = "sectionWrapper toolComposite sitesPanel"; //$NON-NLS-0$
			tableRow.appendChild(siteTitle);
			
			var sectionAnchor = document.createElement("div"); //$NON-NLS-0$
			sectionAnchor.className = "sectionAnchor sectionTitle layoutLeft"; //$NON-NLS-0$
			siteTitle.appendChild(sectionAnchor);
			
			var title = document.createElement("span"); //$NON-NLS-0$
			sectionAnchor.appendChild(title);
			
			var href = mSiteUtils.generateEditSiteHref(item);
			var nameLink = document.createElement("a"); //$NON-NLS-0$
			nameLink.href = href;
			title.appendChild(nameLink);
			
			nameLink.appendChild(document.createTextNode(item.Name));
			
			var actionsArea = document.createElement("div"); //$NON-NLS-0$
			actionsArea.className = "layoutRight sectionActions"; //$NON-NLS-0$
			actionsArea.id = "siteActionsArea"; //$NON-NLS-0$
			siteTitle.appendChild(actionsArea);
			
			this.commandService.renderCommands("DefaultActionWrapper", actionsArea, item, this.explorer, "button", this.explorer.getRefreshHandler()); //$NON-NLS-1$ //$NON-NLS-0$			
				
			// Content area
			var repoSectionContent = document.createElement("div"); //$NON-NLS-0$
			repoSectionContent.className = "sectionTable sectionTableItem"; //$NON-NLS-0$
			tableRow.appendChild(repoSectionContent);
									
			var detailsView = document.createElement("div"); //$NON-NLS-0$
			detailsView.className = "stretch"; //$NON-NLS-0$
			repoSectionContent.appendChild(detailsView);
			
			var statusField = document.createElement("div"); //$NON-NLS-0$
			detailsView.appendChild(statusField);
			
			var status = item.HostingStatus;
			if (typeof status === "object") { //$NON-NLS-0$
				if (status.Status === "started") { //$NON-NLS-0$
					var link = document.createElement("a"); //$NON-NLS-0$
					link.textContent = status.URL;
					link.href = status.URL;
					statusField.appendChild(link);
					
					var startedNode = document.createElement("span"); //$NON-NLS-0$
					startedNode.textContent = messages["Started"];
					lib.processDOMNodes(startedNode, [link]);
					statusField.appendChild(startedNode);
				} else if (status.Status === "stopped"){ //$NON-NLS-0$
					statusField.appendChild(document.createTextNode(messages["Stopped"]));
				} else {
					// Putting the status string in the UI prevents it from being translated
					var statusString = status.Status.substring(0,1).toUpperCase() + status.Status.substring(1);
					statusField.appendChild(document.createTextNode(statusString));
				}
			} else {
				statusField.appendChild(document.createTextNode(messages["Unknown"]));
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