/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define ([
	'orion/extensionCommands', //$NON-NLS-0$
	'orion/PageLinks', //$NON-NLS-0$
	'orion/URITemplate', //$NON-NLS-0$
	'orion/edit/editorContext'//$NON-NLS-0$
], function(mExtensionCommands, PageLinks, URITemplate, EditorContext) {
	
	function getBlamer(serviceRegistry, inputManager) {
		var metadata = inputManager.getFileMetadata();
		var blamers = serviceRegistry.getServiceReferences("orion.edit.blamer"); //$NON-NLS-0$
		for (var i=0; i < blamers.length; i++) {
			var serviceReference = blamers[i];
			var info = {};
			info.validationProperties = serviceReference.getProperty("validationProperties"); //$NON-NLS-0$
			info.forceSingleItem = true;
			var validator = mExtensionCommands._makeValidator(info, serviceRegistry);
			if (validator.validationFunction.bind(validator)(metadata)) {
				return serviceRegistry.getService(serviceReference);
			}
		}
		return null;
	}

	function isVisible(serviceRegistry, inputManager) {
		return !!getBlamer(serviceRegistry, inputManager) && !!serviceRegistry.getService("orion.core.blame"); //$NON-NLS-1$ //$NON-NLS-0$
	}

	function getBlame(serviceRegistry, inputManager){
		var service = getBlamer(serviceRegistry, inputManager);
		if (service) {
			var handleResult = function(results) {
				var orionHome = PageLinks.getOrionHome();
				for (var i=0; i<results.length; i++) {
					var range = results[i];
					var uriTemplate = new URITemplate(range.CommitLink);
					var params = {};
					params.OrionHome = orionHome;
					range.CommitLink = uriTemplate.expand(params);
				}
				serviceRegistry.getService("orion.core.blame")._setAnnotations(results); //$NON-NLS-0$
			};
			if (service.computeBlame) {
				var context = {metadata: inputManager.getFileMetadata()};
				service.computeBlame(EditorContext.getEditorContext(serviceRegistry), context).then(handleResult);
			} else {
				service.doBlame(inputManager.getInput()).then(handleResult);
			}
		}
	}
	return {isVisible: isVisible, getBlame: getBlame}; 
});


