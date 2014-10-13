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
/*global alert */
/*eslint-env browser, amd*/
define(['i18n!profile/nls/messages','orion/webui/dialog'], function(messages, dialog) {

	function ResetPasswordDialog(options) {
		this._init(options);
	}
	
	ResetPasswordDialog.prototype = new dialog.Dialog();

	ResetPasswordDialog.prototype.TEMPLATE =
		'<table>' +  //$NON-NLS-0$
			'<tr><td><label for="password">${Password:}</label></td>' + //$NON-NLS-0$
			'<td><input id="password" type="password" /></td></tr>' + //$NON-NLS-0$
			'<tr><td><label for="retypePassword">${Retype password:}</label></td>' + //$NON-NLS-0$
			'<td><input id="retypePassword" type="password" /></td></tr>' + //$NON-NLS-0$
		'</table>'; //$NON-NLS-0$
	ResetPasswordDialog.prototype._init = function(options) {
		this.messages = messages;
		this.user = options.user;
		this.func = options.func || function() {};
		this.registry = options.registry;
		this.title = messages['Change password for '] + this.user.login;
		this.buttons = [{text: messages['Set Password'], callback: this.done.bind(this)}]; 
		this._initialize();
	};
	
	ResetPasswordDialog.prototype.done = function() {
		if (this.$password.value !== this.$retypePassword.value) {
			alert(messages['Passwords don\'t match!']);
			return;
		}
		
		var dialog = this;
		
		this.registry.getService("orion.core.user").resetUserPassword(dialog.user.login, dialog.$password.value).then(dialog.func, function(response) { //$NON-NLS-0$
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
				alert(messages["Password reset failed"]);
			}
		});
		this.hide();	
	};
	
	ResetPasswordDialog.prototype.constructor = ResetPasswordDialog;
	//return the module exports
	return {ResetPasswordDialog: ResetPasswordDialog};
});