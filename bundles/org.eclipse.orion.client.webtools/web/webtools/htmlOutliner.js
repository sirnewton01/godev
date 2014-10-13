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
/*global define Tautologistics*/

define("webtools/htmlOutliner", [ //$NON-NLS-0$
	'orion/objects', //$NON-NLS-0$
	'htmlparser/htmlparser' //must go at the end, provides global object not amd module //$NON-NLS-0$
], function(Objects) {

	/**
	 * @description Creates a new validator
	 * @constructor
	 * @public
	 * @since 6.0
	 */
	function HtmlOutliner() {
	}

	Objects.mixin(HtmlOutliner.prototype, /** @lends webtools.HtmlOutliner.prototype*/ {
		
		/**
		 * @descripton API callback to compute the outline
		 */
		getOutline: function(contents, title) {
			return this.buildOutline(contents, title, false);
		},
		
		buildOutline: function(contents, title, filter) {
			var dom = this.parse(contents);
			if (!dom) {
				return null;
			}
			if (filter) {
				//only process the document body
				var body = this.findBody(dom);
				if (body) {
					dom = body;
				}
			}
			var outline = this.domToOutline(dom, filter);
			return outline;
		},
			
		parse: function(contents) {
			var domResult;
			var handler = new Tautologistics.NodeHtmlParser.HtmlBuilder(function(error, dom) {
				if (!error) {
					//parsing done
					domResult = dom;
				}
			}, {ignoreWhitespace: true, includeLocation: true, verbose: false});
			var parser = new Tautologistics.NodeHtmlParser.Parser(handler);
			parser.parseComplete(contents);
			return domResult;
		},
	
		/**
		 * Returns whether this HTML node should be omitted from the outline.
		 * @param {Object} node The HTML element
		 * @param {Boolean} filter if true the tree should be filtered to only show most relevant entries
		 * @return {boolean} true if the element should be skipped, and false otherwise
		 */
	
		skip: function(node, filter) {
			//skip nodes with no name
			if (!node.name) {
				return true;
			}
	
			//if user wants a full tree, do no further filtering
			if (!filter) {
				return false;
			}
			//skip formatting elements
			if (node.name === "b" || node.name === "i" || node.name === "em") { //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
				return true;
			}
	
			//skip paragraphs and other blocks of formatted text
			if (node.name === "p" || node.name === "tt" || node.name === "code" || node.name === "blockquote") { //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$
				return true;
			}
	
			//skip anchors
			if (node.name === "a") { //$NON-NLS-0$
				return true;
			}
	
			//include the element if we have no reason to skip it
			return false;
		},
	
		/**
		 * Converts an HTML dom element into a label
		 * @param {Object} element The HTML element
		 * @return {String} A human readable label
		 */
	
		domToLabel: function(node) {
			var label = node.name;
			//include id if present
			var match = /id=['"]\S*["']/.exec(node.raw); //$NON-NLS-0$
			if (match) {
				label = label + " " + match[0]; //$NON-NLS-0$
			}
			//include class if present
			match = /class=['"]\S*["']/.exec(node.raw); //$NON-NLS-0$
			if (match) {
				label = label + " " + match[0]; //$NON-NLS-0$
			}
			return label;
		},
	
		/**
		 * Converts an HTML DOM node into an outline element
		 * @param {Object} An HTML DOM node as returned by the Tautologistics HTML parser
		 * @param {Boolean} filter if true the tree should be filtered to only show most relevant entries
		 * @return {Object} A node in the outline tree
		 */
	
		domToOutline: function(dom, filter) {
			//end recursion
			if (!dom) {
				return null;
			}
			var outline = [];
			for (var i = 0; i < dom.length; i++) {
				var node = dom[i];
				if (!this.skip(node, filter)) {
					var element = {
						label: this.domToLabel(node),
						children: this.domToOutline(node.children, filter),
						line: node.location.line,
						offset: node.location.col,
						length: node.name.length
					};
					outline.push(element);
				}
			}
			if (outline.length > 0){
				return outline;
			}
			return null;
		},
	
		/**
		 * Returns the DOM node corresponding to the HTML body, 
		 * or null if no such node could be found.
		 */
	
		findBody: function(dom) {
			//recursively walk the dom looking for a body element
			for (var i = 0; i < dom.length; i++) {
				if (dom[i].name === "body") { //$NON-NLS-0$
					return dom[i].children;
				}
				if (dom[i].children) {
					var result = this.findBody(dom[i].children);
					if (result) {
						return result;
					}
				}
			}
			return null;
		}
	});
	
	return {
		HtmlOutliner : HtmlOutliner
	};
});