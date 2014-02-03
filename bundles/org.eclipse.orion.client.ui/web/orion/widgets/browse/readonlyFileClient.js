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
	 * @name orion.serviceregistry.DeferredService
	 * @description Creates a new service promise to resolve the service at a later time.
	 * @class A service that is resolved later
	 * @private
	 * @param {orion.serviceregistry.ServiceReference} implementation The implementation of the service
	 * @param {Function} isRegistered A function to call to know if the service is already registered
	 */
	function DeferredService(implementation) {
		function _createServiceCall(methodName) {
			return function() {
					var d;
					try {
						var result = implementation[methodName].apply(implementation, Array.prototype.slice.call(arguments));
						if (result && typeof result.then === "function") {
							return result;
						} else {
							d = new Deferred();
							d.resolve(result);
						}
					} catch (e) {
							d = new Deferred();
							d.reject(e);
					}
					return d.promise;
			};
		}

		var method;
		for (method in implementation) {
			if (typeof implementation[method] === 'function') {
				this[method] = _createServiceCall(method);
			}
		}
	}
	
	/**
	 * @name orion.serviceregistry.ServiceReference
	 * @description Creates a new service reference.
	 * @class A reference to a service in the Orion service registry
	 * @param {String} serviceId The symbolic id of this service instance
	 * @param {String} name The service name
	 * @param {Object} properties A JSON object containing the service's declarative properties
	 */
	function ServiceReference(serviceId, objectClass, properties, service) {
		this._properties = properties || {};
		this._properties["service.id"] = serviceId;
		this._properties.objectClass = objectClass;
		this._properties["service.names"] = objectClass;
		this.service = service;
	}

	ServiceReference.prototype = /** @lends orion.serviceregistry.ServiceReference.prototype */
	{
		/**
		 * @name getPropertyKeys
		 * @description Returns the names of the declarative properties of this service.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceReference.prototype
		 * @returns the names of the declarative properties of this service
		 */
		getPropertyKeys: function() {
			var result = [];
			var name;
			for (name in this._properties) {
				if (this._properties.hasOwnProperty(name)) {
					result.push(name);
				}
			}
			return result;
		},
		/**
		 * @name getProperty
		 * @description Returns the declarative service property with the given name, or <code>undefined</code>
		 * if this service does not have such a property.
		 * @function
		 * @public
		 * @memberof orion.serviceregistry.ServiceReference.prototype
		 * @param {String} propertyName The name of the service property to return
		 * @returns The {String} property with the given name or <code>undefined</code>
		 */
		getProperty: function(propertyName) {
			return this._properties[propertyName];
		}
	};
	ServiceReference.prototype.constructor = ServiceReference;

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
	
	/**
	 * Creates a new file client.
	 * @class The file client provides a convenience API for interacting with file services
	 * provided by plugins. This class handles authorization, and authentication-related
	 * error handling.
	 * @name orion.fileClient.FileClient
	 */
	function FileClient(/*serviceRegistry, */serviceRefs, filter) {
		var allReferences = [];
		serviceRefs.forEach(function(serviceRef){
			var serviceImpl = new DeferredService(serviceRef.impl);
			allReferences.push(
				new ServiceReference(serviceRef.id, "readonly.file.service", serviceRef.serviceProperties, serviceImpl)
			);
		});
		
		//var allReferences = serviceRegistry.getServiceReferences("orion.core.file"); //$NON-NLS-0$
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
			//_services[j] = serviceRegistry.getService(_references[j]);
			_services[j] = _references[j].service;
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
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return _doServiceCall(this._getService(), "loadWorkspaces", arguments); //$NON-NLS-0$
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
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} location the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(location) {
			return _doServiceCall(this._getService(location), "loadWorkspace", arguments); //$NON-NLS-0$
		}
	};//end FileClient prototype
	FileClient.prototype.constructor = FileClient;

	//return the module exports
	return {FileClient: FileClient};
});
