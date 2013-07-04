/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'require' ], 
	
	function(messages, require) {

		function ProjectResponseHandler( target ){
			this.target = document.getElementById( target );	
		}
		
		function handleError( message ){
			this.target.innerHTML = 'There was a problem: ' + message;
			this.target.className = 'alert-error';
			setInterval(this.clear.bind(this),5000);
		}
		
		function clear(){
			this.target.className = 'alert-clear';
		}
		
		function handleSuccess( message ){
			this.target.innerHTML = 'Request succeeded: ' + message;
			this.target.className = 'alert-success';
			setInterval(this.clear.bind(this),5000);
		}
		
		function handleInformation( message ){
			this.target.innerHTML = message;
		}
		
		ProjectResponseHandler.prototype.handleError = handleError;
		ProjectResponseHandler.prototype.handleSuccess = handleSuccess;
		ProjectResponseHandler.prototype.handleInformation = handleInformation;
		ProjectResponseHandler.prototype.clear = clear;
		
		ProjectResponseHandler.prototype.constructor = ProjectResponseHandler;

		return ProjectResponseHandler;
	}
);