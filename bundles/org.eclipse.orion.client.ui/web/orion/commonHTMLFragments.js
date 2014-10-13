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

define(['orion/webui/littlelib', 'text!orion/banner/CommandSlideout.html'], 
        function(lib, CommandSlideoutTemplate){
        
	/**
	 * This module contains dynamic HTML fragments that depend on client information.
	 * @name orion.commonHTMLFragments
	 */

	function slideoutHTMLFragment(idPrefix) { 
		var tempDiv = document.createElement("div"); //$NON-NLS-0$
		tempDiv.innerHTML = CommandSlideoutTemplate;
		
		// replacing generic id's with prefixed id's
		var node = lib.$("#slideContainer", tempDiv); //$NON-NLS-0$
		node.id = idPrefix + node.id;
		node = lib.$("#pageCommandParameters", tempDiv); //$NON-NLS-0$
		node.id = idPrefix + node.id;
		node = lib.$("#pageCommandDismiss", tempDiv); //$NON-NLS-0$
		node.id = idPrefix + node.id;
		return tempDiv.innerHTML;
	}
		
	//return the module exports
	return {
		slideoutHTMLFragment: slideoutHTMLFragment
	};
});
