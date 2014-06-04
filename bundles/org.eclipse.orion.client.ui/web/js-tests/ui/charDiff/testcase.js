/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define orion */

define(["chai/chai", "orion/compare/jsdiffAdapter"], function(chai, mJSDiffAdapter) {
	var assert = chai.assert;
	var tests = {};
	var adapter = new mJSDiffAdapter.JSDiffAdapter();
	/**
	 * Basic test function.
	 */
	function testCharDiff(oldString, newString, expetedMap, word) {
		var map =  adapter.adaptCharDiff(oldString, newString, word);
		assert.deepEqual(map, expetedMap);
	}
	/* 
	  String template
		var oldString =  
	 	   "foo bar bar\n" + 
		   "bar foo bar\n" + 
		   "bar bar foo\n" + 
		   "bar bar bar\n"; 
	*/

	/**
	 * Test adding one char at very beginning.
	 */
	tests.testAddingOneCharAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "bfoo bar bar\n";
		var expetedMap =
			[[0, 1, 0, 0]
			];
		var expetedMapWord =
			[[0, 4, 0, 3]
			];
		testCharDiff(oldString, newString, expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test adding three chars at very beginning.
	 */
	tests.testAddingThreeCharsAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "barfoo bar bar\n";
		var expetedMap =
			[[0, 3, 0, 0]
			];
		var expetedMapWord =
			[[0, 6, 0, 3]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test adding three chars at the very end.
	 */
	tests.testAddingThreeCharsAtEnd = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "foo bar bar\nbar";
		var expetedMap =
			[[12, 15, 12, 12]
			];
		var expetedMapWord =
			[[12, 15, 12, 12]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test adding two chars in the middle.
	 */
	tests.testAddingTwoCharsInMiddle = function() {
		var oldString =  
		 	   "foo bar bar\n" + 
			   "bar foo bar\n" + 
			   "bar bar foo\n" + 
			   "bar bar bar\n"; 
		var newString =  
		 	   "foo bar bar\n" + 
			   "bar foobb bar\n" + 
			   "bar bar foo\n" + 
			   "bar bar bar\n"; 
		var expetedMap =
			[[19, 21, 19, 19]
			];
		var expetedMapWord =
			[[16, 21, 16, 19]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test removing one char at very beginning.
	 */
	tests.testRemovingOneCharAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "oo bar bar\n";
		var expetedMap =
			[[0, 0, 0, 1]
			];
		var expetedMapWord =
			[[0, 2, 0, 3]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test removing three chars at very beginning.
	 */
	tests.testRemovingThreeCharsAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   " bar bar\n";
		var expetedMap =
			[[0, 0, 0, 3]
			];
		var expetedMapWord =
			[[0, 0, 0, 3]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test removing three chars at very end.
	 */
	tests.testRemovingThreeCharsAtEnd = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "foo bar b";
		var expetedMap =
			[[9, 9, 9, 12]
			];
		var expetedMapWord =
			[[8, 9, 8, 12]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test removing two chars in the middle.
	 */
	tests.testRemovingTwoCharsInMiddle = function() {
		var oldString =  
		 	   "foo bar bar\n" + 
			   "bar foo bar\n" + 
			   "bar bar foo\n" + 
			   "bar bar bar\n"; 
		var newString =  
		 	   "foo bar bar\n" + 
			   "bar foo bar\n" + 
			   "bar b foo\n" + 
			   "bar bar bar\n"; 
		var expetedMap =
			[[29, 29, 29, 31]
			];
		var expetedMapWord =
			[[28, 29, 28, 31]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};


	/**
	 * Test Changing one char at very beginning.
	 */
	tests.testChangingOneCharAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "boo bar bar\n";
		var expetedMap =
			[[0, 1, 0, 1]
			];
		var expetedMapWord =
			[[0, 3, 0, 3]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test Changing three chars at very beginning.
	 */
	tests.testChangingThreeCharsAtBeginning = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "bar bar bar\n";
		var expetedMap =
			[[0, 3, 0, 3]
			];
		var expetedMapWord =
			[[0, 3, 0, 3]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test Changing three chars at the very end.
	 */
	tests.testChangingThreeCharsAtEnd = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "foo bar foo\n";
		var expetedMap =
			[[8, 11, 8, 11]
			];
		var expetedMapWord =
			[[8, 11, 8, 11]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test Changing three chars to two in the middle.
	 */
	tests.testChangingThreeCharsToTwo = function() {
		var oldString =  
		   "foo bar bar\n";
		var newString =  
		   "foo fo bar\n";
		var expetedMap =
			[[4, 6, 4, 7]
			];
		var expetedMapWord =
			[[4, 6, 4, 7]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test Changing two none continue chars in one word.
	 */
	tests.testChangingThreeCharsToTwo = function() {
		var oldString =  
		 	   "foo bar bar\n" + 
			   "bar foo bar\n" + 
			   "bar bar foo\n" + 
			   "bar bar bar\n"; 
		var newString =  
		 	   "foo bar bar\n" + 
			   "bar bor bar\n" + 
			   "bar fao foo\n" + 
			   "bar bar bar\n"; 
		var expetedMap =
			[[16, 17, 16, 17],
			 [18, 19, 18, 19],
			 [28, 29, 28, 29],
			 [30, 31, 30, 31]
			];
		var expetedMapWord =
			[[16, 19, 16, 19],
			 [28, 31, 28, 31]
			];
		testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test Changing multiple places.
	 */
	tests.testChangingMutiplePlaces = function() {
		var oldString =  
		 	   "foo bar bar\n" + 
			   "bar foo bar\n" + 
			   "bar bar foo\n"; 
		var newString =  
		 	   "foo foo bar\n" + 
			   "bar foo bar\n" + 
			   "foo bar ba\n"; 
		var expetedMap =
			[[4, 7, 4, 7],
			 [24, 27, 24, 27],
			 [34, 34, 32, 35]
			];
		var expetedMapWord =
			[[4, 7, 4, 7],
			 [24, 27, 24, 27],
			 [32, 34, 32, 35]
			];
		//testCharDiff(oldString, newString,expetedMap);
		testCharDiff(oldString, newString, expetedMapWord, true);
	};

	/**
	 * Test add, remove, and change chars together.
	 */
	tests.testAllcases = function() {
		var oldString =  
		   "foo bar bar\n" + 
		   "bar foo bar\n" + 
		   "bar bar bar\n" + 
		   "bar bar foo"; 
		var newString =  
		   "foo bar bar\n" + 
		   "bar cc bar\n" + 
		   "barr ba bar\n" + 
		   "bar bar ccc"; 
		var expetedMap =
			[[16, 18, 16, 19],
			 [26, 27, 27, 27],
			 [30, 30, 30, 31],
			 [43, 46, 44, 47]
			];
		testCharDiff(oldString, newString,expetedMap);
	};

	return tests;
});
