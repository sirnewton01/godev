/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/i18n!orion/sites/nls/messages', 'orion/sites/nls/root/messages'], function(bundle, root) {
	var result = {
			root:root
	};
	Object.keys(bundle).forEach(function(key) {
		if (typeof result[key] === 'undefined') {
			result[key] = bundle[key];
		}
	});
	return result;
});