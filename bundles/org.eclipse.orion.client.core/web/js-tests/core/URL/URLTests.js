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
/*jslint amd:true mocha:true*/
/*global URL*/
define([
	"chai/chai",
	"orion/URL-shim",
//	"domReady!"
], function(chai) {
	var assert = chai.assert;

	describe("URL-shim", function() {
		it("specification URL", function() {
			var spec = "http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html";
			var url = new URL(spec);
			assert.equal(url.href, spec);
			assert.equal(url.origin, "http://dvcs.w3.org");
			assert.equal(url.protocol, "http:");
			assert.equal(url.host, "dvcs.w3.org");
			assert.equal(url.hostname, "dvcs.w3.org");
			assert.equal(url.port, "");
			assert.equal(url.pathname, "/hg/url/raw-file/tip/Overview.html");
			assert.equal(url.search, "");
			assert.equal(url.hash, "");
		});
	
		it("example URL", function() {
			var spec = "http://www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash";
			var url = new URL(spec);
			assert.equal(url.href, spec);
			assert.equal(url.origin, "http://www.example.com");
			assert.equal(url.protocol, "http:");
			assert.equal(url.host, "www.example.com");
			assert.equal(url.hostname, "www.example.com");
			assert.equal(url.port, "");
			assert.equal(url.pathname, "/a/b/c.html");
			assert.equal(url.search, "?p=q&r=s&p&p=t");
			assert.equal(url.hash, "#hash");
			
			url.protocol = "ftp";
			url.host = "example2.com:8877";
			url.pathname = "/d/e/a/l/";
			url.search="";
			url.hash="";
			assert.equal(url.href, "ftp://example2.com:8877/d/e/a/l/");
		});
	
		it("username and password", function() {
			var spec = "http://www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash";
			var url = new URL(spec);
			url.username = "a name";
			assert.equal(url.href, "http://a%20name@www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash");
			url.password = "a password";
			assert.equal(url.href, "http://a%20name:a%20password@www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash");
			url.username = "";
			assert.equal(url.href, "http://:a%20password@www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash");
			url.username = "a name";
			url.password = "";
			assert.equal(url.href, "http://a%20name@www.example.com/a/b/c.html?p=q&r=s&p&p=t#hash");
			url.username = "";
			assert.equal(url.href, spec);
		});
	
		it("query", function() {
			var spec = "http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html";
			var url = new URL(spec);
			assert.equal(url.search,"");
			assert.equal(url.query.size,0);
			url.search = "?a=1&b=2";
			assert.equal(url.query.size,2);
			assert.equal(url.query.get("a"), "1");
			assert.equal(url.query.get("b"), "2");
			url.query.set("b","3");
			assert.equal(url.query.get("b"), "3");
			assert.equal(url.search, "?a=1&b=3");
			assert.equal(url.query.has("c"), false);
			assert.equal(url.query.has("a"), true);
			assert.equal(url.query.has("b"), true);
			url.query.append("b","4");
			url.query.append("c","5");
			url.query.append("a param","a value");
			url.query.set("empty", "");
			url.query.append("b","6");
			assert.equal(url.search, "?a=1&b=3&b=4&c=5&a%20param=a%20value&empty&b=6");
			url.query['delete']("b");
			assert.equal(url.search, "?a=1&c=5&a%20param=a%20value&empty");
			var search = "?";
			var pairs = [];
			url.query.forEach(function(value, key) {
				var pair = encodeURIComponent(key);
				if (value) {
					pair += "=" + encodeURIComponent(value);
				}
				pairs.push(pair);
			});
			search += pairs.join("&");
			assert.equal(url.search, search);
			url.query.clear();
			assert.equal(url.search, "");
		});
		
		it("relative", function() {
			var spec = "http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html";
//			var url = new URL(spec);
			
			var rel1 = new URL("//localhost/a/cat", spec);
			assert.equal(rel1.href, "http://localhost/a/cat");
	
			var rel2 = new URL("/a/cat", spec);
			assert.equal(rel2.href, "http://dvcs.w3.org/a/cat");
	
			var rel3 = new URL("a/cat", spec);
			assert.equal(rel3.href, "http://dvcs.w3.org/hg/url/raw-file/tip/a/cat");
	
			var rel4 = new URL("../a/cat", spec);
			assert.equal(rel4.href, "http://dvcs.w3.org/hg/url/raw-file/a/cat");
	
			var rel5 = new URL("../../a/cat", spec);
			assert.equal(rel5.href, "http://dvcs.w3.org/hg/url/a/cat");
	
			var rel6 = new URL("./././././././././../././././././././../././././a/cat", spec);
			assert.equal(rel6.href, "http://dvcs.w3.org/hg/url/a/cat");
		});
		
		it("invalid", function() {
			assert.throws(function(){return new URL("ht@tp:::::::://///////invalid?a=1#bad");});
			var url = new URL("http://localhost");
			url.href = "ht@tp:::::::://///////invalid?a=1#bad";
			assert.equal(url.href, "ht@tp:::::::://///////invalid?a=1#bad");
			assert.equal(url.origin, "");
			assert.equal(url.protocol, ":");
			assert.equal(url.username, "");
			assert.equal(url.password, "");
			assert.equal(url.host, "");
			assert.equal(url.hostname, "");
			assert.equal(url.port, "");
			assert.equal(url.pathname, "");
			assert.equal(url.search, "");
			assert.equal(url.query, null);
			assert.equal(url.hash, "");
		});
	});
});