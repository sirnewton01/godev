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
	'javascript/astManager',
	'orion/Deferred',
	'javascript/occurrences'
], function(Assert, ASTManager, Deferred, Occurrences) {
	
	var astManager = new ASTManager.ASTManager();
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
		}	
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
	};
	
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
			Assert.fail("The occurrence array cannot be null");
		}
		Assert.equal(results.length, expected.length, "The wrong number of occurrences was returned");
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
				Assert.fail("Found an unknown occurrence: [start "+results[k].start+"][end "+results[k].end+"]");
			}
		}
	};
	
	/**
	 * @name setContext
	 * @description Delegate helper to set and return the context
	 * @function
	 * @public
	 * @param {Number} start The start of the editor selection
	 * @param {Number} end The end of thhe editor selection
	 * @returns {Object} the modified context object
	 */
	function setContext(start, end) {
		context.selection.start = start;
		context.selection.end = end;
		return context;
	}
	
	var Tests = {};
		
	/**
	 * Tests a function declaration
	 */
	Tests.test_funcDeclaration1 = function() {
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
	};
	
	/**
	 * Tests a function expression
	 */
	Tests.test_funcExpression1 = function() {
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
	};
	
	/**
	 * Tests an object expression
	 */
	Tests.test_objExpression1 = function() {
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
	};
		
	/**
	 * Tests nested function declarations
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncDecl1 = function() {
		editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
		return occurrences.computeOccurrences(editorContext, setContext(12, 12)).then(function(results) {
			try {
				assertOccurrences(results, [{start:11, end:13}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function declarations
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncDecl2 = function() {
		editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
		return occurrences.computeOccurrences(editorContext, setContext(29, 29)).then(function(results) {
			try {
				assertOccurrences(results, [{start:28, end:30}, {start:43, end:45}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function declarations
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncDecl3 = function() {
		editorContext.text = "function f(p1) { function b(p1) { var p2 = p1; };};";
		return occurrences.computeOccurrences(editorContext, setContext(44, 44)).then(function(results) {
			try {
				assertOccurrences(results, [{start:28, end:30}, {start:43, end:45}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr1 = function() {
		editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
		return occurrences.computeOccurrences(editorContext, setContext(30, 30)).then(function(results) {
			try {
				assertOccurrences(results, [{start:28, end:30}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr2 = function() {
		editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
		return occurrences.computeOccurrences(editorContext, setContext(47, 47)).then(function(results) {
			try {
				assertOccurrences(results, [{start:45, end:47}, {start:60, end:62}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr3 = function() {
		editorContext.text = "var object = {one: function(p1) { function b(p1) { var p2 = p1; }; }};";
		return occurrences.computeOccurrences(editorContext, setContext(62, 62)).then(function(results) {
			try {
				assertOccurrences(results, [{start:60, end:62}, {start:45, end:47}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr4 = function() {
		editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
		return occurrences.computeOccurrences(editorContext, setContext(13, 13)).then(function(results) {
			try {
				assertOccurrences(results, [{start:11, end:13}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr5 = function() {
		editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
		return occurrences.computeOccurrences(editorContext, setContext(47, 47)).then(function(results) {
			try {
				assertOccurrences(results, [{start:45, end:47}, {start:59, end:61}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr6 = function() {
		editorContext.text = "function b(p1) { var object = {one: function(p1) {var p2 = p1; } };};";
		return occurrences.computeOccurrences(editorContext, setContext(61, 61)).then(function(results) {
			try {
				assertOccurrences(results, [{start:45, end:47}, {start:59, end:61}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr7 = function() {
		editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
		return occurrences.computeOccurrences(editorContext, setContext(21, 21)).then(function(results) {
			try {
				assertOccurrences(results, [{start:19, end:21}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr8 = function() {
		editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
		return occurrences.computeOccurrences(editorContext, setContext(63, 63)).then(function(results) {
			try {
				assertOccurrences(results, [{start:61, end:63}, {start:75, end:77}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests nested function expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=423835
	 */
	Tests.test_nestedFuncExpr9 = function() {
		editorContext.text = "var out = function(p1) {var inner = {object : {one: function(p1) {var p2 = p1;}}};};";
		return occurrences.computeOccurrences(editorContext, setContext(77, 77)).then(function(results) {
			try {
				assertOccurrences(results, [{start:61, end:63}, {start:75, end:77}]);
			}
			finally {
				tearDown();
			}
		});
	};

	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse1 = function() {
		editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
		return occurrences.computeOccurrences(editorContext, setContext(36, 36)).then(function(results) {
			try {
				assertOccurrences(results, [{start:33, end:37}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse2 = function() {
		editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
		return occurrences.computeOccurrences(editorContext, setContext(64, 64)).then(function(results) {
			try {
				assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse3 = function() {
		editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
		return occurrences.computeOccurrences(editorContext, setContext(75, 75)).then(function(results) {
			try {
				assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse4 = function() {
		editorContext.text = "var foo = function() {function f(prob) {} function f2() {var prob = {};	prob.foo = null;return prob;}};";
		return occurrences.computeOccurrences(editorContext, setContext(98, 98)).then(function(results) {
			try {
				assertOccurrences(results, [{start:61, end:65}, {start:72, end:76}, {start:95, end:99}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse5 = function() {
		editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
		return occurrences.computeOccurrences(editorContext, setContext(36, 36)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse6 = function() {
		editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
		return occurrences.computeOccurrences(editorContext, setContext(86, 86)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests function decls with same named params / vars in same scope
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=424951
	 */
	Tests.test_functionDeclUse7 = function() {
		editorContext.text = "var bar = function() {function MyObject() {}; var o = {i: function() {return new MyObject().foo;}};return MyObject;};";
		return occurrences.computeOccurrences(editorContext, setContext(111, 111)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:39}, {start:81, end:89}, {start:106, end:114}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes1 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(33, 33)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes2 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(41, 41)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes3 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(68, 68)).then(function(results) {
			try {
				assertOccurrences(results, [{start:31, end:33}, {start:40, end:42}, {start:67, end:69}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes4 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(80, 80)).then(function(results) {
			try {
				assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes5 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(87, 87)).then(function(results) {
			try {
				assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes6 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(113, 113)).then(function(results) {
			try {
				assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests multiple function decls marked in use and returns
	 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=425036
	 */
	Tests.test_functionDeclScopes7 = function() {
		editorContext.text = "var foo = function() {function c2() {};	c2.prototype.constructor = c2;function c() {};c.prototype.constructor = c;return {c: c}};";
		return occurrences.computeOccurrences(editorContext, setContext(126, 126)).then(function(results) {
			try {
				assertOccurrences(results, [{start:79, end:80}, {start:86, end:87}, {start:112, end:113}, {start:125, end:126}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
		/**
	 * Tests this usage in global
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageGlobal = function() {
		editorContext.text = "this.v1 = 1; var v2 = this.v1 + 1;";
		return occurrences.computeOccurrences(editorContext, setContext(2, 2)).then(function(results) {
			try {
				assertOccurrences(results, [{start:0, end:4}, {start:22, end:26}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests this usage from 2 functions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageFunctions = function() {
		editorContext.text = "function f1(p1) {this.p1=p1;}; function f2(p2) {this.p2=p2;};";
		return occurrences.computeOccurrences(editorContext, setContext(19, 19)).then(function(results) {
			try {
				assertOccurrences(results, [{start:17, end:21}, {start:48, end:52}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests this usage in 2 objects
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageObjects = function() {
		editorContext.text = "var o1={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}}; var o2={v1: 'a', f1: function(){ if (this.v1){ this.v1++; }}};";
		return occurrences.computeOccurrences(editorContext, setContext(39, 39)).then(function(results) {
			try {
				assertOccurrences(results, [{start:37, end:41}, {start:47, end:51}, {start:100, end:104}, {start:110, end:114}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests this usage when function expressions are nested inside call expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageCallExpressions1 = function() {
		editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
		return occurrences.computeOccurrences(editorContext, setContext(19, 19)).then(function(results) {
			try {
				assertOccurrences(results, [{start:17, end:21}, {start:29, end:33}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests this usage when function expressions are nested inside call expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageCallExpressions2 = function() {
		editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
		return occurrences.computeOccurrences(editorContext, setContext(52, 52)).then(function(results) {
			try {
				assertOccurrences(results, [{start:51, end:55}, {start:63, end:67}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests this usage when function expressions are nested inside call expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageCallExpressions3 = function() {
		editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
		return occurrences.computeOccurrences(editorContext, setContext(87, 87)).then(function(results) {
			try {
				assertOccurrences(results, [{start:85, end:89}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
		/**
	 * Tests this usage when function expressions are nested inside call expressions
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424756
	 */
	Tests.test_thisUsageCallExpressions4 = function() {
		editorContext.text = "function f1(p1) {this.a1=p1; this.f2(function(p2) {this.a2=p2; this.f3(function(p3) {this.a3=p3;});}, function(p4) {this.a4=p4;});};";
		return occurrences.computeOccurrences(editorContext, setContext(116, 116)).then(function(results) {
			try {
				assertOccurrences(results, [{start:116, end:120}]);
			}
			finally {
				tearDown();
			}
		});
	};
	
	return Tests;
});