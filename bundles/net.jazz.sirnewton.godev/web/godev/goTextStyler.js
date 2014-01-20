/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors: IBM Corporation - initial API and implementation
 *               Alex Lakatos - fix for bug#369781
 ******************************************************************************/

/*global define */

// TODO Rewrite this to either reduce it to just the bracket matching or make it the full scanner for golang

define("godev/goTextStyler", [ //$NON-NLS-0$
	'orion/editor/annotations', //$NON-NLS-0$
	'orion/editor/keywords' //$NON-NLS-0$
], function(mAnnotations, mKeywords) {
	// Scanner constants
	var UNKOWN = 1;
	var STRING = 4;
	var MULTILINE_STRING = 5;
	var SINGLELINE_COMMENT = 6;
	var MULTILINE_COMMENT = 7;

	var BRACKETS = "{}()[]"; //$NON-NLS-0$
	
	// Styles
	var singleCommentStyle = {styleClass: "token_singleline_comment"}; //$NON-NLS-0$
	var multiCommentStyle = {styleClass: "token_multiline_comment"}; //$NON-NLS-0$

	function Scanner () {
		this.setText("");
	}

	Scanner.prototype = {
		getOffset: function() {
			return this.offset;
		},
		getStartOffset: function() {
			return this.startOffset;
		},
		getData: function() {
			return this.text.substring(this.startOffset, this.offset);
		},
		getDataLength: function() {
			return this.offset - this.startOffset;
		},
		_default: function(c) {
			switch (c) {
				case 123: // {
				case 125: // }
				case 40: // (
				case 41: // )
				case 91: // [
				case 93: // ]
					// BRACKETS
					return c;
				default:
					return UNKOWN;
			}
		},
		_read: function() {
			if (this.offset < this.text.length) {
				return this.text.charCodeAt(this.offset++);
			}
			return -1;
		},
		_unread: function(c) {
			if (c !== -1) { this.offset--; }
		},
		nextToken: function() {
			this.startOffset = this.offset;
			while (true) {
				var c = this._read(), result;
				switch (c) {
					case -1: return null;
					case 47:	// SLASH -> comment
						c = this._read();
						if (c === 47) { // SLASH -> single line
							while (true) {
								c = this._read();
								if ((c === -1) || (c === 10) || (c === 13)) {
									this._unread(c);
									return SINGLELINE_COMMENT;
								}
							}
						}
						if (c === 42) { // STAR -> multi line
							c = this._read();
							var token = MULTILINE_COMMENT;
							while (true) {
								while (c === 42) {
									c = this._read();
									if (c === 47) {
										return token;
									}
								}
								if (c === -1) {
									this._unread(c);
									return token;
								}
								c = this._read();
							}
						}
						this._unread(c);
						return UNKOWN;
					case 96:	// BACKTICK -> multi-line string
						result = MULTILINE_STRING;
						break;
					case 34:	// DOUBLE QUOTE -> string
						result = STRING;
						while(true) {
							c = this._read();
							switch (c) {
								case 34: // DOUBLE QUOTE
									return result;
								case 13:
								case 10:
								case -1:
									this._unread(c);
									return result;
							}
						}
						break;
					default:
						return this._default(c);
				}
			}
		},
		setText: function(text) {
			this.text = text;
			this.offset = 0;
			this.startOffset = 0;
		}
	};

	function CommentScanner (whitespacesVisible) {
		Scanner.call(this, null, whitespacesVisible);
	}
	CommentScanner.prototype = new Scanner(null);
	CommentScanner.prototype.setType = function(type) {
		this._type = type;
	};
	CommentScanner.prototype.nextToken = function() {
		this.startOffset = this.offset;
		while (true) {
			var c = this._read();
			switch (c) {
				case -1: return null;
				default:
					do {
						c = this._read();
					} while(!(c === 32 || c === 9 || c === -1 || c === 60 || c === 64 || c === 84));
					this._unread(c);
					return UNKOWN;
			}
		}
	};

	function FirstScanner () {
		Scanner.call(this, null, false);
	}
	FirstScanner.prototype = new Scanner(null);
	FirstScanner.prototype._default = function(c) {
		while(true) {
			c = this._read();
			switch (c) {
				case 47: // SLASH
				case 34: // DOUBLE QUOTE
				case 39: // SINGLE QUOTE
				case -1:
					this._unread(c);
					return UNKOWN;
			}
		}
	};

	function GoTextStyler (view, annotationModel, substyler) {
		this.commentStart = "/*"; //$NON-NLS-0$
		this.commentEnd = "*/"; //$NON-NLS-0$
		this.detectHyperlinks = true;
		this.highlightCaretLine = false;
		this._scanner = new Scanner();
		this._firstScanner = new FirstScanner();
		this._commentScanner = new CommentScanner();
		this.view = view;
		this.annotationModel = annotationModel;
		this._bracketAnnotations = undefined;
		this.substyler = substyler;

		var self = this;
		this._listener = {
			onChanged: function(e) {
				self._onModelChanged(e);
			},
			onDestroy: function(e) {
				self._onDestroy(e);
			},
			onLineStyle: function(e) {
				self._onLineStyle(e);
			},
			onMouseDown: function(e) {
				self._onMouseDown(e);
			},
			onSelection: function(e) {
				self._onSelection(e);
			}
		};
		var model = view.getModel();
		if (model.getBaseModel) {
			model = model.getBaseModel();
		}
		model.addEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
		view.addEventListener("MouseDown", this._listener.onMouseDown); //$NON-NLS-0$
		view.addEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
		view.addEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
		view.addEventListener("LineStyle", this._listener.onLineStyle); //$NON-NLS-0$
		this._computeComments();
	}

	GoTextStyler.prototype = {
		destroy: function() {
			var view = this.view;
			if (view) {
				var model = view.getModel();
				if (model.getBaseModel) {
					model = model.getBaseModel();
				}
				model.removeEventListener("Changed", this._listener.onChanged); //$NON-NLS-0$
				view.removeEventListener("MouseDown", this._listener.onMouseDown); //$NON-NLS-0$
				view.removeEventListener("Selection", this._listener.onSelection); //$NON-NLS-0$
				view.removeEventListener("Destroy", this._listener.onDestroy); //$NON-NLS-0$
				view.removeEventListener("LineStyle", this._listener.onLineStyle); //$NON-NLS-0$
				
				if (this.substyler) {
					this.substyler.destroy();
				}
				
				this.view = null;
				this.substyler = null;
			}
		},
		setHighlightCaretLine: function(highlight) {
			this.highlightCaretLine = highlight;
		},
		setDetectHyperlinks: function(enabled) {
			this.detectHyperlinks = enabled;
		},
		_binarySearch: function (array, offset, inclusive, low, high) {
			var index;
			if (low === undefined) { low = -1; }
			if (high === undefined) { high = array.length; }
			while (high - low > 1) {
				index = Math.floor((high + low) / 2);
				if (offset <= array[index].start) {
					high = index;
				} else if (inclusive && offset < array[index].end) {
					high = index;
					break;
				} else {
					low = index;
				}
			}
			return high;
		},
		_computeComments: function() {
			var model = this.view.getModel();
			if (model.getBaseModel) { model = model.getBaseModel(); }
			this.comments = this._findComments(model.getText());
		},
		_getStyles: function(model, text, start) {
			if (model.getBaseModel) {
				start = model.mapOffset(start);
			}
			var end = start + text.length;

			var styles = [];

			// for any sub range that is not a comment, parse code generating tokens (keywords, numbers, brackets, line comments, etc)
			var offset = start, comments = this.comments;
			var startIndex = this._binarySearch(comments, start, true);
			for (var i = startIndex; i < comments.length; i++) {
				if (comments[i].start >= end) { break; }
				var commentStart = comments[i].start;
				var commentEnd = comments[i].end;
				if (offset < commentStart) {
					this._parse(text.substring(offset - start, commentStart - start), offset, styles);
				}
				var type = comments[i].type, style;
				var s = Math.max(offset, commentStart);
				var e = Math.min(end, commentEnd);
				if ((type === MULTILINE_COMMENT) && (this.detectHyperlinks)) {
					this._parseComment(text.substring(s - start, e - start), s, styles, style, type);
				} else if (type === MULTILINE_STRING) {
					//this._parseString(text.substring(s - start, e - start), s, styles);
				} else {
					//styles.push({start: s, end: e, style: style});
				}
				offset = commentEnd;
			}
			if (offset < end) {
				this._parse(text.substring(offset - start, end - start), offset, styles);
			}
			if (model.getBaseModel) {
				for (var j = 0; j < styles.length; j++) {
					var length = styles[j].end - styles[j].start;
					styles[j].start = model.mapOffset(styles[j].start, true);
					styles[j].end = styles[j].start + length;
				}
			}
			return styles;
		},
		_parse: function(text, offset, styles) {
			var scanner = this._scanner;
			scanner.setText(text);
			var token;
			while ((token = scanner.nextToken())) {
				var tokenStart = scanner.getStartOffset() + offset;
				var style = null;
				switch (token) {
					case MULTILINE_STRING:
					case STRING:
						//this._parseString(scanner.getData(), tokenStart, styles, stringStyle);
						continue;
					case SINGLELINE_COMMENT:
						this._parseComment(scanner.getData(), tokenStart, styles, singleCommentStyle, token);
						continue;
					case MULTILINE_COMMENT:
						this._parseComment(scanner.getData(), tokenStart, styles, multiCommentStyle, token);
						continue;
				}
				//styles.push({start: tokenStart, end: scanner.getOffset() + offset, style: style});
			}
		},
		_parseComment: function(text, offset, styles, s, type) {
			// FIXME The parsing of comments and detecting hyperlinks breaks the regex grammar
			//  at the moment. This could/should be fixed in the future.
			return;
			
			var scanner = this._commentScanner;
			scanner.setText(text);
			scanner.setType(type);
			var token;
			var style = null;
			var tokenStart = null;
			while ((token = scanner.nextToken())) {
				tokenStart = scanner.getStartOffset() + offset;
				style = null;
				if (this.detectHyperlinks) {
					style = this._detectHyperlinks(scanner.getData(), tokenStart, styles, s);
				}
				if (style) {
					styles.push({start: tokenStart, end: scanner.getOffset() + offset, style: style});
				}
			}
		},
		_detectHyperlinks: function(text, offset, styles, s) {
			var href = null, index, linkStyle;
			if ((index = text.indexOf("://")) > 0) { //$NON-NLS-0$
				href = text;
				var start = index;
				while (start > 0) {
					var c = href.charCodeAt(start - 1);
					if (!((97 <= c && c <= 122) || (65 <= c && c <= 90) || 0x2d === c || (48 <= c && c <= 57))) { //LETTER OR DASH OR NUMBER
						break;
					}
					start--;
				}
				if (start > 0) {
					var brackets = "\"\"''(){}[]<>"; //$NON-NLS-0$
					index = brackets.indexOf(href.substring(start - 1, start));
					if (index !== -1 && (index & 1) === 0 && (index = href.lastIndexOf(brackets.substring(index + 1, index + 2))) !== -1) {
						var end = index;
						linkStyle = this._clone(s);
						linkStyle.tagName = "a"; //$NON-NLS-0$
						linkStyle.attributes = {href: href.substring(start, end)};
						styles.push({start: offset, end: offset + start, style: s});
						styles.push({start: offset + start, end: offset + end, style: linkStyle});
						styles.push({start: offset + end, end: offset + text.length, style: s});
						return null;
					}
				}
			}
			
			if (href) {
				linkStyle = this._clone(s);
				linkStyle.tagName = "a"; //$NON-NLS-0$
				linkStyle.attributes = {href: href};
				return linkStyle;
			}
			return s;
		},
		_clone: function(obj) {
			if (!obj) { return obj; }
			var newObj = {};
			for (var p in obj) {
				if (obj.hasOwnProperty(p)) {
					var value = obj[p];
					newObj[p] = value;
				}
			}
			return newObj;
		},
		_findComments: function(text, offset) {
			offset = offset || 0;
			var scanner = this._firstScanner, token;
			scanner.setText(text);
			var result = [];
			while ((token = scanner.nextToken())) {
				if (token === MULTILINE_COMMENT || token === MULTILINE_STRING) {
					result.push({
						start: scanner.getStartOffset() + offset,
						end: scanner.getOffset() + offset,
						type: token
					});
				}
			}
			return result;
		},
		_findMatchingBracket: function(model, offset) {
			var brackets = BRACKETS;
			var bracket = model.getText(offset, offset + 1);
			var bracketIndex = brackets.indexOf(bracket, 0);
			if (bracketIndex === -1) { return -1; }
			var closingBracket;
			if (bracketIndex & 1) {
				closingBracket = brackets.substring(bracketIndex - 1, bracketIndex);
			} else {
				closingBracket = brackets.substring(bracketIndex + 1, bracketIndex + 2);
			}
			var lineIndex = model.getLineAtOffset(offset);
			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var lineEnd = model.getLineEnd(lineIndex);
			brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
			for (var i=0; i<brackets.length; i++) {
				var sign = brackets[i] >= 0 ? 1 : -1;
				if (brackets[i] * sign - 1 === offset) {
					var level = 1;
					if (bracketIndex & 1) {
						i--;
						for (; i>=0; i--) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign - 1;
							}
						}
						lineIndex -= 1;
						while (lineIndex >= 0) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
							for (var j=brackets.length - 1; j>=0; j--) {
								sign = brackets[j] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[j] * sign - 1;
								}
							}
							lineIndex--;
						}
					} else {
						i++;
						for (; i<brackets.length; i++) {
							sign = brackets[i] >= 0 ? 1 : -1;
							level += sign;
							if (level === 0) {
								return brackets[i] * sign - 1;
							}
						}
						lineIndex += 1;
						var lineCount = model.getLineCount ();
						while (lineIndex < lineCount) {
							lineText = model.getLine(lineIndex);
							lineStart = model.getLineStart(lineIndex);
							lineEnd = model.getLineEnd(lineIndex);
							brackets = this._findBrackets(bracket, closingBracket, lineText, lineStart, lineStart, lineEnd);
							for (var k=0; k<brackets.length; k++) {
								sign = brackets[k] >= 0 ? 1 : -1;
								level += sign;
								if (level === 0) {
									return brackets[k] * sign - 1;
								}
							}
							lineIndex++;
						}
					}
					break;
				}
			}
			return -1;
		},
		_findBrackets: function(bracket, closingBracket, text, textOffset, start, end) {
			var result = [];
			var bracketToken = bracket.charCodeAt(0);
			var closingBracketToken = closingBracket.charCodeAt(0);
			// for any sub range that is not a comment, parse code generating tokens (keywords, numbers, brackets, line comments, etc)
			var offset = start, scanner = this._scanner, token, comments = this.comments;
			var startIndex = this._binarySearch(comments, start, true);
			for (var i = startIndex; i < comments.length; i++) {
				if (comments[i].start >= end) { break; }
				var commentStart = comments[i].start;
				var commentEnd = comments[i].end;
				if (offset < commentStart) {
					scanner.setText(text.substring(offset - start, commentStart - start));
					while ((token = scanner.nextToken())) {
						if (token === bracketToken) {
							result.push(scanner.getStartOffset() + offset - start + textOffset + 1);
						} else if (token === closingBracketToken) {
							result.push(-(scanner.getStartOffset() + offset - start + textOffset + 1));
						}
					}
				}
				offset = commentEnd;
			}
			if (offset < end) {
				scanner.setText(text.substring(offset - start, end - start));
				while ((token = scanner.nextToken())) {
					if (token === bracketToken) {
						result.push(scanner.getStartOffset() + offset - start + textOffset + 1);
					} else if (token === closingBracketToken) {
						result.push(-(scanner.getStartOffset() + offset - start + textOffset + 1));
					}
				}
			}
			return result;
		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onLineStyle: function (e) {
			var newStyles = this._getStyles(e.textView.getModel(), e.lineText, e.lineStart);
			
			if (!e.ranges) {
				e.ranges = [];
			}
			
			for (var idx = 0; idx < e.ranges.length; idx++) {
				newStyles.push(e.ranges[idx]);
			}
			
			e.ranges = newStyles;
		},
		_onSelection: function(e) {
			var oldSelection = e.oldValue;
			var newSelection = e.newValue;
			var view = this.view;
			var model = view.getModel();
			var lineIndex;
			if (this.highlightCaretLine) {
				var oldLineIndex = model.getLineAtOffset(oldSelection.start);
				lineIndex = model.getLineAtOffset(newSelection.start);
				var newEmpty = newSelection.start === newSelection.end;
				var oldEmpty = oldSelection.start === oldSelection.end;
				if (!(oldLineIndex === lineIndex && oldEmpty && newEmpty)) {
					if (oldEmpty) {
						view.redrawLines(oldLineIndex, oldLineIndex + 1);
					}
					if ((oldLineIndex !== lineIndex || !oldEmpty) && newEmpty) {
						view.redrawLines(lineIndex, lineIndex + 1);
					}
				}
			}
			if (!this.annotationModel) { return; }
			var remove = this._bracketAnnotations, add, caret;
			if (newSelection.start === newSelection.end && (caret = view.getCaretOffset()) > 0) {
				var mapCaret = caret - 1;
				if (model.getBaseModel) {
					mapCaret = model.mapOffset(mapCaret);
					model = model.getBaseModel();
				}
				var bracket = this._findMatchingBracket(model, mapCaret);
				if (bracket !== -1) {
					add = [
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_MATCHING_BRACKET, bracket, bracket + 1),
						mAnnotations.AnnotationType.createAnnotation(mAnnotations.AnnotationType.ANNOTATION_CURRENT_BRACKET, mapCaret, mapCaret + 1)
					];
				}
			}
			this._bracketAnnotations = add;
			this.annotationModel.replaceAnnotations(remove, add);
		},
		_onMouseDown: function(e) {
			if (e.clickCount !== 2) { return; }
			var view = this.view;
			var model = view.getModel();
			var offset = view.getOffsetAtLocation(e.x, e.y);
			if (offset > 0) {
				var mapOffset = offset - 1;
				var baseModel = model;
				if (model.getBaseModel) {
					mapOffset = model.mapOffset(mapOffset);
					baseModel = model.getBaseModel();
				}
				var bracket = this._findMatchingBracket(baseModel, mapOffset);
				if (bracket !== -1) {
					e.preventDefault();
					var mapBracket = bracket;
					if (model.getBaseModel) {
						mapBracket = model.mapOffset(mapBracket, true);
					}
					if (offset > mapBracket) {
						offset--;
						mapBracket++;
					}
					view.setSelection(mapBracket, offset);
				}
			}
		},
		_onModelChanged: function(e) {
			var start = e.start;
			var removedCharCount = e.removedCharCount;
			var addedCharCount = e.addedCharCount;
			var changeCount = addedCharCount - removedCharCount;
			var view = this.view;
			var viewModel = view.getModel();
			var baseModel = viewModel.getBaseModel ? viewModel.getBaseModel() : viewModel;
			var end = start + removedCharCount;
			var charCount = baseModel.getCharCount();
			var commentCount = this.comments.length;
			var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
			var commentStart = this._binarySearch(this.comments, lineStart, true);
			var commentEnd = this._binarySearch(this.comments, end, false, commentStart - 1, commentCount);

			var ts;
			if (commentStart < commentCount && this.comments[commentStart].start <= lineStart && lineStart < this.comments[commentStart].end) {
				ts = this.comments[commentStart].start;
				if (ts > start) { ts += changeCount; }
			} else {
				if (commentStart === commentCount && commentCount > 0 && charCount - changeCount === this.comments[commentCount - 1].end) {
					ts = this.comments[commentCount - 1].start;
				} else {
					ts = lineStart;
				}
			}
			var te;
			if (commentEnd < commentCount) {
				te = this.comments[commentEnd].end;
				if (te > start) { te += changeCount; }
				commentEnd += 1;
			} else {
				commentEnd = commentCount;
				te = charCount;//TODO could it be smaller?
			}
			var text = baseModel.getText(ts, te), comment;
			var newComments = this._findComments(text, ts), i;
			for (i = commentStart; i < this.comments.length; i++) {
				comment = this.comments[i];
				if (comment.start > start) { comment.start += changeCount; }
				if (comment.start > start) { comment.end += changeCount; }
			}
			var redraw = (commentEnd - commentStart) !== newComments.length;
			if (!redraw) {
				for (i=0; i<newComments.length; i++) {
					comment = this.comments[commentStart + i];
					var newComment = newComments[i];
					if (comment.start !== newComment.start || comment.end !== newComment.end || comment.type !== newComment.type) {
						redraw = true;
						break;
					}
				}
			}
			var args = [commentStart, commentEnd - commentStart].concat(newComments);
			Array.prototype.splice.apply(this.comments, args);
			if (redraw) {
				var redrawStart = ts;
				var redrawEnd = te;
				if (viewModel !== baseModel) {
					redrawStart = viewModel.mapOffset(redrawStart, true);
					redrawEnd = viewModel.mapOffset(redrawEnd, true);
				}
				view.redrawRange(redrawStart, redrawEnd);
			}
		}
	};

	return {GoTextStyler: GoTextStyler};
});
