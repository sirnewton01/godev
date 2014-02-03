/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global define */

define([
	'orion/editor/editor',
	'orion/editor/textView',
	'orion/editor/textModel',
	'orion/editor/projectionTextModel',
	'orion/editor/editorFeatures',
	'orion/editorPreferences',
	'orion/widgets/themes/ThemePreferences',
	'orion/widgets/themes/editor/ThemeData',
	'orion/objects'
], function(
	mEditor, mTextView, mTextModel, mProjectionTextModel, mEditorFeatures, 
	mEditorPreferences, mThemePreferences, mThemeData, objects
) {
	/**
	 * Constructs a new ReadonlyEditorView object.
	 *
	 * @class
	 * @name orion.ReadonlyEditorView
	 */
	function ReadonlyEditorView(options) {
		this._parent = options.parent;
		this.renderToolbars = options.renderToolbars;
		this.inputManager = options.inputManager;
		this.preferences = options.preferences;
		this.statusReporter = options.statusReporter;
		this.model = options.model;
		this.syntaxHighlighter = options.syntaxHighlighter;
		this.readonly = true;
		this.settings = {};
		this._init();
	}
	ReadonlyEditorView.prototype = /** @lends orion.ReadonlyEditorView.prototype */ {
		getParent: function() {
			return this._parent;
		},
		updateViewOptions: function(prefs) {
			var marginOffset = 0;
			if (prefs.showMargin) {
				marginOffset = prefs.marginOffset;
				if (typeof marginOffset !== "number") { //$NON-NLS-0$
					marginOffset = prefs.marginOffset = parseInt(marginOffset, 10);
				}
			}
			var wrapOffset = 0;
			if (prefs.wordWrap) {
				wrapOffset = marginOffset;
			}
			return {
				readonly: this.readonly || this.inputManager.getReadOnly(),
				tabSize: prefs.tabSize || 4,
				expandTab: prefs.expandTab,
				wrapMode: prefs.wordWrap,
				wrapOffset: wrapOffset,
				marginOffset: marginOffset,
				scrollAnimation: prefs.scrollAnimation ? prefs.scrollAnimationTimeout : 0
			};
		},
		updateSettings: function(prefs) {
			this.settings = prefs;
			var editor = this.editor;
			var inputManager = this.inputManager;
			inputManager.setAutoLoadEnabled(prefs.autoLoad);
			inputManager.setAutoSaveTimeout(prefs.autoSave ? prefs.autoSaveTimeout : -1);
			inputManager.setSaveDiffsEnabled(prefs.saveDiffs);
			this.updateStyler(prefs);
			var textView = editor.getTextView();
			if (textView) {
				textView.setOptions(this.updateViewOptions(prefs));
			}
			editor.setAnnotationRulerVisible(prefs.annotationRuler);
			editor.setLineNumberRulerVisible(prefs.lineNumberRuler);
			editor.setFoldingRulerVisible(prefs.foldingRuler);
			editor.setOverviewRulerVisible(prefs.overviewRuler);
			if (this.renderToolbars) {
				this.renderToolbars(inputManager.getFileMetadata());
			}
		},
		updateStyler: function(prefs) {
			var styler = this.syntaxHighlighter.getStyler();
			if (styler) {
				if (styler.setTabsVisible) {
					styler.setTabsVisible(prefs.showTabs);
				}
				if (styler.setSpacesVisible) {
					styler.setSpacesVisible(prefs.showSpaces);
				}
			}
		},
		_init: function() {
			var editorPreferences = null;
			if(this.preferences) {
				editorPreferences = this.editorPreferences = new mEditorPreferences.EditorPreferences (this.preferences, function (prefs) {
					if (!prefs) {
						editorPreferences.getPrefs(this.updateSettings.bind(this));
					} else {
						this.updateSettings(prefs);
					}
				}.bind(this));
			}
			var themePreferences = null;
			if(this.preferences) {
				themePreferences = new mThemePreferences.ThemePreferences(this.preferences, new mThemeData.ThemeData());
				themePreferences.apply();
			}
			var editorDomNode = this._parent;
			var inputManager = this.inputManager;
			
			var textViewFactory = function() {
				var options = this.updateViewOptions(this.settings);
				objects.mixin(options, {
					parent: editorDomNode,
					model: new mProjectionTextModel.ProjectionTextModel(this.model || new mTextModel.TextModel())
				});
				var textView = new mTextView.TextView(options);
				return textView;
			}.bind(this);

			var editor = this.editor = new mEditor.Editor({
				textViewFactory: textViewFactory,
				annotationFactory: new mEditorFeatures.AnnotationFactory(),
				foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
				lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
				statusReporter: this.statusReporter,
				domNode: editorDomNode
			});
			editor.id = "orion.editor"; //$NON-NLS-0$
			inputManager.addEventListener("InputChanged", function(event) { //$NON-NLS-0$
				var textView = editor.getTextView();
				if (textView) {
					textView.setOptions(this.updateViewOptions(this.settings));
					this.syntaxHighlighter.setup(event.contentType, editor.getTextView(), editor.getAnnotationModel(), event.title, true).then(function() {
						this.updateStyler(this.settings);
					}.bind(this));
				}
			}.bind(this));
			if(this.editorPreferences) {
				this.editorPreferences.getPrefs(this.updateSettings.bind(this));
			} else {
				editor.setAnnotationRulerVisible(false);
			}
		},
		create: function() {
			this.editor.install();
		},
		destroy: function() {
			this.editor.uninstall();
		},
		getStyleAccessor: function() {
			this.syntaxHighlighter.getStyler().getStyleAccessor();
		}
	};
	return {ReadonlyEditorView: ReadonlyEditorView};
});


