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
/*global define setTimeout window*/
define(['orion/assert', 'orion/Deferred', 'orion/testHelpers', 'orion/config', 'orion/serviceregistry', 'orion/pluginregistry'],
		function(assert, Deferred, testHelpers, config, mServiceRegistry, mPluginRegistry) {
	var ConfigAdminFactory = config.ConfigurationAdminFactory;
	var MANAGED_SERVICE = 'orion.cm.managedservice';

	function MockPrefsService() {
		function PrefNode() {
			this.map = Object.create(null);
		}
		PrefNode.prototype = {
			clear: function() {
				this.map = Object.create(null);
			},
			keys: function() {
				return Object.keys(this.map);
			},
			get: function(key) {
				var value = this.map[key];
				return typeof value === 'object' ? JSON.parse(value) : undefined;
			},
			put: function(key, value) {
				if (value === null) {
					throw new Error('Preferences does not allow null values');
				}
				this.map[key] = JSON.stringify(value);
			},
			remove: function(key) {
				delete this.map[key];
			}
		};
		this.prefNodes = Object.create(null);
		this.getPreferences = function(name, scope) {
			var d = new Deferred();
			var self = this;
			setTimeout(function() {
				var prefNode = self.prefNodes[name] = new PrefNode();
				d.resolve(prefNode);
			}, 100);
			return d;
		};
		// Search for a string in the preferences JSON.
		this._contains = function(str) {
			var prefNodes = this.prefNodes;
			return Object.keys(prefNodes).some(function(name) {
				return JSON.stringify(prefNodes[name].map).indexOf(str) !== -1;
			});
		};
	}

	var serviceRegistry, preferences, pluginRegistry, pluginStorage, configAdmin;
	var setUp = function(storage, omitConfigAdmin) {
		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		preferences = new MockPrefsService();
		pluginStorage = arguments.length ? storage : {};
		pluginRegistry = window.pluginregistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {storage: pluginStorage});
		return pluginRegistry.start().then(function(){
			if (typeof omitConfigAdmin === 'undefined' || !omitConfigAdmin) {
				return new ConfigAdminFactory(serviceRegistry, pluginRegistry, preferences).getConfigurationAdmin().then(
					function(createdConfigAdmin) {
						configAdmin = createdConfigAdmin;
					});
			}
		});
	},
	tearDown = function() {
		return pluginRegistry.stop().then(function(){
			serviceRegistry = null;
			preferences = null;
			pluginRegistry = null;
			pluginStorage = null;
			configAdmin = null;
		});
	},
	makeTest = function(body) {
		return testHelpers.makeTest(setUp, tearDown, body);
	};

	var tests = {};
	tests['test ConfigurationAdmin.getConfiguration()'] = makeTest(function() {
		var pid = 'test.pid';
		var configuration = configAdmin.getConfiguration(pid);
		assert.strictEqual(configuration.getPid(), pid);
	});

	tests['test ConfigurationAdmin.listConfigurations()'] = makeTest(function() {
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

	tests['test Configuration.update(), .getProperties()'] = makeTest(function() {
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

	tests['test Configuration.remove()'] = makeTest(function() {
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

	tests['test ManagedService.updated() called after registering ManagedService'] = makeTest(function() {
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

	tests['test ManagedService.updated(null) called for nonexistent config'] = makeTest(function() {
		var d = new Deferred();
		serviceRegistry.registerService(MANAGED_SERVICE, 
			{	updated: function(properties) {
					if (properties === null) {
						d.resolve();
					} else {
						d.reject();
					}
				}
			},
			{	pid: 'test.pid'
			});
		return d;
	});

	tests['test ManagedService.updated() gets updated props after a Configuration.update()'] = makeTest(function() {
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

	tests['test ManagedService.updated(null) called after removing config'] = makeTest(function() {
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

	tests['test plugin load updated() call ordering'] = makeTest(function() {
		return pluginRegistry.installPlugin('testManagedServicePlugin.html').then(function(plugin) {
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

	// Similar to previous test, but ConfigAdmin is registered after PluginRegistry has started up.
	tests['test plugin load updated() call ordering -- late registration'] = (function() {
		return testHelpers.makeTest(setUp.bind(null, {} /*no storage*/, true /*no config admin*/), tearDown, function() {
			return pluginRegistry.installPlugin('testManagedServicePlugin.html').then(function(plugin) {
				return plugin.start({lazy:true}).then(function() {
					return new ConfigAdminFactory(serviceRegistry, pluginRegistry, preferences).getConfigurationAdmin().then(function(createdConfigAdmin) {
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
	}());

	tests['test lazy Pref storage for Configurations'] = makeTest(function() {
		var pid = 'GRUNNUR';
		var configuration = configAdmin.getConfiguration(pid);
		assert.equal(preferences._contains(pid), false, 'config data exists in Prefs');
		configuration.update({foo: 'bar'});
		assert.equal(preferences._contains(pid), true, 'config data exists in Prefs');
	});

return tests;
});