/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define([
	'orion/i18nUtil',
	'i18n!orion/nls/messages',
	'marked/marked',
	'orion/commands',
	'orion/keyBinding',
	'orion/editor/annotations',
	'orion/editor/editor',
	'orion/editor/textStyler',
	'orion/editor/util',
	'orion/fileCommands',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/URITemplate',
	'orion/webui/splitter',
	'orion/URL-shim'
], function(i18nUtil, messages, marked, mCommands, mKeyBinding, mAnnotations, mEditor, mTextStyler, mTextUtil, mFileCommands, objects, lib, URITemplate, mSplitter) {

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	var extensionRegex = /\.([0-9a-z]+)(?:[\?#]|$)/i;
	var markedOutputLink = marked.InlineLexer.prototype.outputLink;
	var imgCount = 0;
	var markedOptions = marked.parse.defaults;
	var toggleOrientationCommand;
	var previewDiv;
	markedOptions.sanitize = true;
	markedOptions.tables = true;

	var ID_PREFIX = "_orionMDBlock"; //$NON-NLS-0$

	var MarkdownStylingAdapter = function(model, resource, fileClient) {
		this.model = model;

		/* relativize marked's outputLink */
		var resourceURL = new URL(resource, window.location.href);
		marked.InlineLexer.prototype.outputLink = filterOutputLink(resourceURL, fileClient, resource.indexOf(":") === -1); //$NON-NLS-0$

		this._inlinePatterns = [];
		var patternIndex = 0;
		var keys = Object.keys(marked.InlineLexer.rules.gfm);
		keys.forEach(function(current) {
			if (current.indexOf("_") !== 0) { //$NON-NLS-0$
				var regex = marked.InlineLexer.rules.gfm[current];
				if (regex.source) {
					var source = regex.source.substring(1).replace(/\|\^/g, "|"); /* adjust uses of '^' */ //$NON-NLS-0$
					source = source.replace(/[ ]\{2,\}/g, "(\\t| {2,})"); /* adjust assumption of tabs having been replaced by spaces */ //$NON-NLS-0$
					this._inlinePatterns.push({regex: new RegExp(source, "g"), name: current, index: patternIndex++}); //$NON-NLS-0$
				}
			}
		}.bind(this));
	};

	MarkdownStylingAdapter.prototype = {
		blockSpansBeyondEnd: function(/*block*/) {
			return false;
		},
		computeBlocks: function(model, text, block, offset/*, startIndex, endIndex, maxBlockCount*/) {
			var result = [];
			var tokens;

			if (block.typeId) {
				/* parent is a block other than the root block */
				if (block.typeId !== "markup.quote.markdown" && //$NON-NLS-0$
					block.typeId !== "markup.list.markdown" && //$NON-NLS-0$
					block.typeId !== this._TYPEID_LISTITEM) {
						/* no other kinds of blocks have sub-blocks, so just return */
						return result;
				}

				tokens = block.seedTokens;
				block.seedTokens = null;
			}

			var index = 0;
			tokens = tokens || marked.lexer(text, markedOptions);

			for (var i = 0; i < tokens.length; i++) {
				var bounds = null, name = null, end = null, newlines = null;
				var startToken = null, contentToken = null, parentTokens = null, endToken = null;
				var seedTokens = null;

				name = null;
				this._whitespaceRegex.lastIndex = index;
				var whitespaceResult = this._whitespaceRegex.exec(text);
				if (whitespaceResult && whitespaceResult.index === index) {
					index += whitespaceResult[0].length;
				}

				if (tokens[i].type === "heading") { //$NON-NLS-0$
					this._atxDetectRegex.lastIndex = index;
					var match = this._atxDetectRegex.exec(text);
					var isAtx = match && match.index === index;
					var lineEnd = this._getLineEnd(text, index, model);
					end = isAtx ? lineEnd : this._getLineEnd(text, index, model, 1);
					bounds = {
						start: index,
						contentStart: index + (isAtx ? tokens[i].depth + 1 : 0),
						contentEnd: lineEnd,
						end: end
					};
					name = this._TYPEID_HEADING;
					contentToken = tokens[i];
					index = end;
				} else if (tokens[i].type === "paragraph" || tokens[i].type === "text") { //$NON-NLS-1$ //$NON-NLS-0$
					var newlineCount = 0;

					/*
					 * marked's sanitizing of html produces paragraph tokens with trailing newline
					 * characters, which is inconsistent with normal paragraph tokens. If this paragraph
					 * is detected to be sanitized html (check for a 'pre' property) then do not consider
					 * trailing newline characters when computing the end bound.
					 */
					if (tokens[i].pre !== undefined) {
						var lastIndex = 0;
						while (true) {
							this._htmlNewlineRegex.lastIndex = lastIndex;
							match = this._htmlNewlineRegex.exec(tokens[i].text);
							if (match) {
								newlineCount++;
								lastIndex = match.index + 1;
							} else {
								break;
							}
						}
					} else {
						match = tokens[i].text.match(this._newlineRegex);
						if (match) {
							newlineCount = match.length;
						}
					}

					end = this._getLineEnd(text, index, model, newlineCount);

					if (!this._isTop(block)) {
						tokens[i].type = "text"; //$NON-NLS-0$
						parentTokens = [tokens[i]];
					} else {
						contentToken = tokens[i];
					}
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					name = this._TYPEID_PARAGRAPH;
					index = end;
				} else if (tokens[i].type === "blockquote_start" || tokens[i].type === "list_start") { //$NON-NLS-1$ //$NON-NLS-0$
					/*
					 * Use text contained in the tokens between the *_start and *_end
					 * tokens to crawl through the text to determine the block's end bound.
					 */

					if (tokens[i].type === "blockquote_start") { //$NON-NLS-0$
						endToken = "blockquote_end"; //$NON-NLS-0$
						var contentStartRegex = this._blockquoteStartRegex;
						name = "markup.quote.markdown"; //$NON-NLS-0$
					} else { /* list_start */
						endToken = "list_end"; //$NON-NLS-0$
						contentStartRegex = null;
						name = "markup.list.markdown"; //$NON-NLS-0$
					}

					var start = index;
					/*
					 * Note that *_start tokens can stack (eg.- a list within a list)
					 * so must be sure to find the _matching_ end token.
					 */
					var j = i;
					var stack = 0;
					while (true) {
						if (tokens[j].type === tokens[i].type) {
							stack++; /* a start token */
						} else if (tokens[j].type === endToken) {
							if (!--stack) {
								break;
							}
						}
						index = this._advanceIndex(text, tokens[j], index);
						j++;
					}

					/* claim the newline character that ends this element if there is one */
					this._newlineRegex.lastIndex = index;
					match = this._newlineRegex.exec(text);
					if (match) {
						index = match.index + match[0].length;

						if (name === "markup.list.markdown") { //$NON-NLS-0$
							/* for lists claim whitespace that starts the next line */
							this._spacesAndTabsRegex.lastIndex = index;
							match = this._spacesAndTabsRegex.exec(text);
							if (match && match.index === index) {
								index += match[0].length;
							}
						}
					}

					/* compute the block's contentStart bound */
					if (contentStartRegex) {
						contentStartRegex.lastIndex = start;
						match = contentStartRegex.exec(text);
						var contentStart = start + match[0].length;
					} else {
						contentStart = start;
					}
					index = Math.max(index, contentStart);
					bounds = {
						start: start,
						contentStart: contentStart,
						contentEnd: index,
						end: index
					};

					startToken = tokens[i];
					endToken = tokens[j];
					seedTokens = tokens.slice(i + 1, j);
					i = j;
				} else if (tokens[i].type.indexOf("_item_start") !== -1) { //$NON-NLS-0$
					/*
					 * Use text contained in the tokens between the list_item_start and list_item_end
					 * tokens to crawl through the text to determine the list item's end bound.
					 */
					start = index;

					/*
					 * Note that *_item_start tokens can stack (eg.- a list item within a list within a list
					 * item) so must be sure to find the _matching_ end token.
					 */
					j = i;
					stack = 0;
					while (true) {
						if (tokens[j].type === "list_item_start" || tokens[j].type === "loose_item_start") { //$NON-NLS-1$ //$NON-NLS-0$
							stack++; /* a start token */
						} else if (tokens[j].type === "list_item_end") { //$NON-NLS-0$
							if (!--stack) {
								break;
							}
						}
						index = this._advanceIndex(text, tokens[j], index);
						j++;
					}

					/* claim the newline character that ends this item if there is one */
					this._newlineRegex.lastIndex = index;
					match = this._newlineRegex.exec(text);
					if (match) {
						index = match.index + match[0].length;
					}

					/* compute the block's contentStart bound */

					/* marked.Lexer.rules.normal.bullet is not global, so cannot set its lastIndex */
					var tempText = text.substring(start);
					match = marked.Lexer.rules.normal.bullet.exec(tempText);
					contentStart = start + match.index + match[0].length;
					index = Math.max(index, contentStart);
					bounds = {
						start: start,
						contentStart: contentStart,
						contentEnd: index,
						end: index
					};

					name = this._TYPEID_LISTITEM;
					startToken = tokens[i];
					endToken = tokens[j];
					seedTokens = tokens.slice(i + 1, j);
					i = j;
				} else if (tokens[i].type === "code") { //$NON-NLS-0$
					/*
					 * gfm fenced code blocks can be differentiated from markdown code blocks by the
					 * presence of a "lang" property.
					 */
					if (tokens[i].hasOwnProperty("lang")) { //$NON-NLS-0$
						// TODO create a block and syntax style it if a supported lang is provided
						start = index;
						newlines = tokens[i].text.match(this._newlineRegex);
						end = this._getLineEnd(text, index, model, 2 + (newlines ? newlines.length : 0));
						name = "markup.raw.code.fenced.gfm"; //$NON-NLS-0$
					} else {
						start = this._getLineStart(text, index); /* backtrack to start of line */
						newlines = tokens[i].text.match(this._newlineRegex);
						end = this._getLineEnd(text, index, model, newlines ? newlines.length : 0);
						this._whitespaceRegex.lastIndex = end;
						match = this._whitespaceRegex.exec(text);
						if (match && match.index === end) {
							end += match[0].length;
						}
						name = "markup.raw.code.markdown"; //$NON-NLS-0$
					}

					bounds = {
						start: start,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					contentToken = tokens[i];
					index = end;
				} else if (tokens[i].type === "hr") { //$NON-NLS-0$
					end = this._getLineEnd(text, index, model);
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					name = "markup.other.separator.markdown"; //$NON-NLS-0$ 
					contentToken = tokens[i];
					index = end;
				} else if (tokens[i].type === "table") { //$NON-NLS-0$
					end = this._getLineEnd(text, index, model, tokens[i].cells.length + 1);
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					if (this._isTop(block)) {
						name = "markup.other.table.gfm"; //$NON-NLS-0$
						contentToken = tokens[i];
					} else {
						/*
						 * This can happen if the table's text is scanned by marked without the surrounding
						 * context of its parent block (eg.- marked does not realize that the table text is
						 * in a list item).  Create a text token with the table's text to be used by the parent
						 * block.
						 */
						name = this._TYPEID_PARAGRAPH;
						parentTokens = [{type: "text", text: text.substring(index, end)}]; //$NON-NLS-0$
					}
					index = end;
				} else if (tokens[i].type === "space") { //$NON-NLS-0$
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: index,
						end: index
					};
					name = this._TYPEID_PARAGRAPH;
					parentTokens = [tokens[i]];
				}

				if (name) {
					bounds.start = bounds.start + offset;
					bounds.contentStart = bounds.contentStart + offset;
					bounds.contentEnd = bounds.contentEnd + offset;
					bounds.end = bounds.end + offset;
					var newBlock = this.createBlock(bounds, this._styler, model, block, name, function(newBlock) {
						if (block.name) {
							/* sub-blocks are not styled differently from their parent block */
							newBlock.name = block.name;
						}
						newBlock.startToken = startToken;
						if (contentToken) {
							newBlock.tokens = [contentToken];
						}
						newBlock.endToken = endToken;
						newBlock.seedTokens = seedTokens;
						if (parentTokens) {
							newBlock.parentTokens = parentTokens;
							newBlock.doNotFold = true;
						}
					});
					result.push(newBlock);
				}
			}

			if (tokens.links && Object.keys(tokens.links).length) {
				block.links = tokens.links;
			} /*else {
				block.links = undefined;
			}*/

			return result;
		},
		computeStyle: function(/*block, model, offset*/) {
			return null;
		},
		createBlock: function(bounds, styler, model, parent, data, initFn) {
			var result = new mTextStyler.Block(bounds, data, data, styler, model, parent, initFn);
			result.elementId = ID_PREFIX + this._elementCounter++;
			this._blocksCache[result.elementId] = result;
			return result;
		},
		getBlockContentStyleName: function(block) {
			return block.name;
		},
		getBlockEndStyle: function(/*block, text, endIndex, _styles*/) {
			return null;
		},
		getBlockStartStyle: function(/*block, text, index, _styles*/) {
			return null;
		},
		getBlockWithId: function(elementId) {
			return this._blocksCache[elementId];
		},
		getBracketMatch: function(/*block, text*/) {
			return null;
		},
		getElementByIdentifier: function(id, rootNode) {
			return lib.$("." + id, rootNode || previewDiv); //$NON-NLS-0$
		},
		getElementIdentifier: function(element) {
			var classList = element.classList;
			for (var i = 0; i < classList.length; i++) {
				if (classList[i] !== this._markdownSelected) {
					return classList[i];
				}
			}
			return "";
		},
		initialPopulatePreview: function() {
			/* hack, see the explaination in MarkdownEditor.initSourceEditor() */
			var rootBlock = this._styler.getRootBlock();
			this._onBlocksChanged({oldBlocks: [], newBlocks: rootBlock.getBlocks()});
		},
		parse: function(text, offset, block, _styles /*, ignoreCaptures*/) {
			if (!block.typeId) {
				return;
			}

			var matches = [];
			this._inlinePatterns.forEach(function(current) {
				current.regex.lastIndex = 0;
				var result = current.regex.exec(text);
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
				return a.pattern.index < b.pattern.index ? -1 : 1;
			});

			var index = 0;
			while (matches.length > 0) {
				var current = matches[0];
				matches.splice(0,1);
				if (current.result.index < index) {
					/* processing of another match has moved index beyond this match */
					this._updateMatch(current, text, matches, index);
					continue;
				}
				var start = current.result.index;
				index = start + current.result[0].length;
				var name = null;
				if (current.pattern.name.indexOf("link") !== -1) { //$NON-NLS-0$
					name = "markup.underline.link.markdown"; //$NON-NLS-0$
				} else if (current.pattern.name === "strong") { //$NON-NLS-0$
					name = "markup.bold.markdown"; //$NON-NLS-0$
				} else if (current.pattern.name === "em") { //$NON-NLS-0$
					name = "markup.italic.markdown"; //$NON-NLS-0$
				} else if (current.pattern.name === "code") { //$NON-NLS-0$
					name = "markup.raw.code.markdown"; //$NON-NLS-0$
				} else if (current.pattern.name === "br") { //$NON-NLS-0$
					name = "markup.other.br.markdown"; //$NON-NLS-0$
					// TODO adjust start
				} else if (current.pattern.name === "del") { //$NON-NLS-0$
					name = "markup.other.strikethrough.gfm"; //$NON-NLS-0$
				}
				if (name) {
					_styles.push({start: offset + start, end: offset + index, style: name, mergeable: true});
				}
				this._updateMatch(current, text, matches, index);
			}
		},
		setStyler: function(styler) {
			if (this._styler) {
				this._styler.removeEventListener("BlocksChanged", this._onBlocksChanged); //$NON-NLS-0$
				this._styler.removeAnnotationProvider(this._annotationProvider);
			}
			this._styler = styler;
			styler.addEventListener("BlocksChanged", this._onBlocksChanged.bind(this)); //$NON-NLS-0$
			styler.addAnnotationProvider(this._annotationProvider.bind(this));
		},
		setView: function(view) {
			this._view = view;
		},
		verifyBlock: function(baseModel, text, block, changeCount) {
			/*
			 * The semantics of list and blockquote descendents are different than top-level
			 * elements, so don't attempt to update at a block level within a list or blockquote.
			 */
			var current = block;
			while (current) {
				if (current.typeId === "markup.list.markdown" || current.typeId === "markup.quote.markdown") { //$NON-NLS-1$ //$NON-NLS-0$
					return false;
				}
				current = current.parent;
			}

			var blocks = this.computeBlocks(baseModel, text, block.parent, block.start);
			return blocks.length &&
				blocks[0].start === block.start &&
				blocks[0].end === block.end + changeCount &&
				blocks[0].typeId === block.typeId &&
				blocks[0].getBlocks().length === block.getBlocks().length;
		},

		/** @private */

		_adoptTokens: function(targetBlock, sourceBlock) {
			targetBlock.tokens = sourceBlock.tokens;
			var targetSubBlocks = targetBlock.getBlocks();
			var sourceSubBlocks = sourceBlock.getBlocks();
			for (var i = 0; i < Math.min(targetSubBlocks.length, sourceSubBlocks.length); i++) {
				this._adoptTokens(targetSubBlocks[i], sourceSubBlocks[i]);
			}
		},
		_advanceIndex: function(text, token, index) {
			if (token.text) {
				/*
				 * Must split the text and crawl through each of its parts because
				 * the token text may not exactly match our source text (in
				 * particular because marked converts all tabs to spaces).
				 */
				this._whitespaceRegex.lastIndex = 0;
				var segments = token.text.split(this._whitespaceRegex);
				segments.forEach(function(current) {
					if (current.length) {
						index = text.indexOf(current, index) + current.length;
					}
				});
			} else if (token.type === "blockquote_start") { //$NON-NLS-0$
				this._blockquoteStartRegex.lastIndex = index;
				var match = this._blockquoteStartRegex.exec(text);
				index = match.index + match[0].length;
			} else if (token.type === "hr") { //$NON-NLS-0$
				this._hrRegex.lastIndex = index;
				match = this._hrRegex.exec(text);
				index = match.index + match[0].length;
			} else if (token.type === "space") { //$NON-NLS-0$
				this._newlineRegex.lastIndex = index;
				match = this._newlineRegex.exec(text);
				index = match.index + match[0].length;
			} else if (token.type === "table") { //$NON-NLS-0$
				segments = token.header.slice();
				token.cells.forEach(function(current) {
					segments = segments.concat(current);
				});
				segments.forEach(function(current) {
					if (current.length) {
						index = text.indexOf(current, index) + current.length;
					}
				});
			} else if (token.type.indexOf("_item_start") !== -1) { //$NON-NLS-0$
				/* marked.Lexer.rules.normal.bullet is not global, so cannot set its lastIndex */
				text = text.substring(index);
				match = marked.Lexer.rules.normal.bullet.exec(text);
				index += match.index + match[0].length;
			}
			return index;
		},
		_annotationProvider: function(annotationModel, baseModel, block, start, end, _remove, _add) {
			var iter = annotationModel.getAnnotations(block.start, block.end);
			while (iter.hasNext()) {
				var annotation = iter.next();
				if (annotation.type === mAnnotations.AnnotationType.ANNOTATION_WARNING) {
					_remove.push(annotation);
				}
			}
			this._computeAnnotations(annotationModel, baseModel, block, start, end, _add);
		},
		_computeAnnotations: function(annotationModel, baseModel, block, start, end, _add) {
			if (block.start <= end && start <= block.end) {
				if (block.typeId === this._TYPEID_HEADING) {
					if (block.tokens[0].depth === 6) {
						var text = baseModel.getText(block.start, block.contentStart);
						var match = this._leadingHashesRegex.exec(text);
						if (match && match[0].length > 6) {
							var annotation = mAnnotations.AnnotationType.createAnnotation(
								mAnnotations.AnnotationType.ANNOTATION_WARNING,
								block.start,
								block.start + match[0].length,
								messages.WarningHeaderTooDeep);
						}
					}
				} else if (block.typeId === this._TYPEID_LISTITEM) {
					text = baseModel.getText(block.start, block.contentStart + 1);
					this._orderedListRegex.lastIndex = 0;
					var itemIsOrdered = this._orderedListRegex.test(text);
					var listIsOrdered = block.parent.startToken.ordered;
					if (itemIsOrdered !== listIsOrdered) {
						annotation = mAnnotations.AnnotationType.createAnnotation(
							mAnnotations.AnnotationType.ANNOTATION_WARNING,
							block.start,
							block.contentStart,
							itemIsOrdered ? messages.WarningOrderedListItem : messages.WarningUnorderedListItem);
					} else {
						if (listIsOrdered && block.parent.getBlocks()[0] === block && text.indexOf("1.")) { //$NON-NLS-0$
							annotation = mAnnotations.AnnotationType.createAnnotation(
								mAnnotations.AnnotationType.ANNOTATION_WARNING,
								block.start,
								block.contentStart,
								messages.WarningOrderedListShouldStartAt1);
						}
					}
				} else if (block.typeId === this._TYPEID_PARAGRAPH) {
					text = baseModel.getText(block.start, block.end);
					var linkTokens = this._extractLinks(text);
//					var links;
					linkTokens.forEach(function(current) {
						var linkStart = block.start + current.index;
						if (!current.match[1]) {
							annotation = mAnnotations.AnnotationType.createAnnotation(
								mAnnotations.AnnotationType.ANNOTATION_WARNING,
								linkStart,
								linkStart + current.match[0].length,
								messages.WarningLinkHasNoText);
						} else {
							if (current.pattern === marked.InlineLexer.rules.link) {
								if (!current.match[2]) {
									annotation = mAnnotations.AnnotationType.createAnnotation(
										mAnnotations.AnnotationType.ANNOTATION_WARNING,
										linkStart,
										linkStart + current.match[0].length,
										messages.WarningLinkHasNoURL);
								}
							} else {
								/* reflink */
								// TODO need to react to ref definition changes
//								if (!links) {
//									var currentBlock = block;
//									while (currentBlock) {
//										if (currentBlock.links) {
//											links = currentBlock.links;
//											break;
//										}
//										currentBlock = currentBlock.parent;
//									}
//								}
//								var refName = current.match[2] || current.match[1];
//								if (!(links && links[refName])) {
//									annotation = mAnnotations.AnnotationType.createAnnotation(
//										mAnnotations.AnnotationType.ANNOTATION_WARNING,
//										linkStart,
//										linkStart + current.match[0].length,
//										"Undefined link reference: " + refName);
//								}
							}
						}
					});
				}
				if (annotation) {
					_add.push(annotation);
				}
			}

			block.getBlocks().forEach(function(current) {
				this._computeAnnotations(annotationModel, baseModel, current, start, end, _add);
			}.bind(this));
		},
		_extractLinks: function(text) {
			var result = [];
			var textIndex = 0;
			this._linkDetectRegex.lastIndex = 0;
			var potentialLinkMatch = this._linkDetectRegex.exec(text);
			while (potentialLinkMatch) {
				if (potentialLinkMatch.index) {
					textIndex += potentialLinkMatch.index;
					text = text.substring(potentialLinkMatch.index);
				}
				var pattern = marked.InlineLexer.rules.link;
				var match = pattern.exec(text);
				if (!match) {
					pattern = marked.InlineLexer.rules.reflink;
					match = pattern.exec(text);
				}
				if (match) {
					result.push({match: match, index: textIndex, pattern: pattern});
				}
				this._linkDetectRegex.lastIndex = match ? match[0].length : 1;
				potentialLinkMatch = this._linkDetectRegex.exec(text);
			}
			return result;
		},
		_generateHTML: function(rootElement, block) {
			if (!block.startToken && !block.tokens) {
				return;	 /* likely a block with only tokens for its parent */
			}

			var links = {};
			var current = block;
			while (current) {
				if (current.links) {
					links = current.links;
					break;
				}
				current = current.parent;
			}

			/*
			 * A block has either a set of its own content tokens, or a start/
			 * endToken pair and therefore likely child blocks and tokens.
			 */
			if (block.tokens) {
				/*
				 * Must pass a copy of block's tokens to marked because marked
				 * removes each token from the array as it is processed
				 */
				var parseTokens = block.tokens.slice();
				parseTokens.links = links;
				rootElement.innerHTML = marked.Parser.parse(parseTokens, markedOptions);
				return;
			}

			if (!block.startToken) {
				return; /* should not happen */
			}

			/* a container block (a list, list item or blockquote) */				
			
			parseTokens = [block.startToken, block.endToken];
			parseTokens.links = links;
			rootElement.innerHTML = marked.Parser.parse(parseTokens, markedOptions);

			var processParentTokens = function(parentTokens) {
				/*
				 * Create a stream of tokens with this block's start/end tokens (to provide
				 * context to marked) and the tokens being contributed from child blocks.
				 */
				parseTokens = [block.startToken].concat(parentTokens).concat(block.endToken);
				parseTokens.links = links;
				var tempElement = document.createElement("div"); //$NON-NLS-0$
				tempElement.innerHTML = marked.Parser.parse(parseTokens, markedOptions);
				var createdNodes = tempElement.children[0].childNodes;
				while (createdNodes.length) {
					rootElement.children[0].appendChild(createdNodes[0]);
				}				
			}.bind(this);

			/*
			 * Parent tokens are accumulated until either a child with its own content tokens is
			 * encountered or all children have been processed.  These tokens are then parsed
			 * together in order to provide needed context to marked.
			 */
			var accumulatedParentTokens = [];

			block.getBlocks().forEach(function(current) {
				if (current.parentTokens) {
					/* a child block that contributes all of its tokens to its parent */
					accumulatedParentTokens = accumulatedParentTokens.concat(current.parentTokens);
				} else {
					/* a child block with its own content tokens */
					
					/* first flush accumulated parent tokens */
					if (accumulatedParentTokens.length) {
						processParentTokens(accumulatedParentTokens);
						accumulatedParentTokens = [];
					}

					/* now process the child block */
					var newElement = document.createElement("div"); //$NON-NLS-0$
					this._generateHTML(newElement, current);
					newElement = newElement.children[0] || newElement;
					this._setElementIdentifier(newElement, current.elementId);
					rootElement.children[0].appendChild(newElement);
				}
			}.bind(this));
			
			/* flush any remaining parent tokens */
			if (accumulatedParentTokens.length) {
				processParentTokens(accumulatedParentTokens);
			}
		},
		_getLineStart: function(text, index) {
			while (0 <= --index) {
				var char = text.charAt(index);
				if (char === this._NEWLINE || char === this._CR) {
					return index + 1;
				}
			}
			return 0;
		},
		_getLineEnd: function(text, index, model, lineSkip) {
			lineSkip = lineSkip || 0;
			while (true) {
				this._newlineRegex.lastIndex = index;
				var result = this._newlineRegex.exec(text);
				if (!result) {
					return text.length;
				}
				index = result.index + result[0].length;
				if (!lineSkip--) {
					return index;
				}
			}
		},
		_isTop: function(block) {
			if (!block.typeId) {
				return true;
			}
			/* marked treats blockquote contents as top-level */
			if (block.typeId === "markup.quote.markdown") { //$NON-NLS-0$
				return this._isTop(block.parent);
			}
			return false;
		},
		_onBlocksChanged: function(e) {
			/*
			 * If a change was made within a block then a new Block was likely not created
			 * in response (instead its bounds were simply adjusted).  As a result the marked
			 * token will now be stale.  Detect this case and update the token here.
			 */
			if (e.oldBlocks.length === 1 && e.newBlocks.length === 1 && e.oldBlocks[0].elementId === e.newBlocks[0].elementId) {
				/*
				 * A change in the root block only occurs when whitespace beyond the last block is
				 * added/deleted, because the marked lexer groups all other whitespace occurrences
				 * into adjacent blocks.  If this is a change in the root block then just return,
				 * there's nothing to do here.
				 */
				if (!e.newBlocks[0].parent) {
					return;
				}

				var recomputedBlocks = this.computeBlocks(this.model, this.model.getText(e.oldBlocks[0].start, e.oldBlocks[0].end), e.oldBlocks[0].parent, e.oldBlocks[0].start);
				this._adoptTokens(e.newBlocks[0], recomputedBlocks[0]);
			}

			var oldBlocksIndex = 0, parentElement, i, j, children = [];
			if (e.oldBlocks.length) {
				var currentElement = this.getElementByIdentifier(e.oldBlocks[0].elementId);
				parentElement = currentElement.parentElement;
			} else {
				if (e.newBlocks.length) {
					parentElement = this.getElementByIdentifier(e.newBlocks[0].parent.elementId);
				}
				if (!parentElement) {
					parentElement = previewDiv;
				}
			}
			for (i = 0; i < parentElement.children.length; i++) {
				if (!currentElement || this.getElementIdentifier(parentElement.children[i]) === e.oldBlocks[0].elementId) {
					for (j = i; j < i + e.oldBlocks.length; j++) {
						children.push(parentElement.children[j]);
					}
					break;
				}
			}

			e.newBlocks.forEach(function(current) {
				/* create a new div with content corresponding to this block */
				var newElement = document.createElement("div"); //$NON-NLS-0$
				this._generateHTML(newElement, current);

				/* try to find an existing old block and DOM element corresponding to the current new block */
				for (i = oldBlocksIndex; i < e.oldBlocks.length; i++) {
					if (e.oldBlocks[i].elementId === current.elementId) {
						/*
						 * Found it.  If any old blocks have been passed over during this search
						 * then remove their elements from the DOM as they no longer exist.
						 */
						var element = children[i];
						for (j = i - 1; oldBlocksIndex <= j; j--) {
							parentElement.removeChild(children[j]);
						}
						oldBlocksIndex = i + 1;

						this._updateNode(element, newElement.children[0] || newElement);
						break;
					}
				}

				if (i === e.oldBlocks.length) {
					/*
					 * An existing block was not found, so there is not an existing corresponding
					 * DOM element to reuse.  Create one now.
					 */
					element = document.createElement("div"); //$NON-NLS-0$
					this._updateNode(element, newElement);
					element = element.children[0] || element;
					if (children.length) {
						parentElement.insertBefore(element, children[oldBlocksIndex]);
					} else {
						parentElement.appendChild(element);
					}
					this._setElementIdentifier(element, current.elementId);
				}
			}.bind(this));

			/* all new blocks have been processed, so remove all remaining old elements that were not reused */
			for (i = e.oldBlocks.length - 1; oldBlocksIndex <= i; i--) {
				parentElement.removeChild(children[i]);
			}
		},
		_setElementIdentifier: function(element, id) {
			var isSelected = element.className.indexOf(this._markdownSelected) !== -1;
			element.className = id + (isSelected ? " " + this._markdownSelected : ""); //$NON-NLS-0$
		},
		_updateMatch: function(match, text, matches, minimumIndex) {
			match.pattern.regex.lastIndex = minimumIndex;
			var result = match.pattern.regex.exec(text);
			if (result) {
				match.result = result;
				for (var i = 0; i < matches.length; i++) {
					if (result.index < matches[i].result.index || (result.index === matches[i].result.index && match.pattern.index < matches[i].pattern.index)) {
						matches.splice(i, 0, match);
						return;
					}
				}
				matches.push(match);
			}
		},
		_updateNode: function(targetNode, newNode) {
			if (targetNode.nodeName !== newNode.nodeName) {
				/* node types do not match, must replace the target node in the parent */
				targetNode.parentElement.replaceChild(newNode, targetNode);
				/* retain the targetNode's identifier in its replacement */
				this._setElementIdentifier(newNode, this.getElementIdentifier(targetNode));
				return;
			}
			
			/* modify the existing node */

			if (newNode.nodeName === "#text") { //$NON-NLS-0$
				targetNode.textContent = newNode.textContent;
				return;
			} else if (newNode.nodeName === "IMG") { //$NON-NLS-0$
				if (targetNode.src !== newNode.src) {
					targetNode.parentElement.replaceChild(newNode, targetNode);
					return;
				}
			} else if (newNode.nodeName === "TH" || newNode.nodeName === "TD") { //$NON-NLS-1$ //$NON-NLS-0$
				targetNode.style.textAlign = newNode.style.textAlign;
			}

			var targetNodesIndex = 0;
			var targetNodes = [], newNodes = [];
			var temp = targetNode.childNodes;
			for (var i = 0; i < temp.length; i++) {
				targetNodes.push(temp[i]);
			}
			temp = newNode.childNodes;
			for (i = 0; i < temp.length; i++) {
				newNodes.push(temp[i]);
			}

			newNodes.forEach(function(currentNode) {
				/* try to find an existing node that can be adapted to the current node */
				var node = null;
				for (i = targetNodesIndex; i < targetNodes.length; i++) {
					if (targetNodes[i].nodeName === currentNode.nodeName) {
						/*
						 * Found one.  If any nodes have been passed over during this search
						 * then remove them from the DOM as they no longer exist.
						 */
						node = targetNodes[i];
						for (var j = i - 1; targetNodesIndex <= j; j--) {
							targetNode.removeChild(targetNodes[j]);
						}
						targetNodesIndex = i + 1;
						break;
					}
				}

				if (!node) {
					/* an existing node was not found to reuse, so just insert the new one */
					if (targetNodes.length) {
						targetNode.insertBefore(currentNode, targetNodes[targetNodesIndex]);
					} else {
						targetNode.appendChild(currentNode);
					}
				} else {
					this._updateNode(node, currentNode);
				}
			}.bind(this));

			/* all new nodes have been processed, so remove all remaining target nodes that were not reused */
			for (i = targetNodes.length - 1; targetNodesIndex <= i; i--) {
				targetNode.removeChild(targetNodes[i]);
			}
		},
		_CR: "\r", //$NON-NLS-0$
		_NEWLINE: "\n", //$NON-NLS-0$
		_TYPEID_HEADING: "markup.heading.markdown", //$NON-NLS-0$
		_TYPEID_LISTITEM: "markup.list.item.markdown", //$NON-NLS-0$
		_TYPEID_PARAGRAPH: "markup.other.paragraph.markdown", //$NON-NLS-0$
		_atxDetectRegex: /\s*#/g,
		_blockquoteRemoveMarkersRegex: /^[ \t]*>[ \t]?/gm,
		_blockquoteStartRegex: /[ \t]*>[ \t]?/g,
		_blocksCache: {},
		_elementCounter: 0,
		_hrRegex: /([ \t]*[-*_]){3,}/g,
		_htmlNewlineRegex: /\n\s*\S[\s\S]*$/g,
		_leadingHashesRegex: /^#*/,
		_linkDetectRegex: /!?\[/g,
		_newlineRegex: /\n/g,
		_orderedListRegex: /\d+\.[ \t]/g,
		_spacesAndTabsRegex: /[ \t]*/g,
		_whitespaceRegex: /\s+/g
	};

	var _imageCache = {};

	function filterOutputLink(resourceURL, fileClient, isRelative) {
		return function(cap, link) {
			if (link.href.indexOf(":") === -1) { //$NON-NLS-0$
				try {
					var linkURL;
					if (resourceURL.protocol === "filesystem:") { //$NON-NLS-0$
						linkURL = {
							href: "filesystem:" + (new URL(link.href, resourceURL.pathname)).href //$NON-NLS-0$
						};
					} else {
						linkURL = new URL(link.href, resourceURL);
						if (isRelative) {
							linkURL.protocol = "";
							linkURL.host = "";
						}
					}
					if (cap[0][0] !== '!') { //$NON-NLS-0$
						/*
						 * TODO: should not need to remove the URL hash to create a link that opens in the markdown editor
						 * 
						 * eg.- http://...,editor=orion.editor.markdown#hash works fine, but uriTemplate generates 
						 * http://...#hash,editor=orion.editor.markdown for this, which does not work.  Since the
						 * markdown editor does not currently acknowledge hashes, removing it here does not hurt anything.
						 * However if the editor began opening to hashes then this would be removing a valuable piece
						 * of the URL.  Need to determine if uriTemplate is creating an invalid URL, or if the editor
						 * opener that looks at the URL is handling this case incorrectly.
						 */
						linkURL.hash = "";
						link.href = uriTemplate.expand({
							resource: linkURL.href,
							params: "editor=orion.editor.markdown" //$NON-NLS-0$
						});
					} else {
						var entry = _imageCache[linkURL.href];
						if (entry) {
							return "<img id='" + entry.id + "' src='" + (entry.src ? entry.src : "") + "'>"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						}

						if (fileClient.readBlob) {
							var id = "_md_img_" + imgCount++; //$NON-NLS-0$
							(function(id, href) {
								fileClient.readBlob(href).then(
									function(bytes) {
										var extensionMatch = href.match(extensionRegex);
										var mimeType = extensionMatch ? "image/" +extensionMatch[1] : "image/png"; //$NON-NLS-1$ //$NON-NLS-0$
										var objectURL = URL.createObjectURL(new Blob([bytes], {type: mimeType}));
										var element = document.getElementById(id);
										if (element) {
											element.src = objectURL;
											// URL.revokeObjectURL(objectURL); /* cache image data for reuse (revoke when editor is destroyed) */
											_imageCache[href] = {id: id, src: objectURL};
										} else {
											/* element was removed during the image retrieval */
											URL.revokeObjectURL(objectURL);
										}
									}.bind(this),
									function(/*e*/) {
										var element = document.getElementById(id);
										if (element) {
											element.src = "missing"; //$NON-NLS-0$
										}
									}.bind(this));
							}.bind(this))(id, linkURL.href);
							return "<img id='" + id + "' src=''>";	//$NON-NLS-1$ //$NON-NLS-0$			
						}
						link.href = linkURL.href;
					}
				} catch(e) {
					window.console.log(e); // best effort
				}				
			}
			return markedOutputLink.call(this, cap, link);
		};
	}

	function exportHTML(text, fileService, metadata, statusService) {
		var oldOutputLink = marked.InlineLexer.prototype.outputLink;
		marked.InlineLexer.prototype.outputLink = markedOutputLink;
		var html = marked.parse(text, markedOptions);
		marked.InlineLexer.prototype.outputLink = oldOutputLink;

		var name = metadata.Name;
		var match = /(.*)\.[^.]*$/.exec(name);
		if (match) {
			name = match[1];
		}
		var counter = 0;

		function writeFileFn(file) {
			/*
			 * The file creation succeeded, so send a "create" notification so that
			 * listeners like the navigator will update.
			 */			
			var dispatcher = mFileCommands.getModelEventDispatcher();
			if (dispatcher && typeof dispatcher.dispatchEvent === "function") { //$NON-NLS-0$
				dispatcher.dispatchEvent({type: "create", parent: file.Parents[0]}); //$NON-NLS-0$
			}

			fileService.write(file.Location, html).then(
				function() {
					statusService.setProgressResult({Message: i18nUtil.formatMessage(messages["Wrote: ${0}"], file.Name), Severity:"Normal"}); //$NON-NLS-0$
				},
				function(error) {
					if (!error.responseText) {
						error = {Message: messages["UnknownError"], Severity: "Error"}; //$NON-NLS-0$
					}
					statusService.setProgressResult(error);
				}
			);
		}
		function fileCreateFailedFn(error) {
			if (error.status === 412 && counter < 99) {
				/*
				 * The likely problem is a collision with an existing file with
				 * the attempted name, so try again with an incremented name.
				 */
				counter++;
				createFileFn();
			} else {
				if (!error.responseText) {
					error = {Message: messages["UnknownError"], Severity: "Error"}; //$NON-NLS-0$
				}
				statusService.setProgressResult(error);
			}
		}
		function createFileFn() {
			var testName = counter ? name + "(" + counter + ").html" : name + ".html"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			fileService.createFile(metadata.Parents[0].Location, testName).then(writeFileFn, fileCreateFailedFn);
		}

		createFileFn();
	}

	var BaseEditor = mEditor.BaseEditor;
	function MarkdownEditor(options) {
		this.id = "orion.editor.markdown"; //$NON-NLS-0$
		this._fileService = options.fileService;
		this._metadata = options.metadata;
		this._parent = options.parent;
		this._model = options.model;
		this._editorView = options.editorView;

		this._previewClickListener = function(e) {
			var target = this._findNearestBlockElement(e.target);
			if (!target) {
				/* click was not on a preview element */
				return;
			}

		    var elementBounds = target.getBoundingClientRect();
		    var selectionPercentageWithinElement = (e.clientY - elementBounds.top) / (elementBounds.bottom - elementBounds.top);

			var textView = this._editorView.editor.getTextView();
			var block = this._stylerAdapter.getBlockWithId(this._stylerAdapter.getElementIdentifier(target));
			var projectionModel = textView.getModel();
			var projectionBlockStart = projectionModel.mapOffset(block.start, true);
			while (projectionBlockStart === -1) {
				/*
				 * Indicates that the block corresponding to the target element is within a collapsed ancestor,
				 * so it is not visible in the source editor at all.  Move up to its parent block.
				 */
				block = block.parent;
				projectionBlockStart = projectionModel.mapOffset(block.start, true);
			}
			var blockTop = textView.getLocationAtOffset(projectionBlockStart);
			var projectionBlockEnd = projectionModel.mapOffset(block.end, true);
			if (projectionBlockEnd === -1) {
				/*
				 * Indicates that the block bottom is within a collapsed section.
				 * Find the block that is collapsed and make its start line the
				 * end line to center on.
				 */
				var currentBlock = this._styler.getBlockAtIndex(block.end - 1);
				while (projectionBlockEnd === -1) {
					currentBlock = currentBlock.parent;
					projectionBlockEnd = projectionModel.mapOffset(currentBlock.start, true);
				}
			}
			var blockBottom = textView.getLocationAtOffset(projectionBlockEnd);
			var lineIndex = textView.getLineAtOffset(projectionBlockEnd);
			blockBottom.y += textView.getLineHeight(lineIndex);
			var blockAlignY = blockTop.y + (blockBottom.y - blockTop.y) * selectionPercentageWithinElement;

			var editorBounds = this._editorDiv.getBoundingClientRect();
			if (this._splitter.getOrientation() === mSplitter.ORIENTATION_VERTICAL) {
				var elementRelativeY = editorBounds.height / 2;
			} else {
				elementRelativeY = e.clientY - editorBounds.top;
			}

			this._scrollSourceEditor(blockAlignY - elementRelativeY);
		}.bind(this);

		this._settingsListener = function(e) {
			this._styler.setWhitespacesVisible(e.newSettings.showWhitespaces, true);
		}.bind(this);

		this._sourceScrollListener = function(e) {
			if (this._ignoreEditorScrollsCounter) {
				this._ignoreEditorScrollsCounter--;
				return;
			}

			if (!e.newValue.y) {
				/* the editor is now at the top so ensure that preview is at its top as well */
				this._scrollPreviewDiv(0);
				return;
			}

			var textView = this._editorView.editor.getTextView();
			var bottomIndex = textView.getBottomIndex();
			if (bottomIndex === textView.getModel().getLineCount() - 1) {
				/* the editor is now at the bottom so ensure that preview is at its bottom as well */
				this._scrollPreviewDiv(this._previewWrapperDiv.scrollHeight);
				return;
			}
			/*
			 * If the caret is within the viewport then align according to its location.
			 * If the caret is not within the viewport then align on the text view's
			 * vertical mid-way point.
			 */
			var topIndex = textView.getTopIndex();
			var caretOffset = textView.getCaretOffset();
			var lineIndex = textView.getLineAtOffset(caretOffset);
			if (topIndex <= lineIndex && lineIndex <= bottomIndex) {
				var charIndex = caretOffset;
			} else {
				charIndex = textView.getOffsetAtLocation(0, Math.floor(e.newValue.y + this._previewWrapperDiv.clientHeight / 2));
			}
			charIndex = textView.getModel().mapOffset(charIndex);

			var block = this._styler.getBlockAtIndex(charIndex);
			var element = this._stylerAdapter.getElementByIdentifier(block.elementId);
			while (!element) {
				if (!block.parent) {
					/* have reached the root block */
					break;
				}
				block = block.parent;
				element = this._stylerAdapter.getElementByIdentifier(block.elementId);
			}
			this._alignPreviewOnSourceBlock(block, charIndex);
		}.bind(this);

		this._sourceSelectionListener = function(e) {
			var model = this._editorView.editor.getTextView().getModel();
			var selectionIndex = model.mapOffset(e.newValue.start);
			var block = this._styler.getBlockAtIndex(selectionIndex);

			var element = this._stylerAdapter.getElementByIdentifier(block.elementId);
			while (!element) {
				if (!block.parent) {
					/* have reached the root block */
					break;
				}
				block = block.parent;
				element = this._stylerAdapter.getElementByIdentifier(block.elementId);
			}

			if (this._selectedElement && this._selectedElement !== element) {
				this._selectedElement.classList.remove(this._markdownSelected);
			}
			this._selectedElement = element;
			this._selectedBlock = block;

			if (this._selectedElement) {
				this._selectedElement.classList.add(this._markdownSelected);
			}

			/*
			 * If the new selection is within the viewport then scroll the preview
			 * pane to match it.  If the selection is outside of the viewport then
			 * do not scroll the preview pane here, the subsequently-called scroll
			 * event listener will take care of this.
			 */
			var textView = this._editorView.editor.getTextView();
			var lineIndex = textView.getLineAtOffset(e.newValue.start);
			var topIndex = textView.getTopIndex(true);
			var bottomIndex = textView.getBottomIndex(true);
			if (!(topIndex <= lineIndex && lineIndex <= bottomIndex)) {
				/* new selection is outside of the viewport */
				return;
			}

			this._alignPreviewOnSourceBlock(block, selectionIndex);
		}.bind(this);

		this._splitterResizeListener = function(/*e*/) {
			this._editorView.editor.resize();
		}.bind(this);

		BaseEditor.apply(this, arguments);
	}

	MarkdownEditor.prototype = Object.create(BaseEditor.prototype);
	objects.mixin(MarkdownEditor.prototype, /** @lends orion.edit.MarkdownEditor.prototype */ {
		getPaneOrientation: function() {
			return this._splitter.getOrientation();
		},
		initSourceEditor: function() {
			var editor = this._editorView.editor;
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			this._stylerAdapter = new MarkdownStylingAdapter(this._model, this._metadata.Location, this._fileService);
			this._styler = new mTextStyler.TextStyler(textView, annotationModel, this._stylerAdapter);

			this._editorView.editor.getTextView().addEventListener("Scroll", this._sourceScrollListener); //$NON-NLS-0$
			this._editorView.editor.getTextView().addEventListener("Selection", this._sourceSelectionListener); //$NON-NLS-0$
			this._splitter.addEventListener("resize", this._splitterResizeListener); //$NON-NLS-0$
			previewDiv.addEventListener("click", this._previewClickListener); //$NON-NLS-0$

			/*
			 * If the model already has content then it is being shared with a previous
			 * editor that was open on the same resource.  In this case this editor's
			 * styler adapter must be expicitly requested to initially populate its
			 * preview pane because there will not be a #setInput() invocation or model
			 * change event to trigger it.
			 */
			if (this._model.getCharCount()) {
				this._stylerAdapter.initialPopulatePreview();
			}

			var settings = this._editorView.getSettings();
			this._styler.setWhitespacesVisible(settings.showWhitespaces, true);
		},
		install: function() {
			this._rootDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.style.position = "absolute"; //$NON-NLS-0$
			this._rootDiv.style.width = "100%"; //$NON-NLS-0$
			this._rootDiv.style.height = "100%"; //$NON-NLS-0$
			this._parent.appendChild(this._rootDiv);

			this._editorDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.appendChild(this._editorDiv);	
			this._editorView.setParent(this._editorDiv);

			this._splitterDiv = document.createElement("div"); //$NON-NLS-0$
			this._splitterDiv.id = "orion.markdown.editor.splitter";
			this._rootDiv.appendChild(this._splitterDiv);			

			this._previewWrapperDiv = document.createElement("div"); //$NON-NLS-0$
			this._previewWrapperDiv.style.overflowX = "hidden"; //$NON-NLS-0$
			this._previewWrapperDiv.style.overflowY = "auto"; //$NON-NLS-0$
			this._rootDiv.appendChild(this._previewWrapperDiv);
			
			previewDiv = document.createElement("div"); //$NON-NLS-0$
			previewDiv.classList.add("orionMarkdown"); //$NON-NLS-0$
			this._previewWrapperDiv.appendChild(previewDiv);

			this._editorView.addEventListener("Settings", this._settingsListener); //$NON-NLS-0$

			this._splitter = new mSplitter.Splitter({
				node: this._splitterDiv,
				sidePanel: this._editorDiv,
				mainPanel: this._previewWrapperDiv,
				toggle: true,
				closeReversely: true
			});
			toggleOrientationCommand.checked = this._splitter.getOrientation() === mSplitter.ORIENTATION_HORIZONTAL;

			BaseEditor.prototype.install.call(this);
		},
		togglePaneOrientation: function() {
			var orientation = this._splitter.getOrientation() === mSplitter.ORIENTATION_VERTICAL ? mSplitter.ORIENTATION_HORIZONTAL : mSplitter.ORIENTATION_VERTICAL;
			this._splitter.setOrientation(orientation);
		},
		uninstall: function() {
			this._styler.destroy();
			this._editorView.removeEventListener("Settings", this._settingsListener); //$NON-NLS-0$
			var textView = this._editorView.editor.getTextView();
			textView.removeEventListener("Scroll", this._sourceScrollListener); //$NON-NLS-0$
			textView.removeEventListener("Selection", this._sourceSelectionListener); //$NON-NLS-0$
			this._splitter.removeEventListener("resize", this._splitterResizeListener); //$NON-NLS-0$
			previewDiv.removeEventListener("click", this._previewClickListener); //$NON-NLS-0$
			lib.empty(this._parent);
			BaseEditor.prototype.uninstall.call(this);
		},
		_alignPreviewOnSourceBlock: function(block, selectionIndex) {
			var textView = this._editorView.editor.getTextView();
			var projectionModel = textView.getModel();
			var element = this._stylerAdapter.getElementByIdentifier(block.elementId);
			if (element) {
				var projectionBlockStart = projectionModel.mapOffset(block.start, true);
				var projectionBlockEnd = projectionModel.mapOffset(block.end, true);
				if (projectionBlockEnd === -1) {
					/*
					 * Indicates that the block bottom is within a collapsed section.
					 * Find the block that is collapsed and make its start line the
					 * end line to center on.
					 */
					var currentBlock = this._styler.getBlockAtIndex(block.end - 1);
					while (projectionBlockEnd === -1) {
						currentBlock = currentBlock.parent;
						projectionBlockEnd = projectionModel.mapOffset(currentBlock.start, true);
					}
				}
				var sourceAlignTop = textView.getLocationAtOffset(projectionBlockStart);
				var sourceAlignBottom = textView.getLocationAtOffset(projectionBlockEnd);
				var lineIndex = textView.getLineAtOffset(projectionBlockEnd);
				var lineHeight = textView.getLineHeight(lineIndex);
				sourceAlignBottom.y += lineHeight;
			 } else {
				/* selection is in whitespace in the root block */
				var childIndex = block.getBlockAtIndex(selectionIndex);
				var subBlocks = block.getBlocks();
				var start = childIndex ? subBlocks[childIndex - 1].end : 0;
				if (childIndex < subBlocks.length) {
					var end = subBlocks[childIndex].start;
				} else {
					/* beyond end of last block */
					end = this._model.getCharCount();
				}
				sourceAlignTop = textView.getLocationAtOffset(projectionModel.mapOffset(start, true));
				var projectionEnd = projectionModel.mapOffset(end, true);
				sourceAlignBottom = textView.getLocationAtOffset(projectionEnd);
				lineIndex = textView.getLineAtOffset(projectionEnd);
				lineHeight = textView.getLineHeight(lineIndex);
				sourceAlignBottom.y += lineHeight;
			}
			var sourceAlignHeight = sourceAlignBottom.y - sourceAlignTop.y;
			var selectionLocation = textView.getLocationAtOffset(projectionModel.mapOffset(selectionIndex, true));
			if (sourceAlignBottom.y - sourceAlignTop.y === lineHeight) {
				/* block is on a single line, center on the line's mid-height */
				selectionLocation.y += textView.getLineHeight() / 2; /* default line height */
			} else {
				selectionLocation.y += textView.getLineHeight(); /* default line height */
			}
			var selectionPercentageWithinBlock = (selectionLocation.y - sourceAlignTop.y) / sourceAlignHeight;
			var previewBounds = this._previewWrapperDiv.getBoundingClientRect();
			if (this._splitter.getOrientation() === mSplitter.ORIENTATION_VERTICAL) {
				var sourceRelativeY = (previewBounds.bottom - previewBounds.top) / 2;
			} else {
				sourceRelativeY = selectionLocation.y - textView.getTopPixel();
			}

			if (element) {
				var elementBounds = element.getBoundingClientRect();
				var elementTop = elementBounds.top - previewBounds.top + this._previewWrapperDiv.scrollTop;
				var elementAlignY = elementTop + element.offsetHeight * selectionPercentageWithinBlock;
			} else {
				if (childIndex < subBlocks.length) {
					var nextElement = this._stylerAdapter.getElementByIdentifier(subBlocks[childIndex].elementId);
					var nextElementTop = nextElement.getBoundingClientRect().top;
				} else {
					/* beyond end of last block */
					nextElementTop = previewBounds.bottom;
				}
				if (childIndex) {
					var previousElement = this._stylerAdapter.getElementByIdentifier(subBlocks[childIndex - 1].elementId);
					var previousElementBottom = previousElement.getBoundingClientRect().bottom;
				} else {
					previousElementBottom = 0;
				}
				var previousElementRelativeBottom = previousElementBottom - previewBounds.top + this._previewWrapperDiv.scrollTop;
				elementAlignY = previousElementRelativeBottom + (nextElementTop - previousElementBottom) * selectionPercentageWithinBlock;
			}
			this._scrollPreviewDiv(elementAlignY - sourceRelativeY);
		},
		_findNearestBlockElement: function(element) {
			if (element === previewDiv) {
				/* have reached the preview root, do not look any farther */
				return null;
			}

			/* try siblings first, nearest-to-farthest */
			var nextSibling = element;
			var previousSibling = element;
			var siblingUpdated = true;
			while (siblingUpdated) {
				siblingUpdated = false;
				if (nextSibling) {
					if (!this._stylerAdapter.getElementIdentifier(nextSibling).indexOf(ID_PREFIX)) {
						return nextSibling;
					}
					nextSibling = nextSibling.nextElementSibling;
					siblingUpdated = true;
				}
				if (previousSibling) {
					if (!this._stylerAdapter.getElementIdentifier(previousSibling).indexOf(ID_PREFIX)) {
						return previousSibling;
					}
					previousSibling = previousSibling.previousElementSibling;
					siblingUpdated = true;
				}
			}

			/* did not find a sibling to use, so move up to the parent element */
			return this._findNearestBlockElement(element.parentElement);
		},
		_scrollPreviewDiv: function(top) {
			if (this._scrollPreviewAnimation) {
				this._scrollPreviewAnimation.stop();
				this._scrollPreviewAnimation = null;
			}

			var pixelY = top - this._previewWrapperDiv.scrollTop;
			if (!pixelY) {
				return;
			}

			var settings = this._editorView.getSettings();
			this._scrollPreviewAnimation = new mTextUtil.Animation({
				window: window,
				curve: [pixelY, 0],
				duration: settings.scrollAnimation ? settings.scrollAnimationTimeout : 0,
				onAnimate: function(x) {
					var deltaY = pixelY - Math.floor(x);
					this._previewWrapperDiv.scrollTop += deltaY;
					pixelY -= deltaY;
				}.bind(this),
				onEnd: function() {
					this._scrollPreviewAnimation = null;
					this._previewWrapperDiv.scrollTop += pixelY;
				}.bind(this)
			});

			this._scrollPreviewAnimation.play();	
		},
		_scrollSourceEditor: function(top) {
			if (this._scrollSourceAnimation) {
				this._scrollSourceAnimation.stop();
				this._scrollSourceAnimation = null;
			}

			var textView = this._editorView.editor.getTextView(); 
			var pixelY = top - textView.getTopPixel();
			if (!pixelY) {
				return;
			}

			var settings = this._editorView.getSettings();
			this._scrollSourceAnimation = new mTextUtil.Animation({
				window: window,
				curve: [pixelY, 0],
				duration: settings.scrollAnimation ? settings.scrollAnimationTimeout : 0,
				onAnimate: function(x) {
					var deltaY = pixelY - Math.floor(x);
					textView.setTopPixel(textView.getTopPixel() + deltaY);
					pixelY -= deltaY;
				}.bind(this),
				onEnd: function() {
					this._scrollSourceAnimation = null;
					var finalValue = Math.floor(textView.getTopPixel() + pixelY);
					this._ignoreEditorScrollsCounter = 1;
					textView.setTopPixel(finalValue);
				}.bind(this)
			});

			this._ignoreEditorScrollsCounter = Infinity;
			this._scrollSourceAnimation.play();	
		},
		_markdownSelected: "markdownSelected", //$NON-NLS-0$
		_selectedBlock: null
	});

	function MarkdownEditorView(options) {
		this._options = options;

		var ID = "markdown.generate.html"; //$NON-NLS-0$
		var generateCommand = new mCommands.Command({
			name: messages["GenerateHTML"],
			tooltip: messages["GenerateHTMLTooltip"],
   			id: ID,
			visibleWhen: function() {
				return !!this._options;
			}.bind(this),
			callback: function(/*data*/) {
				var textView = options.editorView.editor.getTextView();
				var text = textView.getText();
				exportHTML(text, options.fileService, options.metadata, options.statusService);
			}
		});
		options.commandRegistry.addCommand(generateCommand);
		options.commandRegistry.registerCommandContribution(
			options.menuBar.toolsActionsScope,
			ID,
			1,
			"orion.menuBarToolsGroup",
			false,
			new mKeyBinding.KeyBinding("G", true, false, true)); //$NON-NLS-1$ //$NON-NLS-0$

		ID = "markdown.toggle.orientation"; //$NON-NLS-0$
		toggleOrientationCommand = new mCommands.Command({
   			id: ID,
			callback: function(/*data*/) {
				this.editor.togglePaneOrientation();
			}.bind(this),
			type: "switch", //$NON-NLS-0$
			imageClass: "core-sprite-split-pane-orientation", //$NON-NLS-0$
			tooltip: messages["TogglePaneOrientationTooltip"],
			visibleWhen: function() {
				return !!this._options;
			}.bind(this),
		});
		options.commandRegistry.addCommand(toggleOrientationCommand);
		options.commandRegistry.registerCommandContribution("settingsActions", ID, 1, null, false); //$NON-NLS-0$
	}
	MarkdownEditorView.prototype = {
		create: function() {
			this.editor = new MarkdownEditor(this._options);
			this.editor.install();
			this._options.editorView.create();
			this.editor.initSourceEditor();
		},
		destroy: function() {
			this.editor.destroy();
			this.editor = null;
			this._options.editorView.destroy();
			this._options.editorView = null;

			/* release cached image data */
			var keys = Object.keys(_imageCache);
			keys.forEach(function(key) {
				var current = _imageCache[key];
				URL.revokeObjectURL(current.src);
			});
			_imageCache = {};
			this._options = null;
		}
	};

	return {
		MarkdownEditorView: MarkdownEditorView
	};
});
