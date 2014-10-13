/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define("webtools/cssContentAssist", [ //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/stylers/text_css/syntax' //$NON-NLS-0$
], function(mTemplates, mCSS) {

	var overflowValues = {
		type: "link", //$NON-NLS-0$
		values: ["visible", "hidden", "scroll", "auto", "no-display", "no-content"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var fontStyleValues = {
		type: "link", //$NON-NLS-0$
		values: ["italic", "normal", "oblique", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var fontWeightValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"bold", "normal", "bolder", "lighter", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"100", "200", "300", "400", "500", "600", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"700", "800", "900", "inherit" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	var displayValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"none", "block", "box", "flex", "inline", "inline-block", "inline-flex", "inline-table", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"list-item", "table", "table-caption", "table-cell", "table-column", "table-column-group", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			"table-footer-group", "table-header-group", "table-row", "table-row-group", "inherit" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	var visibilityValues = {
		type: "link", //$NON-NLS-0$
		values: ["hidden", "visible", "collapse", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var positionValues = {
		type: "link", //$NON-NLS-0$
		values: ["absolute", "fixed", "relative", "static", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var whitespaceValues = {
		type: "link", //$NON-NLS-0$
		values: ["pre", "pre-line", "pre-wrap", "nowrap", "normal", "inherit"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var wordwrapValues = {
		type: "link", //$NON-NLS-0$
		values: ["normal", "break-word"] //$NON-NLS-1$ //$NON-NLS-0$
	};
	var floatValues = {
		type: "link", //$NON-NLS-0$
		values: ["left", "right", "none", "inherit"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var borderStyles = {
		type: "link", //$NON-NLS-0$
		values: ["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset"] //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	};
	var widths = {
		type: "link", //$NON-NLS-0$
		values: []
	};
	for (var i=0; i<10; i++) {
		widths.values.push(i.toString());
	}
	var colorValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"black", //$NON-NLS-0$
			"white", //$NON-NLS-0$
			"red", //$NON-NLS-0$
			"green", //$NON-NLS-0$
			"blue", //$NON-NLS-0$
			"magenta", //$NON-NLS-0$
			"yellow", //$NON-NLS-0$
			"cyan", //$NON-NLS-0$
			"grey", //$NON-NLS-0$
			"darkred", //$NON-NLS-0$
			"darkgreen", //$NON-NLS-0$
			"darkblue", //$NON-NLS-0$
			"darkmagenta", //$NON-NLS-0$
			"darkcyan", //$NON-NLS-0$
			"darkyellow", //$NON-NLS-0$
			"darkgray", //$NON-NLS-0$
			"lightgray" //$NON-NLS-0$
		]
	};
	var cursorValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"auto", //$NON-NLS-0$
			"crosshair", //$NON-NLS-0$
			"default", //$NON-NLS-0$
			"e-resize", //$NON-NLS-0$
			"help", //$NON-NLS-0$
			"move", //$NON-NLS-0$
			"n-resize", //$NON-NLS-0$
			"ne-resize", //$NON-NLS-0$
			"nw-resize", //$NON-NLS-0$
			"pointer", //$NON-NLS-0$
			"progress", //$NON-NLS-0$
			"s-resize", //$NON-NLS-0$
			"se-resize", //$NON-NLS-0$
			"sw-resize", //$NON-NLS-0$
			"text", //$NON-NLS-0$
			"w-resize", //$NON-NLS-0$
			"wait", //$NON-NLS-0$
			"inherit" //$NON-NLS-0$
		]
	};
	
	function fromJSON(o) {
		return JSON.stringify(o).replace("}", "\\}"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	var templates = [
		{
			prefix: "rule", //$NON-NLS-0$
			description: "rule - class selector rule",
			template: ".${class} {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "rule", //$NON-NLS-0$
			description: "rule - id selector rule",
			template: "#${id} {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "outline", //$NON-NLS-0$
			description: "outline - outline style",
			template: "outline: ${color:" + fromJSON(colorValues) + "} ${style:" + fromJSON(borderStyles) + "} ${width:" + fromJSON(widths) + "}px;" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "background-image", //$NON-NLS-0$
			description: "background-image - image style",
			template: "background-image: url(\"${uri}\");" //$NON-NLS-0$
		},
		{
			prefix: "url", //$NON-NLS-0$
			description: "url - url image",
			template: "url(\"${uri}\");" //$NON-NLS-0$
		},
		{
			prefix: "rgb", //$NON-NLS-0$
			description: "rgb - rgb color",
			template: "rgb(${red},${green},${blue});" //$NON-NLS-0$
		},
		{
			prefix: "@", //$NON-NLS-0$
			description: "import - import style sheet",
			template: "@import \"${uri}\";" //$NON-NLS-0$
		}
	];
	var valuesProperties = [
		{prop: "display", values: displayValues}, //$NON-NLS-0$
		{prop: "overflow", values: overflowValues}, //$NON-NLS-0$
		{prop: "overflow-x", values: overflowValues}, //$NON-NLS-0$
		{prop: "overflow-y", values: overflowValues}, //$NON-NLS-0$
		{prop: "float", values: floatValues}, //$NON-NLS-0$
		{prop: "position", values: positionValues}, //$NON-NLS-0$
		{prop: "cursor", values: cursorValues}, //$NON-NLS-0$
		{prop: "color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-top-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-bottom-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-right-color", values: colorValues}, //$NON-NLS-0$
		{prop: "border-left-color", values: colorValues}, //$NON-NLS-0$
		{prop: "background-color", values: colorValues}, //$NON-NLS-0$
		{prop: "font-style", values: fontStyleValues}, //$NON-NLS-0$
		{prop: "font-weight", values: fontWeightValues}, //$NON-NLS-0$
		{prop: "white-space", values: whitespaceValues}, //$NON-NLS-0$
		{prop: "word-wrap", values: wordwrapValues}, //$NON-NLS-0$
		{prop: "visibility", values: visibilityValues} //$NON-NLS-0$
	];
	var prop;
	for (i=0; i<valuesProperties.length; i++) {
		prop = valuesProperties[i];
		templates.push({
			prefix: prop.prop, //$NON-NLS-0$
			description: prop.prop + " - " + prop.prop + " style",
			template: prop.prop + ": ${value:" + fromJSON(prop.values) + "};" //$NON-NLS-1$ //$NON-NLS-0$
		});
	}	
	var pixelProperties = [
		"width", "height", "top", "bottom", "left", "right", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"min-width", "min-height", "max-width", "max-height", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"margin", "padding", "padding-left", "padding-right", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"padding-top", "padding-bottom", "margin-left", "margin-top", //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		"margin-bottom", "margin-right" //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	];
	for (i=0; i<pixelProperties.length; i++) {
		prop = pixelProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " pixel style",
			template: prop  + ": ${value}px;" //$NON-NLS-0$
		});
	}
	var fourWidthsProperties = ["padding", "margin"]; //$NON-NLS-1$ //$NON-NLS-0$
	for (i=0; i<fourWidthsProperties.length; i++) {
		prop = fourWidthsProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top right bottom left style",
			template: prop  + ": ${top}px ${left}px ${bottom}px ${right}px;" //$NON-NLS-0$
		});
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top right,left bottom style",
			template: prop  + ": ${top}px ${right_left}px ${bottom}px;" //$NON-NLS-0$
		});
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " top,bottom right,left style",
			template: prop  + ": ${top_bottom}px ${right_left}px" //$NON-NLS-0$
		});
	}
	var borderProperties = ["border", "border-top", "border-bottom", "border-left", "border-right"]; //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	for (i=0; i<borderProperties.length; i++) {
		prop = borderProperties[i];
		templates.push({
			prefix: prop, //$NON-NLS-0$
			description: prop + " - " + prop + " style",
			template: prop + ": ${width:" + fromJSON(widths) + "}px ${style:" + fromJSON(borderStyles) + "} ${color:" + fromJSON(colorValues) + "};" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		});
	}

	/**
	 * @name orion.editor.CssContentAssistProvider
	 * @class Provides content assist for CSS keywords.
	 */
	function CssContentAssistProvider() {
	}
	CssContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mCSS.keywords, templates);
	
	CssContentAssistProvider.prototype.getPrefix = function(buffer, offset, context) {
		var index = offset;
		while (index && /[A-Za-z\-\@]/.test(buffer.charAt(index - 1))) {
			index--;
		}
		return index ? buffer.substring(index, offset) : "";
	};

	return {
		CssContentAssistProvider: CssContentAssistProvider
	};
});
