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
/*eslint-env browser, amd*/
define(["orion/plugin", "help/helpService"], function(PluginProvider, mHelpService) {
	var provider = new PluginProvider({
		name: "Help Plugin", //$NON-NLS-0$
		version: "1.0", //$NON-NLS-0$
		description: "Help plugin that contributes Orion's Help content" //$NON-NLS-0$
	});

	var serviceImpl = new mHelpService.HelpService();
	var properties = {
		root: {
			Location: "../helpContent/Orion User Guide/Getting Started.md", //$NON-NLS-0$
			Name: "Getting Started",
			Directory: false
		}
	};
	provider.registerService("orion.help.pages", serviceImpl, properties); //$NON-NLS-0$
	provider.connect();
});
