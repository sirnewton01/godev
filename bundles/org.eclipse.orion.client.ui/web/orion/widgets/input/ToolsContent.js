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

	 
	function ToolsContent( node, body ){
	}
	
	objects.mixin(ToolsContent.prototype, {
	
		templateString: '<div class="toolsNav" style="float:right;">' +
							'<section>' +
							'<nav>' +
								'<ul id="navigationlinks"></ul>' +
							'</nav>' +
							'</section>' +
							'<ul>' + 
								'<li class="dropdownSeparator">' +
									'<span class="dropdownSeparator"></span>' +
								'</li>' +
							'</ul>' +
							'<section>' +
							'<nav>' +
								'<ul id="additionalLinks"></ul>' +
							'</nav>' +
							'</section>' +
						'</div>',
		
		getContentPane: function(){
			return this.templateString;
		}
		
	});
	return ToolsContent;
});
