/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define(['require', 'orion/URL-shim'], function(require) {

	var tryParentRelative = true;
	function makeParentRelative(location) {
		var link = document.createElement('a'); //$NON-NLS-0$
		link.href = location;
		location = link.href;
		if (tryParentRelative) {
			try {
				if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
					return location.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
				} else {
					tryParentRelative = false;
				}
			} catch (e) {
				tryParentRelative = false;
			}
		}
		return location;
	}

	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 * @class This class contains static utility methods.
	 * @name orion.fileUtils
	 */

	function makeRelative(location) {
		if (!location) {
			return location;
		}
		var hostName = window.location.protocol + "//" + window.location.host; //$NON-NLS-0$
		if (location.indexOf(hostName) === 0) {
			return location.substring(hostName.length);
		}
		return location;
	}
	
	//cache this
	var _workspaceUrlHref;
	if(!require.toUrl){
		_workspaceUrlHref =(new URL("/", window.location.href)).href;
	} else {
		_workspaceUrlHref =(new URL(require.toUrl("workspace"), window.location.href)).href;
	}
	/**
	 * Determines if the path represents the workspace root
	 * @name orion.util#isAtRoot
	 * @function
	 */
	function isAtRoot(path) {
		if (!path) {
			return false;
		}
		if (path === "/workspace") {
			return true; // sad but true
		}
		var pathUrl = new URL(path, window.location.href);
		return pathUrl.href.indexOf(_workspaceUrlHref) === 0; //$NON-NLS-0$
	}
	
	//return module exports
	return {
		makeParentRelative: makeParentRelative,
		makeRelative: makeRelative,
		isAtRoot: isAtRoot
	};
});
