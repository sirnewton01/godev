/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global URL*/
define(["orion/plugin", "orion/Deferred", "plugins/filePlugin/GitHubFileImpl", "orion/URL-shim"], function(PluginProvider, Deferred, GitHubFileImpl) {

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
		name: "GitHub File Plugin",
		version: "1.0",
		description: "GitHub File Plugin"
	};
	var provider = new PluginProvider(headers);
	var url = new URL(window.location.href);
	var service = new GitHubFileImpl(url.query.get("repo"), url.query.get("token"));
	var base = service._repoURL.href;

	provider.registerService("orion.core.file", service, {
		Name: 'GitHub File contents',
		top: base,
		pattern: base.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1")
	});
	provider.connect();
});