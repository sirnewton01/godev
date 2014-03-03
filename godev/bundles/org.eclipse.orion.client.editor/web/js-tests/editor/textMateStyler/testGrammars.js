/******************************************************************************* 
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation 
 ******************************************************************************/

/*global define*/
define([], function() {

var exports =  {};

exports.SampleGrammar = {
	"comment": "Dummy grammar for testing",
	//"name": "My great language",
	"fileTypes": [ "foo", "bar" ],
	"scopeName": "source.mylang",
	"uuid": "BA5758BD-B671-40BF-F234-22AF369537E8",
	"patterns": [
			{
				"match": "\\b(break|if|continue|do|for|return|switch|throw|while)\\b",
				"name": "keyword.control.mylang"
			},
			{
				"match": "\\b(this|var|void)\\b",
				"name": "keyword.other.mylang"
			}, {
				"match": "(\")[^\"]+(\")",
				"name": "constant.character.mylang"
			}, {
				"match": "\\b(?:\\d+)\\b",
				"name": "constant.numeric.mylang"
			}, {
				"match": "(&&|\\|\\|)",
				"name": "keyword.operator.logical.mylang"
			}, {
				"match": "\\b(null|true|false)\\b",
				"name": "constant.language.mylang"
			}, {
				// for testing include
				"include": "#badZ"
			} ],
	"repository": {
		"badZ": {
			"match": "z",
			"name": "invalid.illegal.idontlikez.mylang"
		}
	}
};

// A grammar that uses begin/end rules
exports.SampleBeginEndGrammar = {
	"comment": "Dummy grammar for testing",
//	"name": "My great language",
	"fileTypes": [ "foo", "bar" ],
//	"scopeName": "source.mylang",
	"uuid": "BA5758BD-B671-40BF-F234-22AF369537E8",
	"patterns": [
			{
				// SGML-style comments for testing begin/end
				"begin": "<!--",
				"end": "-->",
				"contentName": "comment.block.mylang",
				"beginCaptures": {
					"0": { "name": "punctuation.definition.comment.mylang" }
				},
				"endCaptures": {
					"0": { "name" : "punctuation.definition.comment.mylang" }
				},
				"patterns": [
					{
						// Nested begin/end rule
						"begin": "\\[",
						"end": "\\]",
						"beginCaptures": {
							"0": { "name": "meta.brace.square.open.mylang" }
						},
						"endCaptures": {
							"0": { "name": "meta.brace.square.close.mylang" }
						},
						"contentName": "meta.insquare.mylang",
						"patterns": [
							{
								"match": "\\s+",
								"name": "invalid.illegal.whitespace.mylang"
							}
						]
					},
					{
						"match": "--",
						"name": "invalid.illegal.badcomment.mylang"
					}
				]
			},
			{
				"match": "char|int",
				"name": "storage.type.mylang"
			} ]
};

exports.BackrefTestGrammar = {
	"comment": "For testing begin/end backrefs",
//	"name": "My begin/end test language",
	"fileTypes": [ "fizz", "buzz" ],
//	"scopeName": "source.blah",
	"uuid": "FC0F03C8-96FC-9B8A-2F35A13126FEB2F1",
	"patterns": [
			{
				// BBCode-esque [foo][/foo]
				"begin": "\\[((?:\\w|\\.)+)\\]", // the "tag" is any number of word or period characters
				"end": "\\[/\\1\\]", // backreferences group 1 of "begin"
				"contentName": "entity.name.tag.blah",
				"beginCaptures": {
					"0": { "name": "punctuation.definition.tag.blah" }
				},
				"endCaptures": {
					"0": { "name" : "punctuation.definition.tag.blah" }
				}/*,
				"patterns": [
					{
						// TODO put some nested rules in here
					}
				]*/
			}]
};

// A JSON-like grammar
exports.RecursiveIncludeGrammar = {
		//"name": "RecursiveIncludeGrammar",
		"patterns": [
				{	"include": "#value"
				}],
		"repository": {
			"value": {
				"patterns": [
					{	"include": "#array"
					},
					{	"include": "#string"
					}]
			},
			"array": {
				"begin": "\\[",
				"end": "\\]",
				"beginCaptures": { "0": { "name": "punctuation.definition.array.begin"} },
				"endCaptures": { "0": { "name": "punctuation.definition.array.end"} },
				"patterns": [
					{	"include": "#value"
					},
					{	"match": ",",
						"name": "punctuation.array.separator"
					}
				]
			},
			"string": {
				"begin": "\"",
				"end": "\"",
				"contentName": "string.quoted.double",
				"captures": {
					"0": { "name": "punctuation.definition.string.delimiter" }
				}
			}
		}
	};
	
// A grammar that assigns scope to regex matching groups other than "0"
exports.ComplexCaptures = {
	"patterns": [
		{	"include": "#tag" },
		{	"match": "(function)\\s*(\\([^)]*?\\))",
			"captures": {
				"1": { "name": "keyword.function"},
				"2": { "name": "meta.arglist.function"}
			}
		},
		{	"match": "x+(a+)x+(b+)",
			"captures": {
				"1": { "name": "meta.a" },
				"2": { "name": "keyword.b" }
			}
		}
	],
	"repository": {
		"tag": {
			"begin": "(\\[)(\\w+)(\\])",        // (lsquare)(tagname)(rsquare)
			"end": "(\\[)/(\\2)(\\])",          // (lsquare)slash(tagname)(rsquare)
			"beginCaptures": {
				"1": { "name": "punctuation.definition.tag.opener" },
				"2": { "name": "entity.tag.open.name" },
				"3": { "name": "punctuation.definition.tag.closer" }
			},
			"endCaptures": {
				"1": { "name": "punctuation.definition.tag.opener" },
				"2": { "name": "entity.tag.close.name" },
				"3": { "name": "punctuation.definition.tag.closer" }
			},
			"patterns": [
				{"include": "#tag"} // tags inside tags
			]
		}
	}
};

// Refers to ExternalGrammar2
exports.ExternalGrammar1 = {
	"patterns": [
		{	"match": "<b>|</b>",
			"captures": {
				"0": { "name": "tag.bold" }
			}
		},
		{	"begin": "<\\?php",
			"end": "\\?>",
			"captures": {
				"0": { "name": "tag.fakephp" }
			},
			"patterns": [
				{	"include": "source.fakephp"
				}
			]
		}
	]
};

exports.ExternalGrammar2 = {
	"scopeName": "source.fakephp",
	"patterns": [
		{	"match": "\\$\\w+",
			"captures": {
				"0": { "name": "variable" }
			}
		}
	]
};

/* TODO add to the constant.character.mylang rule once we support "captures":

				"captures": {
					"1": {
						"name": "punctuation.definition.constant.mylang"
					},
					"2": {
						"name": "punctuation.definition.constant.mylang"
					}
				}
*/

	return exports;
});