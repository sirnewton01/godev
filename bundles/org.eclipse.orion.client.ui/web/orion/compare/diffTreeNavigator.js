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
define(['orion/treeModelIterator', 'orion/compare/compareUtils', 'orion/editor/annotations', 'orion/compare/jsdiffAdapter'], function(mTreeModelIterator, mCompareUtils, mAnnotations, mJSDiffAdapter){

var exports = {};

var DiffAnnoTypes = {};

exports.DiffTreeNavigator = (function() {
	/**
	 * Creates a new diff tree model.
	 * A diff tree model represents a tree structure of diffs. 
	 * The top level children represents all the diff blocks based on lines, where each diff block contains a list of word level diffs.
	 *
	 * @name orion.DiffTreeNavigator.DiffTreeNavigator
	 * @class A tree model based iterator component.
	 * @param {list} firstLevelChildren The first level children of the tree root, each item has children and parent property recursively.
	 * @param {Object} options The options object which provides iterate patterns and all call back functions when iteration happens.
	 */
	function DiffTreeNavigator(charOrWordDiff, oldEditor, newEditor, oldDiffBlockFeeder, newDiffBlockFeeder, curveRuler) {
		this._root = {type: "root", children: []}; //$NON-NLS-0$
		this._initialized = false;
		this.initAll(charOrWordDiff, oldEditor, newEditor, oldDiffBlockFeeder, newDiffBlockFeeder, curveRuler);
	}
	
	/**
	 * Annotation type for the block diff 
	 */
	DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK = "orion.annotation.diff.addedBlock"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current block diff
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK = "orion.annotation.diff.currentAddedBlock"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the block diff 
	 */
	DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK = "orion.annotation.diff.deletedBlock"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current block diff
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK = "orion.annotation.diff.currentDeletedBlock"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the block diff, top only 
	 */
	DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY = "orion.annotation.diff.blockTop"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current block diff, top only 
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY = "orion.annotation.diff.currentBlockTop"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the block diff, conflicting 
	 */
	DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT = "orion.annotation.diff.blockConflict"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current block diff, conflicting 
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT = "orion.annotation.diff.currentBlockConflict"; //$NON-NLS-0$
	
	/**
	 * Annotation type for an added word 
	 */
	DiffAnnoTypes.ANNO_DIFF_ADDED_WORD = "orion.annotation.diff.addedWord"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current added word 
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_WORD = "orion.annotation.diff.currentAddedWord"; //$NON-NLS-0$
	
	/**
	 * Annotation type for a deleted word 
	 */
	DiffAnnoTypes.ANNO_DIFF_DELETED_WORD = "orion.annotation.diff.deletedWord"; //$NON-NLS-0$
	
	/**
	 * Annotation type for the current deleted word 
	 */
	DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_WORD = "orion.annotation.diff.currentDeletedWord"; //$NON-NLS-0$
	
	/**
	 * Annotation type for an empty word annotation, putting on the left side of character, e.g (start: 123, end: 123)
	 */
	DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_LEFT = "orion.annotation.diff.emptyDeletedWordLeft"; //$NON-NLS-0$

	/**
	 * Annotation type for an empty word annotation, putting on the right side of character, e.g (start: 123, end: 123)
	 */
	DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_RIGHT = "orion.annotation.diff.emptyDeletedWordRight"; //$NON-NLS-0$
	
	/**
	 * Annotation type for an empty word annotation, putting on the left side of character, e.g (start: 123, end: 123)
	 */
	DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_LEFT = "orion.annotation.diff.emptyAddedWordLeft"; //$NON-NLS-0$

	/**
	 * Annotation type for an empty word annotation, putting on the right side of character, e.g (start: 123, end: 123)
	 */
	DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_RIGHT = "orion.annotation.diff.emptyAddedWordRight"; //$NON-NLS-0$

	/*** registration of all the diff block annotation types ***/
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine addedBlockDiff"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine currentAddedBlockDiff"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine deletedBlockDiff"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine currentDeletedBlockDiff"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine blockDiffTopOnly"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine currentBlockDiffTopOnly"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine blockDiffConflict"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT, {
		title: "",
		html: "",
		lineStyle: {styleClass: "annotationLine currentBlockDiffConflict"} //$NON-NLS-0$
	});
	
	/*** registration of all the diff word annotation types ***/
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_ADDED_WORD, {
		title: "word added", //$NON-NLS-0$
		html: "",
		rangeStyle: {styleClass: "annotationRange addedWordDiff"} //$NON-NLS-0$
	});
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_WORD, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange currentAddedWordDiff"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_DELETED_WORD, {
		title: "word deleted", //$NON-NLS-0$
		html: "",
		rangeStyle: {styleClass: "annotationRange deletedWordDiff"} //$NON-NLS-0$
	});
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_WORD, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange currentDeletedWordDiff"} //$NON-NLS-0$
	});
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_LEFT, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange emptyDeletedWordDiffLeft"} //$NON-NLS-0$
	});
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_RIGHT, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange emptyDeletedWordDiffRight"} //$NON-NLS-0$
	});
	
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_LEFT, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange emptyAddedWordDiffLeft"} //$NON-NLS-0$
	});
	mAnnotations.AnnotationType.registerType(DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_RIGHT, {
		title: "",
		html: "",
		rangeStyle: {styleClass: "annotationRange emptyAddedWordDiffRight"} //$NON-NLS-0$
	});
	
	var MAX_CHAR_DIFF_CHARS_PER_BLOCK = 5000;
	
	DiffTreeNavigator.prototype = /** @lends orion.DiffTreeNavigator.DiffTreeNavigator.prototype */ {
		
		initAll: function(charOrWordDiff, oldEditor, newEditor, oldDiffBlockFeeder, newDiffBlockFeeder, overviewRuler, curveRuler){
			if(!charOrWordDiff){
				this._charOrWordDiff = "word"; //$NON-NLS-0$
			} else {
				this._charOrWordDiff = charOrWordDiff;
			}
			if(oldEditor){
				this._initialized = true;
			}
			this.editorWrapper = [{editor: oldEditor, diffFeeder: oldDiffBlockFeeder},
			                      {editor: newEditor, diffFeeder: newDiffBlockFeeder}];
			this._curveRuler = curveRuler;
			this._overviewRuler = overviewRuler;
			if(this._overviewRuler){
				this._overviewRuler.setDiffNavigator(this);
			}
		},
			
		initMapper: function(mapper){
			if(mapper){
				for(var i = 0; i < this.editorWrapper.length; i++){
					this.editorWrapper[i].diffFeeder.init(this.editorWrapper[i].editor.getTextView().getModel(), mapper);
				}
			}
		},
		
		destroy: function(){
			this.initAll(this._charOrWordDiff);
		},
		
		renderAnnotations: function(ignoreWhitespace){
			var i;
			for(i = 0; i < this.editorWrapper.length; i++){
				this.editorWrapper[i].annoTypes = [];
				this.editorWrapper[i].diffFeeder.getBlockAnnoTypes(this.editorWrapper[i].annoTypes);
				this.editorWrapper[i].diffFeeder.getWordAnnoTypes(this.editorWrapper[i].annoTypes);
				for(var j = 0; j < this.editorWrapper[i].annoTypes.length; j++){
					if(this.editorWrapper[i].annoTypes[j].current){
						this.editorWrapper[i].editor.getAnnotationStyler().addAnnotationType(this.editorWrapper[i].annoTypes[j].current);
					}
					if(this.editorWrapper[i].annoTypes[j].normal){
						this.editorWrapper[i].editor.getAnnotationStyler().addAnnotationType(this.editorWrapper[i].annoTypes[j].normal);
					}
				}
			}
			
			this._root.children = [];
			var oldDiffBlocks = this.editorWrapper[0].diffFeeder.getDiffBlocks();
			if(!oldDiffBlocks || oldDiffBlocks.length === 0){
				this.replaceAllAnnotations(true, 0, "block", false, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 1, "block", false, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 0, "word", false, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 1, "word", false, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 0, "block", true, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 1, "block", true, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 0, "word", true, []); //$NON-NLS-0$
				this.replaceAllAnnotations(true, 1, "word", true, []); //$NON-NLS-0$
				return;
			}
			var adapter = new mJSDiffAdapter.JSDiffAdapter(ignoreWhitespace);
			for(i = 0; i < oldDiffBlocks.length; i++){
				var diffBlockModel = this.generatePairBlockAnnotations(this._root, i);
				this._root.children.push(diffBlockModel);
				var children = this.generatePairWordAnnotations(diffBlockModel, i, adapter);
				if(children){
					diffBlockModel.children = children;
				}
			}
			this.replaceAllAnnotations(false, 0, "block", true); //$NON-NLS-0$
			this.replaceAllAnnotations(false, 1, "block", true); //$NON-NLS-0$
			this.replaceAllAnnotations(false, 0, "word", true); //$NON-NLS-0$
			this.replaceAllAnnotations(false, 1, "word", true); //$NON-NLS-0$
			this.iterator = new mTreeModelIterator.TreeModelIterator(this._root.children);
		},
		
		replaceAllAnnotations: function(removeExisting, wrapperIndex, wordOrBlock, normal, replacingList){
			if(!this.editorWrapper[wrapperIndex].annoTypes){
				return;
			}
			for(var i = 0; i < this.editorWrapper[wrapperIndex].annoTypes.length; i++){
				if(this.editorWrapper[wrapperIndex].annoTypes[i].type === wordOrBlock){
					this.replaceDiffAnnotations(this.editorWrapper[wrapperIndex].editor, replacingList ? replacingList : this.editorWrapper[wrapperIndex].annoTypes[i].list, 
												normal ? this.editorWrapper[wrapperIndex].annoTypes[i].normal : this.editorWrapper[wrapperIndex].annoTypes[i].current, removeExisting);
				}
			}
		},
		
		getMapper: function(){
			return this.editorWrapper[0].diffFeeder.getMapper();
		},
		
		getFeeder: function(left){
			return left ? this.editorWrapper[1].diffFeeder : this.editorWrapper[0].diffFeeder;
		},
		
		iterateOnBlock: function(forward, roundTrip){
			if(!this.iterator){
				return;
			}
			this.iterator.iterateOnTop(forward, roundTrip);
			this.updateCurrentAnnotation(true);
		},
			
		iterateOnChange: function(forward){
			if(!this.iterator){
				return null;
			}
			var retVal = this.iterator.iterate(forward);
			if(retVal) {
				var cursor = this.iterator.cursor();
				if(cursor.type === "block" && cursor.children && cursor.children.length > 0){ //$NON-NLS-0$
					this.iterator.iterate(forward);
				}
				this.updateCurrentAnnotation(true);
			}
			return retVal;
		},
		
		/**
		 * Goes to the change at the specified changeIndex in the current file.
		 * 
		 * @param[in] changeIndex The index of the desired change in the current file.
		 */
		gotoChangeUsingIndex: function(changeIndex) {
			var count = 0;
			var blockIndex = 0;
			
			if (0 <= changeIndex) {
				// iterate through blocks looking for the one that contains 
				// the change with the specified changeIndex
				while (blockIndex < this._root.children.length) {
					var numChangesInCurrentBlock = this._root.children[blockIndex].children.length;
					if (((count + numChangesInCurrentBlock) - 1) < changeIndex) {
						count += numChangesInCurrentBlock; //keep going
					} else {
						// found block, go to change in block
						var changeIndexInBlock = changeIndex - count;
						return this.gotoBlock(blockIndex, changeIndexInBlock);
					}
					blockIndex++;
				}
			}
		},
		
		gotoBlock: function(blockIndex, changeIndex){
			if(!this.iterator){
				return;
			}
			if(blockIndex < 0 || blockIndex >= this._root.children.length || this._root.children.length === 0){
				blockIndex = 0;
			}
			if(changeIndex !== undefined && changeIndex >= 0 && this._root.children[blockIndex].children && changeIndex < this._root.children[blockIndex].children.length){
				this.iterator.setCursor(this._root.children[blockIndex].children[changeIndex]);
			} else {
				this.iterator.setCursor(this._root.children[blockIndex]);
			}
			this.updateCurrentAnnotation(false);
			this._positionDiffBlock();
		},
		
		_hitDiffAnnotation: function(wrapperIndex, caretPosition, textView){
			if(textView !== this.editorWrapper[wrapperIndex].editor.getTextView()){
				return;
			}
			for(var i = 0; i < this._root.children.length; i++){
				var block = this._root.children[i];
				var blockAnno  = wrapperIndex===0 ? block.oldA : block.newA;
				if(caretPosition >= blockAnno.start && caretPosition <= blockAnno.end){
					var currentHit = block;
					if(block.children && block.children.length > 0){
						for(var j = 0; j < block.children.length; j++){
							var word = block.children[j];
							var wordAnno  = wrapperIndex===0 ? word.oldA : word.newA;
							if(caretPosition >= wordAnno.start && caretPosition <= wordAnno.end){
								currentHit = word;
								break;
							}
						}
					}
					return currentHit;
				}
			}
			return null;
		},
		
		gotoChange: function(caretPosition, textView){
			for(var i = 0; i < this.editorWrapper.length; i++){
				var hit = this._hitDiffAnnotation(i, caretPosition, textView);
				if(hit){
					this.iterator.setCursor(hit);
					this.updateCurrentAnnotation(false, textView);
					return true;
				}
			}
			return false;
		},
		
		getCurrentBlockIndex: function(){
			if(!this.iterator){
				return -1;
			}
			var cursor = this.iterator.cursor();
			if(!cursor) {
				return -1;
			}
			if(cursor.type === "block"){ //$NON-NLS-0$
				return cursor.index;
			} else {
				return cursor.parent.index;
			}
		},
		
		getCurrentPosition: function(){
			if(!this.iterator){
				return {};
			}
			var cursor = this.iterator.cursor();
			if(!cursor){
				return {};
			}
			if(cursor.type === "block"){ //$NON-NLS-0$
				return {block: cursor.index+1};
			} else {
				return {block: cursor.parent.index+1, change: cursor.index+1};
			}
		},
		
		getCurrentMapperIndex: function(){
			var blockIndex = this.getCurrentBlockIndex();
			if(blockIndex < 0){
				blockIndex = 0;
			}
			var diffBlocks = this.getFeeder().getDiffBlocks();
			if(!diffBlocks || diffBlocks.length === 0){
				return -1;
			}
			if(blockIndex > (diffBlocks.length - 1) ){
				blockIndex = 0;
			}
			return diffBlocks[blockIndex][1];
		},
		
		replaceDiffAnnotations: function(editor, overallAnnotations, type, removeExisting){
			if(!overallAnnotations || !type){
				return;
			}
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel){
				return;
			}
			var iter = annotationModel.getAnnotations();
			var remove = [];
			while (removeExisting && iter.hasNext()) {
				var annotation = iter.next();
				if (annotation.type === type) {
					remove.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(remove, overallAnnotations);
		},
		
		updateCurrentAnnotation: function(moveSelection, textView){
			this.replaceAllAnnotations(true, 0, "block", false, []); //$NON-NLS-0$
			this.replaceAllAnnotations(true, 1, "block", false, []); //$NON-NLS-0$
			this.replaceAllAnnotations(true, 0, "word", false, []); //$NON-NLS-0$
			this.replaceAllAnnotations(true, 1, "word", false, []); //$NON-NLS-0$
			if(!this.iterator){
				return;
			}
			var cursor = this.iterator.cursor();
			if(!cursor){
				return;
			}
			var annoType0, annoType1;
			var annoPosOld = {start: cursor.oldA.start, end: cursor.oldA.end};
			var annoPosNew = {start: cursor.newA.start, end: cursor.newA.end};
			if(cursor.type === "word"){ //$NON-NLS-0$
				annoType0 = this.editorWrapper[0].diffFeeder.getCurrentWordAnnoType(annoPosOld, this.editorWrapper[0].editor.getTextView().getModel());
				annoType1 = this.editorWrapper[1].diffFeeder.getCurrentWordAnnoType(annoPosNew, this.editorWrapper[1].editor.getTextView().getModel());
			} else {
				annoType0 = this.editorWrapper[0].diffFeeder.getCurrentBlockAnnoType(cursor.index);
				annoType1 = this.editorWrapper[1].diffFeeder.getCurrentBlockAnnoType(cursor.index);
			}
			if(annoType0){
				this.replaceDiffAnnotations(this.editorWrapper[0].editor, [new (mAnnotations.AnnotationType.getType(annoType0.current))(annoPosOld.start, annoPosOld.end)], annoType0, true);
			}
			if(annoType1){
				this.replaceDiffAnnotations(this.editorWrapper[1].editor, [new (mAnnotations.AnnotationType.getType(annoType1.current))(annoPosNew.start, annoPosNew.end)], annoType1, true);
			}
			if(moveSelection){
				this.autoSelecting = true;
				this.editorWrapper[0].editor.setSelection(cursor.oldA.start, cursor.oldA.end, true);
				this.editorWrapper[1].editor.setSelection(cursor.newA.start, cursor.newA.end, true);
				this.autoSelecting = false;
			} else if(textView) {
				this.autoSelecting = true;
				if(textView !== this.editorWrapper[0].editor.getTextView()){
					this.editorWrapper[0].editor.setSelection(cursor.oldA.start, cursor.oldA.end, true);
				}
				if(textView !== this.editorWrapper[1].editor.getTextView()){
					this.editorWrapper[1].editor.setSelection(cursor.newA.start, cursor.newA.end, true);
				}
				this.autoSelecting = false;
			}
		},
			
		generatePairBlockAnnotations: function(parentObj, diffBlockIndex){
			var oldBlockAnno = this.generateBlockDiffAnnotations(0, diffBlockIndex);
			var newBlockAnno = this.generateBlockDiffAnnotations(1, diffBlockIndex);
			return {parent: parentObj, index: diffBlockIndex, type: "block", oldA: oldBlockAnno, newA: newBlockAnno}; //$NON-NLS-0$
		},
		
		generatePairWordAnnotations: function(parentObj, diffBlockIndex, jsDiffAdapter){
			var textOld = this.editorWrapper[0].diffFeeder.getTextOnBlock(diffBlockIndex);
			var textNew = this.editorWrapper[1].diffFeeder.getTextOnBlock(diffBlockIndex);
			var charDiffMap = null;
			var startOld = 0;
			var startNew = 0;
			//If either side of the diff block has more than 5000 charactors, the char level diff on the js diff side becomes slow. It will accumulate the latency of comapre widget.
			//Given that a diff block with moret than 5000 charactors has very less meaning of indicating all the char level diff, we are disabling the char diff.
			//Only diff blocks with less than 5000 charactors on both side will get char level diff.
			//See https://bugs.eclipse.org/bugs/show_bug.cgi?id=399500.
			if(textOld && textNew && textOld.text && textNew.text && textOld.text.length <= MAX_CHAR_DIFF_CHARS_PER_BLOCK && textNew.text.length <= MAX_CHAR_DIFF_CHARS_PER_BLOCK){
				charDiffMap = jsDiffAdapter.adaptCharDiff(textOld.text, textNew.text, this._charOrWordDiff === "word"); //$NON-NLS-0$
				startNew = textNew.start;
				startOld = textOld.start;
			} else {
				return null;
			}
			var oldAnnotations = [];
			var newAnnotations = [];
			this.generateWordDiffAnnotations(0, oldAnnotations, startOld, charDiffMap, 2, 3);
			this.generateWordDiffAnnotations(1, newAnnotations, startNew, charDiffMap, 0, 1);
			var pairAnnotations = [];
			for(var i = 0; i < oldAnnotations.length; i++){
				pairAnnotations.push({parent: parentObj, index: i, type: "word", oldA: oldAnnotations[i], newA: newAnnotations[i]}); //$NON-NLS-0$
			} 
			return pairAnnotations;
		},
		
		getAnnoModelList: function(wrapperIndex, wordOrBlock, annoType){
			for(var i = 0; i < this.editorWrapper[wrapperIndex].annoTypes.length; i++){
				if(this.editorWrapper[wrapperIndex].annoTypes[i].type === wordOrBlock &&
				   this.editorWrapper[wrapperIndex].annoTypes[i].normal === annoType){
					return this.editorWrapper[wrapperIndex].annoTypes[i].list;
				}
			}
			return null;
		},
		
		generateBlockDiffAnnotations: function(wrapperIndex, diffBlockIndex){
			var type = this.editorWrapper[wrapperIndex].diffFeeder.getCurrentBlockAnnoType(diffBlockIndex);
			var annoList = this.getAnnoModelList(wrapperIndex, "block", type.normal); //$NON-NLS-0$
			var range = this.editorWrapper[wrapperIndex].diffFeeder.getCharRange(diffBlockIndex);
			var annotation = mAnnotations.AnnotationType.createAnnotation(type.normal, range.start, range.end);
			if(annoList){
				annoList.push(annotation);
			}
			return annotation;
		},
		
		generateWordDiffAnnotations: function(wrapperIndex, diffBlockAnnotaionArray, startIndex, charDiffMap, startColumn, endColumn){
			if(charDiffMap){
				var type = this.editorWrapper[wrapperIndex].diffFeeder.getCurrentWordAnnoType({start: -1, end: -1});
				var annoList = this.getAnnoModelList(wrapperIndex, "word", type.normal); //$NON-NLS-0$
				for(var i = 0; i < charDiffMap.length; i++){
					var start = charDiffMap[i][startColumn] + startIndex;
					var end = charDiffMap[i][endColumn] + startIndex;
					var annotation = mAnnotations.AnnotationType.createAnnotation(type.normal, start, end);
					annoList.push(annotation);
					diffBlockAnnotaionArray.push(annotation);
				}
			}
		},
		
		/* Navigation APIs */
		_updateOverviewRuler: function(){
			if(this._overviewRuler){
				var drawLine = this.editorWrapper[0].editor.getTextView().getTopIndex() ;
				this.editorWrapper[0].editor.getTextView().redrawLines(drawLine , drawLine+  1 , this._overviewRuler);
			}
		},
		
		_updateCurveRuler: function(){
			if(this._curveRuler){
				this._curveRuler.render();
			}
		},
		
		_setTextViewPosition: function (textView , lineIndex){
			var lineHeight = textView.getLineHeight();
			var clientArea = textView.getClientArea();
			var lines = Math.floor(clientArea.height / lineHeight/3);
			textView.setTopIndex((lineIndex - lines) > 0 ? lineIndex - lines : 0);
		},

		_positionDiffBlock: function(){
			var blockIndex = this.getCurrentBlockIndex();
			if(blockIndex < 0){
				blockIndex = 0;
			}
			var diffBlocks = this.getFeeder().getDiffBlocks();
			if(diffBlocks.length === 0) {
				return;
			}
			this._setTextViewPosition(this.editorWrapper[0].editor.getTextView() , diffBlocks[blockIndex][0]);
			if(this.editorWrapper[0].editor !== this.editorWrapper[1].editor){
				var lineIndexL = mCompareUtils.lookUpLineIndex(this.getMapper(), 0, diffBlocks[blockIndex][1]);
				this._setTextViewPosition(this.editorWrapper[1].editor.getTextView() , lineIndexL);
			}
			this._updateOverviewRuler();
			this._updateCurveRuler();
		},
		
		matchPositionFromOverview: function(lineIndex){
			if(!this._initialized){
				return;
			}
			var diffblockIndex;
			if(lineIndex < 0){
				diffblockIndex = 0;
			} else {
				diffblockIndex = mCompareUtils.getAnnotationIndex(this.getFeeder().getDiffBlocks(), lineIndex);
			}
			this.gotoBlock(diffblockIndex);
		},
		
		gotoDiff: function(caretPosition, textView){
			if(this.gotoChange(caretPosition, textView)){
				this._updateOverviewRuler();
				this._updateCurveRuler();
			}
		},

		nextDiff: function(){
			this.iterateOnBlock(true, true);
			this._positionDiffBlock();
		},
		
		prevDiff: function(){
			this.iterateOnBlock(false, true);
			this._positionDiffBlock();
		},
		
		nextChange: function(){
			var ret = this.iterateOnChange(true);
			this._positionDiffBlock();
			return ret;
		},
		
		prevChange: function(){
			this.iterateOnChange(false);
			this._positionDiffBlock();
		}
	};
	return DiffTreeNavigator;
}());

