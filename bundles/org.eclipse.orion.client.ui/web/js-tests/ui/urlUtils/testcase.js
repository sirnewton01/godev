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

define(["chai/chai", "orion/urlUtils"], function(chai, mUrlUtils) {
	var assert = chai.assert;
      
	// The test cases are for testing the urlUtils function to detect if a given text has any URL encoded by "[displayString](url)". 
	// Currently this detecting function is used as a parser for rendering a string in the shell page, by different segment. The segment is mixed by plain text and url link.
	// Each segment has the following properties:
	//     segmentStr: String. The display string in the segment.
	//     urlStr: String. Only present if the segment is a valid URL.
	// 
	var tests = {};
	
	/**
	 * Test an empty string.
	 */
	tests.testEmpty = function() {
		var result = mUrlUtils.detectValidURL("");
		assert.equal(result, null);
	};

	/**
	 * Test a string with no URL and no []() pair.
	 */
	tests.testNoURLNoPair = function() {
		var result = mUrlUtils.detectValidURL("There is no URL"); //$NON-NLS-0$
		assert.equal(result, null);
	};

	/**
	 * Test a string with URL but no []() pair.
	 */
	tests.testWithURLNoPair = function() {
		var result = mUrlUtils.detectValidURL("There is URL  http://abc.com:8081/param=foo"); //$NON-NLS-0$
		assert.equal(result, null);
	};

	/**
	 * Test a string with good URL enclosed by []() pair.
	 */
	tests.testWithURLAndPair = function() {
		var result = mUrlUtils.detectValidURL("There is URL  [](http://abc.com:8081/param=foo)  and it is valid"); //$NON-NLS-0$
		var expectedResult = [{segmentStr: "There is URL  "}, //$NON-NLS-0$
							  {segmentStr: "http://abc.com:8081/param=foo", urlStr: "http://abc.com:8081/param=foo"}, //$NON-NLS-0$
							  {segmentStr: "  and it is valid"}]; //$NON-NLS-0$
		assert.deepEqual(result, expectedResult);
	};

	/**
	 * Test a string with good URL enclosed by []() pair.
	 */
	tests.testWithTwoGoodURLAndPair = function() {
		var result = mUrlUtils.detectValidURL("There is URL  [](http://abc.com:8081/param=foo)   [](http://abc.com:8082/param=foo) and they are valid"); //$NON-NLS-0$
		var expectedResult = [{segmentStr: "There is URL  "}, //$NON-NLS-0$
							  {segmentStr: "http://abc.com:8081/param=foo", urlStr: "http://abc.com:8081/param=foo"}, //$NON-NLS-0$
							  {segmentStr: "   "}, //$NON-NLS-0$
							  {segmentStr: "http://abc.com:8082/param=foo", urlStr: "http://abc.com:8082/param=foo"}, //$NON-NLS-0$
							  {segmentStr: " and they are valid"}]; //$NON-NLS-0$
		assert.deepEqual(result, expectedResult);
	};

	
	 // Test a string with bad URL enclosed by []() pair.
	 
	tests.testWithBadURLAndPair1 = function() {
		var result = mUrlUtils.detectValidURL("There is URL  [](abc:123:a4b)  and it is valid"); //$NON-NLS-0$
		assert.deepEqual(result, null);
	};

	
	 // Test a string with bad URL enclosed by []() pair.
	 
	tests.testWithBadURLAndPair2 = function() {
		var result = mUrlUtils.detectValidURL("There is URL  [](abcde)  and it is valid"); //$NON-NLS-0$
		assert.deepEqual(result, null);
	};

	
	// Test a string with bad URL and a good one enclosed by []() pair.
	
	tests.testWithGoodAndBadURLAndPair = function() {
		var result = mUrlUtils.detectValidURL("There is bad URL  [](abc:123:a4b)  and a good URL [](https://abc.com:8081/param=foo) that is valid"); //$NON-NLS-0$
		var expectedResult = [{segmentStr: "There is bad URL  [](abc:123:a4b)  and a good URL "}, //$NON-NLS-0$
							  {segmentStr: "https://abc.com:8081/param=foo", urlStr: "https://abc.com:8081/param=foo"}, //$NON-NLS-0$
							  {segmentStr: " that is valid"}]; //$NON-NLS-0$
		assert.deepEqual(result, expectedResult);
	};

	return tests;
});
