/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env window, mocha, node, amd*/
define([
	'chai/chai',
	'webtools/cssOutliner',
	'mocha/mocha' //not a module, leave it at the end
], function(chai, cssOutliner) {
	
	var assert = chai.assert;	

	describe('CSS Outliner Tests', function() {
							
		/**
		 * @name assertElement
		 * @description Checks the given element against the expected outline results to make sure it is outlined correctly
		 * @function
		 * @public
		 * @param {Object} element The computed outline element to check
		 * @param {String} label The expected outline label
		 * @param {Number} length The expected text length offset of the element
		 * @param {Number} line The expected line number element
		 * @param {Number} offset The expected column offset of the element
		 */
		function assertElement(element, label, length, line, offset) {
			if(!element) {
				assert.fail("The tested element cannot be null");
			}
			if(!element.label) {
				assert.fail("The outlined element must have a label");
			}
			if(!element.length) {
				assert.fail("The outlied element must have a length");
			}
			if(!element.line) {
				assert.fail("The outlined element must have a line number");
			}
			if(!element.offset) {
				assert.fail("The outlied element must have an offset");
			}
			assert.equal(element.label, label, "The label is not the same");
			assert.equal(element.length, length, "The length is not the same");
			assert.equal(element.line, line, "The line number is not the same");
			assert.equal(element.offset, offset, "The offset is not the same");
		}
			
		it('test_simple', function() {
			var text = ".simple {}";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".simple", 6, 1, 1);
		});
		
		it('test_simpleContent', function() {
			var text = ".simpleContent {\ndisplay:inline;\n}";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".simpleContent", 13, 1, 1);
		});
		
		it('test_simpleWhitespace', function() {
			var text = "   \t\t\t.simpleWhitespace   \t\t\t{}";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".simpleWhitespace", 16, 1, 7);
		});
		
		it('test_simpleComment', function() {
			var text = "/*\n* Comment\n*/\n.simpleComment {\ndisplay:inline;\n/* Comment */\n}";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".simpleComment", 13, 4, 1);
		});
		
		it('test_simpleContentNoSemiColon', function() {
			var text = ".simpleContentNoSemiColon {\n display:inline\n }";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".simpleContentNoSemiColon", 24, 1, 1);
		});
		
		it('test_simpleID', function() {
			var text = "#simpleID\n {\n	display:inline;\n }";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], "#simpleID", 8, 1, 1);
		});
		
		it('test_multiNoSymbol', function() {
			var text = ".multi .multi2 { display:inline; }";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			// TODO cssLint returns text with three spaces for unknown reason
			assertElement(outline[0], ".multi   .multi2", 5, 1, 1);
		});
		
		it('test_multiSymbol', function() {
			var text = ".multiSym, .multi2 { display:inline; }";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], ".multiSym, .multi2", 8, 1, 1);
		});
/*		
		it('test_', function() {
			var text = "";
			var outliner = new cssOutliner.CssOutliner();
			var outline = outliner.getOutline(text);
			if(!outline || outline.length < 1) {
				assert.fail("There should be one outline element");
			}
			assertElement(outline[0], "", , , );
		});
*/		
	});	
});