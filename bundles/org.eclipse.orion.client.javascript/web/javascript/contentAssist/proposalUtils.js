/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2014 VMware, Inc. and others.
 * All Rights Reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Andy Clement (VMware) - initial API and implementation
 *     Andrew Eisenberg (VMware) - implemented visitor pattern
 ******************************************************************************/

/*global define */
define(function() {

	return {
		/**
		 * Match ignoring case and checking camel case.
		 * @param prefix
		 * @param target
		 * @return {Boolean}
		 */
		looselyMatches: function(prefix, target) {
			if (target === null || prefix === null) {
				return false;
			}
	
			// Zero length string matches everything.
			if (prefix.length === 0) {
				return true;
			}
	
			// Exclude a bunch right away
			if (prefix.charAt(0).toLowerCase() !== target.charAt(0).toLowerCase()) {
				return false;
			}
	
			if (this.startsWith(target, prefix)) {
				return true;
			}
	
			var lowerCase = target.toLowerCase();
			if (this.startsWith(lowerCase, prefix)) {
				return true;
			}
	
			// Test for camel characters in the prefix.
			if (prefix === prefix.toLowerCase()) {
				return false;
			}
	
			var prefixParts = this.toCamelCaseParts(prefix);
			var targetParts = this.toCamelCaseParts(target);
	
			if (prefixParts.length > targetParts.length) {
				return false;
			}
	
			for (var i = 0; i < prefixParts.length; ++i) {
				if (!this.startsWith(targetParts[i], prefixParts[i])) {
					return false;
				}
			}
	
			return true;
		},
	
		/**
		 * Convert an input string into parts delimited by upper case characters. Used for camel case matches.
		 * e.g. GroClaL = ['Gro','Cla','L'] to match say 'GroovyClassLoader'.
		 * e.g. mA = ['m','A']
		 * @param String str
		 * @return Array.<String>
		 */
		toCamelCaseParts: function(str) {
			var parts = [];
			for (var i = str.length - 1; i >= 0; --i) {
				if (this.isUpperCase(str.charAt(i))) {
					parts.push(str.substring(i));
					str = str.substring(0, i);
				}
			}
			if (str.length !== 0) {
				parts.push(str);
			}
			return parts.reverse();
		},
	
		startsWith : function(str, start) {
			return str.substr(0, start.length) === start;
		},
		
		isUpperCase : function(char) {
			return char >= 'A' && char <= 'Z';
		},
		
		repeatChar : function(char, times) {
			var str = "";
			for (var i = 0; i < times; i++) {
				str += char;
			}
			return str;
		},
		
		/**
		 * @description Checks that offset overlaps with the given range
		 * Since esprima ranges are zero-based, inclusive of
		 * the first char and exclusive of the last char, must
		 * use a +1 at the end.
		 * eg- (^ is the line start)
		 *	   ^x	---> range[0,0]
		 *	   ^  xx ---> range[2,3]
		 * @function
		 * @public
		 * @param {Number} offset The offset into the source
		 * @param {Array.<Number>} range The start and end range of the editor selection
		 * @param {Boolean} includeEdge if we should include the trailing edge of the range
		 * @returns {Boolean} If the given offset is within the given range
		 */
		inRange : function(offset, range, includeEdge) {
			return range[0] <= offset && (includeEdge ? range[1] >= offset : range[1] > offset);
		},
		
		/**
		 * checks that offset is before the range
		 * @return Boolean
		 */
		isBefore : function(offset, range) {
			if (!range) {
				return true;
			}
			return offset < range[0];
		},
		
		/**
		 * Determines if the offset is inside this member expression, but after the '.' and before the
		 * start of the property.
		 * eg, the following returns true:
		 *   foo   .^bar
		 *   foo   .  ^ bar
		 * The following returns false:
		 *   foo   ^.  bar
		 *   foo   .  b^ar
		 * @return Boolean
		 */
		afterDot : function(offset, memberExpr, contents) {
			// check for broken AST
			var end;
			if (memberExpr.property) {
				end = memberExpr.property.range[0];
			} else {
				// no property expression, use the end of the memberExpr as the end to look at
				// in this case assume that the member expression ends just after the dot
				// this allows content assist invocations to work on the member expression when there
				// is no property
				end = memberExpr.range[1] + 2;
			}
			// we are not considered "after" the dot if the offset
			// overlaps with the property expression or if the offset is
			// after the end of the member expression
			if (!this.inRange(offset-1, memberExpr.range) ||
				this.inRange(offset-1, memberExpr.object.range) ||
				offset > end) {
				return false;
			}
	
			var dotLoc = memberExpr.object.range[1];
			while (contents.charAt(dotLoc) !== "." && dotLoc < end) {
				dotLoc++;
			}
	
			if (contents.charAt(dotLoc) !== ".") {
				return false;
			}
	
			return dotLoc < offset;
		}
	};
});