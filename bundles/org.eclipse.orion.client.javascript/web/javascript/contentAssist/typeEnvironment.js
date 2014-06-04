/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 VMware, Inc. and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *	 Andy Clement (VMware) - initial API and implementation
 *	 Andrew Eisenberg (VMware) - implemented visitor pattern
 *   IBM Corporation - Various improvements
 ******************************************************************************/

/*global define*/
define([
'javascript/contentAssist/typeUtils',
'javascript/contentAssist/typesFromIndexFile',
'orion/Deferred'
], function(typeUtils, mTypes, Deferred) {

	/**
	 * @return boolean true iff the type contains
	 * prop.  prop must not be coming from Object
	 */
	function typeContainsProperty(type, prop) {
		if (! (prop in type)) {
			return false;
		}
		if (Object.hasOwnProperty(prop)) {
			// the propery may be re-defined in the current type
			// check that here
			return !type.hasOwnProperty(prop);
		}
		if (Object.prototype.hasOwnProperty(prop)) {
			// this is one of the synthetic properties like __defineGetter__
			// should be ignored, unless already exists in property
			return type.hasOwnProperty(prop);
		}
		return true;
	}


	/**
	 * Initializes data structures representing the known types
	 * for the file.  These known types can include DOM types for 
	 * browser-based code or node.js types.
	 *
	 * Returns a promise that is resolved with the populated 
	 * mTypes.Types object.
	 */ 
	function initKnownTypes(globalObjName, indexData) {
		var coreLibPromise = mTypes.init();
		var finalResult = coreLibPromise.then(function () {
			var types = new mTypes.Types();
			if (indexData) {
				indexData.forEach(function (d) {
					// mutates types
					mTypes.addIndexData(d, types);
				});
			}
			var result = null;
			if (globalObjName === "Window") {
				// browser code; load the browser module
				result = mTypes.addLibrary(types,"browser");
				
			} else if (globalObjName === "Module") {
				// node.js code
				result = mTypes.addLibrary(types,"node");
			} else {
				var d = new Deferred();
				d.resolve(types);
				result = d.promise;
			}
			return result;
		});
		return finalResult;
	}
	


	/**
	 * Creates the environment object that stores type information
	 * Called differently depending on what job this content assistant is being called to do.
	 *
	 * Returns a promise that is resolved with the environment object.
	 */
	function createEnvironment(options) {
		var buffer = options.buffer, uid = options.uid, offset = options.offset, indexer = options.indexer, globalObjName = options.globalObjName, indexData = options.indexData;
		if (!offset) {
			offset = buffer.length+1;
		}

		// must copy comments because the array is mutable
		var comments = [];
		if (options.comments) {
			for (var i = 0; i < options.comments.length; i++) {
				comments[i] = options.comments[i];
			}
		}


		// create a hash of the path using a hashcode calculation similar to java's String.hashCode() method
		var hashCode = function(str) {
			var hash = 0, c, i;
			if (str.length === 0) {
				return hash;
			}
			for (i = 0; i < str.length; i++) {
				c = str.charCodeAt(i);
				hash = ((hash << 5) - hash) + c;
				hash = hash & hash; // Convert to 32bit integer
			}
			return hash;
		};

		// translate function names on object into safe names
		var swapper = function(name) {
			switch (name) {
				case "prototype":
					return "$$prototype";
				case "__proto__":
					return "$$proto";
				case "toString":
				case "hasOwnProperty":
				case "toLocaleString":
				case "valueOf":
				case "isProtoTypeOf":
				case "propertyIsEnumerable":
					return "$_$" + name;
				default:
					return name;
			}
		};

		// routine to lookup a member name of a type that follows the prototype chain
		// to search for the member
		function innerLookup(env, name, type, includeDefinition, visited) {
			var res = type[name];

			var proto = type.$$proto;
			if (res) {
				// found it.  if includeDefinition is set, we return
				// the Definition object res.  if we were looking for 
				// a function type, then res represents the function 
				// type directly, so we return it.  Otherwise, res
				// is a Definition object, and we return its enclosed
				// type object
				return includeDefinition || name === '$$fntype' ? res : res.typeObj;
			} else if (proto) {
				// check for cyclic prototype chain
				if (visited) {
					if (visited[proto.typeObj.name]) {
						return null;
					}
				} else {
					visited = {};
				}
				if (typeUtils.isArrayType(proto.typeObj)) {
					// inferred type of expression is the type of the dereferenced array
					proto.typeObj = typeUtils.extractArrayParameterType(proto.typeObj);
				}
				visited[proto.typeObj.name] = true;
				return innerLookup(env, name, env.lookupQualifiedType(proto.typeObj.name), includeDefinition, visited);
			} else {
				return null;
			}
		}
	

		// prefix for generating local types
		// need to add a unique id for each file so that types defined in dependencies don't clash with types
		// defined locally
		var namePrefix = typeUtils.GEN_NAME + hashCode(uid) + "~";
		// uncomment to show names
//		var namePrefix = typeUtils.GEN_NAME + (uid) + "~";

		var promise = initKnownTypes(globalObjName, indexData);
		var result = promise.then(function (knownTypes) {
			return {
				/** Each element is the type of the current scope, which is a key into the types array */
				_scopeStack : ["Global"],
				/**
				 * a map of all the types and their properties currently known
				 * when an indexer exists, local storage will be checked for extra type information
				 */
				_allTypes : knownTypes,
				/** a counter used for creating unique names for object literals and scopes */
				_typeCount : 0,

				_nameStack : [],

				/** if this is an AMD module, then the value of this property is the 'define' call expression */
				amdModule : null,
				/** if this is a wrapped commonjs module, then the value of this property is the 'define' call expression */
				commonjsModule : null,
				/** is this a node.js module? */
				nodeJSModule: globalObjName === "Module",
				/** Window | Module */
				globalObjName: globalObjName,
				/** the indexer for thie content assist invocation.  Used to track down dependencies */
				indexer: indexer,
				/** the offset of content assist invocation */
				offset : offset,
				/** the entire contents being completed on */
				contents : buffer,
				uid : uid === 'local' ? null : uid, // make the uid shorter
	
				/** List of comments in the AST*/
				comments : comments,
	
				newName: function() {
					return namePrefix + this._typeCount++;
				},
	
				/**
				 * @return {boolean} true iff this is an internally generated name
				 */
				isSyntheticName: function(name) {
					return name.substr(0, typeUtils.GEN_NAME.length) === typeUtils.GEN_NAME;
				},
	
				/**
				 * Creates a new empty scope and returns the name of the scope
				 * must call this.popScope() when finished with this scope
				 */
				newScope: function(range) {
					// the prototype is always the currently top level scope
					var targetType = this.scope();
					var newScopeName = this.newName();
					this._allTypes[newScopeName] = {
						$$proto : new typeUtils.Definition(targetType, range, this.uid)
					};
					this._scopeStack.push(newScopeName);
					return newScopeName;
				},
	
				newScopeObj : function(range) {
					return typeUtils.createNameType(this.newScope(range));
				},
	
				pushScope : function(scopeName) {
					this._scopeStack.push(scopeName);
				},
	
				pushName : function(name) {
					this._nameStack.push(name);
				},
	
				popName : function() {
					this._nameStack.pop();
				},
	
				getQualifiedName : function() {
					var name = this._nameStack.join('.');
					return name.length > 0 ? name + '.' : name;
				},
	
				/**
				 * Creates a new empty object scope and returns the name of this object
				 * must call this.popScope() when finished
				 * @return {{type:String,name:String}} type object that was just created
				 */
				newObject : function(newObjectName, range) {
					// object needs its own scope
					this.newScope();
					// if no name passed in, create a new one
					newObjectName = newObjectName? newObjectName : this.newName();
					// assume that objects have their own "this" object
					// prototype of Object
					this._allTypes[newObjectName] = {
						$$proto : new typeUtils.Definition("Object", range, this.uid)
					};
					var typeObj = typeUtils.createNameType(newObjectName);
					this.addVariable("this", null, typeObj, range);
	
					return typeObj;
				},
	
				/**
				 * like a call to this.newObject(), but the
				 * object created has not scope added to the scope stack
				 */
				newFleetingObject : function(name, range) {
					var newObjectName = name ? name : this.newName();
					this._allTypes[newObjectName] = {
						$$proto : new typeUtils.Definition("Object", range, this.uid)
					};
					return typeUtils.createNameType(newObjectName);
				},
	
				/**
				 * like a call to this.newObject(), but the
				 * object created has not scope added to the scope stack
				 * @return String the constructor name generated
				 */
				con: function(name, range) {
					var newObjectName = name ? name : this.newName();
					this._allTypes[newObjectName] = {
						$$proto : new typeUtils.Definition("Object", range, this.uid)
					};
					return newObjectName;
				},
	
				/** removes the current scope */
				popScope: function() {
					// Can't delete old scope since it may have been assigned somewhere
					var oldScope = this._scopeStack.pop();
					return oldScope;
				},
	
				/**
				 * @param {ASTNode|String} target
				 * @return {{}} the type object for the current scope
				 * if a target is passed in (optional), then use the
				 * inferred type of the target instead (if it exists)
				 */
				scope : function(target) {
					if (typeof target === "string") {
						return target;
					} else if (target && target.extras.inferredTypeObj) {
						var inferredTypeObj = target.extras.inferredTypeObj;
						// TODO what happens if not a NameExpression or FunctionType???
						if (inferredTypeObj.type === 'NameExpression') {
							return inferredTypeObj.name;
						} else if (inferredTypeObj.type === 'FunctionType') {
							if (inferredTypeObj.params) {
								for (var i = 0; i < inferredTypeObj.params.length; i++) {
									if ((inferredTypeObj.params[i].name === 'new' ||
										inferredTypeObj.params[i].name === 'this') &&
										inferredTypeObj.params[i].expression.name) {
	
										return inferredTypeObj.params[i].expression.name;
									}
								}
							}
							return "Function";
						} else if (inferredTypeObj.type === 'ArrayType') {
							return "Array";
						} else if (inferredTypeObj.type === 'TypeApplication') {
							return inferredTypeObj.expression.name;
						} else if (inferredTypeObj.type === 'UndefinedLiteral') {
							return "Object";
						} else if(inferredTypeObj.type === 'UnionType') {
							//TODO properly distinguish a union type
							return 'Object';
						}
					} else {
						// grab topmost scope
						return this._scopeStack[this._scopeStack.length -1];
					}
				},
	
				globalScope : function() {
					return this._allTypes[this._scopeStack[0]];
				},
	
				globalTypeName : function() {
					return this._scopeStack[0];
				},
	
				/**
				 * adds the name to the target type.
				 * if target is passed in then use the type corresponding to
				 * the target, otherwise use the current scope
				 *
				 * Will not override an existing variable if the new typeName is "Object" or "undefined"
				 * Will not add to a built in type
				 *
				 * @param {String} name
				 * @param {{}} typeObj
				 * @param {Object} target
				 * @param {Array.<Number>} range
				 * @param {Array.<Number>} docRange
				 */
				addVariable : function(name, target, typeObj, range, docRange) {
					if (name === 'prototype') {
						name = '$$prototype';
					} else if (name === '__proto__') {
						name = '$$proto';
					} else if (this._allTypes.Object["$_$" + name]) {
						// this is a built in property of object.  do not redefine
						return;
					}
					var type = this.lookupQualifiedType(this.scope(target), true);
					// do not allow augmenting built in types
					if (!type.$$isBuiltin) {
						// if new type name is not more general than old type, do not replace
						if (typeContainsProperty(type, name) && typeUtils.leftTypeIsMoreGeneral(typeObj, type[name].typeObj, this)) {
							// do nuthin
						} else {
							type[name] = new typeUtils.Definition(typeObj ? typeObj : typeUtils.OBJECT_TYPE, range, this.uid);
							type[name].docRange = docRange;
							return type[name];
						}
					}
				},
	
				addOrSetGlobalVariable : function(name, typeObj, range, docRange) {
					if (this._allTypes.Object["$_$" + name]) {
						// this is a built in property of object.  do not redefine
						return;
					}
					return this.addOrSetVariable(name,
						// mock an ast node with a global type
						this.globalTypeName(), typeObj, range, docRange);
				},
	
				/**
				 * like add variable, but first checks the prototype hierarchy
				 * if exists in prototype hierarchy, then replace the type
				 *
				 * Will not override an existing variable if the new typeName is "Object" or "undefined"
				 */
				addOrSetVariable : function(name, target, typeObj, range, docRange) {
					if (name === 'prototype') {
						name = '$$prototype';
					} else if (name === '__proto__') {
						name = '$$proto';
					} else if (this._allTypes.Object["$_$" + name]) {
						// this is a built in property of object.  do not redefine
						return;
					}
	
					var targetTypeName = this.scope(target);
					var current = this._allTypes[targetTypeName], found = false;
					// if no type provided, create a new type
					typeObj = typeObj ? typeObj : this.newFleetingObject();
					var defn;
					while (current) {
						if (typeContainsProperty(current, name)) {
							defn = current[name];
							// found it, just overwrite
							// do not allow overwriting of built in types
							// 3 cases to avoid:
							//  1. properties of builtin types cannot be set
							//  2. builtin types cannot be redefined
							//  3. new type name is more general than old type
							if (!current.$$isBuiltin && current.hasOwnProperty(name) &&
									!typeUtils.leftTypeIsMoreGeneral(typeObj, defn.typeObj, this)) {
								// since we are just overwriting the type we do not want to change
								// the path or the range
								defn.typeObj = typeObj;
								if (docRange) {
									defn.docRange = docRange;
								}
								// special case: if we're updating $$prototype, and $$newtype is
								// also present, update $$proto of newType appropriately
								if (name === '$$prototype' && current.$$newtype) {
								  var newType = this._allTypes[current.$$newtype.typeObj.name];
								  newType.$$proto.typeObj = typeObj;
								}
	
							}
							found = true;
							break;
						} else if (current.$$proto) {
							var tname = current.$$proto.typeObj.name;
							current = this._allTypes[tname || "Function"];
						} else {
							current = null;
						}
					}
	
					if (!found) {
						// not found, so just add to current scope
						// do not allow overwriting of built in types
						var type = this.lookupQualifiedType(targetTypeName, true);
						if (type && !type.$$isBuiltin) {
							defn = new typeUtils.Definition(typeObj, range, this.uid);
							defn.docRange = docRange;
							type[name] = defn;
						}
					}
					return defn;
				},

				/**
				 * lookup a qualified type name a..b..c.  '..' is used to 
				 * separate members, to avoid confusion with the use of '.'
				 * in names for constructors.  
				 * returns the type itself (the object containing information
				 * on members), rather than a type object with the type's name
				 */
				lookupQualifiedType : function(name, includeDefinition) {
					var scopeNames = name.split("..");
					var targetType = this._allTypes[scopeNames[0]];
					for (var i = 1; i < scopeNames.length; i++) {
						var typeObj = innerLookup(this, swapper(scopeNames[i]), targetType, includeDefinition);
						targetType = this._allTypes[typeObj.name];
					}	
					return targetType;
				},
				
				/**
				 * looks up the name in the hierarchy
				 * @return {{}} type objec for the current name or null if doesn't exist
				 */
				lookupTypeObj : function(name, target, includeDefinition) {
					var scope = this.scope(target);
					var targetType = this.lookupQualifiedType(scope, includeDefinition);
	
					// uncomment this if we want to hide errors where there is an unknown type being placed on the scope stack
	//				if (!targetType) {
	//					targetType = this.globalScope()
	//				}
					var res = innerLookup(this, swapper(name), targetType, includeDefinition);
					return res;
				},
	
				/** removes the variable from the current type */
				removeVariable : function(name, target) {
					// do not allow deleting properties of built in types
					var type = this.lookupQualifiedType(this.scope(target), true);
					// 2 cases to avoid:
					//  1. properties of builtin types cannot be deleted
					//  2. builtin types cannot be deleted from global scope
					if (type && !type.$$isBuiltin && type[name] && !(type[name] && !type.hasOwnProperty(name))) {
						delete type[name];
					}
				},
	
				/**
				 * adds a file summary to this module
				 * @param {{types, provided}} summary
				 * @param String targetTypeName
				 */
				mergeSummary : function(summary, targetTypeName) {
					// add the extra types that don't already exists
					for (var typeName in summary.types) {
						if (summary.types.hasOwnProperty(typeName)) {
							// create type if doesn't already exist, othewise merge
							var type = this._allTypes[typeName];
							var existingType = summary.types[typeName];
							// if doesn't exist yet create it
							// if type is built-in, then we must overwrite it with ours
							if (!type || type.$$isBuiltin) {
								type = this._allTypes[typeName] = {};
								// for each property defined in the type from the sumamry,
								// also add it to the current module's type
								for (var typeProp in existingType) {
									if (!type[typeProp]) {
										type[typeProp] = typeUtils.Definition.revive(existingType[typeProp]);
									}
								}
							}
	
						}
					}
	
					// now augment the target type with the provided properties
					// but only if a composite type is exported
					var targetType = this._allTypes[targetTypeName];
					if (typeof summary.provided !== 'string') {
						// TODO summary.provided mightbe a RecordType
						for (var providedProperty in summary.provided) {
							if (summary.provided.hasOwnProperty(providedProperty)) {
								// copy over the summary into the type den
								// the targetType may already have the providedProperty defined
								// but should override
								targetType[providedProperty] = typeUtils.Definition.revive(summary.provided[providedProperty]);
							}
						}
					}
				},
	
				/**
				 * creates a new type for a function, and returns the type name.
				 */
				initFunctionType : function(functionTypeObj,node,newObjectType,newTypeName) {
					var newObjectName = newObjectType.name;
				    // The 'prototype' field of a function points to a new empty object
				    var emptyProtoName = this.newFleetingObject(newObjectName + "~proto");
				    // __proto__ points to Function
					this._allTypes[newObjectName].$$proto = new typeUtils.Definition("Function",null,this.uid);
					// we store the function type itself in $$fntype
					this._allTypes[newObjectName].$$fntype = functionTypeObj;
					// store type of 'prototype' object in $$prototype
					this._allTypes[newObjectName].$$prototype = new typeUtils.Definition(emptyProtoName,null,this.uid);
					// to handle writes to 'this' inside the function, we create another type $$newtype.  $$newtype
					// has the function's $$prototype type as its $$proto.  And $$newtype is the type ascribed to an
					// invocation of the function with the 'new' operator.
					// in this manner, writes to fields of 'this' take precedence over fields defined
					// in the prototype object.  
					// E.g., if we have 
					//    var AAA = function() { this.foo = 0; }; AAA.prototype = { foo : '' }; var x = new AAA();
					// the type of x.foo should be Number, not String
					if (!newTypeName) {
					  newTypeName = newObjectName + "~new";
					}
					this.newObject(newTypeName, node.range);
					this._allTypes[newObjectName].$$newtype = new typeUtils.Definition(newTypeName,null,this.uid);
					this._allTypes[newTypeName].$$proto = new typeUtils.Definition(emptyProtoName,null,this.uid);
				},
                /**
                 * update the 'new' types of all function expressions assigned
                 * to properties of the object literal, based on the idea that
                 * the object literal is likely to be passed as the 'this' parameter
                 * to the functions
                 */
                updateObjLitFunctionTypes: function(objLitNode) {
        			// we want to update the 'new' type (i.e., the type of 'this') for each function 
        			// assigned to a property of the literal as follows:
        			// 1. add all the object literal properties to each 'new' type
        			// 2. propagate properties from each 'new' type to all the others
        			var objLitTypeName = objLitNode.extras.inferredTypeObj.name;
        			if (!objLitTypeName) {
        			    return;
        			}
        			// first, collect the "merged" new type for everything
        			var mergedType = {};
        			var self = this;
        			function mergeInType(target, newType) {
                                    if (target === newType) return;
        			    for (var p in newType) {
        			        if (newType.hasOwnProperty(p) && p.indexOf("$$") !== 0) {
        			            if (!target.hasOwnProperty(p)) {
        			                target[p] = newType[p];
        			            } else {
        			                // some kind of recursive call in the case of two object types
        			                if (target[p].typeObj.type === "NameExpression" && self.isSyntheticName(target[p].typeObj.name) &&
        			                    newType[p].typeObj.type === "NameExpression" && self.isSyntheticName(newType[p].typeObj.name)) {
                                        var newTarget = self._allTypes[target[p].typeObj.name], newSource = self._allTypes[newType[p].typeObj.name];
                                        if (newTarget && newSource) {
                                            mergeInType(newTarget, newSource);
                                        }
        			                }
        			            }
        			        }
        			    }
        			}
        			var objLitType = this._allTypes[objLitTypeName];
        			mergeInType(mergedType,objLitType);
        			// add in properties from new type for each function
        			var kvps = objLitNode.properties;
        			for (var i = 0; i < kvps.length; i++) {
        				if (kvps[i].hasOwnProperty("key")) {
        					var name = kvps[i].key.name;
        					if (name && kvps[i].value.type === "FunctionExpression") {
        					    var funcTypeName = kvps[i].value.extras.inferredTypeObj.name;
        					    var funcExpNewType = this._allTypes[this._allTypes[funcTypeName].$$newtype.typeObj.name];
        					    mergeInType(mergedType,funcExpNewType);
        					}
        				}
        			}
        			// now, update all the 'new' types
        			for (i = 0; i < kvps.length; i++) {
        				if (kvps[i].hasOwnProperty("key")) {
        					name = kvps[i].key.name;
        					if (name && kvps[i].value.type === "FunctionExpression") {
        					    funcTypeName = kvps[i].value.extras.inferredTypeObj.name;
        					    funcExpNewType = this._allTypes[this._allTypes[funcTypeName].$$newtype.typeObj.name];
        					    for (var p in mergedType) {
        					        // don't override existing types
        					        // TODO is this right?
        					        if (mergedType.hasOwnProperty(p) && !funcExpNewType.hasOwnProperty(p)) {
        					            funcExpNewType[p] = mergedType[p];
        					        }
        					    }
        					}
        				}
        			}
                },

	            /**
	             * updates a function type to include a new return type.
	             */
	            updateReturnType : function(typeObj,newReturnTypeObj) {
					if (! typeObj) {
						return newReturnTypeObj;
					}
					var originalFunctionTypeObj = this._allTypes[typeObj.name].$$fntype;
					if (!originalFunctionTypeObj) {
						return newReturnTypeObj;
					} else {
						var newFunctionTypeObj = {
							type: originalFunctionTypeObj.type,
							params: originalFunctionTypeObj.params,
							result: newReturnTypeObj
						};
						if (originalFunctionTypeObj['this']) {
							newFunctionTypeObj['this'] = originalFunctionTypeObj['this'];
						}
						if (originalFunctionTypeObj['new']) {
							newFunctionTypeObj['new'] = originalFunctionTypeObj['new'];
						}
						this._allTypes[typeObj.name].$$fntype = newFunctionTypeObj;
						return newFunctionTypeObj;
					}
				},
	
	            /**
	             * get the result type for invoking target via a 'new' expression.
	             */
	            getNewType : function(target) {					
					return this.lookupTypeObj("$$newtype",target);
	            },
	
	            /**
	             * get the result type for invoking target via a 'new' expression.
	             */
	            getFnType : function(target) {
					var result = this.lookupTypeObj("$$fntype",target);
					if (!result) {
						// this can occur, e.g., when target is the type attached to a CallExpression
						// invoking a non-existent function
						result = target.extras.inferredTypeObj;
					}
					return result;
	            },
	
	
				/** @returns {{}} entry in types array */
				findType : function(typeObj) {
					var typeName = typeUtils.convertToSimpleTypeName(typeObj);
					return this._allTypes[typeName];
				},
	
				getAllTypes : function() {
					return this._allTypes;
				},
	
				/**
				 * This function stores the target type
				 * so it can be used as the result of this inferencing operation
				 */
				storeTarget : function(targetTypeName) {
					if (!this.targetTypeName) {
						if (!targetTypeName) {
							targetTypeName = this.scope();
						}
						this.targetTypeName = targetTypeName;
						this.targetFound = true;
					}
				}
			};
		});
		return result;
	}

	return {
		createEnvironment: createEnvironment
	};
});
