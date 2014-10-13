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
/*eslint-env browser, amd, mocha*/
define([
	"chai/chai",
	"orion/serviceregistry",
	"orion/EventTarget",
	"mocha/mocha",
], function(chai, mServiceRegistry, EventTarget) {
	var assert = chai.assert;

	describe("serviceregistry", function() {
		it("should register and get service", function() {
			var count = 0;
	
			var registry = new mServiceRegistry.ServiceRegistry();
			var registration = registry.registerService("testRegister", {
				test: function() {
					return count + 1;
				}
			}, {
				test: 1
			});
			var reference = registration.getReference();
			assert.equal("testRegister", reference.getProperty("objectClass")[0]);
			assert.equal(1, reference.getProperty("test"));
	
			assert.equal(count, 0);
			var service1 = registry.getService("testRegister");
			var service2;
	
			return service1.test().then(function(newcount) {
				count = newcount;
			}).then(function() {
				assert.equal(count, 1);
			}).then(function() {
				service2 = registry.getService(reference);
				return service2.test();
			}).then(function(newcount) {
				count = newcount;
			}).then(function() {
				assert.equal(count, 2);
			}).then(function() {
				assert.equal(service1, service2);
				registration.unregister();
				return service2.test();
			}).then(assert.fail, function(){});
		});
	
		it("should register and unregister multiple services", function() {
			var count = 0;
			var serviceRegistry = new mServiceRegistry.ServiceRegistry();
	
			assert.equal(serviceRegistry.getServiceReferences().length, 0);
			var registration1 = serviceRegistry.registerService("testRegister", {
				test: function() {
					return count + 1;
				}
			}, {
				test: 1
			});
			assert.equal(serviceRegistry.getServiceReferences().length, 1);
	
			var registration2 = serviceRegistry.registerService("testRegister", {
				test: function() {
					return count + 1;
				}
			}, {
				test: 2
			});
			assert.equal(serviceRegistry.getServiceReferences().length, 2);
	
			var registration3 = serviceRegistry.registerService("testRegister_different", {
				test: function() {
					return count + 1;
				}
			}, {
				test: 3
			});
	
			assert.equal(serviceRegistry.getServiceReferences("testRegister").length, 2);
			assert.equal(serviceRegistry.getServiceReferences("testRegister_different").length, 1);
			assert.equal(serviceRegistry.getServiceReferences().length, 3);
	
			registration1.unregister();
			assert.equal(serviceRegistry.getServiceReferences("testRegister").length, 1);
			assert.equal(serviceRegistry.getServiceReferences("testRegister_different").length, 1);
			assert.equal(serviceRegistry.getServiceReferences().length, 2);
	
			registration2.unregister();
			assert.equal(serviceRegistry.getServiceReferences("testRegister").length, 0);
			assert.equal(serviceRegistry.getServiceReferences("testRegister_different").length, 1);
			assert.equal(serviceRegistry.getServiceReferences().length, 1);
	
			registration3.unregister();
			assert.equal(serviceRegistry.getServiceReferences("testRegister").length, 0);
			assert.equal(serviceRegistry.getServiceReferences("testRegister_different").length, 0);
			assert.equal(serviceRegistry.getServiceReferences().length, 0);
	
		});
	
		it("should emit events", function() {
			var count = 0;
			var serviceAddedCount = 0;
			var serviceRemovedCount = 0;
			var eventResult;
	
			var registry = new mServiceRegistry.ServiceRegistry();
			var sahandler = function() {
				serviceAddedCount++;
			};
			var srhandler = function() {
				serviceRemovedCount++;
			};
			registry.addEventListener("registered", sahandler);
			registry.addEventListener("unregistering", srhandler);
	
			assert.equal(0, serviceAddedCount);
			assert.equal(0, serviceRemovedCount);
			var impl = {
				test: function() {
					return count + 1;
				}
			};
			var eventTarget = new EventTarget();
			impl.dispatchEvent = eventTarget.dispatchEvent.bind(eventTarget);
			impl.addEventListener = eventTarget.addEventListener.bind(eventTarget);
			impl.removeEventListener = eventTarget.removeEventListener.bind(eventTarget);
	
			var registration = registry.registerService(["testEvents"], impl);
			assert.equal(1, serviceAddedCount);
			assert.equal(0, serviceRemovedCount);
	
			var service = registry.getService(registration.getReference());
			var eventHandler = function(event) {
				eventResult = event.result;
			};
			service.addEventListener("event", eventHandler);
			assert.equal(null, eventResult);
			impl.dispatchEvent({
				type: "nonevent",
				result: "bad"
			});
			assert.equal(null, eventResult);
			impl.dispatchEvent({
				type: "event",
				result: "good"
			});
			assert.equal("good", eventResult);
			service.removeEventListener("event", eventHandler);
			impl.dispatchEvent({
				type: "event",
				result: "bad"
			});
			assert.equal("good", eventResult);
	
			registration.unregister();
			assert.equal(1, serviceAddedCount);
			assert.equal(1, serviceRemovedCount);
		});
	
		it("should resolve on success", function() {
			var registry = new mServiceRegistry.ServiceRegistry();
			var impl = {
				testSuccess: function() {
					return "success";
				}
			};
	
			registry.registerService(["testSuccess"], impl);
			return registry.getService("testSuccess").testSuccess().then(function(success) {
				assert.ok(success === "success");
			}, function(error) {
				assert.fail("testSuccess() should have fulfilled");
			});
		});
	
		it("should reject on error", function() {
			var registry = new mServiceRegistry.ServiceRegistry();
			var impl = {
				testError: function() {
					throw new Error("helloerror");
				}
			};
	
			registry.registerService(["testError"], impl);
			return registry.getService("testError").testError().then(function() {
				assert.fail("testError() should have rejected");
			}, function(error) {
				assert.ok(error instanceof Error, "error is Error");
				assert.ok(error.toString().indexOf("helloerror") !== -1, "has a sensible toString()");
			});
		});
	
		it("should provide service objects", function() {
			var registry = new mServiceRegistry.ServiceRegistry();
			var test = {
				test: function() {
					return "test";
				}
			};
			registry.registerService(["test"], test);
	
			var impl = {
				testServiceObject: function(service) {
					return service.test();
				}
			};
	
			registry.registerService(["testServiceObject"], impl);
			return registry.getService("testServiceObject").testServiceObject(registry.getService("test")).then(function(result) {
				assert.ok(result === "test");
			}, function(error) {
				assert.fail("test should have fulfilled");
			});
		});
	});
});