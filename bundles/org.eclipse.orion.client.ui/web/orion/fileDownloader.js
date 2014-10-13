/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define([
	'i18n!orion/navigate/nls/messages',
	'orion/i18nUtil',
	'orion/URL-shim'
], function(messages, i18nUtil) {

	var orion_download_initiator = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
	
	function downloadSupported() {
		return (typeof orion_download_initiator.download !== "undefined") || (typeof window.navigator !== "undefined" && window.navigator.msSaveBlob);
	} 
	
	function _makeError(error) {
		var newError = {
			Severity: "Error", //$NON-NLS-0$
			Message: messages.noResponse
		};
		if (error.status === 0) {
			return newError; // might do better here
		} else if (error.responseText) {
			var responseText = error.responseText;
			try {
				var parsedError = JSON.parse(responseText);
				newError.Severity = parsedError.Severity || newError.Severity;
				newError.Message = parsedError.Message || newError.Message;
			} catch (e) {
				newError.Message = responseText;
			}
		} else {
			try {
				newError.Message = JSON.stringify(error);
			} catch (e) {
				// best effort - fallthrough
			}
		}
		return newError;
	}
	
	function handleError(statusService, error) {
		if (!statusService) {
			window.console.log(error);
			return;
		}
		if (!error.Severity) {
			error = _makeError(error);
		}
		statusService.setProgressResult(error);
	}

	/**
	 * @name orion.download.FileDownloader
	 * @class
	 * @description 
	 * <p>Requires service {@link orion.core.ContentTypeRegistry}</p>
	 * 
	 * @param {orion.fileClient.FileClient} [fileClient] The file client that supports readBlob API.
	 * @param {orion.status.StatusReportingService} [statusService=null] Optional. If defined status is reported while downloading.
	 * @param {orion.progress.ProgressService} [progressService=null] Optional. If defined progress is reported while downloading.
	 */
	function FileDownloader(fileClient, statusService, progressService) {
		this.fileClinet = fileClient;
		this.statusService = statusService;
		this.progressService = progressService;
	}
	FileDownloader.prototype = /** @lends orion.download.FileDownloader.prototype */ {
		_isSupported: function(forceDownload) {
			if(!forceDownload && !downloadSupported()) {
				if(this.statusService && this.statusService.setProgressResult) {
					this.statusService.setProgressResult({Message: messages["Download not supported"], Severity: "Error"});
				}
				return false;
			}
			return true;			
		},
		downloadFromLocation: function(fileMetaData, contentType, forceDownload) {
			if(!this._isSupported(forceDownload)) {
				return;
			}
			var progressService = this.progressService;
			var progress = function(deferred, msgKey, uri) {
				if (!progressService) { return deferred; }
				return progressService.progress(deferred, i18nUtil.formatMessage(msgKey, uri));
			};
			var errorHandler = function(error) {
				//clearTimeout();
				var statusService = null;
				if(this.serviceRegistry) {
					statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				} else if(this.statusService) {
					statusService = this.statusService;
				}
				handleError(statusService, error);
				this._setNoInput();
			}.bind(this);
			if(this.statusService && this.statusService.setProgressResult) {
				this.statusService.setProgressResult({Message: messages["Downloading..."]});
			}
			progress(this.fileClinet.readBlob(fileMetaData.Location), messages["Downloading..."], fileMetaData.Location).then(function(contents) {
				if(this.statusService && this.statusService.setProgressMessage) {
					this.statusService.setProgressMessage("");
				}
				this.downloadFromBlob(contents, fileMetaData.Name, contentType, forceDownload);
			}.bind(this), errorHandler);
		},
		downloadFromBlob: function(blobContents, fileName, contentType, forceDownload, createLink) {
			if(!this._isSupported(forceDownload)) {
				return;
			}
			var cType = (contentType && contentType.id) ? contentType.id : "application/octet-stream";
			var blobObj = new Blob([blobContents],{type: cType}); 
			var downloadLink = createLink ? document.createElementNS("http://www.w3.org/1999/xhtml", "a") : document.createElement("a"); //$NON-NLS-1$ //$NON-NLS-0$
			if(typeof downloadLink.download !== "undefined") {//Chrome and FireFox
				var objectURLLink = URL.createObjectURL(blobObj);
				downloadLink.href = objectURLLink;
				downloadLink.download = fileName;
				if(!createLink) {
					var event = document.createEvent("MouseEvents");
					event.initMouseEvent(
						"click", true, false, window, 0, 0, 0, 0, 0
						, false, false, false, false, 0, null
					);
					downloadLink.dispatchEvent(event);
				} else {
					return downloadLink;
				}
			} else if(typeof window.navigator !== "undefined" && window.navigator.msSaveOrOpenBlob) {//IE 9+
				if(!createLink) {
					window.navigator.msSaveBlob(blobObj, fileName);
				} else {
					downloadLink.href = "javascript:void(0)";
					downloadLink.addEventListener("click", function(){
						window.navigator.msSaveBlob(blobObj, fileName);
					});
					return downloadLink;
				}
			}
		}
	};
	return {
		FileDownloader: FileDownloader,
		downloadSupported: downloadSupported
	};
});
