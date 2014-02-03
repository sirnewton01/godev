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
	'orion/editor/stylers/application_javascript/syntax' //$NON-NLS-0$
], function(mTemplates, mJS) {

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

	var uninterestingChars = ":!@#$^&*.?<>"; //$NON-NLS-0$

	var templates = [
		{
			prefix: "if", //$NON-NLS-0$
			name: "if",  //$NON-NLS-0$
			description: " - if statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "if", //$NON-NLS-0$
			name: "if", //$NON-NLS-0$
			description: " - if else statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array with local var", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for..in", //$NON-NLS-0$
			description: " - iterate over properties of an object", //$NON-NLS-0$
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}" //$NON-NLS-0$
		},
		{
			prefix: "while", //$NON-NLS-0$
			name: "while", //$NON-NLS-0$
			description: " - while loop with condition", //$NON-NLS-0$
			template: "while (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "do", //$NON-NLS-0$
			name: "do", //$NON-NLS-0$
			description: " - do while loop with condition", //$NON-NLS-0$
			template: "do {\n\t${cursor}\n} while (${condition});" //$NON-NLS-0$
		},
		{
			prefix: "switch", //$NON-NLS-0$
			name: "switch", //$NON-NLS-0$
			description: " - switch case statement", //$NON-NLS-0$
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n}" //$NON-NLS-0$
		},
		{
			prefix: "case", //$NON-NLS-0$
			name: "case", //$NON-NLS-0$
			description: " - case statement", //$NON-NLS-0$
			template: "case ${value}:\n\t${cursor}\n\tbreak;" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}" //$NON-NLS-0$
			},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement with finally block", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} finally {\n}" //$NON-NLS-0$
		},
		{
			prefix: "typeof", //$NON-NLS-0$
			name: "typeof", //$NON-NLS-0$
			description: " - typeof statement", //$NON-NLS-0$
			template: "typeof ${object} === \"${type:" + JSON.stringify(typeofValues).replace("}", "\\}") + "}\"" //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "instanceof", //$NON-NLS-0$
			name: "instanceof", //$NON-NLS-0$
			description: " - instanceof statement", //$NON-NLS-0$
			template: "${object} instanceof ${type}" //$NON-NLS-0$
		},
		{
			prefix: "with", //$NON-NLS-0$
			name: "with", //$NON-NLS-0$
			description: " - with statement", //$NON-NLS-0$
			template: "with (${object}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			description: " - function declaration",  //$NON-NLS-0$
			template: "function ${name} (${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "nls", //$NON-NLS-0$
			name: "nls", //$NON-NLS-0$
			description: " - non NLS string", //$NON-NLS-0$
			template: "${cursor} //$NON-NLS-${0}$" //$NON-NLS-0$
		},
		{
			prefix: "log", //$NON-NLS-0$
			name: "log", //$NON-NLS-0$
			description: " - console log", //$NON-NLS-0$
			template: "console.log(${object});" //$NON-NLS-0$
		}
	];

	/**
	 * @name orion.editor.JSTemplateContentAssistProvider
	 * @class Provides content assist for JavaScript keywords.
	 */
	function JSTemplateContentAssistProvider() {
	}
	JSTemplateContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mJS.keywords, templates);

	/**
	 * @description Determines if the invocation location is a valid place to use
	 * templates.  We are not being too precise here.  As an approximation,
	 * just look at the previous character.
	 * @function
	 * @public
	 * @param {String} prefix The prefix of the proposal, if any
	 * @param {String} buffer The entire buffer from the editor
	 * @param {Number} offset The offset into the buffer
	 * @param {Object} context The completion context object from the editor
	 * @return {Boolean} true if the current invocation location is
	 * a valid place for template proposals to appear.
	 * This means that the invocation location is at the start of a new statement.
	 */
	JSTemplateContentAssistProvider.prototype.isValid = function(prefix, buffer, offset, context) {
		var char = buffer.charAt(offset-prefix.length-1);
		return !char || uninterestingChars.indexOf(char) === -1;
	};

	return {
		JSTemplateContentAssistProvider: JSTemplateContentAssistProvider
	};
});
