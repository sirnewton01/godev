/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint forin:true regexp:false*/
/*global console define JSLINT window*/
define([
	"orion/plugin",
	"orion/jslintworker",
	"orion/objects"
], function(PluginProvider, _, objects) {
	var DEFAULT_VALIDATION_OPTIONS = {
			bitwise: false, eqeqeq: true, es5: true, immed: true, indent: 1, maxerr: 300, newcap: true, nomen: false,
			onevar: false, plusplus: false, regexp: true, strict: false, undef: true, white: false
	};
	var validationOptions = DEFAULT_VALIDATION_OPTIONS;

	function jslint(contents) {
		JSLINT(contents, validationOptions);
		return JSLINT.data();
	}

	function cleanup(error) {
		function fixWith(fixes, severity, force) {
			var description = error.description;
			for (var i=0; i < fixes.length; i++) {
				var fix = fixes[i],
				    find = (typeof fix === "string" ? fix : fix[0]),
				    replace = (typeof fix === "string" ? null : fix[1]),
				    found = description.indexOf(find) !== -1;
				if (force || found) {
					error.severity = severity;
				}
				if (found && replace) {
					error.description = replace;
				}
			}
		}
		function isBogus() {
			var bogus = ["Dangerous comment"], description = error.description;
			for (var i=0; i < bogus.length; i++) {
				if (description.indexOf(bogus[i]) !== -1) {
					return true;
				}
			}
			return false;
		}
		var warnings = [
			["Expected '{'", "Statement body should be inside '{ }' braces."]
		];
		var errors = [
			"Missing semicolon",
			"Extra comma",
			"Missing property name",
			"Unmatched ",
			" and instead saw",
			" is not defined",
			"Unclosed string",
			"Stopping, unable to continue"
		];
		// All problems are warnings by default
		fixWith(warnings, "warning", true);
		fixWith(errors, "error");
		return isBogus(error) ? null : error;
	}

	/**
	 * @param {Object} options
	 * @param {String} contents Text of file.
	 */
	function _computeProblems(options, contents) {
		var result = jslint(contents);
		var problems = [];
		var i;
		if (result.errors) {
			var errors = result.errors;
			for (i=0; i < errors.length; i++) {
				var error = errors[i];
				if (error) {
					var start = error.character - 1,
					    end = start + 1;
					if (error.evidence) {
						var index = error.evidence.substring(start).search(/.\b/);
						if (index > -1) {
							end += index;
						}
					}
					// Convert to format expected by validation service
					error.description = error.reason;
					error.start = error.character;
					error.end = end;
					error = cleanup(error);
					if (error) { problems.push(error); }
				}
			}
		}
		if (result.functions) {
			var functions = result.functions;
			var lines;
			for (i=0; i < functions.length; i++) {
				var func = functions[i];
				var unused = func.unused;
				if (!unused || unused.length === 0) {
					continue;
				}
				if (!lines) {
					lines = contents.split(/\r?\n/);
				}
				var nameGuessed = func.name[0] === '"';
				var name = nameGuessed ? func.name.substring(1, func.name.length - 1) : func.name;
				var line = lines[func.line - 1];
				for (var j=0; j < unused.length; j++) {
					// Find "function" token in line based on where fName appears.
					// nameGuessed implies "foo:function()" or "foo = function()", and !nameGuessed implies "function foo()"
					var nameIndex = line.indexOf(name);
					var funcIndex = nameGuessed ? line.indexOf("function", nameIndex) : line.lastIndexOf("function", nameIndex);
					if (funcIndex !== -1) {
						problems.push({
							reason: "Function declares unused variable '" + unused[j] + "'.",
							line: func.line,
							character: funcIndex + 1,
							end: funcIndex + "function".length,
							severity: "warning"
						});
					}
				}
			}
		}
		return { problems: problems };
	}

	var validationService = {
		// ManagedService
		updated: function(properties) {
			if (properties) {
				if (typeof properties.options === "string") {
					var options = properties.options;
					if (!/^\s*$/.test(options)) {
						var userOptionsMap = {}, hasUserOption = false;
						options.split(/,/).forEach(function(option) {
							var match = /\s*(\w+)\s*:\s*(\w+)\s*/.exec(option); // name:value
							if (match === null) {
								console.log('JSLint ignoring bad option: ' + option);
							} else {
								var name = match[1], value = match[2];
								userOptionsMap[name] = value;
								hasUserOption = true;
							}
						});
						validationOptions = {};
						objects.mixin(validationOptions, DEFAULT_VALIDATION_OPTIONS, userOptionsMap);
						if (hasUserOption) {
							console.log('JSLint using user-provided options: {' + Object.keys(userOptionsMap).map(function(k) {
								return k + ':' + userOptionsMap[k];
							}).join(',') + "}");
						}
					}
				}
			}
		},
		// orion.edit.validator
		computeProblems: function(editorContext, context) {
			return editorContext.getText().then(_computeProblems.bind(null, context));
		}
	};

	var headers = {
		name: "Orion JSLint Service",
		version: "1.0",
		description: "This plugin provides JSLint functionality for validating JSON."
	};

	var provider = new PluginProvider(headers);
	provider.registerService(["orion.edit.validator", "orion.cm.managedservice"], validationService, {
		contentType: ["application/json"],
		pid: "jslint.config"
	});
	provider.registerService("orion.core.setting",
		{},
		{	settings: [
				{	pid: 'jslint.config',
					name: 'JSLint Validator',
					tags: 'validation HTML JSON jslint'.split(' '),
					category: 'validation',
					properties: [
						{	id: 'options',
							name: 'Options to pass to JSLint (/*jslint ..*/)',
							type: 'string'
						}
					]
				}
			]
		});
	provider.connect();

});