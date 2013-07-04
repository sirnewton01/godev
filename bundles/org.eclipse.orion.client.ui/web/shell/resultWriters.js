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

/*global define*/
/*jslint browser:true*/

define(['orion/Deferred', 'orion/urlUtils'], function(Deferred, mUrlUtils) {

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
			this.value = "";
		}
		FileStringWriter.prototype = {
			appendNewline: function() {
				this.value += "\n"; //$NON-NLS-0$
			},
			appendText: function(text) {
				this.value += text;
			},
			write: function() {
				var promise = new Deferred();
				this.shellPageFileService.ensureFile(null, this.destination).then(
					function(file) {
						this.shellPageFileService.write(file, this.value).then(
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
		function ShellStringWriter(rootElement) {
			this.rootElement = rootElement;
			this.tempRoot = document.createElement("div"); //$NON-NLS-0$
		}
		ShellStringWriter.prototype = {
			appendNewline: function() {
				var node = document.createElement("br"); //$NON-NLS-0$
				this.tempRoot.appendChild(node);
			},
			appendText: function(text) {
				var node = document.createElement("span"); //$NON-NLS-0$
				var segments = mUrlUtils.detectValidURL(text);
				if (segments) {
					mUrlUtils.processURLSegments(node, segments);				
				} else {
					node.textContent = text;
				}
				this.tempRoot.appendChild(node);
			},
			write: function() {
				var promise = new Deferred();
				var children = this.tempRoot.childNodes;
				while (children.length > 0) {
					this.rootElement.appendChild(children[0]);
				}
				promise.resolve();
				return promise;
			}
		};
		return ShellStringWriter;
	}());

	return orion.shellPage;
});
