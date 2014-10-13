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
/*eslint-env browser,amd*/


define(["orion/editor/textView", "orion/keyBinding", "orion/editor/editor", "orion/editor/editorFeatures"],

function(mTextView, mKeyBinding, mEditor, mEditorFeatures){
	
	var editorDomNode = document.getElementById("editor");
	
	var textViewFactory = function() {
		return new mTextView.TextView({
			parent: editorDomNode,
			tabSize: 4
		});
	};
	
	var annotationFactory = new mEditorFeatures.AnnotationFactory();
	
	var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {
		new mEditorFeatures.KeyBindingsFactory().createKeyBindings(editor, undoStack, contentAssist);
		// save binding
		editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("s", true), "save");
		editor.getTextView().setAction("save", function(){
				editor.setInput(null, null, null, true);
				var text = editor.getTextView().getText();
				var problems = [];
				var line, character;
				for (var i=0; i<text.length; i++) {
					if (text.charAt(i) === 'z') {
						line = editor.getTextView().getModel().getLineAtOffset(i) + 1;
						character = i - editor.getTextView().getModel().getLineStart(line);
						problems.push({
							start: character + 1,
							end: character + 1,
							line: line + 1,
							severity: "error",
							description: "I don't like the letter 'z'"});
					}
				}
				editor.showProblems(problems);
				
				var occurrences = [];
				var sel = editor.getTextView().getSelection();
				var word = editor.getTextView().getText(sel.start, sel.end);
				var index = text.indexOf(word);
				if (index !== -1) {
					for (i = index; i < text.length - word.length; i++) {
						var w = '';
						for (var j = 0; j < word.length; j++) {
							w = w + text.charAt (i + j);
						}
						if (w === word) {
							line = editor.getTextView().getModel().getLineAtOffset(i) + 1;
							character = i - editor.getTextView().getModel().getLineStart(line);
							occurrences.push({
							readAccess: (line % 2) === 0 ? false : true,
							line: line + 1,
							start: character + 1,
							end: character + word.length,
							description: ((line % 2) === 0 ? "write occurrence of " : "occurrence of ") + w });
						} 
					}
				} 
				editor.showOccurrences(occurrences);
				return true;
		});
	};
	
	var dirtyIndicator = "";
	var status = "";
	
	var statusReporter = function(message, isError) {
		if (isError) {
			status =  "ERROR: " + message;
		} else {
			status = message;
		}
		document.getElementById("status").textContent = dirtyIndicator + status;
	};
		
	var editor = new mEditor.Editor({
		textViewFactory: textViewFactory,
		undoStackFactory: new mEditorFeatures.UndoFactory(),
		annotationFactory: annotationFactory,
		lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
		contentAssistFactory: null,
		keyBindingFactory: keyBindingFactory, 
		statusReporter: statusReporter,
		domNode: editorDomNode
	});
		
	editor.addEventListener("DirtyChanged", function(evt) {
		if (editor.isDirty()) {
			dirtyIndicator = "You have unsaved changes.  ";
		} else {
			dirtyIndicator = "";
		}
		document.getElementById("status").textContent = dirtyIndicator + status;
	});
	
	editor.installTextView();
	editor.setInput("Content", null, "This is the initial editor contentz.  Type some text and press Ctrl-S to save.");
	
	window.onbeforeunload = function() {
		if (editor.isDirty()) {
			 return "There are unsaved changes.";
		}
	};
});