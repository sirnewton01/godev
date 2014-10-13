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

/* Shows labeled sections */
// TODO convert to orion/section

define([], function() {

	/**
	 * @param options
	 * @param {String} options.sectionName
	 * @param {DomNode} options.parentNode
	 * @param {Labeled*} options.children Child Labeled* widgets
	 */
	function Subsection(options) {
		var sectionName = options.sectionName;
		this.parentNode = options.parentNode;
		this.children = options.children;
		
		var node = document.createElement('section'); //$NON-NLS-0$
		node.classList.add('setting-row'); //$NON-NLS-0$
		node.setAttribute('role', 'region'); //$NON-NLS-1$ //$NON-NLS-0$
		node.setAttribute('aria-labelledby', 'Navigation-header'); //$NON-NLS-1$ //$NON-NLS-0$
		var titleNode = document.createElement('div'); //$NON-NLS-0$
		titleNode.classList.add('setting-header'); //$NON-NLS-0$
		titleNode.textContent = sectionName;
		var content = document.createElement('div'); //$NON-NLS-0$
		content.classList.add('setting-content'); //$NON-NLS-0$
		node.appendChild(titleNode);
		node.appendChild(content);

		this.node = node;
		this.subsectionContent = content;
	}
	Subsection.prototype.show = function(){
		if( this.parentNode ){
			this.parentNode.appendChild( this.node );
		}
		
		if( this.children ){
			var that = this;
			this.children.forEach(function(child) {
				that.subsectionContent.appendChild( child.node );
				child.show();
			});
		}
	};
	return Subsection;
});