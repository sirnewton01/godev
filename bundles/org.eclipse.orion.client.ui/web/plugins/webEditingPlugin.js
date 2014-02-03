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
	'orion/editor/stylers/text_x-java-source/syntax',
	'orion/editor/stylers/text_x-python/syntax',
	'orion/editor/stylers/text_x-ruby/syntax',
	'orion/editor/stylers/text_x-php/syntax',
	'orion/editor/stylers/text_css/syntax',
	'orion/editor/stylers/text_html/syntax',
	'orion/editor/templates'
], function(PluginProvider, cssContentAssist, htmlContentAssist, htmlGrammar, mJava, mPython, mRuby, mPHP, mCSS, mHTML, templates) {
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
				imageClass: "file-sprite-text modelDecorationSprite"
			},
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
			},
			{	id: "application/json",
				"extends": "text/plain",
				name: "JSON",
				extension: ["json"],
				imageClass: "file-sprite-text modelDecorationSprite"
			},
			{	id: "application/xml",
				"extends": "text/plain",
				name: "XML",
				extension: ["xml"],
				imageClass: "file-sprite-xml"
			},
			{	id: "text/x-java-source",
				"extends": "text/plain",
				name: "Java",
				extension: ["java"]
			},
			{	id: "text/x-python",
				"extends": "text/plain",
				name: "Python",
				extension: ["py", "rpy", "pyw", "cpy", "SConstruct", "Sconstruct", "sconstruct", "SConscript", "gyp", "gypi"]
			},
			{	id: "text/x-ruby",
				"extends": "text/plain",
				name: "Ruby",
				extension: ["rb", "rbx", "rjs", "Rakefile", "rake", "cgi", "fcgi", "gemspec", "irbrc", "capfile", "ru", "prawn", "Gemfile", "Guardfile", "Vagrantfile", "Appraisals", "Rantfile"]
			},
			{	id: "text/x-php",
				"extends": "text/plain",
				name: "PHP",
				extension: ["php", "php3", "php4", "php5", "phpt", "phtml", "aw", "ctp"]
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
				imageClass: "file-sprite-image modelDecorationSprite"
			},
			{	id: "image/jpeg",
				name: "JPG",
				extension: ["jpg", "jpeg", "jpe"],
				imageClass: "file-sprite-image modelDecorationSprite"
			},
			{	id: "image/ico",
				name: "ICO",
				extension: ["ico"],
				imageClass: "file-sprite-image modelDecorationSprite"
			},
			{	id: "image/png",
				name: "PNG",
				extension: ["png"],
				imageClass: "file-sprite-image modelDecorationSprite"
			},
			{	id: "image/tiff",
				name: "TIFF",
				extension: ["tif", "tiff"],
				imageClass: "file-sprite-image modelDecorationSprite"
			},
			{	id: "image/svg",
				name: "SVG",
				extension: ["svg"],
				imageClass: "file-sprite-image modelDecorationSprite"
			}]
		});

	provider.registerService("orion.edit.editor", {}, {
		id: "orion.editor",
		nameKey: "Orion Editor",
		nls: "orion/nls/messages",
		uriTemplate: "../edit/edit.html#{,Location,params*}",
		orionTemplate: "../edit/edit.html#{,Location,params*}",
		validationProperties: [{
			source: "!Projects" // Filter out workspace;
		}]});

	// only providing excludedContentTypes for orion.editor because we want
	// to attempt to open files with unknown content types with it for now
	// e.g. A text file with no extension is currently of an unknown content
	// type, we want to use the orion.editor to open it
	provider.registerService("orion.navigate.openWith", {}, {
		editor: "orion.editor",
		excludedContentTypes: ["image/*"]});

	provider.registerService("orion.navigate.openWith.default", {}, {
			editor: "orion.editor"});

	provider.registerService("orion.edit.editor", {}, {
		id: "orion.markdownViewer",
		nameKey: "Orion Markdown Viewer",
		nls: "orion/nls/messages",
		uriTemplate: "../edit/edit.html#{,Location,params*},editor=orion.markdownViewer"});

	provider.registerService("orion.navigate.openWith", {}, {
			editor: "orion.markdownViewer",
			contentType: ["text/x-markdown"]});

	// open file with browser, no associated orion.navigate.openWith command means that any content type is valid
	provider.registerService("orion.edit.editor", {}, {
		id: "orion.view.raw",
		nameKey: "Browser",
		nls: "orion/nls/messages",
		uriTemplate:  "{+Location}",
		validationProperties: [{
			source: "!Projects" // Filter out workspace; Raw only applies to regular files and folders.
		}]
	});

	// Register content assist providers
	provider.registerService("orion.edit.contentassist",
		new cssContentAssist.CssContentAssistProvider(),
		{	name: "CSS content assist",
			contentType: ["text/css"]
		});
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
	var grammars = mJava.grammars.concat(mCSS.grammars).concat(mHTML.grammars).concat(mPython.grammars).concat(mRuby.grammars).concat(mPHP.grammars);
	grammars.forEach(function(current) {
		provider.registerServiceProvider("orion.edit.highlighter", {}, current);
	}.bind(this));

	provider.connect();
});
