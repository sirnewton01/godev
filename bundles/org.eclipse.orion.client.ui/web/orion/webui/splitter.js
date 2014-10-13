/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/EventTarget',
	'orion/util',
	'orion/webui/littlelib'
], function(EventTarget, util, lib) {

	var ORIENTATION_HORIZONTAL = 1;
	var ORIENTATION_VERTICAL = 2;

	/**
	 * @name orion.webui.Splitter
	 * @class A splitter manages the layout of two panels, a side panel and a main panel.
	 * @description Constructs a new Splitter with the given options.  A splitter manages the layout
	 * of two panels, a side panel and a main panel.  An optional toggle button can open or close the
	 * side panel.
	 *
	 * <p>The relative proportions of the side and main panels are determined by the initial style of
	 * the splitter bar in the document. The panels will pin themselves to the splitter by default.
	 * Once the user moves the splitter, the positions are remembered. If the splitter is *not* proportional
	 * but *is* vertical then its position is stored separately from its horizontal position.</p>
	 * 
	 * <p>The splitter defines the CSS to position the nodes it's splitting based on which of the nodes
	 * 'collapses' when it's 'closed'. If the left (leading) node collapses then everything is defined relative
	 * to the left; if the trailing node collapses (closeReversely=true) then everything is relative to the right.
	 * In either case the CSS is defined so that the non-collapsing node gets the extra space if the browser grows.
	 *
	 * <p>By default, a splitter is open. The client can create a closed splitter by setting a 
	 * <code>data-initial-state</code> attribute with value <code>"closed"</code> on the 
	 * splitter's <code>node</code> element. Note that the user can drag a splitter 'closed' or 'open'
	 * and the correct state is maintained (i.e. if it were open and we dragged it all the way to its closed
	 * position then hitting the thumb would open it and vice versa.</p>
	 *
	 * @param {Object} options The options object which must specify the split dom node
	 * @param {Element} options.node The node for the splitter presentation.  Required.
	 * @param {Element} options.sidePanel The node for the side (toggling) panel.  Required.
	 * @param {Element} options.mainPanel The node for the main panel.  Required.
	 * @param {Boolean} [options.toggle=false] Specifies that the side node should be able to toggle.
	 * @param {Boolean} [options.vertical=false] Specifies that the nodes are stacked vertically rather than horizontal.
	 * @param {Boolean} [options.closeReversely=false] Specifies that the splitter moves to right when nodes are stacked horizontally, or to bottom when nodes are stacked vertically.
	 * @param {Boolean} [options.proportional=false] Specifies that the splitter is proportional so that growing the browser allocates space to both nodes.
	 *
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function Splitter(options) {
		EventTarget.attach(this);
		this._init(options);
	}
	Splitter.prototype = /** @lends orion.webui.Splitter.prototype */ {

		_init: function(options) {
			this.$splitter = lib.node(options.node);
			if (!this.$splitter) { throw "no dom node for splitter found"; } //$NON-NLS-0$
			this.$leading = lib.node(options.sidePanel);
			if (!this.$leading) { throw "no dom node for side panel found"; } //$NON-NLS-0$
			this.$trailing = lib.node(options.mainPanel);
			if (!this.$trailing) { throw "no dom node for main panel found"; } //$NON-NLS-0$

			this._tracking = false;
			this._animationDelay = 501;  // longer than CSS transitions in layout.css
			this._collapseTrailing = options.closeReversely || false;
			this._proportional = options.proportional || false;

			this._prefix = "/orion/splitter/" + (this.$splitter.id || document.body.id || "");  //$NON-NLS-0$
			
			if (options.toggle) {
				this._thumb = document.createElement("div"); //$NON-NLS-0$
				this.$splitter.appendChild(this._thumb);
				this._thumb.classList.add("splitThumb"); //$NON-NLS-0$
				if (this._vertical) {
					this._thumb.classList.add(this._collapseTrailing ? "splitVerticalThumbDownLayout" : "splitVerticalThumbUpLayout"); //$NON-NLS-1$ //$NON-NLS-0$
				} else {
					this._thumb.classList.add(this._collapseTrailing ? "splitThumbRightLayout" : "splitThumbLeftLayout"); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}

			this.$splitter.classList.add("split"); //$NON-NLS-0$
			
			// Initialize for the current orientation / collapse direction
			var orientationStr = localStorage.getItem(this._prefix+"/orientation"); //$NON-NLS-0$
			if (orientationStr) {
				var orientation = orientationStr === "vertical" ? ORIENTATION_VERTICAL : ORIENTATION_HORIZONTAL; //$NON-NLS-0$
			} else {
				orientation = options.vertical ? ORIENTATION_VERTICAL : ORIENTATION_HORIZONTAL;
			}

			this.setOrientation(orientation);
			
			if (util.isIOS || util.isAndroid) {
				this.$splitter.addEventListener("touchstart", this._touchStart.bind(this), false); //$NON-NLS-0$
				if (this._thumb) {
					this._thumb.addEventListener("touchstart", this._touchStart.bind(this), false); //$NON-NLS-0$
				}
				this.$splitter.addEventListener("touchmove", this._touchMove.bind(this), false); //$NON-NLS-0$
				this.$splitter.addEventListener("touchend", this._touchEnd.bind(this), false); //$NON-NLS-0$
			} else {
				this.$splitter.addEventListener("mousedown", this._mouseDown.bind(this), false); //$NON-NLS-0$
				window.addEventListener("mouseup", this._mouseUp.bind(this), false); //$NON-NLS-0$
			}
			window.addEventListener("resize", this._resize.bind(this), false);  //$NON-NLS-0$
		},
		isClosed: function() {
			return this._closed;
		},
		getOrientation: function() {
			return this._vertical ? ORIENTATION_VERTICAL : ORIENTATION_HORIZONTAL;
		},		
		setOrientation: function(value) {
			var vertical = value === ORIENTATION_VERTICAL;
			if (vertical === this._vertical) {
				return;
			}

			this._vertical = vertical;

			// Store the orientation
			var orientationStr = this._vertical ? "vertical" : "horizontal"; //$NON-NLS-1$ //$NON-NLS-0$
			localStorage.setItem(this._prefix+"/orientation", orientationStr); //$NON-NLS-0$

			// Set up the CSS styling
			this.$splitter.style.position = "absolute"; //$NON-NLS-0$
			this.$trailing.style.position = "absolute"; //$NON-NLS-0$
			this.$leading.style.position = "absolute"; //$NON-NLS-0$

			// We need a different storage area for the vertical value in non-proportional layouts
			this._offsetStorageLabel = "/offset"; //$NON-NLS-0$
			if (this._vertical && !this._proportional) {
				this._offsetStorageLabel = "/offsetY"; //$NON-NLS-0$
			}
			
			if (this._vertical) {
				this.$splitter.classList.remove("splitLayout"); //$NON-NLS-0$
				this.$splitter.classList.add("splitVerticalLayout"); //$NON-NLS-0$
				
				// Set up for vertical calculations
				this._topLeft = "top"; //$NON-NLS-0$
				this._bottomRight = "bottom"; //$NON-NLS-0$
				this._widthHeight = "height"; //$NON-NLS-0$
			} else {
				this.$splitter.classList.remove("splitVerticalLayout"); //$NON-NLS-0$
				this.$splitter.classList.add("splitLayout"); //$NON-NLS-0$

				// Set up for vertical calculations
				this._topLeft = "left"; //$NON-NLS-0$
				this._bottomRight = "right"; //$NON-NLS-0$
				this._widthHeight = "width"; //$NON-NLS-0$
			}

			// Grab the initial position *before* hacking on the layout
			this._initializeFromStoredSettings();
			
			// Set up the style constants we need
			this._setStyleConstants();
			
			// 'Constants' (i.e. things we don't set to adjust for the offset)
			if (!this._collapseTrailing) {
				this.$splitter.style[this._bottomRight] = "auto"; //$NON-NLS-0$
				
				this.$leading.style[this._topLeft] = "0px"; //$NON-NLS-0$
				this.$leading.style[this._bottomRight] = "auto"; //$NON-NLS-0$

				this.$trailing.style[this._widthHeight] = "auto"; //$NON-NLS-0$
				this.$trailing.style[this._bottomRight] = "0px"; //$NON-NLS-0$
			} else {
				this.$splitter.style[this._topLeft] = "auto"; //$NON-NLS-0$
				
				this.$leading.style[this._topLeft] = "0px"; //$NON-NLS-0$
				this.$leading.style[this._widthHeight] = "auto"; //$NON-NLS-0$
				
				this.$trailing.style[this._topLeft] = "auto"; //$NON-NLS-0$
				this.$trailing.style[this._bottomRight] = "0px"; //$NON-NLS-0$
			}

			if (this._thumb) {
				var classList = this._thumb.classList;
				if (this._vertical) {
					classList.remove(this._collapseTrailing ? "splitThumbRightLayout" : "splitThumbLeftLayout"); //$NON-NLS-1$ //$NON-NLS-0$
					classList.add(this._collapseTrailing ? "splitVerticalThumbDownLayout" : "splitVerticalThumbUpLayout"); //$NON-NLS-1$ //$NON-NLS-0$
				} else {
					classList.remove(this._collapseTrailing ? "splitVerticalThumbDownLayout" : "splitVerticalThumbUpLayout"); //$NON-NLS-1$ //$NON-NLS-0$
					classList.add(this._collapseTrailing ? "splitThumbRightLayout" : "splitThumbLeftLayout"); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}

			if (this._closed) {
				this._closed = false;        // _thumbDown will toggle it, so turn it off and then call _thumbDown.
				this._thumbDown(true, true); // do not animate. do not persist the initial state
			} else {
				this._adjustToOffset();
			}
			
			this._resize();
			
			// Finally, ensure that everything is visible
			this.$splitter.style.visibility = "visible"; //$NON-NLS-0$
			this.$trailing.style.display = "block"; //$NON-NLS-0$
			this.$leading.style.display = "block"; //$NON-NLS-0$
		},

		_setStyleConstants: function() {
			if (this._vertical) {
				this.$splitter.style.left = ""; //$NON-NLS-0$
				this.$splitter.style.right = ""; //$NON-NLS-0$
				
				// We own the width / height of both panes
				this.$leading.style.left = "auto"; //$NON-NLS-0$
				this.$leading.style.right = "auto"; //$NON-NLS-0$
				this.$leading.style.width = "100%"; //$NON-NLS-0$
				this.$trailing.style.left = "auto"; //$NON-NLS-0$
				this.$trailing.style.right = "auto"; //$NON-NLS-0$
				this.$trailing.style.width = "100%"; //$NON-NLS-0$
			} else {
				this.$splitter.style.top = ""; //$NON-NLS-0$
				this.$splitter.style.bottom = ""; //$NON-NLS-0$
				
				// We own the width / height of both panes
				this.$leading.style.top = "auto"; //$NON-NLS-0$
				this.$leading.style.bottom = "auto"; //$NON-NLS-0$
				this.$leading.style.height = "100%"; //$NON-NLS-0$
				this.$trailing.style.top = "auto"; //$NON-NLS-0$
				this.$trailing.style.bottom = "auto"; //$NON-NLS-0$
				this.$trailing.style.height = "100%"; //$NON-NLS-0$
			}
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
		 *
		 * @deprecated use addEventListener instead
		 */
		addResizeListener: function(listener) {
			this.addEventListener("resize", function(event) { //$NON-NLS-0$
				listener(event.node);
			});
		},

		/*
		 * We use local storage vs. prefs because we don't presume the user wants the same window positioning across browsers and devices.
		 */
		_initializeFromStoredSettings: function() {
			var closedState = localStorage.getItem(this._prefix+"/toggleState"); //$NON-NLS-0$
			if (typeof closedState === "string") { //$NON-NLS-0$
				this._closed = closedState === "closed"; //$NON-NLS-0$
			} else {
				this._closed = this._closeByDefault;
			}
			
			// Set the initial value for the splitter's width/height
			this._adjustSplitterSize();

			var pos = localStorage.getItem(this._prefix+this._offsetStorageLabel);
			if (pos) {
				this._offset = parseInt(pos, 10);
				if (this._proportional) {
					this._offset = Math.max(0, Math.min(100 - this._splitterSize, this._offset));
				}
			} else {
				// Use the current splitter location
				var rect = lib.bounds(this.$splitter);
				this._offset = this._adjustOffset(rect[this._topLeft]);
			}
		},

		_adjustSplitterSize: function() {
			// Size in pixels
			var rect = lib.bounds(this.$splitter);
			this._splitterSize = rect[this._widthHeight];
			
			// Make proportional if necessary
			if (this._proportional) {
				var pRect = lib.bounds(this.$splitter.parentNode);
				this._splitterSize = this._splitterSize / (pRect[this._widthHeight] / 100);
			}			
		},
		
		/*
		 * Takes a value that represents the desired left / top position for the
		 * splitter and adjusts based on which side collapses. It then turns the value into
		 * a ratio if the splitter is proportional.
		 */
		_adjustOffset: function(newOffset) {
			var parentRect = lib.bounds(this.$splitter.parentNode);
			if (this._collapseTrailing) {
				var adjustment = newOffset + this._splitterSize;
				newOffset = parentRect[this._widthHeight] - (adjustment - parentRect[this._topLeft]);
			} else {
				newOffset = newOffset - parentRect[this._topLeft];
			}
			
			if (this._proportional) {
				newOffset = newOffset / (parentRect[this._widthHeight] / 100);
			}
			
			return newOffset;
		},

		_adjustToOffset: function() {
			if (this._offset < 0) {
				this._offset = 0;
			}
			
			var suffix = this._proportional ? "%" : "px"; //$NON-NLS-1$ //$NON-NLS-0$
			
			if (!this._collapseTrailing) {
				this.$splitter.style[this._topLeft] = this._offset + suffix;
				this.$leading.style[this._widthHeight] = this._offset + suffix;
				this.$trailing.style[this._topLeft] = (this._offset + this._splitterSize) + suffix;
			} else {
				this.$splitter.style[this._bottomRight] = this._offset + suffix;
				this.$leading.style[this._bottomRight] = (this._offset + this._splitterSize) + suffix;
				this.$trailing.style[this._widthHeight] = this._offset + suffix;
			}
		},

		_resize: function() {
			if (this._proportional) {
				this._adjustSplitterSize();
				this._adjustToOffset();
			}
			
			this._notifyResizeListeners(this.$trailing);
			this._notifyResizeListeners(this.$leading);
		},

		_notifyResizeListeners: function(node) {
			this.dispatchEvent({type: "resize", node: node}); //$NON-NLS-0$
		},

		_notifyToggleListeners: function() {
			this.dispatchEvent({type: "toggle", closed: this._closed}); //$NON-NLS-0$
		},

		_thumbDown: function(noAnimation, noUpdateStorage) {
			if (!noAnimation) {
				this._addAnimation();
			}

			if (this._closed) {
				var pos = localStorage.getItem(this._prefix+this._offsetStorageLabel);
				this._offset = pos ? parseInt(pos, 10) : 350;
				this._closed = false;
			} else {
				localStorage.setItem(this._prefix+this._offsetStorageLabel, this._offset);
				this._offset = 0;
				this._closed = true;
			}

			this._adjustToOffset();

			if (!noAnimation) {
				this._removeAnimation();
			}
			if (!noUpdateStorage) {
				localStorage.setItem(this._prefix+"/toggleState", this._closed ? "closed" : null);  //$NON-NLS-1$  //$NON-NLS-0$
			}
		},

		_removeAnimation: function() {
			// in a timeout to ensure the animations are complete.
			var self = this;
			window.setTimeout(function() {
				self.$leading.classList.remove("generalAnimation"); //$NON-NLS-0$
				self.$trailing.classList.remove("generalAnimation"); //$NON-NLS-0$
				self.$splitter.classList.remove("generalAnimation"); //$NON-NLS-0$
				
				self._resize();
			}, this._animationDelay);
		},

		_addAnimation: function() {
			this.$leading.classList.add("generalAnimation"); //$NON-NLS-0$
			this.$trailing.classList.add("generalAnimation"); //$NON-NLS-0$
			this.$splitter.classList.add("generalAnimation"); //$NON-NLS-0$
		},
		
		_down: function() {
			this.$splitter.classList.add("splitTracking"); //$NON-NLS-0$
			this.$trailing.classList.add("panelTracking"); //$NON-NLS-0$
			this.$leading.classList.add("panelTracking"); //$NON-NLS-0$
		},
		
		_move: function(clientX, clientY) {
			var pos = this._vertical ? clientY : clientX;
			
			// Try to center the cursor on the new splitter pos
			var rect = lib.bounds(this.$splitter);
			var offset = rect[this._widthHeight] / 2;
			if (this._collapseTrailing) {
				this._offset = this._adjustOffset(pos + offset);
			} else {
				this._offset = this._adjustOffset(pos - offset);
			}
			
			this._adjustToOffset();	
		},
		
		_up: function() {
			this.$splitter.classList.remove("splitTracking"); //$NON-NLS-0$
			this.$trailing.classList.remove("panelTracking"); //$NON-NLS-0$
			this.$leading.classList.remove("panelTracking"); //$NON-NLS-0$

			// if the user dragged the splitter closed or open capture this
			if (this._offset > 0) {
				// Store the current position
				localStorage.setItem(this._prefix+this._offsetStorageLabel, this._offset);
				this._closed = false;
			} else {
				this._closed = true;
			}
			
			// Update the state
			localStorage.setItem(this._prefix+"/toggleState", this._closed ? "closed" : null);  //$NON-NLS-1$  //$NON-NLS-0$
		},

		_mouseDown: function(event) {
			if (event.target === this._thumb) {
				lib.stop(event);
				return this._thumbDown();
			}
			if (this._tracking) {
				return;
			}
			this._down(event);
			this._tracking = this._mouseMove.bind(this);
			window.addEventListener("mousemove", this._tracking); //$NON-NLS-0$
			lib.setFramesEnabled(false);
			lib.stop(event);
		},

		_mouseMove: function(event) {
			if (this._tracking) {
				this._move(event.clientX, event.clientY);
			}
		},

		_mouseUp: function(event) {
			if (this._tracking) {
				lib.setFramesEnabled(true);
				window.removeEventListener("mousemove", this._tracking); //$NON-NLS-0$
				this._tracking = null;
				this._up();
				lib.stop(event);
				
				this._resize();
			}
		},
		
		_touchStart: function(event) {
			var touches = event.touches;
			if (touches.length === 1) {
				lib.stop(event);
				if (event.target === this._thumb) {
					return this._thumbDown();
				}
				this._down(event);
				this._touching = true;
			}
		},
		
		_touchMove: function(event) {
			if (this._touching) {
				var touches = event.touches;
				if (touches.length === 1) {
					var touch = touches[0];
					this._move(touch.clientX, touch.clientY);
				}
			}
		},
		
		_touchEnd: function(event) {
			var touches = event.touches;
			if (touches.length === 0) {
				this._touching = false;
				this._up();
			}
		}
	};
	Splitter.prototype.constructor = Splitter;
	//return the module exports
	return {
		Splitter: Splitter,
		ORIENTATION_HORIZONTAL: ORIENTATION_HORIZONTAL,
		ORIENTATION_VERTICAL: ORIENTATION_VERTICAL
	};
});
