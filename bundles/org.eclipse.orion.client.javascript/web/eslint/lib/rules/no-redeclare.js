/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define([
'eslint/util', 
'logger'
], function(util, Logger) {
	return function(context) {
		"use strict";  //$NON-NLS-0$

		function reportRedeclaration(node, name) {
			context.report(node, "'${0}' is already defined.", {0:name});
		}

		/**
		 * @name addNamedFunctions
		 * @description Adds named functions to the given map
		 * @param map
		 * @param scope
		 * @returns {Boolean} If scope vars were added to the map
		 */
		function addNamedFunctions(map, scope) {
			scope.variables.forEach(function(variable) {
				variable.defs.some(function(def) {
					if (def.type === "FunctionName") {  //$NON-NLS-0$
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

		/**
		 * @name isParameter
		 * @description Returns if the given variable is a parameter or not
		 * @param variable
		 * @returns {Boolean} If the given variable is a parameter
		 */
		function isParameter(variable) {
			return variable.defs.some(function(def) {
				return def.type === "Parameter";  //$NON-NLS-0$
			});
		}

		function checkScope(node) {
			try {
				var scope = context.getScope();
				if(node.type === 'FunctionExpression' && node.id && node.id.name) {
				    scope  = scope.upper;
				}
				var namedFunctions = createNamedFunctionMap(scope);
	
				scope.variables.forEach(function(variable) {
					// If variable collides with a named function name from an upper scope, it's a redeclaration. Unless
					// the variable is a param, then we allow it.
					var bindingSource;
					if (node.type !== "Program" && (bindingSource = namedFunctions[variable.name]) && bindingSource !== scope && !isParameter(variable)) {  //$NON-NLS-0$
						reportRedeclaration(variable.defs[0].name, variable.name);
					}
	
					// If variable has multiple defs, every one after the 1st is a redeclaration
					variable.defs.forEach(function(def, i) {
						if (i > 0) {
							reportRedeclaration(def.name, def.name.name);
						}
					});
				});
			}
			catch(ex) {
				Logger.log(ex);
			}
		}

		return {
			"Program": checkScope,  //$NON-NLS-0$
			"FunctionDeclaration": checkScope,  //$NON-NLS-0$
			"FunctionExpression": checkScope  //$NON-NLS-0$
		};
	};
});
