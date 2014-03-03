/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/application_javascript/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"break", //$NON-NLS-0$
		"case", "class", "catch", "continue", "const", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"debugger", "default", "delete", "do", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"else", "enum", "export", "extends", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"false", "finally", "for", "function", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"if", "implements", "import", "in", "instanceof", "interface", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"let", //$NON-NLS-0$
		"new", "null", //$NON-NLS-1$ //$NON-NLS-0$
		"package", "private", "protected", "public", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
		"return", //$NON-NLS-0$
		"static", "super", "switch", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
		"this", "throw", "true", "try", "typeof", //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$
		"undefined", //$NON-NLS-0$
		"var", "void", //$NON-NLS-0$ //$NON-NLS-1$
		"while", "with", //$NON-NLS-0$ //$NON-NLS-1$
		"yield" //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.js", //$NON-NLS-0$
		contentTypes: ["application/javascript"], //$NON-NLS-0$
		patterns: [
			{
				include: "orion.lib#doc_block" //$NON-NLS-0$
			}, {
				include: "orion.c-like" //$NON-NLS-0$
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				name: "keyword.control.js" //$NON-NLS-0$
			}, {
				match: "/(?![\\s])(?:\\\\.|[^/])+/(?:[gim]{0,3})", //$NON-NLS-0$
				name: "string.regexp.js" //$NON-NLS-0$
			}, {
				begin: "'(?:\\\\.|[^\\\\'])*\\\\$", //$NON-NLS-0$
				end: "^(?:$|(?:\\\\.|[^\\\\'])*('|[^\\\\]$))", //$NON-NLS-0$
				name: "string.quoted.single.js" //$NON-NLS-0$
			}, {
				begin: '"(?:\\\\.|[^\\\\"])*\\\\$', //$NON-NLS-0$
				end: '^(?:$|(?:\\\\.|[^\\\\"])*("|[^\\\\]$))', //$NON-NLS-0$
				name: "string.quoted.double.js" //$NON-NLS-0$
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
