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
 * 	   IBM Corporation - bug fixes / improvements
 ******************************************************************************/
/*eslint-env amd */
define(function() {

	return {
	    
	    /**
    	 * @name getPrefix
    	 * @description computes the pprefix to use during content assist, performs special computation for jsdoc and
    	 * block comments that allow chars normal JS does not
    	 * @function
    	 * @param {String} buffer
    	 * @param {Object} context
    	 * @param {String} kind
    	 * @returns {String} The prefix to use
    	 */
    	getPrefix: function getPrefix(buffer, context, kind) {
		    var prefix = context.prefix;
		    if(typeof prefix === 'string' && typeof context.line === 'string') {
		        switch(kind) {
		            case 'doc':
		            case 'jsdoc': {
		                var index = context.offset-1;
		                var word = '', char = buffer.charAt(index);
		                //do an initial check before looping + regex'ing
		                if('{*,'.indexOf(char) > -1) {
        		            return word;
        		        }
    		            if(char === '@') {
        		            return '@';
        		        }
		                while(index >= 0 && /\S/.test(char)) {
		                    word = char+word;
		                    if(char === '@') {
		                        //we want the prefix to include the '@'
            		            return word;
            		        }
		                    index--;
		                    char = buffer.charAt(index);
		                    if('{*,'.indexOf(char) > -1) {
		                        // we don't want the prefix to include the '*'
        		                return word;
        		            }
		                }
                        return word;        		        
		            }
		        }
		    }
		    return prefix;
		},
	    
		/**
		 * @description Match ignoring case and checking camel case.
		 * @function
		 * @public
		 * @param {String} prefix
		 * @param {String} target
		 * @returns {Boolean} If the two strings match
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
		 * @description Convert an input string into parts delimited by upper case characters. Used for camel case matches.
		 * e.g. GroClaL = ['Gro','Cla','L'] to match say 'GroovyClassLoader'.
		 * e.g. mA = ['m','A']
		 * @function
		 * @public
		 * @param {String} str
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
		/**
		 * @description Returns if the string starts with the given prefix
		 * @function
		 * @public
		 * @param {String} s The string to check
		 * @param {String} pre The prefix 
		 * @returns {Boolean} True if the string starts with the prefix
		 */
		startsWith : function(s, pre) {
			return s.slice(0, pre.length) === pre;
		},
		
		/**
		 * @description Returns if the given character is upper case or not considering the locale
		 * @param {String} string A string of at least one char14acter
		 * @return {Boolean} True iff the first character of the given string is uppercase
		 */
		isUpperCase : function(string) {
			if (string.length < 1) {
			return false;
			}
			if (isNaN(string.charCodeAt(0))) {
				return false;
			}
			return string.toLocaleUpperCase().charAt(0) === string.charAt(0);
		},
		/**
		 * @description Creates a string with the same char repeated the given number of times
		 * @param {String} char The character to repeat
		 * @param {Number} times The number of times to repeaet the character
		 * @returns {String} The new string
		 */
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
		 * @description Checks that offset is before the range
		 * @function
		 * @public
		 * @param {Number} offset The offset
		 * @param {Array} range The range array [start, end]
		 * @return {Boolean} If the offset is before the range start
		 */
		isBefore : function(offset, range) {
			if (!range) {
				return true;
			}
			return offset < range[0];
		},
		
		/**
		 * @description Determines if the offset is inside this member expression, but after the '.' and before the
		 * start of the property.
		 * eg, the following returns true:
		 *   foo   .^bar
		 *   foo   .  ^ bar
		 * The following returns false:
		 *   foo   ^.  bar
		 *   foo   .  b^ar
		 * @function
		 * @public
		 * @param {Number} offset The offset
		 * @param {Object} memberExpr The MemberExpression AST node
		 * @param {String} contents The backing compilation unit text
		 * @return {Boolean} If the offset is in a member expression but after a '.'
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
		},
		
		/**
		 * @description Extracts all doccomments that fall inside the given range.
		 * Side effect is to remove the array elements
		 * @function
		 * @public
		 * @param {Array} doccomments The coments array from the AST
		 * @param {Array} range The range array [start, end]
		 * @return {Array} The array of comments within the given range
		 * @since 6.0
		 */
		extractDocComments: function(doccomments, range) {
			var start = 0, end = 0, i, docStart, docEnd;
			for (i = 0; i < doccomments.length; i++) {
				docStart = doccomments[i].range[0];
				docEnd = doccomments[i].range[1];
				if (!this.isBefore(docStart, range) || !this.isBefore(docEnd, range)) {
					break;
				}
			}
			if (i < doccomments.length) {
				start = i;
				for (i = i; i < doccomments.length; i++) {
					docStart = doccomments[i].range[0];
					docEnd = doccomments[i].range[1];
					if (!this.inRange(docStart, range, true) || !this.inRange(docEnd, range, true)) {
						break;
					}
				}
				end = i;
			}
			return doccomments.splice(start, end-start);
		}
	};
});
