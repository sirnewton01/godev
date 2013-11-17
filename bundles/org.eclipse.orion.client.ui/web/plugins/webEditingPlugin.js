/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define*/
define([
	'orion/plugin',
	'orion/editor/cssContentAssist',
	'orion/editor/htmlContentAssist',
	'orion/editor/htmlGrammar',
	'orion/editor/jsTemplateContentAssist',
	'orion/editor/keywords',
	'orion/editor/templates'
], function(PluginProvider, cssContentAssist, htmlContentAssist, htmlGrammar, jsTemplateContentAssist, keywords, templates) {
	var headers = {
		name: "Orion Web Editing Plugin",
		version: "1.0",
		description: "This plugin provides editor link support for the navigator and provides default editing capabilities for HTML, JavaScript, and CSS."
	};

	var provider = new PluginProvider(headers);

	provider.registerService("orion.core.contenttype", {}, {
		contentTypes:
			// Text types
			[{	id: "text/plain",
				name: "Text",
				extension: ["txt"],
				image: "../images/file.png"
			},
			{	id: "text/html",
				"extends": "text/plain",
				name: "HTML",
				extension: ["html", "htm"],
				image: "../images/html.png"
			},
			{	id: "text/css",
				"extends": "text/plain",
				name: "CSS",
				extension: ["css"],
				image: "../images/css.png"
			},
			{	id: "application/javascript",
				"extends": "text/plain",
				name: "JavaScript",
				extension: ["js"],
				image: "../images/javascript.png"
			},
			{	id: "application/json",
				"extends": "text/plain",
				name: "JSON",
				extension: ["json"],
				image: "../images/file.png"
			},
			{	id: "application/xml",
				"extends": "text/plain",
				name: "XML",
				extension: ["xml"],
				image: "../images/xmlfile.png"
			},
			{	id: "text/x-java-source",
				"extends": "text/plain",
				name: "Java",
				extension: ["java"]
			},
			{	id: "text/x-markdown",
				"extends": "text/plain",
				name: "Markdown",
				extension: ["md"]
			},
			{	id: "text/x-yaml",
				"extends": "text/plain",
				name: "YAML",
				extension: ["yaml", "yml"]
			},
			{	id: "text/conf",
				"extends": "text/plain",
				name: "Conf",
				extension: ["conf"]
			},
			{	id: "text/sh",
				"extends": "text/plain",
				name: "sh",
				extension: ["sh"]
			},
			// Image types
			{	id: "image/gif",
				name: "GIF",
				extension: ["gif"],
				image: "../images/wtp/image.gif"
			},
			{	id: "image/jpeg",
				name: "JPG",
				extension: ["jpg", "jpeg", "jpe"],
				image: "../images/wtp/image.gif"
			},
			{	id: "image/ico",
				name: "ICO",
				extension: ["ico"],
				image: "../images/wtp/image.gif"
			},
			{	id: "image/png",
				name: "PNG",
				extension: ["png"],
				image: "../images/wtp/image.gif"
			},
			{	id: "image/tiff",
				name: "TIFF",
				extension: ["tif", "tiff"],
				image: "../images/wtp/image.gif"
			},
			{	id: "image/svg",
				name: "SVG",
				extension: ["svg"],
				image: "../images/wtp/image.gif"
			}]
		});

	provider.registerService("orion.navigate.command", {}, {
		id: "orion.view.raw",
		nameKey: "Raw",
		nls: "orion/nls/messages",
		tooltipKey: "Open the raw file or folder in the browser",
		uriTemplate:  "{+Location}",
		forceSingleItem: true,
		validationProperties: [{
			source: "!Projects" // Filter out workspace; Raw only applies to regular files and folders.
		}]
	});

	provider.registerService("orion.edit.editor", {}, {
		id: "orion.editor",
		nameKey: "Orion Editor",
		nls: "orion/nls/messages",
		uriTemplate: "../edit/edit.html#{,Location,params*}",
		orionTemplate: "../edit/edit.html#{,Location,params*}"});

	provider.registerService("orion.navigate.openWith", {}, {
			editor: "orion.editor",
			contentType: ["text/plain", "text/html", "text/css", "application/javascript", "application/json", "application/xml", "text/x-java-source"]});

	provider.registerService("orion.navigate.openWith.default", {}, {
			editor: "orion.editor"});

	// Register content assist providers
	provider.registerService("orion.edit.contentassist",
		new cssContentAssist.CssContentAssistProvider(),
		{	name: "CSS content assist",
			contentType: ["text/css"]
		});
	provider.registerService("orion.edit.contentassist",
		new jsTemplateContentAssist.JSTemplateContentAssistProvider(),
		{	name: "JavaScript content assist",
			contentType: ["application/javascript"]
		});
	provider.registerService("orion.edit.contentassist",
		new htmlContentAssist.HTMLContentAssistProvider(),
		{	name: "HTML content assist",
			contentType: ["text/html"]
		});

	// Register syntax highlighting
	provider.registerService("orion.edit.highlighter", {},
		{	type: "grammar",
			contentType: ["text/html"],
			grammar: new htmlGrammar.HtmlGrammar()
		});

	provider.connect();
});