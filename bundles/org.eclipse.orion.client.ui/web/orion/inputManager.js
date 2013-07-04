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

/*global define window */
/*jslint browser:true*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/Deferred',
	'orion/EventTarget',
	'orion/objects',
	'orion/globalCommands',
	'orion/edit/dispatcher',
	'orion/highlight',
	'orion/edit/syntaxmodel',
	'orion/PageUtil'
], function(messages, i18nUtil, Deferred, EventTarget, objects, mGlobalCommands, mDispatcher, Highlight, SyntaxModelWirer, PageUtil) {

	function Idle(options){
		this._document = options.document || document;
		this._timeout = options.timeout;
		//TODO: remove listeners if there are no clients
		//TODO: add support for multiple clients with different timeouts
		var events = ["keypress","keydown","keyup","mousemove","mousedown","mousemove"]; //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$ //$NON-NLS-3$ //$NON-NLS-4$ //$NON-NLS-5$
		var reset = function (e) { this._resetTimer(); }.bind(this);
		for (var i=0; i<events.length; i++) {
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
	
	function parseNumericParams(input, params) {
		for (var i=0; i < params.length; i++) {
			var param = params[i];
			if (input[param]) {
				input[param] = parseInt(input[param], 10);
			}
		}
	}
	
	function handleError(statusService, error) {
		if (!statusService) {
			window.console.log(error);
			return;
		}
		if (error.status === 0) {
			error = {
				Severity: "Error", //$NON-NLS-0$
				Message: messages['No response from server.  Check your internet connection and try again.'] //$NON-NLS-1$
			};
		} else {
			var responseText = error.responseText;
			if (responseText) {
				try {
					error = JSON.parse(responseText);
				} catch(e) {
					error = {
						//HTML: true,
						Severity: "Error", //$NON-NLS-0$
						Message: responseText
					};
				}
			}
		}
		statusService.setProgressResult(error);
	}

	/**
	 * @name orion.editor.InputManager
	 * @class
	 */
	function InputManager(options) {
		this.editor = options.editor;
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.progressService = options.progressService;
		this.contentTypeService = options.contentTypeService;
		this.selection = options.selection;
		this.syntaxHighlighter = new Highlight.SyntaxHighlighter(this.serviceRegistry);
		this.syntaxModelWirer = new SyntaxModelWirer(this.serviceRegistry);
		this._input = this._title = "";
		this.dispatcher = null;
		EventTarget.attach(this);
	}
	objects.mixin(InputManager.prototype, /** @lends orion.editor.InputManager.prototype */ {
		load: function() {
			var fileURI = this.getInput();
			if (!fileURI) { return; }
			var fileClient = this.fileClient;
			var progressService = this.progressService;
			var editor = this.getEditor();
			if (this._fileMetadata) {
				//Reload if auto of sync
				progressService.progress(fileClient.read(fileURI, true), i18nUtil.formatMessage(messages["Reading metedata of"], fileURI)).then(function(data) {
					if (this._fileMetadata.ETag !== data.ETag) {
						this._fileMetadata = data;
						if (!editor.isDirty() || window.confirm(messages.loadOutOfSync)) {
							progressService.progress(fileClient.read(fileURI), i18nUtil.formatMessage(messages.Reading, fileURI)).then(function(contents) {
								editor.setInput(fileURI, null, contents);										
							});
						}
					}
				}.bind(this));
			} else {
				var progressTimeout = window.setTimeout(function() {
					editor.reportStatus(i18nUtil.formatMessage(messages.Fetching, fileURI));
				}, 800);
				new Deferred.all([
					progressService.progress(fileClient.read(fileURI), i18nUtil.formatMessage(messages.Reading, fileURI)),
					progressService.progress(fileClient.read(fileURI, true), i18nUtil.formatMessage(messages["Reading metedata of"], fileURI))
				], function(error) { return {_error: error}; }).then(function(results) {
					if (progressTimeout) {
						window.clearTimeout(progressTimeout);
					}
					var contentOrError = results[0];
					var metadataOrError = results[1];
					if (contentOrError._error || metadataOrError._error) {
						var statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
						handleError(statusService, contentOrError._error || metadataOrError._error);
						this._setNoInput();
					} else {
						this._setInputContents(this._parsedLocation, fileURI, contentOrError, metadataOrError);
					}
					editor.reportStatus("");
				}.bind(this));
			}
		},
		processParameters: function(input) {
			var editor = this.getEditor();
			parseNumericParams(input, ["start", "end", "line", "offset", "length"]); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			editor.showSelection(input.start, input.end, input.line, input.offset, input.length);
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
		getContentType: function() {
			return this._contentType;
		},
		save: function() {
			if (this._saving) { return; }
			var editor = this.getEditor();
			if (!editor.isDirty()) { return; }
			this._saving = true;
			this._errorSaving = false;
			var input = this.getInput();
			editor.reportStatus(messages['Saving...']);
			var contents = editor.getText();
			var etag = this.getFileMetadata().ETag;
			var args = { "ETag" : etag }; //$NON-NLS-0$
			var def = this.fileClient.write(input, contents, args);
			var progress = this.progressService;
			var statusService = this.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
			if (progress) {
				def = progress.progress(def, i18nUtil.formatMessage(messages['Saving file {0}'], input));
			}
			var self = this;
			function successHandler(result) {
				self.getFileMetadata().ETag = result.ETag;
				editor.setInput(input, null, contents, true);
				editor.reportStatus("");
				if (self.afterSave) {
					self.afterSave();
				}
				self._saving = false;
			}
			function errorHandler(error) {
				editor.reportStatus("");
				handleError(statusService, error);
				self._saving = false;
				self._errorSaving = true;
			}
			def.then(successHandler, function(error) {
				// expected error - HTTP 412 Precondition Failed 
				// occurs when file is out of sync with the server
				if (error.status === 412) {
					var forceSave = window.confirm(messages["Resource is out of sync with the server. Do you want to save it anyway?"]);
					if (forceSave) {
						// repeat save operation, but without ETag 
						var def = self.fileClient.write(input, contents);
						if (progress) {
							def = progress.progress(def, i18nUtil.formatMessage(messages['Saving file {0}'], input));
						}
						def.then(successHandler, errorHandler);
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
				var editor = this.getEditor(), textView = editor.getTextView();
				var setIdle = function() {
					editor.removeEventListener("TextViewInstalled", setIdle); //$NON-NLS-0$
					var document = editor.getTextView().getOptions("parent").ownerDocument; //$NON-NLS-0$
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
					this._idle.setTimeout(timeout);
				}.bind(this);
				if (textView) {
					setIdle();
				} else {
					// wait for a textview to get installed
					editor.addEventListener("TextViewInstalled", setIdle); //$NON-NLS-0$
				}
			} else {
				this._idle.setTimeout(timeout);
			}
		},
		setDirty: function(dirty) {
			mGlobalCommands.setDirtyIndicator(dirty);
		},
		setInput: function(location) {
			if (this._ignoreInput) { return; }
			if (!location) {
				location = window.location.hash;
			}
			if (typeof location !== "string") { //$NON-NLS-0$
				return;
			}
			var editor = this.getEditor();
			if (location && location[0] !== "#") { //$NON-NLS-0$
				location = "#" + location; //$NON-NLS-0$
			}
			var input = PageUtil.matchResourceParameters(location);
			if (editor.isDirty()) {
				var oldLocation = this._location;
				var oldResource = PageUtil.matchResourceParameters(oldLocation).resource;
				var newResource = input.resource;
				if (oldResource !== newResource) {
					if (this._autoSaveEnabled) {
						this.save();
					} else if (!window.confirm(messages["There are unsaved changes.  Do you still want to navigate away?"])) {
						window.location.hash = oldLocation;
						return;
					}
				}
			}
			this._location = location;
			this._parsedLocation = input;
			this._ignoreInput = true;
			this.selection.setSelections(location);
			this._ignoreInput = false;
			var fileURI = input.resource;
			if (fileURI) {
				if (fileURI === this._input) {
					this.processParameters(input);
				} else {
					this._input = fileURI;
					this._fileMetadata = null;
					this.load();
				}
			} else {
				this._setNoInput();
			}
		},
		_setNoInput: function() {
			// No input, no editor.
			this._input = this._title = this._contentType = null;
			this.editor.uninstallTextView();
			this.dispatchEvent({ type: "InputChanged", input: null }); //$NON-NLS-0$
		},
		_setInputContents: function(input, title, contents, metadata) {
			var name;
			if (metadata) {
				this._fileMetadata = metadata;
				this.setTitle(metadata.Location || String(metadata));
				this._contentType = this.contentTypeService.getFileContentType(metadata);
				name = metadata.Name;
			} else {
				// No metadata
				this._fileMetadata = null;
				this.setTitle(title);
				this._contentType = this.contentTypeService.getFilenameContentType(this.getTitle());
				name = this.getTitle();
			}
			var editor = this.getEditor();
			if (!editor.getTextView()) {
				editor.installTextView();
				editor.getTextView().addEventListener("Focus", function(e) { //$NON-NLS-0$
					// If there was an error while auto saving, auto save is temporarily disabled and
					// we retry saving every time the editor gets focus
					if (this._autoSaveEnabled && this._errorSaving) {
						this.save();
						return;
					}
					if (this._autoLoadEnabled) {
						this.load();
					}
				}.bind(this));
			}
			// TODO could potentially dispatch separate events for metadata and contents changing
			this.dispatchEvent({ type: "InputChanged", input: input, name: name, metadata: metadata, contents: contents }); //$NON-NLS-0$
			var self = this;
			this.syntaxHighlighter.setup(this._contentType, editor.getTextView(), editor.getAnnotationModel(), title, true).then(function() {
				// TODO folding should be a preference.
				var styler = self.syntaxHighlighter.getStyler();
				editor.setFoldingEnabled(styler && styler.foldingEnabled);
				self.dispatchEvent({ type: "ContentTypeChanged", contentType: self._contentType, location: window.location }); //$NON-NLS-0$
				if (!self.dispatcher) {
					self.dispatcher = new mDispatcher.Dispatcher(self.serviceRegistry, editor, self._contentType);
				}
				// Contents
				editor.setInput(title, null, contents);
				self.processParameters(input);
			});
			this.setDirty(false);
		},
		setTitle : function(title) {
			var indexOfSlash = title.lastIndexOf("/"); //$NON-NLS-0$
			var shortTitle = title;
			if (indexOfSlash !== -1) {
				shortTitle = shortTitle.substring(indexOfSlash + 1);
			}
			this._title = shortTitle;
		}
	});
	return {
		InputManager: InputManager
	};
});
