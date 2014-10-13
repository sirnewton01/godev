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
define(['orion/webui/littlelib', 'orion/webui/splitter', 'text!orion/compare/sideBySideTemplate.html'], 
function(lib, mSplitter, SideBySideTemplate) {

var orion = orion || {};
orion.TwoWayCompareUIFactory = (function() {
	function TwoWayCompareUIFactory(option){
		this._parentDivID = option.parentDivID;
		this._commandSpanId = option.commandSpanId;
		this._showTitle = option.showTitle;
		this._leftTitle = option.leftTitle;
		this._rightTitle = option.rightTitle;
		this._showLineStatus = option.showLineStatus;
	}	
	TwoWayCompareUIFactory.prototype = {
		_init: function(){
			//Have to add prefix to the local dome node ids inside the widget, to support multiple widgets by the same template. 
			var prefix = this._parentDivID + "_"; //$NON-NLS-0$
			
			this._topWidgetDiv = lib.node("topWidget_id"); //$NON-NLS-0$
			this._topWidgetDiv.id = prefix + "topWidget_id"; //$NON-NLS-0$
			
			this._leftEditorParentDiv = lib.node("left_editor_id"); //$NON-NLS-0$
			this._leftEditorParentDiv.id = prefix + "left_editor_id"; //$NON-NLS-0$
			this._rightEditorParentDiv = lib.node("right_editor_id"); //$NON-NLS-0$
			this._rightEditorParentDiv.id = prefix + "right_editor_id"; //$NON-NLS-0$
			this._rightEditorWrapperDiv = lib.node("right_editor_wrapper_id"); //$NON-NLS-0$
			this._rightEditorWrapperDiv.id = prefix + "right_editor_wrapper_id"; //$NON-NLS-0$
			
			this._leftActionDiv = lib.node("left_action_id"); //$NON-NLS-0$
			this._leftActionDiv.id = prefix + "left_action_id"; //$NON-NLS-0$
			this._rightActionDiv = lib.node("right_action_id"); //$NON-NLS-0$
			this._rightActionDiv.id = prefix + "right_action_id"; //$NON-NLS-0$
			
			this._leftTitleDiv = lib.node("left_title_id"); //$NON-NLS-0$
			this._leftTitleDiv.id = prefix + "left_title_id"; //$NON-NLS-0$
			this._rightTitleDiv = lib.node("right_title_id"); //$NON-NLS-0$
			this._rightTitleDiv.id = prefix + "right_title_id"; //$NON-NLS-0$
			
			this._leftStatusDiv = lib.node("left_status_id"); //$NON-NLS-0$
			this._leftStatusDiv.id = prefix + "left_status_id"; //$NON-NLS-0$
			this._rightStatusDiv = lib.node("right_status_id"); //$NON-NLS-0$
			this._rightStatusDiv.id = prefix + "right_status_id"; //$NON-NLS-0$

			this._diffCanvasDiv = lib.node("diff_canvas_id"); //$NON-NLS-0$
			this._diffCanvasDiv.id = prefix + "diff_canvas_id"; //$NON-NLS-0$
			
			this._splitterId = prefix+"orion_splitter"; //$NON-NLS-0$
			
			if(!this._showTitle){
				this.disableTitle();
			}
			if(!this._showLineStatus){
				this.disableLineStatus();
			}
		},
		
		_createSplitter: function(){
			var splitNode = lib.$(".split", this._topWidgetDiv); //$NON-NLS-0$
			splitNode.id = this._splitterId;
			var leftPane = lib.$(".leftPanelLayout", this._topWidgetDiv); //$NON-NLS-0$
			var rightPane = lib.$(".rightPanelLayout", this._topWidgetDiv); //$NON-NLS-0$
			if (splitNode && leftPane && rightPane) {
				this._splitter = new mSplitter.Splitter({node: splitNode, sidePanel: leftPane, mainPanel: rightPane, proportional: true});
			}
		},
				
		buildUI:function(){
			lib.node(this._parentDivID).innerHTML = SideBySideTemplate;//appendChild(topNode);
			this._init();
			this._createSplitter();
		},
		
		destroy: function(){
		},
		
		getSplitter: function(){
			return this._splitter;
		},
		
		isLeftPane: function(node){
			var leftPane = lib.$(".leftPanelLayout", this._topWidgetDiv); //$NON-NLS-0$
			return leftPane === node;
		},
		
		getEditorParentDiv: function(left){
			return (left ? this._leftEditorParentDiv : this._rightEditorParentDiv);
		},
		
		getTitleDiv: function(left){
			return (left ? this._leftTitleDiv : this._rightTitleDiv);
		},
		
		getActionDivId: function(left){
			return (left ? this._leftActionDiv.id : this._rightActionDiv.id);
		},
		
		getStatusDiv: function(left){
			return (left ? this._leftStatusDiv : this._rightStatusDiv);
		},
		
		getCommandSpanId: function(){
			return this._commandSpanId;
		},
		
		getDiffCanvasDiv: function(){
			return this._diffCanvasDiv;
		},
		
		disableTitle: function() {
			this._leftEditorParentDiv.style.top = "0px"; //$NON-NLS-0$
			this._rightEditorWrapperDiv.style.top = "0px"; //$NON-NLS-0$
			this._leftTitleDiv.style.height = "0px"; //$NON-NLS-0$
			this._rightTitleDiv.style.height = "0px"; //$NON-NLS-0$
		},

		disableLineStatus: function() {
			this._leftEditorParentDiv.style.marginBottom = "0px"; //$NON-NLS-0$
			this._rightEditorWrapperDiv.style.marginBottom = "0px"; //$NON-NLS-0$
			this._leftStatusDiv.style.height = "0px"; //$NON-NLS-0$
			this._rightStatusDiv.style.height = "0px"; //$NON-NLS-0$
		}
	};
	return TwoWayCompareUIFactory;
}());

return orion;
});
