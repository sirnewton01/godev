/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/Deferred',
		"orion/editor/textMateStyler",
		"orion/editor/htmlGrammar",
		"examples/editor/textStyler"],
function(Deferred, mTextMateStyler, mHtmlGrammar, mTextStyler) {
var exports = {};
function _fileExt(fName){
	var splitName = fName.split("."); //$NON-NLS-0$
	var ext = "js"; //$NON-NLS-0$
	if(splitName.length > 1){
		ext = splitName[splitName.length - 1];
	}
	return ext;
}

/**
 * @name orion.compare.CompareSyntaxHighlighter
 * @class Represents a syntax highlighter to highlight one side of the compare view.
 */
exports.DefaultHighlighter = (function() {
	function DefaultHighlighter() {
		this.styler = null;
	}
	DefaultHighlighter.prototype = {
		highlight: function(fileName, contentType, editor) {
			if (this.styler) {
				this.styler.destroy();
				this.styler = null;
			}
			var lang = _fileExt(fileName);
			if (lang){
				var textView = editor.getTextView();
				var annotationModel = editor.getAnnotationModel();
				switch(lang) {
					case "js": //$NON-NLS-0$
					case "java": //$NON-NLS-0$
					case "css": //$NON-NLS-0$
						this.styler = new mTextStyler.TextStyler(textView, lang, annotationModel);
						break;
					case "html": //$NON-NLS-0$
						this.styler = new mTextMateStyler.TextMateStyler(textView, new mHtmlGrammar.HtmlGrammar());
						break;
				}
				return new Deferred().resolve(editor);
			}
			return null;
		}
	};
	return DefaultHighlighter;
}());

return exports;
});
