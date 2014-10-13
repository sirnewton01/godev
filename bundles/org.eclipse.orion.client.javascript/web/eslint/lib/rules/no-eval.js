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
'../util', 
'logger'
], function(util, Logger) {
	return function(context) {
		"use strict";  //$NON-NLS-0$
		
		return {
			/**
			 * @name CallExpression
			 * @description Linting for CallExpressions
			 * @function
			 * @param node
			 */
			"CallExpression": function(node) {
				try {
					var name = node.callee.name;
					if(!name) {
						return;
					}
					if('eval' === name) {
						context.report(node.callee, "${0} function calls are discouraged.", {0:'\'eval\''}, context.getTokens(node.callee)[0]);
					}
					else if('setInterval' === name || 'setTimeout' === name) {
						if(node.arguments.length > 0) {
							var arg = node.arguments[0];
							if(arg.type === 'Literal') {
								context.report(node.callee, "${0} function calls are discouraged.", {0:'Implicit \'eval\''}, context.getTokens(node.callee)[0]);
							}
							else if(arg.type === 'Identifier') {
								//lets see if we can find it definition
								var scope = context.getScope();
								var decl = util.getDeclaration(arg, scope);
								if (decl && decl.defs && decl.defs.length) {
									var def = decl.defs[0];
									var dnode = def.node;
									if(def.type === 'Variable' && dnode && dnode.type === 'VariableDeclarator' &&
										dnode.init && dnode.init.type === 'Literal') {
										context.report(node.callee, "${0} function calls are discouraged.", {0:'Implicit \'eval\''}, context.getTokens(node.callee)[0]);
									}
								}
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
