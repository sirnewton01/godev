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
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/dialog', 'text!orion/webui/dialogs/confirmdialog.html', 'orion/EventTarget'], 
function(messages, dialog, ConfirmDialogFragment, EventTarget) {

	/**
	 * @class orion.webui.dialogs.ConfirmDialog
	 * @extends orion.webui.Dialog
	 * 
	 * Creates a modal confirm dialog.
	 * @param {Object} options 	An object containing the options for this dialog.
	 * 						   	Below is a list of the options that are specific to ConfirmDialog.
	 * 							See orion.webui.Dialog for a list of other usable options.
	 * 		{String} options.title The title to be displayed in the dialog's title bar.
	 * 		{String} options.confirmMessage The message to be displayed in the dialog.
	 * 		{Boolean} options.yesNoDialog A boolean which if true indicates that this dialog should have yes/no buttons instead of ok/cancel buttons. Optional.
	 *
	 * @name orion.webui.dialogs.ConfirmDialog
	 *
	 */
	function ConfirmDialog(options) {
		EventTarget.attach(this);
		this._init(options);
	}
	
	ConfirmDialog.prototype = Object.create(dialog.Dialog.prototype);
	ConfirmDialog.prototype.constructor = ConfirmDialog;
	
	ConfirmDialog.prototype.TEMPLATE = ConfirmDialogFragment;
	
	ConfirmDialog.prototype._init = function(options) {
		this.title = options.title || document.title;
		
		this.messages = {
			ConfirmMessage: options.confirmMessage
		};
		
		this.modal = true;
		
		if (options.yesNoDialog) {
			this.buttons = [
				{id: "yesButton", text: messages["Yes"], callback: this._buttonPressed.bind(this, "yes")}, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{id: "noButton", text: messages["No"], callback: this._buttonPressed.bind(this, "no")} //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			];
		} else {
			this.buttons = [
				{id: "okButton", text: messages["OK"], callback: this._buttonPressed.bind(this, "ok")}, //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{id: "cancelButton", text: messages["Cancel"], callback: this._buttonPressed.bind(this, "cancel")} //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			];
		}
		
		this._initialize(); //superclass function
	};
	
	/**
	 * Dispatches an event and hides the dialog. 
	 * 
	 * The type of the dispatched event depends on the button that was pressed.
	 * For the default confirm dialog, the type will either be "ok" or "cancel".
	 * For a yes/no dialog, the type will either be "yes" or "no".
	 */
	ConfirmDialog.prototype._buttonPressed = function(eventType) {
		this.dispatchEvent({type: eventType});
		this.hide();
	};
	
	//return the module exports
	return {ConfirmDialog: ConfirmDialog};
});