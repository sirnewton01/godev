/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global console define setTimeout XMLHttpRequest*/

/**
 * @name orion.operation
 * @namespace Provides an API for handling long running operations as promises.
 */
define(["orion/xhr", "orion/Deferred"], function(xhr, Deferred) {

	function _isRunning(operationType) {
		if (!operationType) {
			return true;
		}
		if (operationType === "loadstart" || operationType === "progress") {
			return true;
		}
		return false;
	}

	function _deleteTempOperation(operationLocation) {
		xhr("DELETE", operationLocation, {
			headers: {
				"Orion-Version": "1"
			},
			timeout: 15000
		});
	}

	function _cancelOperation(operationLocation) {
		xhr("PUT", operationLocation, {
			headers: {
				"Orion-Version": "1"
			},
			data: JSON.stringify({
				abort: true
			}),
			timeout: 15000
		});
	}

	function _getOperation(operationLocation, deferred, onResolve, onReject) {
		xhr("GET", operationLocation, {
			headers: {
				"Orion-Version": "1"
			},
			timeout: 15000
		}).then(function(result) {
			var operationJson = result.response ? JSON.parse(result.response) : null;
			deferred.progress(operationJson);
			if (_isRunning(operationJson.type)) {
				setTimeout(function() {
					_getOperation(operationLocation, deferred, onResolve, onReject);
				}, 2000);
				return;
			}
			if (operationJson.type === "error" || operationJson.type === "abort") {
				deferred.reject(onReject ? onReject(operationJson) : operationJson.Result);
			} else {
				deferred.resolve(onResolve ? onResolve(operationJson) : operationJson.Result.JsonData);
			}
			if (!operationJson.Location) {
				_deleteTempOperation(operationLocation); //This operation should not be kept 
			}
		}, function(error) {
			var errorMessage = error;
			if (error.responseText !== undefined) {
				errorMessage = error.responseText;
				try {
					errorMessage = JSON.parse(error.responseText);
				} catch (e) {
					//ignore
				}
			}
			if (errorMessage.Message !== undefined) {
				errorMessage.HttpCode = errorMessage.HttpCode === undefined ? error.status : errorMessage.HttpCode;
				errorMessage.Severity = errorMessage.Severity === undefined ? "Error" : errorMessage.Severity;
				deferred.reject(errorMessage);
			} else {
				deferred.reject({
					Severity: "Error",
					Message: errorMessage,
					HttpCode: error.status
				});
			}
		});
	}

	function _trackCancel(operationLocation, deferred) {
		deferred.then(null, function(error) {
			if (error instanceof Error && error.name === "Cancel") {
				_cancelOperation(operationLocation);
			}
		});
	}

	/**
	 * Handles a long-running operation as a promise.
	 * @name orion.operation.handle
	 * @function
	 * @param {String} operationLocation
	 * @param {Function} [onSuccess] If provided, will be called to transform a successful operation into the resolve value of the 
	 * returned promise.
	 * @param {Function} [onError] If provided, will be called to trasnform a failed operation into the reject value of the 
	 * returned promise.
	 * @returns {orion.Promise}
	 */
	function handle(operationLocation, onSuccess, onError) {
		var def = new Deferred();
		_trackCancel(operationLocation, def);
		_getOperation(operationLocation, def, onSuccess, onError);
		return def;
	}

	return {
		handle: handle
	};
});