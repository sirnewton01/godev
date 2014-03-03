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
/*global define console Uint8Array*/


define(["orion/assert", "orion/Base64", "domReady!"], function(assert, Base64) {
	var tests = {};
	var testData = "abcdef";
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;
	testData += testData;

	tests.testDecodeEncode = function() {
		var decoded = Base64.decode(testData);
		var result = Base64.encode(decoded);

		assert.equal(result, testData);
	};
	
	tests.testWhitespace = function() {
		Base64.decode(" ");
	};

	return tests;
});