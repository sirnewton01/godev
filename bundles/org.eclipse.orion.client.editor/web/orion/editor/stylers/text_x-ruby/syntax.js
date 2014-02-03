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

define("orion/editor/stylers/text_x-ruby/syntax", ["orion/editor/stylers/shared/syntax"], function(mShared) { //$NON-NLS-0$
	var keywords = [
		"alias", "alias_method", "and", "attr_reader", "attr_writer", "attr_accessor", "attr", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"BEGIN", "begin", "break", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"case", "class", "catch", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"def", "defined?", "do", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"else", "elsif", "END", "end", "ensure", "extend", //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"false", "for", "if", "fail", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"gem", //$NON-NLS-0$
		"in", "include", "initialize", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"load",  "loop", "lambda", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"module", "module_function", //$NON-NLS-1$ //$NON-NLS-0$
		"new", "next", "nil", "not", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"or", //$NON-NLS-0$
		"public", "prepend", "private", "protected", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"raise", "redo", "require", "require_relative", "rescue", "retry", "return", //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"self", "super", //$NON-NLS-1$ //$NON-NLS-0$
		"then", "throw", "true", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"undef", "unless", "until", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"when", "while", //$NON-NLS-1$ //$NON-NLS-0$
		"yield", //$NON-NLS-0$
		"__ENCODING__", "__END__", "__FILE__", "__LINE__" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];

	var grammars = mShared.grammars;
	grammars.push({
		id: "orion.ruby",
		contentTypes: ["text/x-ruby"],
		patterns: [
			{
				include: "orion.patterns"
			}, {
				/* override from orion.patterns */
				id: "comment_singleline",
			}, {
				/* override from orion.patterns */
				id: "comment_multiline",
			}, {
				begin: "#",
				end: ".*",
				name: "comment.line.number-sign.ruby",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(.*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			}, {
				id: "comment_multiline",
				begin: "^=begin",
				end: "^=end",
				name: "comment.block.ruby",
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
			}, {
				match: "\\b0[bB][01]+\\b",
				name: "constant.numeric.binary.ruby"
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.control.ruby"
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
