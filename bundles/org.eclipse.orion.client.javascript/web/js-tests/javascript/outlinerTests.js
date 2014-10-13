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
	'javascript/outliner',
	'mocha/mocha' //not a module, leave it at the end
], function(chai, Esprima, ASTManager, Deferred, Outliner) {
	
	var assert = chai.assert;	

	describe('Outliner Tests', function() {
		var astManager = new ASTManager.ASTManager(Esprima);
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
		}
		
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
				assert.fail("The tested element cannot be null");
			}
			if(!element.label) {
				assert.fail("The outlined element must have a label");
			}
			if(!element.start) {
				assert.fail("The outlined element must have a start range");
			}
			if(!element.end) {
				assert.fail("The outlined element must have an end range");
			}
			var fullLabel = element.label;
			if (element.labelPre){
				fullLabel = element.labelPre + fullLabel;
			}
			if (element.labelPost){
				fullLabel += element.labelPost;
			}
			assert.equal(fullLabel, label, "The label is not the same");
			assert.equal(element.start, start, "The start range is not the same");
			assert.equal(element.end, end, "The end range is not the same");
		}
			
		it('testfuncDeclaration1', function() {
			context.text = "function F1(p1, p2) {};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "F1(p1, p2)", 9, 11);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testfuncExpression1', function() {
			context.text = "var obj = {\n"+
				"\titem: function(p1, p2) {}\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item(p1, p2)", 13, 17);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression1', function() {
			context.text = "var object = {};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {...}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression2', function() {
			context.text = "var object = {a: \"\", b: \"\", c: \"\"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {a, b, c}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression3', function() {
			context.text = "var object = {\"a\": \"\", \"b\": \"\", \"c\": \"\"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {Object, Object, Object}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression3', function() {
			// Max length for properties is 50 characters
			context.text = "var object = {A123456789B123456789C123456789D123456789E123456789: \"\"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {A123456789B123456789C123456789D123456789E123456789}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression4', function() {
			// Max length for properties is 50 characters
			context.text = "var object = {A123456789B123456789C123456789D123456789E123456789F: \"\"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {...}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectExpression5', function() {
			// Max length for properties is 50 characters
			context.text = "var object = {a: \"\", b: \"\", A123456789B123456789C123456789D123456789E123456789F: \"\"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "var object = {a, b, ...}", 4, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testClosure1', function() {
			context.text = "foo.bar({});";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "closure {...}", 8, 10);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testClosure1', function() {
			context.text = "foo.bar({a: \"\", b: \"\"});";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					assertElement(outline[0], "closure {a, b}", 8, 22);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral1', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": function(p1, p2) {}\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item(p1, p2)", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral2', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": null\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral3', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": {}\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item {...}", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral4', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": function(p1, p2) {}\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item(p1, p2)", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral5', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": null\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		it('testObjectPropertyLiteral6', function() {
			context.text = "var obj = {\n"+
				"\t\"item\": {}\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "item {...}", 13, 19);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a return statement that is an object expression
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
		 */
		it('testReturnObject1', function() {
			context.text = "function f1() {\n"+
				"\t return {};\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "return {...}", 18, 24);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a return statement that is an object expression
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
		 */
		it('testReturnObject2', function() {
			context.text = "function f1() {\n"+
				"\t return function() {};\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "return {...}", 18, 24);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a return statement that is an object expression
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
		 */
		it('testReturnObject3', function() {
			context.text = "function f1() {\n"+
				"\t return {\n"+
				"\t\tf1: function() {return {};}"+
				"\t};"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one level one child outline element");
					}
					if(!outline[0].children[0].children || outline[0].children[0].children.length < 1) {
						assert.fail("There should be one level two child outline element");
					}
					if(!outline[0].children[0].children[0].children || outline[0].children[0].children[0].children.length < 1) {
						assert.fail("There should be one level three child outline element");
					}
					assertElement(outline[0].children[0].children[0].children[0], "return {...}", 45, 51);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a return statement that is an object expression
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
		 */
		it('testReturnObject4', function() {
			context.text = "function f1() {\n"+
				"\t return {\n"+
				"\t\tf1: function() {return function() {};}"+
				"\t};"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one level one child outline element");
					}
					if(!outline[0].children[0].children || outline[0].children[0].children.length < 1) {
						assert.fail("There should be one level two child outline element");
					}
					if(!outline[0].children[0].children[0].children || outline[0].children[0].children[0].children.length < 1) {
						assert.fail("There should be one level three child outline element");
					}
					assertElement(outline[0].children[0].children[0].children[0], "return {...}", 45, 51);
				}
				finally {
					tearDown();
				}
			});
		});
		
		/**
		 * Tests a return statement that is an object expression
		 * @see https://bugs.eclipse.org/bugs/show_bug.cgi?id=424202
		 */
		it('testReturnObject5', function() {
			context.text = "function f1() {\n"+
				"\t return {a: \"\", b: \"\"};\n"+
				"};";
			return outliner.computeOutline(context).then(function(outline) {
				try {
					if(!outline || outline.length < 1) {
						assert.fail("There should be one outline element");
					}
					if(!outline[0].children || outline[0].children.length < 1) {
						assert.fail("There should be one child outline element");
					}
					assertElement(outline[0].children[0], "return {a, b}", 18, 24);
				}
				finally {
					tearDown();
				}
			});
		});
		
	});	
});