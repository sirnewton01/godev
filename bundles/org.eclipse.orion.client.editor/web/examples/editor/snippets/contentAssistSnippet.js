/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser,amd*/

define('examples/editor/snippets/contentAssistSnippet', [ //$NON-NLS-0$
 'orion/editor/templates' //$NON-NLS-0$
], function(mTemplates) {

	var templates = [
	{
		prefix: "SELECT", //$NON-NLS-0$
		description: "Select table", //$NON-NLS-0$
		template: "SELECT ${column} FROM ${table_name};" //$NON-NLS-1$ //$NON-NLS-0$
	},
	{
		prefix: "INSERT INTO", //$NON-NLS-0$
		description: "Insert in table", //$NON-NLS-0$
		template: "INSERT INTO ${table_name} VALUES (${values});" //$NON-NLS-0$
	}
	];
	var keywords = [
		"SELECT", //$NON-NLS-0$
		"WHERE", //$NON-NLS-0$
		"DELETE" //$NON-NLS-0$
	];

	function ContentAssistProvider() {
	}
	ContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(keywords, templates);

	return {
		ContentAssistProvider: ContentAssistProvider
	};
});