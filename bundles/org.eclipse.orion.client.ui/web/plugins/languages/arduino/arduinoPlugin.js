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
define(['orion/plugin', 'orion/editor/stylers/text_x-arduino/syntax'], function(PluginProvider, mArduino) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Arduino Tool Support",
		version: "1.0",
		description: "This plugin provides Arduino tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the Arduino content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/x-arduino", // TODO could not find a commonly-used value for this
				"extends": "text/plain",
				name: "Arduino",
				extension: ["ino", "pde"]
			}
		] 
	});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mArduino.grammars[mArduino.grammars.length - 1]);

	provider.connect();
});
