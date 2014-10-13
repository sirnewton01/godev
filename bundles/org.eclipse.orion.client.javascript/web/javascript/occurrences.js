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
/*eslint-env amd*/
define([
'orion/objects',
'javascript/finder'
], function(Objects, Finder) {
	
	/**
	 * @name javascript.JavaScriptOccurrences
	 * @description creates a new instance of the outliner
	 * @constructor
	 * @public
	 * @param {javascript.ASTManager} astManager
	 */
	function JavaScriptOccurrences(astManager) {
		this.astManager = astManager;
	}
	
	Objects.mixin(JavaScriptOccurrences.prototype, /** @lends javascript.JavaScriptOccurrences.prototype*/ {
		
		/**
		 * @name computeOccurrences
		 * @description Callback from the editor to compute the occurrences
		 * @function
		 * @public 
		 * @memberof javascript.JavaScriptOccurrences.prototype
		 * @param {Object} editorContext The current editor context
		 * @param {Object} ctxt The current selection context
		 */
		computeOccurrences: function(editorContext, ctxt) {
			var that = this;
			switch(ctxt.contentType) {
				case 'text/html':
					return editorContext.getText().then(function(text) {
						var blocks = Finder.findScriptBlocks(text, ctxt.selection.start);
						if(blocks.length > 0) {
							var block = blocks[0];
							var ast = that.astManager.parse(block.text);
							var context = {
								selection: {
									start: ctxt.selection.start-block.offset, 
									end: ctxt.selection.end-block.offset
								}
							};
							var occurs = Finder.findOccurrences(ast, context);
							var len = occurs.length;
							for(var i = 0; i < len; i++) {
								occurs[i].start += block.offset;
								occurs[i].end += block.offset;
							}
						}
						return occurs;
					});
				case 'application/javascript':
					return this.astManager.getAST(editorContext).then(function(ast) {
						return Finder.findOccurrences(ast, ctxt);
					});
			}
		},
	});
	
	JavaScriptOccurrences.prototype.contructor = JavaScriptOccurrences;
	
	return {
		JavaScriptOccurrences: JavaScriptOccurrences
		};
});
