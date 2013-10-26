/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * Copyright (c) 2013 IBM Corporation.
 *
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andrew Eisenberg (VMware) - initial API and implementation
 *     Manu Sridharan (IBM) - Various improvements
 ******************************************************************************/

/*global define esprima console setTimeout doctrine*/
define(["plugins/esprima/typesFromIndexFile", "plugins/esprima/typeEnvironment", "orion/assert"], function(mTypes, typeEnv, assert) {

	//////////////////////////////////////////////////////////
	// helpers
	//////////////////////////////////////////////////////////

	function testSig(ternSig, closureSig, constructorName) {
		assert.equal(mTypes.ternSig2ClosureSig(ternSig, constructorName), closureSig, "Bad conversion");
	}
	
	function testType(type, name, expectedTypeInfo) {
		var result = mTypes.parseType(type, name);
		assert.equal(JSON.stringify(result.typeInfo), JSON.stringify(expectedTypeInfo), "Bad parse");
	}
	
	function makeEnvironmentOptionsFromIndex(indexDataArr) {
		var options = {};
		options.buffer = "";
		options.uid = "0";
		options.indexData = indexDataArr;
		return options;
	}
	
	function checkEnvironment(indexData, cb) {
		var options = makeEnvironmentOptionsFromIndex([indexData]);
		var envPromise = typeEnv.createEnvironment(options);
		var result = envPromise.then(cb);
		return result;	
	}
	
	//////////////////////////////////////////////////////////
	// tests
	//////////////////////////////////////////////////////////

	var tests = {};

	tests["test basic 1"] = function() {
		testSig("fn() -> String", "function():String");
	};

	tests["test basic 2"] = function() {
		testSig("fn(m: Number, n?: Number) -> Boolean", "function(m:Number,n:Number=):Boolean");
	};
	
	tests["test constructor 1"] = function() {
		// TODO is this really right?  comma after Fizz?
		testSig("fn()", "function(new:Fizz):Fizz", "Fizz");
	};
	
	tests["test array of functions"] = function() {
		testSig("fn() -> [fn()]", "function():Array");
	};
	tests["test callback"] = function() {
		testSig("fn(cb: fn(x: Object) -> Object) -> Number", "function(cb:function(x:Object):Object):Number");
	};

	tests["test callback 2"] = function() {
		testSig("fn(cb: fn(x: Object) -> Object) -> fn(y: Object) -> Object", 
				"function(cb:function(x:Object):Object):function(y:Object):Object");
	};

	tests["test callback 3"] = function() {
		testSig("fn(cb: fn(x: Object) -> fn(z: Object) -> Object, cb2: fn(p: Object) -> String) -> fn(y: Object) -> Object", 
				"function(cb:function(x:Object):function(z:Object):Object,cb2:function(p:Object):String):function(y:Object):Object");
	};

	tests["test type 1"] = function() {
		var type = {
			fizz: "String",
			bazz: "Number"
		};
		var expected = {
			"Foo": {
				"fizz": {
					"_typeObj": {
						"type": "NameExpression",
						"name": "String"
					}
				},
				"bazz": {
					"_typeObj": {
						"type": "NameExpression",
						"name": "Number"
					}
				},
				"$$isBuiltin": true
			}
		};
		testType(type, "Foo", expected);
	};
	
	tests["test type reference with dot"] = function() {
		var type = {
			foo: "+x.OtherType"
		};
		var expected = {
			"Foo": {
				"foo": {
					"_typeObj": {
						"type": "NameExpression",
						"name": "x..OtherType..prototype"
					}
				},
				"$$isBuiltin": true
			}
		};
		testType(type, "Foo", expected);
	};
	
	tests["test environment basic"] = function() {
		var index = {
			bizz: "String"
		};
		return checkEnvironment(index, function (env) {
			assert.equal("String", env.lookupTypeObj("bizz").name, "bad environment");
		});
	};
	
	tests["test environment prototype"] = function() {
		var index = {
			Fizz: {
				"!type": "fn(p:String)",
				prototype: {
					x: "String"
				}
			},
			Buzz: {
				"!type": "fn(p:String)",
				prototype: {
					"!proto": "Fizz.prototype",
					y: "String"
				}
			}
		};
		return checkEnvironment(index, function (env) {
			assert.equal("String", env.lookupTypeObj("x", "Fizz..prototype").name, "bad environment");
		});
	};
	
	tests["test top-level dot"] = function() {
		var index = {
			Fizz: "foo.bazz"
		};
		return checkEnvironment(index, function (env) {
			assert.equal("foo..bazz", env.lookupTypeObj("Fizz").name, "bad environment");
		});
	};
	return tests;
});
