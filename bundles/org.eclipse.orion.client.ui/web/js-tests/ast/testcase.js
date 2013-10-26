/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
define([
	'js-tests/editor/mockEditor',
	'orion/assert',
	'orion/edit/ast',
	'orion/Deferred',
	'orion/EventTarget',
	'orion/inputManager',
	'orion/objects',
	'orion/serviceregistry'
], function(MockEditor, assert, ASTManager, Deferred, EventTarget, mInputManager, objects, mServiceRegistry) {
	var InputManager = mInputManager.InputManager,
	    ServiceRegistry = mServiceRegistry.ServiceRegistry;

	function setup() {
		var serviceRegistry = new ServiceRegistry();
		var inputManager = new InputManager({
			serviceRegistry: serviceRegistry,
			editor: new MockEditor()
		});
		var astManager = new ASTManager(serviceRegistry, inputManager);
		inputManager.getEditor().installTextView();
		inputManager.getEditor().getModel().addEventListener("Changed", astManager.updated.bind(astManager)); //$NON-NLS-0$
		return {
			serviceRegistry: serviceRegistry,
			inputManager: inputManager,
			astManager: astManager
		};
	}

	var tests = {};
	tests.test_getAST = function() {
		var result = setup(),
		    serviceRegistry = result.serviceRegistry,
		    inputManager = result.inputManager;

		serviceRegistry.registerService("orion.core.astprovider", {
				computeAST: function(context) {
					return { ast: "this is the AST" };
				}
			}, { contentType: ["text/foo"] });

		inputManager.setContentType({ id: "text/foo" });
		return serviceRegistry.getService("orion.core.astmanager").getAST().then(function(ast) {
			assert.equal(ast.ast, "this is the AST");
		});
	};
	tests.test_getAST_options = function() {
		var result = setup(),
		    serviceRegistry = result.serviceRegistry,
		    inputManager = result.inputManager;

		var promise = new Deferred();
		serviceRegistry.registerService("orion.core.astprovider", {
				computeAST: function(options) {
					assert.equal(options.foo, "bar");
					assert.equal(options.text, "the text");
					promise.resolve();
				}
			}, { contentType: ["text/foo"] });

		inputManager.setContentType({ id: "text/foo" });
		inputManager.getEditor().setText("the text");
		serviceRegistry.getService("orion.core.astmanager").getAST({ foo: "bar" });
		return promise;
	};
	tests.test_AST_cache_is_used = function() {
		var result = setup(),
		    serviceRegistry = result.serviceRegistry,
		    inputManager = result.inputManager;

		var i = 0;
		serviceRegistry.registerService("orion.core.astprovider", {
				computeAST: function(options) {
					return "AST " + (i++);
				}
			}, { contentType: ["text/foo"] });

		inputManager.setContentType({ id: "text/foo" });

		var astManager = serviceRegistry.getService("orion.core.astmanager");
		return astManager.getAST().then(function(ast) {
			assert.equal(ast, "AST 0");
		}).then(function() {
			return astManager.getAST().then(function(ast) {
				assert.equal(ast, "AST 0");
			});
		});
	};
	tests.test_AST_cache_is_invalidated = function() {
		var result = setup(),
		    serviceRegistry = result.serviceRegistry,
		    inputManager = result.inputManager;

		var i = 0;
		serviceRegistry.registerService("orion.core.astprovider", {
				computeAST: function(options) {
					return "AST " + (i++);
				}
			}, { contentType: ["text/foo"] });

		inputManager.setContentType({ id: "text/foo" });

		var astManager = serviceRegistry.getService("orion.core.astmanager");
		return astManager.getAST().then(function(ast) {
			assert.equal(ast, "AST 0");
			// Ensure we do not receive the cached "AST 0" after a model change
			inputManager.getEditor().setText("zot");
			return astManager.getAST().then(function(ast) {
				assert.strictEqual(ast, "AST 1");
			});
		});
	};

	return tests;
});