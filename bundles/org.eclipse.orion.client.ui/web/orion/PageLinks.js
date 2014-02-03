/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 ******************************************************************************/
/*global define document window URL*/
define([
	"require",
	"orion/Deferred",
	"orion/PageUtil",
	"orion/URITemplate",
	"orion/i18nUtil",
	"orion/objects",
	"orion/URL-shim"
], function(require, Deferred, PageUtil, URITemplate, i18nUtil, objects, _) {

	/**
	 * Returns the value of the <code>{OrionHome}</code> variable.
	 * @memberOf orion.PageLinks
	 * @function
	 * @returns {String} The value of the <code>{OrionHome}</code> variable.
	 */
	function getOrionHome() {
		if(!require.toUrl){
			return new URL("/", window.location.href).href.slice(0, -1);
		} else {
			return new URL(require.toUrl("orion/../"), window.location.href).href.slice(0, -1); //$NON-NLS-0$
		}
	}

	/**
	 * Reads metadata from an <code>orion.page.xxxxx</code> service extension.
	 * @memberOf orion.PageLinks
	 * @function
	 * @param {orion.ServiceRegistry} serviceRegistry The service registry.
	 * @param {String} [serviceName="orion.page.link"] Service name to read extensions from.
	 * @return {orion.Promise} A promise that resolves to an {@link orion.PageLinks.PageLinksInfo} object.
	 */
	function getPageLinksInfo(serviceRegistry, serviceName) {
		return _readPageLinksMetadata(serviceRegistry, serviceName).then(function(metadata) {
			return new _PageLinksInfo(metadata.categories, metadata.linkInfo);
		});
	}

	function _getPropertiesMap(serviceRef) {
		var props = {};
		serviceRef.getPropertyKeys().forEach(function(key) {
			if (key !== "objectClass" && key !== "service.names" && key !== "service.id" && key !== "__plugin__") //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				props[key] = serviceRef.getProperty(key);
		});
		return props;
	}

	/**
	 * Loads translated name if possible.
	 * @returns {orion.Promise} The info, with info.textContent set
	 */
	function _loadTranslatedName(info) {
		return i18nUtil.getMessageBundle(info.nls).then(function(messages) {
			info.textContent = info.nameKey ? messages[info.nameKey] : info.name;
			return info;
		});
	}

	/*
	 * Categories apply to all orion.page.link* serviceNames, so cache them.
	 */
	var _cachedCategoryInfos;

	function _readPageLinksMetadata(serviceRegistry, serviceName) {
		serviceName = serviceName || "orion.page.link"; //$NON-NLS-0$

		// Read categories.
		var categoryInfos;
		if (!_cachedCategoryInfos) {
			categoryInfos = [];
			var navLinkCategories = serviceRegistry.getServiceReferences("orion.page.link.category"); //$NON-NLS-0$
			navLinkCategories.forEach(function(serviceRef) {
				var info = _getPropertiesMap(serviceRef);
				if (!info.id || (!info.name && !info.nameKey)) {
					return;
				}
				if (info.nls) {
					categoryInfos.push(_loadTranslatedName(info));
				} else {
					info.textContent = info.name;
					categoryInfos.push(new Deferred().resolve(info));
				}
			});
			_cachedCategoryInfos = categoryInfos;
		} else {
			categoryInfos = _cachedCategoryInfos;
		}
		var categoriesPromise = Deferred.all(categoryInfos);

		// Read page links.
		// https://wiki.eclipse.org/Orion/Documentation/Developer_Guide/Plugging_into_Orion_pages
		var navLinks= serviceRegistry.getServiceReferences(serviceName);
		var params = PageUtil.matchResourceParameters(window.location.href);
		// TODO: should not be necessary, see bug https://bugs.eclipse.org/bugs/show_bug.cgi?id=373450
		var orionHome = getOrionHome();
		var locationObject = {OrionHome: orionHome, Location: params.resource};
		var navLinkInfos = [];
		navLinks.forEach(function(navLink) {
			var info = _getPropertiesMap(navLink);
			if (!info.uriTemplate || (!info.nls && !info.name)) {
				return; // missing data, skip
			}

			var uriTemplate = new URITemplate(info.uriTemplate);
			var expandedHref = uriTemplate.expand(locationObject);
			expandedHref = PageUtil.validateURLScheme(expandedHref);
			info.href = expandedHref;

			if(info.nls){
				navLinkInfos.push(_loadTranslatedName(info));
			} else {
				info.textContent = info.name;
				navLinkInfos.push(new Deferred().resolve(info));
			}
		});
		var navLinksPromise = Deferred.all(navLinkInfos);

		return Deferred.all([categoriesPromise, navLinksPromise]).then(function(results) {
			return {
				categories: results[0],
				linkInfo: results[1]
			}
		});
	}

	/**
	 * @name orion.PageLinks.PageLinksInfo
	 * @class
	 * @description Provides access to info about page links read from an extension point.
	 */
	function _PageLinksInfo(categoriesArray, allPageLinks) {
		this.allPageLinks = allPageLinks;
		var categories = this.categories = Object.create(null); // Maps category id {String} to category {Object}
		var links = this.links = Object.create(null); // Maps category id {String} to page links {Object[]}

		categoriesArray.forEach(function(category) {
			categories[category.id] = category;
		});
		allPageLinks.forEach(function(link) {
			var category = link.category ? categories[link.category] : null;
			if (category) {
				links[category.id] = links[category.id] || [];
				links[category.id].push(link);
			} else {
				// TODO default category for this link?
			}
		});

		// Sort within category by name
		Object.keys(links).forEach(function(key) {
			links[key].sort(_comparePageLinks);
		});
		// Sort all by name
		this.allPageLinks.sort(_comparePageLinks);
	}
	objects.mixin(_PageLinksInfo.prototype, /** @lends orion.PageLinks.PageLinksInfo.prototype */ {
		/**
		 * Builds DOM elements for links from all categories.
		 * @returns {Element[]} The links.
		 */
		createLinkElements: function() {
			return this.allPageLinks.map(function(info) {
				return _createLink(info.href, "_self", info.textContent); //$NON-NLS-0$
			});
		},
		/**
		 * Returns the category IDs.
		 * @returns {String[]} The category IDs.
		 */
		getCategoryIDs: function() {
			return Object.keys(this.categories);
		},
		/**
		 * Returns the data for a given category.
		 * @param {String} id The category ID.
		 * @returns {Object} The category data.
		 */
		getCategory: function(id) {
			return this.categories[id] || null;
		},
		/**
		 * Returns links from all categories, sorted by name.
		 * @returns {Object[]} The links.
		 */
		getAllLinks: function() {
			return this.allPageLinks;
		},
		/**
		 * Returns the links belonging to the given category.
		 * @param {String} id The category ID.
		 * @returns {Object[]} The links.
		 */
		getLinks: function(id) {
			return this.links[id] || [];
		}
	});

	function _comparePageLinks(a, b) {
		var n1 = a.textContent && a.textContent.toLowerCase();
		var n2 = b.textContent && b.textContent.toLowerCase();
		if (n1 < n2) { return -1; }
		if (n1 > n2) { return 1; }
		return 0;
	}

	function _createLink(href, target, textContent) {
		var a = document.createElement("a");
		a.href = href;
		a.target = target;
		a.classList.add("targetSelector");
		a.textContent = textContent;
		return a;
	}

	/**
	 * @name orion.PageLinks
	 * @class Utilities for reading <code>orion.page.link</code> services.
	 * @description Utilities for reading <code>orion.page.link</code> services.
	 */
	return {
		getPageLinksInfo: getPageLinksInfo,
		getOrionHome: getOrionHome
	};
});
