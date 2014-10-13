/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(["orion/plugin", 'orion/editor/textModel'], function(PluginProvider, TextModel) {
	var headers = {
		name: "Hover Test Plugin (2)",
		version: "1.0", //$NON-NLS-0$
		description: "Second Plugin to test Hover Help",
	};
	var provider = new PluginProvider(headers);

	function getHoverInfo(editorContext, context) {
		if (context.annotations.length === 0)
			return null;

		var self = this;
		return editorContext.getText().then(function(text) {
			self.textModel = new TextModel.TextModel(text);
				
			var msg = context.annotations[0];
			if (msg === "Values of 0 shouldn't have units specified.") {
				return fixUnits(context);
			} else if (msg === "Rule is empty.") {
				return fixEmpty(context);
			}
		});
	}
	function fixUnits(context) {
		var lineIndex = this.textModel.getLineAtOffset(context.offset);
		var lineStart = this.textModel.getLineStart(lineIndex);
		var lineEnd = this.textModel.getLineEnd(lineIndex, false);
		
		// Find the trailing ';'
		var curIndex = lineEnd;
		while (curIndex >= lineStart && this.textModel.getText(curIndex, curIndex+1) !== ';') {
			curIndex--;
		}
		
		if (curIndex > lineStart) {
			var semiIndex = curIndex;
			
			// Now find the '0'
			while (curIndex >= lineStart && this.textModel.getText(curIndex, curIndex+1) !== '0') {
				curIndex--;
			}
			if (curIndex > lineStart) {
				var zeroIndex = curIndex;
				return  {title: 'Remove unit specification', 
					type: 'proposal',
					text: '',
					start: zeroIndex+1,
					end: semiIndex};
					}
		}
		return null;
	}

	function fixEmpty(context) {
		var lineIndex = this.textModel.getLineAtOffset(context.offset);
		var lineStart = this.textModel.getLineStart(lineIndex);
		
		// Find the closing '}'
		var curIndex = lineStart;
		while (this.textModel.getText(curIndex, curIndex+1) !== '}') {
			curIndex++;
		}

		var endIndex = this.textModel.getLineAtOffset(curIndex);
		var end = this.textModel.getLineEnd(endIndex, true);
		return  {title: 'Remove Rule', 
			type: 'proposal',
			text: '',
			start: lineStart,
			end: end};
	}


	var serviceImpl = {
		computeHoverInfo: function(editorContext, context) {
			return getHoverInfo(editorContext, context);
		}
	};
	var properties = {
		name: "Hover Help",
		tipTitle: "Auto Correct",
		contentType: ["text/css"]
	};
	provider.registerService("orion.edit.hover", serviceImpl, //$NON-NLS-0$
	properties);
	provider.connect();
});