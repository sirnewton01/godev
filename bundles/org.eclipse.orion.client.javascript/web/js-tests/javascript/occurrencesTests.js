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
/*global console:true describe:true it:true define*/
define([
	'chai/chai',
	'esprima',
	'javascript/astManager',
	'orion/Deferred',
	'javascript/occurrences',
	'mocha/mocha'  //must stay at the end, not a module
], function(chai, Esprima, ASTManager, Deferred, Occurrences) {
	var assert = chai.assert;
	
	describe('Occurrences Tests', function() {
		var astManager = new ASTManager.ASTManager(Esprima);
		var occurrences = new Occurrences.JavaScriptOccurrences(astManager);
		var editorContext = {
			text: "",
			/**
			 * get the text
			 */
			getText: function() {
				return new Deferred().resolve(this.text);
			}
		};
		var context = {
			selection: {
				start:-1,
				end: -1
			},
			contentType: 'application/javascript'
		};
			
		/**
		 * @name tearDown
		 * @description Resets the test state between runs, must explicitly be called per-test
		 * @function
		 * @public
		 */
		function tearDown() {
			editorContext.text = "";
			astManager.updated();
			context.selection.start = -1;
			context.selection.end = -1;
			context.contentType = 'application/javascript';
		}
		
		/**
		 * @name assertOccurrence
		 * @description Checks the given occurrence against the expected start and end to make sure it is marked correctly
		 * @function
		 * @public
		 * @param {Array} results The computed occurrence elements to check
		 * @param {Array} expected The array of expected start/end pairs
		 */
		function assertOccurrences(results, expected) {
			if(!results) {
				assert.fail("The occurrence array cannot be null");
			}
			assert.equal(results.length, expected.length, "The wrong number of occurrences was returned");
			for(var i = 0; i < expected.length; i++) {
				//for each expected result try to find it in the results, and remove it if it is found
				for(var j = 0; j < results.length; j++) {
					if(!results[j]) {
						continue;
					}
					if((expected[i].start === results[j].start) && (expected[i].end === results[j].end)) {
						results[j] = null;
					}
				}
			}
			for(var k = 0; k < results.length; k++) {
				if(results[k]) {
					assert.fail("Found an unknown occurrence: [start "+results[k].start+"][end "+results[k].end+"]");
				}
			}
		}
		
		/**
		 * @name setContext
		 * @description Delegate helper to set and return the context
		 * @function
		 * @public
		 * @param {Number} start The start of the editor selection
		 * @param {Number} end The end of thhe editor selection
		 * @param {String} contentType Optional content type descriptor
		 * @returns {Object} the modified context object
		 */
		function setContext(start, end, contentType) {
			context.selection.start = start;
			context.selection.end = end;
			if(contentType) {
				context.contentType = contentType;
			}
			return context;
		}
		
		/**
		 * Tests a function declaration
		 */
		it('test_funcDeclaration1', function() {
			editorContext.text = "function F1(p1, p2) {\n"+
					"\tvar out = p1;\n"+
					"};";
			return occurrences.computeOccurrences(editorContext, setContext(13, 13)).then(function(results) {
				try {
					//expected to fail until https://bugs.eclipse.org/bugs/show_bug.cgi?id=423634 is fixed
					assertOccurrences(results, [{start:12, end:14}, {start:33, end:35}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a function expression
		 */
		it('test_funcExpression1', function() {
			editorContext.text = "var obj = {\n"+
					"\titem: function(p1, p2) {\n"+
					"\t\tvar out = p1;\n"+
					"\t}"+
					"};";
			return occurrences.computeOccurrences(editorContext, setContext(30, 30)).then(function(results) {
				try {
					//expected to fail until https://bugs.eclipse.org/bugs/show_bug.cgi?id=423634 is fixed
					assertOccurrences(results, [{start:28, end:30}, {start:50, end:52}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests an object expression
		 */
		it('test_objExpression1', function() {
			editorContext.text = "var object = {};"+
					"var newobject = object;";
			return occurrences.computeOccurrences(editorContext, setContext(5, 5)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:10}, {start:32, end:38}]);
				}
				finally {
					tearDown();
				}
			});
		});
			
		/**
		 * Tests nested function declarations
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncDecl1', function() {
			editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
			return occurrences.computeOccurrences(editorContext, setContext(12, 12)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:13}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function declarations
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncDecl2', function() {
			editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
			return occurrences.computeOccurrences(editorContext, setContext(29, 29)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:30}, {start:43, end:45}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function declarations
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncDecl3', function() {
			editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
			return occurrences.computeOccurrences(editorContext, setContext(44, 44)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:30}, {start:43, end:45}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr1', function() {
			editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
			return occurrences.computeOccurrences(editorContext, setContext(30, 30)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:30}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr2', function() {
			editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
			return occurrences.computeOccurrences(editorContext, setContext(47, 47)).then(function(results) {
				try {
					assertOccurrences(results, [{start:45, end:47}, {start:60, end:62}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr3', function() {
			editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
			return occurrences.computeOccurrences(editorContext, setContext(62, 62)).then(function(results) {
				try {
					assertOccurrences(results, [{start:60, end:62}, {start:45, end:47}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr4', function() {
			editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
			return occurrences.computeOccurrences(editorContext, setContext(13, 13)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:13}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr5', function() {
			editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
			return occurrences.computeOccurrences(editorContext, setContext(47, 47)).then(function(results) {
				try {
					assertOccurrences(results, [{start:45, end:47}, {start:59, end:61}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr6', function() {
			editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
			return occurrences.computeOccurrences(editorContext, setContext(61, 61)).then(function(results) {
				try {
					assertOccurrences(results, [{start:45, end:47}, {start:59, end:61}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr7', function() {
			editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
			return occurrences.computeOccurrences(editorContext, setContext(21, 21)).then(function(results) {
				try {
					assertOccurrences(results, [{start:19, end:21}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr8', function() {
			editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
			return occurrences.computeOccurrences(editorContext, setContext(63, 63)).then(function(results) {
				try {
					assertOccurrences(results, [{start:61, end:63}, {start:75, end:77}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
		 */
		it('test_nestedFuncExpr9', function() {
			editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
			return occurrences.computeOccurrences(editorContext, setContext(77, 77)).then(function(results) {
				try {
					assertOccurrences(results, [{start:61, end:63}, {start:75, end:77}]);
				}
				finally {
					tearDown();
				}
			});
		});
	
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse1', function() {
			editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
			return occurrences.computeOccurrences(editorContext, setContext(36, 36)).then(function(results) {
				try {
					assertOccurrences(results, [{start:33, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse2', function() {
			editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
			return occurrences.computeOccurrences(editorContext, setContext(64, 64)).then(function(results) {
				try {
					assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse3', function() {
			editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
			return occurrences.computeOccurrences(editorContext, setContext(75, 75)).then(function(results) {
				try {
					assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse4', function() {
			editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
			return occurrences.computeOccurrences(editorContext, setContext(98, 98)).then(function(results) {
				try {
					assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse5', function() {
			editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
			return occurrences.computeOccurrences(editorContext, setContext(36, 36)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse6', function() {
			editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
			return occurrences.computeOccurrences(editorContext, setContext(86, 86)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests function decls with same named params / vars in same scope
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
		 */
		it('test_functionDeclUse7', function() {
			editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
			return occurrences.computeOccurrences(editorContext, setContext(111, 111)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes1', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(33, 33)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes2', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(41, 41)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes3', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(68, 68)).then(function(results) {
				try {
					assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes4', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(80, 80)).then(function(results) {
				try {
					assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes5', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(87, 87)).then(function(results) {
				try {
					assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes6', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(113, 113)).then(function(results) {
				try {
					assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests multiple function decls marked in use and returns
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
		 */
		it('test_functionDeclScopes7', function() {
			editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
			return occurrences.computeOccurrences(editorContext, setContext(126, 126)).then(function(results) {
				try {
					assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in global
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageGlobal', function() {
			editorContext.text = "this.v1 = 1; var v2 = this.v1 + 1;";
			return occurrences.computeOccurrences(editorContext, setContext(2, 2)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:4}, {start:22, end:26}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage from 2 functions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageFunctions', function() {
			editorContext.text = "function f1(p1) {this.p1=p1;}; function f2(p2) {this.p2=p2;};";
			return occurrences.computeOccurrences(editorContext, setContext(19, 19)).then(function(results) {
				try {
					assertOccurrences(results, [{start:17, end:21}, {start:48, end:52}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in 2 objects
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageObjects1', function() {
			editorContext.text = "var o1={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}}; var o2={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}};";
			return occurrences.computeOccurrences(editorContext, setContext(39, 39)).then(function(results) {
				try {
					assertOccurrences(results, [{start:37, end:41}, {start:47, end:51}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in 2 objects
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageObjects2', function() {
			editorContext.text = "var o1={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}}; var o2={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}};";
			return occurrences.computeOccurrences(editorContext, setContext(102, 102)).then(function(results) {
				try {
					assertOccurrences(results, [{start:100, end:104}, {start:110, end:114}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in the root (global) scope of the file
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageGlobal1', function() {
			editorContext.text = "function f1() {this.foo =1;};this.bar = 2;";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:15, end:19}, {start:29, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in the root (global) scope of the file
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageGlobal2', function() {
			editorContext.text = "function f1() {this.foo =1;};this.bar = 2;";
			return occurrences.computeOccurrences(editorContext, setContext(31, 31)).then(function(results) {
				try {
					assertOccurrences(results, [{start:15, end:19}, {start:29, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in the root (global) scope of the file
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageGlobal3', function() {
			editorContext.text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in the root (global) scope of the file
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageGlobal4', function() {
			editorContext.text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
			return occurrences.computeOccurrences(editorContext, setContext(44, 44)).then(function(results) {
				try {
					assertOccurrences(results, [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in the root (global) scope of the file
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageGlobal3', function() {
			editorContext.text = "function f1() {this.foo =1;function f2() {this.baz = 3;}};this.bar = 2;";
			return occurrences.computeOccurrences(editorContext, setContext(60, 60)).then(function(results) {
				try {
					assertOccurrences(results, [{start:15, end:19}, {start:42, end:46}, {start:58, end:62}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in an object expression passed as a param
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageCallExpressionObject1', function() {
			editorContext.text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}}this.end = true;";
			return occurrences.computeOccurrences(editorContext, setContext(24, 24)).then(function(results) {
				try {
					assertOccurrences(results, [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in an object expression passed as a param
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageCallExpressionObject2', function() {
			editorContext.text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}}this.end = true;";
			return occurrences.computeOccurrences(editorContext, setContext(53, 53)).then(function(results) {
				try {
					assertOccurrences(results, [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage in an object expression passed as a param
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426930
		 */
		it('test_thisUsageCallExpressionObject3', function() {
			editorContext.text = "call({f1: function() {this.bool;},f2: function() {this.bool;},f3: function() {this.bool;}}this.end = true;";
			return occurrences.computeOccurrences(editorContext, setContext(81, 81)).then(function(results) {
				try {
					assertOccurrences(results, [{start:22, end:26}, {start:50, end:54}, {start:78, end:82}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage when function expressions are nested inside call expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageCallExpressions1', function() {
			editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
			return occurrences.computeOccurrences(editorContext, setContext(19, 19)).then(function(results) {
				try {
					assertOccurrences(results, [{start:17, end:21}, {start:29, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage when function expressions are nested inside call expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageCallExpressions2', function() {
			editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
			return occurrences.computeOccurrences(editorContext, setContext(52, 52)).then(function(results) {
				try {
					assertOccurrences(results, [{start:51, end:55}, {start:63, end:67}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests this usage when function expressions are nested inside call expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageCallExpressions3', function() {
			editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
			return occurrences.computeOccurrences(editorContext, setContext(87, 87)).then(function(results) {
				try {
					assertOccurrences(results, [{start:85, end:89}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
			/**
		 * Tests this usage when function expressions are nested inside call expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
		 */
		it('test_thisUsageCallExpressions4', function() {
			editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
			return occurrences.computeOccurrences(editorContext, setContext(116, 116)).then(function(results) {
				try {
					assertOccurrences(results, [{start:116, end:120}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression1', function() {
			editorContext.text = "function f(p1) { var v = (p1 && p1.foo)};";
			return occurrences.computeOccurrences(editorContext, setContext(12, 12)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression2', function() {
			editorContext.text = "function f(p1) { var v = (p1 && p1.foo)};";
			return occurrences.computeOccurrences(editorContext, setContext(27, 27)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression3', function() {
			editorContext.text = "function f(p1) { var v = (p1 && p1.foo)};";
			return occurrences.computeOccurrences(editorContext, setContext(33, 33)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:13}, {start:26, end:28}, {start:32, end:34}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression4', function() {
			editorContext.text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
			return occurrences.computeOccurrences(editorContext, setContext(37, 37)).then(function(results) {
				try {
					assertOccurrences(results, [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression5', function() {
			editorContext.text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
			return occurrences.computeOccurrences(editorContext, setContext(52, 52)).then(function(results) {
				try {
					assertOccurrences(results, [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=426933
		 */
		it('test_logicExpression6', function() {
			editorContext.text = "var o = { p: function() {function f(p1) { var v = (p1 && p1.foo)}}};";
			return occurrences.computeOccurrences(editorContext, setContext(58, 58)).then(function(results) {
				try {
					assertOccurrences(results, [{start:36, end:38}, {start:51, end:53}, {start:57, end:59}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression1', function() {
			editorContext.text = "var foo = 1;function f1() {};var bar = new f1(foo);";
			return occurrences.computeOccurrences(editorContext, setContext(6, 6)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:46, end:49}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression2', function() {
			editorContext.text = "var foo = 1;function f1() {};var bar = new f1(foo);";
			return occurrences.computeOccurrences(editorContext, setContext(48, 48)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:46, end:49}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression3', function() {
			editorContext.text = "var foo = 1;function f1() {};var o = {a: function() {var bar = new f1(foo);}}";
			return occurrences.computeOccurrences(editorContext, setContext(6, 6)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:70, end:73}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression4', function() {
			editorContext.text = "var foo = 1;function f1() {};var o = {a: function() {var bar = new f1(foo);}}";
			return occurrences.computeOccurrences(editorContext, setContext(72, 72)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:70, end:73}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression5', function() {
			editorContext.text = "var foo = 1;function f1() {};function f2() {var bar = new f1(foo);}";
			return occurrences.computeOccurrences(editorContext, setContext(6, 6)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:61, end:64}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests logic expressions that contain identifier nodes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427836
		 */
		it('test_newExpression6', function() {
			editorContext.text = "var foo = 1;function f1() {};function f2() {var bar = new f1(foo);}";
			return occurrences.computeOccurrences(editorContext, setContext(62, 62)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:61, end:64}]);
				}
				finally {
					tearDown();
				}
			});
		});
	
		/**
		 * Tests when a variable is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable1', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(4, 9)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable2', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable3', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(30, 30)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable4', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(46, 46)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable1', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(4, 9)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:44, end:49}, {start:143, end:148}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable2', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(66, 66)).then(function(results) {
				try {
					assertOccurrences(results, [{start:64, end:69}, {start:77, end:82}, {start:101, end:106}, {start:128, end:133}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
			/**
		 * Tests when a variable is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable3', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(133, 133)).then(function(results) {
				try {
					assertOccurrences(results, [{start:88, end:93}, {start:101, end:106}, {start:128, end:133}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * DISABLED marks occurrences inside the nested scope, fix as part of Bug 428133
		 * Tests when a variable is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
	//	it('test_redefineNestedVariable4', function() {
	//		editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
	//		return occurrences.computeOccurrences(editorContext, setContext(143, 143)).then(function(results) {
	//			try {
	//				assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:44, end:49}, {start:143, end:148}]);
	//			}
	//			finally {
	//				tearDown();
	//			}
	//		});
	//	};
		
		/**
		 * Tests when a function is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction1', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(9, 14)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction2', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(20, 20)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction3', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(40, 40)).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction4', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(54, 54)).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction1', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(9, 14)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:43, end:48}, {start:135, end:140}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction2', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(67, 67)).then(function(results) {
				try {
					assertOccurrences(results, [{start:65, end:70}, {start:72, end:77}, {start:101, end:106}, {start:124, end:129}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction3', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(129, 129)).then(function(results) {
				try {
					assertOccurrences(results, [{start:90, end:95}, {start:101, end:106}, {start:124, end:129}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * DISABLED marks occurrences inside the nested scope, fix as part of Bug 428133
		 * Tests when a function is redefined in nested scopes
		 * Must be updated when follow-up Bug 428133 is fixed
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
	//	it('test_redefineNestedFunction4', function() {
	//		editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
	//		return occurrences.computeOccurrences(editorContext, setContext(135, 135)).then(function(results) {
	//			try {
	//				assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:43, end:48}, {start:135, end:140}]);
	//			}
	//			finally {
	//				tearDown();
	//			}
	//		});
	//	};
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHead1', function() {
			editorContext.text = "<!DOCTYPE html><head><script>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(39, 39, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:39}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHead2', function() {
			editorContext.text = "<!DOCTYPE html><head><scRipt>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(39, 39, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:39}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHead3', function() {
			editorContext.text = "<!DOCTYPE html><head><scRipt  >function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(41, 41, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:40, end:41}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHeadMulti1', function() {
			editorContext.text = "<!DOCTYPE html><head><script>function f() {}</script><script>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(39, 39, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:39}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHeadMulti2', function() {
			editorContext.text = "<!DOCTYPE html><head><scRipt>function f() {}</script><script>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(39, 39, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:38, end:39}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHeadMulti3', function() {
			editorContext.text = "<!DOCTYPE html><head><scRipt   >function f() {}</script><script>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(42, 42, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:41, end:42}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences from a script block in the <head> block
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=430299
		 */
		it('test_htmlHeadMulti4', function() {
			editorContext.text = "<!DOCTYPE html><head><scRipt   >function f() {}</script><script>function f() {}</script></head><html></html>";
			return occurrences.computeOccurrences(editorContext, setContext(74, 74, 'text/html')).then(function(results) {
				try {
					assertOccurrences(results, [{start:73, end:74}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		//RECOVERED OCCURRENCES
		/**
		 * Tests computing occurrences within an AST that has been recovered
		 */
		it('test_recovered_occurrence 1', function() {
			editorContext.text = "var one = 1; func(one two); one = 23";
			return occurrences.computeOccurrences(editorContext, setContext(7, 7)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:18, end:21}, {start:28, end:31}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences within an AST that has been recovered
		 */
		it('test_recovered_occurrence 2', function() {
			editorContext.text = "var one = 1; var o = {f:one d:2}";
			return occurrences.computeOccurrences(editorContext, setContext(27, 27)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:7}, {start:24, end:27}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for for-loop inits
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_for_init_1', function() {
			editorContext.text = "var f = 3; for(f; i < 10; i++) {}";
			return occurrences.computeOccurrences(editorContext, setContext(5, 5)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:15, end:16}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for for-loop inits
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_for_init_2', function() {
			editorContext.text = "var f = 3; for(f; i < 10; i++) {}";
			return occurrences.computeOccurrences(editorContext, setContext(15, 15)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:15, end:16}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for for-loop inits
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_for_init_3', function() {
			editorContext.text = "var f = 3; for(var i = f; i < 10; i++) {}";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:23, end:24}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for do-while tests
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_do_while_test_1', function() {
			editorContext.text = "var f = 3; do{} while(f) {}";
			return occurrences.computeOccurrences(editorContext, setContext(5, 5)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for do-while tests
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_do_while_test_2', function() {
			editorContext.text = "var f = 3; do{} while(f) {}";
			return occurrences.computeOccurrences(editorContext, setContext(22, 22)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for do-while tests
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=435941
		 */
		it('test_do_while_test_3', function() {
			editorContext.text = "var f = 3; do{} while(f < 12) {}";
			return occurrences.computeOccurrences(editorContext, setContext(22, 22)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});
	});
});