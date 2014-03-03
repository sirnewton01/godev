/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
/*jslint browser:true*/

define(['i18n!orion/operations/nls/messages', 'require', 'orion/webui/littlelib', 'orion/webui/popupdialog', 'orion/operationsCommands'],
function(messages, require, lib, popupdialog, mOperationsCommands) {
	
	/**
	 * Usage: <code>new OperationsDialog(options).show();</code>
	 * 
	 * @name orion.webui.dialogs.OperationsDialog
	 * @class A dialog that shows running operations.
	 * @param {DOMNode} [options.triggerNode] The node that triggers the dialog.
	 */
	function OperationsDialog(options) {
		this._options = options;
	}
	
	OperationsDialog.prototype = new popupdialog.PopupDialog();

	OperationsDialog.prototype.TEMPLATE = 
		'<table style="width: 360px;"><tr>' + //$NON-NLS-0$
			'<td><h2>Recent operations</h2></td>' + //$NON-NLS-0$
			'<td style="text-align: right;"><a id="allOperationsLink" class="navlinkonpage">All Operations</a></td>' + //$NON-NLS-0$
		'</tr></table>' + //$NON-NLS-0$
		'<div id="operationsExist">' + //$NON-NLS-0$
			'<div style="padding-left: 7px" id="myOperationsListEmpty">No operations running on this page.</div>' + //$NON-NLS-0$
			'<table id="myOperationsList" style="display: none;"></table>' + //$NON-NLS-0$
		'</div>' + //$NON-NLS-0$
		'<div style="padding-left: 7px" id="operationsDontExist">No operations running.</div>'; //$NON-NLS-0$


	OperationsDialog.prototype._init = function(options) {
		this._myOperations = [];
		this._operationsDeferreds = [];
		this._commandService = options.commandRegistry;
		mOperationsCommands.createOperationsCommands(this._commandService);
		this._commandService.registerCommandContribution("operationsDialogItems", "eclipse.cancelOperation", 1); //$NON-NLS-1$ //$NON-NLS-0$
		this._initialize(options.triggerNode);
	};
	
	OperationsDialog.prototype._bindToDom = function(parent) {
		this.$allOperationsLink.href = require.toUrl("operations/list.html"); //$NON-NLS-0$
		this._setOperationsVisibility();
	};

	OperationsDialog.prototype.setOperations = function(operations, deferreds){
		if (!this._myOperations) {
			this._init(this._options);
		}
		this._myOperations = [];
		this._operationsDeferreds = [];
		if (operations) {
			for (var i in operations) {
				this._myOperations.push(operations[i]);
				this._operationsDeferreds.push(deferreds[i]);
			}
		}
		this._renderOperations();
	};
	
	OperationsDialog.prototype.parseProgressResult = function(message){
		if (!message) {
			return {};
		}
		//could either be responseText from xhrGet or just a string
		var status = message.responseText || message;
		//accept either a string or a JSON representation of an IStatus
		try {
			status = JSON.parse(status);
		} catch(error) {
			//it is not JSON, just continue;
		}
		var ret = { Message: status.Message || status, Severity: status.Severity };
		if(status.DetailedMessage && status.DetailedMessage !== ret.Message){
			ret.DetailedMessage = status.DetailedMessage;
		}
		return ret;
	};
	
	OperationsDialog.prototype._renderOperations = function(){
		this._renderOperationsTable(this.$myOperationsList, this._myOperations, this._operationsDeferreds);
	};
	
	OperationsDialog.prototype._renderOperationsTable = function(operationsTable, operations, deferreds){
		lib.empty(operationsTable);
		for (var i = 0; i < operations.length; i++) {
			var operation = operations[i];
			var tr = document.createElement("tr"); //$NON-NLS-0$
			var col = document.createElement("td"); //$NON-NLS-0$
			col.style.paddingLeft = "5px"; //$NON-NLS-0$
			col.style.paddingRight = "5px"; //$NON-NLS-0$
			col.textContent = operation.Name;
			tr.appendChild(col);
			
			var div = document.createElement("div"); //$NON-NLS-0$
			col.appendChild(div);
			
			var operationIcon = document.createElement("span"); //$NON-NLS-0$
			operationIcon.style.paddingRight = "5px";  //$NON-NLS-0$
			operationIcon.classList.add("imageSprite"); //$NON-NLS-0$
			
			switch (operation.type) {
				case "Warning": //$NON-NLS-0$
					operationIcon.classList.add("core-sprite-warning"); //$NON-NLS-0$
					operationIcon.setAttribute("aria-label", messages["Operation resulted in a warning."]); //$NON-NLS-0$
					break;
				case "error": //$NON-NLS-0$
					operationIcon.classList.add("core-sprite-error"); //$NON-NLS-0$
					operationIcon.setAttribute("aria-label", messages["Operation resulted in an error."]); //$NON-NLS-0$
					break;
				case "loadstart":
				case "progress":
					operationIcon.classList.add("core-sprite-start"); //$NON-NLS-0$
					operationIcon.setAttribute("aria-label", messages["Operation is running."]); //$NON-NLS-0$
					break;
				case "abort":
					operationIcon.classList.add("core-sprite-stop"); //$NON-NLS-0$
					operationIcon.setAttribute("aria-label", messages["Operation is canceled."]); //$NON-NLS-0$
					break;
				case "load":
				case "loadend":
					operationIcon.classList.add("core-sprite-ok"); //$NON-NLS-0$
					operationIcon.setAttribute("aria-label", "Operation ok."); //$NON-NLS-1$ //$NON-NLS-0$
					break;
			}
			
			div.appendChild(operationIcon);
			
			var operationStatus = document.createElement("span"); //$NON-NLS-0$
			operationStatus.classList.add("operationStatus"); //$NON-NLS-0$
			operationStatus.textContent = operation.Name;
			div.appendChild(operationStatus);
			
			if (operation.error) {
				var message = operation.error.Message || operation.error;
				if (operation.error.DetailedMessage && operation.error.DetailedMessage !== "")
					message += ": " + operation.error.DetailedMessage; //$NON-NLS-0$
				operationStatus.textContent = message;
				operationStatus.classList.remove("operationStatus"); //$NON-NLS-0$
				operationStatus.classList.add("operationError"); //$NON-NLS-0$
			}
			
			this._commandService.renderCommands("operationsDialogItems", div, {operation: operation, deferred: deferreds[i]}, this, "tool");  //$NON-NLS-0$
			
			operationsTable.appendChild(tr);
		}
		this._setOperationsVisibility();
	};
	
	OperationsDialog.prototype._setOperationsVisibility = function(){			
		this.$myOperationsList.style.display = this._myOperations.length > 0 ? "" : "none"; //$NON-NLS-0$
		this.$myOperationsListEmpty.style.display = this._myOperations.length > 0 ? "none" : ""; //$NON-NLS-0$
		this.$operationsDontExist.style.display = this._myOperations.length > 0 ? "none": ""; //$NON-NLS-0$
		this.$operationsExist.style.display = this._myOperations.length > 0 ? "" : "none"; //$NON-NLS-0$
	};
	
	OperationsDialog.prototype.constructor = OperationsDialog;
	//return the module exports
	return {OperationsDialog: OperationsDialog};

});