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
			 * @name NewExpression
			 * @description Linting for NewExpressions
			 * @function
			 * @param node
			 */
			'NewExpression' : function(node) {
				try {
					if(node.callee) {
						var tokens = context.getTokens(node.callee, 0, 1);
						if(tokens && tokens.length > 0) {
							var last = tokens[tokens.length-1];
							if(last.type !== 'Punctuator' || last.value !== '(') {
								//if there s no opening parenthesis its safe to assume they are missing
								context.report(node.callee, 'Missing parentheses invoking constructor.', null, tokens[0]);
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
