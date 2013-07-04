/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation, VMware, Inc and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: 
 *      IBM Corporation - initial API and implementation
 *      Andrew Eisenberg - rename jsContentAssist to jsTemplateContentAssist
 ******************************************************************************/
/*global define orion */

define(["orion/assert", "orion/editor/jsTemplateContentAssist"], function(assert, mContentAssist) {
	/**
	 * Helper function to invoke content assist on a given test case. The test case is a string that contains
	 * a special marker '@@@' indicating the cursor position. For example: "var x; x.@@@".
	 */
	function getKeywords(text) {
		var cursor = text.indexOf("@@@");
		if (cursor < 0) {
			assert.fail("Malformed js content assist test case: " + text);
			return;
		}
		var buffer = text.replace("@@@", "");
		//compute the prefix
		var index = cursor;
		var c;
		//prefix calculation logic copied from contentAssist.js
		while (index > 0 && ((97 <= (c=buffer.charCodeAt(index-1)) && c <= 122) || (65 <= c && c <= 90) || c === 95 || (48 <= c && c <= 57))) { //LETTER OR UNDERSCORE OR NUMBER
			--index;
		}
		var prefix = buffer.substring(index, cursor);
		var context = { prefix: prefix };
		var assist = new mContentAssist.JSTemplateContentAssistProvider();
		return assist.computeProposals(buffer, cursor, context);
	}
	
	function print(proposals) {
		return proposals.map(function(proposal) {
			return proposal.proposal.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
		});
	}

	/**
	 * Asserts that a given proposal is present in a list of actual proposals. The test just ensures that an actual
	 * proposal starts with the expected value.
	 * @param expectedProposal {String} The expected proposal string
	 * @param actualProposals {Array} Array of string or Proposal objects
	 */
	function assertProposal(expectedProposal, actualProposals) {
		for (var i = 0; i < actualProposals.length; i++) {
			if (typeof(actualProposals[i].proposal) === "string" && actualProposals[i].proposal.indexOf(expectedProposal) === 0) {
				return;
			}
		}
		//we didn't find it, so fail
		assert.fail("Expected to find proposal \'" + expectedProposal + "\' in: " + print(actualProposals));
	}

	/**
	 * Asserts that a proposal is present in a list of actual proposals. The test ensures that some actual proposal contains
	 * all the required words and none of the prohibited words.
	 */
	function assertProposalMatching(/*String[]*/ required, /*String[]*/ prohibited, actualProposals) {
		function matches(text, word) {
			return text.indexOf(word) !== -1;
		}
		for (var i = 0; i < actualProposals.length; i++) {
			var proposal = actualProposals[i];
			if (typeof proposal.proposal !== "string") {
				continue;
			}
			var matchesProposal = matches.bind(null, proposal.proposal);
			if (required.every(matchesProposal) && !prohibited.some(matchesProposal)) {
				return;
			}
		}
		assert.fail("Expected to find proposal matching all of '" + required.join("','") + "' and none of '" + prohibited.join("','") + "' in: " + print(actualProposals));
	}

	/**
	 * Asserts that a given proposal is NOT present in a list of actual proposals.
	 */
	function assertNoProposal(expectedProposal, actualProposals) {
		for (var i = 0; i < actualProposals.length; i++) {
			if (typeof(actualProposals[i]) === "string" && actualProposals[i].indexOf(expectedProposal) === 0) {
				assert.fail("Did not expect to find proposal \'" + expectedProposal + "\' in: " + print(actualProposals));
			}
			if (typeof(actualProposals[i].proposal) === "string" && actualProposals[i].proposal.indexOf(expectedProposal) === 0) {
				assert.fail("Did not expect to find proposal \'" + expectedProposal + "\' in: " + print(actualProposals));
			}
		}
		//we didn't find it, so pass
	}
	
	var tests = {};

	/**
	 * Test that keyword suggestions are not made when looking for a member function or property.
	 */
	tests.testKeywordCompletionInVariableMember = function() {
		var result = getKeywords("var x; x.to@@@");
		assertNoProposal("case", result);
		assertNoProposal("switch", result);
		assertNoProposal("var", result);
		assertNoProposal("function", result);
	};

	/**
	 * Test completion of control structure templates in the body of a function.
	 */
	tests.testTemplateInFunctionBody= function() {
		var result = getKeywords("function x(a) {\n @@@");
		assertNoProposal("toString", result);
		assertProposal("for", result);
		assertProposal("while", result);
		assertProposalMatching(["while", "(condition)"], ["do"], result); // while (condition) with no 'do'
		assertProposal("switch", result);
		assertProposalMatching(["switch", "case"], [], result); // switch..case
		assertProposal("try", result);
		assertProposal("if", result);
		assertProposalMatching(["if", "(condition)"], [], result); // if (condition)
		assertProposal("do", result);
		assertProposalMatching(["do", "while"], [], result); // do..while
	};

	/**
	 * Test completion of control structure templates in the body of a function.
	 */
	tests.testKeywordsInFunctionBodyWithPrefix= function() {
		var result = getKeywords("function x(a) {\n t@@@");
		assertNoProposal("toString".substr(1), result);
		assertProposal("this".substr(1), result);
		assertProposal("throw".substr(1), result);
		assertProposal("try".substr(1), result);
		assertProposal("typeof".substr(1), result);
		assertProposalMatching(["try {".substr(1), "catch ("], ["finally"], result); // try..catch with no finally
		assertProposalMatching(["try {".substr(1), "catch (", "finally"], [], result); // try..catch..finally
	};

	/**
	 * Test completion of control structure templates in the body of a function.
	 */
	tests.testTemplateInFunctionBodyWithPrefix= function() {
		var result = getKeywords("function x(a) {\n f@@@");
		assertNoProposal("toString", result);
		assertProposal("for".substr(1), result);
		assertProposalMatching(["for".substr(1), "in"], [], result);
		assertProposalMatching(["for".substr(1), "array"], [], result);
		assertNoProposal("while", result);
		assertNoProposal("switch", result);
		assertNoProposal("try", result);
		assertNoProposal("if", result);
		assertNoProposal("do", result);
	};

	/**
	 * Test completion after non-whitespace chars and there should be no template content assist
	 */
	tests.testTemplateAfterNonWhitespace1= function() {
		var result = getKeywords("x.@@@");
		assertNoProposal("toString", result);
		assertNoProposal("for".substr(1), result);
		assertNoProposal("while", result);
		assertNoProposal("switch", result);
		assertNoProposal("try", result);
		assertNoProposal("if", result);
		assertNoProposal("do", result);
	};

	/**
	 * Test completion after non-whitespace chars and there should be no template content assist
	 */
	tests.testTemplateAfterNonWhitespace2= function() {
		var result = getKeywords("x.  @@@");
		assertNoProposal("toString", result);
		assertNoProposal("for".substr(1), result);
		assertNoProposal("while", result);
		assertNoProposal("switch", result);
		assertNoProposal("try", result);
		assertNoProposal("if", result);
		assertNoProposal("do", result);
	};

	/**
	 * Test completion after non-whitespace chars and there should be no template content assist
	 */
	tests.testTemplateAfterNonWhitespace3= function() {
		var result = getKeywords("$  @@@");
		assertNoProposal("toString", result);
		assertNoProposal("for".substr(1), result);
		assertNoProposal("while", result);
		assertNoProposal("switch", result);
		assertNoProposal("try", result);
		assertNoProposal("if", result);
		assertNoProposal("do", result);
	};

	/**
	 * Test completion after non-whitespace chars.  should be templates because 
	 * there is a newline
	 */
	tests.testTemplateAfterNonWhitespace4= function() {
		var result = getKeywords("x.\n  @@@");
		assertNoProposal("toString", result);
		assertProposal("for", result);
		assertProposal("while", result);
		assertProposal("switch", result);
		assertProposal("try", result);
		assertProposal("if", result);
		assertProposal("do", result);
	};

	return tests;
});
