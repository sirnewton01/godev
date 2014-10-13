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
/*eslint-env browser, amd*/
// Encoding Shim -- see http://encoding.spec.whatwg.org/
(function(global) {
	function EncodingError() {
		Error.apply(this, arguments);
	}
	EncodingError.prototype = new Error();
	EncodingError.prototype.constructor = EncodingError;
	EncodingError.prototype.name = "EncodingError";

	function between(value, min, max) {
		return value >= min && value <= max;
	}

	function TextDecoder(label, options) {
		var encoding = label || "utf-8";
		if (encoding !== "utf-8" && encoding !== "utf8" && encoding !== "unicode-1-1-utf-8") {
			throw new TypeError("only utf-8 supported");
		}
		Object.defineProperties(this, {
			encoding: {
				value: encoding,
				enumerable: true
			},
			_fatal: {
				value: options && options.fatal
			},
			_saved: {
				value: [],
				writable: true
			},
			_checkBOM: {
				value: true,
				writable: true
			}
		});
	}
	TextDecoder.prototype.decode = function(input, options) {
		input = (input instanceof Uint8Array) ? input : new Uint8Array(input);
		var first, second, third, fourth, point;
		var stream = options && options.stream;
		var savedlen = this._saved.length;
		var inputlen = input.length;
		var offset = 0;
		var used = 0;
		var charCodes = new Uint16Array(inputlen + savedlen);
		var written = 0;

		function onError() {
			if (this._fatal) {
				this._saved.length = savedlen = 0;
				used = offset;
				this._checkBOM = this._checkBOM || !stream;
				throw new EncodingError();
			}
			charCodes[written++] = 0xFFFD;
		}
		
		if (this._checkBOM && inputlen) {
			if ((savedlen + inputlen) > 2) {
				for (var i = savedlen; i < 3; i++) {
					this._saved.push(input[offset++]);
				}
				if (this._saved[0] !== 0xEF || this._saved[1] !== 0xBB || this._saved[2] !== 0xBF) {
					offset = 0;
					this._saved.length = savedlen;
				} else {
					savedlen = this._saved.length -= 3;
				}
				this._checkBOM = false;
			} else if (stream) {
				while (offset < inputlen) {
					this._saved.push(input[offset++]);
				}
			}
		}
		while (offset < inputlen) {
			first = savedlen > 0 ? this._saved[0] : input[offset++];
			if (first < 0x80) {
				charCodes[written++] = first;
			} else if (between(first, 0xC2, 0xDF)) {
				if (offset === inputlen) break;
				second = savedlen > 1 ? this._saved[1] : input[offset++];
				if (!between(second, 0x80, 0xBF)) {
					onError();
					continue;
				}
				charCodes[written++] = ((first & 0x1F) << 6) | (second & 0x3F);
			} else if (between(first, 0xE0, 0xEF)) {
				if (offset === inputlen) break;
				second = savedlen > 1 ? this._saved[1] : input[offset++];
				if ((first === 0xE0 && !between(second, 0xA0, 0xBF)) || (first === 0xED && !between(second, 0x80, 0x9F)) || !between(second, 0x80, 0xBF)) {
					onError();
					continue;
				}
				if (offset === inputlen) break;
				third = savedlen > 2 ? this._saved[2] : input[offset++];
				if (!between(third, 0x80, 0xBF)) {
					onError();
					continue;
				}
				charCodes[written++] = ((first & 0x0F) << 12) | ((second & 0x3F) << 6) | (third & 0x3F);
			} else if (between(first, 0xF0, 0xF4)) {
				if (offset === inputlen) break;
				second = savedlen > 1 ? this._saved[1] : input[offset++];
				if ((first === 0xF0 && !between(second, 0x90, 0xBF)) || (first === 0xF4 && !between(second, 0x80, 0x8F)) || !between(second, 0x80, 0xBF)) {
					onError();
					continue;
				}
				if (offset === inputlen) break;
				third = savedlen > 2 ? this._saved[2] : input[offset++];
				if (!between(third, 0x80, 0xBF)) {
					onError();
					continue;
				}
				if (offset === inputlen) break;
				fourth = input[offset++];
				if (!between(fourth, 0x80, 0xBF)) {
					onError();
					continue;
				}
				point = (((first & 0x07) << 18) | ((second & 0x3F) << 12) | ((third & 0x3F) << 6) | (fourth & 0x3F)) & 0xFFFF;
				charCodes[written++] = (point >> 10) | 0xD800;
				charCodes[written++] = (point & 0x3FF) | 0xDC00;
			} else onError();
			used = offset;
			if (savedlen) {
				this._saved.length = savedlen = 0;
			}
		}
		while (used !== offset) {
			this._saved.push(input[used++]);
		}
		this._checkBOM = this._checkBOM || !stream;
		if (!stream && this._saved.length !== 0) {
			throw new EncodingError();
		}
		var result = [];
		for (var begin = 0; begin < written; begin += 0x10000) {
			result.push(String.fromCharCode.apply(null, charCodes.subarray(begin, Math.min(written, begin + 0x10000))));
		}
		return result.join("");
	};

	function TextEncoder(utfLabel) {
		var encoding = utfLabel || "utf-8";
		if (encoding !== "utf-8" && encoding !== "utf8" && encoding !== "unicode-1-1-utf-8") {
			throw new TypeError("only utf-8 supported");
		}
		Object.defineProperties(this, {
			encoding: {
				value: encoding,
				enumerable: true
			},
			_saved: {
				value: null,
				writable: true
			}
		});
	}
	TextEncoder.prototype.encode = function(input, options) {
		input = String(input !== undefined ? input : "");
		var first, second, point;
		var stream = options && options.stream;
		var inputlen = input.length;
		var offset = 0;
		var utf8 = new Uint8Array(3 * (inputlen + (this._saved === null ? 0 : 1)));
		var written = 0;

		while (offset < inputlen) {
			if (this._saved === null) {
				first = input.charCodeAt(offset++);
			} else {
				first = this._saved;
				this._saved = null;
			}
			if (first < 0x80) {
				utf8[written++] = first;
			} else if (first < 0x800) {
				utf8[written++] = 0xC0 | (first >> 6);
				utf8[written++] = 0x80 | (first & 0x3F);
			} else if (first < 0xD800 || first > 0xDBFF) {
				utf8[written++] = 0xE0 | (first >> 12);
				utf8[written++] = 0x80 | ((first >> 6) & 0x3F);
				utf8[written++] = 0x80 | (first & 0x3F);
			} else {
				if (offset < inputlen) {
					second = input.charCodeAt(offset++);
				} else if (stream) {
					this._saved = first;
					break;
				} else throw new EncodingError();
				if (!between(second, 0xDC00, 0xDFFF)) {
					throw new EncodingError();
				}
				point = 0x10000 | ((first & 0x03FF) << 10) | (second & 0x03FF);
				utf8[written++] = 0xF0 | (point >> 18);
				utf8[written++] = 0x80 | ((point >> 12) & 0x3F);
				utf8[written++] = 0x80 | ((point >> 6) & 0x3F);
				utf8[written++] = 0x80 | (point & 0x3F);
			}
		}
		if (!stream && this._saved !== null) {
			throw new EncodingError();
		}
		return utf8.buffer.slice ? new Uint8Array(utf8.buffer.slice(0, written)) : utf8.subarray(0, written);
	};

	global.TextDecoder = global.TextDecoder || TextDecoder;
	global.TextEncoder = global.TextEncoder || TextEncoder;
}((typeof global === "undefined") ? this || self : global));