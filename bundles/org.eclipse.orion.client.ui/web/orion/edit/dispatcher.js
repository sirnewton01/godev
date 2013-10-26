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
/*global define */
define(['orion/edit/dispatcher'], function() {
	/**
	 * @name orion.edit.Dispatcher
	 * @class Forwards events from an {@link orion.editor.Editor} to interested services.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry 
	 * @param {orion.editor.Editor} editor
	 * @param {orion.InputManger} inputManager
	 */
	function Dispatcher(serviceRegistry, editor, inputManager) {
		this.serviceRegistry = serviceRegistry;
		this.editor = editor;
		this.inputManager = inputManager;
		this.contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
		this.serviceReferences = {};

		var self = this;
		this.listener = {
			onServiceAdded: function(event) {
				self._onServiceAdded(event.serviceReference);
			},
			onServiceRemoved: function(event) {
				self._onServiceRemoved(event.serviceReference);
			}
		};
		this.serviceRegistry.addEventListener("registered", this.listener.onServiceAdded); //$NON-NLS-0$
		this.serviceRegistry.addEventListener("unregistering", this.listener.onServiceRemoved); //$NON-NLS-0$
		this._init();
	}
	Dispatcher.prototype = /** @lends orion.edit.Dispatcher.prototype */ {
		_init: function() {
			var self = this;
			if (this.editor.getTextView()) {
				this._wire(this.serviceRegistry);
			} else {
				this.editor.addEventListener("TextViewInstalled", function() { //$NON-NLS-0$
					self._wire(self.serviceRegistry);
				});
			}
		},
		_wire: function(serviceRegistry) {
			// Find registered services that are interested in this contenttype
			var serviceRefs = serviceRegistry.getServiceReferences("orion.edit.model"); //$NON-NLS-0$
			for (var i=0; i < serviceRefs.length; i++) {
				this._wireServiceReference(serviceRefs[i]);
			}
		},
		_wireServiceReference: function(serviceRef) {
			var refContentType = serviceRef.getProperty("contentType"); //$NON-NLS-0$
			if (typeof refContentType !== undefined && refContentType !== null) {
				var self = this;
				this.contentTypeService.isSomeExtensionOf(this.inputManager.getContentType(), refContentType).then(
					function(isSupported) {
						if (isSupported) {
							self._wireService(serviceRef, self.serviceRegistry.getService(serviceRef));
						}
					});
			}
		},
		_wireService: function(serviceReference, service) {
			var types = serviceReference.getProperty("types"); //$NON-NLS-0$
			var textView = this.editor.getTextView();
			if (!types) { return; }
			for (var i=0; i < types.length; i++) {
				var type = types[i];
				var method = service["on" + type]; //$NON-NLS-0$
				if (method) {
					this._wireServiceMethod(serviceReference, service, method, textView, type);
				}
			}
			this._initService(service, textView);
		},
		_wireServiceMethod: function(serviceReference, service, serviceMethod, textView, type) {
			//console.log("  Add listener " + type + " for " + serviceReference.getProperty('service.id'));
			var listener = function(event) {
				serviceMethod(event).then(/*No return value*/);
			};
			var serviceId = serviceReference.getProperty('service.id');
			this.serviceReferences[serviceId] = this.serviceReferences[serviceId] || [];
			this.serviceReferences[serviceId].push([textView, type, listener]);
			textView.addEventListener(type, listener);
		},
		_onServiceRemoved: function(serviceReference) {
			var serviceId = serviceReference.getProperty('service.id');
			var serviceReferences = this.serviceReferences[serviceId];
			if (serviceReferences) {
				for (var i=0; i < serviceReferences.length; i++) {
					var listener = serviceReferences[i];
					var textView = listener[0], type = listener[1], func = listener[2];
					//console.log("  Remove listener " + type + " for " + serviceId);
					textView.removeEventListener(type, func);
				}
				delete this.serviceReferences[serviceId];
			}
		},
		_onServiceAdded: function(serviceReference) {
			if (serviceReference.getProperty("objectClass").indexOf("orion.edit.model") !== -1) { //$NON-NLS-0$
				this._wireServiceReference(serviceReference);
			}
		},
		// Editor content may've changed before we got a chance to hook up listeners for interested services.
		// So dispatch a 'Changing' event that brings the service's empty model up to speed with the editor content.
		_initService: function(service, textView) {
			var onModelChanging = service.onModelChanging;
			if (typeof onModelChanging === "function") { //$NON-NLS-0$
				var model = textView.getModel(), text = model.getText();
				var event = {
					type: "Changing", //$NON-NLS-0$
					text: text,
					start: 0,
					removedCharCount: 0,
					addedCharCount: text.length,
					removedLineCount: 0,
					addedLineCount: model.getLineCount()
				};
				onModelChanging.call(service, event);
			}
		}
	};
	return {Dispatcher: Dispatcher};
});