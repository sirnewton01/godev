/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global orion*/
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
window.BlobBuilder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.BlobBuilder;

function createFile(entry) {
	var deferred = new orion.Deferred();
	entry.getMetadata(function(metadata) {
		var result = {
			Attributes: {
					Archive: false, 
					Hidden: false,
					ReadOnly: false,
					SymLink: false
			}
		};
		result.Location = entry.toURL();
		result.Name = entry.name;
		result.Length = metadata.size;
		result.LocalTimeStamp = metadata.modificationTime.getTime();
		result.Directory = entry.isDirectory;
		if (result.Directory) {
			result.Location = result.Location.slice(-1) === "/" ? result.Location : result.Location + "/";
			result.ChildrenLocation = result.Location;
		}
		deferred.resolve(result);
	}, deferred.reject);
	return deferred;
}

function readEntries(dirEntry) {
	var deferred = new orion.Deferred();
	var reader = dirEntry.createReader();
	var entries = [];
	function handleEntries(results) {
		if (results.length) {
			entries = entries.concat(Array.prototype.slice.call(results));
			reader.readEntries(handleEntries, deferred.reject);
		} else {
			deferred.resolve(entries);
		}
	}
	reader.readEntries(handleEntries, deferred.reject);
	return deferred;
}

function resolveEntryURL(url) {
	var d = new orion.Deferred();
	window.resolveLocalFileSystemURL(url, d.resolve, d.reject);
	return d;
}

/** @namespace The global container for eclipse APIs. */
var eclipse = eclipse || {};

/**
 * An implementation of the file service that understands the Orion 
 * server file API. This implementation is suitable for invocation by a remote plugin.
 */
