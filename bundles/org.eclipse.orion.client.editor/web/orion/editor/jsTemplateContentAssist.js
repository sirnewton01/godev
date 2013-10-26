/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andrew Eisenberg - rename to jsTemplateContentAssist.js
 *******************************************************************************/
/*global define */

define("orion/editor/jsTemplateContentAssist", [ //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/keywords' //$NON-NLS-0$
], function(mTemplates, mKeywords) {

	function findPreviousChar(buffer, offset) {
		var c = "";
		while (offset >= 0) {
			c = buffer[offset];
			if (c === '\n' || c === '\r') { //$NON-NLS-1$ //$NON-NLS-0$
				//we hit the start of the line so we are done
				break;
			} else if (/\s/.test(c)) {
				offset--;
			} else {
				// a non-whitespace character, we are done
				break;
			}
		}
		return c;
	}
	
	var typeofValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"undefined", //$NON-NLS-0$
			"object", //$NON-NLS-0$
			"boolean", //$NON-NLS-0$
			"number", //$NON-NLS-0$
			"string", //$NON-NLS-0$
			"function", //$NON-NLS-0$
			"xml" //$NON-NLS-0$
		]
	};
	
	function fromJSON(o) {
		return JSON.stringify(o).replace("}", "\\}"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	var uninterestingChars = ":!@#$^&*.?<>"; //$NON-NLS-0$

	var templates = [
		{
			prefix: "if", //$NON-NLS-0$
			description: "if - if statement",
			template: "if (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "if", //$NON-NLS-0$
			description: "if - if else statement",
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			description: "for - iterate over array",
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			description: "for - iterate over array with local var",
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			description: "for..in - iterate over properties of an object",
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}" //$NON-NLS-0$
		},
		{
			prefix: "while", //$NON-NLS-0$
			description: "while - while loop with condition",
			template: "while (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "do", //$NON-NLS-0$
			description: "do - do while loop with condition",
			template: "do {\n\t${cursor}\n} while (${condition});" //$NON-NLS-0$
		},
		{
			prefix: "switch", //$NON-NLS-0$
			description: "switch - switch case statement",
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n}" //$NON-NLS-0$
		},
		{
			prefix: "case", //$NON-NLS-0$
			description: "case - case statement",
			template: "case ${value}:\n\t${cursor}\n\tbreak;" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			description: "try - try..catch statement",
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}" //$NON-NLS-0$
			},
		{
			prefix: "try", //$NON-NLS-0$
			description: "try - try..catch statement with finally block",
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} finally {\n}" //$NON-NLS-0$
		},
		{
			prefix: "var", //$NON-NLS-0$
			description: "var - variable declaration",
			template: "var ${name};" //$NON-NLS-0$
		},
		{
			prefix: "var", //$NON-NLS-0$
			description: "var - variable declaration with value",
			template: "var ${name} = ${value};" //$NON-NLS-0$
		},
		{
			prefix: "let", //$NON-NLS-0$
			description: "let - local scope variable declaration",
			template: "let ${name};" //$NON-NLS-0$
		},
		{
			prefix: "let", //$NON-NLS-0$
			description: "let - local scope variable declaration with value",
			template: "let ${name} = ${value};" //$NON-NLS-0$
		},
		{
			prefix: "return", //$NON-NLS-0$
			description: "return - return result",
			template: "return ${result};" //$NON-NLS-0$
		},
		{
			prefix: "typeof", //$NON-NLS-0$
			description: "typeof - typeof statement",
			template: "typeof ${object} === \"${type:" + fromJSON(typeofValues) + "}\"" //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "instanceof", //$NON-NLS-0$
			description: "instanceof - instanceof statement",
			template: "${object} instanceof ${type}" //$NON-NLS-0$
		},
		{
			prefix: "with", //$NON-NLS-0$
			description: "with - with statement",
			template: "with (${object}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			description: "function - function declaration",
			template: "function ${name} (${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "nls", //$NON-NLS-0$
			description: "string - non NLS",
			template: "${cursor} //$NON-NLS-${0}$" //$NON-NLS-0$
		},
		{
			prefix: "log", //$NON-NLS-0$
			description: "log - console log",
			template: "console.log(${object});" //$NON-NLS-0$
		}
	];

	/**
	 * @name orion.editor.JSTemplateContentAssistProvider
	 * @class Provides content assist for JavaScript keywords.
	 */
	function JSTemplateContentAssistProvider() {
	}
	JSTemplateContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mKeywords.JSKeywords, templates);

	/** 
	 * Determines if the invocation location is a valid place to use
	 * templates.  We are not being too precise here.  As an approximation,
	 * just look at the previous character.
	 *
	 * @return {Boolean} true if the current invocation location is 
	 * a valid place for template proposals to appear.
	 * This means that the invocation location is at the start of a new statement.
	 */
	JSTemplateContentAssistProvider.prototype.isValid = function(prefix, buffer, offset, context) {
		var previousChar = findPreviousChar(buffer, offset-prefix.length-1);
		return !previousChar || uninterestingChars.indexOf(previousChar) === -1;
	};

	return {
		JSTemplateContentAssistProvider: JSTemplateContentAssistProvider
	};
});