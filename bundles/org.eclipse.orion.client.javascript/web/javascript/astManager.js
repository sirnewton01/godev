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
/*global define esprima*/
define([
	'esprima',
	'orion/Deferred',
	'orion/objects',
	'orion/serialize'
], function(Esprima, Deferred, Objects, Serialize) {
	/**
	 * @description Object of error types
	 * @since 5.0
	 */
	var ErrorTypes = {
		/**
		 * @description Something unexpected has been found while parsing, most commonly a syntax error
		 */
		Unexpected: 1,
		/**
		 * @description A Syntax problem that reports the last entered token as the problem
		 */
		EndOfInput: 2
	};

	/**
	 * Provides a shared AST.
	 * @name javascript.ASTManager
	 * @class Provides a shared AST.
	 */
	function ASTManager() {
		this.cache = null;
	}
	
	Objects.mixin(ASTManager.prototype, /** @lends javascript.ASTManager.prototype */ {
		/**
		 * @param {Object} editorContext
		 * @returns {orion.Promise} A promise resolving to the AST.
		 */
		getAST: function(editorContext) {
			if (this.cache) {
				return new Deferred().resolve(this.cache);
			}
			var _self = this;
			return editorContext.getText().then(function(text) {
				var ast = _self.parse(text);
				_self.cache = ast;
				return ast;
			});
		},
		/**
		 * @private
		 * @param {String} text The code to parse.
		 * @returns {Object} The AST.
		 */
		parse: function(text) {
			try {
				var ast = esprima.parse(text, {
					range: true,
					tolerant: true,
					comment: true,
					tokens: true
				});
			} catch (e) {
				// The "tolerant" Esprima sometimes blows up from parse errors in initial statements of code.
				// Just return an empty AST with the parse error.
				ast = this._emptyAST(text);
				ast.errors = [e];
			}
			if (ast.errors) {
				this._computeErrorTypes(ast.errors);
				ast.errors = ast.errors.map(Serialize.serializeError);
			}
			return ast;
		},
		/**
		 * @description Returns an empty AST in the event a parse failed with a thrown exception
		 * @function
		 * @private
		 * @param {String} text The text that failed to parse
		 * @returns {Object} A new, empty AST object
		 */
		_emptyAST: function(text) {
			var charCount = (text && typeof text.length === "number") ? text.length : 0;
			return {
				type: "Program", //$NON-NLS-0$
				body: [],
				comments: [],
				tokens: [],
				range: [0, charCount]
			};
		},
		/**
		 * @description Computes the problem type from the error and sets a 'type' property
		 * on the error object
		 * @function
		 * @private
		 * @param {Array} errors The error array from Esprima
		 */
		_computeErrorTypes: function(errors) {
			if(errors && Array.isArray(errors)) {
				errors.forEach(function(error) {
					var msg = error.message;
					//first sanitize it
					error.message = msg = msg.replace(/^Line \d+: /, '');
					if(/^Unexpected/.test(msg)) {
						error.type = ErrorTypes.Unexpected;
						if(/end of input$/.test(msg)) {
							error.type = ErrorTypes.EndOfInput;
						}
					}
				});
			}
		},
		/**
		 * Notifies the AST manager of a change to the model.
		 * @param {Object} event
		 */
		updated: function(event) {
			this.cache = null;
		}
	});
	return {
			ASTManager : ASTManager,
			ErrorTypes : ErrorTypes};
});
