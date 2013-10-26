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
/*global define*/
define([
	'orion/Deferred',
	'orion/objects',
	'orion/serviceTracker'
], function(Deferred, objects, ServiceTracker) {
	function toArray(o) {
		return Array.isArray(o) ? o : [o];
	}

	/**
	 * @name orion.edit.ASTManager
	 * @class Provides access to AST providers registered with the Service Registry.
	 * @classdesc Provides access to AST providers registered with the Service Registry.
	 * @description This class should not be instantiated directly. Instead, clients should obtain it through the Service Registry.
	 *
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.editor.InputManager} inputManager
	 */
	function ASTManager(serviceRegistry, inputManager) {
		this.serviceRegistry = serviceRegistry;
		this.inputManager = inputManager;
		this.start();
	}
	objects.mixin(ASTManager.prototype, /** @lends orion.edit.ASTManager.prototype */ {
		start: function() {
			if (this.registration) {
				throw new Error("Already started");
			}

			this.tracker = new ServiceTracker(this.serviceRegistry, "orion.core.astprovider"); //$NON-NLS-0$
			this.tracker.open();

			this.registration = this.serviceRegistry.registerService("orion.core.astmanager", this, null); //$NON-NLS-0$
			this.contextRegistration = this.serviceRegistry.registerService("orion.edit.context", {
				getAST: this.getAST.bind(this)
			}, null); //$NON-NLS-0$
		},
		stop: function() {
			this.registration.unregister();
			this.contextRegistration.unregister();
			this.tracker.close();
			this.listener = this.cachedAST = null;
		},
		/**
		 * Notifies the AST manager of a change to the model.
		 * @param {Object} event
		 */
		updated: function(event) {
			this.cachedAST = null;
		},
		/**
		 * @param {String} contentTypeId
		 * @returns {Object} An AST provider capable of providing an AST for the given contentType.
		 */
		_getASTProvider: function(contentTypeId) {
			var providers = this.tracker.getServiceReferences().filter(function(serviceRef) {
				return toArray(serviceRef.getProperty("contentType")).indexOf(contentTypeId) !== -1;
			});
			var serviceRef = providers[0];
			return serviceRef ? this.serviceRegistry.getService(serviceRef) : null;
		},
		/**
		 * @param {String} contentTypeId
		 * @returns {Object|orion.Promise}
		 */
		_getAST: function(contentTypeId, options) {
			if (this.cachedAST) {
				return this.cachedAST;
			}
			var provider = this._getASTProvider(contentTypeId);
			if (provider) {
				options.text = this.inputManager.getEditor().getText();
				return provider.computeAST(options);
			}
			return null;
		},
		/**
		 * Retrieves an AST from a capable AST provider.
		 * @param {Object} [options={}] Options to be passed to the AST provider.
		 * @returns {orion.Promise} A promise that resolves to the AST. Resolves to <code>null</code> if no capable provider was found.
		 */
		getAST: function(options) {
			options = options || {};
			var _self = this;
			var contentType = this.inputManager.getContentType(),
			    contentTypeId = contentType && contentType.id;
			return Deferred.when(this._getAST(contentTypeId, options), function(ast) {
				_self.cachedAST = ast;
				return ast;
			});
		}
	});
	return ASTManager;
});
