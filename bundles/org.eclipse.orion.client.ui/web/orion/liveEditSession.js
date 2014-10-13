/******************************************************************************* 
 * @license
 * Copyright (c) 2014 Pivotal Software Inc. and others
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Pivotal Software Inc. - initial API and implementation 
 ******************************************************************************/
/*eslint-env amd, browser*/
define([
	'orion/Deferred',
	'orion/edit/editorContext'
], function(Deferred, EditorContext) {

	var resource;
	var services = [];
//	var previousEditSession;

	function handleError(err) {
		return err instanceof Error ? err : new Error(err);
	}

	/**
	 * @name orion.LiveEditSession
	 * @class Provides access to validation services registered with the service registry.
	 * @description Provides access to validation services registered with the service registry.
	 */
	function LiveEditSession(serviceRegistry, editor) {
		this.registry = serviceRegistry;
		this.editor = editor;
	}

	LiveEditSession.prototype = /** @lends orion.LiveEditSession.prototype */ {
		/**
		 * Looks up applicable live edit sessions, calls them to pass editor context to services.
		 */
		start: function (contentType, title) {
			function getLiveEditors(registry, contentType) {
				var contentTypeService = registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				function getFilteredLiveEditSession(liveEditSession, contentType) {
					var contentTypeIds = liveEditSession.getProperty("contentType"); //$NON-NLS-0$
					return contentTypeService.isSomeExtensionOf(contentType, contentTypeIds).then(function(result) {
						return result ? liveEditSession : null;
					});
				}
				var liveEditSessions = registry.getServiceReferences("orion.edit.live"); //$NON-NLS-0$
				var filteredLiveEditSessions = [];
				for (var i=0; i < liveEditSessions.length; i++) {
					var serviceReference = liveEditSessions[i];
					if (serviceReference.getProperty("contentType")) { //$NON-NLS-0$
						filteredLiveEditSessions.push(getFilteredLiveEditSession(serviceReference, contentType));
					}
				}
				// Return a promise that gives the live edit sessions that aren't null
				return Deferred.all(filteredLiveEditSessions, handleError).then(function(liveEditSessions) {
					var capableLiveEditSessions = [];
					for (var i=0; i < liveEditSessions.length; i++) {
						var liveEdit = liveEditSessions[i];
						if (liveEdit && !(liveEdit instanceof Error)) {
							capableLiveEditSessions.push(liveEdit);
						}
					}
					return capableLiveEditSessions;
				});
			}

			if (resource !== title) {
				if (services) {
					services.forEach(function(service) {
						service.endEdit(resource);
					});
				}
				services = [];
				resource = title;
				if (!contentType) {
					return;
				}
				var serviceRegistry = this.registry;
				getLiveEditors(serviceRegistry, contentType).then(function(liveEditors) {
					var editSessionPromises = liveEditors.map(function(liveEditor) {
						var service = serviceRegistry.getService(liveEditor);
						if (service.startEdit) {
							var context = {
								contentType: contentType.id,
								title: title
							};
							services.push(service);
							var editorContext = EditorContext.getEditorContext(serviceRegistry);
							return service.startEdit(editorContext, context);
						}
					});

					/*previousEditSession =*/ Deferred.all(editSessionPromises, handleError);
				});
			}
		}
	};

	return LiveEditSession;
});