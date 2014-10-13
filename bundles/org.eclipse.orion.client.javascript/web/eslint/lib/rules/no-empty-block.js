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
		var comments;
		
		return {
		    'Program' : function(node) {
		          comments = node.comments;  
		    },
			'BlockStatement' : function(node) {
			    try {
    			    if(node.body.length < 1) {
    			        for(var i = 0; i < comments.length; i++) {
    			            var range = comments[i].range;
    			            if(range[0] >= node.range[0] && range[1] <= node.range[1]) {
    			                //a commented empty block, ignore
    			                return;
    			            }
    			        }
    			        context.report(node, 'Empty block should be removed or commented.');
    			    }
			    }
			    catch(ex) {
			        Logger.log(ex);
			    }
			}
		};
	};
});
