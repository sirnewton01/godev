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
/*global define prompt */

define("orion/editor/actions", [ //$NON-NLS-0$
	'i18n!orion/editor/nls/messages', //$NON-NLS-0$
	'orion/keyBinding', //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/tooltip', //$NON-NLS-0$
	'orion/editor/find', //$NON-NLS-0$
	'orion/util' //$NON-NLS-0$
], function(messages, mKeyBinding, mAnnotations, mTooltip, mFind, util) {

	var exports = {};

	/**
	 * TextActions connects common text editing keybindings onto an editor.
	 */
	function TextActions(editor, undoStack, find) {
		this.editor = editor;
		this.undoStack = undoStack;
		this._incrementalFind = new mFind.IncrementalFind(editor);
		this._find = find ? find : new mFind.Find(editor, undoStack);
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
			
			textView.setAction("undo", function() { //$NON-NLS-0$
				if (this.undoStack) {
					this.undoStack.undo();
					return true;
				}
				return false;
			}.bind(this), {name: messages.undo});
			
			textView.setAction("redo", function() { //$NON-NLS-0$
				if (this.undoStack) {
					this.undoStack.redo();
					return true;
				}
				return false;
			}.bind(this), {name: messages.redo});
			
			textView.setKeyBinding(new mKeyBinding.KeyBinding("f", true), "find"); //$NON-NLS-1$ //$NON-NLS-0$
			textView.setAction("find", function() { //$NON-NLS-0$
				if (this._find) {
					var selection = this.editor.getSelection();
					var search = prompt(messages.find, this.editor.getText(selection.start, selection.end));
					if (search) {
						this._find.find(true, {findString:search});
					}
				}
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
					annotationModel.modifyAnnotation(annotation);
				}
			}
			return true;
		},
		expandAnnotations: function(expand) {
			var editor = this.editor;
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			if(!annotationModel) { return true; }
			var model = editor.getModel();
			var annotation, iter = annotationModel.getAnnotations(0, model.getCharCount());
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
					annotationModel.modifyAnnotation(annotation);
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
			if(!annotationModel) { return true; }
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
				switch (annotation.type) {
					case mAnnotations.AnnotationType.ANNOTATION_ERROR:
					case mAnnotations.AnnotationType.ANNOTATION_WARNING:
					case mAnnotations.AnnotationType.ANNOTATION_TASK:
					case mAnnotations.AnnotationType.ANNOTATION_BOOKMARK:
						break;
					default:
						continue;
				}
				foundAnnotation = annotation;
				if (forward) {
					break;
				}
			}
			if (foundAnnotation) {
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
								contents: [foundAnnotation],
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
		},
		autoIndent: function() {
			var editor = this.editor;
			var textView = editor.getTextView();
			if (textView.getOptions("readonly")) { return false; } //$NON-NLS-0$
			var selection = editor.getSelection();
			if (selection.start === selection.end) {
				var model = editor.getModel();
				var lineIndex = model.getLineAtOffset(selection.start);
				var lineText = model.getLine(lineIndex, true);
				var lineStart = model.getLineStart(lineIndex);
				var index = 0, end = selection.start - lineStart, c;
				while (index < end && ((c = lineText.charCodeAt(index)) === 32 || c === 9)) { index++; }
				if (index > 0) {
					//TODO still wrong when typing inside folding
					var prefix = lineText.substring(0, index);
					index = end;
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
		 * Called when a content assist proposal has been applied. Inserts the proposal into the
		 * document. Activates Linked Mode if applicable for the selected proposal.
		 * @param {orion.editor.ContentAssist#ProposalAppliedEvent} event
		 */
		contentAssistProposalApplied: function(event) {
			/**
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
					escapePosition: proposal.escapePosition
				});
			} else if (proposal.groups && proposal.groups.length > 0 && this.linkedMode) {
				this.linkedMode.enterLinkedMode({
					groups: proposal.groups,
					escapePosition: proposal.escapePosition
				});
			} else if (proposal.escapePosition) {
				//we don't want linked mode, but there is an escape position, so just set cursor position
				var textView = this.editor.getTextView();
				textView.setCaretOffset(proposal.escapePosition);
			}
			return true;
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
			var model = editor.getModel();
			var selection = editor.getSelection();
			var firstLine = model.getLineAtOffset(selection.start);
			var lastLine = model.getLineAtOffset(selection.end > selection.start ? selection.end - 1 : selection.end);
			var uncomment = true, lines = [], lineText, index;
			for (var i = firstLine; i <= lastLine; i++) {
				lineText = model.getLine(i, true);
				lines.push(lineText);
				if (!uncomment || (index = lineText.indexOf("//")) === -1) { //$NON-NLS-0$
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
			var text, selStart, selEnd;
			var lineStart = model.getLineStart(firstLine);
			var lineEnd = model.getLineEnd(lastLine, true);
			if (uncomment) {
				for (var k = 0; k < lines.length; k++) {
					lineText = lines[k];
					index = lineText.indexOf("//"); //$NON-NLS-0$
					lines[k] = lineText.substring(0, index) + lineText.substring(index + 2);
				}
				text = lines.join("");
				var lastLineStart = model.getLineStart(lastLine);
				selStart = lineStart === selection.start ? selection.start : selection.start - 2;
				selEnd = selection.end - (2 * (lastLine - firstLine + 1)) + (selection.end === lastLineStart+1 ? 2 : 0);
			} else {
				lines.splice(0, 0, "");
				text = lines.join("//"); //$NON-NLS-0$
				selStart = lineStart === selection.start ? selection.start : selection.start + 2;
				selEnd = selection.end + (2 * (lastLine - firstLine + 1));
			}
			editor.setText(text, lineStart, lineEnd);
			editor.setSelection(selStart, selEnd);
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
	exports.SourceCodeActions = SourceCodeActions;
	
	return exports;
});