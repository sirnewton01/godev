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
define(["chai/chai", "plugins/filePlugin/GitHubFileImpl", "domReady!"], function(chai, GitHubFileImpl) {
	var assert = chai.assert;
	var tests = {};
	
	tests.testrepo = function() {
		var impl = new GitHubFileImpl("https://github.com/eclipse/orion.client.git");
		assert.equal(impl._repoURL.href,"https://api.github.com/repos/eclipse/orion.client");
		
		impl = new GitHubFileImpl("https://github.com:443/eclipse/orion.client.git");
		assert.equal(impl._repoURL.href,"https://api.github.com/repos/eclipse/orion.client");
	};
	
	tests.xtestbranch = function() {
		var impl = new GitHubFileImpl("https://github.com/eclipse/orion.client.git");
		return impl._getBranches().then(function(branches) {
			assert.ok(branches.length > 100);
		});
	};
	
	tests.xtestchildren = function() {
		var impl = new GitHubFileImpl("https://github.com/eclipse/orion.client.git");
		return impl._getChildren("https://api.github.com/repos/eclipse/orion.client/contents?ref=master").then(function(children) {
			assert.ok(children.length > 5);
		});
	};
	
	tests.testparents = function() {
		var impl = new GitHubFileImpl("https://github.com/eclipse/orion.client.git");
		var parents = impl._getParents("https://api.github.com/repos/eclipse/orion.client/contents");
		assert.equal(parents, null);
		parents = impl._getParents("https://api.github.com/repos/eclipse/orion.client/contents?ref=master");
		assert.ok(parents.length === 0);
		parents = impl._getParents("https://api.github.com/repos/eclipse/orion.client/contents/bundles?ref=master");
		assert.ok(parents.length === 1);
	};
	
	return tests;
});