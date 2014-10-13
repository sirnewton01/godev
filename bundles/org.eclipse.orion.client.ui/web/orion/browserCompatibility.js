/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global alert confirm */

(function() {
	function isSupportedBrowser() {
		var userAgent = navigator.userAgent;
		var isSupported = { 
			browser: false, 
			version: false
		};
		var REGEXP_VERSION = 1;
		var browserData = [	{name: 'Chrome/Chromium', regExp: /(?:chrome|crios|chromium)\/(\d+)/i, minVersion: 24}, //$NON-NLS-0$
							{name: 'Firefox', regExp: /firefox\/(\d+)/i, minVersion: 17}, //$NON-NLS-0$
							{name: 'Microsoft Internet Explorer', regExp: /msie\s(\d+)/i, minVersion: 10}, //$NON-NLS-0$
							{name: 'Microsoft Internet Explorer', regExp: /Trident\/(\d+)/i, minVersion: 6}, //$NON-NLS-0$
							{name: 'Safari', regExp: /version\/(\d+).*?safari/i, minVersion: 6} ]; //$NON-NLS-0$

		for (var i = 0; i < browserData.length; i++) {
			var browser = browserData[i];
			var matches = userAgent.match(browser.regExp);
			if (matches) {
				isSupported.browser = true;
				isSupported.version = matches[REGEXP_VERSION] >= browser.minVersion;
				isSupported.name = browser.name;
				break;
			}
		}		
	
		return isSupported;
	}
	
	function supportsLocalStorage() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null; //$NON-NLS-1$ //$NON-NLS-0$
		} catch (e) {
			return false;
		}
	}
	
	function throwBrowserAlert(message) {
		alert(message);
		throw new Error('unsupported browser'); //$NON-NLS-0$
	}
	
	var isSupported = isSupportedBrowser();
	
	// Continue at your own risk for non-standard browsers
	if (!isSupported.browser) {
		if (supportsLocalStorage() && !localStorage["skipBrowserCheck"]) { //$NON-NLS-0$
			if (confirm("Sorry, your browser is not supported. The latest version of Chrome, Firefox or Safari web browser is recommended.\nContinue anyway?")) { //$NON-NLS-0$
				localStorage["skipBrowserCheck"] = 1; //$NON-NLS-0$
			} else {
				throw 'unsupported browser'; //$NON-NLS-0$
			}
		} else if (!supportsLocalStorage()) {
			throwBrowserAlert("Sorry, your browser is not supported.\n\nTo use Orion, the latest version of the Chrome, Firefox, or Safari web browser is recommended.\n"); //$NON-NLS-0$
		}
	} else if (!isSupported.version) {
		// Display an alert when the browser is supported, but falls below the min. supported version
		throwBrowserAlert("Sorry, your browser version is not supported.\n\nTo use Orion, please upgrade to the latest version of " + isSupported.name + ".\n"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	return {
		isSupportedBrowser: isSupportedBrowser,
		supportsLocalStorage: supportsLocalStorage,
		throwBrowserAlert: throwBrowserAlert
	};
}());