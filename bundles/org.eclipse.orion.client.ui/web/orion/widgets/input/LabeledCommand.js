/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define */
/*jslint browser:true*/

define(['orion/objects', 'orion/webui/littlelib'], function(objects, lib) {

	function LabeledCommand(options, node) {
		objects.mixin(this, options);
		this.node = node || document.createElement('div'); //$NON-NLS-0$
	}
	objects.mixin(LabeledCommand.prototype, {
		templateString: '' +  //$NON-NLS-0$
			'<span class="setting-repository-label"></span>' + //$NON-NLS-0$
			'<span class="setting-command"></span>', //$NON-NLS-0$

		show: function() {
			this.node.innerHTML = this.templateString;
			this.mylabel = lib.$('.setting-repository-label', this.node); //$NON-NLS-0$
			this.myCommand = lib.$('.setting-command', this.node); //$NON-NLS-0$
			this.postCreate();
		},

		destroy: function(){
			lib.empty(this.node);		
		},
                
        postCreate: function(){
            this.mylabel.textContent = this.fieldlabel;
            
            // add erase command
            this.commandService.renderCommands(this.scopeId, this.myCommand, {gitUrl: this.fieldlabel, keyIndex: this.keyIndex}, this, "button"); //$NON-NLS-0$
        }
    });
    return LabeledCommand;
});