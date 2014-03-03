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
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {
	function TextField(options, node) {
		objects.mixin(this, options);
		this.node = node || document.createElement("div"); //$NON-NLS-0$
		this.node.innerHTML = this.templateString;
		this.textfield = lib.$(".setting-control", this.node); //$NON-NLS-0$
	}
	objects.mixin(TextField.prototype, {
		 templateString: '<input type="text" class="setting-control" name="myname"/>', //$NON-NLS-0$
		
		// category, item, element, ui - provided on construction
		
		category: null,
		item: null,
		element: null,
		ui: null,

		show: function() {
			this.textfield.addEventListener("change", this.change.bind(this)); //$NON-NLS-0$
			this.postCreate();
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.textfield = this.node = null;
			}
		},

		setStorageItem: function(){
			// to be overridden with a choice of function to store the picked color
		},
		
		width: function( value ){
			this.textfield.style.width = value ;
		},
        
        getValue: function(){
			if( this.inputType === "integer"){ //$NON-NLS-0$
				return parseInt(this.textfield.value, 10);
			}
			return this.textfield.value;
        },
		
		setValue: function( value ){
			this.textfield.value = value;
		},

		getSelection: function(){
			return this.getValue();
		},
		
		setSelection: function(value){
			this.setValue(value);
		},
		
        postCreate: function(){
            if( this.inputType && this.inputType === 'password' ){ //$NON-NLS-0$
				this.textfield.type = "password"; //$NON-NLS-0$
            }
            
            if( this.editmode && this.editmode === 'readonly' ){ //$NON-NLS-0$
				this.textfield.setAttribute("readonly", "true"); //$NON-NLS-1$ //$NON-NLS-0$
            }
        },
		
		change: function(){
			var value;
			if( this.selection && this.selection.value ){
				value = this.selection.value;
			}
		
			this.setStorageItem( this.category, this.item, this.element, value, this.ui );
		}
	});
	return TextField;
});

