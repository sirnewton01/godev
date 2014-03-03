/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global window document parent define console eclipse*/

define(["orion/Deferred", "orion/plugin", "plugins/filePlugin/fileImpl", "domReady!"], function(Deferred, PluginProvider, FileServiceImpl) {
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

	var tryParentRelative = true;
	function makeParentRelative(location) {
		if (tryParentRelative) {
			try {
				if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
					return location.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
				} else {
					tryParentRelative = false;
				}
			} catch (e) {
				tryParentRelative = false;
			}
		}
		return location;
	}

	var temp = document.createElement('a');
	temp.href = "../mixloginstatic/LoginWindow.html";
	var login = temp.href;
	var headers = {
		name: "Orion File Service",
		version: "1.0",
		description: "This plugin provides file access to a user's workspace.",
		login: login
	};

	var provider = new PluginProvider(headers);

	temp.href = "../file";
	// note global
	var fileBase = makeParentRelative(temp.href);

	temp.href = "../workspace";
	// note global
	var workspaceBase = makeParentRelative(temp.href);

	temp.href = "..";
	var patternBase = makeParentRelative(temp.href);

	var service = new FileServiceImpl(fileBase, workspaceBase);
	//provider.registerService("orion.core.file", trace(service), {Name:'Orion Content', top:fileBase, pattern:patternBase});
	provider.registerService("orion.core.file", service, {
		Name: 'Orion Content',  // HACK  see https://bugs.eclipse.org/bugs/show_bug.cgi?id=386509
		NameKey: 'Orion Content',
		nls: 'orion/navigate/nls/messages',
		top: fileBase,
		pattern: patternBase
	});
	provider.connect();
});