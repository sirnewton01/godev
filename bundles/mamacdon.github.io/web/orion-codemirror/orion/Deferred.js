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
/*global define*/
(function() {
	var global = this;
	if (!global.define) {
		global.define = function(f) {
			global.orion = global.orion || {};
			global.orion.Deferred = f();
			delete global.define;
		};
	}
}());

define(function() {
	var head, tail, remainingHead, remainingTail, running = false;
	var NOQUEUE = true;

	// handles deferred notification without blowing the stack
	function queueNotification(notify) {
		if (NOQUEUE) {
			notify();
			return;
		}
		if (running) {
			if (!head) {
				head = {
					notify: notify,
					next: null
				};
				tail = head;
			} else {
				tail.next = {
					notify: notify,
					next: null
				};
				tail = tail.next;
			}
			return;
		}
		running = true;
		do {
			while (notify) {
				notify();
				if (remainingHead) {
					if (!head) {
						head = remainingHead;
					} else {
						tail.next = remainingHead;
					}
					tail = remainingTail;
				}
				if (head) {
					remainingHead = head.next;
					remainingTail = tail;
					notify = head.notify;
					head = tail = null;
				} else {
					notify = null;
				}
			}
			running = false;
		} while (running);
	}
	
	function noReturn(fn) {
		return function() {
			fn.apply(null, arguments);
		};
	}

	function Deferred(optOnCancel) {
		var result, state, head, tail, canceled = false, promise;

		function notify() {
			while (head) {
				var listener = head;
				head = head.next;
				var deferred = listener.deferred;
				var methodName = (state === "resolved") ? "resolve" : "reject";
				if (listener[methodName]) {
					try {
						var listenerResult = listener[methodName](result);
						if (listenerResult && typeof listenerResult.then === "function") { //$NON-NLS-0$
							listener.cancel = listenerResult.cancel;
							listenerResult.then(noReturn(deferred.resolve), noReturn(deferred.reject), deferred.progress);
							continue;
						}
						deferred.resolve(listenerResult);
					} catch (e) {
						deferred.reject(e);
					}
				} else {
					deferred[methodName](result);
				}
			}
			head = tail = null;
		}

		function checkFulfilled(strict) {
			if (state) {
				if (strict) {
					throw new Error("already " + state); //$NON-NLS-0$
				}
				return true;
			}
			return false;
		}

		this.cancel = function(reason, strict) {
			if (checkFulfilled(strict)) {
				return canceled ? result.message : null;
			}
			canceled = true;
			if (optOnCancel) {
				try {
					reason = optOnCancel(reason) || reason;
				} catch(e) {
					// do not let this error escape
				}
			}
			reason = reason || "canceled";
			state = "rejected"; //$NON-NLS-0$
			result = new Error(reason); //$NON-NLS-0$
			queueNotification(notify);
			return reason;
		};

		this.resolve = function(value, strict) {
			if (!checkFulfilled(strict)) {	
				state = "resolved"; //$NON-NLS-0$
				result = value;
				queueNotification(notify);
			}
			return promise;
		};

		this.reject = function(error, strict) {
			if (!checkFulfilled(strict)) {
				state = "rejected"; //$NON-NLS-0$
				result = error;
				queueNotification(notify);
			}
			return promise;
		};

		this.progress = function(update, strict) {
			if (!checkFulfilled(strict)) {
				var listener = head;
				while (listener) {
					if (listener.progress) {
						try {
							listener.progress(update);
						} catch (e) {}
					}
					listener = listener.next;
				}
			}
			return promise;
		};
		
		this.then = function(onResolve, onReject, onProgress) {
			var listener = {
				resolve: onResolve,
				reject: onReject,
				progress: onProgress,
				cancel: this.cancel,
				deferred: new Deferred(function(reason) {
					return listener.cancel && listener.cancel(reason);
				})
			};
			if (head) {
				tail.next = listener;
			} else {
				head = listener;
			}
			tail = listener;
			if (state) {
				queueNotification(notify);
			}
			return listener.deferred.promise;
		};

		this.isResolved = function() {
			return state === "resolved";
		};

		this.isRejected = function() {
			return state === "rejected";
		};

		this.isFulfilled = function() {
			return !!state;
		};

		this.isCanceled = function() {
			return canceled;
		};

		promise = {
			then: this.then,
			cancel: this.cancel,
			isResolved: this.isResolved,
			isRejected: this.isRejected,
			isFulfilled: this.isFulfilled,
			isCanceled: this.isCanceled
		};
		this.promise = promise;
		
		//for jQuery compatibility
		this.notify = this.progress;
		this.state = function() {
			return state || "pending"; //$NON-NLS-0$
		};
		this.promise.state = this.state;
	}

	Deferred.all = function(promises, optOnError) {
		var count = promises.length,
			result = [],
			deferred = new Deferred();

		function onResolve(i, value) {
			if (!deferred.isFulfilled()) {
				result[i] = value;
				if (--count === 0) {
					deferred.resolve(result);
				}
			}
		}

		function onReject(i, error) {
			if (!deferred.isFulfilled()) {
				if (optOnError) {
					try {
						onResolve(i, optOnError(error));
						return;
					} catch (e) {
						error = e;
					}
				}
				deferred.reject(error);
			}
		}
		if (count === 0) {
			deferred.resolve(result);
		} else {
			promises.forEach(function(promise, i) {
				promise.then(onResolve.bind(null, i), onReject.bind(null, i));
			});
		}
		return deferred.promise;
	};

	Deferred.when = function(value, onResolve, onReject, onProgress) {
		var promise, deferred;
		if (value && typeof value.then === "function") { //$NON-NLS-0$
			promise = value;
		} else {
			deferred = new Deferred();
			deferred.resolve(value);
			promise = deferred.promise;
		}
		return promise.then(onResolve, onReject, onProgress);
	};

	return Deferred;
});