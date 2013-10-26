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
/*jslint browser:true*/
/*global define orion window */

define(['i18n!orion/widgets/nls/messages', 'require', 'orion/webui/littlelib', 'orion/uiUtils'], 
		function(messages, require, lib, uiUtil) {
	/**
	 * Dialog is used to implement common dialog behavior in Orion.
	 * Clients use the Dialog prototype and implement the following behavior:
	 *    1.  Ensure that the HTML template for the dialog content is defined in the prototype TEMPLATE variable
	 *        prior to calling the _initialize() function. Set the following fields in the dialog prior to calling the 
	 *        _initialize() function if applicable.
	 *
	 *        messages - If i18n message bindings are used in the template, set the messages field to the messages object that
	 *            should be used to bind strings.
	 *        title - If the dialog should display a title, set the title field.
	 *        buttons - If the dialog should show buttons along the bottom, set an array of button objects.  Each button should
	 *            have a text property that labels the button and a callback property that is called when the button is pushed.
	 *        modal - Set this field to true if modal behavior is desired.
	 * 
	 *    2.  To hook event listeners to elements in the dialog, implement the _bindToDOM function.  DOM elements
	 *        in the template will be bound to variable names prefixed by a '$' character.  For example, the
	 *        element with id "myElement" can be referenced with this.$myElement
	 *
	 *    3.  Implement any of _beforeShowing, _afterShowing, _beforeHiding, _afterHiding to perform initialization and cleanup work.
	 *
	 * Usage: Not instantiated by clients.  The prototype is used by the application dialog instance.
	 * 
	 * @name orion.webui.Dialog
	 */
	function Dialog() {
	}

	Dialog.prototype = /** @lends orion.webui.Dialog.prototype */ {
	
		DISABLED: "disabled", //$NON-NLS-0$
	
		/* Not used by clients */
		CONTAINERTEMPLATE:		
		'<div class="dialog" role="dialog">' + //$NON-NLS-0$
			'<div class="dialogTitle"><span id="title" class="dialogTitleText layoutLeft"></span><button aria-label="Close" class="dismissButton layoutRight core-sprite-close imageSprite" id="closeDialog"></button></div>' + //$NON-NLS-0$
			'<div id="dialogContent" class="dialogContent layoutBlock"></div>' + //$NON-NLS-1$ //$NON-NLS-0$
			'<div id="buttons" class="dialogButtons"></div>' + //$NON-NLS-1$ //$NON-NLS-0$
		'</div>', //$NON-NLS-0$

		/* 
		 * Called by clients once the dialog template has been bound to the TEMPLATE variable, and any additional options (title, buttons,
		 * messages, modal) have been set.
		 */
		_initialize: function() {
			var parent = document.body;
			this.$frameParent = parent;
			this.$$modalExclusions = this.$$modalExclusions || [];
			var range = document.createRange();
			range.selectNode(parent);
			var frameFragment = range.createContextualFragment(this.CONTAINERTEMPLATE);
			parent.appendChild(frameFragment);
			this.$frame = parent.lastChild;
//			this.handle = lib.addAutoDismiss([this.$frame], this.hide.bind(this));
			if (this.title) {
				lib.$("#title", this.$frame).appendChild(document.createTextNode(this.title)); //$NON-NLS-0$
			}
			this.$close = lib.$("#closeDialog", this.$frame);//$NON-NLS-0$
			var self = this;
			this.$close.addEventListener("click", function(event) { //$NON-NLS-0$
				self.hide();
			}, false);
						
			this.$parent = lib.$(".dialogContent", this.$frame); //$NON-NLS-0$
			range = document.createRange();
			range.selectNode(this.$parent);
			var contentFragment = range.createContextualFragment(this.TEMPLATE);
			if (this.messages) {
				lib.processTextNodes(contentFragment, this.messages);
			}
			this.$parent.appendChild(contentFragment);
			this.$buttonContainer = lib.$(".dialogButtons", this.$frame); //$NON-NLS-0$
			this._makeButtons();
			
			// hook key handlers.  This must be done after _makeButtons so that the default callback (if any)
			// is established.
			this.$frame.addEventListener("keydown", function (e) { //$NON-NLS-0$
				if(e.keyCode === lib.KEY.ESCAPE) {
					self.hide();
				} else if (e.keyCode === lib.KEY.ENTER && (typeof self._defaultCallback) === "function") { //$NON-NLS-0$
					self._defaultCallback();
				}
			}, false);
			
			this._bindElements(this.$parent);
			if (typeof this._bindToDom === "function") { //$NON-NLS-0$
				this._bindToDom(this.$parent);
			}
			if (this.modal) {
				this._makeModal();
			}
		},
		
		/*
		 * Internal.  Generates any specified buttons.
		 */
		_makeButtons: function() {
			if (this.$buttonContainer && Array.isArray(this.buttons)) {
				var self = this;
				this.buttons.forEach(function(buttonDefinition) {
					var button = uiUtil.createButton(buttonDefinition.text, buttonDefinition.callback);
					if (buttonDefinition.id) {
						button.id = buttonDefinition.id;
						self['$'+ button.id] = button; //$NON-NLS-0$					
					}
					if (buttonDefinition.isDefault) {
						self._defaultCallback = buttonDefinition.callback;
						self._defaultButton = button;
					}
					self.$buttonContainer.appendChild(button);
				});
			}
		},
		

		/*
		 * Internal.  Makes modal behavior by immediately returning focus to the dialog when user leaves the dialog, and by
		 * styling the background to look faded.
		 */
		_makeModal: function(parent) {
			var self = this;
			// We listen to focus lost and remember the last one with focus.  This is great for clicks away from dialog.
			this.$frame.addEventListener("blur", function(e) { //$NON-NLS-0$
				self.$lastFocusedElement = e.target;
			}, true);
			this._modalListener = function(e) { //$NON-NLS-0$
				var preventFocus =	!lib.contains(self.$frame, e.target);
				if (preventFocus) {
					for (var i = 0; i<self.$$modalExclusions.length; i++) {
						if (lib.contains(self.$$modalExclusions[i], e.target)) {
							preventFocus = false;
							break;
						}
					}
				}
				if (preventFocus) {
					window.setTimeout(function() {
						(self.$lastFocusedElement || self.$parent).focus();
					}, 0);
					lib.stop(e);
				}
			};
			this.$frameParent.addEventListener("focus", this._modalListener, true);  //$NON-NLS-0$
			this.$frameParent.addEventListener("click", this._modalListener, true);  //$NON-NLS-0$
			var children = this.$frameParent.childNodes;
			var exclude = false;
			this._addedBackdrop = [];
			for (var i=0; i<children.length; i++) {
				for (var j=0; j<this.$$modalExclusions.length; j++) {
					if (lib.contains(this.$$modalExclusions[j], children[i])) {
						exclude = true;
						break;
					}
				}
				if (!exclude && children[i] !== self.$frame && children[i].classList && !children[i].classList.contains("tooltipContainer")) { //$NON-NLS-0$
					var child = children[i];
					if (!child.classList.contains("modalBackdrop")) {  //$NON-NLS-0$
						child.classList.add("modalBackdrop"); //$NON-NLS-0$
						this._addedBackdrop.push(child);
					} 
				}
			}
			
			// When tabbing out of the dialog, using the above technique (restore to last focus) will put the focus on the last element, but
			// we want it on the first element, so let's prevent the user from tabbing out of the dialog.
			var lastTabbable =  lib.lastTabbable(this.$buttonContainer) || lib.lastTabbable(this.$parent);
			if (lastTabbable) {
				lastTabbable.addEventListener("keydown", function (e) { //$NON-NLS-0$
					if(e.keyCode === lib.KEY.TAB) {
						var firstTabbable = self._getFirstFocusField();
						if (firstTabbable && firstTabbable !== e.target) {
							firstTabbable.focus();
						}
						lib.stop(e);
					} 
				}, false);
			}
		},
		
		_addChildDialog: function(dialog) {
			// Allow the child dialog to take focus.
			this.$$modalExclusions.push(dialog.$frame || dialog.$parent);
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
		
		/*
		 * Internal.  Hides the dialog.  Clients should use the before and after
		 * hooks (_beforeHiding, _afterHiding) to do any work related to hiding the dialog, such
		 * as destroying resources.
		 */
		hide: function() {
			if (typeof this._beforeHiding === "function") { //$NON-NLS-0$
				this._beforeHiding();
			}
			if (this._modalListener) {
				this.$frameParent.removeEventListener("focus", this._modalListener, true);  //$NON-NLS-0$
				this.$frameParent.removeEventListener("click", this._modalListener, true);  //$NON-NLS-0$
			}

			this.$frame.classList.remove("dialogShowing"); //$NON-NLS-0$
			if (typeof this._afterHiding === "function") { //$NON-NLS-0$
				this._afterHiding();
			}
			var self = this;
			if (!this.keepAlive) {
				window.setTimeout(function() { self.destroy(); }, 0);
			}
		}, 
		
		/*
		 * Internal.  Shows the dialog.  Clients should use the before and after
		 * hooks (_beforeShowing, _afterShowing) to do any work related to showing the dialog,
		 * such as setting initial focus.
		 */
		show: function(near) {
			if (typeof this._beforeShowing === "function") { //$NON-NLS-0$
				this._beforeShowing();
			}
			var rect = lib.bounds(this.$frame);
			var totalRect = lib.bounds(document.documentElement);
			var left, top;
			if (near) {
				var refRect = lib.bounds(near);
				top = refRect.top + refRect.height + 4;  // a little below
				left = refRect.left + 4; // a little offset from the left
				if (top + rect.height > totalRect.height) {
					top = Math.max(0, totalRect.height - rect.height - 4);  
				}
				if (left + rect.width > totalRect.width) {
					left = Math.max(0, totalRect.width - rect.width - 4);  
				}
			} else {
				// centered
				left = Math.max(0, (totalRect.width - rect.width) / 2);
				top = Math.max(0, (totalRect.height - rect.height) / 2);
			}
			this.$lastFocusedElement = document.activeElement;
			this.$frame.style.top = top + "px"; //$NON-NLS-0$
			this.$frame.style.left = left + "px"; //$NON-NLS-0$ 
			this.$frame.classList.add("dialogShowing"); //$NON-NLS-0$
			if (typeof this._afterShowing === "function") { //$NON-NLS-0$
				this._afterShowing();
			}
			if (!this.customFocus) {
				// We should set the focus.  Pick the first tabbable content field, otherwise use default button.
				// If neither, find any button at all.
				var focusField = this._getFirstFocusField();
				focusField.focus();
			}
		},
		
		_getFirstFocusField: function() {
			return lib.firstTabbable(this.$parent) || 
				this._defaultButton ||
				lib.firstTabbable(this.$buttonContainer) ||
				this.$close;
		},
		
		/*
		 * Internal.  Cleanup and remove dom nodes.
		 */
		destroy: function() {
			if (this._addedBackdrop && this._addedBackdrop.length > 0) {
				this._addedBackdrop.forEach(function(node) { //$NON-NLS-0$
					node.classList.remove("modalBackdrop"); //$NON-NLS-0$
				});
			}
			this.$frameParent.removeEventListener("focus", this._modalListener, true); //$NON-NLS-0$
			this.$frameParent.removeEventListener("click", this._modalListener, true); //$NON-NLS-0$
			this.$frameParent.removeChild(this.$frame);
			this.$frame = undefined;
			this.$parent = undefined;
		}
	};
	
	Dialog.prototype.constructor = Dialog;

	//return the module exports
	return {Dialog: Dialog};
});
