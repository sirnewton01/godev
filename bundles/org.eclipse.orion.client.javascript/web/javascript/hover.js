 /*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd*/
/* global doctrine */
define([
'orion/objects',
'javascript/finder',
'javascript/signatures',
'doctrine'
], function(Objects, Finder, Signatures) {
	
	/**
	 * @name javascript.JavaScriptHover
	 * @description creates a new instance of the hover
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager
	 * @since 7.0
	 */
	function JavaScriptHover(astManager) {
		this.astManager = astManager;
	}
	
	Objects.mixin(JavaScriptHover.prototype, /** @lends javascript.JavaScriptHover.prototype*/ {
		
		/**
		 * @name computeHover
		 * @description Callback from the editor to compute the hover
		 * @function
		 * @public 
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} editorContext The current editor context
		 * @param {Object} ctxt The current selection context
		 */
		computeHoverInfo: function computeHover(editorContext, ctxt) {
		    var that = this;
			return this.astManager.getAST(editorContext).then(function(ast) {
			    var node = Finder.findNode(ctxt.offset, ast, {parents:true});
			    if(node) {
			        switch(node.type) {
			            case 'Identifier': {
			                return that._formatHover(that._getIdentifierHover(node, ctxt.index, ast));
			            }
			            case 'FunctionDeclaration': {
			                return that._formatHover(that._getCommentFromNode(node));
			            }
			            case 'FunctionExpression': {
			                return that._formatHover(that._getFunctionExprHover(node));
			            }
			            case 'CallExpression': {
			                return that._formatHover(that._getCallExprHover(node, ctxt.index, ast));
			            }
			        }
			    }
			    return null;
			});
		},
		
		/**
		 * @name _getCommentFromNode
		 * @description Tries to find the comment for the given node. If more than one is found in the array
		 * the last entry is considered 'attached' to the node
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {Object} The comment object from the AST or null
		 */
		_getCommentFromNode: function _getCommentFromNode(node) {
		    var comments = node.leadingComments;
	        if(comments && comments.length > 0) {
	            //simple case: the node has an attaced comment, take the last comment in the leading array
	            var comment = comments[comments.length-1];
	            comment.node = node;
	            return comment;
	        }
	        return null;
		},
		
		/**
		 * @name _getFunctionExprHover
		 * @description Computes the hover for a FunctionExpression
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {String} The hover text
		 */
		_getFunctionExprHover: function _getFunctionExprHover(node) {
		    if(node.parents) {
    	        var parent = node.parents[node.parents.length-1];
    	        if(parent.type === 'Property') {
    	            return this._getCommentFromNode(parent);
    	        }
    	    }
    	    return null;
		},
		
		/**
		 * @name _getCallExprHover
		 * @description Computes the hover for a CallExpression
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @param {Number} offset The offset into the file
		 * @param {Object} ast The AST
		 * @returns {String} The hover text
		 */
		_getCallExprHover: function _getCallExprHover(node, offset, ast) {
	        switch(node.callee.type) {
	            case 'MemberExpression': {
	                //do we know the type locally?
	                break;
	            }
	            case 'ThisExpression': {
	                //only need to look in the last function closure
	                break;
	            }
	            case 'Identifier': {
	                var func = Finder.findDeclaration(offset, ast, {
	                                       kind: Finder.SearchOptions.FUNCTION_DECLARATION, 
	                                       id: node.callee.name});
	                if(func) {
	                    return this._getCommentFromNode(func);
	                }
	                break;
	            }
		    }
		    return null;
		},
		
		/**
		 * @name _getIdentifierHover
		 * @description Computes the hover for an Identifier node
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @param {Number} offset The offset into the file
		 * @param {Object} ast The AST
		 * @returns {String} The hover text
		 */
		_getIdentifierHover: function _getIdentifierHover(node, offset, ast) {
		    if(node.parents) {
		        //find what it ids
		        var parent = node.parents[node.parents.length-1];
		        switch(parent.type) {
		            case 'FunctionDeclaration': 
		            case 'VariableDeclarator': {
		                return this._getCommentFromNode(parent);
		            }
		            case 'FunctionExpression': {
		                return this._getFunctionExprHover(parent);
		            }
		            case 'CallExpression': {
		                return this._getCallExprHover(parent, offset, ast);
		            }
		            case 'Property': {
		                if(parent.kind === 'init' && parent.value && parent.value.type === 'FunctionExpression') {
		                    return this._getCommentFromNode(parent);
		                } else {
		                    return null;
		                }
		            }
		        }
		        //now the hard part, find the declaration
		    }
		    return null;
		},
		
		/**
		 * @name _formatHover
		 * @description Formats the hover info
		 * @function
		 * @private
		 * @param comment
		 * @param node
		 * @returns returns
		 */
		_formatHover: function _formatHover(comment) {
		    if(!comment) {
		        return null;
		    }
		    try {
		        var doc = doctrine.parse(comment.value, {recoverable:true, unwrap : true});
		        var format = Object.create(null);
		        format.params = [];
		        format.desc = (doc.description ? doc.description : '');
		        if(doc.tags) {
		            var len = doc.tags.length;
		            for(var i = 0; i < len; i++) {
		                var tag = doc.tags[i];
		                switch(tag.title) {
		                    case 'name': {
		                        if(tag.name) {
		                          format.name = tag.name; 
		                        }
		                        break;
		                    }
		                    case 'description': {
		                        if(tag.description !== null) {
		                          format.desc = (format.desc === '' ? tag.description : format.desc+'\n'+tag.description);
		                        }
		                        break;
		                    }
		                    case 'param': {
		                        format.params.push(this._convertTagType(tag.type) +
		                                  (tag.name ? '__'+tag.name+'__ ' : '') + 
		                                  (tag.description ? tag.description+'\n' : ''));
		                        break;
		                    }
		                    case 'returns': 
		                    case 'return': {
		                        format.returns = this._convertTagType(tag.type) +
		                              (tag.description ? tag.description+'\n' : '');
		                         break;
		                    }
		                    case 'since': {
		                        if(tag.description) {
		                          format.since = tag.description;
		                        }
		                        break;
		                    }
		                    case 'function': {
		                        format.isfunc = true;
		                        break;
		                    }
		                    case 'constructor': {
		                        format.iscon = true;
		                        break;
		                    }
		                    case 'private': {
		                        format.isprivate = true;
		                        break; 
		                    }
	                }
		            }
		        }
		        var name = Signatures.computeSignature(comment.node);
		        var title = '###';
		        if(format.isprivate) {
		            title += 'private ';
		        }
		        if(format.iscon) {
		            title += 'constructor ';
		        }
		        title += name.sig+'###';
		        var hover = '';
		        if(format.desc !== '') {
		            hover += format.desc+'\n\n';
		        }
		        if(format.params.length > 0) {
		            hover += '__Parameters:__\n\n';
		            for(var i = 0; i < format.params.length; i++) {
		                hover += '>'+format.params[i] + '\n\n';
		            }
		        }
		        if(format.returns) {
		            hover += '__Returns:__\n\n>' + format.returns + '\n\n';
		        }
		        if(format.since) {
		            hover += '__Since:__\n\n>'+format.since;
		        }
		    }
		    catch(e) {
		        //add on the wad of text for now
		        hover += comment;
		    }
		    return {hover: hover, title: title, type:'markdown'};
		},
		
		/**
		 * @name _convertTagType
		 * @description Converts the doctrine tag type to a simple form to appear in the hover
		 * @function
		 * @private
		 * @param {Object} tag Teh doctrine tag object
		 * @returns {String} The simple name to display for the given doctrine tag type
		 */
		_convertTagType: function _convertTagType(type) {
		    if(!type) {
		        return '';
		    }
	        switch(type.type) {
	            case 'NameExpression': {
	                if(type.name) {
	                  return '*('+type.name+')* ';
	                }
	                break;
	            }
	            case 'RecordType': {
	                return '*(Object)* ';
	            }
	            case 'FunctionType': {
	                return '*(Function)* ';
	            }
	            case 'NullableType': 
	            case 'NonNullableType':
	            case 'OptionalType':
	            case 'RestType': {
	                return this._convertTagType(type.expression);
	            }
	            case 'TypeApplication': {
	                //we only want to care about the first part i.e. Object[] vs. Object.<string, etc>
	                if(type.expression.name === 'Array') {
	                    //we need to grab the first application
	                    if(type.applications && type.applications.length > 0) {
    	                    return '*('+type.applications[0].name+'[])* ';
    	                }
	                }
	                return this._convertTagType(type.expression);
	            }
	            case 'UnionType': 
	            case 'ArrayType': {
	                if(type.elements && type.elements.length > 0) {
	                    //always just take the first type
	                    return this._convertTagType(type.elements[0]);
	                }
	                break;
	            }
	            default: return '';
	        }
		}
	});
	
	JavaScriptHover.prototype.contructor = JavaScriptHover;
	
	return {
		JavaScriptHover: JavaScriptHover
		};
});