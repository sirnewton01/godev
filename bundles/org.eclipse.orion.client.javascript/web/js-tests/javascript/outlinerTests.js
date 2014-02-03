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
	'javascript/outliner'
], function(Assert, ASTManager, Deferred, Outliner) {
	
	var astManager = new ASTManager.ASTManager();
	var outliner = new Outliner.JSOutliner(astManager);
	var context = {
		text: "",
		/**
		 * gets the text
		 */
		getText: function() {
			return new Deferred().resolve(this.text);
		}
	};
		
	/**
	 * @name tearDown
	 * @description Resets the test state between runs, must explicitly be called per-test
	 * @function
	 * @public
	 */
	function tearDown() {
		context.text = "";
		astManager.updated();
	};
	
	/**
	 * @name assertElement
	 * @description Checks the given element against the expected name, start and end to make sure it is outlined correctly
	 * @function
	 * @public
	 * @param {Object} element The computed outline element to check
	 * @param {String} label The expected outline label
	 * @param {Number} start The expected start offset of the element
	 * @param {Number} end The expected end offset of the element
	 */
	function assertElement(element, label, start, end) {
		if(!element) {
			Assert.fail("The tested element cannot be null");
		}
		if(!element.label) {
			Assert.fail("The outlined element must have a label");
		}
		if(!element.start) {
			Assert.fail("The outlined element must have a start range");
		}
		if(!element.end) {
			Assert.fail("The outlied element must have an end range");
		}
		Assert.equal(element.label, label, "The label is not the same");
		Assert.equal(element.start, start, "The start range is not the same");
		Assert.equal(element.end, end, "The end range is not the same");
	};
	
	var Tests = {};
		
	/**
	 * Tests a function declaration
	 */
	Tests.test_funcDeclaration1 = function() {
			context.text = "function F1(p1, p2) {};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						Assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "F1(p1, p2)", 9, 11);
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
		context.text = "var obj = {\n"+
			"\titem: function(p1, p2) {}\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item(p1, p2)", 13, 17);
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
		context.text = "var object = {};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				assertElement(outline[0], "var object = {...}", 4, 10);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal wwhose value is a function
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal1 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": function(p1, p2) {}\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item(p1, p2)", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal whose value has not been set
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal2 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": null\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal whose value is another object expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal3 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": {}\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item {...}", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal wwhose value is a function
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal1 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": function(p1, p2) {}\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item(p1, p2)", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal whose value has not been set
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal2 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": null\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests an object property that is a literal whose value is another object expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424149
	 */
	Tests.test_objproperty_literal3 = function() {
		context.text = "var obj = {\n"+
			"\t\"item\": {}\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "item {...}", 13, 19);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests a return statement that is an object expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
	 */
	Tests.test_returnobj1 = function() {
		context.text = "function f1() {\n"+
			"\t return {};\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "return {...}", 18, 24);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests a return statement that is an function expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
	 */
	Tests.test_returnobj2 = function() {
		context.text = "function f1() {\n"+
			"\t return function() {};\n"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one child outline element");
				}
				assertElement(outline[0].children[0], "return {...}", 18, 24);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests a return statement that is an object expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
	 */
	Tests.test_returnobj3 = function() {
		context.text = "function f1() {\n"+
			"\t return {\n"+
			"\t\tf1: function() {return {};}"+
			"\t};"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one level one child outline element");
				}
				if(!outline[0].children[0].children || outline[0].children[0].children.length < 1) {
					Assert.fail("There should be one level two child outline element");
				}
				if(!outline[0].children[0].children[0].children || outline[0].children[0].children[0].children.length < 1) {
					Assert.fail("There should be one level three child outline element");
				}
				assertElement(outline[0].children[0].children[0].children[0], "return {...}", 45, 51);
			}
			finally {
				tearDown();
			}
		});
	};
	
	/**
	 * Tests a return statement that is an object expression
	 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
	 */
	Tests.test_returnobj4 = function() {
		context.text = "function f1() {\n"+
			"\t return {\n"+
			"\t\tf1: function() {return function() {};}"+
			"\t};"+
			"};";
		return outliner.computeOutline(context).then(function(outline) {
			try {
				if(!outline || outline.length < 1) {
					Assert.fail("There should be one outline element");
				}
				if(!outline[0].children || outline[0].children.length < 1) {
					Assert.fail("There should be one level one child outline element");
				}
				if(!outline[0].children[0].children || outline[0].children[0].children.length < 1) {
					Assert.fail("There should be one level two child outline element");
				}
				if(!outline[0].children[0].children[0].children || outline[0].children[0].children[0].children.length < 1) {
					Assert.fail("There should be one level three child outline element");
				}
				assertElement(outline[0].children[0].children[0].children[0], "return {...}", 45, 51);
			}
			finally {
				tearDown();
			}
		});
	};
		
	return Tests;
});