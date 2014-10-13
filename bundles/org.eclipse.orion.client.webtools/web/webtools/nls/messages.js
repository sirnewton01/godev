/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 ******************************************************************************/
/* eslint-env amd */
define(['orion/i18n!webtools/nls/messages', 'webtools/nls/root/messages'], function(bundle, root) {
	var result = {
		root: root
	};
	for (var key in bundle) {
		if (bundle.hasOwnProperty(key)) {
			if (typeof result[key] === 'undefined') {  //$NON-NLS-0$
				result[key] = bundle[key];
			}
		}
	}
	return result;
});
