/*******************************************************************************
 * @license Copyright (c) 2012 IBM Corporation and others. All rights reserved.
 *          This program and the accompanying materials are made available under
 *          the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
  /*globals define window*/

define(
		[ 'i18n!git/nls/gitmessages', 'orion/webui/dialog', 'orion/git/gitConfigPreference' ],
		function(messages, dialog, GitConfigPreference) {

			function CommitDialog(options) {
				this._init(options);
			}
			

			CommitDialog.prototype = new dialog.Dialog();

			CommitDialog.prototype.TEMPLATE = '<div style="display: none; padding-top: 10px; padding-bottom: 10px;" id="commitInfoBar"><strong id="commitInfo"></strong></div>'
					+ '<div style="padding:4px"><div style="vertical-align:top"><label style="display:block; float:left" id="commitMessageLabel" for="commitMessage">${Message:}</label><textarea id="commitMessage" rows="5" style="width: 30em"></textarea></div></div>'
					+ '<div style="padding:4px"><label id="amendLabel" for="amend">${Amend:}</label><input id="amend" type="checkbox"></div>'
					+ '<div style="padding:4px"><label id="changeIdLabel" for="changeId">${ChangeId:}</label><input id="changeId" type="checkbox"></div>'
					+ '<div style="padding:4px"><label id="committerNameLabel" for="committerName">${Committer Name:}</label><input id="committerName" style="width: 30em" value=""></div>'
					+ '<div style="padding:4px"><label id="committerEmailLabel" for="committerEmail">${Committer Email:}</label><input id="committerEmail" style="width: 30em" value=""></div>'
					+ '<div style="padding:4px"><label id="authorNameLabel" for="authorName">${Author Name:}</label><input id="authorName" style="width: 30em" value=""></div>'
					+ '<div style="padding:4px"><label id="authorEmailLabel" for="authorEmail">${Author Email:}</label><input id="authorEmail" style="width: 30em" value=""></div>'
					+ '<div style="padding:4px"><label id="persistLabel" for="persist">${Remember my committer name and email:}</label><input id="persist" type="checkbox"></div>';
					
			CommitDialog.prototype._init = function(options) {
				var that = this;

				this.title = messages["Commit Changes"];
				this.modal = true;
				this.messages = messages;
				this.options = options;

				this.buttons = [];

				this.buttons.push({ callback : function() {
					that._execute();
				},
				text : 'OK',
				id : 'commitChangesButton'
				});

				// Start the dialog initialization.
				this._initialize();
			};

			CommitDialog.prototype._bindToDom = function(parent) {
				var that = this;

				if (this.options.body.Message) {
					this.$commitMessage.value = this.options.body.Message;
				}
				this.$commitMessage.addEventListener("keyup", function(evt) { //$NON-NLS-0$
					that._validate();
				});

				if (this.options.body.Amend) {
					this.$amend.checked = true;
				}

				if (this.options.body.ChangeId) {
				  this.$changeId.checked = true;
				}

				if (this.options.body.CommitterName) {
					this.$committerName.value = this.options.body.CommitterName;
				}
				this.$committerName.addEventListener("keyup", function(evt) { //$NON-NLS-0$
					that._validate();
				});

				if (this.options.body.CommitterEmail) {
					this.$committerEmail.value = this.options.body.CommitterEmail;
				}
				this.$committerEmail.addEventListener("keyup", function(evt) { //$NON-NLS-0$
					that._validate();
				});

				if (this.options.body.AuthorName) {
					this.$authorName.value = this.options.body.AuthorName;
				}
				this.$authorName.addEventListener("keyup", function(evt) { //$NON-NLS-0$
					that._validate();
				});

				if (this.options.body.AuthorEmail) {
					this.$authorEmail.value = this.options.body.AuthorEmail;
				}
				this.$authorEmail.addEventListener("keyup", function(evt) { //$NON-NLS-0$
					that._validate();
				});

				this._validate();
			};

			CommitDialog.prototype._validate = function() {
				if (!this.$commitMessage.value) {
					this.$commitInfoBar.style.display = "block"; //$NON-NLS-0$
					this.$commitChangesButton.classList.add(this.DISABLED);
					this.$commitInfo.textContent = messages["The commit message is required."];
				} else if (!this.$committerName.value) {
					this.$commitInfoBar.style.display = "block"; //$NON-NLS-0$
					this.$commitChangesButton.classList.add(this.DISABLED);
					this.$commitInfo.textContent = messages['The committer name is required.'];
				} else if (!this.$committerEmail.value) {
					this.$commitInfoBar.style.display = "block"; //$NON-NLS-0$
					this.$commitChangesButton.classList.add(this.DISABLED);
					this.$commitInfo.textContent = messages['The committer mail is required.'];
				} else if (!this.$authorName.value) {
					this.$commitInfoBar.style.display = "block"; //$NON-NLS-0$
					this.$commitChangesButton.classList.add(this.DISABLED);
					this.$commitInfo.textContent = messages['The author name is required.'];
				} else if (!this.$authorEmail.value) {
					this.$commitInfoBar.style.display = "block"; //$NON-NLS-0$
					this.$commitChangesButton.classList.add(this.DISABLED);
					this.$commitInfo.textContent = messages['The author mail is required.'];
				} else {
					this.$commitInfoBar.style.display = "none"; //$NON-NLS-0$
					this.$commitChangesButton.classList.remove(this.DISABLED);
				}
			};

			CommitDialog.prototype._execute = function() {
				if (this.$commitChangesButton.classList.contains(this.DISABLED)) {
					return;
				}
				
				if (this.options.func) {
					var body = {};

					body.Message = this.$commitMessage.value;
					body.Amend = this.$amend.checked ? true : false;
					body.ChangeId = this.$changeId.checked ? true : false;
					body.CommitterName = this.$committerName.value;
					body.CommitterEmail = this.$committerEmail.value;
					body.AuthorName = this.$authorName.value;
					body.AuthorEmail = this.$authorEmail.value;
					body.persist = this.$persist.checked ? true : false;

					this.options.func(body);
				}
				
				this.hide();
			};

			CommitDialog.prototype.constructor = CommitDialog;

			// return the module exports
			return { CommitDialog : CommitDialog
			};

		});