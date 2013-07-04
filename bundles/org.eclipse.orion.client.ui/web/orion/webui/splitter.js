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
/*global window define document localStorage */

define(['require', 'orion/webui/littlelib'], function(require, lib) {

	var MIN_SIDE_NODE_WIDTH = 5;//The minimium width/height of the splitted nodes by the splitter	
	/**
	 * Constructs a new Splitter with the given options.  A splitter manages the layout
	 * of two panels, a side panel and a main panel.  An optional toggle button can open or close the 
	 * side panel.
	 *
	 * The relative proportions of the side and main panels are determined by the position of the splitter bar
	 * in the document.  The panels will pin themselves to the splitter by default.  Once the user moves
	 * the splitter, the positions are remembered.
	 *
	 * @param {Object} options The options object which must specify the split dom node
	 * @param options.node The node for the splitter presentation.  Required.
	 * @param options.sidePanel The node for the side (toggling) panel.  Required.
	 * @param options.mainPanel The node for the main panel.  Required.
	 * @param options.toggle Specifies that the side node should be able to toggle.  Optional.
	 * @param options.vertical Specifies that the nodes are stacked vertically rather than horizontal.
	 * @name orion.splitter.Splitter
	 */
	function Splitter(options) {
		this._init(options);		
	}
	Splitter.prototype = /** @lends orion.splitter.Splitter.prototype */ {
			
		_init: function(options) {
			this._tracking = null;
			this._resizeListeners = [];
			this._animationDelay = 501;  // longer than CSS transitions in layout.css
			this.$node = lib.node(options.node);
			if (!this.$node) { throw "no dom node for splitter found"; } //$NON-NLS-0$
			this.$sideNode = lib.node(options.sidePanel);
			if (!this.$sideNode) { throw "no dom node for side panel found"; } //$NON-NLS-0$
			this.$mainNode = lib.node(options.mainPanel);
			if (!this.$mainNode) { throw "no dom node for main panel found"; } //$NON-NLS-0$
			this._vertical = options.vertical;
			this._prefix = "/orion/splitter/" + (this.$node.id || document.body.id || "");  //$NON-NLS-0$
			if (options.toggle) {
				this._thumb = document.createElement("div"); //$NON-NLS-0$
				this.$node.appendChild(this._thumb);
				this._thumb.classList.add("splitThumb"); //$NON-NLS-0$
				this._thumb.classList.add("splitThumbLayout"); //$NON-NLS-0$
			}
			this._closeByDefault = options.closeByDefault;
			this._initializeFromStoredSettings();
			
			if (this._closed) {
				this._closed = false;  // _thumbDown will toggle it, so turn it off and then call _thumbDown.
				this._thumbDown();
			} else {
				this._adjustToSplitPosition();
			}
			this.$node.style.visibility = "visible"; //$NON-NLS-0$ 
			this.$mainNode.style.display = "block"; //$NON-NLS-0$ 
			this.$sideNode.style.display = "block"; //$NON-NLS-0$ 
			this.$node.addEventListener("mousedown", this._mouseDown.bind(this), false); //$NON-NLS-0$
			window.addEventListener("mouseup", this._mouseUp.bind(this), false); //$NON-NLS-0$
			window.addEventListener("resize", this._resize.bind(this), false);  //$NON-NLS-0$
		},
		/**
		 * Toggle the open/closed state of the side panel.
		 */			
		toggleSidePanel: function() {
			this._thumbDown();		
		},
		
		/**
		 * Close the side panel.  This function has no effect if the side panel is already closed.
		 */
		 openSidePanel: function() {
			if (!this._closed) {
				this._thumbDown();
			}
		 },
		 /**
		 * Adds an event listener for resizing the main and side panels.
		 * @param {Function} listener The function called when a resize occurs.  The DOM node that has
		 * been resized is passed as an argument.
		 */
		 addResizeListener: function(listener) {
			this._resizeListeners.push(listener);
		 },
		 
		 /* We use local storage vs. prefs because we don't presume the user wants the same window
		    positioning across browsers and devices.
		  */
		 _initializeFromStoredSettings: function() {
			var closedState = localStorage.getItem(this._prefix+"/toggleState");
			if(!closedState){
				this._closed = (this._closeByDefault ? true: false);
			} else {
				this._closed = closedState === "closed";  //$NON-NLS-1$ //$NON-NLS-0$
			}
			var pos;
			if (this._vertical) {
				pos = localStorage.getItem(this._prefix+"/yPosition"); //$NON-NLS-0$
				if (pos) {
					this._splitTop = parseInt(pos, 10);
				} else if (this._closeByDefault ) {
					this._splitTop = 150;
				}
			} else {
				pos = localStorage.getItem(this._prefix+"/xPosition"); //$NON-NLS-0$
				if (pos) {
					this._splitLeft = parseInt(pos, 10);
				} else if (this._closeByDefault ) {
					this._splitLeft = 150;
				}
			}
			
		 },
		 
		_adjustToSplitPosition: function(updateStorage) {
			var rect = lib.bounds(this.$node);
			var parentRect = lib.bounds(this.$node.parentNode);
			if (this._vertical) {
				this._splitHeight = rect.height;
				if (updateStorage || !this._splitTop){
					this._splitTop = rect.top;
					localStorage.setItem(this._prefix+"/yPosition", this._splitTop);  //$NON-NLS-1$ //$NON-NLS-0$
				}
				var top = this._splitTop;
				if (this.$node.parentNode.style.position === "relative") { //$NON-NLS-0$		
					top = this._splitTop - parentRect.top;
				}
				this.$sideNode.style.height = top + "px"; //$NON-NLS-0$
				this.$sideNode.style.bottom = top - 1 +"px"; //$NON-NLS-0$
				this.$sideNode.style.display = "block"; //$NON-NLS-0$ 
				this.$node.style.top = top + "px"; //$NON-NLS-0$ 
				this._resize();
			} else {
				this._splitWidth = rect.width;
				if (updateStorage || !this._splitLeft){
					this._splitLeft = rect.left;
					localStorage.setItem(this._prefix+"/xPosition", this._splitLeft);  //$NON-NLS-1$ //$NON-NLS-0$
				}
				var left = this._splitLeft;
				if (this.$node.parentNode.style.position === "relative") { //$NON-NLS-0$		
					left = this._splitLeft - parentRect.left;
				}
				this.$sideNode.style.width = left + "px"; //$NON-NLS-0$
				this.$sideNode.style.right = left - 1 +"px"; //$NON-NLS-0$
				this.$sideNode.style.display = "block"; //$NON-NLS-0$ 
				this.$node.style.left = left + "px"; //$NON-NLS-0$ 
				this._resize();
			}
		},
		
		_resize: function(animationDelay) {
			animationDelay = animationDelay || 0;
			var parentRect = lib.bounds(this.$node.parentNode);
			var rect = lib.bounds(this.$node);
			if (this._vertical) {
				this.$mainNode.style.height = (parentRect.height - (rect.top - parentRect.top + rect.height)) + "px"; //$NON-NLS-0$ 
			} else {
				this.$mainNode.style.width = (parentRect.width - (rect.left - parentRect.left + rect.width)) +"px"; //$NON-NLS-0$ 
			}
			var self = this;
			window.setTimeout(function() { self._notifyResizeListeners(self.$mainNode); }, animationDelay);
			window.setTimeout(function() { self._notifyResizeListeners(self.$sideNode); }, animationDelay);

		},
		
		_notifyResizeListeners: function(node) {
			for (var i = 0; i <this._resizeListeners.length; i++) {
				this._resizeListeners[i](node);
			}
		}, 
		
		_thumbDown: function() {
			if (this._closed) {
				this._closed = false;
				this._addAnimation();
				if (this._vertical) {
					this.$sideNode.style.height = this._splitTop+"px"; //$NON-NLS-0$ 
					this.$node.style.top = this._splitTop+"px"; //$NON-NLS-0$
				} else {
					this.$sideNode.style.width = this._splitLeft+"px"; //$NON-NLS-0$ 
					this.$node.style.left = this._splitLeft+"px"; //$NON-NLS-0$
				}
				this._resize(this._animationDelay);
				this._removeAnimation();
			} else {
				this._closed = true;
				this._addAnimation();
				if (this._vertical) {
					this.$sideNode.style.top = 0;
					this.$node.style.top = "1px"; //$NON-NLS-0$ 
				} else {
					this.$sideNode.style.width = 0;
					this.$node.style.left = "1px"; //$NON-NLS-0$ 
				}
				this._resize(this._animationDelay);
				this._removeAnimation();
			}
			localStorage.setItem(this._prefix+"/toggleState", this._closed ? "closed" : null);  //$NON-NLS-1$  //$NON-NLS-0$

		},
		
		_removeAnimation: function() {
			// in a timeout to ensure the animations are complete.
			var self = this;
			window.setTimeout(function() {
				self.$sideNode.classList.remove("sidePanelLayoutAnimation"); //$NON-NLS-0$ 
				self.$mainNode.classList.remove("mainPanelLayoutAnimation"); //$NON-NLS-0$ 
				self.$node.classList.remove("splitLayoutAnimation"); //$NON-NLS-0$ 
				self._thumb.classList.remove("splitLayoutAnimation"); //$NON-NLS-0$ 
			}, this._animationDelay);
		},
		
		_addAnimation: function() {
			this.$sideNode.classList.add("sidePanelLayoutAnimation"); //$NON-NLS-0$ 
			this.$mainNode.classList.add("mainPanelLayoutAnimation"); //$NON-NLS-0$ 
			this.$node.classList.add("splitLayoutAnimation"); //$NON-NLS-0$ 
			if (this._thumb) {
				this._thumb.classList.add("splitLayoutAnimation"); //$NON-NLS-0$ 
			}
		},
		
		_mouseDown: function(event) {
			if (event.target === this._thumb) {
				lib.stop(event);
				return this._thumbDown(event);
			}
			if (this._tracking) {
				return;
			}
			this.$node.classList.add("splitTracking"); //$NON-NLS-0$
			this.$mainNode.classList.add("panelTracking"); //$NON-NLS-0$
			this.$sideNode.classList.add("panelTracking"); //$NON-NLS-0$
			this._tracking = this._mouseMove.bind(this);
			window.addEventListener("mousemove", this._tracking); //$NON-NLS-0$
			lib.stop(event);
		},
		
		_mouseMove: function(event) {
			if (this._tracking) {
				var parentRect = lib.bounds(this.$node.parentNode);
				if (this._vertical) {
					this._splitTop = event.clientY;	
					if(this._splitTop < parentRect.top + MIN_SIDE_NODE_WIDTH) {//If the top side of the splitted node is shorter than the min size
						this._splitTop = parentRect.top + MIN_SIDE_NODE_WIDTH;
					} else if(this._splitTop > parentRect.top + parentRect.height - MIN_SIDE_NODE_WIDTH) {//If the bottom side of the splitted node is shorter than the min size
						this._splitTop = parentRect.top + parentRect.height - MIN_SIDE_NODE_WIDTH;
					}
					var top = this._splitTop;
					if (this.$node.parentNode.style.position === "relative") { //$NON-NLS-0$
						top = this._splitTop - parentRect.top;
					}
					this.$node.style.top = top + "px"; //$NON-NLS-0$ 
				} else {
					this._splitLeft = event.clientX;
					if(this._splitLeft < parentRect.left + MIN_SIDE_NODE_WIDTH) {//If the left side of the splitted node is narrower than the min size
						this._splitLeft = parentRect.left + MIN_SIDE_NODE_WIDTH;
					} else if(this._splitLeft > parentRect.left + parentRect.width - MIN_SIDE_NODE_WIDTH) {//If the right side of the splitted node is narrower than the min size
						this._splitLeft = parentRect.left + parentRect.width - MIN_SIDE_NODE_WIDTH;
					}
					var left = this._splitLeft;
					if (this.$node.parentNode.style.position === "relative") { //$NON-NLS-0$
						left = this._splitLeft - parentRect.left;
					}
					this.$node.style.left = left + "px"; //$NON-NLS-0$ 
				}
				this._adjustToSplitPosition(true);
				lib.stop(event);
			}
		},
		
		_mouseUp: function(event) {
			if (this._tracking) {
				window.removeEventListener("mousemove", this._tracking); //$NON-NLS-0$
				this._tracking = null;
				this.$node.classList.remove("splitTracking"); //$NON-NLS-0$
				this.$mainNode.classList.remove("panelTracking"); //$NON-NLS-0$
				this.$sideNode.classList.remove("panelTracking"); //$NON-NLS-0$
				lib.stop(event);
			}
		}
	};
	Splitter.prototype.constructor = Splitter;
	//return the module exports
	return {Splitter: Splitter};
});