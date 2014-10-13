/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global CSSLint*/
/*eslint-env amd*/
define("webtools/cssValidator", [ //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'csslint' //must go at the end, provides global object not amd module //$NON-NLS-0$
], function(Objects) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @since 6.0
	 */
	function CssValidator() {
	}

	Objects.mixin(CssValidator.prototype, /** @lends webtools.CssLintCssValidator.prototype*/ {
		
		/**
		 * @description API callback to compute problems
		 */
		computeProblems: function(editorContext, context) {
			var that = this;
			return editorContext.getText().then(function(text) {
				return that._computeProblems(text);
			});
		},
		
		/**
		 * @description Create the problems 
		 * @function
		 * @private
		 * @param {String} contents The file contents
		 * @returns {Array} The problem array
		 */
		_computeProblems: function(contents) {
			var cssResult = CSSLint.verify(contents),
			    messages = cssResult.messages,
			    lines = contents.split(/\r?\n/),
			    problems = [];
			for (var i=0; i < messages.length; i++) {
				var message = messages[i];
				if (message.line) {
					var lineText = lines[message.line - 1];
					var problem = {
						description: message.message,
						line: message.line,
						start: message.col,
						end: lineText.indexOf(message.evidence) + message.evidence.length,
						severity: message.type
					};
					problems.push(problem);
				}
			}
			return {problems: problems};
		}
	});
	
	return {
		CssValidator : CssValidator
	};
});