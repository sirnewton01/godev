/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define([
	"orion/editor/eventTarget",
	"orion/editor/keyModes",
	"orion/editor/textModel",
	"orion/editor/annotations",
	"orion/editor/mirror"
], function(mEventTarget, mKeyModes, mTextModel) {

	function clone(obj) {
		/*Note that this code only works because of the limited types used in TextViewOptions */
		if (obj instanceof Array) {
			return obj.slice(0);
		}
		return obj;
	}

	var EventTarget = mEventTarget.EventTarget;

	function Selection (start, end, caret) {
		this.start = start;
		this.end = end;
		this.caret = caret; //true if the start, false if the caret is at end
	}
	Selection.prototype = {
		clone: function() {
			return new Selection(this.start, this.end, this.caret);
		},
		collapse: function() {
			if (this.caret) {
				this.end = this.start;
			} else {
				this.start = this.end;
			}
		},
		extend: function (offset) {
			if (this.caret) {
				this.start = offset;
			} else {
				this.end = offset;
			}
			if (this.start > this.end) {
				var tmp = this.start;
				this.start = this.end;
				this.end = tmp;
				this.caret = !this.caret;
			}
		},
		setCaret: function(offset) {
			this.start = offset;
			this.end = offset;
			this.caret = false;
		},
		getCaret: function() {
			return this.caret ? this.start : this.end;
		},
		toString: function() {
			return "start=" + this.start + " end=" + this.end + (this.caret ? " caret is at start" : " caret is at end");
		},
		isEmpty: function() {
			return this.start === this.end;
		},
		equals: function(object) {
			return this.caret === object.caret && this.start === object.start && this.end === object.end;
		}
	};

	/**
	 * @private
	 * @name orion.test.editor.MockTextView
	 * @class Mock {@link orion.editor.TextView} that does not depend on the DOM.
	 * @description Fake version of {@link orion.editor.TextView} for testing stylers in headless (no DOM) scenarios.
	 * Dispatches these event types: Changing, Changed, LineStyle, Verify
	 */
	function MockTextView(options) {
		this._init(options);
	}
	MockTextView.prototype = /** @lends orion.test.editor.MockTextView.prototype */ {
		_init: function(options) {
			options = options || {};
			options.model = options.model || new mTextModel.TextModel();
			var defaultOptions = this._defaultOptions();
			for (var option in defaultOptions) {
				if (defaultOptions.hasOwnProperty(option)) {
					var value;
					if (options[option] !== undefined) {
						value = options[option];
					} else {
						value = defaultOptions[option].value;
					}
					this["_" + option] = value; //$NON-NLS-0$
				}
			}
			this.lineStyles = [];
			this._timer = null;
			this._keyModes = [];

			this._selection = new Selection(0, 0, false);
			this._hookEvents();
			this._createActions();
			this._updatePage();
		},
		addKeyMode: function(mode, index) {
			var keyModes = this._keyModes;
			if (index !== undefined) {
				keyModes.splice(index, 0, mode);
			} else {
				keyModes.push(mode);
			}
			//TODO: API needed for this
			if (mode._modeAdded) {
				mode._modeAdded();
			}
		},
		_createActions: function() {
			this.addKeyMode(new mKeyModes.DefaultKeyMode(this));

			this._actions = {
				// TODO predefined actions
			};
		},
		destroy: function() {
			this._unhookEvents();
			if (this._timer) {
				clearTimeout(this._timer);
			}
			this._timer = null;
			this._model = null;
			this.lineStyles = null;
		},
		/**
		 * Method for testing line style.
		 * @returns {Object} The output argument from onLineStyle for the given line, or <code>null</code>. When an object is
		 * returned, it will have one of the following properties:
		 * <dl>
		 * <dt><code>ranges</code></dt><dd>{@link orion.editor.StyleRange[]}</dd>
		 * <dt><code>style</code></dt><dd>{@link orion.editor.Style}</dd>
		 * </dl>
		 */
		_getLineStyle: function(lineIndex) {
			return this.lineStyles[lineIndex];
		},
		getModel: function() {
			return this._model;
		},
		setModel: function(model) {
			if (!model || model === this._model) { return; }
			this._unhookEvents();
			var oldLineCount = this._model.getLineCount();
			var oldCharCount = this._model.getCharCount();
			var newLineCount = model.getLineCount();
			var newCharCount = model.getCharCount();
			var newText = model.getText();
			var e = {
				type: "ModelChanging",
				text: newText,
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanging(e);
			this._model = model;
			e = {
				type: "ModelChanged",
				start: 0,
				removedCharCount: oldCharCount,
				addedCharCount: newCharCount,
				removedLineCount: oldLineCount,
				addedLineCount: newLineCount
			};
			this.onModelChanged(e);
			this._hookEvents();
			this._reset();
			this._updatePage();
		},
		_defaultOptions: function() {
			return {
				parent: {value: undefined},
				model: {value: undefined},
				scrollAnimation: {value: 0},
				readonly: {value: false},
				fullSelection: {value: true},
				tabMode: { value: true },
				tabSize: {value: 8 },
				expandTab: {value: false },
				wrapMode: {value: false },
				themeClass: {value: undefined }
			};
		},
		getOptions: function() {
			var options;
			if (arguments.length === 0) {
				options = this._defaultOptions();
			} else if (arguments.length === 1) {
				var arg = arguments[0];
				if (typeof arg === "string") { //$NON-NLS-0$
					return clone(this["_" + arg]); //$NON-NLS-0$
				}
				options = arg;
			} else {
				options = {};
				for (var index in arguments) {
					if (arguments.hasOwnProperty(index)) {
						options[arguments[index]] = undefined;
					}
				}
			}
			for (var option in options) {
				if (options.hasOwnProperty(option)) {
					options[option] = clone(this["_" + option]); //$NON-NLS-0$
				}
			}
			return options;
		},
		getSelection: function () {
			var s = this._getSelection();
			return {start: s.start, end: s.end};
		},
		getText: function(start, end) {
			return this._model.getText(start, end);
		},
		setText: function(text, start, end) {
			var reset = start === undefined && end === undefined;
			if (start === undefined) { start = 0; }
			if (end === undefined) { end = this._model.getCharCount(); }
			this._modifyContent({text: text, start: start, end: end, _code: true}, !reset);
		},
		onLineStyle: function(lineStyleEvent) {
			return this.dispatchEvent(lineStyleEvent);
		},
		onModelChanging: function(modelChangingEvent) {
			return this.dispatchEvent(modelChangingEvent);
		},
		onModelChanged: function(modelChangedEvent) {
			return this.dispatchEvent(modelChangedEvent);
		},
		onModify: function(modifyEvent) {
			return this.dispatchEvent(modifyEvent);
		},
		onSelection: function(selectionEvent) {
			return this.dispatchEvent(selectionEvent);
		},
		onVerify: function(verifyEvent) {
			return this.dispatchEvent(verifyEvent);
		},
		redrawLines: function(startLine, endLine) {
			startLine = typeof startLine === "undefined" ? 0 : startLine;
			endLine = typeof endLine === "undefined" ? this._model.getLineCount() : endLine;
			if (startLine === endLine) { return; }
			this._queueUpdatePage(startLine, endLine);
		},
		redrawRange: function(start, end) {
			var model = this._model;
			start = typeof start === "undefined" ? 0 : start;
			end = typeof end === "undefined" ? 0 : end;
			var startLine = model.getLineAtOffset(start);
			var endLine = model.getLineAtOffset(Math.max(start, end - 1)) + 1;
			this.redrawLines(startLine, endLine);
		},
		_hookEvents: function() {
			var self = this;
			this._modelListener = {
				/** @private */
				onChanging: function(modelChangingEvent) {
					self._onModelChanging(modelChangingEvent);
				},
				/** @private */
				onChanged: function(modelChangedEvent) {
					self._onModelChanged(modelChangedEvent);
				}
			};
			this._model.addEventListener("Changing", this._modelListener.onChanging);
			this._model.addEventListener("Changed", this._modelListener.onChanged);
		},
		_unhookEvents: function() {
			this._model.removeEventListener("Changing", this._modelListener.onChanging);
			this._model.removeEventListener("Changed", this._modelListener.onChanged);
		},
		_modifyContent: function(e, updateCaret) {
			e.type = "Verify";
			this.onVerify(e);
			if (e.text === null || e.text === undefined) { return; }
			var model = this._model;
			model.setText (e.text, e.start, e.end);

			if (updateCaret) {
				var selection = this._getSelection ();
				selection.setCaret(e.start + e.text.length);
				this._setSelection(selection, true);
			}
			this.onModify({type: "Modify"});
		},
		_onModelChanging: function(modelChangingEvent) {
			modelChangingEvent.type = "ModelChanging";
			this.onModelChanging(modelChangingEvent);
			modelChangingEvent.type = "Changing";
		},
		_onModelChanged: function(modelChangedEvent) {
			modelChangedEvent.type = "ModelChanged";
			this.onModelChanged(modelChangedEvent);
			modelChangedEvent.type = "Changed";
			var start = modelChangedEvent.start;
			var addedCharCount = modelChangedEvent.addedCharCount;
			var removedCharCount = modelChangedEvent.removedCharCount;
			var addedLineCount = modelChangedEvent.addedLineCount;
			var removedLineCount = modelChangedEvent.removedLineCount;
			var selection = this._getSelection();
			if (selection.end > start) {
				if (selection.end > start && selection.start < start + removedCharCount) {
					// selection intersects replaced text. set caret behind text change
					selection.setCaret(start + addedCharCount);
				} else {
					// move selection to keep same text selected
					selection.start +=  addedCharCount - removedCharCount;
					selection.end +=  addedCharCount - removedCharCount;
				}
				this._setSelection(selection, false, false);
			}

			var model = this._model;
			var startLine = model.getLineAtOffset(start);
			if (addedLineCount || removedLineCount) {
				Array.prototype.splice.apply(this.lineStyles, [startLine + 1, removedLineCount].concat(new Array(addedLineCount)));
			}
			// Since we don't have a real viewport we pretend that the topIndex of the view is always the start of the changed region.
			this._updatePage(startLine);
		},
		_queueUpdatePage: function(topIndex) {
			var self = this;
			if (this._timer !== null) { return; }
			this._timer = setTimeout(function() {
				self._timer = null;
				self._updatePage(topIndex);
			}, 0);
		},
		/**
		 * @param {Number} topIndex Value to use as the topmost visible line in the view.
		 */
		_updatePage: function(topIndex) {
			topIndex = typeof topIndex === "undefined" ? 0 : topIndex;
			var model = this._model;
			var lineCount = model.getLineCount();
			var linesPerPage = 15;
			var lineStart = Math.max(0, topIndex - 1);
			var bottomIndex = Math.min(topIndex + linesPerPage, lineCount - 1);
			var lineEnd = Math.min(bottomIndex + 1, lineCount - 1);
			this._styleLines(lineStart, lineEnd);
		},
		_styleLines: function(startLine, endLine) {
			// Mimic TextView's heuristic of compressing adjacent ranges with same class into a single range.
			function optimize(ranges) {
				var result = [];
				for (var i=0; i < ranges.length; i++) {
					var start = ranges[i];
					var prev = start;
					var next = ranges[i + 1];
					while (next && prev.end === next.start && prev.style.styleClass === next.style.styleClass) {
						prev = next;
						next = ranges[++i];
					}
					result.push({
						start: start.start,
						end: prev.end,
						style: start.style
					});
				}
				return result;
			}
			var model = this._model;
			for (var lineIndex=startLine; lineIndex <= endLine; lineIndex++) {
				var lineText = model.getLine(lineIndex);
				var lineStart = model.getLineStart(lineIndex);
				var e = {type:"LineStyle", textView: this, lineIndex: lineIndex, lineText: lineText, lineStart: lineStart};
				this.onLineStyle(e);
				if (e.style) {
					this.lineStyles[lineIndex] = {style: e.style};
				} else if (e.ranges) {
					this.lineStyles[lineIndex] = {ranges: optimize(e.ranges)};
				} else {
					this.lineStyles[lineIndex] = null;
				}
			}
		},
		_reset: function() {
			this.lineStyles = new Array(this._model.getLineCount());
		},
		setAction: function(actionID, handler, actionDescription) {
			if (!actionID) { return; }
			var actions = this._actions;
			var action = actions[actionID];
			if (!action) {
				action = actions[actionID] = {};
			}
			action.handler = handler;
			if (actionDescription !== undefined) {
				action.actionDescription = actionDescription;
			}
		},
		invokeAction: function (actionID, defaultAction, actionOptions) {
			if (!this._clientDiv) { return; }
			var action = this._actions[actionID];
			if (action) {
				if (!defaultAction && action.handler) {
					if (action.handler(actionOptions)) {
						return true;
					}
				}
				if (action.defaultHandler) {
					return typeof action.defaultHandler(actionOptions) === "boolean"; //$NON-NLS-0$
				}
			}
			return false;
		},
		setKeyBinding: function(keyBinding, actionID) {
			this._keyModes[0].setKeyBinding(keyBinding, actionID);
		},
		getCaretOffset: function () {
			var s = this._getSelection();
			return s.getCaret();
		},
		setCaretOffset: function(offset, show) {
			var charCount = this._model.getCharCount();
			offset = Math.max(0, Math.min (offset, charCount));
			var selection = new Selection(offset, offset, false);
			this._setSelection (selection, show === undefined || show);
		},
		getKeyModes: function() {
			return this._keyModes.slice(0);
		},
		_getSelection: function () {
			return this._selection.clone();
		},
		_setSelection: function (selection, scroll, update, pageScroll) {
			if (selection) {
				if (update === undefined) { update = true; }
				var oldSelection = this._selection;
				if (!oldSelection.equals(selection)) {
					this._selection = selection;
					var e = {
						type: "Selection",
						oldValue: {start:oldSelection.start, end:oldSelection.end},
						newValue: {start:selection.start, end:selection.end}
					};
					this.onSelection(e);
				}
				/*
				* Always showCaret(), even when the selection is not changing, to ensure the
				* caret is visible. Note that some views do not scroll to show the caret during
				* keyboard navigation when the selection does not chanage. For example, line down
				* when the caret is already at the last line.
				*/
				if (scroll) { update = !this._showCaret(false, pageScroll); } // TODO
			}
		},
		_showCaret: function (allSelection, pageScroll) {
			// We have no viewport, so ignore this
		},
		/**
		 * Pretend that the given key binding was pressed.
		 */
		invokeKeyBinding: function() {
		},
		/************************************ Actions ******************************************/
		_handleKeyPress: function (e) {
			var key = (e.charCode !== undefined ? e.charCode : e.keyCode);
			if (key > 31) {
				this._doContent(String.fromCharCode (key));
				if (e.preventDefault) { e.preventDefault(); }
				return false;
			}
		},
		_doContent: function (text) {
			var selection = this._getSelection();
			this._modifyContent({text: text, start: selection.start, end: selection.end, _ignoreDOMSelection: true}, true);
		},
		/* copied verbatim from textView.js */
		_getLineHeight: function(lineIndex, calculate) {
			if (lineIndex !== undefined && this._lineHeight) {
				var lineHeight = this._lineHeight[lineIndex];
				if (lineHeight) { return lineHeight; }
				if (calculate || calculate === undefined) {
					var height = this._lineHeight[lineIndex] = this._calculateLineHeight(lineIndex);
					return height;
				}
			}
			return this._metrics.lineHeight;
		},
		/* copied verbatim from textView.js */
		getLineHeight: function(lineIndex) {
			if (!this._clientDiv) { return 0; }
			return this._getLineHeight(lineIndex);
		},
		/* copied verbatim from textView.js */
		getLocationAtOffset: function(offset) {
			if (!this._clientDiv) { return {x: 0, y: 0}; }
			var model = this._model;
			offset = Math.min(Math.max(0, offset), model.getCharCount());
			var lineIndex = model.getLineAtOffset(offset);
			var line = this._getLine(lineIndex);
			var rect = line.getBoundingClientRect(offset);
			line.destroy();
			var x = rect.left;
			var y = this._getLinePixel(lineIndex) + rect.top;
			return {x: x, y: y};
		},
		/* copied verbatim from textView.js */
		convert: function(rect, from, to) {
			if (!this._clientDiv) { return; }
			var scroll = this._getScroll();
			var viewPad = this._getViewPadding();
			var viewRect = this._viewDiv.getBoundingClientRect();
			if (from === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += - scroll.x + viewRect.left + viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += - scroll.y + viewRect.top + viewPad.top;
				}
			}
			//At this point rect is in the widget coordinate space
			if (to === "document") { //$NON-NLS-0$
				if (rect.x !== undefined) {
					rect.x += scroll.x - viewRect.left - viewPad.left;
				}
				if (rect.y !== undefined) {
					rect.y += scroll.y - viewRect.top - viewPad.top;
				}
			}
			return rect;
		}
	};
	EventTarget.addMixin(MockTextView.prototype);

	return {
		MockTextView: MockTextView
	};
});