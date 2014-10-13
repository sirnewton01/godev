/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
 
 define(['orion/Deferred'], function(Deferred){
 
	/**
	 * Support class for using the orion preferences as git config in settings page
	 *
	 * @param serviceRegistry [required] Service registry
	 */
	function GitConfigPreference(serviceRegistry){
		this._prefix = "/git/config"; //$NON-NLS-0$
		this._preferenceService = serviceRegistry.getService("orion.core.preference"); //$NON-NLS-0$
	}
	
	GitConfigPreference.prototype = {
		/**
		 * Get the {GitMail, GitName} object from the user preference.
		 */
		getConfig : function(){
			var d = new Deferred();
			this._preferenceService.getPreferences(this._prefix).then(
				function(pref){
					var userInfo = pref.get("userInfo"); //$NON-NLS-0$
					d.resolve(userInfo);
				}
			);
			return d;
		},
		
		/**
		 * Set the {GitMail, GitName} object into the user preference.
		 */
		setConfig : function(userInfo){
			var d = new Deferred();
			this._preferenceService.getPreferences(this._prefix).then(
				function(pref){
					pref.put("userInfo", userInfo); //$NON-NLS-0$
					d.resolve();
				}
			);
			return d;
		}
	};
	
	GitConfigPreference.prototype.constructor = GitConfigPreference;
	return GitConfigPreference;
 });