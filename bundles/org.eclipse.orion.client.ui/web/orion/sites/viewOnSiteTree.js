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
define(['i18n!orion/sites/nls/messages', 'orion/i18nUtil', 'orion/Deferred', 'orion/globalCommands',
		'orion/sites/siteUtils', 'orion/sites/siteClient', 'orion/webui/treetable',
		'orion/webui/littlelib'],
		function(messages, i18nUtil, Deferred, mGlobalCommands, mSiteUtils, mSiteClient, treetable, lib) {
	var formatMessage = i18nUtil.formatMessage;
	var TableTree = treetable.TableTree;
	var ViewOnSiteTree;

	var SiteTreeModel = (function() {
		/**
		 * @name orion.sites.SiteTreeModel
		 * @class Tree model for powering a tree of site configurations.
		 * @see orion.treetable.TableTree
		 * @private
		 */
		function SiteTreeModel(siteService, id) {
			this._siteService = siteService;
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
					this._siteService.getSiteConfigurations().then(
						function(/**Array*/ siteConfigurations) {
							parentItem.children = siteConfigurations;
							onComplete(siteConfigurations);
						});
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
	
	var SitesRenderer = (function() {
		/**
		 * @name orion.sites.SitesRenderer
		 * @class A renderer for a list of site configurations obtained from a site service.
		 * @see orion.treetable.TableTree
		 * @private
		 */
		function SitesRenderer(options) {
			this._commandService = options.commandRegistry;
			this._options = options;
		}
		SitesRenderer.prototype = /** @lends orion.sites.SitesRenderer.prototype */{
		    /* eslint-disable no-unused-params */
			initTable: function (tableNode, tableTree) {
				tableNode.classList.add("treetable"); //$NON-NLS-0$
			},
			/* eslint-enable no-unused-params */
			render: function(item, tableRow) {
				tableRow.className += "treeTableRow addsitesTableRow"; //$NON-NLS-0$
				
				var siteConfigCol = document.createElement("td"); //$NON-NLS-0$
				siteConfigCol.id = tableRow.id + "col1"; //$NON-NLS-0$
				var actionCol = document.createElement("td"); //$NON-NLS-0$
				actionCol.id = tableRow.id + "col4"; //$NON-NLS-0$
				
				// Site config column
				var href = mSiteUtils.generateEditSiteHref(item);
				var nameLink = document.createElement("a"); //$NON-NLS-0$
				nameLink.href = href;
				siteConfigCol.appendChild(nameLink);
				nameLink.textContent = item.Name;
				
				var statusField = document.createElement("span"); //$NON-NLS-0$
				statusField.style.padding = "0 10px 0 10px"; //$NON-NLS-0$
				siteConfigCol.appendChild(statusField);
				
				// Status, URL columns
				var status = item.HostingStatus;
				if (typeof status === "object") { //$NON-NLS-0$
					if (status.Status === "started") { //$NON-NLS-0$
						statusField.appendChild(document.createTextNode(messages["Started"]));
						var link = document.createElement("a"); //$NON-NLS-0$
						link.href = status.URL;
						link.textContent = status.URL;
						siteConfigCol.appendChild(link);
					} else {
						var statusString = status.Status.substring(0,1).toUpperCase() + status.Status.substring(1);
						statusField.appendChild(document.createTextNode(statusString));
					}
				} else {
					statusField.appendChild(document.createTextNode(messages["Unknown"]));
				}
				
				// Action column
				var actionsWrapper = document.createElement("span"); //$NON-NLS-0$
				actionsWrapper.id = tableRow.id + "actionswrapper"; //$NON-NLS-0$
				actionsWrapper.classList.add("sectionTableItemActions"); //$NON-NLS-0$
				actionCol.appendChild(actionsWrapper);
				var options = this._options;
				var userData = {
					startCallback: options.startCallback,
					stopCallback: options.stopCallback,
					deleteCallback: options.deleteCallback,
					errorCallback: function(err) {
						options.serviceRegistry.getService('orion.page.message').setProgressResult(err); //$NON-NLS-0$
					}
				};
				this._commandService.renderCommands(options.actionScopeId, actionsWrapper, item, null /*handler*/, "tool", userData); //$NON-NLS-0$

				tableRow.appendChild(siteConfigCol);
				tableRow.appendChild(actionCol);
			},
			rowsChanged: function() {
				lib.$$array(".treeTableRow").forEach(function(node, i) { //$NON-NLS-0$
					var on = (i % 2) ? "darkTreeTableRow" : "lightTreeTableRow";
					var off = (on === "darkTreeTableRow") ? "lightTreeTableRow" : "darkTreeTableRow";
					node.classList.add(on);
					node.classList.remove(off);
				});
			},
			labelColumnIndex: 0,
			/* eslint-disable no-unused-params */
			updateExpandVisuals: function(row, isExpanded) {
			    //TODO page doesn't have expansion
			}
			/* eslint-enable no-unused-params */
		};
		return SitesRenderer;
	}());
	
	var ViewOnSiteTreeModel = (function() {
		function createModelItems(siteConfigurations, isRunningOns) {
			function ViewOnSiteModelItem(siteConfig, isFileRunningOn) {
				this.SiteConfiguration = siteConfig;
				this.Id = "ViewOnSite" + siteConfig.Id; //$NON-NLS-0$
				// Model keeps track of whether the file is available on this site configuration
				this.IsFileRunningOn = isFileRunningOn;
			}
			var modelItems = [];
			modelItems.push(
				{	Id: "newsite", //$NON-NLS-0$
					Placeholder: true
				});
			for (var i=0; i < siteConfigurations.length; i++) {
				modelItems.push(new ViewOnSiteModelItem(siteConfigurations[i], isRunningOns[i]));
			}
			return modelItems;
		}
		/** @returns {Deferred} */
		function isFileRunningOnSite(siteService, site, file) {
			return siteService.isFileMapped(site, file).then(function(isFileMapped) {
				var isStarted = site.HostingStatus && site.HostingStatus.Status === "started"; //$NON-NLS-0$
				return site && file && isStarted && isFileMapped;
			});
		}
		/**
		 * @param {Object} file
		 */
		function ViewOnSiteTreeModel(siteService, id, file) {
			SiteTreeModel.call(this, siteService, id);
			this._file = file;
		}
		ViewOnSiteTreeModel.prototype = {
			getRoot: SiteTreeModel.prototype.getRoot,
			getId: SiteTreeModel.prototype.getId,
			getChildren: function(parentItem, onComplete) {
				if (parentItem.children) {
					onComplete(parentItem.children);
				} else if (parentItem === this._root) {
					var self = this;
					ViewOnSiteTreeModel.createViewOnSiteModelItems(self._siteService, self._file).then(function(modelItems) {
						parentItem.children = modelItems;
						onComplete(modelItems);
					});
				} else {
					onComplete([]);
				}
			}
		};
		/** @returns {Deferred} */
		ViewOnSiteTreeModel.createViewOnSiteModelItems = function(siteService, file) {
			return siteService.getSiteConfigurations().then(function(siteConfigurations) {
				return Deferred.all(siteConfigurations.map(function(site) {
					return isFileRunningOnSite(siteService, site, file);
				})).then(function(isRunningOns) {
					return createModelItems(siteConfigurations, isRunningOns);
				});
			});
		};
		return ViewOnSiteTreeModel;
	}());
	
	var ViewOnSiteRenderer = (function() {
		/**
		 * @param {Object} options.file
		 * @param {Function} options.addToCallback
		 * @param {Function} options.errorCallback
		 */
		function ViewOnSiteRenderer(options) {
			SitesRenderer.apply(this, Array.prototype.slice.call(arguments));
			this.serviceRegistry = options.serviceRegistry;
			this._commandService = options.commandRegistry;
			this.file = options.file;
			this.addToCallback = options.addToCallback;
			this.errorCallback = options.errorCallback;
		}
		ViewOnSiteRenderer.prototype = {
			initTable: function (tableNode, tableTree) {
				this.tableTree = tableTree;
				tableNode.classList.add("treetable"); //$NON-NLS-0$
				tableNode.classList.add("viewOnSiteTable"); //$NON-NLS-0$
				var thead = document.createElement("thead"); //$NON-NLS-0$
				var nameCol = document.createElement("th");
				thead.appendChild(nameCol);
				var actionsCol = document.createElement("th"); //$NON-NLS-0$
				thead.appendChild(actionsCol);
				nameCol.textContent = messages['Name'];
				actionsCol.textContent = messages['Actions'];
				tableNode.appendChild(thead);
			},
			render: function(item, tableRow) {
				var siteConfig = item.SiteConfiguration;
				tableRow.classList.add("treeTableRow"); //$NON-NLS-0$
				tableRow.classList.add("sitesTableRow"); //$NON-NLS-0$
				if (item.Placeholder) {
					tableRow.classList.add("newSiteRow"); //$NON-NLS-0$
				}
				var siteConfigCol = document.createElement("td"); //$NON-NLS-0$
				siteConfigCol.id = tableRow.id + "col1"; //$NON-NLS-0$
				if (item.Placeholder) {
					siteConfigCol.classList.add("newSiteCol"); //$NON-NLS-0$
				}

				var actionCol = document.createElement("td");
				actionCol.id = tableRow.id + "col2"; //$NON-NLS-0$

				// Site config column
				siteConfigCol.textContent = item.Placeholder ? messages["New Site"] : siteConfig.Name;

				// Action column
				var actionsWrapper = document.createElement("span"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				actionsWrapper.id = tableRow.id + "actionswrapper";
				actionCol.appendChild(actionsWrapper);

				var userData = {
					file: this.file,
					addToCallback: this.addToCallback,
					errorCallback: this.errorCallback
				};
				this._commandService.renderCommands("viewOnSiteScope", actionsWrapper, item,  null /*handler*/, "button", userData); //$NON-NLS-1$ //$NON-NLS-0$

				tableRow.appendChild(siteConfigCol);
				tableRow.appendChild(actionCol);
			},
			rowsChanged: SitesRenderer.prototype.rowsChanged,
			labelColumnIndex: 0,
			/* eslint-disable no-unused-params */
			updateExpandVisuals: function(row, isExpanded) {
			    //TODO page doesn't have expansion
			}
			/* eslint-enable no-unused-params */
		};
		return ViewOnSiteRenderer;
	}());

	/**
	 * @name orion.sites.ViewOnSiteTree
	 * @class A tree widget that displays a list of sites that a file can be viewed on.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry
	 * @param {String} options.fileLocation
	 *
	 * @param {String} options.id
	 * @param {DomNode} options.parent
	 * @param {orion.sites.SiteTreeModel} [options.model]
	 * @param {orion.sites.SitesRenderer} [options.renderer]
	 */
	ViewOnSiteTree = /** @ignore */ (function() {
		function ViewOnSiteTree(options) {
			var serviceRegistry = options.serviceRegistry;
			var commandService = options.commandRegistry;
			var progress =  serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var siteService = this.siteService = mSiteClient.forFileLocation(serviceRegistry, options.fileLocation);
			var fileClient = options.fileClient;
			
			var def = fileClient.read(options.fileLocation, true);
			if(progress){
				progress.progress(def, "Reading file metadata " + options.fileLocation);
			}
			def.then(function(file) { //$NON-NLS-0$
				options.siteService = siteService;
				options.model = new ViewOnSiteTreeModel(siteService, options.id, file);
				options.file = this.file = file;

				// TODO should this be done by glue code?
				commandService.registerCommandContribution("viewOnSiteScope", "orion.site.add-to", 10); //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution("viewOnSiteScope", "orion.site.view-on-link", 20); //$NON-NLS-1$ //$NON-NLS-0$

				mGlobalCommands.setPageTarget({
						task: messages.ViewOnSiteTitle,
						target: file,
						serviceRegistry: serviceRegistry,
						commandService: commandService});

				var self = this;
				options.addToCallback = function() {
					self.refresh();
				};
				options.errorCallback = function(err) {
					options.serviceRegistry.getService('orion.page.message').setErrorMessage(err); //$NON-NLS-0$
				};

				options.renderer = new ViewOnSiteRenderer(options);
				if (options.label) {
					document.getElementById(options.label).textContent = formatMessage(messages.ViewOnSiteCaption, file.Name);
				}

				// Create tree widget
				var model = this.model = options.model || new SiteTreeModel(siteService, options.id);
				this.treeWidget = new TableTree({
					id: options.id,
					parent: options.parent,
					model: model,
					showRoot: false,
					renderer: options.renderer || new SitesRenderer(options)
				});
			}.bind(this));
		}
		ViewOnSiteTree.prototype = /** @lends orion.sites.ViewOnSiteTree.prototype */ {
			refresh: function() {
				// TODO call helper for this
				var self = this;
				ViewOnSiteTreeModel.createViewOnSiteModelItems(self.siteService, self.file).then(
					function(modelItems) {
						self.treeWidget.refresh(self.model._id, modelItems, true);
					});
			}
		};
		return ViewOnSiteTree;
	}());

	return ViewOnSiteTree;
});