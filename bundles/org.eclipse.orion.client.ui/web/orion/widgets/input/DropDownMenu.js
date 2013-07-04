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

	/**
	 * @param {Object[]} param.options Array of {value:Object, label:String, selected:Boolean(optional)}
	 */
	 
	function DropDownMenu( node, body, panel ){
	
		if( panel !== null ){
			this.CLEAR_PANEL = panel;
		}else{
			this.CLEAR_PANEL = true;
		}
	
		this.OPEN = 'false';
		
		var nodeIdPrefix = "";
		if( node.nodeType ){
			this.node = node;
		}else{
			nodeIdPrefix = node + "_";
			var nodeById = document.getElementById( node );
	
			if( nodeById.nodeType ){
				this.node = nodeById;
			}else{
				this.node = document.createElement("span");
			}
		}
		
		this.node.innerHTML = this.templateString;
		//We need assign dynamic ids to all the children nodes loaded by the template, to support multiple drop down menus in the same page
		this.navLabelId = nodeIdPrefix + 'navigationlabel';
		document.getElementById( 'navigationlabel' ).id = this.navLabelId;
		this.arrowId = nodeIdPrefix + 'dropDownArrow';
		document.getElementById( 'dropDownArrow' ).id = this.arrowId;
		this.navDropDownId = nodeIdPrefix + 'navdropdown';
		document.getElementById( 'navdropdown' ).id = this.navDropDownId;
		
		if( body.icon ){
			this.node.className = this.node.className + ' ' + body.icon;
			this.node.onclick = this.click.bind(this);	
		}else{
		
			if( body.label ){
				var navlabel = document.getElementById( this.navLabelId );
				navlabel.textContent = body.label;
				navlabel.onclick = this.click.bind(this);	
			}
			
			if( body.caret ){
				var navArrow = document.getElementById( this.arrowId );
				navArrow.className = body.caret;
			}
		}
		this._dropdownNode = lib.node(this.navDropDownId); 
		this._triggerNode = lib.node(this.navLabelId);
	}
	
	objects.mixin(DropDownMenu.prototype, {
	
		templateString: '<div id="navigationlabel" class="navigationLabel dropdownTrigger" ></div>' +
						'<span id="dropDownArrow" class="dropDownArrow"></span>' + 
						'<div class="dropDownContainer" id="navdropdown" style="display:none;"></div>',

		click: function() {
		
			var centralNavigation = document.getElementById( this.navDropDownId );
			
			if( centralNavigation.style.display === 'none' ){
				this.updateContent ( this.getContentNode() , function () {
					centralNavigation.style.display = '';
					this._positionDropdown();
					this.handle = lib.addAutoDismiss( [this.node, centralNavigation], this.clearPanel.bind(this) );
				}.bind(this));
				
			}else{
			
				if( this.CLEAR_PANEL ){
					this.clearPanel();
				}
			}
		},
		
		clearPanel: function(){
			var centralNavigation = document.getElementById( this.navDropDownId );
			centralNavigation.style.display = 'none';
		},
		
		addContent: function( content ){
		
			var centralNavigation = document.getElementById( this.navDropDownId );
		
			centralNavigation.innerHTML= content;
		},
		
		getContentNode: function(){
			var contentNode = document.getElementById( this.navDropDownId );
			return contentNode;
		},
		
		updateContent: function( contentNode, callback ){
			// to be overridden to update the contents before showing
			// the callback needs to be called once the content is up to date
			callback();
		},
		
		toggleLabel: function(show){
			document.getElementById( this.navLabelId ).style.display = (show ? '' : 'none');
			document.getElementById( this.arrowId ).style.display = (show ? '' : 'none');
		},
		
		_positionDropdown: function() {
			this._dropdownNode.style.left = "";
			var bounds = lib.bounds(this._dropdownNode);
			var totalBounds = lib.bounds(this._boundingNode(this._triggerNode));
			if (bounds.left + bounds.width > (totalBounds.left + totalBounds.width)) {
				this._dropdownNode.style.right = 0;
			}
		},
		
		_boundingNode: function(node) {
			if (node.style.right !== "" || node.style.position === "absolute" || !node.parentNode || !node.parentNode.style) { //$NON-NLS-0$
				return node;
			}
			return this._boundingNode(node.parentNode);
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.select = null;
			}
		}
	});
	return DropDownMenu;
});
