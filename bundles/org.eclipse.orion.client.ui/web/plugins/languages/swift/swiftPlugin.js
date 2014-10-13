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
/*eslint-env browser, amd*/
define(['orion/plugin', 'orion/editor/stylers/text_x-swift/syntax'], function(PluginProvider, mSwift) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Swift Tool Support",
		version: "1.0",
		description: "This plugin provides Swift tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the Swift content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/x-swift",
				"extends": "text/plain",
				name: "Swift",
				extension: ["swift"]
			}
		] 
	});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mSwift.grammars[mSwift.grammars.length - 1]);

	provider.connect();
});
