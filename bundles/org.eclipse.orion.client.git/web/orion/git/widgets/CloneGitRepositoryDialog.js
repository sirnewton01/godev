/*******************************************************************************
 * @license Copyright (c) 2010, 2012 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
 /*globals define window setTimeout document*/

define([ 'i18n!git/nls/gitmessages', 'orion/webui/dialogs/DirectoryPrompterDialog', 'orion/webui/dialog', 'require' ], function(messages, DirPrompter, dialog, require) {

	function CloneGitRepositoryDialog(options) {
		this._init(options);
	}

	CloneGitRepositoryDialog.prototype = new dialog.Dialog();

	CloneGitRepositoryDialog.prototype.TEMPLATE = '<span id="basicPane">' + '<div style="padding: 8px">' + '<label for="gitUrl">${Repository URL:}</label>'
			+ '<input id="gitUrl" style="width: 50em" value=""/>' + '</div>'

			+ '<div style="padding: 8px; text-align: right;">' + '<a id="advancedLink" href="javascript:">${Choose target location}</a>'
			+ '<a id="advancedLinkHide" href="javascript:" style="display: none">${Default target location}</a>' + '</div>' + '</span>'

			+ '<span id="advancedPane" style="display: none;">' + '<div style="padding: 8px">'
			+ '<input id="isNewProject" type="radio" name="isNewProject" checked value="new"/>'
			+ '<label for="gitName" style="padding: 0 8px">${New folder:}</label>' + '<input id="gitName" value="">' + '</div>'

			+ '<div style="padding: 8px">' + '<input id="isExistingProject" type="radio" name="isNewProject" value="existing"/>'
			+ '<label for="gitPath" style="padding: 0 8px">${Existing directory:}</label>' + '<input id="gitPath" type="hidden" value="">'
			+ '<span id="shownGitPath" style="padding-right: 24px"></span>' + '<a id="changeGitPath" href="javascript:">${Change...}</a>' + '</div>'

			+ '</span>';

	CloneGitRepositoryDialog.prototype._init = function(options) {
		var that = this;

		this.title = options.title ? options.title : messages["Clone Git Repository"];
		this.modal = true;
		this.messages = messages;

		this.advancedShown = false;
		this.alwaysShowAdvanced = options.alwaysShowAdvanced;
		this.advancedOnly = options.advancedOnly;
		this.url = options.url;
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.func = options.func;

		this.buttons = [];

		this.buttons.push({ callback : function() {
			that.destroy();
			that._execute();
		},
		text : 'OK'
		});

		// Start the dialog initialization.
		this._initialize();
	};

	CloneGitRepositoryDialog.prototype._bindToDom = function(parent) {
		var that = this;

		if (this.url) {
			this.$gitUrl.value = this.url;
		}

		if (this.advancedOnly) {
			this.$basicPane.style.display = "none"; //$NON-NLS-0$
			this.$advancedPane.style.display = "";
			setTimeout(function() {
				that.$gitName.focus();
			}, 400);
		}

		this.$changeGitPath.addEventListener("click", function(evt) { //$NON-NLS-0$
			that._openDirectoryPickerDialog();
		});

		this.$isExistingProject.addEventListener("click", function(evt) { //$NON-NLS-0$
			that._checkNewExisting();
		});

		this.$isNewProject.addEventListener("click", function(evt) { //$NON-NLS-0$
			that._checkNewExisting();
		});

		this.$gitName.addEventListener("focus", function(evt) { //$NON-NLS-0$
			that._showNewProject();
		});

		this.$advancedLink.addEventListener("click", function(evt) { //$NON-NLS-0$
			that._showAdvanced();
		});

		this.$advancedLinkHide.addEventListener("click", function(evt) { //$NON-NLS-0$
			that._hideAdvanced();
		});

		if (this.alwaysShowAdvanced) {
			this._showAdvanced();
		}
	};

	CloneGitRepositoryDialog.prototype._execute = function() {
		if (this.func)
			this.func(this.advancedOnly ? undefined : this.$gitUrl.value, (this.advancedShown && this.$isNewProject.checked) ? undefined : this.$gitPath.value,
					(this.advancedShown && !this.$isNewProject.checked) ? undefined : this.$gitName.value);
	};

	CloneGitRepositoryDialog.prototype._showAdvanced = function() {
		this.advancedShown = true;
		this.$advancedPane.style.display = "";
		this.$advancedLink.style.display = "none"; //$NON-NLS-0$
		this.$advancedLinkHide.style.display = "";
	};

	CloneGitRepositoryDialog.prototype._hideAdvanced = function() {
		this.advancedShown = false;
		this.$advancedPane.style.display = "none"; //$NON-NLS-0$
		this.$advancedLink.style.display = "";
		this.$advancedLinkHide.style.display = "none"; //$NON-NLS-0$
	};

	CloneGitRepositoryDialog.prototype._checkNewExisting = function() {
		if (this.$isExistingProject.checked) {
			this._openDirectoryPickerDialog();
		} else {
			this.$gitName.focus();
		}
	};

	CloneGitRepositoryDialog.prototype._showNewProject = function() {
		this.$isNewProject.checked = true;
	};

	CloneGitRepositoryDialog.prototype._openDirectoryPickerDialog = function() {
		var that = this;

		function makePathSegment(folder) {
			var link = document.createElement("a"); //$NON-NLS-0$
			link.href = require.toUrl("edit/edit.html") + "#" + folder.ChildrenLocation; //$NON-NLS-1$ //$NON-NLS-0$
			link.textContent = folder.Name;
			return link;
		}

		this.$isExistingProject.checked = true;

		var dialog = new DirPrompter.DirectoryPrompterDialog({ title : messages["Choose a Folder"],
		serviceRegistry : this.serviceRegistry,
		fileClient : this.fileClient,
		func : function(targetFolder) {
			if (targetFolder && targetFolder.Location) {
				that.$gitPath.value = targetFolder.Location;
				while (that.$shownGitPath.hasChildNodes()) {
					that.$shownGitPath.removeChild(that.$shownGitPath.lastChild);
				}
				that.$shownGitPath.appendChild(makePathSegment(targetFolder));

				var currentFolder = targetFolder;
				while (currentFolder.parent && currentFolder.parent.Location !== "/") {
					that.$shownGitPath.insertBefore(document.createTextNode("/"), that.$shownGitPath.firstChild); //$NON-NLS-0$
					that.$shownGitPath.insertBefore(makePathSegment(currentFolder.parent), that.$shownGitPath.firstChild);
					currentFolder = currentFolder.parent;
				}
			}
		}
		});
		
		this._addChildDialog(dialog);
		dialog.show();
	};

	CloneGitRepositoryDialog.prototype.constructor = CloneGitRepositoryDialog;

	// return the module exports
	return { CloneGitRepositoryDialog : CloneGitRepositoryDialog
	};

});