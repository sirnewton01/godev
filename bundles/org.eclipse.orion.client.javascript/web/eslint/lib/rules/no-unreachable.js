/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
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
		
        /**
         * @description Returns if the statement is 'hoisted'
         * @param {Object} node The AST node to check
         * @see http://www.adequatelygood.com/JavaScript-Scoping-and-Hoisting.html
         * @returns {Boolean} If the node is hoisted (allowed) after a returnable statement
         */
        function hoisted(node) {
            switch(node.type) {
                case 'FunctionDeclaration':
                case 'VariableDeclaration':
                    return true;
            }
            return false;
        }
        
        /**
         * @description Check the array of child nodes for any unreachable nodes
         * @param {Array} children The child nodes to check
         * @since 6.0
         */
        function checkUnreachable(children) {
            try {
                var i = 0;
                for(i; i < children.length; i++) {
                    if(util.returnableStatement(children[i])) {
                        break;
                    }
                }
                //mark all the remaining child statemnts as unreachable
                for(i++; i < children.length; i++) {
                    var child = children[i];
                    if(!hoisted(child) && child.type !== "EmptyStatement") {
                        context.report(child, "Unreachable code.");
                    }
                }
            }
            catch(ex) {
                Logger.log(ex);
            }
        }

        return {
            "BlockStatement": function(node) {
                checkUnreachable(node.body);
            },
    
            "SwitchCase": function(node) {
                checkUnreachable(node.consequent);
            }
        };
	};
});