exports.DiffBlockFeeder = (function() {
	/**
	 * Creates a new generic diff block feeder
	 * Each item in the feeder is represented by a pair of number [lineIndexOfTheTextModel, correspondingMapperIndex]. 
	 *
	 * @name orion.DiffTreeNavigator.TwoWayDiffBlockFeeder
	 * @class A feeder to feed all the diff blocks based on the line index and mapper index.
	 * @param {orion.editor.TextModel} The text model of the whole text.
	 * @param {array} The mapper generated from the unified diff.
	 * @param {integer} The column index where the line index can be calculated.
	 */
	function DiffBlockFeeder() {
	}
	
	DiffBlockFeeder.prototype = /** @lends orion.DiffTreeNavigator.TwoWayDiffBlockFeeder.prototype */ {
		
		_isAddedSide: function(){
			return this._mapperColumnIndex === 0;
		},
				
		getWordAnnoTypes: function(result){
			if(this._isAddedSide()){
				result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_WORD, normal: DiffAnnoTypes.ANNO_DIFF_ADDED_WORD, list: []}); //$NON-NLS-0$
			} else {
				result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_WORD, normal: DiffAnnoTypes.ANNO_DIFF_DELETED_WORD, list: []}); //$NON-NLS-0$
			}
			result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_LEFT}); //$NON-NLS-0$
			result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_RIGHT}); //$NON-NLS-0$
			result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_LEFT}); //$NON-NLS-0$
			result.push({type: "word", current: DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_RIGHT}); //$NON-NLS-0$
		},
 
		getCurrentWordAnnoType: function(annoPosition, textModel){
			if(annoPosition.start === annoPosition.end && textModel){
				if(this._isAddedSide()){
					return {current: this._repositionEmptyWord(annoPosition, textModel), normal: DiffAnnoTypes.ANNO_DIFF_ADDED_WORD};
				} else {
					return {current: this._repositionEmptyWord(annoPosition, textModel), normal: DiffAnnoTypes.ANNO_DIFF_DELETED_WORD};
				}
			} else {
				if(this._isAddedSide()){
					return {current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_WORD, normal: DiffAnnoTypes.ANNO_DIFF_ADDED_WORD};
				} else {
					return {current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_WORD, normal: DiffAnnoTypes.ANNO_DIFF_DELETED_WORD};
				}
			}
		},
		
		_repositionEmptyWord: function(annoPosition, textModel){
			var lineIndex = textModel.getLineAtOffset(annoPosition.start);
			var lineStart = textModel.getLineStart(lineIndex);
			var lineEnd = textModel.getLineEnd(lineIndex);
			if(lineStart !== lineEnd){
				if(annoPosition.start === lineEnd){
					annoPosition.start--;
					return this._isAddedSide() ? DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_RIGHT : DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_RIGHT;
				}
				annoPosition.end++;
				return this._isAddedSide() ? DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_LEFT : DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_LEFT;
			} else if (lineIndex > 0){
				lineIndex--;
				lineStart = textModel.getLineStart(lineIndex);
				lineEnd = textModel.getLineEnd(lineIndex);
				if(lineStart !== lineEnd){
					annoPosition.start = lineEnd -1;
					annoPosition.end = lineEnd;
					return this._isAddedSide() ? DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_RIGHT : DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_RIGHT;
				}
			}
			return this._isAddedSide() ? DiffAnnoTypes.ANNO_DIFF_EMPTY_ADDED_WORD_LEFT : DiffAnnoTypes.ANNO_DIFF_EMPTY_DELETED_WORD_LEFT;
		},
		
		getMapper: function(){
			return this._mapper;
		},
		
		getDiffBlocks: function(){
			return this._diffBlocks;
		},
		
		getDiffBlockH: function(diffBlockIndex){
			if(!this._diffBlocks || this._diffBlocks.length === 0){
				return -1;
			}
			var mapperIndex = this._diffBlocks[diffBlockIndex][1];
			return (mapperIndex === -1) ? 0 :this._mapper[mapperIndex][this._mapperColumnIndex];
		},
		
		getOverviewLineCount: function(){
			return this._textModel.getLineCount();
		},
		
		getLineNumber: function(lineIndex){
			return lineIndex;
		},
		
		getCharRange: function(blockIndex){
			if(!this._diffBlocks || this._diffBlocks.length === 0){
				return null;
			}
			var mapperIndex = this._diffBlocks[blockIndex][1];
			var startLine = this._diffBlocks[blockIndex][0];
			var endLine = startLine + this._mapper[mapperIndex][this._mapperColumnIndex] -1;
			var startIndex = this._textModel.getLineStart(startLine);
			if(endLine < startLine){
				return {start: startIndex, end: startIndex};
			}
			var endIndex = this._textModel.getLineEnd(endLine, true);
			return {start: startIndex, end: endIndex};
		},
		
		getTextOnBlock: function(blockIndex){
			if(!this._diffBlocks || this._diffBlocks.length === 0){
				return null;
			}
			var mapperIndex = this._diffBlocks[blockIndex][1];
			if(this._mapper[mapperIndex][0] === 0 || this._mapper[mapperIndex][1] === 0 || this._mapper[mapperIndex][2] === 0){
				//return null;
			}
			var charRange = this.getCharRange(blockIndex);
			return {start: charRange.start, text: this._textModel.getText(charRange.start, charRange.end)};
		},

		isMapperEmpty: function(){
			return this._mapper.length === 0;
		}
	};
	return DiffBlockFeeder;
}());

