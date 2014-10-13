/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/plugin"], function(PluginProvider) {
	var header = {
		name: "Hover Test Plugin",
		version: "1.0", //$NON-NLS-0$
		description: "Plugin to test Hover Help",
	};
	var provider = new PluginProvider(header);


	function getHoverInfo(editor, editorContext, context) {
		var ec = editorContext;
		return  {hover: 'Remove this line', 
		title: 'Remove Line', 
		type:'text',
		text: '',
		start: 0,
		end: 10}; //"< Some JSDoc...markup? >";
	}

	var serviceImpl = {
		computeHoverInfo: function(editorContext, context) {
			return getHoverInfo(editorContext, context);
		}
	};
	var properties = {
		name: "Hover Help",
		tipTitle: "JS Docs"
	};
	provider.registerService("orion.edit.hover", serviceImpl, //$NON-NLS-0$
	properties);
	provider.connect();
});