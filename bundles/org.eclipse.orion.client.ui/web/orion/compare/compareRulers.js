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

/*eslint-env browser, amd*/
define(['orion/compare/compareUtils'], function(mCompareUtils) {
var orion = orion || {};

orion.CompareRuler = (function() {
	/**
	 * Creates a new ruler for the compare editor.
	 * @class The compare ruler is used by the compare editor to render trim around the editor.
	 * @name orion.compare.rulers.CompareRuler
	 */
	function CompareRuler (rulerLocation, rulerOverview, rulerStyle) {
		this._location = rulerLocation || "left"; //$NON-NLS-0$
		this._overview = rulerOverview || "page"; //$NON-NLS-0$
		this._rulerStyle = rulerStyle;
		this._editor = null;
		var self = this;
		this._listener = {
			onModelChanged: function(e) {
				self._onModelChanged(e);
			}
		};
	}
	CompareRuler.prototype = /** @lends orion.compare.rulers.CompareRuler.prototype */ {
		setView: function (editor) {
			if (this._onModelChanged && this._editor) {
				this._editor.removeEventListener("ModelChanged", this._listener.onModelChanged);  //$NON-NLS-0$
			}
			this._editor = editor;
			if (this._onModelChanged && this._editor) {
				this._editor.addEventListener("ModelChanged", this._listener.onModelChanged); //$NON-NLS-0$
			}
		},
		getLocation: function() {
			return this._location;
		},
		getOverview: function(editor) {
			return this._overview;
		},
		getAnnotationModel: function() {
			return null;
		},
		addAnnotationType: function(type) {
		},
		isAnnotationTypeVisible: function(type) {
			return false;
		},
		removeAnnotationType: function(type) {
		},
		setAnnotationModel: function (annotationModel) {
		},
		getAnnotations: function(startLine, endLine) {
			var result = [];
			for (var i=startLine; i<endLine; i++) {
				var style = this.getStyle(i);
				if(style){
					result[i] = {html: this.getHTML(i), style: style};
				}
			}
			return result;
		},
		getWidestAnnotation: function() {
			return {html: this.getHTML(-1), style: this.getStyle(-1)};
		},
		getRulerStyle: function() {
			return this.getStyle(undefined);
		}
	};
	return CompareRuler;
}());

orion.LineNumberCompareRuler = (function() {
	/**
	 * Creates a new line number ruler for the compare editor.
	 * @class The line number ruler is used by the compare editor to render line numbers next to the editor
	 * @name orion.compare.rulers.LineNumberCompareRuler
	 */
	function LineNumberCompareRuler (diffNavigator, mapperColumnIndex , rulerLocation, rulerStyle, oddStyle, evenStyle) {
		orion.CompareRuler.call(this, rulerLocation, "page", rulerStyle); //$NON-NLS-0$
		this._diffNavigator = diffNavigator;
		this._oddStyle = oddStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._evenStyle = evenStyle || {style: {backgroundColor: "white"}}; //$NON-NLS-0$
		this._numOfDigits = 0;
		this._mapperColumnIndex = mapperColumnIndex;
	}
	LineNumberCompareRuler.prototype = new orion.CompareRuler(); 
	LineNumberCompareRuler.prototype.getStyle = function(lineIndex) {
		if (lineIndex === undefined) {
			return this._rulerStyle;
		} else {
			return this._evenStyle;
		}
	};
	LineNumberCompareRuler.prototype.getHTML = function(lineIndex) {
		var model = this._editor.getModel();
		var diffFeeder = this._diffNavigator.getFeeder(this._mapperColumnIndex === 0);
		if(!diffFeeder){
			return "";
		}
		if (lineIndex === -1) {
			return model.getLineCount();
		} else {
			if( diffFeeder.getLineNumber){
				var realIndex = diffFeeder.getLineNumber(lineIndex);
				if(realIndex === -1){
					return "";
				}
				return  realIndex + 1;
			} 
			return lineIndex + 1;
		}
	};
	LineNumberCompareRuler.prototype._onModelChanged = function(e) {
		var start = e.start;
		var model = this._editor.getModel();
		var lineCount = model.getLineCount();
		var numOfDigits = (lineCount+"").length;
		if (this._numOfDigits !== numOfDigits) {
			this._numOfDigits = numOfDigits;
			var startLine = model.getLineAtOffset(start);
			this._editor.redrawLines(startLine, lineCount, this);
		}
	};
	return LineNumberCompareRuler;
}());

orion.CompareOverviewRuler = (function() {
	function CompareOverviewRuler ( rulerLocation, rulerStyle , diffNavigator , onClick) {
		this._diffNavigator = diffNavigator;
		this._onClick = onClick;
		orion.CompareRuler.call(this, rulerLocation, "document", rulerStyle); //$NON-NLS-0$
	}
	CompareOverviewRuler.prototype = new orion.CompareRuler();
	CompareOverviewRuler.prototype.getStyle = function(lineIndex) {
		var result, style;
		if (lineIndex === undefined) {
			result = this._rulerStyle || {};
			style = result.style || (result.style = {});
			style.lineHeight = "1px"; //$NON-NLS-0$
			style.fontSize = "1px"; //$NON-NLS-0$
			style.width = "14px"; //$NON-NLS-0$
		} else {
			if (lineIndex !== -1) {
				result = {styleClass: "annotationOverview breakpoint"} || {}; //$NON-NLS-0$
			} else {
				result = {};
			}
			style = result.style || (result.style = {});
			style.cursor = "pointer"; //$NON-NLS-0$
			style.width = "8px"; //$NON-NLS-0$
			//style.height = "3px";
			style.left = "2px"; //$NON-NLS-0$
			if(lineIndex >= 0 ){
				var diffBlocks;
				if(this._diffNavigator && this._diffNavigator.getFeeder()){
					diffBlocks = this._diffNavigator.getFeeder().getDiffBlocks();
				} else {
					return null;
				}
				
				var annotationIndex = mCompareUtils.getAnnotationIndex(diffBlocks, lineIndex);
				if (annotationIndex === -1){
					return null;
				}
				var mapperIndex = mCompareUtils.getAnnotationMapperIndex(diffBlocks, annotationIndex);
				var mapper;
				mapper = this._diffNavigator.getMapper();
				var conflict = mCompareUtils.isMapperConflict(mapper, mapperIndex);
				if(conflict){
					style.border = "1px #FF0000 solid"; //$NON-NLS-0$
				}
				if(annotationIndex === this._diffNavigator.getCurrentBlockIndex()){
					style.backgroundColor = conflict ? "red" :"blue"; //$NON-NLS-1$ //$NON-NLS-0$
				}
				var anH = this._diffNavigator.getFeeder().getDiffBlockH(annotationIndex);
				var lC = this._diffNavigator.getFeeder().getOverviewLineCount();
				if(anH < 0){
					return null;
				}
				var clientArea = this._editor.getClientArea();
				var height =  Math.floor(clientArea.height*anH/lC);
				if (height < 2){
					height = 2;
				}
				style.height = height +"px"; //$NON-NLS-0$
			} else {
				return null;
			}
		}
		return result;
	};
	CompareOverviewRuler.prototype.setDiffNavigator = function(diffNavigator) {
		this._diffNavigator = diffNavigator;
	};
	CompareOverviewRuler.prototype.getHTML = function(lineIndex) {
		return "&nbsp;"; //$NON-NLS-0$
	};
	CompareOverviewRuler.prototype.onClick = function(lineIndex, e) {
		if (lineIndex === undefined) { return; }
		this._onClick(lineIndex , this);
	};
	CompareOverviewRuler.prototype._onModelChanged = function(e) {
		var model = this._editor.getModel();
		var lineCount = model.getLineCount();
		if(lineCount > 0){
			this._editor.redrawLines(0, 1, this);
		}
	};
	return CompareOverviewRuler;
}());


orion.CompareCurveRuler =  (function() {

	function CompareCurveRuler(canvasDiv) {
		this._canvasDiv = canvasDiv;
		this._mapper = undefined;
	}

	CompareCurveRuler.prototype =  {
		init: function(mapper , leftEditor , rightEditor, diffNavigator ){
			this._leftIniting = true;
			this._rightIniting = true;
			this._rightIniting = true;
			this._mapper = mapper;
			this._leftEditor = leftEditor;
			this._rightEditor = rightEditor;
			this._leftTextView = leftEditor.getTextView();
			this._rightTextView = rightEditor.getTextView();
			this._diffNavigator = diffNavigator;
			this.render();
		},
		
		matchPositionFrom: function(fromLeft){
			var baseEditor = fromLeft ? this._leftTextView : this._rightTextView;
			var matchEditor = fromLeft ? this._rightTextView : this._leftTextView;
			var topLine = baseEditor.getTopIndex();
			var bottomLine = baseEditor.getBottomIndex();
			var matchLine = mCompareUtils.matchMapper(this._mapper , fromLeft ? 0: 1 , topLine , bottomLine);
			matchEditor.setTopIndex(matchLine);
		},

		copyTo: function(left){
			if(!this._diffNavigator.iterator){
				return;
			}
			var currentDiff = this._diffNavigator.iterator.cursor();
			if(currentDiff){
				var shouldCopy;
				if(currentDiff.type === "word") {  //$NON-NLS-0$}
					shouldCopy = (!currentDiff.copied && !currentDiff.parent.copied);
				} else {
					shouldCopy = !currentDiff.copied;
				}
				if(!shouldCopy) {
					return;
				}
				var textToCopy = left ? this._rightTextView.getText(currentDiff.oldA.start , currentDiff.oldA.end) : this._leftTextView.getText(currentDiff.newA.start , currentDiff.newA.end);
				var rangeToPaste = left ? currentDiff.newA :  currentDiff.oldA;
				var viewToPaste = left ? this._leftTextView : this._rightTextView;
				viewToPaste.setText(textToCopy , rangeToPaste.start , rangeToPaste.end);
				currentDiff.copied = true;
			}
		},
	
		render: function(){
			if(!this._mapper){
				return;
			}
			var context=this._canvasDiv.getContext("2d"); //$NON-NLS-0$
			context.clearRect(0,0,this._canvasDiv.width,this._canvasDiv.height);
			context.strokeStyle = '#AAAAAA';  //$NON-NLS-0$
			context.lineWidth   = 1;
			context.beginPath();
			
			var leftTop = this._leftTextView.getTopIndex();
			var leftBottom = this._leftTextView.getBottomIndex();
			var rightTop = this._rightTextView.getTopIndex();
			var rightBottom = this._rightTextView.getBottomIndex();
			this._leftLineH = this._leftTextView.getLineHeight();
			this._rightLineH = this._rightTextView.getLineHeight();
		
			var curLeftIndex = 0;
			var curRightIndex = 0;
			var rendering = false;
			for (var i = 0 ; i < this._mapper.length ; i++){
				if(this._mapper[i][2] !== 0){
					if(mCompareUtils.overlapMapper( this._mapper[i] , 0 , curLeftIndex , leftTop ,leftBottom) ||
							mCompareUtils.overlapMapper( this._mapper[i] , 1 , curRightIndex , rightTop ,rightBottom) ){
						this._renderCurve(i, curLeftIndex , curRightIndex , this._canvasDiv , context , leftTop , leftBottom , rightTop , rightBottom);
						rendering = true;
					} else if (rendering) {
						break;
					}
				}
				curLeftIndex += this._mapper[i][0];
				curRightIndex += this._mapper[i][1];
			}
			context.stroke();		
		},
		
		_renderCurve: function (mapperIndex , leftStart , rightStart , canvas , context , leftTop , leftBottom , rightTop , rightBottom){
			var mapperItem = this._mapper[mapperIndex];
			var leftMiddle =  this._leftTextView.getLinePixel(leftStart + (mapperItem[0]/2)) + (mapperItem[0]%2)*this._leftLineH/3 - this._leftTextView.getTopPixel();
			var rightMiddle =  this._rightTextView.getLinePixel(rightStart + (mapperItem[1]/2)) + (mapperItem[1]%2)*this._rightLineH/3- this._rightTextView.getTopPixel();
			
			var w =  canvas.parentNode.clientWidth;
			
			if(mapperIndex === this._diffNavigator.getCurrentMapperIndex()){
				context.stroke();
				context.strokeStyle = '#000';  //$NON-NLS-0$
				context.lineWidth   = 1;
				context.beginPath();
				context.moveTo(0 , leftMiddle);
				context.bezierCurveTo( w/3, leftMiddle, w*0.666  ,rightMiddle , w ,rightMiddle);
				context.stroke();
				context.strokeStyle = '#AAAAAA';  //$NON-NLS-0$
				context.lineWidth   = 1;
				context.beginPath();
				return;
			}
			context.moveTo(0 , leftMiddle);
			context.bezierCurveTo( w/3, leftMiddle, w*0.666  ,rightMiddle , w ,rightMiddle);
			context.stroke();
		},
		
		onChanged: function(e, isRightSide) {
			var initing = isRightSide ? this._rightIniting : this._leftIniting;
			if(e.removedLineCount !== e.addedLineCount){
				var tView = isRightSide ? this._rightTextView : this._leftTextView;
				if(!initing){
					mCompareUtils.updateMapper(this._mapper , isRightSide ? 1 : 0 , tView.getModel().getLineAtOffset(e.start) , e.removedLineCount, e.addedLineCount);
				}
				if(e.removedLineCount > 0 || e.addedLineCount > 0){
					this.render();
				}
			}
			if(isRightSide) {
				this._rightIniting = false;
			} else {
				this._leftIniting = false;
			}
			return initing;
		}
	};
	return CompareCurveRuler;
}()); 

return orion;
});