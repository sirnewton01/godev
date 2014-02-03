/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define*/

/**
 * This class extends orion/git/util to provide UI-related utility methods.
 */
define([
	'orion/compare/compareCommands',
	'orion/compare/resourceComparer',
	'orion/webui/littlelib',
	'orion/git/util',
], function(mCompareCommands, mResourceComparer, lib, mGitUtil) {
	var exports = Object.create(mGitUtil); // extend util

	/**
	 * Create an embedded toggleable compare widget inside a given DIV.
	 * @param {Object} serviceRegistry The serviceRegistry.
	 * @param {Object} commandService The commandService.
	 * @param {String} resoure The URL string of the complex URL which will be resolved by a diff provider into two file URLs and the unified diff.
	 * @param {Boolean} hasConflicts The flag to indicate if the compare contains conflicts.
	 * @param {Object} parentDivId The DIV node or string id of the DIV that holds the compare widget.
	 * @param {String} commandSpanId The id of the DIV where all the commands of the compare view are rendered. "Open in compare page", "toggle", "navigate diff" commands will be rendered.
	 * @param {Boolean} editableInComparePage The flag to indicate if opening compage will be editable on the left side. Default is false. Optional.
	 * @param {Object} gridRenderer If all the commands have to be rendered as grids, especially inside a row of Orion explorer, this has to be provided. Optional.
	 * @param {String} compareTo Optional. If the resource parameter is a simple file URL then this can be used as the second file URI to compare with.
	 */
	function createCompareWidget(serviceRegistry, commandService, resource, hasConflicts, parentDivId, commandSpanId, editableInComparePage, gridRenderer, compareTo) {
		var diffProvider = new mResourceComparer.DefaultDiffProvider(serviceRegistry);
		var cmdProvider = new mCompareCommands.CompareCommandFactory({commandService: commandService, commandSpanId: commandSpanId, gridRenderer: gridRenderer});
		var comparerOptions = {
			toggleable: true,
			type: "inline", //$NON-NLS-0$
			readonly: true,
			hasConflicts: hasConflicts,
			diffProvider: diffProvider,
			resource: resource,
			compareTo: compareTo,
			editableInComparePage: editableInComparePage
		};
		var viewOptions = {
			parentDivId: parentDivId,
			commandProvider: cmdProvider
		};
		var comparer = new mResourceComparer.ResourceComparer(serviceRegistry, commandService, comparerOptions, viewOptions);
		comparer.start().then(function(maxHeight) {
			var vH = 420;
			if (maxHeight < vH) {
				vH = maxHeight;
			}
			var diffContainer = lib.node(parentDivId);
			diffContainer.style.height = vH + "px"; //$NON-NLS-0$
		});
	}
	
	//return module exports
	exports.createCompareWidget = createCompareWidget;
	return exports;
});
