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

function serializeChildren(node) {
	var children = node.childNodes;
	if (children.length === 0) {
		return null;
	}
	
	if (children.length === 1 && children[0].nodeType === 3) {
		return children[0].nodeValue;
	}
	
	var result = "";
	var serializer = new XMLSerializer();
	for (var i = 0; i < children.length; i++) {
		result += serializer.serializeToString(children[i]);
	}
	return result;
}

function parseDAV_propstat(propstatElement) {
	var responsedescriptionElement = propstatElement.querySelector("responsedescription"),
	statusElement = propstatElement.querySelector("status"),
	propElement = propstatElement.querySelector("prop"),
	propChildren = propElement.childNodes,
	current,
	i,
	result = {};		
	
	if (responsedescriptionElement !==null) {
		result.responsedescription = serializeChildren(responsedescriptionElement);
	}
	
	if (statusElement !==null) {
		result.status = serializeChildren(statusElement);
	}
	
	result.prop = {"@xmlns": {"$":"DAV:"}};
	for (i = 0; i < propChildren.length; i++) {
		current = propChildren[i];
		if (current.nodeType === 1) {
			if (current.namespaceURI === "DAV:") {
				result.prop[current.localName] = serializeChildren(current);
			} else {								
				if (current.prefix !== null) {
					result.prop["@xmlns"][current.prefix] = current.namespaceURI;
				}
				result.prop[current.nodeName] = serializeChildren(current);
			}
		}
	}
	return result;
}

function parseDAV_response(responseElement) {
	var hrefElements = responseElement.querySelectorAll("href"),
	responsedescriptionElement = responseElement.querySelector("responsedescription"),
	statusElement,
	propstatElements,
	i,
	result = {href: []};
	/* Comment for demo */
	
	if (responsedescriptionElement !==null) {
		result.responsedescription = serializeChildren(responsedescriptionElement);
	}
	
	if (hrefElements.length === 1) {
		result.href.push(serializeChildren(hrefElements[0]));
		result.propstat = [];
		propstatElements = responseElement.querySelectorAll("propstat");
		for (i = 0; i < propstatElements.length; i++) {
			result.propstat.push(parseDAV_propstat(propstatElements[i]));
		}
	} else {
		statusElement = responseElement.querySelector("status");
		if (statusElement) {
			result.status = serializeChildren(statusElement);
		}
		for (i=0; i < hrefElements.length; i++) {
			result.href.push(serializeChildren(hrefElements[i]));
		}
	}
	return result;
}

function parseDAV_multistatus(text) {
	var dom = new DOMParser().parseFromString(text, "text/xml");
	var multistatusElement = dom.childNodes[0];
	var responseElements = multistatusElement.querySelectorAll("response"),
	responsedescriptionElement = multistatusElement.querySelector("responsedescription"),
	i,
	result = {response: []};
	
	if (responsedescriptionElement !==null) {
		result.responsedescription = serializeChildren(responsedescriptionElement);
	}
	
	for (i = 0; i < responseElements.length; i++) {
		result.response.push(parseDAV_response(responseElements[i]));
	}
	return result;
}

function getHostName(url) {
		var re = new RegExp('^(?:f|ht)tp(?:s)?://([^/]+)', 'im');
		var result = url.match(re);
		if (result === null) {
			return null;
		} else {
			return result[0];
		}
}

function createFile(response) {
	var result = {
		Attributes: {
				Archive: false, 
				Hidden: false,
				ReadOnly: false,
				SymLink: false
		}
	};
	
	if (getHostName(response.href[0]) === null) {
		result.Location = getHostName(this.name).concat(response.href[0]);
	} else {
		result.Location = response.href[0];
	}
	var prop = response.propstat[0].prop;
	var locationSplits = result.Location.split("/");
	if (locationSplits[locationSplits.length-1] === "") {
		result.Name = locationSplits[locationSplits.length-2];
	}
	else {
		result.Name = locationSplits.pop();
	}
	result.Length = Number(prop.getcontentlength);
	result.LocalTimeStamp = new Date(prop.getlastmodified).getTime();
	result.Directory = (prop.resourcetype !== null && prop.resourcetype.indexOf("collection") !== -1);
	if (result.Directory) {
		result.ChildrenLocation = result.Location;
	}
	return result;
}