eclipse.HTML5LocalFileServiceImpl= (function() {
	/**
	 * @class Provides operations on files, folders, and projects.
	 * @name FileServiceImpl
	 */
	function HTML5LocalFileServiceImpl(fileSystem) {
		this._root = fileSystem.root;
		this._rootLocation = fileSystem.root.toURL();
	}
	
	HTML5LocalFileServiceImpl.prototype = /**@lends eclipse.HTML5LocalFileServiceImpl.prototype */
	{
		_normalizeLocation : function(location) {
			if (!location) {
				location = "/";
			} else {
				location = location.replace(this._rootLocation, "/");				
			}
			return location;
		},
		_createParents: function(entry) {
			var deferred = new orion.Deferred();
			var result = [];
			var rootFullPath = this._root.fullPath;
			
			function handleParent(parent) {
				if (parent.fullPath !== rootFullPath) {
					var location = parent.toURL();
					location = location.slice(-1) === "/" ? location : location + "/";
					result.push({
						Name: parent.name,
						Location: location,
						ChildrenLocation: location
					});
					parent.getParent(handleParent, deferred.reject);
				} else {
					deferred.resolve(result);
				}
			}
			if (rootFullPath === entry.fullPath) {
				deferred.resolve(null);
			} else {
				entry.getParent(handleParent, deferred.reject);
			}
			return deferred;
		},
		_getEntry: function(location) {
			return resolveEntryURL(location || this._rootLocation);
		},
		/**
		 * Obtains the children of a remote resource
		 * @param location The location of the item to obtain children for
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(location) {
			return this._getEntry(location).then(function(dirEntry) {
				return readEntries(dirEntry);
			}).then(function(entries) {
				return orion.Deferred.all(entries.map(createFile));
			});
		},


		/**
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return this.loadWorkspace();
		},
		
		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} location the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(location) {
			var that = this;
			var result;

			return this._getEntry(location).then(function(dirEntry) {
				return createFile(dirEntry).then(function(file) {
					result = file;
					return readEntries(dirEntry);
				}).then(function(entries) {
					return orion.Deferred.all(entries.map(createFile));
				}).then(function(children) {
					if (children) {
						result.Children = children;
					}
					return that._createParents(dirEntry);
				}).then(function(parents) {
					if (parents) {
						result.Parents = parents;
					}
					return result;
				});
			});
		},

		/**
		 * Creates a new workspace with the given name. The resulting workspace is
		 * passed as a parameter to the provided onCreate function.
		 * @param {String} name The name of the new workspace
		 */
		_createWorkspace: function(name) {
			return this.createFolder(this._rootLocation, name);
		},
		
		/**
		 * Adds a project to a workspace.
		 * @param {String} url The workspace location
		 * @param {String} projectName the human-readable name of the project
		 * @param {String} serverPath The optional path of the project on the server.
		 * @param {Boolean} create If true, the project is created on the server file system if it doesn't already exist
		 */
		createProject: function(url, projectName, serverPath, create) {
			var d = new orion.Deferred();
			this.createFolder(url, projectName).then(function(project) {
				project.ContentLocation = project.Location;
				d.resolve(project);
			}, d.reject);
			return d;
		},
		/**
		 * Creates a folder.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} folderName The name of the folder to create
		 * @return {Object} JSON representation of the created folder
		 */
		createFolder: function(parentLocation, folderName) {
			var that = this;
			return this._getEntry(parentLocation).then(function(dirEntry) {
				var d = new orion.Deferred();
				dirEntry.getDirectory(folderName, {create:true}, function() {d.resolve(that.read(parentLocation + "/" + folderName, true));}, d.reject);
				return d;
			});
		},
		/**
		 * Create a new file in a specified location. Returns a deferred that will provide
		 * The new file object when ready.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} fileName The name of the file to create
		 * @return {Object} A deferred that will provide the new file object
		 */
		createFile: function(parentLocation, fileName) {
			var that = this;
			return this._getEntry(parentLocation).then(function(dirEntry) {
				var d = new orion.Deferred();
				dirEntry.getFile(fileName, {create:true}, function() {d.resolve(that.read(parentLocation + "/" + fileName, true));}, d.reject);
				return d;
			});
		},
		/**
		 * Deletes a file, directory, or project.
		 * @param {String} location The location of the file or directory to delete.
		 */
		deleteFile: function(location) {
			return this._getEntry(location).then(function(entry) {
				var d = new orion.Deferred();
				var remove = (entry.removeRecursively) ? "removeRecursively" : "remove";
				entry[remove](function() {d.resolve();}, d.reject);
				return d;
			});
		},
		
		/**
		 * Moves a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to move.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		moveFile: function(sourceLocation, targetLocation, name) {
			var that = this;
			if (sourceLocation.indexOf(this._rootLocation) === -1 || targetLocation.indexOf(this._rootLocation) === -1) {
				throw "Not supported";	
			}
			
			return this._getEntry(sourceLocation).then(function(entry) {
				return that._getEntry(targetLocation).then(function(parent) {
					var d = new orion.Deferred();
					entry.moveTo(parent, name, function() {d.resolve(that.read(targetLocation + "/" + (name || entry.name), true));}, d.reject);
					return d;
				});
			});
		},
		 
		/**
		 * Copies a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to copy.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		copyFile: function(sourceLocation, targetLocation, name) {
			var that = this;
			if (sourceLocation.indexOf(this._rootLocation) === -1 || targetLocation.indexOf(this._rootLocation) === -1) {
				throw "Not supported";	
			}
			
			return this._getEntry(sourceLocation).then(function(entry) {
				return that._getEntry(targetLocation).then(function(parent) {
					var d = new orion.Deferred();
					entry.copyTo(parent, name, function() {d.resolve(that.read(targetLocation + "/" + (name || entry.name), true));}, d.reject);
					return d;
				});
			});
		},
		/**
		 * Returns the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata, 
		 *   otherwise file contents are returned
		 * @return A deferred that will be provided with the contents or metadata when available
		 */
		read: function(location, isMetadata) {
			var that = this;
			return this._getEntry(location).then(function(entry) {
				var d;
				if (isMetadata) {
					return createFile(entry).then(function(file) {
						return that._createParents(entry).then(function(parents) {
							if (parents) {
								file.Parents = parents;
							}
							return file;
						});
					});
				}
				d = new orion.Deferred();
				entry.file(function(file) {
					var reader = new FileReader();
					reader.readAsText(file);
					reader.onload = function() {
						d.resolve(reader.result);
					};
					reader.onerror = function() {
						d.reject(reader.error);
					};
				});
				return d;
			});
		},
		/**
		 * Writes the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to set contents for
		 * @param {String|Object} contents The content string, or metadata object to write
		 * @param {String|Object} args Additional arguments used during write operation (i.e. ETag) 
		 * @return A deferred for chaining events after the write completes with new metadata object
		 */		
		write: function(location, contents, args) {
			var that = this;
			return this._getEntry(location).then(function(entry){
				return entry;
			}, function() {
				var lastSlash = location.lastIndexOf("/");
				var parentLocation = (lastSlash === -1) ? this._rootLocation : location.substring(0, lastSlash + 1);
				var name = decodeURIComponent(location.substring(lastSlash +1));
				return that.createFile(parentLocation, name).then(function() {
					return that._getEntry(location);
				});
			}).then(function(entry) {
				var d = new orion.Deferred();
				entry.createWriter(function(writer) {
					var blob = new Blob([contents]);
					writer.write(blob);
					var truncated = false;
					writer.onwrite = function() {
						if (!truncated) {
							truncated = true;
							writer.truncate(blob.size);
						} else {
							createFile(entry).then(d.resolve, d.reject);
						}
					};
					writer.onerror = function() {
						d.reject(writer.error);
					};
				});
				return d;
			});
		},
		/**
		 * Imports file and directory contents from another server
		 *
		 * @param {String} targetLocation The location of the folder to import into
		 * @param {Object} options An object specifying the import parameters
		 * @return A deferred for chaining events after the import completes
		 */		
		remoteImport: function(targetLocation, options) {
			throw "Not supported";
		},
		/**
		 * Exports file and directory contents to another server
		 *
		 * @param {String} sourceLocation The location of the folder to export from
		 * @param {Object} options An object specifying the export parameters
		 * @return A deferred for chaining events after the export completes
		 */		
		remoteExport: function(sourceLocation, options) {
			throw "Not supported";
		},
		readBlob: function(location) {
			return this._getEntry(location).then(function(entry) {
				var d = new orion.Deferred();
				entry.file(function(file) {
					d.resolve(file);
				});
				return d;
			});
		},
		writeBlob: function(location, contents, args) {
			return this.write(location, contents, args);
		}
	};

	return HTML5LocalFileServiceImpl;
}());
