/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define window document navigator*/

define(['orion/webui/littlelib'], function(lib) {
                
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 * @class This class contains static utility methods.
	 * @name orion.uiUtils
	 */
	
	function getUserKeyStrokeString(binding) {
		var userString = "";
		var isMac = navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
	
		if (binding.mod1) {
			if (isMac) {
				userString+="Cmd+"; //$NON-NLS-0$
			} else {
				userString+="Ctrl+"; //$NON-NLS-0$
			}
		}
		if (binding.mod2) {
			userString += "Shift+"; //$NON-NLS-0$
		}
		if (binding.mod3) {
			userString += "Alt+"; //$NON-NLS-0$
		}
		if (binding.mod4 && isMac) {
			userString += "Ctrl+"; //$NON-NLS-0$
		}
		if (binding.alphaKey) {
			return userString+binding.alphaKey;
		}
		if (binding.type === "keypress") {
			return userString+binding.keyCode; 
		}
		for (var keyName in lib.KEY) {
			if (typeof(lib.KEY[keyName] === "number")) { //$NON-NLS-0$
				if (lib.KEY[keyName] === binding.keyCode) {
					return userString+keyName;
				}
			}
		}
		var character;
		switch (binding.keyCode) {
			case 59:
				character = binding.mod2 ? ":" : ";"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 61:
				character = binding.mod2 ? "+" : "="; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 188:
				character = binding.mod2 ? "<" : ","; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 190:
				character = binding.mod2 ? ">" : "."; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 191:
				character = binding.mod2 ? "?" : "/"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 192:
				character = binding.mod2 ? "~" : "`"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 219:
				character = binding.mod2 ? "{" : "["; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 220:
				character = binding.mod2 ? "|" : "\\"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 221:
				character = binding.mod2 ? "}" : "]"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			case 222:
				character = binding.mod2 ? '"' : "'"; //$NON-NLS-1$ //$NON-NLS-0$
				break;
			}
		if (character) {
			return userString+character;
		}
		if (binding.keyCode >= 112 && binding.keyCode <= 123) {
			return userString+"F"+ (binding.keyCode - 111); //$NON-NLS-0$
		}
		return userString+String.fromCharCode(binding.keyCode);
	}

	function getUserKeyString(binding) {
		var result = "";
		var keys = binding.getKeys();
		for (var i = 0; i < keys.length; i++) {
			if (i !== 0) {
				result += " "; //$NON-NLS-0$
			}
			result += getUserKeyStrokeString(keys[i]);
		}
		return result;
	}

	/**
	 * @name orion.uiUtils.getUserText
	 * @function
	 * @param {Object} options The options object
	 * @param {String} options.id
	 * @param {Element} options.refNode
	 * @param {Boolean} options.hideRefNode
	 * @param {String} options.initialText
	 * @param {Function} options.onComplete
	 * @param {Function} options.onEditDestroy
	 * @param {String} options.selectTo
	 * @param {Boolean} options.isInitialValid
	 * @param {Boolean} options.insertAsChild
	 */
	function getUserText(options) {
		var id = options.id;
		var refNode = options.refNode;
		var hideRefNode = options.hideRefNode;
		var initialText = options.initialText;
		var onComplete = options.onComplete;
		var onEditDestroy = options.onEditDestroy;
		var selectTo = options.selectTo;
		var isInitialValid = options.isInitialValid;
		var insertAsChild = options.insertAsChild;
		
		var done = false;
		var handler = function(isKeyEvent) {
			return function(event) {
				if (done) {
					return;
				}
				var editBox = lib.node(id),
					newValue = editBox.value;
				if (!editBox) {
					return;
				}
				if (isKeyEvent && event.keyCode === lib.KEY.ESCAPE) {
					if (hideRefNode) {
						refNode.style.display = "inline"; //$NON-NLS-0$
					}
					done = true;
					editBox.parentNode.removeChild(editBox);
					if (onEditDestroy) {
						onEditDestroy();
					}
					return;
				}
				if (isKeyEvent && event.keyCode !== lib.KEY.ENTER) {
					return;
				} else if (newValue.length === 0 || (!isInitialValid && newValue === initialText)) {
					if (hideRefNode) {
						refNode.style.display = "inline"; //$NON-NLS-0$
					}
					done = true;
				} else {
					onComplete(newValue);
					if (hideRefNode && refNode.parentNode) {
						refNode.style.display = "inline"; //$NON-NLS-0$
					}
					done = true;
				}
				// some clients remove temporary dom structures in the onComplete processing, so check that we are still in DOM
				if (editBox.parentNode) {
					editBox.parentNode.removeChild(editBox);
				}
				if (onEditDestroy) {
					onEditDestroy();
				}
			};
		};
	
		// Swap in an editable text field
		var editBox = document.createElement("input"); //$NON-NLS-0$
		editBox.id = id;
		editBox.value = initialText || "";
		if (insertAsChild) {
			refNode.appendChild(editBox);
		} else {
			refNode.parentNode.insertBefore(editBox, refNode.nextSibling);
		}
		editBox.classList.add("userEditBoxPrompt"); //$NON-NLS-0$
		if (hideRefNode) {
			refNode.style.display = "none"; //$NON-NLS-0$
		}				
		editBox.addEventListener("keydown", handler(true), false); //$NON-NLS-0$
		editBox.addEventListener("blur", handler(false), false); //$NON-NLS-0$
		window.setTimeout(function() { 
			editBox.focus(); 
			if (initialText) {
				var box = lib.node(id);
				var end = selectTo ? initialText.indexOf(selectTo) : -1;
				if (end > 0) {
					if(box.createTextRange) {
						var range = box.createTextRange();
						range.collapse(true);
						range.moveStart("character", 0); //$NON-NLS-0$
						range.moveEnd("character", end); //$NON-NLS-0$
						range.select();
					} else if(box.setSelectionRange) {
						box.setSelectionRange(0, end);
					} else if(box.selectionStart !== undefined) {
						box.selectionStart = 0;
						box.selectionEnd = end;
					}
				} else {
					box.select();
				}
			}
		}, 0);
	}
	
	/**
	 * Returns whether the given event should cause a reference
	 * to open in a new window or not.
	 * @param {Object} event The key event
	 * @name orion.util#openInNewWindow
	 * @function
	 */
	function openInNewWindow(event) {
		var isMac = window.navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$
		return (isMac && event.metaKey) || (!isMac && event.ctrlKey);
	}
	
	/**
	 * Opens a link in response to some event. Whether the link
	 * is opened in the same window or a new window depends on the event
	 * @param {String} href The link location
	 * @name orion.util#followLink
	 * @function
	 */
	function followLink(href, event) {
		if (event && openInNewWindow(event)) {
			window.open(href);
		} else {
			window.location = href;
		}
	}
	
	function createButton(text, callback) {
		var button = document.createElement("button"); //$NON-NLS-0$
		button.className = "orionButton commandButton commandMargins"; //$NON-NLS-0$
		button.addEventListener("click", function(e) { //$NON-NLS-0$
			callback();
			lib.stop(e);
		}, false);
		if (text) {
			button.appendChild(document.createTextNode(text));
		}
		return button;	
	}
	
	function createDropdownButton(parent, name, populateFunction) {
	}

	/**
	 * Returns whether <code>element</code> is an HTML5 form element.
	 * @param {Element} element
	 * @function
	 * @returns {Boolean}
	 */
	function isFormElement(element) {
		switch (element.tagName.toLowerCase()) {
			case "button": //$NON-NLS-0$
			case "fieldset": //$NON-NLS-0$
			case "form": //$NON-NLS-0$
			case "input": //$NON-NLS-0$
			case "keygen": //$NON-NLS-0$
			case "label": //$NON-NLS-0$
			case "legend": //$NON-NLS-0$
			case "meter": //$NON-NLS-0$
			case "optgroup": //$NON-NLS-0$
			case "output": //$NON-NLS-0$
			case "progress": //$NON-NLS-0$
			case "select": //$NON-NLS-0$
			case "textarea": //$NON-NLS-0$
				return true;
		}
		return false;
	}

	//return module exports
	return {
		getUserKeyString: getUserKeyString,
		getUserText: getUserText,
		openInNewWindow: openInNewWindow,
		followLink: followLink,
		createButton: createButton,
		createDropdownButton: createDropdownButton,
		isFormElement: isFormElement
	};
});
