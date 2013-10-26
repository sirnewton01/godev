/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: VMware - initial API and implementation
 *     Andrew Eisenberg - initial API and implementation
 ******************************************************************************/
/*global define document*/
define(["orion/assert", "orion/serviceregistry", "orion/searchRenderer"], 
		function(assert, mServiceregistry, mSearchRenderer) {
	var tests = {};
	
	tests.testEmptyRendererWithQueryName = function() {
		var renderer = mSearchRenderer.makeRenderFunction(document.querySelectorAll("#results")[0], false, function(results) {
			assert.equal(results.innerHTML, "<div>No matches found for <b>No results</b></div>");
		});
		renderer([], "No results");
	};
	tests.testEmptyRendererNoName = function() {
		var renderer = mSearchRenderer.makeRenderFunction(document.querySelectorAll("#results")[0], false, function(results) {
			assert.equal(results.innerHTML, "");
		});
		renderer([]);
	};
	tests.testExternalResource = function() {
		var renderer = mSearchRenderer.makeRenderFunction(document.querySelectorAll("#results")[0], false, function(results) {
			assert.equal(results.innerHTML, "<table><tbody><tr><td><a href=\"http://eclipse.org\">link</a></td></tr></tbody></table>");
		});
		renderer([{
			name: 'link',
			path: 'http://eclipse.org',
			isExternalResource: true
		}]);
	};
	tests.testDirectory = function() {
		var renderer = mSearchRenderer.makeRenderFunction(document.querySelectorAll("#results")[0], false, function(results) {
			assert.equal(results.innerHTML, "<table><tbody><tr><td><a href=\"../../edit/edit.html#foo/blap\">link</a></td></tr></tbody></table>");
		});
		renderer([{
			name: 'link',
			path: 'foo/blap',
			directory: true
		}]);
	};
	tests.testFile = function() {
		var renderer = mSearchRenderer.makeRenderFunction(document.querySelectorAll("#results")[0], false, function(results) {
			assert.equal(results.innerHTML, "<table><tbody><tr><td><a href=\"../../edit/edit.html#foo/blap.js\">link</a></td></tr></tbody></table>");
		});
		renderer([{
			name: 'link',
			path: 'foo/blap.js'
		}]);
	};
	return tests;
});
