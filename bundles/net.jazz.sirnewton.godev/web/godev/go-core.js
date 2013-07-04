// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
define(['orion/xhr', 'orion/plugin'], function (xhr, PluginProvider) {
    var headers = {
        name: "Go Language Core Plugin",
        version: "1.0",
        description: "Go programming language core services."
    };
    
    var provider = new PluginProvider(headers);
    
    provider.registerServiceProvider("orion.page.link", {}, {
        name: "Go Doc Search",
        id: "godev.godoc",
        uriTemplate: "{OrionHome}/godev/godoc/godoc.html"
        });
        
    provider.registerServiceProvider("orion.navigate.command", {}, {
        name: "Open Go Doc",
        id: "godev.godoc.lookup",
        forceSingleItem: true,
        uriTemplate: "{OrionHome}/godev/godoc/godoc.html#location={Location}",
        tooltip: "Open up the go doc for this package"
    });
        
    provider.registerServiceProvider("orion.page.link", {}, {
        name: "Debug",
        id: "godev.debug",
        uriTemplate: "{OrionHome}/godev/debug/debug.html"
        });

    provider.registerServiceProvider("orion.edit.validator", {
            checkSyntax: function (title, contents) {
                // title is a relative URI for the file
                var pkg = title;
                pkg = pkg.replace(/^\/file\//g, "");
                var pkgSegs = pkg.split('/');
			    pkg = pkgSegs.splice(0,pkgSegs.length-1).join('/');
                
	            var d = xhr("GET", "/go/build?pkg=" + pkg + "&clean=true", {
	                    headers: {},
	                    timeout: 60000
	                }).then(function (result) {
	                    var errors = JSON.parse(result.response);
	                    var problems = [];
	                    
	                    for (var idx = 0; idx < errors.length; idx++) {
	                        var error = errors[idx];
	                        
	                        if (error.Location === title) {
			                    problems.push({
			                        description: error.Msg,
			                        line: error.Line,
			                        start: 0,
			                        end: 0,
			                        severity: "error"
			                    });
		                    }
	                    }
	                    return {problems: problems};
	                });
	
	            return d;
            }
        }, {
            contentType: ["text/x-go"]
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
                // context.prefix will not include a '.' and any characters before it.
                // This is quite annoying because we often was code assists for qualified
                //  package names and the first letter of a var, constant or function.
                // We will recalculate the context prefix here.
                var o = offset - context.prefix.length - 1;
                var dots = 0;
                
                debugger;
                
                while (o !== -1 && /^[A-Za-z0-9_\.]$/.exec(buffer.substring(o,o+1))) {
                    if (buffer[o] === '.') {
                        if (dots === 1) {
                            break;
                        }
                        dots++;
                    }
                    o--;
                }
                
                context.prefix = buffer.substring(o+1, offset);
                
                // There are alot of these kinds of proposals.
                //  We only present them if we have some kind of 
                //  existing text to narrow down the search.
                //  Also, these are proposals for inside func, const, var, type.
                //  They don't make sense when invoked at the first column.
                if (context.prefix === "" || context.indentation === "") {
                    return [];
                }
                
                var proposals = [];

                for (var i = 0; i < goCodeAssistTemplates.length; i = i + 4) {
                    var matcher = goCodeAssistTemplates[i];
                    var keyword = goCodeAssistTemplates[i + 1];
                    var proposal = goCodeAssistTemplates[i + 2];
                    var parmsPositions = goCodeAssistTemplates[i + 3];
                    
                    if (matcher.indexOf(context.prefix) !== 0) {
                        continue;
                    }

                    // Ellide the proposal with the existing prefix text where possible
                    if (proposal.indexOf(context.prefix) === 0) {
                        proposal = proposal.substring(context.prefix.length);
                    }
                    
                    var positions = [];
                    
                    // Generate offsets for the parameters
                    for (var idx = 0; idx < parmsPositions.length; idx = idx + 2) {
                        var off = parmsPositions[idx] + offset - context.prefix.length;
                        var len = parmsPositions[idx+1];
                        
                        positions.push({offset: off, length: len});
                    }

                    proposals.push({
                            proposal: proposal,
                            description: keyword,
                            positions: positions,
                            escapePosition: proposal.length + offset
                        });
                }

                return proposals;
            }
        }, {
            name: "Go content assist",
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
                            proposal: "package ${name}"       +NL+
                                      NL+
                                      "import ("              +NL+
                                       TAB+"${import}"        +NL+
                                      ")"                     +NL+
                                      NL+
                                      "func main() {"         +NL+
                                       TAB                    +NL+
                                      "}"                     +NL,
                            escapePosition: 55,
                            positions: [{offset: 8+offset, length: 7},
                                        {offset: 27+offset, length: 9}]
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

    provider.registerServiceProvider("orion.edit.outliner", {
            getOutline: function (contents, title) {
                var outline = [];
                var lines = contents.split(/\r?\n/);
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i];
                    // Check for any functions on this line
                    // TODO handle functions that cross lines even though this wouldn't follow style guidelines
                    // TODO include the parameters, member type
                    var funcMatch = /^func\s+([a-zA-Z0-9]+).*$/.exec(line);

                    if (funcMatch) {
                        outline.push({
                                label: "func " + funcMatch[1],
                                line: i + 1
                            });
                    }

                    var methodMatch = /^func\s+\(([^)]+)\)\s+([a-zA-Z0-9]+).*$/.exec(line);

                    if (methodMatch) {
                        outline.push({
                                label: "func " + methodMatch[1],
                                line: i + 1
                            });
                    }

                    // TODO handle type blocks and types whose names span multiple lines
                    var typeMatch = /^type\s+([a-zA-Z0-9]+).*$/.exec(line);
                    if (typeMatch) {
                        outline.push({
                                label: "type " + typeMatch[1],
                                line: i + 1
                            });
                    }

                    var varMatch = /var \(/.exec(line);
                    if (varMatch) {
                        outline.push({
                                label: "VAR",
                                line: i + 1
                            });
                    }

                    var constMatch = /const \(/.exec(line);
                    if (constMatch) {
                        outline.push({
                                label: "CONST",
                                line: i + 1
                            });
                    }

                    var importMatch = /import \(/.exec(line);
                    if (importMatch) {
                        outline.push({
                                label: "IMPORT",
                                line: i + 1
                            });
                    }
                }
                return outline;
            }
        }, {
            contentType: ["text/x-go"],
            name: "Go Outline",
            id: "net.jazz.sirnewton.go.outline"
        });

    // Register shell commands the go tool (e.g. go fmt, go build)
    provider.registerServiceProvider(
        "orion.shell.command",
        null, {
            name: "go",
            description: "go tool commands"
        });

    // Go Format shell command
    var formatCmdImpl = {
        callback: function (args, cwd) {
            var pkg = args.pkg;
            if (!pkg) {
                pkg = cwd.cwd;
                pkg = pkg.replace(/^\/file\//g, "");
            }

            var d = xhr("GET", "/go/fmt?pkg=" + pkg, {
                    headers: {},
                    timeout: 60000
                }).then(function (result) {
                    return "Finished formatting package " + pkg;
                }, function (error) {
                    return "Error formatting package " + pkg;
                });

            return d;
        }
    };

    provider.registerServiceProvider(
        "orion.shell.command",
        formatCmdImpl, {
            name: "go fmt",
            description: "Format a go package",
            parameters: [{
                    name: "pkg",
                    type: "string",
                    description: "The package to format",
                    defaultValue: null
                }
            ]
        });

    // Go Build shell command
    var buildCmdImpl = {
        callback: function (args, cwd) {
            var pkg = null;
            if (args.pkg) {
                pkg = args.pkg.path;
            } else {
                pkg = cwd.cwd;
            }
            
            pkg = pkg.replace(/^\/file\//g, "");

            var d = xhr("GET", "/go/build?pkg=" + pkg + "&clean=true", {
                    headers: {},
                    timeout: 60000
                }).then(function (result) {
                    var errors = JSON.parse(result.response);
                    if (errors.length > 0) {
                        var output = "The following errors occurred building package " + pkg + "\r\n";
                        for (var idx = 0; idx < errors.length; idx++) {
                            output = output + errors[idx].Location + ":" + errors[idx].Line + ":" + errors[idx].Msg + "\r\n";
                        }
                        return output;
                    } else {
                        return "No errors building package " + pkg;
                    }
                }, function (error) {
                    return "Error building package " + pkg;
                });

            return d;
        }
    };

    provider.registerServiceProvider(
        "orion.shell.command",
        buildCmdImpl, {
            name: "go build",
            description: "Build a go package",
            parameters: [{
                    name: "pkg",
                    type: {name: "file", directory: true, exist: true},
                    description: "The package to build",
                    defaultValue: null
                }
            ]
        });
        
    // Go Install shell command
    var installCmdImpl = {
        callback: function (args, cwd) {
            var pkg = null;
            if (args.pkg) {
                pkg = args.pkg.path;
            } else {
                pkg = cwd.cwd;
            }
            
            pkg = pkg.replace(/^\/file\//g, "");

            var d = xhr("GET", "/go/build?pkg=" + pkg + "&clean=true&install=true", {
                    headers: {},
                    timeout: 60000
                }).then(function (result) {
                    var errors = JSON.parse(result.response);
                    if (errors.length > 0) {
                        var output = "The following errors occurred installing package " + pkg + "\r\n";
                        for (var idx = 0; idx < errors.length; idx++) {
                            output = output + errors[idx].Location + ":" + errors[idx].Line + ":" + errors[idx].Msg + "\r\n";
                        }
                        return output;
                    } else {
                        return "No errors installing package " + pkg;
                    }
                }, function (error) {
                    return "Error building package " + pkg;
                });

            return d;
        }
    };

    provider.registerServiceProvider(
        "orion.shell.command",
        installCmdImpl, {
            name: "go install",
            description: "Install a go package",
            parameters: [{
                    name: "pkg",
                    type: {name: "file", directory: true, exist: true},
                    description: "The package to install",
                    defaultValue: null
                }
            ]
        });
        
        /* provider.registerService("orion.navigate.command", {
		run : function(item) {
			var pkg = item.Location;
			pkg = pkg.replace(/^\/file\//g, "");
			var pkgSegs = pkg.split('/');
			pkg = pkgSegs.splice(0,pkgSegs.length-1).join('/');
			var d = xhr("GET", "/go/build?pkg="+pkg+"&clean=true", {
				headers: {},
				timeout: 60000
			}).then(function(result) {
				result = result.response ? JSON.parse(result.response) : null;
				if (result.length > 0) {
					window.alert("Build produced errors. Package "+pkg);
				} else {
					window.alert("Build succeeded! Package "+pkg);
				}
			});
			
			return d;
		}
	}, {
		image: "../images/gear.png",
		name: "Go Build",
		forceSingleItem: true,
		validationProperties: [
			{source: "Directory", match: false}
		],
		contentType: ["text/x-go"],
		id: "net.jazz.sirnewton.godev.build",
		tooltip: "Builds the current Go package",
		showGlobally: true
	});
	
	provider.registerService("orion.navigate.command", {
		run : function(item) {
			var pkg = item.Location;
			pkg = pkg.replace(/^\/file\//g, "");
			var pkgSegs = pkg.split('/');
			pkg = pkgSegs.splice(0,pkgSegs.length-1).join('/');
			
			var d = xhr("GET", "/go/fmt?pkg="+pkg, {
				headers: {},
				timeout: 60000
			}).then(function(result) {
				window.alert("Finished formatting package "+pkg);
			});
			
			return d;
		}
	}, {
		image: "../images/gear.png",
		name: "Go Format",
		forceSingleItem: true,
		validationProperties: [
			{source: "Directory", match: false}
		],
		contentType: ["text/x-go"],
		id: "net.jazz.sirnewton.godev.fmt",
		tooltip: "Formats the current Go package using the 'go fmt' tool.",
		showGlobally: true
	});*/

    // The following section registers a selection listener on the editor model
    /*provider.registerServiceProvider("orion.edit.model", {
            onSelection: function (e) {
                var oldSelection = e.oldValue;
                var newSelection = e.newValue;

                debugger;
            }
        }, {
            types: ["Selection"],
            contentType: ["text/x-go"]
        });
    */

    provider.connect();
});