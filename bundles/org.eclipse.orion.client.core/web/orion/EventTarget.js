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
define(function() {
	/**
	 * Creates an Event Target
	 *
	 * @name orion.EventTarget
	 * @class Base for creating an Orion event target
	 */
	function EventTarget() {
		this._namedListeners = {};
	}

	EventTarget.prototype = /** @lends orion.EventTarget.prototype */
	{
		/**
		 * Dispatches a named event along with an arbitrary set of arguments. Any arguments after <code>eventName</code>
		 * will be passed to the event listener(s).
		 * @param {Object} event The event to dispatch. The event object MUST have a type field
		 * @returns {boolean} false if the event has been canceled and any associated default action should not be performed
		 * listeners (if any) have resolved.
		 */
		dispatchEvent: function(event) {
			if (!event.type) {
				throw new Error("unspecified type");
			}
			var listeners = this._namedListeners[event.type];
			if (listeners) {
				listeners.forEach(function(listener) {
					try {
						if (typeof listener === "function") {
							listener(event);
						} else {
							listener.handleEvent(event);
						}
					} catch (e) {
						if (typeof console !== 'undefined') {
							console.log(e); // for now, probably should dispatch an ("error", e)
						}
					}			
				});
			}
			return !event.defaultPrevented;
		},

		/**
		 * Adds an event listener for a named event
		 * @param {String} eventName The event name
		 * @param {Function} listener The function called when an event occurs
		 */
		addEventListener: function(eventName, listener) {
			if (typeof listener === "function" || listener.handleEvent) {
				this._namedListeners[eventName] = this._namedListeners[eventName] || [];
				this._namedListeners[eventName].push(listener);
			}
		},

		/**
		 * Removes an event listener for a named event
		 * @param {String} eventName The event name
		 * @param {Function} listener The function called when an event occurs
		 */
		removeEventListener: function(eventName, listener) {
			var listeners = this._namedListeners[eventName];
			if (listeners) {
				for (var i = 0; i < listeners.length; i++) {
					if (listeners[i] === listener) {
						if (listeners.length === 1) {
							delete this._namedListeners[eventName];
						} else {
							listeners.splice(i, 1);
						}
						break;
					}
				}
			}
		}
	};
	EventTarget.prototype.constructor = EventTarget;
	
	EventTarget.attach = function(obj) {
		var eventTarget = new EventTarget();
		obj.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
		obj.addEventListener = eventTarget.addEventListener.bind(eventTarget);
		obj.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
	};
	
	return EventTarget;
});