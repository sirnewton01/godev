/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global window define document */

define(['require', 'orion/webui/littlelib', 'orion/EventTarget'], function(require, lib, EventTarget) {

	/**
	 * Attaches dropdown behavior to a given node.  Assumes the triggering node and dropdown node
	 * have the same parent.  Trigger should have "dropdownTrigger" class, and the dropdown node should 
	 * have "dropdownMenu" class.  Dropdown items should be <li> elements, so typically the dropdown node
	 * supplied is a <ul>.
	 *
	 * "dropdowntriggerbutton.html" contains an appropriate HTML fragment for a triggering button and associated
	 * dropdown.  Clients can add this fragment to the DOM and then attach Dropdown behavior to it.
	 * 
	 * Nested ("sub") menu behavior is accomplished by adding the class "dropdownSubMenu" to one of the <li> items.
	 * This item can then parent another trigger and <ul>.
	 *
	 * "submenutriggerbutton.html" contains an appropriate HTML fragment for a menu item that triggers a sub menu.
	 * Clients can add this fragment to a dropdown menu and then attach Dropdown behavior to the sub menu item.
	 *
	 * The items inside each <li> item in a dropdown can be almost any type of node.  The class "dropdownMenuItem" is
	 * used on the node inside the li to find items and style them appropriately.  There are HTML fragments for some
	 * common menu types.  For example, "checkedmenuitem.html" is a fragment appropriate for checked menu items.
	 *
	 * @param {Object} options The options object, which must minimally specify the dropdown dom node
	 * @param options.dropdown The node for the dropdown presentation.  Required.
	 * @param options.populate A function that should be called to populate the dropdown before it
	 * opens each time.  Optional.
	 * @param options.triggerNode The node which will listen for events that trigger the 
	 * opening of this drop down. If it is not specified the parent of the dropdown node will be searched
	 * for a node containing the dropdownTrigger class. Optional.
	 * @param options.parentDropdown The Dropdown that is the parent of this one if this is a sub-dropdown. Optional.
	 * @param options.positioningNode The Node that the dropdown uses so that it always renders under the positioningNode's left bottom corner. Optional.
	 * @param options.skipTriggerEventListeners A boolean indicating whether or not to skip adding event
	 * listeners to the triggerNode. Optional.
	 * 
	 * @name orion.webui.dropdown.Dropdown
	 *
	 */
	function Dropdown(options) {
		EventTarget.attach(this);
		this._init(options);		
	}
	Dropdown.prototype = /** @lends orion.webui.dropdown.Dropdown.prototype */ {
			
		_init: function(options) {
			this._dropdownNode = lib.node(options.dropdown);
			if (!this._dropdownNode) { throw "no dom node for dropdown found"; } //$NON-NLS-0$
			this._populate = options.populate;
			this._selectionClass = options.selectionClass;
			this._parentDropdown = options.parentDropdown;
			this._positioningNode = options.positioningNode;
			
			if (!this._parentDropdown) {
				//if a parentDropdown isn't specified move up in dom tree looking for one
				var parentNode = this._dropdownNode.parentNode;
				while(parentNode && (document !== parentNode)) {
					if (parentNode.classList && parentNode.classList.contains("dropdownMenu")) { //$NON-NLS-0$
						this._parentDropdown = parentNode.dropdown;
						break;
					}
					parentNode = parentNode.parentNode;
				}
			}

			if (options.triggerNode) {
				this._triggerNode = options.triggerNode;
			} else {
				this._triggerNode = lib.$(".dropdownTrigger", this._dropdownNode.parentNode); //$NON-NLS-0$	
			}
			if (!this._triggerNode) { throw "no dom node for dropdown trigger found"; } //$NON-NLS-0$
			
			if (!options.skipTriggerEventListeners) {
				var self = this;
				// click on trigger opens.
				this._triggerNode.addEventListener("click", function(event) { //$NON-NLS-0$
					if (self.toggle(event))  {
						lib.stop(event);
					}
				}, false);
					
				// if trigger node is not key enabled...
				if (this._triggerNode.tagName.toLowerCase() === "span") { //$NON-NLS-0$
					this._triggerNode.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
							self.toggle();
							lib.stop(event);
						}
					}, false);
				}
			}
						
			// keys
			this._dropdownNode.addEventListener("keydown", this._dropdownKeyDown.bind(this), false); //$NON-NLS-0$
		},
		
		/**
		 * Toggle the open/closed state of the dropdown.  Return a boolean that indicates whether action was taken.
		 */			
		toggle: function(mouseEvent /* optional */) {
			if (this.isVisible()) {
				return this.close();
			} else {
				return this.open(mouseEvent);
			}
		},
		
		/**
		 * Answers whether the dropdown is visible.
		 */			
		isVisible: function() {
			return this._isVisible;
		},
		
		/**
		 * Open the dropdown.
		 */			
		open: function(mouseEvent /* optional */) {
			var actionTaken = false;
			if (!this.isVisible()) {
				this.dispatchEvent({type: "triggered", dropdown: this, event: mouseEvent}); //$NON-NLS-0$
				lib.setFramesEnabled(false);
				if (this._populate) {
					this.empty();
					this._populate(this._dropdownNode);
				}
				var items = this.getItems();
				if (items.length > 0) {
					if (!this._hookedAutoDismiss) {
						if (this._boundAutoDismiss) {
							lib.removeAutoDismiss(this._boundAutoDismiss);
						} else {
							this._boundAutoDismiss = this._autoDismiss.bind(this);
						}
						// add auto dismiss.  Clicking anywhere but trigger or a submenu item means close.
						var submenuNodes = lib.$$array(".dropdownSubMenu", this._dropdownNode); //$NON-NLS-0$
						lib.addAutoDismiss([this._triggerNode].concat(submenuNodes), this._boundAutoDismiss);
						this._hookedAutoDismiss = true;
					}
					this._triggerNode.classList.add("dropdownTriggerOpen"); //$NON-NLS-0$
					if (this._selectionClass) {
						this._triggerNode.classList.add(this._selectionClass);
					}
					this._dropdownNode.classList.add("dropdownMenuOpen"); //$NON-NLS-0$
					this._isVisible = true;
					
					this._positionDropdown(mouseEvent);
					
					items[0].focus();
					actionTaken = true;
					
					if (this._parentDropdown) {
						this._parentDropdown.submenuOpen(this);
					}
				}
			}
			return actionTaken;
		},
		
		_autoDismiss: function(event) {
			if (this.close(false)) {
				// only trigger dismissal of parent menus if
				// this dropdown's node contains the event.target
				if (this._dropdownNode.contains(event.target)) {
					// Dismiss parent menus
					var temp = this._parentDropdown;
					while (temp) {
						temp.close(false);
						temp = temp._parentDropdown;
					}
				}
			}
		},
		
		/**
		 * This method positions the dropdown menu.
		 * The specified mouseEvent is ignored. However, subclasses 
		 * can override this method if they wish to take the mouse 
		 * position contained in the mouse event into account.
		 * 
		 * @param {MouseEvent} mouseEvent
		 */
		_positionDropdown: function(mouseEvent) {
			this._dropdownNode.style.left = "";
			this._dropdownNode.style.top = "";
			
			if(this._positioningNode) {
				this._dropdownNode.style.left = this._positioningNode.offsetLeft + "px";
				return;
			}
			
			var bounds = lib.bounds(this._dropdownNode);
			var bodyBounds = lib.bounds(document.body);
			if (bounds.left + bounds.width > (bodyBounds.left + bodyBounds.width)) {
				if (this._triggerNode.classList.contains("dropdownMenuItem")) { //$NON-NLS-0$
					this._dropdownNode.style.left = -bounds.width + "px"; //$NON-NLS-0$
				} else {
					var totalBounds = lib.bounds(this._boundingNode(this._triggerNode));
					var triggerBounds = lib.bounds(this._triggerNode);
					this._dropdownNode.style.left = (triggerBounds.left  - totalBounds.left - bounds.width + triggerBounds.width) + "px"; //$NON-NLS-0$
				}
			}
			
			//ensure menu fits on page vertically
			var overflowY = (bounds.top + bounds.height) - (bodyBounds.top + bodyBounds.height);
			if (0 < overflowY) {
				this._dropdownNode.style.top = Math.floor(this._dropdownNode.style.top - overflowY) + "px"; //$NON-NLS-0$
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
		
		
		/**
		 * Close the dropdown.
		 */			
		close: function(restoreFocus) {
			var actionTaken = false;
			if (this.isVisible()) {
				this._triggerNode.classList.remove("dropdownTriggerOpen"); //$NON-NLS-0$
				if (this._selectionClass) {
					this._triggerNode.classList.remove(this._selectionClass);
				}
				this._dropdownNode.classList.remove("dropdownMenuOpen"); //$NON-NLS-0$
				lib.setFramesEnabled(true);
				if (restoreFocus) {
					this._triggerNode.focus();
				}
				
				this._isVisible = false;
				actionTaken = true;
			}
			return actionTaken;
		},
		
		/**
		 *
		 */
		getItems: function() {
			var items = lib.$$array("li:not(.dropdownSeparator) > .dropdownMenuItem", this._dropdownNode, true); //$NON-NLS-0$
			// We only want the direct li children, not any descendants.  But we can't preface a query with ">"
			// So we do some reachy filtering here.
			var filtered = [];
			var self = this;
			items.forEach(function(item) {
				if (item.parentNode.parentNode === self._dropdownNode) {
					filtered.push(item);
				}
			});
			
			//add handler to close open submenu when other items in the parent menu are hovered
			filtered.forEach(function(item){
				if (!item._hasDropdownMouseover) {
					item.addEventListener("mouseover", function(e){ //$NON-NLS-0$
						if (item.dropdown) {
							item.dropdown.open(e);
						} else {
							self._closeSelectedSubmenu();
							lib.stop(e);
						}
					});
					item._hasDropdownMouseover = true;
				}
			});
			return filtered;
		},
		
		/**
		 *
		 */
		empty: function() {
			var items = lib.$$array("li", this._dropdownNode); //$NON-NLS-0$
			var self = this;
			// We only want the direct li children, not any descendants. 
			items.forEach(function(item) {
				if (item.parentNode === self._dropdownNode) {
					item.parentNode.removeChild(item);
				}
			});
			
			this._hookedAutoDismiss = false; //the autoDismiss nodes need to be recalculated
		},
		
		 
		/**
		 * A key is down in the dropdown node
		 */
		 _dropdownKeyDown: function(event) {
			if (event.keyCode === lib.KEY.UP || event.keyCode === lib.KEY.DOWN || event.keyCode === lib.KEY.RIGHT || event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.LEFT) {
				var items = this.getItems();	
				var focusItem = document.activeElement;
				if (items.length && items.length > 0 && focusItem) {
					var index = items.indexOf(focusItem);
					// for inputs nested in labels, we should check the parent node since the label is the item
					if (index < 0) {
						index = items.indexOf(focusItem.parentNode);
					}
					if (index >= 0) {
						if (event.keyCode === lib.KEY.UP && index > 0) {
							index--;
							items[index].focus();
						} else if (event.keyCode === lib.KEY.DOWN && index < items.length - 1) {
							index++;
							items[index].focus();
						} else if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.RIGHT) {
							if (focusItem.classList.contains("dropdownTrigger") && focusItem.dropdown) { //$NON-NLS-0$
								focusItem.dropdown.open();
							}
						} else if (event.keyCode === lib.KEY.LEFT && focusItem.parentNode.parentNode.classList.contains("dropdownMenuOpen")) { //$NON-NLS-0$
							this.close(true);
						}
						lib.stop(event);
					}
				}
			} else if (event.keyCode === lib.KEY.ESCAPE) {
				this.close(true);
				lib.stop(event);
			}
		 },
		 
		 /**
		  * Closes this._selectedSubmenu, and its children, if it is open.
		  * Sets the this._selectedSubmenu to the one that's passed in.
		  * @param submenu The submenu that was opened and should be set as the next this._selectedSubmenu
		  */
		submenuOpen: function(submenu) {
			if (submenu !== this._selectedSubmenu) {
				//close the current menu and all its children
				this._closeSelectedSubmenu();
				this._selectedSubmenu = submenu;
			}
		 },
		 
		_closeSelectedSubmenu: function() {
			var currentSubmenu = this._selectedSubmenu;
			while(currentSubmenu) {
				currentSubmenu.close();
				currentSubmenu = currentSubmenu._selectedSubmenu;
			}
		 },
		 
		 destroy: function() {
			this.empty();
			if (this._boundAutoDismiss) {
				lib.removeAutoDismiss(this._boundAutoDismiss);
			}
		 }
	};
	Dropdown.prototype.constructor = Dropdown;
	//return the module exports
	return {Dropdown: Dropdown};
});
