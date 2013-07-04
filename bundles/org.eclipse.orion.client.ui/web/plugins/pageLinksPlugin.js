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
/*global define document*/
define([
	'require',
	'orion/plugin'
], function(require, PluginProvider) {
	var serviceImpl = { /* All data is in properties */ };

	var headers = {
		name: "Orion Page Links",
		version: "1.0",
		description: "This plugin provides the top-level page links for Orion."
	};

	var provider = new PluginProvider(headers);
	
	// Primary navigation links
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Navigator",
		id: "orion.navigator",
		nls: "orion/nls/messages",
		uriTemplate: "{OrionHome}/navigate/table.html#"
	});
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Sites",
		id: "orion.sites",
		nls: "orion/nls/messages",
		uriTemplate: "{OrionHome}/sites/sites.html"
	});
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Shell",
		id: "orion.shell",
		nls: "orion/nls/messages",
		uriTemplate: "{OrionHome}/shell/shellPage.html#projectfor={Location}"
	});
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Search",
		id: "orion.Search",
		nls: "orion/nls/messages",
		uriTemplate: "{OrionHome}/search/search.html"
	});
	provider.registerService("orion.page.link.related", null, {
		id: "orion.navigateFromMetadata",
		nameKey: "Navigator",
		nls: "orion/nls/messages",
		tooltip: "Go to the navigator",
		validationProperties: [{
			source: "ChildrenLocation|ContentLocation",
			variableName: "NavigatorLocation",
			replacements: [{pattern: "\\?depth=1$", replacement: ""}]  /* strip off depth=1 if it is there because we always add it back */
		}],
		uriTemplate: "{OrionHome}/navigate/table.html#{NavigatorLocation}?depth=1"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "orion.editFromMetadata",
		nameKey: "Editor",
		nls: "orion/nls/messages",
		tooltip: "Edit the code",
		validationProperties: [{
			source: "ChildrenLocation|ContentLocation",
			variableName: "NavigatorLocation",
			replacements: [{pattern: "\\?depth=1$", replacement: ""}]  /* strip off depth=1 if it is there because we always add it back */
		}],
		uriTemplate: "{OrionHome}/edit/edit.html#,navigate={NavigatorLocation}?depth=1"
	});

	provider.registerService("orion.page.link.user", null, {
		id: "orion.help",
		nameKey: "Help",
		nls: "orion/widgets/nls/messages",
		uriTemplate: require.toUrl("help/index.jsp"),
		category: 0
	});
	
	provider.registerService("orion.page.link.user", null, {
		id: "orion.settings",
		nameKey: "Settings",
		nls: "orion/widgets/nls/messages",
		uriTemplate: "{OrionHome}/settings/settings.html",
		category: 1
	});

	var htmlHelloWorld = document.createElement('a');
	htmlHelloWorld.href = "./contentTemplates/helloWorld.zip";
	var pluginHelloWorld = document.createElement('a');
	pluginHelloWorld.href = "./contentTemplates/pluginHelloWorld.zip";

	provider.registerService("orion.core.content", null, {
		id: "orion.content.html5",
		nameKey: "Sample HTML5 Site",
		nls: "orion/nls/messages",
		descriptionKey: "Generate an HTML5 'Hello World' website, including JavaScript, HTML, and CSS files.",
		contentURITemplate: htmlHelloWorld.href
	});

	provider.registerService("orion.core.content", null, {
		id: "orion.content.plugin",
		nameKey: "Sample Orion Plugin",
		nls: "orion/nls/messages",
		descriptionKey: "Generate a sample plugin for integrating with Orion.",
		contentURITemplate: pluginHelloWorld.href
	});

	provider.registerService("orion.core.setting", null, {
		settings: [
			{	pid: "nav.config",
				name: "Navigation",
				category: 'general',
				properties: [
					{	id: "links.newtab",
						name: "Links",
						type: "boolean",
						defaultValue: false,
						options: [
							{value: true, label: "Open in new tab"},
							{value: false, label: "Open in same tab"}
						]
					}
				]
			}
		]
	});

	provider.connect();
});