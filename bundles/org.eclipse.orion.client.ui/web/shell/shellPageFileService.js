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

/*eslint-env browser, amd*/
/**
 * This module stores one 'current' directory node and proactively fetches
 * its child nodes in an attempt to answer them synchronously when requested.
 */ 
define(["i18n!orion/shell/nls/messages", "orion/bootstrap", "orion/fileClient", "orion/Deferred"], function (messages, mBootstrap, mFileClient, Deferred) {
	var orion = {};
	orion.shellPage = {};

	var fileClient, serviceRegistry;

	mBootstrap.startup().then(function(core) {
		serviceRegistry = core.serviceRegistry;
		fileClient = new mFileClient.FileClient(serviceRegistry);
	});

	orion.shellPage.ShellPageFileService = (function() {
		function ShellPageFileService() {
			this.currentDirectory = null;
			this.withNode(
				this.SEPARATOR,
				function(node) {
					this.rootNode = node;
				}.bind(this)
			);
			this.currentRetrievals = {};
		}

		ShellPageFileService.prototype = {
			SEPARATOR: "/", //$NON-NLS-0$
			computePathString: function(node) {
				if (node.Location === this.SEPARATOR) {
					return this.SEPARATOR;
				}
				var path = this.SEPARATOR + fileClient.fileServiceName(node.Location);
				var parents = node.Parents;
				if (parents) {
					path += this.SEPARATOR;
					for (var i = parents.length; --i >= 0 ;){
						path += parents[i].Name; 
						path += this.SEPARATOR;
					}
					path += node.Name;
				}
				if (node.Directory) {
					path += this.SEPARATOR;
				}
				return path;
			},
			createDirectory: function(parentNode, name) {
				return this._createResource(parentNode, name, true);
			},
			createFile: function(parentNode, name) {
				return this._createResource(parentNode, name, false);
			},
			ensureDirectory: function(parentNode, directory) {
				var result = new Deferred();
				if (typeof(directory) !== "string") { //$NON-NLS-0$
					/* the resource already exists */
					if (directory.Directory) {
						result.resolve(directory);
					} else {
						result.reject(messages["AlreadyExistsInDirErr"]);
					}
				} else {
					parentNode = parentNode || this.getCurrentDirectory();
					this.withChildren(
						parentNode,
						function(children) {
							if (children) {
								for (var i = 0; i < children.length; i++) {
									if (children[i].Name === directory) {
										if (children[i].Directory) {
											/* directory already exists, so nothing to do */
											result.resolve(children[i]);
										} else {
											result.reject(messages["AlreadyExistsInDirErr"]);
										}
										return;
									}
								}
							}
							this.createDirectory(parentNode, directory).then(
								function(directory) {
									result.resolve(directory);
								},
								function(error) {
									result.reject(error);
								}
							);
						}.bind(this),
						function(error) {
							result.reject(error);
						}
					);
				}
				return result;
			},
			ensureFile: function(parentNode, file) {
				var result = new Deferred();
				if (typeof(file) !== "string") { //$NON-NLS-0$
					/* the resource already exists */
					if (!file.Directory) {
						result.resolve(file);
					} else {
						result.reject(messages["AlreadyExistsInDirErr"]);
					}
				} else {
					parentNode = parentNode || this.getCurrentDirectory();
					this.withChildren(
						parentNode,
						function(children) {
							if (children) {
								for (var i = 0; i < children.length; i++) {
									if (children[i].Name === file) {
										if (!children[i].Directory) {
											/* file already exists, so nothing to do */
											result.resolve(children[i]);
										} else {
											result.reject(messages["AlreadyExistsInDirErr"]);
										}
										return;
									}
								}
							}
							this.createFile(parentNode, file).then(
								function(file) {
									result.resolve(file);
								},
								function(error) {
									result.reject(error);
								}
							);
						}.bind(this),
						function(error) {
							result.reject(error);
						}
					);
				}
				return result;
			},
			getChild: function(node, name) {
				if (name.length === 0) {
					return null;
				}
				if (name === ".") { //$NON-NLS-0$
					return node;
				}
				if (name === "..") { //$NON-NLS-0$
					return this.getParent(node);
				}
				if (!node.Children) {
					return null;
				}
				for (var i = 0; i < node.Children.length; i++) {
					if (node.Children[i].Name === name) {
						return node.Children[i];
					}
				}
				return null;
			},
			getCurrentDirectory: function() {
				return this.currentDirectory;
			},
			/**
			 * Resolves path in terms of the specified root node (or the
			 * current directory if a root node is not provided) and returns
			 * the node of the resulting directory.
			 */
			getDirectory: function(root, path) {
				if (path.indexOf(this.SEPARATOR) === 0) {
					root = this.rootNode;
					path = path.substring(1);
				} else {
					if (!root) {
						if (!this.currentDirectory) {
							/* no node to resolve the path in terms of */
							return null;
						}
						root = this.currentDirectory;
					}
				}
				var segments = path.substring(0, path.lastIndexOf(this.SEPARATOR)).split(this.SEPARATOR);
				var result = root;
				for (var i = 0; i < segments.length; i++) {
					if (segments[i].length > 0) {
						result = this.getChild(result, segments[i]);
						if (!result || !result.Directory) {
							/* non-existent directory */
							return null;
						}
					}
				}

				/*
				 * If the full path represents a directory then initiate the
				 * retrieval of its full node info and children.
				 */
				var lastSegment = path.substring(path.lastIndexOf(this.SEPARATOR) + 1);
				var child = this.getChild(result, lastSegment);
				if (child) {
					this._retrieveNode(child);
				}

				if (!result.Children) {
					this._retrieveNode(result);
				}
				return result;
			},
			getParent: function(node) {
				if (node.parent) {
					this._retrieveNode(node.parent);
				}
				return node.parent;
			},
			loadWorkspace: function(path) {
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				return (progress ? progress.progress(fileClient.loadWorkspace(path), "Loading workspace " + path) : fileClient.loadWorkspace(path)); //$NON-NLS-0$
			},
			read: function(node) {
				return fileClient.read(node.Location, false);
			},
			readBlob: function(node) {
				var sourceService = fileClient._getService(node.Location);
				if (!sourceService.readBlob) {
					var promise = new Deferred();
					promise.reject(messages["SrcNotSupportBinRead"]);
					return promise;
				}
				return sourceService.readBlob(node.Location);
			},
			/**
			 * Sets the current directory node and initiates retrieval of its
			 * child nodes.
			 */
			setCurrentDirectory: function(node) {
				this.currentDirectory = node;
				this._retrieveNode(node);
			},
			withChildren: function(node, func, errorFunc) {
				if (node.Children) {
					if (func) {
						func(node.Children);
					}
				} else if (node.ChildrenLocation) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					(progress ? progress.progress(fileClient.fetchChildren(node.ChildrenLocation), "Getting children of " + node.Name) : fileClient.fetchChildren(node.ChildrenLocation)).then( //$NON-NLS-0$
						function(children) {
							this._sort(children);
							var parents = node.Parents ? node.Parents.slice(0) : [];
							if (!node.parent || node.parent !== this.rootNode) {
								parents.unshift(node);
							}
							for (var i = 0; i < children.length; i++) {
								children[i].parent = node;
								children[i].Parents = parents;
							}
							node.Children = children;
							if (func) {
								func(children);
							}
						}.bind(this),
						function(error) {
							if (errorFunc) {
								errorFunc(error);
							}
						}
					);
				} else {
					if (func) {
						func(null);
					}
				}
			},
			withNode: function(location, func, errorFunc) {
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				(progress ? progress.progress(fileClient.loadWorkspace(location), "Loading workspace " + location) : fileClient.loadWorkspace(location)).then( //$NON-NLS-0$
					function(node) {
						this._retrieveNode(node, func, errorFunc);
					}.bind(this),
					errorFunc);
			},
			write: function(node, content) {
				return fileClient.write(node.Location, content);
			},
			writeBlob: function(node, content) {
				var targetService = fileClient._getService(node.Location);
				if (!targetService.writeBlob) {
					var promise = new Deferred();
					promise.reject(messages["TargetNotSupportBinWrite"]);
					return promise;
				}
				return targetService.writeBlob(node.Location, content);
			},

			/** @private */

			_createResource: function(parentNode, name, isDirectory) {
				var key = parentNode.Location + this.SEPARATOR + name;
				var result = new Deferred();
				var retrievals = this.currentRetrievals[key] || [];
				retrievals.push(result);
				if (retrievals.length === 1) {
					/* this is the first request to create this file or directory */
					this.currentRetrievals[key] = retrievals;
					var notifySuccess = function(result) {
						/* work around core bug that results in created folders not having the correct name field */
						if (isDirectory) {
							result.Name = name;
						}
						this.currentRetrievals[key].forEach(function(current) {
							current.resolve(result);
						});
						delete this.currentRetrievals[key];
					}.bind(this);
					var notifyError = function(error) {
						this.currentRetrievals[key].forEach(function(current) {
							current.reject(error.responseText);
						});
						delete this.currentRetrievals[key];
					}.bind(this);
					if (isDirectory) {
						if (parentNode.Projects) {
							/* parent is top-level folder, so create project and answer its content folder */
							fileClient.createProject(parentNode.Location, name).then(
								function(project) {
									fileClient.read(project.ContentLocation, true).then(notifySuccess, notifyError);
								},
								notifyError);
						} else {
							fileClient.createFolder(parentNode.Location, name).then(notifySuccess, notifyError);
						}
					} else {
						fileClient.createFile(parentNode.Location, name).then(notifySuccess, notifyError);
					}
				}
				return result;
			},
			_retrieveNode: function(node, func, errorFunc) {
				if (node.parent && node.Children) {
					if (func) {
						func(node);
					}
					return;
				}

				var retrieveChildren = function(node, func, errorFunc) {
					if (node.Directory && !node.Children) {
						this.withChildren(
							node,
							function(children) {
								if (func) {
									func(node);
								}
							},
							errorFunc);
					} else {
						if (func) {
							func(node);
						}
					}
				}.bind(this);
				var updateParents = function(node, func, errorFunc) {
					if (node.Location === this.SEPARATOR) {
						func(node);
					} else if (!node.Parents) {
						/* node is the root of a file service */
						node.parent = this.rootNode;
						func(node);
					} else if (node.Parents.length === 0) {
						/* node's parent is the root of a file service */
						var location = fileClient.fileServiceRootURL(node.Location);
						var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
						(progress ? progress.progress(fileClient.loadWorkspace(location), "Loading workspace " + location) : fileClient.loadWorkspace(location)).then( //$NON-NLS-0$
							function(parent) {
								parent.parent = this.rootNode;
								node.parent = parent;
								func(node);
							}.bind(this),
							errorFunc
						);
					} else {
						node.parent = node.Parents[0];
						for (var i = 0; i < node.Parents.length - 1; i++) {
							node.Parents[i].parent = node.Parents[i+1];
							node.Parents[i].Directory = true;
						}
						func(node);
					}
				}.bind(this);
				if (!node.Parents && !node.Projects && node.Location !== this.SEPARATOR && node.Name !== fileClient.fileServiceName(node.Location)) {
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					(progress ? progress.progress(fileClient.loadWorkspace(node.Location), "Loading workspace " + node.Location) : fileClient.loadWorkspace(node.Location)).then( //$NON-NLS-0$
						function(metadata) {
							node.Parents = metadata.Parents;
							updateParents(
								node,
								function(updatedNode) {
									retrieveChildren(updatedNode, func, errorFunc);
								},
								function(error) {
									retrieveChildren(node, func, errorFunc);
								}
							);
						});
				} else {
					if (node.ChildrenLocation) {
						node.Directory = true;
					}
					updateParents(
						node,
						function(updatedNode) {
							retrieveChildren(updatedNode, func, errorFunc);
						},
						function(error) {
							retrieveChildren(node, func, errorFunc);
						}
					);
				}
			},
			_sort: function(children) {
				children.sort(function(a,b) {
					if (a.Directory !== b.Directory) {
						return a.Directory ? -1 : 1;
					}
					var name1 = a.Name && a.Name.toLowerCase();
					var name2 = b.Name && b.Name.toLowerCase();
					if (name1 < name2) {
						return -1;
					}
					if (name1 > name2) {
						return 1;
					}
					return 0;
				});
			}
		};
		return ShellPageFileService;
	}());

	return orion.shellPage;
});