/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define navigator*/
define(function() {
	return {
		load: function(name, parentRequire, onLoad, config) {
			config = config || {};

			// as per requirejs i18n definition ignoring irrelevant matching groups
			// [0] is complete match
			// [1] is the message bundle prefix
			// [2] is the locale or suffix for the master bundle
			// [3] is the message file suffix or empty string for the master bundle
			var NLS_REG_EXP = /(^.*(?:^|\/)nls(?:\/|$))([^\/]*)\/?([^\/]*)/;
			var match = NLS_REG_EXP.exec(name);
			if (!match) {
				onLoad(null);
				return;
			}

			if (!parentRequire.defined || parentRequire.defined(name)) {
				try {
					onLoad(parentRequire(name));
					return;
				} catch (e) {
					// not defined so need to load it
				}
			}

			if (config.isBuild || config.isTest) {
				onLoad({});
				return;
			}
			
			if (parentRequire.specified && !parentRequire.specified("orion/bootstrap")) {
				onLoad({});
				return;
			}

			var prefix = match[1],
				locale = match[3] ? match[2] : "",
				suffix = match[3] || match[2];
			parentRequire(['orion/bootstrap'], function(bootstrap) { //$NON-NLS-0$
				bootstrap.startup().then(function(core) {
					var serviceRegistry = core.serviceRegistry;
					var nlsReferences = serviceRegistry.getServiceReferences("orion.i18n.message"); //$NON-NLS-0$

					if (!locale) {
						// create master language entries				
						var master = {};
						var masterReference;
						nlsReferences.forEach(function(reference) {
							var name = reference.getProperty("name"); //$NON-NLS-0$
							if ((match = NLS_REG_EXP.exec(name)) && prefix === match[1] && suffix === (match[3] || match[2])) {
								locale = match[3] ? match[2] : "";
								if (locale) {
									// see Bug 381042 - [Globalization] Messages are loaded even if their language is not used
									var userLocale = config.locale || (typeof navigator !== "undefined" ? (navigator.language || navigator.userLanguage) : null);
									if (!userLocale || userLocale.toLowerCase().indexOf(locale.toLowerCase()) !== 0) {
										return;
									}
									// end
									master[locale] = true;
									if (!parentRequire.specified || !parentRequire.specified(name)) {
										define(name, ['orion/i18n!' + name], function(bundle) { //$NON-NLS-0$
											return bundle;
										});
									}
								} else {
									masterReference = reference;
								}
							}
						});
						if (!parentRequire.specified || !parentRequire.specified(name)) {
							if (masterReference) {
								serviceRegistry.getService(masterReference).getMessageBundle().then(function(bundle) {
									Object.keys(master).forEach(function(key) {
										if (typeof bundle[key] === 'undefined') { //$NON-NLS-0$
											bundle[key] = master[key];
										}
									});
									define(name, [], bundle);
									onLoad(bundle);
								}, function() {
									define(name, [], master);
									onLoad(master);
								});
							} else {
								define(name, [], master);
								onLoad(master);
							}
						} else {
							onLoad(master);
						}
					} else {
						var found = nlsReferences.some(function(reference) {
							if (name === reference.getProperty("name")) { //$NON-NLS-0$
								serviceRegistry.getService(reference).getMessageBundle().then(function(bundle) {
									onLoad(bundle);
								}, function() {
									onLoad({});
								});
								return true;
							}
							return false;
						});
						if (!found) {
							onLoad({});
						}
					}
				});
			});
		}
	};
});