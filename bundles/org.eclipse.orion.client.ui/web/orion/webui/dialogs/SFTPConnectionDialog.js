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
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/littlelib', 'orion/webui/popupdialog', 'orion/webui/dialog'], function(messages, lib, popupdialog, dialog) {

	if (!localStorage.getItem("orion.sftpConnections")) { //$NON-NLS-0$
		var defaultItems = { 
			identifier: 'name', //$NON-NLS-0$
			label: messages['name'],
			items: []
		};
		localStorage.setItem("orion.sftpConnections", JSON.stringify(defaultItems)); //$NON-NLS-0$
	}
	
	/* Internal */
 
	function SFTPNewConnectionPopup(triggerNode, notify) {
		this.messages = messages;
		this._initialize(triggerNode);
		this._notify = notify;
	}
	
	SFTPNewConnectionPopup.prototype = new popupdialog.PopupDialog();

	SFTPNewConnectionPopup.prototype.TEMPLATE = 
		'<div><label for="sftpHost">${Remote host:}</label>' + //$NON-NLS-0$
		'<input id="sftpHost" /></div>' + //$NON-NLS-0$
		'<div><label for="sftpPort">${Port:}</label>' + //$NON-NLS-0$
		'<input id="sftpPort" /></div>' + //$NON-NLS-0$
		'<div><label for="sftpPath">${Remote path:}</label>' + //$NON-NLS-0$
		'<input id="sftpPath" /></div>' + //$NON-NLS-0$
		'<div><label for="sftpUser">${User name:}</label>' + //$NON-NLS-0$
		'<input id="sftpUser" /></div>' + //$NON-NLS-0$
		'<div class="layoutBlock layoutRight"><button id="addSftpConnection" class="dropdownTrigger orionButton commandButton">${Add}</button></div>';  //$NON-NLS-0$
	
	SFTPNewConnectionPopup.prototype._bindToDom = function(parent) {
		var self = this;
		var addConnection = function() { 
			var connectionString = this.$sftpUser.value + "@" + this.$sftpHost.value +":" + this.$sftpPort.value + this.$sftpPath.value; //$NON-NLS-1$ //$NON-NLS-0$
			this._notify({name: connectionString});
			this.hide();
		};
		this.$addSftpConnection.addEventListener("click", addConnection.bind(self), false); //$NON-NLS-0$
	};
	
	SFTPNewConnectionPopup.prototype.constructor = SFTPNewConnectionPopup;

	/**
	 * @param options {{ 
	 *     title: string,
	 *     label: string,
	 *     func: function,
	 *     [advanced]: boolean  // Whether to show advanced controls. Default is false
	 * }}
	 */
 
	function SFTPConnectionDialog(options) {
		this._init(options);
	}
	
	SFTPConnectionDialog.prototype = new dialog.Dialog();

	SFTPConnectionDialog.prototype.TEMPLATE = 
		'<div>' + //$NON-NLS-0$
			'<div><label for="sftpPath">${Location:}</label></div>' +  //$NON-NLS-0$
			'<div><select id="sftpConnectionList" name="sftpConnectionList"></select>' + //$NON-NLS-0$
			'<button id="newSftpConnection" style="margin-left: 16px;" class="dropdownTrigger orionButton commandButton">${New}<span class="dropdownArrowDown core-sprite-openarrow"></span></button></div>' + //$NON-NLS-0$
			'<div><label for="sftpPassword">${Password:}</label></div>' + //$NON-NLS-0$
			'<div><input id="sftpPassword" type="password" /></div>' + //$NON-NLS-0$
			'<p>${If the same file exists in both the source and destination:}</p>' + //$NON-NLS-0$
			'<input type="radio" name="overwriteOption" id="overwriteCancel" checked value="overwriteCancel" />' + //$NON-NLS-0$
			'<label for="overwriteCancel">${Cancel the transfer}</label>' +  //$NON-NLS-0$
			'<br />' + //$NON-NLS-0$
			'<input type="radio" name="overwriteOption" id="overwriteAll" value="overwriteAll" />' + //$NON-NLS-0$
			'<label for="overwriteAll">${Always overwrite destination}</label>' +  //$NON-NLS-0$
			'<br />' + //$NON-NLS-0$
			'<input type="radio" name="overwriteOption" id="overwriteOlder" value="overWriteOlder" />' +  //$NON-NLS-0$
			'<label for="overwriteOlder">${Overwrite if source is newer}</label>' + //$NON-NLS-0$
		'</div>'; //$NON-NLS-0$
		
	SFTPConnectionDialog.prototype._init = function(options) {
		this.title = "SFTP Transfer"; //$NON-NLS-0$
		this.messages = messages;
		this.modal = true;
		this.buttons = [{text: messages['Start Transfer'], callback: this.done.bind(this)}]; 
		this.sftpConnectionStoreData = JSON.parse(localStorage.getItem("orion.sftpConnections")); //$NON-NLS-0$
		this._func = options.func;
		this._initialize();
	};
	
	SFTPConnectionDialog.prototype._bindToDom = function(parent) {
		var self = this;
		this.$sftpConnectionList.style.minWidth = "220px"; //$NON-NLS-0$
		this._popupDialog = new SFTPNewConnectionPopup(this.$newSftpConnection, this.onAddConnection.bind(this));
		this._addChildDialog(this._popupDialog);
		this._populateSelect();
	};
	
	SFTPConnectionDialog.prototype._afterHiding = function() {
		this._popupDialog.hide();
	};
	
	SFTPConnectionDialog.prototype.done =  function() {
		var selected = this.$sftpConnectionList.value;
		var splits = selected.split("@"); //$NON-NLS-0$
		var host, port, path, user, remaining;
		if (splits.length === 2) {
			user = splits[0];
			remaining = splits[1];
		} else if (splits.length === 3) {
			user = splits[0]+"@"+splits[1]; //$NON-NLS-0$
			remaining = splits[2];
		} else {
			this.hide();
			return;
		}
		var portSeparator = remaining.indexOf(":"); //$NON-NLS-0$
		if (portSeparator <= 0) {
			port = 22;
		}
		var pathSeparator = remaining.indexOf("/"); //$NON-NLS-0$
		if (pathSeparator <= 0) {
			this.hide();
			return;
		}
		if (port) {
			host = remaining.substring(0, pathSeparator);
			path = remaining.substring(pathSeparator);
		} else {
			host = remaining.substring(0, portSeparator);
			port = remaining.substring(portSeparator+1, pathSeparator);
			path = remaining.substring(pathSeparator);
		}

		// window.console.log("host: " + host + " port: " + port + " user: " + user + " path: " + path);
		this._func(host, port, path, user, this.$sftpPassword.value, this._computeOverwriteValue());
		this.hide();
	};
	
	SFTPConnectionDialog.prototype._computeOverwriteValue = function() {
		if (this.$overwriteCancel.checked) {
			return "no-overwrite"; //$NON-NLS-0$
		} else if (this.$overwriteOlder.checked) {
			return "overwrite-older"; //$NON-NLS-0$
		}
		//by default pass no options
		return "";
	};
	
	SFTPConnectionDialog.prototype._populateSelect = function() {
		lib.empty(this.$sftpConnectionList);
		for (var i = 0; i < this.sftpConnectionStoreData.items.length; i++) {
			var name = this.sftpConnectionStoreData.items[i].name;
			var option = document.createElement("option"); //$NON-NLS-0$
			option.appendChild(document.createTextNode(name));
			option.value = name;
			this.$sftpConnectionList.appendChild(option);
		}
	};
	
	
	SFTPConnectionDialog.prototype.onAddConnection = function(newConnection) {
		//make sure we don't already have an entry with this name
		var found = false;
		for (var i = 0; i < this.sftpConnectionStoreData.items.length; i++) {
			if (this.sftpConnectionStoreData.items[i].name === newConnection.name) {
				found = true;
				break;
			}
		}
		//if we have a new value, add it to the list and to the storage
		if (!found) {
			this.sftpConnectionStoreData.items.unshift(newConnection);
			localStorage.setItem("orion.sftpConnections", JSON.stringify(this.sftpConnectionStoreData)); //$NON-NLS-0$
			this._populateSelect();
			this.$sftpConnectionList.value = newConnection.name;
		}
	};
	
	SFTPConnectionDialog.prototype.constructor = SFTPConnectionDialog;
	//return the module exports
	return {SFTPConnectionDialog: SFTPConnectionDialog};
});