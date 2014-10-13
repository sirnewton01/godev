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
/*eslint-env browser, amd*/
define([
	'require',
	'orion/i18nUtil',
	'orion/xhr',
	'orion/regex'
], function(require, i18nUtil, xhr, regex) {

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

	function SiteImpl(filePrefix, workspacePrefix, selfHostingRules) {
		this.filePrefix = filePrefix;
		this.cache = new Cache(workspacePrefix);
		this.makeAbsolute = workspacePrefix && workspacePrefix.indexOf("://") !== -1;
		this.selfHostingRules = selfHostingRules;

		// TODO move this onto the orion site client side?
		var SELF_HOSTING_TEMPLATE = selfHostingRules.Rules;
		var TYPE_FILE = selfHostingRules.Types.File;
		var TYPE_API = selfHostingRules.Types.API;
		/**
		 * @param {String[]} folderPaths
		 */
		this._generateSelfHostingMappings = function(folderPaths) {
			var hostPrefix = "http://localhost" + makeHostRelative(getContext()); //$NON-NLS-0$
			return SELF_HOSTING_TEMPLATE.map(function(item) {
				var target;
				if (item.type === TYPE_FILE) {
					// Replace occurrence of ${n} in targetPattern with the n'th folderPath
					target = i18nUtil.formatMessage.apply(i18nUtil, [item.targetPattern].concat(folderPaths));
				} else { // TYPE_API
					target = i18nUtil.formatMessage(item.targetPattern, hostPrefix);
				}
				return {Source: item.source, Target: target};
			});
		};
		/**
		 * Performs a rough check to see if the given folderPath and site can generate all rules in the template.
		 * @returns {Boolean}
		 */
		this._matchesSelfHostingTemplate = function(projectPath, site) {
			// Given a site, can we substitute the projectPath (+ optional suffix) into each FILE mapping, and localhost:anyport into
			// every API mapping, such that the site satisfies the self-hosting template?
			var variableRegex = /(\$\{[^}]+?\})/;
			var hostsub = regex.escape("http://localhost") + "(:\\d+)?" + regex.escape(makeHostRelative(getContext())); //$NON-NLS-1$ //$NON-NLS-0$
			return SELF_HOSTING_TEMPLATE.every(function(item) {
				return site.Mappings.some(function(mapping) {
					if (mapping.Source === item.source) {
						var sub;
						if (item.type === TYPE_FILE) {
							sub = regex.escape(projectPath) + ".*?"; //$NON-NLS-0$
						} else if (item.type === TYPE_API) {
							sub = hostsub;
						}
						var result = [];
						item.targetPattern.split(variableRegex).forEach(function(element) {
							if (variableRegex.test(element)) {
								result.push(sub);
							} else {
								result.push(regex.escape(element));
							}
						});
						return new RegExp(result.join("")).test(mapping.Target); //$NON-NLS-0$
					}
					return false;
				});
			});
		};
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
				// This is just a rough check, not rigorous. We don't verify that a consistent assignments of
				// paths exists that satisfies the template, nor that any mentioned subfolders exist.
				return projects.some(function(project) {
					var internalPath = self.toInternalForm(project.Location);
					return self._matchesSelfHostingTemplate(internalPath, site);
				});
			});
		},
		/**
		 * @parram {String[]} folderLocations
		 */
		convertToSelfHosting: function(site, folderLocations) {
			var internalPaths = folderLocations.map(this.toInternalForm.bind(this));
			var mappings = this._generateSelfHostingMappings(internalPaths);
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