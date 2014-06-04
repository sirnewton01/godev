/*******************************************************************************
 * @license Copyright (c) 2012, 2013 IBM Corporation and others. All rights reserved.
 *          This program and the accompanying materials are made available under
 *          the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
 /*globals define window document Image*/

define([
	'orion/git/widgets/gitCommitInfo',
	'orion/webui/popupdialog'
], function (mGitCommitInfo, popupdialog) {

	
	function CommitTooltipDialog(options) {
		this._init(options);
	}

	CommitTooltipDialog.prototype = new popupdialog.PopupDialog();

	CommitTooltipDialog.prototype.TEMPLATE = '<div id="parentPane" style="padding:10px; width:520px"></div>'; //$NON-NLS-0$

	CommitTooltipDialog.prototype._init = function(options) {
		this.commit = options.commit;

		// Start the dialog initialization.
		this._initialize(options.triggerNode, null, null, "mouseover", 1000); //$NON-NLS-0$
	};

	CommitTooltipDialog.prototype._bindToDom = function(parent) {
		this._displayCommit(this.commit);
	};

	CommitTooltipDialog.prototype._displayCommit = function(commit) {
		var info = new mGitCommitInfo.GitCommitInfo({
			parent: this.$parentPane,
			commit: commit,
			showTags: true,
			commitLink: true
		});
		info.display();
	};
	
	CommitTooltipDialog.prototype.constructor = CommitTooltipDialog;
	
	//return the module exports
	return {CommitTooltipDialog: CommitTooltipDialog};
});