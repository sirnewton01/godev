/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/explorers/navigatorRenderer',
	'orion/i18nUtil',
	'orion/Deferred',
	'orion/EventTarget',
	'orion/objects',
	'orion/PageUtil'
], function(messages, mNavigatorRenderer, i18nUtil, Deferred, EventTarget, objects, PageUtil) {

	function Idle(options){
		this._document = options.document || document;
		this._timeout = options.timeout;
		//TODO: remove listeners if there are no clients
		//TODO: add support for multiple clients with different timeouts
		var events = ["keypress","keydown","keyup"]; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
		var reset = function (e) { this._resetTimer(); }.bind(this);
		for (var i = 0; i < events.length; i++) {
			var event = events[i];
			this._document.addEventListener(event, reset, true);
		}
		EventTarget.attach(this);
	}

	Idle.prototype = {
		_resetTimer: function() {
			var window = this._document.defaultView || this._document.parentWindow;
			if (this._timer) {
				window.clearTimeout(this._timer);
				this._timer = null;
			}
			if (this._timeout !== -1) {
				this._timer = window.setTimeout(function() {
					this.onIdle({type:"Idle"});	//$NON-NLS-0$
					this._timer = null;
					this._resetTimer();
				}.bind(this), this._timeout);
			}
		},
		onIdle: function (idleEvent) {
			return this.dispatchEvent(idleEvent);
		},
		setTimeout: function(timeout) {
			this._timeout = timeout;
			this._resetTimer();
		}
	};

	function _makeError(error) {
		var newError = {
			Severity: "Error", //$NON-NLS-0$
			Message: messages.noResponse
		};
		if(error.name === "Cancel") {
			return {Severity: "Warning", Message: error.name, Cancel: true};
		} else if (error.status === 0) {
			newError.Cancel = true;
			return newError; // might do better here
		} else if (error.responseText) {
			var responseText = error.responseText;
			try {
				var parsedError = JSON.parse(responseText);
				newError.Severity = parsedError.Severity || newError.Severity;
				newError.Message = parsedError.Message || newError.Message;
			} catch (e) {
				newError.Message = responseText;
			}
		} else {
			try {
				newError.Message = JSON.stringify(error);
			} catch (e) {
				// best effort - fallthrough
			}
		}
		return newError;
	}

	function handleError(statusService, error) {
		if (!statusService) {
			window.console.log(error);
			return;
		}
		if (!error.Severity) {
			error = _makeError(error);
		}
		statusService.setProgressResult(error);
	}

	/**
	 * @name orion.editor.InputManager
	 * @class
	 */
	function InputManager(options) {
		EventTarget.attach(this);
		this.serviceRegistry = options.serviceRegistry;
		this.statusService = options.statusService;
		this.fileClient = options.fileClient;
		this.progressService = options.progressService;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.selection = options.selection;
		this._input = this._title = "";
		this.dispatcher = null;
		this._unsavedChanges = [];
	}
	objects.mixin(InputManager.prototype, /** @lends orion.editor.InputManager.prototype */ {
		/**
		 * @returns {orion.Promise} Promise resolving to the new Location we should use
		 */
		_maybeLoadWorkspace: function(resource) {
			var fileClient = this.fileClient;
			// If it appears to be a workspaceRootURL we cannot load it directly, have to get the workspace first
			if (resource === fileClient.fileServiceRootURL(resource)) {
				return fileClient.loadWorkspace(resource).then(function(workspace) {
					return workspace.Location;
				});
			}
			return new Deferred().resolve(resource);
		},
		/**
		 * Wrapper for fileClient.read() that tolerates a filesystem root URL passed as location. If location is indeed
		 * a filesystem root URL, the original read() operation is instead performed on the workspace.
		 */
		_read: function(location /**, readArgs*/) {
			var cachedMetadata = this.cachedMetadata || mNavigatorRenderer.getClickedItem();
			if (cachedMetadata && cachedMetadata.Location === location &&
				cachedMetadata.Parents && cachedMetadata.Attributes &&
				cachedMetadata.ETag
			) {
				return new Deferred().resolve(cachedMetadata);
			}
			var fileClient = this.fileClient;
			var readArgs = Array.prototype.slice.call(arguments, 1);
			return this._maybeLoadWorkspace(location).then(function(newLocation) {
				return fileClient.read.apply(fileClient, [newLocation].concat(readArgs));
			});
		},
		load: function() {
			var fileURI = this.getInput();
			if (!fileURI) { return; }
			var fileClient = this.fileClient;
			var resource = this._parsedLocation.resource;
			var progressService = this.progressService;
			var progress = function(deferred, msgKey, uri) {
				if (!progressService) { return deferred; }
				return progressService.progress(deferred, i18nUtil.formatMessage(msgKey, uri));
			};
			var editor = this.getEditor();
			if (this._fileMetadata) {
				//Reload if out of sync, unless we are already in the process of saving
				if (!this._saving && !this._fileMetadata.Directory && !this._readonly) {
					progress(fileClient.read(resource, true), messages.ReadingMetadata, fileURI).then(function(data) {
						if (this._fileMetadata && this._fileMetadata.Location === data.Location && this._fileMetadata.ETag !== data.ETag) {
							this._fileMetadata = data;
							if (!editor.isDirty() || window.confirm(messages.loadOutOfSync)) {
								progress(fileClient.read(resource), messages.Reading, fileURI).then(function(contents) {
									editor.setInput(fileURI, null, contents);
									this._unsavedChanges = [];
								}.bind(this));
							}
						}
					}.bind(this));
				}
			} else {
				var progressTimeout = window.setTimeout(function() {
					progressTimeout = null;
					this.reportStatus(i18nUtil.formatMessage(messages.Fetching, fileURI));
				}.bind(this), 800);
				var clearTimeout = function() {
					this.reportStatus("");
					if (progressTimeout) {
						window.clearTimeout(progressTimeout);
					}
				}.bind(this);
				var errorHandler = function(error) {
					clearTimeout();
					var statusService = null;
					if(this.serviceRegistry) {
						statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
					} else if(this.statusService) {
						statusService = this.statusService;
					}
					handleError(statusService, error);
					this._setNoInput();
				}.bind(this);
				this._acceptPatch = null;
				// Read metadata
				progress(this._read(resource, true), messages.ReadingMetadata, resource).then(function(metadata) {
					if(!metadata) {
						errorHandler({responseText: i18nUtil.formatMessage(messages.ReadingMetadataError, resource)});
					} else if (metadata.Directory) {
						// Fetch children
						Deferred.when(metadata.Children || progress(fileClient.fetchChildren(metadata.ChildrenLocation), messages.Reading, fileURI), function(contents) {
							clearTimeout();
							metadata.Children = contents;
							this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
						}.bind(this), errorHandler);
					} else {
						// Read contents if this is a text file
						if (this._isText(metadata)) {
							// Read text contents
							progress(fileClient.read(resource, false, true), messages.Reading, fileURI).then(function(contents) {
								clearTimeout();
								if (typeof contents !== "string") { //$NON-NLS-0$
									this._acceptPatch = contents.acceptPatch;
									contents = contents.result;
								}
								this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
							}.bind(this), errorHandler);
						} else {
							progress(fileClient._getService(resource).readBlob(resource), messages.Reading, fileURI).then(function(contents) {
								clearTimeout();
								this._setInputContents(this._parsedLocation, fileURI, contents, metadata);
							}.bind(this), errorHandler);
						}
					}
				}.bind(this), errorHandler);
			}
		},
		processParameters: function(input) {
			var editor = this.getEditor();
			if (editor && editor.processParameters) {
				editor.processParameters(input);
			}
		},
		getAutoLoadEnabled: function() {
			return this._autoLoadEnabled;
		},
		getAutoSaveEnabled: function() {
			return this._autoSaveEnabled;
		},
		getEditor: function() {
			return this.editor;
		},
		getInput: function() {
			return this._input;
		},
		getTitle: function() {
			return this._title;
		},
		getFileMetadata: function() {
			return this._fileMetadata;
		},
		getReadOnly: function() {
			var data = this._fileMetadata;
			return this._readonly || !data || (data.Attributes && data.Attributes.ReadOnly);
		},
		getContentType: function() {
			return this._contentType;
		},
		onFocus: function(e) {
			// If there was an error while auto saving, auto save is temporarily disabled and
			// we retry saving every time the editor gets focus
			if (this._autoSaveEnabled && this._errorSaving) {
				this.save();
				return;
			}
			if (this._autoLoadEnabled) {
				this.load();
			}
		},
		onChanging: function(e) {
			if (!this._getSaveDiffsEnabled()) { return; }
			var length = this._unsavedChanges.length;
			var addedCharCount = e.addedCharCount;
			var removedCharCount = e.removedCharCount;
			var start = e.start;
			var end = e.start + removedCharCount;
			var type = 0;
			if (addedCharCount === 0) {
				type = -1;
			} else if (removedCharCount === 0) {
				type = 1;
			}
			if (length > 0) {
				if (type === this.previousChangeType) {
					var previousChange = this._unsavedChanges[length-1];
					if (removedCharCount === 0 && start === previousChange.end + previousChange.text.length) {
						previousChange.text += e.text;
						return;
					}
					if (e.addedCharCount === 0 && end === previousChange.start) {
						previousChange.start = start;
						return;
					}
				}
			}
			this.previousChangeType = type;
			this._unsavedChanges.push({start:start, end:end, text:e.text});
		},
		reportStatus: function(msg) {
			if (this.statusReporter) {
				this.statusReporter(msg);
			} else if (this.editor) {
				this.editor.reportStatus(msg);
			}
		},
		save: function(closing) {
			if (this._saving) { return; }
			var editor = this.getEditor();
			if (!editor || !editor.isDirty() || this.getReadOnly()) { return; }
			var failedSaving = this._errorSaving;
			this._saving = true;
			var input = this.getInput();
			this.reportStatus(messages['Saving...']);

			this.dispatchEvent({ type: "Saving", inputManager: this}); //$NON-NLS-0$

			editor.markClean();
			var contents = editor.getText();
			var data = contents;
			if (this._getSaveDiffsEnabled() && !this._errorSaving) {
				var changes = this._unsavedChanges;
				var length = 0;
				for (var i = 0; i < changes.length; i++) {
					length += changes[i].text.length;
				}
				if (contents.length > length) {
					data = {
						diff: changes
					};
				}
			}
			this._unsavedChanges = [];
			this._errorSaving = false;

			var etag = this.getFileMetadata().ETag;
			var args = { "ETag" : etag }; //$NON-NLS-0$
			var resource = this._parsedLocation.resource;
			var def = this.fileClient.write(resource, data, args);
			var progress = this.progressService;
			var statusService = null;
			if(this.serviceRegistry){
				statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			}
			if (progress) {
				def = progress.progress(def, i18nUtil.formatMessage(messages.savingFile, input));
			}
			var self = this;
			function successHandler(result) {
				if (input === self.getInput()) {
					self.getFileMetadata().ETag = result.ETag;
					editor.setInput(input, null, contents, true);
				}
				self.reportStatus("");
				if (failedSaving && statusService) {
					statusService.setProgressResult({Message:messages.Saved, Severity:"Normal"}); //$NON-NLS-0$
				}
				if (self.postSave) {
					self.postSave(closing);
				}
				self._saving = false;
				return new Deferred().resolve(result);
			}
			function errorHandler(error) {
				self.reportStatus("");
				handleError(statusService, error);
				self._saving = false;
				self._errorSaving = true;
			}
			return def.then(successHandler, function(error) {
				// expected error - HTTP 412 Precondition Failed
				// occurs when file is out of sync with the server
				if (error.status === 412) {
					var forceSave = window.confirm(messages.saveOutOfSync);
					if (forceSave) {
						// repeat save operation, but without ETag
						var def = self.fileClient.write(resource, contents);
						if (progress) {
							def = progress.progress(def, i18nUtil.formatMessage(messages.savingFile, input));
						}
						return def.then(successHandler, errorHandler);
					} else {
						self._saving = false;
					}
				} else {
					// unknown error
					errorHandler(error);
				}
			});
		},
		setAutoLoadEnabled: function(enabled) {
			this._autoLoadEnabled = enabled;
		},
		/**
		 * Set the autosave timeout. If the timeout is <code>-1</code>, autosave is
		 * disabled.
		 * @param {Number} timeout - the autosave timeout in milliseconds
		 */
		setAutoSaveTimeout: function(timeout) {
			this._autoSaveEnabled = timeout !== -1;
			if (!this._idle) {
				var options = {
					document: document,
					timeout: timeout
				};
				this._idle = new Idle(options);
				this._idle.addEventListener("Idle", function () { //$NON-NLS-0$
					if (!this._errorSaving) {
						this.save();
					}
				}.bind(this));
			} else {
				this._idle.setTimeout(timeout);
			}
		},
		setContentType: function(contentType) {
			this._contentType = contentType;
		},
		setInput: function(location) {
			if (this._ignoreInput) { return; }
			if (!location) {
				location = PageUtil.hash();
			}
			if (typeof location !== "string") { //$NON-NLS-0$
				return;
			}
			var editor = this.getEditor();
			if (location && location[0] !== "#") { //$NON-NLS-0$
				location = "#" + location; //$NON-NLS-0$
			}
			var input = PageUtil.matchResourceParameters(location), oldInput = this._parsedLocation || {};
			if (editor && editor.isDirty()) {
				var oldLocation = this._location;
				var oldResource = oldInput.resource;
				var newResource = input.resource;
				if (oldResource !== newResource) {
					if (this._autoSaveEnabled) {
						this.save();
					} else if (!window.confirm(messages.confirmUnsavedChanges)) {
						window.location.hash = oldLocation;
						return;
					}
				}
			}
			var editorChanged = editor && oldInput.editor !== input.editor;
			this._location = location;
			this._parsedLocation = input;
			this._ignoreInput = true;
			if(this.selection) {
				this.selection.setSelections(location);
			}
			this._ignoreInput = false;
			var fileURI = input.resource;
			if (fileURI) {
				if (fileURI === this._input) {
					if (editorChanged) {
						this.reportStatus("");
						this._setInputContents(input, fileURI, null, this._fileMetadata, this._isText(this._fileMetadata));
					} else {
						this.processParameters(input);
					}
				} else {
					this._input = fileURI;
					this._readonly = false;
					this._fileMetadata = null;
					this.load();
				}
			} else {
				this._setNoInput(true);
			}
		},
		setTitle: function(title) {
			var indexOfSlash = title.lastIndexOf("/"); //$NON-NLS-0$
			var shortTitle = title;
			if (indexOfSlash !== -1) {
				shortTitle = shortTitle.substring(indexOfSlash + 1);
			}
			this._title = shortTitle;
		},
		setSaveDiffsEnabled: function(enabled) {
			this._saveDiffsEnabled = enabled;
		},
		_getSaveDiffsEnabled: function() {
			return this._saveDiffsEnabled && this._acceptPatch !== null && this._acceptPatch.indexOf("application/json-patch") !== -1; //$NON-NLS-0$
		},
		_unknownContentTypeAsText: function() {// Return true if we think unknown content type is text type
			return true;
		},
		_isText: function(metadata) {
			var contentType = this.contentTypeRegistry.getFileContentType(metadata);
			// Allow unkownn content types to be loaded as text files
			if (!contentType) { return this._unknownContentTypeAsText(); }
			var textPlain = this.contentTypeRegistry.getContentType("text/plain"); //$NON-NLS-0$
			return this.contentTypeRegistry.isExtensionOf(contentType, textPlain);
		},
		_setNoInput: function(loadRoot) {
			if (loadRoot) {
				this.fileClient.loadWorkspace("").then(function(root) {
					this._input = root.ChildrenLocation;
					this._setInputContents(root.ChildrenLocation, null, root, root);
				}.bind(this));
				return;
			}
			// No input, no editor.
			this._input = this._title = this._fileMetadata = null;
			this.setContentType(null);
			this.dispatchEvent({ type: "InputChanged", input: null }); //$NON-NLS-0$
		},
		_setInputContents: function(input, title, contents, metadata, noSetInput) {
			var name, isDir = false;
			if (metadata) {
				this._fileMetadata = metadata;
				this.setTitle(metadata.Location || String(metadata));
				this.setContentType(this.contentTypeRegistry.getFileContentType(metadata));
				name = metadata.Name;
				isDir = metadata.Directory;
			} else {
				// No metadata
				this._fileMetadata = null;
				this.setTitle(title);
				this.setContentType(this.contentTypeRegistry.getFilenameContentType(this.getTitle()));
				name = this.getTitle();
			}
			var editor = this.getEditor();
			if (this._focusListener) {
				if (editor && editor.getTextView && editor.getTextView()) {
					editor.getTextView().removeEventListener("Focus", this._focusListener); //$NON-NLS-0$
				}
				this._focusListener = null;
			}
			if (this._changingListener) {
				if (editor && editor.getModel && editor.getModel()) {
					editor.getModel().removeEventListener("Changing", this._changingListener); //$NON-NLS-0$
				}
				this._changingListener = null;
			}
			var evt = {
				type: "InputChanged", //$NON-NLS-0$
				input: input,
				name: name,
				title: title,
				contentType: this.getContentType(),
				metadata: metadata,
				location: window.location,
				contents: contents
			};
			this.dispatchEvent(evt);
			this.editor = editor = evt.editor;
			if (!isDir) {
				if (editor && editor.getModel && editor.getModel()) {
					editor.getModel().addEventListener("Changing", this._changingListener = this.onChanging.bind(this)); //$NON-NLS-0$
				}
				if (!noSetInput) {
					editor.setInput(title, null, contents);
				}
				if (editor && editor.getTextView && editor.getTextView()) {
					editor.getTextView().addEventListener("Focus", this._focusListener = this.onFocus.bind(this)); //$NON-NLS-0$
				}
				this._unsavedChanges = [];
				this.processParameters(input);
			}
		}
	});
	return {
		handleError: handleError,
		InputManager: InputManager
	};
});
