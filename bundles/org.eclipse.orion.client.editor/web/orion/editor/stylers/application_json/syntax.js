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

define("orion/editor/stylers/application_json/syntax", ["orion/editor/stylers/shared/syntax"], function(mShared) { //$NON-NLS-0$
	var grammars = mShared.grammars;
	grammars.push({
		id: "orion.json", //$NON-NLS-0$
		contentTypes: ["application/json"], //$NON-NLS-0$
		patterns: [
			{
				include: "orion.patterns" //$NON-NLS-0$
			}, {
				match: "\\b(?:true|false|null)\\b", //$NON-NLS-0$
				name: "keyword.control.json" //$NON-NLS-0$
			}, {
				/* override orion.patterns#comment_singleline */
				id: "comment_singleline" //$NON-NLS-0$
			}, {
				/* override orion.patterns#comment_multiline */
				id: "comment_multiline" //$NON-NLS-0$
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
