/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["require", "i18n!orion/shell/nls/messages", "orion/bootstrap", "orion/commandRegistry", "orion/fileClient", "orion/searchClient", "orion/globalCommands",
		"orion/shell/Shell", "orion/webui/treetable", "shell/shellPageFileService", "shell/paramType-file", "shell/paramType-plugin", "shell/paramType-service",
		"orion/i18nUtil", "orion/extensionCommands", "orion/contentTypes", "orion/PageUtil", "orion/URITemplate", "orion/Deferred",
		"orion/status", "orion/progress", "orion/operationsClient", "shell/resultWriters", "orion/URL-shim"],
	function(require, messages, mBootstrap, mCommandRegistry, mFileClient, mSearchClient, mGlobalCommands, mShell, mTreeTable, mShellPageFileService, mFileParamType,
		mPluginParamType, mServiceParamType, i18nUtil, mExtensionCommands, mContentTypes, PageUtil, URITemplate, Deferred, mStatus, mProgress,
		mOperationsClient, mResultWriters, _) {

	var shellPageFileService, fileClient, commandRegistry, output, fileType;
	var hashUpdated = false;
	var serviceRegistry;
	var pluginRegistry, pluginType, preferences, serviceElementCounter = 0;

	var ROOT_ORIONCONTENT = new URL(require.toUrl("file"), window.location.href).pathname; //$NON-NLS-0$
	var PAGE_TEMPLATE = require.toUrl("shell/shellPage.html") + "#{,resource}"; //$NON-NLS-0$

	var CommandResult = (function() {
		function CommandResult(value, type) {
			this.value = value;
			this.array = false;
			if (type.indexOf("[") === 0 && type.lastIndexOf("]") === type.length - 1) { //$NON-NLS-1$ //$NON-NLS-0$
				this.array = true;
				type = type.substring(1, type.length - 1);
			}
			this.type = type;
		}
		CommandResult.prototype = {
			getType: function() {
				return this.type;
			},
			getValue: function() {
				return this.value;
			},
			isArray: function() {
				return this.array;
			},
			stringify: function() {
				if (this.type !== "string" && this.type !== "markdown") { //$NON-NLS-0$ //$NON-NLS-1$
					return "(" + (this.array ? "[" : "") + this.value + (this.array ? "]" : "") + ")"; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
				if (!this.array) {
					return this.value;
				}
				var result = "";
				for (var i = 0; i < this.value.length; i++) {
					result += this.value[i];
					if (i !== this.value.length - 1) {
						result += "\n"; //$NON-NLS-0$
					}
				}
				return result;
			}
		};
		return CommandResult;
	}());

	var ContributedType = (function() {
		function ContributedType(name, parseFn, stringifyFn) {
			this.name = name;
			this.parseFn = parseFn;
			this.stringifyFn = stringifyFn;
		}
		ContributedType.prototype = {
			getName: function() {
				return this.name;
			},
			parse: function(arg, typeSpec, params) {
				var promise = new Deferred();
				this.parseFn(arg, typeSpec, params).then(
					function(result) {
						promise.resolve(result);
					},
					function(error) {
						promise.reject(error);
					}
				);
				return promise;
			},
			stringify: function(arg, typeSpec) {
				var promise = new Deferred();
				if (!this.stringifyFn) {
					return arg ? arg.name : "";
				}
				
				this.stringifyFn(arg, typeSpec).then(
					function(result) {
						promise.resolve(result);
					},
					function(error) {
						promise.reject(error);
					}
				);
				return promise;
			}
		};
		return ContributedType;
	}());

	/* model and renderer for displaying services */

	var ServicesModel = (function() {
		function ServicesModel(root) {
			this.root = root;
		}
		ServicesModel.prototype = {
			getRoot: function(onItem) {
				onItem(this.root);
			},
			getChildren: function(parentItem, onComplete) {
				onComplete(parentItem.values);
			},
			getId: function(item) {
				return item.elementId;
			}
		};
		return ServicesModel;
	}());

	var ServicesRenderer = (function() {
		function ServicesRenderer() {
		}
		ServicesRenderer.prototype = {			
			getTwistieElementId: function(rowId) {
				return rowId + "__expand"; //$NON-NLS-0$
			},
			initTable: function(tableNode) {
			},
			labelColumnIndex: function() {
				return 0;
			},
			render: function(item, tr) {
				tr.className += " treeTableRow"; //$NON-NLS-0$
				var td = document.createElement("td"); //$NON-NLS-0$
				tr.appendChild(td);

				if (!item.value) {
					/* top-level row displaying service name */
					var span = document.createElement("span"); //$NON-NLS-0$
					td.appendChild(span);

					var twistieElement = document.createElement("span"); //$NON-NLS-0$
					twistieElement.id = this.getTwistieElementId(tr.id);
					span.appendChild(twistieElement);
					twistieElement.className = "modelDecorationSprite core-sprite-closedarrow"; //$NON-NLS-0$
					twistieElement.onclick = function(event) {
						this.tableTree.toggle(tr.id);
					}.bind(this);

					td = document.createElement("td"); //$NON-NLS-0$
					tr.appendChild(td);
					var b = document.createElement("b"); //$NON-NLS-0$
					td.appendChild(b);
					b.textContent = item.name;
					if (item.id) {
						span = document.createElement("span"); //$NON-NLS-0$
						td.appendChild(span);
						span.textContent = " (" + item.id + ")"; //$NON-NLS-1$ //$NON-NLS-0$
					}
					td.colSpan = "2"; //$NON-NLS-0$
					return;
				}

				/* child row displaying a property of a service */
				td = document.createElement("td"); //$NON-NLS-0$
				tr.appendChild(td);
				td.textContent = item.name;
				td = document.createElement("td"); //$NON-NLS-0$
				tr.appendChild(td);
				td.textContent = item.value;
			},
			updateExpandVisuals: function(row, isExpanded) {
				var twistieElement = document.getElementById(this.getTwistieElementId(row.id));
				if (twistieElement) {
					var className = twistieElement.className;
					if (isExpanded) {
						className += " core-sprite-openarrow"; //$NON-NLS-0$
						className = className.replace(/\s?core-sprite-closedarrow/g, "");
					} else {
						className += " core-sprite-closedarrow"; //$NON-NLS-0$
						className = className.replace(/\s?core-sprite-openarrow/g, "");
					}
					twistieElement.className = className;
				}
			}
		};
		return ServicesRenderer;
	}());

	/* url token utilities */

	function getCWD() {
		var result = PageUtil.matchResourceParameters(window.location.href).resource;
		return result.length > 0 ? result : null;
	}

	function setCWD(node, replace) {
		var template = new URITemplate(PAGE_TEMPLATE);
		var url = template.expand({
			resource: node.Location
		});
		if (replace) {
			window.location.replace(url);
		} else {
			window.location.href = url;
		}
		mGlobalCommands.setPageTarget({task: messages.Shell, serviceRegistry: serviceRegistry, commandService: commandRegistry, target: node});
	}

	/* general functions for working with file system nodes */

	var resolveError = function(promise, xhrResult) {
		var error = xhrResult;
		try {
			error = JSON.parse(xhrResult.responseText);
		} catch (e) {}
		if (error && error.DetailedMessage) {
			error = i18nUtil.formatMessage(messages["Err"], error.DetailedMessage);
		} else if (error && error.Message) {
			error = i18nUtil.formatMessage(messages["Err"], error.Message);
		} else if (typeof xhrResult.url === "string") {
			if (xhrResult.status === 0) {
				error = i18nUtil.formatMessage(messages["NoResponseFromServer"], xhrResult.url);
			} else {
				error = i18nUtil.formatMessage(messages["ServerError"], xhrResult.url, xhrResult.status, xhrResult.statusText);
			}
		}
		var errNode = document.createElement("span"); //$NON-NLS-0$
		errNode.textContent = error;
		promise.reject(errNode);
	};

	function computeEditURL(node) {
		var openWithCommand = mExtensionCommands.getOpenWithCommand(commandRegistry, node);
		if (openWithCommand) {
			return openWithCommand.hrefCallback({items: node});
		}
		return null;
	}

	function createLink(node) {
		var link = document.createElement("a"); //$NON-NLS-0$
		if (node.Directory) {
			link.href = "#" + node.Location; //$NON-NLS-0$
			link.className = "shellPageDirectory"; //$NON-NLS-0$
			link.textContent = node.Name;
			return link;
		}
		link.href = computeEditURL(node);
		link.target = "_blank";  //$NON-NLS-0$
		link.textContent = node.Name;
		return link;
	}

	/* implementations of built-in file system commands */

	function getChangedToElement(dirName, isInitial) {
		var span = document.createElement("span"); //$NON-NLS-0$
		span.appendChild(document.createTextNode(isInitial ? messages["Initial directory: "] : messages["Changed to: "]));
		var bold = document.createElement("b"); //$NON-NLS-0$
		bold.appendChild(document.createTextNode(dirName));
		span.appendChild(bold);
		return span;
	}
	
	function cdExec(args, context) {
		var node = args.directory.value[0];
		shellPageFileService.setCurrentDirectory(node);
		hashUpdated = true;
		setCWD(node, false);
		var pathString = shellPageFileService.computePathString(node);
		return getChangedToElement(pathString, false);
	}

	function editExec(args) {
		var url = computeEditURL(args.file.getValue()[0]);
		window.open(url);
	}

	function lsExec(args, context) {
		var result = context.createPromise();
		var node = shellPageFileService.getCurrentDirectory();
		var location = node ? node.Location : (getCWD() || ROOT_ORIONCONTENT);
		shellPageFileService.loadWorkspace(location).then(
			function(node) {
				shellPageFileService.setCurrentDirectory(node); /* flush current node cache */
				shellPageFileService.withChildren(node,
					function(children) {
						var fileList = document.createElement("div"); //$NON-NLS-0$
						for (var i = 0; i < children.length; i++) {
							fileList.appendChild(createLink(children[i]));
							fileList.appendChild(document.createElement("br")); //$NON-NLS-0$
						}
						result.resolve(fileList);

						/*
						 * GCLI changes the target for all <a> tags contained in a result to _blank,
						 * to force clicked links to open in a new window or tab.  However links that
						 * are created by this command to represent directories should open in the
						 * same window/tab since the only change is the page hash.
						 *
						 * To work around this GCLI behavior, do a pass of all links created by this
						 * command to represent directories and change their targets back to _self.
						 * This must be done asynchronously to ensure that it runs after GCLI has done
						 * its initial conversion of targets to _blank.
						 */
						setTimeout(function() {
							var links = output.querySelectorAll(".shellPageDirectory"); //$NON-NLS-0$
							for (var i = 0; i < links.length; i++) {
								links[i].setAttribute("target", "_self"); //$NON-NLS-1$ //$NON-NLS-0$
								links[i].className = "";
							}
						}, 1);
					},
					function(error) {
						resolveError(result, error);
					}
				);
			},
			function(error) {
				resolveError(result, error);
			}
		);
		return result;
	}

	function pwdExec(args, context) {
		var result = context.createPromise();
		var node = shellPageFileService.getCurrentDirectory();
		shellPageFileService.loadWorkspace(node.Location).then(
			function(node) {
				var buffer = shellPageFileService.computePathString(node);
				var b = document.createElement("b"); //$NON-NLS-0$
				b.appendChild(document.createTextNode(buffer));
				result.resolve(b);
			},
			function(error) {
				resolveError(result, error);
			}
		);
		return result;
	}

	/* implementations of built-in plug-in management commands */

	function pluginServicesExec(args, context) {
		var result = document.createElement("div"); //$NON-NLS-0$
		var services = args.plugin.getServiceReferences();
		services.forEach(function(service) {
			var current = {values: []};
			var keys = service.getPropertyKeys();
			keys.forEach(function(key) {
				if (key === "service.names") { //$NON-NLS-0$
					current.name = service.getProperty(key).join();
				}
				if (key === "id") {
					current.id = service.getProperty(key);
				}
				current.values.push({name: key, value: service.getProperty(key)});
			});
			if (current.name) {
				current.elementId = "serviceElement" + serviceElementCounter++; //$NON-NLS-0$
				current.values.forEach(function(value) {
					value.elementId = "serviceElement" + serviceElementCounter++; //$NON-NLS-0$
				});
				var parent = document.createElement("div"); //$NON-NLS-0$
				result.appendChild(parent);
				var renderer = new ServicesRenderer();
				var tableTree = new mTreeTable.TableTree({
					model: new ServicesModel(current),
					showRoot: true,
					parent: parent,
					renderer: renderer
				});
				renderer.tableTree = tableTree;
			}
		});
		return result;
	}

	function pluginsListExec(args, context) {
		var plugins = pluginType.getPlugins();
		var result = document.createElement("table"); //$NON-NLS-0$
		for (var i = 0; i < plugins.length; i++) {
			var row = document.createElement("tr"); //$NON-NLS-0$
			result.appendChild(row);
			var td = document.createElement("td"); //$NON-NLS-0$
			row.appendChild(td);
			var b = document.createElement("b"); //$NON-NLS-0$
			td.appendChild(b);
			b.textContent = plugins[i].name;
			var state = plugins[i].getState();
			if (state !== "active" && state !== "starting") { //$NON-NLS-1$ //$NON-NLS-0$
				var span = document.createElement("span"); //$NON-NLS-0$
				td.appendChild(span);
				span.textContent = " (" + messages.disabled + ")"; //$NON-NLS-1$ //$NON-NLS-0$
			}
		}
		return result;
	}

	function pluginsDisableExec(args, context) {
		var result = context.createPromise();
		args.plugin.stop().then(
			function() {
				result.resolve(messages.Succeeded);
			},
			function(error) {
				result.resolve(error);
			}
		);
		return result;
	}

	function pluginsEnableExec(args, context) {
		var result = context.createPromise();
		args.plugin.start({lazy:true}).then(
			function() {
				result.resolve(messages.Succeeded);
			},
			function(error) {
				result.resolve(error);
			}
		);
		return result;
	}

	function pluginsInstallExec(args, context) {
		var url = args.url.trim();
		if (/^\S+$/.test(url)) {
			if (pluginRegistry.getPlugin(url)){
				return messages["PlugAlreadyInstalled"];
			}
			var result = context.createPromise();
			pluginRegistry.installPlugin(url).then(
				function(plugin) {
					plugin.start({lazy:true}).then(
						function() {
							preferences.getPreferences("/plugins").then(function(plugins) { //$NON-NLS-0$
								plugins.put(url, true);
							});
							result.resolve(messages.Succeeded);
						},
						function(error) {
							result.resolve(error);
						}
					);
				},
				function(error) {
					result.resolve(error);
				}
			);
			return result;
		}
		return messages["Invalid plug-in URL"];
	}

	function pluginsReloadExec(args, context) {
		var result = context.createPromise();
		args.plugin.update().then(
			function() {
				result.resolve(messages.Succeeded);
			},
			function(error) {
				result.resolve(error);
			}
		);
		return result;
	}

	function pluginsUninstallExec(args, context) {
		var result = context.createPromise();
		if (args.plugin.isAllPlugin) {
			var msg = messages["UninstallAllPlugsMsg"];
			if (!window.confirm(msg)) {
				return messages.Aborted;
			}
			args.plugin.uninstall().then(
				function() {
					preferences.getPreferences("/plugins").then( //$NON-NLS-0$
						function(plugins) {
							var locations = args.plugin.getPluginLocations();
							for (var i = 0; i < locations.length; i++) {
								plugins.remove(locations[i]);
							}
						}.bind(this) /* force a sync */
					);
					result.resolve(messages.Succeeded);
				},
				function(error) {
					result.resolve(error);
				}
			);
		} else {
			var location = args.plugin.getLocation();
			var plugin = pluginRegistry.getPlugin(location);
			plugin.uninstall().then(
				function() {
					preferences.getPreferences("/plugins").then( //$NON-NLS-0$
						function(plugins) {
							plugins.remove(location);
						}.bind(this) /* force a sync */
					);
					result.resolve(messages.Succeeded);
				},
				function(error) {
					result.resolve(error);
				}
			);
		}
		return result;
	}
	
	/* implementations of built-in service management commands */

	function serviceContributorsExec(args, context) {
		var serviceId = args.id.trim();
		var result = document.createElement("div"); //$NON-NLS-0$
		var plugins = pluginType.getPlugins();
		plugins.forEach(function(plugin) {
			var services = plugin.getServiceReferences();
			services.forEach(function(service) {
				var names = service.getProperty("service.names"); //$NON-NLS-0$
				if (names.indexOf(serviceId) !== -1) {
					var current = {name: plugin.name, values: []};
					var keys = service.getPropertyKeys();
					keys.forEach(function(key) {
						if (key === "id") { //$NON-NLS-0$
							current.id = service.getProperty(key);
						}
						current.values.push({name: key, value: service.getProperty(key)});
					});
					current.elementId = "serviceElement" + serviceElementCounter++; //$NON-NLS-0$
					current.values.forEach(function(value) {
						value.elementId = "serviceElement" + serviceElementCounter++; //$NON-NLS-0$
					});
					var parent = document.createElement("div"); //$NON-NLS-0$
					result.appendChild(parent);
					var renderer = new ServicesRenderer();
					var tableTree = new mTreeTable.TableTree({
						model: new ServicesModel(current),
						showRoot: true,
						parent: parent,
						renderer: renderer
					});
					renderer.tableTree = tableTree;
				}
			});
		});

		return result;
	}

	/* functions for handling contributed commands */

	function outputString(object, writer) {
		if (typeof(object) !== "string") { //$NON-NLS-0$
			if (object.xhr && object.xhr.statusText) {
				/* server error object */
				object = object.xhr.statusText;
			} else {
				object = object.toString();
			}
		}
		return writer.write(object);
	}

	function processBlobResult(promise, result, output, isProgress) {
		var element, writer;
		if (output) {
			writer = new mResultWriters.FileBlobWriter(output, shellPageFileService);
		} else {
			element = document.createElement("div"); //$NON-NLS-0$
			writer = new mResultWriters.ShellBlobWriter(element);
		}

		var value = result.getValue();
		if (!result.isArray()) {
			value = [value];
		}
		value.forEach(function(current) {
			writer.addBlob(current);
		});
		writer.write().then(
			function() {
				if (isProgress) {
					promise.progress(element);
				} else {
					promise.resolve(element);
				}
			},
			function(error) {
				element = element || document.createElement("div"); //$NON-NLS-0$
				writer = new mResultWriters.ShellStringWriter(element);
				outputString(error, writer).then(
					function() {
						promise.reject(element);
					},
					function(error) {
						promise.reject();
					}
				);
			}
		);
	}

	function processStringResult(promise, result, output, isProgress) {
		var element, writer;
		if (output) {
			writer = new mResultWriters.FileStringWriter(output, shellPageFileService);
		} else {
			element = document.createElement("div"); //$NON-NLS-0$
			writer = new mResultWriters.ShellStringWriter(element/*, result.getType() === "markdown"*/); //$NON-NLS-0$
		}

		outputString(result.stringify(), writer).then(
			function() {
				if (isProgress) {
					promise.progress(element);
				} else {
					promise.resolve(element);
				}
			},
			function(error) {
				element = element || document.createElement("div"); //$NON-NLS-0$
				writer = new mResultWriters.ShellStringWriter(element);
				outputString(error, writer).then(
					function() {
						promise.reject(element);
					},
					function(error) {
						promise.reject();
					}
				);
			}
		);
	}

	function processResult(promise, result, output, isProgress) {
		var type = result.getType();
		if (type === "file") { //$NON-NLS-0$
			// TODO generalize this to look up any custom type
			fileType.processResult(promise, result, output, isProgress);
			return;
		}
		/* handle built-in types */
		if (type === "blob") { //$NON-NLS-0$
			processBlobResult(promise, result, output, isProgress);
		} else {
			/* either string or unknown type */
			processStringResult(promise, result, output, isProgress);
		}
	}

	/*
	 * Creates a gcli exec function that wraps a 'callback' function contributed by
	 * an 'orion.shell.command' service implementation.
	 */
	function contributedExecFunc(service, name, progress, returnType, addedOutputFunction) {
		if (typeof(service.callback) !== "function") { //$NON-NLS-0$
			return undefined;
		}

		return function(args, context) {
			/* Use orion/Deferred since it supports progress, gcli/promise does not */
			//var promise = context.createPromise();
			var promise = new Deferred();

			var output = null;
			if (addedOutputFunction) {
				output = args["output"]; //$NON-NLS-0$
				if (output) {
					if (output.resourceExists()) {
						/* value is an array of nodes, in this context will always have a size of 1 */
						output = output.getValue()[0];
					} else {
						/* value is a string representing a non-existent resource */
						output = output.getValue();
					}
				}
				delete args.output;
			}

			/*
			 * The following function calls getPluginRepresentation(), if present, on all
			 * properties in object, in order to give custom types an opportunity to provide
			 * plugins with different representations of their instances than are used
			 * internally.
			 */
			var convertToPluginArgs = function(object, resultFn) {
				var keys = Object.keys(object);
				if (keys.length === 0) {
					resultFn(object);
				} else {
					var resultCount = 0;
					keys.forEach(function(current) {
						(function(key) {
							(function(value, fn) {
								if (value && value.getPluginRepresentation) {
									value.getPluginRepresentation().then(function(newValue) {
										fn(newValue);
									});
								} else {
									fn(value);
								}
							}(object[key], function(newValue) {
								object[key] = newValue;
								if (++resultCount === keys.length) {
									resultFn(object);
								}
							}));
						}(current));
					});
				}
			};

			convertToPluginArgs(args, function(pluginArgs) {
				function getCommandString(name, args) {
					var result = name;
					for (var key in args){
						result += " "; //$NON-NLS-0$
						result += args[key];
					}
					return result;
				}
				var resolvedFn = function(result) {
					var commandResult = new CommandResult(result, returnType);
					processResult(promise, commandResult, output);
				};
				var errorFn = function(error) {
					resolveError(promise, error);
				};
				var progressFn = function(data) {
					if (data && data.uriTemplate) {
						/* delegated UI request */
						var uriTemplate = new URITemplate(data.uriTemplate);
						var cwd = shellPageFileService.getCurrentDirectory();
						var href = uriTemplate.expand({}); // TODO
						var iframe = document.createElement("iframe"); //$NON-NLS-0$
						iframe.id = name;
						iframe.name = name;
						iframe.type = "text/html"; //$NON-NLS-0$
						iframe.sandbox = "allow-scripts allow-same-origin"; //$NON-NLS-0$
						iframe.frameborder = 1;
						iframe.src = href;
						iframe.className = "delegatedUI"; //$NON-NLS-0$
						if (data.width) {
							iframe.style.width = data.width;
						}
						if (data.height) {
							iframe.style.height = data.height;
						}
						var outputElements = document.getElementsByClassName("gcli-row-out"); //$NON-NLS-0$
						var parentElement = outputElements[outputElements.length - 1];
						parentElement.appendChild(iframe);
						/* listen for notification from the iframe, expecting either a "result", "error" or "progress" property */
						window.addEventListener("message", function _messageHandler(event) { //$NON-NLS-0$
							if (event.source !== iframe.contentWindow) {
								return;
							}
							if (typeof event.data === "string") { //$NON-NLS-0$
								var data = JSON.parse(event.data);
								if (data.pageService === "orion.page.delegatedUI" && data.source === name) { //$NON-NLS-0$
									window.removeEventListener("message", _messageHandler, false); //$NON-NLS-0$
									if (data.error) {
										errorFn(data.error);
									} else {
										parentElement.removeChild(iframe);
										if (data.result) {
											resolvedFn(data.result);
										} else if (data.progress) {
											progressFn(data.progress);
										}
									}
								}
							}
						}, false);
					} else {
						if (typeof promise.progress === "function") { //$NON-NLS-0$
							var commandResult = new CommandResult(data, returnType);
							processResult(promise, commandResult, output, true);
						}
					}
				};
				progress.progress(service.callback(pluginArgs, {cwd: getCWD()}), "Executing command " + getCommandString(name, args)).then(resolvedFn, errorFn, progressFn); //$NON-NLS-0$
			});
			return promise;
		};
	}

	/*
	 * Creates a gcli exec function that wraps a 'callback' function contributed by
	 * an 'orion.shell.type' service implementation.
	 */
	function contributedFunc(service) {
		if (typeof(service) !== "function") { //$NON-NLS-0$
			return undefined;
		}
		return function(args, typeSpec, context) {
			var promise = new Deferred();
			if (context) {
				/* invoking parse() */
				context.cwd = getCWD();
			}
			service(args, typeSpec, context).then(
				function(result) {
					promise.resolve(result);
				},
				function(error) {
					promise.reject(error);
				}
			);
			return promise;
		};
	}

	mBootstrap.startup().then(function(core) {
		pluginRegistry = core.pluginRegistry;
		serviceRegistry = core.serviceRegistry;
		preferences = core.preferences;

		commandRegistry = new mCommandRegistry.CommandRegistry({});
		fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
		mGlobalCommands.generateBanner("orion-shellPage", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({task: messages.Shell, serviceRegistry: serviceRegistry, commandService: commandRegistry});

		output = document.getElementById("shell-output"); //$NON-NLS-0$
		var input = document.getElementById("shell-input"); //$NON-NLS-0$
		var shell = new mShell.Shell({input: input, output: output});

		/*
		 * Assign focus to the input element when a non-focusable element in
		 * the output area is clicked.  Do not interfere with output area user
		 * interactions such as selecting text, showing context menus, following
		 * links, etc.
		 *
		 * The user gesture that should trigger this is essentially a click with
		 * no mouse movement, since mouse movement within a mousedown/mouseup pair
		 * can perform selection in adjacent elements, even if the target element
		 * for both events is the same div.  For this reason, separate mousedown/
		 * mouseup listeners are used instead of a single click listener, and the
		 * event coordinates are compared (a variance of 2 pixels is allowed).
		 */
		var ALLOWANCE = 2;
		output.onmousedown = function(mouseDownEvent) {
			output.onmouseup = null;
			if (mouseDownEvent.button === 0 && mouseDownEvent.target.tagName.toUpperCase() === "DIV") { //$NON-NLS-0$
				output.onmouseup = function(mouseUpEvent) {
					output.onmouseup = null;
					if (mouseUpEvent.target === mouseDownEvent.target &&
						Math.abs(mouseUpEvent.clientX - mouseDownEvent.clientX) <= ALLOWANCE &&
						Math.abs(mouseUpEvent.clientY - mouseDownEvent.clientY) <= ALLOWANCE) {
							shell.setFocusToInput();
					}
				};
			}
		};

		/* check the URL for a command string to seed the input field with */
		var parameters = PageUtil.matchResourceParameters(window.location.href);
		if (parameters.command) {
			shell.setInputText(parameters.command);
			delete parameters.command;
			var template = new URITemplate(PAGE_TEMPLATE);
			var url = template.expand(parameters);
			window.location.href = url;
		}

		shell.setFocusToInput();

		shellPageFileService = new mShellPageFileService.ShellPageFileService();
		var defaultLocationFn = function(location, replace) {
			var successFn = function(node) {
				setCWD(node, replace);
				shellPageFileService.setCurrentDirectory(node);
				var pathString = shellPageFileService.computePathString(node);
				shell.output(getChangedToElement(pathString, true));
			};
			if (location) {	
				shellPageFileService.loadWorkspace(location).then(
					successFn,
					function(error) {
						shellPageFileService.loadWorkspace(ROOT_ORIONCONTENT).then(successFn);
					}
				);
			} else {
				shellPageFileService.loadWorkspace(ROOT_ORIONCONTENT).then(successFn);
			}
		};
		defaultLocationFn(getCWD(), true);

		/* add the locally-defined types */
		fileType = new mFileParamType.ParamTypeFile(shellPageFileService);
		shell.registerType(fileType);
		pluginType = new mPluginParamType.ParamTypePlugin(pluginRegistry);
		shell.registerType(pluginType);
		var serviceType = new mServiceParamType.ParamTypeService(pluginRegistry);
		shell.registerType(serviceType);

		/* add the locally-defined commands */
		shell.registerCommand({
			name: "cd", //$NON-NLS-0$
			description: messages["ChangeCurrDir"],
			callback: cdExec,
			parameters: [{
				name: "directory", //$NON-NLS-0$
				type: {name: "file", directory: true, exist: true}, //$NON-NLS-0$
				description: messages["DirName"]
			}],
			returnType: "html" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "edit", //$NON-NLS-0$
			description: messages["EditFile"],
			callback: editExec,
			parameters: [{
				name: "file", //$NON-NLS-0$
				type: {name: "file", file: true, exist: true}, //$NON-NLS-0$
				description: messages["FileName"]
			}]
		});
		shell.registerCommand({
			name: "ls", //$NON-NLS-0$
			description: messages["CurDirFileList"],
			callback: lsExec,
			returnType: "html" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "pwd", //$NON-NLS-0$
			description: messages["CurDirLocation"],
			callback: pwdExec,
			returnType: "html" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "clear", //$NON-NLS-0$
			description: messages["ClearShellScreen"],
			callback: function(args, context) {
				shell.clear();
			}
		});

		/* plug-in management commands */
		shell.registerCommand({
			name: "plugins", //$NON-NLS-0$
			description: messages["CmdForPlugs"]
		});
		shell.registerCommand({
			name: "plugins list", //$NON-NLS-0$
			description: messages["RegisteredPlugsList"],
			callback: pluginsListExec,
			returnType: "html" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins install", //$NON-NLS-0$
			description: messages["InstallPlugFrmURL"],
			callback: pluginsInstallExec,
			parameters: [{
				name: "url", //$NON-NLS-0$
				type: "string", //$NON-NLS-0$
				description: messages["The plug-in URL"]
			}],
			returnType: "string" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins uninstall", //$NON-NLS-0$
			description: messages["UninstallContributedPlugFrmConfig"],
			callback: pluginsUninstallExec,
			parameters: [{
				name: "plugin", //$NON-NLS-0$
				type: {name: "plugin", multiple: true, excludeDefaultPlugins: true}, //$NON-NLS-0$
				description: messages["ContributedPlugName"]
			}],
			returnType: "string" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins reload", //$NON-NLS-0$
			description: messages["Reloads a plug-in"],
			callback: pluginsReloadExec,
			parameters: [{
				name: "plugin", //$NON-NLS-0$
				type: {name: "plugin", multiple: true, excludeDefaultPlugins: false}, //$NON-NLS-0$
				description: messages["PlugName"]
			}],
			returnType: "string" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins enable", //$NON-NLS-0$
			description: messages["EnableContributedPlug"],
			callback: pluginsEnableExec,
			parameters: [{
				name: "plugin", //$NON-NLS-0$
				type: {name: "plugin", multiple: true, excludeDefaultPlugins: true}, //$NON-NLS-0$
				description: messages["ContributedPlugName"]
			}],
			returnType: "string" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins disable", //$NON-NLS-0$
			description: messages["DisableContributedPlug"],
			callback: pluginsDisableExec,
			parameters: [{
				name: "plugin", //$NON-NLS-0$
				type: {name: "plugin", multiple: true, excludeDefaultPlugins: true}, //$NON-NLS-0$
				description: messages["ContributedPlugName"]
			}],
			returnType: "string" //$NON-NLS-0$
		});
		shell.registerCommand({
			name: "plugins services", //$NON-NLS-0$
			description: messages["DisplayPlugServices"],
			callback: pluginServicesExec,
			parameters: [{
				name: "plugin", //$NON-NLS-0$
				type: {name: "plugin", multiple: false, excludeDefaultPlugins: false}, //$NON-NLS-0$
				description: messages["PlugName"]
			}],
			returnType: "html" //$NON-NLS-0$
		});

		/* service management commands */
		shell.registerCommand({
			name: "service", //$NON-NLS-0$
			description: messages["CmdsForService"]
		});

		shell.registerCommand({
			name: "service contributors", //$NON-NLS-0$
			description: messages["DisplayPlugsForService"],
			callback: serviceContributorsExec,
			parameters: [{
				name: "id", //$NON-NLS-0$
				type: "service", //$NON-NLS-0$
				description: messages["The service identifier"]
			}],
			returnType: "html" //$NON-NLS-0$
		});

		/* initialize the editors cache (used by some of the built-in commands */
		var contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		mExtensionCommands.createOpenWithCommands(serviceRegistry, contentTypeService, commandRegistry);

		/* add types contributed through the plug-in API */
		var allReferences = serviceRegistry.getServiceReferences("orion.shell.type"); //$NON-NLS-0$
		for (var i = 0; i < allReferences.length; ++i) {
			var ref = allReferences[i];
			var service = serviceRegistry.getService(ref);
			if (service) {
				var type = new ContributedType(ref.getProperty("name"), contributedFunc(service.parse), contributedFunc(service.stringify)); //$NON-NLS-0$
				shell.registerType(type);
			}
		}

		/* add commands contributed through the plug-in API */
		allReferences = serviceRegistry.getServiceReferences("orion.shell.command"); //$NON-NLS-0$
		var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		for (i = 0; i < allReferences.length; ++i) {
			ref = allReferences[i];
			service = serviceRegistry.getService(ref);
			if (service) {
				var OUTPUT_STRING = "output"; //$NON-NLS-0$
				parameters = ref.getProperty("parameters") || []; //$NON-NLS-0$
				var outputFound;
				for (var j = 0; j < parameters.length; j++) {
					if (parameters[j].name === OUTPUT_STRING) {
						outputFound = true;
						break;
					}
				}
				if (!outputFound) {
					parameters.push({
						name: "output", //$NON-NLS-0$
	                    type: {name: "file", file: true, directory: true}, //$NON-NLS-0$
	                    description: messages["FileOrDirRedirectOutput"], //$NON-NLS-0$
	                    defaultValue: null
					});
				}

				var returnType = ref.getProperty("returnType") || "string"; //$NON-NLS-1$ //$NON-NLS-0$

				if (ref.getProperty("nls") && ref.getProperty("descriptionKey")){  //$NON-NLS-1$ //$NON-NLS-0$
					i18nUtil.getMessageBundle(ref.getProperty("nls")).then( //$NON-NLS-0$
						function(ref, commandMessages) {
							var name = ref.getProperty("name"); //$NON-NLS-0$
							shell.registerCommand({
								name: name,
								description: commandMessages[ref.getProperty("descriptionKey")], //$NON-NLS-0$
								callback: contributedExecFunc(service, name, progress, returnType, !outputFound),
								returnType: "html", //$NON-NLS-0$
								parameters: parameters,
								manual: commandMessages[ref.getProperty("manual")] //$NON-NLS-0$
							});
						},
						ref);
				} else {
					var name = ref.getProperty("name"); //$NON-NLS-0$
					shell.registerCommand({
						name: name,
						description: ref.getProperty("description"), //$NON-NLS-0$
						callback: contributedExecFunc(service, name, progress, returnType, !outputFound),
						returnType: "html", //$NON-NLS-0$
						parameters: parameters,
						manual: ref.getProperty("manual") //$NON-NLS-0$
					});
				}
			}
		}

		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			if (hashUpdated) {
				hashUpdated = false;
				return;
			}

			var hash = PageUtil.hash().substring(1);
			if (hash.length === 0) {
				hash = ROOT_ORIONCONTENT;
			}
			shellPageFileService.loadWorkspace(hash).then(
				function(node) {
					if (shellPageFileService.getCurrentDirectory().Location !== node.Location) {
						shellPageFileService.setCurrentDirectory(node);
						var buffer = shellPageFileService.computePathString(node);
						shell.output(getChangedToElement(buffer, false));
						setCWD(node, false);
					}
				},
				function(error) {
					/*
					 * The hash has changed to point at an invalid resource, so reset it to
					 * the previous current directory which was valid.
					 */
					setCWD(shellPageFileService.getCurrentDirectory(), true);
				}
			);
		});
	});
});