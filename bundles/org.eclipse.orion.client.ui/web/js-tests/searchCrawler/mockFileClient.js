/******************************************************************************* 
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*jslint browser:true */
/*global define*/

define(['orion/Deferred'], function(Deferred) {

	/**
	 * @private
	 * @name orion.test.crawler.MockFileClient
	 * @description Fake version of a file system for testing crawling search.
	 */
	function MockFileClient(mockRoot) {
		this._root = mockRoot;
	}
	MockFileClient.prototype = /**@lends eclipse.FileServiceImpl.prototype */ {
		/**
		 * private
		 */
		_findObjByLocation: function(location, currentObj){
			if(location === currentObj.Location) {
				return currentObj;
			}
			if(currentObj.Directory && currentObj.Children) {
				for(var i=0; i < currentObj.Children.length; i++){
					var result = this._findObjByLocation(location, currentObj.Children[i]);
					if(result) {
						return result;
					}
				}
			}
		},
		/**
		 * Obtains the children of location
		 * @param location The location of the item to obtain children for
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(location) {
			var result = this._findObjByLocation(location, this._root);
			var df = new Deferred();
			window.setTimeout(function() {df.resolve(result && result.Children? result.Children : []);}, 2);
			//df.resolve(result && result.Children? result.Children : []);
			return df;
		},
		/**
		 * Returns the contents of the file at the given location.
		 *
		 * @param {String} location The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata, 
		 *   otherwise file contents are returned
		 * @return A deferred that will be provided with the contents or metadata when available
		 */
		read: function(location, isMetadata, acceptPatch) {
			var result = this._findObjByLocation(location, this._root);
			var df = new Deferred();
			window.setTimeout(function() {df.resolve(result && result.Contents ? result.Contents : "");}, 2);
			//df.resolve(result && result.Contents ? result.Contents : "");
			return df;
		}
	};

	return {
		MockFileClient: MockFileClient
	};
});