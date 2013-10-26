/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation.
 *
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Manu Sridharan (IBM) - Initial API and implementation
 ******************************************************************************/
 
 
/**
 * This module was used to create index file versions of the type specifications
 * from types.js.  It is currently unused, but kept around in case the code again
 * becomes useful in the future.
 */

/*global define console */
define("plugins/esprima/serializer", ["plugins/esprima/typeUtils"], function (typeUtils) {

	/**
	 * note all the named types referenced by typeObj in the referencedTypes object
	 */
	function collectReferencedTypes(typeObj, globalObjName) {
		switch (typeObj.type) {
		case "NameExpression":
			if (typeObj.name !== globalObjName) {
				return [typeObj.name];
			}
			return [];
		case "FunctionType":
			var refd = [];
			// recurse through parameters and return type
			if (typeObj["this"]) {
				refd = refd.concat(collectReferencedTypes(typeObj["this"], globalObjName));
			}
			if (typeObj.params) {
				typeObj.params.forEach(function (paramTypeObj) {
					refd = refd.concat(collectReferencedTypes(paramTypeObj, globalObjName));
				});
			}
			if (typeObj.result) {
				refd = refd.concat(collectReferencedTypes(typeObj.result, globalObjName));
			}
			return refd;
		case "ParameterType":
		case "OptionalType":
			return collectReferencedTypes(typeObj.expression, globalObjName);
		case "UndefinedLiteral":
			return [];
		case "ArrayType":
			return collectReferencedTypes(typeObj.elements[0], globalObjName);
		case "RestType":
			return [];
		case "UnionType":
			// just pick the first one for now
			return collectReferencedTypes(typeObj.elements[0], globalObjName);

		default:
			debugger;
			throw "unhandled type " + typeObj.type;
		}
	}

	/**
	 * get a serialized version of the type suitable for the index file
	 */
	function getSerializedType(typeObj, globalObjName) {

		function serializeFunctionType(typeObj) {
			var strType = "fn(";
			if (typeObj.params) {
				typeObj.params.forEach(function (paramTypeObj, ind) {
					strType += getTypeStr(paramTypeObj);
					if (ind < typeObj.params.length - 1) {
						strType += ", ";
					}
				});
			}
			strType += ")";
			if (typeObj.result && !typeObj.new) {
				strType += " -> ";
				strType += getTypeStr(typeObj.result);
			}
			return strType;
		}

		function getTypeStr(typeObj) {
			if (!typeObj) debugger;
			switch (typeObj.type) {
			case "NameExpression":
				return typeObj.name === "Global" ? "<top>" : typeObj.name;
			case "FunctionType":
				return serializeFunctionType(typeObj);
			case "ParameterType":
				return typeObj.name + ": " + getTypeStr(typeObj.expression);
			case "OptionalType":
				return typeObj.expression.name + "?: " + getTypeStr(typeObj.expression.expression);
			case "UndefinedLiteral":
				return "?";
			case "ArrayType":
				return "[" + getTypeStr(typeObj.elements[0]) + "]";
			case "RestType":
				return getTypeStr(typeObj.expression);
			case "UnionType":
				// just pick the first one for now
				return getTypeStr(typeObj.elements[0]);
			default:
				debugger;
				throw "unhandled type " + typeObj.type;
			}
		}
		if (typeObj.type === "NameExpression") {
			return typeObj.name === globalObjName ? "<top>" : typeObj.name;
		}
		var result = {};
		result["!type"] = getTypeStr(typeObj);
		return result;
	}

	function serializeTypes(referencedTypes, allTypes, resultTypes, globalObjName) {
		var worklist = [];
		Object.keys(referencedTypes).forEach(function (k) {
			worklist.push(k);
		});
		while (worklist.length > 0) {
			var typeName = worklist.pop();
			console.log(typeName);
			var serialized = {};
			var propTypes = allTypes[typeName];
			if (!propTypes) debugger;
			Object.keys(propTypes).forEach(function (propType) {
				if (propType === "$$isBuiltin") {
					return;
				}
				var typeObj = propTypes[propType].typeObj;
				if (propType === "$$proto") {
					propType = "!proto";
				}
				serialized[propType] = getSerializedType(typeObj);
				collectReferencedTypes(typeObj, globalObjName).forEach(function (t) {
					if (!referencedTypes[t]) {
						referencedTypes[t] = true;
						worklist.push(t);
					}
				});
			});
			resultTypes[typeName] = serialized;
		}
	}
	/**
	 * create index file representation of all types in environment reachable from some root type
	 */
	function serialize(env, name, globalObjName) {
		var result = {};
		result["!name"] = name;
		var types = {};
		result["!define"] = types;
		// result holds globals, and types holds type definitions
		var globalScope = env.globalScope();
		// prototype has all the built-in stuff
		var globalProto = Object.getPrototypeOf(globalScope);
		// types referenced from the globals
		var referencedTypes = {};
		for (var glob in globalProto) {
			if (globalProto.hasOwnProperty(glob)) {
				if (glob !== "$$proto") {
					var typeObj = globalProto[glob].typeObj;
					collectReferencedTypes(typeObj).forEach(function (t) {
						referencedTypes[t] = true;
					});
					result[glob] = getSerializedType(typeObj, globalObjName);
				}
			}
		}
		serializeTypes(referencedTypes, env.getAllTypes(), types, globalObjName);
		debugger;
	}

	return {
		serialize: serialize
	};
});