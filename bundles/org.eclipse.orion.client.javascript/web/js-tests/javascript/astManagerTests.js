/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define esprima:true*/
define([
	'javascript/astManager',
	'orion/assert',
	'orion/Deferred',
], function(ASTManager, assert, Deferred) {

	/**
	 * @name setup
	 * @description Sets the test up prior to running
	 * @function
	 * @public
	 */
	function setup() {
		var mockEditorContext = {
			_setText: function(text) {
				this.text = text;
			},
			getText: function() {
				// doesn't matter since mockEsprima ignores the text param
				return new Deferred().resolve(this.text);
			}
		};
		var mockEsprima = {
			_setAST: function(ast) {
				this.ast = ast;
			},
			parse: function(text, options) {
				return this.ast;
			}
		};
		var astManager = new ASTManager.ASTManager();
		return {
			astManager: astManager,
			editorContext: mockEditorContext,
			mockEsprima: mockEsprima
		};
	}

	/**
	 * Executes a testcase, `func` with the global esprima replaced by `mockEsprima`
	 * @param {Object} mockEsprima
	 * @param {Function} func
	 * @returns {Object|orion.Promise}
	 */
	function withMockEsprima(mockEsprima, func) {
		var savedEsprima = (typeof esprima !== "undefined") ? esprima : undefined;
		var reset = function() {
			esprima = savedEsprima;
		};
		esprima = mockEsprima;
		var result, async;
		try {
			result = func();
			if (typeof result.then === "function") {
				async = true;
				return result.then(function(val) {
					reset();
					return new Deferred().resolve(val);
				}, function(err) {
					reset();
					return new Deferred().reject(err);
				});
			}
		} finally {
			if (!async) {
				reset();
			}
		}
	}

	var tests = {};
	tests.test_getAST = function() {
		var result = setup(),
		    astManager = result.astManager,
		    editorContext = result.editorContext,
		    mockEsprima = result.mockEsprima;

		return withMockEsprima(mockEsprima, function() {
			mockEsprima._setAST("this is the AST");
			return astManager.getAST(editorContext).then(function(ast) {
				assert.equal(ast, "this is the AST");
			});
		});
	};
	/**
	 * tests that the AST re-asked for is the cached copy
	 */
	tests.test_AST_cache_is_used = function() {
		var result = setup(),
		    astManager = result.astManager,
		    editorContext = result.editorContext,
		    mockEsprima = result.mockEsprima;

		var d = new Deferred();
		return withMockEsprima(mockEsprima, function() {
			var i = 0;
			mockEsprima.parse = function() {
				return "AST callcount " + (i++);
			};
			return astManager.getAST(editorContext).then(function(ast) {
				assert.equal(ast, "AST callcount 0");
				return astManager.getAST(editorContext).then(function(ast) {
					assert.equal(ast, "AST callcount 0");
				});
			});
		});
	};
	/**
	 * tests that the cache of ASTs is properly cleaned after an updated() call
	 */
	tests.test_AST_cache_is_invalidated = function() {
		var result = setup(),
		    astManager = result.astManager,
		    editorContext = result.editorContext,
		    mockEsprima = result.mockEsprima;

		return withMockEsprima(mockEsprima, function() {
			var i = 0;
			mockEsprima.parse = function() {
				return "AST callcount " + (i++);
			};
			return astManager.getAST(editorContext).then(function(ast) {
				assert.equal(ast, "AST callcount 0");
				astManager.updated({});
				// Ensure we do not receive the cached "AST callcount 0" after a model change
				return astManager.getAST(editorContext).then(function(ast) {
					assert.equal(ast, "AST callcount 1");
				});
			});
		});
	};
	/**
	 * Tests that getAST() still produces an AST even if the parser blows up.
	 */
	tests.test_getAST_with_throwy_parser = function() {
		var result = setup(),
		    astManager = result.astManager,
		    editorContext = result.editorContext,
		    mockEsprima = result.mockEsprima;

		return withMockEsprima(mockEsprima, function() {
			var error = new Error("Game over man");
			mockEsprima.parse = function() {
				throw error;
			};
			return astManager.getAST(editorContext).then(function(ast) {
				assert.ok(ast);
				assert.equal(ast.type, "Program");
				assert.equal(ast.errors[0].message, error.message);
			});
		});
	};

	return tests;
});
