/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/objects'], function(objects) {

	/**
	 * @param {Object[]} param.options Array of {value:Object, label:String, selected:Boolean(optional)}
	 */

	 
	function ActivityContent( node, body ){
	}
	
	objects.mixin(ActivityContent.prototype, {
	
		templateString: '<div style="float:left;">' +
							'<section>' +
								'<nav>' +
									'<ul id="relatedlinks">' +
									'</ul>' +
								'</nav>' +
							'</section>' +
						'</div>',
		
		getContentPane: function(){
			return this.templateString;
		}
		
	});
	return ActivityContent;
});
