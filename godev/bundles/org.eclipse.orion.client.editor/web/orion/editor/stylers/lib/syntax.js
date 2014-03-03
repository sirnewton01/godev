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

define("orion/editor/stylers/lib/syntax", [], function() { //$NON-NLS-0$
	return {
		id: "orion.lib",
		grammars: [{
			id: "orion.lib",
			patterns: [
				{include: "#brace_open"},
				{include: "#brace_close"},
				{include: "#bracket_open"},
				{include: "#bracket_close"},
				{include: "#parenthesis_open"},
				{include: "#parenthesis_close"},
				{include: "#number_decimal"},
				{include: "#number_hex"},
				{include: "#string_doubleQuote"},
				{include: "#string_singleQuote"}
			],
			repository: {
				brace_open: {
					match: "{",
					name: "punctuation.section.block.begin"
				},
				brace_close: {
					match: "}",
					name: "punctuation.section.block.end"
				},
				bracket_open: {
					match: "\\[",
					name: "punctuation.section.bracket.begin"
				},
				bracket_close: {
					match: "\\]",
					name: "punctuation.section.bracket.end"
				},
				parenthesis_open: {
					match: "\\(",
					name: "punctuation.section.parens.begin"
				},
				parenthesis_close: {
					match: "\\)",
					name: "punctuation.section.parens.end"
				},
				doc_block: {
					begin: "/\\*\\*",
					end: "\\*/",
					name: "comment.block.documentation",
					patterns: [
						{
							match: "@(?:(?!\\*/)\\S)*",
							name: "keyword.other.documentation.tag"
						}, {
							match: "\\<\\S*\\>",
							name: "keyword.other.documentation.markup"
						}, {
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				},
				number_decimal: {
					match: "\\b-?(?:\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?\\b",
					name: "constant.numeric.number"
				},
				number_hex: {
					match: "\\b0[xX][0-9A-Fa-f]+\\b",
					name: "constant.numeric.hex"
				},
				string_doubleQuote: {
					match: '"(?:\\\\.|[^"])*"?',
					name: "string.quoted.double"
				},
				string_singleQuote: {
					match: "'(?:\\\\.|[^'])*'?",
					name: "string.quoted.single"
				},
				todo_comment_singleLine: {
					match: "(\\b)(TODO)(\\b)(.*)",
					name: "meta.annotation.task.todo",
					captures: {
						2: {name: "keyword.other.documentation.task"},
						4: {name: "comment.line"}
					}
				}
			}
		}, {
			id: "orion.c-like",
			patterns: [
				{include: "orion.lib"},
				{include: "#comment_singleLine"},
				{include: "#comment_block"}
			],
			repository: {
				comment_singleLine: {
					match: "//.*",
					name: "comment.line.double-slash",
					patterns: [
						{
							include: "orion.lib#todo_comment_singleLine"
						}
					]
				},
				comment_block: {
					begin: "/\\*",
					end: "\\*/",
					name: "comment.block",
					patterns: [
						{
							match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)",
							name: "meta.annotation.task.todo",
							captures: {
								2: {name: "keyword.other.documentation.task"},
								4: {name: "comment.block"}
							}
						}
					]
				}
			}
		}],
		keywords: []
	}
});
