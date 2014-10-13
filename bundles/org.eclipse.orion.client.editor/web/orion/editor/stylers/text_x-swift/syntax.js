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

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_x-swift/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-1$ //$NON-NLS-0$
	var keywords = [
		"associativity", "as", //$NON-NLS-1$ //$NON-NLS-0$
		"break", //$NON-NLS-0$
		"case", "class", "continue", "convenience", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"default", "deinit", "didSet", "do", "dynamicType", "dynamic", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"else", "enum", "extension", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"fallthrough", "false", "final", "for", "func", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"get", //$NON-NLS-0$
		"if", "import", "infix", "init", "inout", "internal", "in", "is", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"lazy", "left", "let", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"mutating", //$NON-NLS-0$
		"nil", "none", "nonmutating", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"operator", "optional", "override", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"postfix", "precedence", "prefix", "private", "protocol", "Protocol", "public", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"required", "return", "right", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"self", "Self", "set", "static", "struct", "subscript", "super", "switch", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"true", "typealias", "Type", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"unowned", //$NON-NLS-0$
		"var", //$NON-NLS-0$
		"weak", "where", "while", "willSet", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"@objc" //$NON-NLS-0$
	];
	var keywords2 = [
		"__COLUMN__", "__FILE__", "__FUNCTION__", "__LINE__" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.swift", //$NON-NLS-0$
		contentTypes: ["text/x-swift"], //$NON-NLS-0$
		patterns: [
			{include: "#string_doubleQuote"}, //$NON-NLS-0$
			{include: "orion.c-like#comment_singleLine"}, //$NON-NLS-0$
			{include: "#comment_block"}, //$NON-NLS-0$
			{include: "orion.lib#brace_open"}, //$NON-NLS-0$
			{include: "orion.lib#brace_close"}, //$NON-NLS-0$
			{include: "orion.lib#bracket_open"}, //$NON-NLS-0$
			{include: "orion.lib#bracket_close"}, //$NON-NLS-0$
			{include: "orion.lib#parenthesis_open"}, //$NON-NLS-0$
			{include: "orion.lib#parenthesis_close"}, //$NON-NLS-0$
			{include: "#number_binary"}, //$NON-NLS-0$
			{include: "#number_hex"}, //$NON-NLS-0$
			{include: "#number_octal"}, //$NON-NLS-0$
			{include: "#number_decimal"}, //$NON-NLS-0$
			{include: "#keywords"}, //$NON-NLS-0$
			{include: "#keywords2"}, //$NON-NLS-0$
		],
		repository: {
			comment_block: {
				begin: {match: "/\\*", literal: "/*"}, //$NON-NLS-1$ //$NON-NLS-0$
				end: {match: "\\*/", literal: "*/"}, //$NON-NLS-1$ //$NON-NLS-0$ 
				name: "comment.block.swift", //$NON-NLS-0$
				patterns: [
					{include: "#comment_block"}, //$NON-NLS-0$
					{
						match: "(\\b)(TODO)(\\b)(((?!\\*/).)*)", //$NON-NLS-0$
						name: "meta.annotation.task.todo", //$NON-NLS-0$
						captures: {
							2: {name: "keyword.other.documentation.task.swift"}, //$NON-NLS-0$
							4: {name: "comment.block.swift"} //$NON-NLS-0$
						}
					}
				]
			},
			keywords: {
				match: "(^|[^\\w`])(" + keywords.join("|") + ")\\b", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				captures: {
					2: {name: "keyword.control.swift"} //$NON-NLS-0$
				}
			},
			keywords2: {
				match: "(^|[^\\w`])(" + keywords2.join("|") + ")(?:$|[^\\w])", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				captures: {
					2: {name: "keyword.control.swift"} //$NON-NLS-0$
				}
			},
			number_binary: {
				match: "\\b0b[01]+\\b", //$NON-NLS-0$
				name: "constant.numeric.binary.swift" //$NON-NLS-0$
			},
			number_decimal: {
				match: "\\b-?(?:\\.\\d[\\d_]*|\\d[\\d_]*\\.?[\\d_]*)(?:[eE][+-]?\\d[\\d_]*)?\\b", //$NON-NLS-0$
				name: "constant.numeric.decimal.swift" //$NON-NLS-0$
			},
			number_hex: {
				match: "\\b0[xX](?:\\.[0-9A-Fa-f][0-9A-Fa-f_]*|[0-9A-Fa-f][0-9A-Fa-f_]*\\.?[0-9A-Fa-f_]*)(?:[pP][+-]?\\d[\\d_]*)?\\b", //$NON-NLS-0$
				name: "constant.numeric.hex.swift" //$NON-NLS-0$
			},
			number_octal: {
				match: "\\b0o[01234567][01234567_]*\\b", //$NON-NLS-0$
				name: "constant.numeric.octal.swift" //$NON-NLS-0$
			},
			segment: {
				begin: "\\(", //$NON-NLS-0$
				end: "\\)", //$NON-NLS-0$
				patterns: [
					{include: "#segment"}, //$NON-NLS-0$
					{include: "#comment_block"}, //$NON-NLS-0$
					{include: "#number_binary"}, //$NON-NLS-0$
					{include: "#number_hex"}, //$NON-NLS-0$
					{include: "#number_octal"}, //$NON-NLS-0$
					{include: "#number_decimal"}, //$NON-NLS-0$
					{include: "#keywords"}, //$NON-NLS-0$
					{include: "#keywords2"} //$NON-NLS-0$
				]
			},
			string_doubleQuote: {
				match: '"(?:\\\\.|[^"])*"?', //$NON-NLS-0$
				name: "string.quoted.double.swift", //$NON-NLS-0$
				patterns: [
					{
						begin: "\\\\\\(", //$NON-NLS-0$
						end: "\\)", //$NON-NLS-0$
						name: "none", //$NON-NLS-0$
						patterns: [
							{include: "#segment"}, //$NON-NLS-0$
							{include: "#comment_block"}, //$NON-NLS-0$
							{include: "#number_binary"}, //$NON-NLS-0$
							{include: "#number_hex"}, //$NON-NLS-0$
							{include: "#number_octal"}, //$NON-NLS-0$
							{include: "#number_decimal"}, //$NON-NLS-0$
							{include: "#keywords"}, //$NON-NLS-0$
							{include: "#keywords2"} //$NON-NLS-0$
						]
					}
				]
			}
		}
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords.concat(keywords2)
	};
});
