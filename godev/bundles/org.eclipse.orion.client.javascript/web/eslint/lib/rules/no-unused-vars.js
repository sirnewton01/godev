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
/*jslint node:true amd:true*/
(function(root, factory) {
	if(typeof exports === 'object') {
		module.exports = factory(require, exports, module);
	}
	else if(typeof define === 'function' && define.amd) {
		define(['require', 'exports', 'module'], factory);
	}
	else {
		var req = function(id) {return root[id];},
			exp = root,
			mod = {exports: exp};
		root.rules.noundef = factory(req, exp, mod);
	}
}(this, function(require, exports, module) {
	module.exports = function(context) {
		"use strict";

		function isRead(ref) {
			return ref.isRead();
		}

		function getReferences(scope, variable) {
			var refs = variable.references;
			if (scope.type === "global") {
				// For whatever reason, a reference to some variable 'x' defined in global scope does not cause an entry
				// in x.references or globalScope.references. So we append any refs in globalScope.through that mention x.
				refs = refs.concat(scope.through.filter(function(ref) {
					return ref.identifier.name === variable.name;
				}));
			}
			return refs;
		}

		function check(node) {
			var scope = context.getScope();
			scope.variables.forEach(function(variable) {
				if (!variable.defs.length || variable.defs[0].type === "Parameter") { // Don't care about parameters
					return;
				}
				var references = getReferences(scope, variable), id = variable.defs[0].node.id;
				if (!references.length) {
					context.report(id, "'{{name}}' is never used.", {name: id.name});
				} else if (!references.some(isRead)) {
					context.report(id, "'{{name}}' is never read.", {name: id.name});
				}
			});
		}

		return {
			"Program": check,
			"FunctionDeclaration": check,
			"FunctionExpression": check
		};
	};
	return module.exports;
}));
