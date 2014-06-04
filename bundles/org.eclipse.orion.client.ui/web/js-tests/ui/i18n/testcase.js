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
/*global define console setTimeout navigator*/


define(["require", "orion/Deferred", "orion/bootstrap", "chai/chai", "orion/i18nUtil", "orion/i18n"], function(require, Deferred, bootstrap, chai, i18nUtil) {
	var assert = chai.assert;
	var I18N_PLUGIN = "orion/i18n";
	var tests = {};
	var locale = typeof navigator === "undefined" ? "root" : (navigator.language || navigator.userLanguage || "root").toLowerCase();

	tests.testI18n = function() {
		var name = "test/i18n/nls/message1";
		define(name, [], {
			root: {
				test: "test"
			}
		});
		var d = new Deferred();
		require(["i18n!" + name], function(messages) {
			d.resolve(messages);
		});

		return d.then(function(messages) {
			assert.ok(messages.test === "test");
		});
	};

	tests.testI18nPlugin = function() {
		var name = "test/i18n/nls/message2";
		define(name, [I18N_PLUGIN + "!" + name], function(bundle) {
			var result = {
				root: {
					test: "test"
				}
			};
			Object.keys(bundle).forEach(function(key) {
				if (typeof result[key] === 'undefined') {
					result[key] = bundle[key];
				}
			});
			return result;
		});

		var d = new Deferred();
		require(["i18n!" + name], function(messages) {
			d.resolve(messages);
		});

		return d.then(function(messages) {
			assert.ok(messages.test === "test");
		});
	};

	tests.testI18nService = function() {
		var name = "test/i18n/nls/message3";
		var serviceName = "test/i18n/nls/" + locale + "/message3";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {
			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						test: "test-" + locale
					};
				}
			}, {
				name: serviceName
			});

			define(name, [I18N_PLUGIN + "!" + name], function(bundle) {
				var result = {
					root: {
						test: "test"
					}
				};
				Object.keys(bundle).forEach(function(key) {
					if (typeof result[key] === 'undefined') {
						result[key] = bundle[key];
					}
				});
				return result;
			});

			require(["i18n!" + name], function(messages) {
				d.resolve(messages);
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test-" + locale);
		});
	};

	tests.testI18nMasterService = function() {
		var name = "test/i18n/nls/message4";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {
			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						root: {
							test: "test"
						}
					};
				}
			}, {
				name: name
			});

			i18nUtil.getMessageBundle(name).then(function(messages) {
				d.resolve(messages);
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test");
		});
	};

	tests.testI18nMasterAndAdditionalService = function() {
		var name = "test/i18n/nls/message5";
		var serviceName = "test/i18n/nls/" + locale + "/message5";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {
			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						root: {
							test: "test"
						}
					};
				}
			}, {
				name: name
			});

			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						test: "test-" + locale
					};
				}
			}, {
				name: serviceName
			});

			i18nUtil.getMessageBundle(name).then(function(messages) {
				d.resolve(messages);
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test-" + locale);
		});
	};

	tests.testI18nNoMasterAndAdditionalService = function() {
		var name = "test/i18n/nls/message6";
		var serviceName = "test/i18n/nls/" + locale + "/message6";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {

			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						test: "test-" + locale
					};
				}
			}, {
				name: serviceName
			});

			i18nUtil.getMessageBundle(name).then(function(messages) {
				d.resolve(messages);
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test-" + locale);
		});
	};
	
	tests.testI18nNoMasterAndRootService = function() {
		var name = "test/i18n/nls/message7";
		var serviceName = "test/i18n/nls/" + "root" + "/message7";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {

			core.serviceRegistry.registerService("orion.i18n.message", {
				getMessageBundle: function() {
					return {
						test: "test-" + locale
					};
				}
			}, {
				name: serviceName
			});

			i18nUtil.getMessageBundle(name).then(function(messages) {
				d.resolve(messages);
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test-" + locale);
		});
	};
	
	tests.testI18nMasterAndAdditionalServiceFromPlugin = function() {
		var name = "test/i18n/nls/message8";

		var d = new Deferred();
		bootstrap.startup().then(function(core) {
			core.pluginRegistry.installPlugin("testPlugin.html").then(function(plugin) {
				i18nUtil.getMessageBundle(name).then(function(messages) {
					plugin.uninstall();
					d.resolve(messages);
				});
			});
		});
		return d.then(function(messages) {
			assert.equal(messages.test, "test-" + locale);
		});
	};
	

	return tests;
});