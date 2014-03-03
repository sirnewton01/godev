/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*jslint browser:true devel:true*/
/*global define window*/

define(['orion/browserCompatibility', 'orion/bootstrap', 'domReady!'], function(mBrowserCompatibility, mBootstrap) {
	mBootstrap.startup().then(function(core) {
		window.location = "edit/edit.html";
	});
});
