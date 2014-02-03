/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 *******************************************************************************/

/*global define*/
/*jslint browser:true*/

define(["i18n!orion/shell/nls/messages", "orion/shell/Shell", "orion/i18nUtil", "orion/Deferred", "shell/resultWriters"],
	function(messages, mShell, i18nUtil, Deferred, mResultWriters) {

	var orion = {};
	orion.shellPage = {};

	function FileResult(value, typeSpec, typedPath, shellPageFileService) {
		this.value = value;
		this.typeSpec = typeSpec;
		this.typedPath = typedPath;
		this.shellPageFileService = shellPageFileService;
	}

	FileResult.prototype = {
		getPluginRepresentation: function() {
			var promise = new Deferred();
			if (typeof(this.value) === "string") { //$NON-NLS-0$
				promise.resolve({file: {path: this.value}});
			} else {
				/* value is an array of nodes */
				var waitCount = 0;
				var nodesQueue = this.value.slice(0);
				var result = [];
				var resultFn = function(file) {
					if (file) {
						result.push(file);
					}
					if (waitCount === 0 && nodesQueue.length === 0) {
						if (this.typeSpec.multiple) {
							promise.resolve(result);
						} else {
							promise.resolve(result[0]);
						}
					}
				}.bind(this);

				var processNodesQueue = function() {
					while (nodesQueue.length > 0) {
						var node = nodesQueue[0];

						var cwd = this.shellPageFileService.getCurrentDirectory();
						var cwdPath = cwd.Parents;
						if ((!cwdPath || cwdPath.length === 0) && cwd.parent) {
							/* handle file system root and project root cases */
							cwdPath = [cwd.parent];
						}
						cwdPath = cwdPath ? cwdPath.slice(0) : [];
						if (cwdPath.length > 0) {
							var parentToPush = cwdPath[cwdPath.length - 1].parent;
							while (parentToPush) {
								cwdPath.push(parentToPush);
								parentToPush = parentToPush.parent;
							}
						}
						cwdPath.splice(0, 0, cwd);
						var cwdIndex = cwdPath.length - 1;

						var nodePath = node.Parents;
						if ((!nodePath || nodePath.length === 0) && node.parent) {
							/* handle file system root and project root cases */
							nodePath = [node.parent];
						}
						nodePath = nodePath ? nodePath.slice(0) : [];
						if (nodePath.length > 0) {
							var parentToPush2 = nodePath[nodePath.length - 1].parent;
							while (parentToPush2) {
								nodePath.push(parentToPush2);
								parentToPush2 = parentToPush2.parent;
							}
						}
						nodePath.splice(0, 0, node);
						var nodeIndex = nodePath.length - 1;

						while (nodeIndex >= 0 && cwdIndex >= 0) {
							if (nodePath[nodeIndex].Location === cwdPath[cwdIndex].Location) {
								nodeIndex--;
								cwdIndex--;
							} else {
								break;
							}
						}

						var path = "";
						if (node.Location.indexOf(nodePath[nodeIndex + 1].Location) === 0) {
							/* typical case */
							for (var i = 0; i <= cwdIndex; i++) {
								path += ".." + this.shellPageFileService.SEPARATOR; //$NON-NLS-0$
							}
							path += node.Location.substring(nodePath[nodeIndex + 1].Location.length);
						} else {
							/*
							 * node's Location string is not a logical descendent of the closest common
							 * ancestor, so express its Location absolutely instead of relatively.
							 */
							path = node.Location;
						}
						var file = {
							isDirectory: node.Directory,
							path: path.length ? path : "."	//$NON-NLS-0$
						};

						if (node.Directory && this.typeSpec.multiple && this.typeSpec.recurse) {
							(function(node) {
								waitCount++;
								this.shellPageFileService.withChildren(
									node,
									function(children) {
										waitCount--;
										if (children.length === 0) {
											resultFn();	/* waitCount may now be 0 */
											return;
										}

										var recursePath = node.recursePath ? node.recursePath.slice(0) : [];
										recursePath.push(node.Name);

										var pushToQueueFn = function(node) {
											waitCount--;
											nodesQueue.push(node);
											if (nodesQueue.length !== 1) {
												/* queue was already being processed, so just let it continue */
												return;
											}
											processNodesQueue();
										};

										children.forEach(function(current) {
											current.recursePath = recursePath;
											waitCount++;
											if (current.parent) {
												/* don't need to retrieve more, so add it immediately */
												pushToQueueFn(current);
											} else {
												this.shellPageFileService.withNode(
													current.Location,
													pushToQueueFn,
													function(error) {
														waitCount--;
														resultFn();	/* waitCount may now be 0 */
													}
												);
											}
										}.bind(this));
									}.bind(this),
									function(error) {
										waitCount--;
										resultFn();	/* waitCount may now be 0 */
									}
								);
							}.bind(this))(node);
						}

						nodesQueue.splice(0,1);
						if (this.typeSpec.content && !file.isDirectory) {
							(function(file) {
								waitCount++;
								this.shellPageFileService.readBlob(node).then(
									function(content) {
										waitCount--;
										file.blob = content;
										resultFn(file);
									},
									function(error) {
										waitCount--;
										resultFn(file);
									}
								);
							}.bind(this)(file));
						} else {
							resultFn(file);
						}
					}
				}.bind(this);
				processNodesQueue();
			}
			return promise;
		},
		getValue: function() {
			return this.value;
		},
		resourceExists: function() {
			return typeof(this.value) !== "string"; //$NON-NLS-0$
		},
		stringify: function() {
			return this.typedPath;
		}
	};

	orion.shellPage.ParamTypeFile = (function() {
		function ParamTypeFile(shellPageFileService) {
			this.shellPageFileService = shellPageFileService;
		}

		ParamTypeFile.prototype = {
			getName: function() {
				return "file"; //$NON-NLS-0$
			},

			/**
			 * This function is invoked by the shell to query for the completion
			 * status and predictions for an argument with this parameter type.
			 */
			parse: function(arg, typeSpec) {
				var result = new Deferred();
				this._getPredictions(arg.text).then(
					function(predictions) {
						result.resolve(this._createCompletion(arg.text, predictions, typeSpec));
					}.bind(this),
					function(error) {
						result.error(error);
					}
				);
				return result;
			},

			/**
			 * This function handles results of this custom type returned from commands.
			 */
			processResult: function(promise, result, output, isProgress) {
				var element = document.createElement("div"); //$NON-NLS-0$

				var waitCount = 0;
				var successFn = function(file) {
					this.callback = function() {
						var string = i18nUtil.formatMessage(
							messages["Wrote ${0}"],
							typeof(file) === "string" ? file : this.shellPageFileService.computePathString(file)); //$NON-NLS-0$
						var writer = new mResultWriters.ShellStringWriter(element);
						writer.write(string + "\n"); //$NON-NLS-0$
						if (--waitCount !== 0 || isProgress) {
							promise.progress(element);
						} else {
							promise.resolve(element);
						}
					}.bind(this);
					return this;
				}.bind(this);
				var errorFn = function(file) {
					this.callback = function(error) {
						var string = i18nUtil.formatMessage(
							messages["Failed to write ${0}"],
							typeof(file) === "string" ? file : this.shellPageFileService.computePathString(file)); //$NON-NLS-0$
						string += " [" + error + "]"; //$NON-NLS-1$ //$NON-NLS-0$
						var writer = new mResultWriters.ShellStringWriter(element);
						writer.write(string + "\n"); //$NON-NLS-0$
						if (--waitCount !== 0 || isProgress) {
							promise.progress(element);
						} else {
							promise.resolve(element);
						}
					}.bind(this);
					return this;
				}.bind(this);

				var destination = output || this.shellPageFileService.getCurrentDirectory();
				waitCount++;
				this.shellPageFileService.ensureDirectory(null, destination).then(
					function(directory) {
						waitCount--;

						var files = result.getValue();
						if (!result.isArray()) {
							files = [files];
						}
						files.forEach(function(file) {
							waitCount++;
							var pathSegments = file.path.split(this.shellPageFileService.SEPARATOR);

							/* normalize instances of '.' and '..' in the path */
							var index = 0;
							while (index < pathSegments.length) {
								var segment = pathSegments[index];
								if (segment === ".") { //$NON-NLS-0$
									pathSegments.splice(index, 1);
								} else if (segment === "..") { //$NON-NLS-0$
									if (index === 0) {
										/* invalid, destination must be a descendent of the cwd */
										errorFn(i18nUtil.formatMessage(messages["Cannot write ${0}, it is not a descendent of the output directory"], file.path));
										return;
									}
									pathSegments.splice(index-- - 1, 2);
								} else {
									index++;
								}
							}

							var writeFile = function(parentNode, fileToWrite, pathSegments) {
								var segment = pathSegments[0];
								pathSegments.splice(0,1);
								var nodeString = this.shellPageFileService.computePathString(parentNode) + this.shellPageFileService.SEPARATOR + segment;
								if (pathSegments.length === 0) {
									/* attempt to write the new resource */
									if (fileToWrite.isDirectory) {
										this.shellPageFileService.ensureDirectory(parentNode, segment).then(successFn(nodeString).callback, errorFn(nodeString).callback);
									} else {
										this.shellPageFileService.ensureFile(parentNode, segment).then(
											function(file) {
												var writer = new mResultWriters.FileBlobWriter(file, this.shellPageFileService);
												writer.addBlob(fileToWrite.blob);
												writer.write().then(successFn(file).callback, errorFn(file).callback);
											}.bind(this),
											errorFn(nodeString).callback
										);
									}
									return;
								}
								/* more lead-up path segments to go */
								this.shellPageFileService.ensureDirectory(parentNode, segment).then(
									function(newNode) {
										writeFile(newNode, fileToWrite, pathSegments);
									},
									errorFn(this.shellPageFileService.computePathString(parentNode) + this.shellPageFileService.SEPARATOR + segment).callback
								);
							}.bind(this);
							writeFile(directory, file, pathSegments);
						}.bind(this));
					}.bind(this),
					errorFn(destination).callback
				);
			},

			/**
			 * This function is invoked by the shell to query for a completion
			 * value's string representation.
			 */
			stringify: function(value) {
				if (!value) {
					return "";
				}
				return typeof(value) === "string" ? value : value.stringify(); //$NON-NLS-0$
			},

			/** @private */

			_createCompletion: function(string, predictions, typeSpec) {
				if (!predictions) {
					/* parent hierarchy is not valid */
					return {
						value: undefined,
						status: mShell.CompletionStatus.ERROR,
						message: i18nUtil.formatMessage(messages["'${0}' is not valid"], string),
						predictions: null
					};
				}

				var message, status, value;
				if (typeSpec.exist === false) {
					var exactMatch;
					for (var i = 0; i < predictions.length; i++) {
						var current = predictions[i];
						if (current.name === string) {
							exactMatch = current;
							break;
						}
					}
					if (exactMatch) {
						status = mShell.CompletionStatus.ERROR;
						message = i18nUtil.formatMessage(messages["'${0}' already exists"], string);
					} else {
						// TODO validate filename?
						status = mShell.CompletionStatus.MATCH;
						value = new FileResult(string, typeSpec, string, this.shellPageFileService);
					}
					predictions = [];
				} else {
					/* filter the predictions based on directory/file */
					var temp = [];
					predictions.forEach(function(current) {
						if (current.value.Directory || typeSpec.file) {
							temp.push(current);
						}
					});
					predictions = temp;

					if (typeSpec.exist) {
						var exactMatches = [];
						var testString = string.replace(/[\-(){}\[\]+,.\\\^$|#]/g, "\\$&"); //$NON-NLS-0$
						testString = testString.replace(/\?/g, "."); //$NON-NLS-0$
						testString = testString.replace(/\*/g, ".*"); //$NON-NLS-0$
						var regExp = new RegExp("^" + testString + "$"); //$NON-NLS-1$ //$NON-NLS-0$
						predictions.forEach(function(current) {
							if (current.name.match(regExp) && ((current.value.Directory && typeSpec.directory) || (!current.value.Directory && typeSpec.file))) {
								exactMatches.push(current.value);
							}
						});
						if ((typeSpec.multiple && exactMatches.length) || exactMatches.length === 1) {
							status = mShell.CompletionStatus.MATCH;
							value = new FileResult(exactMatches, typeSpec, string, this.shellPageFileService);
						} else if (predictions.length) {
							status = mShell.CompletionStatus.PARTIAL;
						} else {
							status = mShell.CompletionStatus.ERROR;
							message = i18nUtil.formatMessage(messages["'${0}' is not valid"], string);
						}
					} else { /* exist is undefined */
						// TODO validate filename?
						var exactMatch;
						for (var i = 0; i < predictions.length; i++) {
							var current = predictions[i];
							if (current.name === string) {
								exactMatch = current;
								break;
							}
						}
						status = mShell.CompletionStatus.MATCH;
						value = exactMatch ?
							new FileResult([exactMatch.value], typeSpec, string, this.shellPageFileService) :
							new FileResult(string, typeSpec, string, this.shellPageFileService);
					}
				}

				return {
					value: value,
					status: status,
					message: message,
					predictions: predictions
				};
			},
			_find: function(array, func) {
				for (var i = 0; i < array.length; i++) {
					if (func(array[i])) {
						return array[i];
					}
				}
				return null;
			},
			_getPredictions: function(text) {
				var result = new Deferred();
				var directoryNode = this.shellPageFileService.getDirectory(null, text);
				if (!directoryNode) {
					/* either invalid path or not yet retrieved */
					result.resolve(null);
				} else {
					this.shellPageFileService.withChildren(
						directoryNode,
						function(childNodes) {
							var index = text.lastIndexOf(this.shellPageFileService.SEPARATOR) + 1;
							var directoriesSegment = text.substring(0, index);
							var finalSegment = text.substring(index);
							var inDirectoryNode = finalSegment.length === 0 || finalSegment === "."; //$NON-NLS-0$
 
							var directoryPredictions = [];
							var filePredictions = [];
							var name;
							if (inDirectoryNode) {
								name = directoriesSegment + "."; //$NON-NLS-0$
								directoryPredictions.push({name: name, value: directoryNode, incomplete: true});
							}
							if (inDirectoryNode || finalSegment === "..") { //$NON-NLS-0$
							var parentNode = this.shellPageFileService.getParent(directoryNode);
								if (parentNode) {
									name = directoriesSegment + ".."; //$NON-NLS-0$
									directoryPredictions.push({name: name, value: parentNode, incomplete: true});
								}
							}

							if (finalSegment.trim().length === 0 && directoriesSegment.length > 0) {
								name = directoriesSegment;
								directoryPredictions.push({name: name, value: directoryNode, incomplete: false});
							}
							var testString = finalSegment.replace(/[\-(){}\[\]+,.\\\^$|#]/g, "\\$&"); //$NON-NLS-0$
							testString = testString.replace(/\?/g, "."); //$NON-NLS-0$
							testString = testString.replace(/\*/g, ".*"); //$NON-NLS-0$
							var regExp = new RegExp("^" + testString); //$NON-NLS-0$
							for (var i = 0; i < childNodes.length; i++) {
								var candidate = childNodes[i];
								if (candidate.Name.match(regExp)) {
									var complete = !candidate.Directory || (candidate.Children && candidate.Children.length === 0);
									name = directoriesSegment + candidate.Name;
									if (candidate.Directory) {
										directoryPredictions.push({name: name, value: candidate, incomplete: !complete});
									} else {
										filePredictions.push({name: name, value: candidate, incomplete: !complete});
									}
								}
							}
							result.resolve(directoryPredictions.concat(filePredictions));
						}.bind(this),
						function(error) {
							result.error(error);
						}
					);
				}
				return result;
			}
		};
		return ParamTypeFile;
	}());

	return orion.shellPage;
});
