/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define orion window document */
/*jslint browser:true*/

/*
 * Glue code for content.html
 */

define(['i18n!orion/content/nls/messages', 'require', 'orion/bootstrap', 'orion/webui/littlelib', 'orion/section', 'orion/status', 'orion/progress', 'orion/commandRegistry', 
			'orion/commands', 'orion/fileClient', 'orion/operationsClient', 'orion/searchClient', 'orion/globalCommands', 'orion/PageUtil'], 
			function(messages, require, mBootstrap, lib, mSection, mStatus, mProgress, mCommandRegistry, mCommands, mFileClient, mOperationsClient, mSearchClient, 
				mGlobalCommands, PageUtil) {

		mBootstrap.startup().then(function(core) {
			var serviceRegistry = core.serviceRegistry;
			var preferences = core.preferences;
			// Register services.  Unfortunately we currently must register everything we think our modules need, even if we don't directly
			// use them here.
			// See https://bugs.eclipse.org/bugs/show_bug.cgi?id=337740
			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// if the page manages a set of selections, we would create a selection service and give it to the command registry.
			var commandRegistry = new mCommandRegistry.CommandRegistry({ });
			var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
			var fileClient = new mFileClient.FileClient(serviceRegistry);
			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
			
			function fillMyPage() {
				// Get our DOM id's so we can pass them to javascript components.
				var leftPane = lib.node("sidebar"); //$NON-NLS-0$
				var rightPane = lib.node("target");  //$NON-NLS-0$
				
				// Create a section component for the left hand side.
				var leftHandSection = new mSection.Section(leftPane, {
					id: "myLeftSection", //$NON-NLS-0$
					title: "Left Hand Side", //$NON-NLS-0$
					content: '<div id="myStuff">You can put a template in the content.</div>', //$NON-NLS-0$
					preferenceService: preferences,
					canHide: true,
					useAuxStyle: true
				});
				
				// Create a section component for the left hand side.
				var rightHandSection = new mSection.Section(rightPane, {
					id: "myRightSection", //$NON-NLS-0$
					title: "Right Hand Side", //$NON-NLS-0$
					content: '<div id="rightContent">Try changing the hash</div>', //$NON-NLS-0$
					preferenceService: preferences
				});
				
				// Commands for the toolbar. 
				// Step 1 is define the command.  This is done inside components as well as on the page, depending on scope.
				var exampleCommand = new mCommands.Command({
					name: "Push Me!", 
					tooltip:"Example command", 
					id: "orion.pushme", //$NON-NLS-0$
					callback: function(data) {
						commandRegistry.confirm(data.domNode, "Are you sure you want to push this button?", "Yes", "No", false, function(confirmed) {
							if (confirmed) {
								var content = lib.node("rightContent"); //$NON-NLS-0$
								lib.empty(content);
								content.appendChild(document.createTextNode("OUCH!"));  //$NON-NLS-0$
							}
						});
					}
				});
				// Step 2.  Add to command service.  This is what makes it available to any DOM node on the page.
				commandRegistry.addCommand(exampleCommand);
				
				// Step 3.  Add it to the DOM of the main toolbar.  "myPageCommands" is an id chosen by this page to represent
				// commands that belong on the page.
				commandRegistry.registerCommandContribution("myPageCommands", "orion.pushme", 1);  //$NON-NLS-1$ //$NON-NLS-0$
				
				// Step 4.  Render.  Here is where we actually decide that our page commands should go in the main toolbar.  We
				// could have decided to put them somewhere else in the DOM.  "pageActions" is the main toolbar id.
				commandRegistry.renderCommands("myPageCommands", "pageActions", {}); //$NON-NLS-1$ //$NON-NLS-0$
			}
			
			// Here we track hash changes.  Another pattern is that the component on the right side would track the hash change
			// internally.
			function updateRightSide() {
				// Many pages use the hash to determine the content.
				var parameters = PageUtil.matchResourceParameters();
				
				var content = lib.node("rightContent"); //$NON-NLS-0$
				lib.empty(content);
				var text = parameters.resource.length > 0 ? "Showing interesting info about " + parameters.resource + "!" : "Try adding a hash to the URL"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				content.appendChild(document.createTextNode(text)); 
				
				// Here we use a page service, though this is usually done inside components to whom we've passed the service.
				if (parameters.resource.length > 0) {
					statusService.setMessage("Status for " + parameters.resource + "."); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}
			
			// first parameter is page id from html.  These id's should ideally be unique across pages because the id may be used in
			// preferences, localStorage, etc. to save page-related UI state.
			mGlobalCommands.generateBanner("orion-leftrightpage", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
			window.addEventListener("hashchange", function() { updateRightSide(); }, false); //$NON-NLS-0$
			fillMyPage();
		});
});