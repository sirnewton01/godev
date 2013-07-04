/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window localStorage */

define([], function(){

	function getSetting(subcategories, subcategory, element){
			var value;
			for(var sub = 0; sub < subcategories.length; sub++){
				if(subcategories[sub].label === subcategory){
					for(var item = 0; item < subcategories[sub].data.length; item++){
						if(subcategories[sub].data[item].label === element){
							value = subcategories[sub].data[item].value;
							break;
						}
					}
				}
			}
			return value;
		}

});
