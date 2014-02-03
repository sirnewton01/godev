/*******************************************************************************
 *
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint browser:true devel:true sub:true*/
/*global define eclipse:true orion:true window*/

define([
	'orion/Deferred',
	"orion/editor/textStyler", 
	"orion/editor/stylers/application_javascript/syntax",
	"orion/editor/stylers/text_css/syntax",
	"orion/editor/stylers/text_html/syntax",
	"orion/editor/stylers/text_x-java-source/syntax",
	"orion/editor/stylers/application_json/syntax",
	"orion/editor/stylers/text_x-php/syntax",
	"orion/editor/stylers/text_x-python/syntax",
	"orion/editor/stylers/text_x-ruby/syntax"
], function(Deferred, mStyler, mJS, mCss, mHtml, mJava, mJson, mPhp, mPython, mRuby) {
	var ContentTypes = [{	id: "text/plain",
			name: "Text",
			extension: ["txt"],
			imageClass: "file-sprite-text modelDecorationSprite"
		},
		{	id: "application/javascript",
			"extends": "text/plain",
			name: "JavaScript",
			extension: ["js"],
			imageClass: "file-sprite-javascript modelDecorationSprite"
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
	}];
	
	function SyntaxHighlighter() {
		this.styler = null;
	}
	
	SyntaxHighlighter.prototype = {
		setup: function(fileContentType, textView, annotationModel, fileName, allowAsync) {
			if (this.styler) {
				if (this.styler.destroy) {
					this.styler.destroy();
				}
				this.styler = null;
			}
			return this.highlight(fileContentType, textView, annotationModel);
		},
		highlight: function(fileContentType, textView, annotationModel) {
			if (this.styler) {
				this.styler.destroy();
				this.styler = null;
			}
			if (fileContentType) {
				switch(fileContentType.id) {
					case "application/javascript": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mJS.grammars, "orion.js"); //$NON-NLS-0$
						break;
					case "text/css": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mCss.grammars, "orion.css"); //$NON-NLS-0$
						break;
					case "text/html": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mHtml.grammars, "orion.html"); //$NON-NLS-0$
						break;
					case "text/x-java-source": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mJS.grammars, "orion.js"); //$NON-NLS-0$
						break;
					case "application/json": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mJson.grammars, "orion.json"); //$NON-NLS-0$
						break;
					case "text/x-python": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mPython.grammars, "orion.py"); //$NON-NLS-0$
						break;
					case "text/x-ruby": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mRuby.grammars, "orion.rb"); //$NON-NLS-0$
						break;
					case "text/x-php": //$NON-NLS-0$
						this.styler = new mStyler.TextStyler(textView, annotationModel, mPhp.grammars, "orion.php"); //$NON-NLS-0$
						break;
				}
			}
			return new Deferred().resolve();
		},
		getStyler: function() {
			return this.styler;
		}
	};
	
	return {ContentTypes: ContentTypes,
			SyntaxHighlighter: SyntaxHighlighter};
});
