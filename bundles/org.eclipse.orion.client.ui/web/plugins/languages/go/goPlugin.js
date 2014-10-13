/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser,amd*/
define(['orion/plugin', 'orion/form', 'orion/editor/stylers/text_x-go/syntax'], function (PluginProvider, form, mGo) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Go Language Tool Support",
		version: "1.0",
		description: "This plugin provides Go language tools support for Orion."
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the Go content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
	contentTypes: [
		{
			id: "text/x-go",
			name: "Go",
			extension: ["go"],
			"extends": "text/plain"
		}
	]});

	/**
	 * Register syntax styling
	 */
	provider.registerServiceProvider("orion.edit.highlighter", {}, mGo.grammars[mGo.grammars.length - 1]);

	provider.registerServiceProvider("orion.edit.contentAssist", {
		computeProposals: function (buffer, offset, context) {
			var NL = context.delimiter;
			var INDENT = context.indentation;
			var TAB = context.tab;

			var constructs = [
				"inner", "if", "if",            "if ${cond} {"                         +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "func", "func",        "func ${name}() (${retval} ${type}) {" +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"inner", "for", "for",          "for ${cond} {"                        +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"inner", "switch", "switch",    "switch {"                             +NL+
				    INDENT+                     "case ${cond}:"                        +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "default:"                             +NL+
				    INDENT+                     "}",

				"inner", "select", "select",    "select {"                             +NL+
				    INDENT+                     "case ${cond}:"                        +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "default:"                             +NL+
				    INDENT+                     "}",

				"outer", "var", "var",          "var ("                                +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "const", "const",      "const ("                              +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "import", "import",    "import ("                             +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "", "method",          "func (this *${type}) ${name}() (${retval} ${type}) {"+NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "", "struct",          "type ${name} struct {"                +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"outer", "", "interface",       "type ${name} interface {"             +NL+
				    INDENT+                     TAB+"${cursor}"                        +NL+
				    INDENT+                     "}",

				"inner", "", "make channel",    "ch := make(chan ${type}, 0)",

				"inner", "", "make array",      "arr := make([]${type}, 1, 1)",

				"outer", "", "main",            "func main() {"                        +NL+
				    INDENT+                      TAB+"${cursor}"                       +NL+
				    INDENT+                     "}"
			];

			var proposals = [];

			if (buffer.length === 0 && offset === 0) {
				proposals.push({
					description: "new file template",
					proposal:	"// COPYRIGHT"          +NL+
								""                      +NL+
								"// GODOC"              +NL+
								"package ${name}"       +NL+
								                         NL+
								"import ("              +NL+
								TAB+"${import}"         +NL+
								")"                     +NL+
								                         NL+
								"func main() {"         +NL+
								TAB                     +NL+
								"}"                     +NL,
					escapePosition: 68 + NL.length * 10,
					positions: [{offset: 28 + NL.length * 3, length: 7}, {offset: 43 +  NL.length * 7, length: 9}]
				});

				proposals.push({
					description: "new test template",
					proposal:	"// COPYRIGHT"               +NL+
								""                           +NL+
								"package main"               +NL+
								                              NL+
								"import ("                   +NL+
								TAB+"testing"                +NL+
								")"                          +NL+
								                              NL+
								"func Test1(t *testing.T) {" +NL+
								TAB                          +NL+
								"}"                          +NL,
					escapePosition: 68 + NL.length * 9,
					positions: []
				});
			}

			for (var i = 0; i < constructs.length; i = i + 4) {
				var type = constructs[i];
				var matcher = constructs[i + 1];
				var keyword = constructs[i + 2];
				var proposal = constructs[i + 3];

				if (matcher.indexOf(context.prefix) !== 0) {
					continue;
				}

				// Check whether this proposal is an "outer" (outside of a var, const, func block)
				// or an "inner"
				if (type === "inner" && INDENT === "") {
					continue;
				}
				if (type === "outer" && INDENT !== "") {
					continue;
				}

				// Ellide the proposal with the existing prefix text where possible
				if (proposal.indexOf(context.prefix) === 0) {
					proposal = proposal.substring(context.prefix.length);
				}

				var propObj = {description: keyword, positions: []};

				// Calculate positions for the variables and the cursor
				var cursorIdx = proposal.indexOf("${cursor}");
				if (cursorIdx !== -1) {
					propObj.escapePosition = cursorIdx + offset;
					proposal = proposal.replace("${cursor}", "");
				}

				propObj.proposal = proposal;

				var idx = 0;
				while (idx !== -1 && idx < proposal.length - 4) {
					idx = proposal.indexOf("${", idx + 1);
					if (idx !== -1) {
						var off = idx + offset;
						var len = proposal.indexOf("}", idx + 1) + 1 - idx;
						if (len > 0) {
							propObj.positions.push({offset: off, length: len});
						}
					}
				}

				proposals.push(propObj);
			}

			return proposals;
		}
	}, {
		name: "Go content assist",
		contentType: ["text/x-go"]
	});

	provider.connect();
});
