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
/*jslint browser: true, devel: true*/
/*global define XPathResult DOMParser*/
define(["chai/chai", "orion/serviceregistry", "orion/pluginregistry", "webdav"], function(chai, mServiceregistry, mPluginregistry, mWebdav) {
	var assert = chai.assert;
	var tests = {};

	tests["test plugin GET call"] = function() {
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
		var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
		return pluginRegistry.start().then(function(){
			return pluginRegistry.installPlugin("http://localhost/dav/plugin/xhrPlugin.html").then(function(plugin) {
				plugin.start().then(function() {
					return serviceRegistry.getService("xhr").call("GET", "xhrPlugin.html");
				}).then(function(result) {
					assert.ok(result.status >= 200 && result.status < 300);
				});
			});
		}).then(function() {
			pluginRegistry.stop();
		});
	};
	
	tests["test plugin GET and PROPFIND call"] = function() {
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
		var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
		return pluginRegistry.start().then(function(){
			return pluginRegistry.installPlugin("http://localhost/dav/plugin/xhrPlugin.html").then(function(plugin) {
				plugin.start().then(function() {
					var service = serviceRegistry.getService("xhr");
					return service.call("GET", "xhrPlugin.html").then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("PROPFIND", "xhrPlugin.html");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						var multistatus = mWebdav.parseDAV_multistatus(result.responseText);
						var response = multistatus.response[0];
						assert.ok(response);
						assert.ok(response.href[0].match(/xhrPlugin\.html$/));
						var prop = response.propstat[0].prop; 
						assert.ok(prop.resourcetype === null || prop.resourcetype.indexOf("collection") === -1);
						assert.ok(prop.getcontenttype === "text/html");
						return service.call("PROPFIND", ".", {depth:1});
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						var multistatus = mWebdav.parseDAV_multistatus(result.responseText);
						var response = multistatus.response[0];
						assert.ok(response);
						var prop = response.propstat[0].prop;
						assert.ok(prop.resourcetype.indexOf("collection") !== -1);
					});
				});
			});
		}).then(function() {
			pluginRegistry.stop();
		});
	};

	
	tests["test plugin PUT and DELETE call"] = function() {
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
		var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
		return pluginRegistry.start().then(function(){
			return pluginRegistry.installPlugin("http://localhost/dav/plugin/xhrPlugin.html").then(function(plugin) {
				plugin.start().then(function() {
					var service = serviceRegistry.getService("xhr");
					return service.call("GET", "testput.txt", {"Cache-Control": "no-cache"}).then(function(result) {
						assert.ok(result.status === 404);
						return service.call("PUT", "testput.txt", null, "test");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("GET", "testput.txt");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("DELETE", "testput.txt");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("GET", "testput.txt");
					}).then(function(result) {
						assert.ok(result.status === 404);
					});
				});
			});
		}).then(function() {
			pluginRegistry.stop();
		});
	};
	
	tests["test plugin MKCOL and DELETE call"] = function() {
		var serviceRegistry = new mServiceregistry.ServiceRegistry();
		var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
		return pluginRegistry.start().then(function(){
			return pluginRegistry.installPlugin("http://localhost/dav/plugin/xhrPlugin.html").then(function(plugin) {
				plugin.start().then(function() {
					var service = serviceRegistry.getService("xhr");
					return service.call("PROPFIND", "test/").then(function(result) {
						assert.ok(result.status === 404);
						return service.call("MKCOL", "test/");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("PROPFIND", "test/", {depth:1});
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("DELETE", "test/");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						return service.call("PROPFIND", "test/");
					}).then(function(result) {
						assert.ok(result.status === 404);			
					});
				});
			});
		}).then(function() {
			pluginRegistry.stop();
		});
	};

	return tests;
});
