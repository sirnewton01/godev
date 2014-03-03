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
/*global window console define */
/*jslint browser:true sub:true*/

define(['i18n!orion/settings/nls/messages', 'require', 'orion/commands', 'orion/section', 'orion/webui/littlelib', 'orion/objects', 'orion/i18nUtil',
		'orion/widgets/settings/Subsection', 'profile/UsersService', 'orion/widgets/input/LabeledTextfield', 'orion/widgets/input/LabeledCheckbox', 'orion/widgets/input/LabeledCommand'
		], function(messages, require, mCommands, mSection, lib, objects, i18nUtil, Subsection, UsersService, LabeledTextfield, LabeledCheckbox, LabeledCommand) {

	function UserSettings(options, node) {
		objects.mixin(this, options);
		this.node = node;
	}
	objects.mixin(UserSettings.prototype, {
		dispatch: true,

		// TODO these should be real Orion sections, not fake DIVs
		templateString: '' +  //$NON-NLS-0$
				'<div>' +  //$NON-NLS-0$
					'<div class="sectionWrapper toolComposite">' +
						'<div class="sectionAnchor sectionTitle layoutLeft">${User Profile}</div>' + 
						'<div id="userCommands" class="layoutRight sectionActions"></div>' +
					'</div>' + //$NON-NLS-2$ //$NON-NLS-0$
					'<div class="sectionTable sections">' + //$NON-NLS-0$
					
					'</div>' + //$NON-NLS-0$
					'<div></div>' +
					
				'</div>' + //$NON-NLS-0$
				
				'<div class="linkedSection"></div>',

		createElements: function() {
			this.node.innerHTML = this.templateString;
			lib.processTextNodes(this.node, messages);
			
			this.sections = lib.$('.sections', this.node);
			this.linkedSection = lib.$('.linkedSection', this.node);
			
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
			
			/* - account ----------------------------------------------------- */
			this.accountFields = [
				new LabeledTextfield( {fieldlabel:messages['Username'], editmode:'readonly'}),
				new LabeledTextfield( {fieldlabel:messages['Full Name']}),
				new LabeledTextfield( {fieldlabel:messages['Email Address']}),
				new LabeledCheckbox( {fieldlabel: messages['Email Confirmed'], editmode:'readonly'})
			];
			var accountSubsection = new Subsection( {sectionName: messages['Account'], parentNode: this.sections, children: this.accountFields} );
			accountSubsection.show();

			/* - password ---------------------------------------------------- */
			this.passwordFields = [
				new LabeledTextfield( {fieldlabel:messages['Current Password'], inputType:'password'} ), //$NON-NLS-1$
				new LabeledTextfield( {fieldlabel:messages['New Password'], inputType:'password'} ), //$NON-NLS-1$
				new LabeledTextfield( {fieldlabel:messages['Verify Password'], inputType:'password'} ) //$NON-NLS-1$
			];
			var passwordSection = new Subsection( {sectionName:messages['Password'], parentNode: this.sections, children: this.passwordFields } );
			passwordSection.show();

			var updateCommand = new mCommands.Command({
				name: messages["Update"],
				tooltip: messages["Update Profile Settings"],
				id: "orion.updateprofile", //$NON-NLS-0$
				callback: function(data){
					this.update(data.items);
				}.bind(this)
			});
			
			this.commandService.addCommand(updateCommand);
			this.commandService.registerCommandContribution('profileCommands', "orion.updateprofile", 3); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.renderCommands('profileCommands', lib.node( 'userCommands' ), this, this, "button"); //$NON-NLS-1$ //$NON-NLS-0$		
			
			this.linkedAccountSection = new mSection.Section(this.linkedSection, {
				id: "linkedAccountSection", //$NON-NLS-0$
				title: messages["Linked Accounts"],
				content: '<div id="iFrameContent"></div>', //$NON-NLS-0$
				canHide: true,
				useAuxStyle: true,
				hidden: true,
				slideout: true
			});
			
			
			var iframe = this.iframe = document.createElement("iframe"); //$NON-NLS-0$
			iframe.src = "../mixloginstatic/manageOpenids.html";
			iframe.style.border = "0";
			iframe.style.width = "500px";
			lib.node( 'iFrameContent' ).appendChild(iframe); //$NON-NLS-0$
		},
		
		confirmOpenId: function(openid){
			if (openid !== "" && openid !== null) {
				this.win = window.open( "../mixlogin/manageopenids/openid?openid=" + encodeURIComponent(openid),"openid_popup", "width=790,height=580" ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		},
		
	update: function(data){
			
			var authenticationIds = [];
			
			var authServices = this.registry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
			
			var messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
			
			var userService = this.userService;
			
			var settingsWidget = this;
			
			var userdata = {};
			
			userdata.login = settingsWidget.accountFields[0].getValue();
			userdata.Name = settingsWidget.accountFields[1].getValue();
			userdata.email = settingsWidget.accountFields[2].getValue();
			
			var pword = settingsWidget.passwordFields[1].getValue();
			var pwordRetype = settingsWidget.passwordFields[2].getValue();

			if( pword.length > 0 ){
			
				if( pword !== pwordRetype ){
					messageService.setProgressResult( 'New password, and retyped password do not match' );
					
					this.dispatch = false;
					
				}else{
				
					if( settingsWidget.passwordFields[0].getValue().length > 0 ){
						userdata.oldPassword = settingsWidget.passwordFields[0].getValue();
						userdata.password = pword;
						userdata.passwordRetype = pwordRetype;
					
						this.dispatch = true;
					
					}else{
						messageService.setProgressResult( 'Need to type your current password' );
					
						this.dispatch = false;
					}		
				}
			}
			
			if( this.dispatch === true ){
			
				for(var i=0; i<authServices.length; i++){
					var servicePtr = authServices[i];
					var authService = this.registry.getService(servicePtr);		
	
					authService.getKey().then(function(key){
						authenticationIds.push(key);
						authService.getUser().then(function(jsonData){
						
							var data = jsonData;
							
							var b = userService.updateUserInfo(jsonData.Location, userdata).then( function(args){
								if(args){
									messageService.setProgressResult(args);
								}else{
									messageService.setProgressResult( messages['User profile data successfully updated.'] );
								}

								// TODO: don't reach into User Menu internals for this. Should dispatch a service event instead, etc.
//								if( userdata.Name ){
//									var userMenu = lib.node( 'userTrigger' ); //$NON-NLS-0$
//									if (userMenu) {
//										userMenu.replaceChild(document.createTextNode(userdata.Name), userMenu.firstChild);
//									}
//								}
							}, function(error){
								messageService.setProgressResult(error);
							});
						});
					});
				}	
			}
		},
		
		show:function(){
			this.createElements();
			
			this.userService = this.registry.getService("orion.core.user"); //$NON-NLS-0$
			
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
					
						var data = jsonData;
						
						var b = userService.getUserInfo(jsonData.Location).then( function( accountData ){

							settingsWidget.accountFields[0].setValue( accountData.login );
							settingsWidget.accountFields[1].setValue( accountData.Name );
							settingsWidget.accountFields[2].setValue( accountData.email );
							settingsWidget.accountFields[3].setChecked( accountData.emailConfirmed );
						});
						
						settingsWidget.setHash( settingsWidget.iframe, jsonData.Location );	
					});
				});
			}
			
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.sections = this.linkedSection = null;
			}
		}
	});
	return UserSettings;
});