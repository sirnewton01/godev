/*******************************************************************************
 * @license
 * Copyright (c) 2012 VMware, Inc. All Rights Reserved.
 * THIS FILE IS PROVIDED UNDER THE TERMS OF THE ECLIPSE PUBLIC LICENSE
 * ("AGREEMENT"). ANY USE, REPRODUCTION OR DISTRIBUTION OF THIS FILE
 * CONSTITUTES RECIPIENTS ACCEPTANCE OF THE AGREEMENT.
 * You can obtain a current copy of the Eclipse Public License from
 * http://www.opensource.org/licenses/eclipse-1.0.php
 *
 * Contributors:
 *     Andy Clement (VMware) - initial API and implementation
 *     Andrew Eisenberg (VMware) - implemented visitor pattern
 ******************************************************************************/

/*global define */
define(function() {

	/**
	 * checks that offset overlaps with the given range
	 * Since esprima ranges are zero-based, inclusive of
	 * the first char and exclusive of the last char, must
	 * use a +1 at the end.
	 * eg- (^ is the line start)
	 *	   ^x	---> range[0,0]
	 *	   ^  xx ---> range[2,3]
	 */
	function inRange(offset, range, includeEdge) {
		return range[0] <= offset && (includeEdge ? range[1] >= offset : range[1] > offset);
	}
	
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
		
		inRange : inRange,
		
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
			if (!inRange(offset-1, memberExpr.range) ||
				inRange(offset-1, memberExpr.object.range) ||
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