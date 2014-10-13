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
/*eslint-env browser, amd*/
define(['orion/widgets/browse/fileBrowser', 'orion/serviceregistry', 'orion/pluginregistry'],
function(mFileBrowser, mServiceRegistry, mPluginRegistry) {
		// figure out plugin to install from repoURL
	var urlInput = document.getElementById("fileSystemURLInput");
	var fileBrowser = null;
	urlInput.addEventListener("keydown", function (e) { //$NON-NLS-0$
		if (e.keyCode === 13){
			if(fileBrowser) {
				fileBrowser.destroy();
			}
			//http://9.31.17.57:8080/plugins/gerritfs/static/plugins/GerritFilePlugin.html?project=org.eclipse.orion.client
			var pluginURL = urlInput.value;
			var serviceRegistry = new mServiceRegistry.ServiceRegistry();
			var plugins = {};
			plugins[pluginURL] = true;
			var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {
				storage: {},
				plugins: plugins
			});
			pluginRegistry.start().then(function() {
				fileBrowser = new mFileBrowser.FileBrowser({
					parent: "fileBrowser", 
					selectorNumber: 1,
					useSHA: true,
					//maxEditorHeight: 800,
					serviceRegistry: serviceRegistry
				});
			});
		}
	}, false);
});


