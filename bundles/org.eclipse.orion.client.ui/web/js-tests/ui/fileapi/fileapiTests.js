/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define(["chai/chai", "orion/serviceregistry", "orion/pluginregistry"], function(chai, mServiceregistry, mPluginregistry) {
	var assert = chai.assert;

	describe("Test file API", function() {
		it("test root", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
			return pluginRegistry.start().then(function(){
				return pluginRegistry.installPlugin("fileapi/dummyFilePlugin.html").then(function(plugin) {
					return plugin.start().then(function() {
						var references = serviceRegistry.getServiceReferences("orion.file");
						assert.equal(references.length, 1);
						var reference = references[0];
						var root = reference.getProperty("root");
						assert.ok(root.match(/fileapi/));
					}).then(function() {
						pluginRegistry.stop();
					});
				});
			});
		});
		
		it("test read", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
			return pluginRegistry.start().then(function(){
				return pluginRegistry.installPlugin("fileapi/dummyFilePlugin.html").then(function(plugin) {
					return plugin.start().then(function() {
						var references = serviceRegistry.getServiceReferences("orion.file");
						var reference = references[0];
						var root = reference.getProperty("root");
						return serviceRegistry.getService(reference).read(root + "dummyFilePlugin.html");
					}).then(function(result) {
						assert.ok(result.status >= 200 && result.status < 300);
						pluginRegistry.stop();
					});
				});
			});
		});
		
		it("test read notfound", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
			return pluginRegistry.start().then(function(){
				return pluginRegistry.installPlugin("fileapi/dummyFilePlugin.html").then(function(plugin) {
					return plugin.start().then(function() {
						var references = serviceRegistry.getServiceReferences("orion.file");
						var reference = references[0];
						var root = reference.getProperty("root");
						return serviceRegistry.getService(reference).read(root + "notfound.html");
					}).then(function(result) {
						assert.ok(false);
					}, function(result) {
						assert.ok(result.status === 404);
						pluginRegistry.stop();
					});
				});
			});
		});
		
		it.skip("test write", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
			return pluginRegistry.start().then(function(){
				return pluginRegistry.installPlugin("fileapi/dummyFilePlugin.html").then(function(plugin) {
					return plugin.start().then(function() {
						var references = serviceRegistry.getServiceReferences("orion.file");
						var reference = references[0];
						var root = reference.getProperty("root");
						var service = serviceRegistry.getService(reference);
						return service.read(root + "newfile.html").then(function(result) {
							assert.ok(false);
						}, function(result) {
							assert.ok(result.status === 404);
							return service.write(root + "newfile.html", "<html><body>test</body></html>");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
							return service.read(root + "newfile.html");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
							return service.remove(root + "newfile.html");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
							pluginRegistry.stop();
						});
					});
				});
			});
		});
		
		it.skip("test mkdir", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {storage:{}});	
			return pluginRegistry.start().then(function(){
				return pluginRegistry.installPlugin("fileapi/dummyFilePlugin.html").then(function(plugin) {
					return plugin.start().then(function() {
						var references = serviceRegistry.getServiceReferences("orion.file");
						var reference = references[0];
						var root = reference.getProperty("root");
						var service = serviceRegistry.getService(reference);
						return service.list(root + "newdir").then(function(result) {
							assert.ok(false);
						}, function(result) {
							assert.ok(result.status === 404);
							return service.mkdir(root + "newdir");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
							return service.list(root + "newdir");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
							return service.remove(root + "newdir");
						}).then(function(result) {
							assert.ok(result.status >= 200 && result.status < 300);
						});
					});
				});
			}).then(function() {
				pluginRegistry.stop();
			});
		});
	});
});
