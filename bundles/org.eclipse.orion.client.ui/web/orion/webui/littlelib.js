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
/*global console window define document */
/*jslint regexp:false*/

define([], function() {
	/**
	 * @name orion.webui.littlelib
	 * @class A small library of DOM and UI helpers.
	 */

	function $(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelector(selector);
	}
	
	function $$(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelectorAll(selector);
	}
	
	function $$array(selector, node) {
		return Array.prototype.slice.call($$(selector,node));
	}
		
	function node(either) {
		var theNode = either;
		if (typeof(either) === "string") { //$NON-NLS-0$
			theNode = document.getElementById(either);
		}	
		return theNode;
	}
	
	function contains(parent, child) {
		var compare = parent.compareDocumentPosition(child);  // useful to break out for debugging
		return parent === child || Boolean(compare & 16);
	}
	
	function bounds(node) {
		var clientRect = node.getBoundingClientRect();
		return { 
			left: clientRect.left + document.body.scrollLeft,
			top: clientRect.top + document.body.scrollTop,
			width: clientRect.width,
			height: clientRect.height
		};
	}
	
	function empty(node) {
		while (node.hasChildNodes()) {
			var child = node.firstChild;
			node.removeChild(child);
		}
	}
	
	/* 
	 * Inspired by http://brianwhitmer.blogspot.com/2009/05/jquery-ui-tabbable-what.html
	 */
	function firstTabbable(node) {
		if (node.tabIndex >= 0) {
			return node;
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				var result = firstTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}
	
	function lastTabbable(node) {
		if (node.tabIndex >= 0) {
			return node;
		}
		if (node.hasChildNodes()) {
			for (var i=node.childNodes.length - 1; i>=0; i--) {
				var result = lastTabbable(node.childNodes[i]);
				if (result) {
					return result;
				}
			}
		}
		return null;
	}

	var variableRegEx = /\$\{([^\}]+)\}/;
	// Internal helper
	function processNodes(node, replace) {
		if (node.nodeType === 3) { // TEXT_NODE
			var matches = variableRegEx.exec(node.nodeValue);
			if (matches && matches.length > 1) {
				replace(node, matches);
			}
		}
		if (node.hasChildNodes()) {
			for (var i=0; i<node.childNodes.length; i++) {
				processNodes(node.childNodes[i], replace);
			}
		}
	}

	/**
	 * Performs substitution of textContent within the given node and its descendants. Substitutes an occurrence of <code>${n}</code>
	 * with <code>messages[n]</code>.
	 * @name orion.webui.littlelib.processTextNodes
	 * @function
	 * @param {Node} node
	 * @param {String[]} messages
	 */
	function processTextNodes(node, messages) {
		processNodes(node, function(targetNode, matches) {
			var replaceText = messages[matches[1]] || matches[1];
			targetNode.parentNode.replaceChild(document.createTextNode(replaceText), targetNode);
		});
	}

	/**
	 * Performs substitution of DOM nodes into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced by the DOM node <code>replaceNodes[n]</code>.
	 * @param {Node} node
	 * @param {Node[]} replaceNodes
	 */
	function processDOMNodes(node, replaceNodes) {
		processNodes(node, function(targetNode, matches) {
			var replaceNode = replaceNodes[matches[1]];
			if (replaceNode) {
				var range = document.createRange();
				var start = matches.index;
				range.setStart(targetNode, start);
				range.setEnd(targetNode, start + matches[0].length);
				range.deleteContents();
				range.insertNode(replaceNode);
			}
		});
	}

	var autoDismissNodes = [];
	
	function addAutoDismiss(excludeNodes, dismissFunction) {
		// auto dismissal.  Click anywhere else means close.
		// Hook listener only once
		if (autoDismissNodes.length === 0) {
			document.addEventListener("click", function(event) { //$NON-NLS-0$
				var stillInDocument = [];  // while we are going through the list, keep a list of the ones still connected to the document
				for (var i=0; i<autoDismissNodes.length; i++) {
					var exclusions = autoDismissNodes[i].excludeNodes;
					var dismiss = autoDismissNodes[i].dismiss;
					var inDocument = false;
					var node;
					var shouldDismiss = exclusions.every(function(n) {
						if (n) {
							inDocument = document.compareDocumentPosition(document, n) !== 1; // DOCUMENT_POSITION_DISCONNECTED = 0x01;
							if (inDocument && contains(n, event.target)) {
								node = n;
								return false;
							}
						}
						return true;
					});
					if (shouldDismiss) {
						try {
							dismiss();
						} catch (e) {
							if (typeof console !== "undefined" && console) { //$NON-NLS-0$
								console.error(e && e.message);
							}
						}
						// might have been removed as part of the dismiss processing
						inDocument = document.compareDocumentPosition(document, node) !== 1; // DOCUMENT_POSITION_DISCONNECTED = 0x01;
					}
					if (inDocument) {
						stillInDocument.push(autoDismissNodes[i]);
					}
				}
				autoDismissNodes = stillInDocument;
			}, true); //$NON-NLS-0$
		}
		autoDismissNodes.push({excludeNodes: excludeNodes, dismiss: dismissFunction});
	}
	
	// TODO check IE10 to see if necessary
	function stop(event) {
		if (window.document.all) { 
			event.keyCode = 0;
		} else { 
			event.preventDefault();
			event.stopPropagation();
		}
	}
	
	var KEY = {
		BKSPC: 8,
		TAB: 9,
		ENTER: 13,
		ESCAPE: 27,
		SPACE: 32,
		PAGEUP: 33,
		PAGEDOWN: 34,
		END: 35,
		HOME: 36,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		INSERT: 45,
		DEL: 46
	};
		
	//return module exports
	return {
		$: $,
		$$: $$,
		$$array: $$array,
		node: node,
		contains: contains,
		bounds: bounds,
		empty: empty,
		firstTabbable: firstTabbable,
		lastTabbable: lastTabbable,
		stop: stop,
		processTextNodes: processTextNodes,
		processDOMNodes: processDOMNodes,
		addAutoDismiss: addAutoDismiss,
		KEY: KEY
	};
});