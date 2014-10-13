/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/objects', 'orion/webui/littlelib', 'orion/widgets/input/Select'],  function(objects, lib, Select) {

	/**
	 * This is just an orion/widgets/input/Select with a label.
	 */
	function LabeledSelect( params, node ){
		Select.apply(this, arguments);
		this.mylabel = lib.$(".setting-label", this.node); //$NON-NLS-0$
	}
	objects.mixin(LabeledSelect.prototype, Select.prototype, {
		templateString :	'<div>' +  //$NON-NLS-0$
								'<label>' + //$NON-NLS-0$
									'<span class="setting-label"></span>' + //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									'<select class="setting-control"></select>' + //$NON-NLS-0$
								'</label>' +  //$NON-NLS-0$
							'</div>', //$NON-NLS-0$

		postCreate: function() {
			Select.prototype.postCreate.call(this);
            this.mylabel.textContent = this.fieldlabel;
		},

		destroy: function() {
			Select.prototype.destroy.call(this);
			if (this.mylabel) {
				this.mylabel = null;
			}
		}
	});

	return LabeledSelect;
});