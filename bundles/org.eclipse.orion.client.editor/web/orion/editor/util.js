/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global define*/

define("orion/editor/util", [], function() { //$NON-NLS-0$
	
	/** @private */
	function addEventListener(node, type, handler, capture) {
		if (typeof node.addEventListener === "function") { //$NON-NLS-0$
			node.addEventListener(type, handler, capture === true);
		} else {
			node.attachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function removeEventListener(node, type, handler, capture) {
		if (typeof node.removeEventListener === "function") { //$NON-NLS-0$
			node.removeEventListener(type, handler, capture === true);
		} else {
			node.detachEvent("on" + type, handler); //$NON-NLS-0$
		}
	}
	/** @private */
	function contains(topNode, node) {
		if (!node) { return false; }
		if (!topNode.compareDocumentPosition) {
			var temp = node;
			while (temp) {
				if (topNode === temp) {
					return true;
				}
				temp = temp.parentNode;
			}
			return false;
		}
		return topNode === node || (topNode.compareDocumentPosition(node) & 16) !== 0;
	}

	return {
		contains: contains,
		addEventListener: addEventListener,
		removeEventListener: removeEventListener
	};
});