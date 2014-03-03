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
/*global define JsDiff*/
/*jslint forin:true regexp:false sub:true*/

define(['orion/assert', 
		'orion/compare/diffParser', 
		'orion/compare/jsdiffAdapter', 
		'orion/compare/diffTreeNavigator', 
		'orion/compare/compareUtils',
		'orion/editor/textModel',
		'mapper-test-data.js', 
		'jsdiff/diff'], 
function(assert, mDiffParser, mJSDiffAdapter, mDiffTreeNavigator, mCompareUtils, mTextModel, mMapperTestData) {
	var tests = {};
	var mapperTestCases = mMapperTestData.mapperTestCases;

	var _inTestArray = function(testDataIndexs, index){
		for(var k = 0; k < testDataIndexs.length; k++){
			if(testDataIndexs[k] === index){
				return true;
			}
		}
		return false;
	};
	
	var testMapper = function (testData, testOnly, skipTest){
		for ( var i = 0; i < testData.length; i++) {
			if(testOnly){
				if(!_inTestArray(testOnly, i)){
					continue;
				}
			} else if(skipTest){
				if(_inTestArray(skipTest, i)){
					continue;
				}
			}
			var testCase = testData[i];
			var input = testCase[0];
			var diff = testCase[1];
			var expectedOutput = testCase[2];
			var expectedMapping = testCase[3];
			var description = testCase[4];
			var j = i + 1;
			
			// Note: This is not a great way to do tests. Each test should be separate
			tests["test " + j + ": " + description] = function(input, diff, expectedOutput, expectedMapping) { //$NON-NLS-1$ //$NON-NLS-0$
				return function() {
					var diffParser = new mDiffParser.DiffParser("\n"); //$NON-NLS-0$
					var result = diffParser.parse(input, diff);
					assert.deepEqual(result.mapper, expectedMapping);
					assert.equal(result.outPutFile, expectedOutput);
				};				
			}(input, diff, expectedOutput, expectedMapping);
		}
	};
	
	var _mapperPartialEqual = function(mapper, expectedMapper){
		if(mapper.length !== expectedMapper.length){
			throw new assert.AssertionError({
				message :  "mapper failed at total length", //$NON-NLS-0$
				expected : expectedMapper,
				actual : mapper
			});
		}
		for(var i = 0; i < mapper.length; i++ ){
			for(var j= 0; j < 3; j++){
				if(j < 2 || ( j === 2 && expectedMapper[i][j] < 1) ){
					if(mapper[i][j] !== expectedMapper[i][j]){
						throw new assert.AssertionError({
							message :  "mapper failed at index " + i, //$NON-NLS-0$
							expected : expectedMapper,
							actual : mapper
						});
					}
				}
			}
		}
	};
	
	var testJSDiffPatch = function (testData, testOnly, skipTest){
		for ( var i = 0; i < testData.length; i++) {
			if(testOnly){
				if(!_inTestArray(testOnly, i)){
					continue;
				}
			} else if(skipTest){
				if(_inTestArray(skipTest, i)){
					continue;
				}
			}
			var testCase = testData[i];
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
			var j = i + 1;
			
			// Note: This is not a great way to do tests. Each test should be separate
			tests["test jsDiff " + j + ": " + description] = function(input, diff, output, expectedMapping) { //$NON-NLS-1$ //$NON-NLS-0$
				return function() {
					var diffParser = new mDiffParser.DiffParser("\n"); //$NON-NLS-0$
					//console.log("\n\nDiff:\n");
					//console.log(diff);
					var result = diffParser.parse(input, diff, false,true);
					_mapperPartialEqual(result.mapper, expectedMapping);
				};				
			}(input, diff, output, expectedMapping);
		}
		
	};
	
	var testJSDiffAdapter = function (testData, testOnly, skipTest){
		var adapter = new mJSDiffAdapter.JSDiffAdapter();
		for ( var i = 0; i < testData.length; i++) {
			if(testOnly){
				if(!_inTestArray(testOnly, i)){
					continue;
				}
			} else if(skipTest){
				if(_inTestArray(skipTest, i)){
					continue;
				}
			}
			var testCase = testData[i];
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
			var j = i + 1;
			
			// Note: This is not a great way to do tests. Each test should be separate
			tests["test jsDiff adapter " + j + ": " + description] = function(input, output, expectedMapping) { //$NON-NLS-1$ //$NON-NLS-0$
				return function() {
					var result = adapter.adapt(input, output, "\n"); //$NON-NLS-0$
					_mapperPartialEqual(result.mapper, expectedMapping);
				};				
			}(input,  output, expectedMapping);
		}
		
	};
	
	var _generateMapper = function(input, output, diff){
		var delim = "\n"; //$NON-NLS-0$
		if(typeof output === "string" && typeof input === "string"){ //$NON-NLS-1$ //$NON-NLS-0$
			var adapter = new mJSDiffAdapter.JSDiffAdapter();
			var maps = adapter.adapt(input, output, delim);
			return {delim:delim , mapper:maps.mapper, output: output, diffArray:maps.changContents};
		} else {
			var diffParser = new mDiffParser.DiffParser(delim);
			var result = diffParser.parse(input, diff, false, true);
			var diffArray = diffParser.getDiffArray();
			return {delim:delim , mapper:result.mapper, output: result.outPutFile, diffArray:diffArray};
		}
	};
	
	var testMergeDiffBlocks = function (options, expectedResult){
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
	};
	
	testMapper(mapperTestCases);
	testJSDiffPatch(mapperTestCases, null, [23,29,31,39,40]);
	testJSDiffAdapter(mapperTestCases);
	
	tests["test empty case"] = function() { //$NON-NLS-0$
		var input = "";
		var diff = "";
		var expectedOutput = "";
		var expectedMapping = [];

		var diffParser = new mDiffParser.DiffParser();
		var result = diffParser.parse(input, diff);
		assert.deepEqual(result.mapper, expectedMapping);
		assert.equal(result.outPutFile, expectedOutput);
	};
	

	tests["test add 1 empty line to empty file"] = function() { //$NON-NLS-0$
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
	};
	

	tests["test add 2 empty lines to empty file"] = function() { //$NON-NLS-0$
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
	};
	
	tests["test bug 401905 -- 1"] = function() { //$NON-NLS-0$
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
	};
	
	tests["test bug 401905 -- 2"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing one line file without line delimeter (old file + new file)
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 1"] = function() { //$NON-NLS-0$
		var oldFile = "123"; //$NON-NLS-0$
		var newFile = "234"; //$NON-NLS-0$
		var mergedFile = "123\n" +  //$NON-NLS-0$
		  				 "234\n"; //$NON-NLS-0$
		testMergeDiffBlocks(
			{oldFile: {Content: oldFile}, newFile: {Content: newFile}},
			mergedFile
		);
	};
	
	/*
	 * Changing all 3 lines in the file without line delimeter (old file + new file) 
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 2"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 *Changing last line in a file with 3 lines without last line delimeter (old file + new file) 
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 3"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing the middle line in a file with 3 lines without last line delimeter (old file + new file)
	 */
	tests["test merge inline text model -- 4"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing the middle line in a file with 3 lines with last line delimeter (old file + new file)
	 */
	tests["test merge inline text model -- 5"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing one line file without line delimeter (old file+ diff)
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 6"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing all 3 lines in the file without line delimeter (old file+ diff)
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 7"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 *Changing last line in a file with 3 lines without last line delimeter (old file + diff) 
	 */
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=423442
	tests["test merge inline text model -- 8"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing the middle line in a file with 3 lines without last line delimeter (old file + diff)
	 */
	tests["test merge inline text model -- 9"] = function() { //$NON-NLS-0$
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
	};
	
	/*
	 * Changing the middle line in a file with 3 lines with last line delimeter (old file + new file)
	 */
	tests["test merge inline text model -- 10"] = function() { //$NON-NLS-0$
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
	};
	
	return tests;
});
