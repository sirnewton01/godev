/*******************************************************************************
 * @license Copyright (c) 2014 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/URITemplate',
	'orion/i18nUtil',
	'orion/git/util',
	'orion/objects'
], function(require, messages, URITemplate, i18nUtil, util, objects) {
	
	var commitTemplate = new URITemplate("git/git-repository.html#{,resource,params*}?page=1"); //$NON-NLS-0$	
	
	/**
	 * @class orion.git.GitCommitInfo
	 */
	function GitCommitInfo(options) {
		objects.mixin(this, options);
	}
	
	objects.mixin(GitCommitInfo.prototype, {
		display: function(){
			var that = this;
			var commit = this.commit;
			var section;
		
			function createInfo(parent, keys, values) {
				keys = Array.isArray(keys) ? keys : [keys];
				values = Array.isArray(values) ? values : [values];
				var div = document.createElement("div"); //$NON-NLS-0$
				for (var i = 0; i < keys.length; i++) {
					if (keys[i]) {
						div.appendChild(document.createTextNode(messages[keys[i]]));
					}
					var span = document.createElement("span"); //$NON-NLS-0$
					span.className = "gitCommitInfoValue"; //$NON-NLS-0$
					span.appendChild(document.createTextNode(values[i])); //$NON-NLS-0$  //$NON-NLS-1$
					div.appendChild(span);
				}
				parent.appendChild(div);
				return div;
			}
			
			function createSection(parent) {
				var section = document.createElement("div"); //$NON-NLS-0$
				if (!that.simple) section.classList.add("gitCommitSection"); //$NON-NLS-0$
				parent.appendChild(section);
				return section;
			}
			
			function createImage(parent) {
				if (that.showImage === undefined || that.showImage) {
					if (commit.AuthorImage) {
						var image = new Image();
						image.src = commit.AuthorImage;
						image.name = commit.AuthorName;
						image.className = "git-author-icon"; //$NON-NLS-0$
						parent.appendChild(image);
						if (commit.incoming) image.classList.add("incoming"); //$NON-NLS-0$
						if (commit.outgoing) {
							image.classList.add("outgoing"); //$NON-NLS-0$
							if (!commit.Diffs || !commit.Diffs.length) {
								image.classList.add("invalid"); //$NON-NLS-0$
								var badgeDiv = document.createElement("div"); //$NON-NLS-0$
								badgeDiv.title = messages["EmptyCommitWarning"];
								badgeDiv.className = "gitCommitWarningBadge"; //$NON-NLS-0$
								var badge = document.createElement("div"); //$NON-NLS-0$
								badge.className = "core-sprite-warning"; //$NON-NLS-0$
								badgeDiv.appendChild(badge);
								parent.appendChild(badgeDiv);
							}
						}
					}
				}
			}
			
			var table = document.createElement("table"); //$NON-NLS-0$
			var tableBody = document.createElement("tbody"); //$NON-NLS-0$
			var row = document.createElement("tr"); //$NON-NLS-0$
			tableBody.appendChild(row);
			table.appendChild(tableBody);
			
			var imageDiv = document.createElement("td"); //$NON-NLS-0$
			imageDiv.className = "gitCommitImageCell"; //$NON-NLS-0$
			row.appendChild(imageDiv);
			createImage(imageDiv);
			var detailsDiv = document.createElement("td"); //$NON-NLS-0$
			detailsDiv.className = "gitCommitDetailsCell"; //$NON-NLS-0$
			row.appendChild(detailsDiv);
	
			var headerMessage = util.trimCommitMessage(commit.Message);
			var displayMessage = this.showMessage === undefined || this.showMessage;
			if (displayMessage) {
				var link;
				if (this.commitLink) {
					link = document.createElement("a"); //$NON-NLS-0$
					link.className = "navlinkonpage"; //$NON-NLS-0$
					link.href = require.toUrl(commitTemplate.expand({resource: commit.Location}));
				} else {
					link = document.createElement("div"); //$NON-NLS-0$
					link.className = "gitCommitTitle"; //$NON-NLS-0$
				}
				var text = headerMessage;
				if (headerMessage.length < commit.Message.length) {
					 text += "..."; //$NON-NLS-0$
				}
				link.appendChild(document.createTextNode(text));
				detailsDiv.appendChild(link);
			}
			if (this.fullMessage && (this.onlyFullMessage || headerMessage.length < commit.Message.length)) {
				var fullMessage = document.createElement("div"); //$NON-NLS-0$
				fullMessage.className = "gitCommitFullMessage"; //$NON-NLS-0$
				if (this.simple) {
					fullMessage.textContent = commit.Message;
				} else {
					var headerSpan = document.createElement("span"); //$NON-NLS-0$
					headerSpan.className = "gitCommitTitle"; //$NON-NLS-0$
					headerSpan.textContent = headerMessage;
					fullMessage.appendChild(headerSpan);
					var restSpan = document.createElement("span"); //$NON-NLS-0$
					restSpan.textContent = commit.Message.substring(headerMessage.length);
					fullMessage.appendChild(restSpan);
				}
				detailsDiv.appendChild(fullMessage);
			}
			
			var displayAuthor = this.showAuthor === undefined || this.showAuthor;
			var displayCommitter = this.showCommitter === undefined || this.showCommitter;
			if (displayAuthor || displayCommitter) {
				section = createSection(detailsDiv);
			}
			if (displayAuthor) {
				var authorName = this.showAuthorEmail ? i18nUtil.formatMessage(messages["nameEmail"], commit.AuthorName, commit.AuthorEmail) : commit.AuthorName;
				createInfo(detailsDiv, ["", "on"], [authorName, new Date(commit.Time).toLocaleString()]); //$NON-NLS-1$ //$NON-NLS-0$
			}
			
			if (displayCommitter) {
				var committerName = this.showCommitterEmail ? i18nUtil.formatMessage(messages["nameEmail"], commit.CommitterName, commit.CommitterEmail) : commit.CommitterName;
				createInfo(detailsDiv, "committedby", committerName); //$NON-NLS-0$
			}
			
			var displayCommit = this.showCommit === undefined || this.showCommit;
			var displayParent = this.showParentLink === undefined || this.showParentLink;
			if (displayCommit || displayParent) {
				section = createSection(detailsDiv);
			}
			if (displayCommit) {
				createInfo(section, "commit:", commit.Name);  //$NON-NLS-0$
			}
			if (displayParent) {
				if (commit.Parents && commit.Parents.length > 0) {
					var parentNode = document.createElement("div"); //$NON-NLS-0$
					parentNode.textContent = messages["parent:"]; //$NON-NLS-0$
					var parentLink = document.createElement("a"); //$NON-NLS-0$
					parentLink.className = "navlinkonpage"; //$NON-NLS-0$
					parentLink.href = require.toUrl(commitTemplate.expand({resource: commit.Parents[0].Location}));
					parentLink.textContent = commit.Parents[0].Name;
					parentNode.appendChild(parentLink);
					section.appendChild(parentNode);
				}
			}
			
			var gerritFooter = util.getGerritFooter(commit.Message);
			if (this.showGerrit === undefined || this.showGerrit) {
				if (gerritFooter.changeId || gerritFooter.signedOffBy) {
					section = createSection(detailsDiv);
				}
				if (gerritFooter.changeId) {
					createInfo(section, "Change-Id: ", gerritFooter.changeId);  //$NON-NLS-0$
				}
				if (gerritFooter.signedOffBy) {
					createInfo(section, "Signed-off-by: ", gerritFooter.signedOffBy); //$NON-NLS-0$
				}
			}
	
			var displayBranches = (this.showBranches === undefined || this.showBranches) && commit.Branches && commit.Branches.length > 0;
			var displayTags = this.showTags && commit.Tags && commit.Tags.length > 0;
			if (displayBranches || displayTags) {
				section = createSection(detailsDiv);
			}
			if (displayBranches) {
				var branches = document.createElement("div"); //$NON-NLS-0$
				branches.textContent = messages["branches: "]; //$NON-NLS-0$
				branches.className = "gitCommitBranchesTitle"; //$NON-NLS-0$
				section.appendChild(branches);
				commit.Branches.forEach(function (branch) {
					var branchNameSpan = document.createElement("span"); //$NON-NLS-0$
					var branchName = branch.FullName;
					["refs/heads/", "refs/remotes/"].forEach(function(prefix) { //$NON-NLS-1$ //$NON-NLS-0$
						if (branchName.indexOf(prefix) === 0) branchName = branchName.substring(prefix.length);
					});
					branchNameSpan.textContent = branchName;
					branchNameSpan.className = "gitCommitBranch"; //$NON-NLS-0$
					branches.appendChild(branchNameSpan);
				});
			}
			if (displayTags) {
				var tags = document.createElement("div"); //$NON-NLS-0$
				tags.textContent = messages["tags: "];
				tags.className = "gitCommitTagsTitle"; //$NON-NLS-0$
				commit.Tags.forEach(function (tag) {
					tag.parent = commit;
					var tagSpan = document.createElement("span"); //$NON-NLS-0$
					tagSpan.textContent = tag.Name;
					tagSpan.className = "gitCommitTag"; //$NON-NLS-0$
					tags.appendChild(tagSpan);
					
					var tagSpanAction = document.createElement("span"); //$NON-NLS-0$
					tagSpanAction.className = "core-sprite-close gitCommitTagClose"; //$NON-NLS-0$
					tagSpanAction.addEventListener("click", function(){ //$NON-NLS-0$
						that.tagsCommandHandler.commandService.runCommand("eclipse.removeTag", tag, that.tagsCommandHandler); //$NON-NLS-0$
					});
					tagSpan.appendChild(tagSpanAction);
				});
				section.appendChild(tags);
			}
			
			if (this.showMore) {
				var actions = document.createElement("div"); //$NON-NLS-0$
				var moreButton = this.moreButton = document.createElement("button"); //$NON-NLS-0$
				moreButton.className = "gitCommitMore"; //$NON-NLS-0$
				moreButton.textContent = commit.full ? messages["less"] : messages["more"];
				actions.appendChild(moreButton);
				detailsDiv.appendChild(actions);
			}
			
			that.parent.appendChild(table);
		}
	});
	
	return {
		GitCommitInfo: GitCommitInfo
	};

});
