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
/*jslint amd:true*/
/*global describe:true it:true console */
define([
	"chai/chai",
	"esprima",
	'estraverse',
	'orion/util',
	'mocha/mocha'  //must stay last, not a module
], function(chai, Esprima, Estraverse, Util) {
	var assert = chai.assert;

	describe('Esprima Tolerant Parsing Tests', function() {
		//////////////////////////////////////////////////////////
		// Helpers
		//////////////////////////////////////////////////////////
		function parseFull(contents) {
			// esprima ~1.1.0 always sets 'raw' field on Literal nodes. Esprima ~1.0.0 only does so if
			// 'raw' flag passed. To ensure identical AST shape across versions, set the flag.
			return Esprima.parse(contents, {
				range: true,
				tolerant: true,
				comment: true,
				tokens: true,
				attachComment:true
			});
		}
		/**
		 * @description Write out the 'nodes', 'tokens' annd 'errors' arrays for a given AST.
		 * Add this code to the AST managers' getAST() function to produce the test data from a target workspace
		 * @param {Object} ast The AST
		 */
		function writeTestData(ast) {
			var i = 0;
			console.log('--- TEST OUTPUT ---');
			var expected = [];
			Estraverse.traverse(ast, {
				/** override */
				enter: function(node) {
					if(node.type === 'Program') {
						return;
					}
					var n = {};
					n.type = node.type;
					if (node.name) {
						n.name = node.name;
					}
					if (node.kind) {
						n.kind = node.kind;
					}
					if (node.range) {
						n.range = node.range;
					}
					if (node.value && typeof node.value !== 'object') {
						n.value = node.value;
					}
					expected.push(n);
				}
			});
			var s = 'nodes: ';
			s += JSON.stringify(expected);
			s += ',\n\t\t\t\ttokens: ';
			expected = [];
			for(i = 0; i < ast.tokens.length; i++) {
				var n = {};
				var token = ast.tokens[i];
				n.type = token.type;
				n.range = token.range;
				n.value = token.value;
				expected.push(n);
			}
			s += JSON.stringify(expected);
			s += ',\n\t\t\t\terrors: ';
			expected = [];
			for(i = 0; i < ast.errors.length; i++) {
				var error = ast.errors[i];
				expected.push({
					lineNumber : error.lineNumber,
					index : error.index,
					message : error.message,
					token : error.token
				});
			}
			s += JSON.stringify(expected);
			console.log(s);
		}
		
		/* */
		function pf(str /*, args*/) {
			var args = Array.prototype.slice.call(arguments, 1);
			var i=0;
			return str.replace(/%s/g, function() {
				return String(args[i++]);
			});
		}
	
		/**
		 * @description Run a test
		 */
		function runTest(data) {
			assert.ok(data.source);
			var ast = parseFull(data.source);
	
			//Check tokens 
			var expectedTokens = data.tokens, actualTokens = ast.tokens;
			if(expectedTokens) {
				assert(actualTokens, 'The AST should contain the tokens');
				var len = actualTokens.length;
				assert.equal(len, expectedTokens.length, 'Token streams are not the same');
				for(var i = 0; i < len; i++) {
					assert.equal(actualTokens[i].type, expectedTokens[i].type, 'Unexpected token found in stream: ');
					assert.equal(actualTokens[i].value, expectedTokens[i].value, 'Unexpected token value found in stream');
				}
			}
			// Check the nodes
			var expectedNodes = data.nodes && data.nodes.slice(0);
			if(expectedNodes) {
				assert(ast, 'The AST should exist');
				var counter = 0;
				Estraverse.traverse(ast, {
					/** override */
					enter: function(node) {
						if(node.type !== 'Program') {
							assert(counter < expectedNodes.length, 'There are more nodes to visit: '+ JSON.stringify(node));
							var expected = expectedNodes[counter];
							assert.equal(node.type, expected.type, 'The node types differ');
							assert(expected.range, 'The expected '+node.type+' node has no range');
							assert.equal(node.range[0], expected.range[0], 'The '+node.type+' node starts differ');
							assert.equal(node.range[1], expected.range[1], 'The '+node.type+' node ends differ');
							if (expected.name) {
								assert.equal(node.name, expected.name, 'The names differ');
							}
							if (expected.kind) {
								assert.equal(node.kind, expected.kind, 'The kinds differ');
							}
							if (expected.value && typeof expected.value !== "object") {
								assert.equal(node.value, expected.value, 'The values differ');
							}
							counter++;
						}
					}
				});
				//assert(expectedNodes.length === 0, 'We did not find all of the nodes');
				assert(counter === expectedNodes.length, 'We did not find all of the nodes');
			}
			// Check errors
			var expectedErrors = data.errors, actualErrors = ast.errors;
			if (expectedErrors) {
				expectedErrors = Array.isArray(expectedErrors) ? expectedErrors : [expectedErrors];
				assert.equal(actualErrors.length, expectedErrors.length, "Incorrect number of errors");
				expectedErrors.forEach(function(expected, i) {
					var actual = actualErrors[i];
					var formatStr = "Error #%s has correct %s";
					if (typeof expected.token === "string") {
						assert.equal(actual.token, expected.token, pf(formatStr, i, "token"));
					}
					if (typeof expected.index === "number") {
						assert.equal(actual.index, expected.index, pf(formatStr, i, "index"));
					}
					if (typeof expected.lineNumber === "number") {
						assert.equal(actual.lineNumber, expected.lineNumber, pf("Error %s has incorrect %s", i, "lineNumber"));
					}
					assert.equal(actual.message.replace(/^Line [0-9]*: /, ""), expected.message, pf("Error %s has incorrect %s", i, "message"));
				});
			}
		}
	
		//////////////////////////////////////////////////////////
		// Tests
		//////////////////////////////////////////////////////////
		it('parser should work when called several times', function() {
			var ast = Esprima.parse("var a", { tolerant: false });
			assert.equal(ast.type, "Program");
			Esprima.parse("var a", { tolerant: false });
			assert.equal(ast.type, "Program");
		});

		it('recovery basic parse', function() {
			var data = { 
				source: "foo.bar",
				errors: [],
				nodes:[{type:"ExpressionStatement",range:[0,7]},{type:"MemberExpression",range:[0,7]},{type:"Identifier",name:"foo",range:[0,3]},{type:"Identifier",name:"bar",range:[4,7]}]
			};
			runTest(data);
		});
		it('recovery - dot followed by EOF', function() {
			var data = { 
				source: "foo.",
				errors: [{ index: 4, lineNumber: 1, message: "Unexpected end of input" }],
				nodes: [{type:"ExpressionStatement",range:[0,4]},{type:"MemberExpression",range:[0,4]},{type:"Identifier",name:"foo",range:[0,3]}]
			};
			runTest(data);
		});
		it('Function args 2', function() {
			var data = { 
				source: "var ttt, uuu;\nttt(ttt, /**/)",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,13]},{"type":"VariableDeclarator","range":[4,7]},{"type":"Identifier","name":"ttt","range":[4,7]},{"type":"VariableDeclarator","range":[9,12]},{"type":"Identifier","name":"uuu","range":[9,12]},{"type":"ExpressionStatement","range":[14,28]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,7],"value":"ttt"},{"type":"Punctuator","range":[7,8],"value":","},{"type":"Identifier","range":[9,12],"value":"uuu"},{"type":"Punctuator","range":[12,13],"value":";"},{"type":"Identifier","range":[14,17],"value":"ttt"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Identifier","range":[18,21],"value":"ttt"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Punctuator","range":[27,28],"value":")"}],
				errors: [{"lineNumber":2,"index":27,"message":"Unexpected token )","token":")"}]
			};
			runTest(data);
		});
		it('Function args 3', function() {
			var data = { 
				source: "var ttt, uuu;\nttt(ttt, /**/, uuu)",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,13]},{"type":"VariableDeclarator","range":[4,7]},{"type":"Identifier","name":"ttt","range":[4,7]},{"type":"VariableDeclarator","range":[9,12]},{"type":"Identifier","name":"uuu","range":[9,12]},{"type":"ExpressionStatement","range":[14,29]},{"type":"ExpressionStatement","range":[29,32]},{"type":"Identifier","name":"uuu","range":[29,32]},{"type":"ExpressionStatement","range":[32,33]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,7],"value":"ttt"},{"type":"Punctuator","range":[7,8],"value":","},{"type":"Identifier","range":[9,12],"value":"uuu"},{"type":"Punctuator","range":[12,13],"value":";"},{"type":"Identifier","range":[14,17],"value":"ttt"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Identifier","range":[18,21],"value":"ttt"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Punctuator","range":[27,28],"value":","},{"type":"Identifier","range":[29,32],"value":"uuu"},{"type":"Punctuator","range":[32,33],"value":")"}],
				errors: [{"lineNumber":2,"index":27,"message":"Unexpected token ,","token":","},{"lineNumber":2,"index":29,"message":"Unexpected identifier","token":"uuu"},{"lineNumber":2,"index":32,"message":"Unexpected token )","token":")"}]
			};
			runTest(data);
		});
		it('broken after dot 1', function() {
			var data = { 
				source: "var ttt = { ooo:8};\nttt.",
				errors: [{ index: 24, message: "Unexpected end of input" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,19]},{type:"VariableDeclarator",range:[4,18]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,18]},{type:"Property",kind:"init",range:[12,17],value:{type:"Literal",value:8,range:[16,17]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"Literal",range:[16,17],value:8},{type:"ExpressionStatement",range:[20,24]},{type:"MemberExpression",range:[20,24]},{type:"Identifier",name:"ttt",range:[20,23]}]
			};
			runTest(data);
		});
		it('broken after dot 2', function() {
			var data = { 
				source: "var ttt = { ooo:8};\nif (ttt.) { ttt }",
				errors: [{ index: 28, message: "Unexpected token )", token: ")" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,19]},{type:"VariableDeclarator",range:[4,18]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,18]},{type:"Property",kind:"init",range:[12,17],value:{type:"Literal",value:8,range:[16,17]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"Literal",range:[16,17],value:8},{type:"IfStatement",range:[20,37]},{type:"MemberExpression",range:[24,28]},{type:"Identifier",name:"ttt",range:[24,27]},{type:"BlockStatement",range:[30,37]},{type:"ExpressionStatement",range:[32,36]},{type:"Identifier",name:"ttt",range:[32,35]}]
			};
			runTest(data);
		});
		it('broken after dot 3', function() {
			var data = { 
				source: "var ttt = { ooo:this.};",
				errors: [{ index: 21, message: "Unexpected token }", token: "}" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,23]},{type:"VariableDeclarator",range:[4,22]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,22]},{type:"Property",kind:"init",range:[12,21],value:{type:"MemberExpression",computed:false,object:{type:"ThisExpression",range:[16,20]},property:null,range:[16,21]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"MemberExpression",range:[16,21]},{type:"ThisExpression",range:[16,20]}]
			};
			runTest(data);
		});
		it('broken after dot 3a', function() {
			var data = { 
				source: "var ttt = { ooo:this./**/};",
				errors: [{ index: 25, message: "Unexpected token }", token: "}" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,27]},{type:"VariableDeclarator",range:[4,26]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,26]},{type:"Property",kind:"init",range:[12,21],value:{type:"MemberExpression",computed:false,object:{type:"ThisExpression",range:[16,20]},property:null,range:[16,21]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"MemberExpression",range:[16,21]},{type:"ThisExpression",range:[16,20]}]
			};
			runTest(data);
		});
		it('broken after dot 4', function() {
			var data = { 
				source: "var ttt = { ooo:8};\nfunction ff() { \nttt.}",
				errors: [{ index: 41, message: "Unexpected token }", token: "}" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,19]},{type:"VariableDeclarator",range:[4,18]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,18]},{type:"Property",kind:"init",range:[12,17],value:{type:"Literal",value:8,range:[16,17]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"Literal",range:[16,17],value:8},{type:"FunctionDeclaration",range:[20,42]},{type:"Identifier",name:"ff",range:[29,31]},{type:"BlockStatement",range:[34,42]},{type:"ExpressionStatement",range:[37,41]},{type:"MemberExpression",range:[37,41]},{type:"Identifier",name:"ttt",range:[37,40]}]
			};
			runTest(data);
		});
		it('broken after dot 4a', function() {
			var data = { 
				source: "var ttt = { ooo:8};\nfunction ff() { \nttt./**/}",
				errors: [{ index: 45, message: "Unexpected token }", token: "}" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,19]},{type:"VariableDeclarator",range:[4,18]},{type:"Identifier",name:"ttt",range:[4,7]},{type:"ObjectExpression",range:[10,18]},{type:"Property",kind:"init",range:[12,17],value:{type:"Literal",value:8,range:[16,17]}},{type:"Identifier",name:"ooo",range:[12,15]},{type:"Literal",range:[16,17],value:8},{type:"FunctionDeclaration",range:[20,46]},{type:"Identifier",name:"ff",range:[29,31]},{type:"BlockStatement",range:[34,46]},{type:"ExpressionStatement",range:[37,45]},{type:"MemberExpression",range:[37,41]},{type:"Identifier",name:"ttt",range:[37,40]}]
			};
			runTest(data);
		});
		it('broken after dot 5', function() {
			var data = { 
				source: "var first = {ooo:9};\nfirst.\nvar jjj;",
				errors: [{ index: 32, message: "Unexpected identifier", token: "jjj" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,20]},{type:"VariableDeclarator",range:[4,19]},{type:"Identifier",name:"first",range:[4,9]},{type:"ObjectExpression",range:[12,19]},{type:"Property",kind:"init",range:[13,18],value:{type:"Literal",value:9,range:[17,18]}},{type:"Identifier",name:"ooo",range:[13,16]},{type:"Literal",range:[17,18],value:9},{type:"ExpressionStatement",range:[21,27]},{type:"MemberExpression",range:[21,31]},{type:"Identifier",name:"first",range:[21,26]},{type:"Identifier",name:"var",range:[28,31]},{type:"VariableDeclaration",kind:"var",range:[28,36]},{type:"VariableDeclarator",range:[32,35]},{type:"Identifier",name:"jjj",range:[32,35]}]
			};
			runTest(data);
		});
		it('broken after dot 6', function() {
			var data = { 
				source: "var first = {ooo:9};\nfirst.\nif (x) { }",
				errors: [{ index: 35, message: "Unexpected token {", token: "{" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,20]},{type:"VariableDeclarator",range:[4,19]},{type:"Identifier",name:"first",range:[4,9]},{type:"ObjectExpression",range:[12,19]},{type:"Property",kind:"init",range:[13,18],value:{type:"Literal",value:9,range:[17,18]}},{type:"Identifier",name:"ooo",range:[13,16]},{type:"Literal",range:[17,18],value:9},{type:"ExpressionStatement",range:[21,27]},{type:"CallExpression",range:[21,34]},{type:"MemberExpression",range:[21,30]},{type:"Identifier",name:"first",range:[21,26]},{type:"Identifier",name:"if",range:[28,30]},{type:"Identifier",name:"x",range:[32,33]},{type:"IfStatement",range:[28,38]},{type:"Identifier",name:"x",range:[32,33]},{type:"BlockStatement",range:[35,38]}]
			};
			runTest(data);
		});
		it('computed member expressions5', function() {
			var data = { 
				source: "var foo = { at: { bar: 0} };\nfoo[at.foo.bar].",
				errors: [{ lineNumber: 2, message: "Unexpected end of input" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,28]},{type:"VariableDeclarator",range:[4,27]},{type:"Identifier",name:"foo",range:[4,7]},{type:"ObjectExpression",range:[10,27]},{type:"Property",kind:"init",range:[12,25],value:{type:"ObjectExpression",properties:[{type:"Property",key:{type:"Identifier",name:"bar",range:[18,21]},value:{type:"Literal",value:0,range:[23,24]},kind:"init",range:[18,24]}],range:[16,25]}},{type:"Identifier",name:"at",range:[12,14]},{type:"ObjectExpression",range:[16,25]},{type:"Property",kind:"init",range:[18,24],value:{type:"Literal",value:0,range:[23,24]}},{type:"Identifier",name:"bar",range:[18,21]},{type:"Literal",range:[23,24]},{type:"ExpressionStatement",range:[29,45]},{type:"MemberExpression",range:[29,45]},{type:"MemberExpression",range:[29,44]},{type:"Identifier",name:"foo",range:[29,32]},{type:"MemberExpression",range:[33,43]},{type:"MemberExpression",range:[33,39]},{type:"Identifier",name:"at",range:[33,35]},{type:"Identifier",name:"foo",range:[36,39]},{type:"Identifier",name:"bar",range:[40,43]}]
			};
			runTest(data);
		});
		it('computed member expressions6', function() {
			var data = { 
				source: "var x = 0;\nvar foo = [];\nfoo[x./**/]",
				errors: [{ lineNumber: 3, message: "Unexpected token ]", token: "]" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,10]},{type:"VariableDeclarator",range:[4,9]},{type:"Identifier",name:"x",range:[4,5]},{type:"Literal",range:[8,9]},{type:"VariableDeclaration",kind:"var",range:[11,24]},{type:"VariableDeclarator",range:[15,23]},{type:"Identifier",name:"foo",range:[15,18]},{type:"ArrayExpression",range:[21,23]},{type:"ExpressionStatement",range:[25,36]},{type:"MemberExpression",range:[25,36]},{type:"Identifier",name:"foo",range:[25,28]},{type:"MemberExpression",range:[29,31]},{type:"Identifier",name:"x",range:[29,30]}]
			};
			runTest(data);
		});
		it('invalid member expression1', function() {
			var data = { 
				source: "x./**/\nvar x = {};\nx.fff = '';",
				errors: [{ lineNumber: 2, message: "Unexpected identifier", token: "x" }],
				nodes: [{type:"ExpressionStatement",range:[0,6]},{type:"MemberExpression",range:[0,10]},{type:"Identifier",name:"x",range:[0,1]},{type:"Identifier",name:"var",range:[7,10]},{type:"VariableDeclaration",kind:"var",range:[7,18]},{type:"VariableDeclarator",range:[11,17]},{type:"Identifier",name:"x",range:[11,12]},{type:"ObjectExpression",range:[15,17]},{type:"ExpressionStatement",range:[19,30]},{type:"AssignmentExpression",range:[19,29]},{type:"MemberExpression",range:[19,24]},{type:"Identifier",name:"x",range:[19,20]},{type:"Identifier",name:"fff",range:[21,24]},{type:"Literal",range:[27,29]}]
			};
			runTest(data);
		});
		it('invalid member expression2', function() {
			var data = { 
				source: "function a() {\nx.fff = '';\n}\nx./**/\nvar x = {}; ",
				errors: [{ lineNumber: 5, message: "Unexpected identifier", token: "x" }],
				nodes: [{type:"FunctionDeclaration",range:[0,28]},{type:"Identifier",name:"a",range:[9,10]},{type:"BlockStatement",range:[13,28]},{type:"ExpressionStatement",range:[15,26]},{type:"AssignmentExpression",range:[15,25]},{type:"MemberExpression",range:[15,20]},{type:"Identifier",name:"x",range:[15,16]},{type:"Identifier",name:"fff",range:[17,20]},{type:"Literal",range:[23,25]},{type:"ExpressionStatement",range:[29,35]},{type:"MemberExpression",range:[29,39]},{type:"Identifier",name:"x",range:[29,30]},{type:"Identifier",name:"var",range:[36,39]},{type:"VariableDeclaration",kind:"var",range:[36,47]},{type:"VariableDeclarator",range:[40,46]},{type:"Identifier",name:"x",range:[40,41]},{type:"ObjectExpression",range:[44,46]}]
			};
			runTest(data);
		});
		it('invalid member expression3', function() {
			var data = { 
				source: "x./**/\nfunction a() {\nx.fff = '';\n}\nvar x = {}; ",
				errors: [{ lineNumber: 2, message: "Unexpected identifier", token: "a" }],
				nodes: [{type:"ExpressionStatement",range:[0,6]},{type:"MemberExpression",range:[0,15]},{type:"Identifier",name:"x",range:[0,1]},{type:"Identifier",name:"function",range:[7,15]},{type:"FunctionDeclaration",range:[7,35]},{type:"Identifier",name:"a",range:[16,17]},{type:"BlockStatement",range:[20,35]},{type:"ExpressionStatement",range:[22,33]},{type:"AssignmentExpression",range:[22,32]},{type:"MemberExpression",range:[22,27]},{type:"Identifier",name:"x",range:[22,23]},{type:"Identifier",name:"fff",range:[24,27]},{type:"Literal",range:[30,32]},{type:"VariableDeclaration",kind:"var",range:[36,47]},{type:"VariableDeclarator",range:[40,46]},{type:"Identifier",name:"x",range:[40,41]},{type:"ObjectExpression",range:[44,46]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 1', function() {
			var data = { 
				source: "var xxxyyy = {};\nfunction foo() {\n    if (xx",
				errors: [{ lineNumber: 3, message: "Unexpected end of input" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,16]},{type:"VariableDeclarator",range:[4,15]},{type:"Identifier",name:"xxxyyy",range:[4,10]},{type:"ObjectExpression",range:[13,15]},{type:"FunctionDeclaration",range:[17,44]},{type:"Identifier",name:"foo",range:[26,29]},{type:"BlockStatement",range:[32,44]},{type:"IfStatement",range:[38,44]},{type:"Identifier",name:"xx",range:[42,44]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 2', function() {
			var data = { 
				source: "function foo() {\n    var xxxyyy = false;\n    if (!xx",
				errors: [{ lineNumber: 3, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,52]},{type:"Identifier",name:"foo",range:[9,12]},{type:"BlockStatement",range:[15,52]},{type:"VariableDeclaration",kind:"var",range:[21,40]},{type:"VariableDeclarator",range:[25,39]},{type:"Identifier",name:"xxxyyy",range:[25,31]},{type:"Literal",range:[34,39]},{type:"IfStatement",range:[45,52]},{type:"UnaryExpression",range:[49,52]},{type:"Identifier",name:"xx",range:[50,52]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 3', function() {
			var data = { 
				source: "function foo(xxxyyy) {\n    if (!xx",
				errors: [{ lineNumber: 2, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,34]},{type:"Identifier",name:"foo",range:[9,12]},{type:"Identifier",name:"xxxyyy",range:[13,19]},{type:"BlockStatement",range:[21,34]},{type:"IfStatement",range:[27,34]},{type:"UnaryExpression",range:[31,34]},{type:"Identifier",name:"xx",range:[32,34]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 4', function() {
			var data = { 
				source: "var x = { bazz: 3 };\nfunction foo() {\n    if (x.b",
				errors: [{ lineNumber: 3, message: "Unexpected end of input" }],
				nodes: [{type:"VariableDeclaration",kind:"var",range:[0,20]},{type:"VariableDeclarator",range:[4,19]},{type:"Identifier",name:"x",range:[4,5]},{type:"ObjectExpression",range:[8,19]},{type:"Property",kind:"init",range:[10,17],value:{type:"Literal",value:3,range:[16,17]}},{type:"Identifier",name:"bazz",range:[10,14]},{type:"Literal",range:[16,17],value:3},{type:"FunctionDeclaration",range:[21,49]},{type:"Identifier",name:"foo",range:[30,33]},{type:"BlockStatement",range:[36,49]},{type:"IfStatement",range:[42,49]},{type:"MemberExpression",range:[46,49]},{type:"Identifier",name:"x",range:[46,47]},{type:"Identifier",name:"b",range:[48,49]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 5', function() {
			var data = { 
				source: "function foo(p) {\n    p.ffffff = false;\n    while (p.ff",
				errors: [{ lineNumber: 3, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,55]},{type:"Identifier",name:"foo",range:[9,12]},{type:"Identifier",name:"p",range:[13,14]},{type:"BlockStatement",range:[16,55]},{type:"ExpressionStatement",range:[22,39]},{type:"AssignmentExpression",range:[22,38]},{type:"MemberExpression",range:[22,30]},{type:"Identifier",name:"p",range:[22,23]},{type:"Identifier",name:"ffffff",range:[24,30]},{type:"Literal",range:[33,38]},{type:"WhileStatement",range:[44,55]},{type:"MemberExpression",range:[51,55]},{type:"Identifier",name:"p",range:[51,52]},{type:"Identifier",name:"ff",range:[53,55]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 6', function() {
			var data = { 
				source: "function foo(p) {\n    p.ffffff = false;\n    if (p) {\n        while (p.ff",
				errors: [{ lineNumber: 4, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,72]},{type:"Identifier",name:"foo",range:[9,12]},{type:"Identifier",name:"p",range:[13,14]},{type:"BlockStatement",range:[16,72]},{type:"ExpressionStatement",range:[22,39]},{type:"AssignmentExpression",range:[22,38]},{type:"MemberExpression",range:[22,30]},{type:"Identifier",name:"p",range:[22,23]},{type:"Identifier",name:"ffffff",range:[24,30]},{type:"Literal",range:[33,38]},{type:"IfStatement",range:[44,72]},{type:"Identifier",name:"p",range:[48,49]},{type:"BlockStatement",range:[51,72]},{type:"WhileStatement",range:[61,72]},{type:"MemberExpression",range:[68,72]},{type:"Identifier",name:"p",range:[68,69]},{type:"Identifier",name:"ff",range:[70,72]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 7', function() {
			var data = { 
				source: "function foo(p) {\n    p.ffffff = false;\n    if (p) {\n        for (var q in p.ff",
				errors: [{ lineNumber: 4, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,79]},{type:"Identifier",name:"foo",range:[9,12]},{type:"Identifier",name:"p",range:[13,14]},{type:"BlockStatement",range:[16,79]},{type:"ExpressionStatement",range:[22,39]},{type:"AssignmentExpression",range:[22,38]},{type:"MemberExpression",range:[22,30]},{type:"Identifier",name:"p",range:[22,23]},{type:"Identifier",name:"ffffff",range:[24,30]},{type:"Literal",range:[33,38]},{type:"IfStatement",range:[44,79]},{type:"Identifier",name:"p",range:[48,49]},{type:"BlockStatement",range:[51,79]},{type:"ForInStatement",range:[61,79]},{type:"VariableDeclaration",kind:"var",range:[66,71]},{type:"VariableDeclarator",range:[70,71]},{type:"Identifier",name:"q",range:[70,71]},{type:"MemberExpression",range:[75,79]},{type:"Identifier",name:"p",range:[75,76]},{type:"Identifier",name:"ff",range:[77,79]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 8', function() {
			var data = { 
				source: "function foo(p) {\n    p.ffffff = false;\n    if (p) {\n        for (var q in p) {\n            while (p.ff",
				errors: [{ lineNumber: 5, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,103]},{type:"Identifier",name:"foo",range:[9,12]},{type:"Identifier",name:"p",range:[13,14]},{type:"BlockStatement",range:[16,103]},{type:"ExpressionStatement",range:[22,39]},{type:"AssignmentExpression",range:[22,38]},{type:"MemberExpression",range:[22,30]},{type:"Identifier",name:"p",range:[22,23]},{type:"Identifier",name:"ffffff",range:[24,30]},{type:"Literal",range:[33,38]},{type:"IfStatement",range:[44,103]},{type:"Identifier",name:"p",range:[48,49]},{type:"BlockStatement",range:[51,103]},{type:"ForInStatement",range:[61,103]},{type:"VariableDeclaration",kind:"var",range:[66,71]},{type:"VariableDeclarator",range:[70,71]},{type:"Identifier",name:"q",range:[70,71]},{type:"Identifier",name:"p",range:[75,76]},{type:"BlockStatement",range:[78,103]},{type:"WhileStatement",range:[92,103]},{type:"MemberExpression",range:[99,103]},{type:"Identifier",name:"p",range:[99,100]},{type:"Identifier",name:"ff",range:[101,103]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 9', function() {
			var data = { 
				source: "function f(s) {}\nf(JSON.str",
				errors: [{ lineNumber: 2, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,16]},{type:"Identifier",name:"f",range:[9,10]},{type:"Identifier",name:"s",range:[11,12]},{type:"BlockStatement",range:[14,16]},{type:"ExpressionStatement",range:[17,27]},{type:"CallExpression",range:[17,27]},{type:"Identifier",name:"f",range:[17,18]},{type:"MemberExpression",range:[19,27]},{type:"Identifier",name:"JSON",range:[19,23]},{type:"Identifier",name:"str",range:[24,27]}]
			};
			runTest(data);
		});
		it('tolerant parsing function 10', function() {
			var data = { 
				source: "function f(a,b) {}\nf(0,JSON.str",
				errors: [{ lineNumber: 2, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,18]},{type:"Identifier",name:"f",range:[9,10]},{type:"Identifier",name:"a",range:[11,12]},{type:"Identifier",name:"b",range:[13,14]},{type:"BlockStatement",range:[16,18]},{type:"ExpressionStatement",range:[19,31]},{type:"CallExpression",range:[19,31]},{type:"Identifier",name:"f",range:[19,20]},{type:"Literal",range:[21,22]},{type:"MemberExpression",range:[23,31]},{type:"Identifier",name:"JSON",range:[23,27]},{type:"Identifier",name:"str",range:[28,31]}]
			};
			runTest(data);
		});
		it('cycle 2', function() {
			var data = { 
				source: "function foo() {\nthis._init = function() { return this; }\nthis.cmd = function() {\nthis._in",
				errors: [{ lineNumber: 4, message: "Unexpected end of input" }],
				nodes: [{type:"FunctionDeclaration",range:[0,90]},{type:"Identifier",name:"foo",range:[9,12]},{type:"BlockStatement",range:[15,90]},{type:"ExpressionStatement",range:[17,58]},{type:"AssignmentExpression",range:[17,57]},{type:"MemberExpression",range:[17,27]},{type:"ThisExpression",range:[17,21]},{type:"Identifier",name:"_init",range:[22,27]},{type:"FunctionExpression",range:[30,57]},{type:"BlockStatement",range:[41,57]},{type:"ReturnStatement",range:[43,55]},{type:"ThisExpression",range:[50,54]},{type:"ExpressionStatement",range:[58,90]},{type:"AssignmentExpression",range:[58,90]},{type:"MemberExpression",range:[58,66]},{type:"ThisExpression",range:[58,62]},{type:"Identifier",name:"cmd",range:[63,66]},{type:"FunctionExpression",range:[69,90]},{type:"BlockStatement",range:[80,90]},{type:"ExpressionStatement",range:[82,90]},{type:"MemberExpression",range:[82,90]},{type:"ThisExpression",range:[82,86]},{type:"Identifier",name:"_in",range:[87,90]}]
			};
			runTest(data);
		});
		it('if missing ) 1', function() {
			var data = { 
				source: "if(foo ",
				nodes: [{"type":"IfStatement","range":[0,7]},{"type":"Identifier","name":"foo","range":[3,6]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"if"},{"type":"Punctuator","range":[2,3],"value":"("},{"type":"Identifier","range":[3,6],"value":"foo"}],
				errors: [{"lineNumber":1,"index":7,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('if missing ) 2', function() {
			var data = { 
				source: "if(foo {",
				nodes: [{"type":"IfStatement","range":[0,8]},{"type":"Identifier","name":"foo","range":[3,6]},{"type":"BlockStatement","range":[7,8]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"if"},{"type":"Punctuator","range":[2,3],"value":"("},{"type":"Identifier","range":[3,6],"value":"foo"},{"type":"Punctuator","range":[7,8],"value":"{"},{"type":"Punctuator","range":[7,8],"value":"{"}],
				errors: [{"lineNumber":1,"index":7,"message":"Unexpected token {","token":"{"},{"lineNumber":1,"index":8,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('if missing ) 3', function() {
			var data = { 
				source: "if(foo {}",
				nodes: [{"type":"IfStatement","range":[0,9]},{"type":"Identifier","name":"foo","range":[3,6]},{"type":"BlockStatement","range":[7,9]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"if"},{"type":"Punctuator","range":[2,3],"value":"("},{"type":"Identifier","range":[3,6],"value":"foo"},{"type":"Punctuator","range":[7,8],"value":"{"},{"type":"Punctuator","range":[8,9],"value":"}"},{"type":"Punctuator","range":[7,8],"value":"{"},{"type":"Punctuator","range":[8,9],"value":"}"}],
				errors: [{"lineNumber":1,"index":7,"message":"Unexpected token {","token":"{"}]
			};
			runTest(data);
		});
		it('if missing ) 4', function() {
			var data = { 
				source: "if(foo() {}",
				nodes: [{"type":"IfStatement","range":[0,11]},{"type":"CallExpression","range":[3,8]},{"type":"Identifier","name":"foo","range":[3,6]},{"type":"BlockStatement","range":[9,11]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"if"},{"type":"Punctuator","range":[2,3],"value":"("},{"type":"Identifier","range":[3,6],"value":"foo"},{"type":"Punctuator","range":[6,7],"value":"("},{"type":"Punctuator","range":[7,8],"value":")"},{"type":"Punctuator","range":[9,10],"value":"{"},{"type":"Punctuator","range":[10,11],"value":"}"},{"type":"Punctuator","range":[9,10],"value":"{"},{"type":"Punctuator","range":[10,11],"value":"}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token {","token":"{"}]
			};
			runTest(data);
		});
		it('while missing ) 1', function() {
			var data = { 
				source: "while(foo ",
				nodes: [{"type":"WhileStatement","range":[0,10]},{"type":"Identifier","name":"foo","range":[6,9]}],
				tokens: [{"type":"Keyword","range":[0,5],"value":"while"},{"type":"Punctuator","range":[5,6],"value":"("},{"type":"Identifier","range":[6,9],"value":"foo"}],
				errors: [{"lineNumber":1,"index":10,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('while missing ) 2', function() {
			var data = { 
				source: "while(foo {",
				nodes: [{"type":"WhileStatement","range":[0,11]},{"type":"Identifier","name":"foo","range":[6,9]},{"type":"BlockStatement","range":[10,11]}],
				tokens: [{"type":"Keyword","range":[0,5],"value":"while"},{"type":"Punctuator","range":[5,6],"value":"("},{"type":"Identifier","range":[6,9],"value":"foo"},{"type":"Punctuator","range":[10,11],"value":"{"},{"type":"Punctuator","range":[10,11],"value":"{"}],
				errors: [{"lineNumber":1,"index":10,"message":"Unexpected token {","token":"{"},{"lineNumber":1,"index":11,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('while missing ) 3', function() {
			var data = { 
				source: "while(foo {}",
				nodes: [{"type":"WhileStatement","range":[0,12]},{"type":"Identifier","name":"foo","range":[6,9]},{"type":"BlockStatement","range":[10,12]}],
				tokens: [{"type":"Keyword","range":[0,5],"value":"while"},{"type":"Punctuator","range":[5,6],"value":"("},{"type":"Identifier","range":[6,9],"value":"foo"},{"type":"Punctuator","range":[10,11],"value":"{"},{"type":"Punctuator","range":[11,12],"value":"}"},{"type":"Punctuator","range":[10,11],"value":"{"},{"type":"Punctuator","range":[11,12],"value":"}"}],
				errors: [{"lineNumber":1,"index":10,"message":"Unexpected token {","token":"{"}]
			};
			runTest(data);
		});
		it('while missing ) 4', function() {
			var data = { 
				source: "while(foo() {}",
				nodes: [{"type":"WhileStatement","range":[0,14]},{"type":"CallExpression","range":[6,11]},{"type":"Identifier","name":"foo","range":[6,9]},{"type":"BlockStatement","range":[12,14]}],
				tokens: [{"type":"Keyword","range":[0,5],"value":"while"},{"type":"Punctuator","range":[5,6],"value":"("},{"type":"Identifier","range":[6,9],"value":"foo"},{"type":"Punctuator","range":[9,10],"value":"("},{"type":"Punctuator","range":[10,11],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"}],
				errors: [{"lineNumber":1,"index":12,"message":"Unexpected token {","token":"{"}]
			};
			runTest(data);
		});
		it('for missing ) 1', function() {
			var data = { 
				source: "for(var foo = 1; foo < 2; foo++",
				nodes: [{"type":"ForStatement","range":[0,31]},{"type":"VariableDeclaration","kind":"var","range":[4,15]},{"type":"VariableDeclarator","range":[8,15]},{"type":"Identifier","name":"foo","range":[8,11]},{"type":"Literal","range":[14,15],"value":1},{"type":"BinaryExpression","range":[17,24]},{"type":"Identifier","name":"foo","range":[17,20]},{"type":"Literal","range":[23,24],"value":2},{"type":"UpdateExpression","range":[26,31]},{"type":"Identifier","name":"foo","range":[26,29]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"for"},{"type":"Punctuator","range":[3,4],"value":"("},{"type":"Keyword","range":[4,7],"value":"var"},{"type":"Identifier","range":[8,11],"value":"foo"},{"type":"Punctuator","range":[12,13],"value":"="},{"type":"Numeric","range":[14,15],"value":"1"},{"type":"Punctuator","range":[15,16],"value":";"},{"type":"Identifier","range":[17,20],"value":"foo"},{"type":"Punctuator","range":[21,22],"value":"<"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":";"},{"type":"Identifier","range":[26,29],"value":"foo"},{"type":"Punctuator","range":[29,31],"value":"++"}],
				errors: [{"lineNumber":1,"index":31,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('for missing ) 2', function() {
			var data = { 
				source: "for(var foo = 1; foo < 2; foo++ {",
				nodes: [{"type":"ForStatement","range":[0,33]},{"type":"VariableDeclaration","kind":"var","range":[4,15]},{"type":"VariableDeclarator","range":[8,15]},{"type":"Identifier","name":"foo","range":[8,11]},{"type":"Literal","range":[14,15],"value":1},{"type":"BinaryExpression","range":[17,24]},{"type":"Identifier","name":"foo","range":[17,20]},{"type":"Literal","range":[23,24],"value":2},{"type":"UpdateExpression","range":[26,31]},{"type":"Identifier","name":"foo","range":[26,29]},{"type":"BlockStatement","range":[32,33]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"for"},{"type":"Punctuator","range":[3,4],"value":"("},{"type":"Keyword","range":[4,7],"value":"var"},{"type":"Identifier","range":[8,11],"value":"foo"},{"type":"Punctuator","range":[12,13],"value":"="},{"type":"Numeric","range":[14,15],"value":"1"},{"type":"Punctuator","range":[15,16],"value":";"},{"type":"Identifier","range":[17,20],"value":"foo"},{"type":"Punctuator","range":[21,22],"value":"<"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":";"},{"type":"Identifier","range":[26,29],"value":"foo"},{"type":"Punctuator","range":[29,31],"value":"++"},{"type":"Punctuator","range":[32,33],"value":"{"},{"type":"Punctuator","range":[32,33],"value":"{"}],
				errors: [{"lineNumber":1,"index":32,"message":"Unexpected token {","token":"{"},{"lineNumber":1,"index":33,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('for missing ) 3', function() {
			var data = { 
				source: "for(var foo = 1; foo < 2; foo++ {}",
				nodes: [{"type":"ForStatement","range":[0,34]},{"type":"VariableDeclaration","kind":"var","range":[4,15]},{"type":"VariableDeclarator","range":[8,15]},{"type":"Identifier","name":"foo","range":[8,11]},{"type":"Literal","range":[14,15],"value":1},{"type":"BinaryExpression","range":[17,24]},{"type":"Identifier","name":"foo","range":[17,20]},{"type":"Literal","range":[23,24],"value":2},{"type":"UpdateExpression","range":[26,31]},{"type":"Identifier","name":"foo","range":[26,29]},{"type":"BlockStatement","range":[32,34]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"for"},{"type":"Punctuator","range":[3,4],"value":"("},{"type":"Keyword","range":[4,7],"value":"var"},{"type":"Identifier","range":[8,11],"value":"foo"},{"type":"Punctuator","range":[12,13],"value":"="},{"type":"Numeric","range":[14,15],"value":"1"},{"type":"Punctuator","range":[15,16],"value":";"},{"type":"Identifier","range":[17,20],"value":"foo"},{"type":"Punctuator","range":[21,22],"value":"<"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":";"},{"type":"Identifier","range":[26,29],"value":"foo"},{"type":"Punctuator","range":[29,31],"value":"++"},{"type":"Punctuator","range":[32,33],"value":"{"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[32,33],"value":"{"},{"type":"Punctuator","range":[33,34],"value":"}"}],
				errors: [{"lineNumber":1,"index":32,"message":"Unexpected token {","token":"{"}]
			};
			runTest(data);
		});
		it('do-while missing ) 1', function() {
			var data = { 
				source: "do {} while(foo",
				nodes: [{"type":"DoWhileStatement","range":[0,15]},{"type":"BlockStatement","range":[3,5]},{"type":"Identifier","name":"foo","range":[12,15]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"do"},{"type":"Punctuator","range":[3,4],"value":"{"},{"type":"Punctuator","range":[4,5],"value":"}"},{"type":"Keyword","range":[6,11],"value":"while"},{"type":"Punctuator","range":[11,12],"value":"("},{"type":"Identifier","range":[12,15],"value":"foo"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		it('do-while missing ) 2', function() {
			var data = { 
				source: "do {} while(foo {",
				nodes: [{"type":"DoWhileStatement","range":[0,16]},{"type":"BlockStatement","range":[3,5]},{"type":"Identifier","name":"foo","range":[12,15]},{"type":"BlockStatement","range":[16,17]}],
				tokens: [{"type":"Keyword","range":[0,2],"value":"do"},{"type":"Punctuator","range":[3,4],"value":"{"},{"type":"Punctuator","range":[4,5],"value":"}"},{"type":"Keyword","range":[6,11],"value":"while"},{"type":"Punctuator","range":[11,12],"value":"("},{"type":"Identifier","range":[12,15],"value":"foo"},{"type":"Punctuator","range":[16,17],"value":"{"},{"type":"Punctuator","range":[16,17],"value":"{"}],
				errors: [{"lineNumber":1,"index":16,"message":"Unexpected token {","token":"{"},{"lineNumber":1,"index":17,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		/**
		 *
		 * Object property recovery tests
		 * @since 6.0
		 */
		it('obj prop ident recovery - ident only', function() {
			var data = { 
				source: "var f = {a};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,12]},{"type":"VariableDeclarator","range":[4,11]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,11]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":"}"},{"type":"Punctuator","range":[11,12],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal ident only', function() {
			var data = { 
				source: "var f = {'a'};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,14]},{"type":"VariableDeclarator","range":[4,13]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,13]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Punctuator","range":[12,13],"value":"}"},{"type":"Punctuator","range":[13,14],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - ident only with postamble', function() {
			var data = { 
				source: "var f = {a/**/};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,16]},{"type":"VariableDeclarator","range":[4,15]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,15]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Punctuator","range":[15,16],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal ident only with postamble', function() {
			var data = { 
				source: "var f = {'a'/**/};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,18]},{"type":"VariableDeclarator","range":[4,17]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,17]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Punctuator","range":[16,17],"value":"}"},{"type":"Punctuator","range":[17,18],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('nested obj prop ident recovery - nested ident only', function() {
			var data = { 
				source: "var f = {one: {a}};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,19]},{"type":"VariableDeclarator","range":[4,18]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,18]},{"type":"Property","kind":"init","range":[9,17]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,17]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Punctuator","range":[16,17],"value":"}"},{"type":"Punctuator","range":[17,18],"value":"}"},{"type":"Punctuator","range":[18,19],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('nested obj prop ident recovery - nested literal ident only', function() {
			var data = { 
				source: "var f = {'one': {'a'}};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,23]},{"type":"VariableDeclarator","range":[4,22]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,22]},{"type":"Property","kind":"init","range":[9,21]},{"type":"Literal","range":[9,14],"value":"one"},{"type":"ObjectExpression","range":[16,21]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,14],"value":"'one'"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Punctuator","range":[16,17],"value":"{"},{"type":"String","range":[17,20],"value":"'a'"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":"}"},{"type":"Punctuator","range":[22,23],"value":";"}],
				errors: [{"lineNumber":1,"index":17,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 1', function() {
			var data = { 
				source: "var f = {a b:1};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,16]},{"type":"VariableDeclarator","range":[4,15]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,15]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Punctuator","range":[15,16],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 2', function() {
			var data = { 
				source: "var f = {a b:1,c:2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[15,18]},{"type":"Identifier","name":"c","range":[15,16]},{"type":"Literal","range":[17,18],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Punctuator","range":[14,15],"value":","},{"type":"Identifier","range":[15,16],"value":"c"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"2"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 3', function() {
			var data = { 
				source: "var f = {b:1,a};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,16]},{"type":"VariableDeclarator","range":[4,15]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,15]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"b","range":[9,10]},{"type":"Literal","range":[11,12],"value":1}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"b"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Punctuator","range":[12,13],"value":","},{"type":"Identifier","range":[13,14],"value":"a"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Punctuator","range":[15,16],"value":";"}],
				errors: [{"lineNumber":1,"index":13,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 4', function() {
			var data = { 
				source: "var f = {b:1,c:2,a};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"b","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[13,16]},{"type":"Identifier","name":"c","range":[13,14]},{"type":"Literal","range":[15,16],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"b"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Punctuator","range":[12,13],"value":","},{"type":"Identifier","range":[13,14],"value":"c"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"2"},{"type":"Punctuator","range":[16,17],"value":","},{"type":"Identifier","range":[17,18],"value":"a"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"}],
				errors: [{"lineNumber":1,"index":17,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 5', function() {
			var data = { 
				source: "var f = {b:1,a c:2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"b","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[16,18]},{"type":"Identifier","name":"c","range":[16,16]},{"type":"Literal","range":[17,18],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"b"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Punctuator","range":[12,13],"value":","},{"type":"Identifier","range":[13,14],"value":"a"},{"type":"Identifier","range":[15,16],"value":"c"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"2"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"}],
				errors: [{"lineNumber":1,"index":13,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 6', function() {
			var data = { 
				source: 'var f = {one: {a b:1,c}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,25]},{"type":"VariableDeclarator","range":[4,24]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,24]},{"type":"Property","kind":"init","range":[9,23]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,23]},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"b","range":[18,18]},{"type":"Literal","range":[19,20],"value":1}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Identifier","range":[17,18],"value":"b"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"1"},{"type":"Punctuator","range":[20,21],"value":","},{"type":"Identifier","range":[21,22],"value":"c"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":21,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive 7', function() {
			var data = { 
				source: 'var f = {one: {a c b:1}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,25]},{"type":"VariableDeclarator","range":[4,24]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,24]},{"type":"Property","kind":"init","range":[9,23]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,23]},{"type":"Property","kind":"init","range":[20,22]},{"type":"Identifier","name":"b","range":[20,20]},{"type":"Literal","range":[21,22],"value":1}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Identifier","range":[17,18],"value":"c"},{"type":"Identifier","range":[19,20],"value":"b"},{"type":"Punctuator","range":[20,21],"value":":"},{"type":"Numeric","range":[21,22],"value":"1"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":17,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 1', function() {
			var data = { 
				source: 'var f = {one: {a b:1}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,23]},{"type":"VariableDeclarator","range":[4,22]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,22]},{"type":"Property","kind":"init","range":[9,21]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,21]},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"b","range":[18,18]},{"type":"Literal","range":[19,20],"value":1}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Identifier","range":[17,18],"value":"b"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"1"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":"}"},{"type":"Punctuator","range":[22,23],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 2', function() {
			var data = { 
				source: 'var f = {one: {a b:1,c:2}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,27]},{"type":"VariableDeclarator","range":[4,26]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,26]},{"type":"Property","kind":"init","range":[9,25]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,25]},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"b","range":[18,18]},{"type":"Literal","range":[19,20],"value":1},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"c","range":[21,22]},{"type":"Literal","range":[23,24],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Identifier","range":[17,18],"value":"b"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"1"},{"type":"Punctuator","range":[20,21],"value":","},{"type":"Identifier","range":[21,22],"value":"c"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":"}"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 3', function() {
			var data = { 
				source: 'var f = {one: {b: 1,a c:2}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,28]},{"type":"VariableDeclarator","range":[4,27]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,27]},{"type":"Property","kind":"init","range":[9,26]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,26]},{"type":"Property","kind":"init","range":[15,19]},{"type":"Identifier","name":"b","range":[15,16]},{"type":"Literal","range":[18,19],"value":1},{"type":"Property","kind":"init","range":[23,25]},{"type":"Identifier","name":"c","range":[23,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"b"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[18,19],"value":"1"},{"type":"Punctuator","range":[19,20],"value":","},{"type":"Identifier","range":[20,21],"value":"a"},{"type":"Identifier","range":[22,23],"value":"c"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Punctuator","range":[27,28],"value":";"}],
				errors: [{"lineNumber":1,"index":20,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 4', function() {
			var data = { 
				source: 'var f = {one: {b: 1,c:2,a }};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,29]},{"type":"VariableDeclarator","range":[4,28]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,28]},{"type":"Property","kind":"init","range":[9,27]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,27]},{"type":"Property","kind":"init","range":[15,19]},{"type":"Identifier","name":"b","range":[15,16]},{"type":"Literal","range":[18,19],"value":1},{"type":"Property","kind":"init","range":[20,23]},{"type":"Identifier","name":"c","range":[20,21]},{"type":"Literal","range":[22,23],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"b"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[18,19],"value":"1"},{"type":"Punctuator","range":[19,20],"value":","},{"type":"Identifier","range":[20,21],"value":"c"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Numeric","range":[22,23],"value":"2"},{"type":"Punctuator","range":[23,24],"value":","},{"type":"Identifier","range":[24,25],"value":"a"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Punctuator","range":[27,28],"value":"}"},{"type":"Punctuator","range":[28,29],"value":";"}],
				errors: [{"lineNumber":1,"index":24,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 5', function() {
			var data = { 
				source: 'var f = {one: {d b: 1,c:2,a }};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,31]},{"type":"VariableDeclarator","range":[4,30]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,30]},{"type":"Property","kind":"init","range":[9,29]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"ObjectExpression","range":[14,29]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"b","range":[18,18]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"c","range":[22,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"Identifier","range":[15,16],"value":"d"},{"type":"Identifier","range":[17,18],"value":"b"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[22,23],"value":"c"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":","},{"type":"Identifier","range":[26,27],"value":"a"},{"type":"Punctuator","range":[28,29],"value":"}"},{"type":"Punctuator","range":[29,30],"value":"}"},{"type":"Punctuator","range":[30,31],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":26,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 6', function() {
			var data = { 
				source: 'var f = {two one: {d b: 1,c:2,a }};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,35]},{"type":"VariableDeclarator","range":[4,34]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,34]},{"type":"Property","kind":"init","range":[16,33]},{"type":"Identifier","name":"one","range":[16,16]},{"type":"ObjectExpression","range":[18,33]},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"b","range":[22,22]},{"type":"Literal","range":[24,25],"value":1},{"type":"Property","kind":"init","range":[26,29]},{"type":"Identifier","name":"c","range":[26,27]},{"type":"Literal","range":[28,29],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"two"},{"type":"Identifier","range":[13,16],"value":"one"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Punctuator","range":[18,19],"value":"{"},{"type":"Identifier","range":[19,20],"value":"d"},{"type":"Identifier","range":[21,22],"value":"b"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[24,25],"value":"1"},{"type":"Punctuator","range":[25,26],"value":","},{"type":"Identifier","range":[26,27],"value":"c"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"2"},{"type":"Punctuator","range":[29,30],"value":","},{"type":"Identifier","range":[30,31],"value":"a"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":19,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":30,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - successive nested 7', function() {
			var data = { 
				source: 'var f = {two three one: {d b: 1,c:2,a }};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,41]},{"type":"VariableDeclarator","range":[4,40]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,40]},{"type":"Property","kind":"init","range":[22,39]},{"type":"Identifier","name":"one","range":[22,22]},{"type":"ObjectExpression","range":[24,39]},{"type":"Property","kind":"init","range":[28,31]},{"type":"Identifier","name":"b","range":[28,28]},{"type":"Literal","range":[30,31],"value":1},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"two"},{"type":"Identifier","range":[13,18],"value":"three"},{"type":"Identifier","range":[19,22],"value":"one"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Punctuator","range":[24,25],"value":"{"},{"type":"Identifier","range":[25,26],"value":"d"},{"type":"Identifier","range":[27,28],"value":"b"},{"type":"Punctuator","range":[28,29],"value":":"},{"type":"Numeric","range":[30,31],"value":"1"},{"type":"Punctuator","range":[31,32],"value":","},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":","},{"type":"Identifier","range":[36,37],"value":"a"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":"}"},{"type":"Punctuator","range":[40,41],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":13,"message":"Unexpected token three","token":"three"},{"lineNumber":1,"index":25,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":36,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 1', function() {
			var data = { 
				source: 'function f(){} f({a});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,22]},{"type":"CallExpression","range":[15,21]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,20]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Punctuator","range":[19,20],"value":"}"},{"type":"Punctuator","range":[20,21],"value":")"},{"type":"Punctuator","range":[21,22],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 2', function() {
			var data = { 
				source: 'function f(){} f({a b:1});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,26]},{"type":"CallExpression","range":[15,25]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,24]},{"type":"Property","kind":"init","range":[21,23]},{"type":"Identifier","name":"b","range":[21,21]},{"type":"Literal","range":[22,23],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Identifier","range":[20,21],"value":"b"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Numeric","range":[22,23],"value":"1"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":")"},{"type":"Punctuator","range":[25,26],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 3', function() {
			var data = { 
				source: 'function f(){} f({a b:1,c:2});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,30]},{"type":"CallExpression","range":[15,29]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,28]},{"type":"Property","kind":"init","range":[21,23]},{"type":"Identifier","name":"b","range":[21,21]},{"type":"Literal","range":[22,23],"value":1},{"type":"Property","kind":"init","range":[24,27]},{"type":"Identifier","name":"c","range":[24,25]},{"type":"Literal","range":[26,27],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Identifier","range":[20,21],"value":"b"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Numeric","range":[22,23],"value":"1"},{"type":"Punctuator","range":[23,24],"value":","},{"type":"Identifier","range":[24,25],"value":"c"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Numeric","range":[26,27],"value":"2"},{"type":"Punctuator","range":[27,28],"value":"}"},{"type":"Punctuator","range":[28,29],"value":")"},{"type":"Punctuator","range":[29,30],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 4', function() {
			var data = { 
				source: 'function f(){} f({b:1,a});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,26]},{"type":"CallExpression","range":[15,25]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,24]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"b","range":[18,19]},{"type":"Literal","range":[20,21],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"b"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[22,23],"value":"a"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":")"},{"type":"Punctuator","range":[25,26],"value":";"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 5', function() {
			var data = { 
				source: 'function f(){} f({b:1,c:2,a});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,30]},{"type":"CallExpression","range":[15,29]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,28]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"b","range":[18,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"c","range":[22,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"b"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[22,23],"value":"c"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":","},{"type":"Identifier","range":[26,27],"value":"a"},{"type":"Punctuator","range":[27,28],"value":"}"},{"type":"Punctuator","range":[28,29],"value":")"},{"type":"Punctuator","range":[29,30],"value":";"}],
				errors: [{"lineNumber":1,"index":26,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 6', function() {
			var data = { 
				source: 'function f(){} f({a b c:2});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,28]},{"type":"CallExpression","range":[15,27]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,26]},{"type":"Property","kind":"init","range":[23,25]},{"type":"Identifier","name":"c","range":[23,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Identifier","range":[20,21],"value":"b"},{"type":"Identifier","range":[22,23],"value":"c"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":")"},{"type":"Punctuator","range":[27,28],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":20,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl 7', function() {
			var data = { 
				source: 'function f(){} f({a b:1,c});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,28]},{"type":"CallExpression","range":[15,27]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,26]},{"type":"Property","kind":"init","range":[21,23]},{"type":"Identifier","name":"b","range":[21,21]},{"type":"Literal","range":[22,23],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Identifier","range":[20,21],"value":"b"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Numeric","range":[22,23],"value":"1"},{"type":"Punctuator","range":[23,24],"value":","},{"type":"Identifier","range":[24,25],"value":"c"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":")"},{"type":"Punctuator","range":[27,28],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":24,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 1', function() {
			var data = { 
				source: 'function f(){} f({one: {a}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,29]},{"type":"CallExpression","range":[15,28]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,27]},{"type":"Property","kind":"init","range":[18,26]},{"type":"Identifier","name":"one","range":[18,21]},{"type":"ObjectExpression","range":[23,26]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"one"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Punctuator","range":[23,24],"value":"{"},{"type":"Identifier","range":[24,25],"value":"a"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Punctuator","range":[27,28],"value":")"},{"type":"Punctuator","range":[28,29],"value":";"}],
				errors: [{"lineNumber":1,"index":24,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 2', function() {
			var data = { 
				source: 'function f(){} f({one: {a b:1}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,33]},{"type":"CallExpression","range":[15,32]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,31]},{"type":"Property","kind":"init","range":[18,30]},{"type":"Identifier","name":"one","range":[18,21]},{"type":"ObjectExpression","range":[23,30]},{"type":"Property","kind":"init","range":[27,29]},{"type":"Identifier","name":"b","range":[27,27]},{"type":"Literal","range":[28,29],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"one"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Punctuator","range":[23,24],"value":"{"},{"type":"Identifier","range":[24,25],"value":"a"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"1"},{"type":"Punctuator","range":[29,30],"value":"}"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Punctuator","range":[31,32],"value":")"},{"type":"Punctuator","range":[32,33],"value":";"}],
				errors: [{"lineNumber":1,"index":24,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 3', function() {
			var data = { 
				source: 'function f(){} f({one: {a b:1,c:2}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,37]},{"type":"CallExpression","range":[15,36]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,35]},{"type":"Property","kind":"init","range":[18,34]},{"type":"Identifier","name":"one","range":[18,21]},{"type":"ObjectExpression","range":[23,34]},{"type":"Property","kind":"init","range":[27,29]},{"type":"Identifier","name":"b","range":[27,27]},{"type":"Literal","range":[28,29],"value":1},{"type":"Property","kind":"init","range":[30,33]},{"type":"Identifier","name":"c","range":[30,31]},{"type":"Literal","range":[32,33],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"one"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Punctuator","range":[23,24],"value":"{"},{"type":"Identifier","range":[24,25],"value":"a"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"1"},{"type":"Punctuator","range":[29,30],"value":","},{"type":"Identifier","range":[30,31],"value":"c"},{"type":"Punctuator","range":[31,32],"value":":"},{"type":"Numeric","range":[32,33],"value":"2"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":")"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":24,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 4', function() {
			var data = { 
				source: 'function f(){} f({one: {a b c:2}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,35]},{"type":"CallExpression","range":[15,34]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,33]},{"type":"Property","kind":"init","range":[18,32]},{"type":"Identifier","name":"one","range":[18,21]},{"type":"ObjectExpression","range":[23,32]},{"type":"Property","kind":"init","range":[29,31]},{"type":"Identifier","name":"c","range":[29,29]},{"type":"Literal","range":[30,31],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"one"},{"type":"Punctuator","range":[21,22],"value":":"},{"type":"Punctuator","range":[23,24],"value":"{"},{"type":"Identifier","range":[24,25],"value":"a"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Identifier","range":[28,29],"value":"c"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"2"},{"type":"Punctuator","range":[31,32],"value":"}"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":")"},{"type":"Punctuator","range":[34,35],"value":";"}],
				errors: [{"lineNumber":1,"index":24,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":26,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 5', function() {
			var data = { 
				source: 'function f(){} f({two one: {a b:1}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,37]},{"type":"CallExpression","range":[15,36]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,35]},{"type":"Property","kind":"init","range":[25,34]},{"type":"Identifier","name":"one","range":[25,25]},{"type":"ObjectExpression","range":[27,34]},{"type":"Property","kind":"init","range":[31,33]},{"type":"Identifier","name":"b","range":[31,31]},{"type":"Literal","range":[32,33],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"two"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[27,28],"value":"{"},{"type":"Identifier","range":[28,29],"value":"a"},{"type":"Identifier","range":[30,31],"value":"b"},{"type":"Punctuator","range":[31,32],"value":":"},{"type":"Numeric","range":[32,33],"value":"1"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":")"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":28,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - func decl nested 6', function() {
			var data = { 
				source: 'function f(){} f({two one: {a b:1},three});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,43]},{"type":"CallExpression","range":[15,42]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,41]},{"type":"Property","kind":"init","range":[25,34]},{"type":"Identifier","name":"one","range":[25,25]},{"type":"ObjectExpression","range":[27,34]},{"type":"Property","kind":"init","range":[31,33]},{"type":"Identifier","name":"b","range":[31,31]},{"type":"Literal","range":[32,33],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,21],"value":"two"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[27,28],"value":"{"},{"type":"Identifier","range":[28,29],"value":"a"},{"type":"Identifier","range":[30,31],"value":"b"},{"type":"Punctuator","range":[31,32],"value":":"},{"type":"Numeric","range":[32,33],"value":"1"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":","},{"type":"Identifier","range":[35,40],"value":"three"},{"type":"Punctuator","range":[40,41],"value":"}"},{"type":"Punctuator","range":[41,42],"value":")"},{"type":"Punctuator","range":[42,43],"value":";"}],
				errors: [{"lineNumber":1,"index":18,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":28,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":35,"message":"Unexpected token three","token":"three"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return 1', function() {
			var data = { 
				source: 'function f() {return {a};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,26]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,26]},{"type":"ReturnStatement","range":[14,25]},{"type":"ObjectExpression","range":[21,24]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,23],"value":"a"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":";"},{"type":"Punctuator","range":[25,26],"value":"}"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return 2', function() {
			var data = { 
				source: 'function f() {return {a b:1};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,30]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,30]},{"type":"ReturnStatement","range":[14,29]},{"type":"ObjectExpression","range":[21,28]},{"type":"Property","kind":"init","range":[25,27]},{"type":"Identifier","name":"b","range":[25,25]},{"type":"Literal","range":[26,27],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,23],"value":"a"},{"type":"Identifier","range":[24,25],"value":"b"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Numeric","range":[26,27],"value":"1"},{"type":"Punctuator","range":[27,28],"value":"}"},{"type":"Punctuator","range":[28,29],"value":";"},{"type":"Punctuator","range":[29,30],"value":"}"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return 3', function() {
			var data = { 
				source: 'function f() {return {b:1, a c:2};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,35]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,35]},{"type":"ReturnStatement","range":[14,34]},{"type":"ObjectExpression","range":[21,33]},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"b","range":[22,23]},{"type":"Literal","range":[24,25],"value":1},{"type":"Property","kind":"init","range":[30,32]},{"type":"Identifier","name":"c","range":[30,30]},{"type":"Literal","range":[31,32],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,23],"value":"b"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"1"},{"type":"Punctuator","range":[25,26],"value":","},{"type":"Identifier","range":[27,28],"value":"a"},{"type":"Identifier","range":[29,30],"value":"c"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"2"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":";"},{"type":"Punctuator","range":[34,35],"value":"}"}],
				errors: [{"lineNumber":1,"index":27,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return 4', function() {
			var data = { 
				source: 'function f() {return {b:1,a c};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,32]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,32]},{"type":"ReturnStatement","range":[14,31]},{"type":"ObjectExpression","range":[21,30]},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"b","range":[22,23]},{"type":"Literal","range":[24,25],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,23],"value":"b"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"1"},{"type":"Punctuator","range":[25,26],"value":","},{"type":"Identifier","range":[26,27],"value":"a"},{"type":"Identifier","range":[28,29],"value":"c"},{"type":"Punctuator","range":[29,30],"value":"}"},{"type":"Punctuator","range":[30,31],"value":";"},{"type":"Punctuator","range":[31,32],"value":"}"}],
				errors: [{"lineNumber":1,"index":26,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return 5', function() {
			var data = { 
				source: 'function f() {return {a b:1,c};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,32]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,32]},{"type":"ReturnStatement","range":[14,31]},{"type":"ObjectExpression","range":[21,30]},{"type":"Property","kind":"init","range":[25,27]},{"type":"Identifier","name":"b","range":[25,25]},{"type":"Literal","range":[26,27],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,23],"value":"a"},{"type":"Identifier","range":[24,25],"value":"b"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Numeric","range":[26,27],"value":"1"},{"type":"Punctuator","range":[27,28],"value":","},{"type":"Identifier","range":[28,29],"value":"c"},{"type":"Punctuator","range":[29,30],"value":"}"},{"type":"Punctuator","range":[30,31],"value":";"},{"type":"Punctuator","range":[31,32],"value":"}"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return nested 1', function() {
			var data = { 
				source: 'function f() {return {one:{a}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,32]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,32]},{"type":"ReturnStatement","range":[14,31]},{"type":"ObjectExpression","range":[21,30]},{"type":"Property","kind":"init","range":[22,29]},{"type":"Identifier","name":"one","range":[22,25]},{"type":"ObjectExpression","range":[26,29]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[26,27],"value":"{"},{"type":"Identifier","range":[27,28],"value":"a"},{"type":"Punctuator","range":[28,29],"value":"}"},{"type":"Punctuator","range":[29,30],"value":"}"},{"type":"Punctuator","range":[30,31],"value":";"},{"type":"Punctuator","range":[31,32],"value":"}"}],
				errors: [{"lineNumber":1,"index":27,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return nested 2', function() {
			var data = { 
				source: 'function f() {return {one:{a b:1}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,36]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,36]},{"type":"ReturnStatement","range":[14,35]},{"type":"ObjectExpression","range":[21,34]},{"type":"Property","kind":"init","range":[22,33]},{"type":"Identifier","name":"one","range":[22,25]},{"type":"ObjectExpression","range":[26,33]},{"type":"Property","kind":"init","range":[30,32]},{"type":"Identifier","name":"b","range":[30,30]},{"type":"Literal","range":[31,32],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[26,27],"value":"{"},{"type":"Identifier","range":[27,28],"value":"a"},{"type":"Identifier","range":[29,30],"value":"b"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"1"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":";"},{"type":"Punctuator","range":[35,36],"value":"}"}],
				errors: [{"lineNumber":1,"index":27,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return nested 3', function() {
			var data = { 
				source: 'function f() {return {one:{b:1, a c:2}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,41]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,41]},{"type":"ReturnStatement","range":[14,40]},{"type":"ObjectExpression","range":[21,39]},{"type":"Property","kind":"init","range":[22,38]},{"type":"Identifier","name":"one","range":[22,25]},{"type":"ObjectExpression","range":[26,38]},{"type":"Property","kind":"init","range":[27,30]},{"type":"Identifier","name":"b","range":[27,28]},{"type":"Literal","range":[29,30],"value":1},{"type":"Property","kind":"init","range":[35,37]},{"type":"Identifier","name":"c","range":[35,35]},{"type":"Literal","range":[36,37],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[26,27],"value":"{"},{"type":"Identifier","range":[27,28],"value":"b"},{"type":"Punctuator","range":[28,29],"value":":"},{"type":"Numeric","range":[29,30],"value":"1"},{"type":"Punctuator","range":[30,31],"value":","},{"type":"Identifier","range":[32,33],"value":"a"},{"type":"Identifier","range":[34,35],"value":"c"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Numeric","range":[36,37],"value":"2"},{"type":"Punctuator","range":[37,38],"value":"}"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":";"},{"type":"Punctuator","range":[40,41],"value":"}"}],
				errors: [{"lineNumber":1,"index":32,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - return nested 4', function() {
			var data = { 
				source: 'function f() {return {one:{a b:1,c}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,38]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,38]},{"type":"ReturnStatement","range":[14,37]},{"type":"ObjectExpression","range":[21,36]},{"type":"Property","kind":"init","range":[22,35]},{"type":"Identifier","name":"one","range":[22,25]},{"type":"ObjectExpression","range":[26,35]},{"type":"Property","kind":"init","range":[30,32]},{"type":"Identifier","name":"b","range":[30,30]},{"type":"Literal","range":[31,32],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"one"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Punctuator","range":[26,27],"value":"{"},{"type":"Identifier","range":[27,28],"value":"a"},{"type":"Identifier","range":[29,30],"value":"b"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"1"},{"type":"Punctuator","range":[32,33],"value":","},{"type":"Identifier","range":[33,34],"value":"c"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"},{"type":"Punctuator","range":[37,38],"value":"}"}],
				errors: [{"lineNumber":1,"index":27,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":33,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		it('obj prop ident recovery - return nested 5', function() {
			var data = { 
				source: 'function f() {return {two one:{a b:1,c}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,42]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,42]},{"type":"ReturnStatement","range":[14,41]},{"type":"ObjectExpression","range":[21,40]},{"type":"Property","kind":"init","range":[29,39]},{"type":"Identifier","name":"one","range":[29,29]},{"type":"ObjectExpression","range":[30,39]},{"type":"Property","kind":"init","range":[34,36]},{"type":"Identifier","name":"b","range":[34,34]},{"type":"Literal","range":[35,36],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"two"},{"type":"Identifier","range":[26,29],"value":"one"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Punctuator","range":[30,31],"value":"{"},{"type":"Identifier","range":[31,32],"value":"a"},{"type":"Identifier","range":[33,34],"value":"b"},{"type":"Punctuator","range":[34,35],"value":":"},{"type":"Numeric","range":[35,36],"value":"1"},{"type":"Punctuator","range":[36,37],"value":","},{"type":"Identifier","range":[37,38],"value":"c"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":"}"},{"type":"Punctuator","range":[40,41],"value":";"},{"type":"Punctuator","range":[41,42],"value":"}"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":31,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Unexpected token c","token":"c"}]
			};
			runTest(data);
		});
		it('obj prop ident recovery - return nested 6', function() {
			var data = { 
				source: 'function f() {return {two one:{a b:1,c}, three};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,49]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,49]},{"type":"ReturnStatement","range":[14,48]},{"type":"ObjectExpression","range":[21,47]},{"type":"Property","kind":"init","range":[29,39]},{"type":"Identifier","name":"one","range":[29,29]},{"type":"ObjectExpression","range":[30,39]},{"type":"Property","kind":"init","range":[34,36]},{"type":"Identifier","name":"b","range":[34,34]},{"type":"Literal","range":[35,36],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"two"},{"type":"Identifier","range":[26,29],"value":"one"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Punctuator","range":[30,31],"value":"{"},{"type":"Identifier","range":[31,32],"value":"a"},{"type":"Identifier","range":[33,34],"value":"b"},{"type":"Punctuator","range":[34,35],"value":":"},{"type":"Numeric","range":[35,36],"value":"1"},{"type":"Punctuator","range":[36,37],"value":","},{"type":"Identifier","range":[37,38],"value":"c"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":","},{"type":"Identifier","range":[41,46],"value":"three"},{"type":"Punctuator","range":[46,47],"value":"}"},{"type":"Punctuator","range":[47,48],"value":";"},{"type":"Punctuator","range":[48,49],"value":"}"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":31,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Unexpected token c","token":"c"},{"lineNumber":1,"index":41,"message":"Unexpected token three","token":"three"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - multi 1', function() {
			var data = { 
				source: 'function f() {return {two one:{a b:1,c}, three};}var v = {d:1, a};',
				nodes: [{"type":"FunctionDeclaration","range":[0,49]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,49]},{"type":"ReturnStatement","range":[14,48]},{"type":"ObjectExpression","range":[21,47]},{"type":"Property","kind":"init","range":[29,39]},{"type":"Identifier","name":"one","range":[29,29]},{"type":"ObjectExpression","range":[30,39]},{"type":"Property","kind":"init","range":[34,36]},{"type":"Identifier","name":"b","range":[34,34]},{"type":"Literal","range":[35,36],"value":1},{"type":"VariableDeclaration","kind":"var","range":[49,66]},{"type":"VariableDeclarator","range":[53,65]},{"type":"Identifier","name":"v","range":[53,54]},{"type":"ObjectExpression","range":[57,65]},{"type":"Property","kind":"init","range":[58,61]},{"type":"Identifier","name":"d","range":[58,59]},{"type":"Literal","range":[60,61],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"two"},{"type":"Identifier","range":[26,29],"value":"one"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Punctuator","range":[30,31],"value":"{"},{"type":"Identifier","range":[31,32],"value":"a"},{"type":"Identifier","range":[33,34],"value":"b"},{"type":"Punctuator","range":[34,35],"value":":"},{"type":"Numeric","range":[35,36],"value":"1"},{"type":"Punctuator","range":[36,37],"value":","},{"type":"Identifier","range":[37,38],"value":"c"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":","},{"type":"Identifier","range":[41,46],"value":"three"},{"type":"Punctuator","range":[46,47],"value":"}"},{"type":"Punctuator","range":[47,48],"value":";"},{"type":"Punctuator","range":[48,49],"value":"}"},{"type":"Keyword","range":[49,52],"value":"var"},{"type":"Identifier","range":[53,54],"value":"v"},{"type":"Punctuator","range":[55,56],"value":"="},{"type":"Punctuator","range":[57,58],"value":"{"},{"type":"Identifier","range":[58,59],"value":"d"},{"type":"Punctuator","range":[59,60],"value":":"},{"type":"Numeric","range":[60,61],"value":"1"},{"type":"Punctuator","range":[61,62],"value":","},{"type":"Identifier","range":[63,64],"value":"a"},{"type":"Punctuator","range":[64,65],"value":"}"},{"type":"Punctuator","range":[65,66],"value":";"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":31,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Unexpected token c","token":"c"},{"lineNumber":1,"index":41,"message":"Unexpected token three","token":"three"},{"lineNumber":1,"index":63,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - multi 2', function() {
			var data = { 
				source: 'function f() {return {two one:{a b:1,c}, three};}var v = {d:1, a};f({aa bb:1, cc});',
				nodes: [{"type":"FunctionDeclaration","range":[0,49]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,49]},{"type":"ReturnStatement","range":[14,48]},{"type":"ObjectExpression","range":[21,47]},{"type":"Property","kind":"init","range":[29,39]},{"type":"Identifier","name":"one","range":[29,29]},{"type":"ObjectExpression","range":[30,39]},{"type":"Property","kind":"init","range":[34,36]},{"type":"Identifier","name":"b","range":[34,34]},{"type":"Literal","range":[35,36],"value":1},{"type":"VariableDeclaration","kind":"var","range":[49,66]},{"type":"VariableDeclarator","range":[53,65]},{"type":"Identifier","name":"v","range":[53,54]},{"type":"ObjectExpression","range":[57,65]},{"type":"Property","kind":"init","range":[58,61]},{"type":"Identifier","name":"d","range":[58,59]},{"type":"Literal","range":[60,61],"value":1},{"type":"ExpressionStatement","range":[66,83]},{"type":"CallExpression","range":[66,82]},{"type":"Identifier","name":"f","range":[66,67]},{"type":"ObjectExpression","range":[68,81]},{"type":"Property","kind":"init","range":[74,76]},{"type":"Identifier","name":"bb","range":[74,74]},{"type":"Literal","range":[75,76],"value":1}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[14,20],"value":"return"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Identifier","range":[22,25],"value":"two"},{"type":"Identifier","range":[26,29],"value":"one"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Punctuator","range":[30,31],"value":"{"},{"type":"Identifier","range":[31,32],"value":"a"},{"type":"Identifier","range":[33,34],"value":"b"},{"type":"Punctuator","range":[34,35],"value":":"},{"type":"Numeric","range":[35,36],"value":"1"},{"type":"Punctuator","range":[36,37],"value":","},{"type":"Identifier","range":[37,38],"value":"c"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":","},{"type":"Identifier","range":[41,46],"value":"three"},{"type":"Punctuator","range":[46,47],"value":"}"},{"type":"Punctuator","range":[47,48],"value":";"},{"type":"Punctuator","range":[48,49],"value":"}"},{"type":"Keyword","range":[49,52],"value":"var"},{"type":"Identifier","range":[53,54],"value":"v"},{"type":"Punctuator","range":[55,56],"value":"="},{"type":"Punctuator","range":[57,58],"value":"{"},{"type":"Identifier","range":[58,59],"value":"d"},{"type":"Punctuator","range":[59,60],"value":":"},{"type":"Numeric","range":[60,61],"value":"1"},{"type":"Punctuator","range":[61,62],"value":","},{"type":"Identifier","range":[63,64],"value":"a"},{"type":"Punctuator","range":[64,65],"value":"}"},{"type":"Punctuator","range":[65,66],"value":";"},{"type":"Identifier","range":[66,67],"value":"f"},{"type":"Punctuator","range":[67,68],"value":"("},{"type":"Punctuator","range":[68,69],"value":"{"},{"type":"Identifier","range":[69,71],"value":"aa"},{"type":"Identifier","range":[72,74],"value":"bb"},{"type":"Punctuator","range":[74,75],"value":":"},{"type":"Numeric","range":[75,76],"value":"1"},{"type":"Punctuator","range":[76,77],"value":","},{"type":"Identifier","range":[78,80],"value":"cc"},{"type":"Punctuator","range":[80,81],"value":"}"},{"type":"Punctuator","range":[81,82],"value":")"},{"type":"Punctuator","range":[82,83],"value":";"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token two","token":"two"},{"lineNumber":1,"index":31,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Unexpected token c","token":"c"},{"lineNumber":1,"index":41,"message":"Unexpected token three","token":"three"},{"lineNumber":1,"index":63,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":69,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":78,"message":"Unexpected token cc","token":"cc"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 1', function() {
			var data = { 
				source: 'var f = {a:1 b:2};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,18]},{"type":"VariableDeclarator","range":[4,17]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,17]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[13,16]},{"type":"Identifier","name":"b","range":[13,14]},{"type":"Literal","range":[15,16],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"2"},{"type":"Punctuator","range":[16,17],"value":"}"},{"type":"Punctuator","range":[17,18],"value":";"}],
				errors: [{"lineNumber":1,"index":12,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 2', function() {
			var data = { 
				source: 'var f = {a:1 b:2 c:3};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,22]},{"type":"VariableDeclarator","range":[4,21]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,21]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[13,16]},{"type":"Identifier","name":"b","range":[13,14]},{"type":"Literal","range":[15,16],"value":2},{"type":"Property","kind":"init","range":[17,20]},{"type":"Identifier","name":"c","range":[17,18]},{"type":"Literal","range":[19,20],"value":3}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"2"},{"type":"Identifier","range":[17,18],"value":"c"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"3"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":";"}],
				errors: [{"lineNumber":1,"index":12,"message":"Missing expected ','"},{"lineNumber":1,"index":16,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 3', function() {
			var data = { 
				source: 'var f = {a:1 b:{aa:1 bb:2}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,28]},{"type":"VariableDeclarator","range":[4,27]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,27]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[13,26]},{"type":"Identifier","name":"b","range":[13,14]},{"type":"ObjectExpression","range":[15,26]},{"type":"Property","kind":"init","range":[16,20]},{"type":"Identifier","name":"aa","range":[16,18]},{"type":"Literal","range":[19,20],"value":1},{"type":"Property","kind":"init","range":[21,25]},{"type":"Identifier","name":"bb","range":[21,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Punctuator","range":[15,16],"value":"{"},{"type":"Identifier","range":[16,18],"value":"aa"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"1"},{"type":"Identifier","range":[21,23],"value":"bb"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Punctuator","range":[27,28],"value":";"}],
				errors: [{"lineNumber":1,"index":12,"message":"Missing expected ','"},{"lineNumber":1,"index":20,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 4', function() {
			var data = { 
				source: 'var f = {a:1, b:{aa:1 bb:2} c:4};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,33]},{"type":"VariableDeclarator","range":[4,32]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,32]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[14,27]},{"type":"Identifier","name":"b","range":[14,15]},{"type":"ObjectExpression","range":[16,27]},{"type":"Property","kind":"init","range":[17,21]},{"type":"Identifier","name":"aa","range":[17,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[22,26]},{"type":"Identifier","name":"bb","range":[22,24]},{"type":"Literal","range":[25,26],"value":2},{"type":"Property","kind":"init","range":[28,31]},{"type":"Identifier","name":"c","range":[28,29]},{"type":"Literal","range":[30,31],"value":4}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Punctuator","range":[12,13],"value":","},{"type":"Identifier","range":[14,15],"value":"b"},{"type":"Punctuator","range":[15,16],"value":":"},{"type":"Punctuator","range":[16,17],"value":"{"},{"type":"Identifier","range":[17,19],"value":"aa"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Identifier","range":[22,24],"value":"bb"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Numeric","range":[25,26],"value":"2"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Identifier","range":[28,29],"value":"c"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"4"},{"type":"Punctuator","range":[31,32],"value":"}"},{"type":"Punctuator","range":[32,33],"value":";"}],
				errors: [{"lineNumber":1,"index":21,"message":"Missing expected ','"},{"lineNumber":1,"index":27,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 5', function() {
			var data = { 
				source: 'var f = {a:1, b:{aa:1, bb:2 cc:4} c:4};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,39]},{"type":"VariableDeclarator","range":[4,38]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,38]},{"type":"Property","kind":"init","range":[9,12]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"Literal","range":[11,12],"value":1},{"type":"Property","kind":"init","range":[14,33]},{"type":"Identifier","name":"b","range":[14,15]},{"type":"ObjectExpression","range":[16,33]},{"type":"Property","kind":"init","range":[17,21]},{"type":"Identifier","name":"aa","range":[17,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[23,27]},{"type":"Identifier","name":"bb","range":[23,25]},{"type":"Literal","range":[26,27],"value":2},{"type":"Property","kind":"init","range":[28,32]},{"type":"Identifier","name":"cc","range":[28,30]},{"type":"Literal","range":[31,32],"value":4},{"type":"Property","kind":"init","range":[34,37]},{"type":"Identifier","name":"c","range":[34,35]},{"type":"Literal","range":[36,37],"value":4}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Numeric","range":[11,12],"value":"1"},{"type":"Punctuator","range":[12,13],"value":","},{"type":"Identifier","range":[14,15],"value":"b"},{"type":"Punctuator","range":[15,16],"value":":"},{"type":"Punctuator","range":[16,17],"value":"{"},{"type":"Identifier","range":[17,19],"value":"aa"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[23,25],"value":"bb"},{"type":"Punctuator","range":[25,26],"value":":"},{"type":"Numeric","range":[26,27],"value":"2"},{"type":"Identifier","range":[28,30],"value":"cc"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"4"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Identifier","range":[34,35],"value":"c"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Numeric","range":[36,37],"value":"4"},{"type":"Punctuator","range":[37,38],"value":"}"},{"type":"Punctuator","range":[38,39],"value":";"}],
				errors: [{"lineNumber":1,"index":27,"message":"Missing expected ','"},{"lineNumber":1,"index":33,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 6', function() {
			var data = { 
				source: 'function f(){} f({a:1, b:{aa:1, bb:2 cc:4} c:4});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,49]},{"type":"CallExpression","range":[15,48]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,47]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"a","range":[18,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[23,42]},{"type":"Identifier","name":"b","range":[23,24]},{"type":"ObjectExpression","range":[25,42]},{"type":"Property","kind":"init","range":[26,30]},{"type":"Identifier","name":"aa","range":[26,28]},{"type":"Literal","range":[29,30],"value":1},{"type":"Property","kind":"init","range":[32,36]},{"type":"Identifier","name":"bb","range":[32,34]},{"type":"Literal","range":[35,36],"value":2},{"type":"Property","kind":"init","range":[37,41]},{"type":"Identifier","name":"cc","range":[37,39]},{"type":"Literal","range":[40,41],"value":4},{"type":"Property","kind":"init","range":[43,46]},{"type":"Identifier","name":"c","range":[43,44]},{"type":"Literal","range":[45,46],"value":4}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[26,28],"value":"aa"},{"type":"Punctuator","range":[28,29],"value":":"},{"type":"Numeric","range":[29,30],"value":"1"},{"type":"Punctuator","range":[30,31],"value":","},{"type":"Identifier","range":[32,34],"value":"bb"},{"type":"Punctuator","range":[34,35],"value":":"},{"type":"Numeric","range":[35,36],"value":"2"},{"type":"Identifier","range":[37,39],"value":"cc"},{"type":"Punctuator","range":[39,40],"value":":"},{"type":"Numeric","range":[40,41],"value":"4"},{"type":"Punctuator","range":[41,42],"value":"}"},{"type":"Identifier","range":[43,44],"value":"c"},{"type":"Punctuator","range":[44,45],"value":":"},{"type":"Numeric","range":[45,46],"value":"4"},{"type":"Punctuator","range":[46,47],"value":"}"},{"type":"Punctuator","range":[47,48],"value":")"},{"type":"Punctuator","range":[48,49],"value":";"}],
				errors: [{"lineNumber":1,"index":36,"message":"Missing expected ','"},{"lineNumber":1,"index":42,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 7', function() {
			var data = { 
				source: 'function f(){} f({a:1 b:2});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,28]},{"type":"CallExpression","range":[15,27]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,26]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"a","range":[18,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[22,25]},{"type":"Identifier","name":"b","range":[22,23]},{"type":"Literal","range":[24,25],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Identifier","range":[22,23],"value":"b"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Numeric","range":[24,25],"value":"2"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":")"},{"type":"Punctuator","range":[27,28],"value":";"}],
				errors: [{"lineNumber":1,"index":21,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 8', function() {
			var data = { 
				source: 'function f(){} f({a:1 b:{aa:1 bb:2}});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,38]},{"type":"CallExpression","range":[15,37]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,36]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"a","range":[18,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[22,35]},{"type":"Identifier","name":"b","range":[22,23]},{"type":"ObjectExpression","range":[24,35]},{"type":"Property","kind":"init","range":[25,29]},{"type":"Identifier","name":"aa","range":[25,27]},{"type":"Literal","range":[28,29],"value":1},{"type":"Property","kind":"init","range":[30,34]},{"type":"Identifier","name":"bb","range":[30,32]},{"type":"Literal","range":[33,34],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Identifier","range":[22,23],"value":"b"},{"type":"Punctuator","range":[23,24],"value":":"},{"type":"Punctuator","range":[24,25],"value":"{"},{"type":"Identifier","range":[25,27],"value":"aa"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"1"},{"type":"Identifier","range":[30,32],"value":"bb"},{"type":"Punctuator","range":[32,33],"value":":"},{"type":"Numeric","range":[33,34],"value":"2"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":")"},{"type":"Punctuator","range":[37,38],"value":";"}],
				errors: [{"lineNumber":1,"index":21,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 9', function() {
			var data = { 
				source: 'function f(){} f({a:1, b:{aa:1 bb:2} c:4});',
				nodes: [{"type":"FunctionDeclaration","range":[0,14]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,14]},{"type":"ExpressionStatement","range":[15,43]},{"type":"CallExpression","range":[15,42]},{"type":"Identifier","name":"f","range":[15,16]},{"type":"ObjectExpression","range":[17,41]},{"type":"Property","kind":"init","range":[18,21]},{"type":"Identifier","name":"a","range":[18,19]},{"type":"Literal","range":[20,21],"value":1},{"type":"Property","kind":"init","range":[23,36]},{"type":"Identifier","name":"b","range":[23,24]},{"type":"ObjectExpression","range":[25,36]},{"type":"Property","kind":"init","range":[26,30]},{"type":"Identifier","name":"aa","range":[26,28]},{"type":"Literal","range":[29,30],"value":1},{"type":"Property","kind":"init","range":[31,35]},{"type":"Identifier","name":"bb","range":[31,33]},{"type":"Literal","range":[34,35],"value":2},{"type":"Property","kind":"init","range":[37,40]},{"type":"Identifier","name":"c","range":[37,38]},{"type":"Literal","range":[39,40],"value":4}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Punctuator","range":[13,14],"value":"}"},{"type":"Identifier","range":[15,16],"value":"f"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Identifier","range":[18,19],"value":"a"},{"type":"Punctuator","range":[19,20],"value":":"},{"type":"Numeric","range":[20,21],"value":"1"},{"type":"Punctuator","range":[21,22],"value":","},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[26,28],"value":"aa"},{"type":"Punctuator","range":[28,29],"value":":"},{"type":"Numeric","range":[29,30],"value":"1"},{"type":"Identifier","range":[31,33],"value":"bb"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Identifier","range":[37,38],"value":"c"},{"type":"Punctuator","range":[38,39],"value":":"},{"type":"Numeric","range":[39,40],"value":"4"},{"type":"Punctuator","range":[40,41],"value":"}"},{"type":"Punctuator","range":[41,42],"value":")"},{"type":"Punctuator","range":[42,43],"value":";"}],
				errors: [{"lineNumber":1,"index":30,"message":"Missing expected ','"},{"lineNumber":1,"index":36,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 10', function() {
			var data = { 
				source: 'function f(){return {a:1 b:2};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,31]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,31]},{"type":"ReturnStatement","range":[13,30]},{"type":"ObjectExpression","range":[20,29]},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"a","range":[21,22]},{"type":"Literal","range":[23,24],"value":1},{"type":"Property","kind":"init","range":[25,28]},{"type":"Identifier","name":"b","range":[25,26]},{"type":"Literal","range":[27,28],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Keyword","range":[13,19],"value":"return"},{"type":"Punctuator","range":[20,21],"value":"{"},{"type":"Identifier","range":[21,22],"value":"a"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"1"},{"type":"Identifier","range":[25,26],"value":"b"},{"type":"Punctuator","range":[26,27],"value":":"},{"type":"Numeric","range":[27,28],"value":"2"},{"type":"Punctuator","range":[28,29],"value":"}"},{"type":"Punctuator","range":[29,30],"value":";"},{"type":"Punctuator","range":[30,31],"value":"}"}],
				errors: [{"lineNumber":1,"index":24,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 11', function() {
			var data = { 
				source: 'function f(){return {a:1 b:2 c:3};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,35]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,35]},{"type":"ReturnStatement","range":[13,34]},{"type":"ObjectExpression","range":[20,33]},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"a","range":[21,22]},{"type":"Literal","range":[23,24],"value":1},{"type":"Property","kind":"init","range":[25,28]},{"type":"Identifier","name":"b","range":[25,26]},{"type":"Literal","range":[27,28],"value":2},{"type":"Property","kind":"init","range":[29,32]},{"type":"Identifier","name":"c","range":[29,30]},{"type":"Literal","range":[31,32],"value":3}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Keyword","range":[13,19],"value":"return"},{"type":"Punctuator","range":[20,21],"value":"{"},{"type":"Identifier","range":[21,22],"value":"a"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"1"},{"type":"Identifier","range":[25,26],"value":"b"},{"type":"Punctuator","range":[26,27],"value":":"},{"type":"Numeric","range":[27,28],"value":"2"},{"type":"Identifier","range":[29,30],"value":"c"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"3"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":";"},{"type":"Punctuator","range":[34,35],"value":"}"}],
				errors: [{"lineNumber":1,"index":24,"message":"Missing expected ','"},{"lineNumber":1,"index":28,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 12', function() {
			var data = { 
				source: 'function f(){return {a:1 b:{aa:1 bb:2}};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,41]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,41]},{"type":"ReturnStatement","range":[13,40]},{"type":"ObjectExpression","range":[20,39]},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"a","range":[21,22]},{"type":"Literal","range":[23,24],"value":1},{"type":"Property","kind":"init","range":[25,38]},{"type":"Identifier","name":"b","range":[25,26]},{"type":"ObjectExpression","range":[27,38]},{"type":"Property","kind":"init","range":[28,32]},{"type":"Identifier","name":"aa","range":[28,30]},{"type":"Literal","range":[31,32],"value":1},{"type":"Property","kind":"init","range":[33,37]},{"type":"Identifier","name":"bb","range":[33,35]},{"type":"Literal","range":[36,37],"value":2}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Keyword","range":[13,19],"value":"return"},{"type":"Punctuator","range":[20,21],"value":"{"},{"type":"Identifier","range":[21,22],"value":"a"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"1"},{"type":"Identifier","range":[25,26],"value":"b"},{"type":"Punctuator","range":[26,27],"value":":"},{"type":"Punctuator","range":[27,28],"value":"{"},{"type":"Identifier","range":[28,30],"value":"aa"},{"type":"Punctuator","range":[30,31],"value":":"},{"type":"Numeric","range":[31,32],"value":"1"},{"type":"Identifier","range":[33,35],"value":"bb"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Numeric","range":[36,37],"value":"2"},{"type":"Punctuator","range":[37,38],"value":"}"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Punctuator","range":[39,40],"value":";"},{"type":"Punctuator","range":[40,41],"value":"}"}],
				errors: [{"lineNumber":1,"index":24,"message":"Missing expected ','"},{"lineNumber":1,"index":32,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 13', function() {
			var data = { 
				source: 'function f(){return {a:1, b:{aa:1 bb:2} c:4};}',
				nodes: [{"type":"FunctionDeclaration","range":[0,46]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,46]},{"type":"ReturnStatement","range":[13,45]},{"type":"ObjectExpression","range":[20,44]},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"a","range":[21,22]},{"type":"Literal","range":[23,24],"value":1},{"type":"Property","kind":"init","range":[26,39]},{"type":"Identifier","name":"b","range":[26,27]},{"type":"ObjectExpression","range":[28,39]},{"type":"Property","kind":"init","range":[29,33]},{"type":"Identifier","name":"aa","range":[29,31]},{"type":"Literal","range":[32,33],"value":1},{"type":"Property","kind":"init","range":[34,38]},{"type":"Identifier","name":"bb","range":[34,36]},{"type":"Literal","range":[37,38],"value":2},{"type":"Property","kind":"init","range":[40,43]},{"type":"Identifier","name":"c","range":[40,41]},{"type":"Literal","range":[42,43],"value":4}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Keyword","range":[13,19],"value":"return"},{"type":"Punctuator","range":[20,21],"value":"{"},{"type":"Identifier","range":[21,22],"value":"a"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"1"},{"type":"Punctuator","range":[24,25],"value":","},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Punctuator","range":[28,29],"value":"{"},{"type":"Identifier","range":[29,31],"value":"aa"},{"type":"Punctuator","range":[31,32],"value":":"},{"type":"Numeric","range":[32,33],"value":"1"},{"type":"Identifier","range":[34,36],"value":"bb"},{"type":"Punctuator","range":[36,37],"value":":"},{"type":"Numeric","range":[37,38],"value":"2"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Identifier","range":[40,41],"value":"c"},{"type":"Punctuator","range":[41,42],"value":":"},{"type":"Numeric","range":[42,43],"value":"4"},{"type":"Punctuator","range":[43,44],"value":"}"},{"type":"Punctuator","range":[44,45],"value":";"},{"type":"Punctuator","range":[45,46],"value":"}"}],
				errors: [{"lineNumber":1,"index":33,"message":"Missing expected ','"},{"lineNumber":1,"index":39,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - missing comma 14', function() {
			var data = { 
				source: 'function f(){return {a:1, b:{aa:1, bb:2 cc:4} c:4};',
				nodes: [{"type":"FunctionDeclaration","range":[0,51]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[12,51]},{"type":"ReturnStatement","range":[13,51]},{"type":"ObjectExpression","range":[20,50]},{"type":"Property","kind":"init","range":[21,24]},{"type":"Identifier","name":"a","range":[21,22]},{"type":"Literal","range":[23,24],"value":1},{"type":"Property","kind":"init","range":[26,45]},{"type":"Identifier","name":"b","range":[26,27]},{"type":"ObjectExpression","range":[28,45]},{"type":"Property","kind":"init","range":[29,33]},{"type":"Identifier","name":"aa","range":[29,31]},{"type":"Literal","range":[32,33],"value":1},{"type":"Property","kind":"init","range":[35,39]},{"type":"Identifier","name":"bb","range":[35,37]},{"type":"Literal","range":[38,39],"value":2},{"type":"Property","kind":"init","range":[40,44]},{"type":"Identifier","name":"cc","range":[40,42]},{"type":"Literal","range":[43,44],"value":4},{"type":"Property","kind":"init","range":[46,49]},{"type":"Identifier","name":"c","range":[46,47]},{"type":"Literal","range":[48,49],"value":4}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Keyword","range":[13,19],"value":"return"},{"type":"Punctuator","range":[20,21],"value":"{"},{"type":"Identifier","range":[21,22],"value":"a"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"1"},{"type":"Punctuator","range":[24,25],"value":","},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Punctuator","range":[28,29],"value":"{"},{"type":"Identifier","range":[29,31],"value":"aa"},{"type":"Punctuator","range":[31,32],"value":":"},{"type":"Numeric","range":[32,33],"value":"1"},{"type":"Punctuator","range":[33,34],"value":","},{"type":"Identifier","range":[35,37],"value":"bb"},{"type":"Punctuator","range":[37,38],"value":":"},{"type":"Numeric","range":[38,39],"value":"2"},{"type":"Identifier","range":[40,42],"value":"cc"},{"type":"Punctuator","range":[42,43],"value":":"},{"type":"Numeric","range":[43,44],"value":"4"},{"type":"Punctuator","range":[44,45],"value":"}"},{"type":"Identifier","range":[46,47],"value":"c"},{"type":"Punctuator","range":[47,48],"value":":"},{"type":"Numeric","range":[48,49],"value":"4"},{"type":"Punctuator","range":[49,50],"value":"}"},{"type":"Punctuator","range":[50,51],"value":";"}],
				errors: [{"lineNumber":1,"index":39,"message":"Missing expected ','"},{"lineNumber":1,"index":45,"message":"Missing expected ','"},{"lineNumber":1,"index":51,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 1', function() {
			var data = { 
				source: 'var v = {a b:1 c:2};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[15,18]},{"type":"Identifier","name":"c","range":[15,16]},{"type":"Literal","range":[17,18],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"c"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"2"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 2', function() {
			var data = { 
				source: 'var v = {a b:1 d c:2};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,22]},{"type":"VariableDeclarator","range":[4,21]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,21]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"c","range":[18,18]},{"type":"Literal","range":[19,20],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"d"},{"type":"Identifier","range":[17,18],"value":"c"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"2"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"},{"lineNumber":1,"index":15,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 3', function() {
			var data = { 
				source: 'var v = {a b:{cc:3, dd:"hey" e} c:2};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[12,31]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"ObjectExpression","range":[13,31]},{"type":"Property","kind":"init","range":[14,18]},{"type":"Identifier","name":"cc","range":[14,16]},{"type":"Literal","range":[17,18],"value":3},{"type":"Property","kind":"init","range":[20,28]},{"type":"Identifier","name":"dd","range":[20,22]},{"type":"Literal","range":[23,28],"value":"hey"},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"String","range":[23,28],"value":"\"hey\""},{"type":"Identifier","range":[29,30],"value":"e"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":31,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 4', function() {
			var data = { 
				source: 'var v = {a b:{cc:3, dd:"hey" e} c:2};function f() {return {a b:{cc:3, dd:"hey" e} c:2};}',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[12,31]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"ObjectExpression","range":[13,31]},{"type":"Property","kind":"init","range":[14,18]},{"type":"Identifier","name":"cc","range":[14,16]},{"type":"Literal","range":[17,18],"value":3},{"type":"Property","kind":"init","range":[20,28]},{"type":"Identifier","name":"dd","range":[20,22]},{"type":"Literal","range":[23,28],"value":"hey"},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2},{"type":"FunctionDeclaration","range":[37,88]},{"type":"Identifier","name":"f","range":[46,47]},{"type":"BlockStatement","range":[50,88]},{"type":"ReturnStatement","range":[51,87]},{"type":"ObjectExpression","range":[58,86]},{"type":"Property","kind":"init","range":[62,81]},{"type":"Identifier","name":"b","range":[62,62]},{"type":"ObjectExpression","range":[63,81]},{"type":"Property","kind":"init","range":[64,68]},{"type":"Identifier","name":"cc","range":[64,66]},{"type":"Literal","range":[67,68],"value":3},{"type":"Property","kind":"init","range":[70,78]},{"type":"Identifier","name":"dd","range":[70,72]},{"type":"Literal","range":[73,78],"value":"hey"},{"type":"Property","kind":"init","range":[82,85]},{"type":"Identifier","name":"c","range":[82,83]},{"type":"Literal","range":[84,85],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"String","range":[23,28],"value":"\"hey\""},{"type":"Identifier","range":[29,30],"value":"e"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"},{"type":"Keyword","range":[37,45],"value":"function"},{"type":"Identifier","range":[46,47],"value":"f"},{"type":"Punctuator","range":[47,48],"value":"("},{"type":"Punctuator","range":[48,49],"value":")"},{"type":"Punctuator","range":[50,51],"value":"{"},{"type":"Keyword","range":[51,57],"value":"return"},{"type":"Punctuator","range":[58,59],"value":"{"},{"type":"Identifier","range":[59,60],"value":"a"},{"type":"Identifier","range":[61,62],"value":"b"},{"type":"Punctuator","range":[62,63],"value":":"},{"type":"Punctuator","range":[63,64],"value":"{"},{"type":"Identifier","range":[64,66],"value":"cc"},{"type":"Punctuator","range":[66,67],"value":":"},{"type":"Numeric","range":[67,68],"value":"3"},{"type":"Punctuator","range":[68,69],"value":","},{"type":"Identifier","range":[70,72],"value":"dd"},{"type":"Punctuator","range":[72,73],"value":":"},{"type":"String","range":[73,78],"value":"\"hey\""},{"type":"Identifier","range":[79,80],"value":"e"},{"type":"Punctuator","range":[80,81],"value":"}"},{"type":"Identifier","range":[82,83],"value":"c"},{"type":"Punctuator","range":[83,84],"value":":"},{"type":"Numeric","range":[84,85],"value":"2"},{"type":"Punctuator","range":[85,86],"value":"}"},{"type":"Punctuator","range":[86,87],"value":";"},{"type":"Punctuator","range":[87,88],"value":"}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":31,"message":"Missing expected ','"},{"lineNumber":1,"index":59,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":78,"message":"Missing expected ','"},{"lineNumber":1,"index":79,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":81,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 5', function() {
			var data = { 
				source: 'var v = {a b:1 c:2};function f() {return {a b:1 c:2};}',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[15,18]},{"type":"Identifier","name":"c","range":[15,16]},{"type":"Literal","range":[17,18],"value":2},{"type":"FunctionDeclaration","range":[20,54]},{"type":"Identifier","name":"f","range":[29,30]},{"type":"BlockStatement","range":[33,54]},{"type":"ReturnStatement","range":[34,53]},{"type":"ObjectExpression","range":[41,52]},{"type":"Property","kind":"init","range":[45,47]},{"type":"Identifier","name":"b","range":[45,45]},{"type":"Literal","range":[46,47],"value":1},{"type":"Property","kind":"init","range":[48,51]},{"type":"Identifier","name":"c","range":[48,49]},{"type":"Literal","range":[50,51],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"c"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"2"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"},{"type":"Keyword","range":[20,28],"value":"function"},{"type":"Identifier","range":[29,30],"value":"f"},{"type":"Punctuator","range":[30,31],"value":"("},{"type":"Punctuator","range":[31,32],"value":")"},{"type":"Punctuator","range":[33,34],"value":"{"},{"type":"Keyword","range":[34,40],"value":"return"},{"type":"Punctuator","range":[41,42],"value":"{"},{"type":"Identifier","range":[42,43],"value":"a"},{"type":"Identifier","range":[44,45],"value":"b"},{"type":"Punctuator","range":[45,46],"value":":"},{"type":"Numeric","range":[46,47],"value":"1"},{"type":"Identifier","range":[48,49],"value":"c"},{"type":"Punctuator","range":[49,50],"value":":"},{"type":"Numeric","range":[50,51],"value":"2"},{"type":"Punctuator","range":[51,52],"value":"}"},{"type":"Punctuator","range":[52,53],"value":";"},{"type":"Punctuator","range":[53,54],"value":"}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"},{"lineNumber":1,"index":42,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":47,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 6', function() {
			var data = { 
				source: 'var v = {a b:1 d c:2};function f() {return {a b:1 d c:2};}',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,22]},{"type":"VariableDeclarator","range":[4,21]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,21]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"c","range":[18,18]},{"type":"Literal","range":[19,20],"value":2},{"type":"FunctionDeclaration","range":[22,58]},{"type":"Identifier","name":"f","range":[31,32]},{"type":"BlockStatement","range":[35,58]},{"type":"ReturnStatement","range":[36,57]},{"type":"ObjectExpression","range":[43,56]},{"type":"Property","kind":"init","range":[47,49]},{"type":"Identifier","name":"b","range":[47,47]},{"type":"Literal","range":[48,49],"value":1},{"type":"Property","kind":"init","range":[53,55]},{"type":"Identifier","name":"c","range":[53,53]},{"type":"Literal","range":[54,55],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"d"},{"type":"Identifier","range":[17,18],"value":"c"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"2"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":";"},{"type":"Keyword","range":[22,30],"value":"function"},{"type":"Identifier","range":[31,32],"value":"f"},{"type":"Punctuator","range":[32,33],"value":"("},{"type":"Punctuator","range":[33,34],"value":")"},{"type":"Punctuator","range":[35,36],"value":"{"},{"type":"Keyword","range":[36,42],"value":"return"},{"type":"Punctuator","range":[43,44],"value":"{"},{"type":"Identifier","range":[44,45],"value":"a"},{"type":"Identifier","range":[46,47],"value":"b"},{"type":"Punctuator","range":[47,48],"value":":"},{"type":"Numeric","range":[48,49],"value":"1"},{"type":"Identifier","range":[50,51],"value":"d"},{"type":"Identifier","range":[52,53],"value":"c"},{"type":"Punctuator","range":[53,54],"value":":"},{"type":"Numeric","range":[54,55],"value":"2"},{"type":"Punctuator","range":[55,56],"value":"}"},{"type":"Punctuator","range":[56,57],"value":";"},{"type":"Punctuator","range":[57,58],"value":"}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"},{"lineNumber":1,"index":15,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":44,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":49,"message":"Missing expected ','"},{"lineNumber":1,"index":50,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 7', function() {
			var data = { 
				source: 'var v = {a b:1 c:2};function f() {return {a b:1 c:2};}f({a b:1 c:2});',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,20]},{"type":"VariableDeclarator","range":[4,19]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,19]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[15,18]},{"type":"Identifier","name":"c","range":[15,16]},{"type":"Literal","range":[17,18],"value":2},{"type":"FunctionDeclaration","range":[20,54]},{"type":"Identifier","name":"f","range":[29,30]},{"type":"BlockStatement","range":[33,54]},{"type":"ReturnStatement","range":[34,53]},{"type":"ObjectExpression","range":[41,52]},{"type":"Property","kind":"init","range":[45,47]},{"type":"Identifier","name":"b","range":[45,45]},{"type":"Literal","range":[46,47],"value":1},{"type":"Property","kind":"init","range":[48,51]},{"type":"Identifier","name":"c","range":[48,49]},{"type":"Literal","range":[50,51],"value":2},{"type":"ExpressionStatement","range":[54,69]},{"type":"CallExpression","range":[54,68]},{"type":"Identifier","name":"f","range":[54,55]},{"type":"ObjectExpression","range":[56,67]},{"type":"Property","kind":"init","range":[60,62]},{"type":"Identifier","name":"b","range":[60,60]},{"type":"Literal","range":[61,62],"value":1},{"type":"Property","kind":"init","range":[63,66]},{"type":"Identifier","name":"c","range":[63,64]},{"type":"Literal","range":[65,66],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"c"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"2"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Punctuator","range":[19,20],"value":";"},{"type":"Keyword","range":[20,28],"value":"function"},{"type":"Identifier","range":[29,30],"value":"f"},{"type":"Punctuator","range":[30,31],"value":"("},{"type":"Punctuator","range":[31,32],"value":")"},{"type":"Punctuator","range":[33,34],"value":"{"},{"type":"Keyword","range":[34,40],"value":"return"},{"type":"Punctuator","range":[41,42],"value":"{"},{"type":"Identifier","range":[42,43],"value":"a"},{"type":"Identifier","range":[44,45],"value":"b"},{"type":"Punctuator","range":[45,46],"value":":"},{"type":"Numeric","range":[46,47],"value":"1"},{"type":"Identifier","range":[48,49],"value":"c"},{"type":"Punctuator","range":[49,50],"value":":"},{"type":"Numeric","range":[50,51],"value":"2"},{"type":"Punctuator","range":[51,52],"value":"}"},{"type":"Punctuator","range":[52,53],"value":";"},{"type":"Punctuator","range":[53,54],"value":"}"},{"type":"Identifier","range":[54,55],"value":"f"},{"type":"Punctuator","range":[55,56],"value":"("},{"type":"Punctuator","range":[56,57],"value":"{"},{"type":"Identifier","range":[57,58],"value":"a"},{"type":"Identifier","range":[59,60],"value":"b"},{"type":"Punctuator","range":[60,61],"value":":"},{"type":"Numeric","range":[61,62],"value":"1"},{"type":"Identifier","range":[63,64],"value":"c"},{"type":"Punctuator","range":[64,65],"value":":"},{"type":"Numeric","range":[65,66],"value":"2"},{"type":"Punctuator","range":[66,67],"value":"}"},{"type":"Punctuator","range":[67,68],"value":")"},{"type":"Punctuator","range":[68,69],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"},{"lineNumber":1,"index":42,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":47,"message":"Missing expected ','"},{"lineNumber":1,"index":57,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":62,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 8', function() {
			var data = { 
				source: 'var v = {a b:1 d c:2};function f() {return {a b:1 d c:2};}f({a b:1 d c:2});',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,22]},{"type":"VariableDeclarator","range":[4,21]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,21]},{"type":"Property","kind":"init","range":[12,14]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"Literal","range":[13,14],"value":1},{"type":"Property","kind":"init","range":[18,20]},{"type":"Identifier","name":"c","range":[18,18]},{"type":"Literal","range":[19,20],"value":2},{"type":"FunctionDeclaration","range":[22,58]},{"type":"Identifier","name":"f","range":[31,32]},{"type":"BlockStatement","range":[35,58]},{"type":"ReturnStatement","range":[36,57]},{"type":"ObjectExpression","range":[43,56]},{"type":"Property","kind":"init","range":[47,49]},{"type":"Identifier","name":"b","range":[47,47]},{"type":"Literal","range":[48,49],"value":1},{"type":"Property","kind":"init","range":[53,55]},{"type":"Identifier","name":"c","range":[53,53]},{"type":"Literal","range":[54,55],"value":2},{"type":"ExpressionStatement","range":[58,75]},{"type":"CallExpression","range":[58,74]},{"type":"Identifier","name":"f","range":[58,59]},{"type":"ObjectExpression","range":[60,73]},{"type":"Property","kind":"init","range":[64,66]},{"type":"Identifier","name":"b","range":[64,64]},{"type":"Literal","range":[65,66],"value":1},{"type":"Property","kind":"init","range":[70,72]},{"type":"Identifier","name":"c","range":[70,70]},{"type":"Literal","range":[71,72],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Numeric","range":[13,14],"value":"1"},{"type":"Identifier","range":[15,16],"value":"d"},{"type":"Identifier","range":[17,18],"value":"c"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"2"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Punctuator","range":[21,22],"value":";"},{"type":"Keyword","range":[22,30],"value":"function"},{"type":"Identifier","range":[31,32],"value":"f"},{"type":"Punctuator","range":[32,33],"value":"("},{"type":"Punctuator","range":[33,34],"value":")"},{"type":"Punctuator","range":[35,36],"value":"{"},{"type":"Keyword","range":[36,42],"value":"return"},{"type":"Punctuator","range":[43,44],"value":"{"},{"type":"Identifier","range":[44,45],"value":"a"},{"type":"Identifier","range":[46,47],"value":"b"},{"type":"Punctuator","range":[47,48],"value":":"},{"type":"Numeric","range":[48,49],"value":"1"},{"type":"Identifier","range":[50,51],"value":"d"},{"type":"Identifier","range":[52,53],"value":"c"},{"type":"Punctuator","range":[53,54],"value":":"},{"type":"Numeric","range":[54,55],"value":"2"},{"type":"Punctuator","range":[55,56],"value":"}"},{"type":"Punctuator","range":[56,57],"value":";"},{"type":"Punctuator","range":[57,58],"value":"}"},{"type":"Identifier","range":[58,59],"value":"f"},{"type":"Punctuator","range":[59,60],"value":"("},{"type":"Punctuator","range":[60,61],"value":"{"},{"type":"Identifier","range":[61,62],"value":"a"},{"type":"Identifier","range":[63,64],"value":"b"},{"type":"Punctuator","range":[64,65],"value":":"},{"type":"Numeric","range":[65,66],"value":"1"},{"type":"Identifier","range":[67,68],"value":"d"},{"type":"Identifier","range":[69,70],"value":"c"},{"type":"Punctuator","range":[70,71],"value":":"},{"type":"Numeric","range":[71,72],"value":"2"},{"type":"Punctuator","range":[72,73],"value":"}"},{"type":"Punctuator","range":[73,74],"value":")"},{"type":"Punctuator","range":[74,75],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":14,"message":"Missing expected ','"},{"lineNumber":1,"index":15,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":44,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":49,"message":"Missing expected ','"},{"lineNumber":1,"index":50,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":61,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":66,"message":"Missing expected ','"},{"lineNumber":1,"index":67,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - mixed 9', function() {
			var data = { 
				source: 'var v = {a b:{cc:3, dd:"hey" e} c:2};function f() {return {a b:{cc:3, dd:"hey" e} c:2};}f({a b:{cc:3, dd:"hey" e} c:2});',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[12,31]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"ObjectExpression","range":[13,31]},{"type":"Property","kind":"init","range":[14,18]},{"type":"Identifier","name":"cc","range":[14,16]},{"type":"Literal","range":[17,18],"value":3},{"type":"Property","kind":"init","range":[20,28]},{"type":"Identifier","name":"dd","range":[20,22]},{"type":"Literal","range":[23,28],"value":"hey"},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2},{"type":"FunctionDeclaration","range":[37,88]},{"type":"Identifier","name":"f","range":[46,47]},{"type":"BlockStatement","range":[50,88]},{"type":"ReturnStatement","range":[51,87]},{"type":"ObjectExpression","range":[58,86]},{"type":"Property","kind":"init","range":[62,81]},{"type":"Identifier","name":"b","range":[62,62]},{"type":"ObjectExpression","range":[63,81]},{"type":"Property","kind":"init","range":[64,68]},{"type":"Identifier","name":"cc","range":[64,66]},{"type":"Literal","range":[67,68],"value":3},{"type":"Property","kind":"init","range":[70,78]},{"type":"Identifier","name":"dd","range":[70,72]},{"type":"Literal","range":[73,78],"value":"hey"},{"type":"Property","kind":"init","range":[82,85]},{"type":"Identifier","name":"c","range":[82,83]},{"type":"Literal","range":[84,85],"value":2},{"type":"ExpressionStatement","range":[88,120]},{"type":"CallExpression","range":[88,119]},{"type":"Identifier","name":"f","range":[88,89]},{"type":"ObjectExpression","range":[90,118]},{"type":"Property","kind":"init","range":[94,113]},{"type":"Identifier","name":"b","range":[94,94]},{"type":"ObjectExpression","range":[95,113]},{"type":"Property","kind":"init","range":[96,100]},{"type":"Identifier","name":"cc","range":[96,98]},{"type":"Literal","range":[99,100],"value":3},{"type":"Property","kind":"init","range":[102,110]},{"type":"Identifier","name":"dd","range":[102,104]},{"type":"Literal","range":[105,110],"value":"hey"},{"type":"Property","kind":"init","range":[114,117]},{"type":"Identifier","name":"c","range":[114,115]},{"type":"Literal","range":[116,117],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"String","range":[23,28],"value":"\"hey\""},{"type":"Identifier","range":[29,30],"value":"e"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"},{"type":"Keyword","range":[37,45],"value":"function"},{"type":"Identifier","range":[46,47],"value":"f"},{"type":"Punctuator","range":[47,48],"value":"("},{"type":"Punctuator","range":[48,49],"value":")"},{"type":"Punctuator","range":[50,51],"value":"{"},{"type":"Keyword","range":[51,57],"value":"return"},{"type":"Punctuator","range":[58,59],"value":"{"},{"type":"Identifier","range":[59,60],"value":"a"},{"type":"Identifier","range":[61,62],"value":"b"},{"type":"Punctuator","range":[62,63],"value":":"},{"type":"Punctuator","range":[63,64],"value":"{"},{"type":"Identifier","range":[64,66],"value":"cc"},{"type":"Punctuator","range":[66,67],"value":":"},{"type":"Numeric","range":[67,68],"value":"3"},{"type":"Punctuator","range":[68,69],"value":","},{"type":"Identifier","range":[70,72],"value":"dd"},{"type":"Punctuator","range":[72,73],"value":":"},{"type":"String","range":[73,78],"value":"\"hey\""},{"type":"Identifier","range":[79,80],"value":"e"},{"type":"Punctuator","range":[80,81],"value":"}"},{"type":"Identifier","range":[82,83],"value":"c"},{"type":"Punctuator","range":[83,84],"value":":"},{"type":"Numeric","range":[84,85],"value":"2"},{"type":"Punctuator","range":[85,86],"value":"}"},{"type":"Punctuator","range":[86,87],"value":";"},{"type":"Punctuator","range":[87,88],"value":"}"},{"type":"Identifier","range":[88,89],"value":"f"},{"type":"Punctuator","range":[89,90],"value":"("},{"type":"Punctuator","range":[90,91],"value":"{"},{"type":"Identifier","range":[91,92],"value":"a"},{"type":"Identifier","range":[93,94],"value":"b"},{"type":"Punctuator","range":[94,95],"value":":"},{"type":"Punctuator","range":[95,96],"value":"{"},{"type":"Identifier","range":[96,98],"value":"cc"},{"type":"Punctuator","range":[98,99],"value":":"},{"type":"Numeric","range":[99,100],"value":"3"},{"type":"Punctuator","range":[100,101],"value":","},{"type":"Identifier","range":[102,104],"value":"dd"},{"type":"Punctuator","range":[104,105],"value":":"},{"type":"String","range":[105,110],"value":"\"hey\""},{"type":"Identifier","range":[111,112],"value":"e"},{"type":"Punctuator","range":[112,113],"value":"}"},{"type":"Identifier","range":[114,115],"value":"c"},{"type":"Punctuator","range":[115,116],"value":":"},{"type":"Numeric","range":[116,117],"value":"2"},{"type":"Punctuator","range":[117,118],"value":"}"},{"type":"Punctuator","range":[118,119],"value":")"},{"type":"Punctuator","range":[119,120],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":31,"message":"Missing expected ','"},{"lineNumber":1,"index":59,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":78,"message":"Missing expected ','"},{"lineNumber":1,"index":79,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":81,"message":"Missing expected ','"},{"lineNumber":1,"index":91,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":110,"message":"Missing expected ','"},{"lineNumber":1,"index":111,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":113,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 1', function() {
			var data = { 
				source: 'var v = {get a() {} set b(a) {}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,33]},{"type":"VariableDeclarator","range":[4,32]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,32]},{"type":"Property","kind":"get","range":[9,19]},{"type":"Identifier","name":"a","range":[13,14]},{"type":"FunctionExpression","range":[17,19]},{"type":"BlockStatement","range":[17,19]},{"type":"Property","kind":"set","range":[20,31]},{"type":"Identifier","name":"b","range":[24,25]},{"type":"FunctionExpression","range":[29,31]},{"type":"Identifier","name":"a","range":[26,27]},{"type":"BlockStatement","range":[29,31]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"get"},{"type":"Identifier","range":[13,14],"value":"a"},{"type":"Punctuator","range":[14,15],"value":"("},{"type":"Punctuator","range":[15,16],"value":")"},{"type":"Punctuator","range":[17,18],"value":"{"},{"type":"Punctuator","range":[18,19],"value":"}"},{"type":"Identifier","range":[20,23],"value":"set"},{"type":"Identifier","range":[24,25],"value":"b"},{"type":"Punctuator","range":[25,26],"value":"("},{"type":"Identifier","range":[26,27],"value":"a"},{"type":"Punctuator","range":[27,28],"value":")"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Punctuator","range":[31,32],"value":"}"},{"type":"Punctuator","range":[32,33],"value":";"}],
				errors: [{"lineNumber":1,"index":19,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 2', function() {
			var data = { 
				source: 'var v = {a get a() {} set b(a) {}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,35]},{"type":"VariableDeclarator","range":[4,34]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,34]},{"type":"Property","kind":"get","range":[15,21]},{"type":"Identifier","name":"a","range":[15,16]},{"type":"FunctionExpression","range":[19,21]},{"type":"BlockStatement","range":[19,21]},{"type":"Property","kind":"set","range":[22,33]},{"type":"Identifier","name":"b","range":[26,27]},{"type":"FunctionExpression","range":[31,33]},{"type":"Identifier","name":"a","range":[28,29]},{"type":"BlockStatement","range":[31,33]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,14],"value":"get"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":")"},{"type":"Punctuator","range":[19,20],"value":"{"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Identifier","range":[22,25],"value":"set"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":"("},{"type":"Identifier","range":[28,29],"value":"a"},{"type":"Punctuator","range":[29,30],"value":")"},{"type":"Punctuator","range":[31,32],"value":"{"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":21,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 3', function() {
			var data = { 
				source: 'var v = {a get a() {} b set b(a) {}};',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"get","range":[15,21]},{"type":"Identifier","name":"a","range":[15,16]},{"type":"FunctionExpression","range":[19,21]},{"type":"BlockStatement","range":[19,21]},{"type":"Property","kind":"set","range":[28,35]},{"type":"Identifier","name":"b","range":[28,29]},{"type":"FunctionExpression","range":[33,35]},{"type":"Identifier","name":"a","range":[30,31]},{"type":"BlockStatement","range":[33,35]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,14],"value":"get"},{"type":"Identifier","range":[15,16],"value":"a"},{"type":"Punctuator","range":[16,17],"value":"("},{"type":"Punctuator","range":[17,18],"value":")"},{"type":"Punctuator","range":[19,20],"value":"{"},{"type":"Punctuator","range":[20,21],"value":"}"},{"type":"Identifier","range":[22,23],"value":"b"},{"type":"Identifier","range":[24,27],"value":"set"},{"type":"Identifier","range":[28,29],"value":"b"},{"type":"Punctuator","range":[29,30],"value":"("},{"type":"Identifier","range":[30,31],"value":"a"},{"type":"Punctuator","range":[31,32],"value":")"},{"type":"Punctuator","range":[33,34],"value":"{"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":21,"message":"Missing expected ','"},{"lineNumber":1,"index":22,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 4', function() {
			var data = { 
				source: 'var v = {a: {get a() {} set b(a) {}} b };',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,41]},{"type":"VariableDeclarator","range":[4,40]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,40]},{"type":"Property","kind":"init","range":[9,36]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"ObjectExpression","range":[12,36]},{"type":"Property","kind":"get","range":[13,23]},{"type":"Identifier","name":"a","range":[17,18]},{"type":"FunctionExpression","range":[21,23]},{"type":"BlockStatement","range":[21,23]},{"type":"Property","kind":"set","range":[24,35]},{"type":"Identifier","name":"b","range":[28,29]},{"type":"FunctionExpression","range":[33,35]},{"type":"Identifier","name":"a","range":[30,31]},{"type":"BlockStatement","range":[33,35]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Identifier","range":[13,16],"value":"get"},{"type":"Identifier","range":[17,18],"value":"a"},{"type":"Punctuator","range":[18,19],"value":"("},{"type":"Punctuator","range":[19,20],"value":")"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Identifier","range":[24,27],"value":"set"},{"type":"Identifier","range":[28,29],"value":"b"},{"type":"Punctuator","range":[29,30],"value":"("},{"type":"Identifier","range":[30,31],"value":"a"},{"type":"Punctuator","range":[31,32],"value":")"},{"type":"Punctuator","range":[33,34],"value":"{"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Identifier","range":[37,38],"value":"b"},{"type":"Punctuator","range":[39,40],"value":"}"},{"type":"Punctuator","range":[40,41],"value":";"}],
				errors: [{"lineNumber":1,"index":23,"message":"Missing expected ','"},{"lineNumber":1,"index":36,"message":"Missing expected ','"},{"lineNumber":1,"index":37,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 5', function() {
			var data = { 
				source: 'var v = {a: {aa get a() {} set b(a) {}} b };',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,44]},{"type":"VariableDeclarator","range":[4,43]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,43]},{"type":"Property","kind":"init","range":[9,39]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"ObjectExpression","range":[12,39]},{"type":"Property","kind":"get","range":[20,26]},{"type":"Identifier","name":"a","range":[20,21]},{"type":"FunctionExpression","range":[24,26]},{"type":"BlockStatement","range":[24,26]},{"type":"Property","kind":"set","range":[27,38]},{"type":"Identifier","name":"b","range":[31,32]},{"type":"FunctionExpression","range":[36,38]},{"type":"Identifier","name":"a","range":[33,34]},{"type":"BlockStatement","range":[36,38]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Identifier","range":[13,15],"value":"aa"},{"type":"Identifier","range":[16,19],"value":"get"},{"type":"Identifier","range":[20,21],"value":"a"},{"type":"Punctuator","range":[21,22],"value":"("},{"type":"Punctuator","range":[22,23],"value":")"},{"type":"Punctuator","range":[24,25],"value":"{"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Identifier","range":[27,30],"value":"set"},{"type":"Identifier","range":[31,32],"value":"b"},{"type":"Punctuator","range":[32,33],"value":"("},{"type":"Identifier","range":[33,34],"value":"a"},{"type":"Punctuator","range":[34,35],"value":")"},{"type":"Punctuator","range":[36,37],"value":"{"},{"type":"Punctuator","range":[37,38],"value":"}"},{"type":"Punctuator","range":[38,39],"value":"}"},{"type":"Identifier","range":[40,41],"value":"b"},{"type":"Punctuator","range":[42,43],"value":"}"},{"type":"Punctuator","range":[43,44],"value":";"}],
				errors: [{"lineNumber":1,"index":13,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":26,"message":"Missing expected ','"},{"lineNumber":1,"index":39,"message":"Missing expected ','"},{"lineNumber":1,"index":40,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - get/set 6', function() {
			var data = { 
				source: 'var v = {a: {aa get a() {} bb set b(a) {}} b };',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,47]},{"type":"VariableDeclarator","range":[4,46]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,46]},{"type":"Property","kind":"init","range":[9,42]},{"type":"Identifier","name":"a","range":[9,10]},{"type":"ObjectExpression","range":[12,42]},{"type":"Property","kind":"get","range":[20,26]},{"type":"Identifier","name":"a","range":[20,21]},{"type":"FunctionExpression","range":[24,26]},{"type":"BlockStatement","range":[24,26]},{"type":"Property","kind":"set","range":[34,41]},{"type":"Identifier","name":"b","range":[34,35]},{"type":"FunctionExpression","range":[39,41]},{"type":"Identifier","name":"a","range":[36,37]},{"type":"BlockStatement","range":[39,41]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Punctuator","range":[10,11],"value":":"},{"type":"Punctuator","range":[12,13],"value":"{"},{"type":"Identifier","range":[13,15],"value":"aa"},{"type":"Identifier","range":[16,19],"value":"get"},{"type":"Identifier","range":[20,21],"value":"a"},{"type":"Punctuator","range":[21,22],"value":"("},{"type":"Punctuator","range":[22,23],"value":")"},{"type":"Punctuator","range":[24,25],"value":"{"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Identifier","range":[27,29],"value":"bb"},{"type":"Identifier","range":[30,33],"value":"set"},{"type":"Identifier","range":[34,35],"value":"b"},{"type":"Punctuator","range":[35,36],"value":"("},{"type":"Identifier","range":[36,37],"value":"a"},{"type":"Punctuator","range":[37,38],"value":")"},{"type":"Punctuator","range":[39,40],"value":"{"},{"type":"Punctuator","range":[40,41],"value":"}"},{"type":"Punctuator","range":[41,42],"value":"}"},{"type":"Identifier","range":[43,44],"value":"b"},{"type":"Punctuator","range":[45,46],"value":"}"},{"type":"Punctuator","range":[46,47],"value":";"}],
				errors: [{"lineNumber":1,"index":13,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":26,"message":"Missing expected ','"},{"lineNumber":1,"index":27,"message":"Unexpected token bb","token":"bb"},{"lineNumber":1,"index":42,"message":"Missing expected ','"},{"lineNumber":1,"index":43,"message":"Unexpected token b","token":"b"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal successive 1', function() {
			var data = { 
				source: "var f = {'a' 'b':1 c:2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,24]},{"type":"VariableDeclarator","range":[4,23]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,23]},{"type":"Property","kind":"init","range":[16,18]},{"type":"Literal","range":[16,16],"value":"b"},{"type":"Literal","range":[17,18],"value":1},{"type":"Property","kind":"init","range":[19,22]},{"type":"Identifier","name":"c","range":[19,20]},{"type":"Literal","range":[21,22],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"String","range":[13,16],"value":"'b'"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"1"},{"type":"Identifier","range":[19,20],"value":"c"},{"type":"Punctuator","range":[20,21],"value":":"},{"type":"Numeric","range":[21,22],"value":"2"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":18,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal successive 2', function() {
			var data = { 
				source: "var f = {'a' b:1 'c':2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,24]},{"type":"VariableDeclarator","range":[4,23]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,23]},{"type":"Property","kind":"init","range":[14,16]},{"type":"Identifier","name":"b","range":[14,14]},{"type":"Literal","range":[15,16],"value":1},{"type":"Property","kind":"init","range":[17,22]},{"type":"Literal","range":[17,20],"value":"c"},{"type":"Literal","range":[21,22],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"1"},{"type":"String","range":[17,20],"value":"'c'"},{"type":"Punctuator","range":[20,21],"value":":"},{"type":"Numeric","range":[21,22],"value":"2"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":16,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal nested successive 1', function() {
			var data = { 
				source: "var f = {'a': {'aa' cc:2} b:1 'c':2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[9,25]},{"type":"Literal","range":[9,12],"value":"a"},{"type":"ObjectExpression","range":[14,25]},{"type":"Property","kind":"init","range":[22,24]},{"type":"Identifier","name":"cc","range":[22,22]},{"type":"Literal","range":[23,24],"value":2},{"type":"Property","kind":"init","range":[26,29]},{"type":"Identifier","name":"b","range":[26,27]},{"type":"Literal","range":[28,29],"value":1},{"type":"Property","kind":"init","range":[30,35]},{"type":"Literal","range":[30,33],"value":"c"},{"type":"Literal","range":[34,35],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"String","range":[15,19],"value":"'aa'"},{"type":"Identifier","range":[20,22],"value":"cc"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":"}"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"1"},{"type":"String","range":[30,33],"value":"'c'"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":25,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Missing expected ','"}] 
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal func decl 1', function() {
			var data = { 
				source: "function f() {} f({'a'});",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,25]},{"type":"CallExpression","range":[16,24]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"ObjectExpression","range":[18,23]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Punctuator","range":[18,19],"value":"{"},{"type":"String","range":[19,22],"value":"'a'"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":")"},{"type":"Punctuator","range":[24,25],"value":";"}],
				errors: [{"lineNumber":1,"index":19,"message":"Unexpected token a","token":"a"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal func decl 2', function() {
			var data = { 
				source: "var f = {'a' b:1 'c':2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,24]},{"type":"VariableDeclarator","range":[4,23]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,23]},{"type":"Property","kind":"init","range":[14,16]},{"type":"Identifier","name":"b","range":[14,14]},{"type":"Literal","range":[15,16],"value":1},{"type":"Property","kind":"init","range":[17,22]},{"type":"Literal","range":[17,20],"value":"c"},{"type":"Literal","range":[21,22],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"1"},{"type":"String","range":[17,20],"value":"'c'"},{"type":"Punctuator","range":[20,21],"value":":"},{"type":"Numeric","range":[21,22],"value":"2"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":16,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop ident recovery - literal func decl 3', function() {
			var data = { 
				source: "var f = {'a': {'aa' cc:2} b:1 'c':2};",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[9,25]},{"type":"Literal","range":[9,12],"value":"a"},{"type":"ObjectExpression","range":[14,25]},{"type":"Property","kind":"init","range":[22,24]},{"type":"Identifier","name":"cc","range":[22,22]},{"type":"Literal","range":[23,24],"value":2},{"type":"Property","kind":"init","range":[26,29]},{"type":"Identifier","name":"b","range":[26,27]},{"type":"Literal","range":[28,29],"value":1},{"type":"Property","kind":"init","range":[30,35]},{"type":"Literal","range":[30,33],"value":"c"},{"type":"Literal","range":[34,35],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[14,15],"value":"{"},{"type":"String","range":[15,19],"value":"'aa'"},{"type":"Identifier","range":[20,22],"value":"cc"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":"}"},{"type":"Identifier","range":[26,27],"value":"b"},{"type":"Punctuator","range":[27,28],"value":":"},{"type":"Numeric","range":[28,29],"value":"1"},{"type":"String","range":[30,33],"value":"'c'"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":25,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - literal return 1', function() {
			var data = { 
				source: "var v = function f() {return {a 'b':1 d 'c':2};}",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,48]},{"type":"VariableDeclarator","range":[4,48]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"FunctionExpression","range":[8,48]},{"type":"Identifier","name":"f","range":[17,18]},{"type":"BlockStatement","range":[21,48]},{"type":"ReturnStatement","range":[22,47]},{"type":"ObjectExpression","range":[29,46]},{"type":"Property","kind":"init","range":[35,37]},{"type":"Literal","range":[35,35],"value":"b"},{"type":"Literal","range":[36,37],"value":1},{"type":"Property","kind":"init","range":[43,45]},{"type":"Literal","range":[43,43],"value":"c"},{"type":"Literal","range":[44,45],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Keyword","range":[8,16],"value":"function"},{"type":"Identifier","range":[17,18],"value":"f"},{"type":"Punctuator","range":[18,19],"value":"("},{"type":"Punctuator","range":[19,20],"value":")"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Keyword","range":[22,28],"value":"return"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Identifier","range":[30,31],"value":"a"},{"type":"String","range":[32,35],"value":"'b'"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Numeric","range":[36,37],"value":"1"},{"type":"Identifier","range":[38,39],"value":"d"},{"type":"String","range":[40,43],"value":"'c'"},{"type":"Punctuator","range":[43,44],"value":":"},{"type":"Numeric","range":[44,45],"value":"2"},{"type":"Punctuator","range":[45,46],"value":"}"},{"type":"Punctuator","range":[46,47],"value":";"},{"type":"Punctuator","range":[47,48],"value":"}"}],
				errors: [{"lineNumber":1,"index":30,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Missing expected ','"},{"lineNumber":1,"index":38,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - literal return 2', function() {
			var data = { 
				source: "var v = function f() {return {a 'b':{'aa' 'bb' cc:3} d 'c':2};}",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,63]},{"type":"VariableDeclarator","range":[4,63]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"FunctionExpression","range":[8,63]},{"type":"Identifier","name":"f","range":[17,18]},{"type":"BlockStatement","range":[21,63]},{"type":"ReturnStatement","range":[22,62]},{"type":"ObjectExpression","range":[29,61]},{"type":"Property","kind":"init","range":[35,52]},{"type":"Literal","range":[35,35],"value":"b"},{"type":"ObjectExpression","range":[36,52]},{"type":"Property","kind":"init","range":[49,51]},{"type":"Identifier","name":"cc","range":[49,49]},{"type":"Literal","range":[50,51],"value":3},{"type":"Property","kind":"init","range":[58,60]},{"type":"Literal","range":[58,58],"value":"c"},{"type":"Literal","range":[59,60],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Keyword","range":[8,16],"value":"function"},{"type":"Identifier","range":[17,18],"value":"f"},{"type":"Punctuator","range":[18,19],"value":"("},{"type":"Punctuator","range":[19,20],"value":")"},{"type":"Punctuator","range":[21,22],"value":"{"},{"type":"Keyword","range":[22,28],"value":"return"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Identifier","range":[30,31],"value":"a"},{"type":"String","range":[32,35],"value":"'b'"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Punctuator","range":[36,37],"value":"{"},{"type":"String","range":[37,41],"value":"'aa'"},{"type":"String","range":[42,46],"value":"'bb'"},{"type":"Identifier","range":[47,49],"value":"cc"},{"type":"Punctuator","range":[49,50],"value":":"},{"type":"Numeric","range":[50,51],"value":"3"},{"type":"Punctuator","range":[51,52],"value":"}"},{"type":"Identifier","range":[53,54],"value":"d"},{"type":"String","range":[55,58],"value":"'c'"},{"type":"Punctuator","range":[58,59],"value":":"},{"type":"Numeric","range":[59,60],"value":"2"},{"type":"Punctuator","range":[60,61],"value":"}"},{"type":"Punctuator","range":[61,62],"value":";"},{"type":"Punctuator","range":[62,63],"value":"}"}],
				errors: [{"lineNumber":1,"index":30,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":37,"message":"Unexpected token aa","token":"aa"},{"lineNumber":1,"index":42,"message":"Unexpected token bb","token":"bb"},{"lineNumber":1,"index":52,"message":"Missing expected ','"},{"lineNumber":1,"index":53,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - literal mixed 1', function() {
			var data = { 
				source: "var v = {'a' b:1 'd' c:2};function f() {return {a 'b':1 d 'c':2};}",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,26]},{"type":"VariableDeclarator","range":[4,25]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,25]},{"type":"Property","kind":"init","range":[14,16]},{"type":"Identifier","name":"b","range":[14,14]},{"type":"Literal","range":[15,16],"value":1},{"type":"Property","kind":"init","range":[22,24]},{"type":"Identifier","name":"c","range":[22,22]},{"type":"Literal","range":[23,24],"value":2},{"type":"FunctionDeclaration","range":[26,66]},{"type":"Identifier","name":"f","range":[35,36]},{"type":"BlockStatement","range":[39,66]},{"type":"ReturnStatement","range":[40,65]},{"type":"ObjectExpression","range":[47,64]},{"type":"Property","kind":"init","range":[53,55]},{"type":"Literal","range":[53,53],"value":"b"},{"type":"Literal","range":[54,55],"value":1},{"type":"Property","kind":"init","range":[61,63]},{"type":"Literal","range":[61,61],"value":"c"},{"type":"Literal","range":[62,63],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Numeric","range":[15,16],"value":"1"},{"type":"String","range":[17,20],"value":"'d'"},{"type":"Identifier","range":[21,22],"value":"c"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":"}"},{"type":"Punctuator","range":[25,26],"value":";"},{"type":"Keyword","range":[26,34],"value":"function"},{"type":"Identifier","range":[35,36],"value":"f"},{"type":"Punctuator","range":[36,37],"value":"("},{"type":"Punctuator","range":[37,38],"value":")"},{"type":"Punctuator","range":[39,40],"value":"{"},{"type":"Keyword","range":[40,46],"value":"return"},{"type":"Punctuator","range":[47,48],"value":"{"},{"type":"Identifier","range":[48,49],"value":"a"},{"type":"String","range":[50,53],"value":"'b'"},{"type":"Punctuator","range":[53,54],"value":":"},{"type":"Numeric","range":[54,55],"value":"1"},{"type":"Identifier","range":[56,57],"value":"d"},{"type":"String","range":[58,61],"value":"'c'"},{"type":"Punctuator","range":[61,62],"value":":"},{"type":"Numeric","range":[62,63],"value":"2"},{"type":"Punctuator","range":[63,64],"value":"}"},{"type":"Punctuator","range":[64,65],"value":";"},{"type":"Punctuator","range":[65,66],"value":"}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":16,"message":"Missing expected ','"},{"lineNumber":1,"index":17,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":48,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":55,"message":"Missing expected ','"},{"lineNumber":1,"index":56,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - literal mixed 2', function() {
			var data = { 
				source: "var v = {'a' 'b':1 d c:2};function f() {return {a b:1 'd' 'c':2};}f({a 'b':1 d c:2});",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,26]},{"type":"VariableDeclarator","range":[4,25]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,25]},{"type":"Property","kind":"init","range":[16,18]},{"type":"Literal","range":[16,16],"value":"b"},{"type":"Literal","range":[17,18],"value":1},{"type":"Property","kind":"init","range":[22,24]},{"type":"Identifier","name":"c","range":[22,22]},{"type":"Literal","range":[23,24],"value":2},{"type":"FunctionDeclaration","range":[26,66]},{"type":"Identifier","name":"f","range":[35,36]},{"type":"BlockStatement","range":[39,66]},{"type":"ReturnStatement","range":[40,65]},{"type":"ObjectExpression","range":[47,64]},{"type":"Property","kind":"init","range":[51,53]},{"type":"Identifier","name":"b","range":[51,51]},{"type":"Literal","range":[52,53],"value":1},{"type":"Property","kind":"init","range":[61,63]},{"type":"Literal","range":[61,61],"value":"c"},{"type":"Literal","range":[62,63],"value":2},{"type":"ExpressionStatement","range":[66,85]},{"type":"CallExpression","range":[66,84]},{"type":"Identifier","name":"f","range":[66,67]},{"type":"ObjectExpression","range":[68,83]},{"type":"Property","kind":"init","range":[74,76]},{"type":"Literal","range":[74,74],"value":"b"},{"type":"Literal","range":[75,76],"value":1},{"type":"Property","kind":"init","range":[80,82]},{"type":"Identifier","name":"c","range":[80,80]},{"type":"Literal","range":[81,82],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"String","range":[13,16],"value":"'b'"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"1"},{"type":"Identifier","range":[19,20],"value":"d"},{"type":"Identifier","range":[21,22],"value":"c"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"Numeric","range":[23,24],"value":"2"},{"type":"Punctuator","range":[24,25],"value":"}"},{"type":"Punctuator","range":[25,26],"value":";"},{"type":"Keyword","range":[26,34],"value":"function"},{"type":"Identifier","range":[35,36],"value":"f"},{"type":"Punctuator","range":[36,37],"value":"("},{"type":"Punctuator","range":[37,38],"value":")"},{"type":"Punctuator","range":[39,40],"value":"{"},{"type":"Keyword","range":[40,46],"value":"return"},{"type":"Punctuator","range":[47,48],"value":"{"},{"type":"Identifier","range":[48,49],"value":"a"},{"type":"Identifier","range":[50,51],"value":"b"},{"type":"Punctuator","range":[51,52],"value":":"},{"type":"Numeric","range":[52,53],"value":"1"},{"type":"String","range":[54,57],"value":"'d'"},{"type":"String","range":[58,61],"value":"'c'"},{"type":"Punctuator","range":[61,62],"value":":"},{"type":"Numeric","range":[62,63],"value":"2"},{"type":"Punctuator","range":[63,64],"value":"}"},{"type":"Punctuator","range":[64,65],"value":";"},{"type":"Punctuator","range":[65,66],"value":"}"},{"type":"Identifier","range":[66,67],"value":"f"},{"type":"Punctuator","range":[67,68],"value":"("},{"type":"Punctuator","range":[68,69],"value":"{"},{"type":"Identifier","range":[69,70],"value":"a"},{"type":"String","range":[71,74],"value":"'b'"},{"type":"Punctuator","range":[74,75],"value":":"},{"type":"Numeric","range":[75,76],"value":"1"},{"type":"Identifier","range":[77,78],"value":"d"},{"type":"Identifier","range":[79,80],"value":"c"},{"type":"Punctuator","range":[80,81],"value":":"},{"type":"Numeric","range":[81,82],"value":"2"},{"type":"Punctuator","range":[82,83],"value":"}"},{"type":"Punctuator","range":[83,84],"value":")"},{"type":"Punctuator","range":[84,85],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":18,"message":"Missing expected ','"},{"lineNumber":1,"index":19,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":48,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":53,"message":"Missing expected ','"},{"lineNumber":1,"index":54,"message":"Unexpected token d","token":"d"},{"lineNumber":1,"index":69,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":76,"message":"Missing expected ','"},{"lineNumber":1,"index":77,"message":"Unexpected token d","token":"d"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - literal mixed 3', function() {
			var data = { 
				source: "var v = {'a' b:{cc:3, 'dd':'hey' e} c:2};function f() {return {a 'b':{cc:3, dd:'hey' 'e'} c:2};}f({a b:{'cc':3, dd:'hey' e} c:2});",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,41]},{"type":"VariableDeclarator","range":[4,40]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,40]},{"type":"Property","kind":"init","range":[14,35]},{"type":"Identifier","name":"b","range":[14,14]},{"type":"ObjectExpression","range":[15,35]},{"type":"Property","kind":"init","range":[16,20]},{"type":"Identifier","name":"cc","range":[16,18]},{"type":"Literal","range":[19,20],"value":3},{"type":"Property","kind":"init","range":[22,32]},{"type":"Literal","range":[22,26],"value":"dd"},{"type":"Literal","range":[27,32],"value":"hey"},{"type":"Property","kind":"init","range":[36,39]},{"type":"Identifier","name":"c","range":[36,37]},{"type":"Literal","range":[38,39],"value":2},{"type":"FunctionDeclaration","range":[41,96]},{"type":"Identifier","name":"f","range":[50,51]},{"type":"BlockStatement","range":[54,96]},{"type":"ReturnStatement","range":[55,95]},{"type":"ObjectExpression","range":[62,94]},{"type":"Property","kind":"init","range":[68,89]},{"type":"Literal","range":[68,68],"value":"b"},{"type":"ObjectExpression","range":[69,89]},{"type":"Property","kind":"init","range":[70,74]},{"type":"Identifier","name":"cc","range":[70,72]},{"type":"Literal","range":[73,74],"value":3},{"type":"Property","kind":"init","range":[76,84]},{"type":"Identifier","name":"dd","range":[76,78]},{"type":"Literal","range":[79,84],"value":"hey"},{"type":"Property","kind":"init","range":[90,93]},{"type":"Identifier","name":"c","range":[90,91]},{"type":"Literal","range":[92,93],"value":2},{"type":"ExpressionStatement","range":[96,130]},{"type":"CallExpression","range":[96,129]},{"type":"Identifier","name":"f","range":[96,97]},{"type":"ObjectExpression","range":[98,128]},{"type":"Property","kind":"init","range":[102,123]},{"type":"Identifier","name":"b","range":[102,102]},{"type":"ObjectExpression","range":[103,123]},{"type":"Property","kind":"init","range":[104,110]},{"type":"Literal","range":[104,108],"value":"cc"},{"type":"Literal","range":[109,110],"value":3},{"type":"Property","kind":"init","range":[112,120]},{"type":"Identifier","name":"dd","range":[112,114]},{"type":"Literal","range":[115,120],"value":"hey"},{"type":"Property","kind":"init","range":[124,127]},{"type":"Identifier","name":"c","range":[124,125]},{"type":"Literal","range":[126,127],"value":2}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"String","range":[9,12],"value":"'a'"},{"type":"Identifier","range":[13,14],"value":"b"},{"type":"Punctuator","range":[14,15],"value":":"},{"type":"Punctuator","range":[15,16],"value":"{"},{"type":"Identifier","range":[16,18],"value":"cc"},{"type":"Punctuator","range":[18,19],"value":":"},{"type":"Numeric","range":[19,20],"value":"3"},{"type":"Punctuator","range":[20,21],"value":","},{"type":"String","range":[22,26],"value":"'dd'"},{"type":"Punctuator","range":[26,27],"value":":"},{"type":"String","range":[27,32],"value":"'hey'"},{"type":"Identifier","range":[33,34],"value":"e"},{"type":"Punctuator","range":[34,35],"value":"}"},{"type":"Identifier","range":[36,37],"value":"c"},{"type":"Punctuator","range":[37,38],"value":":"},{"type":"Numeric","range":[38,39],"value":"2"},{"type":"Punctuator","range":[39,40],"value":"}"},{"type":"Punctuator","range":[40,41],"value":";"},{"type":"Keyword","range":[41,49],"value":"function"},{"type":"Identifier","range":[50,51],"value":"f"},{"type":"Punctuator","range":[51,52],"value":"("},{"type":"Punctuator","range":[52,53],"value":")"},{"type":"Punctuator","range":[54,55],"value":"{"},{"type":"Keyword","range":[55,61],"value":"return"},{"type":"Punctuator","range":[62,63],"value":"{"},{"type":"Identifier","range":[63,64],"value":"a"},{"type":"String","range":[65,68],"value":"'b'"},{"type":"Punctuator","range":[68,69],"value":":"},{"type":"Punctuator","range":[69,70],"value":"{"},{"type":"Identifier","range":[70,72],"value":"cc"},{"type":"Punctuator","range":[72,73],"value":":"},{"type":"Numeric","range":[73,74],"value":"3"},{"type":"Punctuator","range":[74,75],"value":","},{"type":"Identifier","range":[76,78],"value":"dd"},{"type":"Punctuator","range":[78,79],"value":":"},{"type":"String","range":[79,84],"value":"'hey'"},{"type":"String","range":[85,88],"value":"'e'"},{"type":"Punctuator","range":[88,89],"value":"}"},{"type":"Identifier","range":[90,91],"value":"c"},{"type":"Punctuator","range":[91,92],"value":":"},{"type":"Numeric","range":[92,93],"value":"2"},{"type":"Punctuator","range":[93,94],"value":"}"},{"type":"Punctuator","range":[94,95],"value":";"},{"type":"Punctuator","range":[95,96],"value":"}"},{"type":"Identifier","range":[96,97],"value":"f"},{"type":"Punctuator","range":[97,98],"value":"("},{"type":"Punctuator","range":[98,99],"value":"{"},{"type":"Identifier","range":[99,100],"value":"a"},{"type":"Identifier","range":[101,102],"value":"b"},{"type":"Punctuator","range":[102,103],"value":":"},{"type":"Punctuator","range":[103,104],"value":"{"},{"type":"String","range":[104,108],"value":"'cc'"},{"type":"Punctuator","range":[108,109],"value":":"},{"type":"Numeric","range":[109,110],"value":"3"},{"type":"Punctuator","range":[110,111],"value":","},{"type":"Identifier","range":[112,114],"value":"dd"},{"type":"Punctuator","range":[114,115],"value":":"},{"type":"String","range":[115,120],"value":"'hey'"},{"type":"Identifier","range":[121,122],"value":"e"},{"type":"Punctuator","range":[122,123],"value":"}"},{"type":"Identifier","range":[124,125],"value":"c"},{"type":"Punctuator","range":[125,126],"value":":"},{"type":"Numeric","range":[126,127],"value":"2"},{"type":"Punctuator","range":[127,128],"value":"}"},{"type":"Punctuator","range":[128,129],"value":")"},{"type":"Punctuator","range":[129,130],"value":";"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":32,"message":"Missing expected ','"},{"lineNumber":1,"index":33,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":35,"message":"Missing expected ','"},{"lineNumber":1,"index":63,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":84,"message":"Missing expected ','"},{"lineNumber":1,"index":85,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":89,"message":"Missing expected ','"},{"lineNumber":1,"index":99,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":120,"message":"Missing expected ','"},{"lineNumber":1,"index":121,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":123,"message":"Missing expected ','"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - broken literal 1', function() {
			var data = {
				source: 'require({baseUrl: "../../../",paths: {foo/bar": "foo/bar"   // note missing " in obj key}});',
				nodes: [{"type":"ExpressionStatement","range":[0,92]},{"type":"CallExpression","range":[0,91]},{"type":"Identifier","name":"require","range":[0,7]},{"type":"ObjectExpression","range":[8,90]},{"type":"Property","kind":"init","range":[9,29]},{"type":"Identifier","name":"baseUrl","range":[9,16]},{"type":"Literal","range":[18,29],"value":"../../../"},{"type":"Property","kind":"init","range":[30,89]},{"type":"Identifier","name":"paths","range":[30,35]},{"type":"ObjectExpression","range":[37,89]}],
				tokens: [{"type":"Identifier","range":[0,7],"value":"require"},{"type":"Punctuator","range":[7,8],"value":"("},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,16],"value":"baseUrl"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"String","range":[18,29],"value":"\"../../../\""},{"type":"Punctuator","range":[29,30],"value":","},{"type":"Identifier","range":[30,35],"value":"paths"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"Punctuator","range":[37,38],"value":"{"},{"type":"Identifier","range":[38,41],"value":"foo"},{"type":"Punctuator","range":[41,42],"value":"/"},{"type":"Identifier","range":[42,45],"value":"bar"},{"type":"String","range":[45,49],"value":"\": \""},{"type":"Identifier","range":[49,52],"value":"foo"},{"type":"Punctuator","range":[52,53],"value":"/"},{"type":"Identifier","range":[53,56],"value":"bar"},{"type":"String","range":[56,77],"value":"\"   // note missing \""},{"type":"Keyword","range":[78,80],"value":"in"},{"type":"Identifier","range":[81,84],"value":"obj"},{"type":"Identifier","range":[85,88],"value":"key"},{"type":"Punctuator","range":[88,89],"value":"}"},{"type":"Punctuator","range":[89,90],"value":"}"},{"type":"Punctuator","range":[90,91],"value":")"},{"type":"Punctuator","range":[91,92],"value":";"}],
				errors: [{"lineNumber":1,"index":38,"message":"Unexpected token foo","token":"foo"}]
			};
			runTest(data);
		});
		
		it('obj prop recovery - broken property 1', function() {
			var data = {
				source: 'require({, paths: {foo/bar": "foo/bar",}});',
				nodes: [{"type":"ExpressionStatement","range":[0,9]},{"type":"ExpressionStatement","range":[9,11]},{"type":"LabeledStatement","range":[11,43]},{"type":"Identifier","name":"paths","range":[11,16]},{"type":"BlockStatement","range":[18,43]},{"type":"ExpressionStatement","range":[19,26]},{"type":"BinaryExpression","range":[19,26]},{"type":"Identifier","name":"foo","range":[19,22]},{"type":"Identifier","name":"bar","range":[23,26]},{"type":"ExpressionStatement","range":[26,30]},{"type":"Literal","range":[26,30],"value":": "},{"type":"ExpressionStatement","range":[30,37]},{"type":"BinaryExpression","range":[30,37]},{"type":"Identifier","name":"foo","range":[30,33]},{"type":"Identifier","name":"bar","range":[34,37]},{"type":"ExpressionStatement","range":[37,43]},{"type":"Literal","range":[37,43],"value":",}});"}],
				tokens: [{"type":"Identifier","range":[0,7],"value":"require"},{"type":"Punctuator","range":[7,8],"value":"("},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Punctuator","range":[9,10],"value":","},{"type":"Identifier","range":[11,16],"value":"paths"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Punctuator","range":[18,19],"value":"{"},{"type":"Identifier","range":[19,22],"value":"foo"},{"type":"Punctuator","range":[22,23],"value":"/"},{"type":"Identifier","range":[23,26],"value":"bar"},{"type":"String","range":[26,30],"value":"\": \""},{"type":"Identifier","range":[30,33],"value":"foo"},{"type":"Punctuator","range":[33,34],"value":"/"},{"type":"Identifier","range":[34,37],"value":"bar"},{"type":"String","range":[37,43],"value":"\",}});"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token ,","token":","},{"lineNumber":1,"index":11,"message":"Unexpected identifier","token":"paths"},{"lineNumber":1,"index":26,"message":"Unexpected string","token":": "},{"lineNumber":1,"index":30,"message":"Unexpected identifier","token":"foo"},{"lineNumber":1,"index":43,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":37,"message":"Unexpected string","token":",}});"},{"lineNumber":1,"index":43,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});

		it('dangling string terminator with CR', function() {
			var data = {
				source: 'bar": "foobar",\r\nqux": "foobar"\r\n '
			};
			runTest(data);
		});
		
		it('string literal recovery 1', function() {
			var data = {
				source: 'var f = "busted',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,15]},{"type":"VariableDeclarator","range":[4,15]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"Literal","range":[8,15],"value":"busted"}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"String","range":[8,15],"value":"\"busted"}],
				errors: [{"lineNumber":1,"index":15,"message":"Unexpected token ILLEGAL"}]
			};
			runTest(data);
		});
		
		it('string literal recovery 2', function() {
			if(Util.isWindows) {
				runTest({
					source: 'var f = "busted\r\nvar o = {};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,17]},{"type":"VariableDeclarator","range":[4,16]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"Literal","range":[8,16],"value":"busted"},{"type":"VariableDeclaration","kind":"var","range":[17,28]},{"type":"VariableDeclarator","range":[21,27]},{"type":"Identifier","name":"o","range":[21,22]},{"type":"ObjectExpression","range":[25,27]}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"String","range":[8,16],"value":"\"busted\r"},{"type":"Keyword","range":[17,20],"value":"var"},{"type":"Identifier","range":[21,22],"value":"o"},{"type":"Punctuator","range":[23,24],"value":"="},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Punctuator","range":[26,27],"value":"}"},{"type":"Punctuator","range":[27,28],"value":";"}],
					errors: [{"lineNumber":1,"index":16,"message":"Unexpected token ILLEGAL"}]
				});
			} else {
				runTest({
					source: 'var f = "busted\nvar o = {};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,15]},{"type":"VariableDeclarator","range":[4,16]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"Literal","range":[8,16],"value":"busted"},{"type":"VariableDeclaration","kind":"var","range":[16,27]},{"type":"VariableDeclarator","range":[20,26]},{"type":"Identifier","name":"o","range":[20,21]},{"type":"ObjectExpression","range":[24,26]}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"String","range":[8,16],"value":"\"busted\n"},{"type":"Keyword","range":[16,19],"value":"var"},{"type":"Keyword","range":[16,19],"value":"var"},{"type":"Identifier","range":[20,21],"value":"o"},{"type":"Punctuator","range":[22,23],"value":"="},{"type":"Punctuator","range":[24,25],"value":"{"},{"type":"Punctuator","range":[25,26],"value":"}"},{"type":"Punctuator","range":[26,27],"value":";"}],
					errors: [{"lineNumber":1,"index":16,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":16,"message":"Unexpected token var","token":"var"}]
				});
			}
		});
		
		it('string literal recovery 3', function() {
			var data = {
				source: 'var f = {one: "busted};',
				nodes: [],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"String","range":[14,23],"value":"\"busted};"}],
				errors: [{"lineNumber":1,"index":23,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":23,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		
		it('string literal recovery 4', function() {
			if(Util.isWindows) {
				runTest({
					source:  'var f = {one: "busted\r\n};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,25]},{"type":"VariableDeclarator","range":[4,24]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,24]},{"type":"Property","kind":"init","range":[9,22]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"Literal","range":[14,22],"value":"busted"}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"String","range":[14,22],"value":"\"busted\r"},{"type":"Punctuator","range":[23,24],"value":"}"},{"type":"Punctuator","range":[24,25],"value":";"}],
					errors: [{"lineNumber":1,"index":22,"message":"Unexpected token ILLEGAL"}]
				});
			} else {
				runTest({
					source: 'var f = {one: "busted\n};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,24]},{"type":"VariableDeclarator","range":[4,23]},{"type":"Identifier","name":"f","range":[4,5]},{"type":"ObjectExpression","range":[8,23]},{"type":"Property","kind":"init","range":[9,22]},{"type":"Identifier","name":"one","range":[9,12]},{"type":"Literal","range":[14,22],"value":"busted"}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"f"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,12],"value":"one"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"String","range":[14,22],"value":"\"busted\n"},{"type":"Punctuator","range":[22,23],"value":"}"},{"type":"Punctuator","range":[23,24],"value":";"}],
					errors: [{"lineNumber":1,"index":22,"message":"Unexpected token ILLEGAL"}]
				});
			}
			
		});
		
		it('string literal recovery 5', function() {
			var data = {
				source: 'var o = {}; o["busted]',
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,11]},{"type":"VariableDeclarator","range":[4,10]},{"type":"Identifier","name":"o","range":[4,5]},{"type":"ObjectExpression","range":[8,10]},{"type":"ExpressionStatement","range":[12,22]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"o"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Punctuator","range":[9,10],"value":"}"},{"type":"Punctuator","range":[10,11],"value":";"},{"type":"Identifier","range":[12,13],"value":"o"},{"type":"Punctuator","range":[13,14],"value":"["},{"type":"String","range":[14,22],"value":"\"busted]"}],
				errors: [{"lineNumber":1,"index":22,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":22,"message":"Unexpected end of input"}]
			};
			runTest(data);
		});
		
		it('string literal recovery 6', function() {
			if(Util.isWindows) {
				runTest({
					source: 'var o = {}; o["busted]\r\nvar f = {};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,11]},{"type":"VariableDeclarator","range":[4,10]},{"type":"Identifier","name":"o","range":[4,5]},{"type":"ObjectExpression","range":[8,10]},{"type":"ExpressionStatement","range":[12,23]},{"type":"VariableDeclaration","kind":"var","range":[24,35]},{"type":"VariableDeclarator","range":[28,34]},{"type":"Identifier","name":"f","range":[28,29]},{"type":"ObjectExpression","range":[32,34]}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"o"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Punctuator","range":[9,10],"value":"}"},{"type":"Punctuator","range":[10,11],"value":";"},{"type":"Identifier","range":[12,13],"value":"o"},{"type":"Punctuator","range":[13,14],"value":"["},{"type":"String","range":[14,23],"value":"\"busted]\r"},{"type":"Keyword","range":[24,27],"value":"var"},{"type":"Identifier","range":[28,29],"value":"f"},{"type":"Keyword","range":[24,27],"value":"var"},{"type":"Identifier","range":[28,29],"value":"f"},{"type":"Punctuator","range":[30,31],"value":"="},{"type":"Punctuator","range":[32,33],"value":"{"},{"type":"Punctuator","range":[33,34],"value":"}"},{"type":"Punctuator","range":[34,35],"value":";"}],
					errors: [{"lineNumber":1,"index":23,"message":"Unexpected token ILLEGAL"},{"lineNumber":2,"index":24,"message":"Unexpected token var","token":"var"},{"lineNumber":2,"index":28,"message":"Unexpected identifier","token":"f"}]
				});
			} else {
				runTest({
					source: 'var o = {}; o["busted]\nvar f = {};',
					nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,11]},{"type":"VariableDeclarator","range":[4,10]},{"type":"Identifier","name":"o","range":[4,5]},{"type":"ObjectExpression","range":[8,10]},{"type":"ExpressionStatement","range":[12,22]},{"type":"VariableDeclaration","kind":"var","range":[23,34]},{"type":"VariableDeclarator","range":[27,33]},{"type":"Identifier","name":"f","range":[27,28]},{"type":"ObjectExpression","range":[31,33]}],
					tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"o"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Punctuator","range":[9,10],"value":"}"},{"type":"Punctuator","range":[10,11],"value":";"},{"type":"Identifier","range":[12,13],"value":"o"},{"type":"Punctuator","range":[13,14],"value":"["},{"type":"String","range":[14,23],"value":"\"busted]\n"},{"type":"Keyword","range":[23,26],"value":"var"},{"type":"Identifier","range":[27,28],"value":"f"},{"type":"Keyword","range":[23,26],"value":"var"},{"type":"Identifier","range":[27,28],"value":"f"},{"type":"Punctuator","range":[29,30],"value":"="},{"type":"Punctuator","range":[31,32],"value":"{"},{"type":"Punctuator","range":[32,33],"value":"}"},{"type":"Punctuator","range":[33,34],"value":";"}],
					errors: [{"lineNumber":1,"index":23,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":23,"message":"Unexpected token var","token":"var"},{"lineNumber":1,"index":27,"message":"Unexpected identifier","token":"f"}]
				});
			}
		});
		
		it('escaped literal recovery 1', function() {
			runTest({
				source: "function f() {	return {b:{	cc:3, dd:''hey\\'' e}c:2};}",
				nodes: [{"type":"FunctionDeclaration","range":[0,42]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,42]},{"type":"ReturnStatement","range":[15,42]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[15,21],"value":"return"},{"type":"Punctuator","range":[22,23],"value":"{"},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[27,29],"value":"cc"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"3"},{"type":"Punctuator","range":[31,32],"value":","},{"type":"Identifier","range":[33,35],"value":"dd"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"String","range":[36,38],"value":"''"}],
				errors: [{"lineNumber":1,"index":42,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":36,"message":"Unexpected string","token":""}]
			});
		});
		
		it('escaped literal recovery 2', function() {
			runTest({
				source: "function f() {	return {b:{	cc:3, dd:hey\\'' e}c:2};}",
				nodes: [{"type":"FunctionDeclaration","range":[0,40]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,40]},{"type":"ReturnStatement","range":[15,40]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[15,21],"value":"return"},{"type":"Punctuator","range":[22,23],"value":"{"},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[27,29],"value":"cc"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"3"},{"type":"Punctuator","range":[31,32],"value":","},{"type":"Identifier","range":[33,35],"value":"dd"},{"type":"Punctuator","range":[35,36],"value":":"}],
				errors: [{"lineNumber":1,"index":35,"message":"Unexpected token :","token":":"},{"lineNumber":1,"index":40,"message":"Unexpected token ILLEGAL"}]
			});
		});
		
		it('escaped literal recovery 3', function() {
			runTest({
				source: "function f() {	return {b:{	cc:3, dd:hey\\' e}c:2};}",
				nodes: [{"type":"FunctionDeclaration","range":[0,40]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,40]},{"type":"ReturnStatement","range":[15,40]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[15,21],"value":"return"},{"type":"Punctuator","range":[22,23],"value":"{"},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[27,29],"value":"cc"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"3"},{"type":"Punctuator","range":[31,32],"value":","},{"type":"Identifier","range":[33,35],"value":"dd"},{"type":"Punctuator","range":[35,36],"value":":"}],
				errors: [{"lineNumber":1,"index":35,"message":"Unexpected token :","token":":"},{"lineNumber":1,"index":40,"message":"Unexpected token ILLEGAL"}]
			});
		});
		
		it('escaped literal recovery 4', function() {
			runTest({
				source: "function f() {	return {b:{	cc:3, dd:'hey\\' e}c:2};}",
				nodes: [{"type":"FunctionDeclaration","range":[0,51]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,51]},{"type":"ReturnStatement","range":[15,51]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Keyword","range":[15,21],"value":"return"},{"type":"Punctuator","range":[22,23],"value":"{"},{"type":"Identifier","range":[23,24],"value":"b"},{"type":"Punctuator","range":[24,25],"value":":"},{"type":"Punctuator","range":[25,26],"value":"{"},{"type":"Identifier","range":[27,29],"value":"cc"},{"type":"Punctuator","range":[29,30],"value":":"},{"type":"Numeric","range":[30,31],"value":"3"},{"type":"Punctuator","range":[31,32],"value":","},{"type":"Identifier","range":[33,35],"value":"dd"},{"type":"Punctuator","range":[35,36],"value":":"},{"type":"String","range":[36,51],"value":"'hey\\' e}c:2};}"}],
				errors: [{"lineNumber":1,"index":51,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":51,"message":"Unexpected end of input"}]
			});
		});
		
		it('escaped literal recovery 5', function() {
			runTest({
				source: "var v = {a b:{cc:3, dd:'hey' e} c:2};function f() {return {a b:{cc:3, dd:hey\\' e} c:2};}",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[12,31]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"ObjectExpression","range":[13,31]},{"type":"Property","kind":"init","range":[14,18]},{"type":"Identifier","name":"cc","range":[14,16]},{"type":"Literal","range":[17,18],"value":3},{"type":"Property","kind":"init","range":[20,28]},{"type":"Identifier","name":"dd","range":[20,22]},{"type":"Literal","range":[23,28],"value":"hey"},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2},{"type":"FunctionDeclaration","range":[37,77]},{"type":"Identifier","name":"f","range":[46,47]},{"type":"BlockStatement","range":[50,77]},{"type":"ReturnStatement","range":[51,77]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"String","range":[23,28],"value":"'hey'"},{"type":"Identifier","range":[29,30],"value":"e"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"},{"type":"Keyword","range":[37,45],"value":"function"},{"type":"Identifier","range":[46,47],"value":"f"},{"type":"Punctuator","range":[47,48],"value":"("},{"type":"Punctuator","range":[48,49],"value":")"},{"type":"Punctuator","range":[50,51],"value":"{"},{"type":"Keyword","range":[51,57],"value":"return"},{"type":"Punctuator","range":[58,59],"value":"{"},{"type":"Identifier","range":[59,60],"value":"a"},{"type":"Identifier","range":[61,62],"value":"b"},{"type":"Punctuator","range":[62,63],"value":":"},{"type":"Punctuator","range":[63,64],"value":"{"},{"type":"Identifier","range":[64,66],"value":"cc"},{"type":"Punctuator","range":[66,67],"value":":"},{"type":"Numeric","range":[67,68],"value":"3"},{"type":"Punctuator","range":[68,69],"value":","},{"type":"Identifier","range":[70,72],"value":"dd"},{"type":"Punctuator","range":[72,73],"value":":"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":31,"message":"Missing expected ','"},{"lineNumber":1,"index":59,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":72,"message":"Unexpected token :","token":":"},{"lineNumber":1,"index":77,"message":"Unexpected token ILLEGAL"}]
			});
		});
		
		it('escaped literal recovery 6', function() {
			runTest({
				source: "var v = {a b:{cc:3, dd:'hey' e} c:2};function f() {return {a b:{cc:3, dd:'hey\\' e} c:2};}",
				nodes: [{"type":"VariableDeclaration","kind":"var","range":[0,37]},{"type":"VariableDeclarator","range":[4,36]},{"type":"Identifier","name":"v","range":[4,5]},{"type":"ObjectExpression","range":[8,36]},{"type":"Property","kind":"init","range":[12,31]},{"type":"Identifier","name":"b","range":[12,12]},{"type":"ObjectExpression","range":[13,31]},{"type":"Property","kind":"init","range":[14,18]},{"type":"Identifier","name":"cc","range":[14,16]},{"type":"Literal","range":[17,18],"value":3},{"type":"Property","kind":"init","range":[20,28]},{"type":"Identifier","name":"dd","range":[20,22]},{"type":"Literal","range":[23,28],"value":"hey"},{"type":"Property","kind":"init","range":[32,35]},{"type":"Identifier","name":"c","range":[32,33]},{"type":"Literal","range":[34,35],"value":2},{"type":"FunctionDeclaration","range":[37,89]},{"type":"Identifier","name":"f","range":[46,47]},{"type":"BlockStatement","range":[50,89]},{"type":"ReturnStatement","range":[51,89]}],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"},{"type":"String","range":[23,28],"value":"'hey'"},{"type":"Identifier","range":[29,30],"value":"e"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"Identifier","range":[32,33],"value":"c"},{"type":"Punctuator","range":[33,34],"value":":"},{"type":"Numeric","range":[34,35],"value":"2"},{"type":"Punctuator","range":[35,36],"value":"}"},{"type":"Punctuator","range":[36,37],"value":";"},{"type":"Keyword","range":[37,45],"value":"function"},{"type":"Identifier","range":[46,47],"value":"f"},{"type":"Punctuator","range":[47,48],"value":"("},{"type":"Punctuator","range":[48,49],"value":")"},{"type":"Punctuator","range":[50,51],"value":"{"},{"type":"Keyword","range":[51,57],"value":"return"},{"type":"Punctuator","range":[58,59],"value":"{"},{"type":"Identifier","range":[59,60],"value":"a"},{"type":"Identifier","range":[61,62],"value":"b"},{"type":"Punctuator","range":[62,63],"value":":"},{"type":"Punctuator","range":[63,64],"value":"{"},{"type":"Identifier","range":[64,66],"value":"cc"},{"type":"Punctuator","range":[66,67],"value":":"},{"type":"Numeric","range":[67,68],"value":"3"},{"type":"Punctuator","range":[68,69],"value":","},{"type":"Identifier","range":[70,72],"value":"dd"},{"type":"Punctuator","range":[72,73],"value":":"},{"type":"String","range":[73,89],"value":"'hey\\' e} c:2};}"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":28,"message":"Missing expected ','"},{"lineNumber":1,"index":29,"message":"Unexpected token e","token":"e"},{"lineNumber":1,"index":31,"message":"Missing expected ','"},{"lineNumber":1,"index":59,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":89,"message":"Unexpected token ILLEGAL"},{"lineNumber":1,"index":89,"message":"Unexpected end of input"}]
			});
		});
		
		it('escaped literal recovery 7', function() {
			runTest({
				source: "var v = {a b:{cc:3, dd:\\'hey' e} c:2};function f() {return {a b:{cc:3, dd:hey\\' e} c:2};}",
				nodes: [],
				tokens: [{"type":"Keyword","range":[0,3],"value":"var"},{"type":"Identifier","range":[4,5],"value":"v"},{"type":"Punctuator","range":[6,7],"value":"="},{"type":"Punctuator","range":[8,9],"value":"{"},{"type":"Identifier","range":[9,10],"value":"a"},{"type":"Identifier","range":[11,12],"value":"b"},{"type":"Punctuator","range":[12,13],"value":":"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Identifier","range":[14,16],"value":"cc"},{"type":"Punctuator","range":[16,17],"value":":"},{"type":"Numeric","range":[17,18],"value":"3"},{"type":"Punctuator","range":[18,19],"value":","},{"type":"Identifier","range":[20,22],"value":"dd"},{"type":"Punctuator","range":[22,23],"value":":"}],
				errors: [{"lineNumber":1,"index":9,"message":"Unexpected token a","token":"a"},{"lineNumber":1,"index":22,"message":"Unexpected token :","token":":"}]
			});
		});
		
		// ARGUMENT RECOVERY
		it('argument recovery 1', function() {
			runTest({
				source: "function f() {} f(\"1\" \"2\");",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,27]},{"type":"CallExpression","range":[16,26]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"Literal","range":[18,21],"value":"1"},{"type":"Literal","range":[22,25],"value":"2"}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"String","range":[18,21],"value":"\"1\""},{"type":"String","range":[22,25],"value":"\"2\""},{"type":"Punctuator","range":[25,26],"value":")"},{"type":"Punctuator","range":[26,27],"value":";"}],
				errors: [{"lineNumber":1,"index":21,"message":"Missing expected ','"}]
			});
		});
		
		it('argument recovery 2', function() {
			runTest({
				source: "function f() {} f(function() {} \"2\");",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,37]},{"type":"CallExpression","range":[16,36]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"FunctionExpression","range":[18,31]},{"type":"BlockStatement","range":[29,31]},{"type":"Literal","range":[32,35],"value":"2"}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Keyword","range":[18,26],"value":"function"},{"type":"Punctuator","range":[26,27],"value":"("},{"type":"Punctuator","range":[27,28],"value":")"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"String","range":[32,35],"value":"\"2\""},{"type":"Punctuator","range":[35,36],"value":")"},{"type":"Punctuator","range":[36,37],"value":";"}],
				errors: [{"lineNumber":1,"index":31,"message":"Missing expected ','"}]
			});
		});
		
		it('argument recovery 3', function() {
			runTest({
				source: "function f() {} f(function() {} \"2\" three);",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,43]},{"type":"CallExpression","range":[16,42]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"FunctionExpression","range":[18,31]},{"type":"BlockStatement","range":[29,31]},{"type":"Literal","range":[32,35],"value":"2"},{"type":"Identifier","name":"three","range":[36,41]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Keyword","range":[18,26],"value":"function"},{"type":"Punctuator","range":[26,27],"value":"("},{"type":"Punctuator","range":[27,28],"value":")"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"String","range":[32,35],"value":"\"2\""},{"type":"Identifier","range":[36,41],"value":"three"},{"type":"Punctuator","range":[41,42],"value":")"},{"type":"Punctuator","range":[42,43],"value":";"}],
				errors: [{"lineNumber":1,"index":31,"message":"Missing expected ','"},{"lineNumber":1,"index":35,"message":"Missing expected ','"}]
			});
		});
		
		it('argument recovery 4', function() {
			runTest({
				source: "function f() {} f(function() {} \"2\", three);",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,44]},{"type":"CallExpression","range":[16,43]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"FunctionExpression","range":[18,31]},{"type":"BlockStatement","range":[29,31]},{"type":"Literal","range":[32,35],"value":"2"},{"type":"Identifier","name":"three","range":[37,42]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Keyword","range":[18,26],"value":"function"},{"type":"Punctuator","range":[26,27],"value":"("},{"type":"Punctuator","range":[27,28],"value":")"},{"type":"Punctuator","range":[29,30],"value":"{"},{"type":"Punctuator","range":[30,31],"value":"}"},{"type":"String","range":[32,35],"value":"\"2\""},{"type":"Punctuator","range":[35,36],"value":","},{"type":"Identifier","range":[37,42],"value":"three"},{"type":"Punctuator","range":[42,43],"value":")"},{"type":"Punctuator","range":[43,44],"value":";"}],
				errors: [{"lineNumber":1,"index":31,"message":"Missing expected ','"}]
			});
		});
		
		it('argument recovery 5', function() {
			runTest({
				source: "function f() {} f(d(one two three) \"2\", three);",
				nodes: [{"type":"FunctionDeclaration","range":[0,15]},{"type":"Identifier","name":"f","range":[9,10]},{"type":"BlockStatement","range":[13,15]},{"type":"ExpressionStatement","range":[16,47]},{"type":"CallExpression","range":[16,46]},{"type":"Identifier","name":"f","range":[16,17]},{"type":"CallExpression","range":[18,34]},{"type":"Identifier","name":"d","range":[18,19]},{"type":"Identifier","name":"one","range":[20,23]},{"type":"Identifier","name":"two","range":[24,27]},{"type":"Identifier","name":"three","range":[28,33]},{"type":"Literal","range":[35,38],"value":"2"},{"type":"Identifier","name":"three","range":[40,45]}],
				tokens: [{"type":"Keyword","range":[0,8],"value":"function"},{"type":"Identifier","range":[9,10],"value":"f"},{"type":"Punctuator","range":[10,11],"value":"("},{"type":"Punctuator","range":[11,12],"value":")"},{"type":"Punctuator","range":[13,14],"value":"{"},{"type":"Punctuator","range":[14,15],"value":"}"},{"type":"Identifier","range":[16,17],"value":"f"},{"type":"Punctuator","range":[17,18],"value":"("},{"type":"Identifier","range":[18,19],"value":"d"},{"type":"Punctuator","range":[19,20],"value":"("},{"type":"Identifier","range":[20,23],"value":"one"},{"type":"Identifier","range":[24,27],"value":"two"},{"type":"Identifier","range":[28,33],"value":"three"},{"type":"Punctuator","range":[33,34],"value":")"},{"type":"String","range":[35,38],"value":"\"2\""},{"type":"Punctuator","range":[38,39],"value":","},{"type":"Identifier","range":[40,45],"value":"three"},{"type":"Punctuator","range":[45,46],"value":")"},{"type":"Punctuator","range":[46,47],"value":";"}],
				errors: [{"lineNumber":1,"index":23,"message":"Missing expected ','"},{"lineNumber":1,"index":27,"message":"Missing expected ','"},{"lineNumber":1,"index":34,"message":"Missing expected ','"}]
			});
		});
		
		it('no infinite loop 1', function() {
			runTest({
				source: "f({p: function(errors) {if(/^U/.test('')) {error.token = ast.tokens[token.index>0index-1]}}});",
			});
		});
	});
});
