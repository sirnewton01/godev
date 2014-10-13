/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["orion/xhr", "orion/URITemplate", "orion/Deferred", "orion/URL-shim"], function(xhr, URITemplate, Deferred) {

	var pathRegex = /.*\/(?:contents|list)\/([^\/]*)(?:\/([^\/]*)(?:\/(.*))?)?/;

	function GerritFileImpl(pluginURL, project) {
		this._listTemplate = new URITemplate(pluginURL + "/list" + "{/project,ref,path:0}{+path}");
		this._contentTemplate = new URITemplate(pluginURL + "/contents" + "{/project,ref,path:0}{+path}");
		this._repoURL = this._listTemplate.expand({project: project});
	}

	GerritFileImpl.prototype = {
		_handleError: function(error) {
			var errorMessage = "Unable to display repository contents at this time. Please try again later.";
			var severity = "Warning";
			var errorObj = {Severity: severity, Message: errorMessage};
			error.responseText = JSON.stringify(errorObj);
			return new Deferred().reject(error);
		},
		_getParents: function(location) {
			var url = new URL(location);
			var pathmatch = url.pathname.match(pathRegex);
			var project = pathmatch[1] ? decodeURIComponent(pathmatch[1]) : pathmatch[1];
			var ref = pathmatch[2] ? decodeURIComponent(pathmatch[2]) : pathmatch[2];
			var path = pathmatch[3] ? decodeURIComponent(pathmatch[3]) : pathmatch[3];
			if (!ref){
				return null;
			}

			var result = [];
			if (!path) {
				return result;
			}
			var segments = path.split("/");
			segments.pop(); // pop off the current name
			var parentLocation = this._listTemplate.expand({project: project, ref: ref});
			result.push({
				Name: ref.split("/").pop(),
				Location: parentLocation,
				ChildrenLocation: parentLocation
			});

			var parentPath = "";
			for (var i = 0; i < segments.length; ++i) {
				var parentName = segments[i];
				parentPath += parentName;
				parentLocation = this._listTemplate.expand({project: project, ref: ref, path: parentPath});
				result.push({
					Name: parentName,
					Location: parentLocation,
					ChildrenLocation: parentLocation
				});
				parentPath += "/";
			}
			return result.reverse();
		},
		fetchChildren: function(location) {
			var _this = this;
			return xhr("GET", location, {
				headers: this._headers,
				timeout: 15000
			}).then(function(result) {
				var directory = JSON.parse(result.response);
				return directory.map(function(entry) {
					var template = entry.type === "file" ? _this._contentTemplate : _this._listTemplate;
					var name = entry.name.split("/").pop();
					if(entry.path === "") {
						entry.path = null;
					}
					var location = template.expand(entry);
					var result = {
						Attributes: {
							Archive: false,
							Hidden: false,
							ReadOnly: true,
							SymLink: false
						},
						Location: location,
						Name: name,
						Length: (typeof entry.size === "string" ? parseInt(entry.size, 10) : entry.size) ,
						LocalTimeStamp: (entry.LastCommit && entry.LastCommit.Author &&  entry.LastCommit.Author.Date ?  entry.LastCommit.Author.Date : 0),
						Directory: false,
						LastCommit: entry.LastCommit
					};
					if (entry.type !== "file") {
						result.Directory = true;
						result.ChildrenLocation = location;
					}
					return result;
				});
			}, function(error) { return _this._handleError(error);});
		},
		loadWorkspaces: function() {
			return this.loadWorkspace(this._repoURL);
		},
		loadWorkspace: function(location) {
			var _this = this;
			var url = new URL(location);
			var pathmatch = url.pathname.match(pathRegex);
			var ref = pathmatch[2] ? decodeURIComponent(pathmatch[2]) : pathmatch[2];
			var path = pathmatch[3] ? decodeURIComponent(pathmatch[3]) : pathmatch[3];

			return this.fetchChildren(location).then(function(children) {
				var result = {
					Attributes: {
						Archive: false,
						Hidden: false,
						ReadOnly: true,
						SymLink: false
					},
					Location: location,
					Name: null,
					Length: 0,
					LocalTimeStamp: 0,
					Directory: true,
					ChildrenLocation: location,
					Children: children
				};
				if (!ref) {
					result.Name = "repo_root";
					result.Location = location;
					result.ChildrenLocation = location;
				} else {
					if (!path) {
						result.Name = ref;
						result.Parents = [];
					} else {
						result.Name = path.split("/").pop();
						result.Parents = _this._getParents(location);
					}
				}
				return result;
			})
		},
		createProject: function(url, projectName, serverPath, create) {
			throw "Not supported";
		},
		createFolder: function(parentLocation, folderName) {
			throw "Not supported";
		},
		createFile: function(parentLocation, fileName) {
			throw "Not supported";
		},
		deleteFile: function(location) {
			throw "Not supported";
		},
		moveFile: function(sourceLocation, targetLocation, name) {
			throw "Not supported";
		},
		copyFile: function(sourceLocation, targetLocation, name) {
			throw "Not supported";
		},
		read: function(location, isMetadata) {
			if (isMetadata) {
				//var _this = this;
				var url = new URL(location);
				var pathmatch = url.pathname.match(pathRegex);
				var ref = pathmatch[2] ? decodeURIComponent(pathmatch[2]) : pathmatch[2];
				//var path = pathmatch[3] ? decodeURIComponent(pathmatch[3]) : pathmatch[3];
				var parents = this._getParents(location);
				if (!parents) {
					return {
						Attributes: {
							Archive: false,
							Hidden: false,
							ReadOnly: true,
							SymLink: false
						},
						Name: ref || "",
						Location: location,
						Length: 0,
						LocalTimeStamp: 0,
						Parents: parents,
						Directory: true,
						ChildrenLocation: location
					};
				}
				var parentLocation;
				if(parents.length === 0) {
					parentLocation = this._repoURL;
				} else {
					parentLocation = parents[0].Location;
				}
				return this.fetchChildren(parentLocation).then(function(children) {
					var result;
					children.some(function(entry) {
						if (entry.Location === location) {
							result = entry;
							result.Parents = parents;
							return true;
						}
					});
					return result;
				});
			}
			var _this = this;
			return xhr("GET", location, {
				timeout: 15000
			}).then(function(result) {
				return result.responseText;
			}, function(error) { return _this._handleError(error);});
		},
		write: function(location, contents, args) {
			throw "Not supported";
		},
		remoteImport: function(targetLocation, options) {
			throw "Not supported";
		},
		remoteExport: function(sourceLocation, options) {
			throw "Not supported";
		},
		readBlob: function(location) {
			var _this = this;
			return xhr("GET", location, {
				responseType: "arraybuffer",
				timeout: 15000
			}).then(function(result) {
				return result.response;
			}, function(error) { return _this._handleError(error);});
		},
		writeBlob: function(location, contents, args) {
			throw "Not supported";
		}
	};
	GerritFileImpl.prototype.constructor = GerritFileImpl;

	return GerritFileImpl;
});