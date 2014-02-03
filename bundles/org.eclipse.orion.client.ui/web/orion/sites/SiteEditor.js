/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define orion*/
/*jslint browser:true sub:true*/

define([
	'i18n!orion/sites/nls/messages',
	'i18n!orion/widgets/nls/messages',
	'orion/commands',
	'orion/Deferred',
	'orion/section',
	'orion/objects',
	'orion/sites/siteMappingsTable',
	'orion/i18nUtil',
	'orion/webui/littlelib',
	'orion/EventTarget',
	'orion/webui/dialogs/DirectoryPrompterDialog',
	'orion/webui/dialog',
	'text!orion/sites/templates/SiteEditor.html',
	'text!orion/sites/templates/ConvertToSelfHostingDialog.html'
], function(messages, widgetMessages, mCommands, Deferred, mSection, objects, mSiteMappingsTable, i18nUtil, lib, EventTarget,
		DirPrompter, dialog, SiteEditorTemplate, ConvertToSelfHostingDialogTemplate) {
var Dialog = dialog.Dialog;

var ConvertToSelfHostingDialog = function(options) {
	options = options || {};
	this.options = options;
	objects.mixin(this, options);
	this._init(options);
};
ConvertToSelfHostingDialog.prototype = new Dialog();
objects.mixin(ConvertToSelfHostingDialog.prototype, {
	TEMPLATE: ConvertToSelfHostingDialogTemplate,
	_init: function(options) {
		this.title = options.title || messages['Convert to Self-Hosting']; //$NON-NLS-1$
		this.buttons = [{ text: messages['OK'], callback: this.okButtonClicked.bind(this) }];
		this.modal = true;
		this.folders = this.selfHostingConfig.folders;

		this.messages = {};
		objects.mixin(this.messages, messages);
		this.messages['LabelSelectRequired'] = (this.folders.length === 1) ? messages['SelectRequiredFoldersSingle'] : messages['SelectRequiredFolders'];  //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$

		this._initialize();
	},
	_bindToDom: function() {
		this.$okButton = this.$buttonContainer.firstChild;
		this.$okButton.classList.add('disabled'); //$NON-NLS-0$

		this.browseButtons = [];
		this.folderTexts = [];

		this.appendFolderElements();

		this.updateValidity();
	},
	appendFolderElements: function() {
		// Append form elements for folders
		var self = this;
		var folderFragment = document.createDocumentFragment();
		this.folders.forEach(function(folder, folderIndex) {
			// Prompt
			var li = document.createElement('li'); //$NON-NLS-0$
			li.className = 'msg pad2'; //$NON-NLS-0$
			var label = document.createElement('div'); //$NON-NLS-0$
			//label.textContent = i18nUtil.formatMessage(messages['FolderPrompt'], folder.name, folder.label); //$NON-NLS-0$
			label.textContent = messages['FolderPrompt']; //$NON-NLS-0$
			var nameNode = document.createElement('span'); //$NON-NLS-0$
			nameNode.className = 'folderName'; //$NON-NLS-0$
			nameNode.textContent = folder.name;
			lib.processDOMNodes(label, [nameNode, document.createTextNode(folder.label)]);
			li.appendChild(label);
			folderFragment.appendChild(li);

			// Button
			li = document.createElement('li'); //$NON-NLS-0$
			li.className = 'pad1'; //$NON-NLS-0$
			var col = document.createElement('div'); //$NON-NLS-0$
			col.className = 'col'; //$NON-NLS-0$
			var button = document.createElement('button'); //$NON-NLS-0$
			button.className = 'browseButton commandButton'; //$NON-NLS-0$
			button.textContent = widgetMessages['Browse...']; //$NON-NLS-0$
			button.type = 'button'; //$NON-NLS-0$
			var folderText = document.createElement('span'); //$NON-NLS-0$
			folderText.className = 'folderText'; //$NON-NLS-0$
			col.appendChild(button);
			col.appendChild(folderText);
			li.appendChild(col);
			self.browseButtons.push(button);
			self.folderTexts.push(folderText);
			folderFragment.appendChild(li);

			button.addEventListener('click', self.showChooseFolderDialog.bind(self, folderIndex)); //$NON-NLS-0$
		});
		self.$selectRequired.parentNode.appendChild(folderFragment, null);
	},
	showChooseFolderDialog: function(folderIndex) {
		var folderInfo = this.folders[folderIndex];
		// TODO The DirectoryPrompterDialog should support restricting itself to a single filesystem, and hiding the
		// root FS element. This would be friendlier.
		var browseFolderDialog = new DirPrompter.DirectoryPrompterDialog({
			title: i18nUtil.formatMessage(messages["LocateFolderTitle"], folderInfo.name), //$NON-NLS-0$
			serviceRegistry: this.serviceRegistry,
			fileClient: this.fileClient,
			func: this.onFolderChosen.bind(this, folderIndex)
		});
		this._addChildDialog(browseFolderDialog);
		browseFolderDialog.show();
	},
	onFolderChosen: function(folderIndex, chosenFolder) {
		var folderInfo = this.folders[folderIndex];
		folderInfo.folder = chosenFolder;
		this.folderTexts[folderIndex].textContent = chosenFolder ? chosenFolder.Name : ''; //$NON-NLS-0$
		this.updateValidity();
	},
	isValid: function() {
		var allFoldersChosen = this.folders.every(function(folderInfo) {
			return folderInfo.folder;
		});
		return allFoldersChosen;
	},
	updateValidity: function() {
		if (!this.isValid()) {
			this.$okButton.classList.add('disabled'); //$NON-NLS-0$
		} else {
			this.$okButton.classList.remove('disabled'); //$NON-NLS-0$
		}
	},
	okButtonClicked: function() {
		if (this.isValid()) {
			this.hide();
			if (typeof this.options.func === 'function') { //$NON-NLS-1$
				this.options.func(this.folders);
			}
		}
	}
});

var AUTOSAVE_INTERVAL = 8000;
var ROOT = "/"; //$NON-NLS-0$

/**
 * @name orion.sites.SiteEditor
 * @class Editor for an individual site configuration.
 * @param {Object} options Options bag for creating the widget.
 */
var SiteEditor = function(options, parentNode) {
	options = options || {};
	objects.mixin(this, options);

	this.options = options;
	this.checkOptions(this.options, ["serviceRegistry", "fileClient", "siteClient", "commandService", "statusService", "progressService"]); //$NON-NLS-5$ //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

	this._fileClient = this.options.fileClient;
	this._siteClient = this.options.siteClient;
	this._commandService = this.options.commandService;
	this._statusService = this.options.statusService;
	this._progressService = this.options.progressService;
	
	this._commandsContainer = this.options.commandsContainer;

	if (this.options.location) {
		this.load(this.options.location);
	}

	this.node = parentNode || document.createElement("div"); //$NON-NLS-0$
};
EventTarget.attach(SiteEditor.prototype);
objects.mixin(SiteEditor.prototype, {
	/** SiteConfiguration */
	_siteConfiguration: null,
	
	/** Array */
	_modelListeners: null,
	
	/** MappingsTable */
	mappings: null,

	_mappingProposals: null,

	_isSelfHostingSite: false,

	_isDirty: false,
	
	_autoSaveTimer: null,

	show: function() {
		this.createElements();
		this.postCreate();
	},

	createElements: function() {
		this.node.innerHTML = SiteEditorTemplate;
		lib.processTextNodes(this.node, messages);

		this.siteForm = lib.$(".siteForm", this.node); //$NON-NLS-0$
		this.name = lib.$(".siteConfigName", this.node); //$NON-NLS-0$
		this.name.id = this.id + "_name"; //$NON-NLS-0$
		this.nameInvalid = lib.$(".nameInvalid", this.node); //$NON-NLS-0$
		this.hostHint = lib.$(".hostHint", this.node); //$NON-NLS-0$
		this.hostHint.id = this.id + "_hostHint"; //$NON-NLS-0$
		this.hostInvalid = lib.$(".hostInvalid", this.node); //$NON-NLS-0$
		this.hostingStatus = lib.$(".hostingStatus", this.node); //$NON-NLS-0$
		this.siteStartedWarning = lib.$(".siteStartedWarning", this.node); //$NON-NLS-0$
		this.mappingsPlaceholder = lib.$(".mappingsGridTable"); //$NON-NLS-0$
		this.mappingsPlaceholder.id = this.id + "_mappingsPlaceholder"; //$NON-NLS-0$
		this.convertToolbar = lib.$(".convertToolbar"); //$NON-NLS-0$
		this.convertToolbar.id = this.id + "_convertToolbar"; //$NON-NLS-0$

		lib.$(".siteConfigNameLabel", this.node).htmlFor = (/*"htmlFor", */name.id); //$NON-NLS-1$ //$NON-NLS-0$
		lib.$(".hostHintLabel", this.node).htmlFor = (/*"htmlFor", */this.hostHint.id); //$NON-NLS-1$ //$NON-NLS-0$
	},

	postCreate: function() {
		var _self = this;
		this.name.addEventListener("input", function(event) { //$NON-NLS-0$
			if (_self.name.checkValidity()) {
				_self.name.classList.remove("invalid");
				_self.nameInvalid.classList.remove("visible");
			} else {
				_self.name.classList.add("invalid");
				_self.nameInvalid.classList.add("visible");
			}
		});
		this.hostHint.addEventListener("change", function(event) { //$NON-NLS-0$
			if (_self.hostHint.checkValidity()) {
				_self.hostHint.classList.remove("invalid");
				_self.hostInvalid.classList.remove("visible");
			} else {
				_self.hostHint.classList.add("invalid");
				_self.hostInvalid.classList.add("visible");
			}
		});

		// "Convert to self hosting" command
		var self = this;
		Deferred.when(this.siteClient._canSelfHost(), function(canSelfHost) {
			var convertCommand = new mCommands.Command({
				name: messages["Convert to Self-Hosting"],
				tooltip: messages["Enable the site configuration to launch an Orion server running your local client code"],
				imageClass: "core-sprite-add", //$NON-NLS-0$
				id: "orion.site.convert", //$NON-NLS-0$
				visibleWhen: function(item) {
					return !!item.Location && canSelfHost && !self._isSelfHostingSite;
				},
				callback: self.convertToSelfHostedSite.bind(self)});
			self._commandService.addCommand(convertCommand);
		});

		this._autoSaveTimer = setTimeout(this.autoSave.bind(this), AUTOSAVE_INTERVAL);
	},
	
	checkOptions: function(options, names) {
		for (var i=0; i < names.length; i++) {
			if (typeof options[names[i]] === "undefined") { //$NON-NLS-0$
				throw new Error("options." + names[i] + " is required"); //$NON-NLS-1$ //$NON-NLS-0$
			}
		}
	},
	
	/**
	 * @param {Array} proposals 
	 * @param {Array|Object} items
	 * @param {Object} userData
	 * @returns {Array}
	 */
	_makeAddMenuChoices: function(proposals, items, userData) {
		items = Array.isArray(items) ? items[0] : items;
		proposals = proposals.sort(function(a, b) {
				return a.FriendlyPath.toLowerCase().localeCompare(b.FriendlyPath.toLowerCase());
			});
		var self = this;
		function addMapping(mapping) {
			// If there is no root, use the root as the Virtual Path
			var hasRoot = self.getSiteConfiguration().Mappings.some(function(m) {
				return m.Source === ROOT;
			});
			if (!hasRoot) {
				mapping.Source = ROOT; //$NON-NLS-0$
			}
			self.mappings.addMapping(mapping);
		}
		/**
		 * @this An object from the choices array with shape {name:String, mapping:Object}
		 */
		var callback = function(data) {
			addMapping(this.mapping);
		};
		var addUrl = function() {
			addMapping({
				Source: "/web/somePath", //$NON-NLS-0$
				Target: "http://", //$NON-NLS-0$
				FriendlyPath: "http://" //$NON-NLS-0$
			});
		};
		var choices = proposals.map(function(proposal) {
				return {
					name: proposal.FriendlyPath,
					imageClass: "core-sprite-folder", //$NON-NLS-0$
					mapping: proposal,
					callback: callback
				};
			});
		if (proposals.length > 0) {
			choices.push({}); // Separator
		}
		choices.push({
			name: messages["Choose folder..."],
			imageClass: "core-sprite-folder", //$NON-NLS-0$
			callback: function() {
				var dialog = new DirPrompter.DirectoryPrompterDialog({
					serviceRegistry: this.serviceRegistry,
					fileClient: this.fileClient,
					func: function(folder) {
						if (!!folder) {
							this._siteClient.getMappingObject(this.getSiteConfiguration(), folder.Location, folder.Name).then(
								function(mapping) {
									callback.call({mapping: mapping});
								});
						}
					}.bind(this)
				});
				dialog.show();
			}.bind(this)
		});
		choices.push({name: messages["URL"], imageClass: "core-sprite-link", callback: addUrl}); //$NON-NLS-1$ //$NON-NLS-0$
		return choices;
	},

	// Special feature for setting up self-hosting
	convertToSelfHostedSite: function(items, userData) {
		function onError(e) {
			return e;
		}

		// Load the translated labels first so dialog can be constructed synchronously
		var selfHostingConfig = this._siteClient.getSelfHostingConfig();
		var i18nLoaded = [];
		selfHostingConfig.folders.forEach(function(folderInfo) {
			if (folderInfo.nls) {
				i18nLoaded.push(i18nUtil.getMessageBundle(folderInfo.nls).then(function(bundle) {
					folderInfo.label = bundle[folderInfo.labelKey] || folderInfo.label || folderInfo.labelKey;
				}));
			}
		});

		Deferred.all(i18nLoaded, onError).then(function() {
			var self = this;
			var dialog = new ConvertToSelfHostingDialog({
				serviceRegistry: this.serviceRegistry,
				fileClient: this.fileClient,
				siteClient: this._siteClient,
				selfHostingConfig: selfHostingConfig,
				func: function(folderInfos) {
					var folderLocations = folderInfos.map(function(folderInfo) {
						return folderInfo.folder.Location;
					});
					self._siteClient.convertToSelfHosting(self.getSiteConfiguration(), folderLocations).then(
						function(updatedSite) {
							self.mappings.deleteAllMappings();
							self.mappings.addMappings(updatedSite.Mappings);
							self.save();
						});
				}
			});
			dialog.show();
		}.bind(this));
	},
	
	/**
	 * Loads site configuration from a URL into the editor.
	 * @param {String} location URL of the site configuration to load.
	 * @returns {orion.Promise} A promise, resolved when the editor has loaded & refreshed itself.
	 */
	load: function(location) {
		var deferred = new Deferred();
		this._busyWhile(deferred, "Loading..."); //$NON-NLS-0$
		this._siteClient.loadSiteConfiguration(location).then(
			function(siteConfig) {
				this._setSiteConfiguration(siteConfig);
				this.setDirty(false);
				deferred.resolve(siteConfig);
			}.bind(this),
			function(error) {
				deferred.reject(error);
			});
		return deferred;
	},

	_setSiteConfiguration: function(siteConfiguration) {
		this._detachListeners();
		this._siteConfiguration = siteConfiguration;

		// Ask the service for the proposals to put in the dropdown menu
		if (!this._mappingProposals) {
			var commandService = this._commandService;
			this._mappingProposals = this._siteClient.getMappingProposals(siteConfiguration).then(function(proposals) {
				// Register command used for adding mapping
				var addMappingCommand = new mCommands.Command({
					name: messages["Add"],
					tooltip: messages["Add a directory mapping to the site configuration"],
					id: "orion.site.mappings.add", //$NON-NLS-0$
					visibleWhen: function(item) {
						return true;
					},
					choiceCallback: this._makeAddMenuChoices.bind(this, proposals)});
				commandService.addCommand(addMappingCommand);
				var toolbar = this.titleWrapper.actionsNode;
				commandService.registerCommandContribution(toolbar.id, "orion.site.mappings.add", 1); //$NON-NLS-0$
				// do we really have to render here
				commandService.renderCommands(toolbar.id, toolbar, this.mappings, this, "button"); //$NON-NLS-0$
			}.bind(this));
		}

		this._refreshCommands();
		this._refreshFields();
	},

	/**
	 * @event setDirty
	 * Clients can listen for "dirty" event to receive notification of the dirty state change.
	 */
	setDirty: function(value) {
		this._isDirty = value;
		this.dispatchEvent({type: "dirty", value: value});
	},
	
	isDirty: function() {
		return this._isDirty;
	},

	// Called after setSiteConfiguration and after every save/autosave
	_refreshCommands: function() {
		var self = this;
		function errorHandler(err) {
			self._onError(err);
		}
		function reload(site) {
			self._setSiteConfiguration(site);
			self.setDirty(false);
		}
		this._siteClient.isSelfHostingSite(this.getSiteConfiguration()).then(function(isSelfHostingSite) {
			self._isSelfHostingSite = isSelfHostingSite;
			self._commandService.destroy(self._commandsContainer);
			var userData = {
				site: self._siteConfiguration,
				startCallback: reload,
				stopCallback: reload,
				errorCallback: errorHandler
			};
			self._commandService.renderCommands(self._commandsContainer.id, self._commandsContainer, self._siteConfiguration, {}, "button", userData); //$NON-NLS-0$
		});
	},

	_refreshFields: function() {
		this.name.setAttribute("value", this._siteConfiguration.Name); //$NON-NLS-0$
		this.hostHint.setAttribute("value", this._siteConfiguration.HostHint); //$NON-NLS-0$

		if (!this.mappings) {
			this.titleWrapper = new mSection.Section(document.getElementById(this.mappingsPlaceholder.id), {
				id: "workingDirectorySection", //$NON-NLS-0$
				title: messages["Mappings"],
				content: '<div id="mappingsNode"/>', //$NON-NLS-0$
				canHide: true
			});
			
			this.mappings = new mSiteMappingsTable.MappingsTable({serviceRegistry: this.serviceRegistry,
					siteClient: this._siteClient, fileClient: this._fileClient, commandRegistry: this._commandService, selection: null, 
					parentId: "mappingsNode", siteConfiguration: this._siteConfiguration
				});
		} else {
			this.mappings._setSiteConfiguration(this._siteConfiguration);
		}

		var hostStatus = this._siteConfiguration.HostingStatus;
		if (hostStatus && hostStatus.Status === "started") { //$NON-NLS-0$
			this.siteStartedWarning.style.display = "block"; //$NON-NLS-0$
			this.hostingStatus.textContent = messages["Started"];
			var a = document.createElement("a"); //$NON-NLS-0$
			a.href = hostStatus.URL;
			a.target = "_new"; //$NON-NLS-0$
			a.textContent = hostStatus.URL;
			lib.processDOMNodes(this.hostingStatus, [a]);
		} else if (hostStatus && hostStatus.Status === "stopped") {//$NON-NLS-0$
			this.siteStartedWarning.style.display = "none"; //$NON-NLS-0$
			this.hostingStatus.textContent = messages["Stopped"];
		}

		setTimeout(function() {
			this._attachListeners(this._siteConfiguration);
		}.bind(this), 0);
	},
	
	/**
	 * Hook up listeners that perform form widget -> model updates.
	 * @param site {SiteConfiguration}
	 */
	_attachListeners: function(site) {
		this._detachListeners();
		this._modelListeners = this._modelListeners || [];
		
		var editor = this;
		function bindText(widget, modelField) {
			function commitWidgetValue(event) {
				var value = widget.value; //$NON-NLS-0$
				var oldValue = site[modelField];
				site[modelField] = value;
				var isChanged = oldValue !== value;
				editor.setDirty(isChanged || editor.isDirty());
			}
			widget.addEventListener("input", commitWidgetValue);
			editor._modelListeners.push({target: widget, type: "input", listener: commitWidgetValue}); //$NON-NLS-0$
		}
		
		bindText(this.name, messages["Name"]);
		bindText(this.hostHint, messages["HostHint"]);

		var dirtyListener = function(dirtyEvent) {
			editor.setDirty(dirtyEvent.value);
		};
		this.mappings.addEventListener("dirty", dirtyListener);
		this._modelListeners.push({target: this.mappings, type: "dirty", listener: dirtyListener});
	},
	
	_detachListeners: function() {
		if (this._modelListeners) {
			for (var i=0; i < this._modelListeners.length; i++) {
				var l = this._modelListeners[i];
				l.target.removeEventListener(l.type, l.listener);
			}
			this._modelListeners.splice(0);
		}
	},
	
	/**
	 * @returns {SiteConfiguration} The site configuration that is being edited.
	 */
	getSiteConfiguration: function() {
		return this._siteConfiguration;
	},
	
	getResource: function() {
		return this._siteConfiguration && this._siteConfiguration.Location;
	},

	/**
	 * Callback when 'save' is clicked.
	 * @Override
	 * @returns True to allow save to proceed, false to prevent it.
	 */
	save: function(refreshUI) {
		refreshUI = typeof refreshUI === "undefined" ? true : refreshUI; //$NON-NLS-0$
		var siteConfig = this._siteConfiguration;
		// Omit the HostingStatus field from the object we send since it's likely to be updated from the
		// sites page, and we don't want to overwrite
		var status = siteConfig.HostingStatus;
		delete siteConfig.HostingStatus;
		var self = this;
		var deferred = this._siteClient.updateSiteConfiguration(siteConfig.Location, siteConfig).then(
			function(updatedSiteConfig) {
				self.setDirty(false);
				if (refreshUI) {
					self._setSiteConfiguration(updatedSiteConfig);
					return updatedSiteConfig;
				} else {
					siteConfig.HostingStatus = status;
					self._refreshCommands();
					return siteConfig;
				}
			});
		this._busyWhile(deferred);
		return true;
	},

	autoSave: function() {
		if (this.isDirty()) {
			this.save(false);
		}
		setTimeout(this.autoSave.bind(this), AUTOSAVE_INTERVAL);
	},

	_busyWhile: function(deferred, msg) {
		deferred.then(this._onSuccess.bind(this), this._onError.bind(this));
		this.progressService.showWhile(deferred, msg);
	},
	
	_onSuccess: function(deferred) {
		this.onSuccess(deferred);
	},
	
	_onError: function(deferred) {
		this._statusService.setErrorMessage(deferred);
		this.onError(deferred);
	},
	
	/**
	 * @event success
	 * Clients can listen for an "success" event to receive notifications about server calls that succeeded.
	 * @param {orion.Promise} deferred The deferred that succeeded.
	 */
	onSuccess: function(deferred) {
		this.dispatchEvent({type: "success", deferred: deferred});
	},
		
	/**
	 * @event error
	 * Clients can listen for an "error" event to receive notifications about server calls that failed.
	 * @param {orion.Promise} deferred The deferred that rejected.
	 */
	onError: function(deferred) {
		this.dispatchEvent({type: "error", deferred: deferred});
	}
});
	return SiteEditor;
});
