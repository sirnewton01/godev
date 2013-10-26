/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document window*/
define(['i18n!orion/sites/nls/messages', 'require', 'orion/Deferred', 'orion/fileClient'], function(messages, require, Deferred, mFileClient) {
	/**
	 * Performs a service call, handling authentication and retrying after auth.
	 * @returns {Promise}
	 */
	function _doServiceCall(service, methodName, args) {
		var serviceMethod = service[methodName];
		var clientDeferred = new Deferred();
		if (typeof serviceMethod !== 'function') { //$NON-NLS-0$
			throw messages['Service method missing: '] + methodName;
		}
		// On success, just forward the result to the client
		var onSuccess = function(result) {
			clientDeferred.resolve(result);
		};
		
		// On failure we might need to retry
		var onError = function(error) {
			// Forward other errors to client
			clientDeferred.reject(error);
		};
		serviceMethod.apply(service, args).then(onSuccess, onError);
		return clientDeferred;
	}

	function getFileClient(serviceRegistry, filePattern) {
		return new mFileClient.FileClient(serviceRegistry, function(reference) {
			var top = reference.getProperty("top"); //$NON-NLS-0$
			return top && top.indexOf(filePattern) === 0;
		});
	}

	/**
	 * Constructs a new SiteClient.
	 * @name orion.sites.SiteClient
	 * @extends orion.sites.SiteService
	 * @class Convenience API for interacting with a particular {@link orion.sites.SiteService}.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.serviceregistry.Service} siteService
	 * @param {orion.serviceregistry.ServiceReference} siteServiceRef
	 */
	function SiteClient(serviceRegistry, siteService, siteServiceRef) {
		this._serviceRegistry = serviceRegistry;
		this._siteService = siteService;
		this._selfHost = siteServiceRef.getProperty('canSelfHost'); //$NON-NLS-0$
		this._sitePattern = siteServiceRef.getProperty('sitePattern'); //$NON-NLS-0$
		this._filePattern = siteServiceRef.getProperty('filePattern'); //$NON-NLS-0$
		this._name = siteServiceRef.getProperty('name'); //$NON-NLS-0$
		this._id = siteServiceRef.getProperty('id'); //$NON-NLS-0$

		this._getService = function() {
			return this._siteService;
		};
		this._getFilePattern = function() {
			return this._filePattern;
		};
		this._getFileClient = function() {
			return getFileClient(this._serviceRegistry, this._getFilePattern());
		};
		this._canSelfHost = function() {
			return this._selfHost;
		};
	}
	SiteClient.prototype = {
		// Convenience methods below
		isFileMapped: function(site, file) {
			if (!site) {
				var d = new Deferred();
				d.resolve(false);
				return d;
			}
			return this.getURLOnSite(site, file).then(function(url) {
				return url !== null;
			});
		},
		mapOnSiteAndStart: function(site, file, workspaceId) {
			var siteClient = this;
			function insertMappingFor(virtualPath, filePath, mappings) {
				return siteClient.isFileMapped(site, file).then(function(isFileMapped) {
					if (!isFileMapped) {
						mappings.push({Source: virtualPath, Target: filePath, FriendlyPath: virtualPath});
					}
					var d = new Deferred();
					d.resolve();
					return d;
				});
			}
			var virtualPath = "/" + file.Name; //$NON-NLS-0$
			var deferred;
			if (!site) {
				// Create a site first
				var name = file.Name + " site"; //$NON-NLS-0$
				deferred = siteClient.toInternalForm(file.Location).then(function(filePath) {
					var mappings = [];
					return insertMappingFor(virtualPath, filePath, mappings).then(function() {
						return siteClient.createSiteConfiguration(name, workspaceId, mappings, null, {Status: "started"}) //$NON-NLS-0$
							.then(function(createdSite) {
									return createdSite;
								});
					});
				});
			} else {
				if (site.HostingStatus.Status === "started") { //$NON-NLS-0$
					site.HostingStatus.Status = "stopped"; //$NON-NLS-0$
				}
				deferred = siteClient.toInternalForm(file.Location).then(function(filePath) {
					return insertMappingFor(virtualPath, filePath, site.Mappings).then(function() {
						// Restart the site so the change will take effect
						return siteClient.updateSiteConfiguration(site.Location, site).then(function(site) {
							return siteClient.updateSiteConfiguration(site.Location, {HostingStatus: {Status: "started"}}); //$NON-NLS-0$
						});
					});
				});
			}
			return deferred.then(function(site) {
				return siteClient.getURLOnSite(site, file);
			});
		}
	};
	// Service methods
	function proxyServiceMethod(object, name) {
		object[name] = function() {
			return _doServiceCall(this._getService(), name, Array.prototype.slice.call(arguments));
		};
	}
	[	'createSiteConfiguration', 'getSiteConfigurations', 'deleteSiteConfiguration',  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		'loadSiteConfiguration', 'updateSiteConfiguration', 'toFileLocation', 'toInternalForm', 'getMappingObject', //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		'getMappingProposals', 'updateMappingsDisplayStrings', 'parseInternalForm', 'isSelfHostingSite',  //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		'convertToSelfHosting', 'getURLOnSite'  //$NON-NLS-1$ //$NON-NLS-0$
	].forEach(function(methodName) {
			proxyServiceMethod(SiteClient.prototype, methodName);
		});
	SiteClient.prototype.constructor = SiteClient;

	function forLocationProperty(serviceRegistry, locationPropertyName, location) {
		var siteReferences = serviceRegistry.getServiceReferences('orion.site'); //$NON-NLS-0$
		var references = [];
		var patterns = [];
		var services = [];
		for (var i=0; i < siteReferences.length; i++) {
			var pattern = siteReferences[i].getProperty(locationPropertyName);
			var patternEpxr;
			if (pattern[0] !== '^') { //$NON-NLS-0$
				patternEpxr = '^' + pattern; //$NON-NLS-0$
			} else {
				patternEpxr = pattern;
			}
			references.push(siteReferences[i]);
			patterns.push(new RegExp(patternEpxr));
			services.push(serviceRegistry.getService(siteReferences[i]));
		}

		var getServiceIndex = function(location) {
			if (location === '/') { //$NON-NLS-0$
				return -1;
			} else if (!location || (location.length && location.length === 0)) {
				return 0;
			}
			for (var i=0; i < patterns.length; i++) {
				if (patterns[i].test(location)) {
					return i;
				}
			}
			throw messages['No Matching SiteService for '] + locationPropertyName + ': ' + location; //$NON-NLS-1$
		};
		var serviceIndex = getServiceIndex(location);
		var service = services[serviceIndex];
		var serviceRef = references[serviceIndex];
		return new SiteClient(serviceRegistry, service, serviceRef);
	}

	/**
	 * @name SiteClient.forLocation
	 * @static
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {String} location Location of a site configuration.
	 * @returns {orion.sites.SiteClient}
	 */
	function forLocation(serviceRegistry, location) {
		return forLocationProperty(serviceRegistry, 'pattern', location); //$NON-NLS-0$
	}

	/**
	 * @name SiteClient.forLocation
	 * @static
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {String} location Location of a site configuration.
	 */
	function forFileLocation(serviceRegistry, fileLocation) {
		return forLocationProperty(serviceRegistry, 'filePattern', fileLocation); //$NON-NLS-0$
	}

	/**
	 * @name orion.sites.SiteConfiguration
	 * @class Interface for an in-memory representation of a site configuration resource. Objects of this
	 * interface are used as parameters, and returned by, methods of the  {@link orion.sites.SiteService} API.
	 * @property {String} Name The name of the site configuration.
	 * @property {String} Workspace The workspace id that this site configuration is associated with.
	 * @property {Array} Mappings The mappings defined by this site configuration. Each element has the properties 
	 * <code>Source</code> and <code>Target</code>, both of type {@link String}. 
	 * @property {String} [HostHint] A hint used to derive the domain name when the site is launched as a subdomain. 
	 * @property {Object} HostingStatus Gives information about the status of this site configuration. Has the following properties:
	 * <ul>
	 * <li>{String} <code>Status</code> Status of this site. Value is either <code>'started'</code> or <code>'stopped'</code>.</li>
	 * <li>{String} <code>URL</code> Optional, gives the URL where the running site can be accessed. Only present
	 * if the <code>Status</code> is <code>'started'</code>.</li>
	 * </ul>
	 */

	/**
	 * @name orion.sites.SiteService
	 * @class Interface for a service that manages site configurations.
	 */
	/**#@+
	 * @memberOf orion.sites.SiteService.prototype
	 */
		/**
		 * Creates a site configuration.
		 * @name createSiteConfiguration
		 * @param {String} name
		 * @param {String} workspace
		 * @param {Array} [mappings]
		 * @param {String} [hostHint] 
		 * @returns {orion.sites.SiteConfiguration} The created site configuration.
		 */
		/**
		 * Deletes a site configuration.
		 * @name deleteSiteConfiguration
		 * @param {String} locationUrl Location of the site configuration resource to be deleted.
		 * @returns {void}
		 */
		/**
		 * Retrieves all site configurations defined by the logged-in user.
		 * @name getSiteConfigurations
		 * @returns {orion.sites.SiteConfiguration[]} The site configurations.
		 */
		/**
		 * Loads an individual site configuration from the given location.
		 * @name loadSiteConfiguration
		 * @param {String} locationUrl Location URL of a site configuration resource.
		 * @returns {orion.sites.SiteConfiguration} The loaded site configuration.
		 */
		/**
		 * Edits an existing site configuration.
		 * @name updateSiteConfiguration
		 * @param {String} locationUrl Location of the site configuration resource to be updated.
		 * @param {orion.sites.SiteConfiguration} updatedSiteConfig A representation of the updated site. Properties that are not changing
		 * may be omitted.
		 * @returns {orion.sites.SiteConfiguration} The updated site configuration.
		 */
		/**
		 * @name toInternalForm
		 * @param {String} fileLocation
		 * @returns {String}
		 */
		/**
		 * @name toFileLocation
		 * @param {String} internalPath
		 * @returns {String}
		 */
		/**
		 * @name getMappingObject
		 * @param {orion.sites.SiteConfiguration} site
		 * @param {String} fileLocation
		 * @param {String} virtualPath
		 * @returns {Object}
		 */
		/**
		 * @name getMappingProposals
		 * @param {orion.sites.SiteConfiguration} site
		 * @returns {String[]}
		 */
		/**
		 * @name updateMappingsDisplayStrings
		 * @param {orion.sites.SiteConfiguration} site
		 * @returns {orion.sites.SiteConfiguration}
		 */
		/**
		 * @name parseInternalForm
		 * @param {orion.sites.SiteConfiguration} site
		 * @param {String} displayString
		 * @returns {String}
		 */
		/**
		 * @name isSelfHostingSite
		 * @param {orion.sites.SiteConfiguration} site
		 * @returns {Boolean}
		 */
		/**
		 * @name convertToSelfHosting
		 * @param {orion.sites.SiteConfiguration} site
		 * @returns {orion.sites.SiteConfiguration}
		 */
		/**
		 * @name getURLOnSite
		 * @param {orion.sites.SiteConfiguration} site
		 * @param {Object} file
		 * @returns {String}
		 */
	/**#@-*/

	return {
		forLocation: forLocation,
		forFileLocation: forFileLocation,
		getFileClient: getFileClient,
		SiteClient: SiteClient
	};
});
