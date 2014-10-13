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
	'orion/serviceregistry',
	'orion/metatype',
	'orion/settings/settingsRegistry',
], function(chai, mServiceRegistry, mMetaType, SettingsRegistry) {
	var assert = chai.assert;
	var SETTING_SERVICE = 'orion.core.setting';
	var METATYPE_SERVICE = 'orion.cm.metatype';

	var serviceRegistry, metaTypeRegistry, settingsRegistry;

	var setUp = function() {
		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		metaTypeRegistry = new mMetaType.MetaTypeRegistry(serviceRegistry);
		settingsRegistry = new SettingsRegistry(serviceRegistry, metaTypeRegistry);
	},
	tearDown = function() {
		serviceRegistry = null;
		metaTypeRegistry = null;
	};

	describe("Settings Registry", function() {
		beforeEach(setUp);
		afterEach(tearDown);

		it("should enable setting to reference existing ObjectClassDefinition", function() {
			serviceRegistry.registerService(METATYPE_SERVICE, {},
				{	classes: [
						{	id: 'myclass',
							properties: [
								{	id: 'prop1' },
								{	id: 'prop2' }
							]
						}
					]
				});
			var serviceRegistration = serviceRegistry.registerService(SETTING_SERVICE, {},
				{	settings: [
						{	pid: 'mysetting',
							classId: 'myclass'
						}
					]
				});
			var settings = settingsRegistry.getSettings();
			assert.equal(settings.length, 1);
			assert.equal(settings[0].getPid(), 'mysetting');
			assert.equal(settings[0].getObjectClassDefinitionId(), 'myclass');
			assert.equal(settings[0].getName(), null);
			var objectClass = metaTypeRegistry.getObjectClassDefinitionForPid('mysetting');

			assert.equal(objectClass.getId(), 'myclass', 'ObjectClassDefinition is designated for setting\'s PID');
			assert.equal(objectClass.getAttributeDefinitions().length, 2);
			assert.equal(objectClass.getAttributeDefinitions()[0].getId(), 'prop1');
			assert.equal(objectClass.getAttributeDefinitions()[1].getId(), 'prop2');

			// Ensure setting.getAttributeDefinitions() has the same attribute definitions as the OCD.
			assert.equal(settings[0].getAttributeDefinitions().length, 2);
			assert.equal(settings[0].getAttributeDefinitions()[0].getId(), 'prop1');
			assert.equal(settings[0].getAttributeDefinitions()[1].getId(), 'prop2');

			serviceRegistration.unregister();
			assert.equal(settingsRegistry.getSettings().length, 0);
			assert.ok(!metaTypeRegistry.getObjectClassDefinitionForPid('mysetting'), 'ObjectClassDefinition no longer designated for PID');
		});
		it("setting with implicit MetaType", function() {
			var serviceRegistration = serviceRegistry.registerService(SETTING_SERVICE, {},
				{	settings: [
						{	pid: 'mysetting',
							name: 'My great setting',
							properties: [
								{	id: 'foo' },
								{	id: 'bar' }
							]
						}
					]
				});

			var settings = settingsRegistry.getSettings();
			assert.equal(settings.length, 1);
			assert.equal(settings[0].getPid(), 'mysetting');
			assert.equal(settings[0].getName(), 'My great setting');
			var objectClassId = settings[0].getObjectClassDefinitionId();
			var objectClass = metaTypeRegistry.getObjectClassDefinitionForPid('mysetting');
			assert.ok(objectClass, 'Setting\'s PID is designated');
	
			assert.equal(objectClass.getId(), objectClassId);
			assert.equal(objectClass.getAttributeDefinitions().length, 2);
			assert.equal(objectClass.getAttributeDefinitions()[0].getId(), 'foo');
			assert.equal(objectClass.getAttributeDefinitions()[1].getId(), 'bar');
	
			assert.equal(settings[0].getAttributeDefinitions().length, 2);
			assert.equal(settings[0].getAttributeDefinitions()[0].getId(), 'foo');
			assert.equal(settings[0].getAttributeDefinitions()[1].getId(), 'bar');
	
			serviceRegistration.unregister();
			assert.equal(settingsRegistry.getSettings().length, 0);
			assert.ok(!metaTypeRegistry.getObjectClassDefinitionForPid('mysetting'), 'Setting\'s PID no longer designated');
			assert.ok(!metaTypeRegistry.getObjectClassDefinition(objectClassId), 'ObjectClassDefinition was removed');
		});
		it("should let settings be categorized", function() {
			var serviceRegistration1 = serviceRegistry.registerService(SETTING_SERVICE, {},
				{	settings: [
						{	pid: 'mypid1',
							category: 'cat',
							properties: [
								{	id: 'prop' }
							]
						},
						{	pid: 'mypid2',
							category: 'dog',
							properties: [
								{	id: 'prop' }
							]
						},
						{	pid: 'mypid3',
							category: 'cat',
							properties: [
								{	id: 'prop' }
							]
						}
					]
				});
			/*var serviceRegistration2 =*/ serviceRegistry.registerService(SETTING_SERVICE, {},
				{	settings: [
						{	pid: 'mypid4',
							category: 'cat',
							properties: [
								{	id: 'prop' }
							]
						}
					]
				});

			var settings = settingsRegistry.getSettings();
			assert.equal(settings.length, 4);
			assert.deepEqual(settingsRegistry.getCategories().sort(), ['cat', 'dog'].sort());
			var catSettings = settingsRegistry.getSettings('cat');
			var dogSettings = settingsRegistry.getSettings('dog');

			assert.equal(catSettings.length, 3);
			assert.equal(catSettings[0].getPid(), 'mypid1');
			assert.equal(catSettings[1].getPid(), 'mypid3');
			assert.equal(catSettings[2].getPid(), 'mypid4');

			assert.equal(dogSettings.length, 1);
			assert.equal(dogSettings[0].getPid(), 'mypid2');

			serviceRegistration1.unregister();
			assert.deepEqual(settingsRegistry.getCategories(), ['cat']);
			assert.equal(settingsRegistry.getSettings('cat').length, 1);
			assert.equal(settingsRegistry.getSettings('dog').length, 0);
		});
		it("#isDefaults", function() {
			serviceRegistry.registerService(SETTING_SERVICE, {}, {
					settings: [{
						pid: "mysetting",
						name: "My Setting",
						properties: [
							{ id: "a", type: "number", defaultValue: 5 },
							{ id: "b", type: "string", defaultValue: "hi" }
						]
					}]
				});
			var setting = settingsRegistry.getSettings()[0];
			// 1 argument
			assert.equal(setting.isDefaults({ a: 0 }), false);
			assert.equal(setting.isDefaults({ a: 0, b: ":D" }), false);
			assert.equal(setting.isDefaults({ }), true, "Empty map should be considered as default");
			assert.equal(setting.isDefaults({ a: 5, b: "hi" }), true);
			// 2 arguments -- 2nd arg should override default values set in the setting definition
			var realDefaults = { a: 0, b: "foo"};
			assert.equal(setting.isDefaults({ a: 99, b: "bar"}, realDefaults), false);
			assert.equal(setting.isDefaults({ }, realDefaults), true);
			assert.equal(setting.isDefaults({ a: 0 }, realDefaults), true);
			assert.equal(setting.isDefaults({ b: "foo" }, realDefaults), true);
			assert.equal(setting.isDefaults({ a: 0, b: "foo" }, realDefaults), true);
		});
	}); // SettingsRegistry
});