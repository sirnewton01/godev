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
/*global define CSSLint*/

define("webtools/cssOutliner", [ //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'webtools/lib/csslint' //must go at the end, provides global object not amd module //$NON-NLS-0$
], function(Objects) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @since 6.0
	 */
	function CssOutliner() {
		CSSLint.addRule(CssOutliner.prototype._outlineRule);
	}

	Objects.mixin(CssOutliner.prototype, /** @lends webtools.CssOutliner.prototype*/ {
		
		/**
		 * @descripton API callback to compute the outline
		 */
		getOutline: function(contents, title) {
			CSSLint.verify(contents);
			return this._outlineRule.outline;
		},
		
		/**
		 * @description The CSS linting rule for creating the outline
		 * @private
		 */
		_outlineRule: {
			id: "css-outline",
			name: "CSS outline",
			desc: "CSS outline helper rule",
			browsers: "All",
			outline: [],
			/**
			 * @description API callback to start verifying
			 */
			init: function(parser, reporter) {
				this.outline = [];
				// Pushes selector info into the outline
				var that = this;
				parser.addListener("startrule", function(event) {
					var selectors = event.selectors;
					if (selectors && selectors.length) {
						var selectorText = [], line = null, col = null, length = null;
						for (var i=0; i < selectors.length; i++) {
							var sel = selectors[i];
							if (line === null) { line = sel.line; }
							if (col === null) { col = sel.col; }
							if (length === null) {
								length = sel.text.length;
								if (length > 0){ length--; /*length range is inclusive*/}
							}
							selectorText.push(sel.text);
						}
						that.outline.push({
							label: selectorText.join(", "),
							line: line,
							offset: col,
							length: length
						});
					}
				});
			}
		}
	});
	
	return {
		CssOutliner : CssOutliner
	};
});