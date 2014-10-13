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
/*eslint-env browser, amd*/
/*global URL*/
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
				var regex = /.*built-browser.*.js/;
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
			if (arguments.length > 3) {
				params.codeURL = arguments[3];
			}
			if (arguments.length > 4) {
				params.snippetShareOptions = arguments[4];
			}
		} else {
			params = params || {};
		}
		var pluginURL;
		var url = new URL(params.repo || window.location.href);
		var repo = url.href;
		var base = params.base;
		var selectorNumber = 1;

		if (!params.rootName) {
			var found = repo.match(/\/([^/]+)\/([^/]+)$/);
			if (found) {
				params.rootName = decodeURIComponent(found[1]) + " | " + decodeURIComponent(found[2]);
				if (params.rootName.match(/\.git$/)) {
					params.rootName = params.rootName.substring(0, params.rootName.length - 4);
				}
			}
		}
		try {
			if (url.host === "github.com") {
				pluginURL = new URL("../../plugins/GitHubFilePlugin.html?repo=" + url.href, _browser_script_source);
			} else {
				var regex = /^\/git([\d]?)([\d]?)\/(.*)/;// Pattern : "/git/", "/git02/", "/git3/", "/git04"
				var match = regex.exec(url.pathname);
				if(match && match.length === 4) {
					pluginURL = new URL("/gerrit" + match[1] + match[2] + "/plugins/gerritfs/static/plugins/GerritFilePlugin.html", url);
					pluginURL.query.set("project", match[3]);
				} else if (url.pathname.indexOf("/ccm") === 0) {
					if (!base) {
						var ccmPath = url.pathname.match(/^\/ccm[^/]*/);
						base = new URL(ccmPath, repo).href;
					}
					pluginURL = new URL(base + "/service/com.ibm.team.filesystem.service.jazzhub.IOrionFilesystem/sr/pluginOrionWs.html?" + repo);
					selectorNumber = 2;
				} else if (url.pathname.indexOf("/project/") === 0) {
					if (!base) {
						throw "No Jazz SCM base server defined - " + repo;
					}
					pluginURL = new URL(base + "/service/com.ibm.team.filesystem.service.jazzhub.IOrionFilesystem/sr/pluginOrionWs.html?" + repo);
					selectorNumber = 2;
				} else {
					throw "Bad Repo URL - " + repo;
				}
			}
		} catch (exception) {
			(new mFileBrowser.FileBrowser({parent: params.parentId, init: true}))._statusService.setProgressResult({Severity: "error", Message: exception}); //$NON-NLS-0$;
			return;
		}
		var serviceRegistry = new mServiceRegistry.ServiceRegistry();
		var plugins = {};
		plugins[pluginURL.href] = {autostart: "started", lastModified: -1};
		this._fileBrowser = new mFileBrowser.FileBrowser({
			parent: params.parentId,
			repoURL: repo,
			baseURL: (selectorNumber === 2 ? base : null),
			codeURL: params.codeURL,
			snippetShareOptions: params.snippetShareOptions,
			selectorNumber: selectorNumber,
			rootName: params.rootName,
			widgetSource: _browser_script_source ? {repo: params.repo, base: params.base, js: _browser_script_source , css: _browser_script_source.replace(/built-browser.*.js/, "built-browser.css")} : null,
			maxEditorLines: params.snippetShareOptions && params.snippetShareOptions.maxL ? params.snippetShareOptions.maxL : 300,
			init: true
		});
		var pluginRegistry = new mPluginRegistry.PluginRegistry(serviceRegistry, {
			storage: {},
			plugins: plugins
		});
		var errorMessage = "Unable to display repository contents at this time. Refresh the browser to try again.";
		pluginRegistry.start().then(function() {
			var allReferences = serviceRegistry.getServiceReferences("orion.core.file"); //$NON-NLS-0$
			if(allReferences.length === 0) {//If there is no file service reference, we treat it as plugin activation error.
				this._fileBrowser._statusService.setProgressResult({Severity: "Warning", Message: errorMessage}); //$NON-NLS-0$
			} else {//Plugin activation succeeds, start up the readonly widget.
				this._fileBrowser.startup(serviceRegistry);
			}
		}.bind(this), function() {//The pluginRegistry starts with rejection(not sure if it is reachable though, we treat it as plugin activation error.
			this._fileBrowser._statusService.setProgressResult({Severity: "Warning", Message: errorMessage}); //$NON-NLS-0$
		}.bind(this));
	}

	Browser.prototype = {
		getFileBrowser: function() {
			return this._fileBrowser;
		}
	};
	return Browser;
});