function _call(method, url, headers, body) {
	var d = new orion.Deferred(); // create a promise
	var xhr = new XMLHttpRequest();
	var header;
	try {
		xhr.open(method, url);
		if (headers !== null) {
			for (header in headers) {
				if (headers.hasOwnProperty(header)) {
					xhr.setRequestHeader(header, headers[header]);
				}
			}
		}
		xhr.send(body);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				d.resolve({
					status: xhr.status,
					statusText: xhr.statusText,
					headers: xhr.getAllResponseHeaders(),
					responseText: xhr.responseText
				});
			}
		};
	} catch (e) {
		d.reject(e);
	}
	return d; // return the promise immediately
}

/** @namespace The global container for eclipse APIs. */
var eclipse = eclipse || {};

/**
 * An implementation of the file service that understands the Orion 
 * server file API. This implementation is suitable for invocation by a remote plugin.
 */
eclipse.DAVFileServiceImpl= (function() {
	/**
	 * @class Provides operations on files, folders, and projects.
	 * @name FileServiceImpl
	 */
	function DAVFileServiceImpl(location) {
		this._rootLocation = location;		
	}
	
	DAVFileServiceImpl.prototype = /**@lends eclipse.DAVFileServiceImpl.prototype */
	{
		_createParents: function(location) {
			var result = [];
			if (location.indexOf(this._rootLocation) === -1 || this._rootLocation === location) {
				return null;
			}
		
			var tail = location.substring(this._rootLocation.length);
			if (tail[tail.length - 1] === "/") {
				tail = tail.substring(0, tail.length - 1);
			}
			var segments = tail.split("/");
			segments.pop(); // pop off the current name
			
			var prefix = this._rootLocation;
			for (var i = 0; i < segments.length; ++i) {
				var parentName = segments[i];
				var parentPath = prefix + parentName + "/";
				prefix = parentPath;
				result.push({
					Name: parentName,
					Location: parentPath,
					ChildrenLocation: parentPath
				});
			}
			return result.reverse();
		},
		/**
		 * Obtains the children of a remote resource
		 * @param location The location of the item to obtain children for
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(location) {
			if (!location) {
				location = this._rootLocation;
			}
			return _call("PROPFIND", location, {depth:1}).then(function(response) {
				if (response.status !== 207) {
					throw "Error " + response.status;
				}
				
				var multistatus = parseDAV_multistatus(response.responseText);
				var childrenResponses = multistatus.response.slice(1);
				
				var children = [];
				while (childrenResponses.length !== 0) {
					children.push(createFile(childrenResponses.shift()));
				}
				return children;
			});
		},


		/**
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return this.loadWorkspace(this._rootLocation);
		},
		
		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} location the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(location) {
			if (!location) {
				location = this._rootLocation;
			}
			var that = this; 
			return _call("PROPFIND", location, {depth:1}).then(function(response) {
				if (response.status !== 207) {
					throw "Error " + response.status;
				}
				
				var multistatus = parseDAV_multistatus(response.responseText);
				var locationResponse = multistatus.response[0];
				var childrenResponses = multistatus.response.slice(1);
				
				var result = createFile(locationResponse);
				if (location === that.rootLocation) {
					result.Name = that.rootName;
					result.Id = that.rootLocation;
				}
				
				result.Children = [];
				while (childrenResponses.length !== 0) {
					result.Children.push(createFile(childrenResponses.shift()));
				}
				var parents = that._createParents(location);
				if (parents !== null) {
					result.Parents = parents;
				}
				return result;
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
			return this.createFolder(url, projectName);
		},
		/**
		 * Creates a folder.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} folderName The name of the folder to create
		 * @return {Object} JSON representation of the created folder
		 */
		createFolder: function(parentLocation, folderName) {
			return _call("MKCOL", parentLocation + encodeURIComponent(folderName) + "/");
		},
		/**
		 * Create a new file in a specified location. Returns a deferred that will provide
		 * The new file object when ready.
		 * @param {String} parentLocation The location of the parent folder
		 * @param {String} fileName The name of the file to create
		 * @return {Object} A deferred that will provide the new file object
		 */
		createFile: function(parentLocation, fileName) {
			return _call("PUT", parentLocation + encodeURIComponent(fileName));
		},
		/**
		 * Deletes a file, directory, or project.
		 * @param {String} location The location of the file or directory to delete.
		 */
		deleteFile: function(location) {
			return _call("DELETE", location);
		},
		
		/**
		 * Moves a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to move.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		moveFile: function(sourceLocation, targetLocation, name) {
			if (sourceLocation.indexOf(this._rootLocation) === -1 || targetLocation.indexOf(this._rootLocation) === -1) {
				throw "Not supported";	
			}
			
			var isDirectory = sourceLocation[sourceLocation.length -1] === "/";
			var target = targetLocation;
			
			if (target[target.length -1] !== "/") {
				target += "/";
			}
			
			if (name) {
				target += encodeURIComponent(name);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1);
			}
			
			if (isDirectory && target[target.length -1] !== "/") {
				target += "/";
			}
			return _call("MOVE", sourceLocation, {Destination: target});
		},
		 
		/**
		 * Copies a file or directory.
		 * @param {String} sourceLocation The location of the file or directory to copy.
		 * @param {String} targetLocation The location of the target folder.
		 * @param {String} [name] The name of the destination file or directory in the case of a rename
		 */
		copyFile: function(sourceLocation, targetLocation, name) {
			if (sourceLocation.indexOf(this._rootLocation) === -1 || targetLocation.indexOf(this._rootLocation) === -1) {
				throw "Not supported";	
			}
			
			var isDirectory = sourceLocation[sourceLocation.length -1] === "/";
			var target = targetLocation;
			
			if (target[target.length -1] !== "/") {
				target += "/";
			}
			
			if (name) {
				target += encodeURIComponent(name);
			} else {
				var temp = sourceLocation;
				if (isDirectory) {
					temp = temp.substring(0, temp.length - 1);
				}
				target += temp.substring(temp.lastIndexOf("/")+1);
			}
			
			if (isDirectory && target[target.length -1] !== "/") {
				target += "/";
			}
			return _call("COPY", sourceLocation, {Destination: target});
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
			if (isMetadata) {
				return _call("PROPFIND", location, {depth:0}).then(function(response) {
					if (response.status !== 207) {
						throw "Error " + response.status;
					}
					
					var multistatus = parseDAV_multistatus(response.responseText);
					var locationResponse = multistatus.response[0];
					var result = createFile(locationResponse);
					var parents = that._createParents(location);
					if (parents !== null) {
						result.Parents = parents;
					}
					return result;
				});
			}
			return _call("GET", location).then(function(response) {
				return response.responseText;
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
			var headerData = {};
			if (args && args.ETag) {
				headerData["If-Match"] = args.ETag;
			}
			return _call("PUT", location, headerData, contents);
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
		}
		
	};

	function _call2(method, url, headers, body) {
		var d = new orion.Deferred(); // create a promise
		var xhr = new XMLHttpRequest();
		try {
			xhr.open(method, url);
			if (headers) {
				Object.keys(headers).forEach(function(header){
					xhr.setRequestHeader(header, headers[header]);
				});
			}
			xhr.responseType = "arraybuffer";
			xhr.send(body);
			xhr.onload = function() {
				d.resolve({
					status: xhr.status,
					statusText: xhr.statusText,
					headers: xhr.getAllResponseHeaders(),
					response: xhr.response //builder.getBlob()
				});
			};
		} catch (e) {
			d.reject(e);
		}
		return d; // return the promise immediately
	}

	if (window.Blob) {
		DAVFileServiceImpl.prototype.readBlob = function(location) {
			return _call2("GET", location).then(function(result) {
				return result.response;
			});
		};

		DAVFileServiceImpl.prototype.writeBlob = function(location, contents, args) {
			var headerData = {};
			if (args && args.ETag) {
				headerData["If-Match"] = args.ETag;
			}
			return _call2("PUT", location, headerData, contents);
		};
	}
	return DAVFileServiceImpl;
}());
