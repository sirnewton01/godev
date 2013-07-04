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
/*jslint unused:false*/
define(['orion/assert', 'orion/Deferred', 'orion/EventTarget', 'orion/serviceregistry', 'orion/edit/syntaxmodel'],
		function(assert, Deferred, EventTarget, mServiceRegistry, SyntaxModelWirer) {
	var ServiceRegistry = mServiceRegistry.ServiceRegistry;

	function makeEventTarget(obj) {	
		EventTarget.attach(obj);
		return obj;
	}

	var tests = {};
	// Test that SyntaxModelWirer causes a listener's #setSyntaxModel method to be called when a provider
	// dispatches a modelReady event.
	tests['test SyntaxModelWirer'] = function() {
		var registry = new ServiceRegistry();
		var wirer = new SyntaxModelWirer(registry);

		var providerService = makeEventTarget({
			sendModel: function(model) {
				this.dispatchEvent({
					type: 'orion.edit.syntaxmodel.modelReady',
					contentType: 'text/foo',
					syntaxModel: model
				});
			}
		});

		var promise = new Deferred();
		var listenerService = {
			setSyntaxModel: function(model) {
				try { 
					assert.ok(model.foo);
					assert.equal(model.foo[0], 'bar');
					assert.equal(model.foo[1], 'baz');
					promise.resolve();
				} catch (e) {
					promise.reject(e);
				}
			}
		};

		registry.registerService('orion.edit.syntaxmodel.provider', providerService, {
			contentType: ['text/foo']
		});
		registry.registerService('orion.edit.syntaxmodel.listener', listenerService, {
			contentType: ['text/foo']
		});

		providerService.sendModel( {foo: ['bar', 'baz']} );
		return promise;
	};
	return tests;
});