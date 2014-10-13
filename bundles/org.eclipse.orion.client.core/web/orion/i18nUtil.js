/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define(['require', 'orion/Deferred'], function(require, Deferred) {

	var messageBundleDeffereds = {};

	/**
	 * Performs string substitution. Can be invoked in 2 ways:
	 *
	 * i) vargs giving numbered substition values:
	 *   formatMessage("${0} is ${1}", "foo", "bar")  // "foo is bar"
	 *
	 * ii) a map giving the substitutions:
	 *   formatMessage("${thing} is ${1}", {1: "bar", thing: "foo"})  // "foo is bar"
	 */
	function formatMessage(msg) {
		var pattern = /\$\{([^\}]+)\}/g, args = arguments;
		if (args.length === 2 && args[1] && typeof args[1] === "object") {
			return msg.replace(pattern, function(str, key) {
				return args[1][key];
			});
		}
		return msg.replace(pattern, function(str, index) {
			return args[(index << 0) + 1];
		});
	}

	function getCachedMessageBundle(name) {
		var item = localStorage.getItem('orion/messageBundle/' + name);
		if (item) {
			var bundle = JSON.parse(item);
			if (bundle._expires && bundle._expires > new Date().getTime()) {
				delete bundle._expires;
				return bundle;
			}
		}
		return null;
	}

	function setCachedMessageBundle(name, bundle) {
		bundle._expires = new Date().getTime() + 1000 * 900; //15 minutes
		localStorage.setItem('orion/messageBundle/' + name, JSON.stringify(bundle));
		delete bundle._expires;
	}

	function getMessageBundle(name) {
		if (messageBundleDeffereds[name]) {
			return messageBundleDeffereds[name];
		}

		var d = new Deferred();
		messageBundleDeffereds[name] = d;

		var cached = getCachedMessageBundle(name);
		if (cached) {
				d.resolve(cached);
				return d;
		}

		function _resolveMessageBundle(bundle) {
			if (bundle) {
				require(['i18n!' + name], function(bundle) { //$NON-NLS-0$
					if (bundle) {
						setCachedMessageBundle(name, bundle);
					}
					d.resolve(bundle);
				});
			} else {
				// IE disguises failure as success, see https://bugs.eclipse.org/bugs/show_bug.cgi?id=428797
				_rejectMessageBundle(new Error(name));
			}
		}

		function _rejectMessageBundle(error) {
			d.reject(error);
		}

		try {
			require([name], _resolveMessageBundle, _rejectMessageBundle);
		} catch (ignore) {
			require(['orion/i18n!' + name], _resolveMessageBundle, _rejectMessageBundle); //$NON-NLS-0$
		}
		return d;
	}
	return {
		getMessageBundle: getMessageBundle,
		formatMessage: formatMessage
	};
});