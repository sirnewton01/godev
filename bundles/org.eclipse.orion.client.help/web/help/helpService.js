/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["orion/xhr", "orion/URL-shim"], function(xhr) { //$NON-NLS-1$ //$NON-NLS-0$

	var FILENAME_REGEX = /^(.*)\.(\w+)(?:[\?#]|$)/i;

	/*
	 * A basic Help service implementation.  A plugin wishing to contribute subitems
	 * to its main entry in the Table of Contents does so by providing a "toc" file
	 * in each folder that lists the names of its contained files and folders to be
	 * included.
	 */
	function HelpServiceImpl() {
	}

	HelpServiceImpl.prototype = { /**@lends eclipse.HelpServiceImpl.prototype */
		/**
		 * Obtains the children of a help item
		 * @param object the help item
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(object) {
			var objectUrl = new URL(object.Location, window.location).href + "/"; //$NON-NLS-0$
			var url = new URL("toc", objectUrl); //$NON-NLS-0$
			return xhr("GET", url.href, { //$NON-NLS-0$
				headers: {
					"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
					"Content-Type": "charset=UTF-8" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			}).then(
				function(result) {
					var segments = result.response.split("\n"); //$NON-NLS-0$
					var children = [];
					segments.forEach(function(current) {
						if (current) {
							var match = FILENAME_REGEX.exec(current);
							var childURL = new URL(current, objectUrl);
							children.push({Name: match ? match[1] : current, Location: childURL.href, Directory: !match});
						}
					});
					return children;
				},
				function(/*error*/) {
					/* treat failure to find toc file as no children */
					return [];
				}
			);
		},

		/**
		 * Returns the contents of the file at the given location.
		 *
		 * @param object the help item
		 * @return A deferred that will be provided with the contents when available
		 */
		read: function(object) {
			var url = new URL(object.Location, window.location);
			return xhr("GET", url.href, { //$NON-NLS-0$
				timeout: 15000,
				headers: { "Orion-Version": "1" }, //$NON-NLS-1$ //$NON-NLS-0$
				log: false
			}).then(function(result) {
				return result.response;
			}.bind(this));
		}
	};

	if (window.Blob) {
		/**
		 * Returns the binary contents of the file at the given location.
		 *
		 * @param object the base help item
		 * @param location A string indicating the item-relative location (optional)
		 * @return A deferred that will be provided with the binary contents when available
		 */
		HelpServiceImpl.prototype.readBlob = function(object, location) {
			var url = new URL(object.Location, window.location);
			if (location) {
				url = new URL(location, url);
			}
			return xhr("GET", url.href, { //$NON-NLS-0$
				timeout: 15000,
				responseType: "arraybuffer", //$NON-NLS-0$
				headers: { "Orion-Version": "1" }, //$NON-NLS-1$ //$NON-NLS-0$
				log: false
			}).then(function(result) {
				return result.response;
			}.bind(this));
		};
	}

	return {
		HelpService: HelpServiceImpl
	};
});
