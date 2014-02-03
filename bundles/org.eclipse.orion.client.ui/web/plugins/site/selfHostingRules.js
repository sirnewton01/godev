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
/*global define*/
define([], function() {

	/*
	 * FILE: targetPattern represents a workspace path
	 * API: targetPattern represents a URL on this server
	 */
	var FILE = 0, API = 1;
	// This is kind of clumsy because API paths aren't followed by / but FILE paths are..
	var SELF_HOSTING_TEMPLATE = [
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.ui/web/index.html" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.ui/web" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.core/web" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.editor/web" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.cf/web" },
		{ type: API, source: "/file", targetPattern: "${0}file" },
		{ type: API, source: "/prefs", targetPattern: "${0}prefs" },
		{ type: API, source: "/workspace", targetPattern: "${0}workspace" },
		{ type: API, source: "/users", targetPattern: "${0}users" },
		{ type: API, source: "/authenticationPlugin.html", targetPattern: "${0}authenticationPlugin.html" },
		{ type: API, source: "/login", targetPattern: "${0}login" },
		{ type: API, source: "/loginstatic", targetPattern: "${0}loginstatic" },
		{ type: API, source: "/useremailconfirmation", targetPattern: "${0}useremailconfirmation" },
		{ type: API, source: "/site", targetPattern: "${0}site" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.git/web" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.javascript/web" },
		{ type: API, source: "/gitapi", targetPattern: "${0}gitapi" },
		{ type: FILE, source: "/", targetPattern: "${0}/bundles/org.eclipse.orion.client.users/web" },
		{ type: API, source: "/xfer", targetPattern: "${0}xfer" },
		{ type: API, source: "/filesearch", targetPattern: "${0}filesearch" },
		{ type: API, source: "/index.jsp", targetPattern: "${0}index.jsp" },
		{ type: API, source: "/plugins/git", targetPattern: "${0}plugins/git" },
		{ type: API, source: "/plugins/user", targetPattern: "${0}plugins/user" },
		{ type: API, source: "/logout", targetPattern: "${0}logout" },
		{ type: API, source: "/mixlogin/manageopenids", targetPattern: "${0}mixlogin/manageopenids" },
		{ type: API, source: "/openids", targetPattern: "${0}openids" },
		{ type: API, source: "/task", targetPattern: "${0}task" },
		{ type: API, source: "/help", targetPattern: "${0}help" },
		{ type: API, source: "/docker", targetPattern: "${0}docker" }
	];

	return {
		Rules: SELF_HOSTING_TEMPLATE,
		Types: {
			File: FILE,
			API: API
		}
	};
});