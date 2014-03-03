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
/*global define URL*/

/**
 * Utility methods that do not have UI dependencies.
 */
define([
	"orion/URL-shim"
], function(_) {

	var interestedUnstagedGroup = ["Missing", "Modified", "Untracked", "Conflicting"]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var interestedStagedGroup = ["Added", "Changed", "Removed"]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	
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

	/* parses ssh gitUrl to get hostname and port */
	function parseSshGitUrl(gitUrl){
		try {
			/* try ssh:// protocol */
			var url = new URL(gitUrl);
			return {
				host : url.hostname,
				port : url.port
			};
					
		} catch(e){
			/* try scp-like uri */
			try {
				/* [user@]host.xz:path/to/repo.git/ */
				var scp = gitUrl.split(":");
				var hostPart = scp[0].split("@");
				var host = hostPart.length > 1 ? hostPart[1] : hostPart[0];
				return {
					host : host,
					port : 22
				};
				
			} catch(ex){
				/* admit failure */
				return {
					host : "",
					port : ""
				};
			}
		}
	}

	return {
		statusUILocation: statusUILocation,
		isStaged: isStaged,
		isUnstaged: isUnstaged,
		isChange: isChange,
		hasStagedChanges: hasStagedChanges,
		hasUnstagedChanges: hasUnstagedChanges,
		parseSshGitUrl: parseSshGitUrl
	};
});
