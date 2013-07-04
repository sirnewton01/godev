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
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'require' ], 
	
	function(messages, require) {

		function ProjectTypes(){
			console.log( 'created Project Data' );
		}
		
		ProjectTypes.prototype.constructor = ProjectTypes;
		
		var types = [];
		
		ProjectTypes.prototype.types = types;

		function addType( projectType ){
			types.push( projectType );
		}
		
		ProjectTypes.prototype.addType = addType;
		
		function getTypes(){
			return this.types;
		}

		return{
			ProjectTypes:ProjectTypes
		};
	}
);