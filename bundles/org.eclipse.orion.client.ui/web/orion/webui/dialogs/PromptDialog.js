/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
/*jslint browser:true */

define(['i18n!orion/widgets/nls/messages', 'orion/webui/littlelib', 'orion/webui/dialog', 'text!orion/webui/dialogs/promptdialog.html', 'orion/EventTarget'], 
function(messages, lib, dialog, PromptDialogFragment, EventTarget) {

	/**
	 * @class orion.webui.dialogs.PromptDialog
	 * @extends orion.webui.Dialog
	 * 
	 * Creates a modal prompt dialog.
	 * @param {Object} options 	An object containing the options for this dialog.
	 * 						   	Below is a list of the options that are specific to PromptDialog.
	 * 							See orion.webui.Dialog for a list of other usable options.
	 * 		{String} options.title The title to be displayed in the prompt dialog's title bar.
	 * 		{String} options.promptMessage The message to be displayed in the prompt dialog. Optional.
	 *
	 * @name orion.webui.dialogs.PromptDialog
	 *
	 */
	function PromptDialog(options) {
		EventTarget.attach(this);
		this._init(options);
	}
	
	PromptDialog.prototype = Object.create(dialog.Dialog.prototype);
	PromptDialog.prototype.constructor = PromptDialog;
	
	PromptDialog.prototype.TEMPLATE = PromptDialogFragment;
	
	PromptDialog.prototype._init = function(options) {
		this.title = options.title;
		
		if (options.promptMessage) {
			this.messages = {
				PromptMessage: options.promptMessage
			};	
		}
		
		this.modal = true;
		
		this._boundOkPressed = this._okPressed.bind(this);
		
		this.buttons = [
			{id: "okButton", text: messages["OK"], callback: this._boundOkPressed},
			{id: "cancelButton", text: messages["Cancel"], callback: this._cancelPressed.bind(this)}
		];
		
		this._initialize(); //superclass function
		
		if (!options.promptMessage) {
			//hide prompt message div
			this.$promptDialogMessage.style.display = "none"; //$NON-NLS-0$
		}
	};

	/**
	 * See orion.webui.Dialog
	 */
	PromptDialog.prototype._bindToDom = function(parent) {
		this.$promptDialogInput.addEventListener("keydown", function(event){
			if (event.keyCode === lib.KEY.ENTER) {
				// mirror behavior of clicking the ok button
				this._boundOkPressed();
				lib.stop(event);
			} else if (event.keyCode === lib.KEY.ESCAPE) {
				this.$cancelButton.focus();
				lib.stop(event);
			}
		}.bind(this), false);
	};
	
	/**
	 * Dispatches an "ok" event letting listeners know that the 
	 * OK button was pressed and hides the dialog. 
	 * 
	 * @note The dispatched event's "value" property contains 
	 * 		 the value of this dialog's text input element.
	 */
	PromptDialog.prototype._okPressed = function() {
		this.dispatchEvent({type: "ok", value: this.$promptDialogInput.value});
		this.hide();
	};
	
	/**
	 * Dispatches a "cancel" event letting listeners know that the
	 * cancel button was pressed and hides the dialog.
	 */
	PromptDialog.prototype._cancelPressed = function() {
		this.dispatchEvent({type: "cancel"});
		this.hide();
	};
	
	//return the module exports
	return {PromptDialog: PromptDialog};
});