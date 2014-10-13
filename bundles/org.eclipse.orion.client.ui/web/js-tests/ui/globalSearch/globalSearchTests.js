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
define(["chai/chai", "orion/searchUtils"], function(chai, mSearchUtils) {
	var assert = chai.assert;
	/**
	 * Generate a dummy search model node on a file.
	 */
	function makeFileModel() {
		var node = {type: "file", name: "test"};
		return node;
	}
	
	/**
	 * Search in a file with key word and return the file model node.
	 */
	function searchInFile(fileContentText, keyword, replacing) {
		var searchHelper = mSearchUtils.generateSearchHelper({
			resource: "Temp",
			sort: "Path asc",
			rows: 40,
			start: 0,
			keyword: keyword
		});
		var fileModel = makeFileModel();
		mSearchUtils.searchWithinFile(searchHelper.inFileQuery, fileModel, fileContentText, "\n", replacing);
		return {m: fileModel, q:searchHelper.inFileQuery};
	}
	
	/**
	 * Search in a file with key word and replace the file wiht replace string.
	 */
	function replaceFile(fileContentText, fileModel, inFileQuery, replaceString) {
		var newContents = {contents: null};
		mSearchUtils.generateNewContents(false, fileModel.contents, newContents, fileModel, replaceString, inFileQuery.searchStrLength); 
		return newContents.contents.join("\n");
	}
	
	describe("Test In-file Search", function() {
		/**
		 * Test replacing one key word for a one line file.
		 */
		it("OneKeyWord", function() {
			var searchResult = searchInFile("bar foo bar\n", "foo", true);
			var replaced = replaceFile("bar foo bar\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo bar\n");
		});
	
		/**
		 * Test replacing one key word for a one line file.
		 */
		it("OneKeyWordRegEx", function() {
			var searchResult = searchInFile("bar foolish bar\n", "fo*sh", true);
			var replaced = replaceFile("bar foolish bar\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo bar\n");
		});
	
		/**
		 * Test replacing two key words for a one line file.
		 */
		it("TwoKeyWords", function() {
			var searchResult = searchInFile("bar foo bar foo\n", "foo", true);
			var replaced = replaceFile("bar foo bar foo\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo bar coo\n");
		});
	
		/**
		 * Test replacing two key words for a one line file.
		 */
		it("TwoKeyWordsRegEx", function() {
			var searchResult = searchInFile("bar foolish bar foolish\n", "fo???sh", true);
			var replaced = replaceFile("bar foolish bar foolish\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo bar coo\n");
		});
	
		/**
		 * Test replacing 4 key words for a 3 line file.
		 */
		it("FourKeyWords", function() {
			var searchResult = searchInFile("bar foo bar foo\nbar bar foo\nfoo bar bar\n", "foo", true);
			var replaced = replaceFile("bar foo bar foo\nbar bar foo\nfoo bar bar\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo bar coo\nbar bar coo\ncoo bar bar\n");
		});
	
		/**
		 * Test replacing 4 key words for a 3 line file.
		 */
		it("FourKeyWordsRegEx", function() {
			var searchResult = searchInFile("bar foolish bar foolish\nbar bar foolish\nfoolish bar bar\n", "fo*sh", true);
			var replaced = replaceFile("bar foolish bar foolish\nbar bar foolish\nfoolish bar bar\n", searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,"bar coo\nbar bar coo\ncoo bar bar\n");
		});
	
		/**
		 * Test replacing 3 key words out of 6, for a 5 line file.
		 * The first line has 3 key words , second line with one , third with one , fourth with no key words and fifth with one
		 * We will replace the middle "foo" in the first line, third line and fifth line. 
		 */
		it("SixKeyWordsFiltered", function() {
			var originalFile = "bar foo bar foo bar foo\n" + 
							   "foo bar bar\n" + 
							   "bar foo bar\n" + 
							   "bar bar bar\n" + 
							   "bar bar foo\n"; 
			var expectedReplacedFile = "bar foo bar coo bar foo\n" + 
							   "foo bar bar\n" + 
							   "bar coo bar\n" + 
							   "bar bar bar\n" + 
							   "bar bar coo\n"; 
			var searchResult = searchInFile(originalFile, "foo", true);
			searchResult.m.children[0].checked = false;
			searchResult.m.children[2].checked = false;
			searchResult.m.children[3].checked = false;
			
			var replaced = replaceFile(originalFile, searchResult.m , searchResult.q, "coo");
			assert.equal(replaced,expectedReplacedFile);
		});
	});
});
