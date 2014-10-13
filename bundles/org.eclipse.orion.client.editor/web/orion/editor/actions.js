/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define("orion/editor/actions", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/tooltip', //$NON-NLS-0$
	'orion/editor/find', //$NON-NLS-0$
	'orion/editor/findUI', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mKeyBinding, mAnnotations, mTooltip, mFind, mFindUI, util) {

	var AT = mAnnotations.AnnotationType;

	var exports = {};

	/**
	 * TextActions connects common text editing keybindings onto an editor.
	 */
	function TextActions(editor, undoStack, find) {
		this.editor = editor;
		this.undoStack = undoStack;
		this._incrementalFind = new mFind.IncrementalFind(editor);
		this._find = find ? find : new mFindUI.FindUI(editor, undoStack);
		this._lastEditLocation = null;
		this.init();
	}

	TextActions.prototype = {
		init: function() {
			var textView = this.editor.getTextView();

			this._lastEditListener = {
				onModelChanged: function(e) {
					if (this.editor.isDirty()) {
						this._lastEditLocation = e.start + e.addedCharCount;
					}
				}.bind(this)
			};
			textView.addEventListener("ModelChanged", this._lastEditListener.onModelChanged); //$NON-NLS-0$

			textView.setAction("undo", function(data) { //$NON-NLS-0$
				if (this.undoStack) {
					var count = 1;
					if (data && data.count) {
						count = data.count;
					}
					while (count > 0) {
						this.undoStack.undo();
						--count;
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.undo});

			textView.setAction("redo", function(data) { //$NON-NLS-0$
				if (this.undoStack) {
					var count = 1;
					if (data && data.count) {
						count = data.count;
					}
					while (count > 0) {
						this.undoStack.redo();
						--count;
					}
					return true;
				}
				return false;
			}.bind(this), {name: messages.redo});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("f", true), "find"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("find", function() { //$NON-NLS-0$
				if (this._find) {
					var selection = this.editor.getSelection();
					this._find.show({findString:this.editor.getText(selection.start, selection.end)});
					return true;
				}
				return false;
			}.bind(this), {name: messages.find});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true), "findNext"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("findNext", function(options) { //$NON-NLS-0$
				if (this._find){
					this._find.find(true, options);
					return true;
				}
				return false;
			}.bind(this), {name: messages.findNext});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("k", true, true), "findPrevious"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("findPrevious", function(options) { //$NON-NLS-0$
				if (this._find){
					this._find.find(false, options);
					return true;
				}
				return false;
			}.bind(this), {name: messages.findPrevious});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true), "incrementalFind"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("incrementalFind", function() { //$NON-NLS-0$
				if (this._incrementalFind) {
					this._incrementalFind.find(true);
				}
				return true;
			}.bind(this), {name: messages.incrementalFind});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("j", true, true), "incrementalFindReverse"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("incrementalFindReverse", function() { //$NON-NLS-0$
				if (this._incrementalFind) {
					this._incrementalFind.find(false);
				}
				return true;
			}.bind(this), {name: messages.incrementalFindReverse});

			textView.setAction("tab", function() { //$NON-NLS-0$
				return this.indentLines();
			}.bind(this));

			textView.setAction("shiftTab", function() { //$NON-NLS-0$
				return this.unindentLines();
			}.bind(this), {name: messages.unindentLines});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(38, false, false, true), "moveLinesUp"); //$NON-NLS-0$
			textView.setAction("moveLinesUp", function() { //$NON-NLS-0$
				return this.moveLinesUp();
			}.bind(this), {name: messages.moveLinesUp});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(40, false, false, true), "moveLinesDown"); //$NON-NLS-0$
			textView.setAction("moveLinesDown", function() { //$NON-NLS-0$
				return this.moveLinesDown();
			}.bind(this), {name: messages.moveLinesDown});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(38, true, false, true), "copyLinesUp"); //$NON-NLS-0$
			textView.setAction("copyLinesUp", function() { //$NON-NLS-0$
				return this.copyLinesUp();
			}.bind(this), {name: messages.copyLinesUp});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(40, true, false, true), "copyLinesDown"); //$NON-NLS-0$
			textView.setAction("copyLinesDown", function() { //$NON-NLS-0$
				return this.copyLinesDown();
			}.bind(this), {name: messages.copyLinesDown});

			textView.setKeyBinding(new mKeyBinding.KeyBinding('d', true, false, false), "deleteLines"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("deleteLines", function(data) { //$NON-NLS-0$
				return this.deleteLines(data);
			}.bind(this), {name: messages.deleteLines});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("l", !util.isMac, false, false, util.isMac), "gotoLine"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("gotoLine", function() { //$NON-NLS-0$
				return this.gotoLine();
			}.bind(this), {name: messages.gotoLine});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(190, true), "nextAnnotation"); //$NON-NLS-0$
			textView.setAction("nextAnnotation", function() { //$NON-NLS-0$
				return this.nextAnnotation(true);
			}.bind(this), {name: messages.nextAnnotation});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(188, true), "previousAnnotation"); //$NON-NLS-0$
			textView.setAction("previousAnnotation", function() { //$NON-NLS-0$
				return this.nextAnnotation(false);
			}.bind(this), {name: messages.prevAnnotation});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, false, true, false), "expand"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("expand", function() { //$NON-NLS-0$
				return this.expandAnnotation(true);
			}.bind(this), {name: messages.expand});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, false, true, false), "collapse"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("collapse", function() { //$NON-NLS-0$
				return this.expandAnnotation(false);
			}.bind(this), {name: messages.collapse});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("e", true, true, true, false), "expandAll"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("expandAll", function() { //$NON-NLS-0$
				return this.expandAnnotations(true);
			}.bind(this), {name: messages.expandAll});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("c", true, true, true, false), "collapseAll"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("collapseAll", function() { //$NON-NLS-0$
				return this.expandAnnotations(false);
			}.bind(this), {name: messages.collapseAll});

			textView.setKeyBinding(new mKeyBinding.KeyBinding("q", !util.isMac, false, false, util.isMac), "lastEdit"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("lastEdit", function() { //$NON-NLS-0$
				return this.gotoLastEdit();
			}.bind(this), {name: messages.lastEdit});
		},
		copyLinesDown: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lineCount = model.getLineCount();
			var delimiter = "";
			var text = model.getText(lineStart, lineEnd);
			if (lastLine === lineCount-1) {
				text = (delimiter = model.getLineDelimiter()) + text;
			}
			var insertOffset = lineEnd;
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset + delimiter.length, insertOffset + text.length);
			return true;
		},
		copyLinesUp: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lineCount = model.getLineCount();
			var delimiter = "";
			var text = model.getText(lineStart, lineEnd);
			if (lastLine === lineCount-1) {
				text += (delimiter = model.getLineDelimiter());
			}
			var insertOffset = lineStart;
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset, insertOffset + text.length - delimiter.length);
			return true;
		},
		deleteLines: function(data) {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var count = 1;
			if (data && data.count) {
				count = data.count;
			}
			var selection = editor.getSelection();
			var model = editor.getModel();
			var firstLine = model.getLineAtOffset(selection.start);
			var lineStart = model.getLineStart(firstLine);
			var lastLine;
			if (selection.start !== selection.end || count === 1) {
				lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			} else {
				lastLine = Math.min(firstLine + count - 1, model.getLineCount() - 1);
			}
			var lineEnd = model.getLineEnd(lastLine, true);
			editor.setText("", lineStart, lineEnd);
			return true;
		},
		expandAnnotation: function(expand) {
			var editor = this.editor;
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel) { return true; }
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var lineIndex = model.getLineAtOffset(currentOffset);
			var start = model.getLineStart(lineIndex);
			var end = model.getLineEnd(lineIndex, true);
			if (model.getBaseModel) {
				start = model.mapOffset(start);
				end = model.mapOffset(end);
				model = model.getBaseModel();
			}
			var annotation, iter = annotationModel.getAnnotations(start, end);
			while (!annotation && iter.hasNext()) {
				var a = iter.next();
				if (a.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
				annotation = a;
			}
			if (annotation) {
				if (expand !== annotation.expanded) {
					if (expand) {
						annotation.expand();
					} else {
						editor.setCaretOffset(annotation.start);
						annotation.collapse();
					}
				}
			}
			return true;
		},
		expandAnnotations: function(expand) {
			var editor = this.editor;
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel) { return true; }
			var annotation, iter = annotationModel.getAnnotations();
			textView.setRedraw(false);
			while (iter.hasNext()) {
				annotation = iter.next();
				if (annotation.type !== mAnnotations.AnnotationType.ANNOTATION_FOLDING) { continue; }
				if (expand !== annotation.expanded) {
					if (expand) {
						annotation.expand();
					} else {
						annotation.collapse();
					}
				}
			}
			textView.setRedraw(true);
			return true;
		},
		indentLines: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			if(!textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			if (firstLine !== lastLine) {
				var lines = [];
				lines.push("");
				for (var i = firstLine; i <= lastLine; i++) {
					lines.push(model.getLine(i, true));
				}
				var lineStart = model.getLineStart(firstLine);
				var lineEnd = model.getLineEnd(lastLine, true);
				var options = textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
				var text = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
				editor.setText(lines.join(text), lineStart, lineEnd);
				editor.setSelection(lineStart === selection.start ? selection.start : selection.start + text.length, selection.end + ((lastLine - firstLine + 1) * text.length));
				return true;
			}
			return false;
		},
		gotoLastEdit: function() {
			if (typeof this._lastEditLocation === "number")  { //$NON-NLS-0$
				this.editor.showSelection(this._lastEditLocation);
			}
			return true;
		},
		gotoLine: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var line = model.getLineAtOffset(editor.getCaretOffset());
			line = prompt(messages.gotoLinePrompty, line + 1);
			if (line) {
				line = parseInt(line, 10);
				editor.onGotoLine(line - 1, 0);
			}
			return true;
		},
		moveLinesDown: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineCount = model.getLineCount();
			if (lastLine === lineCount-1) {
				return true;
			}
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var insertOffset = model.getLineEnd(lastLine+1, true) - (lineEnd - lineStart);
			var text, delimiterLength = 0;
			if (lastLine !== lineCount-2) {
				text = model.getText(lineStart, lineEnd);
			} else {
				// Move delimiter following selection to front of the text
				var lineEndNoDelimiter = model.getLineEnd(lastLine);
				text = model.getText(lineEndNoDelimiter, lineEnd) + model.getText(lineStart, lineEndNoDelimiter);
				delimiterLength += lineEnd - lineEndNoDelimiter;
			}
			this.startUndo();
			editor.setText("", lineStart, lineEnd);
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset + delimiterLength, insertOffset + delimiterLength + text.length);
			this.endUndo();
			return true;
		},
		moveLinesUp: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			if (firstLine === 0) {
				return true;
			}
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var lineCount = model.getLineCount();
			var insertOffset = model.getLineStart(firstLine - 1);
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var text = model.getText(lineStart, lineEnd);
			var delimiterLength = 0;
			if (lastLine === lineCount-1) {
				// Move delimiter preceding selection to end of text
				var delimiterStart = model.getLineEnd(firstLine - 1);
				var delimiterEnd = model.getLineEnd(firstLine - 1, true);
				text += model.getText(delimiterStart, delimiterEnd);
				lineStart = delimiterStart;
				delimiterLength = delimiterEnd - delimiterStart;
			}
			this.startUndo();
			editor.setText("", lineStart, lineEnd);
			editor.setText(text, insertOffset, insertOffset);
			editor.setSelection(insertOffset, insertOffset + text.length - delimiterLength);
			this.endUndo();
			return true;
		},
		nextAnnotation: function (forward) {
			var editor = this.editor;
			var annotationModel = editor.getAnnotationModel();
			if (!annotationModel) { return true; }
			var list = editor.getOverviewRuler() || editor.getAnnotationStyler();
			if (!list) { return true; }
			function ignore(annotation) {
				return !!annotation.lineStyle ||
					annotation.type === AT.ANNOTATION_MATCHING_BRACKET ||
					annotation.type === AT.ANNOTATION_CURRENT_BRACKET ||
					!list.isAnnotationTypeVisible(annotation.type);
			}
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var annotations = annotationModel.getAnnotations(forward ? currentOffset : 0, forward ? model.getCharCount() : currentOffset);
			var foundAnnotation = null;
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (forward) {
					if (annotation.start <= currentOffset) { continue; }
				} else {
					if (annotation.start >= currentOffset) { continue; }
				}
				if (ignore(annotation)) {
					continue;
				}
				foundAnnotation = annotation;
				if (forward) {
					break;
				}
			}
			if (foundAnnotation) {
				var foundAnnotations = [foundAnnotation];
				annotations = annotationModel.getAnnotations(foundAnnotation.start, foundAnnotation.start);
				while (annotations.hasNext()) {
					annotation = annotations.next();
					if (annotation !== foundAnnotation && !ignore(annotation)) {
						foundAnnotations.push(annotation);
					}
				}
				var view = editor.getTextView();
				var nextLine = model.getLineAtOffset(foundAnnotation.start);
				var tooltip = mTooltip.Tooltip.getTooltip(view);
				if (!tooltip) {
					editor.moveSelection(foundAnnotation.start);
					return true;
				}
				editor.moveSelection(foundAnnotation.start, foundAnnotation.start, function() {
					tooltip.setTarget({
						getTooltipInfo: function() {
							var tooltipCoords = view.convert({
								x: view.getLocationAtOffset(foundAnnotation.start).x,
								y: view.getLocationAtOffset(model.getLineStart(nextLine)).y
							}, "document", "page"); //$NON-NLS-1$ //$NON-NLS-0$
							return {
								contents: foundAnnotations,
								x: tooltipCoords.x,
								y: tooltipCoords.y + Math.floor(view.getLineHeight(nextLine) * 1.33)
							};
						}
					}, 0);
				});
			}
			return true;
		},
		unindentLines: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			if(!textView.getOptions("tabMode")) { return; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var tabSize = textView.getOptions("tabSize"); //$NON-NLS-0$
			var spaceTab = new Array(tabSize + 1).join(" "); //$NON-NLS-0$
			var lines = [], removeCount = 0, firstRemoveCount = 0;
			for (var i = firstLine; i <= lastLine; i++) {
				var line = model.getLine(i, true);
				if (model.getLineStart(i) !== model.getLineEnd(i)) {
					if (line.indexOf("\t") === 0) { //$NON-NLS-0$
						line = line.substring(1);
						removeCount++;
					} else if (line.indexOf(spaceTab) === 0) {
						line = line.substring(tabSize);
						removeCount += tabSize;
					} else {
						return true;
					}
				}
				if (i === firstLine) {
					firstRemoveCount = removeCount;
				}
				lines.push(line);
			}
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			var lastLineStart = model.getLineStart(lastLine);
			editor.setText(lines.join(""), lineStart, lineEnd);
			var start = lineStart === selection.start ? selection.start : selection.start - firstRemoveCount;
			var end = Math.max(start, selection.end - removeCount + (selection.end === lastLineStart+1 && selection.start !== selection.end ? 1 : 0));
			editor.setSelection(start, end);
			return true;
		},
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		},
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		}
	};
	exports.TextActions = TextActions;

	/**
	 * @param {orion.editor.Editor} editor
	 * @param {orion.editor.UndoStack} undoStack
	 * @param {orion.editor.ContentAssist} [contentAssist]
	 * @param {orion.editor.LinkedMode} [linkedMode]
	 */
	function SourceCodeActions(editor, undoStack, contentAssist, linkedMode) {
		this.editor = editor;
		this.undoStack = undoStack;
		this.contentAssist = contentAssist;
		this.linkedMode = linkedMode;
		if (this.contentAssist) {
			this.contentAssist.addEventListener("ProposalApplied", this.contentAssistProposalApplied.bind(this)); //$NON-NLS-0$
		}
		this.init();
	}
	SourceCodeActions.prototype = {
		init: function() {
			var textView = this.editor.getTextView();

			textView.setAction("lineStart", function() { //$NON-NLS-0$
				return this.lineStart();
			}.bind(this));

			textView.setAction("enter", function() { //$NON-NLS-0$
				return this.autoIndent();
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding("t", true, false, true), "trimTrailingWhitespaces"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("trimTrailingWhitespaces", function() { //$NON-NLS-0$
				return this.trimTrailingWhitespaces();
			}.bind(this), {name: messages.trimTrailingWhitespaces});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true), "toggleLineComment"); //$NON-NLS-0$
			textView.setAction("toggleLineComment", function() { //$NON-NLS-0$
				return this.toggleLineComment();
			}.bind(this), {name: messages.toggleLineComment});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(191, true, !util.isMac, false, util.isMac), "addBlockComment"); //$NON-NLS-0$
			textView.setAction("addBlockComment", function() { //$NON-NLS-0$
				return this.addBlockComment();
			}.bind(this), {name: messages.addBlockComment});

			textView.setKeyBinding(new mKeyBinding.KeyBinding(220, true, !util.isMac, false, util.isMac), "removeBlockComment"); //$NON-NLS-0$
			textView.setAction("removeBlockComment", function() { //$NON-NLS-0$
				return this.removeBlockComment();
			}.bind(this), {name: messages.removeBlockComment});

			// Autocomplete square brackets []
			textView.setKeyBinding(new mKeyBinding.KeyBinding("[", false, false, false, false, "keypress"), "autoPairSquareBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairSquareBracket", function() { //$NON-NLS-0$
				return this.autoPairBrackets("[", "]"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding(']', false, false, false, false, "keypress"), "skipClosingSquareBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingSquareBracket", function() { //$NON-NLS-0$
				return this.skipClosingBracket(']'); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete angle brackets <>
			textView.setKeyBinding(new mKeyBinding.KeyBinding("<", false, false, false, false, "keypress"), "autoPairAngleBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairAngleBracket", function() { //$NON-NLS-0$
				return this.autoPairBrackets("<", ">"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding('>', false, false, false, false, "keypress"), "skipClosingAngleBracket"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingAngleBracket", function() { //$NON-NLS-0$
				return this.skipClosingBracket('>'); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete parentheses ()
			textView.setKeyBinding(new mKeyBinding.KeyBinding("(", false, false, false, false, "keypress"), "autoPairParentheses"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairParentheses", function() { //$NON-NLS-0$
				return this.autoPairBrackets("(", ")"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding(')', false, false, false, false, "keypress"), "skipClosingParenthesis"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingParenthesis", function() { //$NON-NLS-0$
				return this.skipClosingBracket(")"); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete braces {}
			textView.setKeyBinding(new mKeyBinding.KeyBinding("{", false, false, false, false, "keypress"), "autoPairBraces"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairBraces", function() { //$NON-NLS-0$
				return this.autoPairBrackets("{", "}"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setKeyBinding(new mKeyBinding.KeyBinding('}', false, false, false, false, "keypress"), "skipClosingBrace"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("skipClosingBrace", function() { //$NON-NLS-0$
				return this.skipClosingBracket("}"); //$NON-NLS-0$
			}.bind(this));

			// Autocomplete single quotations
			textView.setKeyBinding(new mKeyBinding.KeyBinding("'", false, false, false, false, "keypress"), "autoPairSingleQuotation"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairSingleQuotation", function() { //$NON-NLS-0$
				return this.autoPairQuotations("'"); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			// Autocomplete double quotations
			textView.setKeyBinding(new mKeyBinding.KeyBinding('"', false, false, false, false, "keypress"), "autoPairDblQuotation"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("autoPairDblQuotation", function() { //$NON-NLS-0$
				return this.autoPairQuotations('"'); //$NON-NLS-1$ //$NON-NLS-0$
			}.bind(this));

			textView.setAction("deletePrevious", function() { //$NON-NLS-0$
				return this.deletePrevious();
			}.bind(this));
		},
		autoIndent: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			if (textView.getOptions("singleMode")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			if (selection.start === selection.end) {
				var model = editor.getModel();
				var lineIndex = model.getLineAtOffset(selection.start);
				var lineText = model.getLine(lineIndex, false);
				var lineStart = model.getLineStart(lineIndex);
				var index = 0;
				var lineOffset = selection.start - lineStart;
				var c;
				while (index < lineOffset && ((c = lineText.charCodeAt(index)) === 32 || c === 9)) { index++; }
				var prefix = lineText.substring(0, index);
				var options = textView.getOptions("tabSize", "expandTab"); //$NON-NLS-1$ //$NON-NLS-0$
				var tab = options.expandTab ? new Array(options.tabSize + 1).join(" ") : "\t"; //$NON-NLS-1$ //$NON-NLS-0$
				var lineDelimiter = model.getLineDelimiter();
				var matchCommentStart = /^[\s]*\/\*[\*]*[\s]*$/;
				var matchCommentDelimiter = /^[\s]*\*/;
				var matchCommentEnd = /\*\/[\s]*$/;
				var lineTextBeforeCaret = lineText.substring(0, lineOffset);
				var lineTextAfterCaret = lineText.substring(lineOffset);
				var text;
				// If the character before the caret is an opening brace, smart indent the next line.
				var prevCharIdx;
				if (this.smartIndentation && lineText.charCodeAt(prevCharIdx = lineTextBeforeCaret.trimRight().length - 1) === 123) {
					// Remove any extra whitespace
					var whitespaceBeforeCaret = lineOffset - prevCharIdx - 1;
					var whitespaceAfterCaret = lineTextAfterCaret.length - lineTextAfterCaret.trimLeft().length;

					text = lineText.charCodeAt(lineOffset + whitespaceAfterCaret) === 125 ?
						   lineDelimiter + prefix + tab + lineDelimiter + prefix :
						   lineDelimiter + prefix + tab;

					editor.setText(text, selection.start - whitespaceBeforeCaret, selection.end + whitespaceAfterCaret);
					editor.setCaretOffset(selection.start + lineDelimiter.length + prefix.length + tab.length - whitespaceBeforeCaret);
					return true;
				// Proceed with autocompleting multi-line comment if the text before the caret matches
				// the start or comment delimiter (*) of a multi-line comment
				} else if (this.autoCompleteComments && !matchCommentEnd.test(lineTextBeforeCaret) &&
							(matchCommentStart.test(lineTextBeforeCaret) || matchCommentDelimiter.test(lineTextBeforeCaret))) {
					var caretOffset;

					/**
					 * Matches the start of a multi-line comment. Autocomplete the multi-line block comment,
					 * moving any text after the caret into the block comment and setting the caret to be
					 * after the comment delimiter.
					 */
					var match = matchCommentStart.exec(lineTextBeforeCaret);
					if (match) {
						text = lineDelimiter + prefix + " * "; //$NON-NLS-0$
						// Text added into the comment block are trimmed of all preceding and trailing whitespaces.
						// If the text after the caret contains the ending of a block comment, exclude the ending.
						if (matchCommentEnd.test(lineTextAfterCaret)) {
							text += lineTextAfterCaret.substring(0, lineTextAfterCaret.length - 2).trim();
						} else {
							text += lineTextAfterCaret.trim();
						}
						// Add the closing to the multi-line block comment if the next line is not a
						// comment delimiter.
						if ((model.getLineCount() === lineIndex + 1) ||
							!matchCommentDelimiter.test(model.getLine(lineIndex + 1))) {
							text += lineDelimiter + prefix + " */"; //$NON-NLS-0$
						}
						editor.setText(text, selection.start, selection.end + lineTextAfterCaret.length);
						editor.setCaretOffset(selection.start + lineDelimiter.length + prefix.length + 3);
						return true;
					}

					/**
					 * Matches a comment delimiter (*) as the start of the line, and traverses up the lines to confirm if
					 * it is a multi-line comment by matching the start of a block comment. If so, continue the
					 * multi-line comment in the next line. Any text that follows after the caret is moved to the newly
					 * added comment delimiter.
					 */
					match = matchCommentDelimiter.exec(lineTextBeforeCaret);
					if (match) {
						for (var i = lineIndex - 1; i >= 0; i--) {
							var prevLine = model.getLine(i, false);
							if (matchCommentStart.test(prevLine)) {
								/**
								 * If the text after the caret matches the end of a comment block or the character in front of the
								 * caret is a forward slash, continue the block comment with the caret and text after the caret on
								 * the next line directly in front of the star (*).
								 */
								if (matchCommentEnd.test(lineTextAfterCaret) || lineText.charCodeAt(lineOffset) === 47) {
									text = lineDelimiter + prefix + "*" + lineTextAfterCaret; //$NON-NLS-0$
									caretOffset = selection.start + lineDelimiter.length + prefix.length + 1;
								} else {
									text = lineDelimiter + prefix + "* " + lineTextAfterCaret; //$NON-NLS-0$
									caretOffset = selection.start + lineDelimiter.length + prefix.length + 2;
								}
								editor.setText(text, selection.start, selection.end + lineTextAfterCaret.length);
								editor.setCaretOffset(caretOffset);
								return true;
							} else if (!matchCommentDelimiter.test(prevLine)) {
								return false;
							}
						}
					}
					return false;
				} else if (matchCommentEnd.test(lineTextBeforeCaret) && prefix.charCodeAt(prefix.length - 1) === 32) {
					// Matches the end of a block comment. Fix the indentation for the following line.
					text = lineDelimiter + prefix.substring(0, prefix.length - 1);
					editor.setText(text, selection.start, selection.end);
					editor.setCaretOffset(selection.start + text.length);
					return true;
				} else if (index > 0) {
					//TODO still wrong when typing inside folding
					index = lineOffset;
					while (index < lineText.length && ((c = lineText.charCodeAt(index++)) === 32 || c === 9)) { selection.end++; }
					editor.setText(model.getLineDelimiter() + prefix, selection.start, selection.end);
					return true;
				}
			}
			return false;
		},
		addBlockComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var open = "/*", close = "*/", commentTags = new RegExp("/\\*" + "|" + "\\*/", "g"); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			var result = this._findEnclosingComment(model, selection.start, selection.end);
			if (result.commentStart !== undefined && result.commentEnd !== undefined) {
				return true; // Already in a comment
			}

			var text = model.getText(selection.start, selection.end);
			if (text.length === 0) { return true; }

			var oldLength = text.length;
			text = text.replace(commentTags, "");
			var newLength = text.length;

			editor.setText(open + text + close, selection.start, selection.end);
			editor.setSelection(selection.start + open.length, selection.end + open.length + (newLength-oldLength));
			return true;
		},
		/**
		 * Called on an opening bracket keypress.
		 * Automatically inserts the specified opening and closing brackets around the caret or selected text.
		 */
		autoPairBrackets: function(openBracket, closeBracket) {
			if (openBracket === "[" && !this.autoPairSquareBrackets) { //$NON-NLS-0$
				return false;
			} else if (openBracket === "{" && !this.autoPairBraces) { //$NON-NLS-0$
				return false;
			} else if (openBracket === "(" && !this.autoPairParentheses) { //$NON-NLS-0$
				return false;
			} else if (openBracket === "<" && !this.autoPairAngleBrackets) { //$NON-NLS-0$
				return false;
			}

			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1).trim(); //$NON-NLS-0$
			var isClosingBracket = new RegExp("^$|[)}\\]>]"); //$NON-NLS-0$ // matches any empty string and closing bracket

			if (selection.start === selection.end && isClosingBracket.test(nextChar)) { //$NON-NLS-0$
				// No selection and subsequent character is not a closing bracket - wrap the caret with the opening and closing brackets,
				// and maintain the caret position inbetween the brackets
				editor.setText(openBracket + closeBracket, selection.start, selection.start);
				editor.setCaretOffset(selection.start + 1);
				return true;
			} else if (selection.start !== selection.end) {
				// Wrap the selected text with the specified opening and closing brackets and keep selection on text
				var text = model.getText(selection.start, selection.end);
				editor.setText(openBracket + text + closeBracket, selection.start, selection.end);
				editor.setSelection(selection.start + 1, selection.end + 1);
				return true;
			}
			return false;
		},
		/**
		 * Called on a quotation mark keypress.
		 * Automatically inserts a pair of the specified quotation around the caret the caret or selected text.
		 */
		autoPairQuotations: function(quotation) {
			if (!this.autoPairQuotation) { return false; }
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var prevChar = (currentOffset === 0) ? "" : model.getText(selection.start - 1, selection.start).trim(); //$NON-NLS-0$
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1).trim(); //$NON-NLS-0$
			var isQuotation = new RegExp("^\"$|^'$"); //$NON-NLS-0$
			var isAlpha = new RegExp("\\w"); //$NON-NLS-0$
			var isClosingBracket = new RegExp("^$|[)}\\]>]"); //$NON-NLS-0$ // matches any empty string and closing bracket

			// Wrap the selected text with the specified opening and closing quotation marks and keep selection on text
			if (selection.start !== selection.end) {
				var text = model.getText(selection.start, selection.end);
				if (isQuotation.test(text)) { return false; }
				editor.setText(quotation + text + quotation, selection.start, selection.end);
				editor.setSelection(selection.start + 1, selection.end + 1);
			} else if (nextChar === quotation) {
				// Skip over the next character if it matches the specified quotation mark
				editor.setCaretOffset(selection.start + 1);
			} else if (prevChar === quotation || isQuotation.test(nextChar) || isAlpha.test(prevChar) || !isClosingBracket.test(nextChar)) {
				// Insert the specified quotation mark
				return false;
			} else {
				// No selection - wrap the caret with the opening and closing quotation marks, and maintain the caret position inbetween the quotations
				editor.setText(quotation + quotation, selection.start, selection.start);
				editor.setCaretOffset(selection.start + 1);
			}
			return true;
		},
		/**
		 * Called when a content assist proposal has been applied. Inserts the proposal into the
		 * document. Activates Linked Mode if applicable for the selected proposal.
		 * @param {orion.editor.ContentAssist#ProposalAppliedEvent} event
		 */
		contentAssistProposalApplied: function(event) {
			/*
			 * The event.proposal is an object with this shape:
			 * {   proposal: "[proposal string]", // Actual text of the proposal
			 *     description: "diplay string", // Optional
			 *     positions: [{
			 *         offset: 10, // Offset of start position of parameter i
			 *         length: 3  // Length of parameter string for parameter i
			 *     }], // One object for each parameter; can be null
			 *     escapePosition: 19, // Optional; offset that caret will be placed at after exiting Linked Mode.
			 *     style: 'emphasis', // Optional: either emphasis, noemphasis, hr to provide custom styling for the proposal
			 *     unselectable: false // Optional: if set to true, then this proposal cannnot be selected through the keyboard
			 * }
			 * Offsets are relative to the text buffer.
			 */
			var proposal = event.data.proposal;

			// If escapePosition is not provided, positioned the cursor at the end of the inserted text 
			function escapePosition() {
				if (typeof proposal.escapePosition === "number") { //$NON-NLS-0$
					return proposal.escapePosition;
				}
				return event.data.start + proposal.proposal.length;
			}

			//if the proposal specifies linked positions, build the model and enter linked mode
			if (proposal.positions && proposal.positions.length > 0 && this.linkedMode) {
				var positionGroups = [];
				for (var i = 0; i < proposal.positions.length; ++i) {
					positionGroups[i] = {
						positions: [{
							offset: proposal.positions[i].offset,
							length: proposal.positions[i].length
						}]
					};
				}
				this.linkedMode.enterLinkedMode({
					groups: positionGroups,
					escapePosition: escapePosition()
				});
			} else if (proposal.groups && proposal.groups.length > 0 && this.linkedMode) {
				this.linkedMode.enterLinkedMode({
					groups: proposal.groups,
					escapePosition: escapePosition()
				});
			} else if (typeof proposal.escapePosition === "number") { //$NON-NLS-0$
				//we don't want linked mode, but there is an escape position, so just set cursor position
				var textView = this.editor.getTextView();
				textView.setCaretOffset(proposal.escapePosition);
			}
			return true;
		},
		// On backspace keypress, checks if there are a pair of brackets or quotation marks to be deleted
		deletePrevious: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			if (selection.start !== selection.end) { return false; }
			var model = editor.getModel();
			var caretOffset = editor.getCaretOffset();
			var prevChar = (caretOffset === 0) ? "" : model.getText(selection.start - 1, selection.start); //$NON-NLS-0$
			var nextChar = (caretOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1); //$NON-NLS-0$

			if ((prevChar === "(" && nextChar === ")") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "[" && nextChar === "]") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "{" && nextChar === "}") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "<" && nextChar === ">") || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === '"' && nextChar === '"') || //$NON-NLS-1$ //$NON-NLS-0$
				(prevChar === "'" && nextChar === "'")) { //$NON-NLS-1$ //$NON-NLS-0$
				editor.setText("", selection.start, selection.start + 1); //$NON-NLS-0$
			}
			return false;
		},
		_findEnclosingComment: function(model, start, end) {
			var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$
			var firstLine = model.getLineAtOffset(start);
			var lastLine = model.getLineAtOffset(end);
			var i, line, extent, openPos, closePos;
			var commentStart, commentEnd;
			for (i=firstLine; i >= 0; i--) {
				line = model.getLine(i);
				extent = (i === firstLine) ? start - model.getLineStart(firstLine) : line.length;
				openPos = line.lastIndexOf(open, extent);
				closePos = line.lastIndexOf(close, extent);
				if (closePos > openPos) {
					break; // not inside a comment
				} else if (openPos !== -1) {
					commentStart = model.getLineStart(i) + openPos;
					break;
				}
			}
			for (i=lastLine; i < model.getLineCount(); i++) {
				line = model.getLine(i);
				extent = (i === lastLine) ? end - model.getLineStart(lastLine) : 0;
				openPos = line.indexOf(open, extent);
				closePos = line.indexOf(close, extent);
				if (openPos !== -1 && openPos < closePos) {
					break;
				} else if (closePos !== -1) {
					commentEnd = model.getLineStart(i) + closePos;
					break;
				}
			}
			return {commentStart: commentStart, commentEnd: commentEnd};
		},
		lineStart: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var caretOffset = editor.getCaretOffset();
			var lineIndex = model.getLineAtOffset(caretOffset);
			var lineOffset = model.getLineStart(lineIndex);
			var lineText = model.getLine(lineIndex);
			var offset;
			for (offset=0; offset<lineText.length; offset++) {
				var c = lineText.charCodeAt(offset);
				if (!(c === 32 || c === 9)) {
					break;
				}
			}
			offset += lineOffset;
			if (caretOffset !== offset) {
				editor.setSelection(offset, offset);
				return true;
			}
			return false;
		},
		removeBlockComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var open = "/*", close = "*/"; //$NON-NLS-1$ //$NON-NLS-0$

			// Try to shrink selection to a comment block
			var selectedText = model.getText(selection.start, selection.end);
			var newStart, newEnd;
			var i;
			for(i=0; i < selectedText.length; i++) {
				if (selectedText.substring(i, i + open.length) === open) {
					newStart = selection.start + i;
					break;
				}
			}
			for (; i < selectedText.length; i++) {
				if (selectedText.substring(i, i + close.length) === close) {
					newEnd = selection.start + i;
					break;
				}
			}

			if (newStart !== undefined && newEnd !== undefined) {
				editor.setText(model.getText(newStart + open.length, newEnd), newStart, newEnd + close.length);
				editor.setSelection(newStart, newEnd);
			} else {
				// Otherwise find enclosing comment block
				var result = this._findEnclosingComment(model, selection.start, selection.end);
				if (result.commentStart === undefined || result.commentEnd === undefined) {
					return true;
				}

				var text = model.getText(result.commentStart + open.length, result.commentEnd);
				editor.setText(text, result.commentStart, result.commentEnd + close.length);
				editor.setSelection(selection.start - open.length, selection.end - close.length);
			}
			return true;
		},
		toggleLineComment: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var comment = this.lineComment || "//"; //$NON-NLS-0$
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var uncomment = true, lineIndices = [], index;
			for (var i = firstLine; i <= lastLine; i++) {
				var lineText = model.getLine(i, true);
				index = lineText.indexOf(comment);
				lineIndices.push(index);
				if (!uncomment || index === -1) {
					uncomment = false;
				} else {
					if (index !== 0) {
						var j;
						for (j=0; j<index; j++) {
							var c = lineText.charCodeAt(j);
							if (!(c === 32 || c === 9)) {
								break;
							}
						}
						uncomment = j === index;
					}
				}
			}
			var selStart, selEnd, l = comment.length, k;
			var lineStart = model.getLineStart(firstLine);
			textView.setRedraw(false);
			this.startUndo();
			if (uncomment) {
				for (k = lineIndices.length - 1; k >= 0; k--) {
					index = lineIndices[k] + model.getLineStart(firstLine + k);
					editor.setText("", index, index + l);
				}
				var lastLineStart = model.getLineStart(lastLine);
				selStart = lineStart === selection.start ? selection.start : selection.start - l;
				selEnd = selection.end - (l * (lastLine - firstLine + 1)) + (selection.end === lastLineStart+1 ? l : 0);
			} else {
				for (k = lineIndices.length - 1; k >= 0; k--) {
					index = model.getLineStart(firstLine + k);
					editor.setText(comment, index, index);
				}
				selStart = lineStart === selection.start ? selection.start : selection.start + l;
				selEnd = selection.end + (l * (lastLine - firstLine + 1));
			}
			this.endUndo();
			editor.setSelection(selStart, selEnd);
			textView.setRedraw(true);
			return true;
		},
		trimTrailingWhitespaces: function() {
			var editor = this.editor;
			var model = editor.getModel();
			var selection = editor.getSelection();
			editor.getTextView().setRedraw(false);
			editor.getUndoStack().startCompoundChange();
			var matchTrailingWhiteSpace = /(\s+$)/;
			var lineCount = model.getLineCount();
			for (var i = 0; i < lineCount; i++) {
				var lineText = model.getLine(i);
				var match = matchTrailingWhiteSpace.exec(lineText);
				if (match) {
					var lineStartOffset = model.getLineStart(i);
					var matchLength = match[0].length;
					var start = lineStartOffset + match.index;
					model.setText("", start, start + matchLength);
					/**
					 * Move the caret to its original position prior to the save. If the caret
					 * was in the trailing whitespaces, move the caret to the end of the line.
					 */
					if (selection.start > start) {
						selection.start = Math.max(start, selection.start - matchLength);
					}
					if (selection.start !== selection.end && selection.end > start) {
						selection.end = Math.max(start, selection.end - matchLength);
					}
				}
			}
			editor.getUndoStack().endCompoundChange();
			editor.setSelection(selection.start, selection.end, false);
			editor.getTextView().setRedraw(true);
		},
		startUndo: function() {
			if (this.undoStack) {
				this.undoStack.startCompoundChange();
			}
		},
		skipClosingBracket: function(closingChar) {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			var model = editor.getModel();
			var currentOffset = editor.getCaretOffset();
			var nextChar = (currentOffset === model.getCharCount()) ? "" : model.getText(selection.start, selection.start + 1); //$NON-NLS-0$

			if (nextChar === closingChar) {
				editor.setCaretOffset(selection.start + 1);
				return true;
			}
			return false;
		},
		endUndo: function() {
			if (this.undoStack) {
				this.undoStack.endCompoundChange();
			}
		},
		setAutoPairParentheses: function(enabled) {
			this.autoPairParentheses = enabled;
		},
		setAutoPairBraces: function(enabled) {
			this.autoPairBraces = enabled;
		},
		setAutoPairSquareBrackets: function(enabled) {
			this.autoPairSquareBrackets = enabled;
		},
		setAutoPairAngleBrackets: function(enabled) {
			this.autoPairAngleBrackets = enabled;
		},
		setAutoPairQuotations: function(enabled) {
			this.autoPairQuotation = enabled;
		},
		setAutoCompleteComments: function(enabled) {
			this.autoCompleteComments = enabled;
		},
		setLineComment: function(lineComment) {
			this.lineComment = lineComment;
		},
		setSmartIndentation: function(enabled) {
			this.smartIndentation = enabled;
		}
	};
	exports.SourceCodeActions = SourceCodeActions;

	if (!String.prototype.trimLeft) {
		String.prototype.trimLeft = function(){
			return this.replace(/^\s+/g, '');
		};
	}
	if (!String.prototype.trimRight) {
		String.prototype.trimRight = function(){
			return this.replace(/\s+$/g, '');
		};
	}

	return exports;
});