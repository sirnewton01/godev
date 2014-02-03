/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*
 * Shim for Node events API
 * http://nodejs.org/api/events.html
 */
/*global console define*/
define([
	"orion/EventTarget",
	"orion/objects"
], function(EventTarget, objects) {
	var DEFAULT_MAX_LISTENERS = 10;

	function EventEmitter() {
		this._eventTarget = new EventTarget();
	}

	function addListener(eventName, listener) {
		if (typeof listener !== "function") {
			throw new Error("addListener only takes instances of Function");
		}
		var max = typeof this._maxListeners !== "undefined" ? this._maxListeners : DEFAULT_MAX_LISTENERS;
		var count;
		if (max !== 0 && (count = EventEmitter.listenerCount(this, eventName) >= max)) {
			if (typeof console !== "undefined") {
				console.error("Possible EventEmitter memory leak: " + count + " listeners added.");
			}
		}
		this.emit("newListener", listener);
		this._eventTarget.addEventListener(eventName, listener);
		return this;
	}

	EventEmitter.prototype.constructor = EventEmitter;
	objects.mixin(EventEmitter.prototype, {
		_maxListeners: 10,
		addListener: addListener,
		on: addListener,
		once: function(eventName, listener) {
			var emitter = this;
			var oneTimeListener = function(event) {
				try {
					listener.apply(this, Array.prototype.slice.call(arguments));
				} finally {
					emitter.removeListener(eventName, oneTimeListener);
				}
			};
			this.addListener(eventName, oneTimeListener);
			return this;
		},
		removeListener: function(eventName, listener) {
			if (typeof listener !== "function") {
				throw new Error("removeListener only takes instances of Function");
			}
			this._eventTarget.removeEventListener(eventName, listener);
			this.emit("removeListener", listener);
			return this;
		},
		removeAllListeners: function(eventName) {
			var namedListeners = this._eventTarget._namedListeners;
			var emitter = this;
			var removeAllListenersFor = function(eventName) {
				var listeners = namedListeners[eventName];
				if (!listeners) {
					return;
				}
				listeners.forEach(emitter.emit.bind(emitter, "removeListener"));
				delete namedListeners[eventName];
			};
			if (typeof eventName === "undefined") {
				Object.keys(namedListeners).forEach(removeAllListenersFor);
			} else {
				removeAllListenersFor(eventName);
			}
			return this;
		},
		setMaxListeners: function(n) {
			if (typeof n !== "number") {
				throw new Error("setMaxListeners only takes a number");
			}
			this._maxListeners = n;
		},
		listeners: function(eventName) {
			var listeners = this._eventTarget._namedListeners[eventName];
			return listeners ? listeners.slice() : [];
		},
		emit: function emit(eventName /*, arg1, arg2, ...*/) {
			var listeners = this._eventTarget._namedListeners[eventName];
			if (!listeners) {
				if (eventName === "error") {
					throw new Error("Uncaught, unspecified 'error' event.");
				}
				return false;
			}
			var args = Array.prototype.slice.call(arguments, 1);
			var emitter = this;
			listeners.forEach(function(listener) {
				// To match Node's behavior we intentionally allow an exception thrown by listener to blow up the stack.
				listener.apply(emitter, args);
			});
			return true;
		}
	});
	EventEmitter.listenerCount = function(emitter, eventName) {
		var listeners = emitter._eventTarget._namedListeners[eventName];
		return listeners ? listeners.length : 0;
	};

	return {
		EventEmitter: EventEmitter
	};
});