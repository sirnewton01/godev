/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['require', 'orion/fileUtils', 'orion/URITemplate'],
		function(require, mFileUtil, URITemplate) {
	/**
	 * Returns a relative URL pointing to the editing page for the given site configuration. 
	 * @param {orion.siteClient.SiteConfiguration} site The site configuration
	 * @return {String} The URL.
	 * @name orion.siteUtils#generateEditSiteHref
	 * @function
	 */
	function generateEditSiteHref(site) {
		var base = require.toUrl("sites/site.html"); //$NON-NLS-0$
		return new URITemplate(base + "#{,resource,params*}").expand({ //$NON-NLS-0$
			resource: mFileUtil.makeRelative(site.Location)
		});
	}
	return {
		generateEditSiteHref: generateEditSiteHref
	};
});