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
define([
	'orion/webui/littlelib', 
	'orion/webui/dropdown', 
	'orion/objects'
], function(lib, mDropdown, objects) {

	var Dropdown = mDropdown.Dropdown;
	
	/**
	 * @class orion.webui.ContextMenu
	 * @extends orion.webui.Dropdown
	 * 
	 * Attaches context menu behavior to a given node.  
	 *
	 * @see orion.webui.Dropdown for more documentation
	 *
	 * @name orion.webui.contextmenu.ContextMenu
	 *
	 */
	function ContextMenu(options) {
		options.skipTriggerEventListeners = true; //we want different event listeners on the trigger node
		Dropdown.call(this, options); //invoke super constructor
		this._initialize();
	}
	
	ContextMenu.prototype = Object.create(Dropdown.prototype);
	
	objects.mixin(ContextMenu.prototype, /** @lends orion.webui.contextmenu.ContextMenu.prototype */ {
			
		_initialize: function() {
			if (!this._dropdownNode.dropdown) {
				//used by commandRegistry to set the parentNode of a child dropdown menu
				this._dropdownNode.dropdown = this;
			}
			
			//add context menu event handlers
			this._boundcontextmenuEventHandler = this._contextmenuEventHandler.bind(this);
			this._boundContextMenuCloser = this._contextMenuCloser.bind(this);
			this._triggerNode.addEventListener("contextmenu", this._boundcontextmenuEventHandler, true); //$NON-NLS-0$
			window.addEventListener("contextmenu", this._boundContextMenuCloser, false); //$NON-NLS-0$
			
			//clicking on the trigger node should close the context menu
			this._triggerNode.addEventListener("click",  this._boundContextMenuCloser, false);//$NON-NLS-0$
		},
		
		 _contextMenuCloser: function(event){
			this.close(event);
		},
		
		_contextmenuEventHandler: function(event){
			if (this.open(event)) {
				lib.stop(event);
			} else {
				this.close();
			}
		},		
	});
	
	ContextMenu.prototype.constructor = ContextMenu;
	
	// overrides Dropdown.protoype._positionDropdown
	ContextMenu.prototype._positionDropdown = function(mouseEvent) {
		if (mouseEvent) {
			var mouseLeft = mouseEvent.clientX;
			var mouseTop = mouseEvent.clientY;
			
			// we want the position to be relative to the mouse event
			this._dropdownNode.style.position = "fixed"; //$NON-NLS-0$
			
			// set the initial position
			this._dropdownNode.style.left = mouseLeft + "px"; //$NON-NLS-0$
			this._dropdownNode.style.top = mouseTop +  "px"; //$NON-NLS-0$
					
			// ensure that the menu fits on the page...
			var bounds = lib.bounds(this._dropdownNode);
			var width = bounds.width;
			var height = bounds.height;
			var bodyBounds = lib.bounds(document.body);
			
			//ensure menu fits on page horizontally
			var overflowX = (mouseLeft + width) - (bodyBounds.left + bodyBounds.width);
			if (0 < overflowX) {
				this._dropdownNode.style.left = Math.floor(mouseLeft - overflowX) + "px"; //$NON-NLS-0$	
			}
			
			//ensure menu fits on page vertically
			var overflowY = (mouseTop + height) - (bodyBounds.top + bodyBounds.height);
			if (0 < overflowY) {
				this._dropdownNode.style.top = Math.floor(mouseTop - overflowY) + "px";	//$NON-NLS-0$
			}
		} else {
			Dropdown.prototype._positionDropdown.call(this); //call function in super class
		}
	};
	
	// overrides Dropdown.protoype.destroy
	ContextMenu.prototype.destroy = function() {
		this._triggerNode.removeEventListener("contextmenu", this._boundcontextmenuEventHandler, true); //$NON-NLS-0$
		this._triggerNode.removeEventListener("click",  this._boundContextMenuCloser, false); //$NON-NLS-0$
		window.removeEventListener("contextmenu", this._boundContextMenuCloser, false); //$NON-NLS-0$
		this._dropdownNode.dropdown = null;
		Dropdown.prototype.destroy.call(this); //call function in super class
	};
	
	//return the module exports
	return {ContextMenu: ContextMenu};
});