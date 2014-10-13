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

define([], function() {

		var className = null;
		var attributes = [];
		var element;
		var style;
		var closeString = ' }\n';
		var classString;
	
		function ThemeClass( name ){
			this.attributes = [];
			this.element = document.createElement( 'div' );
			this.style = this.element.style;
			this.className = name;
			this.classString = '.' + name + '{ ';
		}
		
		ThemeClass.prototype.className = className;
		ThemeClass.prototype.classString = classString;
		ThemeClass.prototype.style = style;
		ThemeClass.prototype.closeString = closeString;
		
		function toString(){		
			this.classString = this.classString + this.style.cssText + this.closeString;
			return this.classString;
		}
		
		ThemeClass.prototype.toString = toString;
	
		return{
			ThemeClass:ThemeClass
		};

});