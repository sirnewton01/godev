/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */
define([], function() {
	var SERVICE_ID = "orion.core.contentTypeRegistry"; //$NON-NLS-0$
	var EXTENSION_ID = "orion.core.contenttype"; //$NON-NLS-0$
	var OLD_EXTENSION_ID = "orion.file.contenttype"; // backwards compatibility //$NON-NLS-0$

	/**
	 * @name orion.core.ContentType
	 * @class Represents a content type known to Orion.
	 * @property {String} id Unique identifier of this ContentType.
	 * @property {String} name User-readable name of this ContentType.
	 * @property {String} extends Optional; Gives the ID of another ContentType that is this one's parent.
	 * @property {String[]} extension Optional; List of file extensions characterizing this ContentType. Extensions are not case-sensitive.
	 * @property {String[]} filename Optional; List of filenames characterizing this ContentType.
	 */

	function contains(array, item) {
		return array.indexOf(item) !== -1;
	}

	function getFilenameContentType(/**String*/ filename, contentTypes) {
		function winner(best, other, filename, extension) {
			var nameMatch = other.filename.indexOf(filename) >= 0;
			var extMatch = contains(other.extension, extension.toLowerCase());
			if (nameMatch || extMatch) {
				if (!best || (nameMatch && contains(best.extension, extension.toLowerCase()))) {
					return other;
				}
			}
			return best;
		}
		if (typeof filename !== "string") { //$NON-NLS-0$
			return null;
		}
		var extension = filename && filename.split(".").pop(); //$NON-NLS-0$
		var best = null;
		for (var i=0; i < contentTypes.length; i++) {
			var type = contentTypes[i];
			if (winner(best, type, filename, extension) === type) {
				best = type;
			}
		}
		return best;
	}

	/**
	 * @name orion.core.ContentTypeRegistry
	 * @class A service for querying {@link orion.core.ContentType}s.
	 * @description A service for querying {@link orion.core.ContentType}s. Clients should request the <code>"orion.core.contentTypeRegistry"</code>
	 * service from the {@link orion.serviceregistry.ServiceRegistry} rather than instantiate this class directly. This constructor is 
	 * intended for use only by page initialization code.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to use for looking up registered content types
	 * and for registering this service.
	 */
	function ContentTypeRegistry(serviceRegistry) {
		function buildMap(serviceRegistry) {
			function array(obj) {
				if (obj === null || typeof obj === "undefined") { return []; } //$NON-NLS-0$
				return (Array.isArray(obj)) ? obj : [obj];
			}
			function arrayLowerCase(obj) {
				return array(obj).map(function(str) { return String.prototype.toLowerCase.call(str); });
			}
			var serviceReferences = serviceRegistry.getServiceReferences(EXTENSION_ID).concat(
					serviceRegistry.getServiceReferences(OLD_EXTENSION_ID));
			var contentTypes = {};
			for (var i=0; i < serviceReferences.length; i++) {
				var serviceRef = serviceReferences[i], types = array(serviceRef.getProperty("contentTypes")); //$NON-NLS-0$
				for (var j=0; j < types.length; j++) {
					var type = types[j];
					if (!contentTypes[type.id]) {
						contentTypes[type.id] = {
							id: type.id,
							name: type.name,
							image: type.image,
							"extends": type["extends"], //$NON-NLS-1$ //$NON-NLS-0$
							extension: arrayLowerCase(type.extension),
							filename: array(type.filename)
						};
					}
				}
			}
			return contentTypes;
		}
		
		this.serviceRegistry = serviceRegistry;
		this.map = buildMap(serviceRegistry);
		serviceRegistry.registerService(SERVICE_ID, this);
	}
	ContentTypeRegistry.prototype = /** @lends orion.core.ContentTypeRegistry.prototype */ {
		/**
		 * Gets all the ContentTypes in the registry.
		 * @returns {orion.core.ContentType[]} An array of all registered ContentTypes.
		 */
		getContentTypes: function() {
			var map = this.getContentTypesMap();
			var types = [];
			for (var type in map) {
				if (Object.prototype.hasOwnProperty.call(map, type)) {
					types.push(map[type]);
				}
			}
			return types;
		},
		/**
		 * Gets a map of all ContentTypes.
		 * @return {Object} A map whose keys are ContentType IDs and values are the {@link orion.core.ContentType} having that ID.
		 */
		getContentTypesMap: function() {
			return this.map;
		},
		/**
		 * Looks up the ContentType for a file or search result, given the metadata.
		 * @param {Object} fileMetadata Metadata for a file or search result.
		 * @returns {orion.core.ContentType} The ContentType for the file, or <code>null</code> if none could be found.
		 */
		getFileContentType: function(fileMetadata) {
			return getFilenameContentType(fileMetadata.Name, this.getContentTypes());
		},
		/**
		 * Looks up the ContentType, given a filename.
		 * @param {String} filename The filename.
		 * @returns {orion.core.ContentType} The ContentType for the file, or <code>null</code> if none could be found.
		 */
		getFilenameContentType: function(filename) {
			return getFilenameContentType(filename, this.getContentTypes());
		},
		/**
		 * Gets a ContentType by ID.
		 * @param {String} id The ContentType ID.
		 * @returns {orion.core.ContentType} The ContentType having the given ID, or <code>null</code>.
		 */
		getContentType: function(id) {
			return this.map[id] || null;
		},
		/**
		 * Determines whether a ContentType is an extension of another.
		 * @param {orion.core.ContentType|String} contentTypeA ContentType or ContentType ID.
		 * @param {orion.core.ContentType|String} contentTypeB ContentType or ContentType ID.
		 * @returns {Boolean} Returns <code>true</code> if <code>contentTypeA</code> equals <code>contentTypeB</code>,
		 *  or <code>contentTypeA</code> descends from <code>contentTypeB</code>.
		 */
		isExtensionOf: function(contentTypeA, contentTypeB) {
			contentTypeA = (typeof contentTypeA === "string") ? this.getContentType(contentTypeA) : contentTypeA; //$NON-NLS-0$
			contentTypeB = (typeof contentTypeB === "string") ? this.getContentType(contentTypeB) : contentTypeB; //$NON-NLS-0$
			if (!contentTypeA || !contentTypeB) { return false; }
			if (contentTypeA.id === contentTypeB.id) { return true; }
			else {
				var parent = contentTypeA, seen = {};
				while (parent && (parent = this.getContentType(parent['extends']))) { //$NON-NLS-0$
					if (parent.id === contentTypeB.id) { return true; }
					if (seen[parent.id]) { throw new Error("Cycle: " + parent.id); } //$NON-NLS-0$
					seen[parent.id] = true;
				}
			}
			return false;
		},
		/**
		 * Similar to {@link #isExtensionOf}, but works on an array of contentTypes.
		 * @param {orion.core.ContentType|String} contentType ContentType or ContentType ID.
		 * @param {orion.core.ContentType[]|String[]} contentTypes Array of ContentTypes or ContentType IDs.
		 * @returns {Boolean} <code>true</code> if <code>contentType</code> equals or descends from any of the
		 * ContentTypes in <code>contentTypes</code>.
		 */
		isSomeExtensionOf: function(contentType, contentTypes) {
			for (var i=0; i < contentTypes.length; i++) {
				if (this.isExtensionOf(contentType, contentTypes[i])) {
					return true;
				}
			}
			return false;
		}
	};
	return {
		ContentTypeRegistry: ContentTypeRegistry,
		getFilenameContentType: getFilenameContentType
	};
});