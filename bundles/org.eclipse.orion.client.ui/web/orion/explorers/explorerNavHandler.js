/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window */
/*jslint regexp:false browser:true forin:true*/

define([
	'orion/webui/littlelib',
	'orion/treeModelIterator',
	'orion/uiUtils'
], function(lib, mTreeModelIterator, UiUtils){

var exports = {};
var userAgent = navigator.userAgent;
var isPad = userAgent.indexOf("iPad") !== -1; //$NON-NLS-0$
var isMac = window.navigator.platform.indexOf("Mac") !== -1; //$NON-NLS-0$

exports.ExplorerNavHandler = (function() {

	/**
	 * Creates a new tree iteration handler
	 * 
	 * @name orion.explorerNavHandler.ExplorerNavHandler
	 * @class A tree iteration handler based on an explorer.
	 * @param {Object} explorer The {@link orion.explorer.Explorer} instance.
	 * @param {Object} options The options object which provides iterate patterns and all call back functions when iteration happens.
	 * @param {String} [options.gridClickSelectionPolicy="none"] Controls how clicking on a grid model item -- for example, a link or a button -- affects
	 * the selection (or how it affects the cursor, if the <code>selectionPolicy</code> is <code>"cursorOnly"</code>). Allowed values are:
	 * <ul>
	 * <li><code>"none"</code>: Clicking on a grid item will not change the selection (or cursor). This is the default.</li>
	 * <li><code>"active"</code>: Clicking on a grid item will change the selection (or cursor).</li>
	 * </ul>
	 * @param {String} [options.selectionPolicy=null] Selection policy for this explorer. Allowed values are:
	 * <ul>
	 * <li><code>"cursorOnly"</code>: No selection of model items is allowed.</li>
	 * <li><code>"singleSelection"</code>: Up to 1 model item can be selected.</li>
	 * <li><code>null</code>: Zero or more model items can be selected. This is the default.</li>
	 * </ul>
	 * @param {Function} [options.postDefaultFunc] If this function provides addtional behaviors after the default behavior. Some explorers may want to do something else when the cursor is changed, etc.
	 * @param {Function} [options.preventDefaultFunc] If this function returns true then the default behavior of all key press will stop at this time.
	 * The key event is passed to preventDefaultFunc. It can implement its own behavior based on the key event.
	 */
	function ExplorerNavHandler(explorer, navDict, options) {
		this.explorer = explorer;
		this.model = this.explorer.model;
		this._navDict = navDict;
		
	    this._listeners = [];
	    this._selections = [];
	    
	    this._currentColumn = 0;
	    var parentDiv = this._getEventListeningDiv();
	    parentDiv.tabIndex = 0;
		parentDiv.classList.add("selectionModelContainer"); //$NON-NLS-0$
		var self = this;
		this._modelIterator = new mTreeModelIterator.TreeModelIterator([], {
			isExpanded: this.isExpanded.bind(this),		
			getChildrenFunc: options.getChildrenFunc,
			isExpandable: this.explorer.renderer.isExpandable ? 
				function(model) { return self.explorer.renderer.isExpandable(model); } : 
				function(model) { return self.isExpandable(model); },
			forceExpandFunc: this.explorer.forceExpandFunc ? 
				function(modelToExpand, childPosition, callback) {
					return self.explorer.forceExpandFunc(modelToExpand, childPosition, callback);
				} : undefined
		});
		this._init(options);
		
	    if(!options || options.setFocus !== false){
			parentDiv.focus();
	    }
	    var keyListener = function (e) { 
			if(UiUtils.isFormElement(e.target)) {
				// Not for us
				return true;
			}
			if(self.explorer.preventDefaultFunc && self.explorer.preventDefaultFunc(e, self._modelIterator.cursor())){
				return true;
			}
			if(e.keyCode === lib.KEY.DOWN) {
				return self.onDownArrow(e);
			} else if(e.keyCode === lib.KEY.UP) {
				return self.onUpArrow(e);
			} else if(e.keyCode === lib.KEY.RIGHT) {
				return self.onRightArrow(e);
			} else if(e.keyCode === lib.KEY.LEFT) {
				return self.onLeftArrow(e);
			} else if(e.keyCode === lib.KEY.SPACE) {
				return self.onSpace(e);
			} else if(e.keyCode === lib.KEY.ENTER) {
				return self.onEnter(e);
			}
		};
		parentDiv.addEventListener("keydown", keyListener, false); //$NON-NLS-0$
		this._listeners.push({type: "keydown", listener: keyListener}); //$NON-NLS-0$
		var l1 = function (e) { 
			if(self.explorer.onFocus){
				self.explorer.onFocus(false);
			} else {
				self.toggleCursor(null, false);
			}
		};
		parentDiv.addEventListener("blur", l1, false); //$NON-NLS-0$
		this._listeners.push({type: "blur", listener: l1}); //$NON-NLS-0$
		var l2 = function (e) { 
			if(self.explorer.onFocus){
				self.explorer.onFocus(true);
			} else {
				self.toggleCursor(null, true);
			}
		};
		parentDiv.addEventListener("focus", l2, false); //$NON-NLS-0$
		this._listeners.push({type: "focus", listener: l2}); //$NON-NLS-0$
		this._parentDiv = parentDiv;
	}
	
	ExplorerNavHandler.prototype = /** @lends orion.explorerNavHandler.ExplorerNavHandler.prototype */ {
		
		destroy: function() {
			this._parentDiv.classList.remove("selectionModelContainer"); //$NON-NLS-0$
			this.removeListeners();	
		},
		
		_init: function(options){
			this._linearGridMove = false;//temporary. If true right key on the last grid will go to first grid of next row
			                            // Left key on the first grid will go to the last line grid of the previous line
			if(!options){
				return;
			}
			this._selectionPolicy = options.selectionPolicy;
			this.gridClickSelectionPolicy = options.gridClickSelectionPolicy || "none"; //$NON-NLS-0$
			this.preventDefaultFunc = options.preventDefaultFunc;
			this.postDefaultFunc = options.postDefaultFunc;
		},
		
		_ctrlKeyOn: function(e){
			return isMac ? e.metaKey : e.ctrlKey;
		},
		
		removeListeners: function(){
			if(this._listeners){
				for (var i=0; i < this._listeners.length; i++) {
					this._parentDiv.removeEventListener(this._listeners[i].type, this._listeners[i].listener, false);
				}
			}
		},
		
		focus: function(){
		    var parentDiv = this._getEventListeningDiv();
		    if(parentDiv){
				parentDiv.focus();
		    }
		},
		
		_getEventListeningDiv: function(secondLevel){
			if(this.explorer.keyEventListeningDiv && typeof this.explorer.keyEventListeningDiv === "function"){ //$NON-NLS-0$
				return this.explorer.keyEventListeningDiv(secondLevel);
			}
			return lib.node(this.explorer._parentId);
		},
		
		isExpandable: function(model){
			if(!model){
				return false;
			}
			var expandImage = lib.node(this.explorer.renderer.expandCollapseImageId(this.model.getId(model)));
			return expandImage ? true: false;
		},
		
		isExpanded: function(model){
			if(!model){
				return false;
			}
			return this.explorer.myTree.isExpanded(this.model.getId(model));
		},
		
		refreshSelection: function(noScroll, visually){
			var that = this;
			if(this.explorer.selection){
				this.explorer.selection.getSelections(function(selections) {
					that._clearSelection(visually);
					for (var i = 0; i < selections.length; i++){
						that._selections.push(selections[i]);
					}
					if(that._selections.length > 0){
						that.cursorOn(that._selections[0], true, false, noScroll);
					} else {//If there is no selection, we should just the first item as the cursored items.  
						that.cursorOn(null, false, false, noScroll);
					}
					//If shift selection anchor exists and in the refreshed selection range, we just keep it otherwise clear the anchor
					//See https://bugs.eclipse.org/bugs/show_bug.cgi?id=419170
					if(!(that._shiftSelectionAnchor && that._inSelection(that._shiftSelectionAnchor) >= 0)){
						that._shiftSelectionAnchor = null;
					}
				});
			}
		},
		
		refreshModel: function(navDict, model, topIterationNodes, noReset){
		    this._currentColumn = 0;
			this.topIterationNodes = [];
			this.model = model;
			this._navDict = navDict;
			if(this.model.getTopIterationNodes){
				this.topIterationNodes = this.model.getTopIterationNodes();
			} else if(topIterationNodes){
				this.topIterationNodes = topIterationNodes;
			}
			this._modelIterator.setTree(this.topIterationNodes);
			if(!noReset && this.explorer.selection){
				//refresh the current cursor visual, otherwise the next cursorOn() call will not remove the previoous cursor visual properly.
				this.toggleCursor(this._modelIterator.cursor(), false);
				this._modelIterator.reset();
			}
			this.refreshSelection(true);
		},
		
		getTopLevelNodes: function(){
			return this._modelIterator.firstLevelChildren;
		},
		
		_inSelection: function(model){
			var modelId = this.model.getId(model);
			for(var i = 0; i < this._selections.length; i++){
				if(modelId === this.model.getId(this._selections[i])){
					return i;
				}
			}
			return -1;
		},
		
		
		_clearSelection: function(visually){
			if(visually){
				for(var i = 0; i < this._selections.length; i++){
					this._checkRow(this._selections[i], true);
				}
			}
			this._selections = [];
		},
		
		getSelectionPolicy: function() {
			return this._selectionPolicy;
		},
		
		setSelectionPolicy: function(policy) {
			if (this._selectionPolicy === policy) {
				return;
			}
			this._selectionPolicy = policy;
			if(this._selectionPolicy === "cursorOnly"){ //$NON-NLS-0$
				this._clearSelection(true);
			}
		},
		
		setSelection: function(model, toggling, shiftSelectionAnchor){
			if(this._selectionPolicy === "cursorOnly"){ //$NON-NLS-0$
				if(toggling && this.explorer.renderer._useCheckboxSelection){
					this._checkRow(model,true);
				}
				return;
			}
			if(!this._isRowSelectable(model)){
				return;
			}
			if(!toggling || this._selectionPolicy === "singleSelection"){//$NON-NLS-0$
				this._clearSelection(true);
				this._checkRow(model,false);		
				this._selections.push(model);
				this._lastSelection = model;
			} else{
				var index = this._inSelection(model);
				if(index >= 0){
					this._checkRow(model, true);
					this._selections.splice(index, 1);
				} else {
					this._checkRow(model,false);		
					this._selections.push(model);
					this._lastSelection = model;
				}
			}
			if(shiftSelectionAnchor){
				this._shiftSelectionAnchor = this._lastSelection;
			}
			if (this.explorer.selection) {
				this.explorer.renderer.storeSelections();
				this.explorer.selection.setSelections(this._selections);		
			}
		},
		
		moveColumn: function(model, offset){
			if(!model){
				model = this.currentModel();
			}
			var gridChildren = this._getGridChildren(model);
			if((gridChildren && gridChildren.length > 1) || (offset === 0 && gridChildren)){
				if(offset !== 0){
					this.toggleCursor(model, false);
				}
				var column = this._currentColumn;
				var rowChanged= true;
				column = column + offset;
				if(column < 0){
					if(this._linearGridMove && offset !== 0){
						if(this._modelIterator.iterate(false)){
							model = this.currentModel();
						} else {
							rowChanged = false;
						}
					}
					column = rowChanged ? gridChildren.length - 1 : this._currentColumn;
				} else if(column >= gridChildren.length){
					if(this._linearGridMove && offset !== 0){
						if(this._modelIterator.iterate(true)){
							model = this.currentModel();
						} else {
							rowChanged = false;
						}
					}
					column = rowChanged ? 0 : this._currentColumn;
				}
				this._currentColumn = column;
				if(offset !== 0){
					this.toggleCursor(model, true);
				}
				return true;
			}
			return false;
		},
		
		_getGridChildren: function(model){
			if(this._navDict){
				return this._navDict.getGridNavHolder(model);
			}
			return null;
		},
		
		getCurrentGrid:  function(model){
			if(!model){
				model = this.currentModel();
			}
			var gridChildren = this._getGridChildren(model);
			if(gridChildren && gridChildren.length > 0){
				return gridChildren[this._currentColumn];
			}
			return null;
		},

		/**
		 * @returns {Element} The ancestor element of <code>node</code> that provides grid/tree/treegrid behavior,
		 * or <code>null</code> if no such node was found.
		 */
		getAriaContainerElement: function(node) {
			var stop = this._parentDiv, role;
			while (node && node !== stop &&
					(role = node.getAttribute("role")) !== "grid" && role !== "tree" && role !== "treegrid") {//$NON-NLS-3$//$NON-NLS-2$//$NON-NLS-1$//$NON-NLS-0$
				node = node.parentNode;
			}
			return node === stop ? null : node;
		},

		toggleCursor:  function(model, on){
			var currentRow = this.getRowDiv(model);
			var currentgrid = this.getCurrentGrid(model);
			if(currentgrid) {
				if(currentRow){
					if (on) {
						currentRow.classList.add("treeIterationCursorRow"); //$NON-NLS-0$
					} else {
						currentRow.classList.remove("treeIterationCursorRow"); //$NON-NLS-0$
					}
				}
				if(currentgrid.domNode){
					var ariaElement = this.getAriaContainerElement(currentgrid.domNode);
					if (on) {
						currentgrid.domNode.classList.add("treeIterationCursor"); //$NON-NLS-0$
						if (ariaElement) {
							var activeDescendantId = currentgrid.domNode.id;
							ariaElement.setAttribute("aria-activedescendant", activeDescendantId); //$NON-NLS-0$
						}
					} else {
						currentgrid.domNode.classList.remove("treeIterationCursor"); //$NON-NLS-0$
					}
				}
			} else {
				if(currentRow){
					if (on) {
						currentRow.classList.add("treeIterationCursorRow_Dotted"); //$NON-NLS-0$
					} else {
						currentRow.classList.remove("treeIterationCursorRow_Dotted"); //$NON-NLS-0$
					}
				}
			}
		},
		
		currentModel: function(){
			return this._modelIterator.cursor();
		},
		
		cursorOn: function(model, force, next, noScroll){
			var previousModel, currentModel;
			if(model || force){
				if(currentModel === this._modelIterator.cursor()){
					return;
				}
				previousModel = this._modelIterator.cursor();
				currentModel = model;
				this._modelIterator.setCursor(currentModel);
			} else {
				previousModel = this._modelIterator.prevCursor();
				currentModel = this._modelIterator.cursor();
			}
			if(previousModel === currentModel && !force){
				return;
			}
			this.toggleCursor(previousModel, false);
			if(force && !currentModel){
				return;
			}
			this.moveColumn(null, 0);
			this.toggleCursor(currentModel, true);
			var currentRowDiv = this.getRowDiv();
			if(currentRowDiv && !noScroll) {
				var offsetParent = currentRowDiv.parentNode, documentElement = document.documentElement;
				while (offsetParent && offsetParent !== documentElement) {
					var style = window.getComputedStyle(offsetParent, null);
					if (!style) { break; }
					var overflow = style.getPropertyValue("overflow-y"); //$NON-NLS-0$
					if (overflow === "auto" || overflow === "scroll") { break; } //$NON-NLS-1$ //$NON-NLS-0$
					offsetParent = offsetParent.parentNode;
				}
				var visible = true;
				if(currentRowDiv.offsetTop <= offsetParent.scrollTop){
					visible = false;
					if(next === undefined){
						next = false;
					}
				}else if((currentRowDiv.offsetTop + currentRowDiv.offsetHeight) >= (offsetParent.scrollTop + offsetParent.clientHeight)){
					visible = false;
					if(next === undefined){
						next = true;
					}
				}
				if(!visible){
					currentRowDiv.scrollIntoView(!next);
				}
			}
			if(this.explorer.onCursorChanged){
				this.explorer.onCursorChanged(previousModel, currentModel);
			}
		},
		
		getSelection: function(){
			return this._selections;
		},
		
		getSelectionIds: function(){
			var ids = [];
			for (var i = 0; i < this._selections.length; i++) {
				ids.push(this.model.getId(this._selections[i]));
			}
			return ids;
		},
		
		getRowDiv: function(model){
			var rowModel = model ? model: this._modelIterator.cursor();
			if(!rowModel){
				return null;
			}
			var modelId = this.model.getId(rowModel);
			var value = this._navDict.getValue(modelId);
			return value && value.rowDomNode ? value.rowDomNode :  lib.node(modelId);
		},
		
		iterate: function(forward, forceExpand, selecting, selectableOnly /* optional */)	{
			var currentItem = null;
			
			if(!this.topIterationNodes || this.topIterationNodes.length === 0){
				return;
			}
				
			if (selectableOnly) {
				var previousItem = this.currentModel();
				
				currentItem = this._modelIterator.iterate(forward, forceExpand);
				if(currentItem){
					this._setCursorOnItem(forward, selecting);
				}
				
				while (currentItem && currentItem.isNotSelectable) {
					currentItem = this._modelIterator.iterate(forward, forceExpand);
					if(currentItem){
						this._setCursorOnItem(forward, selecting);
					}
				}
				
				if (!currentItem) {
					// got to the end of the list and didn't find anything selectable, iterate back
					this.cursorOn(previousItem, true, false, true);
					this._setCursorOnItem(forward, selecting);
				}
			} else {
				currentItem = this._modelIterator.iterate(forward, forceExpand);
				if(currentItem){
					this._setCursorOnItem(forward, selecting);
				}
			}
		},
		
		_setCursorOnItem: function(forward, selecting) {
			this.cursorOn(null, false, forward);
			if(selecting){
				var previousModelInSelection = this._inSelection(this._modelIterator.prevCursor());
				var currentModelInselection = this._inSelection(this._modelIterator.cursor());
				if(previousModelInSelection >= 0 && currentModelInselection >= 0) {
					this.setSelection(this._modelIterator.prevCursor(), true);
				} else {
					this.setSelection(this.currentModel(), true);
				}
			}
		},
		
		_checkRow: function(model, toggle) {
			if(this.explorer.renderer._useCheckboxSelection){
				var tableRow = this.getRowDiv(model);
				if(!tableRow){
					return;
				}
				var checkBox  = lib.node(this.explorer.renderer.getCheckBoxId(tableRow.id));
				var checked = toggle ? !checkBox.checked : true;
				if(checked !== checkBox.checked){
					this.explorer.renderer.onCheck(tableRow, checkBox, checked, true);
				}
			} else {
				this._select(model, toggle);
			}
		},
		
		_select: function(model, toggling){
			if(!model){
				model = this._modelIterator.cursor();
			}
			var rowDiv = this.getRowDiv(model);
			if(rowDiv){
				if (this._inSelection(model) < 0) {
					rowDiv.classList.add("checkedRow"); //$NON-NLS-0$
				} else {
					rowDiv.classList.remove("checkedRow"); //$NON-NLS-0$
				}
			}
		},
		
		_onModelGrid: function(model, mouseEvt){
			var gridChildren = this._getGridChildren(model);
			if(gridChildren){
				for(var i = 0; i < gridChildren.length; i++){
					if(mouseEvt.target === gridChildren[i].domNode){
						return true;
					}
				}
			}
			return false;
		},
		
		onClick: function(model, mouseEvt)	{
			if (this.isDisabled(this.getRowDiv(model))) {
				lib.stop(mouseEvt);
			} else {
				var twistieSpan = lib.node(this.explorer.renderer.expandCollapseImageId(this.model.getId(model)));
				if(mouseEvt.target === twistieSpan){
					return;
				}
				if(this.gridClickSelectionPolicy === "none" && this._onModelGrid(model, mouseEvt)){ //$NON-NLS-0$
					return;
				}
				this.cursorOn(model, true, false, true);
				if(isPad){
					this.setSelection(model, true);
				} else if(this._ctrlKeyOn(mouseEvt)){
					this.setSelection(model, true, true);
				} else if(mouseEvt.shiftKey && this._shiftSelectionAnchor){
					var scannedSel = this._modelIterator.scan(this._shiftSelectionAnchor, model);
					if(scannedSel){
						this._clearSelection(true);
						for(var i = 0; i < scannedSel.length; i++){
							this.setSelection(scannedSel[i], true);
						}
					}
				} else {
					this.setSelection(model, false, true);
				}
			}
		},
		
		onCollapse: function(model)	{
			if(this._modelIterator.collapse(model)){
				this.cursorOn();
			}
		},
		
		//Up arrow key iterates the current row backward. If control key is on, browser's scroll up behavior takes over.
		//If shift key is on, it toggles the check box and iterates backward.
		onUpArrow: function(e) {
			this.iterate(false, false, e.shiftKey, true);
			if(!this._ctrlKeyOn(e) && !e.shiftKey){
				this.setSelection(this.currentModel(), false, true);
			}
			e.preventDefault();
			return false;
		},

		//Down arrow key iterates the current row forward. If control key is on, browser's scroll down behavior takes over.
		//If shift key is on, it toggles the check box and iterates forward.
		onDownArrow: function(e) {
			this.iterate(true, false, e.shiftKey, true);
			if(!this._ctrlKeyOn(e) && !e.shiftKey){
				this.setSelection(this.currentModel(), false, true);
			}
			e.preventDefault();
			return false;
		},

		_shouldMoveColumn: function(e){
			var model = this.currentModel();
			var gridChildren = this._getGridChildren(model);
			if(gridChildren && gridChildren.length > 1){
				if(this.isExpandable(model)){
					return this._ctrlKeyOn(e);
				}
				return true;
			} else {
				return false;
			}
		},
		
		//Left arrow key collapses the current row. If current row is not expandable(e.g. a file in file navigator), move the cursor to its parent row.
		//If current row is expandable and expanded, collapse it. Otherwise move the cursor to its parent row.
		onLeftArrow:  function(e) {
			if(this._shouldMoveColumn(e)){
				this.moveColumn(null, -1);
				e.preventDefault();
				return true;
			}
			var curModel = this._modelIterator.cursor();
			if(!curModel){
				return false;
			}
			if(this.isExpandable(curModel)){
				if(this.isExpanded(curModel)){
					this.explorer.myTree.collapse(curModel);
					e.preventDefault();
					return true;
				}
			}
			if(!this._modelIterator.topLevel(curModel)){
				this.cursorOn(curModel.parent);
				this.setSelection(curModel.parent, false, true);
			//The cursor is now on a top level item which is collapsed. We need to ask the explorer is it wants to scope up.	
			} else if (this.explorer.scopeUp && typeof this.explorer.scopeUp === "function"){ //$NON-NLS-0$
				this.explorer.scopeUp();
			}
		},
		
		//Right arrow key expands the current row if it is expandable and collapsed.
		onRightArrow: function(e) {
			if(this._shouldMoveColumn(e)){
				this.moveColumn(null, 1);
				e.preventDefault();
				return true;
			}
			var curModel = this._modelIterator.cursor();
			if(!curModel){
				return false;
			}
			if(this.isExpandable(curModel)){
				if(!this.isExpanded(curModel)){
					this.explorer.myTree.expand(curModel);
					if (this.explorer.postUserExpand) {
						this.explorer.postUserExpand(this.model.getId(curModel));
					}
					e.preventDefault();
					return false;
				}
			}
		},
		
		_isRowSelectable: function(model){
			return this.explorer.isRowSelectable ? this.explorer.isRowSelectable(model) : true;
		},

		//Space key toggles the check box on the current row if the renderer uses check box
		onSpace: function(e) {
			this.setSelection(this.currentModel(), true, true);
			e.preventDefault();
		},
		
		//Enter key simulates a href call if the current row has an href link rendered. The render has to provide the getRowActionElement function that returns the href DIV.
		onEnter: function(e) {
			var currentGrid = this.getCurrentGrid(this._modelIterator.cursor());
			if(currentGrid){
				if(currentGrid.widget){
					if(typeof currentGrid.onClick === "function"){ //$NON-NLS-0$
						currentGrid.onClick();
					} else if(typeof currentGrid.widget.focus === "function"){ //$NON-NLS-0$
						currentGrid.widget.focus();
					}
				} else {
					var evt = document.createEvent("MouseEvents"); //$NON-NLS-0$
					evt.initMouseEvent("click", true, true, window, //$NON-NLS-0$
							0, 0, 0, 0, 0, this._ctrlKeyOn(e), false, false, false, 0, null);
					currentGrid.domNode.dispatchEvent(evt);
				}
				return;
			}
			
			var curModel = this._modelIterator.cursor();
			if(!curModel){
				return;
			}
			
			if(this.explorer.renderer.getRowActionElement){
				var div = this.explorer.renderer.getRowActionElement(this.model.getId(curModel));
				if(div.href){
					if(this._ctrlKeyOn(e)){
						window.open(div.href);
					} else {
						window.location.href = div.href;
					}
				}
			}
			if(this.explorer.renderer.performRowAction){
				this.explorer.renderer.performRowAction(e, curModel);
				e.preventDefault();
				return false;
			}
		},
		
		/**
		 * Sets the isNotSelectable attribute on the specified model.
		 * @param {Object} model
		 * @param {Boolean} isNotSelectable true makes the this.iterate() with selectableOnly specified skip the item
		 */
		setIsNotSelectable: function(model, isNotSelectable) {
			model.isNotSelectable = isNotSelectable;
		},
		
		/**
		 * Disables the specified model making it no longer respond 
		 * to user input such as mouse click or key presses. The
		 * CSS style of corresponding row node is also modified to
		 * reflect its disabled state.
		 * 
		 * @param {Object} model
		 */
		disableItem: function(model) {
			var rowDiv = this.getRowDiv(model);
			if (this.isExpandable(model) && this.isExpanded(model)) {
				this._modelIterator.collapse(model);
				this.explorer.myTree.toggle(rowDiv.id); // collapse tree visually
			}
			rowDiv.classList.remove("checkedRow"); //$NON-NLS-0$
			rowDiv.classList.add("disabledNavRow"); //$NON-NLS-0$
			this.setIsNotSelectable(model, true);
		},
		
		/**
		 * Checks if the specified html row node is disabled.
		 * @return true if the specified node's classList contains the 
		 * 			"disabledNavRow" class, false otherwise
		 */
		isDisabled: function(rowDiv) {
			return rowDiv.classList.contains("disabledNavRow"); //$NON-NLS-0$
		},
		
		/**
		 * Enables the specified model.
		 * 
		 * @param {Object} model
		 */
		enableItem: function(model) {
			var rowDiv = this.getRowDiv(model);
			if (rowDiv) {
				rowDiv.classList.remove("disabledNavRow"); //$NON-NLS-0$
				this.setIsNotSelectable(model, false);
			}
		},
	};
	return ExplorerNavHandler;
}());

exports.ExplorerNavDict = (function() {
	/**
	 * Creates a new explorer navigation dictionary. The key of the dictionary is the model id. The value is a wrapper object that holds .modelItem, .rowDomNode and .gridChildren properties.
	 * The .modelItem property helps quickly looking up a model object by a given id. The .rowDomNode also helps to find out the row DOM node instead of doing a query. 
	 * The .gridChildren is an array representing all the grid navigation information, which the caller has to fill the array out.
	 *
	 * @name orion.explorerNavHandler.ExplorerNavDict
	 * @class A explorer navigation dictionary.
	 * @param {Object} model The model object that represent the overall explorer.
	 */
	function ExplorerNavDict(model) {
		this._dict= {};
		this._model = model;
	}
	ExplorerNavDict.prototype = /** @lends orion.explorerNavHandler.ExplorerNavDict.prototype */ {
		
		/**
		 * Add a row to the dictionary.
		 * @param {Object} modelItem The model item object that represent a row.
		 * @param {domNode} rowDomNode optional The DOM node that represent a row. If 
		 */
		addRow: function(modelItem, rowDomNode){
			var modelId = this._model.getId(modelItem);
			this._dict[modelId] = {model: modelItem, rowDomNode: rowDomNode};
		},
			
		/**
		 * Get the value of a key by model id.
		 *  @param {String} id The model id.
		 * @returns {Object} The value of the id from the dictionary.
		 */
		getValue: function(id) {
			return this._dict[id];
		},
		
		/**
		 * Get the grid navigation holder from a row navigation model.
		 *  @param {Object} modelItem The model item object that represent a row.
		 * @returns {Array} The .gridChildren property of the value keyed by the model id.
		 */
		getGridNavHolder: function(modelItem, lazyCreate) {
			if(!modelItem){
				return null;
			}
			var modelId = this._model.getId(modelItem);
			if(this._dict[modelId]){
				if(!this._dict[modelId].gridChildren && lazyCreate){
					this._dict[modelId].gridChildren = [];
				}
				return this._dict[modelId].gridChildren;
			}
			return null;
		},
		
		/**
		 * Initialize the grid navigation holder to null.
		 *  @param {Object} modelItem The model item object that represent a row.
		 */
		initGridNavHolder: function(modelItem) {
			if(!modelItem){
				return null;
			}
			var modelId = this._model.getId(modelItem);
			if(this._dict[modelId]){
				this._dict[modelId].gridChildren = null;
			}
		}
	};
	return ExplorerNavDict;
}());

return exports;
});
