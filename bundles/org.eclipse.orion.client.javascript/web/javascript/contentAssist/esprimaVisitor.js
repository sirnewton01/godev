/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 VMware, Inc. and others.
 * All Rights Reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 * 	   IBM Corporation - bug fixes / improvements
 ******************************************************************************/

/*global define esprima */
define([
], function() {

	return {

		restricted: {range:true, errors:true, target:true, extras:true, comments:true, parent:true, tokens:true},
		
		/**
		 * Generic AST visitor.  Visits all typed children in source order
		 *
		 * @param {Object} node The AST node to visit
		 * @param {Object} context Extra data required to pass between operations.  Set rhsVisit to true if the rhs of
		 * assignments and variable declarators should be visited before the lhs
		 * @param {Function} operation An operation on the AST node and the data. Return false if
		 * the visit should no longer continue. Return true to continue.
		 * @param {Function} postoperation (optional) An operation that is exectuted after visiting the current node's children.
		 * will only be invoked iff the operation returns true for the current node
		 */
		visit: function(node, context, operation, postoperation) {
			if (operation(node, context, true)) {
				// gather children to visit
				var i, key;
				var children = [];
				for (key in node) {
					if (!this.restricted[key]) {
						var child = node[key];
						if (child instanceof Array) {
							for (i = 0; i < child.length; i++) {
								if (child[i] && child[i].type) {
									children.push(child[i]);
								}
							}
						} else {
							if (child && child.type) {
								children.push(child);
							}
						}
					}
				}
				if (children.length > 0) {
					// visit children in order
					for (i = 0; i < children.length; i++) {
						this.visit(children[i], context, operation, postoperation);
					}
				}
				if (postoperation) {
					postoperation(node, context, false);
				}
			}
		}
	};
});