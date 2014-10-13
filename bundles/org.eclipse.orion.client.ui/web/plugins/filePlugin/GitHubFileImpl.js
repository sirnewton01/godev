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
define(["orion/Deferred", "orion/xhr", "orion/Base64", "orion/encoding-shim", "orion/URL-shim"], function(Deferred, xhr, Base64) {
	
	//This flag controls how we inject the commit information as additional properties of meta data and fetchChildren function.
	//0: no commit information injected to either meta data or the return list of fetchChildren function
	//1: only inject commit information to a bracn's meta data
	//2: inject commit information to all level of meta data 
	//3: inject commit information to both meta data and each item of the return list of fetchChildren function
	var commit_info_level = 1;
	var use_gravatar_id = true;
	function GitHubFileImpl(repoURL, token) {
		this._originalRepoURL = repoURL;//Used for reference in error message to indicate a repo URL
		var found = repoURL.match(/https\:\/\/github\.com(?:\:443)?\/([^/]+)\/([^/]+).git$/);
		if (!found) {
			throw "Bad Github repository url " + repoURL;
		}
		this._repoURL = new URL("https://api.github.com/repos/" + found[1] + "/" + found[2]);
		this._commitURLBase = "https://github.com/" + found[1] + "/" + found[2] + "/commit/";
		this._contentsPath = this._repoURL.pathname + "/contents";
		this._headers = {
			"Accept": "application/vnd.github.v3+json"
		};
		if (token) {
			this._headers.Authorization = "token " + token;
			commit_info_level = 3;
		} else {
			commit_info_level = 2;
		}
	}

	GitHubFileImpl.prototype = {
		_getBranchName: function(location) {
			var url = new URL(location);
			var path = url.pathname;
			if (path.indexOf(this._contentsPath) === 0) {
				var suffix = path.substring(this._contentsPath.length);
				var matches = suffix.match(/\!([^\/]+)(.*)/);
				if (matches && matches[1]) {
					return matches[1];
				}
			}
			return "master";
		},
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
		_handleError: function(error, isRoot) {
			//var errorMessageHeader = "GitHub Error: ";
			var errorMessage = "Unknown";
			var severity = "Warning";
			if(error.name === "Cancel") {
				return new Deferred().reject(error);
			} else if(error.status && error.status === 404) {//There are two types of displayed error if 404 comes from GitHub
				if(isRoot) { //If the request was sent from the repo's root level, then it is a private repository. https://developer.github.com/v3/#authentication
					errorMessage = "This is a private GitHub project. Authorized users can view the source on the [GitHub repository page](" + this._originalRepoURL + ").";
				} else { //Otherwise it is a bad URL
					errorMessage = "Bad URL(" + (error.url ? error.url : "") + ").";
				}
			} else if(error.status && error.status === 403) {//403 means rate limit exceeded.
				//errorMessage = "Unable to display repository contents at this time. Wait a while and then refresh the browser to try again.";
				errorMessage = "GitHub is currently limiting our ability to display repository contents. Wait a while and then refresh the browser to try again or go to the [GitHub repository page](" + this._originalRepoURL + ").";
			} else {//For errors other than 404 and 403, we just use the "message" and "documentation_url" properties for a detailed message
				errorMessage = "Unable to display repository contents at this time. Refresh the browser to try again.";
				/*
				errorMessageHeader = errorMessageHeader + (error.status ? "Error code " + error.status + ". " : "");
				var responseText = error.responseText;
				try {
					var parsedError = JSON.parse(responseText);
					errorMessage = (parsedError.message || "Unknown") + ". ";
					if(parsedError.documentation_url) {
						errorMessage = errorMessage + "Refer to " + parsedError.documentation_url + " for details.";
					}
				} catch (e) {
					errorMessage = "Unknown";
				}
				*/
			}
			var errorObj = {Severity: severity, Message: errorMessage};
			error.responseText = JSON.stringify(errorObj);
			return new Deferred().reject(error);
		},
		_getBranches: function() {
			var _this = this;
			return xhr("GET", this._repoURL.href + "/branches?per_page=1000", {//https://developer.github.com/v3/#pagination
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
						ChildrenLocation: location,
						Sha: (branch.commit ? branch.commit.sha : null)
					};
				});
			}, function(error) { return _this._handleError(error, true);});
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
						Directory: false,
						Sha: entry.sha,
						CommitPath: entry.path
					};
					if (entry.type === "dir") {
						result.Directory = true;
						result.ChildrenLocation = entryLocation;
					}
					return result;
				});
			}, function(error) { return _this._handleError(error);});
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
				var parentName = segments[i];
				var parentDisplayName = decodeURIComponent(segments[i]);
				url.pathname += "/" + parentName;
				result.push({
					Name: parentDisplayName,
					Location: url.href,
					ChildrenLocation: url.href
				});
			}
			return result.reverse();
		},
		_readGitBlob: function(metaData, errorForwarded) {
			var _this = this;
			//We only try the /git/blobs/ API if the file does not have size or size is greater than 1M.
			if(metaData && metaData.Sha && !metaData.Directory && (!metaData.Length || (typeof metaData.Length === "number" && metaData.Length >= (1024*1024)))){
				return xhr("GET", _this._repoURL.href + "/git/blobs/" + metaData.Sha, {
					headers: this._headers,
					timeout: 15000
				}).then(function(result) {
					var content = JSON.parse(result.response);
					return content;
				}, function(error) { return _this._handleError(error);});
			} else if(errorForwarded){
				return _this._handleError(errorForwarded);
			} else {
				return metaData;
			}
		},
		_retryBlob: function(originalLocation, errorForwarded) {
			var _this = this;
			return this.read(originalLocation, true).then(function(metaData) {//Get the sha by getting meta data
				return _this._readGitBlob(metaData, errorForwarded).then(function(content){
					if (content.content && content.size) {
						return Base64.decode(content.content);
					} else {
						_this._handleError(errorForwarded);
					}
				});
			});
		},
		_getSHAObject: function(location) {
			var _this = this;
			var parents = this._getParents(location);
			if (parents) {
				if(parents.length === 0) {
					return _this._getBranches().then(function(branches) {
						var result;
						branches.some(function(entry) {
							if (entry.Location === location) {
								result = entry;
								return true;
							}
						});
						return result;
					});
				}
				return _this.read(location, true).then(function(metaData){
					return metaData;
				});
			}
			return new Deferred().resolve();
		},

		/**
		 * Inject commit information to an item. The item can be either meta data or an item form the return list of fetchChildren.
		 *	
		 *  CommitInfo {
		 *	   Author: {Name: "string", Email: "email@addre.ss", Date: milliseconds(integer) },
		 *	   Committer: {Name: "string", Email: "email@addre.ss", Date: milliseconds(integer) },
		 *	   Message: "string",
		 * 	   URL: "string"
		 *	}
		 */
		_injectCommitInfo: function(child, branchNameOrSha, asSha) {
			var _this = this;
			var shaValue = asSha ? branchNameOrSha : branchNameOrSha + "&path=" + child.CommitPath;
			return xhr("GET", _this._repoURL.href + "/commits?sha=" + shaValue + "&per_page=1", {//https://developer.github.com/v3/#pagination
				headers: this._headers,
				timeout: 15000
			}).then(function(result) {
				var content = JSON.parse(result.response);
				if(content.length > 0 && content[0].commit && content[0].commit.author && content[0].commit.author.date) {
					child.LocalTimeStamp = content[0].commit.author.date;
					child.LastCommit = {};
					child.LastCommit.Author = {};
					child.LastCommit.Author.Date = content[0].commit.author.date;
					child.LastCommit.Author.Name = content[0].commit.author.name ? content[0].commit.author.name : "";
					child.LastCommit.Author.Email = content[0].commit.author.email ? content[0].commit.author.email : "";
					if(content[0].commit.committer) {
						child.LastCommit.Committer = {};
						child.LastCommit.Committer.Date = content[0].commit.committer.date ? content[0].commit.committer.date : "";
						child.LastCommit.Committer.Name = content[0].commit.committer.name ? content[0].commit.committer.name : "";
						child.LastCommit.Committer.Email = content[0].commit.committer.email ? content[0].commit.committer.email : "";
					}
					child.LastCommit.Message = content[0].commit.message ? content[0].commit.message : "";
					child.LastCommit.URL = content[0].sha ? _this._commitURLBase + content[0].sha : null;
					if(use_gravatar_id && content[0].author && content[0].author.gravatar_id) {
						child.LastCommit.AvatarURL = "https://www.gravatar.com/avatar/" + content[0].author.gravatar_id + "?d=mm";
					} else 	if(content[0].author && content[0].author.avatar_url) {
						child.LastCommit.AvatarURL = content[0].author.avatar_url;
					}
				}
				return child;
			}, function(error) { return _this._handleError(error);});
		},
		_refineFetchedChildren: function(location, children) {
			var _this = this;
			var filesWithoutSize = [], commitPromises = [];
			if(commit_info_level > 2) {
				var branchName = this._getBranchName(location);
				children.forEach(function(child) {
					commitPromises.push(_this._injectCommitInfo(child, branchName));
					if(!child.Directory && !child.Length) {
						filesWithoutSize.push(child);
					}
				});
			} 
			return Deferred.all(commitPromises).then(function(){
				if(filesWithoutSize.length > 0) {// We only want to use /git/trees/ API if there is any file that does not have size info
					return _this._getSHAObject(location).then(function(shaObj) {//We have to get the SHA of the current root in order to call the /git/trees/ API
						if(shaObj && shaObj.Sha){
							return xhr("GET", _this._repoURL.href + "/git/trees/" + shaObj.Sha, {
								headers: this._headers,
								timeout: 15000
							}).then(function(result) {
								var content = JSON.parse(result.response);
								if(content && content.tree) {// All the children are here in content.tree
									filesWithoutSize.forEach(function(file) {
										content.tree.forEach(function(item) {
											if(item.sha === file.Sha) {
												file.Length = item.size;// Assign the size of a tree item responded from the /git/tree/ API.
											}
										});
									});
								}
								return children;
							}, function(error) { return _this._handleError(error);});
						}
						return children;
					});
				}
				return children;
			});
		},
		fetchChildren: function(location) {
			var _this = this;
			if (location === this._repoURL.href) {
				return this._getBranches();
			} else {
				return this._getChildren(location).then(function(children){
					return _this._refineFetchedChildren(location, children);//If there is any file returned without size, we have to fill up the size by /git/trees/ API
				});
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
			}, function(error) { return _this._handleError(error, true);});
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
				if (parents === null) {//Repo Root meata data
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
				} else if (parents.length === 0) {//Branch meta data
					return _this._getSHAObject(location).then(function(shaObj) {//We have to get the basic branch meta data first
						var brMeta = shaObj;
						brMeta.Parents = parents;
						if(shaObj && shaObj.Sha){
							if(commit_info_level > 0) {
								return _this._injectCommitInfo(shaObj, shaObj.Sha, true).then(function(){
									return brMeta;
								});
							}
						}
						return brMeta;
					});
				}
				//Meta data for any item under a branch
				return this._getChildren(parents[0].Location).then(function(children) {
					var result;
					children.some(function(entry) {
						if (entry.Location === location) {
							result = entry;
							result.Parents = _this._getParents(location);
							return true;
						}
					});
					if(result) {
						if(commit_info_level > 1) {
							return _this._injectCommitInfo(result, _this._getBranchName(result.Location)).then(function(){
								return result;
							});
						}
						return result;
					} else {
						return _this._handleError({status: 404, url: location});//We have to fake a non-root 404 error here, because children.some may not match an invalid URL
					}
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
		readBlob: function(originalLocation) {
			var _this = this;
			var location = this._refPathToQuery(originalLocation);
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
				}, function(error) { return _this._handleError(error);});
			}, function(error) {//In case of error of read blob, we have to retry it by /git/blobs/ API because the error might have been caused by a 1M+ file. 
				return _this._retryBlob(originalLocation, error);
			});
		},
		writeBlob: function(location, contents, args) {
			throw "Not supported";
		}
	};
	GitHubFileImpl.prototype.constructor = GitHubFileImpl;

	return GitHubFileImpl;
});