/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: 
 *		John Arthorne (IBM Corporation) - initial API and implementation
 *		Felipe Heidrich (IBM Corporation) - initial API and implementation
 ******************************************************************************/
 
/*eslint-env browser, amd*/
define(['orion/webui/littlelib'], function(lib) {


function updateNavTools (registry, commandService, explorer, toolbarId, pageNavId, selectionToolbarId, item) {
	var eclipse = eclipse || {};
		var toolbar = lib.node(toolbarId);
		if (toolbar) {
			commandService.destroy(toolbar);
			commandService.renderCommands(toolbarId, toolbar, item, explorer, "button"); //$NON-NLS-0$
		}
		toolbar = lib.node(pageNavId);
		if (toolbar) {
			commandService.destroy(toolbar);
			commandService.renderCommands(pageNavId, toolbar, item, explorer, "button"); //$NON-NLS-0$
		}
		if (selectionToolbarId) {
			var selectionTools = lib.node(selectionToolbarId);
			if (selectionTools) {
				commandService.destroy(selectionTools);
				commandService.renderCommands(selectionToolbarId, selectionTools, null, explorer, "button"); //$NON-NLS-0$
			}
		}

		
		// Stuff we do only the first time
		if (!eclipse.doOnce) {
			eclipse.doOnce = true;
			registry.getService("orion.page.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
				var selectionTools = lib.node(selectionToolbarId);
				if (selectionTools) {
					commandService.destroy(selectionTools);
					commandService.renderCommands(selectionToolbarId, selectionTools, event.selections, explorer, "button"); //$NON-NLS-0$
				}
			});
		}
	}
return {updateNavTools : updateNavTools};
});
