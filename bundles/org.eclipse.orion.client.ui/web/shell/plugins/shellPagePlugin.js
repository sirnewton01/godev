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
/*global define*/
define([
	'orion/plugin'
], function(PluginProvider) {
	var headers = {
		name: "Orion Shell Page Service",
		version: "1.0",
		description: "This plugin integrates access to Orion's Shell page into other Orion pages."
	};

	var provider = new PluginProvider(headers);
	
	provider.registerService("orion.navigate.command", {}, {
		nameKey: "Shell",
		id: "eclipse.shell.open",
		tooltipKey: "Open Shell page",
		nls: "orion/shell/nls/messages",
		validationProperties: [{
			source: "ChildrenLocation|ContentLocation",
			variableName: "ShellLocation",
			replacements: [{pattern: "\\?depth=1$", replacement: ""}] 
		}],
		uriTemplate: "{+OrionHome}/shell/shellPage.html#{,ShellLocation}",
		forceSingleItem: true
	});
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.shell.open",
		category: "shell",
		order: 10 // First link in Shell category
	});

//	// Removed, see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427617
//	provider.registerService("orion.page.link.related", null, {
//		nameKey: "Shell",
//		id: "eclipse.shell.open",
//		tooltipKey: "Open Shell page",
//		nls: "orion/shell/nls/messages",
//		category: "shell",
//		order: 10, // same rank as the other related link, but these 2 links should never be rendered simultaneously, so OK.
//		validationProperties: [{
//			source: "NoTarget"
//		}],
//		uriTemplate: "{+OrionHome}/shell/shellPage.html#",
//		forceSingleItem: true
//	});

	provider.connect();
});