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
define([
	'orion/bootstrap', 
	'orion/fileClient',
	'orion/widgets/browse/fileBrowser'
], function(mBootstrap, mFileClient, mFileBrowser) {
	mBootstrap.startup().then(function(core) {
		var fBrowser = new mFileBrowser.FileBrowser({
			parent: "fileBrowser", 
			shouldLoadWorkSpace: true,
			//breadCrumbInHeader: true,
			selectorNumber: 1,
			//maxEditorHeight: 800,
			fileClient: new mFileClient.FileClient(core.serviceRegistry)
		}); 
	});
});
