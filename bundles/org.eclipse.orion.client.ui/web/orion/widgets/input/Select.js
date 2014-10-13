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
/*eslint-env browser, amd*/
define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {

	/**
	 * @param {Object[]} param.options Array of {value:Object, label:String, selected:Boolean(optional)}
	 */
	function Select( params, node ){
		objects.mixin(this, params);
		this.node = node || document.createElement("div"); //$NON-NLS-0$
		this.node.innerHTML = this.templateString;
		this.select = lib.$(".setting-control", this.node); //$NON-NLS-0$
	}
	objects.mixin(Select.prototype, {
		templateString: '<select class="setting-control" id="selection"></select>', //$NON-NLS-0$

		addOptions : function(item, index, ar){			
			var option = document.createElement("option"); //$NON-NLS-0$
			option.value = item.value;
			option.appendChild(document.createTextNode(typeof item.label === "string" ? item.label : item.value)); //$NON-NLS-0$
			if( item.selected  ){
				option.selected = 'selected'; //$NON-NLS-0$
			}
			this.select.appendChild(option);
		},

		show: function() {
			this.postCreate();
		},

		postCreate: function() {
			this.options.forEach( this.addOptions.bind(this) );
			this.select.addEventListener("change",  this.change.bind(this)); //$NON-NLS-0$
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.select = null;
			}
		},
		
		getSelected : function(){
			return this.select.value;
		},
	
		getSelectedIndex: function() {
			return this.select.selectedIndex;
		},
		
		setSelectedIndex : function setSelectedIndex(index) {
			this.select.selectedIndex = index;
		},
		
		getSelection: function(){
			return this.getSelected();
		},
		
		setSelection: function(value){
			for (var i = 0; i < this.options.length; i++) {
				if (this.options[i].value === value) {				
					this.setSelectedIndex(i);
					return;
				}
			}
			this.setSelectedIndex(0);
		},
	
		change : function change(){
			if (this.postChange) {
				this.postChange(this.select.value);
			}
		}
	});
	return Select;
});