exports.TwoWayDiffBlockFeeder = (function() {
	/**
	 * Creates a new diff block feeder of one side of the two way compare widget.
	 * Each item in the feeder is represented by a pair of number [lineIndexOfTheTextModel, correspondingMapperIndex]. 
	 *
	 * @name orion.DiffTreeNavigator.TwoWayDiffBlockFeeder
	 * @class A feeder to feed all the diff blocks based on the line index and mapper index.
	 * @param {orion.editor.TextModel} The text model of the whole text.
	 * @param {array} The mapper generated from the unified diff.
	 * @param {integer} The column index where the line index can be calculated.
	 * @param {Boolean} reverseAnnotation Normally the left hand side fo the compare is annotated as geen and the right hand side uses red.
	 *        If this flag is true, we use green annotations on the right and red on the left.
	 */
	function TwoWayDiffBlockFeeder(model, mapper, mapperColumnIndex, reverseAnnotation) {
	    this._mapperColumnIndex = mapperColumnIndex;
	    this._reverseAnnotation = reverseAnnotation;
	    this.init(model, mapper);
	}
	TwoWayDiffBlockFeeder.prototype = new exports.DiffBlockFeeder(); 
	TwoWayDiffBlockFeeder.prototype._isAddedSide = function(){
		return (this._reverseAnnotation ? this._mapperColumnIndex !== 0 : this._mapperColumnIndex === 0);
	};
	TwoWayDiffBlockFeeder.prototype.init = function(model, mapper){
	    this._textModel = model;
		this._diffBlocks = undefined;
		if(mapper){
			this._mapper = mapper;
			this._diffBlocks = [];
			var curLineindex = 0;//zero based
			for (var i = 0 ; i < this._mapper.length ; i++){
				if((this._mapper[i][2] !== 0)){
					this._diffBlocks.push([curLineindex , i]);
				}
				curLineindex += this._mapper[i][this._mapperColumnIndex];
			}
		}
	};
	TwoWayDiffBlockFeeder.prototype.getBlockAnnoTypes = function(result){
		if(this._isAddedSide()){
			result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK, list: []}); //$NON-NLS-0$
		} else {
			result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK, list: []}); //$NON-NLS-0$
		}
		result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY, list: []}); //$NON-NLS-0$
		result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT, list: []}); //$NON-NLS-0$
	};
	TwoWayDiffBlockFeeder.prototype.getCurrentBlockAnnoType = function(diffBlockIndex){
		if(!this._diffBlocks || this._diffBlocks.length === 0 || this._diffBlocks.length <= diffBlockIndex){
			return null;
		}
		var mapperIndex = this._diffBlocks[diffBlockIndex][1];
		if(this._mapper[mapperIndex][this._mapperColumnIndex] === 0){
			return {normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY};
		} else if(mCompareUtils.isMapperConflict(this.getMapper(), mapperIndex)){
			return {normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT};
		} else if(this._isAddedSide()){
			return {type: "block", normal: DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK, list: []}; //$NON-NLS-0$
		} 
		return {type: "block", normal: DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK, list: []}; //$NON-NLS-0$
	};
	return TwoWayDiffBlockFeeder;
}());

