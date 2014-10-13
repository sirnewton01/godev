/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*eslint-env browser, amd*/
 
define(["require", 
		"orion/keyBinding",
		"orion/editor/emacs",
		"orion/editor/vi",
		"orion/editor/textModel",
		"orion/editor/annotations", 
		"orion/editor/projectionTextModel", 
		"orion/editor/textView", 
		"orion/editor/textTheme", 
		"orion/editor/textDND", 
		"orion/editor/rulers",
		"orion/editor/undoStack",
		"orion/editor/eventTarget",
		"orion/editor/textMateStyler",
		"orion/editor/htmlGrammar",
		"examples/editor/textStyler",
		"orion/util"
], function(require, mKeyBinding, mEmacs, mVI, mTextModel, mAnnotations, mProjectionTextModel, mTextView, mTextTheme, mTextDND, mRulers, mUndoStack, mEventTarget, mTextMateStyler, mHtmlGrammar, mTextStyler, util) {

	var exports = {};
	var view = null;
	var styler = null;
	var annotationStyler = null;
	var emacs, vi;
	
	var AnnotationType = mAnnotations.AnnotationType;
		
	function getFile(file) {
		try {
			var objXml = new XMLHttpRequest();
			objXml.open("GET",file,false); //$NON-NLS-0$
			objXml.send(null);
			return objXml.responseText;
		} catch (e) {
			return null;
		}
	}
	exports.getFile = getFile;
	
	function loadTheme(themeClass) {
		var theme = mTextTheme.TextTheme.getTheme();
		theme.setThemeClass(themeClass, {href: "orion/editor/themes/" + themeClass}); //$NON-NLS-0$
	}
	
	function updateMarginRuler(view, options) {
		view.removeRuler(view.marginLines);
		if (options.showMarginRuler) {
			view.addRuler(view.marginLines);
		}
	}
	
	function updateZoomRuler(view, options) {
		view.removeRuler(view.zoomRuler);
		if (options.showZoomRuler) {
			view.addRuler(view.zoomRuler);
		}
	}
	
	function updateKeyMode(view, options) {
		view.removeKeyMode(vi);
		view.removeKeyMode(emacs);
		if (options.keyBindings === "emacs") { //$NON-NLS-0$
			view.addKeyMode(emacs);
		} else if (options.keyBindings === "vi") { //$NON-NLS-0$
			view.addKeyMode(vi);
		}
	}
	
	function checkView(options) {
		if (view) {
			if (options) {
				loadTheme(options.themeClass);
				view.setOptions(options);
				updateKeyMode(view, options);
				updateMarginRuler(view, options);
				updateZoomRuler(view, options);
			}
			return view;
		}
		
		var baseModel =  new mTextModel.TextModel(), viewModel = baseModel;
		var foldingEnabled = true;
		if (foldingEnabled) {
			viewModel = new mProjectionTextModel.ProjectionTextModel(baseModel);
		}
		options = options || {};
		loadTheme(options.themeClass);
		options.parent = options.parent || "divParent"; //$NON-NLS-0$
		options.model = viewModel;
		options.wrappable = true;
		exports.view = view = new mTextView.TextView(options);
		
		vi = new mVI.VIMode(view);
		emacs = new mEmacs.EmacsMode(view);
		updateKeyMode(view, options);
		
		/* Undo stack */
		var undoStack = exports.undoStack = new mUndoStack.UndoStack(view, 200);
		exports.textDND = new mTextDND.TextDND(view, undoStack);
		view.setAction("undo", function() { //$NON-NLS-0$
			undoStack.undo();
			return true;
		});
		view.setAction("redo", function() { //$NON-NLS-0$
			undoStack.redo();
			return true;
		});

		view.setKeyBinding(new mKeyBinding.KeyBinding('s', true), "save"); //$NON-NLS-1$ //$NON-NLS-0$
		view.setAction("save", function() { //$NON-NLS-0$
			log("*****************SAVE"); //$NON-NLS-0$
			return true;
		});
		
		var annotationModel = view.annotationModel = new mAnnotations.AnnotationModel(baseModel);
		/* Example: Adding a keyBinding and action*/
		view.setKeyBinding(new mKeyBinding.KeyBinding('h', true), "collapseAll"); //$NON-NLS-1$ //$NON-NLS-0$
		view.setAction("collapseAll", function() { //$NON-NLS-0$
			log("*****************COLLAPSE"); //$NON-NLS-0$
			var iter = annotationModel.getAnnotations();
			view.setRedraw(false);
			while (iter.hasNext()) {
				var a = iter.next();
				if (a.type === AnnotationType.ANNOTATION_FOLDING) {
					a.collapse();
				}
			}
			view.setRedraw(true);
			return true;
		});
		/* Example: Adding a keyBinding and action*/
		view.setKeyBinding(new mKeyBinding.KeyBinding('j', true), "expandAll"); //$NON-NLS-1$ //$NON-NLS-0$
		view.setAction("expandAll", function() { //$NON-NLS-0$
			log("*****************EXPAND"); //$NON-NLS-0$
			var iter = annotationModel.getAnnotations();
			view.setRedraw(false);
			while (iter.hasNext()) {
				var a = iter.next();
				if (a.type === AnnotationType.ANNOTATION_FOLDING) {
					a.expand();
				}
			}
			view.setRedraw(true);
			return true;
		});
		

		/* Adding the Rulers */
		var annotationRuler = view.annotationRuler = new mRulers.AnnotationRuler(annotationModel, "left", {styleClass: "ruler annotations"}); //$NON-NLS-1$ //$NON-NLS-0$
		annotationRuler.addAnnotationType(AnnotationType.ANNOTATION_BREAKPOINT);
		annotationRuler.addAnnotationType(AnnotationType.ANNOTATION_BOOKMARK);
		annotationRuler.addAnnotationType(AnnotationType.ANNOTATION_ERROR);
		annotationRuler.addAnnotationType(AnnotationType.ANNOTATION_WARNING);
		annotationRuler.addAnnotationType(AnnotationType.ANNOTATION_TASK);
		annotationRuler.setMultiAnnotation({html: "<div class='annotationHTML multiple'></div>"}); //$NON-NLS-0$
		annotationRuler.setMultiAnnotationOverlay({html: "<div class='annotationHTML overlay'></div>"}); //$NON-NLS-0$
		annotationRuler.onDblClick =  function(lineIndex, e) {
			if (lineIndex === undefined) { return; }
			var model = this._view.getModel();
			var start = model.getLineStart(lineIndex);
			var end = model.getLineEnd(lineIndex, true);
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
			}
			var type;
			if (util.isMac ? e.metaKey : e.ctrlKey) {
				if (e.shiftKey && e.altKey) {
					type = AnnotationType.ANNOTATION_WARNING;
				} else if (e.altKey) {
					type = AnnotationType.ANNOTATION_ERROR;
				} else if (e.shiftKey) {
					type = AnnotationType.ANNOTATION_BOOKMARK;
				} else {
					type = AnnotationType.ANNOTATION_TASK;
				}
			} else {
				type = AnnotationType.ANNOTATION_BREAKPOINT;
			}
			var annotations = annotationModel.getAnnotations(start, end);
			var annotation, temp;
			while ((temp = annotations.next()) !== null) {
				if (temp.type === type) {
					annotation = temp;
					break;
				}
			}
			if (annotation) {
				annotationModel.removeAnnotation(annotation);
			} else {
				annotation = AnnotationType.createAnnotation(type, start, end);
				annotation.title += ": " + model.getLine(lineIndex); //$NON-NLS-0$
				annotationModel.addAnnotation(annotation);
			}
		};
		var linesRuler = view.lines = new mRulers.LineNumberRuler(annotationModel, "left", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		linesRuler.onDblClick = annotationRuler.onDblClick;
		var overviewRuler = new mRulers.OverviewRuler(annotationModel, "right", {styleClass: "ruler overview"}); //$NON-NLS-1$ //$NON-NLS-0$
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_BREAKPOINT);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_BOOKMARK);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_ERROR);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_WARNING);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_TASK);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_MATCHING_BRACKET);
		overviewRuler.addAnnotationType(AnnotationType.ANNOTATION_CURRENT_BRACKET);
		
		view.addRuler(annotationRuler);
		view.addRuler(linesRuler);
		
		view.marginLines = new mRulers.LineNumberRuler(annotationModel, "margin", {styleClass: "ruler lines"}, {styleClass: "rulerLines odd"}, {styleClass: "rulerLines even"}); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		view.zoomRuler = new mRulers.ZoomRuler(util.isIOS || util.isAndroid ? "right" : "innerRight", {styleClass: "ruler zoom"}); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		
		if (foldingEnabled) {
			var foldingRuler = view.folding = new mRulers.FoldingRuler(annotationModel, "left", {styleClass: "ruler folding"}); //$NON-NLS-1$ //$NON-NLS-0$
			foldingRuler.addAnnotationType(AnnotationType.ANNOTATION_FOLDING);
			view.addRuler(foldingRuler);
		}
		view.addRuler(overviewRuler);
		updateMarginRuler(view, options);
		updateZoomRuler(view, options);
		return view;
	}
	exports.checkView = checkView;
	
	function setupView(text, lang, options) {
		checkView(options);
		if (styler) {
			styler.destroy();
			styler = null;
			annotationStyler.destroy();
			annotationStyler = null;
		}
		switch (lang) {
			case "js": //$NON-NLS-0$
			case "java": //$NON-NLS-0$
			case "css": //$NON-NLS-0$
				styler = new mTextStyler.TextStyler(view, lang, view.annotationModel);
				styler.setHighlightCaretLine(true);
				break;
			case "html": //$NON-NLS-0$
				styler = new mTextMateStyler.TextMateStyler(view, new mHtmlGrammar.HtmlGrammar());
				break;
		}
		annotationStyler = new mAnnotations.AnnotationStyler(view, view.annotationModel);
		annotationStyler.addAnnotationType(AnnotationType.ANNOTATION_TASK);
		annotationStyler.addAnnotationType(AnnotationType.ANNOTATION_MATCHING_BRACKET);
		annotationStyler.addAnnotationType(AnnotationType.ANNOTATION_CURRENT_BRACKET);
		view.setText(text);
		return view;
	}
	exports.setupView = setupView;
	
	function destroyView() {
		if (view) {
			view.destroy();
		}
		view = null;
	}
	exports.destroyView = destroyView;

	return exports;
});