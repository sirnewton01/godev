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
/*global exports require*/
var Deferred = require('deferred-fs').Deferred;

/**
 * Runs several promise-producing functions in sequence. Fulfillment values are passed to the next function in the chain.
 * TODO optOnError?
 * @param {Function[]} funcs An array of functions. Each function can return a promise or a simple value.
 * @param {Object} [initialValue] Value to provide to the first function.
 * @returns {orion.Promise} A promise
 */
exports.sequence = function(funcs, initialValue) {
	return Array.prototype.reduce.call(funcs, function(previousPromise, func, i) {
		return Deferred.when(previousPromise, func);
	}, new Deferred().resolve(initialValue));
};
