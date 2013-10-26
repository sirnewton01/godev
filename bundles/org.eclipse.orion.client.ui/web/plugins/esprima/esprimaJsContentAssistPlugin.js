/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define*/
define([
	'orion/plugin',
	'plugins/esprima/esprimaJsContentAssist'
], function(PluginProvider, esprimaContentAssistPlugin) {

	var headers = {
		name: "Orion JavaScript Content Assist",
		version: "1.0",
		description: "This plugin provides content assist for JavaScript using the Esprima JavaScript parser."
	};
	var provider = new PluginProvider(headers);
	provider.registerServiceProvider("orion.edit.contentassist",
			new esprimaContentAssistPlugin.EsprimaJavaScriptContentAssistProvider(), {
		contentType: ["application/javascript"],
		name: "Esprima based JavaScript content assist",
		id: "orion.edit.contentassist.esprima"
	});
	provider.connect();
});