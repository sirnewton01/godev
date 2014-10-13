/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define("orion/blameAnnotations", ["orion/EventTarget"], function(EventTarget) {

	
	function BlameService(serviceRegistry) {
		this._serviceRegistry = serviceRegistry;
		EventTarget.attach(this);
		this._serviceRegistration = serviceRegistry.registerService("orion.core.blame", this); //$NON-NLS-0$
	}

	BlameService.prototype = /** @lends orion.blameAnnotations.BlameService.prototype */ {
		// provider
		_setAnnotations: function(blameInfo) {
			this.blameInfo = blameInfo;
			this.dispatchEvent({type:"blameChanged", blameInfo:blameInfo}); //$NON-NLS-0$
		}	    
	};
	BlameService.prototype.constructor = BlameService;
	
	//return the module exports
	return {BlameService: BlameService};
});

