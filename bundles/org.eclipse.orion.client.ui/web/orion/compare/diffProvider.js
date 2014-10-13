/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['i18n!orion/compare/nls/messages', 'orion/Deferred'], function(messages, Deferred) {

	function _doServiceCall(fileService, funcName, funcArgs) {
	
		var clientDeferred = new Deferred();
		fileService[funcName].apply(fileService, funcArgs).then(
			//on success, just forward the result to the client
			function(result) {
				clientDeferred.resolve(result);
			},
			//on failure we might need to retry
			function(error) {
				//forward other errors to client
				clientDeferred.reject(error);
			}
		);
		return clientDeferred;
	}
	
	function _normalizeURL(location) {
		if (location.indexOf("://") === -1) { //$NON-NLS-0$
			var temp = document.createElement('a'); //$NON-NLS-0$
			temp.href = location;
	        return temp.href;
		}
		return location;
	}
	
	
	/**
	 * Creates a new diff provider.
	 * @class Provides operations on Diff in a compare editor
	 * @name orion.compare.DiffProvider
	 */
	function DiffProvider(serviceRegistry, filter) {
		var allReferences = serviceRegistry.getServiceReferences("orion.core.diff"); //$NON-NLS-0$
		var i, _references = allReferences;
		if (filter) {
			_references = [];
			for(i = 0; i < allReferences.length; ++i) {
				if (filter(allReferences[i])) {
					_references.push(allReferences[i]);
				}
			}
		}
		var _patterns = [];
		var _services = [];
		
		for(i = 0; i < _references.length; ++i) {
			_patterns[i] = new RegExp(_references[i].getProperty("pattern") || ".*");//$NON-NLS-1$ //$NON-NLS-0$
			_services[i] = serviceRegistry.getService(_references[i]);
		}

		this._getService = function(location) {
			location = _normalizeURL(location);
			for(var i = 0; i < _patterns.length; ++i) {
				if (_patterns[i].test(location)) {
					return _services[i];
				}
			}
			throw messages["NoDiffServiceLocationMatched"] + location;
		};
	}

	DiffProvider.prototype = /** @lends orion.compare.DiffProvider.prototype */
	{
		getDiffContent: function(diffURI, options){
			return _doServiceCall(this._getService(diffURI, options), "getDiffContent", arguments); //$NON-NLS-0$
		},
		getDiffFileURI: function(diffURI){
			return _doServiceCall(this._getService(diffURI), "getDiffFileURI", arguments); //$NON-NLS-0$
		}
		
	};
	return {DiffProvider: DiffProvider};
});