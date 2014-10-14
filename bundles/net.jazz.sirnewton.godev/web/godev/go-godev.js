// Copyright 2013 Chris McGee <sirnewton_01@yahoo.ca>. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
define(['orion/xhr', 'orion/plugin', 'orion/form'], function (xhr, PluginProvider, form) {
    var headers = {
        name: "GoDev IDE Core Plugin",
        version: "1.0",
        description: "Go Dev core services."
    };
    
    var provider = new PluginProvider(headers);
    
    provider.registerService("orion.page.link.category", null, {
		id: "godoc",
		name: "Go Doc",
		imageClass: "core-sprite-search",
		order: 50
	});
	
    provider.registerServiceProvider("orion.page.link", null, {
        name: "Go Doc",
        id: "godev.godoc",
        category: "godoc",
        uriTemplate: "{+OrionHome}/godoc/pkg/"
        });
        
    provider.registerService("orion.page.link.category", null, {
		id: "debug",
		name: "Debug",
		imageClass: "core-sprite-rightarrow",
		order: 50
	});
	
    provider.registerServiceProvider("orion.page.link", null, {
        name: "Debug",
        id: "godev.debug",
        category: "debug",
        uriTemplate: "{+OrionHome}/godev/debug/debug.html"
        });
        
//    provider.registerServiceProvider("orion.page.link", {}, {
//        name: "Debug",
//        id: "godev.debug",
//        category: "terminal",
//        uriTemplate: "{+OrionHome}/godev/debug/debug.html"
//        });

	// Run a build to check for compile errors
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
			                        start: error.Column,
			                        end: 80,
			                        severity: "error"
			                    });
			                // There is another problem unrelated to this file
			                //  Put a marker at the top of the file.
		                    } else {
		                        problems.push({
		                            description: "There is a compile error in another file: "+error.Location,
		                            line: 1,
		                            start: 0,
		                            end: 80,
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
        
    // Run a format to check for format warnings    
    provider.registerServiceProvider("orion.edit.validator", {
            checkSyntax: function (title, contents) {
                // title is a relative URI for the file
                
	            var d = xhr("POST", "/go/fmt/?showLines=true", {
	                    headers: {},
	                    timeout: 60000,
	                    data: contents
	                }).then(function (result) {
	                    var warnings = JSON.parse(result.response);
	                    var problems = [];
	                    var warningLine;
	                    
	                    for (var idx = 0; idx < warnings.length; idx++) {
	                        warningLine = warnings[idx];
	                        
	                        problems.push({
	                            description: "Formatting warning",
	                            line: warningLine,
	                            start: 0,
	                            end: 80,
	                            severity: "warning"
	                        });
	                    }
	                    return {problems: problems};
	                });
	
	            return d;
            }
        }, {
            contentType: ["text/x-go"]
        });
        
    provider.registerServiceProvider("orion.edit.contentAssist", {
            computeProposals: function (buffer, offset, context) {
                // TODO provide the path for the editor buffer for better results
                var d = xhr("POST", "/completion?offset=" + offset + 
                                               "&path=" + context.title, {
	                    headers: {},
	                    timeout: 60000,
	                    data: buffer
	                }).then(function (result) {
	                    var completions = JSON.parse(result.response);
	                    var proposals = [];
	                    
	                    var name, type, proposal, positions;
	                    
	                    if (completions.length < 2) {
	                        return proposals;
	                    }
	                    
	                    for (var idx = 0; idx < completions[1].length; idx++) {
	                        name = completions[1][idx].name;
	                        type = completions[1][idx].type;
	                        
	                        // The proposal is just the name for now
	                        proposal = name;
	                        
	                        // Positions are only necessary for functions
	                        positions = null;
		                    
		                    // This is a function, 
		                    if (type.indexOf("func") === 0) {
		                        var signature = type.substring(type.indexOf("(")+1, type.indexOf(")"));
		                        var parameters = signature.split(",");
		          
		                        if (parameters.length !== 1 || parameters[0] !== "") {
			                        var parameterOffset = 0;         
			                        positions = [];
			                        for (var j = 0; j < parameters.length; j++) {
			                            positions.push({offset: offset + proposal.length + 1 + parameterOffset - context.prefix.length, length: parameters[j].length});
			                            parameterOffset = parameterOffset + parameters[j].length + 1;
			                        }
		                        }
		                        
		                        proposal = proposal + "(" + signature + ")";
		                    }
		                    
		                    proposals.push({
	                            proposal: proposal,
	                            description: name + " " + type,
	                            positions: positions,
	                            escapePosition: offset + proposal.length - context.prefix.length,
	                            overwrite: true
	                        });
                        }

	                    return proposals;
	                }, function(error) {
	                    if (error.status === 400) {
		                    return [{proposal: "", 
		                                description: "go get github.com/nsf/gocode for more assistance",
		                                escapePosition: offset}];
	                    }
	                    
	                    return [];
	                });
	
	            return d;
            }
        }, {
            name: "Go content assist",
            contentType: ["text/x-go"],
            charTriggers: "[.]"
        });

    provider.registerServiceProvider("orion.edit.outliner", {
            getOutline: function (contents, title) {
                var d = xhr("POST", "/go/outline", {
                    headers: {},
                    timeout: 60000,
                    data: contents
                }).then(function (result) {
                    var outline = JSON.parse(result.response);
                    return outline;
                }, function (error) {
                    // Don't show an error
                });

                return d;
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
        
	provider.registerService(
		"orion.edit.command", 
		{
			run: function(selectedText, text, selection) {
				var textToFormat = selectedText;
				
				if (!textToFormat || textToFormat === "") {
					textToFormat = text;
				}
				
				var d = xhr("POST", "/go/fmt/",
					{
						headers: {},
						timeout: 15000,
						data: textToFormat
					}).then(function(result) {
						if (selectedText && selectedText !== "") {
							return result.response;
						} else {
							return {
								text: result.response,
								selection: selection
							};
						}
					});
				
				return d;
			}
		},
		{
			name: "Format",
			tooltip: "Format Go code (Ctrl-Shift-R)",
			key: ["R", true, true],
			contentType: ["text/x-go"]
		});
		
		provider.registerService(
		"orion.edit.command", 
		{
			run: function(selectedText, text, selection) {				
				var d = xhr("POST", "/go/imports/",
					{
						headers: {},
						timeout: 15000,
						data: text
					}).then(function(result) {
						if (result.status === 200) {
							return {
								text: result.response,
								selection: selection
							};
						}
						
						return {selection: selection};
					}, function(error) {
						window.alert("Error launching the import tool. Try installing it with 'go get code.google.com/p/go.tools/cmd/goimports'");
					});
				
				return d;
			}
		},
		{
			name: "Imports",
			tooltip: "Fix up imports by adding/removing them (Ctrl-I)",
			key: ["I", true],
			contentType: ["text/x-go"]
		});
		
		provider.registerService(
		"orion.edit.command", 
		{
			run: function(selectedText, text, selection, resource) {
				// Convert the selection offset from characters to bytes
				var byteOffset = 0;
				var charCode = 0;
				for (var i = 0; i < selection.start; i++) {
					charCode = text.charCodeAt(i);
					
					// Double byte character
					if (charCode > 0x7F) {
						byteOffset = byteOffset + 2;
					} else {
						byteOffset++;
					}
				}
				
				var d = xhr("POST", "/go/defs"+resource+"?o="+byteOffset,
					{
						headers: {},
						timeout: 15000,
						data: text
					}).then(function(result) {
						if (result.status === 200) {
							var value = JSON.parse(result.response);
							var columns = [];
							
							// The definition is in the same file
							if (value.Location === resource) {
								var lineNum = parseInt(value.Line);
								var lines = text.split("\n");
								var offset = 0;
								
								for (var idx = 0; idx < lineNum-1; idx++) {
									offset = offset + lines[idx].length + 1;
								}
								
								offset = offset + parseInt(value.Column) - 1;
								
								return {
									selection: {
										start: offset,
										end: offset
									}
								};
							}
							
							if (value.Location !== "") {
								if (value.Line !== "") {
									return {uriTemplate: "/godev/godef/godef.html?resource="+value.Location+"&sel="+selection.start+"&line="+value.Line, width: "400px", height: "200px"};
								} else {
									return {uriTemplate: "/godev/godef/godef.html?resource="+value.Location+"&sel="+selection.start, width: "400px", height: "200px"};
								}
							}
						}
						
						return {selection: selection};
					}, function(error) {
						window.alert("Error launching the godef tool. Try installing it with 'go get code.google.com/p/rog-go/exp/cmd/godef'");
					});
				
				return d;
			}
		},
		{
			name: "Declaration",
			id: "go.godef",
			tooltip: "Open declaration of the selected item (F3)",
			key: [114],
			contentType: ["text/x-go"]
		});
		
	provider.registerService(
		"orion.edit.command", 
		{
			run: function(selectedText, text, selection, resource) {
				return {uriTemplate: "/godev/quickrun/run.html?resource="+resource+"&sel="+selection.start, width: "780px", height: "520px"};
			}
		},
		{
			name: "Run",
			id: "go.run",
			tooltip: "Go run the file (F8)",
			key: [119],
			contentType: ["text/x-go"]
		});
		
	provider.registerService(
		"orion.edit.command", 
		{
			run: function(selectedText, text, selection, resource) {
				var d = xhr("POST", "/go/defs" + resource + "?o=" + selection.start,
				{
					headers: {},
					timeout: 15000,
					data: text
				}).then(function(result) {
					// Could not resolve the item to a package and name
					if (result.status === 204) {
						return {selection: selection};
					}
					
					var value = JSON.parse(result.response);
					
					if (value.Package === "" || value.Name === "") {
						return {selection: selection};
					}
					
					return {uriTemplate: "/godev/godoc/showgodoc.html?pkg="+value.Package+"&name="+value.Name+"&sel="+selection.start, width: "600px", height: "400px"};
				});
				
				return d;
			}
		},
		{
			name: "Go Doc",
			id: "go.showgodoc",
			tooltip: "Show the godoc for the selected item in a frame (Ctrl-Shift-G)",
			key: ["G", true, true],
			contentType: ["text/x-go"]
		});
		
		provider.registerService(
		"orion.edit.blamer", 
		{
			doBlame: function(location) {
				// Trim any query parameters
				var queryIdx = location.indexOf("?");
				if (queryIdx !== -1) {
					location = location.substring(0, queryIdx);
				}
				
				var d = xhr("GET", "/blame/"+location,
				{
					headers: {},
					timeout: 30000
				}).then(function(result) {
					if (result.status === 200) {
						var value = JSON.parse(result.response);
						
						return value;
					}
					
					return [];
				}, function(error) {
					window.alert("Error getting blame. Make sure to install the appropriate VCS tool for this project (e.g. git, hg, lscm).");
					
					return [];
				});
				
				return d;
			}
		},
		{
			name: "Blame"
		});
   
    provider.connect();
});
