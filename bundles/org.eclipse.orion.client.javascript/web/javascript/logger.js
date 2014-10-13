/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd, node, browser*/
define([
], function() {

    return {
        /**
         * @name log
         * @description wraps logging in case we have the worker support turned on
         * @function
         * @since 7.0
         */
        log: function log() {
            if(typeof console !== 'undefined' && console && console.log) {
                console.log.apply(console, arguments);
            } else if(postMessage) {
                postMessage.apply(null, arguments);
            }
        },
        
        /**
         * @name error
         * @description wraps logging in case we have the worker support turned on
         * @function
         * @since 7.0
         */
        error: function error() {
            if(typeof console !== 'undefined' && console && console.error) {
                console.error.apply(console, arguments);
            } else if(postMessage) {
                postMessage.apply(null, arguments);
            }
        }
    };
});