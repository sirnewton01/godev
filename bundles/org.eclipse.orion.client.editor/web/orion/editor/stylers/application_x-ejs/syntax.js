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

define("orion/editor/stylers/application_x-ejs/syntax", ["orion/editor/stylers/lib/syntax", "orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/application_xml/syntax"], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	function(mLib, mJS, mXML) {

	var grammars = mLib.grammars.concat(mJS.grammars).concat(mXML.grammars);
	grammars.push({
		id: "orion.ejs",
		contentTypes: ["application/x-ejs"],
		patterns: [
			{
				include: "orion.xml"
			}, {
				begin: "<%=?(?:\\s|$)",
				end: "%>",
				captures: {
					0: {name: "entity.name.declaration.js"}
				},
				contentName: "source.js.embedded.ejs",
				patterns: [
					{
						include: "orion.js"
					}
				]
			}
		],
		repository: {
			/* override orion.xml#doctype (no-op) */
			doctype: {},
			/* override orion.xml#xmlDeclaration (no-op) */
			xmlDeclaration: {}
		}
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
