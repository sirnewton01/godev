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

define("orion/editor/stylers/application_xml/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-1$ //$NON-NLS-0$

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.xml",
		contentTypes: ["application/xml", "application/xhtml+xml"],
		patterns: [
			{
				include: "#comment"
			}, {
				include: "#doctype"
			}, {
				include: "#xmlDeclaration"
			}, {
				begin: "</?[A-Za-z0-9]+",
				end: "/?>",
				captures: {
					0: {name: "entity.name.tag.xml"},
				},
				name: "meta.tag.xml",
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				]
			}, {
				match: "&lt;|&gt;|&amp;",
				name: "constant.character"
			}
		],
		repository: {
			comment: {
				begin: "<!--",
				end: "-->",
				name: "comment.block.xml",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(((?!-->).)*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			},
			doctype: {
				begin: "<!(?:doctype|DOCTYPE)",
				end: ">",
				name: "meta.tag.doctype.xml",
				captures: {
					0: {name: "entity.name.tag.doctype.xml"},
				},
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				]
			},
			xmlDeclaration: {
				begin: "<\\?xml",
				end: "\\?>",
				captures: {
					0: {name: "entity.name.tag.declaration.xml"},
				},
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.lib#string_doubleQuote"
					}, {
						include: "orion.lib#string_singleQuote"
					}
				],
				name: "meta.tag.declaration.xml"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
