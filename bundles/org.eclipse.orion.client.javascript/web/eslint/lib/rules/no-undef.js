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
'logger'
], function(Logger) {
    
    function isImplicitGlobal(variable) {
        return variable.defs.every(function(def) {
            return def.type === "ImplicitGlobalVariable";  //$NON-NLS-0$
        });
    }

    /**
     * Gets the declared variable, defined in `scope`, that `ref` refers to.
     * @param {Scope} scope
     * @param {Reference} ref
     * @returns {Variable} The variable, or null if ref refers to an undeclared variable.
     */
    function getDeclaredGlobalVariable(scope, ref) {
        var declaredGlobal = null;
        scope.variables.some(function(variable) {
            if (variable.name === ref.identifier.name) {
                // If it's an implicit global, it must have a `writeable` field (indicating it was declared)
                if (!isImplicitGlobal(variable) || Object.hasOwnProperty.call(variable, "writeable")) {  //$NON-NLS-0$
                    declaredGlobal = variable;
                    return true;
                }
            }
            return false;
        });
        return declaredGlobal;
    }
    
    return function(context) {
    
        "use strict";  //$NON-NLS-0$
    
        return {
    
            /**
             * @name Program
             * @description Linting for Program nodes
             * @function
             * @returns returns
             */
            "Program": function(/*node*/) {  //$NON-NLS-0$
    			try {
    	            var globalScope = context.getScope();
    	
    	            globalScope.through.forEach(function(ref) {
    	                var variable = getDeclaredGlobalVariable(globalScope, ref),
    	                    name = ref.identifier.name;
    	                if (!variable) {
    	                    context.report(ref.identifier, "'${0}' is not defined.", {0:name, nls: 'no-undef-defined'});
    	                } else if (ref.isWrite() && variable.writeable === false) {
    	                    context.report(ref.identifier, "'${0}' is read only.", {0:name, nls: 'no-undef-readonly'});
    	                }
    	            });
            	}
            	catch(ex) {
            		Logger.log(ex);
            	}
            }
        };
    
    };
});
