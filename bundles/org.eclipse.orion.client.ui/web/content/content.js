/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define([
	'i18n!orion/content/nls/messages',
	'orion/webui/littlelib',
	'orion/bootstrap',
	'orion/status',
	'orion/progress',
	'orion/commandRegistry',
	'orion/fileClient',
	'orion/operationsClient',
	'orion/searchClient',
	'orion/globalCommands',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/PageLinks',
	'orion/URL-shim', // no exports
], function(messages, lib, mBootstrap, mStatus, mProgress, mCommandRegistry, mFileClient, mOperationsClient, mSearchClient, 
			mGlobalCommands, URITemplate, PageUtil, PageLinks) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
		
		// Register services
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		
		var fileMetadata;
		var orionHome = PageLinks.getOrionHome();
		
		/**
		 * Utility method for saving file contents to a specified location
		 */
		function saveFileContents(fileClient, targetMetadata, contents, afterSave) {
			var etag = targetMetadata.ETag;
			var args = { "ETag" : etag }; //$NON-NLS-0$
			progressService.progress(fileClient.write(targetMetadata.Location, contents, args), "Saving file " + targetMetadata.Location).then(
				function(result) {
					if (afterSave) {
						afterSave();
					}
				},
				/* error handling */
				function(error) {
					// expected error - HTTP 412 Precondition Failed 
					// occurs when file is out of sync with the server
					if (error.status === 412) {
						var forceSave = window.confirm(messages["ResrcOutOfSync"]);
						if (forceSave) {
							// repeat save operation, but without ETag 
							progressService.progress(fileClient.write(targetMetadata.Location, contents), "Saving file " + targetMetadata.Location).then(
								function(result) {
										targetMetadata.ETag = result.ETag;
										if (afterSave) {
											afterSave();
										}
								}
							);
						}
					}
					// unknown error
					else {
						error.log = true;
					}
				}
			);
		}
		
		function loadContent() {
			var foundContent = false;
			var params = PageUtil.matchResourceParameters(window.location.href);
			var nonHash = window.location.href.split('#')[0]; //$NON-NLS-0$
			// TODO: should not be necessary, see bug https://bugs.eclipse.org/bugs/show_bug.cgi?id=373450
			var locationObject = {OrionHome: orionHome, Location: params.resource};
			if (params.contentProvider) {
				// Note that the shape of the "orion.page.content" extension is not in any shape or form that could be considered final.
				// We've included it to enable experimentation. Please provide feedback on IRC or bugzilla.
		
				// The shape of the extension is:
				// info - information about the extension (object)
				//		required attribute: name - the name to be used in the page title and orion page heading
				//		required attribute: id - the id of the content contribution
				//		required attribute: uriTemplate - a uriTemplate that expands to the URL of the content to be placed in a content iframe
				//		optional attribute: saveToken - if specified, this token (or array of tokens) should be used to find a content URL provided inside a save URL
				//		optional attribute: saveTokenTerminator - if specified this terminator (or array of terminators) should be used to find the 
				//			end of a content URL provided in a save URL
				var contentProviders = serviceRegistry.getServiceReferences("orion.page.content"); //$NON-NLS-0$
				for (var i=0; i<contentProviders.length; i++) {
					// Exclude any navigation commands themselves, since we are the navigator.
					var id = contentProviders[i].getProperty("id"); //$NON-NLS-0$
					if (id === params.contentProvider) {
						var impl = serviceRegistry.getService(contentProviders[i]);
						var info = {};
						var propertyNames = contentProviders[i].getPropertyKeys();
						for (var j = 0; j < propertyNames.length; j++) {
							info[propertyNames[j]] = contentProviders[i].getProperty(propertyNames[j]);
						}
						foundContent = true;
						locationObject.ExitURL = orionHome+"/content/exit.html"; //$NON-NLS-0$
						if (info.saveToken) {
							// we need to set up a SaveURL for the iframe to use.
							locationObject.SaveURL = orionHome+"/content/saveHook.html#" + params.resource + ",contentProvider=" + params.contentProvider + ","; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						}
						
						function makeIFrame() {
							var parent = lib.node("delegatedContent"); //$NON-NLS-0$
							var uriTemplate = new URITemplate(info.uriTemplate);
							var href = uriTemplate.expand(locationObject);
							var iframe = document.createElement("iframe"); //$NON-NLS-0$
							iframe.id = id; //$NON-NLS-0$
							iframe.type = "text/html"; //$NON-NLS-0$
							iframe.width = "100%"; //$NON-NLS-0$
							iframe.height = "100%"; //$NON-NLS-0$
							iframe.frameborder= 0; //$NON-NLS-0$
							iframe.src = href; //$NON-NLS-0$
							lib.empty(parent);
							parent.appendChild(iframe); 
						}
						
						// TODO should we have the plugin specify whether it needs a Location?
						// If there is metadata, we want to fill in the location object with the name.
						if (locationObject.Location && locationObject.Location.length > 0) {
							progressService.progress(fileClient.read(locationObject.Location, true), "Getting content of " + locationObject.Location).then(
								function(metadata) {
									if (metadata) {
										// store info used for iframe and saving
										locationObject.Name = metadata.Name;
										fileMetadata = metadata;
										mGlobalCommands.setPageTarget(
											{task: info.name, location: metadata.Location, target: metadata, serviceRegistry: serviceRegistry, 
												commandService: commandRegistry, searchService: searcher, fileService: fileClient});
										makeIFrame();
									}
					
								},  
								// TODO couldn't read metadata, try to make iframe anyway.
								function() {
									mGlobalCommands.setPageTarget({task: info.name, title: info.name});
									makeIFrame();
								});
						} else {
							mGlobalCommands.setPageTarget({task: info.name, title: info.name});
							makeIFrame();
						}
						break;
					}
				}
			}
			if (!foundContent) {
				var parent = lib.node("delegatedContent"); //$NON-NLS-0$
				lib.empty(parent);
				var message = document.createElement("div"); //$NON-NLS-0$
				message.appendChild(document.createTextNode(messages["PluginContentNotFound"]));
				parent.appendChild(message);
			}
		}
		
		// Listen for events from our internal iframe.  This should eventually belong as part of the plugin registry.
		// This mechanism should become generalized into a "shell services" API for plugin iframes to contact the outer context.
		window.addEventListener("message", function(event) { //$NON-NLS-0$
			// For potentially dangerous actions, such as save, we will force the content to be from our domain (internal
			// save hook), which we know has given the user the change to look at the data before save.
			if (orionHome && fileMetadata && event.source.parent === window && event.origin === new URL(window.location).origin ) {
				if (typeof event.data === "string") { //$NON-NLS-0$
				var data = JSON.parse(event.data);
					if (data.shellService) {
						if (data.sourceLocation) {
							saveFileContents(fileClient, fileMetadata, {sourceLocation: data.sourceLocation}, function() {
								if (window.confirm(messages["ContentSavedMsg"])) {
									// go to the navigator
									window.location.href = orionHome + "/edit/edit.html#" + fileMetadata.Parents[0].ChildrenLocation; //$NON-NLS-0$
								} else {
									loadContent();
								}
							});
						}
					}
				}
			}
		}, false);
		
		mGlobalCommands.generateBanner("orion-delegatedContent", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		window.addEventListener("hashchange", function() { loadContent(); }, false); //$NON-NLS-0$
		loadContent();
	});
});