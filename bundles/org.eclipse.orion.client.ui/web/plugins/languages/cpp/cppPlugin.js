/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global esprima*/
/*jslint amd:true*/
define(['orion/plugin', 'orion/editor/stylers/text_x-c__src/syntax'], function(PluginProvider, mCPP) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion C++ Tool Support",
		version: "1.0",
		description: "This plugin provides C++ tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the C++ content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/x-c++src",
				"extends": "text/plain",
				name: "C++",
				extension: ["cpp", "h"]
			}
		] 
	});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mCPP.grammars[mCPP.grammars.length - 1]);

	provider.connect();
});
