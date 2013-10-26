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

	/**
	 * Alias for <code>node.querySelector()</code>.
	 * @name orion.webui.littlelib.$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element}
	 */
	function $(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelector(selector);
	}

	/**
	 * Alias for <code>node.querySelectorAll()</code>.
	 * @name orion.webui.littlelib.$$
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {NodeList}
	 */
	function $$(selector, node) {
		if (!node) {
			node = document;
		}
		return node.querySelectorAll(selector);
	}

	/**
	 * Identical to {@link orion.webui.littlelib.$$}, but returns an Array instead of a NodeList.
	 * @name orion.webui.littlelib.$$array
	 * @function
	 * @static
	 * @param {String} selectors Selectors to match on.
	 * @param {Node} [node=document] Node to query under.
	 * @returns {Element[]}
	 */
	function $$array(selector, node) {
		return Array.prototype.slice.call($$(selector,node));
	}

	/**
	 * Alias for <code>document.getElementById</code>, but returns the input unmodified when passed a Node (or other non-string).
	 * @function
	 * @param {String|Element} elementOrId
	 * @returns {Element}
	 */
	function node(either) {
		var theNode = either;
		if (typeof(either) === "string") { //$NON-NLS-0$
			theNode = document.getElementById(either);
		}	
		return theNode;
	}

	/**
	 * Returns whether <code>child</code> is a descendant of <code>parent</code> in the DOM order.
	 * @function
	 * @param {Node} parent
	 * @param {Node} child
	 * @returns {Boolean}
	 */
	function contains(parent, child) {
		if (!parent || !child) { return false; }
		if (parent === child) { return true; }
		var compare = parent.compareDocumentPosition(child);  // useful to break out for debugging
		return Boolean(compare & 16);
	}

	/**
	 * Returns the bounds of a node. The returned coordinates are absolute (not relative to the viewport).
	 * @function
	 * @param {Node} node
	 * @returns {Object}
	 */
	function bounds(node) {
		var clientRect = node.getBoundingClientRect();
		return { 
			left: clientRect.left + document.body.scrollLeft,
			top: clientRect.top + document.body.scrollTop,
			width: clientRect.width,
			height: clientRect.height
		};
	}

	/**
	 * Removes all children of the given node.
	 * @name orion.webui.littlelib.empty
	 * @function
	 * @static
	 * @param {Node} node
	 */
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
	 * Performs substitution of strings into textContent within the given node and its descendants. An occurrence of <code>${n}</code>
	 * in text content will be replaced with the string <code>messages[n]</code>.
	 * <p>This function is recommended for binding placeholder text in template-created DOM elements to actual display strings.</p>
	 * @name orion.webui.littlelib.processTextNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {String[]} messages The replacement strings.
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
	 * <p>This function is recommended for performing rich-text replacement within a localized string. The use of actual DOM nodes
	 * avoids the need for embedded HTML in strings.</p>
	 * @name orion.webui.littlelib.processDOMNodes
	 * @function
	 * @param {Node} node The node to perform replacement under.
	 * @param {Node[]} replaceNodes The replacement nodes.
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

	/**
	 * Adds auto-dismiss functionality to the document. When a click event occurs whose <code>target</code> is not a descendant of
	 * one of the <code>excludeNodes</code>, the <code>dismissFunction</code> is invoked.
	 * @name orion.webui.littlelib.addAutoDismiss
	 * @function
	 * @static
	 * @param {Node[]} excludeNodes Clicks targeting any descendant of these nodes will not trigger the dismissFunction.
	 * @param {Function} dismissFunction The dismiss handler.
	 */
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
	
	/**
	 * Cancels the default behavior of an event and stops its propagation.
	 * @name orion.webui.littlelib.stop
	 * @function
	 * @static
	 * @param {Event} event
	 */
	function stop(event) {
		if (window.document.all) { 
			event.keyCode = 0;
		}
		if (event.preventDefault) {
			event.preventDefault();
			event.stopPropagation();
		}
	}

	/**
	 * Holds useful <code>keyCode</code> values.
	 * @name orion.webui.littlelib.KEY
	 * @static
	 */
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