/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define require URL document console prompt XMLHttpRequest window*/
var _browser_script_source = null; //We need to know where the browser script lives
var _all_script = document.getElementsByTagName('script');
if (_all_script && _all_script.length && _all_script.length > 0) {
	for (var j = 0; j < 2; j++) { // try twice in all the script tags
		for (var i = 0; i < _all_script.length; i++) {
			if (j === 0) { //First try: if the script id is ""orion.browse.browser""
				if (_all_script[i].id === "orion.browse.browser") {
					_browser_script_source = _all_script[i].src;
					break;
				}
			} else {
				var regex = /.*built-browse.*.js/;
				if (_all_script[i].src && regex.exec(_all_script[i].src)) {
					_browser_script_source = _all_script[i].src;
					break;
				}
			}
		}
		if (_browser_script_source) {
			break;
		}
	}
	if (!_browser_script_source) {
		_browser_script_source = _all_script[_all_script.length - 1].src;
	}
}

define('browse/builder/browse', ['orion/widgets/browse/fileBrowser', 'orion/serviceregistry', 'orion/pluginregistry', 'orion/URL-shim'], function(mFileBrowser, mServiceRegistry, mPluginRegistry) {
	function Browser(params) { // parentId, repo, base
		if (typeof params === "string") {
			params = {
				parentId: arguments[0],
				repo: arguments[1],
			};
			if (arguments.length > 2) {
				params.base = arguments[2];
			}
		} else {
			params = params || {};
		}
		var pluginURL;
		var url = new URL(params.repo || window.location.href);
		var repo = url.href;
		var base = params.base;
		var showComponent = false;

		if (!params.rootName) {
			var found = repo.match(/\/([^/]+)\/([^/]+)$/);
			if (found) {
				params.rootName = decodeURIComponent(found[1]) + " / " + decodeURIComponent(found[2]);
				if (params.rootName.match(/\.git$/)) {
					params.rootName = params.rootName.substring(0, params.rootName.length - 4);
				}
			}
		}

		if (url.host === "github.com") {
			pluginURL = new URL("../../plugins/GitHubFilePlugin.html?repo=" + url.href, _browser_script_source);
		} else if (url.pathname.indexOf("/git/") === 0) {
			pluginURL = new URL("/gerrit/plugins/gerritFilesystem/static/plugins/GerritFilePlugin.html", url);
			pluginURL.query.set("project", url.pathname.substring(5));
		} else if (url.pathname.indexOf("/ccm") === 0) {
			if (!base) {
				var ccmPath = url.pathname.match(/^\/ccm[^/]*/);
				base = new URL(ccmPath, repo).href;
			}
			pluginURL = new URL(base + "/service/com.ibm.team.filesystem.service.jazzhub.IOrionFilesystem/sr/pluginOrionWs.html?" + repo);
			showComponent = true;
		} else if (url.pathname.indexOf("/project/") === 0) {
			if (!base) {
				base = new URL("/ccm01", repo).href;
			}
			pluginURL = new URL(base + "/service/com.ibm.team.filesystem.service.jazzhub.IOrionFilesystem/sr/pluginOrionWs.html?" + repo);
			showComponent = true;
		} else {
			throw "Bad Repo URL - " + repo;
		}
		var serviceRegistry = new mServiceRegistry.ServiceRegistry();
		var plugins = {};
		plugins[pluginURL.href] = true;
		var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {
			storage: {},
			plugins: plugins
		});
		pluginRegistry.start().then(function() {
			this._fileBrowser = new mFileBrowser.FileBrowser({
				parent: params.parentId,
				showBranch: true,
				showComponent: showComponent,
				rootName: params.rootName,
				maxEditorLines: 100,
				serviceRegistry: serviceRegistry
			});
		}.bind(this));
	}

	Browser.prototype = {
		getFileBrowser: function() {
			return this._fileBrowser;
		}
	};
	return Browser;
});