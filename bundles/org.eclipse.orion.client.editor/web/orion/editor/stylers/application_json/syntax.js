/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/application_json/syntax", ["orion/editor/stylers/lib/syntax"], function(mLib) { //$NON-NLS-0$
	var keywords = ["false", "true"]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	var grammars = mLib.grammars;
	grammars.push({
		id: "orion.json", //$NON-NLS-0$
		contentTypes: ["application/json"], //$NON-NLS-0$
		patterns: [
			{
				include: "orion.lib" //$NON-NLS-0$
			}, {
				match: "\\b(?:" + keywords.join("|") + ")\\b", //$NON-NLS-0$
				name: "keyword.control.json" //$NON-NLS-0$
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: keywords
	};
});
