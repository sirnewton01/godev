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
/*global window console define*/
/*jslint browser:true*/

define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {

	function Checkbox(options, node) {
		objects.mixin(this, options);
		this.node = node || document.createElement('div');
		this.node.innerHTML = this.templateString;
		this.myfield = lib.$('.setting-control', this.node); //$NON-NLS-0$
	}
	objects.mixin(Checkbox.prototype, {
		templateString: '' +  //$NON-NLS-0$
				'<label>' + //$NON-NLS-0$
					'<input class="setting-control settingsCheckbox" type="checkbox"/>' + //$NON-NLS-0$
				'</label>',  //$NON-NLS-0$
						
		show: function(){
			this.myfield.addEventListener('change', this.change.bind(this)); //$NON-NLS-0$
			this.postCreate();
        },

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = null;
				this.myfield = null;
			}
		},

		setStorageItem: function(){
						
		},
		
		isChecked : function(){
			return this.myfield.checked;
		},
		
		setChecked : function(value){
			this.myfield.checked = value;
		},
        
        change: function(){
            var value = this.myfield.value;
        },
        
        postCreate: function(){
            this.myfield.style.width = '20px';
            
            if( this.editmode && this.editmode === 'readonly' ){ //$NON-NLS-0$
				this.myfield.setAttribute("disabled", "disabled"); //$NON-NLS-1$ //$NON-NLS-0$
            }
        }
    });
    return Checkbox;
});