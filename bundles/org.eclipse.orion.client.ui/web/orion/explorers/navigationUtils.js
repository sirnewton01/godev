/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define([], function() {
	var userAgent = navigator.userAgent;
	var isPad = userAgent.indexOf("iPad") !== -1; //$NON-NLS-0$
	
	/**
	 * Generate a grid navigation item into a given array. A grid navigation item is presented by a wrapper object wrapping the domNode. 
	 *
	 * @param {Array} domNodeWrapperList the array that holds the grid navigation item. Normally the .gridChildren property from a row model.
	 * @param {Element} element the html dom element representing a grid. Normally left or right arrow keys on the current row highlight the dom element.
	 *        When a grid is rendered, the caller has to decide what dom element can be passed. 
	 */
	 
	 
	function generateNavGrid(domNodeWrapperList, domNode, widget, onClick) {
		if(isPad){
			return;
		}
		if(!domNodeWrapperList){
			return;
		}
		domNodeWrapperList.push({domNode: domNode});
		domNode.style.outline = "none"; //$NON-NLS-0$
	}
                
	/**
	 * Add a grid navigation item to the navigation dictionary. A row navigation model normally comes from any node in a {treeModelIterator}.
	 * The .gridChildren property will be lazily created on the row model as an array where all the grid navigation items live.
	 *
	 * @param {ExplorerNavDict} navDict the dictionary that holds the info of all navigation info from model id.
	 * @param {object} rowModel the row model from the {treeModelIterator}.
	 * @param {Element} element the html dom element representing a grid. Normally left or right arrow keys on the current row highlight the dom element.
	 *        When a grid is rendered, the caller has to decide what dom element can be passed. 
	 */
	function addNavGrid(navDict, rowModel, domNode) {
		if(!navDict){
			return;
		}
		var navHolder = navDict.getGridNavHolder(rowModel, true);
		if(navHolder){
			generateNavGrid(navHolder, domNode);
		}
	}
	
	/**
	 * Remove a grid navigation item from a given array. A grid navigation item is presented by a wrapper object wrapping the domNode, widget and onClick properties. 
	 *
	 * @param {Array} domNodeWrapperList the array that holds the grid navigation item. Normally the .gridChildren property from a row model.
	 * @param {DomNode} domNode the html dom node representing a grid. Normally left or right arrow keys on the current row highlight the dom node.
	 *        When a grid is rendered, the caller has to decide what dom node can be passed. 
	 */
	function removeNavGrid(domNodeWrapperList, domNode) {
		if(!domNodeWrapperList){
			return;
		}
		
		for(var i = 0; i < domNodeWrapperList.length ; i++){
			if(domNodeWrapperList[i].domNode === domNode){
				domNodeWrapperList.splice(i, 1);
				return;
			}
		}
	}
	//return module exports
	return {
		addNavGrid: addNavGrid,
		generateNavGrid: generateNavGrid,
		removeNavGrid: removeNavGrid
	};
});
