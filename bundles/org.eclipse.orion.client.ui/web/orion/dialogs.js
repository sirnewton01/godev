/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define([], function(){
	/**
	 * Constructs a new dialog service. Clients should obtain a dialog service by
	 * requesting the service <tt>orion.page.dialog</tt> from the service registry. This 
	 * constructor should only be used by configuration code that is initializing
	 * a service registry
	 * @class The dialog service provides common helper dialogs such as confirmation and
	 * information dialogs.
	 * @name orion.dialogs.DialogService
	 */
	function DialogService(serviceRegistry) {
		this._serviceRegistry = serviceRegistry;
		this._serviceRegistration = serviceRegistry.registerService("orion.page.dialog", this); //$NON-NLS-0$
	}

	DialogService.prototype = /** @lends orion.dialogs.DialogService.prototype */ {
		/**
		 * Prompts the user for configuration, and executes the provided function when done.
		 * @param {String} message The confirmation message
		 * @param {Function} onDone The function to invoke upon confirmation.
		 */
		 confirm : function(msg, onDone) {
		 onDone(window.confirm(msg));
		 },
		 /**
		 * Prompts the user to select one or more files
		 * @param {Function} onDone The function to invoke upon confirmation.
		 */
		openFiles : function(onDone) {
			// TODO
		}	
	};
	DialogService.prototype.constructor = DialogService;
	//return module exports
	return {DialogService: DialogService};
});	
