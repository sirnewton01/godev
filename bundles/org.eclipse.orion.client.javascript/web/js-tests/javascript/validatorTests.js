/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd, mocha, node*/
/*global doctrine*/
define([
	'javascript/validator',
	'chai/chai',
	'orion/Deferred',
	'esprima',
	'javascript/astManager',
	'mocha/mocha', //must stay at the end, not a module
], function(Validator, chai, Deferred, Esprima, ASTManager) {
	var assert = chai.assert;

	describe('Content Assist Tests', function() {
		
		/**
		 * @description Sets up the test
		 * @param {Object} options {buffer, contentType}
		 * @returns {Object} The object with the initialized values
		 */
		function setup(options) {
		    var buffer = options.buffer;
		    var contentType = options.contentType ? options.contentType : 'application/javascript';
			var astManager = new ASTManager.ASTManager(Esprima);
			var validator = new Validator(astManager);
			var editorContext = {
				/*override*/
				getText: function() {
					return new Deferred().resolve(buffer);
				}
			};
			return {
				validator: validator,
				editorContext: editorContext,
				contentType: contentType
			};
		}
	
	    /**
    	 * @name validate
    	 * @description Runs the validator on the given options
    	 * @param {Object} options {buffer, contentType}
    	 * @returns {orion.Promise} The validation promise
    	 */
    	function validate(options) {
            var obj = setup(options);
            return obj.validator.computeProblems(obj.editorContext, {contentType: obj.contentType});
	    }
	
	    /**
    	 * @name assertProblems
    	 * @description Compares the computed problem set against the expected ones
    	 * @param {Array.<orion.Problem>} computed The computed est of problems
    	 * @param {Array.<Object>} expected The expected set of problems
    	 */
    	function assertProblems(computed, expected) {
    	    var problems = computed.problems;
    	    assert.equal(problems.length, expected.length, "The wrong number of problems was computed");
    	    for(var i = 0; i < problems.length; i++) {
    	        var pb = problems[i];
    	        var expb = expected[i];
    	        assert.equal(pb.start, expb.start, "Wrong problem start");
    	        assert.equal(pb.end, expb.end, "Wrong problem end");
    	        assert.equal(pb.line, expb.line, "Wrong problem line number");
    	        assert.equal(pb.description, expb.description, "Wrong problem message");
    	        assert.equal(pb.severity, expb.severity, "Wrong problem severity");
    	        if(pb.descriptionArgs) {
    	            assert(expb.descriptionArgs, "Missing expected description arguments");
    	            assert.equal(pb.descriptionArgs.nls, expb.descriptionArgs.nls, "Missing NLS descriptipon argument key");
    	        }
    	    }
	    }
	
		it("Test EOF 1", function() {
			var promise = validate({buffer: "function"});
			return promise.then(function (problems) {
				assertProblems(problems, [
				    {start: 9,
				     line: 1,
				     severity: 'error',
				     description: 'syntaxErrorIncomplete',
				     descriptionArgs: {nls: 'syntaxErrorIncomplete'}
				    }
				]);
			});
		});
		
		it("Test EOF 2", function() {
			var promise = validate({buffer: "var foo = 10;\nfunction"});
			return promise.then(function (problems) {
				assertProblems(problems, [
				    {start: 9,
				     line: 2,
				     severity: 'error',
				     description: 'syntaxErrorIncomplete',
				     descriptionArgs: {nls: 'syntaxErrorIncomplete'}
				    }
				]);
			});
		});
		
		it("Test invalid regex 1", function() {
			var promise = validate({buffer: "/"});
			return promise.then(function (problems) {
				assertProblems(problems, [
    				{start: 0, 
    				 end: 1, 
    				 severity: 'error', 
    				 description: "Invalid regular expression: missing /", 
    				 descriptionKey: "esprimaParseFailure",
    				 descriptionArgs: {
    				    0: "Invalid regular expression: missing /",
    				    nls: "esprimaParseFailure"
    				 }
    				 },
    				{start: 0, 
    				 end: 1, 
    				 severity: 'error', 
    				 description:"syntaxErrorBadToken", 
    				 descriptionKey: "syntaxErrorBadToken",
    				 descriptionArgs: {
    				    0: "/",
    				    nls: "syntaxErrorBadToken"
    				 }
    				 }
				]);
			});
		});
	});
});
