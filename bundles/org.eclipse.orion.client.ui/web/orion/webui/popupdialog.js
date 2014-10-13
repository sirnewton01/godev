/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/littlelib', 'orion/webui/tooltip'], 
		function(messages, lib, tooltip) {
	/**
	 * PopupDialog is used to implement a lightweight, automatically dismissed dialog in Orion that is triggered when
	 * clicking a DOM node.
	 * Clients use the PopupDialog prototype and implement the following behavior:
	 *    1.  Ensure that the HTML template for the popup content is defined in the prototype TEMPLATE variable
	 *        prior to calling the _initialize() function. Set the following fields in the dialog prior to calling the 
	 *        _initialize() function if applicable.
	 *
	 *        messages - If i18n message bindings are used in the template, set the messages field to the messages object that
	 *            should be used to bind strings.
	 * 
	 *    2.  To hook event listeners to elements in the dialog, implement the _bindToDOM function.  DOM elements
	 *        in the template will be bound to variable names prefixed by a '$' character.  For example, the
	 *        element with id "myElement" can be referenced with this.$myElement
	 *
	 * Usage: Not instantiated by clients.  The prototype is used by the application popup instance.
	 * 
	 * @name orion.webui.PopupDialog
	 */
	function PopupDialog() {
	}

	PopupDialog.prototype = /** @lends orion.webui.PopupDialog.prototype */ {
		
		/* 
		 * Called by clients once the popup dialog template has been bound to the TEMPLATE variable, and an optional message object has
		 * been set.
		 * @param {DOMElement} triggerNode The node that should trigger the popup.
		 * @param {Function} afterShowing Optional. A function to call after the popup appears.
		 * @param {Function} afterHiding Optional. A function to call after the popup is hidden.
		 * @param {String} trigger Optional. The event that triggers the popup. Defaults to "click". Can be one of "mouseover",
		 * @param {Number} hideDelay Optional.  The delay to be used when hiding the popup.
		 * "click", or "none".  If "none" then the creator will be responsible for showing, hiding, and destroying the popup.
		 */

		_initialize: function(triggerNode, afterShowing, afterHiding, trigger, hideDelay) {
			this._tooltip = new tooltip.Tooltip({
				node: triggerNode,
				hideDelay: hideDelay || 0,
				afterShowing: this._afterShowingFunction(afterShowing).bind(this), 
				afterHiding: afterHiding,
				trigger: trigger ? trigger : "click" //$NON-NLS-0$
			});
			this.$parent = this._tooltip.contentContainer();
			this.$parent.role = "dialog"; //$NON-NLS-0$
			var range = document.createRange();
			range.selectNode(this.$parent);
			var contentFragment = range.createContextualFragment(this.TEMPLATE);

			lib.processTextNodes(contentFragment, this.messages || messages);

			this.$parent.appendChild(contentFragment);
			var tip = this._tooltip;
			this.$parent.addEventListener("keydown", function (e) { //$NON-NLS-0$
				if(e.keyCode === lib.KEY.ESCAPE) {
					tip.hide();
				} 
			}, false);

			this._bindElements(this.$parent);
			if (typeof this._bindToDom === "function") { //$NON-NLS-0$
				this._bindToDom(this.$parent);
			}
		},
		
		/*
		 * Internal.  Binds any child nodes with id's to the matching field variables.
		 */
		_bindElements: function(node) {
			for (var i=0; i<node.childNodes.length; i++) {
				var child = node.childNodes[i];
				if (child.id) {
					this['$'+child.id] = child; //$NON-NLS-0$
				}
				this._bindElements(child);
			}
		},
		
		_afterShowingFunction: function(clientAfterShowing) {
			return function () {
				if (clientAfterShowing) {
					clientAfterShowing.bind(this)();
				}
				if (!this.customFocus) {
					// We should set the focus.  Pick the first tabbable field, otherwise don't change focus.
					var focusField = lib.firstTabbable(this.$parent);
					if (focusField) {
						focusField.focus();
					}
				}
			};
		},
		
		/*
		 * Internal.  Hides the dialog.  There are other cases where the tooltip can hide on its own,
		 * without a client calling this function.  
		 */
		hide: function() {
			this._tooltip.hide();
		}, 
		
		/*
		 * Internal.  Shows the dialog.  There are other cases where the tooltip can show on its own,
		 * without a client calling this function.
		 */
		show: function() {
			this._tooltip.show();
		},
		
		/**
		 * @return True if this dialog is visible, false otherwise
		 */
		isShowing: function() {
			return this._tooltip.isShowing(); //$NON-NLS-0$
		}
	};
	
	PopupDialog.prototype.constructor = PopupDialog;

	//return the module exports
	return {PopupDialog: PopupDialog};
});
