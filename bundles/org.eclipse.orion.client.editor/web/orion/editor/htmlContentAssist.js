/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define */

define("orion/editor/htmlContentAssist", ['orion/editor/templates'], function(mTemplates) { //$NON-NLS-1$ //$NON-NLS-0$

	var simpleDocTemplate = new mTemplates.Template("", "Simple HTML document", //$NON-NLS-0$
		"<!DOCTYPE html>\n" + //$NON-NLS-0$
		"<html lang=\"en\">\n" + //$NON-NLS-0$
		"\t<head>\n" + //$NON-NLS-0$
		"\t\t<meta charset=utf-8>\n" + //$NON-NLS-0$
		"\t\t<title>${title}</title>\n" + //$NON-NLS-0$
		"\t</head>\n" + //$NON-NLS-0$
		"\t<body>\n" + //$NON-NLS-0$
		"\t\t<h1>${header}</h1>\n" + //$NON-NLS-0$
		"\t\t<p>\n" + //$NON-NLS-0$
		"\t\t\t${cursor}\n" + //$NON-NLS-0$
		"\t\t</p>\n" + //$NON-NLS-0$
		"\t</body>\n" + //$NON-NLS-0$
		"</html>"); //$NON-NLS-0$
		
	var templates = [
		{
			prefix: "<img", //$NON-NLS-0$
			description: "<img> - HTML image element",
			template: "<img src=\"${cursor}\" alt=\"${Image}\"/>" //$NON-NLS-0$
		},
		{
			prefix: "<a", //$NON-NLS-0$
			description: "<a> - HTML anchor element",
			template: "<a href=\"${cursor}\"></a>" //$NON-NLS-0$
		},
		{
			prefix: "<ul", //$NON-NLS-0$
			description: "<ul> - HTML unordered list",
			template: "<ul>\n\t<li>${cursor}</li>\n</ul>" //$NON-NLS-0$
		},
		{
			prefix: "<ol", //$NON-NLS-0$
			description: "<ol> - HTML ordered list",
			template: "<ol>\n\t<li>${cursor}</li>\n</ol>" //$NON-NLS-0$
		},
		{
			prefix: "<dl", //$NON-NLS-0$
			description: "<dl> - HTML definition list",
			template: "<dl>\n\t<dt>${cursor}</dt>\n\t<dd></dd>\n</dl>" //$NON-NLS-0$
		},
		{
			prefix: "<table", //$NON-NLS-0$
			description: "<table> - basic HTML table",
			template: "<table>\n\t<tr>\n\t\t<td>${cursor}</td>\n\t</tr>\n</table>" //$NON-NLS-0$
		}
	];

	//elements that are typically placed on a single line (e.g., <b>, <h1>, etc)
	var element, template, description, i;
	var singleLineElements = [
		"abbr","b","button","canvas","cite", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"command","dd","del","dfn","dt", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"em","embed","font","h1","h2", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"h3","h4","h5","h6","i", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"ins","kbd","label","li","mark", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"meter","object","option","output","progress", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"q","rp","rt","samp","small", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"strong","sub","sup","td","time", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"title","tt","u","var" //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < singleLineElements.length; i++) {
		element = singleLineElements[i];
		description = "<" + element + "></" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		template = "<" + element + ">${cursor}</" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	//elements that typically start a block spanning multiple lines (e.g., <p>, <div>, etc)
	var multiLineElements = [
		"address","article","aside","audio","bdo", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"blockquote","body","caption","code","colgroup", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"datalist","details","div","fieldset","figure", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"footer","form","head","header","hgroup", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"iframe","legend","map","menu","nav", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"noframes","noscript","optgroup","p","pre", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"ruby","script","section","select","span", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"style","tbody","textarea","tfoot","th", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"thead","tr","video" //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < multiLineElements.length; i++) {
		element = multiLineElements[i];
		description = "<" + element + "></" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		template = "<" + element + ">\n\t${cursor}\n</" + element + ">"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	//elements with no closing element (e.g., <hr>, <br>, etc)
	var emptyElements = [
		"area","base","br","col", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"hr","input","link","meta", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"param","keygen","source" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i = 0; i < emptyElements.length; i++) {
		element = emptyElements[i];
		template = description = "<" + element + "/>"; //$NON-NLS-1$ //$NON-NLS-0$
		templates.push({prefix: "<" + element, description: description, template: template}); //$NON-NLS-0$
	}

	/**
	 * @name orion.editor.HTMLContentAssistProvider
	 * @class Provides content assist for HTML.
	 */
	function HTMLContentAssistProvider() {
	}
	HTMLContentAssistProvider.prototype = new mTemplates.TemplateContentAssist([], templates);

	HTMLContentAssistProvider.prototype.getPrefix = function(buffer, offset, context) {
		var index = offset;
		while (index && /[A-Za-z0-9<]/.test(buffer.charAt(index - 1))) {
			index--;
			if (buffer.charAt(index) === "<") { //$NON-NLS-0$
				break;
			}
		}
		return index ? buffer.substring(index, offset) : "";
	};
	
	HTMLContentAssistProvider.prototype.computeProposals = function(buffer, offset, context) {
		//template - simple html document
		if (buffer.length === 0) {
			return [simpleDocTemplate.getProposal("", offset, context)];
		}
		return mTemplates.TemplateContentAssist.prototype.computeProposals.call(this, buffer, offset, context);
	};

	return {
		HTMLContentAssistProvider: HTMLContentAssistProvider
	};
});