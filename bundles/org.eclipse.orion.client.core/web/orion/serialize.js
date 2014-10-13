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
/*eslint-env browser, amd*/
define([], function() {

	/**
	 * Converts an <code>Error</code> into a regular Object.
	 * @memberof module:orion/serialize
	 * @param {Error|Object} error
	 * @returns {Object}
	 */
	function serializeError(error) {
		var result = error ? JSON.parse(JSON.stringify(error)) : error; // sanitizing Error object
		if (error instanceof Error) {
			result.__isError = true;
			result.message = result.message || error.message;
			result.name = result.name || error.name;
			result.stack = result.stack || error.stack;
		}
		return result;
	}

	/**
	 * @exports orion/serialize
	 */
	return {
		serializeError: serializeError
	};
});