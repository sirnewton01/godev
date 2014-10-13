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
define(['orion/plugin', 'orion/editor/stylers/text_x-erlang/syntax'], function(PluginProvider, mErlang) {	
	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Erlang Tool Support",
		version: "1.0",
		description: "This plugin provides Erlang tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the XQuery content types
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/x-erlang",
				"extends": "text/plain",
				name: "Erlang",
				extension: ["erl", "hrl"]
			}
		] 
	});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mErlang.grammars[mErlang.grammars.length - 1]);
	provider.connect();
});
