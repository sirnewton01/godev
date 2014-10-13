/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

define(['i18n!profile/nls/messages', 'require', 'orion/webui/littlelib', 'orion/xhr', 'orion/section', 'orion/commands', 'orion/globalCommands'], 
			function(messages, require, lib, xhr, mSection, mCommands, mGlobalCommands) {

	function Profile(options) {
		this._init(options);
	}
	
	Profile.prototype = {
		_init : function(options) {
	
			this.registry = options.registry;
			this.pluginRegistry = options.pluginRegistry;
			this.profilePlaceholder = options.profilePlaceholder;
			this.commandService = options.commandService;
			this.pageActionsPlaceholder = options.pageActionsPlaceholder;
			this.usersClient = options.usersClient;
			this.iframes = [];
			
			var userProfile = this;
			
			this.usersService = this.registry.getService("orion.core.user"); //$NON-NLS-0$
			
			if(this.usersService !== null){
				this.usersService.addEventListener("requiredPluginsChanged", function(userInfo){ //$NON-NLS-0$
					userProfile.draw.bind(userProfile)(userInfo.data);
				});
				this.usersService.addEventListener("userInfoChanged", function(jsonData){ //$NON-NLS-0$
					userProfile.lastJSON = jsonData.data;	
					userProfile.populateData.bind(userProfile)(jsonData.data);
				});
				this.usersService.addEventListener("userDeleted", function(jsonData){ //$NON-NLS-0$
					// TODO this will wipe history?  Seems wrong.
					window.location.replace("/"); //$NON-NLS-0$
				});

				this.addInputListener();
			}
	
		},
		addInputListener: function(){	
			var that = this;
			window.addEventListener("hashchange", function() { //$NON-NLS-0$
				that.setUserToDisplay(window.location.hash);
			});
			var uri = window.location.hash;
			if(uri && uri!=="") {
				this.setUserToDisplay(uri);
			}
			else{
						
				// TODO if no hash provided current user profile should be loaded - need a better way to find logged user URI
				//NOTE: require.toURL needs special logic here to handle "login"
				var loginUrl = require.toUrl("login._"); //$NON-NLS-0$
				loginUrl = loginUrl.substring(0,loginUrl.length-2);
				
				xhr("POST", loginUrl, {//$NON-NLS-0$
					headers : {
						"Orion-Version" : "1" //$NON-NLS-1$ //$NON-NLS-0$
					},
					handleAs : "json", //$NON-NLS-0$
					timeout : 15000,
					load : function(jsonData, ioArgs) {
						window.location.hash = '#' + jsonData.Location;//$NON-NLS-0$
					},
					error : function(response, ioArgs) {
						//TODO: handle error
					}
				});
			}
		},
		draw : function(jsonData){
			
			var userProfile = this;
			
			if(this.profileForm){
				lib.empty(this.profileForm);
				this.iframes = [];
			} else {
				this.profileForm = document.createElement("div"); //$NON-NLS-0$
				this.profilePlaceholder.appendChild(this.profileForm);
			}
			// TODO these id's should not be known outside of the glue code!
			this.pageActionsPlaceholder =  lib.node('pageActions'); //$NON-NLS-0$
			this.commandService.destroy(this.pageActionsPlaceholder);			
			var userPluginDiv = document.createElement("div"); //$NON-NLS-0$
			this.profileForm.appendChild(userPluginDiv);
			
			this.usersClient.getDivContent().then(function(content) {
				userProfile.drawSections.bind(userProfile)(content, userPluginDiv);
			});	
	
		},
		setUserToDisplay : function(userURI) {
			if (userURI.length > 0 && userURI[0] === "#") {
				userURI = userURI.substring(1);
			}
			this.currentUserURI = userURI;
			this.usersClient.initProfile(userURI, "requiredPluginsChanged", "userInfoChanged"); //$NON-NLS-1$ //$NON-NLS-0$
		},
		
		redisplayLastUser : function(){
			var profile = this;
			this.usersClient.getUserInfo(profile.currentUserURI);
		},
		
		populateData: function(jsonData){
			if(jsonData && jsonData.login){
				this.lastJSON = jsonData;
				if(this.profileForm){
					var fields = lib.$$array(".userInput", this.profileForm); //$NON-NLS-0$
					fields.forEach(function(field) { //$NON-NLS-0$
						if (field.orionType && field.name && jsonData[field.name]) {
							if (field.orionType === "DateLong") { //$NON-NLS-0$
								field.textContent = new Date(parseInt(jsonData[field.name], 10)).toLocaleString();
							} else if (field.orionType === "Text") { //$NON-NLS-0$
								field.textContent = jsonData[field.name];
							} else if (field.orionType === "CheckBox") { //$NON-NLS-0$
								field.checked = jsonData[field.name];
							} else {
								field.value = jsonData[field.name];
							}
						}
					});
				}
				for(var i in this.iframes){
					this.setHash(this.iframes[i], jsonData.Location);
				}
			}else{
				throw new Error(messages["User is not defined"]);
			}
		},
		setHash: function(iframe, hash){
			if(iframe.src.indexOf("#")>0){ //$NON-NLS-0$
				iframe.src = iframe.src.substr(0, iframe.src.indexOf("#")) + "#" + hash; //$NON-NLS-1$ //$NON-NLS-0$
			}else{
				iframe.src = iframe.src + "#" + hash; //$NON-NLS-0$
			}
		},
		createFormElem: function(json, node) {
			if (!json.type) {
				throw new Error(messages["type is missing!"]);
			}
			var label, field;
			switch (json.type) {
				case "DateLong": //$NON-NLS-0$
					label = document.createElement("label"); //$NON-NLS-0$
					label.appendChild(document.createTextNode(json.label || ""));
					field = document.createElement("span"); //$NON-NLS-0$
					field.className = "userprofile userInput"; //$NON-NLS-0$
					field.id = json.props.id;
					field.name = json.props.name;
					label.appendChild(field);
					node.appendChild(label);
					break;
				case "Text": //$NON-NLS-0$
					label = document.createElement("label"); //$NON-NLS-0$
					label.appendChild(document.createTextNode(json.label || ""));
					field = document.createElement("span"); //$NON-NLS-0$
					field.className = "userprofile userInput"; //$NON-NLS-0$
					field.id = json.props.id;
					field.name = json.props.name;
					label.appendChild(field);
					node.appendChild(label);
					break;
				case "TextBox": //$NON-NLS-0$
					label = document.createElement("label"); //$NON-NLS-0$
					label.appendChild(document.createTextNode(json.label || ""));
					field = document.createElement("input"); //$NON-NLS-0$
					field.className = "userprofile userInput"; //$NON-NLS-0$
					field.id = json.props.id;
					field.name = json.props.name;
					if (json.props.readOnly) {
						field.readOnly = true;
					}
					label.appendChild(field);
					node.appendChild(label);
					break;
				case "CheckBox": //$NON-NLS-0$
					label = document.createElement("label"); //$NON-NLS-0$
					label.appendChild(document.createTextNode(json.label || ""));
					field = document.createElement("input"); //$NON-NLS-0$
					field.type = "checkbox"; //$NON-NLS-0$
					field.className = "userprofile userInput"; //$NON-NLS-0$
					field.id = json.props.id;
					field.name = json.props.name;
					if (json.props.readOnly) {
						field.disabled = true;
					}
					label.appendChild(field);
					node.appendChild(label);
					break;
				default: 
					return new Error(messages["Type not found "] + json.type);
			}
			label.className = "userLabel";
			field.orionType = json.type;
		},
		drawIframe: function(desc, placeholder){
			var iframe = document.createElement("iframe"); //$NON-NLS-0$
			iframe.src = desc.src;
			iframe.style.border = 0;
			iframe.style.width = "500px"; //$NON-NLS-0$
			this.iframes.push(iframe);
			if(this.lastJSON) {
				this.setHash(iframe, this.lastJSON.Location);
			}
			placeholder.appendChild(iframe, placeholder);
		},
		
		drawSections: function(content, placeholder){
			var profile = this;
			lib.empty(placeholder);
			if(content.sections) {
				for(var i=0; i<content.sections.length; i++){
					var sectionDescription = content.sections[i];
					var contentId = sectionDescription.id + "_Content";
					var section = new mSection.Section(placeholder, {
						id: sectionDescription.id,
						title: sectionDescription.name,
						content: '<div id="' + contentId + '"></div>', //$NON-NLS-1$ //$NON-NLS-0$
						preferenceService: this.registry.getService("orion.core.preference"), //$NON-NLS-0$
						canHide: true
					});					
					var sectionContents = lib.node(contentId);
					if(sectionDescription.type==="iframe"){ //$NON-NLS-0$
						this.drawIframe(sectionDescription.data, sectionContents);
						continue;
					}
	
					for(var j=0; j<sectionDescription.data.length; j++){
						var tableListItem = document.createElement("div"); //$NON-NLS-0$
						tableListItem.className = "sectionTableItem"; //$NON-NLS-0$
						sectionContents.appendChild(tableListItem);
						this.createFormElem(sectionDescription.data[j], tableListItem);
					}
				}
			}
			if(content.actions && content.actions.length>0) {
				var breadcrumbTarget = 	{};
				breadcrumbTarget.Parents = [];
				breadcrumbTarget.Name = profile.lastJSON.FullName && profile.lastJSON.FullName.replace(/^\s+|\s+$/g,"")!=="" ? profile.lastJSON.FullName : profile.lastJSON.login; //$NON-NLS-0$
				mGlobalCommands.setPageTarget({task: "User Profile", breadcrumbTarget: breadcrumbTarget}); //$NON-NLS-0$
			
				this.commandService.destroy(this.pageActionsPlaceholder);
				this.commandService.addCommandGroup(this.pageActionsPlaceholder.id, "eclipse.profileActionsGroup", 100); //$NON-NLS-0$
				for(var i=0; i<content.actions.length; i++){
					var info = content.actions[i];
					var fire = function(action) { this.fire(action); };
					var commandOptions = {
							name: info.name,
							image: info.image,
							id: info.id,
							tooltip: info.tooltip,
							callback: fire.bind(profile, info.action)
					};
					var command = new mCommands.Command(commandOptions);
					this.commandService.addCommand(command);					
					this.commandService.registerCommandContribution(this.pageActionsPlaceholder.id, info.id, i, "eclipse.profileActionsGroup"); //$NON-NLS-0$
				}
				this.commandService.renderCommands(this.pageActionsPlaceholder.id, this.pageActionsPlaceholder, {}, {}, "button"); //$NON-NLS-0$	
			}
			if (this.lastJSON) {
				window.setTimeout(function() {profile.populateData(profile.lastJSON);}, 0);
			}
			
		},
		fire: function(action) {
			var self = this;
			var data = {};
			// bail out if password is empty
			lib.$$array("input.userInput").forEach(function(field) { //$NON-NLS-0$
				if (field.type === 'password' && field.value === "") { //$NON-NLS-0$
					return;
				}
				if (field.orionType === "CheckBox") { //$NON-NLS-0$
					data[field.name] = field.checked;
				} else {
					data[field.name] = field.value;
				}
			});
			var url = this.currentUserURI;
			this.usersClient.fire(action, url, data).then(
		
			function(info) {
				self.displayMessage.bind(self)(info, "Info"); //$NON-NLS-0$
			}, function(error) {
				if (error.status === 401 || error.status === 403) {
					return;
				}
				self.displayMessage.bind(self)(error, "Error"); //$NON-NLS-0$
			});
		
		},
		displayMessage: function(message, severity){
			if(!message) {
				return;
			}
			var display = [];
			
			display.Severity = severity;
			display.HTML = false;
			
			try{
				var resp = JSON.parse(message.responseText);
				display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
			}catch(Exception){
				display.Message = message.Message;
			}
			
			if(display.Message){
				this.registry.getService("orion.page.message").setProgressResult(display);	 //$NON-NLS-0$
			}
		}
	};
	return {
		Profile:Profile
	};
});
