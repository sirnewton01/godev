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

/*eslint-env browser, amd*/
define([], function(){

var exports = {};

exports.TreeModelIterator = (function() {
	/**
	 * Creates a new tree iterator.
	 *
	 * @name orion.TreeModelIterator.TreeModelIterator
	 * @class A tree model based iterator component.
	 * @param {list} firstLevelChildren The first level children of the tree root, each item has children and parent property recursively.
	 * @param {Object} options The options object which provides iterate patterns and all call back functions when iteration happens.
	 */
	function TreeModelIterator(firstLevelChildren, options) {
		this.firstLevelChildren = firstLevelChildren;
		this.reset();
		this._init(options);
	}
	TreeModelIterator.prototype = /** @lends orion.TreeModelIterator.TreeModelIterator.prototype */ {
		
		_init: function(options){
			if(!options){
				return;
			}
			this.isExpanded = options.isExpanded;//optional callback providing that if a model item is expanded even if it has children. Default is true if it has children.
			this.isExpandable = options.isExpandable;//optional  callback providing that if a model item is expandable.Default is true .
			this.forceExpandFunc = options.forceExpandFunc;//optional  callback providing the expansion on the caller side.
			this.getChildrenFunc = options.getChildrenFunc;//optional  callback providing the of a parent, instead of using the .children property.
		},
			
		topLevel: function(modelItem) {
			return modelItem.parent ? (modelItem.parent === this.root) : true;
		},
		
		_getChildren: function(model){
			if(typeof this.getChildrenFunc === "function") {
				return this.getChildrenFunc(model);
			}
			return model ? model.children : null;
		},
		
		_expanded: function(model){
			if(!model){
				return true;//root is always expanded
			}
			var children = this._getChildren(model);
			var expanded = (children && children.length > 0);
			if(this.isExpanded && expanded){
				expanded = this.isExpanded(model);
			}
			return expanded;
		},
		
		//This is for the force expand
		_expandable: function(model){
			if(!model){
				return true;//root is always expandable
			}
			if(this.isExpandable){
				return this.isExpandable(model);
			}
			return false;//If there is no isExpandable provided, we assume nothing is expandable
		},
		
		_diveIn: function(model){
			if( this._expanded(model)){
				var children = this._getChildren(model);
				this.setCursor(children[0]);
				return this.cursor();
			}
			return null;
		},
		
		_drillToLast: function(model){
			if( this._expanded(model)){
				var children = this._getChildren(model);
				return this._drillToLast(children[children.length-1]);
			}
			return model;
		},
		
		_forward: function(forceExpand){
			//first we will try to dive into the current cursor
			if(!this._cursor){
				return null;
			}
			var next = this._diveIn(this._cursor);
			if(!next){
				if(forceExpand && this._expandable(this._cursor) && this.forceExpandFunc){
					var that = this;
					return this.forceExpandFunc(this._cursor, "first", function(model){if(model){that.setCursor(model);}}); //$NON-NLS-0$
				}
				next = this._findSibling(this._cursor, true);
				if(next){
					this.setCursor(next);
				} 
			}
			return next;
		},
		
		_backward: function(forceExpand){
			if(!this._cursor){
				return null;
			}
			var previous = this._findSibling(this._cursor, false);
			if(previous && previous !== this._cursor.parent){
				previous = this._drillToLast(previous);
			}
			if(forceExpand && previous && this._expandable(previous) && this.forceExpandFunc && previous !== this._cursor.parent){
				var that = this;
				return this.forceExpandFunc(previous, "last", function(model){if(model){that.setCursor(model);}}); //$NON-NLS-0$
			}
			if(previous){
				this.setCursor(previous);
			} 
			return previous;
		},
		
		_findSibling: function(current, forward){
			var isTopLevel = this.topLevel(current);
			var children = this._getChildren(current.parent);
			var siblings = isTopLevel ? this.firstLevelChildren: children;
			for(var i = 0; i < siblings.length; i++){
				if(siblings[i] === current){
					if((i === 0 && !forward) ){
						return isTopLevel ? null : current.parent;
					} else if (i === (siblings.length-1) && forward) {
						return isTopLevel ? null : this._findSibling(current.parent, forward);
					} else {
						return forward ? siblings[i+1] : siblings[i-1];
					}
				}
			}
			return null;
		},
		
		_inParentChain: function(model, compareTo){
			var parent = model.parent;
			while(parent){
				if(parent === compareTo){
					return true;
				}
				parent = parent.parent;
			}
			return false;
		},
		
		_getTopLevelParent: function(model){
			if(this.topLevel(model)){
				return model;
			}
			var parent = model.parent;
			while(parent){
				if(this.topLevel(parent)){
					return parent;
				}
				parent = parent.parent;
			}
			return null;
		},
		
		_onCollapse: function(model){
			if(this._expanded(model.parent)){
				return model;
			}
			return this._onCollapse(model.parent);
		},
		
		_scan: function(forward, from, to){
			this.setCursor(from);
			var selection = [];
			selection.push(from);
			while(true){
				if(this.iterate(forward)){
					selection.push(this.cursor());
				} else {
					break;
				}
				if(to === this.cursor()){
					return selection;
				}
			}
			selection = [];
			return null;
		},
		
		/**
		 * Set the cursor to the given model
		 * @param {Object} the given model
		 */
		setCursor: function(modelItem) {
			this._prevCursor = this._cursor;
			this._cursor = modelItem;
		},
		
		/**
		 * Set the the first level children
		 * @param {list} the first level children
		 */
		setTree: function(firstLevelChildren) {
			this.firstLevelChildren = firstLevelChildren;
			if(this.firstLevelChildren.length > 0){
				this.root = this.firstLevelChildren[0].parent;
			}
		},
		
		/**
		 * Iterate from the current cursor
		 * @param {object} from the model object that the selection range starts from. Will be included in the return array.
		 * @param {object} to the model object that the selection range ends at. Will be included in the return array.
		 * @returns {Array} The selection of models in the array.
		 */
		scan: function(from, to) {
			var currentCursor = this.cursor();
			var selection = this._scan(true, from, to);
			if(!selection){
				selection = this._scan(false, from, to);
			}
			this.setCursor(currentCursor);
			return selection;
		},
		
		/**
		 * scan a selection range 
		 * @param {boolean} forward the iteration direction. If true then iterate to next, otherwise previous.
		 * @param {boolean} forceExpand optional. the flag for the current cursor to dive into its children. 
		 *                  If the cursor has no children yet or its children are not expanded, this method will call forceExpandFunc.
		 *                  If there is no forceExpandFunc defined it will not expand.
		 */
		iterate: function(forward, forceExpand) {
			return forward ? this._forward(forceExpand) : this._backward(forceExpand);
		},
		
		/**
		 * Iterate from the current cursor only on the top level children
		 * @param {boolean} forward the iteration direction. If true then iterate to next, otherwise previous.
		 * @param {boolean} roundTrip the round trip flag. If true then iterate to the beginning at bottom or end at beginning.
		 */
		iterateOnTop: function(forward, roundTrip) {
			var topSibling = this._findSibling(this._getTopLevelParent(this.cursor()), forward);
			if(topSibling){
				this.setCursor(topSibling);
			} else if(roundTrip && this.firstLevelChildren.length > 0) {
				this.setCursor(forward ? this.firstLevelChildren[0] : this.firstLevelChildren[this.firstLevelChildren.length - 1]);
			}
		},
		
		/**
		 * When the parent model containing the cursor is collapsed, the cursor has to be surfaced to the parent
		 */
		collapse: function(collapsedModel) {
			if(!this._cursor){
				return null;
			}
			if(this._inParentChain(this._cursor, collapsedModel)){
				this.setCursor(collapsedModel);
				return this._cursor;
			}
			return null;
		},
		
		/**
		 * Reset cursor and previous cursor
		 */
		reset: function(){
			this._cursor = null;
			this._prevCursor = null;
			this.root = null;
			//By default the cursor is pointed to the first child 
			if(this.firstLevelChildren.length > 0){
				this._cursor = this.firstLevelChildren[0];
				this.root = this.firstLevelChildren[0].parent;
			}
		},
		
		/**
		 * Convenient method to see if last iterate action moved the cursor
		 */
		cursorMoved: function(){
			return this._cursor !== this._prevCursor;
		},
		
		/**
		 * Get current selected model by the iteration
		 */
		cursor: function(){
			return this._cursor;
		},
		
		/**
		 * Get previously selected model by the iteration
		 */
		prevCursor: function(){
			return this._prevCursor;
		}
	};
	return TreeModelIterator;
}());

return exports;
});
