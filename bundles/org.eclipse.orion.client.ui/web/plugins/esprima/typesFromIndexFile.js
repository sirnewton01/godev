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
 * This module contains the code for parsing index files and converting them
 * to the type structure expected by esprimaJsContentAssist.js
 */

/*global define require definitionForType doctrine*/
define("plugins/esprima/typesFromIndexFile", ["orion/Deferred", "plugins/esprima/typeUtils", "doctrine/doctrine"], 
       function (Deferred, typeUtils) {


	/**
	 * for case where an object has its own hasOwnProperty property 
	 */
	function hop(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	/**
	 * @param {String} char a string of at least one char14acter
	 * @return {boolean} true iff uppercase ascii character
	 */
	function isUpperCaseChar(c) {
		if (c.length < 1) {
			return false;
		}
		var charCode = c.charCodeAt(0);
		if (isNaN(charCode)) {
			return false;
		}
		return charCode >= 65 && charCode <= 90;
	}


	/**
	 * Global is the type of the global variable.  This can 
	 * vary based on what libraries are being used
	 */
	var Global = function () {};
	var globalPrototype = {};
	Global.prototype = globalPrototype;

	/**
	 * A prototype that contains the common built-in types
	 */
	var Types = function (globalObjName) {

		this.Global = new Global();
	};


	var typesPrototype = {};

	Types.prototype = typesPrototype;

	var primitiveTypeMap = {
		"number": "Number",
		"bool": "Boolean",
		"string": "String"
	};

	var namePrefix = typeUtils.GEN_NAME + "index~";

	var _typeCount = 0;

	function genObjName() {
		return namePrefix + _typeCount++;
	}
	
	var idRegexp = /^[_$a-zA-Z\xA0-\uFFFF]([_$a-zA-Z0-9\.\xA0-\uFFFF])*$/;
	
	/**
	 * checks if str is a name for which we wouldn't have discovered any properties.
	 * Currently, a JS identifier or a string starting with '[' (array) or '+' 
	 * (user-defined type)
	 * @param {String} str
	 */
	function emptyTypeName(str) {
		return str && (idRegexp.test(str) || str.slice(0,1) === "[" || str.slice(0,1) === "+");
	}
	
	function convertArgTypeToClosureType(argType) {
		var closureArgStr = null;
		if (argType.typeObj.type === "FunctionType") {					
			closureArgStr = doctrine.type.stringify(argType.typeObj, {compact:true});
		} else {
			closureArgStr = argType.typeObj.name;
		}
		return closureArgStr;
	}	
	
	/**
	 * @param {String} ternSig
	 * @param {String} returnTypeName
	 */
	function ternSig2ClosureSigInternal(ternSig, returnTypeName, typeInfo) {
		/**
		 * @param {String} str
		 */
		function parseArgs(str) {
			// get rid of "fn(" and strip all spaces
			str = str.substring(3, str.length);
			var leftToParse = str.replace(/\s+/g, '');
			var result = "";
			// need to be a bit smart here to handle 
			// arguments with function types
			while (leftToParse.slice(0,1) !== ")") {
				var colonInd = leftToParse.indexOf(":");
				var argName = leftToParse.slice(0, colonInd);
				var optional = argName[argName.length - 1] === '?';
				if (optional) {
					argName = argName.slice(0, argName.length - 1);
				}
				leftToParse = leftToParse.slice(colonInd + 1, leftToParse.length);
				var commaInd = null, closeParenInd = null;
				if (leftToParse.slice(0, 2) === "fn") {
					// find the close paren.  end of argument is next comma after
					// that (or the end of the string)
					closeParenInd = leftToParse.indexOf(")");
					commaInd = leftToParse.indexOf(",", closeParenInd);
				} else {
					commaInd = leftToParse.indexOf(",");
				}
				var argTypeEndInd = null;
				if (commaInd !== -1) {
					argTypeEndInd = commaInd;
				} else {
					// depends on whether we have a return type
					var returnArrowInd = null;
					if (closeParenInd) {
						// last argument type was a function type.
						// to handle case where that function type has a return type,
						// search from *next* close paren							
						returnArrowInd = leftToParse.indexOf("->", leftToParse.indexOf(")", closeParenInd+1));
					} else {
						returnArrowInd = leftToParse.indexOf("->");
					}
					if (returnArrowInd !== -1) {
						argTypeEndInd = returnArrowInd - 1;
					} else {
						// just the end of the string, without the close paren
						argTypeEndInd = leftToParse.length-1;
					}
				}
				var argTypeStr = leftToParse.slice(0, argTypeEndInd);
				// TODO for a function type we get undefined here as the type name; is that what we want 
				var argType = definitionForType(typeInfo, argTypeStr);
				result += argName + ":" + convertArgTypeToClosureType(argType);
				if (optional) {
					result += "=";
				}
				if (commaInd !== -1) {
					result += ",";
					// use argTypeEndInd+1 to remove the comma
					leftToParse = leftToParse.slice(argTypeEndInd+1, leftToParse.length);
				} else {
					leftToParse = leftToParse.slice(argTypeEndInd, leftToParse.length);
				}
			}
			return { args: result, remaining: leftToParse.slice(1,leftToParse.length) };
		}

		/**
		 * @param {String} str
		 */
		function parseRet(str) {
			// get rid of "->"
			str = str.substring(2, str.length);
			return convertArgTypeToClosureType(definitionForType(typeInfo, str));
		}
		var argsAndRemaining = parseArgs(ternSig);
		var remaining = argsAndRemaining.remaining;
		var retString;
		// HACK: if there is no return type in fnType,
		// use name as the return type, if it is defined.  
		// Otherwise, use undefined
		if (remaining !== "") {
			retString = parseRet(remaining);
		} else if (returnTypeName) {
			retString = returnTypeName;
		}
		// use convention of upper-case names being constructors
		var isConstructor = !remaining && retString && isUpperCaseChar(retString);
		var defName = "function(";
		if (isConstructor) {
			defName += "new:" + retString;
			if (argsAndRemaining.args) {
				defName += ",";
			}
		}
		defName += argsAndRemaining.args + "):" + retString;
		return defName;	
	}
	
	/**
	 * converts a function signature in the Tern index file format
	 * to a signature in the Closure format used internally by the
	 * JS content assist engine
	 */
	function ternSig2ClosureSig(ternSig, constructorName) {
		return ternSig2ClosureSigInternal(ternSig, constructorName, {});
	}
	
	/**
	 * creates a Definition object for the given type and name.
	 * As a side-effect, adds information about the type (e.g.,
	 * the types of its properties) to typeInfo
	 */
	function definitionForType(typeInfo, type, name) {
	
		/**
		 * parse the properties from type, with special handling
		 * of the "!type" property
		 */
		function parseObjType(type, name) {
			var propInfo = {}, def;

			for (var p in type) {
				if (hop(type, p)) {
					if (p === "!type") {
						def = definitionForType(typeInfo, type[p], name);
						if (typeUtils.isFunctionOrConstructor(def.typeObj)) {
							propInfo.$$fntype = def.typeObj;
							if (name) {
								def = new typeUtils.Definition(name);
							} else {
								def = new typeUtils.Definition(genObjName());
							}
						}
					} else if (p === "!proto") {
						// prototype chain
						propInfo.$$proto = definitionForType(typeInfo, type[p]);
					} else if (p === "!url" || p === "!stdProto" || p === "!effects" || p === "!doc") {
						// do nothing for now
					} else if (p[0] === '!') {
						throw "didn't handle special property " + p;
					} else if (p === "prototype") {
						propInfo.$$prototype = definitionForType(typeInfo, type[p]);
						// we set the $$newtype to be the same as the $$prototype.
						// we need $$newtype in order to be consistent with the rest of
						// the type system.  we don't need it to be a fresh object, since
						// we won't add properties to it while analyzing the constructor.
						// setting $$newtype and $$prototype to be the same avoids some
						// issues with naming of types (since we don't need to generate some
						// different name for $$newtype)
						propInfo.$$newtype = propInfo.$$prototype;
					} else {
						propInfo[p] = definitionForType(typeInfo, type[p]);
					}
				}
			}
			if (propInfo.$$prototype && propInfo.$$fntype && typeof type.prototype === "string") {
				// if we have a named prototype, use that name as the return type
				// in $$fntype
				var protoName = propInfo.$$prototype.typeObj.name;
				var funType = propInfo.$$fntype;
				//          if (!funType.new) { throw "something broken"; }
				funType.result.name = protoName;
			}
			if (!def) {
				if (name) {
					def = new typeUtils.Definition(name);
				} else {
					// this occurs with nested object types, e.g.,
					// Element.prototype.style in the DOM model
					def = new typeUtils.Definition(genObjName());
				}
			}
			return {
				propInfo: propInfo,
				def: def
			};
		}

		if (typeof type === "string") {
			if (primitiveTypeMap[type]) {
				return new typeUtils.Definition(primitiveTypeMap[type]);
			} else if (type === "?") {
				if (name === "undefined") {
					// special case: we want a NameExpression for name "undefined"
					return new typeUtils.Definition({
						name: "undefined",
						type: "NameExpression"
					});
				}
				// just make a dummy definition using the name for now
				return name ? new typeUtils.Definition(name) : new typeUtils.Definition("Object");
			} else if (type === "<top>") {
				// type of the global object
				return new typeUtils.Definition("Global");
			} else if (type[0] === "$") {
				// TODO handle these properly
				return new typeUtils.Definition(name);
			} else if (type.slice(0, 2) === "fn") {
				return new typeUtils.Definition(ternSig2ClosureSigInternal(type, name, typeInfo));
			} else if (type[0] === "[") {
				return new typeUtils.Definition("Array");
			} else if (type.slice(0, 7) === "!custom" || type.slice(0, 5) === "!this" || type.slice(0, 2) === "!0") {
				// don't understand this; treat it as Object for now
				return new typeUtils.Definition("Object");
			} else if (type.slice(0,1) === "!") {
				throw "unhandled special case " + type;
			}
			if (type.indexOf(".") !== -1) {
				// replace with ".." to avoid conflicting with "." syntax
				// used in inferred types for constructor functions
				type = type.replace(/\./g, "..");
			}
			if (type.slice(0,1) === "+") {
				type = type.slice(1,type.length) + "..prototype";
			}
			return new typeUtils.Definition(type);
		} else { // an object type
			var parsed = parseObjType(type, name);
			var newTypeName = parsed.def.typeObj.name;
			// here we check if type["!type"] is a plain type name.  if so,
			// we just have an empty type description for it (with no
			// properties), and there is no need to update the type object
			if (newTypeName && newTypeName !== "Global" && !emptyTypeName(type["!type"])) {
				if (newTypeName === "Object") {
					// need to mangle the property names as in original types.js
					var mangled = {};
					for (var p in parsed.propInfo) {
						if (hop(parsed.propInfo, p)) {
							mangled["$_$" + p] = parsed.propInfo[p];
						}
					}
					// mark as built-in so not mucked up by inference
					mangled.$$isBuiltin = true;
					typeInfo[newTypeName] = mangled;

				} else {
					// don't overwrite property info with empty types
					if (typeInfo[newTypeName]) {
						throw "type " + newTypeName + " defined twice in index file";
					}
					// mark as built-in so not mucked up by inference
					parsed.propInfo.$$isBuiltin = true;
					typeInfo[newTypeName] = parsed.propInfo;
				}
			}
			return parsed.def;
		}
	}


	/**
	 * for unit testing.  given a type object with properties as in an index file,
	 * and a name for the type, returns an object { def: d, typeInfo: t }, where d
	 * is a Definition for the type and t contains auxiliary type information (e.g.,
	 * types of properties.
	 */
	function parseType(type, name) {
		var typeInfo = {};
		var def = definitionForType(typeInfo, type, name);
		return { def: def, typeInfo: typeInfo };
	}
	
	/**
	 * adds the info from the given json index file.  global variables are added to globals,
	 * and type information to typeInfo
	 */
	function addIndexInfo(json, globals, typeInfo) {
		var p;
		for (p in json) {
			if (hop(json, p)) {
				if (p === "!name") {
					// ignore
				} else if (p === "!define") {
					// these are anonymous types, i.e.,
					// types with no corresponding global
					var anonTypes = json[p];
					for (var n in anonTypes) {
						if (hop(anonTypes, n)) {
							// invoking definitionForType will have
							// the side effect of adding the type
							// information
							definitionForType(typeInfo, anonTypes[n], n);
						}
					}
				} else if (typeof json[p] === "string") {
					var typeStr = json[p];
					var typeObj = { "!type": typeStr };
					globals[p] = definitionForType(typeInfo, typeObj, p);
				} else {
					// new global
					var type = json[p];
					globals[p] = definitionForType(typeInfo, type, p);
				}
			}
		}
	}

	// prototype of global object is Object
	globalPrototype.$$proto = new typeUtils.Definition("Object");

	var initResult = null;
	/**
	 * adds type information for core ecma5 libraries.  
	 * returns a promise that is resolved when the info is loaded.
	 */
	function init() {
		if (!initResult) { 
			var d = new Deferred();
			require(["plugins/esprima/indexFiles/ecma5Index"], function (ecma5) {
				// add information for core libraries directly to Global.prototype
				// and Types.prototype
				addIndexInfo(ecma5, globalPrototype, typesPrototype);
				d.resolve();
			});
			initResult = d.promise;		
		}
		return initResult;
	}
	/////////////////////////
	// code for adding other index files
	//
	// Strategy: when someone asks for another index file, we parse that
	// file, and then add the results to a *particular* Types object.  This
	// is in contrast to types.js, which kept three separate global object
	// representations (for standard js, browser, and node) and keeps relevant
	// type info on each of their prototypes.
	//
	// We also cache the results of parsing an index file, to avoid repeating things.
	/////////////////////////

	var parsedIndexFileCache = {};

	/**
	 * update knownTypes with type and global information
	 * from globalsAndTypes
	 */
	function updateKnownTypes(knownTypes, globalsAndTypes) {
		// now, add the globals and types for the index file to knownTypes
		// we want globals on the *prototype* of knownTypes.Global.  (We
		// need them on the prototype so their types cannot be overwritten
		// by user code.)  So, we create a new prototype object with extant
		// globals and the new ones from the index file, and then re-allocate
		// knownTypes.Global.  (gross)
		var newProto = {};
		var knownGlobals = Object.getPrototypeOf(knownTypes.Global);
		Object.keys(knownGlobals).forEach(function (globName) {
			newProto[globName] = knownGlobals[globName];
		});		
		Object.keys(globalsAndTypes.globals).forEach(function (globName) {
			newProto[globName] = globalsAndTypes.globals[globName];
		});
		Global.prototype = newProto;
		knownTypes.Global = new Global();
		Global.prototype = globalPrototype;
	
		// we want types on knownTypes itself
		Object.keys(globalsAndTypes.types).forEach(function (typeName) {
			if (typeName !== "Global") {
				knownTypes[typeName] = globalsAndTypes.types[typeName];
			}
		});	
		return knownTypes;
	
	}
	/**
	 * Add information for library libName to the knownTypes object.
	 *
	 * Returns a promise, as the library index file may need to be loaded
	 * asynchronously.  The promise is resolved with the knownTypes object.
	 */
	function addLibrary(knownTypes, libName) {
		// first, get the global and types info
		// check the cache
		var d = new Deferred();
		var globalsAndTypes = parsedIndexFileCache[libName];
		if (!globalsAndTypes) {
			globalsAndTypes = { globals: {}, types: {} };
			var indexFile;
			if (libName === "browser") {
				indexFile = "plugins/esprima/indexFiles/browserIndex";
			} else if (libName === "node") {
				indexFile = "plugins/esprima/indexFiles/nodeIndex";
			} else {
				throw "unknown library name " + libName;				
			}
			require([indexFile], function (indexData) {
				addIndexInfo(indexData, globalsAndTypes.globals, globalsAndTypes.types);
				parsedIndexFileCache[libName] = globalsAndTypes;
				d.resolve(globalsAndTypes);
			});
		} else {
			// already have the info
			d.resolve(globalsAndTypes);
		}
		var result = d.then(function (globalsAndTypes) {
			return updateKnownTypes(knownTypes, globalsAndTypes);
		});
		return result;
	}

	/**
	 * add some index file data to the knownTypes object.
	 * Mutates knownTypes.
	 */
	function addIndexData(indexData, knownTypes) {
		var globalsAndTypes = { globals: {}, types: {} };
		addIndexInfo(indexData, globalsAndTypes.globals, globalsAndTypes.types);
		updateKnownTypes(knownTypes, globalsAndTypes);
	}
	
	return {
		Types: Types,
		addLibrary: addLibrary,
		ternSig2ClosureSig: ternSig2ClosureSig,
		init: init,
		parseType: parseType,
		addIndexData: addIndexData
	};
});