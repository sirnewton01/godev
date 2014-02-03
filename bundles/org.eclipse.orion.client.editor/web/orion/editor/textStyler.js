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

define("orion/editor/textStyler", [ //$NON-NLS-0$
	'orion/editor/annotations' //$NON-NLS-0$
], function(mAnnotations) {

	/*
	 * Throughout textStyler "block" refers to a potentially multi-line token (ie.- a pattern
	 * defined in the service with begin/end expressions rather than a single match expression).
	 * Typical examples are multi-line comments and multi-line strings.
	 */

	// Styles
	var caretLineStyle = {styleClass: "line_caret"}; //$NON-NLS-0$

	var PUNCTUATION_SECTION_BEGIN = ".begin"; //$NON-NLS-0$
	var PUNCTUATION_SECTION_END = ".end"; //$NON-NLS-0$

	var CR = "\r"; //$NON-NLS-0$
	var NEWLINE = "\n"; //$NON-NLS-0$

	var eolRegex = /$/;
	var captureReferenceRegex = /\\(\d)/g;
	var linebreakRegex = /(.*)(?:[\r\n]|$)/g;
	var spacePattern = {regex: / /g, style: {styleClass: "punctuation separator space", unmergeable: true}}; //$NON-NLS-0$
	var tabPattern = {regex: /\t/g, style: {styleClass: "punctuation separator tab", unmergeable: true}}; //$NON-NLS-0$

	var _findMatch = function(regex, text, startIndex, testBeforeMatch) {
		/*
		 * testBeforeMatch provides a potential optimization for callers that do not strongly expect to find
		 * a match.  If this argument is defined then test() is initially called on the regex, which executes
		 * significantly faster than exec().  If a match is found then the regex's lastIndex is reverted to
		 * its pre-test() value, and exec() is then invoked on it in order to get the match details.
		 */

		var index = startIndex;
		var initialLastIndex = regex.lastIndex;
		linebreakRegex.lastIndex = startIndex;

		var currentLine = linebreakRegex.exec(text);
		/*
		 * Processing of the first line is treated specially, as it may not start at the beginning of a logical line, but
		 * regex's may be dependent on matching '^'.  To resolve this, compute the full line corresponding to the start
		 * of the text, even if it begins prior to startIndex, and adjust the regex's lastIndex accordingly to begin searching
		 * for matches at the correct location.
		 */
		var lineString, indexAdjustment;
		regex.lastIndex = 0;
		if (currentLine) {
			var lineStart = currentLine.index;
			var char = text.charAt(lineStart);
			while (0 <= lineStart && char !== NEWLINE && char !== CR) {
				lineStart--;
				char = text.charAt(lineStart);
			}
			lineString = text.substring(lineStart + 1, currentLine.index + currentLine[1].length);
			regex.lastIndex = indexAdjustment = currentLine.index - lineStart - 1;
		}
		while (currentLine && currentLine.index < text.length) {
			var result;
			if (testBeforeMatch) {
				var revertIndex = regex.lastIndex;
				if (regex.test(lineString)) {
					regex.lastIndex = revertIndex;
					result = regex.exec(lineString);
				}
			} else {
				result = regex.exec(lineString);
			}
			if (result) {
				result.index += index;
				result.index -= indexAdjustment;
				regex.lastIndex = initialLastIndex;
				return result;
			}
			indexAdjustment = 0;
			index += currentLine[0].length;
			currentLine = linebreakRegex.exec(text);
			if (currentLine) {
				lineString = currentLine[1];
				regex.lastIndex = 0;
			}
		}
		regex.lastIndex = initialLastIndex;
		return null;
	};
	var updateMatch = function(match, text, matches, minimumIndex) {
		var regEx = match.pattern.regex ? match.pattern.regex : match.pattern.regexBegin;
		var result = _findMatch(regEx, text, minimumIndex, true);
		if (result) {
			match.result = result;
			for (var i = 0; i < matches.length; i++) {
				if (result.index < matches[i].result.index || (result.index === matches[i].result.index && match.pattern.pattern.index < matches[i].pattern.pattern.index)) {
					matches.splice(i, 0, match);
					return;
				}
			}
			matches.push(match);
		}
	};
	var getCaptureStyles = function(result, captures, offset, styles) {
		var stringIndex = 0;
		for (var i = 1; i < result.length; i++) {
			if (result[i]) {
				var capture = captures[i];
				if (capture) {
					var styleStart = offset + stringIndex;
					styles.push({start: styleStart, end: styleStart + result[i].length, style: capture.name});
				}
				stringIndex += result[i].length;
			}
		}
	};
	var mergeStyles = function(fullStyle, substyles, resultStyles) {
		var i = fullStyle.start;
		substyles.forEach(function(current) {
			if (i <= current.start) {
				resultStyles.push({start: i, end: current.start, style: fullStyle.style});
			}
			resultStyles.push(current);
			i = current.end;
		});
		if (i < fullStyle.end) {
			resultStyles.push({start: i, end: fullStyle.end, style: fullStyle.style});
		}
	};
	var parse = function(text, offset, block, styles, ignoreCaptures) {
		var patterns = block.getLinePatterns();
		if (!patterns) {
			return;
		}

		var matches = [];
		patterns.forEach(function(current) {
			var regex = current.regex || current.regexBegin;
			regex.oldLastIndex = regex.lastIndex;
			regex.lastIndex = 0;
			var result = regex.exec(text);
			if (result) {
				matches.push({result: result, pattern: current});
			}
		});
		matches.sort(function(a,b) {
			if (a.result.index < b.result.index) {
				return -1;
			}
			if (a.result.index > b.result.index) {
				return 1;
			}
			return a.pattern.pattern.index < b.pattern.pattern.index ? -1 : 1;
		});

		var index = 0;
		while (matches.length > 0) {
			var current = matches[0];
			matches.splice(0,1);

			if (current.result.index < index) {
				/* processing of another match has moved index beyond this match */
				updateMatch(current, text, matches, index);
				continue;
			}

			/* apply the style */
			var start = current.result.index;
			var end, result;
			var substyles = [];
			if (current.pattern.regex) {	/* line pattern defined by a "match" */
				result = current.result;
				end = start + result[0].length;
				var tokenStyle = {start: offset + start, end: offset + end, style: current.pattern.pattern.name, isWhitespace: current.pattern.isWhitespace};
				if (!ignoreCaptures) {
					if (current.pattern.pattern.captures) {
						getCaptureStyles(result, current.pattern.pattern.captures, offset + start, substyles);
					}
					substyles.sort(function(a,b) {
						if (a.start < b.start) {
							return -1;
						}
						if (a.start > b.start) {
							return 1;
						}
						return 0;
					});
					for (var j = 0; j < substyles.length - 1; j++) {
						if (substyles[j + 1].start < substyles[j].end) {
							var newStyle = {start: substyles[j + 1].end, end: substyles[j].end, style: substyles[j].style};
							substyles[j].end = substyles[j + 1].start;
							substyles.splice(j + 2, 0, newStyle);
						}
					}
				}
				mergeStyles(tokenStyle, substyles, styles);
			} else {	/* pattern defined by a "begin/end" pair */
				current.pattern.regexEnd.lastIndex = current.result.index + current.result[0].length;
				result = current.pattern.regexEnd.exec(text);
				if (!result) {
					eolRegex.lastIndex = 0;
					result = eolRegex.exec(text);
				}
				end = result.index + result[0].length;
				styles.push({start: offset + start, end: offset + end, style: current.pattern.pattern.name, isWhitespace: current.pattern.isWhitespace});
			}
			index = result.index + result[0].length;
			updateMatch(current, text, matches, index);
		}
		patterns.forEach(function(current) {
			var regex = current.regex || current.regexBegin;
			regex.lastIndex = regex.oldLastIndex;
		});
	};
	var computeTasks = function(offset, block, baseModel, styles) {
		if (!block.detectTasks()) { return; }
		var annotationModel = block.getAnnotationModel();
		if (!annotationModel) { return; }

		var annotationType = mAnnotations.AnnotationType.ANNOTATION_TASK;
		var add = [], remove = [];

		styles.forEach(function(current) {
			var annotations = annotationModel.getAnnotations(current.start, current.end);
			while (annotations.hasNext()) {
				var annotation = annotations.next();
				if (annotation.type === annotationType) {
					remove.push(annotation);
				}
			}

			var subPatterns = current.getLinePatterns();
			if (subPatterns.length && current.pattern.pattern.name && current.pattern.pattern.name.indexOf("comment") === 0) {
				var substyles = [];
				parse(baseModel.getText(current.contentStart, current.end), current.contentStart, current, substyles, true);
				for (var i = 0; i < substyles.length; i++) {
					if (substyles[i].style === "meta.annotation.task.todo") {
						add.push(mAnnotations.AnnotationType.createAnnotation(annotationType, substyles[i].start, substyles[i].end, baseModel.getText(substyles[i].start, substyles[i].end)));
					}
				}
			}
		}.bind(this));
		annotationModel.replaceAnnotations(remove, add);
	};
	var computeBlocks = function(model, text, block, offset) {
		var matches = [];
		block.getBlockPatterns().forEach(function(current) {
			var result = _findMatch(current.regexBegin, text, 0);
			if (result) {
				matches.push({result: result, pattern: current});
			}
		}.bind(this));
		matches.sort(function(a,b) {
			if (a.result.index < b.result.index) {
				return -1;
			}
			if (a.result.index > b.result.index) {
				return 1;
			}
			return a.pattern.pattern.index < b.pattern.pattern.index ? -1 : 1;
		});
		if (!matches.length) {
			return matches;
		}

		var index = 0;
		var results = [];
		while (matches.length > 0) {
			var current = matches[0];
			matches.splice(0,1);

			if (current.result.index < index) {
				/* processing of another match has moved index beyond this match */
				updateMatch(current, text, matches, index);
				continue;
			}

			/* verify that the begin match is valid (eg.- is not within a string, etc.) */
			var lineIndex = model.getLineAtOffset(offset + current.result.index);
			var lineText = model.getLine(lineIndex);
			var styles = [];
			parse(lineText, model.getLineStart(lineIndex), block, styles);
			var start = offset + current.result.index;
			var i = 0;
			for (; i < styles.length; i++) {
				if (styles[i].start === start) {
					/* found it, now determine the end (and ensure that it is valid) */
					var contentStart = current.result.index + current.result[0].length;
					var resultEnd = null;

					/* 
					 * If the end match contains a capture reference (eg.- "\1") then update
					 * its regex with the resolved capture values from the begin match.
					 */
					var endRegex = current.pattern.regexEnd;
					var regexString = endRegex.toString();
					captureReferenceRegex.lastIndex = 0;
					if (captureReferenceRegex.test(regexString)) {
						captureReferenceRegex.lastIndex = 0;
						var result = captureReferenceRegex.exec(regexString);
						while (result) {
							regexString = regexString.replace(result[0], current.result[result[1]] || "");
							result = captureReferenceRegex.exec(regexString);
						}
						/* create the updated regex, remove the leading '/' and trailing /g */
						endRegex = new RegExp(regexString.substring(1, regexString.length - 2), "g");
					}

					var lastIndex = contentStart;
					while (!resultEnd) {
						var result = _findMatch(endRegex, text, lastIndex);
						if (!result) {
							eolRegex.lastIndex = 0;
							result = eolRegex.exec(text);
						}
						var styles2 = [];
						var testBlock = new Block(
							{
								start: start,
								end: offset + result.index + result[0].length,
								contentStart: offset + contentStart,
								contentEnd: offset + result.index
							},
							current.pattern,
							block.getStyler(),
							model,
							block);
						parse(text.substring(contentStart, result.index + result[0].length), contentStart, testBlock, styles2);
						if (!styles2.length || styles2[styles2.length - 1].end <= result.index) {
							resultEnd = testBlock;
						}
						lastIndex = result.index + result[0].length;
					}
					results.push(resultEnd);
					index = resultEnd.end - offset;
					break;
				}
			}
			if (i === styles.length) {
				index = current.result.index + 1;
			}
			updateMatch(current, text, matches, index);
		}
		computeTasks(offset, block, model, results);
		return results;
	};

	function PatternManager(grammars, rootId) {
		this._unnamedCounter = 0;
		this._patterns = [];
		this._rootId = rootId;
		grammars.forEach(function(current) {
			if (current.patterns) {
				this._addPatterns(current.patterns, current.id);
			}
		}.bind(this));
	}
	PatternManager.prototype = {
		getPatterns: function(pattern) {
			var parentId;
			if (!pattern) {
				parentId = this._rootId;
			} else {
				if (typeof(pattern) === "string") { //$NON-NLS-0$
					parentId = pattern;
				} else {
					parentId = pattern.qualifiedId;
				}
			}
			/* indexes on patterns are used to break ties when multiple patterns match the same start text */
			var indexCounter = [0];
			var resultObject = {};
			var regEx = new RegExp(parentId + "#[^#]+$"); //$NON-NLS-0$
			var includes = [];
			this._patterns.forEach(function(current) {
				if (regEx.test(current.qualifiedId)) {
					if (current.include) {
						includes.push(current);
					} else {
						current.index = indexCounter[0]++;
						resultObject[current.id] = current;
					}
				}
			}.bind(this));
			/*
			 * The includes get processed last to ensure that locally-defined patterns are given
			 * precedence over included ones with respect to pattern identifiers and indexes.
			 */
			includes.forEach(function(current) {
				this._processInclude(current, indexCounter, resultObject);
			}.bind(this));

			var result = [];
			var keys = Object.keys(resultObject);
			keys.forEach(function(current) {
				result.push(resultObject[current]);
			});
			return result;
		},
		_addPatterns: function(patterns, parentId) {
			for (var i = 0; i < patterns.length; i++) {
				var current = patterns[i];
				current.parentId = parentId;
				if (!current.id) {
					current.id = this._UNNAMED + this._unnamedCounter++;
				}
				current.qualifiedId = current.parentId + "#" + current.id;
				this._patterns.push(current);
				if (current.patterns && !current.include) {
					this._addPatterns(current.patterns, current.qualifiedId);
				}
			};
		},
		_processInclude: function(pattern, indexCounter, resultObject) {
			var searchExp;
			var index = pattern.include.indexOf("#");
			if (index === 0) {
				/* inclusion of pattern from same grammar */
				searchExp = new RegExp(pattern.parentId.substring(0, pattern.parentId.indexOf("#")) + pattern.include + "$");
			} else if (index === -1) {
				/* inclusion of whole grammar */
				searchExp = new RegExp(pattern.include + "#[^#]+$");				
			} else {
				/* inclusion of specific pattern from another grammar */
				searchExp = new RegExp(pattern.include);
			}
			var includes = [];
			this._patterns.forEach(function(current) {
				if (searchExp.test(current.qualifiedId)) {
					if (current.include) {
						includes.push(current);
					} else if (!resultObject[current.id]) {
						current.index = indexCounter[0]++;
						resultObject[current.id] = current;
					}
				}
			}.bind(this));
			/*
			 * The includes get processed last to ensure that locally-defined patterns are given
			 * precedence over included ones with respect to pattern identifiers and indexes.
			 */
			includes.forEach(function(current) {
				this._processInclude(current, indexCounter, resultObject);
			}.bind(this));
		},
		_UNNAMED: "noId"	//$NON-NLS-0$
	};

	function Block(bounds, pattern, styler, model, parent) {
		this.start = bounds.start;
		this.end = bounds.end;
		this.contentStart = bounds.contentStart;
		this.contentEnd = bounds.contentEnd;
		this.pattern = pattern;
		this._styler = styler;
		this._parent = parent;
		this._linePatterns = [];
		this._blockPatterns = [];
		this._enclosurePatterns = {};
		if (model) {
			this._initPatterns();
			this._subBlocks = computeBlocks(model, model.getText(this.start, this.end), this, this.start);
		}
	}
	Block.prototype = {
		adjustEnd: function(value) {
			this.end += value;
			this.contentEnd += value;
			this._subBlocks.forEach(function(current) {
				current.adjustEnd(value);
			});
		},
		adjustStart: function(value) {
			this.start += value;
			this.contentStart += value;
			this._subBlocks.forEach(function(current) {
				current.adjustStart(value);
			});
		},
		computeStyle: function(model, offset) {
			if (!(this.pattern && this.start <= offset && offset < this.end)) {
				return null;
			}

			var fullBlock = {
				start: this.start,
				end: this.end,
				style: this.pattern.pattern.name
			};
			if (this.contentStart <= offset && offset < this.contentEnd) {
				if (this.pattern.pattern.contentName) {
					return {
						start: this.contentStart,
						end: this.contentEnd,
						style: this.pattern.pattern.contentName
					};
				}
				return fullBlock;
			}

			var regex, captures, testString, index;
			if (offset < this.contentStart) {
				captures = this.pattern.pattern.beginCaptures || this.pattern.pattern.captures;
				if (!captures) {
					return fullBlock;
				}
				regex = this.pattern.regexBegin;
				testString = model.getText(this.start, this.contentStart);
				index = this.start;
			} else {
				captures = this.pattern.pattern.endCaptures || this.pattern.pattern.captures;
				if (!captures) {
					return fullBlock;
				}
				regex = this.pattern.regexEnd;
				testString = model.getText(this.contentEnd, this.end);
				index = this.contentEnd;
			}

			regex.lastIndex = 0;
			var result = regex.exec(testString);
			if (result) {
				var styles = [];
				getCaptureStyles(result, captures, index, styles);
				for (var i = 0; i < styles.length; i++) {
					if (styles[i].start <= offset && offset < styles[i].end) {
						return styles[i];
					}
				}
			}
			return fullBlock;
		},
		detectTasks: function() {
			return this._styler._getDetectTasks();
		},
		getAnnotationModel: function() {
			return this._styler._getAnnotationModel();
		},
		getBlockPatterns: function() {
			return this._blockPatterns;
		},
		getBlocks: function() {
			return this._subBlocks;
		},
		getEnclosurePatterns: function() {
			return this._enclosurePatterns;
		},
		getLinePatterns: function() {
			return this._linePatterns;
		},
		getParent: function() {
			return this._parent;
		},
		getPatternManager: function() {
			return this._styler._getPatternManager();
		},
		getStyler: function() {
			return this._styler;
		},
		isRenderingWhitespace: function() {
			return this._styler._isRenderingWhitespace();
		},
		_initPatterns: function() {
			var patterns = this.getPatternManager().getPatterns(this.pattern ? this.pattern.pattern : null);
			var processIgnore = function(matchString) {
				var result = /^\(\?i\)\s*/.exec(matchString);
				if (result) {
					matchString = matchString.substring(result[0].length);
				}
				return matchString;
			};
			patterns.forEach(function(current) {
				var pattern;
				if (current.match && !current.begin && !current.end) {
					var flags = "g";	//$NON-NLS-0$
					var match = processIgnore(current.match);
					if (match !== current.match) {
						flags += "i";	//$NON-NLS-0$
					}
					pattern = {regex: new RegExp(match, flags), pattern: current};
					this._linePatterns.push(pattern);
					if (current.name && current.name.indexOf("punctuation.section") === 0 && (current.name.indexOf(PUNCTUATION_SECTION_BEGIN) !== -1 || current.name.indexOf(PUNCTUATION_SECTION_END) !== -1)) { //$NON-NLS-0$
						this._enclosurePatterns[current.name] = pattern;
					}
				} else if (!current.match && current.begin && current.end) {
					var beginFlags = "g";	//$NON-NLS-0$
					var begin = processIgnore(current.begin);
					if (begin !== current.begin) {
						beginFlags += "i";	//$NON-NLS-0$
					}
					var endFlags = "g";	//$NON-NLS-0$
					var end = processIgnore(current.end);
					if (end !== current.end) {
						endFlags += "i";	//$NON-NLS-0$
					}
					pattern = {regexBegin: new RegExp(begin, beginFlags), regexEnd: new RegExp(end, endFlags), pattern: current};
					this._linePatterns.push(pattern);
					this._blockPatterns.push(pattern);
				}
			}.bind(this));
		}
	};

	function TextStylerAccessor(styler) {
		this._styler = styler;
	}
	TextStylerAccessor.prototype = {
		getStyles: function(offset) {
			return this._styler.getStyles(offset);
		}
	};

	function TextStyler (view, annotationModel, grammars, rootGrammarId) {
		this.whitespacesVisible = this.spacesVisible = this.tabsVisible = false;
		this.detectHyperlinks = true;
		this.highlightCaretLine = false;
		this.foldingEnabled = true;
		this.detectTasks = true;
		this.view = view;
		this.annotationModel = annotationModel;
		this.patternManager = new PatternManager(grammars, rootGrammarId);
		this._accessor = new TextStylerAccessor(this);
		this._bracketAnnotations = undefined;

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

		var charCount = model.getCharCount();
		var rootBounds = {start: 0, contentStart: 0, end: charCount, contentEnd: charCount};
		this._rootBlock = new Block(rootBounds, null, this, model);
		this._computeFolding(this._rootBlock.getBlocks());
		view.redrawLines();
	}

	TextStyler.prototype = {
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
				this.view = null;
			}
		},
		getStyleAccessor: function() {
			return this._accessor;
		},
		getStyles: function(offset) {
			var result = [];
			var model = this.view.getModel();
			if (model.getBaseModel) {
				model = model.getBaseModel();
			}
			var block = this._findBlock(this._rootBlock, offset);
			var lineIndex = model.getLineAtOffset(offset);
			var lineText = model.getLine(lineIndex);
			var styles = [];
			parse(lineText, model.getLineStart(lineIndex), block, styles);
			for (var i = 0; i < styles.length; i++) {
				if (offset < styles[i].start) {
					break;
				}
				if (styles[i].start <= offset && offset < styles[i].end) {
					result.push(styles[i]);
					break;
				}
			}
			while (block) {
				var style = block.computeStyle(model, offset);
				if (style) {
					result.splice(0, 0, style);
				}
				block = block.getParent();
			}
			return result;
		},
		setHighlightCaretLine: function(highlight) {
			this.highlightCaretLine = highlight;
		},
		setWhitespacesVisible: function(visible, redraw) {
			if (this.whitespacesVisible === visible) { return; }
			this.whitespacesVisible = visible;
			if (redraw) {
				this.view.redraw();
			}
		},
		setTabsVisible: function(visible) {
			if (this.tabsVisible === visible) { return; }
			this.tabsVisible = visible;
			this.setWhitespacesVisible(this.tabsVisible || this.spacesVisible, false);
			this.view.redraw();
		},
		setSpacesVisible: function(visible) {
			if (this.spacesVisible === visible) { return; }
			this.spacesVisible = visible;
			this.setWhitespacesVisible(this.tabsVisible || this.spacesVisible, false);
			this.view.redraw();
		},
		setDetectHyperlinks: function(enabled) {
			this.detectHyperlinks = enabled;
		},
		setFoldingEnabled: function(enabled) {
			this.foldingEnabled = enabled;
		},
		setDetectTasks: function(enabled) {
			this.detectTasks = enabled;
		},
		_binarySearch: function(array, offset, inclusive, low, high) {
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
		_computeFolding: function(blocks) {
			if (!this.foldingEnabled) { return; }
			var view = this.view;
			var viewModel = view.getModel();
			if (!viewModel.getBaseModel) { return; }
			var annotationModel = this.annotationModel;
			if (!annotationModel) { return; }
			annotationModel.removeAnnotations(mAnnotations.AnnotationType.ANNOTATION_FOLDING);
			var add = [];
			var baseModel = viewModel.getBaseModel();
			for (var i = 0; i < blocks.length; i++) {
				var block = blocks[i];
				var annotation = this._createFoldingAnnotation(viewModel, baseModel, block.start, block.end);
				if (annotation) {
					add.push(annotation);
				}
			}
			annotationModel.replaceAnnotations(null, add);
		},
		_createFoldingAnnotation: function(viewModel, baseModel, start, end) {
			var startLine = baseModel.getLineAtOffset(start);
			var endLine = baseModel.getLineAtOffset(end);
			if (startLine === endLine) {
				return null;
			}
			return new (mAnnotations.AnnotationType.getType(mAnnotations.AnnotationType.ANNOTATION_FOLDING))(start, end, viewModel);
		},
		_findBlock: function(parentBlock, offset) {
			var blocks = parentBlock.getBlocks();
			if (!blocks.length) {
				return parentBlock;
			}

			var index = this._binarySearch(blocks, offset, true);
			if (index < blocks.length && blocks[index].start <= offset && offset < blocks[index].end) {
				return this._findBlock(blocks[index], offset);
			}
			return parentBlock;
		},
		_findBrackets: function(bracket, closingBracket, block, text, start, end) {
			var result = [], styles = [];
			var offset = start, blocks = block.getBlocks();
			var startIndex = this._binarySearch(blocks, start, true);
			for (var i = startIndex; i < blocks.length; i++) {
				if (blocks[i].start >= end) { break; }
				var blockStart = blocks[i].start;
				var blockEnd = blocks[i].end;
				if (offset < blockStart) {
					parse(text.substring(offset - start, blockStart - start), offset, block, styles);
					styles.forEach(function(current) {
						if (current.style.indexOf(bracket.pattern.name) === 0) {
							result.push(current.start + 1);
						} else if (current.style.indexOf(closingBracket.pattern.name) === 0) {
							result.push(-(current.start + 1));
						}
					});
					styles = [];
				}
				offset = blockEnd;
			}
			if (offset < end) {
				parse(text.substring(offset - start, end - start), offset, block, styles);
				styles.forEach(function(current) {
					if (current.style.indexOf(bracket.pattern.name) === 0) {
						result.push(current.start + 1);
					} else if (current.style.indexOf(closingBracket.pattern.name) === 0) {
						result.push(-(current.start + 1));
					}
				});
			}
			return result;
		},
		_findMatchingBracket: function(model, block, offset) {
			var lineIndex = model.getLineAtOffset(offset);
			var lineEnd = model.getLineEnd(lineIndex);
			var text = model.getText(offset, lineEnd);

			var match;
			var enclosurePatterns = block.getEnclosurePatterns();
			var keys = Object.keys(enclosurePatterns);
			for (var i = 0; i < keys.length; i++) {
				var current = enclosurePatterns[keys[i]];
				var result = _findMatch(current.regex, text, 0);
				if (result && result.index === 0) {
					match = current;
					break;
				}
			}
			if (!match) { return -1; }

			var closingName;
			var onEnclosureStart = false;
			if (match.pattern.name.indexOf(PUNCTUATION_SECTION_BEGIN) !== -1) {
				onEnclosureStart = true;
				closingName = match.pattern.name.replace(PUNCTUATION_SECTION_BEGIN, PUNCTUATION_SECTION_END);
			} else {
				closingName = match.pattern.name.replace(PUNCTUATION_SECTION_END, PUNCTUATION_SECTION_BEGIN);
			}
			var closingBracket = enclosurePatterns[closingName];
			if (!closingBracket) { return -1; }

			var lineText = model.getLine(lineIndex);
			var lineStart = model.getLineStart(lineIndex);
			var brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
			for (i = 0; i < brackets.length; i++) {
				var sign = brackets[i] >= 0 ? 1 : -1;
				if (brackets[i] * sign - 1 === offset) {
					var level = 1;
					if (!onEnclosureStart) {
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
							brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
							for (var j = brackets.length - 1; j >= 0; j--) {
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
							brackets = this._findBrackets(match, closingBracket, block, lineText, lineStart, lineEnd);
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
		_getAnnotationModel: function() {
			return this.annotationModel;
		},
		_getDetectTasks: function() {
			return this.detectTasks;
		},
		_getLineStyle: function(lineIndex) {
			if (this.highlightCaretLine) {
				var view = this.view;
				var model = view.getModel();
				var selection = view.getSelection();
				if (selection.start === selection.end && model.getLineAtOffset(selection.start) === lineIndex) {
					return caretLineStyle;
				}
			}
			return null;
		},
		_getPatternManager: function() {
			return this.patternManager;
		},
		_getStyles: function(block, model, text, start) {
			if (model.getBaseModel) {
				start = model.mapOffset(start);
			}
			var end = start + text.length;

			var styles = [];
			var offset = start, blocks = block.getBlocks();
			var startIndex = this._binarySearch(blocks, start, true);
			for (var i = startIndex; i < blocks.length; i++) {
				if (blocks[i].start >= end) { break; }
				var blockStart = blocks[i].start;
				var blockEnd = blocks[i].end;
				if (offset < blockStart) {
					/* content on that line that preceeds the start of the block */
					parse(text.substring(offset - start, blockStart - start), offset, block, styles);
				}
				var s = Math.max(offset, blockStart);
				if (s === blockStart) {
					/* currently at the block's "start" match, which specifies its style by either a capture or name */
					var result = _findMatch(blocks[i].pattern.regexBegin, text.substring(s - start), 0);
					if (result) {
						/* the begin match is still valid */
						var captures = blocks[i].pattern.pattern.beginCaptures || blocks[i].pattern.pattern.captures;
						if (captures) {
							getCaptureStyles(result, captures, s, styles);
						} else {
							styles.push({start: s, end: s + result[0].length, style: blocks[i].pattern.pattern.name});
						}
						s += result[0].length;
					}
				}

				/*
				 * Compute the end match now in order to determine the end-bound of the contained content, but do not add the
				 * end match's styles to the styles array until content styles have been computed so that ordering is preserved.
				 */
				var e = Math.min(end, blockEnd);
				var endStyles = [];
				if (e === blockEnd) {
					/* currently at the block's "end" match, which specifies its style by either a capture or name */
					var testString = text.substring(e - offset - (blocks[i].end - blocks[i].contentEnd));
					var result = _findMatch(blocks[i].pattern.regexEnd, testString, 0);
					if (result) {
						/* the end match is still valid */
						var captures = blocks[i].pattern.pattern.endCaptures || blocks[i].pattern.pattern.captures;
						if (captures) {
							getCaptureStyles(result, captures, e - result[0].length, endStyles);
						} else if (blocks[i].pattern.pattern.name) {
							endStyles.push({start: e - result[0].length, end: e, style: blocks[i].pattern.pattern.name});
						}
						e -= result[0].length;
					}
				}

				var blockSubstyles = this._getStyles(blocks[i], model, text.substring(s - start, e - start), s);
				var blockStyle = blocks[i].pattern.pattern.contentName || blocks[i].pattern.pattern.name;
				if (blockStyle) {
					/*
					 * If a name was specified for the current block then apply its style throughout its
					 * content wherever a style is not provided by a sub-pattern.
					 */
					var index = s;
					blockSubstyles.forEach(function(current) {
						if (current.start - index) {
							styles.push({start: index, end: current.start, style: blockStyle});
						}
						styles.push(current);
						index = current.end;
					});
					if (e - index) {
						styles.push({start: index, end: e, style: blockStyle});
					}
				} else {
					styles = styles.concat(blockSubstyles);
				}
				styles = styles.concat(endStyles);
				offset = blockEnd;
			}
			if (offset < end) {
				/* content on that line that follows the end of the block */
				parse(text.substring(offset - start, end - start), offset, block, styles);
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
		_isRenderingWhitespace: function() {
			return this.whitespacesVisible && (this.tabsVisible || this.spacesVisible);
		},
//		_detectHyperlinks: function(text, offset, styles, s) {
//			var href = null, index, linkStyle;
//			if ((index = text.indexOf("://")) > 0) { //$NON-NLS-0$
//				href = text;
//				var start = index;
//				while (start > 0) {
//					var c = href.charCodeAt(start - 1);
//					if (!((97 <= c && c <= 122) || (65 <= c && c <= 90) || 0x2d === c || (48 <= c && c <= 57))) { //LETTER OR DASH OR NUMBER
//						break;
//					}
//					start--;
//				}
//				if (start > 0) {
//					var brackets = "\"\"''(){}[]<>"; //$NON-NLS-0$
//					index = brackets.indexOf(href.substring(start - 1, start));
//					if (index !== -1 && (index & 1) === 0 && (index = href.lastIndexOf(brackets.substring(index + 1, index + 2))) !== -1) {
//						var end = index;
//						linkStyle = this._clone(s);
//						linkStyle.tagName = "a"; //$NON-NLS-0$
//						linkStyle.attributes = {href: href.substring(start, end)};
//						styles.push({start: offset, end: offset + start, style: s});
//						styles.push({start: offset + start, end: offset + end, style: linkStyle});
//						styles.push({start: offset + end, end: offset + text.length, style: s});
//						return null;
//					}
//				}
//			} else if (text.toLowerCase().indexOf("bug#") === 0) { //$NON-NLS-0$
//				href = "https://bugs.eclipse.org/bugs/show_bug.cgi?id=" + parseInt(text.substring(4), 10); //$NON-NLS-0$
//			}
//			if (href) {
//				linkStyle = this._clone(s);
//				linkStyle.tagName = "a"; //$NON-NLS-0$
//				linkStyle.attributes = {href: href};
//				return linkStyle;
//			}
//			return s;
//		},
//		_clone: function(obj) {
//			if (!obj) { return obj; }
//			var newObj = {};
//			for (var p in obj) {
//				if (obj.hasOwnProperty(p)) {
//					var value = obj[p];
//					newObj[p] = value;
//				}
//			}
//			return newObj;
//		},
		_onDestroy: function(e) {
			this.destroy();
		},
		_onLineStyle: function(e) {
			if (e.textView === this.view) {
				e.style = this._getLineStyle(e.lineIndex);
			}
			e.ranges = this._getStyles(this._rootBlock, e.textView.getModel(), e.lineText, e.lineStart);
			e.ranges.forEach(function(current) {
				if (current.style) {
					current.style = {styleClass: current.style.replace(/\./g, " ")};
				}
			});
			if (this._isRenderingWhitespace()) {
				if (this.spacesVisible) {
					this._spliceStyles(spacePattern, e.ranges, e.lineText, e.lineStart);
				}
				if (this.tabsVisible) {
					this._spliceStyles(tabPattern, e.ranges, e.lineText, e.lineStart);
				}
			}
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
				var block = this._findBlock(this._rootBlock, mapCaret);
				var bracket = this._findMatchingBracket(model, block, mapCaret);
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
				var block = this._findBlock(this._rootBlock, mapOffset);
				var bracket = this._findMatchingBracket(baseModel, block, mapOffset);
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
			var blocks = this._rootBlock.getBlocks();
			var blockCount = blocks.length;
			var lineStart = baseModel.getLineStart(baseModel.getLineAtOffset(start));
			var blockStart = this._binarySearch(blocks, lineStart, true);
			var blockEnd = this._binarySearch(blocks, end, false, blockStart - 1, blockCount);

			var ts;
			if (blockStart < blockCount && blocks[blockStart].start <= lineStart && lineStart < blocks[blockStart].end) {
				ts = blocks[blockStart].start;
				if (ts > start) { ts += changeCount; }
			} else {
				if (blockStart === blockCount && blockCount > 0 && charCount - changeCount === blocks[blockCount - 1].end) {
					ts = blocks[blockCount - 1].start;
				} else {
					ts = lineStart;
				}
			}

			var te, newBlocks;
			/*
			 * The case where the following loop will iterate more than once is a change to a block that causes it to expand
			 * through the subsequent block (eg.- removing the '/' from the end of a multi-line comment.  This is determined
			 * by a subsequent block's end pattern id changing as a result of the text change.  When this happens, the first
			 * block is expanded through subsequent blocks until one is found with the same ending pattern id to terminate it.
			 */
			do {
				if (blockEnd < blockCount) {
					te = blocks[blockEnd].end;
					if (te > start) { te += changeCount; }
					blockEnd += 1;
				} else {
					blockEnd = blockCount;
					te = charCount;	//TODO could it be smaller?
				}
				var text = baseModel.getText(ts, te), block;
				newBlocks = computeBlocks(baseModel, text, this._rootBlock, ts);
			} while (newBlocks.length && blocks.length && blockEnd < blockCount && newBlocks[newBlocks.length - 1].pattern.pattern.id !== blocks[blockEnd - 1].pattern.pattern.id);

			for (var i = blockStart; i < blocks.length; i++) {
				block = blocks[i];
				if (block.start > start) { block.adjustStart(changeCount); }
				if (block.start > start) { block.adjustEnd(changeCount); }
			}
			var redraw = (blockEnd - blockStart) !== newBlocks.length;
			if (!redraw) {
				for (i = 0; i < newBlocks.length; i++) {
					block = blocks[blockStart + i];
					var newBlock = newBlocks[i];
					if (block.start !== newBlock.start || block.end !== newBlock.end || block.type !== newBlock.type) {
						redraw = true;
						break;
					}
				}
			}
			var args = [blockStart, blockEnd - blockStart].concat(newBlocks);
			Array.prototype.splice.apply(blocks, args);
			if (redraw) {
				var redrawStart = ts;
				var redrawEnd = te;
				if (viewModel !== baseModel) {
					redrawStart = viewModel.mapOffset(redrawStart, true);
					redrawEnd = viewModel.mapOffset(redrawEnd, true);
				}
				view.redrawRange(redrawStart, redrawEnd);
			}

			if (this.foldingEnabled && baseModel !== viewModel && this.annotationModel) {
				var annotationModel = this.annotationModel;
				var iter = annotationModel.getAnnotations(ts, te);
				var remove = [], all = [];
				var annotation;
				while (iter.hasNext()) {
					annotation = iter.next();
					if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_FOLDING) {
						all.push(annotation);
						for (i = 0; i < newBlocks.length; i++) {
							if (annotation.start === newBlocks[i].start && annotation.end === newBlocks[i].end) {
								break;
							}
						}
						if (i === newBlocks.length) {
							remove.push(annotation);
							annotation.expand();
						} else {
							var annotationStart = annotation.start;
							var annotationEnd = annotation.end;
							if (annotationStart > start) {
								annotationStart -= changeCount;
							}
							if (annotationEnd > start) {
								annotationEnd -= changeCount;
							}
							if (annotationStart <= start && start < annotationEnd && annotationStart <= end && end < annotationEnd) {
								var startLine = baseModel.getLineAtOffset(annotation.start);
								var endLine = baseModel.getLineAtOffset(annotation.end);
								if (startLine !== endLine) {
									if (!annotation.expanded) {
										annotation.expand();
									}
								} else {
									annotationModel.removeAnnotation(annotation);
								}
							}
						}
					}
				}
				var add = [];
				for (i = 0; i < newBlocks.length; i++) {
					block = newBlocks[i];
					for (var j = 0; j < all.length; j++) {
						if (all[j].start === block.start && all[j].end === block.end) {
							break;
						}
					}
					if (j === all.length) {
						annotation = this._createFoldingAnnotation(viewModel, baseModel, block.start, block.end);
						if (annotation) {
							add.push(annotation);
						}
					}
				}
				annotationModel.replaceAnnotations(remove, add);
			}
		},
		_spliceStyles: function(whitespacePattern, ranges, text, offset) {
			var regex = whitespacePattern.regex;
			regex.lastIndex = 0;
			var rangeIndex = 0;
			var result = regex.exec(text);
			while (result) {
				var charIndex = offset + result.index;
				while (rangeIndex < ranges.length) {
					if (charIndex < ranges[rangeIndex].end) {
						break;
					}
					rangeIndex++;
				};
				var newStyle = {
					start: charIndex,
					end: charIndex + 1,
					style: whitespacePattern.style
				};
				if (rangeIndex < ranges.length && ranges[rangeIndex].start <= charIndex) {
					var endStyle = {start: charIndex + 1, end: ranges[rangeIndex].end, style: ranges[rangeIndex].style};
					ranges[rangeIndex].end = charIndex;
					ranges.splice(rangeIndex + 1, 0, endStyle);
					ranges.splice(rangeIndex + 1, 0, newStyle);
					rangeIndex += 2;
				} else {
					ranges.splice(rangeIndex, 0, newStyle);
					rangeIndex++;
				}
				result = regex.exec(text);
			}
		}
	};

	return {TextStyler: TextStyler};
});
