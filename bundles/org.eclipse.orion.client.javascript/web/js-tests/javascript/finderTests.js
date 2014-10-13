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
/*eslint-env amd, node, mocha*/
define([
	'chai/chai',
	'esprima',
	'javascript/finder',
	'javascript/astManager',
	'orion/Deferred',
	'mocha/mocha' // not a module, leave it at the end
], function(chai, Esprima, Finder, ASTManager, Deferred) {
	var assert = chai.assert;

	describe('Finder Tests', function() {
		var astManager = new ASTManager.ASTManager(Esprima);
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
		}
	
		it('test_findWord1', function() {
			var word = Finder.findWord('function(param1, param2)', 12);
			assert.equal(word, 'param1', 'Should have found the word param1');
		});
		it('test_findWord2', function() {
			var word = Finder.findWord('function(param1, param2)', 9);
			assert.equal(word, 'param1', 'Should have found the word param1');
		});
		it('test_findWord3', function() {
			var word = Finder.findWord('function(param1, param2)', 17);
			assert.equal(word, 'param2', 'Should have found the word param2');
		});
		it('test_findWord4', function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 4);
			assert.equal(word, 'foo', 'Should have found the word foo');
		});
		it('test_findWord5', function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 8);
			assert.equal(word, 'bar', 'Should have found the word bar');
		});
		it('test_findWord6', function() {
			var word = Finder.findWord('f =function(p1) {', 3);
			assert.equal(word, 'function', 'Should have found word function');
		});
		it('test_findWord7', function() {
			var word = Finder.findWord('f ={foo:true', 4);
			assert.equal(word, 'foo', 'Should have found word foo');
		});
		it('test_findWord8', function() {
			var word = Finder.findWord('function(param1, param2)', 15);
			assert.equal(word, 'param1', 'Should have found word param1');
		});
		it('test_findWord9', function() {
			var word = Finder.findWord('var foo.bar = function(param1, param2)', 7);
			assert.equal(word, 'foo', 'Should have found word foo');
		});
		it('test_findWord10', function() {
			var word = Finder.findWord('   foo.bar = function(param1, param2)', 4);
			assert.equal(word, 'foo', 'Should have found word foo');
		});
		it('test_findWord11', function() {
			var word = Finder.findWord('	foo.bar = function(param1, param2)', 2);
			assert.equal(word, 'foo', 'Should have found word foo');
		});
		it('test_findNoWord1', function() {
			var word = Finder.findWord('f: function(p1, p2)', 2);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord2', function() {
			var word = Finder.findWord('f: function(p1, p2)', 15);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord3', function() {
			var word = Finder.findWord('f: function(p1) {', 16);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord4', function() {
			var word = Finder.findWord('f: function(p1) {', 17);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord5', function() {
			var word = Finder.findWord('f = function(p1) {', 2);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord6', function() {
			var word = Finder.findWord('f = function(p1) {', 3);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord7', function() {
			var word = Finder.findWord('var a = [1, 2]', 7);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNoWord8', function() {
			var word = Finder.findWord('var a = [1, 2]', 14);
			assert.equal(word, null, 'Should have found no word');
		});
		it('test_findNode1', function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(9, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
					}
				});
			}
			finally {
				tearDown();
			}
		});
		it('test_findNode2', function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(12, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		});
		it('test_findNode3', function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(14, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		});
		
		it('test_findNode4', function() {
			try {
				editorContext.text = "function  F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
				return astManager.getAST(editorContext).then(function(ast) {
					var node = Finder.findNode(28, ast);
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found a Identifier node');
					}
				});
			}
			finally {
				tearDown();
			}
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427303
		 * @since 6.0
		 */
		it('test_findNodeAndParents1', function() {
			editorContext.text = "function  F1(p1, p2) {\n"+
				"\tvar out = p1;\n"+
				"};";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(9, ast, {parents:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
    					assert.equal(node.parents.length, 1, 'Should have found one parent');
    					assert.equal(node.parents[0].type, 'Program', 'The program node should be the only parent');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427303
		 * @since 6.0
		 */
		it('test_findNodeAndParents2', function() {
			editorContext.text = "function  F1(p1, p2) {\n"+
				"\tvar out = p1;\n"+
				"};";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
					var node = Finder.findNode(14, ast, {parents:true});
					if(!node) {
						assert.fail("Should have found a node");
					}
					else {
						assert.equal(node.type, 'Identifier', 'Should have found an Identifier node');
						assert.equal(node.parents.length, 2, 'Should have found two parents');
						assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
						assert.equal(node.parents[1].type, 'FunctionDeclaration', 'Should have found the parent function decl as the second parent');
					}
				}
    			finally {
    				tearDown();
    			}
			});
		});
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437548
		 * @since 6.0
		 */
		it('test_findNodeAndParents3', function() {
			editorContext.text = "function  F1(p1, p2) {\n"+
				"\tvar out = p1;\n"+
				"};";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(4, ast, {parents:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
    					assert.equal(node.parents.length, 1, 'Should have found one parent');
    					assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		/**
		 * Tests finding the next node from a given node offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
		 * @since 7.0
		 */
		it('test_findNodeNext1', function() {
			editorContext.text = "/** */ function  F1(p1, p2) {}";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(6, ast, {parents:true, next:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
    					assert.equal(node.parents.length, 1, 'Should have found one parent');
    					assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		/**
		 * Tests finding the next node from a given node offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
		 * @since 7.0
		 */
		it('test_findNodeNext2', function() {
			editorContext.text = "/** */ /** */ function  F1(p1, p2) {}";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(6, ast, {parents:true, next:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'FunctionDeclaration', 'Should have found a FunctionDeclaration node');
    					assert.equal(node.parents.length, 1, 'Should have found one parent');
    					assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the first parent');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		/**
		 * Tests finding the next node from a given node offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
		 * @since 7.0
		 */
		it('test_findNodeNext3', function() {
			editorContext.text = "function  F1(p1, p2) {}";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(6, ast, {parents:true, next:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'Identifier', 'Should have found an Identifier node');
    					assert.equal(node.parents.length, 2, 'Should have found two parent');
    					assert.equal(node.parents[0].type, 'Program', 'Should have found the parent Program node as the second parent');
    					assert.equal(node.parents[1].type, 'FunctionDeclaration', 'Should have found the parent FunctionDeclaration node as the first parent');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		
		/**
		 * Tests finding the next node from a given node offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=442411
		 * @since 7.0
		 */
		it('test_findNodeNext3', function() {
			editorContext.text = "/** */ ";
			return astManager.getAST(editorContext).then(function(ast) {
			    try {
    				var node = Finder.findNode(6, ast, {parents:true, next:true});
    				if(!node) {
    					assert.fail("Should have found a node");
    				}
    				else {
    					assert.equal(node.type, 'Program', 'Should have found the Program node');
    				}
				}
        		finally {
        			tearDown();
        		}
			});
			
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken1', function() {
			return astManager.getAST(setUp("(")).then(function(ast) {
				try {
					var token = Finder.findToken(0, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '(', 'Should have found a ( token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken2', function() {
			var text = "var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(4, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken3', function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(21, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '}', 'Should have found a } token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken4', function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'var', 'Should have found a var token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken5', function() {
			var text = "var foo.baz / = 43;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(12, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found a Punctuator token');
						assert.equal(token.value, '/', 'Should have found a / token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken6', function() {
			var text = "var foo.baz / = 43;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(1, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'var', 'Should have found a var token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken7', function() {
			var text = "var function f1() {";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(7, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken8', function() {
			var text = "var function f1() {";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(7, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found a Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken9', function() {
			var text = "(var function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(-1, ast.tokens);
					assert.equal(token, null, "Should not have found a token for out of range");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a correct AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken10', function() {
			var text = "function f() {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(9, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'f', 'Should have found a f token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken11', function() {
			var text = "var foo = {}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(8, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						assert.equal(token.value, '=', 'Should have found a = token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken12', function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(11, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'f', 'Should have found a f token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken13', function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(14, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken14', function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(18, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Keyword', 'Should have found an Keyword token');
						assert.equal(token.value, 'function', 'Should have found a function token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in a broken AST
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426399
		 */
		it('test_findToken15', function() {
			var text = "var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(23, ast.tokens);
					if(!token) {
						assert.fail("Should have found a token");
					}
					else {
						assert.equal(token.type, 'Punctuator', 'Should have found an Punctuator token');
						assert.equal(token.value, ')', 'Should have found a ) token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken16', function() {
			var text = "var   foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(4, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken17', function() {
			var text = "var   foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(5, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken18', function() {
			var text = "var foo = {  f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(12, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken19', function() {
			var text = "var foo = {f:   function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(14, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken20', function() {
			var text = "var foo = {f:   function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(15, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken21', function() {
			var text = "  var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(1, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken22', function() {
			var text = "  var foo = {f:   function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(0, ast.tokens);
					assert.equal(null, token, 'Should not have found a token');
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token in an AST with copious whitespace
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427931
		 */
		it('test_findToken23', function() {
			var text = "function f3(  foo   ,   bar   , baz) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(17, ast.tokens);
					if(!token) {
						assert.fail('Should have found a token');
					}
					else {
						assert.equal(token.type, 'Identifier', 'Should have found an Identifier token');
						assert.equal(token.value, 'foo', 'Should have found a foo token');
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment1', function() {
			var text = "/***/var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(0, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment2', function() {
			var text = "/***/var foo = {f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment3', function() {
			var text = "var foo = {/***/f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(11, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment4', function() {
			var text = "var foo = {/***/f: function() {}}";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(14, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment5', function() {
			var text = "/***/function f() {/***/};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(19, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a comment
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=426033
		 */
		it('test_findComment6', function() {
			var text = "/***/function f() {/***/};/***/";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(26, ast);
					if(comment) {
						assert.fail("Should not have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440828
		 * @since 7.0
		 */
		it('test_findComment7', function() {
			var text = "/*";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(2, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
		 * @since 7.0
		 */
		it('test_findComment8', function() {
			var text = "var f; /*";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(9, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
		 * @since 7.0
		 */
		it('test_findComment9', function() {
			var text = "/* var f;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(9, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440920
		 * @since 7.0
		 */
		it('test_findComment10', function() {
			var text = "var b; /* var f;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(16, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
		 * @since 7.0
		 */
		it('test_findComment11', function() {
			var text = "// .";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
		 * @since 7.0
		 */
		it('test_findComment12', function() {
			var text = "// . foo bar";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=444001
		 * @since 7.0
		 */
		it('test_findComment12', function() {
			var text = "// .\nvar foo = 10;";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var comment = Finder.findComment(4, ast);
					if(!comment) {
						assert.fail("Should have found a comment");
					}
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findTokenBadOffset1', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(-1, ast);
					assert.equal(token, null, "Should not have found a token for a negative offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findTokenBadOffset2', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(null, ast);
					assert.equal(token, null, "Should not have found a token for a null offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a token with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findTokenBadOffset3', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findToken(undefined, ast);
					assert.equal(token, null, "Should not have found a token for an undefined offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a node with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findNodeBadOffset1', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findNode(null, ast);
					assert.equal(token, null, "Should not have found a node for a null offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a node with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findNodeBadOffset2', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findNode(-1, ast);
					assert.equal(token, null, "Should not have found a node for a negative offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Find a node with a bogus offset
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427141
		 */
		it('test_findNodeBadOffset3', function() {
			var text = "if(()) {};";
			return astManager.getAST(setUp(text)).then(function(ast) {
				try {
					var token = Finder.findNode(undefined, ast);
					assert.equal(token, null, "Should not have found a node for an undefined offset");
				}
				finally {
					astManager.updated();
				}
			});
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlock1', function() {
			var text = "<!DOCTYPE html><head><script>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlock2', function() {
			var text = "<!DOCTYPE html><head><scriPt>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlock3', function() {
			var text = "<!DOCTYPE html><head><script>function f() {}</scriPt></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlock4', function() {
			var text = "<!DOCTYPE html><head><scRipt>function f() {}</scripT></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlock5', function() {
			var text = "<!DOCTYPE html><head><scriPt   >function f() {}</scRIpt></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 32);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMulti1', function() {
			var text = "<!DOCTYPE html><head><script>function f() {}</script><script>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two script blocks");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
			assert.equal(blocks[1].offset, 61);
			assert.equal(blocks[1].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMulti2', function() {
			var text = "<!DOCTYPE html><head><scrIpt>function f() {}</script><scRipt>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two script blocks");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
			assert.equal(blocks[1].offset, 61);
			assert.equal(blocks[1].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMulti3', function() {
			var text = "<!DOCTYPE html><head><scripT>function f() {}</scriPt><scRipt>function f() {}</Script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two script blocks");
			assert.equal(blocks[0].offset, 29);
			assert.equal(blocks[0].text, 'function f() {}');
			assert.equal(blocks[1].offset, 61);
			assert.equal(blocks[1].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMulti4', function() {
			var text = "<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two script blocks");
			assert.equal(blocks[0].offset, 30);
			assert.equal(blocks[0].text, 'function f() {}');
			assert.equal(blocks[1].offset, 64);
			assert.equal(blocks[1].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMultiWithOffset1', function() {
			var text = "<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 39);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 30);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockMultiWithOffset2', function() {
			var text = "<!DOCTYPE html><head><script >function f() {}</script><script  >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 71);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 64);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_findScriptBlockWithOffset1', function() {
			var text = "<!DOCTYPE html><head><script >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 39);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 30);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble1', function() {
			var text = "<!DOCTYPE html><head><script type='javascript'>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 48);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 47);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble2', function() {
			var text = "<!DOCTYPE html><head><script type=javascript  >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 48);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 47);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble3', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  >function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 47);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble4', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type='javascript' ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 47);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble5', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type=javascript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 47);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble6', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  >function f() {}</script type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 47);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble7', function() {
			var text = "<!DOCTYPE html><head>< script source=foo bar  >function f() {}</script type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 48);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 47);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble8', function() {
			var text = "<!DOCTYPE html><head><   scrIpt source=foo bar  >function f() {}</script type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 50);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 49);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findScriptBlockWithSpacePostamble9', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  >function f() {}<   /scrIpt type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 47);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 46);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithType1', function() {
			var text = "<!DOCTYPE html><head><script type=\"\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 51);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 37);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithType2', function() {
			var text = "<!DOCTYPE html><head><script type=\"text/javascript\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 54);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 52);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithType3', function() {
			var text = "<!DOCTYPE html><head><script type=\"text/handlebars\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 54);
			assert.equal(blocks.length, 0, "Should have found no script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockWithType4', function() {
			var text = "<!DOCTYPE html><head>\n";
			text += "<script type=\"application/ecmascript\">function f1() {}</script>\n";
			text += "<script type=\"application/javascript\">function f2() {}</script>\n";
			text += "<script type=\"application/x-ecmascript\">function f3() {}</script>\n";
			text += "<script type=\"application/x-javascript\">function f4() {}</script>\n";
			text += "<script type=\"text/ecmascript\">function f5() {}</script>\n";
			text += "<script type=\"text/javascript\">function f6() {}</script>\n";
			text += "<script type=\"text/javascript1.0\">function f7() {}</script>\n";
			text += "<script type=\"text/javascript1.5\">function f8() {}</script>\n";
			text += "<script type=\"text/jscript\">function f9() {}</script>\n";
			text += "<script type=\"text/livescript\">function f10() {}</script>\n";
			text += "<script type=\"text/x-ecmascript\">function f11() {}</script>\n";
			text += "<script type=\"text/x-javascript\">function f12() {}</script>\n";
			text += "</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 12, "Should have found 12 script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockWithType5', function() {
			var text = "<!DOCTYPE html><head>\n";
			text += "<script type=\"ecmascript\">function f1() {}</script>\n";
			text += "<script type=\"javascript\">function f2() {}</script>\n";
			text += "<script type=\"application\">function f3() {}</script>\n";
			text += "<script type=\"application/\">function f4() {}</script>\n";
			text += "<script type=\"application/xml\">function f5() {}</script>\n";
			text += "<script type=\"application/javascriptBLARGH\">function f6() {}</script>\n";
			text += "<script type=\"text\">function f7() {}</script>\n";
			text += "<script type=\"text/\">function f8() {}</script>\n";
			text += "<script type=\"text/plain\">function f9() {}</script>\n";
			text += "<script type=\"text/xml\">function f10() {}</script>\n";
			text += "<script type=\"text/javascript1.1.1\">function f11() {}</script>\n";
			text += "<script type=\"text/javascript1\">function f12() {}</script>\n";
			text += "<script type=\"text/javascriptBLARGH\">function f13() {}</script>\n";
			text += "</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 0, "Should have found 0 valid script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithLanguage1', function() {
			var text = "<!DOCTYPE html><head><script language=\"javascript\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 53);
			assert.equal(blocks.length, 1, "Should have found one script block");
			assert.equal(blocks[0].offset, 51);
			assert.equal(blocks[0].text, 'function f() {}');
		});
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithLanguage2', function() {
			var text = "<!DOCTYPE html><head><script language=\"text/javascript\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 58);
			assert.equal(blocks.length, 0, "Should have found no valid script block");
		});
		/**
		 * Tests the support for finding script blocks with type tags
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437489
		 */
		it('test_findScriptBlockWithLanguage3', function() {
			var text = "<!DOCTYPE html><head><script language=\"text/handlebars\">function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 58);
			assert.equal(blocks.length, 0, "Should have found no valid script block");
		});

		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockWithLanguage4', function() {
			var text = "<!DOCTYPE html><head>\n";
			text += "<script language=\"ecmascript\">function f1() {}</script>\n";
			text += "<script language=\"javascript\">function f2() {}</script>\n";
			text += "<script language=\"javascript1.0\">function f3() {}</script>\n";
			text += "<script language=\"javascript1.5\">function f4() {}</script>\n";
			text += "<script language=\"jscript\">function f5() {}</script>\n";
			text += "<script language=\"livescript\">function f6() {}</script>\n";
			text += "<script language=\"x-ecmascript\">function f7() {}</script>\n";
			text += "<script language=\"x-javascript\">function f8() {}</script>\n";
			text += "</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 8, "Should have found 8 script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockWithLanguage5', function() {
			var text = "<!DOCTYPE html><head>\n";
			text += "<script language=\"application/ecmascript\">function f1() {}</script>\n";
			text += "<script language=\"text/ecmascript\">function f2() {}</script>\n";
			text += "<script language=\"application\">function f3() {}</script>\n";
			text += "<script language=\"application/\">function f4() {}</script>\n";
			text += "<script language=\"javascriptBLARGH\">function f5() {}</script>\n";
			text += "<script language=\"text\">function f6() {}</script>\n";
			text += "<script language=\"text/\">function f7() {}</script>\n";
			text += "<script language=\"plain\">function f8() {}</script>\n";
			text += "<script language=\"xml\">function f9() {}</script>\n";
			text += "<script language=\"javascript1.1.1\">function f10() {}</script>\n";
			text += "<script language=\"javascript1\">function f11() {}</script>\n";
			text += "</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 0, "Should have found 0 valid script blocks");
		});

		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findNoScriptBlockWithSpacePostamble1', function() {
			var text = "<!DOCTYPE html><head><script <source=foo bar  >function f() {}</script type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 39);
			assert.equal(blocks.length, 0, "Should not have found any script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks in HTML with postamble text
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=433263
		 */
		it('test_findNoScriptBlockWithSpacePostamble2', function() {
			var text = "<!DOCTYPE html><head><script source=foo bar  > source='js'>function f() {}</script type= javas cript ></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 39);
			assert.equal(blocks.length, 0, "Should not have found any script blocks");
		});
		
		/**
		 * Tests finding script blocks within comments
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
		 */
		it('test_findNoScriptBlockInHTMLComment1', function() {
			var text = "<!DOCTYPE html><head><!--<script>function f() {}</script>--></head><html></html>";
			var blocks = Finder.findScriptBlocks(text, 39);
			assert.equal(blocks.length, 0, "Should not have found any script blocks");
		});
		/**
		 * Tests finding script blocks within comments
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
		 */
		it('test_findNoScriptBlockInHTMLComment2', function() {
			var text = "<!DOCTYPE html><head><!--<script>function f() {}</script>--><script>function f() {}</script><!--<script>function f() {}</script>--></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found one script block");
		});
		/**
		 * Tests finding script blocks within comments
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
		 */
		it('test_findNoScriptBlockInHTMLComment3', function() {
			var text = "<!DOCTYPE html><head><!--<script>function f() {}</script><script>function f() {}</script><script>function f() {}</script>--></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 0, "Should have found no script blocks");
		});
		/**
		 * Tests finding script blocks within comments
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=431054
		 */
		it('test_findNoScriptBlockInHTMLComment2', function() {
			var text = "<!DOCTYPE html><head><script>function f() {}</script><!--<script>function f() {}</script>--><script>function f() {}</script></head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 2, "Should have found two script blocks");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockEmptyAndMixedAttributes1', function() {
			var text = "<!DOCTYPE html><head><script language=\"BLARGH\" type=\"\">function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found 1 script block");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockEmptyAndMixedAttributes2', function() {
			var text = "<!DOCTYPE html><head><script language=\"\">function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found 1 script block");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockEmptyAndMixedAttributes3', function() {
			var text = "<!DOCTYPE html><head><script>function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found 1 script block");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockEmptyAndMixedAttributes4', function() {
			var text = "<!DOCTYPE html><head><script language=\"BLARGH\" type=\"text/javascript\">function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			assert.equal(blocks.length, 1, "Should have found 1 script block");
		});
		
		/**
		 * Tests the support for finding script blocks is spec compliant
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findScriptBlockEmptyAndMixedAttributes5', function() {
			var text = "<!DOCTYPE html><head><script type=\"text/javascript\" language=\"BLARGH\">function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			// If we have both attributes, the regex will always take the last matching 
//			assert.equal(blocks.length, 1, "Should have found 1 script block");
			assert.equal(blocks.length, 0, "We don't currently support both type and language attributes on a script tag (Bug 437957)");
		});
		
		/**
		 * Tests the support for finding declarations
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=437957
		 */
		it('test_findDeclaration1', function() {
			var text = "<!DOCTYPE html><head><script type=\"text/javascript\" language=\"BLARGH\">function f() {}</script>\n</head><html></html>";
			var blocks = Finder.findScriptBlocks(text);
			// If we have both attributes, the regex will always take the last matching 
//			assert.equal(blocks.length, 1, "Should have found 1 script block");
			assert.equal(blocks.length, 0, "We don't currently support both type and language attributes on a script tag (Bug 437957)");
		});

	});
});
