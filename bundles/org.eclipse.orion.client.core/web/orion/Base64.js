/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(function() {

	var handlesWhitespace = (function(){
		try {
			return atob("AA==") === atob("A A = =");
		} catch(e) {
			return false;
		}
	})();

	function encode(buffer) {
		buffer = (buffer instanceof Uint8Array) ? buffer : new Uint8Array(buffer);
		var result = [];
		for (var i = 0, length = buffer.length; i < length; i += 0x10000) {
			result.push(String.fromCharCode.apply(null, buffer.subarray(i, Math.min(length, i + 0x10000))));
		}
		return btoa(result.join(""));
	}

	function decode(base64) {
		base64 = String(base64 !== undefined ? base64 : "");
		if (!handlesWhitespace) {
			base64 = base64.replace(/\s/g, '');			
		}
		var text = atob(base64);
		var length = text.length;
		var buffer = new Uint8Array(length);
		for (var i = 0; i < length; i++) {
			buffer[i] = text.charCodeAt(i);
		}
		return buffer;
	}
	return {
		encode: encode,
		decode: decode
	};
});