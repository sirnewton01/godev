/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define*/
define([
'estraverse'
], function(Estraverse) {

	var Finder = {
		
		punc: '\n\t\r (){}[]:;,.+=-*^&@!%~`\'\"\/\\',
		
		/**
		 * @name findWord
		 * @description Finds the word from the start position
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {String} text The text of the source to find the word in
		 * @param {Number} start The current start position of the carat
		 * @returns {String} Returns the computed word from the given string and offset or <code>null</code>
		 */
		findWord: function(text, start) {
			if(text && start) {
				var ispunc = this.punc.indexOf(text.charAt(start)) > -1;
				var pos = ispunc ? start-1 : start;
				while(pos >= 0) {
					if(this.punc.indexOf(text.charAt(pos)) > -1) {
						break;
					}
					pos--;
				}
				var s = pos;
				pos = start;
				while(pos <= text.length) {
					if(this.punc.indexOf(text.charAt(pos)) > -1) {
						break;
					}
					pos++;
				}
				if((s === start || (ispunc && (s === start-1))) && pos === start) {
					return null;
				}
				else if(s === start) {
					return text.substring(s, pos);
				}
				else {
					return text.substring(s+1, pos);
				}
			}
			return null;
		},
		
		/**
		 * @name findNode
		 * @description Finds the AST node for the given offset
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {Number} offset The offset into the source file
		 * @param {Object} ast The AST to search
		 * @returns The AST node at the given offset or <code>null</code> if it could not be computed.
		 */
		findNode: function(offset, ast) {
			var found = null;
			if(offset != null && offset > -1 && ast) {
				Estraverse.traverse(ast, {
					/**
					 * start visiting an AST node
					 */
					enter: function(node) {
						if(node.type && node.range) {
							//only check nodes that are typed, we don't care about any others
							if(node.range[0] <= offset) {
								found = node;
							}
							else {
								return Estraverse.VisitorOption.Break;
							}
						}
					}					
				});
			}
			return found;
		},
		
		/**
		 * @name findToken
		 * @description Finds the token in the given token stream for the given start offset
		 * @function
		 * @public
		 * @memberof javascript.Finder
		 * @param {Number} offset The offset intot the source
		 * @param {Array|Object} tokens The array of tokens to search
		 * @returns {Object} The AST token that starts at the given start offset
		 */
		findToken: function(offset, tokens) {
			if(offset != null && offset > -1 && tokens && tokens.length > 0) {
				var min = 0,
					max = tokens.length-1,
					token, 
					idx = 0;
					token = tokens[0];
				if(offset >= token.range[0] && offset < token.range[1]) {
					token.index = offset;
					return token;
				}
				token = tokens[max];
				if(offset >= token.range[0]) {
					token.index = max;
					return token;
				}
				token = null;
				while(min <= max) {
					idx = Math.floor((min + max) / 2);
					token = tokens[idx];
					if(offset < token.range[0]) {
						max = idx-1;
					}
					else if(offset > token.range[1]) {
						min = idx+1;
					}
					else if(offset === token.range[1]) {
						var next = tokens[idx+1];
						if(next.range[0] === token.range[1]) {
							min = idx+1;
						}
						else {
							token.index = idx;
							return token;
						}
					}
					else if(offset >= token.range[0] && offset < token.range[1]) {
						token.index = idx;
						return token;
					}
					if(min === max) {
						token = tokens[min];
						if(offset >= token.range[0] && offset <= token.range[1]) {
							token.index = min;
							return token;
						}
						return null;
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Finds the doc comment at the given offset. Returns null if there
		 * is no comment at the given offset
		 * @function
		 * @public
		 * @param {Number} offset The offset into the source
		 * @param {Object} ast The AST to search
		 * @returns {Object} Returns the comment node for the given offset or null
		 */
		findComment: function(offset, ast) {
			if(ast.comments) {
				var comments = ast.comments;
				var len = comments.length;
				for(var i = 0; i < len; i++) {
					var comment = comments[i];
					if(comment.range[0] <= offset && comment.range[1] > offset) {
						return comment;
					} else if(comment.range[0] > offset) {
						//we've passed the node
						return null;
					}
				}
				return null;
			}
		}
	};

	return Finder;
});
		