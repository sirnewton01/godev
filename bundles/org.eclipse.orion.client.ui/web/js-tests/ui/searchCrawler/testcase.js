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
/*global define console window*/
define(['chai/chai', 'mockFileClient.js', 'orion/crawler/searchCrawler', 'orion/contentTypes', 'orion/serviceregistry', 'orion/Deferred'], function(chai, mMockFileClient, mSearchCrawler, mContentTypes, mServiceRegistry, Deferred) {
	var assert = chai.assert;

/******  mock up a file system tree  ******/
	var f1_1_Contents =	"Search EveryWhere\n" + //js
						"JavaScript is fun\n" + 
						 "Partial search\n" + 
						 "Case Sensitive\n" + 
						 "bar bar foo\n"; 
	var f1_2_1_Contents = "Search Everywhere\n" + //css
						 "CSS is fun\n" + 
						 "Case Sensitive\n"; 
	var f1_2_2_Contents = "Search EveryWhere\n" + //html
						 "HTML is fun\n" + 
						 "Case Sensitive\n"; 
	var f1_3_Contents =	"Search Everywhere\n" + //js
						"JavaScript is fun\n" + 
						 "Case sensitive\n"; 
	var f2_Contents =	"Search EveryWhere\n" + //js
						"JavaScript is fun\n" + 
						 "Case Sensitive\n"; 
	var f3_1_Contents =	"Search Everywhere\n" + //css
						"CSS is fun\n" + 
						 "Partial search\n" + 
						 "Case Sensitive\n"; 
	var f3_2_Contents =	"Search EveryWhere\n" + //html
						"HTML is fun\n" + 
						 "Partial search\n" + 
						 "Case sensitive\n"; 
	var ContentsNameSearchOnly = "N*A*M*E\n"; //for name search only
	var mockData = {
		Location: "root",
		Directory: true,
		LocalTimeStamp: 0,
		Children: [
			{
				Location: "d1",
				ChildrenLocation: "d1",
				Directory: true,
				LocalTimeStamp: 0,
				Children:[
					{
						Location: "f1_1",
						Name: "f1_1.js",
						Directory: false,
						LocalTimeStamp: 0,
						Contents: f1_1_Contents
					},
					{
						Location: "d1_2",
						ChildrenLocation: "d1_2",
						Directory: true,
						LocalTimeStamp: 0,
						Children:[
							{
								Location: "f1_2_1",
								Name: "f1_2_1.css",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: f1_2_1_Contents
							},
							{
								Location: "f1_2_2",
								Name: "f1_2_2.html",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: f1_2_2_Contents
							},
							{
								Location: "f1_2_3",
								Name: "f1_2_3.png",
								Directory: false,
								LocalTimeStamp: 0
							},
							{
								Location: "f1_2_4",
								Name: "f1_2_4.txt",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: ContentsNameSearchOnly
							},
							{
								Location: "d1_2_3",
								ChildrenLocation: "d1_2_3",
								Directory: true,
								LocalTimeStamp: 0,
								Children: []
							}
						]
						
					},
					{
						Location: "f1_3",
						Name: "f1_3.js",
						Directory: false,
						LocalTimeStamp: 0,
						Contents: f1_3_Contents
					}
				]
			},
			{
				Location: "f2",
				Name: "f2.js",
				Directory: false,
				LocalTimeStamp: 0,
				Contents: f2_Contents
			},
			{
				Location: "d3",
				ChildrenLocation: "d2",
				Directory: true,
				LocalTimeStamp: 0,
					Children:[
						{
							Location: "f3_1",
							Name: "f3_1.css",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: f3_1_Contents
						},
						{
							Location: "f3_2",
							Name: "f3_2.html",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: f3_2_Contents
						},
						{
							Location: "f3_3",
							Name: "f3_3.conf",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: ContentsNameSearchOnly
						}
					]
			},
			{
				Location: "d3",
				ChildrenLocation: "d3",
				Directory: true,
				LocalTimeStamp: 0
			}
		]
	};
	
	var mockDataForPathSort = {
		Location: "root",
		Directory: true,
		LocalTimeStamp: 0,
		Children: [
			{
				Location: "d1",
				ChildrenLocation: "d1",
				Directory: true,
				LocalTimeStamp: 0,
				Children:[
					{
						Location: "EEE/f1_1.js",
						Name: "f1_1.js",
						Directory: false,
						LocalTimeStamp: 0,
						Contents: f1_1_Contents
					},
					{
						Location: "d1_2",
						ChildrenLocation: "d1_2",
						Directory: true,
						LocalTimeStamp: 0,
						Children:[
							{
								Location: "DDD/f1_2_1.css",
								Name: "f1_2_1.css",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: f1_2_1_Contents
							},
							{
								Location: "DDD/AAA/f1_2_4.txt",
								Name: "f1_2_4.txt",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: f1_2_2_Contents
							},
							{
								Location: "DDD/AAA/f1_2_2.html",
								Name: "f1_2_2.html",
								Directory: false,
								LocalTimeStamp: 0,
								Contents: f1_2_2_Contents
							},
							{
								Location: "DDD/AAA/f1_2_3.png",
								Name: "f1_2_3.png",
								Directory: false,
								LocalTimeStamp: 0
							},
							{
								Location: "d1_2_3",
								ChildrenLocation: "d1_2_3",
								Directory: true,
								LocalTimeStamp: 0,
								Children: []
							}
						]
						
					},
					{
						Location: "CCC/f1_3.js",
						Name: "f1_3.js",
						Directory: false,
						LocalTimeStamp: 0,
						Contents: f1_3_Contents
					}
				]
			},
			{
				Location: "BBB/f2.js",
				Name: "f2.js",
				Directory: false,
				LocalTimeStamp: 0,
				Contents: f2_Contents
			},
			{
				Location: "d3",
				ChildrenLocation: "d2",
				Directory: true,
				LocalTimeStamp: 0,
					Children:[
						{
							Location: "AAA/f3_2.html",
							Name: "f3_2.html",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: f3_2_Contents
						},
						{
							Location: "AAA/f3_1.css",
							Name: "f3_1.css",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: f3_1_Contents
						},
						{
							Location: "AAA/f3_3.conf",
							Name: "f3_3.conf",
							Directory: false,
							LocalTimeStamp: 0,
							Contents: ContentsNameSearchOnly
						}
					]
			},
			{
				Location: "d3",
				ChildrenLocation: "d3",
				Directory: true,
				LocalTimeStamp: 0
			}
		]
	};
	
/******  mock up a content type service  ******/
	var cTypes =	
		[{	id: "text/plain",
			name: "Text",
			extension: ["txt"],
			image: "../images/file.png"
		},
		{	id: "text/html",
			"extends": "text/plain",
			name: "HTML",
			extension: ["html", "htm"],
			image: "../images/html.png"
		},
		{	id: "text/css",
			"extends": "text/plain",
			name: "CSS",
			extension: ["css"],
			image: "../images/css.png"
		},
		{	id: "application/javascript",
			"extends": "text/plain",
			name: "JavaScript",
			extension: ["js"],
			image: "../images/javascript.png"
		},
		{	id: "application/json",
			"extends": "text/plain",
			name: "JSON",
			extension: ["json"],
			image: "../images/file.png"
		},
		{	id: "application/xml",
			"extends": "text/plain",
			name: "XML",
			extension: ["xml"],
			image: "../images/xmlfile.png"
		},
		{	id: "text/x-java-source",
			"extends": "text/plain",
			name: "Java",
			extension: ["java"]
		},
		{	id: "text/x-markdown",
			"extends": "text/plain",
			name: "Markdown",
			extension: ["md"]
		},
		{	id: "text/x-yaml",
			"extends": "text/plain",
			name: "YAML",
			extension: ["yaml", "yml"]
		},
		{	id: "text/conf",
			"extends": "text/plain",
			name: "Conf",
			extension: ["conf"]
		},
		{	id: "text/sh",
			"extends": "text/plain",
			name: "sh",
			extension: ["sh"]
		},
		// Image types
		{	id: "image/gif",
			name: "GIF",
			extension: ["gif"],
			image: "../images/wtp/image.gif"
		},
		{	id: "image/jpeg",
			name: "JPG",
			extension: ["jpg", "jpeg", "jpe"],
			image: "../images/wtp/image.gif"
		},
		{	id: "image/ico",
			name: "ICO",
			extension: ["ico"],
			image: "../images/wtp/image.gif"
		},
		{	id: "image/png",
			name: "PNG",
			extension: ["png"],
			image: "../images/wtp/image.gif"
		},
		{	id: "image/tiff",
			name: "TIFF",
			extension: ["tif", "tiff"],
			image: "../images/wtp/image.gif"
		},
		{	id: "image/svg",
			name: "SVG",
			extension: ["svg"],
			image: "../images/wtp/image.gif"
		}];
	var reg = new mServiceRegistry.ServiceRegistry();
	reg.registerService("orion.core.contenttype", {}, {
		contentTypes: cTypes
	});
	new mContentTypes.ContentTypeRegistry(reg);
	var fileClient = new mMockFileClient.MockFileClient(mockData);

/******  comapre searchResult  ******/
	function assertSearchReresultEqual(expected, actual){ 
		var a = actual, b = expected;
		if (!a || !b) {
			return assert.equal(a, b);
		}
		assert.equal(a.response.numFound, b.response.numFound, "number match");
		assert.equal(a.response.docs.length, b.response.docs.length, "doc number match");
		for(var i = 0; i < a.response.docs.length; i++) {
			assert.equal(a.response.docs[i].Location, b.response.docs[i].Location, "Doc location match " + i);
			assert.equal(a.response.docs[i].Name, b.response.docs[i].Name, "Doc name match " + i);
		}
	}
	
	function _searchAndCompare(crawler, expected) {
		var d  = new Deferred();
		crawler.search(function(searchResult, incremental){
				if(!incremental){
					try {
						assertSearchReresultEqual(expected,	searchResult);
						d.resolve();
					} catch (e){
						d.reject(e);
					}
				}
			});
		return d;
	}

	function _cancellAndCompare(crawler, cancelNumber, expected) {
		var d  = new Deferred();
		crawler.search(function(searchResult, incremental){
				if(!incremental){
					try {
						assertSearchReresultEqual(expected,	searchResult);
						d.resolve();
					} catch (e){
						d.reject(e);
					}
				} else {
					if(crawler._hitCounter === cancelNumber){
						crawler._cancelFileContentsSearch();
					}
				}
			});
		return d;
	}

	function _searchNameAndCompare(crawler, searchParam, expected) {
		var d  = new Deferred();
		crawler.buildSkeleton(function() {}, //Doing nothing for onBegin
			function(){
				crawler.searchName(searchParam, function(searchResult){
					try {
						assertSearchReresultEqual(expected,	searchResult);
						d.resolve();
					} catch (e){
						d.reject(e);
					}
				});
			});
		return d;
	}

	
/******  Start the real tests  ******/
	var tests = {};
	
	//Testing file contents search
	tests.test_NormalAll = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 7,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					},
					{
						Location: "f2",
						Name: "f2.js"
					},
					{
						Location: "f3_1",
						Name: "f3_1.css"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	//This test case covers all the cases when soring on the folder
	//If the same folder appears to two files, then we sort on file name
	//Folder equals to Location's substring after tailing out the file name
	//We can not purely sort on Location because "Location" includes the file name at the tail.
	//E.g. "DDD/f1_2_1.css" will be lined up after "DDD/AAA/f1_2_2.html" if we do so.
	tests.test_NormalAllSortByPath = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, new mMockFileClient.MockFileClient(mockDataForPathSort), {
			resource: "root",
			sort: "Path asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 8,
				docs: [
					{
						Location: "AAA/f3_1.css",//Same folder but different files
						Name: "f3_1.css"
					},
					{
						Location: "AAA/f3_2.html",//Same folder but different files
						Name: "f3_2.html"
					},
					{
						Location: "BBB/f2.js",
						Name: "f2.js"
					},
					{
						Location: "CCC/f1_3.js",
						Name: "f1_3.js"
					},
					{
						Location: "DDD/f1_2_1.css",//The full location is bigger in order but the parent path(DDD) is smaller comapring to (DDD/AAA)
						Name: "f1_2_1.css"
					},
					{
						Location: "DDD/AAA/f1_2_2.html",//Same folder but different files
						Name: "f1_2_2.html"
					},
					{
						Location: "DDD/AAA/f1_2_4.txt",//Same folder but different files
						Name: "f1_2_4.txt"
					},
					{
						Location: "EEE/f1_1.js",
						Name: "f1_1.js"
					}
				]
			}
		});
	};

	tests.test_NormalD1SortByPath = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, new mMockFileClient.MockFileClient(mockDataForPathSort), {
			resource: "d1",
			sort: "Path asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "d1"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 5,
				docs: [
					{
						Location: "CCC/f1_3.js",
						Name: "f1_3.js"
					},
					{
						Location: "DDD/f1_2_1.css",//The full location is bigger in order but the parent path(DDD) is smaller comapring to (DDD/AAA)
						Name: "f1_2_1.css"
					},
					{
						Location: "DDD/AAA/f1_2_2.html",//Same folder but different files
						Name: "f1_2_2.html"
					},
					{
						Location: "DDD/AAA/f1_2_4.txt",//Same folder but different files
						Name: "f1_2_4.txt"
					},
					{
						Location: "EEE/f1_1.js",
						Name: "f1_1.js"
					}
				]
			}
		});
	};

	tests.test_NormalD1SortByName = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, new mMockFileClient.MockFileClient(mockDataForPathSort), {
			resource: "d1",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "d1"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 5,
				docs: [
					{
						Location: "EEE/f1_1.js",
						Name: "f1_1.js"
					},
					{
						Location: "DDD/f1_2_1.css",//The full location is bigger in order but the parent path(DDD) is smaller comapring to (DDD/AAA)
						Name: "f1_2_1.css"
					},
					{
						Location: "DDD/AAA/f1_2_2.html",//Same folder but different files
						Name: "f1_2_2.html"
					},
					{
						Location: "DDD/AAA/f1_2_4.txt",//Same folder but different files
						Name: "f1_2_4.txt"
					},
					{
						Location: "CCC/f1_3.js",
						Name: "f1_3.js"
					}
				]
			}
		});
	};

	tests.test_NormalD3SortByPath = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, new mMockFileClient.MockFileClient(mockDataForPathSort), {
			resource: "d3",
			sort: "Path asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "d3"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 2,
				docs: [
					{
						Location: "AAA/f3_1.css",//Same folder but different files
						Name: "f3_1.css"
					},
					{
						Location: "AAA/f3_2.html",//Same folder but different files
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	tests.test_NormalCancel = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "root", reportOnCancel: true});
		//There is time racing issue: if deferred.resolve is faster than deferred.cancel, then we need to tell the crawler teh mode is simulating.
		return _cancellAndCompare(crawler, 3, {
			response: {
				numFound: 3,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					},
					{
						Location: "f2",
						Name: "f2.js"
					}
				]
			}
		});
	};

	tests.test_NormalAllCss = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			fileNamePatterns: ["*.css"],
			keyword: "EveryWhere"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 2,
				docs: [
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f3_1",
						Name: "f3_1.css"
					}
				]
			}
		});
	};

	tests.test_NormalCaseSensitive = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: true,
			regEx: false,
			keyword: "Case Sensitive"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 5,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f2",
						Name: "f2.js"
					},
					{
						Location: "f3_1",
						Name: "f3_1.css"
					}
				]
			}
		});
	};

	tests.test_NormalSubTree = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "d1",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "d1"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 4,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					}
				]
			}
		});
	};

	tests.test_NormalSubTree_1 = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "d1_2",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "EveryWhere"
		},
		{location: "d1_2"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 2,
				docs: [
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					}								]
			}
		});
	};

	tests.test_RegExAllJS = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: true,
			fileNamePatterns: ["*.js"],
			keyword: "Ev.*here"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 3,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					},
					{
						Location: "f2",
						Name: "f2.js"
					}
				]
			}
		});
	};

	tests.test_RegExAllCaseSensitive = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: true,
			regEx: true,
			keyword: "Ev.*Where"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 4,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f2",
						Name: "f2.js"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	tests.test_NormalPartial = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "artia"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 3,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f3_1",
						Name: "f3_1.css"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	tests.test_NormalnoHit = function() {
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, {
			resource: "root",
			sort: "NameLower asc", //$NON-NLS-0$
			rows: 40,
			start: 0,
			caseSensitive: false,
			regEx: false,
			keyword: "NothingAtAll"
		},
		{location: "root"});
		return _searchAndCompare(crawler, {
			response: {
				numFound: 0,
				docs: [
				]
			}
		});
	};


	//Testing file name search
	tests.testName_All = function() {
		var searchParam = {
			resource: "root",
			keyword: "f"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 10,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f1_2_3",
						Name: "f1_2_3.png"
					},
					{
						Location: "f1_2_4",
						Name: "f1_2_4.txt"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					},
					{
						Location: "f2",
						Name: "f2.js"
					},
					{
						Location: "f3_1",
						Name: "f3_1.css"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					},
					{
						Location: "f3_3",
						Name: "f3_3.conf"
					}
				]
			}
		});
	};

	tests.testName_F1_2 = function() {
		var searchParam = {
			resource: "root",
			keyword: "f1_2*"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 4,
				docs: [
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f1_2_3",
						Name: "f1_2_3.png"
					},
					{
						Location: "f1_2_4",
						Name: "f1_2_4.txt"
					}
				]
			}
		});
	};

	tests.testName_LeadingWildCard = function() {
		var searchParam = {
			resource: "root",
			keyword: "*_2"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 5,
				docs: [
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f1_2_3",
						Name: "f1_2_3.png"
					},
					{
						Location: "f1_2_4",
						Name: "f1_2_4.txt"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	tests.testName_LeadingWildCardHTML = function() {
		var searchParam = {
			resource: "root",
			keyword: "*_2*.HtMl"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 2,
				docs: [
					{
						Location: "f1_2_2",
						Name: "f1_2_2.html"
					},
					{
						Location: "f3_2",
						Name: "f3_2.html"
					}
				]
			}
		});
	};

	tests.testName_AllJS = function() {
		var searchParam = {
			resource: "root",
			keyword: "*.js"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 3,
				docs: [
					{
						Location: "f1_1",
						Name: "f1_1.js"
					},
					{
						Location: "f1_3",
						Name: "f1_3.js"
					},
					{
						Location: "f2",
						Name: "f2.js"
					}
				]
			}
		});
	};

	tests.testName_AllIncluding2AndS = function() {
		var searchParam = {
			resource: "root",
			keyword: "*2*.*s*"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 2,
				docs: [
					{
						Location: "f1_2_1",
						Name: "f1_2_1.css"
					},
					{
						Location: "f2",
						Name: "f2.js"
					}
				]
			}
		});
	};

	tests.testName_NoHit = function() {
		var searchParam = {
			resource: "root",
			keyword: "*.nothing"
		};
		var crawler = new mSearchCrawler.SearchCrawler(reg, fileClient, searchParam, {location: "root", buildSkeletonOnly: true});
		return _searchNameAndCompare(crawler, searchParam, {
			response: {
				numFound: 0,
				docs: [
				]
			}
		});
	};

	return tests;
});
