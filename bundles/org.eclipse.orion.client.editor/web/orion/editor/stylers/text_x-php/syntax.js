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
define("orion/editor/stylers/text_x-php/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"abstract", "and", "array", "as", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"break", //$NON-NLS-0$
		"callable", "case", "catch", "class", "clone", "const", "continue", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"declare", "default", "die", "do", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"echo", "else", "elseif", "empty", "enddeclare", "endfor", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"endforeach", "endif", "endswitch", "endwhile", "eval", "exit", "extends", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"false", "FALSE", "final", "finally", "for", "foreach", "function", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"global", "goto", //$NON-NLS-1$ //$NON-NLS-0$
		"if", "implements", "include", "include_once", "insteadof", "interface", "instanceof", "isset", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"list", //$NON-NLS-0$
		"namespace", "new", "null", "NULL", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"or", //$NON-NLS-0$
		"parent", "print", "private", "protected", "public", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"require", "require_once", "return", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"self", "static", "switch", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"throw", "trait", "try", "true", "TRUE", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"unset", "use", //$NON-NLS-1$ //$NON-NLS-0$
		"var", //$NON-NLS-0$
		"while", //$NON-NLS-0$
		"xor", //$NON-NLS-0$
		"yield", //$NON-NLS-0$
		"__halt_compiler", "__CLASS__", "__DIR__", "__FILE__", "__FUNCTION__",  //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"__LINE__", "__METHOD__", "__NAMESPACE__", "__TRAIT__"  //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.php", //$NON-NLS-0$
		contentTypes: ["text/x-php"], //$NON-NLS-0$
		patterns: [
			{
				begin: "(?i)<(\\?|%(?!php))(?:=|php)?(?:\\s|$)", //$NON-NLS-0$
				end: "[\\1]>", //$NON-NLS-0$
				captures: {
					0: {name: "entity.name.declaration.php"} //$NON-NLS-0$
				},
				contentName: "source.php.embedded", //$NON-NLS-0$
				patterns: [
					{include: "orion.lib#string_doubleQuote"}, //$NON-NLS-0$
					{include: "orion.lib#string_singleQuote"}, //$NON-NLS-0$
					{include: "orion.c-like#comment_singleLine"}, //$NON-NLS-0$
					{include: "orion.lib#doc_block"}, //$NON-NLS-0$
					{include: "orion.c-like#comment_block"}, //$NON-NLS-0$
					{
						match: {match: "#.*", literal: "#"}, //$NON-NLS-0$
						name: "comment.line.number-sign.php", //$NON-NLS-0$
						patterns: [
							{include: "orion.lib#todo_comment_singleLine"} //$NON-NLS-0$
						]
					}, {
						begin: "<<<(\\w+)$", //$NON-NLS-0$
						end: "^\\1;$", //$NON-NLS-0$
						name: "string.unquoted.heredoc.php" //$NON-NLS-0$
					}, {
						begin: "<<<'(\\w+)'$", //$NON-NLS-0$
						end: "^\\1;$", //$NON-NLS-0$
						name: "string.unquoted.heredoc.nowdoc.php" //$NON-NLS-0$
					},
					{include: "orion.lib#brace_open"}, //$NON-NLS-0$
					{include: "orion.lib#brace_close"}, //$NON-NLS-0$
					{include: "orion.lib#bracket_open"}, //$NON-NLS-0$
					{include: "orion.lib#bracket_close"}, //$NON-NLS-0$
					{include: "orion.lib#parenthesis_open"}, //$NON-NLS-0$
					{include: "orion.lib#parenthesis_close"}, //$NON-NLS-0$
					{
						match: "\\b0[bB][01]+\\b", //$NON-NLS-0$
						name: "constant.numeric.binary.php" //$NON-NLS-0$
					},
					{include: "orion.lib#number_decimal"}, //$NON-NLS-0$
					{include: "orion.lib#number_hex"}, //$NON-NLS-0$
					{
						match: "\\b(?:" + keywords.join("|") + ")\\b", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						name: "keyword.control.php" //$NON-NLS-0$
					}
				]
			}, {
				include: "orion.html" //$NON-NLS-0$
			}
		]
	});

	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
