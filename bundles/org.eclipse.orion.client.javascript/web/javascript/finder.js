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
'estraverse',
'orion/objects'
], function(Estraverse, Objects) {

	/**
	 * @name javascript.Visitor
	 * @description The AST visitor passed into estraverse
	 * @constructor
	 * @private
	 * @since 5.0
	 */
	function Visitor() {
	}
	
	Objects.mixin(Visitor.prototype, /** @lends javascript.Visitor.prototype */ {
		occurrences: [],
		scopes: [],
		context: null,
		thisCheck: false,
		
		/**
		 * @name enter
		 * @description Callback from estraverse when a node is starting to be visited
		 * @function
		 * @private
		 * @memberof javascript.Visitor.prototype
		 * @param {Object} node The AST node currently being visited
		 * @returns The status if we should continue visiting
		 */
		enter: function(node) {
			var len, idx;
			switch(node.type) {
				case Estraverse.Syntax.Program:
					this.occurrences = [];
					this.scopes = [{range: node.range, occurrences: [], kind:'p'}];
					this.defnode = null;
					this.defscope = null;
					break;
				case Estraverse.Syntax.FunctionDeclaration:
					this.checkId(node.id, true);
					//we want the parent scope for a declaration, otherwise we leave it right away
					this._enterScope(node);
					if (node.params) {
						len = node.params.length;
						for (idx = 0; idx < len; idx++) {
							if(this.checkId(node.params[idx], true)) {
								return Estraverse.VisitorOption.Skip;
							}
						}
					}
					break;
				case Estraverse.Syntax.FunctionExpression:
					if (node.params) {
						if(this._enterScope(node)) {
							return Estraverse.VisitorOption.Skip;
						}
						len = node.params.length;
						for (idx = 0; idx < len; idx++) {
							if(this.checkId(node.params[idx], true)) {
								return Estraverse.VisitorOption.Skip;
							}
						}
					}
					break;
				case Estraverse.Syntax.AssignmentExpression:
					this.checkId(node.left);
					this.checkId(node.right);
					break;
				case Estraverse.Syntax.ArrayExpression: 
					if (node.elements) {
						len = node.elements.length;
						for (idx = 0; idx < len; idx++) {
							this.checkId(node.elements[idx]);
						}
					}
					break;
				case Estraverse.Syntax.MemberExpression:
					this.checkId(node.object);
					if (node.computed) { //computed = true for [], false for . notation
						this.checkId(node.property);
					}
					break;
				case Estraverse.Syntax.BinaryExpression:
					this.checkId(node.left);
					this.checkId(node.right);
					break;
				case Estraverse.Syntax.UnaryExpression:
					this.checkId(node.argument);
					break;
				case Estraverse.Syntax.IfStatement:
					this.checkId(node.test);
					break;
				case Estraverse.Syntax.SwitchStatement:
					this.checkId(node.discriminant);
					break;
				case Estraverse.Syntax.UpdateExpression:
					this.checkId(node.argument);
					break;
				case Estraverse.Syntax.ConditionalExpression:
					this.checkId(node.test);
					this.checkId(node.consequent);
					this.checkId(node.alternate);
					break;
				case Estraverse.Syntax.CallExpression:
					this.checkId(node.callee, false);
					if (node.arguments) {
						len = node.arguments.length;
						for (idx = 0; idx < len; idx++) {
							this.checkId(node.arguments[idx]);
						}
					}
					break;
				case Estraverse.Syntax.ReturnStatement:
					this.checkId(node.argument);
					break;
				case Estraverse.Syntax.ObjectExpression:
					if(this._enterScope(node)) {
						return Estraverse.VisitorOption.Skip;
					}
					if(node.properties) {
						len = node.properties.length;
						for (idx = 0; idx < len; idx++) {
							var prop = node.properties[idx];
							if(this.thisCheck && prop.value && prop.value.type === Estraverse.Syntax.FunctionExpression) {
								//tag it 
								prop.value.isprop = true;
							}
							this.checkId(prop.value);
						}
					}
					break;
				case Estraverse.Syntax.VariableDeclarator:
					this.checkId(node.id, true);
					this.checkId(node.init);
					break;
				case Estraverse.Syntax.NewExpression:
					this.checkId(node.callee, false);
					if(node.arguments) {
						len = node.arguments.length;
						for(idx = 0; idx < len; idx++) {
							this.checkId(node.arguments[idx]);
						}
					}
					break;
				case Estraverse.Syntax.LogicalExpression:
					this.checkId(node.left);
					this.checkId(node.right);
					break;
				case Estraverse.Syntax.ThisExpression:
					if(this.thisCheck) {
						var scope = this.scopes[this.scopes.length-1];
						scope.occurrences.push({
							start: node.range[0],
							end: node.range[1]
						});
						// if this node is the selected this we are in the right scope
						if (node.range[0] === this.context.token.range[0]){
							this.defscope = scope;
						}
					}
					break;
				case Estraverse.Syntax.DoWhileStatement:
					this.checkId(node.test);
					break;
				case Estraverse.Syntax.ForStatement:
					this.checkId(node.init);
					break;
			}
		},
		
		/**
		 * @description Enters and records the current scope onthe scope stack
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {Boolean} If we should skip visiting children of the scope node
		 */
		_enterScope: function(node) {
			if(this.thisCheck) {
				switch(node.type) {
					case Estraverse.Syntax.ObjectExpression:
						this.scopes.push({range: node.range, occurrences: [], kind:'o'});
						if (this.defscope){
							return true;
						}
						break;
					case Estraverse.Syntax.FunctionExpression:
						if (!node.isprop){
							this.scopes.push({range: node.range, occurrences: [], kind:'fe'});
							// If the outer scope has the selected 'this' we can skip the inner scope
							if (this.defscope){
								return true;
							}
						}
						break;
				}
			}
			else {
				var kind = 'fe';
				switch(node.type) {
					case Estraverse.Syntax.FunctionDeclaration:
						kind = 'fd';
						//$FALL-THROUGH$
					case Estraverse.Syntax.FunctionExpression:
						this.scopes.push({range: node.range, occurrences: [], kind:kind});	
						break;
				}
			}
			return false;
		},
		
		/**
		 * @name leave
		 * @description Callback from estraverse when visitation of a node has completed
		 * @function
		 * @private
		 * @memberof javascript.Visitor.prototype
		 * @param {Object} node The AST node that ended its visitation
		 * @return The status if we should continue visiting
		 */
		leave: function(node) {
			if(this.thisCheck) {
				switch(node.type) {
					case Estraverse.Syntax.FunctionExpression:
						if(node.isprop) {
							delete node.isprop; //remove the tag
							break;
						}
						//FALL-THROUGH
					case Estraverse.Syntax.ObjectExpression:
					case Estraverse.Syntax.Program:
						if(this._popScope()) {
							//we left an object closure, end
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			}
			else {
				switch(node.type) {
					case Estraverse.Syntax.FunctionExpression:
					case Estraverse.Syntax.FunctionDeclaration:
					case Estraverse.Syntax.Program:
						if(this._popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			}
		},
		
		/**
		 * @description Pops the tip of the scope stack off, adds occurrences (if any) and returns if we should
		 * quit visiting
		 * @function
		 * @private
		 * @returns {Boolean} If we should quit visiting
		 */
		_popScope: function() {
			var scope = this.scopes.pop();
			var len = scope.occurrences.length;
			var i;
			if(this.defscope) {
				for(i = 0; i < len; i++) {
					this.occurrences.push(scope.occurrences[i]);
				}
				if(this.defscope.range[0] === scope.range[0] && this.defscope.range[1] === scope.range[1] &&
					this.defscope.kind === scope.kind) {
					//we just popped out of the scope the node was defined in, we can quit
					return true;
				}
			}
			return false;
		},
		
		/**
		 * @name checkId
		 * @description Checks if the given identifier matches the occurrence we are looking for
		 * @function
		 * @private
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} node The AST node we are inspecting
		 * @param {Boolean} candefine If the given node can define the word we are looking for
		 * @returns {Boolean} <code>true</code> if we should skip the next nodes, <code>false</code> otherwise
		 */
		checkId: function(node, candefine) {
			if (!this.thisCheck && node && node.type === Estraverse.Syntax.Identifier) {
				if (node.name === this.context.word) {
					var scope = this.scopes[this.scopes.length-1]; // Always will have at least the program scope
					if(candefine) {
						if(this.defscope) {
							// Re-defining, we want the last defining node previous to the selection, skip any future re-defines
							if(node.range[0] > this.context.start) {
								return true;
							} else {
								// Occurrences collected for the previous define are now invalid, fall through to mark this occurrence
								this.occurrences = [];
								scope.occurrences = [];
							}
						}
						//does the scope enclose it?
						if(scope && (scope.range[0] <= this.context.start) && (scope.range[1] >= this.context.end)) {
							this.defscope = scope;
						}
					}
					scope.occurrences.push({
						start: node.range[0],
						end: node.range[1]
					});
				}
			}
			return false;
		}
	});
	
	Visitor.prototype.constructor = Visitor;

	var Finder = {
		
		visitor: null,
		
		punc: '\n\t\r (){}[]:;,.+=-*^&@!%~`\'\"\/\\',  //$NON-NLS-0$
		
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
		 * @param {Object} options The optional options
		 * @returns The AST node at the given offset or <code>null</code> if it could not be computed.
		 */
		findNode: function(offset, ast, options) {
			var found = null;
			var parents = options && options.parents ? [] : null;
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
								if(parents) {
									parents.push(node);
								}
							} else {
								if(parents && parents.length > 0) {
									var p = parents[parents.length-1];
									if(p.range[0] === found.range[0] && p.range[1] === found.range[1]) {
										//a node can't be its own parent
										parents.pop();
									}
								}
								return Estraverse.VisitorOption.Break;
							}
						}
					},
					/** override */
					leave: function(node) {
						if(parents && offset >= node.range[1]) {
							parents.pop();
						}
					}
				});
			}
			if(found && parents) {
				found.parents = parents;
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
		},
		
		/**
		 * @description Finds the script blocks from an HTML file and returns the code and offset for found blocks
		 * @function
		 * @public
		 * @param {String} buffer The file contents
		 * @param {Number} offset The offset into the buffer to find the enclosing block for
		 * @returns {Object} An object of script block items {text, offset}
		 * @since 6.0
		 */
		findScriptBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null, regex = /<\s*script(?:[^>]|\n)*>((?:.|\r?\n)*?)<\s*\/script(?:[^>]|\n)*>/ig;
			var comments = this.findHtmlCommentBlocks(buffer, offset);
			loop: while((val = regex.exec(buffer)) != null) {
				var text = val[1];
				if(text.length < 1) {
					continue;
				}
				var index = val.index+val[0].indexOf('>')+1;
				if((offset == null || (index <= offset && index+text.length >= offset))) {
					for(var i = 0; i < comments.length; i++) {
						if(comments[i].start <= index && comments[i].end >= index) {
							continue loop;
						}
					}
					blocks.push({
						text: text,
						offset: index
					});
				}
			}
			return blocks;
		},
		
		/**
		 * @description Finds all of the block comments in an HTML file
		 * @function
		 * @public
		 * @param {String} buffer The file contents
		 * @param {Number} offset The optional offset to compute the block(s) for
		 * @return {Array} The array of block objects {text, start, end}
		 * @since 6.0
		 */
		findHtmlCommentBlocks: function(buffer, offset) {
			var blocks = [];
			var val = null, regex = /<!--((?:.|\r?\n)*?)-->/ig;
			while((val = regex.exec(buffer)) != null) {
				var text = val[1];
				if(text.length < 1) {
					continue;
				}
				if((offset == null || (val.index <= offset && val.index+text.length >= val.index))) {
					blocks.push({
						text: text,
						start: val.index,
						end: val.index+text.length
					});
				}
			}
			return blocks;
		},
		
		/**
		 * @description Finds all of the occurrences of the token / ranges / text from the context within the given AST
		 * @function 
		 * @public 
		 * @param {Object} ast The editor context to get the AST from
		 * @param {Object} ctxt The context object {start:number, end:number, contentType:string}
		 * @returns {orion.Promise} The promise to compute occurrences
		 * @since 6.0
		 */
		findOccurrences: function(ast, ctxt) {
			if(ast && ctxt) {
				var token = this._getToken(ctxt.selection.start, ast);
				if(!this._skip(token)) {
					var context = {
						start: ctxt.selection.start,
						end: ctxt.selection.end,
						word: this._nameFromNode(token),
						token: token,
					};
					var visitor = this._getVisitor(context);
					Estraverse.traverse(ast, visitor);
					return visitor.occurrences;
				}
			}
			return [];
		},
		
		/**
		 * @description If we should skip marking occurrences
		 * @function
		 * @private
		 * @param {Object} token The AST token
		 * @returns {Boolean} True if we shoud skip computing occurrences
		 * @since 6.0
		 */
		_skip: function(token) {
			if(!token) {
				return true;
			}
			if(token.type === 'Keyword') {  //$NON-NLS-0$
				return token.value !== 'this';  //$NON-NLS-0$
			}
			return token.type !== Estraverse.Syntax.Identifier;
		},
		
		/**
		 * @description Gets the token from the given offset or the proceeding token if the found token 
		 * is a punctuator
		 * @function
		 * @private
		 * @param {Number} offset The offset into the source
		 * @param {Object} ast The AST
		 * @return {Object} The token for the given offset or null
		 * @since 6.0
		 */
		_getToken: function(offset, ast) {
			if(ast.tokens && ast.tokens.length > 0) {
				var token = this.findToken(offset, ast.tokens);
				if(token) {
					if(token.type === 'Punctuator') {  //$NON-NLS-0$
						var index = token.index;
						//only check back if we are at the start of the punctuator i.e. here -> {
						if(offset === token.range[0] && index != null && index > 0) {
							var prev = ast.tokens[index-1];
							if(prev.range[1] !== token.range[0]) {
								return null;
							}
							else {
								token = prev;
							}
						}
					}
					if(token.type === 'Identifier' || (token.type === 'Keyword' && token.value === 'this')) { //$NON-NLS-0$  //$NON-NLS-1$  //$NON-NLS-2$
						return token;
					}
				}
			}
			return null;
		},
		
		/**
		 * @description Computes the node name to use while searching
		 * @function
		 * @private
		 * @param {Object} token The AST token
		 * @returns {String} The node name to use while seraching
		 * @since 6.0
		 */
		_nameFromNode: function(token) {
			switch(token.type) {
				case Estraverse.Syntax.Identifier: return token.value;
				case 'Keyword': return 'this'; //$NON-NLS-0$  //$NON-NLS-1$
			}
		},
		
		/**
		 * @name getVisitor
		 * @description Delegate function to get the visitor
		 * @function
		 * @private
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} context The context (item) to find occurrences for
		 * @returns The instance of {Visitor} to use
		 * @since 6.0
		 */
		_getVisitor: function(context) {
			if(!this.visitor) {
				this.visitor = new Visitor();
				this.visitor.enter = this.visitor.enter.bind(this.visitor);
				this.visitor.leave = this.visitor.leave.bind(this.visitor);
			}
			this.visitor.thisCheck = context.token && context.token.type === 'Keyword' && context.token.value === 'this';  //$NON-NLS-0$  //$NON-NLS-1$
			this.visitor.context = context;
			return this.visitor;			
		}
		
	};

	return Finder;
});
		
