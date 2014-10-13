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
define(["orion/plugin", "orion/Deferred", "plugins/filePlugin/GerritFileImpl", "orion/URL-shim"], function(PluginProvider, Deferred, GerritFileImpl) {

	function trace(implementation) {
		var method;
		var traced = {};
		for (method in implementation) {
			if (typeof implementation[method] === 'function') {
				traced[method] = function(methodName) {
					return function() {
						console.log(methodName);
						var arg;
						for (arg in arguments) {
							console.log(" [" + arg + "] " + arguments[arg]);
						}
						var result = implementation[methodName].apply(implementation, Array.prototype.slice.call(arguments));
						Deferred.when(result, function(json) {
							console.log(json);
						});
						return result;
					};
				}(method);
			}
		}
		return traced;
	}

	var headers = {
		name: "Gerrit File Plugin",
		version: "1.0",
		description: "Gerrit File Plugin"
	};
	var provider = new PluginProvider(headers);
	var url = new URL(window.location.href);
	var project = url.query.get("project");
	var baseURL = new URL("../..", url);
	baseURL.search = "";
	var service = new GerritFileImpl(baseURL.href, project);

	provider.registerService("orion.core.file", service, {
		Name: 'Gerrit File contents',
		top: service._repoURL,
		pattern: baseURL.href.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")
	});
	provider.connect();
});