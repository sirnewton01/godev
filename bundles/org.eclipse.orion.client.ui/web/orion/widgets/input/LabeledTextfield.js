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
/*global window console define localStorage*/
/*jslint browser:true*/

define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {

	function LabeledTextfield(options, node) {
		objects.mixin(this, options);
		this.node = node || document.createElement('div'); //$NON-NLS-0$
	}
	objects.mixin(LabeledTextfield.prototype, {
		templateString: '<div class="setting-property">' +  //$NON-NLS-0$
							'<label>' + //$NON-NLS-0$
								'<span class="setting-label"></span>' + //$NON-NLS-0$
								'<input class="setting-control" type="text" />' + //$NON-NLS-0$
							'</label>' + //$NON-NLS-0$
						'</div>', //$NON-NLS-0$
		show: function() {
			this.node.innerHTML = this.templateString;
			this.mylabel = lib.$('.setting-label', this.node); //$NON-NLS-0$
			this.myfield = lib.$('.setting-control', this.node); //$NON-NLS-0$
			this.myfield.addEventListener('change', this.change.bind(this)); //$NON-NLS-0$
			this.postCreate();
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.mylabel = this.myfield = null;
			}
		},

		setStorageItem: function(){
		
		},
        
        change: function(){
            var value = this.myfield.value;
            this.setStorageItem( this.category, this.item, this.element, value, this.ui );
        },
        
        setValue: function( value ){
			this.myfield.value = value;
        },
        
        getValue: function(){
			return this.myfield.value;
        },
        
        postCreate: function(){
            this.mylabel.textContent = this.fieldlabel + ':'; //$NON-NLS-0$
            
            if( this.inputType && this.inputType === 'password' ){ //$NON-NLS-0$
				this.myfield.type = "password"; //$NON-NLS-0$
            }
            
            if( this.editmode && this.editmode === 'readonly' ){ //$NON-NLS-0$
				this.myfield.setAttribute("readonly", "true"); //$NON-NLS-1$ //$NON-NLS-0$
            }
        }
    });
    return LabeledTextfield;
});