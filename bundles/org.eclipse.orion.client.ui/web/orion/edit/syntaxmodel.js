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
/*global console define*/
define(['orion/serviceTracker'], function(ServiceTracker) {
	var LISTENER_SERVICE = 'orion.edit.syntaxmodel.listener'; //$NON-NLS-0$
	var PROVIDER_SERVICE = 'orion.edit.syntaxmodel.provider'; //$NON-NLS-0$

	function getContentTypeProperty(serviceReference) {
		var contentTypes = serviceReference.getProperty('contentType'); //$NON-NLS-0$
		return contentTypes ? (Array.isArray(contentTypes) ? contentTypes : [contentTypes]) : null;
	}

	function put(map, key, value) {
		var values = map[key];
		if (!values) {
			map[key] = [value];
		} else {
			values.push(value);
		}
	}

	function get(map, key) {
		return map.hasOwnProperty(key) ? map[key] : null;
	}

	/**
	 * Wires 'orion.edit.syntaxmodel.provider' services to 'orion.edit.syntaxmodel.listener' services.
	 * When a Syntax Model Provider dispatches a 'orion.edit.sytaxmodel' event, we pass the model to every registered Syntax Model Listener.
	 */
	function SyntaxModelWirer(serviceRegistry) {
		var contentTypesMap = this.contentTypesMap = {}; // content type id {String} -> syntaxmodel listeners {Service[]}
		var listenerTracker = new ServiceTracker(serviceRegistry, LISTENER_SERVICE);
		var providerTracker = new ServiceTracker(serviceRegistry, PROVIDER_SERVICE);
		var notifySyntaxModelListeners = this.notifySyntaxModelListeners.bind(this);
		listenerTracker.addingService = function(ref) {
			var service = serviceRegistry.getService(ref);
			var contentTypes = getContentTypeProperty(ref);
			if (contentTypes) {
				contentTypes.forEach(function(contentTypeId) {
					put(contentTypesMap, contentTypeId, service);
				});
			}
		};
		listenerTracker.removedService = function(ref, service) {
			var contentTypes = getContentTypeProperty(ref);
			if (contentTypes) {
				contentTypes.forEach(function(contentType) {
					var listeners = get(contentTypesMap, contentType.id);
					var serviceIndex = listeners.indexOf(service);
					if (serviceIndex !== -1) {
						listeners.splice(serviceIndex, 1);
					}
				});
			}
		};
		providerTracker.addingService = function(ref) {
			var service = serviceRegistry.getService(ref);
			var contentTypes = getContentTypeProperty(ref);
			if (contentTypes) {
				if (typeof service.addEventListener !== 'function') {
					console.log(new Error('A ' + PROVIDER_SERVICE + ' service must provide an "addEventListener" method'));
				} else {
					service.addEventListener('orion.edit.syntaxmodel.modelReady', notifySyntaxModelListeners); //$NON-NLS-0$
				}
			}
		};
		providerTracker.removedService = function(ref, service) {
			if (service && typeof service.removeEventListener === 'function') {
				service.removeEventListener('orion.edit.syntaxmodel.modelReady', notifySyntaxModelListeners); //$NON-NLS-0$
			}
		};
		listenerTracker.open();
		providerTracker.open();
	}
	/**
	 * Notify all interested syntax model listeners of this SyntaxModelReadyEvent.
	 */
	SyntaxModelWirer.prototype.notifySyntaxModelListeners = function(syntaxModelReadyEvent) {
		var contentType = syntaxModelReadyEvent.contentType;
		var syntaxModel = syntaxModelReadyEvent.syntaxModel;
		if (typeof contentType !== 'string') { //$NON-NLS-0$
			console.log(new Error('SyntaxModelReadyEvent must provide a "contentType" field'));
			return;
		}
		var listeners = get(this.contentTypesMap, contentType);
		if (listeners) {
			listeners.forEach(function(listener) {
				listener.setSyntaxModel(syntaxModel);
			});
		}
	};
	return SyntaxModelWirer;
});