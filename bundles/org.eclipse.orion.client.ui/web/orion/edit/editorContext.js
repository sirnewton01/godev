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
/*global define*/
define([
], function() {

	/**
	 * @name orion.edit.EditorContext
	 * @class Encapsulates service methods related to an editor.
	 * @classdesc Encapsulates service methods related to an editor.
	 * @description 
	 */

	/**
	 * @name orion.edit.editorContext.getEditorContext
	 * @function
	 * @namespace orion.edit.editorContext
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry The service registry to consult.
	 * @returns {orion.edit.EditorContext}
	 */
	function getEditorContext(serviceRegistry) {
		var editorContext = {};
		serviceRegistry.getServiceReferences("orion.edit.context").forEach(function(serviceRef) { //$NON-NLS-0$
			var service = serviceRegistry.getService(serviceRef);
			Object.keys(service).forEach(function(key) {
				if (typeof service[key] === "function") { //$NON-NLS-0$
					editorContext[key] = service[key].bind(service);
				}
			});
		});
		return editorContext;
	}

	return {
		getEditorContext: getEditorContext
	};
});
