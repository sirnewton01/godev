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
/*eslint-env browser, amd*/
define([], function() {

var exports = {};
exports.mapperTestCases = [
    /* Test data format ******************************************
    [ "",                 //string of input file 
      "",                 //string of diff 
      "",                 //expected string of output file
      [[1,0,2],[2,2,0]],  //expected array of the mapper 
      "some description"] //test case description
    *************************************************************/
    /* Template **************************************************
    //
	[ 
	  //input file 
	  "", 
	  //diff
	  "", 
	  //output file
	  "", 
	  //mapper
	  [],
	  //description  
	  ""]
	, 
    *************************************************************/ 

	/***************************************************************************/
	/****************************   Add Lines **********************************/
	/***************************************************************************/
	/**********   adding to empty file *********/
	//add 1 empty line to empty file

	//add 2 empty lines to empty file

	//add 1 line without \r  to empty file
	[ 
	  //input file 
	  "", 
	  //diff
	  "@@ -0,0 +1 @@\r\n" + 
	  "+line 1\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1", 
	  //mapper
	  [[1,0,2]],
	  //description  
	  "add 1 line without \\r  to empty file"]
	, 
	//add 2 lines  without \r  to empty file
	[ 
	  //input file 
	  "", 
	  //diff
	  "@@ -0,0 +1,2 @@\r\n" + 
	  "+line 1\r\n" + 
	  "+line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[2,0,2]],
	  //description  
	  "add 2 lines without \\r  to empty file"]
	, 
	//add 1 line to empty file
	[ 
	  //input file 
	  "", 
	  //diff
	  "@@ -0,0 +1 @@\r\n" + 
	  "+line 1\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "", 
	  //mapper
	  [[1,0,2]],
	  //description  
	  "add 1 line to empty file"]
	, 
	//add 2 lines to empty file
	[ 
	  //input file 
	  "", 
	  //diff
	  "@@ -0,0 +1,2 @@\r\n" + 
	  "+line 1\r\n" + 
	  "+line 2\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //mapper
	  [[2,0,2]],
	  //description  
	  "add 2 lines to empty file"]
	, 
    //add 1 empty line at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  "+\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "", 
	  //output file
	  "\r\n" + 
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[1,0,2],[2,2,0]],
	  //description  
	  "add 1 empty line at beginning"]
	, 
    //add 2 empty lines at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  "+\r\n" + 
	  "+\r\n" + 
	  " line 1\r\n" + 
	  " line 2", 
	  //output file
	  "\r\n" + 
	  "\r\n" + 
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[2,0,2],[2,2,0]],
	  //description  
	  "add 2 empty lines at beginning"]
	, 
    //add 1 line at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  "+line 01\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "", 
	  //output file
	  "line 01\r\n" + 
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[1,0,2],[2,2,0]],
	  //description  
	  "add 1 line at beginning"]
	, 
    //add 2 lines at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  "+line 01\r\n" + 
	  "+line 02\r\n" + 
	  " line 1\r\n" + 
	  " line 2", 
	  //output file
	  "line 01\r\n" + 
	  "line 02\r\n" + 
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[2,0,2],[2,2,0]],
	  //description  
	  "add 2 lines at beginning"]
	, 
	/******** input file does not have new line at end  ******/
	///////// single line input file ////////
    //add new line at end (1)
	[ 
	  //input file 
	  "line 1", 
	  //diff
	  "@@ -1 +1 @@\r\n" + 
	  "-line 1\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 1\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "", 
	  //mapper
	  [[1,1,4]],
	  //description  
	  "input file without new line at end --> add new line at end (1)"]
	, 
	///////// 2 lines input file ////////
    //add new line at end (2)
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,2 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[1,1,5]],
	  //description  
	  "input file without new line at end --> add new line at end (2)"]
	, 
    //add 1 empty line at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[2,1,5]],
	  //description  
	  "input file without new line at end --> add 1 empty line at end"]
	,
    //add 2 empty lines at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+\r\n" + 
	  "+\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[3,1,5]],
	  //description  
	  "input file without new line at end --> add 2 empty lines at end"]
	,
    //add 1 line without \r at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //mapper
	  [[1,1,0],[2,1,5]],
	  //description  
	  "input file without new line at end --> add 1 line without \\r at end"]
	,
    //add 2 lines without \r at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+line 3\r\n" + 
	  "+line 4\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4", 
	  //mapper
	  [[1,1,0],[3,1,5]],
	  //description  
	  "input file without new line at end --> add 2 lines without \\r at end"]
	,
    //add 1 line at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+line 3\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[2,1,5]],
	  //description  
	  "input file without new line at end --> add 1 line at end"]
	,
    //add 2 lines at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "+line 3\r\n" + 
	  "+line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[3,1,5]],
	  //description  
	  "input file without new line at end --> add 2 lines at end"]
	,
	/******** input file has new line at end  ******/
    //add 1 empty line at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[1,0,4],[1,1,0]],
	  //description  
	  "input file with new line at end --> add 1 empty line at end"]
	,
    //add 1 line without \r at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //mapper
	  [[2,2,0],[1,1,4]],
	  //description  
	  "input file with new line at end --> add 1 line without \\r at end"]
	,
    //add 2 lines without \r at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3\r\n" + 
	  "+line 4\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4", 
	  //mapper
	  [[2,2,0],[2,1,4]],
	  //description  
	  "input file with new line at end --> add 2 lines without \\r at end"]
	,
    //add 1 line at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //diff
	  "@@ -1,2 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[1,0,4],[1,1,0]],
	  //description  
	  "input file with new line at end --> add 1 line at end"]
	,
    //add 2 lines at end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //diff
	  "@@ -1,2 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3\r\n" + 
	  "+line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[2,0,4],[1,1,0]],
	  //description  
	  "input file with new line at end --> add 2 lines at end"]
	,
    //add 2 lines in the middle 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,6 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3-1\r\n" + 
	  "+line 3-2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3-1\r\n" + 
	  "line 3-2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[2,0,4],[3,3,0]],
	  //description  
	  "input file with new line at end -->add 2 lines in the middle"]
	,
    //add 2 empty lines in the middle 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4", 
	  //diff
	  "@@ -1,4 +1,6 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+\r\n" + 
	  "+\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "\r\n" + 
	  "line 3\r\n" + 
	  "line 4", 
	  //mapper
	  [[2,2,0],[2,0,4],[2,2,0]],
	  //description  
	  "input file without line at end -->add 2 empty lines in the middle"]
	,
    //add 1 line before last line 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4", 
	  //diff
	  "diff --git a/file1.js b/file1.j\r\n" + 
	  "index 7dbc9e3..86f6a24 100644\r\n" + 
	  "--- a/file1.js\r\n" + 
	  "+++ b/file1.js\r\n" + 
	  "@@ -1,4 +1,5 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  "+line 3-1\r\n" + 
	  " line 4\r\n" + 
	  "\\ No newline at end of file\r\n" +
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 3-1\r\n" + 
	  "line 4", 
	  //mapper
	  [[3,3,0],[1,0,9],[1,1,0]],
	  //description  
	  "input file without line at end -->add 1 line before last line(Bug 360985)"]
	,
    //add 3 blocks at beginning , middle and end
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,10 @@\r\n" + 
	  "+line 1-1\r\n" + 
	  "+line 1-2\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "+line 3-1\r\n" + 
	  "+line 3-2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "+line 5\r\n" + 
	  "+line 6\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1-1\r\n" + 
	  "line 1-2\r\n" + 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3-1\r\n" + 
	  "line 3-2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "line 5\r\n" + 
	  "line 6", 
	  //mapper
	  [[2,0,2],[2,2,0],[2,0,6],[2,2,0],[2,1,10]],
	  //description  
	  "input file with new line at end -->add 3 blocks at beginning , middle and end"]
	,
	/***************************************************************************/
	/****************************   remove Lines *******************************/
	/***************************************************************************/
    /***********  input file has new line at end*******************/
	//remove 1 line at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,3 @@\r\n" + 
	  "-line 1\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[0,1,-1],[4,4,0]],
	  //description  
	  "input file has new line at end --> remove 1 line at beginning"]
	,
    //remove 2 lines at beginning
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,2 @@\r\n" + 
	  "-line 1\r\n" + 
	  "-line 2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[0,2,-1],[3,3,0]],
	  //description  
	  "input file has new line at end --> remove 2 lines at beginning"]
	,
    //remove 2 lines in the middle 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,2 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[0,2,-1],[2,2,0]],
	  //description  
	  "input file has new line at end --> remove 2 lines in the middle"]
	,
    //remove 2 lines at the end 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,2 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "-line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[0,2,-1],[1,1,0]],
	  //description  
	  "input file has new line at end --> remove 2 lines at end"]
	,
    //remove the empty line at the end 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  "-line 4\r\n" + 
	  "+line 4\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" +
	  "line 4",
	  //mapper
	  [[3,3,0],[1,2,6]],
	  //description  
	  "input file has new line at end --> remove  the empty line at the end"]
	,
    //remove 1 empty line in the middle 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "\r\n" + 
	  "\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -2,6 +2,5 @@\r\n" + 
	  " line 2\r\n" + 
	  " \r\n" + 
	  " \r\n" + 
	  "-\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "\r\n" + 
	  "\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "",
	  //mapper
	  [[4,4,0],[0,1,-1],[3,3,0]],
	  //description  
	  "input file has new line at end --> remove 1 empty line in the middle"]
	,
    //remove the last line and empty line at the end 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "-line 4\r\n" + 
	  "+line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //mapper
	  [[2,2,0],[1,3,6]],
	  //description  
	  "input file has new line at end --> remove the last line and empty line at the end"]
	,
    //remove all 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +0,0 @@\r\n" + 
	  "-line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "-line 4\r\n" + 
	  "", 
	  //output file
	  "", 
	  //mapper
	  [[0,4,-1],[1,1,0]],
	  //description  
	  "input file has new line at end --> remove all"]
	,
    /***********  input file has no new line at end*******************/
    //remove the last line  
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,2 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[0,1,-1]],
	  //description  
	  "input file has no new line at end --> remove the last line"]
	,
    //remove the last line and the new line at the end 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,2 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 2\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2", 
	  //mapper
	  [[1,1,0],[1,2,6]],
	  //description  
	  "input file has no new line at end --> remove the last line and the new line at the end"]
	,
    //remove all 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +0,0 @@\r\n" + 
	  "-line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "", 
	  //mapper
	  [[0,3,-1]],
	  //description  
	  "input file has no new line at end --> remove all"]
	,
	/***************************************************************************/
	/****************************   change Lines *******************************/
	/***************************************************************************/
    /***********  input file has new line at end*******************/
	//change the first line 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  "-line 1\r\n" + 
	  "+line 111\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 111\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,3],[4,4,0]],
	  //description  
	  "input file has new line at end --> change the first line"]
	,
	//change the first line to 2 lines
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,5 @@\r\n" + 
	  "-line 1\r\n" + 
	  "+line 111\r\n" + 
	  "+line 1111\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 111\r\n" + 
	  "line 1111\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[2,1,3],[4,4,0]],
	  //description  
	  "input file has new line at end --> change the first line to 2 lines"]
	,
	//change the second line 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "+line 222\r\n" + 
	  " line 3\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 222\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[1,1,4],[3,3,0]],
	  //description  
	  "input file has new line at end --> change the second line"]
	,
	//change the last line 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  "-line 4\r\n" + 
	  "+line 444\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 444\r\n" + 
	  "", 
	  //mapper
	  [[3,3,0],[1,1,6],[1,1,0]],
	  //description  
	  "input file has new line at end --> change the last line"]
	,
	//change the last line to 2 lines
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,5 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  " line 3\r\n" + 
	  "-line 4\r\n" + 
	  "+line 444\r\n" + 
	  "+line 5\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 444\r\n" + 
	  "line 5\r\n" + 
	  "", 
	  //mapper
	  [[3,3,0],[2,1,6],[1,1,0]],
	  //description  
	  "input file has new line at end --> change the last line to 2 lines"]
	,
	//change the middle 2 lines
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "+line 222\r\n" + 
	  "+line 333\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 222\r\n" + 
	  "line 333\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[2,2,5],[2,2,0]],
	  //description  
	  "input file has new line at end --> change the midle 2 lines"]
	,
	//change the middle 2 lines to 4 lines
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,6 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "+line 222\r\n" + 
	  "+line 2222\r\n" + 
	  "+line 333\r\n" + 
	  "+\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 222\r\n" + 
	  "line 2222\r\n" + 
	  "line 333\r\n" + 
	  "\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[4,2,5],[2,2,0]],
	  //description  
	  "input file has new line at end --> change the midle 2 lines to 4 lines"]
	,
	//change the middle 2 lines to 1 line
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,6 @@\r\n" + 
	  " line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "+line 2233\r\n" + 
	  " line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2233\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[1,1,0],[1,2,5],[2,2,0]],
	  //description  
	  "input file has new line at end --> change the midle 2 lines to 1 line"]
	,
	//change all lines
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //diff
	  "@@ -1,4 +1,4 @@\r\n" + 
	  "-line 1\r\n" + 
	  "-line 2\r\n" + 
	  "-line 3\r\n" + 
	  "-line 4\r\n" + 
	  "+line 11\r\n" + 
	  "+line 22\r\n" + 
	  "+line 33\r\n" + 
	  "+line 44\r\n" + 
	  "", 
	  //output file
	  "line 11\r\n" + 
	  "line 22\r\n" + 
	  "line 33\r\n" + 
	  "line 44\r\n" + 
	  "", 
	  //mapper
	  [[4,4,6],[1,1,0]],
	  //description  
	  "input file has new line at end --> change all lines"]
	,
    /***********  input file has no new line at end*******************/
	//change the last line  
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 333\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 333", 
	  //mapper
	  [[2,2,0],[1,1,6]],
	  //description  
	  "input file has no new line at end --> change the last line"]
	,
	//change the last line with new line  
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,3 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 333\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 333\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[1,1,6]],
	  //description  
	  "input file has no new line at end --> change the last line with new line"]
	,
	//change the last line to 2 lines   
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 333\r\n" + 
	  "+line 4\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 333\r\n" + 
	  "line 4", 
	  //mapper
	  [[2,2,0],[2,1,6]],
	  //description  
	  "input file has no new line at end --> change the last line to 2 lines"]
	,
	//change the last line to 2 lines with new line  
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3", 
	  //diff
	  "@@ -1,3 +1,4 @@\r\n" + 
	  " line 1\r\n" + 
	  " line 2\r\n" + 
	  "-line 3\r\n" + 
	  "\\ No newline at end of file\r\n" + 
	  "+line 333\r\n" + 
	  "+line 4\r\n" + 
	  "", 
	  //output file
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 333\r\n" + 
	  "line 4\r\n" + 
	  "", 
	  //mapper
	  [[2,2,0],[2,1,6]],
	  //description  
	  "input file has no new line at end --> change the last line to 2 lines with new line"]
	,
	/***************************************************************************/
	/****************************   remove , change and add lines **************/
	/***************************************************************************/
    /***********  input file has new line at end*******************/
	//remove line 1,2 ;change 4,5 ; add 6-1,6-2 
	[ 
	  //input file 
	  "line 1\r\n" + 
	  "line 2\r\n" + 
	  "line 3\r\n" + 
	  "line 4\r\n" + 
	  "line 5\r\n" + 
	  "line 6\r\n" + 
	  "line 7\r\n" + 
	  "", 
	  //diff
	  "--- test2o.js	Tue Feb 15 13:16:05 2011\r\n" + 
	  "+++ test2n.js	Tue Feb 15 13:17:42 2011\r\n" + 
	  "@@ -1,7 +1,8 @@\r\n" + 
	  "-line 1\r\n" + 
	  "-line 2\r\n" + 
	  " line 3\r\n" + 
	  "-line 4\r\n" + 
	  "-line 5\r\n" + 
	  "+line 444\r\n" + 
	  "+line 555\r\n" + 
	  "+line 555\r\n" + 
	  " line 6\r\n" + 
	  "+line 6-1\r\n" + 
	  "+line 6-2\r\n" + 
	  " line 7\r\n" + 
	  "", 
	  //output file
	  "line 3\r\n" + 
	  "line 444\r\n" + 
	  "line 555\r\n" + 
	  "line 555\r\n" + 
	  "line 6\r\n" + 
	  "line 6-1\r\n" + 
	  "line 6-2\r\n" + 
	  "line 7\r\n" + 
	  "", 
	  //mapper
	  [[0,2,-1],[1,1,0],[3,2,9],[1,1,0],[2,0,13],[2,2,0]],
	  //description  
	  "input file has new line at end --> remove line 1,2 ;change 4,5 ; add 6-1,6-2"]
	,
	/***************************************************************************/
	/****************************   change last line by adding one charactor **************/
	/***************************************************************************/
    /***********  input file has no new line at end*******************/
	//https://bugs.eclipse.org/bugs/show_bug.cgi?id=368250 
	[ 
	  //input file 
	  "line 1\n" + 
	  "line 2" 
	  , 
	  //diff
	  "@@ -1,4 +1,4 @@\n" + 
	  " line 1\n" + 
	  "-line 2\n" + 
	  "\\ No newline at end of file\n" + 
	  "+line 22\n" + 
	  "\\ No newline at end of file\n" + 
	  "", 
	  //output file
	  "line 1\n" + 
	  "line 22" 
	  , 
	  //mapper
	  [[1,1,0],[1,1,5]],
	  //description  
	  "input file has no new line at end --> change last line by adding one charactor"]
];

return exports;	
});
