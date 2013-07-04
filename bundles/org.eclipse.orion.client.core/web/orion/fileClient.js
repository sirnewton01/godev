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

/*global window define */
/*jslint forin:true devel:true*/

/** @namespace The global container for eclipse APIs. */

define(['i18n!orion/navigate/nls/messages', "orion/Deferred", "orion/i18nUtil"], function(messages, Deferred, i18nUtil){
	/**
	 * This helper method implements invocation of the service call,
	 * with retry on authentication error if needed.
	 * @private
	 */
	function _doServiceCall(fileService, funcName, funcArgs) {
		//if the function is not implemented in the file service, we throw an exception to the caller
		if(!fileService[funcName]){
			throw funcName + messages[" is not supported in this file system"];
		}
		return fileService[funcName].apply(fileService, funcArgs);
	}
	
	function _copy(sourceService, sourceLocation, targetService, targetLocation) {
		
		if (!sourceService.readBlob) {
			throw messages["source file service does not support binary read"];
		}

		if (!targetService.writeBlob) {
			throw messages["target file service does not support binary write"];
		}
	
		if (sourceLocation[sourceLocation.length -1] !== "/") { //$NON-NLS-0$
			return _doServiceCall(sourceService, "readBlob", [sourceLocation]).then(function(contents) { //$NON-NLS-0$
				return _doServiceCall(targetService, "writeBlob", [targetLocation, contents]); //$NON-NLS-0$
			});
		}

		var temp = targetLocation.substring(0, targetLocation.length - 1);
		var name = decodeURIComponent(temp.substring(temp.lastIndexOf("/")+1)); //$NON-NLS-0$
		var parentLocation = temp.substring(0, temp.lastIndexOf("/")+1);  //$NON-NLS-0$

		return _doServiceCall(targetService, "createFolder", [parentLocation, name]).then(function() { //$NON-NLS-0$
			return;
		}, function() {
			return;
		}).then(function() {
			return _doServiceCall(sourceService, "fetchChildren", [sourceLocation]).then(function(children) { //$NON-NLS-0$
				var results = [];
				for(var i = 0; i < children.length; ++i) {
					var childSourceLocation = children[i].Location;
					var childTemp =  childSourceLocation;
					if (children[i].Directory) {
						childTemp = childSourceLocation.substring(0, childSourceLocation.length - 1);
					}
					var childName = decodeURIComponent(childTemp.substring(childTemp.lastIndexOf("/")+1)); //$NON-NLS-0$
					
					var childTargetLocation = targetLocation + encodeURIComponent(childName);
					if (children[i].Directory) {
						childTargetLocation += "/"; //$NON-NLS-0$
					}
					results[i] = _copy(sourceService, childSourceLocation, targetService, childTargetLocation);
				}
				return Deferred.all(results);
			});
		});
	}
	
	
	/**
	 * Creates a new file client.
	 * @class The file client provides a convenience API for interacting with file services
	 * provided by plugins. This class handles authorization, and authentication-related
	 * error handling.
	 * @name orion.fileClient.FileClient
	 */
	function FileClient(serviceRegistry, filter) {
		var allReferences = serviceRegistry.getServiceReferences("orion.core.file"); //$NON-NLS-0$
		var _references = allReferences;
		if (filter) {
			_references = [];
			for(var i = 0; i < allReferences.length; ++i) {
				if (filter(allReferences[i])) {
					_references.push(allReferences[i]);
				}
			}
		}
		var _patterns = [];
		var _services = [];
		var _names = [];
		
		function _noMatch(location) {
			var d = new Deferred();
			d.reject(messages["No Matching FileService for location:"] + location);
			return d;
		}
		
		var _fileSystemsRoots = [];
		var _allFileSystemsService =  {
			fetchChildren: function() {
				var d = new Deferred();
				d.resolve(_fileSystemsRoots);
				return d;
			},
			createWorkspace: function() {
				var d = new Deferred();
				d.reject(messages["no file service"]);
				return d;
			},
			loadWorkspaces: function() {
				var d = new Deferred();
				d.reject(messages['no file service']);
				return d;
			},
			loadWorkspace: function(location) {
				var d = new Deferred();
				window.setTimeout(function() {
					d.resolve({
						Directory: true, 
						Length: 0, 
						LocalTimeStamp: 0,
						Name: messages["File Servers"],
						Location: "/",  //$NON-NLS-0$
						Children: _fileSystemsRoots,
						ChildrenLocation: "/" //$NON-NLS-0$
					});
				}, 100);
				return d;
			},
			search: _noMatch,
			createProject: _noMatch,
			createFolder: _noMatch,
			createFile: _noMatch,
			deleteFile: _noMatch,
			moveFile: _noMatch,
			copyFile: _noMatch,
			read: _noMatch,
			write: _noMatch
		};
				
		for(var j = 0; j < _references.length; ++j) {
			_fileSystemsRoots[j] = {
				Directory: true, 
				Length: 0, 
				LocalTimeStamp: 0,
				Location: _references[j].getProperty("top"), //$NON-NLS-0$
				ChildrenLocation: _references[j].getProperty("top"), //$NON-NLS-0$
				Name: _references[j].getProperty("Name")		 //$NON-NLS-0$
			};

			var patternString = _references[j].getProperty("pattern") || ".*"; //$NON-NLS-1$ //$NON-NLS-0$
			if (patternString[0] !== "^") { //$NON-NLS-0$
				patternString = "^" + patternString; //$NON-NLS-0$
			}
			_patterns[j] = new RegExp(patternString);			
			_services[j] = serviceRegistry.getService(_references[j]);
			_names[j] = _references[j].getProperty("Name"); //$NON-NLS-0$
			
			if(_references[j].getProperty("NameKey") && _references[j].getProperty("nls")){
				i18nUtil.getMessageBundle(_references[j].getProperty("nls")).then(function(j, pluginMessages){
					_fileSystemsRoots[j].Name = pluginMessages[_references[j].getProperty("NameKey")]; //$NON-NLS-0$
					_names[j] = pluginMessages[_references[j].getProperty("NameKey")]; //$NON-NLS-0$
				}.bind(this, j));
			}
		}
				
		this._getServiceIndex = function(location) {
			// client must specify via "/" when a multi file service tree is truly wanted
			if (location === "/") { //$NON-NLS-0$
				return -1;
			} else if (!location || (location.length && location.length === 0)) {
				// TODO we could make the default file service a preference but for now we use the first one
				return _services[0] ? 0 : -1;
			}
			for(var i = 0; i < _patterns.length; ++i) {
				if (_patterns[i].test(location)) {
					return i;
				}
			}
			throw messages['No Matching FileService for location:'] + location;
		};
		
		this._getService = function(location) {
			var i = this._getServiceIndex(location);
			return i === -1 ? _allFileSystemsService : _services[i];
		};
		
		this._getServiceName = function(location) {
			var i = this._getServiceIndex(location);
			return i === -1 ? _allFileSystemsService.Name : _names[i];
		};
		
		this._getServiceRootURL = function(location) {
			var i = this._getServiceIndex(location);
			return i === -1 ? _allFileSystemsService.Location : _fileSystemsRoots[i].Location;
		};
	}
	
	FileClient.prototype = /**@lends orion.fileClient.FileClient.prototype */ {
		/**
		 * Returns the file service managing this location
		 * @param location The location of the item 
		 */
		getService: function(location) {
			return this._getService(location);
		},
		 
		/**
		 * Returns the name of the file service managing this location
		 * @param location The location of the item 
		 */
		fileServiceName: function(location) {
			return this._getServiceName(location);
		},
		 
		/**
		 * Returns the root url of the file service managing this location
		 * @param location The location of the item 
		 */
		fileServiceRootURL: function(location) {
			return this._getServiceRootURL(location);
		},
		 
		/**
		 * Obtains the children of a remote resource
		 * @param location The location of the item to obtain children for
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(location) {
			return _doServiceCall(this._getService(location), "fetchChildren", arguments); //$NON-NLS-0$
		},

		/**
		 * Creates a new workspace with the given name. The resulting workspace is
		 * passed as a parameter to the provided onCreate function.
		 * @param {String} name The name of the new workspace
		 */
		createWorkspace: function(name) {
			return _doServiceCall(this._getService(), "createWorkspace", arguments); //$NON-NLS-0$
		},

		/**
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return _doServiceCall(this._getService(), "loadWorkspaces", arguments); //$NON-NLS-0$
		},
		
		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} location the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(location) {
			return _doServiceCall(this._getService(location), "loadWorkspace", arguments); //$NON-NLS-0$
		},
		
		/**
		 * Adds a project to a workspace.
		 * @param {String} url The workspace location
		 * @param {String} projectName the human-readable name of the project
		 * @param {String} serverPath The optional path of the project on the server.
		 * @param {Boolean} create If true, the project is created on the server file system if it doesn't already exist
		 */
		createProject: function(url, projectName, serverPath, create) {
			return _doServiceCall(this._getService(url), "createProject", arguments); //$NON-NLS-0$
		},
		/**
		 * Creates a folder.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} folderName The name of the folder to create
		 * @return {Object} JSON representation of the created folder
		 */
		createFolder: function(parentLocation, folderName) {
			return _doServiceCall(this._getService(parentLocation), "createFolder", arguments); //$NON-NLS-0$
		},
		/**
		 * Create a new file in a specified location. Returns a deferred that will provide
		 * The new file object when ready.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} fileName The name of the file to create
		 * @return {Object} A deferred that will provide the new file object
		 */
		createFile: function(parentLocation, fileName) {
			return _doServiceCall(this._getService(parentLocation), "createFile", arguments); //$NON-NLS-0$
		},
		/**
		 * Deletes a file, directory, or project.
		 * @param {String} location The location of the file or directory to delete.
		 */
		deleteFile: function(location) {
			return _doServiceCall(this._getService(location), "deleteFile", arguments); //$NON-NLS-0$
		},
		
		/**		 
		 * Moves a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to move.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		moveFile: function(sourceLocation, targetLocation, name) {
			var sourceService = this._getService(sourceLocation);
			var targetService = this._getService(targetLocation);
			
			if (sourceService === targetService) {
				return _doServiceCall(sourceService, "moveFile", arguments);				 //$NON-NLS-0$
			}
			
			var isDirectory = sourceLocation[sourceLocation.length -1] === "/"; //$NON-NLS-0$
			var target = targetLocation;
			
			if (target[target.length -1] !== "/") { //$NON-NLS-0$
				target += "/"; //$NON-NLS-0$
			}
			
			if (name) {
				target += encodeURIComponent(name);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1); //$NON-NLS-0$
			}
			
			if (isDirectory && target[target.length -1] !== "/") { //$NON-NLS-0$
				target += "/"; //$NON-NLS-0$
			}
	
			return _copy(sourceService, sourceLocation, targetService, target).then(function() {
				return _doServiceCall(sourceService, "deleteFile", [sourceLocation]); //$NON-NLS-0$
			});
			
		},
		 
		/**
		 * Copies a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to copy.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		copyFile: function(sourceLocation, targetLocation, name) {
			var sourceService = this._getService(sourceLocation);
			var targetService = this._getService(targetLocation);
			
			if (sourceService === targetService) {
				return _doServiceCall(sourceService, "copyFile", arguments);				 //$NON-NLS-0$
			}
			
			var isDirectory = sourceLocation[sourceLocation.length -1] === "/"; //$NON-NLS-0$
			var target = targetLocation;
			
			if (target[target.length -1] !== "/") { //$NON-NLS-0$
				target += "/"; //$NON-NLS-0$
			}
			
			if (name) {
				target += encodeURIComponent(name);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1); //$NON-NLS-0$
			}
			
			if (isDirectory && target[target.length -1] !== "/") { //$NON-NLS-0$
				target += "/"; //$NON-NLS-0$
			}

			return _copy(sourceService, sourceLocation, targetService, target);
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
			return _doServiceCall(this._getService(location), "read", arguments); //$NON-NLS-0$
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
			return _doServiceCall(this._getService(location), "write", arguments); //$NON-NLS-0$
		},

		/**
		 * Imports file and directory contents from another server
		 *
		 * @param {String} targetLocation The location of the folder to import into
		 * @param {Object} options An object specifying the import parameters
		 * @return A deferred for chaining events after the import completes
		 */		
		remoteImport: function(targetLocation, options) {
			return _doServiceCall(this._getService(targetLocation), "remoteImport", arguments); //$NON-NLS-0$
		},

		/**
		 * Exports file and directory contents to another server
		 *
		 * @param {String} sourceLocation The location of the folder to export from
		 * @param {Object} options An object specifying the export parameters
		 * @return A deferred for chaining events after the export completes
		 */		
		remoteExport: function(sourceLocation, options) {
			return _doServiceCall(this._getService(sourceLocation), "remoteExport", arguments); //$NON-NLS-0$
		},
		
		/**
		 * Performs a search with the given search parameters.
		 * @param {Object} searchParams The JSON object that describes all the search parameters.
		 * @param {String} searchParams.resource Required. The location where search is performed. Required. Normally a sub folder of the file system. Empty string means the root of the file system.
		 * @param {String} searchParams.keyword The search keyword. Required but can be empty string.  If fileType is a specific type and the keyword is empty, then list up all the files of that type. If searchParams.regEx is true then the keyword has to be a valid regular expression. 
		 * @param {String} searchParams.sort Required. Defines the order of the return results. Should be either "Path asc" or "Name asc". Extensions are possible but not currently supported.  
		 * @param {boolean} searchParams.nameSearch Optional. If true, the search performs only file name search. 
		 * @param {String} searchParams.fileType Optional. The file type. If specified, search will be performed under this file type. E.g. "*.*" means all file types. "html" means html files.
		 * @param {Boolean} searchParams.regEx Optional. The option of regular expression search.
		 * @param {integer} searchParams.start Optional. The zero based strat number for the range of the returned hits. E.g if there are 1000 hits in total, then 5 means the 6th hit.
		 * @param {integer} searchParams.rows Optional. The number of hits of the range. E.g if there are 1000 hits in total and start=5 and rows=40, then the return range is 6th-45th.
		 */
		search: function(searchParams) {
			return _doServiceCall(this._getService(searchParams.resource), "search", arguments); //$NON-NLS-0$
		}
	};//end FileClient prototype
	FileClient.prototype.constructor = FileClient;

	//return the module exports
	return {FileClient: FileClient};
});
