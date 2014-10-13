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
/*eslint-env browser, amd, mocha*/
define([
	'chai/chai',
	'js-tests/core/config/mockPrefs',
	'orion/Deferred',
	'orion/config',
	'orion/serviceregistry',
	'orion/pluginregistry',
	'mocha/mocha',
], function(chai, MockPrefsService, Deferred, config, mServiceRegistry, mPluginRegistry) {
	var assert = chai.assert,
	    ConfigAdminFactory = config.ConfigurationAdminFactory,
	    MANAGED_SERVICE = 'orion.cm.managedservice';

	var serviceRegistry, prefsService, pluginRegistry, configAdmin;

	function doSetUp(factories) {
		factories = factories || {};
		var storageFactory = factories.storage || Object.create.bind(Object, Object.prototype);
		var pluginRegistryFactory = factories.pluginRegistry || function(storage) {
			return (window.pluginregistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {storage: storage}));
		};
		var prefsServiceFactory = factories.prefs || function() {
			return new MockPrefsService();
		};
		var configAdminFactoryFactory = factories.config || function (serviceRegistry, pluginRegistry, prefsService) {
			return new ConfigAdminFactory(serviceRegistry, pluginRegistry, prefsService);
		};

		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		pluginRegistry = pluginRegistryFactory(storageFactory());
		return pluginRegistry.start().then(function() {
			prefsService = prefsServiceFactory();
			var configAdminFactory = configAdminFactoryFactory(serviceRegistry, pluginRegistry, prefsService);
			if (!configAdminFactory)
				return new Deferred().resolve();
			return configAdminFactory.getConfigurationAdmin().then(
				function(createdConfigAdmin) {
					configAdmin = createdConfigAdmin;
					return new Deferred().resolve();
				});
		});
	}

	// Hook for before/beforeEach. MUST have 0 declared params, otherwise Mocha thinks you want an async callback
	function setUp() {
		if (arguments.length)
			throw new Error("Do not call this function with parameters, they won't work");
		return doSetUp();
	}

	function tearDown() {
		return pluginRegistry.stop().then(function() {
			serviceRegistry = null;
			prefsService = null;
			pluginRegistry = null;
			configAdmin = null;
		});
	}

	function putAll(provider, pids) {
		Object.keys(pids).forEach(function(pid) {
			provider.put(pid, pids[pid]);
		});
	}

	function setUpWithPrefs(prefData) {
		var prefsServiceFactory = function() {
			var ps = new MockPrefsService();
			prefData.defaults && putAll(ps._defaultsProvider, prefData.defaults);
			prefData.user && putAll(ps._userProvider, prefData.user);
			return ps;
		};
		return doSetUp({
			prefs: prefsServiceFactory
		});
	}

	describe("config", function() {
		describe("ConfigurationAdmin", function() {
			beforeEach(setUp);
			afterEach(tearDown);

			it("#getConfiguration", function() {
				var pid = 'test.pid';
				var configuration = configAdmin.getConfiguration(pid);
				assert.strictEqual(configuration.getPid(), pid);
			});
			it("#listConfigurations()", function() {
				var createdConfigs = [];
				for (var i=0; i < 5; i++) {
					var config = configAdmin.getConfiguration('orion.test.pid' + (i+1));
					config.update({foo: (i+1)});
					createdConfigs.push(config);
				}
				var listedConfigs = configAdmin.listConfigurations();
				assert.equal(createdConfigs.length, 5);
				assert.equal(listedConfigs.length, 5);
				assert.ok(createdConfigs.every(function(config) {
					assert.ok(listedConfigs.some(function(config2) {
						return config2.getPid() === config.getPid();
					}), 'Configuration with pid ' + config.getPid() + ' was found');
					return true;
				}));
			});
			it("#update(), #getProperties()", function() {
				var pid = 'test.pid';
				var configuration = configAdmin.getConfiguration(pid);
				var properties = configuration.getProperties();
				assert.strictEqual(configuration.getPid(), pid);
				assert.strictEqual(properties, null);
				configuration.update({
					str: 'blort',
					num: 42,
					nil: null
				});
				properties = configuration.getProperties();
				assert.ok(properties);
				assert.strictEqual(properties.pid, pid);
				assert.strictEqual(properties.str, 'blort');
				assert.strictEqual(properties.num, 42);
				assert.strictEqual(properties.nil, null);
			});
			it("#remove()", function() {
				var pid = 'test.pid';
				var configuration = configAdmin.getConfiguration(pid);
				configuration.update({
					str: 'blort'
				});
				var properties = configuration.getProperties();
				assert.ok(properties);
				assert.strictEqual(properties.pid, pid);
				assert.strictEqual(properties.str, 'blort');
				configuration.remove();

				var listedConfigs = configAdmin.listConfigurations();
				assert.ok(listedConfigs.every(function(config) {
						return config !== null;
					}), 'No null configuration in list');
				assert.ok(listedConfigs.every(function(config) {
					return config && pid !== config.getPid();
				}), 'Removed configuration is not in list');

				configuration = configAdmin.getConfiguration(pid);
				assert.strictEqual(configuration.getProperties(), null);
			});
			it("should use lazy Pref storage for Configurations", function() {
				var pid = 'GRUNNUR';
				var configuration = configAdmin.getConfiguration(pid);
				return prefsService.getPreferences().then(function(preferences) {
					assert.equal(preferences._contains(pid), false, 'config data exists in Prefs');
					configuration.update({foo: 'bar'});
					assert.equal(preferences._contains(pid), true, 'config data exists in Prefs');
				});
			});
		}); // ConfigurationAdmin

		describe("ConfigurationAdmin + default pref provider", function() {
			afterEach(tearDown);

			it("#getDefaultConfiguration", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 }
					}
				}).then(function() {
					var defaultConfig = configAdmin.getDefaultConfiguration("some_pid");
					assert.equal(defaultConfig.getProperties().gak, 42, "Found the default config");
					// The same value should be observable as a regular configuration also
					var config = configAdmin.getConfiguration("some_pid");
					assert.equal(config.getProperties().gak, 42, "Found the regular config");
				});
			});
			it("a config obtained from #getDefaultConfiguration() should not be #update()-able", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 }
					}
				}).then(function() {
					var defaultConfig = configAdmin.getDefaultConfiguration("some_pid");
					assert.throws(function() {
						defaultConfig.update({ foo: "bar" });
					});
				});
			});
			it("a config obtained from #getConfiguration() should be #update()-able", function() {
				return setUpWithPrefs({
					user: {
						foo: { qux: "a" }
					}
				}).then(function() {
					var config = configAdmin.getConfiguration("foo");
					config.update({ qux: 11011 });
					return prefsService.getPreferences().then(function(prefs) {
						assert.equal(prefs._contains("11011"), true, "config data was persisted");
					});
				});
			});
			it("#update()ing a Configuration should write to user provider not default", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 }
					}
				}).then(function() {
					var configuration = configAdmin.getConfiguration("some_pid");
					configuration.update({ gak: 1, buzz: 1 });

					// default provider should be unchanged -- configuration updates should happen against user provider
					var defaultPid = prefsService._defaultsProvider.get("some_pid");
					assert.equal(defaultPid.gak, 42);
					assert.notProperty(defaultPid, "buzz");

					var userPid = prefsService._userProvider.get("some_pid");
					assert.equal(userPid.gak, 1);
					assert.equal(userPid.buzz, 1);
				});
			});
			it("#list() should list PIDs from both providers", function() {
				return setUpWithPrefs({
					defaults: {
						pid1: { a: 1 }
					},
					user: {
						pid2: { b: 2 }
					}
				}).then(function() {
					var configs = configAdmin.listConfigurations();
					var config1, config2;

					configs.some(function(config) {
						if (config.getPid() === "pid1")
							return (config1 = config);
					});
					assert.ok(config1, "config1 was found");
					assert.equal(config1.getProperties().a, 1);

					configs.some(function(config) {
						if (config.getPid() === "pid2")
							return (config2 = config);
					});
					assert.ok(config2, "config2 was found");
					assert.equal(config2.getProperties().b, 2);
				});
			});
		}); // ConfigurationAdmin + default pref provider

		describe("Configuration property cascading", function() {
			afterEach(tearDown);

			it("#getConfiguration() should return an inherited config", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 }
					}
				}).then(function() {
					var config = configAdmin.getConfiguration("some_pid");
					var props = config.getProperties();
					assert.equal(props.gak, 42);
				});
			});
			it("#getConfiguration() should return config with some props inherited", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 } // should cascade downward
					},
					user: {
						some_pid: { buzz: 0 }
					}
				}).then(function() {
					var config = configAdmin.getConfiguration("some_pid"),
					    props = config.getProperties();
					assert.equal(props.gak, 42, "inherited prop 'gak' is visible");
					assert.equal(props.buzz, 0, "own prop 'buzz' is visible");
				});
			});
			it("an inherited props should be overridden by user provider", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42 }
					},
					user: {
						some_pid: { gak: 1 } // overrides 42
					}
				}).then(function() {
					var config = configAdmin.getConfiguration("some_pid"),
					    props = config.getProperties();
					assert.equal(props.gak, 1, "user overrides default");
				});
			});
			it("prop not persisted if it equals inherited value", function() {
				return setUpWithPrefs({
					defaults: {
						some_pid: { gak: 42, fizz: 1 }
					}
				}).then(function() {
					var config = configAdmin.getConfiguration("some_pid");
					config.update({ gak: 42, fizz: 313 });
					return prefsService.getPreferences(configAdmin._prefName, prefsService.USER_SCOPE).then(function(userPrefs) {
						assert.equal(userPrefs._contains("gak"), false, "Unchanged field not persisted");
						assert.equal(userPrefs._contains("42"), false, "Unchanged field not persisted");
						assert.equal(userPrefs._contains("fizz"), true);
						assert.equal(userPrefs._contains("313"), true);
					});
				});
			});
		}); // cascading

		describe("ManagedService", function() {
			beforeEach(setUp);
			afterEach(tearDown);

			describe("#updated", function() {
				it("should be called with `null` for nonexistent config", function() {
					var d = new Deferred();
					serviceRegistry.registerService(MANAGED_SERVICE,
						{	updated: function(properties) {
								try {
									assert.strictEqual(properties, null);
									d.resolve();
								} catch (e) {
									d.reject(e);
								}
							}
						},
						{	pid: 'test.pid'
						});
					return d;
				});
				it("should be called after registering", function() {
					var pid = 'test.pid';
					var configuration = configAdmin.getConfiguration(pid);
					var d = new Deferred();
					configuration.update({
						str: 'zot',
						num: 42,
						nil: null
					});
					// this registration should cause a call to updated(props)
					serviceRegistry.registerService(MANAGED_SERVICE, {
						updated: function(properties) {
							try {
								assert.ok( !! properties);
								assert.strictEqual(properties.pid, pid);
								assert.strictEqual(properties.str, 'zot');
								assert.strictEqual(properties.num, 42);
								assert.strictEqual(properties.nil, null);
								d.resolve();
							} catch (e) {
								d.reject(e);
							}
						}
					}, {
						pid: pid
					});
					return d;
				});
				it("should receive updated props after a Configuration.update()", function() {
					var d = new Deferred();
					var pid = 'orion.test.pid';
					var count = 0;
					// 1st call happens right after registration
					serviceRegistry.registerService(MANAGED_SERVICE,
						{	updated: function(properties) {
								if (++count === 2) {
									try {
										assert.strictEqual(properties.test, 'whee');
										d.resolve();
									} catch (e) {
										d.reject(e);
									}
								}
							}
						},
						{	pid: pid
						});
					var config = configAdmin.getConfiguration(pid);
					// 2nd call happens after this:
					config.update({
						'test': 'whee'
					});
					return d;
				});
				it("should be called with `null` after removing config", function() {
					var d = new Deferred();
					var pid = 'orion.test.pid';
					var count = 0;
					// 1st call happens right after registration
					serviceRegistry.registerService(MANAGED_SERVICE,
						{	updated: function(properties) {
								if (++count === 3) {
									try {
										assert.strictEqual(properties, null);
										d.resolve();
									} catch (e) {
										d.reject(e);
									}
								}
							}
						},
						{	pid: pid
						});
					var config = configAdmin.getConfiguration(pid);
					// 2nd call updated(..) happens after this:
					config.update({
						'test': 'whee'
					});
					// 3rd call happens after this
					config.remove();
					return d;
				});
			});
		}); // ManagedService

		describe("on plugin load", function() {
			afterEach(tearDown);
			this.timeout(20000); // increase timeout since we are dealing with plugins here

			describe("early registration", function() {
				before(setUp);

				it("should have correct updated() call ordering", function() {
					return pluginRegistry.installPlugin('config/testManagedServicePlugin.html').then(function(plugin) {
						return plugin.start({lazy:true}).then(function() {
							var testService = serviceRegistry.getService('test.bogus');
							return testService.test().then(function() {
								return testService.getCallOrder();
							}).then(function(callOrder) {
								assert.deepEqual(callOrder, ['orion.cm.managedservice', 'test.bogus']);
							});
						});
					});
				});
			});

			describe("late registration", function() {
				before(doSetUp.bind(null, {
					config: function() {
						// Don't create config admin in setUp
						return null;
					}
				}));

				// Similar to previous test, but ConfigAdmin is registered after PluginRegistry has started up.
				it("should have correct updated() call ordering", function() {
					return pluginRegistry.installPlugin('config/testManagedServicePlugin.html').then(function(plugin) {
						return plugin.start({lazy:true}).then(function() {
							// Now that the plugin is started, create the config admin
							return new ConfigAdminFactory(serviceRegistry, pluginRegistry, prefsService).getConfigurationAdmin().then(function(createdConfigAdmin) {
								configAdmin = createdConfigAdmin;
								var testService = serviceRegistry.getService('test.bogus');
								return testService.test().then(function() {
									return testService.getCallOrder().then(function(callOrder) {
										assert.deepEqual(callOrder, ['orion.cm.managedservice', 'test.bogus']);
									});
								});
							});
						});
					});
				});
			});
		}); // on plugin load

	}); // config
});