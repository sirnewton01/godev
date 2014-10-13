/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define([
'logger'
], function(Logger) {
	return function(context) {
		"use strict";  //$NON-NLS-0$
		
		return {
			/**
			 * @name ObjectExpression
			 * @description Linting for ObjectExpressions
			 * @function
			 * @param node
			 */
			"ObjectExpression": function(node) {
				try {
					var props = node.properties;
					if(props && props.length > 0) {
						var len = props.length;
						var seen = Object.create(null);
						for(var i = 0; i < len; i++) {
							var prop = props[i];
							// Here we're concerned only with duplicate keys having kind == "init". Duplicates among other kinds (get, set)
							// cause syntax errors, by spec, so don't need to be linted.
							if(prop.kind !== "init") {
								continue;
							}
							var name = (prop.key.name ? prop.key.name : prop.key.value);
							if(Object.prototype.hasOwnProperty.call(seen, name)) {
								context.report(prop, 'Duplicate object key \'${0}\'.', {0:name}, context.getTokens(prop)[0]);
							}
							else {
								seen[name] = 1;
							}
						}
					}
				}
				catch(ex) {
					Logger.log(ex);
				}
			}
		};
	};
});
