/*******************************************************************************
 * @license Copyright (c) 2010, 2012 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
  /*globals define window document*/

define([ 'i18n!git/nls/gitmessages', 'orion/webui/dialog'], function(messages, dialog) {

	function ConfirmPushDialog(options) {
		this._init(options);
	}

	ConfirmPushDialog.prototype = new dialog.Dialog();

	ConfirmPushDialog.prototype.TEMPLATE = '<div id="header"></div>';

	ConfirmPushDialog.prototype._init = function(options) {
		var that = this;
		
		this.title = "Git Push";
		this.modal = true;
		this.messages = messages;
		this.location = options.location;
		this.dialog2 = options.dialog;
		this.func = options.func;
		
		this.buttons = [];
		if (this.dialog2)
			this.buttons.push({
				callback: function(){
					that.destroy();
					that.dialog2.show();
				},
				text: 'More'}
			);
		
		this.buttons.push({
			callback: function(){
				that.destroy();
				that.func();
			}, 
			text: 'OK'}
		);

		// Start the dialog initialization.
		this._initialize();
	};

	ConfirmPushDialog.prototype._bindToDom = function(parent) {
		var header = this.$header;
		header.appendChild(document.createTextNode("You are going to push to the following remote: " + this.location));
		header.appendChild(document.createElement("br"));
		if (this.dialog2)
			header.appendChild(document.createTextNode(" Click More to push to another remote or OK to push to default."));
	};
	
	ConfirmPushDialog.prototype.constructor = ConfirmPushDialog;
	
	//return the module exports
	return {ConfirmPushDialog: ConfirmPushDialog};
});