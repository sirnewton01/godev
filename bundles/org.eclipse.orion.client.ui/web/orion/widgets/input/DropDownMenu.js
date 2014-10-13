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
	 * Creates a dropdown menu for a node and its associated trigger node (button)
	 * @param {Object} parent The dom object or string id of the node that will contain the dropdown menu
	 * @param {Object} triggerNode The dom object or string id of the dom node that will trigger the dropdown menu appearance
	 * @param {Object} [options] options for the drop down menu.
	 * @param {String} [options.selectionClass] CSS class to be appended when the trigger node is selected.
	 * @param {String} [options.noClick] Do not add the click handler to the trigger node.
	 * @param {String} [options.onShow] Callback called when the menu is shown.
	 * @param {String} [options.onHide] Callback called when the menu is hidden.
	 */
	function DropDownMenu( parent, triggerNode, options ){
		var node = lib.node(parent);
		if (node) {
			this._parent = node;
		} else {
			throw new Error("Parent node of dropdown menu not found"); //$NON-NLS-0$
		}
		
		options = options || {};
		this.options = options;
		
		// Assign dynamic ids to the dropdown menu node to support multiple drop down menus in the same page
		this.navDropDownId = this._parent.id + '_navdropdown'; //$NON-NLS-0$
		this.selectionClass = options.selectionClass;
		
		// Create dropdown container and append to parent dom
		var dropDownContainer = document.createElement("div"); //$NON-NLS-0$
		dropDownContainer.classList.add("dropdownMenu"); //$NON-NLS-0$
		dropDownContainer.classList.add("dropdownMenuOpen"); //$NON-NLS-0$
		dropDownContainer.id = this.navDropDownId; 
		dropDownContainer.style.display = 'none'; //$NON-NLS-0$
		this._parent.appendChild(dropDownContainer);
		this._dropdownMenu = dropDownContainer;
		
		// Display trigger node and bind on click event
		triggerNode = lib.node(triggerNode);
		if (triggerNode) {
			this._triggerNode = triggerNode;
		} else {
			throw "Trigger node of dropdown menu not found"; //$NON-NLS-0$
		}
		if (this._triggerNode.style.visibility === 'hidden') { //$NON-NLS-0$
			this._triggerNode.style.visibility = 'visible'; //$NON-NLS-0$
		}
		
		if (!options.noClick) {
			this._triggerNode.onclick = this.click.bind(this);
		}
		this._dropdownMenu.addEventListener("keydown", function (e) { //$NON-NLS-0$
			if (e.keyCode === lib.KEY.ESCAPE) {
				this.clearPanel();
			}
		}.bind(this));
	}
	
	objects.mixin(DropDownMenu.prototype, {
		click: function() {
			if( this._dropdownMenu.style.display === 'none' ){ //$NON-NLS-0$
				this.updateContent ( this.getContentNode() , function () {
					lib.setFramesEnabled(false);
					this._dropdownMenu.style.display = '';
					this._positionDropdown();
					if (this.selectionClass) {
						this._triggerNode.classList.add(this.selectionClass);
					}
					this.handle = lib.addAutoDismiss( [ this._triggerNode, this._dropdownMenu], this.clearPanel.bind(this) );
					if (this.options.onShow) {
						this.options.onShow();
					}
				}.bind(this));
			}else{
				this.clearPanel();
			}
		},
		
		clearPanel: function(){
			if (!this.isVisible()) { return; }
			this._dropdownMenu.style.display = 'none'; //$NON-NLS-0$
			lib.setFramesEnabled(true);
			if (this.selectionClass) {
				this._triggerNode.classList.remove(this.selectionClass);
			}
			if (this.options.onHide) {
				this.options.onHide();
			}
		},
		
		// Add content to the dropdown container
		addContent: function( content ){
			this._dropdownMenu.innerHTML = content;
		},
		
		getContentNode: function(){
			return this._dropdownMenu;
		},
		
		updateContent: function( contentNode, callback ){
			// to be overridden to update the contents before showing
			// the callback needs to be called once the content is up to date
			callback();
		},

		_positionDropdown: function() {
			this._dropdownMenu.style.right = "";
			var bounds = lib.bounds(this._dropdownMenu);
			var bodyBounds = lib.bounds(document.body);
			if (bounds.left + bounds.width > (bodyBounds.left + bodyBounds.width)) {
				var totalBounds = lib.bounds(this._boundingNode(this._triggerNode));
				var triggerBounds = lib.bounds(this._triggerNode);
				this._dropdownMenu.style.right = (totalBounds.width - ((triggerBounds.left - totalBounds.left) + triggerBounds.width)) + "px"; //$NON-NLS-0$
			}
		},
		
		_boundingNode: function(node) {
			var style = window.getComputedStyle(node, null);
			if (style === null) {
				return node;
			}
			var position = style.getPropertyValue("position"); //$NON-NLS-0$
			if (position === "absolute" || !node.parentNode || node === document.body) { //$NON-NLS-0$
				return node;
			}
			return this._boundingNode(node.parentNode);
		},
		
		isDestroyed: function() {
			return !this._dropdownMenu.parentNode;
		},

		isVisible: function() {
			return this._dropdownMenu.style.display !== "none" && !this.isDestroyed(); //$NON-NLS-0$
		},

		focus: function() {
			this._dropdownMenu.focus();
		},

		destroy: function() {
			if (this._parent) {
				lib.setFramesEnabled(true);
				lib.empty(this._parent);
				this._parent = this.select = null;
			}
		}
	});
	
	return DropDownMenu;
});
