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
				assert.ok(false, "The occurrence array cannot be null");
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
					assert.ok(false, "Found an unknown occurrence: [start "+results[k].start+"][end "+results[k].end+"]");
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
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable1', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(4, 9)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable2', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable3', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(30, 30)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleVariable4', function() {
			editorContext.text = "var reDef; var a=reDef; var reDef; var b=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(46, 46)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:28, end:33}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined in nested scopes
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
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable2', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(66, 66)).then(function(results) {
				try {
					assertOccurrences(results, [{start:64, end:69}, {start:77, end:82}, {start:88, end:93}, {start:101, end:106}, {start:128, end:133}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined in nested scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable3', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(133, 133)).then(function(results) {
				try {
					assertOccurrences(results, [{start:64, end:69}, {start:77, end:82}, {start:88, end:93}, {start:101, end:106}, {start:128, end:133}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a variable is redefined in nested scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedVariable4', function() {
			editorContext.text = "var reDef; var a=reDef; function f1(){var b=reDef;} function f2(reDef){var c=reDef;	var reDef; var d=reDef;	function f3(){var e=reDef;}} var f=reDef;";
			return occurrences.computeOccurrences(editorContext, setContext(143, 143)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:17, end:22}, {start:44, end:49}, {start:143, end:148}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction1', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(9, 14)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction2', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(20, 20)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction3', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(40, 40)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineSimpleFunction4', function() {
			editorContext.text = "function reDef(){}; reDef(); function reDef(){}; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(54, 54)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:38, end:43}, {start:49, end:54}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
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
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction2', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(67, 67)).then(function(results) {
				try {
					assertOccurrences(results, [{start:65, end:70}, {start:72, end:77}, {start:90, end:95}, {start:101, end:106}, {start:124, end:129}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction3', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(129, 129)).then(function(results) {
				try {
					assertOccurrences(results, [{start:65, end:70}, {start:72, end:77}, {start:90, end:95}, {start:101, end:106}, {start:124, end:129}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests when a function is redefined in nested scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=427928
		 */
		it('test_redefineNestedFunction4', function() {
			editorContext.text = "function reDef(){}; reDef(); function f1(){reDef();} function f2(reDef){reDef(); function reDef(){}; reDef(); function f3(){reDef();}} reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(135, 135)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:20, end:25}, {start:43, end:48}, {start:135, end:140}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesVar1', function() {
			editorContext.text = "var reDef; function f(){ var reDef; } log(reDef);";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:42, end:47}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesVar2', function() {
			editorContext.text = "var reDef; function f(){ var reDef; } log(reDef);";
			return occurrences.computeOccurrences(editorContext, setContext(30, 32)).then(function(results) {
				try {
					assertOccurrences(results, [{start:29, end:34}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesVar3', function() {
			editorContext.text = "var reDef; function f(){ var reDef; } log(reDef);";
			return occurrences.computeOccurrences(editorContext, setContext(45, 45)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:9}, {start:42, end:47}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncDecl1', function() {
			editorContext.text = "function reDef() { function reDef(){}; } reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(9, 9)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncDecl2', function() {
			editorContext.text = "function reDef() { function reDef(){}; } reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(28, 33)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncDecl3', function() {
			editorContext.text = "function reDef() { function reDef(){}; } reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(45, 46)).then(function(results) {
				try {
					assertOccurrences(results, [{start:9, end:14}, {start:41, end:46}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncExpr1', function() {
			editorContext.text = "var a = function reDef() { var b = function reDef(){}; }; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:17, end:22}, {start:58, end:63}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncExpr2', function() {
			editorContext.text = "var a = function reDef() { var b = function reDef(){}; }; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(44, 44)).then(function(results) {
				try {
					assertOccurrences(results, [{start:44, end:49}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that occurrences with redefines are only marked inside appropriate scopes
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesFuncExpr3', function() {
			editorContext.text = "var a = function reDef() { var b = function reDef(){}; }; reDef();";
			return occurrences.computeOccurrences(editorContext, setContext(63, 63)).then(function(results) {
				try {
					assertOccurrences(results, [{start:17, end:22}, {start:58, end:63}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that even though assignment comes before declaration, occurrences recognizes that the declaration will be hoisted to the top of the scope
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesHoisting1', function() {
			editorContext.text = "var reDef; function f() { log(reDef); var reDef; }";
			return occurrences.computeOccurrences(editorContext, setContext(35, 35)).then(function(results) {
				try {
					assertOccurrences(results, [{start:30, end:35}, {start:42, end:47}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests that even though call comes before declaration, occurrences recognizes that the declaration will be hoisted to the top of the scope
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438317
		 */
		it('test_redefineScopesHoisting2', function() {
			editorContext.text = "function reDef(){}; function f() { reDef(); function reDef(){}; }";
			return occurrences.computeOccurrences(editorContext, setContext(35, 35)).then(function(results) {
				try {
					assertOccurrences(results, [{start:35, end:40}, {start:53, end:58}]);
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
		/**
		 * Tests computing occurrences for with statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_with_1', function() {
			editorContext.text = "var f = 3; with(f) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for with statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_with_2', function() {
			editorContext.text = "var f = 3; with(f) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(16, 16)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for with statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_with_test_3', function() {
			editorContext.text = "var f = 3; with(f) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(20, 20)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:16, end:17}, {start:20, end:21}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_1', function() {
			editorContext.text = "var f = 3; for(f in bar) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_2', function() {
			editorContext.text = "var f = 3; for(f in bar) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(15, 15)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_3', function() {
			editorContext.text = "var f = 3; for(f in bar) {f = 2;}";
			return occurrences.computeOccurrences(editorContext, setContext(26, 26)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:15, end:16}, {start:26, end:27}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_4', function() {
			editorContext.text = "var f = 3; for(var q in f) {q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_5', function() {
			editorContext.text = "var f = 3; for(var q in f) {q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(24, 24)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for for-in statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436630
		 */
		it('test_for-in_6', function() {
			editorContext.text = "var f = 3; for(var q in f) {q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(32, 32)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:24, end:25}, {start:32, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for while statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_while_1', function() {
			editorContext.text = "var f = 3; while(f) {var q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for while statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_while_2', function() {
			editorContext.text = "var f = 3; while(f) {var q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(17, 17)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests computing occurrences for while statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_while_3', function() {
			editorContext.text = "var f = 3; while(f) {var q = f;}";
			return occurrences.computeOccurrences(editorContext, setContext(29, 29)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:17, end:18}, {start:29, end:30}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_1A', function() {
			editorContext.text = "Objects.mixin({ test1: function() {}, test2: function() { return this.test1(); } });";
			return occurrences.computeOccurrences(editorContext, setContext(19, 19)).then(function(results) {
				try {
					assertOccurrences(results, [{start:16, end:21}, {start:70, end:75}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_1B', function() {
			editorContext.text = "Objects.mixin({ test1: function() {}, test2: function() { return this.test1(); } });";
			return occurrences.computeOccurrences(editorContext, setContext(71, 71)).then(function(results) {
				try {
					assertOccurrences(results, [{start:16, end:21}, {start:70, end:75}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_2A', function() {
			editorContext.text = "var foo = { test1: function() {}, test2: function() { return this.test1(); } };";
			return occurrences.computeOccurrences(editorContext, setContext(15, 15)).then(function(results) {
				try {
					assertOccurrences(results, [{start:12, end:17}, {start:66, end:71}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_2B', function() {
			editorContext.text = "var foo = { test1: function() {}, test2: function() { return this.test1(); } };";
			return occurrences.computeOccurrences(editorContext, setContext(66, 71)).then(function(results) {
				try {
					assertOccurrences(results, [{start:12, end:17}, {start:66, end:71}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_3A', function() {
			editorContext.text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
			return occurrences.computeOccurrences(editorContext, setContext(11, 11)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:12}, {start:19, end:20}, {start:68, end:69}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_3B', function() {
			editorContext.text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
			return occurrences.computeOccurrences(editorContext, setContext(28, 28)).then(function(results) {
				try {
					assertOccurrences(results, [{start:28, end:29}, {start:36, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_3C', function() {
			editorContext.text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
			return occurrences.computeOccurrences(editorContext, setContext(60, 61)).then(function(results) {
				try {
					assertOccurrences(results, [{start:60, end:61}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests computing occurrences for object properties and references to them
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423083
		 */
		it('test_object_properties_3D', function() {
			editorContext.text = "var foo = {a: this.a(), b: {a: this.a(), c: {a: this.a()}}, c: this.a()};";
			return occurrences.computeOccurrences(editorContext, setContext(68, 69)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:12}, {start:19, end:20}, {start:68, end:69}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests whether occurrences finds and selects the correct token/word/node
		 */
		it('test_punctuators_1A', function() {
			editorContext.text = "var \tfoo ; bar\n;";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, []);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests whether occurrences finds and selects the correct token/word/node
		 */
		it('test_punctuators_1B', function() {
			editorContext.text = "var \tfoo ; bar\n;";
			return occurrences.computeOccurrences(editorContext, setContext(9, 9)).then(function(results) {
				try {
					assertOccurrences(results, []);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests whether occurrences finds and selects the correct token/word/node
		 */
		it('test_punctuators_1C', function() {
			editorContext.text = "var \tfoo ; bar\n;";
			return occurrences.computeOccurrences(editorContext, setContext(10, 10)).then(function(results) {
				try {
					assertOccurrences(results, []);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests whether occurrences finds and selects the correct token/word/node
		 */
		it('test_punctuators_1D', function() {
			editorContext.text = "var \tfoo ; bar\n;";
			return occurrences.computeOccurrences(editorContext, setContext(15, 15)).then(function(results) {
				try {
					assertOccurrences(results, []);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests named function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
		 */
		it('test_namedFuncExpr1', function() {
			editorContext.text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
			return occurrences.computeOccurrences(editorContext, setContext(11, 11)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:11, end:12},  {start:32, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests named function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
		 */
		it('test_namedFuncExpr2', function() {
			editorContext.text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
			return occurrences.computeOccurrences(editorContext, setContext(32, 32)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:11, end:12},  {start:32, end:33}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests named function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
		 */
		it('test_namedFuncExpr3', function() {
			editorContext.text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
			return occurrences.computeOccurrences(editorContext, setContext(41, 42)).then(function(results) {
				try {
					assertOccurrences(results, [{start:41, end:42}, {start:62, end:63}, {start:71, end:72}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		
		/**
		 * Tests named function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
		 */
		it('test_namedFuncExpr4', function() {
			editorContext.text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
			return occurrences.computeOccurrences(editorContext, setContext(63, 63)).then(function(results) {
				try {
					assertOccurrences(results, [{start:41, end:42}, {start:62, end:63}, {start:71, end:72}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests named function expressions
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438083
		 */
		it('test_namedFuncExpr5', function() {
			editorContext.text = "var a; log(a); var x = function a(){ log(a); var y = function a(){ log(a); }; };";
			return occurrences.computeOccurrences(editorContext, setContext(72, 72)).then(function(results) {
				try {
					assertOccurrences(results, [{start:41, end:42}, {start:62, end:63}, {start:71, end:72}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests named function expression in object property
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=439641
		 * TODO Add a test if the carat is in the named function expression or the call expression.
		 */
		it('test_namedFuncExpr6', function() {
			editorContext.text = "var x = { a: function a() {} }; a();";
			return occurrences.computeOccurrences(editorContext, setContext(11, 11)).then(function(results) {
				try {
					assertOccurrences(results, [{start:10, end:11}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests throw statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
		 */
		it('test_throwStatement1', function() {
			editorContext.text = "var a; throw a;";
			return occurrences.computeOccurrences(editorContext, setContext(4, 4)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:13, end:14}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests throw statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
		 */
		it('test_throwStatement2', function() {
			editorContext.text = "var a; function f() { if(a) { throw a; }}";
			return occurrences.computeOccurrences(editorContext, setContext(25, 25)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:25, end:26}, {start:36, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests throw statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=438402
		 */
		it('test_throwStatement3', function() {
			editorContext.text = "var a; function f() { if(a) { throw a; }}";
			return occurrences.computeOccurrences(editorContext, setContext(36, 36)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:25, end:26}, {start:36, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement1', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(4, 5)).then(function(results) {
				try {
					assertOccurrences(results, [{start:4, end:5}, {start:20, end:21}]);
				}
				finally {
					tearDown();
				}
			});
		});

		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement2', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(11, 12)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:12}, {start:123, end:124}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement3', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(123, 124)).then(function(results) {
				try {
					assertOccurrences(results, [{start:11, end:12}, {start:123, end:124}]);
				}
				finally {
					tearDown();
				}
			});
		});
		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement4', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(49, 50)).then(function(results) {
				try {
					assertOccurrences(results, [{start:49, end:50}, {start:107, end:108}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement5', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(65, 66)).then(function(results) {
				try {
					assertOccurrences(results, [{start:41, end:42}, {start:65, end:66}, {start:73, end:74}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=436728
		 */
		it('test_labeledStatement6', function() {
			editorContext.text = "var a = 9; a: while(a) { if(false) { var b = {}; b: for(var x in b) { if(b === null || x === null) { break b; } } continue a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(107, 108)).then(function(results) {
				try {
					assertOccurrences(results, [{start:49, end:50}, {start:107, end:108}]);
				}
				finally {
					tearDown();
				}
			});
		});		
		
		/**
		 * Tests repeated labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementRepeat1', function() {
			editorContext.text = "a: while(true){ break a; } a: while(true){ break a; }";
			return occurrences.computeOccurrences(editorContext, setContext(0, 1)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests repeated labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementRepeat2', function() {
			editorContext.text = "a: while(true){ break a; } a: while(true){ break a; }";
			return occurrences.computeOccurrences(editorContext, setContext(23, 23)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:22, end:23}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests repeated labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementRepeat3', function() {
			editorContext.text = "a: while(true){ break a; } a: while(true){ break a; }";
			return occurrences.computeOccurrences(editorContext, setContext(27, 27)).then(function(results) {
				try {
					assertOccurrences(results, [{start:27, end:28}, {start:49, end:50}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests repeated labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementRepeat4', function() {
			editorContext.text = "a: while(true){ break a; } a: while(true){ break a; }";
			return occurrences.computeOccurrences(editorContext, setContext(49, 50)).then(function(results) {
				try {
					assertOccurrences(results, [{start:27, end:28}, {start:49, end:50}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests nested loop labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLoop1', function() {
			editorContext.text = "a: while(true){ while(true) { break a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(0, 0)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:36, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests nested loop labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLoop2', function() {
			editorContext.text = "a: while(true){ while(true) { break a; } }";
			return occurrences.computeOccurrences(editorContext, setContext(37, 37)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:36, end:37}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests nested labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLabel1', function() {
			editorContext.text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
			return occurrences.computeOccurrences(editorContext, setContext(0, 1)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:54, end:55}]);
				}
				finally {
					tearDown();
				}
			});
		});	
		
		/**
		 * Tests nested labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLabel2', function() {
			editorContext.text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
			return occurrences.computeOccurrences(editorContext, setContext(54, 54)).then(function(results) {
				try {
					assertOccurrences(results, [{start:0, end:1}, {start:54, end:55}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLabel3', function() {
			editorContext.text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
			return occurrences.computeOccurrences(editorContext, setContext(16, 16)).then(function(results) {
				try {
					assertOccurrences(results, [{start:16, end:17}, {start:75, end:76}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests nested labeled statements
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=440928
		 */
		it('test_labeledStatementNestedLabel4', function() {
			editorContext.text = "a: while(true){ b: while(true) { if (true) { continue a; } else { continue b; } } }";
			return occurrences.computeOccurrences(editorContext, setContext(75, 76)).then(function(results) {
				try {
					assertOccurrences(results, [{start:16, end:17}, {start:75, end:76}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests global usage
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
		 */
		it('test_global1', function() {
			editorContext.text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
			return occurrences.computeOccurrences(editorContext, setContext(14, 14)).then(function(results) {
				try {
					assertOccurrences(results, [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests global usage
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
		 */
		it('test_global2', function() {
			editorContext.text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
			return occurrences.computeOccurrences(editorContext, setContext(40, 41)).then(function(results) {
				try {
					assertOccurrences(results, [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests global usage
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=429173
		 */
		it('test_global3', function() {
			editorContext.text = "(function() { window.alert('hi'); }()); window.setTimeout(); window.confirm('florp');";
			return occurrences.computeOccurrences(editorContext, setContext(61, 62)).then(function(results) {
				try {
					assertOccurrences(results, [{start:14, end:20}, {start:40, end:46}, {start: 61, end: 67}]);
				}
				finally {
					tearDown();
				}
			});
		});
	});
});
