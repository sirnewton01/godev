/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
define([
	'js-tests/editor/mockTextView',
	'orion/editor/editor',
	'orion/editor/editorFeatures',
	'orion/objects'
], function(mMockTextView, mEditor, mEditorFeatures, objects) {
	var Editor = mEditor.Editor,
	    MockTextView =  mMockTextView.MockTextView;

	/**
	 * @private
	 * @name orion.test.editor.MockEditor
	 * @classdesc Mock {@link orion.editor.Editor} that does not depend on the DOM.
	 * @class Mock {@link orion.editor.Editor} that does not depend on the DOM.
	 */
	function MockEditor(options) {
		var editorOptions = {
			textViewFactory: function() {
				return new MockTextView();
			},
			undoStackFactory: new mEditorFeatures.UndoFactory()
//			annotationFactory: new mEditorFeatures.AnnotationFactory(),
//			lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
//			foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
//			textDNDFactory: new mEditorFeatures.TextDNDFactory(),
//			contentAssistFactory: contentAssistFactory,
//			keyBindingFactory: new mEditorFeatures.KeyBindingsFactory(), 
//			statusReporter: options.statusReporter,
		};
		objects.mixin(editorOptions, options);
		Editor.call(this, editorOptions);
	}
	MockEditor.prototype = Object.create(Editor.prototype);

	return MockEditor;
});