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
define(["chai/chai", "orion/HTMLTemplates-shim"/*, "domReady!"*/], function(chai/*, URITemplate*/) {
	var assert = chai.assert;
	
	describe("Test HTMLTemplate", function() {
		it.skip("TemplateElement", function() {
			assert.equal(document.body.querySelectorAll("div.comment3").length, 0);
			document.body.appendChild(document.getElementById("commentTemplate3").content.cloneNode(true));
			assert.equal(document.body.querySelectorAll("div.comment3").length, 1);
		});
	
		it.skip("TemplateElementAgain", function() {
			assert.equal(document.body.querySelectorAll("div.comment3").length, 1);
			document.body.appendChild(document.getElementById("commentTemplate3").content.cloneNode(true));
			assert.equal(document.body.querySelectorAll("div.comment3").length, 2);
		});
	
		it("NewTemplateElement", function() {
			var template = document.createElement("template");
			template.id="xyzzy";
			document.body.appendChild(template);
			template.innerHTML = "<img src='404.jpg'><div class='comment4'></div>";
			assert.ok(template.content);
			assert.equal(document.body.querySelectorAll("template#xyzzy").length, 1);
			assert.equal(document.body.querySelectorAll("template#xyzzy div").length, 0);
			document.body.appendChild(document.getElementById("xyzzy").content.cloneNode(true));
			assert.equal(document.body.querySelectorAll("div.comment4").length, 1);
			template.content.appendChild(document.createElement("h1"));
			document.body.appendChild(document.getElementById("xyzzy").content.cloneNode(true));
			assert.equal(document.body.querySelectorAll("div.comment4").length, 2);
		});
	});
});
