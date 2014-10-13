/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/webui/littlelib', 'orion/webui/splitter', 'orion/globalCommands', 'text!orion/globalSearch/search-features.html']
	, function(lib, splitter, mGlobalCommands, FeatureTemplate) {


var orion = orion || {};
orion.SearchUIFactory = (function() {
	function SearchUIFactory(option){
		this._parentDivID = option.parentDivID;
	}	
	SearchUIFactory.prototype = {
		
		buildUI:function(){
			var parent = lib.node(this._parentDivID);
			parent.innerHTML = FeatureTemplate;
			var top = lib.$("#replaceTop", parent); //$NON-NLS-0$
			var bottom = lib.$("#replaceBottom", parent); //$NON-NLS-0$
			var splitNode = lib.$(".replaceSplitLayout", parent); //$NON-NLS-0$
			splitNode.id = "replaceSplitter"; //$NON-NLS-0$
			var split = new splitter.Splitter({node: splitNode, sidePanel: top, mainPanel: bottom, vertical: true});
			//The vertical splitter has to adjust the top and bottm pane when the replace page is refreshed by the click on browser's refresh.
			//Otherwise there the bottom pane is a little offset.
			window.setTimeout(function() { split._adjustToSplitPosition(true); }, 100);
			
			//Here for the h-splitter we only need to resize both editors in the compare widget at the bottom.
			split.addResizeListener(function(node) {
				if(node === bottom && this._compareWidget && this._compareWidget.resizeEditors){
					this._compareWidget.resizeEditors();
				}
			}.bind(this));
			
			//Here we need the listener to handle the global splitter resize on the RHS only.
			//We only want the bottom compare widget to ask its splitter: "hey, your position has changed, please simulate a move as if you are dragged".
			var mainSplitter = mGlobalCommands.getMainSplitter();
			if(mainSplitter && mainSplitter.splitter){
				mainSplitter.splitter.addResizeListener(function(node) {
					if(node === mainSplitter.main && this._compareWidget && this._compareWidget.getSplitter()){
						this._compareWidget.getSplitter()._adjustToSplitPosition(true);
					}
				}.bind(this));
			}
		},
		
		destroy: function(){
		},
		
		setCompareWidget: function(compareWidget){
			this._compareWidget = compareWidget;
		},
		
		getMatchDivID: function(){
			return "replaceTop"; //$NON-NLS-0$
		},
		
		getCompareDivID: function(){
			return "replaceBottom"; //$NON-NLS-0$
		}

	};
	return SearchUIFactory;
}());

return orion;
});
