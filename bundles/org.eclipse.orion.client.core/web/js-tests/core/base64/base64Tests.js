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

define(["chai/chai", "orion/Base64", "mocha/mocha"], function(chai, Base64) {
	var assert = chai.assert;
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

	describe("base64", function() {
		it("#decode, #encode", function() {
			var decoded = Base64.decode(testData);
			var result = Base64.encode(decoded);
	
			assert.equal(result, testData);
		});

		it("whitespace", function() {
			Base64.decode(" ");
		});

	});
});