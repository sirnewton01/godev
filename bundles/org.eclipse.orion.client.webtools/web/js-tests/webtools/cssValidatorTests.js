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
/*eslint-env browser, amd, mocha*/
define([
	'chai/chai',
	'orion/Deferred',
	'webtools/cssValidator',
	'mocha/mocha' // no exports
], function(chai, Deferred, CssValidator) {
	var assert = chai.assert;
	var validator = new CssValidator.CssValidator();

	describe("CSS validator", function() {
		var context = {
			text: "",
			/**
			 * gets the text
			 */
			getText: function() {
				return new Deferred().resolve(this.text);
			}
		};

		/**
		 * Resets the test state between runs
		 */
		beforeEach(function() {
			context.text = "";
		});

		/**
		 * Tests a bad property decl
		 */
		it("should flag a bad property decl", function(/*done*/) {
			context.text = "h1:{f: 22px}";
			return validator.computeProblems(context).then(function(result) {
				var problems = result.problems;
				assert(problems != null, 'There should be CSS problems');
				assert(problems.length === 1, 'There should only be one CSS problem');
				assert.equal(problems[0].description, 'Unknown property \'f\'.', 'problem text is wrong');
			});
		});
	});
});