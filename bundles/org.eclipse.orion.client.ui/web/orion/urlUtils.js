/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define window document URL*/

define(['orion/PageUtil', "orion/URL-shim"], function(PageUtil) {
                
    /**
     * Detect if the given text contains URLs encoded by "[]()". Multiple occurences of the pattern "[displayString](url)" and the non-matched part are returned as an array of segments.
     * @param {String} text The given string to detect.
	 * @returns {Array} An array containing all the segments of the given string. Each segment has the following properties:
	 *     segmentStr: String. The display string in the segment.
	 *     urlStr: String. Only present if the segment is a valid URL.
	 */
	function detectValidURL(text) {
		var regex = /\[([^\]]*)\]\(([^\)]+)\)/g;
		var match = regex.exec(text), matches=[], lastNonMatchIndex = 0;
		while (match) {
			// match[0]: the string enclosed by the opening "[" and closing ")"
			// match[1]: the string inside the pair of "[" and "]"
			// match[2]: the string inside the pair of "(" and ")"
			if (match.length === 3 && match[2].length > 0){
				var url = new URL(match[2]);
				if (url.protocol !== ":" && PageUtil.validateURLScheme(url.href)) { //Check if it is a valid URL
					if (match.index > lastNonMatchIndex) { //We have to push a plain text segment first
						matches.push({segmentStr: text.substring(lastNonMatchIndex, match.index)});
					}
					matches.push({segmentStr: match[1].length > 0 ? match[1] : match[2], urlStr: match[2]});
					lastNonMatchIndex = match.index + match[0].length;
				}
			}
			match = regex.exec(text);
		}
		if (lastNonMatchIndex === 0) {
			return null;
		}
		if (lastNonMatchIndex < (text.length - 1)) {
			matches.push({segmentStr: text.substring(lastNonMatchIndex)});
		}
		return matches;
	}
	
    /**
     * Render an array of string segments.
     * @param {dom node} parentNode The given parent dom node where the segements will be rendered.
     * @param {Array} segements The given array containing all the segments. Each segment has the following properties:
	 *     segmentStr: String. The display string in the segment.
	 *     urlStr: String. Only present if the segment is a valid URL.
	 */
	function processURLSegments(parentNode, segments) {
		segments.forEach(function(segment) {
			if (segment.urlStr){
				var link = document.createElement("a"); //$NON-NLS-0$
		        link.href = segment.urlStr;
		        link.appendChild(document.createTextNode(segment.segmentStr));
				parentNode.appendChild(link);
			} else {
				var plainText = document.createElement("span"); //$NON-NLS-0$
				plainText.textContent = segment.segmentStr;
				parentNode.appendChild(plainText);
			}
		});
	}
	
	//return module exports
	return {
		detectValidURL: detectValidURL,
		processURLSegments: processURLSegments
	};
});
