/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global console:true define*/
define([
	'orion/assert',
	'javascript/finder',
	'javascript/astManager',
	'orion/Deferred'
], function(Assert, Finder, ASTManager, Deferred) {
	
	var astManager = new ASTManager.ASTManager();
	var editorContext = {
		text: "",
		/**
		 * get the text
		 */
		getText: function() {
			return new Deferred().resolve(this.text);
		}
	};
	/**
	 * @description Sets up the test
	 * @public
	 * @param {String} text The compilation unit text
	 */
	function setUp(text) {
		return {
			text: text,
			/**
			 * get the text
			 */
			getText: function() {
				return new Deferred().resolve(this.text);
			}
		};
	}
	
	/**
	 * @name tearDown
	 * @description Resets the test state between runs, must explicitly be called per-test
	 * @function
	 * @public
	 */
	function tearDown() {
		editorContext.text = "";
		astManager.updated();
	};
	
	var Tests = {
		/***/
		test_findWord1: function() {
			var word = Finder.findWord('function(param1, param2)', 12);
			Assert.equal(word, 'param1', 'Should have found the word param1');
		},
		/***/
		test_findWord2: function() {
			var word = Finder.findWord('function(param1, param2)', 9);
			Assert.equal(word, 'param1', 'Should have found the word param1');
		},
		/***/
		test_findWord3: function() {
			var word = Finder.findWord('function(param1, param2)', 17);
			Assert.equal(word, 'param2', 'Should have found the word param2');
		},
		/***/
		test_findWord4: function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 4);
			Assert.equal(word, 'foo', 'Should have found the word foo');
		},
		/***/
		test_findWord5: function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 8);
			Assert.equal(word, 'bar', 'Should have found the word bar');
		},
		/***/
		test_findWord6: function() {
			var word = Finder.findWord('f =function(p1) {', 3);
			Assert.equal(word, 'function', 'Should have found word function');
		},
		/***/
		test_findWord7: function() {
			var word = Finder.findWord('f ={foo:true', 4);
			Assert.equal(word, 'foo', 'Should have found word foo');
		},
		/***/
		test_findWord8: function() {
			var word = Finder.findWord('function(param1, param2)', 15);
			Assert.equal(word, 'param1', 'Should have found word param1');
		},
		/***/
		test_findWord9: function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 7);
			Assert.equal(word, 'foo', 'Should have found word foo');
		},
		/***/
		test_findWord10: function() {
			var word = Finder.findWord('   foo.bar = function(param1, param2)', 4);
			Assert.equal(word, 'foo', 'Should have found word foo');
		},
		/***/
		test_findWord11: function() {
			var word = Finder.findWord('	foo.bar = function(param1, param2)', 2);
			Assert.equal(word, 'foo', 'Should have found word foo');
		},
		/***/
		test_findNoWord1: function() {
			var word = Finder.findWord('f: function(p1, p2)', 2);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord2: function() {
			var word = Finder.findWord('f: function(p1, p2)', 15);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord3: function() {
			var word = Finder.findWord('f: function(p1) {', 16);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord4: function() {
			var word = Finder.findWord('f: function(p1) {', 17);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord5: function() {
			var word = Finder.findWord('f = function(p1) {', 2);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord6: function() {
			var word = Finder.findWord('f = function(p1) {', 3);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord7: function() {
			var word = Finder.findWord('var a = [1, 2]', 7);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNoWord8: function() {
			var word = Finder.findWord('var a = [1, 2]', 14);
			Assert.equal(word, null, 'Should have found no word');
		},
		/***/
		test_findNode1: function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(9, ast);
					if(!node) {
						Assert.fail("Should have found a node");
					}
					else {
						Assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
					}
				});
			}
			finally {
				tearDown();
			}
		},
		/***/
		test_findNode2: function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(12, ast);
					if(!node) {
						Assert.fail("Should have found a node");
					}
					else {
						Assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		},
		/***/
		test_findNode3: function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(14, ast);
					if(!node) {
						Assert.fail("Should have found a node");
					}
					else {
						Assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		},
		
		/***/
		test_findNode4: function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(28, ast);
					if(!node) {
						Assert.fail("Should have found a node");
					}
					else {
						Assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		},
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken1: function() {
			return astManager.getAST(setUp("(")).then(function(ast) {
				try {
					var token = Finder.findToken(0, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						Assert.equal(token.value, '(', 'Should have found a ( token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken2: function() {
			var text = "var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(4, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						Assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken3: function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(21, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						Assert.equal(token.value, '}', 'Should have found a } token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken4: function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						Assert.equal(token.value, 'var', 'Should have found a var token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken5: function() {
			var text = "var foo.baz / = 43;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(12, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						Assert.equal(token.value, '/', 'Should have found a / token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken6: function() {
			var text = "var foo.baz / = 43;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						Assert.equal(token.value, 'var', 'Should have found a var token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken7: function() {
			var text = "var function f1() {";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(7, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						Assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken8: function() {
			var text = "var function f1() {";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(18, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						Assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken9: function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(-1, ast.tokens);
					Assert.equal(token, null, "Should not have found a token for out of range");
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a correct AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken10: function() {
			var text = "function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(9, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						Assert.equal(token.value, 'f', 'Should have found a f token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken11: function() {
			var text = "var foo = {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(8, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						Assert.equal(token.value, '=', 'Should have found a = token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken12: function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(11, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						Assert.equal(token.value, 'f', 'Should have found a f token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken13: function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(14, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						Assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken14: function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(18, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						Assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		test_findToken15: function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(23, ast.tokens);
					if(!token) {
						Assert.fail("Should have found a token");
					}
					else {
						Assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						Assert.equal(token.value, ')', 'Should have found a ) token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		},
	};
	
	return Tests;
});