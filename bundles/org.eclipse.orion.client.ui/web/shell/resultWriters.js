/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define(["orion/Deferred", "orion/urlUtils", "marked/marked"], function(Deferred, mUrlUtils, marked) {

	var orion = {};
	orion.shellPage = {};

	orion.shellPage.FileBlobWriter = (function() {
		function FileBlobWriter(destination, shellPageFileService) {
			this.destination = destination;
			this.shellPageFileService = shellPageFileService;
			this.blobs = [];
		}
		FileBlobWriter.prototype = {
			addBlob: function(blob) {
				this.blobs.push(blob);
			},
			write: function() {
				// TODO handle cases of multiple blobs better?
				var promise = new Deferred();
				this.shellPageFileService.ensureFile(null, this.destination).then(
					function(file) {
						this.shellPageFileService.writeBlob(file, this.blobs[0]).then(
							function() {
								promise.resolve();
							},
							function(error) {
								promise.reject(error);
							}
						);
					}.bind(this),
					function(error) {
						promise.reject(error);
					}
				);
				return promise;
			}
		};
		return FileBlobWriter;
	}());

	orion.shellPage.FileStringWriter = (function() {
		function FileStringWriter(destination, shellPageFileService) {
			this.destination = destination;
			this.shellPageFileService = shellPageFileService;
		}
		FileStringWriter.prototype = {
			write: function(string) {
				var promise = new Deferred();
				this.shellPageFileService.ensureFile(null, this.destination).then(
					function(file) {
						this.shellPageFileService.write(file, string).then(
							function() {
								promise.resolve();
							},
							function(error) {
								promise.reject(error);
							}
						);
					}.bind(this),
					function(error) {
						promise.reject(error);
					}
				);
				return promise;
			}
		};
		return FileStringWriter;
	}());

	orion.shellPage.ShellBlobWriter = (function() {
		// TODO try to output something better?
		function ShellBlobWriter(rootElement) {
			this.rootElement = rootElement;
			this.blobCount = 0;
		}
		ShellBlobWriter.prototype = {
			addBlob: function(blob) {
				this.blobCount++;
			},
			write: function() {
				var promise = new Deferred();
				var node = document.createElement("span"); //$NON-NLS-0$
				node.textContent = "(" + this.blobCount + " blobs)"; //$NON-NLS-1$ //$NON-NLS-0$
				this.rootElement.appendChild(node);
				promise.resolve();
				return promise;
			}
		};
		return ShellBlobWriter;
	}());

	orion.shellPage.ShellStringWriter = (function() {
		function ShellStringWriter(rootElement, processMarkdown) {
			this.rootElement = rootElement;
			this.processMarkdown = processMarkdown;
		}
		ShellStringWriter.prototype = {
			write: function(string) {
				var element = document.createElement("div"); //$NON-NLS-0$
				if (this.processMarkdown) {
					element.innerHTML = marked(string, {sanitize: true, breaks: true});
				} else {
					/*
					 * TODO: Currently detecting URLs in non-markdown strings in order to preserve
					 * previous behavior.  Should stop doing this and prescribe using markdown strings
					 * instead?
					 */
					this.rootElement.className += " string-result-output"; //$NON-NLS-0$
					var segments = mUrlUtils.detectValidURL(string);
					if (segments.length) {
						mUrlUtils.processURLSegments(element, segments);				
					} else {
						element.textContent = string;
					}
				}
				var children = element.childNodes;
				while (children.length > 0) {
					this.rootElement.appendChild(children[0]);
				}
				var promise = new Deferred();
				promise.resolve();
				return promise;
			}
		};
		return ShellStringWriter;
	}());

	return orion.shellPage;
});
