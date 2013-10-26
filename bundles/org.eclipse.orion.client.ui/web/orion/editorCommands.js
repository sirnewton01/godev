/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window define */
/*jslint browser:true devel:true*/

define([
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/webui/littlelib',
	'orion/webui/dialogs/OpenResourceDialog',
	'orion/widgets/input/DropDownMenu',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/commands', 
	'orion/keyBinding',
	'orion/commandRegistry',
	'orion/extensionCommands',
	'orion/contentTypes',
	'orion/searchUtils',
	'orion/PageUtil',
	'orion/PageLinks',
	'orion/blamer',
	'orion/regex',
	'orion/util',
	'orion/edit/editorContext'
], function(messages, i18nUtil, lib, openResource, DropDownMenu, Deferred, URITemplate, mCommands, mKeyBinding, mCommandRegistry, mExtensionCommands, mContentTypes, mSearchUtils, mPageUtil, PageLinks, blamer, regex, util, EditorContext) {

	var exports = {};
	
	var contentTypesCache = null;
	
	function createDelegatedUI(options) {
		var uriTemplate = new URITemplate(options.uriTemplate);
		var params = options.params || {};
		params.OrionHome = params.OrionHome || PageLinks.getOrionHome();
		var href = uriTemplate.expand(params);
		var delegatedParent = document.createElement("div"); //$NON-NLS-0$
		var iframe = document.createElement("iframe"); //$NON-NLS-0$
		iframe.id = options.id;
		iframe.name = options.id;
		iframe.type = "text/html"; //$NON-NLS-0$
		iframe.sandbox = "allow-scripts allow-same-origin"; //$NON-NLS-0$
		iframe.frameborder = options.border !== undefined ? options.border : 1;
		iframe.src = href;
		iframe.className = "delegatedUI"; //$NON-NLS-0$
		if (options.width) {
			delegatedParent.style.width = options.width;
			iframe.style.width = options.width;
		}
		if (options.height) {
			delegatedParent.style.height = options.height;
			iframe.style.height = options.height;
		}
		iframe.style.visibility = 'hidden'; //$NON-NLS-0$
		if (options.parent !== null) {
			(options.parent || window.document.body).appendChild(delegatedParent);
		}
		delegatedParent.appendChild(iframe);
		iframe.style.left = options.left || (window.innerWidth - parseInt(iframe.clientWidth, 10))/2 + "px"; //$NON-NLS-0$
		iframe.style.top = options.top || (window.innerHeight - parseInt(iframe.clientHeight, 10))/2 + "px"; //$NON-NLS-0$
		iframe.style.visibility = '';
		// Listen for notification from the iframe.  We expect either a "result" or a "cancelled" property.
		window.addEventListener("message", function _messageHandler(event) { //$NON-NLS-0$
			if (event.source !== iframe.contentWindow) {
				return;
			}
			if (typeof event.data === "string") { //$NON-NLS-0$
				var data = JSON.parse(event.data);
				if (data.pageService === "orion.page.delegatedUI" && data.source === options.id) { //$NON-NLS-0$
					if (data.cancelled) {
						// console.log("Delegated UI Cancelled");
						if (options.cancelled) {
							options.cancelled();
						}
					} else if (data.result) {
						if (options.done) {
							options.done(data.result);
						}
					} else if (data.Status || data.status) {
						if (options.status) {
							options.status(data.Status || data.status);
						}
					}
					window.removeEventListener("message", _messageHandler, false); //$NON-NLS-0$
					iframe.parentNode.removeChild(iframe);
				}
			}
		}, false);
		
		return delegatedParent;
	}
	exports.createDelegatedUI = createDelegatedUI;
			
	function EditorCommandFactory (serviceRegistry, commandService, fileClient, inputManager, toolbarId, isReadOnly, navToolbarId, localSearcher, searcher, editorSettings, localSettings) {
		this.serviceRegistry = serviceRegistry;
		this.commandService = commandService;
		this.fileClient = fileClient;
		this.inputManager = inputManager;
		this.toolbarId = toolbarId;
		this.pageNavId = navToolbarId;
		this.isReadOnly = isReadOnly;
		this._localSearcher = localSearcher;
		this._searcher = searcher;
		this.editorSettings = editorSettings;
		this.localSettings = localSettings;
	}
	EditorCommandFactory.prototype = {
		/**
		 * Creates the common text editing commands.  Also generates commands for any installed plug-ins that
		 * contribute editor actions.  
		 */
		generateEditorCommands: function(editor) {
			this._generateSettingsCommand(editor);
			this._generateSearchFilesCommand(editor);
			if (!this.isReadOnly) {
				this._generateUndoStackCommands(editor);
				this._generateSaveCommand(editor);
			}
			this._generateGotoLineCommnand(editor);
			this._generateFindCommnand(editor);
			this._generateBlame(editor);
			if (!this.isReadOnly) {
				this._generateEditCommands(editor);
			}
		},
		_generateSettingsCommand: function(editor) {
			var self = this;
			var settingsCommand = new mCommands.Command({
				imageClass: "core-sprite-wrench", //$NON-NLS-0$
				tooltip: messages.LocalEditorSettings,
				id: "orion.edit.settings", //$NON-NLS-0$
				visibleWhen: function() {
					return !!editor.getTextView();
				},
				callback: function(data) {
					var dropDown = settingsCommand.settingsDropDown;
					if (!dropDown || dropDown.isDestroyed()) {
						dropDown = settingsCommand.settingsDropDown = new DropDownMenu(data.domParent, data.domNode, { 
							noClick: true,
							selectionClass: 'dropdownSelection', //$NON-NLS-0$
							onShow: function() {
								dropDown.focus();
							},
							onHide: function() {
								editor.focus();
							}
						});
						dropDown.updateContent = self.localSettings.show.bind(self.localSettings);
						dropDown.getContentNode().tabIndex = 0;
					}
					dropDown.click();
				}
			});
			this.commandService.addCommand(settingsCommand);
			this.commandService.registerCommandContribution("settingsActions", "orion.edit.settings", 1, null, false, new mKeyBinding.KeyBinding("s", true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		_generateUndoStackCommands: function(editor) {
			var undoCommand = new mCommands.Command({
				name: messages.Undo,
				id: "orion.undo", //$NON-NLS-0$
				visibleWhen: function() {
					return !!editor.getTextView();
				},
				callback: function(data) {
					editor.getTextView().invokeAction("undo"); //$NON-NLS-0$
				}
			});
			this.commandService.addCommand(undoCommand);
			this.commandService.registerCommandContribution(this.toolbarId, "orion.undo", 400, null, true, editor.getTextView().getKeyBindings("undo")[0]); //$NON-NLS-1$ //$NON-NLS-0$
			
			var redoCommand = new mCommands.Command({
				name: messages.Redo,
				id: "orion.redo", //$NON-NLS-0$
				visibleWhen: function() {
					return !!editor.getTextView();
				},
				callback: function(data) {
					editor.getTextView().invokeAction("redo"); //$NON-NLS-0$
				}
			});
			this.commandService.addCommand(redoCommand);
			this.commandService.registerCommandContribution(this.toolbarId, "orion.redo", 401, null, true, editor.getTextView().getKeyBindings("redo")[0]); //$NON-NLS-1$ //$NON-NLS-0$
		},
		_generateSearchFilesCommand: function(editor) {
			var self = this;

			// global search
			if (self._searcher) {
				var showingSearchDialog = false;
				var searchCommand =  new mCommands.Command({
					name: messages.searchFiles,
					tooltip: messages.searchFiles,
					id: "orion.searchFiles", //$NON-NLS-0$
					visibleWhen: function() {
						return !!editor.getTextView();
					},
					callback: function(data) {
						editor.getTextView().invokeAction("searchFiles"); //$NON-NLS-0$
					}
				});
				this.commandService.addCommand(searchCommand);
				this.commandService.registerCommandContribution(this.pageNavId, "orion.searchFiles", 1, null, true, new mKeyBinding.KeyBinding("h", true)); //$NON-NLS-1$ //$NON-NLS-0$

				editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding("h", true), "searchFiles"); //$NON-NLS-1$ //$NON-NLS-0$
				editor.getTextView().setAction("searchFiles", function() { //$NON-NLS-0$
					if (showingSearchDialog) {
						return;
					}
					var selection = editor.getSelection();
					var searchTerm = editor.getText(selection.start, selection.end);
					var serviceRegistry = self.serviceRegistry;
					var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
					var dialog = new openResource.OpenResourceDialog({
						searcher: self._searcher,
						progress: progress,
						searchRenderer: self._searcher.defaultRenderer,
						nameSearch: false,
						title: messages.searchFiles,
						message: messages.searchTerm,
						initialText: searchTerm,
						onHide: function () {
							showingSearchDialog = false;
							editor.focus();
						}
					});
					window.setTimeout(function () {
						showingSearchDialog = true;
						dialog.show(lib.node(self.toolbarId));
					}, 0);
					return true;
				}, searchCommand);
			}
		},
		_generateSaveCommand: function(editor) {
			var self = this;
			
			editor.getTextView().setKeyBinding(new mKeyBinding.KeyBinding('s', true), "save"); //$NON-NLS-1$ //$NON-NLS-0$
			//If we are introducing other file system to provide save action, we need to define an onSave function in the input manager
			//That way the file system knows how to implement their save mechanism
			editor.getTextView().setAction("save", function () { //$NON-NLS-0$
				if (self.inputManager.save) {
					self.inputManager.save();
				} else if (self.inputManager.onSave) {
					var contents = editor.getText();
					self.inputManager.onSave(self.inputManager.getInput(), contents,
						function(result) {
							editor.setInput(self.inputManager.getInput(), null, contents, true);
							if(self.inputManager.afterSave){
								self.inputManager.afterSave();
							}
						},
						function(error) {
							error.log = true;
						}
					);
				}
				return true;
			}, {name: messages.Save});
			
			var saveCommand = new mCommands.Command({
				name: messages.Save,
				tooltip: messages.saveFile,
				id: "orion.save", //$NON-NLS-0$
				visibleWhen: function() {
					if (!editor.getTextView() || self.inputManager.getReadOnly()) {
						return false;
					}
					return !self.editorSettings || !self.editorSettings().autoSave;
				},
				callback: function(data) {
					editor.getTextView().invokeAction("save"); //$NON-NLS-0$
				}
			});
			this.commandService.addCommand(saveCommand);
			this.commandService.registerCommandContribution(this.toolbarId, "orion.save", 1, null, false, new mKeyBinding.KeyBinding('s', true)); //$NON-NLS-1$ //$NON-NLS-0$
		},
		_generateGotoLineCommnand: function(editor) {
			var self = this;

			// page navigation commands (go to line)
			var lineParameter = new mCommandRegistry.ParametersDescription(
				[new mCommandRegistry.CommandParameter('line', 'number', 'Line:')], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{hasOptionalParameters: false},
				function() {
					var line = editor.getModel().getLineAtOffset(editor.getCaretOffset()) + 1;
					return [new mCommandRegistry.CommandParameter('line', 'number', 'Line:', line.toString())]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
			);
			
			var gotoLineCommand =  new mCommands.Command({
				name: messages.gotoLine,
				tooltip: messages.gotoLineTooltip,
				id: "orion.gotoLine", //$NON-NLS-0$
				visibleWhen: function() {
					return !!editor.getTextView();
				},
				parameters: lineParameter,
				callback: function(data) {
					var line;
					var model = editor.getModel();
					if (data.parameters && data.parameters.valueFor('line')) { //$NON-NLS-0$
						line = data.parameters.valueFor('line'); //$NON-NLS-0$
					} else {
						line = model.getLineAtOffset(editor.getCaretOffset());
						line = prompt(messages.gotoLinePrompt, line + 1);
						if (line) {
							line = parseInt(line, 10);
						}
					}
					if (line) {
						editor.onGotoLine(line - 1, 0);
					}
				}
			});
			this.commandService.addCommand(gotoLineCommand);
			this.commandService.registerCommandContribution(this.pageNavId, "orion.gotoLine", 1, null, true, new mKeyBinding.KeyBinding('l', !util.isMac, false, false, util.isMac), new mCommandRegistry.URLBinding("gotoLine", "line")); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// override the editor binding
			editor.getTextView().setAction("gotoLine", function (data) { //$NON-NLS-0$
				if (data) {
					editor.onGotoLine(data.line - 1, 0, undefined, data.callback);
					return true;
				} 
				self.commandService.runCommand("orion.gotoLine"); //$NON-NLS-0$
				return true;
			}, gotoLineCommand);
		},
		_generateFindCommnand: function(editor) {
			var self = this;

			// find&&replace commands (find)
			var findParameter = new mCommandRegistry.ParametersDescription(
				[new mCommandRegistry.CommandParameter('find', 'text', 'Find:')], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				{clientCollect: true},
				function() {
					var selection = editor.getSelection();
					var searchString = "";
					if (selection.end > selection.start) {
						var model = editor.getModel();
						searchString = model.getText(selection.start, selection.end);
						if (self._localSearcher && self._localSearcher.getOptions().regex) {
							searchString = regex.escape(searchString);
						}
					}
					return [new mCommandRegistry.CommandParameter('find', 'text', 'Find:', searchString)]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}
			);
			var findCommand =  new mCommands.Command({
				name: messages.Find,
				tooltip: messages.Find,
				id: "orion.editor.find", //$NON-NLS-0$
				visibleWhen: function() {
					return !!editor.getTextView();
				},
				parameters: findParameter,
				callback: function(data) {
					if (self._localSearcher) {
						var searchString = "";
						var parsedParam = null;
						var selection = editor.getSelection();
						if (selection.end > selection.start && data.parameters.valueFor('useEditorSelection')) {//$NON-NLS-0$ If there is selection from editor, we want to use it as the default keyword
							var model = editor.getModel();
							searchString = model.getText(selection.start, selection.end);
							if (self._localSearcher.getOptions().regex) {
								searchString = regex.escape(searchString);
							}
						} else {//If there is no selection from editor, we want to parse the parameter from URL binding
							if (data.parameters && data.parameters.valueFor('find')) { //$NON-NLS-0$
								searchString = data.parameters.valueFor('find'); //$NON-NLS-0$
								parsedParam = mPageUtil.matchResourceParameters();
								mSearchUtils.convertFindURLBinding(parsedParam);
							}
						}
						if(parsedParam){
							self._localSearcher.setOptions({regex: parsedParam.regEx, caseInsensitive: !parsedParam.caseSensitive});
							var tempOptions = {};
							if(parsedParam.atLine){
								tempOptions.start = editor.getModel().getLineStart(parsedParam.atLine-1);
							}
							self._localSearcher.show({findString: searchString, replaceString: parsedParam.replaceWith});
							self._localSearcher.find(true, tempOptions);
						} else {
							self._localSearcher.show({findString: searchString});
						}
						return true;
					}
					return false;
				}
			});
			this.commandService.addCommand(findCommand);
			this.commandService.registerCommandContribution(this.pageNavId, "orion.editor.find", 2, null, true, new mKeyBinding.KeyBinding('f', true), new mCommandRegistry.URLBinding("find", "find")); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			// override the editor binding 
			editor.getTextView().setAction("find", function (data) { //$NON-NLS-0$
				if (data) {
					self._localSearcher.show(data);
					return true;
				}
				self.commandService.runCommand("orion.editor.find", null, null, new mCommandRegistry.ParametersDescription( //$NON-NLS-0$
					[new mCommandRegistry.CommandParameter('useEditorSelection', 'text', '', "true")], //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$ 
					{clientCollect: true}));
				return true;
			}, findCommand);
		},
		
		_generateBlame: function(editor){
			var self = this;
			var blameCommand = new mCommands.Command({
				name: messages.Blame,
				tooltip: messages.BlameTooltip,
				id: "orion.edit.blame", //$NON-NLS-0$
				parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('blame', 'boolean')], {clientCollect: true}), //$NON-NLS-1$ //$NON-NLS-0$
				visibleWhen: function() {
					if (!editor.getTextView()) {
						return false;
					}
					return blamer.isVisible(self.serviceRegistry, self.inputManager);
				},
				callback: function(data) {
					blameCommand.visible = !blameCommand.visible;
					if (data.parameters && data.parameters.valueFor('blame')) { //$NON-NLS-0$
						blameCommand.visible = data.parameters.valueFor('blame') === "true"; //$NON-NLS-1$ //$NON-NLS-0$
					}
					if (blameCommand.visible) {
						blamer.getBlame(self.serviceRegistry, self.inputManager);
					} else{
						editor.showBlame([]);
					}
				}
			});
			this.commandService.addCommand(blameCommand);
			this.commandService.registerCommandContribution(this.toolbarId , "orion.edit.blame", 1, null, false, new mKeyBinding.KeyBinding('b', true, true), new mCommandRegistry.URLBinding("blame", "blame")); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		
		_generateEditCommands: function(editor) {
			var self = this;

			function getContentTypes(serviceRegistry) {
				if (contentTypesCache) {
					return contentTypesCache;
				}
				var contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				//TODO Shouldn't really be making service selection decisions at this level. See bug 337740
				if (!contentTypeService) {
					contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
					contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				}
				return contentTypeService.getContentTypes().then(function(ct) {
					contentTypesCache = ct;
					return contentTypesCache;
				});
			}

			// KB exists so that we can pass an array (from info.key) rather than actual arguments
			function createKeyBinding(args) {
				var keyBinding = new mKeyBinding.KeyBinding();
				mKeyBinding.KeyBinding.apply(keyBinding, args);
				return keyBinding;
			}

			function handleStatus(status, allowHTML) {
				if (!allowHTML && status && typeof status.HTML !== "undefined") { //$NON-NLS-0$
					delete status.HTML;
				}
				var statusService = self.serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				if (statusService) {
					statusService.setProgressResult(status);
				} else {
					window.console.log(status);
				}
			}

			// add the commands generated by plug-ins who implement the "orion.edit.command" extension.
			//
			// Note that the shape of the "orion.edit.command" extension is not in any shape or form that could be considered final.
			// We've included it to enable experimentation. Please provide feedback in the following bug:
			// https://bugs.eclipse.org/bugs/show_bug.cgi?id=337766
			//
			// iterate through the extension points and generate commands for each one.
			var serviceRegistry = this.serviceRegistry;
			var actionReferences = serviceRegistry.getServiceReferences("orion.edit.command"); //$NON-NLS-0$
			var inputManager = this.inputManager;
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var makeCommand = function(info, service, options) {
				var commandVisibleWhen = options.visibleWhen;
				options.visibleWhen = function(item) {
					if (!editor.getTextView() || self.inputManager.getReadOnly()) {
						return false;
					}
					return !commandVisibleWhen || commandVisibleWhen(item);
				};
				options.callback = function(data) {
					// command service will provide editor parameter but editor widget callback will not
					editor = this;
					var selection = editor.getSelection();
					var model = editor.getModel();

					/*
					 * Processes the result object from old run() API.
					 * @deprecated: command services should implement execute() instead.
					 */
					var processEditorResult = function(result) {
						if (typeof result === "object" && result) { //$NON-NLS-0$
							if (result.text) {
								editor.setText(result.text);
							}
							if (result.selection) {
								editor.setSelection(result.selection.start, result.selection.end, true /*scroll to*/);
								editor.focus();
							}
						} else if (typeof result === 'string') { //$NON-NLS-0$
							editor.setText(result, selection.start, selection.end, true /*scroll to*/);
							editor.setSelection(selection.start, selection.start + result.length);
							editor.focus();
						}
					};

					var serviceCall, handleResult;
					if (service.execute) {
						var context = {
							contentType: inputManager.getContentType(),
							input: inputManager.getInput()
						};
						// Hook up delegated UI and Status handling
						var editorContext = EditorContext.getEditorContext(serviceRegistry);
						editorContext.openDelegatedUI = createDelegatedUI;
						editorContext.setStatus = handleStatus;

						serviceCall = service.execute(editorContext, context);
						handleResult = null; // execute() returns nothing
					} else {
						serviceCall = service.run(model.getText(selection.start,selection.end), model.getText(), selection, inputManager.getInput());
						handleResult = function(result){
							if (result && result.uriTemplate) {
							    var options = {};
								options.uriTemplate = result.uriTemplate;
							    options.params = inputManager.getFileMetadata();
								options.id = info.id;
								options.width = result.width;
								options.height = result.height;
								options.done = processEditorResult;
								options.status = handleStatus;
							    createDelegatedUI(options);
							} else if (result.Status || result.status) {
								handleStatus(result.Status || result.status);
							} else {
								processEditorResult(result);
							}
						};
					}
					progress.showWhile(serviceCall, i18nUtil.formatMessage(messages.running, info.name)).then(handleResult);
					return true;
				};
				options.callback = options.callback.bind(editor);
				return new mCommands.Command(options);
			};
			Deferred.when(getContentTypes(this.serviceRegistry), function() {
				var deferreds = [];
				var position = 100;
				actionReferences.forEach(function(serviceReference) {
					var service = self.serviceRegistry.getService(serviceReference);
					var info = {};
					var propertyNames = serviceReference.getPropertyKeys();
					for (var j = 0; j < propertyNames.length; j++) {
						info[propertyNames[j]] = serviceReference.getProperty(propertyNames[j]);
					}
					info.forceSingleItem = true;  // for compatibility with mExtensionCommands._createCommandOptions
					
					var deferred = mExtensionCommands._createCommandOptions(info, serviceReference, self.serviceRegistry, contentTypesCache, false, function(items) {
						// items is the editor and we care about the file metadata for validation
						return inputManager.getFileMetadata();
					});
					deferreds.push(deferred);	
					deferred.then(function(commandOptions){
						var command = makeCommand(info, service, commandOptions);
						self.commandService.addCommand(command);
						self.commandService.registerCommandContribution(self.toolbarId, command.id, position);
						if (info.key) {
							// add it to the editor as a keybinding
							var textView = editor.getTextView();
							textView.setKeyBinding(createKeyBinding(info.key), command.id);
							textView.setAction(command.id, command.callback, command);
						}				
					});
					position++;
				});
				Deferred.all(deferreds, function(error) {return {_error: error}; }).then(function(promises) {
					// In the editor, we generate page level commands to the banner.  Don't bother if we don't know the input
					// metadata, because we'll generate again once we know.
					var metadata;
					if ((metadata = inputManager.getFileMetadata())) {
						var toolbar = lib.node("pageActions"); //$NON-NLS-0$
						if (toolbar) {	
							self.commandService.destroy(toolbar);
							self.commandService.renderCommands(toolbar.id, toolbar, metadata, editor, "button"); //$NON-NLS-0$
						}
						toolbar = lib.node("pageNavigationActions"); //$NON-NLS-0$
						if (toolbar) {	
							self.commandService.destroy(toolbar);
							self.commandService.renderCommands(toolbar.id, toolbar, editor, editor, "button");   //$NON-NLS-0$
						}
					}
				});
			});
		}
	};
	exports.EditorCommandFactory = EditorCommandFactory;

	return exports;	
});
