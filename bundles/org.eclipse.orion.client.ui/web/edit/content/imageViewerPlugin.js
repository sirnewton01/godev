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
/*eslint-env browser, amd*/
/*global URL*/
define([
	'orion/plugin',
	'orion/Deferred',
	'orion/commands',
	'orion/keyBinding',
	'orion/webui/littlelib',
	'orion/URL-shim'
], function(PluginProvider, Deferred, mCommands, mKeyBinding, lib) {
	var TITLE_H = 25;
	var MIN_MARGIN_X = 20;
	var MIN_MARGIN_Y = TITLE_H + MIN_MARGIN_X;
	var MIN_CONTAINER_SIZE = 20;
	var img = null;
	var imgW = MIN_CONTAINER_SIZE;
	var imgH = MIN_CONTAINER_SIZE;
	
	function resizeImage() {
		if(!img) {
			return;
		}
		var width = document.documentElement.clientWidth;
		var height = document.documentElement.clientHeight;
		
		var containerW = width - MIN_MARGIN_X*2;
		var containerH = height - MIN_MARGIN_Y*2;
		if(containerW < MIN_CONTAINER_SIZE) {
			containerW = MIN_CONTAINER_SIZE;
		}
		if(containerH < MIN_CONTAINER_SIZE) {
			containerH = MIN_CONTAINER_SIZE;
		}
		var imgRatio = (imgW > 0 && imgH > 0) ? imgW/imgH : 1;
		var containerRatio = containerW/containerH;
		//var newImgW, newImgH;
		if(imgRatio >= containerRatio) {
			img.width = containerW < imgW ? containerW : imgW;
			img.height = img.width/imgRatio;
		} else {
			img.height = containerH < imgH ? containerH : imgH;
			img.width = img.height*imgRatio;
		}
		var imageContainer = document.getElementById("imageContainer"); //$NON-NLS-0$
		imageContainer.style.left = (width - img.width)/2 + "px";
		imageContainer.style.top = (height - img.height)/2 - TITLE_H + "px";
		
		var imageTile = document.getElementById("imageTitle"); //$NON-NLS-0$
		lib.empty(imageTile);
		imageTile.appendChild(document.createTextNode(imgW + " x " + imgH + " pixels -- " + Math.floor(img.width/imgW*100) + "%"));
	}
	window.onresize = resizeImage;
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
			img = document.createElement("img"); //$NON-NLS-0$
			var url = URL.createObjectURL(blob);
			img.src = url;
			img.onload = function() {
				URL.revokeObjectURL(url);
				imgW = img.width;
				imgH = img.height;
				resizeImage();
			};
			var imageContent = document.getElementById("imageContent"); //$NON-NLS-0$
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
