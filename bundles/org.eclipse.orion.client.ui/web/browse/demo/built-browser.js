/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['browse/builder/browse'],
function(mFileBrowser) {
	new mFileBrowser(
		"fileBrowser",
		//"https://github.com/eclipse/orion.client.git&token=3bbaae0679391edd086b665627fbbe5b7168ff50",
		"https://github.com/libingw/test1.git",
		null /*,
		{maxLine: 20, fileURL: "https://api.github.com/repos/libingw/test1/contents!testBranch/demo.html", start: 23, end: 192}*/
	); 
});
