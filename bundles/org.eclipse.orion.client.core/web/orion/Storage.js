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
define(["orion/EventTarget"], function(EventTarget) {
	function StorageEvent(key, oldValue, newValue, storageArea, timeStamp) {
		return {
			type: "storage",
			key: key,
			oldValue: oldValue || null,
			newValue: newValue || null,
			url : "",
			storageArea: storageArea,
			timeStamp: timeStamp || new Date().getTime()
		};
	}

	// Should use an ES6 proxy for getter/setter/deleter -- someday
	function Storage(obj, prefix) {
		var _eventTarget = new EventTarget();
		var _keys;
		
		this.addEventListener = _eventTarget.addEventListener.bind(_eventTarget);
		this.removeEventListener = _eventTarget.removeEventListener.bind(_eventTarget);

		function _getKeys() {
			if (!_keys) {
				_keys = Object.keys(obj);
				if (prefix) {
					_keys = _keys.filter(function(key) {
						return key.indexOf(prefix) === 0;
					});
				}
			}
			return _keys;
		}
		
		this.key = function(index) {
			return _getKeys()[index];
		};
		
		this.getItem = function(key) {
			key = prefix ? prefix + key : key;
			var value = obj[key];
			_eventTarget.dispatchEvent({type: "_getItem", key: key, storage: obj});
			return value;
		};
		
		this.setItem = function(key, value) {
			key = prefix ? prefix + key : key;
			obj[key] = value;
			_keys = null;
			_eventTarget.dispatchEvent({type: "_setItem", key: key, value: value, storage: obj});
		};
		
		this.removeItem = function(key) {
			key = prefix ? prefix + key : key;
			delete obj[key];
			_keys = null;
			_eventTarget.dispatchEvent({type: "_removeItem", key: key, storage: obj});
		};
		
		this.clear = function() {
			_getKeys().forEach(function(key) {
				this.removeItem(key);
			}.bind(this));
		};
		
		this._update = function(key, value, timeStamp) {
			if (prefix && key.indexOf(prefix) !== 0) {
				return;
			}
			var oldValue = obj[key];
			obj[key] = value;
			key = key.substring(prefix.length);
			_eventTarget.dispatchEvent(new StorageEvent(key, oldValue, value, this, timeStamp));
		};
		
		this._dispatchUpdate = function(key, oldValue, newValue, timeStamp) {
			if (prefix && key.indexOf(prefix) !== 0) {
				return;
			}
			key = key.substring(prefix.length);
			_eventTarget.dispatchEvent(new StorageEvent(key, oldValue, newValue, this, timeStamp));
		};
		
		Object.defineProperty(this, "length", {
			get : function() {
				return _getKeys().length;
			}
		});
	}
	return Storage;
});