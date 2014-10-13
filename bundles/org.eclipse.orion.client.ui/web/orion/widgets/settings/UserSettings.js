/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define([
	'i18n!orion/settings/nls/messages', 
	'orion/commands', 
	'orion/section', 
	'orion/webui/littlelib', 
	'orion/objects', 
	'orion/widgets/settings/Subsection', 
	'orion/widgets/input/LabeledTextfield', 
	'orion/widgets/input/LabeledCheckbox',
	'orion/webui/tooltip'
], function(messages, mCommands, mSection, lib, objects, Subsection, LabeledTextfield, LabeledCheckbox, mTooltip) {

	function UserSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
	}
	objects.mixin(UserSettings.prototype, {
		dispatch: true,

		// TODO these should be real Orion sections, not fake DIVs
		templateString: '' +  //$NON-NLS-0$
					'<div class="sectionWrapper toolComposite">' +  //$NON-NLS-0$
						'<div class="sectionAnchor sectionTitle layoutLeft">${User Profile}</div>' +   //$NON-NLS-0$
						'<div id="userCommands" class="layoutRight sectionActions"></div>' +  //$NON-NLS-0$
					'</div>' + //$NON-NLS-2$ //$NON-NLS-0$
					'<div class="sectionTable sections">' + //$NON-NLS-0$
					
					'</div>', //$NON-NLS-0$

		createElements: function() {
			this.node.innerHTML = this.templateString;
			lib.processTextNodes(this.node, messages);
			
			this.sections = lib.$('.sections', this.node);  //$NON-NLS-0$
			
			this.createSections();
		},

		setHash: function(iframe, hash){
			if(iframe.src.indexOf("#")>0){ //$NON-NLS-0$
				iframe.src = iframe.src.substr(0, iframe.src.indexOf("#")) + "#" + hash; //$NON-NLS-1$ //$NON-NLS-0$
			}else{
				iframe.src = iframe.src + "#" + hash; //$NON-NLS-0$
			}
		},
		
		createSections: function(){
			
			var updateAccountFunction = this.updateAccount.bind(this);
			var updatePasswordFunction = this.updatePassword.bind(this);
			
			/* - account ----------------------------------------------------- */
			this.accountFields = [
				new LabeledTextfield( {fieldlabel:messages['Username'], editmode:'readonly'}),  //$NON-NLS-0$
				new LabeledTextfield( {fieldlabel:messages['Full Name'], postChange: updateAccountFunction}),
				new LabeledTextfield( {fieldlabel:messages['Email Address'], postChange: updateAccountFunction}),
				new LabeledCheckbox( {fieldlabel: messages['Email Confirmed'], editmode:'readonly'})  //$NON-NLS-0$
			];
			var accountSubsection = new Subsection( {sectionName: messages['Account'], parentNode: this.sections, children: this.accountFields} );
			accountSubsection.show();

			/* - password ---------------------------------------------------- */
			this.passwordFields = [
				new LabeledTextfield( {fieldlabel:messages['Current Password'], inputType:'password', postChange: updatePasswordFunction} ), //$NON-NLS-1$  //$NON-NLS-0$
				new LabeledTextfield( {fieldlabel:messages['New Password'], inputType:'password', postChange: updatePasswordFunction} ), //$NON-NLS-1$  //$NON-NLS-0$
				new LabeledTextfield( {fieldlabel:messages['Verify Password'], inputType:'password', postChange: updatePasswordFunction} ) //$NON-NLS-1$  //$NON-NLS-0$
			];
			var passwordSection = new Subsection( {sectionName:messages['Password'], parentNode: this.sections, children: this.passwordFields } );
			passwordSection.show();
			
			this._passwordTooltip = new mTooltip.Tooltip({
				node: this.passwordFields[1].textfield,
				text: messages['UserSettings.PasswordRules'],
				trigger: 'focus', //$NON-NLS-0$
				position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});

			this.username = "";
			var deleteCommand = new mCommands.Command({
				name: messages["Delete"],
				tooltip: messages["DeleteUser"],
				id: "orion.deleteprofile",  //$NON-NLS-0$
				callback: function(){
					this.deleteUser();
				}
			});
			
			this.commandService.addCommand(deleteCommand);
			this.commandService.registerCommandContribution('profileCommands', "orion.deleteprofile", 3); //$NON-NLS-1$ //$NON-NLS-0$

			this.commandService.renderCommands('profileCommands', lib.node( 'userCommands' ), this, this, "button"); //$NON-NLS-1$ //$NON-NLS-0$  //$NON-NLS-2$		
			
			this.linkedAccountSection = new mSection.Section(this.node, {
				id: "linkedAccountSection", //$NON-NLS-0$
				title: messages["Linked Accounts"],
				content: '<div style="margin-left: 10px; margin-top: 17px;" id="iFrameContent"></div>', //$NON-NLS-0$
				canHide: false,
				useAuxStyle: true,
				slideout: true
			});
			
			
			var iframe = this.iframe = document.createElement("iframe"); //$NON-NLS-0$
			iframe.src = "../mixloginstatic/manageExternalIds.html"; //$NON-NLS-0$
			iframe.style.border = "0";
			iframe.style.width = "500px";
			lib.node( 'iFrameContent' ).appendChild(iframe); //$NON-NLS-0$
		},
		
		deleteUser: function(){
			if(confirm(messages["DeleteUserComfirmation"])){			
				var userService = this.userService; //$NON-NLS-0$
				userService.deleteUser("/users/" + this.username).then(function(jsonData) {  //$NON-NLS-0$
					window.location.reload();
				}, function(jsonData) {
					alert(jsonData.Message);
				});
			}
		},
		
		updateAccount: function(){
			var authenticationIds = [];
			var authServices = this.registry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			var userService = this.userService;
			var userdata = {};
			
			userdata.login = this.accountFields[0].getValue();
			userdata.FullName = this.accountFields[1].getValue();
			userdata.Email = this.accountFields[2].getValue();
			
			for(var i=0; i<authServices.length; i++){
				var servicePtr = authServices[i];
				var authService = this.registry.getService(servicePtr);		
	
				authService.getKey().then(function(key){
					authenticationIds.push(key);
					authService.getUser().then(function(jsonData){
						userService.updateUserInfo(jsonData.Location, userdata).then( function(args){
							if(args){
								messageService.setProgressResult(args);
							}else{
								messageService.setProgressResult( messages["UsrProfileUpdateSuccess"] ); //$NON-NLS-0$
							}
						}, function(error){
							messageService.setProgressResult(error);
						});
					});
				});
			}
		},
			
		updatePassword: function(value, event){
			var authenticationIds = [];
			var authServices = this.registry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			var userService = this.userService;
			var userdata = {};
			
			if (!value) {
				//user deleted input from field, remove any error state and do nothing else
				event.target.classList.remove("setting-control-error"); //$NON-NLS-0$
				return;
			}
			
			var currentPassword = this.passwordFields[0].getValue();
			var newPassword = this.passwordFields[1].getValue();
			var newPasswordRetype = this.passwordFields[2].getValue();
			
			var currentPasswordTextField = this.passwordFields[0].textfield;
			var newPasswordTextField = this.passwordFields[1].textfield;
			var newPasswordRetypeTextField = this.passwordFields[2].textfield;
			var validNewPassword = true;
			
			if (event.target === newPasswordTextField) {
				validNewPassword = this._verifyPassword(newPassword);
			}
			
			if (validNewPassword) {
				if (newPassword && newPasswordRetype) {
					if (newPassword === newPasswordRetype) {
						if(currentPassword.length > 0){
							userdata.oldPassword = currentPassword;
							userdata.password = newPassword;
							userdata.passwordRetype = newPasswordRetype;
						
							//dispatch passwords to user service
							authServices.forEach(function(servicePtr) {
								var authService = this.registry.getService(servicePtr);
								var passwordFields = this.passwordFields;
								authService.getKey().then(function(key){
									authenticationIds.push(key);
									authService.getUser().then(function(jsonData){
										userService.updateUserInfo(jsonData.Location, userdata).then( function(args){
											if(args){
												messageService.setProgressResult(args);
											} else {
												messageService.setProgressResult( messages['User profile data successfully updated.'] ); //$NON-NLS-0$
												currentPasswordTextField.classList.remove("setting-control-error"); //$NON-NLS-0$
												passwordFields.forEach(function(passwordField){
													passwordField.setValue(""); //$NON-NLS-0$
												});
											}
										}, function(jsonError){
											var errorObject = JSON.parse(jsonError);
											if (errorObject && (400 === errorObject.HttpCode)) {
												//wrong current password
												setTimeout(function(){
													currentPasswordTextField.select();
													currentPasswordTextField.focus();
													currentPasswordTextField.classList.add("setting-control-error"); //$NON-NLS-0$
												}, 100);
											}
											messageService.setProgressResult(jsonError);
										});
									});
								});
							}, this);
						} else {
							messageService.setProgressResult( {Message: messages['UserSettings.TypeCurrentPassword'], Severity: 'Warning'} ); //$NON-NLS-1$ //$NON-NLS-0$
							setTimeout(function(){
								currentPasswordTextField.focus();
							}.bind(this), 100);
						}
						newPasswordTextField.classList.remove("setting-control-error"); //$NON-NLS-0$
						newPasswordRetypeTextField.classList.remove("setting-control-error"); //$NON-NLS-0$
					} else {
						messageService.setProgressResult( {Message: messages['UserSettings.PasswordsDoNotMatch'], Severity: 'Error'} ); //$NON-NLS-1$ //$NON-NLS-0$
						setTimeout(function(){
							newPasswordRetypeTextField.select();
							newPasswordRetypeTextField.focus();
						}.bind(this), 100);
						newPasswordTextField.classList.add("setting-control-error"); //$NON-NLS-0$
						newPasswordRetypeTextField.classList.add("setting-control-error"); //$NON-NLS-0$
					}
				} else {
					event.target.classList.remove("setting-control-error"); //$NON-NLS-0$
				}
			} else {
				event.target.classList.add("setting-control-error"); //$NON-NLS-0$
				setTimeout(function(){
					event.target.select();
					event.target.focus();
				}.bind(this), 100);
			}
		},
		
		_verifyPassword: function(password) {
			var passwordIsValid = true;
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			
			if (password.length < 8) {
				passwordIsValid = false;
				messageService.setProgressResult( {Message: messages['UserSettings.InvalidPasswordLength'], Severity: 'Error'} ); //$NON-NLS-1$ //$NON-NLS-0$
			} else if (!/[a-zA-Z]+/.test(password) || !/[^a-zA-Z]+/.test(password)) {
				passwordIsValid = false;
				messageService.setProgressResult( {Message: messages['UserSettings.InvalidPasswordAlpha'], Severity: 'Error'} ); //$NON-NLS-1$ //$NON-NLS-0$
			}
			
			return passwordIsValid;
		},
		
		show:function(){
			this.createElements();
			
			this.userService = this.registry.getService("orion.core.user"); //$NON-NLS-0$
			
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			
			var authenticationIds = [];
			
			var authServices = this.registry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
			
			var userService = this.userService;
			
			var settingsWidget = this;
			
			for(var i=0; i<authServices.length; i++){
				var servicePtr = authServices[i];
				var authService = this.registry.getService(servicePtr);		

				authService.getKey().then(function(key){
					authenticationIds.push(key);
					authService.getUser().then(function(jsonData){

						var b = userService.getUserInfo(jsonData.Location).then( function( accountData ){
							settingsWidget.username = accountData.login;
							settingsWidget.accountFields[0].setValue( accountData.login );
							if (accountData.FullName){
								settingsWidget.accountFields[1].setValue( accountData.FullName );
							} else {
								settingsWidget.accountFields[1].setValue( '' );
							}
							if (accountData.Email){
								settingsWidget.accountFields[2].setValue( accountData.Email );
							} else {
								settingsWidget.accountFields[2].setValue( '' );
							}
							settingsWidget.accountFields[3].setChecked( accountData.emailConfirmed );
						}, function(error) {
							messageService.setProgressResult(error);
						});
						
						settingsWidget.setHash( settingsWidget.iframe, jsonData.Location );	
					});
				});
			}
			
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.sections = null;
			}
			if (this._passwordTooltip) {
				this._passwordTooltip.destroy();
				this._passwordTooltip = null;
			}
		}
	});
	return UserSettings;
});