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
/*jslint amd:true*/
define([
], function() {

	/**
	 * @name orion.edit.EditorContext
	 * @class Encapsulates service methods related to an editor.
	 * @classdesc Encapsulates service methods related to an editor.
	 * @description 
	 */

	/**
	 * Gets the editor context service.
	 * @name orion.edit.EditorContext.getEditorContext
	 * @function
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to consult.
	 * @returns {orion.edit.EditorContext}
	 */
	function getEditorContext(serviceRegistry) {
		var editorContext = Object.create(null);
		getReferences(serviceRegistry).forEach(function(serviceRef) { 
			var service = serviceRegistry.getService(serviceRef);
			Object.keys(service).forEach(function(key) {
				if (typeof service[key] === "function") { //$NON-NLS-0$
					editorContext[key] = service[key].bind(service);
				}
			});
		});
		return editorContext;
	}

	/**
	 * Gets the editor context "options" object.
	 * @name orion.edit.EditorContext.getOptions
	 * @function
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to consult.
	 * @returns {Object}
	 */
	function getOptions(serviceRegistry) {
		var options = Object.create(null);
		getReferences(serviceRegistry).forEach(function(serviceRef) {
			serviceRef.getPropertyKeys().forEach(function(key) {
				if (key !== "service.id" && key !== "service.names" && key !== "objectClass") //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					options[key] = serviceRef.getProperty(key);
			});
		});
		return options;
	}

	function getReferences(serviceRegistry) {
		return serviceRegistry.getServiceReferences("orion.edit.context"); //$NON-NLS-0$
	}

	return {
		getEditorContext: getEditorContext,
		getOptions: getOptions
	};
});