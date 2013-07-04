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

/** @namespace The global container for eclipse APIs. */

define([], function(){

var eclipse = eclipse || {};

eclipse.SshService = (function() {
	
	function SshService(serviceRegistry) {
		if (serviceRegistry) {
			this._serviceRegistry = serviceRegistry;
			this._serviceRegistration = serviceRegistry.registerService(
					"orion.net.ssh", this); //$NON-NLS-0$
		}
	}

	SshService.prototype = /** @lends eclipse.SshService.prototype */
	{
			_KNOWN_HOSTS: "known_hosts", //$NON-NLS-0$

			addKnownHosts: function(known_hosts, user){
				if(!user){
					user = "";
				}
				var current_known_hosts = localStorage.getItem(user+this._KNOWN_HOSTS);
				if(current_known_hosts){
					if(current_known_hosts.indexOf(known_hosts)<0){
						localStorage.setItem(user+this._KNOWN_HOSTS, current_known_hosts+"\n"+known_hosts); //$NON-NLS-0$
					}
				}else{
					localStorage.setItem(user+this._KNOWN_HOSTS, known_hosts);
				}
			},
			clearKnownhosts: function(user){
				if(!user){
					user="";
				}
				localStorage.removeItem(user+this._KNOWN_HOSTS);
			},
			getKnownHosts: function(user){
				if(!user){
					user="";
				}
				return localStorage.getItem(user+this._KNOWN_HOSTS);
			}
	};
return SshService;
}());
return eclipse;
});