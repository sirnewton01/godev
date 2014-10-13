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
/*eslint-env browser, amd, mocha*/
define(["chai/chai", "orion/compare/jsdiffAdapter"], function(chai, mJSDiffAdapter) {
	var assert = chai.assert;
	var adapterNormal = new mJSDiffAdapter.JSDiffAdapter();
	var adapterWS = new mJSDiffAdapter.JSDiffAdapter(true);
	/**
	 * Basic test function.
	 */
	function testCharDiff(oldString, newString, expetedMap, word) {
		var map =  adapterNormal.adaptCharDiff(oldString, newString, word);
		assert.deepEqual(map, expetedMap);
	}
	function testCharDiffWS(oldString, newString, expetedMap, ignore) {
		var adapter = ignore ? adapterWS : adapterNormal;
		var map =  adapter.adaptCharDiff(oldString, newString, true);
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

	describe("Word Diff", function() {
		/**
		 * Test adding one char at very beginning.
		 */
		it("testAddingOneCharAtBeginning", function() {
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
		});
	
		/**
		 * Test adding three chars at very beginning.
		 */
		it("testAddingThreeCharsAtBeginning", function() {
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
		});
	
		/**
		 * Test adding three chars at the very end.
		 */
		it("testAddingThreeCharsAtEnd", function() {
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
		});
	
		/**
		 * Test adding two chars in the middle.
		 */
		it("testAddingTwoCharsInMiddle", function() {
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
		});
	
		/**
		 * Test removing one char at very beginning.
		 */
		it("testRemovingOneCharAtBeginning", function() {
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
		});
	
		/**
		 * Test removing three chars at very beginning.
		 */
		it("testRemovingThreeCharsAtBeginning", function() {
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
		});
	
		/**
		 * Test removing three chars at very end.
		 */
		it("testRemovingThreeCharsAtEnd", function() {
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
		});
	
		/**
		 * Test removing two chars in the middle.
		 */
		it("testRemovingTwoCharsInMiddle", function() {
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
		});
	
	
		/**
		 * Test Changing one char at very beginning.
		 */
		it("testChangingOneCharAtBeginning", function() {
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
		});
	
		/**
		 * Test Changing three chars at very beginning.
		 */
		it("testChangingThreeCharsAtBeginning", function() {
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
		});
	
		/**
		 * Test Changing three chars at the very end.
		 */
		it("testChangingThreeCharsAtEnd", function() {
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
		});
	
		/**
		 * Test Changing three chars to two in the middle.
		 */
		it("testChangingThreeCharsToTwo", function() {
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
		});
	
		/**
		 * Test Changing two none continue chars in one word.
		 */
		it("testChangingTwoCharsToOne", function() {
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
		});
	
		/**
		 * Test Changing multiple places.
		 */
		it("testChangingMutiplePlaces", function() {
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
		});
	
		/**
		 * Test add, remove, and change chars together.
		 */
		it("testAllcases", function() {
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
		});

// Ignore white space WORD level testting		
		/**
		 * Test simple case.
		 */
		it("testIgnoreWhitespaceWORDLevel 1", function() {
			var newString =  
			 	   "\t\tcc\n" +
			 	   "";
			var oldString =  
			 	   "\tcc\n" +
			 	   "";
			var expetedMapNormal =
				[[0, 2, 0, 1]
				];
			var expetedMapWS =
				[];
			testCharDiffWS(oldString, newString, expetedMapNormal);
			testCharDiffWS(oldString, newString, expetedMapWS, true);
		});
	
		/**
		 * Test simple case.
		 */
		it("testIgnoreWhitespaceWORDLevel 2", function() {
			var newString =  
			 	   "\t\tcc aaa\n" +
			 	   "";
			var oldString =  
			 	   "\tcc bbb\n" +
			 	   "";
			var expetedMapNormal =
				[[0, 2, 0, 1],
				 [5, 8, 4, 7]
				];
			var expetedMapWS =
				[[5, 8, 4, 7]
				];
			testCharDiffWS(oldString, newString, expetedMapNormal);
			testCharDiffWS(oldString, newString, expetedMapWS, true);
		});
	
		/**
		 * Test simple case.
		 */
		it("testIgnoreWhitespaceWORDLevel 3", function() {
			var newString =  
			 	   "\t\tcc  aaa\n" +
			 	   "";
			var oldString =  
			 	   "\tcc bbb\n" +
			 	   "";
			var expetedMapNormal =
				[[0, 2, 0, 1],
				 [4, 9, 3, 7]
				];
			var expetedMapWS =
				[[6, 9, 4, 7]
				];
			testCharDiffWS(oldString, newString, expetedMapNormal);
			testCharDiffWS(oldString, newString, expetedMapWS, true);
		});
	
		/**
		 * Test complex case.
		 */
		it("testIgnoreWhitespaceWORDLevel 4", function() {
			var newString =  
			 	   "\t\tcc  aaa\n" +
			 	   "\t\tddd\n" +
			 	   "\t\teee\n" +
			 	   "";
			var oldString =  
			 	   "\tcc bbb\n" +
			 	   "\tdd\n" +
			 	   "\tee\n" +
			 	   "";
			var expetedMapNormal =
				[[0, 2, 0, 1],
				 [4, 21, 3, 15]
				];
			var expetedMapWS =
				[[6, 9, 4, 7],
				 [12, 15, 9, 11],
				 [18, 21, 13, 15]
				];
			testCharDiffWS(oldString, newString, expetedMapNormal);
			testCharDiffWS(oldString, newString, expetedMapWS, true);
		});
	});
});
