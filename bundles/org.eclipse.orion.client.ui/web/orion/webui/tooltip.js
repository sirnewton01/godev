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
/*global window define document */

define(['require', 'orion/webui/littlelib'], function(require, lib) {

	/**
	 * Attaches tooltip behavior to a given node.  The tooltip will be assigned class "tooltip" which can be
	 * used to control appearance.  Uses the "CSS Triangle Trick" 
	 * http://css-tricks.com/snippets/css/css-triangle/
	 * for the tooltip shape and CSS transitions for fade in and fade out.
	 *
	 * Clients should destroy the tooltip if removing the node from the document.
	 *
	 * @param {Object} options The options object, which must minimally specify the tooltip dom node
	 * @param options.node The node showing the tooltip.  Required.
	 * @param options.text The text in the tooltip.  Optional.  If not specified, the client is expected to add content
	 * to the tooltip prior to triggering it.
	 * @param options.trigger The event that triggers the tooltip.  Optional.  Defaults to "mouseover".  Can be one of "mouseover",
	 * "click", or "none".  If "none" then the creator will be responsible for showing, hiding, and destroying the tooltip.
	 * If "mouseover" then the aria attributes for tooltips will be set up.
	 * @param options.position An array specifying the preferred positions to try positioning the tooltip.  Positions can be "left", "right", 
	 * "above", or "below".  If no position will fit on the screen, the first position specified is used.  Optional.  Defaults to 
	 * ["right", "above", "below", "left"].
	 * @param options.showDelay Specifies the number of millisecond delay before the tooltip begins to appear.
	 * Optional.  Valid only for "mouseover" trigger.  Defaults to 1000.
	 * @param options.hideDelay Specifies the number of millisecond delay before the tooltip begins to disappear.
	 * Optional.  Defaults to 200.  Valid only for "mouseover" trigger.
	 * @param options.tailSize Specifies the number of pixels to allocate for the tail.  Optional.  Defaults to 10.
	 * @name orion.webui.tooltip.Tooltip
	 *
	 */
	function Tooltip(options) {
		this._init(options);
	}
	Tooltip.prototype = /** @lends orion.webui.tooltip.Tooltip.prototype */ {
			
		_init: function(options) {
			this._node = lib.node(options.node);
			if (!this._node) { throw "no dom node for tooltip found"; } //$NON-NLS-0$
			this._position = options.position || ["right", "above", "below", "left"]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this._text = options.text;
			this._hideDelay = options.hideDelay === undefined ? 200 : options.hideDelay;
			this._tailSize = options.tailSize || 10;
			this._trigger = options.trigger || "mouseover"; //$NON-NLS-0$
			this._afterShowing = options.afterShowing;
			this._afterHiding = options.afterHiding;
			
			var self = this;
			// set up events
			if (this._trigger === "click") { //$NON-NLS-0$
				this._showDelay = 0;
				this._node.addEventListener("click", function(event) { //$NON-NLS-0$
					if (event.target === self._node) {
						self.show();
						lib.stop(event);
					}
				}, false);
			} else if (this._trigger === "mouseover") { //$NON-NLS-0$
				this._showDelay = options.showDelay === undefined ? 500 : options.showDelay;
				var leave = ["mouseout", "click"];  //$NON-NLS-1$ //$NON-NLS-0$
				this._node.addEventListener("mouseover", function(event) { //$NON-NLS-0$
					if (lib.contains(self._node, event.target)) {
						self.show();
						lib.stop(event);
					}
				}, false);
				
				for (var i=0; i<leave.length; i++) {
					this._node.addEventListener(leave[i], function(event) { //$NON-NLS-0$
						if (lib.contains(self._node, event.target)) {
							self.hide();
						}
					}, false);
				}
			}						
		},
		
		_makeTipNode: function() {
			if (!this._tip) {
				this._tip = document.createElement("span"); //$NON-NLS-0$
				this._tip.classList.add("tooltipContainer"); //$NON-NLS-0$
				this._tipInner = document.createElement("div");  //$NON-NLS-0$
				this._tipInner.classList.add("tooltip");  //$NON-NLS-0$
				if (this._text) {
					this._tipTextContent = document.createElement("div");  //$NON-NLS-0$
					this._tipTextContent.classList.add("textContent");  //$NON-NLS-0$
					this._tipInner.appendChild(this._tipTextContent);
					var textNode = document.createTextNode(this._text);
					this._tipTextContent.appendChild(textNode);
				}
				this._tip.appendChild(this._tipInner);
				document.body.appendChild(this._tip);
				var self = this;
				lib.addAutoDismiss([this._tip, this._node], function() {self.hide();});
				if (this._trigger === "mouseover") { //$NON-NLS-0$
					 this._tipInner.role = "tooltip"; //$NON-NLS-0$
					 this._tipInner.id = "tooltip" + new Date().getTime().toString(); //$NON-NLS-0$
					 this._node.setAttribute("aria-describedby", this._tipInner.id); //$NON-NLS-0$
				
					// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=398960
					// mousing over the tip itself will cancel any pending timeout to close it, but then we must
					// also close it when we leave the tip.
					this._tip.addEventListener("mouseover", function(event) { //$NON-NLS-0$
						if (self._timeout) {
							window.clearTimeout(self._timeout);
							self._timeout = null;
						}
						self._tip.addEventListener("mouseout", function(event) { //$NON-NLS-0$
							if (lib.contains(self._tip, event.target)) {
								self.hide();
								lib.stop(event);
							}
						}, false);
					}, false);
				}
			}
			return this._tip;
		},
		
		_positionTip: function(position, force) {
			this._makeTipNode();  // lazy initialize
			
			// special case for left tooltip to ensure inner span is adjacent to tail.
			if (position === "left") { //$NON-NLS-0$
				this._tipInner.classList.add("left"); //$NON-NLS-0$
			} else {
				this._tipInner.classList.remove("left"); //$NON-NLS-0$
			}

			// Sometimes _node is not visible (eg. if _node is a dropdown menu item in a closed menu), so find
			// the nearest ancestor with a reasonable bound
			var posNode = this._node;
			var rect;
			for (rect = lib.bounds(posNode); posNode && !rect.width && !rect.height; posNode = posNode.parentNode) {
				rect = lib.bounds(posNode);
			}
			var tipRect = lib.bounds(this._tipInner);
			var top, left;
			
			switch (position) {
				case "above": //$NON-NLS-0$
					top = rect.top - tipRect.height - this._tailSize - 1;
					left = rect.left - this._tailSize;
					break;
				case "below": //$NON-NLS-0$
					top = rect.top + rect.height + this._tailSize + 1;
					left = rect.left - this._tailSize;
					break;
				case "left": //$NON-NLS-0$
					top = rect.top - this._tailSize / 2;
					left = rect.left - tipRect.width - this._tailSize - 1;
					break;
				default:  // right
					top = rect.top - this._tailSize / 2;
					left = rect.left + rect.width + this._tailSize + 1;
					break;
			}
			var totalRect = lib.bounds(document.documentElement);
			if (top + tipRect.height > totalRect.height) {
				if (force) {
					top = totalRect.height - tipRect.height - 1;
				} else {
					return false;
				}
			}
			if (left + tipRect.width > totalRect.width) {
				if (force) {
					left = totalRect.width - tipRect.width - 1;
				} else {
					return false;
				}
			}
			if (left < 0) {
				if (force) {
					left = 4;
				} else {
					return false;
				}
			}
			if (top < 0) {
				if (force) {
					top = 4;
				} else {
					return false;
				}
			}
			
			if (!this._tail) {
				this._tail = document.createElement("span"); //$NON-NLS-0$
				this._tail.classList.add("tooltipTailFrom"+position); //$NON-NLS-0$
				if (position === "above" || position === "left") { //$NON-NLS-1$//$NON-NLS-0$
					// tip goes after content
					this._tip.appendChild(this._tail);
				} else {
					this._tip.insertBefore(this._tail, this._tipInner);
				}
				if (position === 'left') { //$NON-NLS-0$
					this._tail.style.left = tipRect.width + "px"; //$NON-NLS-0$
				}
			}
			this._tip.style.top = top + "px"; //$NON-NLS-0$
			this._tip.style.left = left + "px"; //$NON-NLS-0$ 
			return true;
		},
		
		contentContainer: function() {
			this._makeTipNode();
			return this._tipInner;
		},
		
		/**
		 * Show the tooltip.
		 */			
		show: function() {
			if (this._tip && this._tip.classList.contains("tooltipShowing")) { //$NON-NLS-0$
				return;
			}
			var self = this;
			if (this._timeout) {
				window.clearTimeout(this._timeout);
				this._timeout = null;
			}
			this._timeout = window.setTimeout(function() {
				var positioned = false;
				var index = 0;
				while (!positioned && index < self._position.length) {
					positioned = self._positionTip(self._position[index]);
					index++;
				}
				if (!positioned) {
					self._positionTip(self._position[0], true);  // force it in, it doesn't fit anywhere
				}
				self._tip.classList.add("tooltipShowing"); //$NON-NLS-0$
				if (self._afterShowing) {
					self._afterShowing();
				}
			}, this._showDelay);
		},
		
		/**
		 * Hide the tooltip.
		 */			
		hide: function(hideDelay) {
			if (this._timeout) {
				window.clearTimeout(this._timeout);
				this._timeout = null;
			}
			if (!this._tip || !this._tip.classList.contains("tooltipShowing")) { //$NON-NLS-0$
				return;
			}
			if (hideDelay === undefined) {
				hideDelay = this._hideDelay;
			}
			var self = this;
			this._timeout = window.setTimeout(function() {
				self._tip.classList.remove("tooltipShowing"); //$NON-NLS-0$
				self._tip.removeAttribute("style"); //$NON-NLS-0$
				if (self._afterHiding) {
					self._afterHiding();
				}
			}, hideDelay);
		},
		
		destroy: function() {
			if (this._timeout) {
				window.clearTimeout(this._timeout);
				this._timeout = null;
			}
			if (this._tip) {
				document.body.removeChild(this._tip);
				this._tip = null;
				this._tipInner = null;
				this._tipTextContent = null;
				this._tail = null;
			}
		}
	};
	Tooltip.prototype.constructor = Tooltip;
	//return the module exports
	return {Tooltip: Tooltip};
});