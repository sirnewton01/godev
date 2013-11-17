/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window document localStorage*/

define([
	'i18n!orion/widgets/nls/messages',
	'require',
	'orion/webui/littlelib',
	'orion/PageLinks',
	'orion/widgets/userAssistance/UATaskPanel',
	'orion/webui/dialog'
], function(messages, require, lib, PageLinks, UATaskPanel, dialog) {
	
	function UserMenu(options) {
		this._displaySignOut = true;
		this._init(options);		
	}
	UserMenu.prototype = /** @lends orion.widgets.UserMenu.UserMenu.prototype */ {
			
		_init: function(options) {
			this._dropdownNode = lib.node(options.dropdownNode);
			if (!this._dropdownNode) { throw "no dom node for dropdown found"; } //$NON-NLS-0$
			this._dropdown = options.dropdown;
			this._serviceRegistry = options.serviceRegistry;
			this.authenticatedServices = {};
			this.unauthenticatedServices = {};
			//Options to customize all drop down items 
			this._noSeparator = options.noSeparator;
			this._dropDownItemClass = options.dropDownItemClass;
			this._keyAssistClass = options.keyAssistClass;
			if( options.signOut !== undefined ){
				this._displaySignOut = options.signOut;
			}
 		},
		
		
		isSingleService : function(){
			return this.length(this.unauthenticatedServices) + this.length(this.authenticatedServices) === 1;
		},
		hasServices: function(){
			return this.length(this.unauthenticatedServices) + this.length(this.authenticatedServices) > 0;
		},
		length: function(obj) {
			var length = 0;
			for(var prop in obj) {
				if(obj.hasOwnProperty(prop)) {
					length++;
				}
			}
			return length;
		},
		
		_makeMenuItem: function(name, click) {
			var element = document.createElement("span"); //$NON-NLS-0$
			element.role = "menuitem";  //$NON-NLS-0$
			element.tabIndex = 0; //$NON-NLS-0$
			var text = document.createTextNode(name);
			element.appendChild(text);
			if(typeof this._dropDownItemClass === "string") {//$NON-NLS-0$
				if(this._dropDownItemClass !== "") {
					element.classList.add(this._dropDownItemClass);
				}
			} else {
				element.classList.add("dropdownMenuItem"); //$NON-NLS-0$
			}
			element.addEventListener("click", click, false); //$NON-NLS-0$
			// onClick events do not register for spans when using the keyboard
			element.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {	
					click();
				}
			}, false);
			return element;
		},
		
		_renderAuthenticatedService: function(key, startIndex){
			var _self = this;
			var authService = this.authenticatedServices[key].authService;
			if (authService && authService.logout && this._displaySignOut){
				var item = document.createElement("li");//$NON-NLS-0$
				var element = this._makeMenuItem(messages["Sign Out"], function() {
					authService.logout().then(function(){
						_self.addUserItem(key, authService, _self.authenticatedServices[key].label);
						localStorage.removeItem(key);
						localStorage.removeItem("lastLogin"); //$NON-NLS-0$
						//TODO: Bug 368481 - Re-examine localStorage caching and lifecycle
						for (var i = localStorage.length - 1; i >= 0; i--) {
							var name = localStorage.key(i);
							if (name && name.indexOf("/orion/preferences/user") === 0) { //$NON-NLS-0$
								localStorage.removeItem(name);
							}
						}
						authService.getAuthForm(window.location.href).then(function(formURL) {
							window.location = formURL;
						});
					});
				});
				item.appendChild(element);
				this._dropdownNode.appendChild(item);
			}
		},
		
		/*
		Category 0
			[Contributed extension links]
			Keyboard Shortcuts
		Separator
		Category 1
			[Contributed extension links]
			[Service sign-out links]
		*/
		renderServices: function(){
			var doc = document;
			var categories = [];
			function getCategory(number) {
				if (!categories[number]) {
					categories[number] = doc.createDocumentFragment();
				}
				return categories[number];
			}
			var serviceRegistry = this._serviceRegistry;
			PageLinks.getPageLinksInfo(serviceRegistry, "orion.page.link.user").then(function(linkInfos) { //$NON-NLS-0$
				if(this._dropdown) {
					this._dropdown.empty();
				} else if(this._dropdownNode) {
					lib.empty(this._dropdownNode);
				}

				// Read extension-contributed links
				linkInfos.forEach(function(item) {
					var categoryNumber = typeof item.category === "number" ? item.category : 1; //$NON-NLS-0$
					var category = getCategory(categoryNumber);

					var li = doc.createElement("li");//$NON-NLS-0$
					var link = doc.createElement("a"); //$NON-NLS-0$
					link.role = "menuitem"; //$NON-NLS-0$
					if(typeof this._dropDownItemClass === "string") {//$NON-NLS-0$
						if(this._dropDownItemClass !== "") {
							link.classList.add(this._dropDownItemClass);
						}
					} else {
						link.classList.add("dropdownMenuItem"); //$NON-NLS-0$
					}
					link.href = item.href;
					link.textContent = item.textContent;
					li.appendChild(link);
					category.appendChild(li);
					link.addEventListener("keydown", function(e) { //$NON-NLS-0$
						if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {	
							link.click();
						}
					}, false);
				}.bind(this));

				if(this.keyAssistFunction){
					var keyAssist = document.createElement("li"); //$NON-NLS-0$
					var element = this._makeMenuItem(messages["Keyboard Shortcuts"], this.keyAssistFunction);
					if(typeof this._keyAssistClass === "string") {//$NON-NLS-0$
						if(this._keyAssistClass !== "") {
							element.classList.add(this._keyAssistClass);
						}
					} else {
						element.classList.add("key-assist-menuitem"); //$NON-NLS-0$
					}
					keyAssist.appendChild(element);
					getCategory(0).appendChild(keyAssist);
				}

				// TODO need i18n on this eventually
				var getStartedServiceRef = serviceRegistry.getServiceReferences("orion.page.getstarted")[0]; //$NON-NLS-0$
				if (getStartedServiceRef) {
					var data = getStartedServiceRef.getProperty("data"); //$NON-NLS-0$
					var getStarted = document.createElement('li');
					var startElement = this._makeMenuItem("Getting Started", this.getStartedDialog.bind(this, data));
					getStarted.appendChild(startElement);
					getCategory(0).appendChild(getStarted);
				}

				// Add categories to _dropdownNode
				var _self = this;
				categories.sort(function(a, b) { return a - b; }).forEach(function(category, i) {
					if (i < categories.length - 1 && !this._noSeparator) {
						// Add a separator
						var li = document.createElement("li"); //$NON-NLS-0$
						li.classList.add("dropdownSeparator"); //$NON-NLS-0$
						var element = document.createElement("span"); //$NON-NLS-0$
						element.classList.add("dropdownSeparator"); //$NON-NLS-0$
						li.appendChild(element);
						category.appendChild(li);
					}
					_self._dropdownNode.appendChild(category);
				}.bind(this));

				if(this.isSingleService()){
					//add sign out only for single service.
					for(var i in this.authenticatedServices){
						if (this.authenticatedServices.hasOwnProperty(i)) {
							this._renderAuthenticatedService(i, 0);
						}
					}
				}
			}.bind(this));
		},
		
		getStartedDialog: function(getStartedData){
			var taskPanel = new UATaskPanel( null, true, getStartedData );
		},
		
		setKeyAssist: function(keyAssistFunction){
			this.keyAssistFunction = keyAssistFunction;
			this.renderServices();
		},
	
		addUserItem: function(key, authService, label, jsonData){
			if(jsonData){
				if(this.unauthenticatedServices[key]){
					delete this.unauthenticatedServices[key];
				}
				this.authenticatedServices[key] = {authService: authService, label: label, data: jsonData};
			}else{
				if(this.authenticatedServices[key]){
					delete this.authenticatedServices[key];
				}
				if(this.unauthenticatedServices[key]){
					this.unauthenticatedServices[key] = {authService: authService, label: label, pending: this.unauthenticatedServices[key].pending};
				}else{
					this.unauthenticatedServices[key] = {authService: authService, label: label};
				}
			}
			this.renderServices();
		}
	};
	UserMenu.prototype.constructor = UserMenu;
	//return the module exports
	return {UserMenu: UserMenu};

});
