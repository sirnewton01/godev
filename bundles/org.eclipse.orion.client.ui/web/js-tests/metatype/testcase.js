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
/*global define*/
define(['orion/assert', 'orion/Deferred', 'orion/testHelpers', 'orion/serviceregistry', 'orion/metatype'],
		function(assert, Deferred, testHelpers, mServiceRegistry, mMetaType) {
	var METATYPE_SERVICE = 'orion.cm.metatype';

	var serviceRegistry, metaTypeRegistry;
	var setUp = function(storage) {
		var d = new Deferred();
		serviceRegistry = new mServiceRegistry.ServiceRegistry();
		metaTypeRegistry = new mMetaType.MetaTypeRegistry(serviceRegistry);
		d.resolve();
		return d;
	},
	tearDown = function() {
		serviceRegistry = null;
		metaTypeRegistry = null;
	},
	makeTest = function(body) {
		return testHelpers.makeTest(setUp, tearDown, body);
	};

	var tests = {};
	tests['test reject ObjectClassDefinition with no properties'] = makeTest(function() {
		serviceRegistry.registerService(METATYPE_SERVICE, {},
			{	classes: [
					{	id: 'myclass'
					}
				],
				designates: [
					{	pid: 'mypid',
						classId: 'myclass'
					}
				]
			});
		// myclass has no propertes and so should've been rejected
		assert.ok(!metaTypeRegistry.getObjectClassDefinitionForPid('mypid'), 'Expected no ObjectClassDefinition');
	});
	tests['test contribute barebones ObjectClassDefinition'] = makeTest(function() {
		serviceRegistry.registerService(METATYPE_SERVICE, {},
			{	classes: [
					{	id: 'myclass',
						properties: [
							{	id: 'myprop0'
							}
						]
					}
				],
				designates: [
					{	pid: 'mypid',
						classId: 'myclass'
					}
				]
			});
		var ocd = metaTypeRegistry.getObjectClassDefinitionForPid('mypid');
		assert.ok(!!ocd);
		assert.strictEqual(ocd.getId(), 'myclass');
		var props = ocd.getAttributeDefinitions();
		assert.strictEqual(props.length, 1);
		assert.ok(!!props[0]);
		assert.strictEqual(props[0].getId(), 'myprop0');
		assert.strictEqual(props[0].getName(), null);
		assert.strictEqual(props[0].getType(), 'string');
	});
	tests['test contribute bigger ObjectClassDefinition'] = makeTest(function() {
		serviceRegistry.registerService(METATYPE_SERVICE, {},
			{	classes: [
					{	id: 'myclass',
						name: 'My Class',
						properties: [
							{	id: 'myprop0',
								name: 'Property 0',
								type: 'number'
							},
							{	id: 'myprop1',
								name: 'Property 1',
								type: 'boolean',
								options: [
									{value: true,  label: 'Option A'},
									{value: false, label: 'Option B'}
								]
							}
						]
					}
				],
				designates: [
					{	pid: 'mypid',
						classId: 'myclass'
					}
				]
			});
		var ocd = metaTypeRegistry.getObjectClassDefinitionForPid('mypid');
		assert.ok(!!ocd);
		assert.strictEqual(ocd.getId(), 'myclass');
		assert.strictEqual(ocd.getName(), 'My Class');
		var props = ocd.getAttributeDefinitions();
		assert.strictEqual(props.length, 2);
		assert.ok(!!props[0]);
		assert.strictEqual(props[0].getId(), 'myprop0');
		assert.strictEqual(props[0].getName(), 'Property 0');
		assert.strictEqual(props[0].getType(), 'number');
		assert.ok(!!props[1]);
		assert.strictEqual(props[1].getId(), 'myprop1');
		assert.strictEqual(props[1].getName(), 'Property 1');
		assert.strictEqual(props[1].getType(), 'boolean');
		assert.deepEqual(props[1].getOptionLabels(), ['Option A', 'Option B']);
		assert.deepEqual(props[1].getOptionValues(), [true, false]);
	});
	tests['test register & unregister separately'] = makeTest(function() {
		serviceRegistry.registerService(METATYPE_SERVICE, {},
			{	classes: [
					{	id: 'myclass',
						properties: [
							{	id: 'myprop0'
							}
						]
					}
				]
			});
		assert.ok(!metaTypeRegistry.getObjectClassDefinitionForPid('mypid'));
		var designateRegistration = serviceRegistry.registerService(METATYPE_SERVICE, {},
			{	designates: [
					{	pid: 'mypid',
						classId: 'myclass'
					}
				]
			});
		assert.ok(metaTypeRegistry.getObjectClassDefinitionForPid('mypid'));
		designateRegistration.unregister();
		assert.ok(!metaTypeRegistry.getObjectClassDefinitionForPid('mypid'));
	});
	return tests;
});