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

/*
 * Save hook for verifying that the user wants to save the content from a visual plugin.
 */

define(['i18n!orion/content/nls/messages', 'require', 'orion/webui/littlelib', 'orion/i18nUtil', 'orion/bootstrap', 'orion/PageUtil'], 
			function(messages, require, lib, i18nUtil, mBootstrap, PageUtil) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		
		// parse the URL to determine what should be saved.
		var params = PageUtil.matchResourceParameters(window.location.href);
		if (params.contentProvider) {
			// Note that the shape of the "orion.page.content" extension is not in any shape or form that could be considered final.
			// We've included it to enable experimentation. Please provide feedback on IRC or bugzilla.
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
					if (info.saveToken) {
						// save tokens would typically have special characters such as '?' or '&' in them so we can't use
						// the URI template to parse them.  Not sure how we could best express this.  For now we have the plugin
						// specify one or more tokens that signify the start of the URI and its terminator.  
						var tokens = Array.isArray(info.saveToken) ? info.saveToken : [info.saveToken];
						var parameterStart = window.location.hash.indexOf(","); //$NON-NLS-0$
						if (parameterStart >= 0) {
							var parameterString = window.location.hash.substring(parameterStart);
							for (var i=0; i<tokens.length; i++) {
								var index = parameterString.indexOf(info.saveToken[i].token);
								if (index >= 0) {
									var contentURL = parameterString.substring(index+info.saveToken[i].token.length);
									if (info.saveToken[i].terminator) {
										var terminators = Array.isArray(info.saveToken[i].terminator) ? info.saveToken[i].terminator : [info.saveToken[i].terminator];
										for (var j=0; j<terminators.length; j++) {
											var ending = contentURL.indexOf(terminators[j]);
											if (ending >= 0) {
												contentURL = contentURL.substring(0, ending);
												break;
											}
										}
									}
									if (contentURL && contentURL.length > 0) {
										var parent = lib.node("orion.saveRequest"); //$NON-NLS-0$
										var p = document.createElement("p"); //$NON-NLS-0$
										p.appendChild(document.createTextNode(i18nUtil.formatMessage(messages["ContentSavedData"], info.name))); //$NON-NLS-0$
										p.appendChild(document.createElement("br")); //$NON-NLS-0$
										var a = document.createElement("a"); //$NON-NLS-0$
										a.href = contentURL;
										a.appendChild(document.createTextNode(contentURL));
										p.appendChild(a);
										parent.appendChild(p);
										p = document.createElement("p"); //$NON-NLS-0$
										p.appendChild(document.createTextNode(i18nUtil.formatMessage(messages["StoreFileMsg"], messages["Save"]))); //$NON-NLS-0$
										parent.appendChild(p);
										var button = document.createElement("button");	 //$NON-NLS-0$
										button.appendChild(document.createTextNode(messages['Save']));
										parent.appendChild(button);
										var nonHash = window.location.href.split('#')[0]; //$NON-NLS-0$
										// TODO: should not be necessary, see bug https://bugs.eclipse.org/bugs/show_bug.cgi?id=373450
										var hostName = nonHash.substring(0, nonHash.length - window.location.pathname.length);
										button.addEventListener("click", function() { //$NON-NLS-0$
											// post a message to the same domain (intended for our outer window)
											window.parent.postMessage(JSON.stringify({shellService: true, sourceLocation: contentURL}), hostName);
										}, false);
									}
									break;
								}
							}
						}
					}
					break;
				}
			}
		}
	});
});