/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*jslint amd:true browser:true mocha:true*/
define([
	"chai/chai",
	"orion/Deferred",
	"orion/xhr",
	"orion/editor/eventTarget",
	"mocha/mocha"
], function(chai, Deferred, xhr, mEventTarget) {
	var assert = chai.assert;
	var EventTarget = mEventTarget.EventTarget;

	// https://bugs.eclipse.org/bugs/show_bug.cgi?id=400017
	var hasReadyStateOpenedBug = (function() {
		var x = new XMLHttpRequest();
		x.open('GET', '.', true);
		try {
			x.status; // In some browsers, this property access will throw
			return false;
		} catch (e) {
			return true;
		}
	}());

	// https://bugs.eclipse.org/bugs/show_bug.cgi?id=403103
	var hasSetResponseTypeBeforeOpenBug = (function() {
		try {
			new XMLHttpRequest().responseType = 'blob';
			return false;
		} catch (e) {
			return true;
		}
	}());

	// https://bugs.eclipse.org/bugs/show_bug.cgi?id=389034
	var hasSetTimeoutInWrongReadyStateBug = (function() {
		try {
			new XMLHttpRequest().timeout = 1;
			return false;
		} catch (e) {
			return true;
		}
	}());

	/**
	 * Fake version of XMLHttpRequest for testing without actual network accesses. Emulates the
	 * supported XHR features of the browser running the test as closely as possible.
	 */
	function MockXMLHttpRequest() {
		// Does browser understand timeout?
		if (typeof new XMLHttpRequest().timeout === 'number') {
			Object.defineProperty(this, 'timeout', {
				get: function() {
					return this._timeout;
				},
				set: function(/*value*/) {
					if (hasSetTimeoutInWrongReadyStateBug && (this.readyState !== this.OPENED || this._sendFlag)) {
						throw new Error('timeout must be set after calling open() but before calling send()');
					}
				}
			});
		}
		Object.defineProperty(this, 'readyState', {
			get: function() {
				return this._readyState;
			},
			set: function(readyState) {
				this._readyState = readyState;
				if (readyState === this.DONE) {
					if (this._aborted) {
						if (typeof this.onabort === 'function') {
							this.onabort();
						}
					} else {
						this.onload();
					}
				}
			}
		});
		Object.defineProperty(this, 'response', {
			get: function() {
				return this._responseText;
			},
			set: function(response) {
				// Bug 381396: emulate browser's non-support for 'response' attribute (eg. IE 9)
				if (typeof new XMLHttpRequest().response !== "undefined") {
					this._response = response;
				}
				if (this.responseType === '' || this.responseType === 'text') {
					this._responseText = response;
				}
			}
		});
		Object.defineProperty(this, 'responseType', {
			get: function() {
				return this._responseType;
			},
			set: function(responseType) {
				// Bug 403103: emulate browser's refusal to set exotic responseType prior to open() being called.
				if (hasSetResponseTypeBeforeOpenBug && this.readyState === this.UNSENT && responseType !== 'text' && responseType !== '') {
					throw new Error('Attempted to set responseType before calling open()');
				}
				this._responseType = responseType;
			}
		});
		Object.defineProperty(this, 'status', {
			get: function() {
				if (hasReadyStateOpenedBug && this.readyState === this.OPENED) {
					throw new Error('xhr in wrong readyState');
				} else if (this.readyState === this.UNSENT || this.readyState === this.OPENED || this._errorFlag) {
					return 0;
				}
				return this._status;
			},
			set: function(status) {
				this._status = status;
			}
		});
		Object.defineProperty(this, 'statusText', {
			get: function() {
				return this._statusText;
			},
			set: function(statusText) {
				this._statusText = statusText;
			}
		});
		this.readyState = this.UNSENT;
		this.headers = {};
		this._sendFlag = false;
		this._errorFlag = false;
		this._timeout = 0;
		this._aborted = false;
	}
	MockXMLHttpRequest.prototype = {
		UNSENT: 0,
		OPENED: 1,
		HEADERS_RECEIVED: 2,
		LOADING: 3,
		DONE: 4,
		open: function() {
			if (this.readyState !== this.UNSENT) {
				throw new Error('open called out of order');
			}
			this.readyState = this.OPENED;
		},
		send: function() {
			if (this.readyState !== this.OPENED) {
				throw new Error('send called out of order');
			}
			this._sendFlag = true;
		},
		setRequestHeader: function(name, value) {
			if (this.readyState !== this.OPENED) {
				throw new Error('setRequestHeader called out of order');
			}
			this.headers[name] = value;
		},
		abort: function() {
			this._aborted = true;
		},
		_getRequestHeaders: function() {
			return this.headers;
		},
		_fakeComplete: function(status, response, statusText) {
			this.status = status;
			if (arguments.length === 3) {
				this.statusText = statusText;
			}
			this.response = response;
			this.readyState = this.DONE;
		},
		_fakeTimeout: function(/*err*/) {
			this._errorFlag = true;
			if (typeof new XMLHttpRequest().timeout !== "undefined") {
				this.dispatchEvent({
					type: 'timeout'
				});
			}
		},
		_fakeProgressEvent: function(event) {
			if (typeof this.onprogress === 'function') {
				this.onprogress(event);
			}
		}
	};
	EventTarget.addMixin(MockXMLHttpRequest.prototype);

	/** A mock XHR request that succeeds. */
	function OkXhr() {
		MockXMLHttpRequest.apply(this, Array.prototype.slice.call(arguments));
		this.send = function() {
			MockXMLHttpRequest.prototype.send.call(this);
			var self = this;
			setTimeout(function() {
				self._fakeComplete(200, 'success!');
			}, 75);
		};
	}
	OkXhr.prototype = new MockXMLHttpRequest();

	/** A mock XHR request that 404s. */
	function FailXhr() {
		MockXMLHttpRequest.apply(this, Array.prototype.slice.call(arguments));
		this.send = function() {
			MockXMLHttpRequest.prototype.send.call(this);
			var self = this;
			setTimeout(function() {
				self._fakeComplete(404, 'i failed', '404 Bogus Failure');
			}, 100);
		};
	}
	FailXhr.prototype = new MockXMLHttpRequest();

	/** A mock XHR request that 404s. */
	function AbortXhr() {
		MockXMLHttpRequest.apply(this, Array.prototype.slice.call(arguments));
		this.send = function() {
			MockXMLHttpRequest.prototype.send.call(this);
			var self = this;
			setTimeout(function() {
				self.abort();
				self._fakeComplete(200, 'hmm');
			}, 100);
		};
	}
	AbortXhr.prototype = new MockXMLHttpRequest();


	function succeed(/*result*/) {
		var d = new Deferred();
		d.resolve.apply(d, Array.prototype.slice.call(arguments));
		return d;
	}

	function fail(/*err*/) {
		var d = new Deferred();
		d.reject.apply(d, Array.prototype.slice.call(arguments));
		return d;
	}

	describe("xhr", function() {
		describe("resolve", function() {
			it("should resolve on 200 GET", function() {
				return xhr('GET', '/', null, new OkXhr()).then(succeed, fail);
			});
			it("should provide a value with expected shape", function() {
				return xhr('GET', '/foo', {
					data: 'my request body',
					headers: {
						'X-Foo': 'bar'
					},
					log: true,
					responseType: 'text',
					timeout: 1500
				}, new OkXhr())
					.then(function(result) {
					assert.ok( !! result.args);
					assert.equal(result.args.data, 'my request body');
					assert.equal(result.args.headers['X-Foo'], 'bar');
					assert.equal(result.args.log, true);
					assert.ok(result.url);
					assert.equal(result.args.responseType, 'text');
					assert.equal(result.args.timeout, 1500);
					assert.equal(result.status, 200);
					assert.equal(result.responseText, 'success!');
					assert.equal(result.response, 'success!');
					assert.ok(result.xhr instanceof MockXMLHttpRequest);
				}, fail);
			});
		});
		describe("reject", function() {
			it("should reject on 404 GET", function() {
				return xhr('GET', '/bogus/url/that/doesnt/exist', null, new FailXhr()).then(fail, succeed);
			});
			it("should provide a value with expected shape", function() {
				return xhr('GET', '/bar', {
					data: 'my request body',
					headers: {
						'X-Foo': 'bar'
					},
					log: false,
					responseType: 'text',
					timeout: 1500
				}, new FailXhr())
					.then(fail, function(result) {
					assert.ok( !! result.args);
					assert.equal(result.args.data, 'my request body');
					assert.equal(result.args.headers['X-Foo'], 'bar');
					assert.equal(result.args.log, false);
					assert.equal(result.args.responseType, 'text');
					assert.equal(result.args.timeout, 1500);
					assert.ok(result.xhr instanceof MockXMLHttpRequest);
				});
			});
		});
		describe("headers", function() {
			it("should set \'X-Requested-With\' header", function() {
				var d = new Deferred();
				var headerCheckerXhr = new MockXMLHttpRequest();
				headerCheckerXhr.send = function() {
					MockXMLHttpRequest.prototype.send.call(this);
					var headers = this._getRequestHeaders();
					if (headers['X-Requested-With'] === 'XMLHttpRequest') {
						d.resolve();
					} else {
						d.reject();
					}
					this._fakeComplete(200, 'OK');
				};
				xhr('GET', '/', null, headerCheckerXhr);
				return d;
			});
			it("should GET with headers", function() {
				return xhr('GET', '/', {
					headers: {
						'X-Foo-Bar': 'baz'
					}
				}, new OkXhr()).then(succeed, fail);
			});
		});
		describe("bugs", function() {
			it("should reject if open() called more than once", function() {
				var alreadyOpenXhr = new OkXhr();
				alreadyOpenXhr.open('GET', '/foo');
				// Since request is already OPEN the next call to open() will throw, and xhr should catch & reject
				return xhr('GET', '/bar', null, alreadyOpenXhr).then(fail, succeed);
			});
			it("should tolerate responseType == \"blob\"", function() {
				// Bug 403103: ensure that an exotic responseType like 'blob' can be passed without causing errors.
				return xhr('GET', '/', {
					responseType: 'blob'
				}, new OkXhr());
			});
		});
		describe("progress", function() {
			it("should invoke Deferred progress listener", function() {
				//assert the Deferred's progress notification is invoked.
				var progressXhr = new OkXhr();
				var deferred = new Deferred();
				xhr('GET', '/foobar', {}, progressXhr).then(null, null, function(progressEvent) {
					try {
						assert.ok(progressEvent);
						assert.equal(progressEvent.loaded, 31337);
						deferred.resolve();
					} catch (e) {
						deferred.reject(e);
					}
				});
				progressXhr._fakeProgressEvent({
					loaded: 31337
				});
				return deferred;
			});
		});
		describe("timeout", function() {
			it("should reject", function() {
				var timeoutingXhr = new OkXhr();
				timeoutingXhr.send = function() {
					MockXMLHttpRequest.prototype.send.call(this);
					var self = this;
					setTimeout(function() {
						self._fakeTimeout();
					}, 50);
				};
				return xhr('GET', '/', {
					timeout: 25
				}, timeoutingXhr).then(fail, succeed);
			});
			it("should provide a value with expected shape", function() {
				var timeoutingXhr = new OkXhr();
				timeoutingXhr.send = function() {
					MockXMLHttpRequest.prototype.send.call(this);
					var self = this;
					setTimeout(function() {
						self._fakeTimeout();
					}, 50);
				};
				return xhr('GET', '/', {
					timeout: 25
				}, timeoutingXhr).then(fail, function(result) {
					assert.ok( !! result.args);
					assert.ok(!result.response);
					assert.ok(!result.responseText);
					assert.equal(result.status, 0);
					assert.equal(result.url, '/');
					assert.ok(result.xhr instanceof MockXMLHttpRequest);
					assert.ok( !! result.error);
				});
			});
		});
		describe("abort", function() {
			it("should reject with Cancel error", function() {
				return xhr('GET', '/', null, new AbortXhr()).then(assert.fail, function(error) {
					if (error instanceof Error && error.name === "Cancel") {
						return;
					}
					assert.fail(error);
				});
			});
		});
	});
});