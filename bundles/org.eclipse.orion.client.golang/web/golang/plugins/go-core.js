/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     Chris McGee <sirnewton_01@yahoo.ca> - initial API and implementation
 *******************************************************************************/
define(['orion/xhr', 'orion/plugin', 'orion/form'], function (xhr, PluginProvider, form) {
    var headers = {
        name: "Go Language Core Plugin",
        version: "1.0",
        description: "Go programming language core services."
    };
    
    var provider = new PluginProvider(headers);
    
    // Declare the content type for Go files here
    provider.registerServiceProvider("orion.core.contenttype", {}, {
    contentTypes: [
        {
            id: "text/x-go",
            name: "Go",
            extension: ["go"],
            "extends": "text/plain"
        }
    ]});
    
   provider.registerServiceProvider("orion.edit.highlighter",
   {
   }, {
     type : "grammar",
     contentType: ["text/x-go"],
     grammar: {
       patterns: [
            // Multi-line comment
            {
                name: "cm-comment",
                begin: '/\\*',
                end: '\\*/',
                beginCaptures: {"0": {name: "cm-comment"}},
                endCaptures: {"0": {name: "cm-comment"}}
            },

			// Double-quote strings
			{
				name: "cm-string",
				match: '""'
			},
			{
				name: "cm-string",
				match: '"(.*?)[^\\\\]"'
			},

			
			// Single quote strings
			{
				name: "cm-string",
				match: "'(.*?)[^\\\\]'"
			},
			
			// Multi-line strings
			{
				name: "cm-string",
				begin: "`",
				end: "`",
				beginCaptures: {"0": {name: "cm-string"}},
				endCaptures: {"0": {name: "cm-string"}}
			},
			
			// Single-line comment
            {
                name: "cm-comment",
                match: "//(.*)$"
            },
           
            // Keywords
            {
                captures: {"1": {name: "cm-keyword"}},
                // Order is important here. goto was placed before go so that it would try to match
                //  the bigger word when the smaller word is a prefix.
                match: '^|\\s+(break|case|const|continue|default|defer|else|fallthrough|for|func|goto|go|if|import|package|range|return|select|switch|type|var)\\s+|{|\\[|\\(|$'
            },
            
            // built-in types (integers, booleans, etc.)
            {
                captures: {"1": {name: "cm-builtin"}},
                match: '^|[\\(\\]\\[,\\+\\-\\*=]|\\s+(bool|chan|uint8|uint16|uint32|uint64|int8|int16|int32|int64|float32|float64|complex64|complex128|byte|map|rune|uint|interface|int|uintptr|string|struct|error)[\\(\\),{\\[\\]]|\\s+|$'
            },
            
            // Simple literals
            {
                captures: {"1": {name: "cm-atom"}},
                match: '^|\\W|\\s+(true|false|nil)\\W|\\s+|$'
            },
            
            // Built-in functions
            {
                captures: {"1": {name: "cm-tag"}},
                match: '^|[\\(\\],\\+\\-\\*=]|\\s+(len|cap|new|make|append|close|copy|delete|complex|real|imag|panic|recover)\\s*\\('
            }
       ]
     }
   });

    provider.registerServiceProvider("orion.edit.validator", {
            checkSyntax: function (title, contents) {
                var problems = [];
                var lines = contents.split(/\r?\n/);
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];

                    var todoMatch = /\/\/\s*TODO/.exec(line);
                    if (todoMatch) {
                        problems.push({
                                description: "TODO",
                                line: i + 1,
                                start: todoMatch.index + 1,
                                end: todoMatch.index + todoMatch[0].length + 1,
                                severity: "task"
                            });
                    }

                    var fixmeMatch = /\/\/\s*FIXME/.exec(line);
                    if (fixmeMatch) {
                        problems.push({
                                description: "FIXME",
                                line: i + 1,
                                start: fixmeMatch.index + 1,
                                end: fixmeMatch.index + fixmeMatch[0].length + 1,
                                severity: "warning"
                            });
                    }
                }
                var result = {
                    problems: problems
                };
                return result;
            }
        }, {
            contentType: ["text/x-go"]
        });

    provider.registerServiceProvider("orion.edit.contentAssist", {
            computeProposals: function (buffer, offset, context) {
                var NL = context.delimiter;
                var INDENT = context.indentation;
                var TAB = context.tab;
                
                var constructs = [
                    "inner", "if", "if",            "if ${cond} {"                         +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                        
                    "outer", "func", "func",        "func ${name}() (${retval} ${type}) {"  +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                        
                    "inner", "for", "for",          "for ${cond} {"                        +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                      "}",
                        
                    "inner", "switch", "switch",    "switch {"                             +NL+
                        INDENT+                     "case ${cond}:"                        +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "default:"                             +NL+
                        INDENT+                     "}",
                        
                    "inner", "select", "select",    "select {"                             +NL+
                        INDENT+                     "case ${cond}:"                        +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "default:"                             +NL+
                        INDENT+                     "}",
                                          
                    "outer", "var", "var",          "var ("                                +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                                     
                    "outer", "const", "const",      "const ("                              +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                                         
                    "outer", "import", "import",    "import ("                             +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",

                    "outer", "", "method",          "func (this *${type}) ${name}() (${retval} ${type}) {"+NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                        
                    "outer", "", "struct",          "type ${name} struct {"                +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
                        INDENT+                     "}",
                        
                    "outer", "", "interface",       "type ${name} interface {"             +NL+
                        INDENT+                      TAB+"${cursor}"                       +NL+
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
                            proposal: "// COPYRIGHT"          +NL+
                                      ""                      +NL+
                                      "// GODOC"              +NL+
                                      "package ${name}"       +NL+
                                      NL+
                                      "import ("              +NL+
                                       TAB+"${import}"        +NL+
                                      ")"                     +NL+
                                      NL+
                                      "func main() {"         +NL+
                                       TAB                    +NL+
                                      "}"                     +NL,
                            escapePosition: 78,
                            positions: [{offset:31+offset, length: 7},
                                        {offset: 50+offset, length: 9}]
                        });
                        
                    proposals.push({
                            description: "new test template",
                            proposal: "// COPYRIGHT"          +NL+
                                      ""                      +NL+
                                      "package main"       +NL+
                                      NL+
                                      "import ("              +NL+
                                       TAB+"testing"        +NL+
                                      ")"                     +NL+
                                      NL+
                                      "func Test1(t *testing.T) {"         +NL+
                                       TAB                    +NL+
                                      "}"                     +NL,
                            escapePosition: 77,
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
                    //   or an "inner"
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
                    
                    var propObj = {description: keyword,
                                     positions: []};
                    
                    // Calculate positions for the variables and the cursor
                    var cursorIdx = proposal.indexOf("${cursor}");
                    if (cursorIdx !== -1) {
                        propObj.escapePosition = cursorIdx + offset;
                        proposal = proposal.replace("${cursor}", "");
                    }
                    
                    propObj.proposal = proposal;
                    
                    var idx = 0;
                    while (idx !== -1 && idx < proposal.length - 4) {
                        idx = proposal.indexOf("${", idx+1);
                        
                        if (idx !== -1) {
                            var off = idx + offset;
                            var len = proposal.indexOf("}", idx+1) + 1 - idx;
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
