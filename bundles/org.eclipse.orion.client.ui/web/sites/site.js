/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global confirm define window*/
/*jslint browser:true*/

/*
 * Glue code for site.html
 */
define(['require', 'i18n!orion/sites/nls/messages', 'orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 
	'orion/fileClient', 'orion/operationsClient', 'orion/searchClient', 'orion/dialogs', 'orion/globalCommands', 'orion/sites/siteClient', 'orion/sites/siteCommands',
	'orion/PageUtil', 'orion/sites/SiteEditor'], 
	function(require, messages, mBootstrap, mStatus, mProgress, mCommandRegistry, mFileClient, mOperationsClient, mSearchClient, mDialogs, mGlobalCommands, mSiteClient, mSiteCommands, PageUtil, SiteEditor) {
		mBootstrap.startup().then(function(core) {
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			
			var dialogService = new mDialogs.DialogService(serviceRegistry);
			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var commandRegistry = new mCommandRegistry.CommandRegistry({ });
			var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
		
			var siteLocation = PageUtil.matchResourceParameters().resource;
			var siteClient = mSiteClient.forLocation(serviceRegistry, siteLocation);
			var fileClient = siteClient._getFileClient();
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
			mGlobalCommands.generateBanner("orion-site", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$

			var widget;
			var updateTitle = function() {
				var site = widget && widget.getSiteConfiguration();
				if (widget && site) {
					var item ={};
					item.Parents = [];
					item.Name = site.Name;
					item.Parents[0] = {};
					item.Parents[0].Name = messages["Sites"];
					item.Parents[0].Location = "";
					mGlobalCommands.setPageTarget({task: "Edit Site", target: site, breadcrumbTarget: item,
						makeBreadcrumbLink: function(seg, location){
							seg.href = require.toUrl("sites/sites.html"); //$NON-NLS-0$
						},
						serviceRegistry: serviceRegistry, searchService: searcher, fileService: fileClient, commandService: commandRegistry
					});
					mGlobalCommands.setDirtyIndicator(widget.isDirty());
				}
			};

			var onHashChange = function() {
				var params = PageUtil.matchResourceParameters();
				var resource = params.resource;
				if (resource && resource !== widget.getResource()) {
					var doit = !widget.isDirty() || confirm(messages['There are unsaved changes. Do you still want to navigate away?']);
					if (doit) {
						widget.load(resource).then(
							function() {
								updateTitle();
							});
					}
				}
			};
			window.addEventListener("hashchange", onHashChange);
			
			// Initialize the widget
			(function() {
				widget = new SiteEditor({
					serviceRegistry: serviceRegistry,
					fileClient: fileClient,
					siteClient: siteClient,
					commandService: commandRegistry,
					statusService: statusService,
					progressService: progressService,
					commandsContainer: document.getElementById("pageActions"), //$NON-NLS-0$
					id: "site-editor"}); //$NON-NLS-0$
				document.getElementById("site").appendChild(widget.node); //$NON-NLS-0$
				widget.show();

				widget.addEventListener("success", updateTitle); //$NON-NLS-0$
				widget.addEventListener("dirty", updateTitle); //$NON-NLS-0$

				onHashChange();
			}());
			
			window.onbeforeunload = function() {
				if (widget.isDirty()) {
					return messages['There are unsaved changes.'];
				}
			};

			mSiteCommands.createSiteCommands(serviceRegistry, commandRegistry);
			commandRegistry.registerCommandContribution("pageActions", "orion.site.start", 1); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("pageActions", "orion.site.stop", 2); //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.registerCommandContribution("pageActions", "orion.site.convert", 3); //$NON-NLS-1$ //$NON-NLS-0$
		});
});