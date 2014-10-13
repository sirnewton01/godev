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
			 * @name BinaryExpression
			 * @description Lintig for BinaryExpressions
			 * @function
			 * @param node
			 */
			'BinaryExpression' : function(node) {
				try {
					if(node.left.type === 'Identifier' && node.left.name === 'NaN') {
						context.report(node.left, 'Use the isNaN function to compare with NaN.', null, node.left);
					} else if(node.right.type === 'Identifier' && node.right.name === 'NaN') {
						context.report(node.right, 'Use the isNaN function to compare with NaN.', null, node.right);
					}
				}
				catch(ex) {
					Logger.log(ex);
				}
			}
		};
	};
});
