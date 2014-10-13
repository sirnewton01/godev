/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/Deferred'], function(Deferred) {

	function NonNlsSearch(fileClient, root, progress) {
		this.fileClient = fileClient;
		this.root = root;
		this.progress = progress;
	}

	NonNlsSearch.prototype.getNonNls = function() {
		return this.parseDirectory(this.root);
	};

	NonNlsSearch.prototype.parseDirectory = function(root) {
		var deferred = new Deferred();
		var self = this;

		var def = this.fileClient.read(root, true);
		if (this.progress) {
			this.progress.progress(def, "Reading files from " + root);
		}
		def.then(function(jsonData) {
			self.parseDirectoryData(jsonData).then(function(result) {
				deferred.resolve(result);
			},

			function(error) {
				deferred.reject(error);
			});
		}, function(error) {
			deferred.reject(error);
		});

		return deferred;
	};

	NonNlsSearch.prototype.parseDirectoryData = function(jsonData) {
		var deferred = new Deferred();
		var self = this;
		if (jsonData.Directory) {
			if (jsonData.Children) {
				var deferreds = [];
				for (var i = 0; i < jsonData.Children.length; i++) {
					var child = jsonData.Children[i];
					deferreds.push(self.parseDirectoryData(child));
				}
				Deferred.all(deferreds).then(function(results) {
					var ret = {
						Children: []
					};
					for (var i = 0; i < results.length; i++) {
						if (results[i]) {
							ret.Children = ret.Children.concat(results[i].Children);
						}
					}
					deferred.resolve(ret);
				});
			} else {
				self.parseDirectory(jsonData.ChildrenLocation).then(function(result) {
					deferred.resolve(result);
				},

				function(error) {
					deferred.reject(error);
				});
			}
		} else {
			if (jsonData.Name.lastIndexOf(".js") === (jsonData.Name.length - 3)) { //$NON-NLS-0$
				var def = self.fileClient.read(jsonData.Location, true);
				if (self.progress) {
					self.progress.progress(def, "Preparing to extract strings from file " + jsonData.Name);
				}
				def.then(function(jsonData) {
					var def1 = self.fileClient.read(jsonData.Location, false);
					if (self.progress) {
						self.progress.progress(def, "Getting file contents " + jsonData.Name);
					}
					def1.then(function(contents) {
						jsonData.nonnls = self.parseFile(contents);
						var ret;
						if (jsonData.nonnls.length > 0) {
							ret = {
								Children: [jsonData]
							};
						} else {
							ret = {
								Children: []
							};
						}
						deferred.resolve(ret);
					});
				});
			} else {
				deferred.resolve({
					Children: []
				});
			}
		}
		return deferred;
	};

	function getExcluded(contents) {
		function getExcludedForRegex(exlRegExp) {
			var ret = [];
			var match = exlRegExp.exec(contents);
			while (match) {
				ret.push(match);
				match = exlRegExp.exec(contents);
			}
			return ret;
		}
		function Exclusions(contents) {
			var excluded = getExcludedForRegex(new RegExp("/\\x2a[^\\x2a]*\\x2a+(?:[^\\x2a/][^\\x2a]*\\x2a+)*/", "gm"))
				.concat(getExcludedForRegex(new RegExp("//.*\\r?\\n*", "gm"))) //$NON-NLS-0$
				.concat(getExcludedForRegex(new RegExp("define\\(\\[[^\\]]*\\]", "gm"))) //$NON-NLS-1$ //$NON-NLS-0$
				.concat(getExcludedForRegex(new RegExp("define\\([\"\'][^\"\']*[\"\'], *\\[[^\\]]*\\]", "gm"))) //$NON-NLS-1$ //$NON-NLS-0$
				.concat(getExcludedForRegex(new RegExp("messages\\[[^\\]]*\\]", "gmi"))); //$NON-NLS-1$ //$NON-NLS-0$
			this.excluded = excluded;
		}
		Exclusions.prototype.contains = function(match, offset) {
			var excluded = this.excluded;
			for (var i = 0; i < excluded.length; i++) {
				if ((match.index + offset) > excluded[i].index && (match.index + offset) < (excluded[i].index + excluded[i][0].length)) {
					return true;
				}
			}
			return false;
		};
		return new Exclusions(contents);
	}

	NonNlsSearch.prototype.parseFile = function(contents) {
		var exclusions = getExcluded(contents);

		var nonnlsstrings = [];
		var stringRegExp = /("(\\"|[^"])+")|('(\\'|[^'])+')/g; //$NON-NLS-1$ //$NON-NLS-0$
		var nonnlsRegExp = /\/\/\$NON-NLS-[0-9]+\$/g;
		var lines = contents.split(/\r?\n/);
		lines.forEach(function(line, i) {
			var lineOffset = contents.indexOf(line);
			var match = stringRegExp.exec(line);
			var strings = [];
			var realStringNum = 0;
			while (match) {
				match.realNum = realStringNum++;
				if (!exclusions.contains(match, lineOffset)) {
					strings.push(match);
				}
				match = stringRegExp.exec(line);
			}
			if (strings.length > 0) {
				var nonnls = {};
				match = nonnlsRegExp.exec(line);
				while (match) {
					nonnls[parseInt(match[0].substring(11, match[0].length - 1), 10)] = true;
					match = nonnlsRegExp.exec(line);
				}

				for (var j = 0; j < strings.length; j++) {
					if (!nonnls[strings[j].realNum]) {
						nonnlsstrings.push({
							lineNum: i,
							line: line,
							string: strings[j][0],
							character: strings[j].index + 1,
							end: strings[j].index + strings[j][0].length
						});
					}
				}
			}
		});
		return nonnlsstrings;
	};

	NonNlsSearch.prototype.constructor = NonNlsSearch;

	function compareNls(a, b) {
		if (a.character < b.character) {
			return -1;
		}
		if (a.character > b.character) {
			return 1;
		}
		return 0;
	}

	function addMessagesModule(contents, module) {
		var match = new RegExp("define\\(\\[[^\\]]*\\],[\\s\\r\\n]*function\\(", "gm").exec(contents); //$NON-NLS-1$ //$NON-NLS-0$
		if (!match) {
			match = new RegExp("define\\([\"\'][^\"\']*[\"\'], *\\[[^\\]]*\\],[\\s\\r\\n]*function\\(", "gm").exec(contents); //$NON-NLS-1$ //$NON-NLS-0$
		}
		if (!match || match[0].indexOf(module) > 0) {
			return contents;
		}
		var modules = new RegExp("\\[[^\\]]*\\]", "gm").exec(match[0]); //$NON-NLS-1$ //$NON-NLS-0$
		if (modules[0].match(new RegExp("\\[\\s*\\]", "gm"))) { //$NON-NLS-1$ //$NON-NLS-0$
			contents = contents.replace(match[0], match[0] + "messages"); //$NON-NLS-0$
			contents = contents.replace(modules[0], modules[0][0] + "'" + module + "'" + modules[0].substring(1)); //$NON-NLS-1$ //$NON-NLS-0$
		} else {
			contents = contents.replace(match[0], match[0] + "messages, "); //$NON-NLS-0$
			contents = contents.replace(modules[0], modules[0][0] + "'" + module + "', " + modules[0].substring(1)); //$NON-NLS-1$ //$NON-NLS-0$
		}
		return contents;
	}

	function escapeQuotes(message) {
		message = message.replace(/\"/g, "\\\""); //$NON-NLS-0$
		return message;
	}

	function unescapeQuotes(message) {
		message = message.substring(1, message.length - 1);
		message = message.replace(/\\\"/g, "\""); //$NON-NLS-0$
		message = message.replace(/\\\'/g, "\'"); //$NON-NLS-0$
		return message;
	}

	// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=408259
	function generateMessageKey(str) {
		function camelCase(str, index) {
			var c = str.charAt(0);
			return ((index === 0) ? c.toLowerCase() : c.toUpperCase()) + str.substr(1);
		}
		var MAX_WORDS = 5;
		return str.split(/\s+/, MAX_WORDS).filter(function(s) { return s; }).map(camelCase).join(""); //$NON-NLS-0$
	}

	function replaceNls(contents, nls, config, saveMessages) {
		if (!config) {
			config = {};
		}
		if (!config.messages) {
			config.messages = {};
		}
		var messages;
		if (saveMessages) {
			messages = config.messages;
		} else {
			messages = {};
			Object.keys(config.messages).forEach(function (message) {
				messages[message] = config.messages[message];
			});
		}
		var stringRegExp = /("(\\"|[^"])+")|('(\\'|[^'])+')/g; //$NON-NLS-1$ //$NON-NLS-0$
		var lines = contents.split(/\r?\n/);
		var lineStructure = {};
		for (var i = 0; i < nls.length; i++) {
			var nlsitem = nls[i];
			if (!lineStructure[nlsitem.lineNum]) {
				lineStructure[nlsitem.lineNum] = [];
			}
			lineStructure[nlsitem.lineNum].push(nlsitem);
		}
		var stringExternalized = false;
		Object.keys(lineStructure).forEach(function (lineNum) {
			lineStructure[lineNum].sort(compareNls);
			for (var i = lineStructure[lineNum].length - 1; i >= 0; i--) {
				var change = lineStructure[lineNum][i];
				var line = lines[lineNum];
				if (change.checked) {
					stringExternalized = true;
					var strippedString = unescapeQuotes(change.string);
					var messageValue = strippedString;
					var messageKey = generateMessageKey(messageValue);
					var legacyMessageKey = messageValue; // for compatibility with old message files
					if (change.parent && change.parent.Location === config.fileLocation) {
						// We are changing the message file itself, update a legacy-style key to new style
						var isChangeToKey = change.line.indexOf(change.string, change.character + change.end) !== -1;
						if (messages && Object.prototype.hasOwnProperty.call(messages, legacyMessageKey)) { //$NON-NLS-1$ //$NON-NLS-0$
							if (isChangeToKey) {
								delete messages[legacyMessageKey];
								change.replace = '"' + escapeQuotes(messageKey) + '"'; //$NON-NLS-1$ //$NON-NLS-0$
							} else {
								// Don't mess with message values
								delete change.replace;
							}
						}
					} else if (messages && Object.prototype.hasOwnProperty.call(messages, messageKey)) {
						change.replace = "messages[\"" + escapeQuotes(messageKey) + "\"]"; //$NON-NLS-1$ //$NON-NLS-0$
					} else {
						change.replace = "messages[\"" + escapeQuotes(messageKey) + "\"]"; //$NON-NLS-1$ //$NON-NLS-0$
						messages = messages || {};
						messages[messageKey] = messageValue;
					}
					if (change.replace) {
						//					 change.replace = change.string;//remove
						var moveCharacters = change.replace.length - change.string.length;
						change.newcharacter = change.character;
						lines[lineNum] = line.substring(0, change.character - 1) + change.replace + line.substring(change.end);
						for (var j = i + 1; j < lineStructure[lineNum].length; j++) {
							lineStructure[lineNum][j].newcharacter += moveCharacters;
						}
					} else {
						lines[lineNum] = line;
					}
				} else if (config.marknls) {
					var foundStrings = line.substring(0, change.character - 1).match(stringRegExp);
					var stringNo = foundStrings ? foundStrings.length : 0;
					change.replace = " \/\/$NON-NLS-" + stringNo + "$"; //$NON-NLS-1$ //$NON-NLS-0$
					change.newcharacter = line.length;
					lines[lineNum] += change.replace;
				} else {
					delete change.replace;
					change.newcharacter = change.character;
				}
			}
		});
		var newlineRegExp = /\r?\n/g;
		var ret = "";
		try {
			lines.forEach(function(line) {
				var newline = newlineRegExp.exec(contents);
				ret += line;
				if (newline) {
					ret += newline[0];
				}
			});
		} catch (e) {
			contents.error(e);
		}
		if (stringExternalized && config.module) {
			return addMessagesModule(ret, config.module);
		}
		return ret;
	}

	function stringify(messages) {
		var ret = "{"; //$NON-NLS-0$
		var isFirst = true;
		Object.keys(messages).forEach(function (message) {
			if (!isFirst) {
				ret += ","; //$NON-NLS-0$
			}
			ret += "\n\t\""; //$NON-NLS-0$
			ret += escapeQuotes(message);
			ret += "\": \""; //$NON-NLS-0$
			ret += escapeQuotes(messages[message]);
			ret += "\""; //$NON-NLS-0$
			isFirst = false;
		});
		ret += "\n}"; //$NON-NLS-0$
		return ret;
	}

	function writeMessagesFile(fileClient, config, messages, progress) {
		var deferred = new Deferred();
		var keyToMessage = {};
		
		Object.keys(messages).forEach(function (message) {
			keyToMessage[message] = messages[message];
		});
		var def = fileClient.read(config.fileLocation);
		if (progress) {
			progress.progress(def, "Reading messages file " + config.fileLocation);
		}
		def.then(function(contents) {
			var match = new RegExp("define\\(\\{(.*\\r?\\n*)*\\}\\);", "gmi").exec(contents); //$NON-NLS-1$ //$NON-NLS-0$
			if (match) {
				var messagesString = match[0].substring("define(".length, match[0].length - ");".length); //$NON-NLS-1$ //$NON-NLS-0$
				contents = contents.replace(messagesString, stringify(keyToMessage));
			} else {
				contents = "define(" + stringify(keyToMessage) + ");"; //$NON-NLS-1$ //$NON-NLS-0$
			}
			var def1 = fileClient.write(config.fileLocation, contents);
			if (progress) {
				progress.progress(def1, "Writing messages file " + config.fileLocation);
			}
			def1.then(

			function() {
				deferred.resolve();
			},

			function(error) {
				deferred.reject(error);
			});
		}, function(error) {
			if (error.status === 404) {
				var create = function() {
					var def1 = fileClient.createFolder(config.directory.Location, "root");
					if (progress) {
						progress.progress(def1, "Creating messages directory " + config.directory.Location);
					}
					def1.then( //$NON-NLS-0$
					function(metadata) {
						var def2 = fileClient.createFile(metadata.Location, config.file);
						if (progress) {
							progress.progress(def1, "Creating messages file " + metadata.Location);
						}
						def2.then(

						function(metadata) {
							var def3 = fileClient.write(metadata.Location, "define(" + stringify(keyToMessage) + ");");
							if (progress) {
								progress.progress(def3, "Writing messages file " + metadata.Location);
							}
							def3.then( //$NON-NLS-1$ //$NON-NLS-0$
							function() {
								deferred.resolve();
							},

							function(error) {
								deferred.reject(error);
							});
						},

						function(error) {
							deferred.reject(error);
						});
					},

					function(error) {
						deferred.reject(error);
					});
				};
				var def2 = fileClient.read(config.directory.Location, true);
				if (progress) {
					progress.progress(def2, "Reading messages directory " + config.directory.Location);
				}
				def2.then(function(metadata) {
					create();
				}, function(error) {
					if (error.status === 404) {
						var def3 = fileClient.createFolder(config.directory.Parents[0].Location, config.directory.Name);
						if (progress) {
							progress.progress(def3, "Creating messages directory " + config.directory.Name);
						}
						def3.then(function(metadata) {
							create();
						}, function(error) {
							deferred.reject(error);
						});
					}
				});

			} else {
				deferred.reject(error);
			}
		});
		return deferred;
	}

	return {
		getExcluded: getExcluded,
		NonNlsSearch: NonNlsSearch,
		replaceNls: replaceNls,
		writeMessagesFile: writeMessagesFile
	};
});