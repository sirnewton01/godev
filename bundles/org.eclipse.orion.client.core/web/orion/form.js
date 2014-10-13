/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
/*global escape*/
define([], function() {
	function x_www_form_urlencode(value) {
		return encodeURIComponent(value).replace(/[!'()*]/g, escape).replace('%20', '+'); //$NON-NLS-0$ //$NON-NLS-1$
	}

	/**
	 * @name orion.form
	 * @class Utilities for handling encoding.
	 */
	return /** @lends orion.form */ {
		/**
		 * Encodes an object of form fields and values into an <code>application/x-www-form-urlencoded</code> string.
		 * @static
		 * @param {Object} data The form data to encode.
		 * @returns {String} The <code>x-www-form-urlencoded</code> string.
		 */
		encodeFormData: function(data) {
			data = data || {};
			var paramNames = Object.keys(data);
			var buf = [];
			for (var i=0; i < paramNames.length; i++) {
				var param = paramNames[i], value = data[param];
				buf.push(x_www_form_urlencode(param) + '=' + x_www_form_urlencode(value)); //$NON-NLS-0$
			}
			return buf.join('&'); //$NON-NLS-0$
		},
		/**
		 * Encodes a string into an <a href="http://tools.ietf.org/html/rfc5023#section-9.7.1">RFC 5023</a>-compliant
		 * <tt>Slug</tt> header.
		 * @static
		 * @param {String} s The string to encode.
		 * @returns {String} The encoded <tt>Slug</tt>.
		 */
		encodeSlug: function(s) {
			return s.replace(/([^\u0020-\u007e]|%)+/g, encodeURIComponent);
		}
	};
});