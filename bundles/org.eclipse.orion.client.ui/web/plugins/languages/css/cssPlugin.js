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
define(['orion/plugin', 'orion/editor/stylers/text_css/syntax', 'orion/editor/cssContentAssist'], function(PluginProvider, mCSS, cssContentAssist) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion CSS Tool Support",
		version: "1.0",
		description: "This plugin provides CSS tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the CSS content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/css",
				"extends": "text/plain",
				name: "CSS",
				extension: ["css"],
				imageClass: "file-sprite-css modelDecorationSprite"
			}
		] 
	});

	/**
	 * Register content assist providers
	 */
	provider.registerService("orion.edit.contentassist",
		new cssContentAssist.CssContentAssistProvider(),
		{	name: "CSS content assist",
			contentType: ["text/css"]
		});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mCSS.grammars[mCSS.grammars.length - 1]);

	provider.connect();
});
