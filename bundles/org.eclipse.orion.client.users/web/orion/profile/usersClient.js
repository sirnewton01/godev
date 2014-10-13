/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define(function() {

	/**
	 * Creates a new user service. A user service should be obtained by getting
	 * the <tt>orion.core.users</tt> service from the service registry rather than 
	 * calling this constructor. This constructor is intended for service registry 
	 * initialization code.
	 * @class The user service keeps track of the current Orion user.
	 * @name orion.profile.usersClient.UsersClient
	 */
	function UsersClient(serviceRegistry, pluginRegistry) {
		this.serviceRegistry = serviceRegistry;
	}
			
	UsersClient.prototype = /**@lends orion.profile.usersClient.UsersClient.prototype */ {
		getUserInfo: function(userURI, onLoad){
			return this._doServiceCall("getUserInfo", arguments); //$NON-NLS-0$
		},
		getUsersListSubset : function(start, rows, onLoad) {
			return this._doServiceCall("getUsersListSubset", arguments); //$NON-NLS-0$
		},
		getUsersList : function(onLoad) {
			return this._doServiceCall("getUsersList", arguments); //$NON-NLS-0$
		},
		deleteUser : function(userURI, onLoad) {
			return this._doServiceCall("deleteUser", arguments); //$NON-NLS-0$
		},
		createUser : function(userInfo, onLoad, onError) {
			return this._doServiceCall("createUser", arguments); //$NON-NLS-0$
		},
		updateUserInfo: function(userUri, data, onLoad){
			return this._doServiceCall("updateUserInfo", arguments); //$NON-NLS-0$
		},
		resetUserPassword: function(login, password, onLoad){
			return this._doServiceCall("resetUserPassword", arguments); //$NON-NLS-0$
		},
		initProfile: function(userURI, pluginsEventName, dataEventName){
			return this._doServiceCall("initProfile", arguments); //$NON-NLS-0$
		},
		fire: function(action, url, jsonData){
			return this._doServiceCall("fire", arguments); //$NON-NLS-0$
		},
		getDivContent: function() {
			return this._doServiceCall("getDivContent", arguments); //$NON-NLS-0$
		},
			
		/**
		 * This helper method implements invocation of the service call,
		 * with retry on authentication error if needed.
		 * @private
		 */
		_doServiceCall: function(funcName, funcArgs) {
			var usersService = this.serviceRegistry.getService("orion.core.user"); //$NON-NLS-0$
			return usersService[funcName].apply(usersService, funcArgs);
		}
	};
	UsersClient.prototype.constructor = UsersClient;
			
	//return module exports
	return {UsersClient: UsersClient};
});