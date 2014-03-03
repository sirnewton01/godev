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

define([ 'i18n!git/nls/gitmessages', 'require', 'orion/URITemplate', 'orion/webui/littlelib', 'orion/i18nUtil', 'orion/webui/popupdialog'], 
	function(messages, require, URITemplate, lib, i18nUtil, popupdialog) {

	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$
	
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
		var tableNode = this.$parentPane;

		var commitMessage0 = commit.Message.split(/(\r?\n|$)/)[0];
		var link = document.createElement("a"); //$NON-NLS-0$
		link.className = "navlinkonpage"; //$NON-NLS-0$
		link.href = require.toUrl(commitTemplate.expand({resource: commit.Location}));
		link.textContent = commitMessage0;
		tableNode.appendChild(link);
		
		var textDiv = document.createElement("div"); //$NON-NLS-0$
		textDiv.style.paddingTop = "15px"; //$NON-NLS-0$
		tableNode.appendChild(textDiv);
		
		if (commit.AuthorImage) {
			var image = new Image();
			image.src = commit.AuthorImage;
			image.name = commit.AuthorName;
			image.className = "git-author-icon"; //$NON-NLS-0$
			textDiv.appendChild(image);
		}
		
		var authoredByDiv = document.createElement("div"); //$NON-NLS-0$
		authoredByDiv.textContent = i18nUtil.formatMessage(messages[" authored by ${0} {${1}) on ${2}"], //$NON-NLS-0$
			commit.AuthorName, commit.AuthorEmail, new Date(commit.Time).toLocaleString()); 
		textDiv.appendChild(authoredByDiv);
		
		var committedByDiv = document.createElement("div"); //$NON-NLS-0$
		committedByDiv.textContent = i18nUtil.formatMessage(messages['committed by 0 (1)'], commit.CommitterName, commit.CommitterEmail); //$NON-NLS-0$
		textDiv.appendChild(committedByDiv);

		var commitNameDiv = document.createElement("div"); //$NON-NLS-0$
		commitNameDiv.style.paddingTop = "15px"; //$NON-NLS-0$
		commitNameDiv.textContent = messages["commit:"] + commit.Name; //$NON-NLS-0$
		textDiv.appendChild(commitNameDiv);

		if (commit.Parents && commit.Parents.length > 0) {
			var parentNode = document.createElement("div"); //$NON-NLS-0$
			parentNode.textContent = messages["parent:"]; //$NON-NLS-0$
			
			var parentLink = document.createElement("a");
			parentLink.className = "navlinkonpage"; //$NON-NLS-0$
			parentLink.href = require.toUrl(commitTemplate.expand({resource: commit.Parents[0].Location}));
			parentLink.textContent = commit.Parents[0].Name;
			parentNode.appendChild(parentLink);
			
			textDiv.appendChild(parentNode);
		}

		var displayBranches = commit.Branches && commit.Branches.length > 0;
		var displayTags = commit.Tags && commit.Tags.length > 0;

		if (displayBranches) {
			var branchesSection = document.createElement("section"); //$NON-NLS-0$
			branchesSection.style.paddingTop = "15px"; //$NON-NLS-0$
			branchesSection.textContent = messages["branches: "]; //$NON-NLS-0$
			textDiv.appendChild(branchesSection);
			
			var branchesList = document.createElement("div"); //$NON-NLS-0$
			branchesSection.appendChild(branchesList);

			for (var i = 0; i < commit.Branches.length; ++i) {
				var branchNameSpan = document.createElement("span"); //$NON-NLS-0$
				branchNameSpan.style.paddingLeft = "10px"; //$NON-NLS-0$
				branchNameSpan.textContent = commit.Branches[i].FullName;
				branchesList.appendChild(branchNameSpan);
			}
		}

		if (displayTags) {
			var div = document.createElement("div"); //$NON-NLS-0$
			div.style.paddingTop = "15px"; //$NON-NLS-0$
			textDiv.appendChild(div);
			
			var tagsSection = document.createElement("section"); //$NON-NLS-0$
			textDiv.appendChild(tagsSection);
			
			var tagsNode = document.createElement("span"); //$NON-NLS-0$
			tagsNode.textContent = messages["tags: "]; //$NON-NLS-0$
			tagsSection.appendChild(tagsNode);
			
			var tagsList = document.createElement("div"); //$NON-NLS-0$
			tagsSection.appendChild(tagsList);

			for (var i = 0; i < commit.Tags.length; ++i) {
				var tagNameSpan = document.createElement("span"); //$NON-NLS-0$
				tagNameSpan.style.paddingLeft = "10px"; //$NON-NLS-0$
				tagNameSpan.textContent = commit.Tags[i].Name;
				tagsList.appendChild(tagNameSpan);
			}
		}
	};
	
	CommitTooltipDialog.prototype.constructor = CommitTooltipDialog;
	
	//return the module exports
	return {CommitTooltipDialog: CommitTooltipDialog};
});