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
	'orion/PageLinks',
	'orion/plugin',
	'orion/URITemplate'
], function(require, PageLinks, PluginProvider, URITemplate) {
	var serviceImpl = { /* All data is in properties */ };

	var headers = {
		name: "Orion Page Links",
		version: "1.0",
		description: "This plugin provides the top-level page links for Orion."
	};

	var provider = new PluginProvider(headers);

	// Categories for primary nav links
	provider.registerService("orion.page.link.category", null, {
		id: "edit",
		nameKey: "Edit",
		nls: "orion/nls/messages",
		imageClass: "core-sprite-cat-edit"
	});
	provider.registerService("orion.page.link.category", null, {
		id: "search",
		nameKey: "Search",
		nls: "orion/nls/messages",
		imageClass: "core-sprite-cat-search"
	});
	provider.registerService("orion.page.link.category", null, {
		id: "sites",
		nameKey: "Sites",
		nls: "orion/nls/messages",
		imageClass: "core-sprite-cat-sites"
	});
	provider.registerService("orion.page.link.category", null, {
		id: "deploy",
		nameKey: "Deploy",
		nls: "orion/edit/nls/messages",
		imageClass: "core-sprite-cat-deploy"
	});

	// Primary navigation links
	provider.registerService("orion.page.link", null, {
		nameKey: "Editor",
		nls: "orion/nls/messages",
		tooltip: "Edit code",
		category: "edit",
		uriTemplate: "{+OrionHome}/edit/edit.html"
	});
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Shell",
		id: "orion.shell",
		nls: "orion/nls/messages",
		category: "edit",
		uriTemplate: "{+OrionHome}/shell/shellPage.html"
	});
	provider.registerService("orion.page.link", serviceImpl, {
		nameKey: "Search",
		id: "orion.Search",
		nls: "orion/nls/messages",
		category: "search",
		uriTemplate: "{+OrionHome}/search/search.html"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "orion.editFromMetadata",
		nameKey: "Editor",
		nls: "orion/nls/messages",
		tooltip: "Open Editor page",
		category: "edit",
		validationProperties: [{
			source: "ChildrenLocation|ContentLocation",
			variableName: "EditorLocation",
			replacements: [{pattern: "\\?depth=1$", replacement: ""}]  /* strip off depth=1 if it is there because we always add it back */
		}],
		uriTemplate: "{+OrionHome}/edit/edit.html#{,EditorLocation},navigate={,EditorLocation}?depth=1"
	});

	provider.registerService("orion.page.link.user", null, {
		id: "orion.help",
		nameKey: "Help",
		nls: "orion/widgets/nls/messages",
		uriTemplate: require.toUrl("help/index.jsp"),
		category: "user.0"
	});
	
	provider.registerService("orion.page.link.user", null, {
		id: "orion.settings",
		nameKey: "Settings",
		nls: "orion/widgets/nls/messages",
		uriTemplate: "{+OrionHome}/settings/settings.html",
		category: "user.1"
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
			{
				pid: "nav.config",
				nls: "orion/settings/nls/messages",
				nameKey: "Navigation",
				category: "general",
				categoryKey: "General",
				properties: [
					{
						id: "links.newtab",
						nameKey: "Links",
						type: "boolean",
						defaultValue: false,
						options: [
							{ value: true, labelKey: "Open in new tab" },
							{ value: false, labelKey: "Open in same tab" }
						]
					}
				]
			}
		]
	});

	var getPluginsTemplate = "http://orion-plugins.googlecode.com/git/index.html#?target={InstallTarget}&version={Version}&OrionHome={OrionHome}";
	provider.registerService("orion.core.getplugins", null, {
		uri: decodeURIComponent(new URITemplate(getPluginsTemplate).expand({
			Version: "5.0",
			InstallTarget: PageLinks.getOrionHome() + "/settings/settings.html",
			OrionHome: PageLinks.getOrionHome()
		}))
	});

	// Getting Started
	provider.registerService("orion.page.getstarted", null, {
		data: [
			{
				label:"Add",
				image:"../images/add.png",
				secondaryImage: "../images/add-large-dulled.png",
				alt: "Add Content",
				media:"../media/Create.gif"
			},
			{
				label:"Modify",
				image:"../images/modify.png",
				secondaryImage: "../images/gear-large-dulled.png",
				alt: "Modify Content",
				media:"../media/Modify.gif"
			},
			{
				label:"Manage",
				image:"../images/manage.png",
				secondaryImage: "../images/hamburger-large-dulled.png",
				alt: "Manage Content",
				media:"../media/Manage.gif"
			}
		]
	});

	provider.connect();
});