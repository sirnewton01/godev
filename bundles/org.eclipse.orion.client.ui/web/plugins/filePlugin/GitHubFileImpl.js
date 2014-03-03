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

/*global define URL TextDecoder*/

define(["orion/Deferred", "orion/xhr", "orion/Base64", "orion/encoding-shim", "orion/URL-shim"], function(Deferred, xhr, Base64) {

	function GitHubFileImpl(repoURL, token) {
		var found = repoURL.match(/https\:\/\/github\.com(?:\:443)?\/([^/]+)\/([^/]+).git$/);
		if (!found) {
			throw "Bad Github repository url " + repoURL;
		}
		this._repoURL = new URL("https://api.github.com/repos/" + found[1] + "/" + found[2]);
		this._contentsPath = this._repoURL.pathname + "/contents";
		this._headers = {
			"Accept": "application/vnd.github.v3+json"
		};
		if (token) {
			this._headers.Authorization = "token " + token;
		}
	}

	GitHubFileImpl.prototype = {
		_refPathToQuery: function(location) {
			var url = new URL(location);
			var path = url.pathname;
			if (path.indexOf(this._contentsPath) === 0) {
				var suffix = path.substring(this._contentsPath.length);
				var matches = suffix.match(/\!([^\/]+)(.*)/);
				if (matches) {
					url.query.set("ref", decodeURIComponent(matches[1]));
					url.pathname = this._contentsPath + matches[2];
					location = url.href;
				}
			}
			return location;
		},
		_refQueryToPath: function(location) {
			var url = new URL(location);
			var path = url.pathname;
			var ref = url.query.get("ref") || "master";
			if (ref && path.indexOf(this._contentsPath) === 0) {
				var suffix = path.substring(this._contentsPath.length);
				url.query.delete("ref");
				url.pathname = this._contentsPath + "!" + encodeURIComponent(ref) + suffix;
				location = url.href;
			}
			return location;
		},
		_getBranches: function() {
			var _this = this;
			return xhr("GET", this._repoURL.href + "/branches", {
				headers: this._headers,
				timeout: 15000
			}).then(function(result) {
				var branches = JSON.parse(result.response);
				return branches.map(function(branch) {
					var location = _this._repoURL.href + "/contents!" + encodeURIComponent(branch.name);
					return {
						Attributes: {
							Archive: false,
							Hidden: false,
							ReadOnly: true,
							SymLink: false
						},
						Location: location,
						Name: branch.name,
						Length: 0,
						LocalTimeStamp: 0,
						Directory: true,
						ChildrenLocation: location
					};
				});
			});
		},
		_getChildren: function(location) {
			location = this._refPathToQuery(location);
			var _this = this;
			return xhr("GET", location, {
				headers: this._headers,
				timeout: 15000
			}).then(function(result) {
				var directory = JSON.parse(result.response);
				return directory.map(function(entry) {
					var entryLocation = _this._refQueryToPath(entry.url);
					var result = {
						Attributes: {
							Archive: false,
							Hidden: false,
							ReadOnly: true,
							SymLink: false
						},
						Location: entryLocation,
						Name: entry.name,
						Length: entry.size,
						LocalTimeStamp: 0,
						Directory: false
					};
					if (entry.type === "dir") {
						result.Directory = true;
						result.ChildrenLocation = entryLocation;
					}
					return result;
				});
			});
		},
		_getParents: function(location) {
			if (location === this._repoURL.href) {
				return null;
			}
			var url = new URL(location);
			var path = url.pathname;
			var result = [];
			var tail = path.substring(this._contentsPath.length);
			var segments = tail.split("/");
			segments.pop(); // pop off the current name
			if (segments.length === 0) {
				return result;
			}
			var bangref = segments.shift();
			url.pathname = this._contentsPath + bangref;
			result.push({
				Name: decodeURIComponent(bangref.substring(1)),
				Location: url.href,
				ChildrenLocation: url.href
			});
			for (var i = 0; i < segments.length; ++i) {
				var parentName = decodeURIComponent(segments[i]);
				url.pathname += "/" + parentName;
				result.push({
					Name: parentName,
					Location: url.href,
					ChildrenLocation: url.href
				});
			}
			return result.reverse();
		},
		fetchChildren: function(location) {
			if (location === this._repoURL.href) {
				return this._getBranches();
			} else {
				return this._getChildren(location);
			}
		},
		loadWorkspaces: function() {
			return this.loadWorkspace(this._repoURL);
		},
		loadWorkspace: function(location) {
			var _this = this;
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
				if (location === _this._repoURL.href) {
					result.Name = "repo_root";
				} else {
					var url = new URL(location);
					var path = url.pathname.substring(_this.contentsPath.length + 1);
					result.Name = decodeURIComponent(path.split("/").pop());
					result.Parents = _this._getParents(location);
				}
				return result;
			});
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
				var _this = this;
				var parents = this._getParents(location);
				if (parents === null || parents.length === 0) {
					return {
						Attributes: {
							Archive: false,
							Hidden: false,
							ReadOnly: true,
							SymLink: false
						},
						Name: parents === null ? "" : decodeURIComponent(new URL(location).pathname.substring(this._contentsPath.length + 1)),
						Location: location,
						Length: 0,
						LocalTimeStamp: 0,
						Parents: parents,
						Directory: true,
						ChildrenLocation: location
					};
				}
				return this._getChildren(parents[0].Location).then(function(children) {
					var result;
					children.some(function(entry) {
						if (entry.Location === location) {
							result = entry;
							result.Parents = _this._getParents(location);
							return true;
						}
					});
					return result;
				});
			}
			return this.readBlob(location).then(function(bytes) {
				var decoder = new TextDecoder();
				return decoder.decode(bytes);
			});
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
			location = this._refPathToQuery(location);
			return xhr("GET", location, {
				headers: this._headers,
				timeout: 15000
			}).then(function(result) {
				var content = JSON.parse(result.response);
				if (content.content && content.size) {
					return Base64.decode(content.content);
				}
				return xhr("GET", content.git_url, {
					headers: this._headers,
					timeout: 15000
				}).then(function(result) {
					var content = JSON.parse(result.response);
					return Base64.decode(content.content);
				});
			});
		},
		writeBlob: function(location, contents, args) {
			throw "Not supported";
		}
	};
	GitHubFileImpl.prototype.constructor = GitHubFileImpl;

	return GitHubFileImpl;
});