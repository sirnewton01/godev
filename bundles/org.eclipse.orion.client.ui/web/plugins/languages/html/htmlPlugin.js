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
define(['orion/plugin', 'orion/editor/htmlContentAssist', 'orion/editor/htmlGrammar', 'orion/editor/stylers/text_html/syntax'], function(PluginProvider, htmlContentAssist, htmlGrammar, mHTML) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion HTML Tool Support",
		version: "1.0",
		description: "This plugin provides HTML tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the HTML content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/html",
				"extends": "text/plain",
				name: "HTML",
				extension: ["html", "htm"],
				imageClass: "file-sprite-html modelDecorationSprite"
			}
		] 
	});

	/**
	 * Register content assist providers
	 */
	provider.registerService("orion.edit.contentassist",
		new htmlContentAssist.HTMLContentAssistProvider(),
		{	name: "HTML content assist",
			contentType: ["text/html"],
			charTriggers: "<",
			excludedStyles: "(comment.*|string.*)"
		});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mHTML.grammars[mHTML.grammars.length - 1]);

	provider.connect();
});
