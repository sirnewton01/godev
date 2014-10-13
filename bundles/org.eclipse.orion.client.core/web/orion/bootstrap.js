/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define(['require', 'orion/Deferred', 'orion/serviceregistry', 'orion/preferences', 'orion/pluginregistry', 'orion/config'], function(require, Deferred, mServiceregistry, mPreferences, mPluginRegistry, mConfig) {

	var once; // Deferred

	function startup() {
		if (once) {
			return once;
		}
		once = new Deferred();
	
		// initialize service registry and EAS services
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
	
		// This is code to ensure the first visit to orion works
		// we read settings and wait for the plugin registry to fully startup before continuing
		var preferences = new mPreferences.PreferencesService(serviceRegistry);
		return preferences.getPreferences("/plugins").then(function(pluginsPreference) { //$NON-NLS-0$
			var configuration = {plugins:{}};
			pluginsPreference.keys().forEach(function(key) {
				var url = require.toUrl(key);
				configuration.plugins[url] = pluginsPreference[key];
			});
			var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, configuration);	
			return pluginRegistry.start().then(function() {
				if (serviceRegistry.getServiceReferences("orion.core.preference.provider").length > 0) { //$NON-NLS-0$
					return preferences.getPreferences("/plugins", preferences.USER_SCOPE).then(function(pluginsPreference) { //$NON-NLS-0$
						var installs = [];
						pluginsPreference.keys().forEach(function(key) {
							var url = require.toUrl(key);
							if (!pluginRegistry.getPlugin(url)) {
								installs.push(pluginRegistry.installPlugin(url,{autostart: "lazy"}).then(function(plugin) {
									return plugin.update().then(function() {
										return plugin.start({lazy:true});
									});
								}));
							}
						});	
						return Deferred.all(installs, function(e){
							console.log(e);
						});
					});
				}
			}).then(function() {
				return new mConfig.ConfigurationAdminFactory(serviceRegistry, pluginRegistry, preferences).getConfigurationAdmin().then(
					serviceRegistry.registerService.bind(serviceRegistry, "orion.cm.configadmin") //$NON-NLS-0$
				);
			}).then(function() {
				var auth = serviceRegistry.getService("orion.core.auth"); //$NON-NLS-0$
				if (auth) {
					var authPromise = auth.getUser().then(function(user) {
						if (!user) {
							return auth.getAuthForm(window.location.href).then(function(formURL) {
								setTimeout(function() {
									window.location = formURL;
								}, 0);
							});
						} else {
							localStorage.setItem("lastLogin", new Date().getTime()); //$NON-NLS-0$
						}
					});
					var lastLogin = localStorage.getItem("lastLogin");
					if (!lastLogin || lastLogin < (new Date().getTime() - (15 * 60 * 1000))) { // 15 minutes
						return authPromise; // if returned waits for auth check before continuing
					}
				}
			}).then(function() {
				var result = {
					serviceRegistry: serviceRegistry,
					preferences: preferences,
					pluginRegistry: pluginRegistry
				};
				once.resolve(result);
				return result;
			});
		});
	}
	return {startup: startup};
});
