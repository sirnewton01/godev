/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/littlelib', 'orion/webui/dialog'],
function(messages, lib, dialog){
	
	function ProjectOptionalParametersDialog(options) {
		this._init(options);
	}
	
	ProjectOptionalParametersDialog.prototype = new dialog.Dialog();


	ProjectOptionalParametersDialog.prototype.TEMPLATE = 
		'<div id="message" style="width: 25em; padding-bottom: 5px;"></div>' + //$NON-NLS-0$
		'<div id="paramsArea"><table id="paramsTable"></table></div>'; //$NON-NLS-0$
	ProjectOptionalParametersDialog.prototype._init = function(options) {
		this.title = options.title;
		this._data = options.data;
		this._idPrefix = "ParamInput_";
		this.modal = true;
		this.buttons = [{text: messages['OK'], isDefault: true, callback: this.done.bind(this)}]; 
		this.customFocus = true;
		this._func = options.func;
		this._initialize();
	};
	
	ProjectOptionalParametersDialog.prototype._bindToDom = function(parent) {
		if (this._message) {
			this.$message.appendChild(document.createTextNode(this._message));
		} else {
			this.$message.style.display = "none"; //$NON-NLS-0$
		}
		var isFirst = true;
		if(this._data.parameters)
		for (var paramId in this._data.parameters.parameterTable) {
			var param = this._data.parameters.parameterNamed(paramId);
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			var label = document.createElement("label");
			label['for'] = paramId;
			label.appendChild(document.createTextNode(param.label));
			td.appendChild(label);
			tr.appendChild(td);
			
			td = document.createElement("td");
			var input;
			if(param.type === "textarea"){
				input = document.createElement("textarea");				
			} else {
				input = document.createElement("input");
				input.type = param.type;
			}
			input.value = this._data.parameters.valueFor(paramId);
			input.id = this._idPrefix + paramId;
			td.appendChild(input);
			tr.appendChild(td);
			
			this.$paramsTable.appendChild(tr);
			if(isFirst){
				input.focus();
				isFirst = false;			
			}
		}
		
		if(this._data.parameters._options.optionalParams)
		for(var i=0; i<this._data.parameters._options.optionalParams.length; i++){
			var param = this._data.parameters._options.optionalParams[i];
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			var label = document.createElement("label");
			label['for'] = this._idPrefix + param.id;
			label.appendChild(document.createTextNode(param.name));
			td.appendChild(label);
			tr.appendChild(td);
			
			td = document.createElement("td");
			var input;
			if(param.type === "textarea"){
				input = document.createElement("textarea");				
			} else {
				input = document.createElement("input");
				input.type = param.type;
			}
			if(param.value){
				input.value = param.value;
			}
			input.id = this._idPrefix + param.id;
			td.appendChild(input);
			tr.appendChild(td);
			
			this.$paramsTable.appendChild(tr);
		}
	};
	
	ProjectOptionalParametersDialog.prototype.done = function() {
		if(this._data.parameters)
		for (var paramId in this._data.parameters.parameterTable) {
			this._data.parameters.setValue(paramId, lib.node(this._idPrefix + paramId).value);
		}
		if(this._data.parameters._options.optionalParams)
		for(var i=0; i<this._data.parameters._options.optionalParams.length; i++){
			var param = this._data.parameters._options.optionalParams[i];
			param.value = lib.node(this._idPrefix + param.id).value;
		}
		this.hide();
		lib.empty(this.$paramsTable);
		this._func();
	};
	
	ProjectOptionalParametersDialog.prototype.constructor = ProjectOptionalParametersDialog;
	//return the module exports
	return {ProjectOptionalParametersDialog: ProjectOptionalParametersDialog};
});