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
/*eslint-env browser, amd, mocha*/
define([
	'js-tests/editor/mockEditor',
	'chai/chai',
	'orion/Deferred',
	'orion/edit/dispatcher',
	'orion/contentTypes',
	'orion/serviceregistry'
], function(MockEditor, chai, Deferred, mDispatcher, mContentTypes, mServiceRegistry) {
	var assert = chai.assert;

	function setup() {
		var serviceRegistry = new mServiceRegistry.ServiceRegistry(),
		    editor = new MockEditor();
		var inputManager = {
			getContentType: function() {
				return this.contentType;
			},
			setContentType: function(value) {
				this.contentType = value;
			}
		};
		editor.install();
		serviceRegistry.registerService("orion.core.contenttype", {}, {
			contentTypes:[
				{ id: "text/foo" },
				{ id: "text/bar" }
			]
		});
		return {
			contentTypeRegistry: new mContentTypes.ContentTypeRegistry(serviceRegistry),
			dispatcher: new mDispatcher.Dispatcher(serviceRegistry, editor, inputManager),
			inputManager: inputManager,
			editor: editor,
			serviceRegistry: serviceRegistry
		};
	}

	describe("EditDispatcher Test", function() {
		/**
		 * Tests that the initial text of the editor is supplied to the orion.edit.model service
		 * via an onModelChanging event.
		 */
		it("onModelChanging_method_called", function() {
			var result = setup(),
			    contentTypeRegistry = result.contentTypeRegistry,
			    editor = result.editor,
			    inputManager = result.inputManager,
			    serviceRegistry = result.serviceRegistry;
			var d = new Deferred();
			inputManager.setContentType(contentTypeRegistry.getContentType("text/foo"));
			serviceRegistry.registerService("orion.edit.model", {
					onModelChanging: function(event) {
						assert.equal(event.text, "hi");
						d.resolve();
					}
				}, {
					contentType: ["text/foo"],
				});
			editor.setText("hi");
			return d;
		});
	});
	// TODO test: listeners should be refreshed after input manager's content type changes
});
