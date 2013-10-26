/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document window*/
/*jslint regexp:false*/
define(['require', 'orion/xhr', 'orion/regex'], function(require, xhr, regex) {
	
	var temp = document.createElement('a');
	
	function qualifyURL(url) {
		var link = document.createElement("a");
		link.href = url;
		return link.href;
	}
	function getContext() {
		var root = require.toUrl("._");
		var url = qualifyURL(root);
		return url.substring(0, url.length-2);
	}
	function makeHostRelative(url) {
		if (url.indexOf(":") !== -1) {
			return url.substring(url.indexOf(window.location.host) + window.location.host.length);
		}
		return url;
	}
	function makeURL(site, path, file) {
		return site.HostingStatus.URL + (path[0] !== "/" ? "/" : "") + path + (file.Directory ? "/" : "");
	}
	function isInternalPath(path) {
		return new RegExp("^/").test(path);
	}
	
	function makeAbsolute(location) {
		temp.href = location;
		return temp.href;
	}
	
	function _normalizeLocations(data) {
		if (data && typeof data === "object") {
			Object.keys(data).forEach(function(key) {
				var value = data[key];
				if (key.indexOf("Location") !== -1) {
					data[key] = makeAbsolute(value);
				} else {
					_normalizeLocations(value);
				}
			});
		}
		return data;
	}
	
	/**
	 * @returns {String} A display string constructed by replacing the first segment (project id)
	 * of internalPath with the project's Name.
	 */
	function getDisplayString(internalPath, projects) {
		var displayString;
		var segments = internalPath.split('/');
		var firstSegment = segments[1];
		for (var i=0; i < projects.length; i++) {
			var project = projects[i];
			if (project.Id === firstSegment) {
				segments[1] = project.Name;
				displayString = segments.join('/');
				break;
			}
		}
		return displayString;
	}
	/**
	 * Invoke the xhr API passing JSON data and returning the response as JSON.
	 * @returns {Deferred} A deferred that resolves to a JS object, or null if the server returned
	 * an empty response.
	 */
	function xhrJson(method, url, options) {
		if (options && typeof options.data !== 'undefined') {
			options.data = JSON.stringify(options.data);
		}
		return xhr.apply(null, Array.prototype.slice.call(arguments)).then(function(result) {
			return JSON.parse(result.response || null);
		});
	}
	function Cache(workspaceBase) {
		this.projects = {};
		this.getProjects = function(workspaceId) {
			// TODO would be better to invoke the FileService here but we are inside a plugin so we can't.
			var headers = { "Orion-Version": "1" };
			if (!this.projects[workspaceId]) {
				this.projects[workspaceId] = xhrJson('GET', workspaceBase,
					{	headers: headers
					}).then(function(data) {
						var workspaces = data.Workspaces;
						var workspace;
						for (var i=0; i < workspaces.length; i++) {
							workspace = workspaces[i];
							if (workspace.Id === workspaceId) {
								break;
							}
						}
						return xhrJson('GET', workspace.Location, {
							headers: headers
						}).then(function(workspaceData) {
							return workspaceData.Children || [];
						});
					});
			}
			return this.projects[workspaceId];
		};
	}
	/*
	 * TYPE_FILE: TargetSuffix represents a workspace path
	 * TYPE_API: TargetSuffix represents a URL on this server
	 */
	var TYPE_FILE = 0, TYPE_API = 1;
	var SELF_HOSTING_TEMPLATE = [
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.ui/web/index.html" },
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.ui/web" },
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.core/web" },
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.editor/web" },
			{ type: TYPE_API, source: "/file", targetSuffix: "file" },
			{ type: TYPE_API, source: "/prefs", targetSuffix: "prefs" },
			{ type: TYPE_API, source: "/workspace", targetSuffix: "workspace" },
			{ type: TYPE_API, source: "/users", targetSuffix: "users" },
			{ type: TYPE_API, source: "/authenticationPlugin.html", targetSuffix: "authenticationPlugin.html" },
			{ type: TYPE_API, source: "/login", targetSuffix: "login" },
			{ type: TYPE_API, source: "/loginstatic", targetSuffix: "loginstatic" },
			{ type: TYPE_API, source: "/useremailconfirmation", targetSuffix: "useremailconfirmation" },
			{ type: TYPE_API, source: "/site", targetSuffix: "site" },
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.git/web" },
			{ type: TYPE_API, source: "/gitapi", targetSuffix: "gitapi" },
			{ type: TYPE_FILE, source: "/", targetSuffix: "/bundles/org.eclipse.orion.client.users/web" },
			{ type: TYPE_API, source: "/xfer", targetSuffix: "xfer" },
			{ type: TYPE_API, source: "/filesearch", targetSuffix: "filesearch" },
			{ type: TYPE_API, source: "/index.jsp", targetSuffix: "index.jsp" },
			{ type: TYPE_API, source: "/plugins/git", targetSuffix: "plugins/git" },
			{ type: TYPE_API, source: "/plugins/user", targetSuffix: "plugins/user" },
			{ type: TYPE_API, source: "/logout", targetSuffix: "logout" },
			{ type: TYPE_API, source: "/mixlogin/manageopenids", targetSuffix: "mixlogin/manageopenids" },
			{ type: TYPE_API, source: "/openids", targetSuffix: "openids" },
			{ type: TYPE_API, source: "/task", targetSuffix: "task" },
			{ type: TYPE_API, source: "/help", targetSuffix: "help" }
	];
	function generateSelfHostingMappings(basePath, port) {
		var hostPrefix = "http://localhost" + ":" + port + makeHostRelative(getContext());
		return SELF_HOSTING_TEMPLATE.map(function(item) {
			var target;
			if (item.type === TYPE_FILE) {
				target = basePath + item.targetSuffix;
			} else {
				target = hostPrefix + item.targetSuffix;
			}
			return {Source: item.source, Target: target};
		});
	}
	function matchesSelfHostingTemplate(basePath, site) {
		// Given a site and a base workspace path, can we substitute the path into each FILE mapping, and
		// localhost:anyport into every API mapping, such that the site matches the self-hosting template?
		return SELF_HOSTING_TEMPLATE.every(function(item) {
			return site.Mappings.some(function(mapping) {
				if (mapping.Source === item.source) {
					if (item.type === TYPE_FILE) {
						return mapping.Target === (basePath + item.targetSuffix);
					} else if (item.type === TYPE_API) {
						return new RegExp(
							regex.escape("http://localhost") + "(:\\d+)?" + regex.escape(makeHostRelative(getContext())) + regex.escape(item.targetSuffix)
						).test(mapping.Target);
					}
				}
				return false;
			});
		});
	}

	function SiteImpl(filePrefix, workspacePrefix) {
		this.filePrefix = filePrefix;
		this.cache = new Cache(workspacePrefix);
		this.makeAbsolute = workspacePrefix && workspacePrefix.indexOf("://") !== -1;
	}
	
	SiteImpl.prototype = {
		getSiteConfigurations: function() {
			//NOTE: require.toURL needs special logic here to handle "site"
			var siteUrl = require.toUrl("site._");
			siteUrl = siteUrl.substring(0,siteUrl.length-2);
			return xhrJson('GET', siteUrl, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(response) {
				return response.SiteConfigurations;
			}).then(
				function(result) {
					if (this.makeAbsolute) {
						_normalizeLocations(result);
					}
					return result;
				}.bind(this)
			);
		},
		loadSiteConfiguration: function(locationUrl) {
			return xhrJson('GET', locationUrl, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(
				function(result) {
					if (this.makeAbsolute) {
						_normalizeLocations(result);
					}
					return result;
				}.bind(this)
			);
		},
		/**
		 * @param {String} name
		 * @param {String} workspaceId
		 * @param {Object} [mappings]
		 * @param {String} [hostHint]
		 * @param {String} [status]
		 */
		createSiteConfiguration: function(name, workspaceId, mappings, hostHint, hostingStatus) {
			function hostify(name) {
				return name.replace(/ /g, "-").replace(/[^A-Za-z0-9-_]/g, "").toLowerCase();
			}
			var toCreate = {
					Name: name,
					Workspace: workspaceId,
					HostHint: hostify(name)
				};
			if (mappings) { toCreate.Mappings = mappings; }
			if (hostHint) { toCreate.HostHint = hostHint; }
			if (hostingStatus) { toCreate.HostingStatus = hostingStatus; }

			//NOTE: require.toURL needs special logic here to handle "site"
			var siteUrl = require.toUrl("site._");
			siteUrl = siteUrl.substring(0,siteUrl.length-2);
			return xhrJson('POST', siteUrl, {
				data: toCreate,
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(
				function(result) {
					if (this.makeAbsolute) {
						_normalizeLocations(result);
					}
					return result;
				}.bind(this)
			);
		},
		updateSiteConfiguration: function(locationUrl, updatedSiteConfig) {
			return xhrJson('PUT', locationUrl, {
				data: updatedSiteConfig,
				headers: {
					"Content-Type": "application/json; charset=utf-8",
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(
				function(result) {
					if (this.makeAbsolute) {
						_normalizeLocations(result);
					}
					return result;
				}.bind(this)
			);
		},
		deleteSiteConfiguration: function(locationUrl) {
			return xhrJson('DELETE', locationUrl, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(
				function(result) {
					if (this.makeAbsolute) {
						_normalizeLocations(result);
					}
					return result;
				}.bind(this)
			);
		},
		/**
		 * @param {String} fileLocation
		 */
		toInternalForm: function(fileLocation) {
			var relFilePrefix = makeHostRelative(this.filePrefix);
			var relLocation = makeHostRelative(fileLocation);
			var path;
			if (relLocation.indexOf(relFilePrefix) === 0) {
				path = relLocation.substring(relFilePrefix.length);
			}
			if (path[path.length-1] === "/"){
				path = path.substring(0, path.length - 1);
			}
			return path;
		},
		/**
		 * @param {String} internalPath
		 */
		toFileLocation: function(internalPath) {
			function _removeEmptyElements(array) {
				return array.filter(function(s){return s !== "";});
			}
			var relativePath = require.toUrl(this.filePrefix + internalPath + "._");
			relativePath = relativePath.substring(0, relativePath.length - 2);
			var segments = internalPath.split("/");
			if (_removeEmptyElements(segments).length === 1) {
				relativePath += "/";
			}
			return makeHostRelative(qualifyURL(relativePath));
		},
		/** @returns {Object} */
		getMappingObject: function(site, fileLocation, virtualPath) {
			var internalPath = this.toInternalForm(fileLocation);
			return this.cache.getProjects(site.Workspace).then(function(projects) {
				var displayString = getDisplayString(internalPath, projects);
				return {
					Source: virtualPath,
					Target: internalPath,
					FriendlyPath: displayString || virtualPath
				};
			});
		},
		getMappingProposals: function(site) {
			var self = this;
			return this.cache.getProjects(site.Workspace).then(function(projects) {
				return projects.map(function(project) {
					return {
						Source: '/' + project.Name,
						Target: self.toInternalForm(project.Location),
						FriendlyPath: '/' + project.Name
					};
				});
			});
		},
		updateMappingsDisplayStrings: function(site) {
			return this.cache.getProjects(site.Workspace).then(function(projects) {
				var mappings = site.Mappings;
				for (var i = 0; i < mappings.length; i++) {
					var mapping = mappings[i];
					if (isInternalPath(mapping.Target)) {
						mapping.FriendlyPath = getDisplayString(mapping.Target, projects);
					}
				}
				return site;
			});
		},
		parseInternalForm: function(site, displayString) {
			if (isInternalPath(displayString)) {
				return this.cache.getProjects(site.Workspace).then(function(projects) {
					// Find project whose Name matches the first segment of display string
					var segments = displayString.split('/');
					for (var i=0; i < projects.length; i++) {
						var project = projects[i];
						if (segments[1] === project.Name) {
							// Replace Name by Id to produce the internal form
							segments[1] = project.Id;
							return segments.join('/');
						}
					}
				});
			}
			return null; // no internal form
		},
		isSelfHostingSite: function(site) {
			var self = this;
			return this.cache.getProjects(site.Workspace).then(function(projects) {
				// There must be a project for which all self hosting mappings can be generated using the project's Id
				return projects.some(function(project) {
					var internalPath = self.toInternalForm(project.Location);
					return matchesSelfHostingTemplate(internalPath, site);
				});
			});
		},
		convertToSelfHosting: function(site, selfHostfileLocation, port) {
			var internalPath = this.toInternalForm(selfHostfileLocation);
			var mappings = generateSelfHostingMappings(internalPath, port);
			site.Mappings = mappings;
			return site;
		},
		getURLOnSite: function(site, file) {
			var mappings = site.Mappings, filePath = this.toInternalForm(file.Location);
			if (!mappings) {
				return null;
			}
			for (var i=0; i < mappings.length; i++) {
				var mapping = mappings[i];
				if (mapping.Target === filePath) {
					return makeURL(site, mapping.Source, file);
				}
			}
			return null;
		}
	};
	return {
		SiteImpl: SiteImpl
	};
});