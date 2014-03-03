/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define document URL */
define([
	'orion/plugin',
	'orion/Deferred',
	'orion/commands',
	'orion/keyBinding',
	'orion/webui/littlelib',
	'orion/URL-shim'
], function(PluginProvider, Deferred, mCommands, mKeyBinding, lib) {

	var commandsProxy = new mCommands.CommandsProxy();
	
	var EDITOR_ID = "orion.viewer.image"; //$NON-NLS-0$
	
	var headers = {
		name: "Orion Image Viewer Plugin",
		version: "1.0", //$NON-NLS-0$
		description: "This plugin provides viewer for image files."
	};

	var provider = new PluginProvider(headers);

	provider.registerService("orion.edit.editor", { //$NON-NLS-0$
		setBlob: function(blob) {	
			var img = document.createElement("img"); //$NON-NLS-0$
			var url = URL.createObjectURL(blob);
			img.src = url;
			img.onload = function() {
				URL.revokeObjectURL(url);
			};
			var imageContent = document.getElementById("imagecontent"); //$NON-NLS-0$
			lib.empty(imageContent);
			imageContent.appendChild(img);
		},
		setTextModel: function(textModel) {
			
			//TODO the commands proxy should not be the text model
			commandsProxy.setProxy(textModel);
			
			// hold on to the text model
			return new Deferred();
		},
		onChanged: function(evt) {
		},
		registerKeys: function(keys) {
			var bindings = [];
			keys.forEach(function(key) {
				bindings.push(new mKeyBinding.KeyBinding(key.keyCode, key.mod1, key.mod2, key.mod3, key.mod4));			
			});
			commandsProxy.setKeyBindings(bindings);
		}
	}, {
		id: EDITOR_ID,
		"default": true, //$NON-NLS-0$
		nameKey: "Orion Image Viewer", //$NON-NLS-0$
		nls: "orion/nls/messages", //$NON-NLS-0$
		uriTemplate: "../edit/edit.html#{,Location,params*},editor=" + EDITOR_ID //$NON-NLS-0$
	});

	provider.registerService("orion.navigate.openWith", {}, { //$NON-NLS-0$
		editor: EDITOR_ID,
		contentType: ["image/gif", "image/jpeg", "image/ico", "image/png", "image/tiff", "image/svg"] //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	});

	provider.connect();
});
