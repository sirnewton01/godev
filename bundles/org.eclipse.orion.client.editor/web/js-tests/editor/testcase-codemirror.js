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

/*jslint */
/*global define*/

define(["chai/chai", "orion/editor/eventTarget", "orion/editor/textModel", "orion/editor/annotations", "orion/editor/mirror"],
		function(chai, mEventTarget, mTextModel, mAnnotations, mMirror) {
	var assert = chai.assert;
	var tests = {};
	
	function SampleMode(codeMirror) {
	}
	
	// Fake version of orion.editor.TextView for testing. Just dispatches events, doesn't touch the DOM.
	function MockTextView() {
		this.model = new mTextModel.TextModel();
	}
	MockTextView.prototype = {
		getModel: function() {
			return this.model;
		},
		getText: function(start, end) {
			return this.model.getText(start, end);
		},
		setText: function(text, start, end) {
		},
		addEventListener: function(){
		}
		// Dispatch "Changing", "Changed", "LineStyle", "Scroll" (?), "Destroy", "Verify"
	};
	
	// ************************************************************************************************
	tests["test CodeMirror - 1"] = function() {
		var view = new MockTextView();
		var codeMirror = new mMirror.Mirror();
		var annotationModel = new mAnnotations.AnnotationModel(view.getModel());
		codeMirror.defineMode("test", SampleMode);
		var styler = new mMirror.CodeMirrorStyler(view, codeMirror, annotationModel);
		assert.ok(styler);
	};
	
	return tests;
});