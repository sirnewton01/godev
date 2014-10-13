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
define([
	"chai/chai",
	"orion/URITemplate",
	"mocha/mocha",
], function(chai, URITemplate) {
	var assert = chai.assert;

	var variables = {
		dom: "example.com",
		dub: "me/too",
		hello: "Hello World!",
		half: "50%",
		"var": "value",
		who: "fred",
		base: "http://example.com/home/",
		path: "/foo/bar",
		list: ["red", "green", "blue"],
		keys: {"semi":";","dot":".","comma":","},
		v: "6",
		x: "1024",
		y: "768",
		empty: "",
		empty_keys: {},
		undef: null,
		encodedpct: "%25%A2"
	};

	describe("URITemplate", function() {
		it("literal template", function() {
			assert.equal(new URITemplate("test").expand(variables),"test");
			assert.equal(new URITemplate("Hello World!").expand(variables), "Hello%20World!");
		});

		it("simple string expansion", function() {
			assert.equal(new URITemplate("{var}").expand(variables), "value");
			assert.equal(new URITemplate("{hello}").expand(variables), "Hello%20World%21");
			assert.equal(new URITemplate("{half}").expand(variables), "50%25");
			assert.equal(new URITemplate("O{empty}X").expand(variables), "OX");
			assert.equal(new URITemplate("O{undef}X").expand(variables), "OX");
			assert.equal(new URITemplate("{x,y}").expand(variables), "1024,768");
			assert.equal(new URITemplate("{x,hello,y}").expand(variables), "1024,Hello%20World%21,768");
			assert.equal(new URITemplate("?{x,empty}").expand(variables), "?1024,");
			assert.equal(new URITemplate("?{x,undef}").expand(variables), "?1024");
			assert.equal(new URITemplate("?{undef,y}").expand(variables), "?768");
			assert.equal(new URITemplate("{var:3}").expand(variables), "val");
			assert.equal(new URITemplate("{var:30}").expand(variables), "value");
			assert.equal(new URITemplate("{list}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{list*}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{keys}").expand(variables), "semi,%3B,dot,.,comma,%2C");
			assert.equal(new URITemplate("{keys*}").expand(variables), "semi=%3B,dot=.,comma=%2C");
			assert.equal(new URITemplate("{encodedpct}").expand(variables), "%2525%25A2");
		});

		it("reserved expansion", function() {
			assert.equal(new URITemplate("{+var}").expand(variables), "value");
			assert.equal(new URITemplate("{+hello}").expand(variables), "Hello%20World!");
			assert.equal(new URITemplate("{+half}").expand(variables), "50%25");
			assert.equal(new URITemplate("{base}index").expand(variables), "http%3A%2F%2Fexample.com%2Fhome%2Findex");
			assert.equal(new URITemplate("{+base}index").expand(variables), "http://example.com/home/index");
			assert.equal(new URITemplate("O{+empty}X").expand(variables), "OX");
			assert.equal(new URITemplate("O{+undef}X").expand(variables), "OX");		
			assert.equal(new URITemplate("{+path}/here").expand(variables), "/foo/bar/here");
			assert.equal(new URITemplate("here?ref={+path}").expand(variables), "here?ref=/foo/bar");
			assert.equal(new URITemplate("up{+path}{var}/here").expand(variables), "up/foo/barvalue/here");
			assert.equal(new URITemplate("{+x,hello,y}").expand(variables), "1024,Hello%20World!,768");
			assert.equal(new URITemplate("{+path,x}/here").expand(variables), "/foo/bar,1024/here");
			assert.equal(new URITemplate("{+path:6}/here").expand(variables), "/foo/b/here");
			assert.equal(new URITemplate("{+list}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{+list*}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{+keys}").expand(variables), "semi,;,dot,.,comma,,");
			assert.equal(new URITemplate("{+keys*}").expand(variables), "semi=;,dot=.,comma=,");
			assert.equal(new URITemplate("{+encodedpct}").expand(variables), "%25%A2");
		});

		it("comma reserved expansion", function() {
			assert.equal(new URITemplate("{,var}").expand(variables), "value");
			assert.equal(new URITemplate("{,hello}").expand(variables), "Hello%20World!");
			assert.equal(new URITemplate("{,half}").expand(variables), "50%25");
			assert.equal(new URITemplate("{base}index").expand(variables), "http%3A%2F%2Fexample.com%2Fhome%2Findex");
			assert.equal(new URITemplate("{,base}index").expand(variables), "http://example.com/home/index");
			assert.equal(new URITemplate("O{,empty}X").expand(variables), "OX");
			assert.equal(new URITemplate("O{,undef}X").expand(variables), "OX");		
			assert.equal(new URITemplate("{,path}/here").expand(variables), "/foo/bar/here");
			assert.equal(new URITemplate("here?ref={,path}").expand(variables), "here?ref=/foo/bar");
			assert.equal(new URITemplate("up{,path}{var}/here").expand(variables), "up/foo/barvalue/here");
			assert.equal(new URITemplate("{,x,hello,y}").expand(variables), "1024,Hello%20World!,768");
			assert.equal(new URITemplate("{,path,x}/here").expand(variables), "/foo/bar,1024/here");
			assert.equal(new URITemplate("{,path:6}/here").expand(variables), "/foo/b/here");
			assert.equal(new URITemplate("{,list}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{,list*}").expand(variables), "red,green,blue");
			assert.equal(new URITemplate("{,keys}").expand(variables), "semi,;,dot,.,comma,%2C");
			assert.equal(new URITemplate("{,keys*}").expand(variables), "semi=;,dot=.,comma=%2C");
			assert.equal(new URITemplate("{,encodedpct}").expand(variables), "%2525%25A2");
		});
	});
});
