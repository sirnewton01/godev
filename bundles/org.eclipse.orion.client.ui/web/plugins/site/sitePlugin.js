/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document eclipse parent window*/
define(['orion/plugin', 'plugins/site/siteServiceImpl'], function(PluginProvider, siteImpl) {
	function qualify(url) {
		var a = document.createElement('a');
		a.href = url;
		return a.href;
	}
	function unqualify(url) {
		url = qualify(url);
		try {
			if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
				return url.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
			}
		} catch (e) {}
		return url;
	}
	function filesAndFoldersOnService(filePrefix) {
		return [
			{	source: 'Location|Directory'
			},
			{	source: 'Location',
				match: '^' + filePrefix
			}];
	}

	// Tightly coupled to the fileClientPlugin
	var siteBase = unqualify('../../site');
	var fileBase = unqualify('../../file');
	var workspaceBase = unqualify('../../workspace');
	//console.log("sitePlugin siteBase:" + siteBase + ", fileBase:" + fileBase + ", workspaceBase:" + workspaceBase);

	var temp = document.createElement('a');
	temp.href = "../../mixloginstatic/LoginWindow.html";
	var login = temp.href;
	var headers = {
		name: "Orion Site Service",
		version: "1.0",
		description: "This plugin provides virtual site support for hosting client web applications from your Orion workspace.",
		login: login
	};

	var provider = new PluginProvider(headers);
	
	var host = document.createElement('a');
	host.href = '/';

	provider.registerService('orion.navigate.command', null, {
		id: 'orion.site.' + host.hostname + '.viewon',
		nameKey: 'View on Site',
		tooltipKey: 'View this file or folder on a web site hosted by Orion',
		nls: 'orion/nls/messages',
		forceSingleItem: true,
		validationProperties: filesAndFoldersOnService(fileBase),
		uriTemplate: '{+OrionHome}/sites/view.html#,file={,Location}'
	});

	provider.registerService('orion.page.link.related', null, {
		id: 'orion.site.' + host.hostname + '.viewon',
		nameKey: 'View on Site',
		tooltipKey: 'View this file or folder on a web site hosted by Orion',
		nls: 'orion/nls/messages',
		validationProperties: filesAndFoldersOnService(fileBase),
		uriTemplate: '{+OrionHome}/sites/view.html#,file={,Location}'
	});

	provider.registerService('orion.site',
		new siteImpl.SiteImpl(fileBase, workspaceBase),
		{	id: 'orion.site.' + host.hostname,
			name: 'Orion Sites at ' + host.hostname,
			canSelfHost: true,
			pattern: siteBase,
			filePattern: fileBase
		});

	provider.connect();
});
