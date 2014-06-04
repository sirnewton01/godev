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
/*jslint amd:true browser:true mocha:true */
define([
	"chai/chai",
	"orion/serviceregistry",
	"orion/pluginregistry",
	"orion/Deferred",
	"mocha/mocha"
], function(chai, mServiceregistry, mPluginregistry, Deferred) {
	var assert = chai.assert;

	// Returns a URL to a test plugin
	function url(pluginUrl) {
		// base is the relative path from window.location (ie. coreTests.html) to the test plugins
		var base = "pluginregistry/";
		return base + pluginUrl;
	}

	// Skip tests until timeout issues are resolved
	describe.skip("plugin registry", function() {
		it("init/stop empty registry", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			assert.equal(pluginRegistry.getState(), "installed");
			pluginRegistry.init();
			assert.equal(pluginRegistry.getPlugins().length, 0);
			return pluginRegistry.stop().then(function() {
				assert.equal(pluginRegistry.getState(), "resolved");
			});
		});

		it("test start/stop empty registry", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			assert.equal(pluginRegistry.getState(), "installed");
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getState(), "active");
			}).then(function() {
				return pluginRegistry.stop().then(function() {
					assert.equal(pluginRegistry.getState(), "resolved");
				});
			});
		});

		it("test install/uninstall plugin", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			pluginRegistry.init();
			var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
				assert.equal(pluginRegistry.getPlugins().length, 1);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
				assert.equal(plugin.getState(), "installed");
				return plugin.uninstall().then(function() {
					assert.equal(plugin.getState(), "uninstalled");
					assert.equal(pluginRegistry.getPlugins().length, 0);
				});
			});
			return promise;
		});

		it("install/uninstall initial plugin", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginData = {};
			pluginData[url("testPlugin.html")] = true;
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				plugins: pluginData,
				storage: {}
			});
			pluginRegistry.init();
			assert.equal(pluginRegistry.getPlugins().length, 1);
			assert.equal(serviceRegistry.getServiceReferences().length, 0);
			var plugin = pluginRegistry.getPlugin(url("testPlugin.html"));
			assert.ok(plugin);
			assert.equal(plugin.getState(), "installed");
			return plugin.uninstall().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
			});
		});
	
		it("start/stop plugin", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			return pluginRegistry.start().then(function() {
				return pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					assert.equal(pluginRegistry.getPlugins().length, 1);
					assert.equal(serviceRegistry.getServiceReferences().length, 0);
					assert.equal(plugin.getState(), "installed");
					pluginRegistry.resolvePlugins();
					assert.equal(plugin.getState(), "resolved");
					assert.equal(serviceRegistry.getServiceReferences().length, 0);
					return plugin.start({
						"lazy": true
					}).then(function() {
						assert.equal(plugin.getState(), "starting");
						assert.equal(plugin._getAutostart(), "lazy");
						assert.equal(serviceRegistry.getServiceReferences().length, 1);
						return plugin.stop();
					}).then(function() {
						assert.equal(plugin.getState(), "resolved");
						assert.equal(plugin._getAutostart(), "stopped");
						assert.equal(serviceRegistry.getServiceReferences().length, 0);
						return plugin.uninstall();
					}).then(function() {
						assert.equal(plugin.getState(), "uninstalled");
						assert.equal(pluginRegistry.getPlugins().length, 0);
						return pluginRegistry.stop();
					});
				});
			}).then(function() {
				assert.equal("resolved", pluginRegistry.getState());
			});
		});
	
		it("start/stop initial plugin", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginData = {};
			pluginData[url("testPlugin.html")] = true;
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				plugins: pluginData,
				storage: {}
			});
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 1);
				assert.equal(serviceRegistry.getServiceReferences().length, 1);
				var plugin = pluginRegistry.getPlugin(url("testPlugin.html"));
				assert.ok(plugin);
				assert.equal(plugin.getState(), "starting");
				assert.equal(plugin._getAutostart(), "lazy");
				assert.equal(serviceRegistry.getServiceReferences().length, 1);
				return plugin.stop().then(function() {
					assert.equal(plugin.getState(), "resolved");
					assert.equal(plugin._getAutostart(), "stopped");
					assert.equal(serviceRegistry.getServiceReferences().length, 0);
					return plugin.uninstall();
				}).then(function() {
					assert.equal(plugin.getState(), "uninstalled");
					assert.equal(pluginRegistry.getPlugins().length, 0);
					return pluginRegistry.stop();
				});
			}).then(function() {
				assert.equal("resolved", pluginRegistry.getState());
			});
		});
	
		it("install same plugin URL", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			pluginRegistry.init();
	
			var promise1 = pluginRegistry.installPlugin(url("testPlugin.html"));
			var promise2 = pluginRegistry.installPlugin(url("testPlugin.html"));
			return promise1.then(function(plugin1) {
				return promise2.then(function(plugin2) {
					assert.equal(plugin1, plugin2, "Got the same Plugin instance");
					return pluginRegistry.stop();
				});
			}).then(function() {
				assert.equal("resolved", pluginRegistry.getState());
			});
		});
	
		it("reload installed plugin", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var storage = {};
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: storage
			});
	
			return pluginRegistry.start().then(function() {
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					var pluginInfo = {
						location: plugin.getLocation(),
						data: JSON.parse(storage["plugin." + plugin.getLocation()])
					};
	
					return plugin.start().then(function() {
						assert.equal(pluginRegistry.getPlugins().length, 1);
						assert.equal(serviceRegistry.getServiceReferences().length, 1);
						return plugin.uninstall();
					}).then(function() {
						assert.equal(pluginRegistry.getPlugins().length, 0);
						assert.equal(serviceRegistry.getServiceReferences().length, 0);
						return pluginInfo;
					});
				}).then(function(pluginInfo) {
					return pluginRegistry.installPlugin(pluginInfo.location, pluginInfo.data);
				}).then(function(plugin) {
					return plugin.start().then(function() {
						assert.equal(pluginRegistry.getPlugins().length, 1);
						assert.equal(serviceRegistry.getServiceReferences().length, 1);
						return plugin.uninstall();
					}).then(function() {
						assert.equal(pluginRegistry.getPlugins().length, 0);
						assert.equal(serviceRegistry.getServiceReferences().length, 0);
						return pluginRegistry.stop();
					});
				}).then(function() {
					assert.equal("resolved", pluginRegistry.getState());
				});
				return promise;
			});
		});
	
	
		it("plugin service call", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						return serviceRegistry.getService("test").test("echo");
					});
				}).then(function(result) {
					assert.equal(result, "echo");
					return pluginRegistry.stop();
				}).then(function() {
					assert.equal("resolved", pluginRegistry.getState());
				});
				return promise;
			});
		});
	
		it("plugin service call promise", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			var progress = false;
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
	
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						return serviceRegistry.getService("test").testPromise("echo");
					});
				}).then(function(result) {
					assert.equal(result, "echo");
					assert.ok(progress);
					return pluginRegistry.stop();
				}, function(error) {
					assert.ok(false);
				}, function(update) {
					assert.equal(update, "progress");
					progress = true;
				});
				return promise;
			});
		});
	
		it("plugin service call promise cancel", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						var cancelPromise = serviceRegistry.getService("test").testCancel();
						cancelPromise.cancel();
						cancelPromise.then(function(result) {
							assert.ok(false);
						}, function(error) {
							// expected
						}).then(function() {
							return serviceRegistry.getService("test").testCancel(true);
						}).then(function(result) {
							assert.equal(result, "test");
							return pluginRegistry.stop();
						});
					});
				});
				return promise;
			});
		});
	
	
		it("plugin event", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
				var eventListenerCalls = 0;
	
				function eventListener(event) {
					if (event.result === "echotest") {
						eventListenerCalls++;
					}
				}
	
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						var service = serviceRegistry.getService("test");
						service.addEventListener("echo", eventListener);
						return service.testEvent("echo").then(function() {
							service.removeEventListener("echo", eventListener);
							return service.testEvent("echo");
						});
					});
				}).then(function(result) {
					assert.equal(eventListenerCalls, 1);
					pluginRegistry.stop();
				});
				return promise;
			});
		});
	
		it("pluginregistry events started", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
	
				var promise = new Deferred();
				pluginRegistry.addEventListener("started", function(event) {
					var plugin = event.plugin;
					try {
						assert.ok( !! plugin, "plugin not null");
						assert.equal(plugin.getServiceReferences().length, 1);
						assert.equal(plugin.getServiceReferences()[0].getProperty("name"), "echotest");
						promise.resolve();
					} catch (e) {
						promise.reject(e);
					}
				});
				pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start();
				});
				return promise;
			});
		});
	
		it("404 plugin", function() {
			// installPlugin() takes 15 seconds to time out
			this.timeout(16000);

			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			pluginRegistry.init();
			assert.equal(pluginRegistry.getPlugins().length, 0);
	
			var promise = pluginRegistry.installPlugin(url("badURLPlugin.html")).then(function() {
				throw new assert.AssertionError();
			}, function(e) {
				assert.ok(e.name === "timeout");
				assert.equal(pluginRegistry.getPlugins().length, 0);
				return pluginRegistry.stop();
			});
			return promise;
		});

		if (navigator && navigator.userAgent && navigator.userAgent.indexOf("WebKit") !== -1) {
			it("test iframe sandbox", function() {
				this.timeout(16000);

				var serviceRegistry = new mServiceregistry.ServiceRegistry();
				var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
					storage: {}
				});
				pluginRegistry.init();
				var plugins = pluginRegistry.getPlugins();
				assert.equal(plugins.length, 0);
	
				var promise = pluginRegistry.installPlugin(url("testsandbox.html")).then(function() {
					throw new assert.AssertionError();
				}, function(e) {
					assert.ok(e.name === "timeout");
					plugins = pluginRegistry.getPlugins();
					assert.equal(plugins.length, 0);
					return pluginRegistry.stop();
				});
				return promise;
			});
		}
	
		it("__plugin__ property", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			return pluginRegistry.start().then(function() {
				return pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start().then(function() {
						var serviceReferences = serviceRegistry.getServiceReferences("test");
						assert.equal(serviceReferences.length, 1);
						var __plugin__ = serviceReferences[0].getProperty("__plugin__");
						assert.equal(__plugin__, plugin.getLocation());
						return pluginRegistry.stop();
					});
				});
			});
		});
	
		it("plugin headers", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			pluginRegistry.init();
			return pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
				var headers = plugin.getHeaders();
				assert.equal(headers.name, "test plugin");
				assert.equal(headers.description, "This is a test plugin");
				return pluginRegistry.stop();
			});
		});
	
		it("error", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
			pluginRegistry.init();
			return pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
				return plugin.start({
					"lazy": true
				}).then(function() {
					return serviceRegistry.getService("test").testError().then(function() {
						assert.fail("testError() should have rejected");
					}, function(error) {
						assert.ok(error instanceof Error, "error is Error");
						assert.ok(error.toString().indexOf("helloerror") !== -1, "has a sensible toString()");
						return pluginRegistry.stop();
					});
				});
			});
		});
	
		it("plugin states", function() {
			var pluginLocation;
			var storage = {};
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: storage
			});
			return pluginRegistry.start().then(function() {
				// Eager-load case
				return pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					assert.equal(plugin.getState(), "installed", "Plugin installed (eager)");
					return plugin.start({
						"lazy": true
					}).then(function() {
						assert.equal(plugin.getState(), "starting", "Plugin loaded (eager)");
						pluginLocation = plugin.getLocation();
						pluginRegistry.stop();
					});
				});
			}).then(function() {
				// Lazy-load case
				serviceRegistry = new mServiceregistry.ServiceRegistry();
				pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
					storage: storage
				});
				return pluginRegistry.start().then(function() {
					var plugin = pluginRegistry.getPlugin(pluginLocation);
					assert.equal(plugin.getState(), "starting", "Plugin installed");
					return serviceRegistry.getService("test").test().then(function() {
						assert.equal(plugin.getState(), "active", "Plugin loaded (lazy)");
						return plugin.uninstall().then(function() {
							assert.equal(plugin.getState(), "uninstalled", "Plugin uninstalled");
							pluginRegistry.stop();
						});
	
					});
				});
			});
		});
	
		it("plugin object reference call", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			var called = false;
	
			return pluginRegistry.start().then(function() {
				var promise = pluginRegistry.installPlugin(url("testPlugin.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						return serviceRegistry.getService("test").testCallback({
							test: function() {
								called = true;
								return "testCallback";
							}
						});
					});
				}).then(function(result) {
					assert.equal(called, true);
					assert.equal(result, "testCallback");
					return pluginRegistry.stop();
				});
				return promise;
			});
		});
		it("testNotAnOrionMesssage", function() {
			var serviceRegistry = new mServiceregistry.ServiceRegistry();
			var pluginRegistry = new mPluginregistry.PluginRegistry(serviceRegistry, {
				storage: {}
			});
	
			return pluginRegistry.start().then(function() {
				assert.equal(pluginRegistry.getPlugins().length, 0);
				assert.equal(serviceRegistry.getServiceReferences().length, 0);
				var promise = pluginRegistry.installPlugin(url("testPlugin3.html")).then(function(plugin) {
					return plugin.start({
						"lazy": true
					}).then(function() {
						return serviceRegistry.getService("test").test("echo");
					});
				}).then(function(result) {
					assert.equal(result, "echo");
					return pluginRegistry.stop();
				}).then(function() {
					assert.equal("resolved", pluginRegistry.getState());
				});
				return promise;
			});
		});
	}); // pluginregistry
});