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
/*eslint-env amd*/
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
	    //constructor
	}
	
	Objects.mixin(Visitor.prototype, /** @lends javascript.Visitor.prototype */ {
		occurrences: [],
		globals: [],
		scopes: [],
		context: null,
		thisCheck: false,
		objectPropCheck: false,
		labeledStatementCheck: false,
		
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
					this.globals = [];
					this.scopes = [{range: node.range, occurrences: [], kind:'p'}];   //$NON-NLS-0$
					this.defscope = null;
					this.skipScope = null;
					break;
				case Estraverse.Syntax.FunctionDeclaration:
					this.checkId(node.id, true);
					this._enterScope(node);
					if (this.skipScope){
						// If the function decl was a redefine, checkId may set skipScope and we can skip processing the contents
						return Estraverse.VisitorOption.Skip;
					}
					
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
					this.checkId(node.id, true); // Function expressions can be named expressions
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
					} else if (node.object.type === Estraverse.Syntax.ThisExpression){
						this.checkId(node.property, false, true);
					}
					break;
				case Estraverse.Syntax.BinaryExpression:
					this.checkId(node.left);
					this.checkId(node.right);
					break;
				case Estraverse.Syntax.UnaryExpression:
					this.checkId(node.argument);
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
							if (prop.value && prop.value.type === Estraverse.Syntax.FunctionExpression){
								if(this.thisCheck) {
									//tag it 
									prop.value.isprop = true;
								} else {
									this.checkId(prop.value.id, false, true);
								}
							}
							this.checkId(prop.key, true, true);
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
				case Estraverse.Syntax.IfStatement:
				case Estraverse.Syntax.DoWhileStatement:
				case Estraverse.Syntax.WhileStatement:
					this.checkId(node.test);
					break;
				case Estraverse.Syntax.ForStatement:
					this.checkId(node.init);
					break;
				case Estraverse.Syntax.ForInStatement:
                    this.checkId(node.left);
                    this.checkId(node.right);
                    break;
				case Estraverse.Syntax.WithStatement:
                    this.checkId(node.object);
                    break;
                case Estraverse.Syntax.ThrowStatement:
                    this.checkId(node.argument);
                    break;
                case Estraverse.Syntax.LabeledStatement:
               		this._enterScope(node);
                    this.checkId(node.label, true, false, true);
                    break;
                case Estraverse.Syntax.ContinueStatement :
                    this.checkId(node.label, false, false, true);
                    break;
                case Estraverse.Syntax.BreakStatement:
                    this.checkId(node.label, false, false, true);
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
						this.scopes.push({range: node.range, occurrences: [], kind:'o'});  //$NON-NLS-0$
						if (this.defscope){
							return true;
						}
						break;
					case Estraverse.Syntax.FunctionExpression:
						if (!node.isprop){
							this.scopes.push({range: node.body.range, occurrences: [], kind:'fe'});  //$NON-NLS-0$
							// If the outer scope has the selected 'this' we can skip the inner scope
							if (this.defscope){
								return true;
							}
						}
						break;
				}
			} else if (this.objectPropCheck){
				switch(node.type) {
					case Estraverse.Syntax.ObjectExpression:
						this.scopes.push({range: node.range, occurrences: [], kind:'o'});  //$NON-NLS-0$
						// Skip object expressions that don't contain the selection
						if(node.range[0] > this.context.start || node.range[1] < this.context.end) {
							return true;
						}						
				}
			} else if (this.labeledStatementCheck){
				switch(node.type) {
					case Estraverse.Syntax.LabeledStatement:
						this.scopes.push({range: node.range, occurrences: [], kind:'ls'});  //$NON-NLS-0$
						// Skip labelled loops that don't contain the selection
						if(node.range[0] > this.context.start || node.range[1] < this.context.end) {
							return true;
						}						
				}
			} else {
				var kind;
				switch(node.type) {
					case Estraverse.Syntax.FunctionDeclaration:
						kind = 'fd';  //$NON-NLS-0$
						break;
					case Estraverse.Syntax.FunctionExpression:
						kind = 'fe';  //$NON-NLS-0$
						break;
				}
				if (kind){
					// Include the params and body in the scope, but not the identifier
					var rng = node.range[0];
					if (node.body){
						rng = node.body.range[0];
					}
					if (node.params && (node.params.length > 0)){
						rng = node.params[0].range[0];
					}
					this.scopes.push({range: [rng,node.range[1]], occurrences: [], kind:kind});	
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
					//$FALLTHROUGH$
					case Estraverse.Syntax.ObjectExpression:
					case Estraverse.Syntax.Program:
						if(this._popScope()) {
							//we left an object closure, end
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else if (this.objectPropCheck) {
				switch(node.type){
					case Estraverse.Syntax.ObjectExpression:
					case Estraverse.Syntax.Program:
						if(this._popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else if (this.labeledStatementCheck) {
				switch(node.type){
					case Estraverse.Syntax.LabeledStatement:
						if(this._popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
				}
			} else {
				switch(node.type) {
					case Estraverse.Syntax.FunctionExpression:
					case Estraverse.Syntax.FunctionDeclaration: {
					    if(this._popScope()) {
							return Estraverse.VisitorOption.Break;
						}
						break;
					}
					case Estraverse.Syntax.Program: {
					    this._popScope(); // pop the last scope
					    //we are leaving the AST, add the occurrences if we never found a defining scope
					   if(!this.defscope && this.globals) {
					       this.occurrences = [];
					       var that = this;
						   this.globals.forEach(function(scope) {
						       var occ = scope.occurrences;
                               for(var i = 0; i < occ.length; i++) {
                                  that.occurrences.push(occ[i]); 
                               }						        
						   });
						}
						break;
					}
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
			
			if (this.skipScope){
				if (this.skipScope === scope){
					this.skipScope = null;
				}
				return false;
			}
			
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
			} else {
			    this.globals.push(scope);
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
		 * @param {Boolean} isObjectProp Whether the given node is only an occurrence if we are searching for object property occurrences
		 * @param {Boolean} isLabeledStatement Whether the given node is only an occurrence if we are searching for labeled statements
		 * @returns {Boolean} <code>true</code> if we should skip the next nodes, <code>false</code> otherwise
		 */
		checkId: function(node, candefine, isObjectProp, isLabeledStatement) {
			if (this.skipScope){
				return true;
			}
			if (this.thisCheck){
				return false;
			}
			if ((isObjectProp && !this.objectPropCheck) || (!isObjectProp && this.objectPropCheck)){
				return false;
			}
			if ((isLabeledStatement && !this.labeledStatementCheck) || (!isLabeledStatement && this.labeledStatementCheck)){
				return false;
			}			
			if (node && node.type === Estraverse.Syntax.Identifier) {
				if (node.name === this.context.word) {
					var scope = this.scopes[this.scopes.length-1]; // Always will have at least the program scope
					if(candefine) {
						// Check if we are redefining
						if(this.defscope) {
							if((scope.range[0] <= this.context.start) && (scope.range[1] >= this.context.end)) {
								// Selection inside this scope, use this scope as the defining scope
								this.occurrences = []; // Clear any occurrences in sibling scopes
								this.defscope = scope;
								scope.occurrences.push({
									start: node.range[0],
									end: node.range[1]
								});
								return false;
							} else {
								// Selection belongs to an outside scope so use the outside definition
								scope.occurrences = []; // Clear any occurrences we have found in this scope
								this.skipScope = scope;  // Skip this scope and all inner scopes
								return true;  // Where possible we short circuit checking this scope
							}
						}
						//does the scope enclose it?
						if((scope.range[0] <= this.context.start) && (scope.range[1] >= this.context.end)) {
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
			var next = options && options.next ? options.next : false;
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
							    if(next) {
							        found = node;
							        if(parents) {
    									parents.push(node);
    								}
							    }
							    if(found.type !== Estraverse.Syntax.Program) {
							        //we don't want to find the next node as the program root
							        //if program has no children it will be returned on the next pass
							        //https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
								    return Estraverse.VisitorOption.Break;
								}
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
			if(found && parents && parents.length > 0) {
				var p = parents[parents.length-1];
				if(p.type !== 'Program' && p.range[0] === found.range[0] && p.range[1] === found.range[1]) {  //$NON-NLS-0$
					//a node can't be its own parent
					parents.pop();
				}
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
					if(comment.range[0] < offset && comment.range[1] >= offset) {
						return comment;
					} else if(offset === ast.range[1] && offset === comment.range[1]) {
					   return comment;
					} else if(offset > ast.range[1] && offset <= comment.range[1]) {
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
			var val = null, regex = /<\s*script(?:(type|language)(?:\s*)=(?:\s*)"([^"]*)"|[^>]|\n)*>((?:.|\r?\n)*?)<\s*\/script(?:[^>]|\n)*>/ig;
			var comments = this.findHtmlCommentBlocks(buffer, offset);
			loop: while((val = regex.exec(buffer)) != null) {
				var attribute = val[1];
			    var type = val[2];
			    if(attribute && type){
			    	if (attribute === "language"){  //$NON-NLS-0$
			    		type = "text/" + type;  //$NON-NLS-0$
			    	}
			    	if (!/^(application|text)\/(ecmascript|javascript(\d.\d)?|livescript|jscript|x\-ecmascript|x\-javascript)$/ig.test(type)) {
			        	continue;
			        }
			    }
				var text = val[3];
				if(text.length < 1) {
					continue;
				}
				var index = val.index+val[0].indexOf('>')+1;  //$NON-NLS-0$
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
		 * Object of search kinds
		 */
		SearchOptions: {
		    FUNCTION_DECLARATION: 0,
		    IDENTIFIER: 1
		},
		
		/**
		 * @name findDeclaration
		 * @description Will attempt to find the declaration of the node at the given
		 * offset. If it cannot be computed <code>null</code> is returned.
		 * @function
		 * @param {Number} offset The offset into the source file
		 * @param {Object} ast The AST to search
		 * @param {Object} options The options to search with
		 * @returns {Object|null} Return the found declaration AST node or <code>null</code>
		 * @since 7.0
		 */
		findDeclaration: function findDeclaration(offset, ast, options) {
		    //TODO for now do a lookup from the AST, this function will ultimately delegate
		    //to whatever ENV we use 
		    var id = options.id;
		    if(!id) {
		        return null;
		    }
		    var kind = options.kind;
		    if(typeof(kind) === 'undefined') {
		        return null;
		    }
		    this._declFinder.offset = offset;
		    this._declFinder.id = id;
		    this._declFinder.kind = kind;
		    this._declFinder.enter = this._declFinder.enter.bind(this._declFinder);
		    this._declFinder.leave = this._declFinder.leave.bind(this._declFinder);
		    Estraverse.traverse(ast, this._declFinder);
		    var scope = this._declFinder.scopes.pop();
		    while(scope) {
		        var decl = scope.decls.pop();
		        if(decl) {
		            return decl;
		        }
		        scope = this._declFinder.scopes.pop();
		    }
		    return null;
		},
		
		/**
		 * An AST visitor to find a declaration of a certain type
		 * @since 7.0
		 */
		_declFinder: {
		    enter: function(node) {
		         switch(node.type) {
		             case 'Program': {
		                 this.scopes = [];
		                 this.decl = null;
		                 this.offsetscope = null;
		                 this.scopes.push({type: node.type, range: node.range, decls: []});
		                 break;
		             }
		             case 'FunctionDeclaration': {
		                 if(this.offsetscope) {
		                     return Estraverse.VisitorOption.Skip;
		                 }
		                 if(this._checkScope(node)) {
		                     return Estraverse.VisitorOption.Break;
		                 }
		                 if(this.kind === Finder.SearchOptions.FUNCTION_DECLARATION && 
		                          node.id && node.id.name === this.id) {
		                      this._pushDecl(node);
		                 }
		                 this.scopes.push({type: node.type, range: node.range, decls: []});
		                 break;
		             }
		             case 'FunctionExpression': {
		                 if(this.offsetscope) {
		                     return Estraverse.VisitorOption.Skip;
		                 }
		                 if(this._checkScope(node)) {
		                     return Estraverse.VisitorOption.Break;
		                 }
		                 this.scopes.push({type: node.type, range: node.range, decls: []});
		                 break;
		             }
		             case 'VariableDeclarator': {
		                 if(this.kind === Finder.SearchOptions.IDENTIFIER && 
		                          node.id && node.id.name === this.id) {
		                    this._pushDecl(node);
                	            if(this.offsetscope) {
                	                return Estraverse.VisitorOption.Break;
                	            }
		                 }
		                 break;
		             }
		             default: {
		                 if(this._checkScope(node)) {
		                     return Estraverse.VisitorOption.Break;
		                 }
		             }
		         }
		         
	        },
	        leave: function(node) {
	            switch(node.type) {
	                case 'FunctionDeclaration': 
	                case 'FunctionExpression': {
	                    if(this.offsetscope && this.offsetscope.decls.length > 0) {
	                        return Estraverse.VisitorOption.Break;
	                    }
	                    if(node.range[1] <= this.offset) {
	                       this.scopes.pop();
	                    }
	                    break;
	                }
	            }
	        },
	        _checkScope: function(node) {
	            if(!this.offsetscope && node.range[0] > this.offset) {
		             //we found the node, if there are decls stop
		             this.offsetscope = this.scopes[this.scopes.length-1];
		             if(this.offsetscope.decls.length > 0) {
		                 return true;
		             }
                 }
                 return false;
	        },
	        _pushDecl: function _checkDecl(node) {
	            var scope = this.scopes[this.scopes.length-1];
	            scope.decls.push(node);
	        }
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
				if (token) {
					// The token ignores punctuators, but the node is required for context
					// TODO Look for a more efficient way to move between node/token, see Bug 436191
					var node = this.findNode(ctxt.selection.start, ast, {parents: true});
					if (token.range[0] >= node.range[0] && token.range[1] <= node.range[1]){
						if(!this._skip(node)) {
							var context = {
								start: ctxt.selection.start,
								end: ctxt.selection.end,
								word: this._nameFromNode(node),
								token: node,
							};
							var visitor = this._getVisitor(context);
							Estraverse.traverse(ast, visitor);
							return visitor.occurrences;
						}
					}
				}
			}
			return [];
		},
		
		/**
		 * @description If we should skip marking occurrences
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {Boolean} True if we shoud skip computing occurrences
		 * @since 6.0
		 */
		_skip: function(node) {
			if(!node) {
				return true;
			}
			if(node.type === Estraverse.Syntax.ThisExpression) {
				return false;
			}
			return node.type !== Estraverse.Syntax.Identifier;
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
		 * @param {Object} node The AST token
		 * @returns {String} The node name to use while seraching
		 * @since 6.0
		 */
		_nameFromNode: function(node) {
			switch(node.type) {
				case Estraverse.Syntax.Identifier: return node.name;
				case Estraverse.Syntax.ThisExpression: return 'this'; //$NON-NLS-0$
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
			
			if (context.token){
				var parent = context.token.parent ? context.token.parent : (context.token.parents && context.token.parents.length > 0 ? context.token.parents[context.token.parents.length-1] : null);
				
				// See if a 'this' keyword was selected
				this.visitor.thisCheck = context.token.type === Estraverse.Syntax.ThisExpression;
				
				// See if an object property key is selected (or a usage of an object property such as this.prop())
				this.visitor.objectPropCheck = false;
				if (parent && parent.type === Estraverse.Syntax.Property){
					this.visitor.objectPropCheck = context.token === parent.key;
				} else if (parent && (parent.type === Estraverse.Syntax.MemberExpression && parent.object && parent.object.type === Estraverse.Syntax.ThisExpression)){
					this.visitor.objectPropCheck = true;
				}
				
				// See if a labeled statement is selected
				this.visitor.labeledStatementCheck = parent && (parent.type === Estraverse.Syntax.LabeledStatement || parent.type === Estraverse.Syntax.ContinueStatement || parent.type === Estraverse.Syntax.BreakStatement);
			}
				
			this.visitor.context = context;
			return this.visitor;			
		}
		
	};

	return Finder;
});
