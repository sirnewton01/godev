/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document window URL console Blob*/
define([
	'marked/marked',
	'orion/editor/editor',
	'orion/editor/textStyler',
	'orion/editor/util',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/URITemplate',
	'orion/webui/splitter', 
	'orion/URL-shim'
], function(marked, mEditor, mTextStyler, mTextUtil, objects, lib, URITemplate, mSplitter) {

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	var extensionRegex = /\.([0-9a-z]+)(?:[\?#]|$)/i;
	var imgCount = 0;

	var ID_PREFIX = "_orionMDBlock"; //$NON-NLS-0$
	var ID_PREVIEW = "_previewDiv"; //$NON-NLS-0$

	var MarkdownStylingAdapter = function(model, resource, fileClient) {
		this.model = model;

		/* relativize marked's outputLink */
		var outputLink = marked.InlineLexer.prototype.outputLink;
		var resourceURL = new URL(resource, window.location.href);
		marked.InlineLexer.prototype.outputLink = filterOutputLink(outputLink, resourceURL, fileClient, resource.indexOf(":") === -1); //$NON-NLS-0$

		this._markedOptions = marked.parse.defaults;
		this._markedOptions.sanitize = true;
		this._markedOptions.tables = true;

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

		this._blockquoteRemoveMarkersRegex = /^[ \t]*>[ \t]?/gm;
		this._blockquoteStartRegex = /[ ]*>/g;
		this._blockquoteRegex = /(?:[ \\t]*>[^\r\n]+(?:\r?\n[ \\t]*\S[^\r\n]*)*(?:\r?\n)*)+/g; /* based on marked.Lexer.rules.normal.blockquote */
		this._listRegex = /([ \t]*)(?:[*+-]|\d+\.)[ \t][\s\S]+?(?:([ \t]*[-*_]){3,}[ \t]*(?:(\r?\n)+|$)|(\s*\r?\n){2,}(?![ \t])(?!\1(?:[*+-]|\d+\.)[ \t])(\r?\n)*|\s*$)/g; /* based on marked.Lexer.rules.normal.list */
	};
	
	MarkdownStylingAdapter.prototype = {
		blockSpansBeyondEnd: function(/*block*/) {
			return false;
		},
		computeBlocks: function(model, text, block, offset/*, startIndex, endIndex, maxBlockCount*/) {
			var index = 0;
			var indexAdjustments = [];
			var result = [];
			if (block.typeId) {
				if (block.typeId === "markup.quote.markdown") { //$NON-NLS-0$
					this._blockquoteRemoveMarkersRegex.lastIndex = 0;
					var match = this._blockquoteRemoveMarkersRegex.exec(text);
					while (match) {
						indexAdjustments.push({index: match.index, length: match[0].length});
						match = this._blockquoteRemoveMarkersRegex.exec(text);
					}
					text = text.replace(this._blockquoteRemoveMarkersRegex, "");
				} else if (block.typeId.indexOf("markup.list.") === 0) { //$NON-NLS-0$
					return result; // TODO
				} else {
					/* only blockquotes and lists have their contents parsed into sub-blocks */
					return result;
				}
			}

			var bounds, name, end, newlines;			
			var tokens = marked.lexer(text, this.markedOptions);
			for (var i = 0; i < tokens.length; i++) {
				var customTokenSet = null;
				name = null;
				this._whitespaceRegex.lastIndex = index;
				var whitespaceResult = this._whitespaceRegex.exec(text);
				if (whitespaceResult && whitespaceResult.index === index) {
					index += whitespaceResult[0].length;
				}

				if (tokens[i].type === "heading") { //$NON-NLS-0$
					var isSetext = text[index] !== "#"; //$NON-NLS-0$
					var lineEnd = this._getLineEnd(text, index, model);
					end = isSetext ? this._getLineEnd(text, index, model, 1) : lineEnd;

					/*
					 * marked considers setext-style headers to end at the last non-'-' or '='
					 * character on the underline line.  Determine this index, and if it preceeds
					 * the current end value by more than the newline then move end back to this
					 * index.
					 */
					if (isSetext) {
						var underlineLine = text.substring(lineEnd, end);
						this._setextUnderlineRegex.lastIndex = 0;
						match = this._setextUnderlineRegex.exec(underlineLine);
						if (match[0].length < underlineLine.length) {
							end -= underlineLine.length - match[0].length;
						}
					}

					bounds = {
						start: index,
						contentStart: index + (isSetext ? 0 : tokens[i].depth + 1),
						contentEnd: lineEnd,
						end: end
					};
					name = "markup.heading.markdown"; //$NON-NLS-0$
					index = end;
				} else if (tokens[i].type === "paragraph") { //$NON-NLS-0$
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
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					name = "markup.other.paragraph.markdown"; //$NON-NLS-0$
					index = end;
				} else if (tokens[i].type === "blockquote_start" || tokens[i].type === "list_start") { //$NON-NLS-1$ //$NON-NLS-0$
					/*
					 * The source ranges for blockquotes and lists cannot be reliably computed solely
					 * from their generated tokens because it is possible for inputs with varying line
					 * counts to produce identical token sets.  To handle this, use marked's regex's
					 * to compute the bounds for these elements.  The tokens that are internal to
					 * these elements are skipped over because the styler does not style blocks within
					 * blocks differently (eg.- blockquotes within lists).
					 */

					var startRegex, endRegex, endToken;
					if (tokens[i].type === "blockquote_start") { //$NON-NLS-0$
						startRegex = this._blockquoteStartRegex;
						endRegex = this._blockquoteRegex;
						endToken = "blockquote_end"; //$NON-NLS-0$
						name = "markup.quote.markdown"; //$NON-NLS-0$
					} else {
						startRegex = marked.Lexer.rules.normal.bullet;
						endRegex = this._listRegex;
						endToken = "list_end"; //$NON-NLS-0$
						name = tokens[i].ordered ? "markup.list.numbered.markdown" : "markup.list.unnumbered.markdown"; //$NON-NLS-1$ //$NON-NLS-0$
					}

					/*
					 * Skip through tokens that are internal to the element.  Note that these tokens can stack
					 * (eg.- a list within a list) so must be sure to find the _matching_ end token.
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
						j++;
					}

					/* compute the block's contentStart bound */
					startRegex.lastIndex = index;
					match = startRegex.exec(text);
					var contentStart = index + match[0].length;

					/* compute the block's end bound */
					endRegex.lastIndex = index;
					match = endRegex.exec(text);
					end = index + match[0].length;

					/* trim trailing blank lines from the end bound */
					this._trailingEmptyLinesRegex.lastIndex = 0;
					match = this._trailingEmptyLinesRegex.exec(match[0]);
					if (match && match[1]) {
						end -= match[1].length;
					}

					bounds = {
						start: index,
						contentStart: contentStart,
						contentEnd: end,
						end: end
					};

					if (tokens[i].type === "blockquote_start") { //$NON-NLS-0$
						customTokenSet = [tokens[i], tokens[j]];
					} else {
						customTokenSet = tokens.slice(i, j + 1);
					}

					i = j;
					index = end;
				} else if (tokens[i].type === "code") { //$NON-NLS-0$
					var start;
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
						name = "markup.raw.code.markdown"; //$NON-NLS-0$
					}

					bounds = {
						start: start,
						contentStart: index,
						contentEnd: end,
						end: end
					};
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
					index = end;
				} else if (tokens[i].type === "table") { //$NON-NLS-0$
					end = this._getLineEnd(text, index, model, tokens[i].cells.length + 1);
					bounds = {
						start: index,
						contentStart: index,
						contentEnd: end,
						end: end
					};
					name = "markup.other.table.gfm"; //$NON-NLS-0$
					index = end;
				}

				if (name) {
					bounds.start = this._adjustIndex(bounds.start, indexAdjustments) + offset;
					bounds.contentStart = this._adjustIndex(bounds.contentStart, indexAdjustments) + offset;
					bounds.contentEnd = this._adjustIndex(bounds.contentEnd, indexAdjustments) + offset;
					bounds.end = this._adjustIndex(bounds.end, indexAdjustments) + offset;
					var newBlock = this.createBlock(bounds, this._styler, model, block, name);

					if (block.name) {
						/* sub-blocks are not styled differently from their parent block */
						newBlock.name = block.name;
					}

					newBlock.tokens = customTokenSet || [tokens[i]];
					newBlock.tokens.links = tokens.links;
					newBlock.elementId = ID_PREFIX + this._elementCounter++;
					result.push(newBlock);
				}
			}

			return result;
		},
		computeStyle: function(/*block, model, offset*/) {
			return null;
		},
		createBlock: function(bounds, styler, model, parent, data) {
			return new mTextStyler.Block(bounds, data, data, styler, model, parent, null);
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
		getBlockWithId: function(id) {
			var blocks = this._styler.getRootBlock().getBlocks();
			for (var i = 0; i < blocks.length; i++) {
				if (blocks[i].elementId === id) {
					return blocks[i];
				}
			}
			return null;
		},
		getBracketMatch: function(/*block, text*/) {
			return null;
		},
		initialPopulatePreview: function() {
			/* hack, see the explaination in MarkdownEditor.initSourceEditor() */
			var rootBlock = this._styler.getRootBlock();
			this._onBlocksChanged({old: [], new: rootBlock.getBlocks()});
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
			}
			this._styler = styler;
			styler.addEventListener("BlocksChanged", this._onBlocksChanged.bind(this)); //$NON-NLS-0$
		},
		setView: function(view) {
			this._view = view;
		},
		verifyBlock: function(baseModel, text, block, changeCount) {
			var blocks = this.computeBlocks(baseModel, text, block.parent, block.start);
			return blocks.length === 1 && blocks[0].start === block.start && blocks[0].end === block.end + changeCount && blocks[0].typeId === block.typeId;
		},

		/** @private */
		_adjustIndex: function(index, adjustments) {
			for (var i = 0; i < adjustments.length; i++) {
				var current = adjustments[i];
				if (current.index <= index) {
					index += current.length;
				} else {
					break;
				}
			}
			return index;
		},
		_adoptTokens: function(targetBlock, sourceBlock) {
			targetBlock.tokens = sourceBlock.tokens;
			var targetSubBlocks = targetBlock.getBlocks();
			var sourceSubBlocks = sourceBlock.getBlocks();
			for (var i = 0; i < targetSubBlocks.length; i++) {
				this._adoptTokens(targetSubBlocks[i], sourceSubBlocks[i]);
			}
		},
		_generateHTML: function(rootElement, block) {
			/* must pass a copy of the tokens to marked because it removes them from the array during processing */
			var parseTokens = block.tokens.slice();
			parseTokens.links = block.tokens.links;
			rootElement.innerHTML = marked.Parser.parse(parseTokens, this._markedOptions);

			var subBlocks = block.getBlocks();
			subBlocks.forEach(function(current) {
				var newElement = document.createElement("div"); //$NON-NLS-0$
				newElement.id = current.elementId;
				rootElement.children[0].appendChild(newElement);
				this._generateHTML(newElement, current);
			}.bind(this));
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
		_onBlocksChanged: function(e) {
			/*
			 * If a change was made within a block then a new Block was likely not created
			 * in response (instead its bounds were simply adjusted).  As a result the marked
			 * token will now be stale.  Detect this case and update the token here.
			 */
			if (e.old.length === 1 && e.new.length === 1 && e.old.elementId === e.new.elementId) {
				/*
				 * A change in the root block only occurs when whitespace beyond the last block is
				 * added/deleted, because the marked lexer groups all other whitespace occurrences
				 * into adjacent blocks.  If this is a change in the root block then just return,
				 * there's nothing to do here.
				 */
				if (!e.new[0].parent) {
					return;
				}

				var recomputedBlocks = this.computeBlocks(this.model, this.model.getText(e.old[0].start, e.old[0].end), e.old[0].parent, e.old[0].start);
				this._adoptTokens(e.new[0], recomputedBlocks[0]);
			}

			var oldBlocksIndex = 0, parentElement, i, j, children = [];
			if (e.old.length) {
				var currentElement = document.getElementById(e.old[0].elementId);
				parentElement = currentElement.parentElement;
				for (i = 0; i < parentElement.children.length; i++) {
					if (parentElement.children[i].id === currentElement.id) {
						for (j = i; j < i + e.old.length; j++) {
							children.push(parentElement.children[j]);
						}
						break;
					}
				}
			} else {
				parentElement = document.getElementById(ID_PREVIEW);
			}

			e.new.forEach(function(current) {
				/* try to find an existing old block and DOM element corresponding to the current new block */
				var element = null;
				for (i = oldBlocksIndex; i < e.old.length; i++) {
					if (e.old[i].elementId === current.elementId) {
						/*
						 * Found it.  If any old blocks have been passed over during this search
						 * then remove their elements from the DOM as they no longer exist.
						 */
						element = children[i];
						for (j = i - 1; oldBlocksIndex <= j; j--) {
							parentElement.removeChild(children[j]);
						}
						oldBlocksIndex = i + 1;
						break;
					}
				}
				if (!element) {
					/*
					 * An existing block was not found, so there is not an existing corresponding
					 * DOM element to reuse.  Create one now.
					 */
					element = document.createElement("div"); //$NON-NLS-0$
					element.id = current.elementId;
					if (children.length) {
						parentElement.insertBefore(element, children[oldBlocksIndex]);
					} else {
						parentElement.appendChild(element);
					}
				}

				/* create a new div with content corresponding to this block */

				var newElement = document.createElement("div"); //$NON-NLS-0$

				this._generateHTML(newElement, current);
				this._updateNode(element, newElement);
			}.bind(this));

			/* all new blocks have been processed, so remove all remaining old elements that were not reused */
			for (i = e.old.length - 1; oldBlocksIndex <= i; i--) {
				parentElement.removeChild(children[i]);
			}
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
			/* modify the existing node */
			
			if (newNode.nodeName === "#text") {
				targetNode.textContent = newNode.textContent;
				return;
			} else if (newNode.nodeName === "IMG") {
				if (targetNode.src !== newNode.src) {
					targetNode.parentElement.replaceChild(newNode, targetNode);
					return;
				}
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
		_elementCounter: 0,
		_htmlNewlineRegex: /\n\s*\S[\s\S]*$/g,
		_newlineRegex: /\n/g,
		_orderedListRegex: /\d+\.[ \t]/g,
		_setextUnderlineRegex: /^[-=]+[ \t]*\r?\n?/g,
		_trailingEmptyLinesRegex: /\n(([ \t]*\r?\n)*)$/g,
		_unorderedListRegex: /[*+-][ \t]/g,
		_whitespaceRegex: /\s*/g
	};
	
	var _imageCache = {};
	
	function filterOutputLink(outputLink, resourceURL, fileClient, isRelative) {
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
							fileClient.readBlob(linkURL.href).then(function(bytes) {
								var extensionMatch = linkURL.href.match(extensionRegex);
								var mimeType = extensionMatch ? "image/" +extensionMatch[1] : "image/png"; //$NON-NLS-1$ //$NON-NLS-0$
								var objectURL = URL.createObjectURL(new Blob([bytes], {type: mimeType}));
								document.getElementById(id).src = objectURL;
								// URL.revokeObjectURL(objectURL); /* do not revoke, cache for reuse instead */
								_imageCache[linkURL.href].src = objectURL;
							}.bind(this));
							_imageCache[linkURL.href] = {id: id};
							return "<img id='" + id + "' src=''>";	//$NON-NLS-1$ //$NON-NLS-0$			
						}
						link.href = linkURL.href;
					}
				} catch(e) {
					console.log(e); // best effort
				}				
			}
			return outputLink.call(this, cap, link);
		};
	}

	var BaseEditor = mEditor.BaseEditor;
	function MarkdownEditor(options) {
		this.id = "orion.editor.markdown"; //$NON-NLS-0$
		this._fileService = options.fileService;
		this._metadata = options.metadata;
		this._parent = options.parent;
		this._model = options.model;
		this._editorView = options.editorView;

		this._previewMouseClickListener = function(e) {
			var target = e.target;
			while (target && target.id.indexOf(ID_PREFIX) !== 0) {
				target = target.parentElement;
			}

			if (!target) {
				// TODO find the next nearest?
				return;
			}

			var previewBounds = this._previewWrapperDiv.getBoundingClientRect();
		    var elementBounds = target.getBoundingClientRect();
		    var relativeTop = elementBounds.top - previewBounds.top;
		    var elementCentre = relativeTop + target.offsetHeight / 2;

			var block = this._stylerAdapter.getBlockWithId(target.id);
			var textView = this._editorView.editor.getTextView();
			var blockTop = textView.getLocationAtOffset(block.start);
			var blockBottom = textView.getLocationAtOffset(block.end);
			blockBottom.y += textView.getLineHeight();
			var blockCentre = blockTop.y + (blockBottom.y - blockTop.y) / 2;
			this._scrollSourceEditor(blockCentre - elementCentre);
		}.bind(this);

		this._resizeListener = function(/*e*/) {
			this._editorView.editor.resize();
		}.bind(this);

		this._scrollListener = function(e) {
			if (this._ignoreEditorScrollsUntilValue) {
				if (this._ignoreEditorScrollsUntilValue === e.newValue.y) {
					this._ignoreEditorScrollsUntilValue = null;
				}
				return;
			}

			var textView = this._editorView.editor.getTextView();

			var block;
			if (!e.newValue.y) {
				/* the editor is at the top so ensure that preview is at the top as well */
				var rootBlock = this._styler.getRootBlock();
				var blocks = rootBlock.getBlocks();
				if (blocks.length) {
					block = blocks[0];
				}
			} else {
				var charIndex = textView.getOffsetAtLocation(0, Math.floor(e.newValue.y + (this._previewWrapperDiv.clientHeight / 2)));
				block = this._styler.getBlockAtIndex(charIndex);
			}

			if (block) {
				var element = document.getElementById(block.elementId);
				if (element) {
					var newTop = Math.max(0, Math.ceil(element.offsetTop - (this._previewWrapperDiv.clientHeight - element.offsetHeight) / 2));
					this._previewWrapperDiv.scrollTop = newTop;
				}
			}
		}.bind(this);

		this._selectionListener = function(e) {
			var model = this._editorView.editor.getTextView().getModel();
			var selectionStart = model.mapOffset(e.newValue.start);
			var block = this._styler.getBlockAtIndex(selectionStart);

			/*
			 * If block has sub-blocks then get the sub-block that contains the selection index.
			 * If no sub-block contains it then the selection index is in whitespace.
			 */
			var subBlocks = block.getBlocks();
			if (subBlocks.length) {
				var i = 0;
				for (; i < subBlocks.length; i++) {
					if (subBlocks[i].start <= selectionStart && selectionStart < subBlocks[i].end) {
						block = subBlocks[i];
						break;
					}
				}
				if (i === subBlocks.length) {
					/* the selection index was not within a sub-block */
					block = null;
				}
			}

			if (block === this._selectedBlock) {
				return; /* no change */
			}

			if (this._selectedElement) {
				this._selectedElement.className = this._selectedElement.className.replace(this._markdownSelected, "");
				this._selectedElement = null;
				this._selectedBlock = null;
			}

			if (block && block.elementId) {
				this._selectedBlock = block;
				this._selectedElement = document.getElementById(block.elementId);
				this._selectedElement.className += this._markdownSelected;

				var textView = this._editorView.editor.getTextView();
				var blockTop = textView.getLocationAtOffset(model.mapOffset(block.start, true));
				var blockBottom = textView.getLocationAtOffset(model.mapOffset(block.end, true));
				if (!blockBottom.y) { /* indicates that the block bottom is within a collapsed section */
					blockBottom.y = blockTop.y;
				}
				blockBottom.y += textView.getLineHeight();
				var blockHeight = blockBottom.y - blockTop.y;
				var relativeTop = blockTop.y - textView.getTopPixel();
				var blockCentre = relativeTop + blockHeight / 2;

				var previewBounds = this._previewWrapperDiv.getBoundingClientRect();
			    var elementBounds = this._selectedElement.getBoundingClientRect();
			    var elementTop = elementBounds.top - previewBounds.top + this._previewWrapperDiv.scrollTop;
			    var elementCentre = elementTop + this._selectedElement.offsetHeight / 2;

				this._scrollPreviewDiv(elementCentre - blockCentre);
			}
		}.bind(this);

		BaseEditor.apply(this, arguments);
	}

	MarkdownEditor.prototype = Object.create(BaseEditor.prototype);
	objects.mixin(MarkdownEditor.prototype, /** @lends orion.edit.MarkdownEditor.prototype */ {
		initSourceEditor: function() {
			var editor = this._editorView.editor;
			var textView = editor.getTextView();
			var annotationModel = editor.getAnnotationModel();
			this._stylerAdapter = new MarkdownStylingAdapter(this._model, this._metadata.Location, this._fileService);
			this._styler = new mTextStyler.TextStyler(textView, annotationModel, this._stylerAdapter);

			this._editorView.editor.getTextView().addEventListener("Scroll", this._scrollListener); //$NON-NLS-0$
			this._editorView.editor.getTextView().addEventListener("Selection", this._selectionListener); //$NON-NLS-0$
			this._splitter.addEventListener("resize", this._resizeListener); //$NON-NLS-0$
			this._previewDiv.addEventListener("click", this._previewMouseClickListener); //$NON-NLS-0$

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
		},
		install: function() {
			this._rootDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.style.position = "absolute"; //$NON-NLS-0$
			this._rootDiv.style.width = "100%"; //$NON-NLS-0$
			this._rootDiv.style.height = "100%"; //$NON-NLS-0$
			this._parent.appendChild(this._rootDiv);

			var editorDiv = document.createElement("div"); //$NON-NLS-0$
			this._rootDiv.appendChild(editorDiv);	
			this._editorView.setParent(editorDiv);

			this._splitterDiv = document.createElement("div"); //$NON-NLS-0$
			this._splitterDiv.id = "orion.markdown.editor.splitter";
			this._rootDiv.appendChild(this._splitterDiv);			

			this._previewWrapperDiv = document.createElement("div"); //$NON-NLS-0$
			this._previewWrapperDiv.style.overflowX = "hidden"; //$NON-NLS-0$
			this._previewWrapperDiv.style.overflowY = "auto"; //$NON-NLS-0$
			this._rootDiv.appendChild(this._previewWrapperDiv);
			
			this._previewDiv = document.createElement("div"); //$NON-NLS-0$
			this._previewDiv.id = ID_PREVIEW; //$NON-NLS-0$
			this._previewDiv.classList.add("orionMarkdown"); //$NON-NLS-0$
			this._previewWrapperDiv.appendChild(this._previewDiv);

			this._editorView.addEventListener("Settings", this._updateSettings.bind(this)); //$NON-NLS-0$
			var settings = this._editorView.getSettings();

			this._splitter = new mSplitter.Splitter({
				node: this._splitterDiv,
				sidePanel: editorDiv,
				mainPanel: this._previewWrapperDiv,
				vertical: settings && settings.splitOrientation === mSplitter.ORIENTATION_VERTICAL
			});

			if (!settings) {
				/* hide the content until the split orientation setting has been retrieved */
				this._rootDiv.style.visibility = "hidden"; //$NON-NLS-0$
				this._splitterDiv.style.visibility = "hidden"; //$NON-NLS-0$
			}

			BaseEditor.prototype.install.call(this);
		},
		uninstall: function() {
			this._styler.destroy();
			var textView = this._editorView.editor.getTextView();
			textView.removeEventListener("Scroll", this._scrollListener); //$NON-NLS-0$
			textView.removeEventListener("Selection", this._selectionListener); //$NON-NLS-0$
			this._splitter.removeEventListener("resize", this._resizeListener); //$NON-NLS-0$
			this._previewDiv.removeEventListener("click", this._previewMouseClickListener); //$NON-NLS-0$
			lib.empty(this._parent);
			BaseEditor.prototype.uninstall.call(this);
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

			this._scrollPreviewAnimation = new mTextUtil.Animation({
				window: window,
				curve: [pixelY, 0],
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

			this._scrollSourceAnimation = new mTextUtil.Animation({
				window: window,
				curve: [pixelY, 0],
				onAnimate: function(x) {
					var deltaY = pixelY - Math.floor(x);
					textView.setTopPixel(textView.getTopPixel() + deltaY);
					pixelY -= deltaY;
				}.bind(this),
				onEnd: function() {
					this._scrollSourceAnimation = null;
					var finalValue = Math.floor(textView.getTopPixel() + pixelY);
					this._ignoreEditorScrollsUntilValue = finalValue;
					textView.setTopPixel(finalValue);
				}.bind(this)
			});

			this._ignoreEditorScrollsUntilValue = -1;
			this._scrollSourceAnimation.play();	
		},
		_updateSettings: function(event) {
			this._splitter.setOrientation(event.newSettings.splitOrientation);
			/*
			 * If this is the initial retrieval of these settings then the root
			 * and splitter elements likely need to have their visibilities updated.
			 */
			this._rootDiv.style.visibility = "visible"; //$NON-NLS-0$
			this._splitterDiv.style.visibility = "visible"; //$NON-NLS-0$
		},
		_markdownSelected: " markdownSelected", //$NON-NLS-0$
		_selectedBlock: null
	});

	function MarkdownEditorView(options) {
		this._options = options;
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
		}
	};

	return {
		MarkdownEditorView: MarkdownEditorView
	};
});
