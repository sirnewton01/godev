/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define module require exports */
(function(root, factory) {
	if(typeof exports === 'object') {
		module.exports = factory(require('../util'), require, exports, module);
	}
	else if(typeof define === 'function' && define.amd) {
		define(['eslint/util', 'require', 'exports', 'module'], factory);
	}
	else {
		var req = function(id) {return root[id];},
			exp = root,
			mod = {exports: exp};
		root.rules.noundef = factory(req, exp, mod);
	}
}(this, function(util, require, exports, module) {
	module.exports = function(context) {
		"use strict";

		function reportRedeclaration(node, name) {
			context.report(node, "'{{name}}' is already defined.", {name: name});
		}

		function addNamedFunctions(map, scope) {
			scope.variables.forEach(function(variable) {
				variable.defs.some(function(def) {
					if (def.type === "FunctionName") {
						var name = def.name.name;
						if (!(Object.prototype.hasOwnProperty.call(map, name))) {
							map[name] = scope;
						}
						return true;
					}
					return false;
				});
			});
		}

		/**
		 * @returns {Object} A map of {String} -> {Scope}. Keys are FunctionDecl or FunctionExpr names, values are the 
		 * uppermost scope that binds the name.
		 */
		function createNamedFunctionMap(scope) {
			var upper = scope.upper;
			var named = Object.create(null);

			// Hack to walk past upper scope lacking a _namedFunctions map. This happens because escope generates
			// 2 scopes for a FunctionExpression. The first is never returned by context.getScope() as it is not
			// the innermost, so this rule never visits it.
			while (upper && !upper._namedFunctions) { upper = upper.upper; }
			if (upper) {
				// Propagate upper scope's named functions to ours
				util.mixin(named, upper._namedFunctions);
			}
			addNamedFunctions(named, scope);
			scope._namedFunctions = named;
			return named;
		}

		function isParameter(variable) {
			return variable.defs.some(function(def) {
				return def.type === "Parameter";
			});
		}

		function checkScope(node) {
			var scope = context.getScope();
			var namedFunctions = createNamedFunctionMap(scope);

			scope.variables.forEach(function(variable) {
				// If variable collides with a named function name from an upper scope, it's a redeclaration. Unless
				// the variable is a param, then we allow it.
				var bindingSource;
				if (node.type !== "Program" && (bindingSource = namedFunctions[variable.name]) && bindingSource !== scope && !isParameter(variable)) {
					reportRedeclaration(variable.defs[0].name, variable.name);
				}

				// If variable has multiple defs, every one after the 1st is a redeclaration
				var defs = variable.defs.filter(function(def) {
					// Workaround for escope bug
					// https://github.com/Constellation/escope/issues/21
					return def.type !== "ImplicitGlobalVariable";
				});
				defs.forEach(function(def, i) {
					if (i > 0) {
						reportRedeclaration(def.name, def.name.name);
					}
				});
			});
		}

		return {
			"Program": checkScope,
			"FunctionDeclaration": checkScope,
			"FunctionExpression": checkScope
		};
	};
	return module.exports;
}));
