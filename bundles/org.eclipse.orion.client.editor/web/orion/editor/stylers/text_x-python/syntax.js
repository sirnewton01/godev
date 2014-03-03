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

define("orion/editor/stylers/text_x-python/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = [
		"and", "as", "assert", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"break", //$NON-NLS-0$
		"class", "continue", //$NON-NLS-1$ //$NON-NLS-0$
		"def", "del", //$NON-NLS-1$ //$NON-NLS-0$
		"exec", "elif", "else", "except", "Ellipsis", //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"False", "finally", "for", "from", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"global", //$NON-NLS-0$
		"if", "import", "in", "is", //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"lambda", //$NON-NLS-0$
		"not", "None", "NotImplemented", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"or", //$NON-NLS-0$
		"pass", "print", //$NON-NLS-1$ //$NON-NLS-0$
		"raise", "return", //$NON-NLS-1$ //$NON-NLS-0$
		"try", "True", //$NON-NLS-1$ //$NON-NLS-0$
		"while", "with", //$NON-NLS-1$ //$NON-NLS-0$
		"yield" //$NON-NLS-0$
	];

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.python",
		contentTypes: ["text/x-python"],
		patterns: [
			{
				include: "orion.lib"
			}, {
				match: "#.*",
				name: "comment.line.number-sign.python",
				patterns: [
					{
						include: "orion.lib#todo_comment_singleLine"
					}
				]
			}, {
				begin: "(['\"])\\1\\1",
				end: "\\1\\1\\1",
				name: "string.quoted.triple.python"
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b",
				name: "keyword.control.python"
			}
		],
		repository: {
			/* override orion.lib#number_decimal */
			number_decimal: {
				match: "\\b-?(?:\\.\\d+|\\d+\\.?\\d*)[lL]?\\b",
				name: "constant.numeric.number.python"
			}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
