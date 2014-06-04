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
define(['orion/plugin', 
'webtools/htmlContentAssist', 
'orion/editor/stylers/text_html/syntax', 
'webtools/cssContentAssist', 
'webtools/cssValidator',
'webtools/cssOutliner',
'orion/editor/stylers/text_css/syntax'
], function(PluginProvider, htmlContentAssist, mHTML, cssContentAssist, mCssValidator, mCssOutliner, mCSS) {
	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Web Tools Support",
		version: "1.0",
		description: "This plug-in provides web language tools support for Orion, including HTML, CSS and Markdown."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the content types: HTML, CSS
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "text/html",
				"extends": "text/plain",
				name: "HTML",
				extension: ["html", "htm"],
				imageClass: "file-sprite-html modelDecorationSprite"
			},
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
		new htmlContentAssist.HTMLContentAssistProvider(),
		{	name: "HTML content assist",
			contentType: ["text/html"],
			charTriggers: "<",
			excludedStyles: "(comment.*|string.*)"
		});
	provider.registerService("orion.edit.contentassist",
		new cssContentAssist.CssContentAssistProvider(),
		{	name: "CSS content assist",
			contentType: ["text/css"]
		});

	provider.registerService("orion.edit.validator", new mCssValidator.CssValidator(),
		{
			contentType: ["text/css"]
		});
	
	provider.registerService("orion.edit.outliner", new mCssOutliner.CssOutliner(), 
		{
			id: "orion.outline.css.csslint",
			name: "CSS rule outline",
			contentType: ["text/css"]
		});
		
	/**
	 * Register syntax styling
	 * TODO There should be a better way, see Bug 432540
	 */
	for (var i=mCSS.grammars.length-1; i>=0; i--) {
		if (mCSS.grammars[i].id === "orion.css"){
			provider.registerServiceProvider("orion.edit.highlighter", {}, mCSS.grammars[i]);
			break;
		}
	}
	for (var i=mHTML.grammars.length-1; i>=0; i--) {
		if (mHTML.grammars[i].id === "orion.html"){
			provider.registerServiceProvider("orion.edit.highlighter", {}, mHTML.grammars[i]);
			break;
		}
	}
//	provider.registerServiceProvider("orion.edit.highlighter", {}, mCSS.grammars[mCSS.grammars.length - 1]);
//	provider.registerServiceProvider("orion.edit.highlighter", {}, mHTML.grammars[mHTML.grammars.length - 1]);

	provider.connect();
});
