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
/*global document window StopIteration*/
// URL Shim -- see http://url.spec.whatwg.org/ and http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html

(function() {
	try {
		if (typeof window.URL === "function" && window.URL.length !== 0 && new window.URL("http://www.w3.org").protocol === "http:") {
			return;
		}
	} catch (e) {}

	var _USERNAME_PASSWORD_RE = /([^:]*):?(.*)/;
	var STOP_ITERATION = typeof StopIteration !== "undefined" ? StopIteration : new Error("Stop Iteration");
	var DEFAULT_PORTS = {
	    "ftp:": "21",
	        "file:": "",
	        "gopher:": "70",
	        "http:": "80",
	        "https:": "443",
	        "ws:": "80",
	        "wss:": "443"
	};

	function _parseSearch(search) {
	    return search ? search.slice(1).split("&") : [];
	}

	function _stringifySearch(pairs) {
		if (pairs.length === 0) {
			return "";
		}
		return "?" + pairs.join("&");
	}

	function _parsePair(pair) {
		var parsed = /([^=]*)(?:=?)(.*)/.exec(pair);
		var key = parsed[1] ? decodeURIComponent(parsed[1]) : "";
		var value = parsed[2] ? decodeURIComponent(parsed[2]) : "";
		return [key, value];
	}

	function _stringifyPair(entry) {
		var pair = encodeURIComponent(entry[0]);
		if (entry[1]) {
			pair += "=" + encodeURIComponent(entry[1]);
		}
		return pair;
	}

	function _createMapIterator(anchor, kind) {
		var search = "";
		var pairs = [];
		var index = 0;
		return {
			next: function() {
				if (search !== anchor.search) {
					search = anchor.search;
					pairs = _parseSearch(search);
				}
				if (index < pairs.length) {
					var entry = _parsePair(pairs[index++]);
					switch (kind) {
						case "keys":
							return entry[0];
						case "values":
							return entry[1];
						case "keys+values":
							return [entry[0], entry[1]];
						default:
							throw new TypeError();
					}
				}
				throw STOP_ITERATION;
			}
		};
	}

	function _checkString(txt) {
		if (typeof txt !== "string") {
			throw new TypeError();
		}
	}

	function _isValidURL(anchor) {
		var protocol = anchor.protocol;
		if (!protocol || protocol === ":" || (protocol === "http:" && !anchor.hostname)) {
			return false;
		}
		return true;
	}

	// See http://url.spec.whatwg.org/#interface-urlquery
	function URLQuery(anchor) {
		Object.defineProperty(this, "_anchor", {
			value: anchor
		});
	}

	Object.defineProperties(URLQuery.prototype, {
		get: {
			value: function(key) {
				_checkString(key);
				var result;
				var pairs = _parseSearch(this._anchor.search);
				pairs.some(function(pair) {
					var entry = _parsePair(pair);
					if (entry[0] === key) {
						result = entry[1];
						return true;
					}
				});
				return result;
			},
			enumerable: true
		},
		set: {
			value: function(key, value) {
				_checkString(key);
				_checkString(value);
				var pairs = _parseSearch(this._anchor.search);
				var found = pairs.some(function(pair, i) {
					var entry = _parsePair(pair);
					if (entry[0] === key) {
						entry[1] = value;
						pairs[i] = _stringifyPair(entry);
						return true;
					}
				});
				if (!found) {
					pairs.push(_stringifyPair([key, value]));
				}
				this._anchor.search = _stringifySearch(pairs);
			},
			enumerable: true
		},
		has: {
			value: function(key) {
				_checkString(key);
				var pairs = _parseSearch(this._anchor.search);
				return pairs.some(function(pair) {
					var entry = _parsePair(pair);
					if (entry[0] === key) {
						return true;
					}
				});
			},
			enumerable: true
		},
		"delete": {
			value: function(key) {
				_checkString(key);
				var pairs = _parseSearch(this._anchor.search);
				var filtered = pairs.filter(function(pair) {
					var entry = _parsePair(pair);
					return entry[0] !== key;
				});
				if (filtered.length !== pairs.length) {
					this._anchor.search = _stringifySearch(filtered);
					return true;
				}
				return false;
			},
			enumerable: true
		},
		clear: {
			value: function() {
				this._anchor.search = "";
			},
			enumerable: true
		},
		forEach: {
			value: function(callback, thisArg) {
				if (typeof callback !== "function") {
					throw new TypeError();
				}
				var iterator = _createMapIterator(this._anchor, "keys+values");
				try {
					while (true) {
						var entry = iterator.next();
						callback.call(thisArg, entry[1], entry[0], this);
					}
				} catch (e) {
					if (e !== STOP_ITERATION) {
						throw e;
					}
				}
			},
			enumerable: true
		},
		keys: {
			value: function() {
				return _createMapIterator(this._anchor, "keys");
			},
			enumerable: true
		},
		values: {
			value: function() {
				return _createMapIterator(this._anchor, "values");
			},
			enumerable: true
		},
		items: {
			value: function() {
				return _createMapIterator(this._anchor, "keys+values");
			}
		},
		size: {
			get: function() {
				return _parseSearch(this._anchor.search).length;
			},
			enumerable: true
		},
		getAll: {
			value: function(key) {
				_checkString(key);
				var result = [];
				var pairs = _parseSearch(this._anchor.search);
				pairs.forEach(function(pair) {
					var entry = _parsePair(pair);
					if (entry[0] === key) {
						result.push(entry[1]);
					}
				});
				return result;
			},
			enumerable: true
		},
		append: {
			value: function(key, value) {
				_checkString(key);
				_checkString(value);
				var pairs = _parseSearch(this._anchor.search);
				pairs.push(_stringifyPair([key, value]));
				this._anchor.search = _stringifySearch(pairs);
			},
			enumerable: true
		}
	});

	// See http://url.spec.whatwg.org/#api
	function URL(input, base) {
		input = input || "";
		if (typeof input !== "string") {
			throw new TypeError("url");
		}

		base = base ? base.href || base : "";
		if (typeof base !== "string") {
			throw new TypeError("base");
		}

		Object.defineProperty(this, "_input", {
			value: input,
			writable: true
		});

		var doc = document.implementation.createHTMLDocument("");
		if (base) {
			var baseAnchor = doc.createElement("a");
			baseAnchor.href = base;
			if (baseAnchor.protocol.length < 2 || !baseAnchor.host) {
				throw new Error("InvalidStateError");
			}
			var baseElement = doc.createElement("base");
			baseElement.href = baseAnchor.href;
			doc.head.appendChild(baseElement);
		}

		var urlAnchor = doc.createElement("a");
		urlAnchor.href = input;
		doc.body.appendChild(urlAnchor);
		Object.defineProperty(this, "_urlAnchor", {
			value: urlAnchor
		});
		var query = new URLQuery(urlAnchor);
		Object.defineProperty(this, "query", {
			get: function() {
				return _isValidURL(urlAnchor) ? query : null;
			},
			enumerable: true
		});
	}

	Object.defineProperties(URL.prototype, {
		href: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.href : this._input;
			},
			set: function(value) {
				_checkString(value);
				this._input = value;
				this._urlAnchor.href = value;
			},
			enumerable: true
		},
		origin: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.protocol + "//" + this._urlAnchor.host : "";
			},
			enumerable: true
		},
		protocol: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.protocol : ":";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.protocol = value;
			},
			enumerable: true
		},
		_userinfo: { // note: not part of spec so not enumerable
			get: function() {
				if (!_isValidURL(this._urlAnchor)) {
					return "";
				}
				var re = new RegExp("^" + this._urlAnchor.protocol + "(\\/\\/)(?:([^@]*)?@)?" + this._urlAnchor.host);
				var result = re.exec(this._urlAnchor.href);
				var userinfo = result[2];
				return userinfo || "";
			},
			set: function(value) {
				_checkString(value);
				var re = new RegExp("^" + this._urlAnchor.protocol + "(\\/\\/)(?:([^@]*)?@)?" + this._urlAnchor.host);
				var replacement = this._urlAnchor.protocol + "//" + (value ? value + "@" : "") + this._urlAnchor.host;
				this._urlAnchor.href = this._urlAnchor.href.replace(re, replacement);
			}
		},
		username: {
			get: function() {
				if (!_isValidURL(this._urlAnchor)) {
					return "";
				}
				var parsed = _USERNAME_PASSWORD_RE.exec(this._userinfo);
				var username = decodeURIComponent(parsed[1] || "");
				return username;
			},
			set: function(value) {
				_checkString(value);
				var parsed = _USERNAME_PASSWORD_RE.exec(this._userinfo);
				var userpass = [encodeURIComponent(value || "")];
				if (parsed[2]) {
					userpass.push(parsed[2]);
				}
				this._userinfo = userpass.join(":");
			},
			enumerable: true
		},
		password: {
			get: function() {
				if (!_isValidURL(this._urlAnchor)) {
					return "";
				}
				var parsed = _USERNAME_PASSWORD_RE.exec(this._userinfo);
				var password = decodeURIComponent(parsed[2] || "");
				return password;
			},
			set: function(value) {
				_checkString(value);
				var parsed = _USERNAME_PASSWORD_RE.exec(this._userinfo);
				var userpass = [parsed[1] || ""];
				if (value) {
					userpass.push(encodeURIComponent(value));
				}
				this._userinfo = userpass.join(":");
			},
			enumerable: true
		},
		host: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.host : "";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.host = value;
			},
			enumerable: true
		},
		hostname: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.hostname : "";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.hostname = value;
			},
			enumerable: true
		},
		port: {
			get: function() {
				var port = _isValidURL(this._urlAnchor) ? this._urlAnchor.port : "";
				if (port && port === DEFAULT_PORTS[this._urlAnchor.protocol]) {
					port = "";
				}
				return port;
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.port = value;
			},
			enumerable: true
		},
		pathname: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.pathname : "";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.pathname = value;
			},
			enumerable: true
		},
		search: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.search : "";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.search = value;
			},
			enumerable: true
		},
		hash: {
			get: function() {
				return _isValidURL(this._urlAnchor) ? this._urlAnchor.hash : "";
			},
			set: function(value) {
				_checkString(value);
				this._urlAnchor.hash = value;
			},
			enumerable: true
		}
	});

	if (window.URL && window.URL.createObjectURL) {
		Object.defineProperty(URL, "createObjectURL", {
			value: window.URL.createObjectURL.bind(window.URL),
			enumerable: false
		});

		Object.defineProperty(URL, "revokeObjectURL", {
			value: window.URL.revokeObjectURL.bind(window.URL),
			enumerable: false
		});
	}
	window.URL = URL;
}());