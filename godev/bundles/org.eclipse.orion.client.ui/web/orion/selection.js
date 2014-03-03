/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
 /*global define */
 
define(["orion/EventTarget", "orion/Deferred"], function(EventTarget, Deferred){

	/**
	 * Constructs a new selection service. Clients should obtain a selection service
	 * by requesting the service <code>orion.page.selection</code> from the service registry.
	 * This service constructor is only intended to be used by page service registry
	 * initialization code.
	 * @name orion.selection.Selection
	 * @class Can provide one or more selections describing objects of interest.  Used to
	 * establish input and output relationships between components.  For example, the selection
	 * in one component can serve as the input of another component.
	 */	
	function Selection(serviceRegistry, selectionServiceId) {
		if (!selectionServiceId) {
			selectionServiceId = "orion.page.selection"; //$NON-NLS-0$
		}
		
		this._serviceRegistry = serviceRegistry;
		EventTarget.attach(this);
		this._serviceRegistration = serviceRegistry.registerService(selectionServiceId, this);
		this._selections = null;  // so we can quickly recognize the "empty" case without comparing arrays.
	}
	 
	Selection.prototype = /** @lends orion.selection.Selection.prototype */ {
		/**
		 * Obtains the current single selection and passes it to the provided function.
		 * @param {Function} onDone The function to invoke with the selection. Deprecated: just use the return value instead.
		 * @returns {Object}
		 */
		getSelection : function(onDone) {
			var result = this._getSingleSelection();
			if (typeof onDone === "function") { //$NON-NLS-0$
				onDone(result);
			}
			return result;
		},
		
		/**
		 * Obtains all current selections and passes them to the provided function.
		 * @param {Function} onDone The function to invoke with the selections. Deprecated: just use the return value instead.
		 * @returns {Array}
		 */
		getSelections: function(onDone) {
			var result = Array.isArray(this._selections) ? this._selections.slice() : [];
			if (typeof onDone === "function") { //$NON-NLS-0$
				onDone(result);
			}
			return result;
		},
		
		_getSingleSelection: function() {
			if (this._selections && this._selections.length > 0) {
				return this._selections[0];
			} 
			return null;
		},
		
		/**
		 * Sets the current selection. Dispatches a <code>selectionChanged</code> event.
		 * @param {Object|Object[]|null} itemOrArray A single selected item, or an array of selected items, or <code>null</code> (meaning no selection).
		 * @see orion.selection.Selection#event:selectionChanged
		 */
		setSelections: function(itemOrArray) {
			var oldSelection = this._selections;
			if (Array.isArray(itemOrArray)) {	
				this._selections = itemOrArray.length > 0 ? itemOrArray.slice() : null;
			} else if (itemOrArray) {
				this._selections = [itemOrArray];
			} else {
				this._selections = null;
			}
			if (oldSelection !== this._selections) {
				this.dispatchEvent({type:"selectionChanged", selection: this._getSingleSelection(), selections: this._selections}); //$NON-NLS-0$
			}
		}
		/**
		 * Dispatched when the selection has changed.
		 * @name orion.selection.Selection#selectionChanged
		 * @class
		 * @event
		 * @param {selectionChangedEvent} selectionChangedEvent
		 * @param {Object} selectionChangedEvent.selection The selected item. If there is no selection, this field is <code>null</code>. If multiple items are selected,
		 * this field refers to the first item in the list.
		 * @param {Object[]} selectionChangedEvent.selections The selected items. If there is no selection, this field is <code>null</code>.
		 * @param {String} selectionChangedEvent.type The type event type. Value is always <code>"selectionChanged"</code>.
		 */
	};
	Selection.prototype.constructor = Selection;

	//return module exports
	return {Selection: Selection};
});