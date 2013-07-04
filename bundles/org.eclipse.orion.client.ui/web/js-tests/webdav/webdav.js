/*******************************************************************************
 * @license
 * Copyright (c) 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define XMLSerializer*/
define(function() {

	function serializeChildren(node) {
		var children = node.childNodes;
		if (children.length === 0) {
			return null;
		}
		
		if (children.length === 1 && children[0].nodeType === 3) {
			return children[0].nodeValue;
		}
		
		var result = "";
		var serializer = new XMLSerializer();
		for (var i = 0; i < children.length; i++) {
			result += serializer.serializeToString(children[i]);
		}
		return result;
	}
	
	function parseDAV_propstat(propstatElement) {
		var responsedescriptionElement = propstatElement.querySelector("responsedescription"),
		statusElement = propstatElement.querySelector("status"),
		propElement = propstatElement.querySelector("prop"),
		propChildren = propElement.childNodes,
		current,
		i,
		result = {};		
		
		if (responsedescriptionElement !==null) {
			result.responsedescription = serializeChildren(responsedescriptionElement);
		}
		
		if (statusElement !==null) {
			result.status = serializeChildren(statusElement);
		}
		
		result.prop = {"@xmlns": {"$":"DAV:"}};
		for (i = 0; i < propChildren.length; i++) {
			current = propChildren[i];
			if (current.nodeType === 1) {
				if (current.namespaceURI === "DAV:") {
					result.prop[current.localName] = serializeChildren(current);
				} else {								
					if (current.prefix !== null) {
						result.prop["@xmlns"][current.prefix] = current.namespaceURI;
					}
					result.prop[current.nodeName] = serializeChildren(current);
				}
			}
		}
		return result;
	}
	
	function parseDAV_response(responseElement) {
		var hrefElements = responseElement.querySelectorAll("href"),
		responsedescriptionElement = responseElement.querySelector("responsedescription"),
		statusElement,
		propstatElements,
		i,
		result = {href: []};
		
		if (responsedescriptionElement !==null) {
			result.responsedescription = serializeChildren(responsedescriptionElement);
		}
		
		if (hrefElements.length === 1) {
			result.href.push(serializeChildren(hrefElements[0]));
			result.propstat = [];
			propstatElements = responseElement.querySelectorAll("propstat");
			for (i = 0; i < propstatElements.length; i++) {
				result.propstat.push(parseDAV_propstat(propstatElements[i]));
			}
		} else {
			statusElement = responseElement.querySelector("status");
			if (statusElement) {
				result.status = serializeChildren(statusElement);
			}
			for (i=0; i < hrefElements.length; i++) {
				result.href.push(serializeChildren(hrefElements[i]));
			}
		}
		return result;
	}

	function parseDAV_multistatus(text) {
		var dom = new DOMParser().parseFromString(text, "text/xml");
		var multistatusElement = dom.childNodes[0];
		var responseElements = multistatusElement.querySelectorAll("response"),
		responsedescriptionElement = multistatusElement.querySelector("responsedescription"),
		i,
		result = {response: []};
		
		if (responsedescriptionElement !==null) {
			result.responsedescription = serializeChildren(responsedescriptionElement);
		}
		
		for (i = 0; i < responseElements.length; i++) {
			result.response.push(parseDAV_response(responseElements[i]));
		}
		return result;
	}

	return {parseDAV_multistatus: parseDAV_multistatus};
});