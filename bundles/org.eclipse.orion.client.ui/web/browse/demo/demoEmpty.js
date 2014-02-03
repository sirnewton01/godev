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
/*global define window console eclipse orion*/

define([
	'orion/widgets/browse/fileBrowser',
	'orion/Deferred',
	'plugins/filePlugin/HTML5LocalFileImpl'
], function(mFileBrowser, mDeferred) {
	/*
		orion = {Deferred: mDeferred};
		window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
		if (window.requestFileSystem) {
			window.requestFileSystem(window.TEMPORARY, 10*1024*1024 , function(fs) {
				var service = new eclipse.HTML5LocalFileServiceImpl(fs);
				var serviceProperties = {
					Name: "HTML5 Local File contents",
					pattern: service._rootLocation,
					serviceId: 1,
					top: service._rootLocation
				};
				var serviceRef = {
					id: 123,
					serviceProperties: serviceProperties,
					impl: service
				};
				var fBrowser = new mFileBrowser.FileBrowser({
					parent: "fileBrowser",//Required 
					serviceRefs: [serviceRef],
				}); 
			}, function(error) {
				console.log(error);
		});
	} 
	*/
	var fBrowser = new mFileBrowser.FileBrowser({
		parent: "fileBrowser",//Required 
		repoUrl: "nothing"
	}); 
	
});
