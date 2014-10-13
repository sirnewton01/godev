/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['require', 'orion/bootstrap', 'orion/fileClient', 'orion/EventTarget',
		'import/Injector', 'import/ImportHandler', 'orion/URL-shim'],
		function(require, mBootstrap, mFileClient, EventTarget, Injector, ImportHandler) {
	function debug(msg) { console.log('Orion: ' + msg); }

	function ServiceProxy() {
		EventTarget.attach(this);
	}

	mBootstrap.startup().then(function(core) {
		debug('bootstrap done');
		var serviceRegistry = core.serviceRegistry;
		var pluginRegistry = core.pluginRegistry;
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var injector = new Injector(fileClient, serviceRegistry);
		require(['domReady!'], function() {
			if (window.self === window.top) {
				throw new Error('Orion: expected to be loaded inside an iframe.');
			}

			var handler = new ImportHandler(injector, serviceRegistry);
			handler.connect();

			/* Install a service provider that communicates with external page
			 * TODO we should use the plugin registry for this -- install the external site as a plugin -- but I dunno how,
			 * so instead register a proxy service for it.
			 */
			var serviceProxy = new ServiceProxy();
			// Proxy message [type === 'import'] from external page to a dispatchEvent on the serviceProxy.
			window.addEventListener('message', function(event) {
				// Probably bad: can't verify origin since we don't know external page's origin
				if (event.source !== window.top) {
					return;
				}
				debug('got a message: ' + JSON.stringify(event.data));
				if (event.data && event.data.type === 'import') {
					serviceProxy.dispatchEvent(event.data);
				}
			});
			serviceProxy.onresponse = function(data) {
				window.top.postMessage({type: 'response', data: data}, '*'); // bad
			};
			serviceRegistry.registerService('orion.core.autoimport', serviceProxy, {});

			debug('service proxy registered. Notifying external page...');
			window.top.postMessage('serviceRegistered', '*'); //bad
		});
	});
});
