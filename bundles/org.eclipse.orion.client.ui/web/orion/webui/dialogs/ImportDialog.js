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
/*global console define orion confirm*/
/*jslint browser:true */

define(['i18n!orion/widgets/nls/messages', 'orion/webui/littlelib', 'orion/webui/dialog', 'orion/util'], function(messages, lib, dialog, util) {


	function ImportDialog(options) {
		this._init(options);
	}
	
	ImportDialog.prototype = new dialog.Dialog();
	
	ImportDialog.prototype.TEMPLATE = 
	'<div ondragover="event.preventDefault()">' + //$NON-NLS-0$
		'<div class="uploadContainer" id="uploadContainer">' + //$NON-NLS-0$
			'<div class="dottedOutline">' + //$NON-NLS-0$
				'<div id="dragArea" class="floatingSection">' + //$NON-NLS-0$
					'<div class="uploadInstruction">${Drag a file here}</div>' +//$NON-NLS-0$
					'<div class="uploadOptions">(' +  //$NON-NLS-0$
						'<input style="height: 20px;" class="uploadOptionsItem" id="unzipCheckbox" checked="true" type="checkbox">' + //$NON-NLS-0$
						'<label style="line-height: 20px;" class="uploadOptionsItem" for="${id}_unzipCheckbox">${unzip zips}</label>' + //$NON-NLS-0$
					')</div>'  + //$NON-NLS-0$
					'<div class="tipInstruction">${or if you prefer}</div>' +  //$NON-NLS-0$
				'</div>' + //$NON-NLS-0$
			'</div>' + //$NON-NLS-0$
		'</div>' + //$NON-NLS-0$
		'<div class="layoutBlock layoutRight"><input type="file" name="selectedFile" id="selectedFile" class="uploadChooser" /><span id="uploadButton" role="button" class="commandButton disabled" tabindex="0">${Upload}</span></div>' + //$NON-NLS-0$
	'</div>'; //$NON-NLS-0$
	
	ImportDialog.prototype._init = function(options) {
		this.title = messages['Import a file or zip'];
		this.messages = messages;
		this.modal = true;
		this._importLocation = options.importLocation;
		this._func = options.func;
		this._initialize();
	};

	ImportDialog.prototype._bindToDom = function(parent) {
		this.$uploadContainer.addEventListener("dragenter", this.dragEnter.bind(this), false); //$NON-NLS-0$
		this.$uploadContainer.addEventListener("dragover", this.dragOver.bind(this), false); //$NON-NLS-0$
		this.$uploadContainer.addEventListener("dragleave", this.dragLeave.bind(this), false); //$NON-NLS-0$
		this.$uploadContainer.addEventListener("drop", this.drop.bind(this), false); //$NON-NLS-0$
		this.$selectedFile.addEventListener("change", this.checkUploadState.bind(this), false); //$NON-NLS-0$
		this.$uploadButton.addEventListener("click", this.uploadSelected.bind(this), false); //$NON-NLS-0$
	};

	ImportDialog.prototype.handleReadyState = function(state, file){	
		if( this.req.readyState === 4 ){
			if(this.req.status === 400){
				var result = {};
				try{
					result = JSON.parse(this.req.responseText);
				}catch(e){
				}
				if(result.JsonData && result.JsonData.ExistingFiles){
					if(confirm(result.Message + "\nWould you like to retry the import with force overwriting?")){
						this.uploadFile.bind(this)(file, true);
						return;
					}
				}
			}
			this.hide();
			this._func();
		}
	};
	
	ImportDialog.prototype.checkUploadState = function(evt){	
		if (this.$selectedFile.files && this.$selectedFile.files.length > 0) {
			this.$uploadButton.classList.remove(this.DISABLED);
		} else {
			this.$uploadButton.classList.add(this.DISABLED);
		}
		
	};

	ImportDialog.prototype.uploadFile = function(file, force) {
		var unzip = this.$unzipCheckbox.checked && (file.name.indexOf(".zip") === file.name.length-4);
		this.req = new XMLHttpRequest();
		this.req.open('post', force ? this._importLocation + (this._importLocation.indexOf("?") > 0 ? "&force=true" : "?force=true") : this._importLocation, true); //$NON-NLS-0$
		this.req.setRequestHeader("X-Requested-With", "XMLHttpRequest"); //$NON-NLS-1$ //$NON-NLS-0$
		this.req.setRequestHeader("Slug", file.name); //$NON-NLS-0$
		if (!unzip) {
			this.req.setRequestHeader("X-Xfer-Options", "raw"); //$NON-NLS-1$ //$NON-NLS-0$
		}
		this.req.setRequestHeader("Content-Type", file.type); //$NON-NLS-0$
		this.req.onreadystatechange = function(state){
			this.handleReadyState.bind(this)(state, file);
		}.bind(this);
		this.req.send(file);
	};
	
	// get selected file element
	ImportDialog.prototype.uploadSelected = function(evt) {
		if (this.$uploadButton.classList.contains(this.DISABLED)) {
			return;
		}
		if (this.$selectedFile.files && this.$selectedFile.files.length > 0) {
			this.uploadFile(this.$selectedFile.files[0]);
	    }

	};

	// Select File via drag
	ImportDialog.prototype.dragEnter = function(evt) {
		/* accessing dataTransfer.effectAllowed here throws an error on IE */
		if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||   //$NON-NLS-0$
			evt.dataTransfer.effectAllowed === "uninitialized" ||  //$NON-NLS-0$
			evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) {   //$NON-NLS-0$
				evt.dataTransfer.dropEffect = "copy";  //$NON-NLS-0$
		}   
		lib.stop(evt);
	};
	
	ImportDialog.prototype.dragLeave = function(evt) {
		lib.stop(evt);
	};

	ImportDialog.prototype.dragOver = function(evt) {
		/* accessing dataTransfer.effectAllowed here throws an error on IE */
		if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||   //$NON-NLS-0$
			evt.dataTransfer.effectAllowed === "uninitialized" ||  //$NON-NLS-0$
			evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) {   //$NON-NLS-0$
				evt.dataTransfer.dropEffect = "copy";  //$NON-NLS-0$
		}   
		lib.stop(evt);
	};

	ImportDialog.prototype.drop = function(evt) {
		lib.stop(evt);
		var files = evt.dataTransfer.files;
		if (files.length && files.length > 0 ){
			for(var i=0; i< files.length; i++){
				this.uploadFile(files[i]);
			}
		}
	};
	
	ImportDialog.prototype.constructor = ImportDialog;
	//return the module exports
	return {ImportDialog: ImportDialog};
});