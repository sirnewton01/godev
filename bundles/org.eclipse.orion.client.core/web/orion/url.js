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
define(function() {
	var buildMap = {};
	function jsEscape(text) {
		return (text + '')
			.replace(/([\\'])/g, '\\$&') //$NON-NLS-0$
			.replace(/[\0]/g, "\\0") //$NON-NLS-0$
			.replace(/[\b]/g, "\\b") //$NON-NLS-0$
			.replace(/[\f]/g, "\\f") //$NON-NLS-0$
			.replace(/[\n]/g, "\\n") //$NON-NLS-0$
			.replace(/[\r]/g, "\\r") //$NON-NLS-0$
			.replace(/[\t]/g, "\\t"); //$NON-NLS-0$
	}

	return {
		load: function(name, parentRequire, onLoad, config) {
			var temp = parentRequire.toUrl(name + "._"); //$NON-NLS-0$
			var url = temp.substring(0, temp.length - 2);
			if (config.isBuild) {
				buildMap[name] = url;
			}
			onLoad(url);
		},
		write: function(pluginName, moduleName, write, config) {
			if (moduleName in buildMap) {
				var text = jsEscape(buildMap[moduleName]);
				write("define('" + pluginName + "!" + moduleName + "', function(){return '" + text + "';});\n"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		}
	};
});