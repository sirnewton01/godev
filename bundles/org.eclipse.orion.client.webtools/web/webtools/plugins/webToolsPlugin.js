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
define(['orion/plugin', 
'webtools/htmlContentAssist', 
'webtools/htmlOutliner',
'orion/editor/stylers/text_html/syntax', 
'webtools/cssContentAssist', 
'webtools/cssValidator',
'webtools/cssOutliner',
'orion/editor/stylers/text_css/syntax'
], function(PluginProvider, htmlContentAssist, htmlOutliner, mHTML, cssContentAssist, mCssValidator, mCssOutliner, mCSS) {
	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Web Tools Support", //$NON-NLS-0$
		version: "1.0", //$NON-NLS-0$
		description: "This plug-in provides web language tools support for Orion, including HTML and CSS." //$NON-NLS-0$
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the content types: HTML, CSS
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, { //$NON-NLS-0$
		contentTypes: [
			{	id: "text/html", //$NON-NLS-0$
				"extends": "text/plain", //$NON-NLS-0$ //$NON-NLS-1$
				name: "HTML", //$NON-NLS-0$
				extension: ["html", "htm"], //$NON-NLS-0$ //$NON-NLS-1$
				imageClass: "file-sprite-html modelDecorationSprite" //$NON-NLS-0$
			},
			{	id: "text/css", //$NON-NLS-0$
				"extends": "text/plain", //$NON-NLS-0$ //$NON-NLS-1$
				name: "CSS", //$NON-NLS-0$
				extension: ["css"], //$NON-NLS-0$
				imageClass: "file-sprite-css modelDecorationSprite" //$NON-NLS-0$
			}
		] 
	});
	
	/**
	 * Register content assist providers
	 */
	provider.registerService("orion.edit.contentassist", //$NON-NLS-0$
		new htmlContentAssist.HTMLContentAssistProvider(),
		{	name: 'htmlContentAssist', //$NON-NLS-0$
			nls: 'webtools/nls/messages',  //$NON-NLS-0$
			contentType: ["text/html"], //$NON-NLS-0$
			charTriggers: "<", //$NON-NLS-0$
			excludedStyles: "(comment.*|string.*)" //$NON-NLS-0$
		});
	provider.registerService("orion.edit.contentassist", //$NON-NLS-0$
		new cssContentAssist.CssContentAssistProvider(),
		{	name: "cssContentAssist", //$NON-NLS-0$
			nls: 'webtools/nls/messages',  //$NON-NLS-0$
			contentType: ["text/css"] //$NON-NLS-0$
		});

	/**
	 * Register validators
	 */
	provider.registerService("orion.edit.validator", new mCssValidator.CssValidator(), //$NON-NLS-0$
		{
			contentType: ["text/css"] //$NON-NLS-0$
		});
		
		
	/**
	* Register outliners
	*/
	provider.registerService("orion.edit.outliner", new htmlOutliner.HtmlOutliner(), //$NON-NLS-0$
		{
			id: "orion.webtools.html.outliner", //$NON-NLS-0$
			nls: 'webtools/nls/messages',  //$NON-NLS-0$
			nameKey: 'htmlOutline', //$NON-NLS-0$
			contentType: ["text/html"] //$NON-NLS-0$
		});
	
	provider.registerService("orion.edit.outliner", new mCssOutliner.CssOutliner(),  //$NON-NLS-0$
		{
			id: "orion.outline.css.outliner", //$NON-NLS-0$
			nls: 'webtools/nls/messages',  //$NON-NLS-0$
			nameKey: 'cssOutline', //$NON-NLS-0$
			contentType: ["text/css"] //$NON-NLS-0$
		});
		
	/**
	 * Register syntax styling
	 */
	var newGrammars = {};
	mCSS.grammars.forEach(function(current){
		newGrammars[current.id] = current;
	});
	mHTML.grammars.forEach(function(current){
		newGrammars[current.id] = current;
	});
	for (var current in newGrammars) {
	    if (newGrammars.hasOwnProperty(current)) {
   			provider.registerService("orion.edit.highlighter", {}, newGrammars[current]); //$NON-NLS-0$
  		}
    }

	provider.connect();
});
