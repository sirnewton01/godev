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
/*global define */
define([
	"orion/assert",
	"orion/serviceRegistry",
	"orion/serviceTracker"
], function(assert, mServiceRegistry, ServiceTracker) {
	var ServiceRegistry = mServiceRegistry.ServiceRegistry;

	var tests = {};
	tests.test_close = function() {
		var serviceRegistry = new ServiceRegistry();
		var tracker = new ServiceTracker(serviceRegistry, "someObjectClass");
		tracker.open();

		serviceRegistry.registerService("someObjectClass", { method: function() {} }, { foo: "bar" });

		tracker.close();
		assert.equal(tracker.getServiceReferences(), null);
	};
	tests.test_getServiceReferences = function() {
		var serviceRegistry = new ServiceRegistry();
		var tracker = new ServiceTracker(serviceRegistry, "someObjectClass");
		tracker.open();

		assert.equal(tracker.getServiceReferences(), null);

		var registration = serviceRegistry.registerService("someObjectClass", { method: function() {} }, { foo: "bar" });
		var refs = tracker.getServiceReferences();
		assert.equal(refs.length, 1);
		assert.equal(refs[0].getProperty("foo"), "bar");
		assert.equal(typeof serviceRegistry.getService(refs[0]).method, "function");

		registration.unregister();
		assert.equal(tracker.getServiceReferences(), null);
	};
	tests.test_getServiceReferencesEarlyRegistration = function() {
		var serviceRegistry = new ServiceRegistry();
		serviceRegistry.registerService("someObjectClass", {}, null);

		var tracker = new ServiceTracker(serviceRegistry, "someObjectClass");
		tracker.open();

		assert.equal(tracker.getServiceReferences().length, 1);
	};
	return tests;
});
