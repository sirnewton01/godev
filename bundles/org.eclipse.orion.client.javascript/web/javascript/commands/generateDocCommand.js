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
define([
'orion/objects',
'javascript/finder',
'javascript/signatures',
'orion/Deferred'
], function(Objects, Finder, Signatures, Deferred) {
	
	/**
	 * @description Creates a new generate doc command
	 * @constructor
	 * @public
	 * @returns {javascript.commands.GenerateDocCommand} A new command
	 * @since 6.0
	 */
	function GenerateDocCommand(ASTManager) {
		this.astManager = ASTManager;
	}
	
	Objects.mixin(GenerateDocCommand.prototype, {
		/* override */
		execute: function(editorContext, options) {
			var that = this;
			return Deferred.all([
				this.astManager.getAST(editorContext),
				editorContext.getText(),
				editorContext.getCaretOffset()
			]).then(function(results) {
				var node = Finder.findNode(results[2], results[0], {parents:true});
				if(node) {
					var text = results[1];
					var parent = that._resolveParent(node);
					if(parent) {
						//don't monkey with existing comments
						var template;
						var start = parent.range[0];
						if(parent.type === 'FunctionDeclaration') {  //$NON-NLS-0$
							template = that._genTemplate(parent.id.name, parent.params, false, parent.range[0], text);
						} else if(parent.type === 'Property') {  //$NON-NLS-0$
							template = that._genTemplate((parent.key.name ? parent.key.name : parent.key.value), parent.value.params, true, parent.range[0], text);
						} else if(parent.type === 'VariableDeclarator') {  //$NON-NLS-0$
							start = parent.range[0];
							if(parent.decl) {
								if(parent.decl.leadingComments) {
									return;
								}
								if(parent.decl.declarations && parent.decl.declarations.length === 1) {
									start = parent.decl.range[0];
								}
							}
							template = that._genTemplate(parent.id.name, parent.init.params, true, start, text);
						} else if(parent.type === 'AssignmentExpression') {
							template = that._genTemplate(Signatures.expandMemberExpression(parent.left, ''), 
															parent.right.params, 
															true, 
															parent.range[0], 
															text);
						}
					}
					if(template) {
						return Deferred.all([
										editorContext.setText(template, start, start),
										editorContext.setCaretOffset(results[2]+template.length)
										]);
					}
				}
			});
		},
		
		/**
		 * @description Creates the boilerplate template
		 * @function
		 * @private
		 * @param {String} name The name of the function
		 * @param {Array} params The array of AST nodes 
		 * @param {Boolean} isexpr If the template is for a function expression
		 * @param {Number} offset The offset to start the template from
		 * @param {String} text The original text
		 */
		_genTemplate: function(name, params, isexpr, offset, text) {
			var char = text[--offset];
			var preamble = '';
			//walk the preceeding whitespace so we will insert formatted at the same level
			while(char === ' ' || char === '\t') {
				preamble += char;
				char = text[--offset];
			}
			var parts = [];
			parts.push('/**\n'+preamble+' * @name '+name+'\n');
			//TODO add in description template once editor bug is fixed
			//${description}
			parts.push(preamble+' * @description description\n');  //$NON-NLS-0$
			if(isexpr) {
				parts.push(preamble+' * @function\n');
			}
			if(name.charAt(0) === '_') {
					parts.push(preamble+' * @private\n');
				}
			if(params) {
				var  len = params.length;
				for(var i = 0; i < len; i++) {
					//TODO add template for type infos after suporting editor bug is fixed
					// {${param'+(i+1)+'}}
					parts.push(preamble+' * @param '+ params[i].name+'\n');  //$NON-NLS-0$  //$NON-NLS-0$
				}
			}
			//TODO add in returns template once editor bug is fixed
			//{${returns}}
			parts.push(preamble+' * @returns returns\n'+preamble+' */\n'+preamble);
			return parts.join('');
		},
		
		/**
		 * @description Computes the parent node to attach the doc to
		 * @function
		 * @private
		 * @param {Object} node The AST node
		 * @returns {Object} The parent node to attach the doc to or <code>null</code>
		 */
		_resolveParent: function(node) {
			if(!node.parents || node.parents.length < 1) {
				return null;
			}
			switch(node.type) {
				case 'FunctionDeclaration':
					return node;
				case 'Property':
					if(node.value && node.value.type === 'FunctionExpression') {
						return node;
					}
					return null;
				case 'VariableDeclarator':
					if(node.init && node.init.type === 'FunctionExpression') {
						node.decl = node.parents[node.parents.length -1];
						return node;
					}
					return null;
				case 'VariableDeclaration':
					if(node.declarations && node.declarations.length === 1) {
						var n = node.declarations[0];
						if(n.init && n.init.type === 'FunctionExpression') {
							node.parents.push(node);
							n.parents = node.parents;
							return this._resolveParent(n);
						}
					}
					//$FALLTHROUGH$
				case 'AssignmentExpression':
					if((node.left && node.left.type === 'MemberExpression') && 
						(node.right && node.right.type === 'FunctionExpression')) {
						return node;
					}
			}
			var len = node.parents.length-1;
			var parent = node.parents[len];
			parent.parents = node.parents.slice(0, len);
			return this._resolveParent(parent);
		}
	});
	
	return {
		GenerateDocCommand : GenerateDocCommand
	};
});
