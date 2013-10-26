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
/*global define document console prompt window*/
/*jslint forin:true regexp:false sub:true*/

define(['i18n!orion/compare/nls/messages',
		'orion/Deferred',
		'orion/webui/littlelib',
		'orion/compare/diffParser',
		'orion/compare/compareRulers',
        'orion/editor/editor',
        'orion/editor/editorFeatures',
        'orion/keyBinding',
        'orion/editor/textView',
        'orion/compare/compareUIFactory',
        'orion/compare/compareUtils',
        'orion/compare/jsdiffAdapter',
        'orion/compare/diffTreeNavigator'],
function(messages, Deferred, lib, mDiffParser, mCompareRulers, mEditor, mEditorFeatures, mKeyBinding, mTextView,
		 mCompareUIFactory, mCompareUtils, mJSDiffAdapter, mDiffTreeNavigator,  mTextMateStyler, mHtmlGrammar, mTextStyler) {
var exports = {};
/**
 * @class An abstract comapre view class that holds all the common functions for both "side by side" and "unified" view.
 * <p>
 * <b>See:</b><br/>
 * {@link orion.compare.TwoWayCompareView}<br/>
 * {@link orion.compare.InlineCompareView}
 * </p>		 
 * @name orion.compare.CompareView
 */
exports.CompareView = (function() {
	function CompareView () {
		this._diffParser = new mDiffParser.DiffParser();
	}
	CompareView.prototype = {
		/** @private */
		_clearOptions: function(){
			this.options = {};
			this.options.blockNumber = 1;
			this.options.changeNumber = 0;
		},
		/** @private */
		_getLineDelim: function(input , diff){	
			var delim = "\n"; //$NON-NLS-0$
			return delim;
		},
		/** @private */
		_generateMapper: function(input, output, diff , detectConflicts ,doNotBuildNewFile){
			var delim = this._getLineDelim(input , diff);
			this._diffParser.setLineDelim(delim);
			if(this.options.mapper && this.options.toggler){
				return {delim:delim , mapper:this.options.mapper, output: this.options.newFile.Content, diffArray:this.options.diffArray};
			}
			if(typeof output === "string" && typeof input === "string"){ //$NON-NLS-1$ //$NON-NLS-0$
				var adapter = new mJSDiffAdapter.JSDiffAdapter();
				var maps = adapter.adapt(input, output, delim);
				if(this.options.toggler){
					this.options.mapper = maps.mapper;
					this.options.newFile.Content = output;
					this.options.diffArray = maps.changContents;
				}
				return {delim:delim , mapper:maps.mapper, output: output, diffArray:maps.changContents};
			} else {
				var result = this._diffParser.parse(input, diff, detectConflicts ,doNotBuildNewFile);
				var diffArray = this._diffParser.getDiffArray();
				if(this.options.toggler){
					this.options.mapper = result.mapper;
					this.options.newFile.Content = result.outPutFile;
					this.options.diffArray = diffArray;
				}
				return {delim:delim , mapper:result.mapper, output: result.outPutFile, diffArray:diffArray};
			}
		},
		/** @private */
		_initSyntaxHighlighter: function(targetArray){
			this._syntaxHighlighters = null;
			if(this.options.highlighters && this.options.highlighters.length > 0){
				if(targetArray.length < 1 || targetArray.length > 2){
					return;
				}
				this._syntaxHighlighters = [{highlighter: this.options.highlighters[0], target: targetArray[0]}];
				if(targetArray.length === 2 && this.options.highlighters.length === 2){
					this._syntaxHighlighters.push({highlighter: this.options.highlighters[1], target: targetArray[1]});
				}
			}
		},
		/** @private */
		_highlightSyntax: function(){
			if(this._syntaxHighlighters){//If syntax highlighter is used, we need to render all the diff annotations after syntax highlighting is done
		        var promises = [];
				this._syntaxHighlighters.forEach(function(wrapper) {
					promises.push(wrapper.highlighter.highlight(wrapper.target.fileName, wrapper.target.contentType, wrapper.target.editor));
				}.bind(this));
				Deferred.all(promises, function(error) { return {_error: error}; }).then(function(promises){
					this._diffNavigator.renderAnnotations();
					this._diffNavigator.gotoBlock(this.options.blockNumber-1, this.options.changeNumber-1);
				}.bind(this));
			} else {//render all the diff annotations directly
				window.setTimeout(function () {
					this._diffNavigator.renderAnnotations();
					this._diffNavigator.gotoBlock(this.options.blockNumber-1, this.options.changeNumber-1);
				}.bind(this), 50);
			}
		},
		
		/**
		 * @class This object describes options of a file. Two instances of this object construct the core parameters of a compare view. 
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.compare.CompareView}<br/>
		 * {@link orion.compare.CompareViewOptions}
		 * </p>		 
		 * @name orion.compare.FileOptions
		 *
		 * @property {String} Content the text contents of the file unit. Requied.
		 * @property {Boolean} [readonly=true] whether or not the file is in readonly mode. Optional.
		 * @property {String} Name the file name. Optional but required if the compare view has to show file title.
		 * @property {orion.core.ContentType} Type the type of the file. Optional but required if the compare view has to highlight the syntax.
		 */
		/**
		 * @class This object describes the options for a compare view.
		 * <p>
		 * <b>See:</b><br/>
		 * {@link orion.compare.FileOptions}<br/>
		 * {@link orion.compare.CompareView}<br/>
		 * {@link orion.compare.CompareView#setOptions}
		 * {@link orion.compare.CompareView#getOptions}	 
		 * </p>		 
		 * @name orion.compare.CompareViewOptions
		 *
		 * @property {String} parentDivID Required. the parent element id for the compare view. Required. The parentDivID is required to prefix the ids of sub components in case of side by side view.
		 * @property {orion.compare.FileOptions} [oldFile] Required. the options of the file that is original. Required. In the two way compare case, this file is dispalyed on the left hand side.
		 * @property {orion.compare.FileOptions} [newFile] Required. the options of the file that is compared against the original. Required. In the two way compare case, this file is dispalyed on the right hand side.
		 * @property {String} [diffContent] Optional. the unified diff against the original/old file. If this option is defined, the newFile option is ignored or becomes optional.
		 * @property {Boolean} [showTitle=false] Optional. whether or not to show the two file names on each side of the compare view.
		 * @property {Boolean} [showLineStatus=false] Optional. whether or not to show the current line and column number fo the caret on each side of the view. Not avaible for inline/unified compare view.
		 * @property {orion.compare.CompareCommandFactory} [commandProvider] Optional. If defined it will render all the commands that the compare view requires.
		 * @property {Array} [highlighters] Optional. An array of two instances of {@link orion.compare.CompareSyntaxHighlighter}. If defined the highlighters are used to highlight the syntax of both side of the comapre view, respectively.
		 */
		setOptions: function(options, clearExisting){
			if(clearExisting){
				this._clearOptions();
			}
			if(!this.options) {
				this.options = {};
			}
			if(options) {
				Object.keys(options).forEach(function(option) {
					this.options[option] = options[option];
				}.bind(this));
			}
		},
		getOptions: function() {
			return this.options;
		},
		/**
		 * Returns the 1-based {blockNumber, changeNumber} current diff location. 
		 * <p>
		 * If 0 is returned on the chnageNumber, it means the whole diff block is highlighted.
		 * </p>
		 * @returns {Object} the 1-based {blockNumber, changeNumber} current diff location.
		 */
		getCurrentDiffPos: function(){	
			return this._diffNavigator.getCurrentPosition();
		},
		/**
		 * Initialize the diff navigation to the starting position. 
		 * <p>
		 * Calling this function resets the "current diff block" to the first diff block in the compare view. 
		 * If there are multiple changes in the diff block, the first change will be highlighted in a darker color. Otherwise the whole diff block will be highlighted in a darker color.
		 * </p>
		 */
		initDiffNav: function(){
			this._diffNavigator.gotoBlock(0, 0);
		},
		/**
		 * Navigate from the current "diff block" to the next one. Also sets the next one as the current diff block after the function call.
		 * <p>
		 * This function will circulate the "diff block" level of navigation, which means if the current block is the last one then it will go to the first one after the function call.
		 * It also highlights the whole diff block in a darker color.
		 * </p>
		 */
		nextDiff: function(){	
			this._diffNavigator.nextDiff();
		},
		/**
		 * Navigate from the current "diff block" to the previous one. Also sets the previous one as the current diff block after the function call.
		 * <p>
		 * This function will circulate the "diff block" level of navigation, which means if the current block is the first one then it will go to the last one after the function call.
		 * It also highlights the whole diff block in a darker color.
		 * </p>
		 */
		prevDiff: function(){	
			this._diffNavigator.prevDiff();
		},
		/**
		 * Navigate from the current "diff change" to the next "diff change". Also sets the next one as the current diff change after the function call.
		 * <p>
		 * Continously calling this function will walk forward all the word level changes in all the diff blocks. 
		 * If it hits the last change in a diff block, it will go to the next diff block at the first change.
		 * If it hits the last change in the last diff block, it will do nothing.
		 * It also highlights the current diff change in a darker color.
		 * </p>
		 */
		nextChange: function(){	
			return this._diffNavigator.nextChange();
		},
		/**
		 * Navigate from the current "diff change" to the previous "diff change". Also sets the previous one as the current diff change after the function call.
		 * <p>
		 * Continously calling this function will walk backward all the word level changes in all the diff blocks. 
		 * If it hits the first change in a diff block, it will go to the previous diff block at the last change.
		 * If it hits the first change in the first diff block, it will do nothing.
		 * It also highlights the current diff change in a darker color.
		 * </p>
		 */
		prevChange: function(){	
			this._diffNavigator.prevChange();
		},
		/**
		 * A helper function to allow the consumer of compareView to get the widget instance easily.
		 */
		getWidget: function() {
			return this;
		},
		/**
		 * A helper function to start the UI after a subclass instance is constructed.
		 */
		startup: function(){
			this.initEditors();
			this.refresh(true);
		},
		/**
		 * An abstract function that should be overridden by a subclass.
		 * <p>
		 * The subclass implementation, inline or twoWay, should create the editor instances with an initial string or just leave it empty.
		 * </p>
		 * @param {String} initString the initial string that will dispaly when the editors are created. Optional.
		 */
		initEditors: function(initString){
		}
	};
	return CompareView;
}());

/**
 * Constructs a side by side compare view.
 * 
 * @param {orion.compare.CompareViewOptions} options the compare view options.
 * 
 * @class A TwoWayCompareView is a side by side view of two files with diff annotations and navigations.
 * @name orion.compare.TwoWayCompareView
 */
exports.TwoWayCompareView = (function() {
	function TwoWayCompareView(options) {
		this.setOptions(options, true);
		//Init the diff navigator that controls the navigation on both block and word level.
		this._diffNavigator = new mDiffTreeNavigator.DiffTreeNavigator("word"); //$NON-NLS-0$
		this.type = "twoWay"; //$NON-NLS-0$
		
		//Build the compare view UI by the UI factory
		this._uiFactory = this.options.uiFactory;
		if(!this._uiFactory){
			this._uiFactory = new mCompareUIFactory.TwoWayCompareUIFactory({
				parentDivID: this.options.parentDivId,
				showTitle: (this.options.showTitle ? this.options.showTitle : false),
				showLineStatus: (this.options.showLineStatus ? this.options.showLineStatus : false)
			});
			this._uiFactory.buildUI();
		}
		
		this._viewLoadedCounter = 0;
		if(this.options.commandProvider){
			this.options.commandProvider.initCommands(this);
		}
		this._curveRuler = new mCompareRulers.CompareCurveRuler(this._uiFactory.getDiffCanvasDiv());
	}
	TwoWayCompareView.prototype = new exports.CompareView();
	
	TwoWayCompareView.prototype.initEditors = function(initString){
		this._editors = [];//this._editors[0] represents the right side editor. this._editors[1] represents the left side editor
		//Create editor on the right side
		this._editors.push(this._createEditor(initString, this._uiFactory.getEditorParentDiv(false), this._uiFactory.getStatusDiv(false), this.options.oldFile));
		//Create editor on the left side
		this._editors.push(this._createEditor(initString, this._uiFactory.getEditorParentDiv(true), this._uiFactory.getStatusDiv(true), this.options.newFile, true));
		//Create the overview ruler
		this._overviewRuler  = new mCompareRulers.CompareOverviewRuler("right", {styleClass: "ruler overview"} , null, //$NON-NLS-1$ //$NON-NLS-0$
                function(lineIndex, ruler){this._diffNavigator.matchPositionFromOverview(lineIndex);}.bind(this));
		//If either editor is dirty, popup the warning message.
		window.onbeforeunload = function() {
			if(this._editors) {
				var dirty = this._editors.some(function(editor) {
						return editor.isDirty();
				});
				if(dirty){
					return messages["There are unsaved changes."];
				}
			}
		}.bind(this);
	};
	
	TwoWayCompareView.prototype.getEditors = function(){
		return this._editors;
	};
	
	TwoWayCompareView.prototype.gotoDiff = function(lineNumber, offsetInTheLine, updateLeft){
		var textView = updateLeft ? this._editors[1].getTextView() : this._editors[0].getTextView();
		var offset = textView.getModel().getLineStart(lineNumber) + offsetInTheLine;
		this._diffNavigator.gotoDiff(offset, textView);
	};

	TwoWayCompareView.prototype.copyToLeft = function(){	
		this._curveRuler.copyTo(true);
	};
	
	TwoWayCompareView.prototype.copyToRight = function(){	
		this._curveRuler.copyTo(false);
	};
	
	TwoWayCompareView.prototype.resizeEditors = function(){	
		this._editors.forEach(function(editor) {
			editor.getTextView().resize();
		});
	};
	
	TwoWayCompareView.prototype.getSplitter = function(){	
		return this._uiFactory.getSplitter();
	};
	
	TwoWayCompareView.prototype._createEditor = function(initString, parentDiv, statusDiv, fileOptions, isLeft){
		//Create text view factory
		var readonly = (typeof fileOptions.readonly === "undefined") ? true : fileOptions.readonly; //$NON-NLS-0$
		var textViewFactory = function() {
			var view = new mTextView.TextView({
				parent: parentDiv,
				readonly: readonly,
				tabSize: 4
			});
			this._viewLoadedCounter++;
			if(this._viewLoadedCounter === 2){				
				this._diffNavigator.matchPositionFromOverview(-1);
			}
			if(this.onLoad){
				this.onLoad();
			}
			//We need to add the resize listener here to hadle the vertical splitter moves
			var splitter = this.getSplitter();
			if(splitter){
				splitter.addResizeListener(function(node){
					if(node){
						var doResize = false;
						if (this._uiFactory.isLeftPane(node) ) {
							doResize = isLeft;
						} else {
							doResize = !isLeft;
						}
						if(doResize){
							view.resize();
						}
					}
				}.bind(this));
			}
			return view;
		}.bind(this);
		
		var keyBindingFactory = fileOptions.keyBindingFactory;
		//Create keybindings factory
		if(!keyBindingFactory) {
			keyBindingFactory = new mEditorFeatures.KeyBindingsFactory();
		}

		//Create the status reporter if needed
		var statusReporter = null;
		if(statusDiv) {
			var dirtyIndicator = "";
			var status = "";
			statusReporter = function(message, isError) {
				if(!statusDiv) {
					return;
				}
				if (isError) {
					status =  messages["ERROR: "] + message;
				} else {
					status = message;
				}
				statusDiv.textContent = dirtyIndicator +  status;
			};
		}
		
		//Create the editor
		var editor = new mEditor.Editor({
			textViewFactory: textViewFactory,
			undoStackFactory: new mEditorFeatures.UndoFactory(),
			annotationFactory: new mEditorFeatures.AnnotationFactory(),
			keyBindingFactory: keyBindingFactory, 
			statusReporter: statusReporter,
			domNode: parentDiv
		});
				
		editor.installTextView();
		editor.setInput(null, null, fileOptions.Content ? fileOptions.Content : initString);
		editor.setOverviewRulerVisible(false);
			
		var textView = editor.getTextView();
		
		//Navigate to the proper diff block or diff word if editor's selection or caret hits a diff
		textView.addEventListener("Selection", function(evt){ //$NON-NLS-0$
			if(evt.newValue){
				if(evt.newValue.start !== evt.newValue.end){
					return;
				}
			}
			if(this._diffNavigator.autoSelecting || !this._diffNavigator.editorWrapper[0].diffFeeder){
				return;
			}
			var caretPos = textView.getCaretOffset();
			this._diffNavigator.gotoDiff(caretPos, textView);
		}.bind(this)); 
		
		//If left editor's contents changes, we refesh the curver renderer to match new diff
		textView.getModel().addEventListener("Changed", function(e){ //$NON-NLS-0$
			if(!this._curveRuler.onChanged(e, !isLeft)) {
				this.options.mapper = null;
			}
		}.bind(this));
		if(isLeft){
			//If left editor scrolls, we scroll right editor to the appropriate position to match the diffs
			textView.addEventListener("Scroll", function(scrollEvent){ //$NON-NLS-0$
				if(this._curveRuler){
					this._curveRuler.matchPositionFrom(true);
					this._curveRuler.render();
				}
				if(this.onScroll){
					this.onScroll();
				}
			}.bind(this)); 
		} else {
			//If right editor scrolls, we only re-render the curve
			textView.addEventListener("Scroll", function(scrollEvent){ //$NON-NLS-0$
				if(this._curveRuler){
					this._curveRuler.render();
				}
			}.bind(this)); 
		}
		return editor;
	};

	TwoWayCompareView.prototype.destroy = function(){
		if(this._editors){
			this._diffNavigator.destroy();
			this._editors.forEach(function(editor) {
				editor.destroy();
			});
			this._uiFactory.destroy();
		}
	};

	TwoWayCompareView.prototype.addRulers = function(){
		if(this._editors && !this._hasRuler){
			var lRuler = new mCompareRulers.LineNumberCompareRuler(this._diffNavigator, 0, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var rRuler = new mCompareRulers.LineNumberCompareRuler(this._diffNavigator, 0, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this._editors[1].getTextView().addRuler(lRuler);
			this._editors[0].getTextView().addRuler(rRuler);
			this._editors[0].getTextView().addRuler(this._overviewRuler);
			this._hasRuler = true;
		}
	};
	
	TwoWayCompareView.prototype.refresh = function(refreshEditors){	
		var input = this.options.oldFile.Content;
		var output = this.options.newFile.Content;
		var diff = this.options.diffContent;
		
		var result;
		if(typeof output === "string") {
			result = this._generateMapper(input , output, diff , this.options.hasConflicts);
		} else {
			result = this._generateMapper(input , output, diff , this.options.hasConflicts);
			output = result.output;
		}
		
		var rFeeder = new mDiffTreeNavigator.TwoWayDiffBlockFeeder(this._editors[0].getTextView().getModel(), result.mapper, 1);
		var lFeeder = new mDiffTreeNavigator.TwoWayDiffBlockFeeder(this._editors[1].getTextView().getModel(), result.mapper, 0);
		this._diffNavigator.initAll(this.options.charDiff ? "char" : "word", this._editors[0], this._editors[1], rFeeder, lFeeder, this._overviewRuler, this._curveRuler); //$NON-NLS-1$ //$NON-NLS-0$
		this._curveRuler.init(result.mapper ,this._editors[1], this._editors[0], this._diffNavigator);
		if(refreshEditors) {
			this._editors[1].setInput(this.options.newFile.Name, null, output);
			this._editors[0].setInput(this.options.oldFile.Name, null, input);
		}
		this._initSyntaxHighlighter([{fileName: this.options.newFile.Name, contentType: this.options.newFile.Type, editor: this._editors[1]},
									 {fileName: this.options.oldFile.Name, contentType: this.options.oldFile.Type, editor: this._editors[0]}]);
		this._highlightSyntax();
		if(this.options.commandProvider){
			this.options.commandProvider.renderCommands(this);
		}
		this.addRulers();
		
		if(this._viewLoadedCounter === 2){
			this._diffNavigator.gotoBlock(this.options.blockNumber-1, this.options.changeNumber-1);
		}
		
		var newFileTitleNode = this._uiFactory.getTitleDiv(true);
		var oldFileTitleNode = this._uiFactory.getTitleDiv(false);
		if(oldFileTitleNode && newFileTitleNode){
			lib.empty(oldFileTitleNode);
			lib.empty(newFileTitleNode);
			oldFileTitleNode.appendChild(document.createTextNode(this.options.oldFile.Name));
			newFileTitleNode.appendChild(document.createTextNode(this.options.newFile.Name));
		}
		var leftViewHeight = this._editors[1].getTextView().getModel().getLineCount() * this._editors[1].getTextView().getLineHeight() + 5;
		var rightViewHeight = this._editors[0].getTextView().getModel().getLineCount() * this._editors[0].getTextView().getLineHeight() +5;
		return leftViewHeight > rightViewHeight ? leftViewHeight : rightViewHeight;
	};
	return TwoWayCompareView;
}());

/**
 * Constructs a unifiled compare view.
 * 
 * @param {orion.compare.CompareViewOptions} options the compare view options.
 * 
 * @class A InlineCompareView is a unified view of two files with diff annotations and navigations. It displayed the old file + diff in one editor.
 * @name orion.compare.TwoWayCompareView
 */
exports.InlineCompareView = (function() {
	function InlineCompareView(options) {
		this.setOptions(options, true);
		this._diffNavigator = new mDiffTreeNavigator.DiffTreeNavigator("word"); //$NON-NLS-0$
		this.type = "inline"; //$NON-NLS-0$
		if(this.options.commandProvider){
			this.options.commandProvider.initCommands(this);
		}
		this._editorDiv = this.options.parentDivId;
	}
	InlineCompareView.prototype = new exports.CompareView();
	
	InlineCompareView.prototype.addRulers = function(){
		if(this._textView && !this._hasRuler){
			this._textView.addRuler(this._rulerOrigin);
			this._textView.addRuler(this._rulerNew);
			this._textView.addRuler(this._overviewRuler);
			this._hasRuler = true;
		}
	};
	
	InlineCompareView.prototype.removeRulers = function(){
		if(this._textView && this._hasRuler){
			this._textView.removeRuler(this._rulerOrigin);
			this._textView.removeRuler(this._rulerNew);
			this._textView.removeRuler(this._overviewRuler);
			this._hasRuler = false;
		}
	};

	InlineCompareView.prototype.destroyEditor = function(){
		if(this._textView){
			this._diffNavigator.destroy();
			this._textView.setText("");
			this.removeRulers();
		}
	};

	InlineCompareView.prototype.destroy = function(){
		if(this._textView){
			this._diffNavigator.destroy();
			this._textView.destroy();
		}
	};

	InlineCompareView.prototype.initEditors = function(initString){
		var parentDiv = lib.node(this._editorDiv);
		var textViewFactory = function(){
			var textView = new mTextView.TextView({
				parent: parentDiv,
				readonly: true,
				tabSize: 4
			});
			return textView;
		}.bind(this);
		this._editor = new mEditor.Editor({
			textViewFactory: textViewFactory,
			undoStackFactory: new mEditorFeatures.UndoFactory(),
			annotationFactory: new mEditorFeatures.AnnotationFactory(),
			domNode: parentDiv
		});
				
		this._editor.installTextView();
		this._editor.setInput(null, null, initString);
		this._editor.setOverviewRulerVisible(false);
		this._editor.setAnnotationRulerVisible(false);
			
		this._textView = this._editor.getTextView();
			
		this._rulerOrigin = new mCompareRulers.LineNumberCompareRuler(this._diffNavigator, 1,"left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		this._rulerNew = new mCompareRulers.LineNumberCompareRuler(this._diffNavigator, 0,"left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		this._overviewRuler  = new mCompareRulers.CompareOverviewRuler("right", {styleClass: "ruler overview"} , null, //$NON-NLS-1$ //$NON-NLS-0$
                function(lineIndex, ruler){this._diffNavigator.matchPositionFromOverview(lineIndex);}.bind(this));
		
		this._textView.addEventListener("Selection", function(evt){ //$NON-NLS-0$
			if(evt.newValue){
				if(evt.newValue.start !== evt.newValue.end){
					return;
				}
			}
			if(this._diffNavigator.autoSelecting || !this._diffNavigator.editorWrapper[0].diffFeeder){
				return;
			}
			var caretPos = this._textView.getCaretOffset();
			this._diffNavigator.gotoDiff(caretPos, this._textView);
		}.bind(this)); 
	};

	InlineCompareView.prototype._initDiffPosition = function(textView){
		var model = textView.getModel();
		if(model && model.getAnnotations){
			var annotations = model.getAnnotations();
			if(annotations.length > 0) {
				var lineIndex = annotations[0][0];
				var lineHeight = textView.getLineHeight();
				var clientArea = textView.getClientArea();
				var lines = Math.floor(clientArea.height / lineHeight/3);
				textView.setTopIndex((lineIndex - lines) > 0 ? lineIndex - lines : 0);
			}
		}
	};
	
	InlineCompareView.prototype.refresh = function(){
		var input = this.options.oldFile.Content;
		var output = this.options.newFile.Content;
		var diff = this.options.diffContent;

		var result = this._generateMapper(input, output, diff, this.options.hasConflicts, !this.options.toggler);
		if(typeof output !== "string"){ //$NON-NLS-0$
			output = result.output;
		}
		this._textView.getModel().setText(input);
		//Merge the text with diff 
		var rFeeder = new mDiffTreeNavigator.inlineDiffBlockFeeder(result.mapper, 1);
		var lFeeder = new mDiffTreeNavigator.inlineDiffBlockFeeder(result.mapper, 0);
		mCompareUtils.mergeDiffBlocks(this._textView.getModel(), lFeeder.getDiffBlocks(), result.mapper, result.diffArray.array, result.diffArray.index, this._diffParser._lineDelimiter);
		rFeeder.setModel(this._textView.getModel());
		lFeeder.setModel(this._textView.getModel());
		this._diffNavigator.initAll(this.options.charDiff ? "char" : "word", this._editor, this._editor, rFeeder, lFeeder, this._overviewRuler); //$NON-NLS-1$ //$NON-NLS-0$
		
		this._initSyntaxHighlighter([{fileName: this.options.oldFile.Name, contentType: this.options.oldFile.Type, editor: this._editor}]);
		this._highlightSyntax();
		if(this.options.commandProvider){
			this.options.commandProvider.renderCommands(this);
		}
		this.addRulers();
		var drawLine = this._textView.getTopIndex() ;
		this._textView.redrawLines(drawLine , drawLine+  1 , this._overviewRuler);
		this._textView.redrawLines(drawLine , drawLine+  1 , this._rulerOrigin);
		this._textView.redrawLines(drawLine , drawLine+  1 , this._rulerNew);
		this._diffNavigator.gotoBlock(this.options.blockNumber-1, this.options.changeNumber-1);
		return this._textView.getLineHeight() * this._textView.getModel().getLineCount() + 5;
	};
	
	InlineCompareView.prototype.setConflicting =  function(conflicting){	
		this._conflcit = conflicting;
	};
	
	return InlineCompareView;
}());

/**
 * Constructs a toggleable compare view.
 * 
 * @param {String} [startWith="twoWay"] the default view of the toggleable compare view. Can be either "twoWay" or "inline".
 * @param {orion.compare.CompareViewOptions} options the compare view options.
 * 
 * @class A toggleableCompareView is an interchangeable comapre view helper that helps user to switch between the "side by side" and "unified" by only button click. The commandProvider property has to be provided in the option in order to render the toggle command.
 * @name orion.compare.toggleableCompareView
 */
exports.toggleableCompareView = (function() {
	function toggleableCompareView(startWith, options) {
		if(options){
			options.toggler = this;
		}
		if(startWith === "inline"){ //$NON-NLS-0$
			this._widget = new exports.InlineCompareView(options);
		} else {
			this._widget = new exports.TwoWayCompareView(options);
		}
	}
	toggleableCompareView.prototype = {
		startup: function(){
			this._widget.startup();
		},
		
		toggle: function(){
			var options = this._widget.options;
			var diffPos = this._widget.getCurrentDiffPos();
			options.blockNumber = diffPos.block;
			options.changeNumber = diffPos.change;
			this._widget.destroy();
			lib.empty(lib.node(options.parentDivId));
			if(this._widget.type === "inline"){ //$NON-NLS-0$
				this._widget = new exports.TwoWayCompareView(options);
			} else {
				this._widget = new exports.InlineCompareView(options);
			}
			this._widget.initEditors();
			this._widget.refresh(true);
		},
		
		getWidget: function() {
			return this._widget;
		}
	};
	return toggleableCompareView;
}());

return exports;
});
