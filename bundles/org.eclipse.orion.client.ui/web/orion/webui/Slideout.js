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
	'orion/objects',
	'orion/webui/littlelib',
	'text!orion/webui/Slideout.html'
], function(
	objects, lib, SlideoutTemplate
) {
	var VISIBILITY_TRANSITION_MS = 200; /* this should be equivalent to the transition duration set on .slideoutWrapper in Slideout.css */
	
	/**
	 * Creates a generic slideout which can be appended to any dom node.
	 * 
	 * This slideout is designed to have interchangeable content. Content
	 * providers should extend the @ref orion.webui.SlideoutViewMode class.
	 * 
	 * @param {DOMNode} parentNode The DOM node which this slideout will be appended to
	 */
	function Slideout(parentNode) {
		this._parentNode = parentNode;
		this._initialize();
	}

	objects.mixin(Slideout.prototype, /** @lends orion.webui.Slideout.prototype */ {
		_initialize: function() {
			var range = document.createRange();
			range.selectNode(this._parentNode);
			var domNodeFragment = range.createContextualFragment(SlideoutTemplate);
			this._parentNode.appendChild(domNodeFragment);
			
			this._wrapperNode = lib.$(".slideoutWrapper", this._parentNode); //$NON-NLS-0$
			
			this._contentNode = lib.$(".slideoutContent", this._wrapperNode); //$NON-NLS-0$
			
			this._dismissButton = lib.$(".dismissButton", this._wrapperNode); //$NON-NLS-0$
			this._dismissButton.addEventListener("click", function(){ //$NON-NLS-0$
				if (this._currentViewMode) {
					this._currentViewMode.hide();
				} else {
					this.hide();
				}
			}.bind(this));
			
			this.hide(); // should already be hidden but calling this to add extra visibility=hidden CSS class
		},
		
		/**
		 * @return The DOM node which will hold this slideout's content
		 */
		getContentNode: function() {
			return this._contentNode;
		},
		
		/**
		 * @return The document.activeElement that was set when this slideout's
		 * @ref show() method was called.
		 */
		getPreviousActiveElement: function() {
			return this._previousActiveElement;
		},
		
		/**
		 * @return The @ref orion.webui.SlideoutViewMode that was last passed
		 * to this slideout's @ref show() method.
		 */
		getCurrentViewMode: function() {
			return this._currentViewMode;
		},
		
		/**
		 * @return True if this slideout is visible, false otherwise
		 */
		isVisible: function() {
			return this._wrapperNode.classList.contains("slideoutWrapperVisible"); //$NON-NLS-0$
		},

		/**
		 * Makes this slideout visible.
		 * 
		 * If the specified @ref slideoutViewMode is different from the 
		 * @ref _currentViewMode the contents of this slideout's content 
		 * are replaced with the contents of the specified @ref slideoutViewMode
		 * first.
		 * 
		 * @param {orion.webui.SlideoutViewMode} slideoutViewMode The view mode with the contents of the slideout to be shown
		 */
		show: function(slideoutViewMode) {
			this._previousActiveElement = document.activeElement;
			
			// replace _contentNode's contents
			if (this._currentViewMode !== slideoutViewMode) {
				lib.empty(this._contentNode);
				this._contentNode.appendChild(slideoutViewMode.getWrapperNode());
				this._currentViewMode = slideoutViewMode;
			}
			
			// step 1: remove the CSS visibility=hidden extra safeguard
			if (this._visibilityTransitionTimeout) {
				window.clearTimeout(this._visibilityTransitionTimeout);
				this._visibilityTransitionTimeout = null;
			}
			this._wrapperNode.classList.remove("slideoutNoVisibility"); //$NON-NLS-0$
			
			// step 2: add CSS class to position slideout within visible range
			this._wrapperNode.classList.add("slideoutWrapperVisible"); //$NON-NLS-0$
		},
		
		/**
		 * Hides the slideout.
		 */
		hide: function() {
			// remove focus from activeElement if it is child of slideout
			var activeElement = document.activeElement;
			while (activeElement) {
				if (this._wrapperNode === activeElement) {
					document.activeElement.blur();
				}
				activeElement = activeElement.parentNode;
			}
			
			this._previousActiveElement = null;
			
			// step 1: remove CSS class which positions slideout within visible range
			this._wrapperNode.classList.remove("slideoutWrapperVisible"); //$NON-NLS-0$
			
			// step 2: after the slide-in transition has completed, set the 
			// CSS visibility attribute to hidden as an extra safeguard
			this._visibilityTransitionTimeout = window.setTimeout(function() {
				this._wrapperNode.classList.add("slideoutNoVisibility"); //$NON-NLS-0$
			}.bind(this), VISIBILITY_TRANSITION_MS);
		}
	});
	
	/**
	 * This class controls all the content and the behavior that will be displayed
	 * by a slideout. A single slideout can display several SlideoutViewModes.
	 * 
	 * @param {orion.webui.Slideout} slideout The slideout which will display the contents of this view mode.
	 * 
	 * @note Users must override the @ref getWrapperNode() method
	 */
	function SlideoutViewMode(slideout) {
		this._slideout = slideout;
		this._parentNode = slideout.getContentNode();
	}
	
	objects.mixin(SlideoutViewMode.prototype, /** @lends orion.webui.SlideoutViewMode.prototype */ {
		/**
		 * Makes the associated slideout display the contents of this view mode.
		 */
		show: function() {
			this._slideout.show(this);
		},
		/**
		 * Hides the associated slideout.
		 */
		hide: function() {
			this._slideout.hide();
		},
		/**
		 * @return The DOM node which wraps the contents of this view mode.
		 * 
		 * @note This method MUST be overriden
		 */
		getWrapperNode: function() {
			throw new Error("this function must be overriden"); //$NON-NLS-0$
		}
	});
	

	return {
		Slideout: Slideout,
		SlideoutViewMode: SlideoutViewMode
	};
});