exports.inlineDiffBlockFeeder = (function() {
	/**
	 * Creates a new diff block feeder of one side of the two way compare widget.
	 * Each item in the feeder is represented by a pair of number [lineIndexOfTheTextModel, correspondingMapperIndex]. 
	 *
	 * @name orion.DiffTreeNavigator.inlineDiffBlockFeeder
	 * @class A feeder to feed all the diff blocks based on the line index and mapper index.
	 * @param {orion.editor.TextModel} The text model of the whole text.
	 * @param {array} The mapper generated from the unified diff.
	 * @param {integer} The column index where the line index can be calculated.
	 */
	function inlineDiffBlockFeeder(mapper, mapperColumnIndex) {
	    this._mapperColumnIndex = mapperColumnIndex;
	    this.init(mapper);
	}
	inlineDiffBlockFeeder.prototype = new exports.DiffBlockFeeder(); 
	inlineDiffBlockFeeder.prototype.setModel = function(model){
	    this._textModel = model;
	};
	inlineDiffBlockFeeder.prototype.init = function( mapper){
		this._diffBlocks = undefined;
		if(mapper){
			this._mapper = mapper;
			this._diffBlocks = [];
			this._gapBlocks = [];
			var curLineindex = 0;//zero based
			var curGapLineindex = 0;//zero based
			for (var i = 0 ; i < this._mapper.length ; i++){
				if((this._mapper[i][2] !== 0)){
					if(this._isAddedSide()){//adding block
						var startLineIndex = curLineindex + this._mapper[i][1];
						this._diffBlocks.push([startLineIndex , i]);
						this._gapBlocks.push([startLineIndex , startLineIndex + this._mapper[i][0], curGapLineindex]);
					} else {
						this._diffBlocks.push([curLineindex, i]);
						this._gapBlocks.push([curLineindex, curLineindex + this._mapper[i][1], curGapLineindex]);
					}
					curLineindex += this._mapper[i][0] +  this._mapper[i][1];
				} else {
					this._gapBlocks.push([curLineindex, curLineindex + this._mapper[i][this._mapperColumnIndex], curGapLineindex]);
					curLineindex += this._mapper[i][this._mapperColumnIndex];
				}
				curGapLineindex += this._mapper[i][this._mapperColumnIndex];
			}
		}
	};
	inlineDiffBlockFeeder.prototype.getBlockAnnoTypes = function(result){
		if(this._isAddedSide()){
			result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK, list: []}); //$NON-NLS-0$
		} else {
			result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK, list: []}); //$NON-NLS-0$
		}
		//We do not want to show the empty line annotation i ninline compare
		//result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY, list: []});
		result.push({type: "block", normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT, list: []}); //$NON-NLS-0$
	};
	inlineDiffBlockFeeder.prototype.getCurrentBlockAnnoType = function(diffBlockIndex){
		if(!this._diffBlocks || this._diffBlocks.length === 0){
			return null;
		}
		var mapperIndex = this._diffBlocks[diffBlockIndex][1];
		if(this._mapper[mapperIndex][this._mapperColumnIndex] === 0){
			//We do not want to show the empty line annotation i ninline compare
			//return {normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_TOPONLY, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_TOPONLY};
			return({current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_WORD, normal: DiffAnnoTypes.ANNO_DIFF_ADDED_WORD});
		} else if(mCompareUtils.isMapperConflict(this.getMapper(), mapperIndex)){
			return {normal: DiffAnnoTypes.ANNO_DIFF_BLOCK_CONFLICT, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_BLOCK_CONFLICT};
		} else if(this._isAddedSide()){
			return {type: "block", normal: DiffAnnoTypes.ANNO_DIFF_ADDED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_ADDED_BLOCK, list: []}; //$NON-NLS-0$
		} 
		return {type: "block", normal: DiffAnnoTypes.ANNO_DIFF_DELETED_BLOCK, current: DiffAnnoTypes.ANNO_DIFF_CURRENT_DELETED_BLOCK, list: []}; //$NON-NLS-0$
	};
	inlineDiffBlockFeeder.prototype.getDiffBlockH = function(diffBlockIndex){
		if(!this._diffBlocks || this._diffBlocks.length === 0){
			return -1;
		}
		var mapperIndex = this._diffBlocks[diffBlockIndex][1];
		return this._mapper[mapperIndex][0] + this._mapper[mapperIndex][1];
	};
	inlineDiffBlockFeeder.prototype.getLineNumber = function(lineIndex){
		for(var i = 0; i < this._gapBlocks.length; i++){
			if(this._gapBlocks[i][0] !== this._gapBlocks[i][1]){
				if(lineIndex >= this._gapBlocks[i][0] && lineIndex < this._gapBlocks[i][1]){
					var delta = lineIndex - this._gapBlocks[i][0];
					return delta + this._gapBlocks[i][2];
				}
			}
		}
		return -1;
	};
	return inlineDiffBlockFeeder;
}());

return exports;
});
