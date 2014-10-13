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
'logger'
], function(Logger) {

	return function(context) {
		"use strict";  //$NON-NLS-0$
		
		return {
			'Program' : function(node) {
			    try {
    			    var comments = node.comments;
    			    var len;
    			    if(comments && (len = comments.length) && comments.length > 0) {
    			        for(var i = 0; i < len; i++) {
    			            var comment = comments[i];
    			            if(comment.type === 'Block') {
    			                var match = /^\s*(js[l|h]int)(\s+\w+:\w+)+/ig.exec(comment.value);
    			                if(match) {
    			                    var jslint = match[1];
    			                    if(jslint.length < 1) {
    			                        continue;
    			                    }
    			                    var start = 2 + comment.value.indexOf(jslint) + comment.range[0];
    			                    var end = start + jslint.length;
    			                    context.report({type:'BlockComment', range:[start, end], loc: comment.loc}, 'The \'${0}\' directive is unsupported, please use eslint-env.', {0:jslint});
    			                }
    			            }
    			        }
    			    }
			    }
			    catch(ex) {
			        Logger.log(ex);
			    }
			 }
		};
	};
});
