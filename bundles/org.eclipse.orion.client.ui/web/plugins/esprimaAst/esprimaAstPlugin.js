/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define esprima */
define([
	'orion/plugin',
	'orion/serialize',
	'esprima/esprima'
], function(PluginProvider, serialize, _) {
	var provider = new PluginProvider({
		name: 'Esprima AST Provider for JavaScript',
		description: 'Provides an abstract syntax tree (AST) for JavaScript code.',
		version: '1.0'
	});

	provider.registerService('orion.core.astprovider',
		{
			computeAST: function(context) {
				var ast = esprima.parse(context.text, {
					loc: true,
					range: true,
					raw: true,
					tokens: true,
					comment: true,
					tolerant: true
				});
				if (ast.errors) {
					ast.errors = ast.errors.map(serialize.serializeError);
				}
				return ast;
			}
		}, {
			contentType: ['application/javascript']
		});

	provider.connect();

});