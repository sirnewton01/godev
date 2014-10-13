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
/*global alert*/
define(['i18n!profile/nls/messages', 'orion/webui/dialog'], function(messages, dialog) {

	function NewUserDialog(options) {
		this._init(options);
	}

	NewUserDialog.prototype = new dialog.Dialog();


	NewUserDialog.prototype.TEMPLATE =
		'<table>' +  //$NON-NLS-0$
		'<tr><td><label for="userName">${Login:}</label></td>' + //$NON-NLS-0$
		'<td><input id="userName" /></td></tr>' + //$NON-NLS-0$
		'<tr><td><label for="password">${Password:}</label></td>' + //$NON-NLS-0$
		'<td><input id="password" type="password" /></td></tr>' + //$NON-NLS-0$
		'<tr><td><label for="retypePassword">${Retype password:}</label></td>' + //$NON-NLS-0$
		'<td><input id="retypePassword" type="password" /></td></tr>' + //$NON-NLS-0$
		'<tr><td><label for="email">${Email:}</label></td>' + //$NON-NLS-0$
		'<td><input id="email" /></td></tr>' + //$NON-NLS-0$
		'</table>'; //$NON-NLS-0$

	NewUserDialog.prototype._init = function(options) {
		this.title = messages['Create New User'];
		this.messages = messages;
		this.func = options.func || function() {};
		this.registry = options.registry;
		this.buttons = [{text: messages['Create'], isDefault: true, callback: this.done.bind(this)}]; 
		this._initialize();
	};

	NewUserDialog.prototype.done = function() {
		if (this.$userName.value === "") {
			alert(messages["Provide user login!"]);
			return;
		}

		if (this.$password.value !== this.$retypePassword.value) {
			alert(messages["Passwords don't match!"]);
			return;
		}

		var dialog = this;

		this.registry.getService("orion.core.user").createUser({
			login: dialog.$userName.value,
			password: dialog.$password.value,
			Email: dialog.$email.value
		}).then(dialog.func, function(response) { //$NON-NLS-0$
			console.info(response);
			var message = response.Message;
			try{
				if(response.responseText){
					message = JSON.parse(response.responseText).Message;
				}
			}catch(Exception){
				//leave standard message
			}

			if (message) {
				alert(message);
			} else {
				alert(messages["User could not be created."]);
			}
		}, function(error){
			console.info(error);
		});
		this.hide();
	};

	NewUserDialog.prototype.constructor = NewUserDialog;
	//return the module exports
	return {NewUserDialog: NewUserDialog};
});