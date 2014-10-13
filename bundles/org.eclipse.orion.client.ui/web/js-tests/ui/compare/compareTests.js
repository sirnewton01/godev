/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, browser, mocha*/
/*global JsDiff*/

define([
	'chai/chai', 
	'orion/compare/diffParser',
	'orion/compare/jsdiffAdapter',
	'orion/compare/diffTreeNavigator',
	'orion/compare/compareUtils',
	'orion/editor/textModel',
	'js-tests/ui/compare/mapper-test-data',
	'jsdiff/diff',
], function(chai, mDiffParser, mJSDiffAdapter, mDiffTreeNavigator, mCompareUtils, mTextModel, mMapperTestData) {
	var assert = chai.assert;
	var mapperTestCases = mMapperTestData.mapperTestCases;

	// *************************************************************************
	// Static helpers
	// *************************************************************************
	function _mapperPartialEqual(mapper, expectedMapper){
		if(mapper.length !== expectedMapper.length){
			assert.fail(mapper, expectedMapper, "mapper failed at total length "); //$NON-NLS-0$
		}
		for(var i = 0; i < mapper.length; i++ ){
			for(var j= 0; j < 3; j++){
				if(j < 2 || ( j === 2 && expectedMapper[i][j] < 1) ){
					if(mapper[i][j] !== expectedMapper[i][j]){
						assert.fail(mapper, expectedMapper, "mapper failed at index " + i); //$NON-NLS-0$
					}
				}
			}
		}
	}

	function _generateMapper(input, output, diff, ignoreWS){
		var delim = "\n"; //$NON-NLS-0$
		if(typeof output === "string" && typeof input === "string"){ //$NON-NLS-1$ //$NON-NLS-0$
			var adapter = new mJSDiffAdapter.JSDiffAdapter(ignoreWS);
			var maps = adapter.adapt(input, output, delim);
			return {delim:delim , mapper:maps.mapper, output: output, diffArray:maps.changContents};
		} else {
			var diffParser = new mDiffParser.DiffParser(delim);
			var result = diffParser.parse(input, diff, false, true);
			var diffArray = diffParser.getDiffArray();
			return {delim:delim , mapper:result.mapper, output: result.outPutFile, diffArray:diffArray};
		}
	}
	
	function testMergeDiffBlocks (options, expectedResult){
		var input = options.oldFile.Content;
		var output = options.newFile ? options.newFile.Content : null;
		var diff = options.diffContent;

		var result = _generateMapper(input, output, diff);
		if(typeof output !== "string"){ //$NON-NLS-0$
			output = result.output;
		}
		var textModel = new mTextModel.TextModel(input, "\n");
		//Merge the text with diff 
		var rFeeder = new mDiffTreeNavigator.inlineDiffBlockFeeder(result.mapper, 1);
		var lFeeder = new mDiffTreeNavigator.inlineDiffBlockFeeder(result.mapper, 0);
		mCompareUtils.mergeDiffBlocks(textModel, lFeeder.getDiffBlocks(), result.mapper, result.diffArray.array, result.diffArray.index, "\n"); //$NON-NLS-0$
		assert.equal(textModel.getText(), expectedResult);
	}

	function contains(array, item){
		return (array || []).indexOf(item) !== -1;
	}
	
	function testIgnoreWSDiffBlocks (options, expectedMapping, ignoreWS){
		var input = options.input;
		var output = options.output;

		var result = _generateMapper(input, output, null, ignoreWS);
		_mapperPartialEqual(result.mapper, expectedMapping);
	}

	// *************************************************************************
	// Mocha tests begin
	// *************************************************************************
describe("compare", function() {
	
	describe("mapper", function() {
		var skipTest = null;

		// Generate an it(..) test case for each mapperTestCase
		mapperTestCases.forEach(function(testCase, i) {
			var input = testCase[0];
			var diff = testCase[1];
			var expectedOutput = testCase[2];
			var expectedMapping = testCase[3];
			var description = testCase[4];

			// call it.skip() if this testCase should be skipped, otherwise it()
			var func = contains(skipTest, i) ? it.skip.bind(it) : it;

			// Note: This is not a great way to do tests. Each test should be separate
			func("mapper test " + (i+1) + ": " + description, function() {
				var diffParser = new mDiffParser.DiffParser("\n"); //$NON-NLS-0$
				var result = diffParser.parse(input, diff);
				assert.deepEqual(result.mapper, expectedMapping);
				assert.equal(result.outPutFile, expectedOutput);
			});
		});
	});

	describe("diff patch", function() {
		var skipTest = [23,29,31,39,40];

		// Generate an it(..) test case for each mapperTestCase
		mapperTestCases.forEach(function(testCase, i) {
			var input = testCase[0];
			var expectedOutput = testCase[2];
			
			var output;
			if(expectedOutput.indexOf("\r\n") >= 0){ //$NON-NLS-0$
				output = expectedOutput.split("\r\n").join("\n"); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				output = expectedOutput;
			}
			if(input.indexOf("\r\n") >= 0){ //$NON-NLS-0$
				input = input.split("\r\n").join("\n"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			var diff = JsDiff.createPatch("foo", input, output, "", "") ; //$NON-NLS-1$ //$NON-NLS-0$		
			var expectedMapping = testCase[3];
			var description = testCase[4];

			// Note: This is not a great way to do tests. Each test should be separate
			var func = contains(skipTest, i) ? it.skip.bind(it) : it;
			func("test jsDiff " + (i+1) + ": " + description, function() {
				var diffParser = new mDiffParser.DiffParser("\n"); //$NON-NLS-0$
				//console.log("\n\nDiff:\n");
				//console.log(diff);
				var result = diffParser.parse(input, diff, false,true);
				_mapperPartialEqual(result.mapper, expectedMapping);
			});
		});
	});

	describe("diff adapter", function() {
		var adapter = new mJSDiffAdapter.JSDiffAdapter();
		var skipTest = null;

		mapperTestCases.forEach(function(testCase, i) {
			var input = testCase[0];
			var expectedOutput = testCase[2];
			var output;
			if(expectedOutput.indexOf("\r\n") >= 0){ //$NON-NLS-0$
				output = expectedOutput.split("\r\n").join("\n"); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				output = expectedOutput;
			}
			if(input.indexOf("\r\n") >= 0){ //$NON-NLS-0$
				input = input.split("\r\n").join("\n"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			
			var expectedMapping = testCase[3];
			var description = testCase[4];
			
			// Note: This is not a great way to do tests. Each test should be separate
			var func = contains(skipTest, i) ? it.skip.bind(it) : it;
			func("test jsDiff adapter " + (i+1) + ": " + description, function() { //$NON-NLS-1$ //$NON-NLS-0$
				var result = adapter.adapt(input, output, "\n"); //$NON-NLS-0$
				_mapperPartialEqual(result.mapper, expectedMapping);
			});
		});
	});

	describe("basic", function() { //$NON-NLS-0$
		it("test empty case", function() { //$NON-NLS-0$
			var input = "";
			var diff = "";
			var expectedOutput = "";
			var expectedMapping = [];
	
			var diffParser = new mDiffParser.DiffParser();
			var result = diffParser.parse(input, diff);
			assert.deepEqual(result.mapper, expectedMapping);
			assert.equal(result.outPutFile, expectedOutput);
		});
		it("add 1 empty line to empty file", function() { //$NON-NLS-0$
			var input = "";
			var diff = "@@ -0,0 +1 @@\r\n" +  //$NON-NLS-0$
			  "+\r\n" +  //$NON-NLS-0$
			  "";
			var expectedOutput = "\r\n" + //$NON-NLS-0$
			  "";
			var expectedMapping = [[1, 0, 2]];
	
			var diffParser = new mDiffParser.DiffParser();
			var result = diffParser.parse(input, diff);
			assert.deepEqual(result.mapper, expectedMapping);
			assert.equal(result.outPutFile, expectedOutput);
		});
		it("add 2 empty lines to empty file", function() { //$NON-NLS-0$
			var input = "";
			
			var diff = "@@ -0,0 +1,2 @@\r\n" +  //$NON-NLS-0$
			  "+\r\n" +  //$NON-NLS-0$
			  "+\r\n" +  //$NON-NLS-0$
			  "";
			
			var expectedOutput = "\r\n" +  //$NON-NLS-0$
			  "\r\n" +  //$NON-NLS-0$
			  "";
			
			var expectedMapping = [[2, 0, 2]];
	
			var diffParser = new mDiffParser.DiffParser();
			var result = diffParser.parse(input, diff);
			assert.deepEqual(result.mapper, expectedMapping);
			assert.equal(result.outPutFile, expectedOutput);
		});
		it("bug 401905 -- 1", function() { //$NON-NLS-0$
			var input = "12\r\n" +  //$NON-NLS-0$
			  "34\r\n" +  //$NON-NLS-0$
			  "56\r\n" +  //$NON-NLS-0$
			  "";
			var output = "21\r\n" +  //$NON-NLS-0$
			  "43\r\n" +  //$NON-NLS-0$
			  "56\r\n" +  //$NON-NLS-0$
			  "";
			
			var expectedMapping = [[2, 2, 1], [2,2,0]];
			var adapter = new mJSDiffAdapter.JSDiffAdapter();
			var result = adapter.adapt(input, output, "\n"); //$NON-NLS-0$
			_mapperPartialEqual(result.mapper, expectedMapping);
		});
		it("bug 401905 -- 2", function() { //$NON-NLS-0$
			var input = "11\r\n12\r\n" +  //$NON-NLS-0$
			  "34\r\n" +  //$NON-NLS-0$
			  "56\r\n" +  //$NON-NLS-0$
			  "";
			var output = "11\r\n21\r\n" +  //$NON-NLS-0$
			  "43\r\n" +  //$NON-NLS-0$
			  "56\r\n" +  //$NON-NLS-0$
			  "";
			
			var expectedMapping = [[1,1,0], [2, 2, 1], [2,2,0]];
			var adapter = new mJSDiffAdapter.JSDiffAdapter();
			var result = adapter.adapt(input, output, "\n"); //$NON-NLS-0$
			_mapperPartialEqual(result.mapper, expectedMapping);
		});
		/*
		 * Changing one line file without line delimeter (old file + new file)
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 1", function() { //$NON-NLS-0$
			var oldFile = "123"; //$NON-NLS-0$
			var newFile = "234"; //$NON-NLS-0$
			var mergedFile = "123\n" +  //$NON-NLS-0$
			  				 "234\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
		/*
		 * Changing all 3 lines in the file without line delimeter (old file + new file) 
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 2", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var newFile = "1111\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "3333" +  //$NON-NLS-0$
			  "";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "1111\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "3333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
		/*
		 *Changing last line in a file with 3 lines without last line delimeter (old file + new file) 
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 3", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var newFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "3333" +  //$NON-NLS-0$
			  "";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "3333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
		/*
		 * Changing the middle line in a file with 3 lines without last line delimeter (old file + new file)
		 */
		it("merge inline text model -- 4", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var newFile = "111\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
		/*
		 * Changing the middle line in a file with 3 lines with last line delimeter (old file + new file)
		 */
		it("merge inline text model -- 5", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "";
			var newFile = "111\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
		/*
		 * Changing one line file without line delimeter (old file+ diff)
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 6", function() { //$NON-NLS-0$
			var oldFile = "123"; //$NON-NLS-0$
			var diff =
			"diff --git a/testMergeInline.js b/testMergeInline.js\n" + //$NON-NLS-0$
			"index d800886..df689d8 100644\n" + //$NON-NLS-0$
			"--- a/testMergeInline.js\n" + //$NON-NLS-0$
			"+++ b/testMergeInline.js\n" + //$NON-NLS-0$
			"@@ -1 +1 @@\n" + //$NON-NLS-0$
			"-123\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"+234\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"";
			var mergedFile = "123\n" +  //$NON-NLS-0$
			  				 "234\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, diffContent: diff},
				mergedFile
			);
		});
		/*
		 * Changing all 3 lines in the file without line delimeter (old file+ diff)
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 7", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var diff =
			"diff --git a/testMergeInline.js b/testMergeInline.js\n" + //$NON-NLS-0$
			"index d800886..df689d8 100644\n" + //$NON-NLS-0$
			"--- a/testMergeInline.js\n" + //$NON-NLS-0$
			"+++ b/testMergeInline.js\n" + //$NON-NLS-0$
			"@@ -1,3 +1,3 @@\n" + //$NON-NLS-0$
			"-111\n" + //$NON-NLS-0$
			"-222\n" + //$NON-NLS-0$
			"-333\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"+1111\n" + //$NON-NLS-0$
			"+2222\n" + //$NON-NLS-0$
			"+3333\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "1111\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "3333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, diffContent: diff},
				mergedFile
			);
		});
		/*
		 *Changing last line in a file with 3 lines without last line delimeter (old file + diff) 
		 */
		//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
		it("merge inline text model -- 8", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var diff =
			"diff --git a/testMergeInline.js b/testMergeInline.js\n" + //$NON-NLS-0$
			"index d800886..df689d8 100644\n" + //$NON-NLS-0$
			"--- a/testMergeInline.js\n" + //$NON-NLS-0$
			"+++ b/testMergeInline.js\n" + //$NON-NLS-0$
			"@@ -1,3 +1,3 @@\n" + //$NON-NLS-0$
			" 111\n" + //$NON-NLS-0$
			" 222\n" + //$NON-NLS-0$
			"-333\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"+3333\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "3333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, diffContent: diff},
				mergedFile
			);
		});
		/*
		 * Changing the middle line in a file with 3 lines without last line delimeter (old file + diff)
		 */
		it("merge inline text model -- 9", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333" +  //$NON-NLS-0$
			  "";
			var diff =
			"diff --git a/testMergeInline.js b/testMergeInline.js\n" + //$NON-NLS-0$
			"index d800886..df689d8 100644\n" + //$NON-NLS-0$
			"--- a/testMergeInline.js\n" + //$NON-NLS-0$
			"+++ b/testMergeInline.js\n" + //$NON-NLS-0$
			"@@ -1,3 +1,3 @@\n" + //$NON-NLS-0$
			" 111\n" + //$NON-NLS-0$
			"-222\n" + //$NON-NLS-0$
			"+2222\n" + //$NON-NLS-0$
			" 333\n" + //$NON-NLS-0$
			"\\ No newline at end of file\n" + //$NON-NLS-0$
			"";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, diffContent: diff},
				mergedFile
			);
		});
		/*
		 * Changing the middle line in a file with 3 lines with last line delimeter (old file + new file)
		 */
		it("merge inline text model -- 10", function() { //$NON-NLS-0$
			var oldFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "333\n" +  //$NON-NLS-0$
			  "";
			var diff =
			"diff --git a/testMergeInline.js b/testMergeInline.js\n" + //$NON-NLS-0$
			"index d800886..df689d8 100644\n" + //$NON-NLS-0$
			"--- a/testMergeInline.js\n" + //$NON-NLS-0$
			"+++ b/testMergeInline.js\n" + //$NON-NLS-0$
			"@@ -1,3 +1,3 @@\n" + //$NON-NLS-0$
			" 111\n" + //$NON-NLS-0$
			"-222\n" + //$NON-NLS-0$
			"+2222\n" + //$NON-NLS-0$
			" 333\n" + //$NON-NLS-0$
			"";
			var mergedFile = "111\n" +  //$NON-NLS-0$
			  "222\n" +  //$NON-NLS-0$
			  "2222\n" +  //$NON-NLS-0$
			  "333\n"; //$NON-NLS-0$
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, diffContent: diff},
				mergedFile
			);
		});
		/*
		 * Changing the middle line in a file with 3 lines with last line delimeter (old file + new file)
		 * https://bugs.eclipse.org/bugs/show_bug.cgi?id=444185
		 */
		it("merge inline text model -- 11 (bug 444185)", function() { //$NON-NLS-0$
			var oldFile = "11\n" +  //$NON-NLS-0$
			  "22\n" +  //$NON-NLS-0$
			  "33\n" +  //$NON-NLS-0$
			  "44";
			var newFile = "111\n" +  //$NON-NLS-0$
			  "22\n" +  //$NON-NLS-0$
			  "33\n" +  //$NON-NLS-0$
			  "44\n" + //$NON-NLS-0$;
			  "55\n" + //$NON-NLS-0$;
			  "";
			var mergedFile = "11\n" +  //$NON-NLS-0$
			  "111\n" +  //$NON-NLS-0$
			  "22\n" +  //$NON-NLS-0$
			  "33\n" +  //$NON-NLS-0$
			  "44\n" + //$NON-NLS-0$;
			  "44\n" + //$NON-NLS-0$;
			  "55\n\n" + //$NON-NLS-0$;
			  "";
			testMergeDiffBlocks(
				{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
				mergedFile
			);
		});
	}); // describe('basic')
	
	describe("Ignore Whitespace", function() { //$NON-NLS-0$
		it("Ignore Whitespace case 1", function() { //$NON-NLS-0$
			var newString =  
			 	   "\t\taaa\n" +
			 	   "\t\tbbb\n" +
			 	   "\t\tccc\n" +
			 	   "";
			var oldString =  
			 	   "\taaa\n" +
			 	   "\tbbb\n" +
			 	   "\tccc\n" +
			 	   "";			
			var expetedMapNormal =
				[[3, 3, 1],
				 [1, 1, 0]
				];
			var expetedMapWS =
				[[4, 4, 0]
				];
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapNormal);
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapWS, true);
		});
		it("Ignore Whitespace case 2", function() { //$NON-NLS-0$
			var newString =  
			 	   "\t\t aaa\n" +
			 	   "\t\tbbb \n" +
			 	   "\t\t ccc\n" +
			 	   "";
			var oldString =  
			 	   "\taaa\n" +
			 	   "\tbbb  \n" +
			 	   "\tccc\n" +
			 	   "";			
			var expetedMapNormal =
				[[3, 3, 1],
				 [1, 1, 0]
				];
			var expetedMapWS =
				[[4, 4, 0]
				];
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapNormal);
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapWS, true);
		});
		it("Ignore Whitespace case 3", function() { //$NON-NLS-0$
			var newString =  
			 	   "\t\t aaa\n" +
			 	   "\t\tbbbb \n" +
			 	   "\t\t ccc\n" +
			 	   "";
			var oldString =  
			 	   "\taaa\n" +
			 	   "\tbbb  \n" +
			 	   "\tccc\n" +
			 	   "";			
			var expetedMapNormal =
				[[3, 3, 1],
				 [1, 1, 0]
				];
			var expetedMapWS =
				[[1, 1, 0],
				 [1, 1, 1],
				 [2, 2, 0]
				];
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapNormal);
			testIgnoreWSDiffBlocks({input: oldString, output: newString}, expetedMapWS, true);
		});
	}); // describe('Ignore Whitespace')

}); //describe('compare')

});
