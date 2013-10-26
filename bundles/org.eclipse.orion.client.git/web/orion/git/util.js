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
/*global define window document navigator*/

/**
 * This class contains static utility methods. It is not intended to be instantiated.
 * @class This class contains static utility methods.
 * @name orion.util
 */
define(['i18n!git/nls/gitmessages', 'orion/compare/compareCommands', 'orion/compare/resourceComparer', 'orion/webui/littlelib'], function(messages, mCompareCommands, mResourceComparer, lib) {
                
	var interestedUnstagedGroup = ["Missing", "Modified", "Untracked", "Conflicting"]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var interestedStagedGroup = ["Added", "Changed", "Removed"]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var conflictPatterns = [["Both", "Modified", "Added", "Changed", "Missing"], ["RemoteDelete", "Untracked", "Removed"], ["LocalDelete", "Modified", "Added", "Missing"]]; //$NON-NLS-11$ //$NON-NLS-10$ //$NON-NLS-9$ //$NON-NLS-8$ //$NON-NLS-7$ //$NON-NLS-6$ //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var conflictType = "Conflicting"; //$NON-NLS-0$
	
	var statusUILocation = "git/git-status.html"; //$NON-NLS-0$
	
	function isStaged(change) {
		for (var i = 0; i < interestedStagedGroup.length; i++) {
			if (change.type === interestedStagedGroup[i]) {
				return true;
			}
		}
		return false;
	}
	
	function isUnstaged(change) {
		for (var i = 0; i < interestedUnstagedGroup.length; i++) {
			if (change.type === interestedUnstagedGroup[i]) {
				return true;
			}
		}
		return false;
	}
	
	function isChange(change) {
		return isStaged(change) || isUnstaged(change);
	}
	
	function hasStagedChanges(status) {
		for (var i = 0; i < interestedStagedGroup.length; i++) {
			if (status[interestedStagedGroup[i]].length > 0) {
				return true;
			}
		}
		return false;
	}
	
	function hasUnstagedChanges(status) {
		for (var i = 0; i < interestedUnstagedGroup.length; i++) {
			if (status[interestedUnstagedGroup[i]].length > 0) {
				return true;
			}
		}
		return false;
	}
	
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
	return {
		statusUILocation: statusUILocation,
		isStaged: isStaged,
		isUnstaged: isUnstaged,
		isChange: isChange,
		hasStagedChanges: hasStagedChanges,
		hasUnstagedChanges: hasUnstagedChanges,
		createCompareWidget: createCompareWidget
	};
});
