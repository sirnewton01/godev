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
	'orion/editor/editor',
	'orion/editor/eventTarget',
	'orion/editor/textView',
	'orion/editor/textModel',
	'orion/editor/projectionTextModel',
	'orion/editor/editorFeatures',
	'orion/hover',
	'orion/editor/contentAssist',
	'orion/editor/emacs',
	'orion/editor/vi',
	'orion/editorPreferences',
	'orion/widgets/themes/ThemePreferences',
	'orion/widgets/themes/editor/ThemeData',
	'orion/widgets/settings/EditorSettings',
	'orion/searchAndReplace/textSearcher',
	'orion/editorCommands',
	'orion/globalCommands',
	'orion/edit/dispatcher',
	'orion/edit/editorContext',
	'orion/edit/typedefs',
	'orion/highlight',
	'orion/markOccurrences',
	'orion/syntaxchecker',
	'orion/liveEditSession',
	'orion/keyBinding',
	'orion/uiUtils',
	'orion/util',
	'orion/objects'
], function(
	messages,
	mEditor, mEventTarget, mTextView, mTextModel, mProjectionTextModel, mEditorFeatures, mHoverFactory, mContentAssist,
	mEmacs, mVI, mEditorPreferences, mThemePreferences, mThemeData, EditorSettings,
	mSearcher, mEditorCommands, mGlobalCommands,
	mDispatcher, EditorContext, TypeDefRegistry, Highlight,
	mMarkOccurrences, mSyntaxchecker, LiveEditSession,
	mKeyBinding, mUIUtils, util, objects
) {

	function parseNumericParams(input, params) {
		for (var i = 0; i < params.length; i++) {
			var param = params[i];
			if (input[param]) {
				input[param] = parseInt(input[param], 10);
			}
		}
	}

	/**
	 * Constructs a new EditorView object.
	 *
	 * @class
	 * @name orion.EditorView
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function EditorView(options) {
		this._parent = options.parent;
		this.renderToolbars = options.renderToolbars;
		this.serviceRegistry = options.serviceRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.commandRegistry = options.commandRegistry;
		this.progress = options.progress;
		this.statusService = options.statusService;
		this.fileClient = options.fileService;
		this.inputManager = options.inputManager;
		this.preferences = options.preferences;
		this.readonly = options.readonly;
		this.searcher = options.searcher;
		this.statusReporter = options.statusReporter;
		this.model = options.model;
		this.undoStack = options.undoStack;
		this.syntaxHighlighter = new Highlight.SyntaxHighlighter(this.serviceRegistry);
		this.typeDefRegistry = new TypeDefRegistry(this.serviceRegistry);
		var keyAssist = mGlobalCommands.getKeyAssist();
		if(keyAssist) {
			keyAssist.addProvider(this);
		}
		var mainSplitter = mGlobalCommands.getMainSplitter();
		if(mainSplitter) {
			mainSplitter.splitter.addEventListener("resize", function (evt) { //$NON-NLS-0$
				if (this.editor && evt.node === mainSplitter.main) {
					this.editor.resize();
				}
			}.bind(this));
		}
		mGlobalCommands.getGlobalEventTarget().addEventListener("toggleTrim", function(evt) { //$NON-NLS-0$
			if (this.editor) {
				this.editor.resize();
			}
		}.bind(this));
		this.settings = {};
		this._init();
	}
	EditorView.prototype = /** @lends orion.EditorView.prototype */ {
		updateKeyMode: function(prefs, textView) {
			if (this.emacs) {
				textView.removeKeyMode(this.emacs);
			}
			if (this.vi) {
				textView.removeKeyMode(this.vi);
			}
			if (prefs.keyBindings === "Emacs") { //$NON-NLS-0$
				if (!this.emacs) {
					this.emacs = new mEmacs.EmacsMode(textView);
				}
				textView.addKeyMode(this.emacs);
			} else if (prefs.keyBindings === "vi") { //$NON-NLS-0$
				if (!this.vi) {
					this.vi = new mVI.VIMode(textView, this.statusReporter);
				}
				textView.addKeyMode(this.vi);
			}
		},
		getParent: function() {
			return this._parent;
		},
		getSettings: function() {
			return this.settings;
		},
		setParent: function(parent) {
			this._parent = parent;	
		},
		updateSourceCodeActions: function(prefs, sourceCodeActions) {
			if (sourceCodeActions) {
				sourceCodeActions.setAutoPairParentheses(prefs.autoPairParentheses);
				sourceCodeActions.setAutoPairBraces(prefs.autoPairBraces);
				sourceCodeActions.setAutoPairSquareBrackets(prefs.autoPairSquareBrackets);
				sourceCodeActions.setAutoPairAngleBrackets(prefs.autoPairAngleBrackets);
				sourceCodeActions.setAutoPairQuotations(prefs.autoPairQuotations);
				sourceCodeActions.setAutoCompleteComments(prefs.autoCompleteComments);
				sourceCodeActions.setSmartIndentation(prefs.smartIndentation);
			}
		},
		updateViewOptions: function(prefs) {
			var marginOffset = 0;
			if (prefs.showMargin) {
				marginOffset = prefs.marginOffset;
				if (typeof marginOffset !== "number") { //$NON-NLS-0$
					marginOffset = prefs.marginOffset = parseInt(marginOffset, 10);
				}
			}
			var wrapOffset = 0;
			if (prefs.wordWrap) {
				wrapOffset = marginOffset;
			}
			return {
				readonly: this.readonly || this.inputManager.getReadOnly(),
				tabSize: prefs.tabSize || 4,
				expandTab: prefs.expandTab,
				wrapMode: prefs.wordWrap,
				wrapOffset: wrapOffset,
				marginOffset: marginOffset,
				scrollAnimation: prefs.scrollAnimation ? prefs.scrollAnimationTimeout : 0
			};
		},
		updateSettings: function(prefs) {
			this.settings = prefs;
			var editor = this.editor;
			var inputManager = this.inputManager;
			inputManager.setAutoLoadEnabled(prefs.autoLoad);
			inputManager.setAutoSaveTimeout(prefs.autoSave ? prefs.autoSaveTimeout : -1);
			inputManager.setSaveDiffsEnabled(prefs.saveDiffs);
			this.updateStyler(prefs);
			var textView = editor.getTextView();
			if (textView) {
				this.updateKeyMode(prefs, textView);
				textView.setOptions(this.updateViewOptions(prefs));
			}
			this.updateSourceCodeActions(prefs, editor.getSourceCodeActions());
			editor.setAnnotationRulerVisible(prefs.annotationRuler);
			editor.setLineNumberRulerVisible(prefs.lineNumberRuler);
			editor.setFoldingRulerVisible(prefs.foldingRuler);
			editor.setOverviewRulerVisible(prefs.overviewRuler);
			editor.setZoomRulerVisible(prefs.zoomRuler);
			if (this.renderToolbars) {
				this.renderToolbars(inputManager.getFileMetadata());
			}
			this.markOccurrences.setOccurrencesVisible(prefs.showOccurrences);
			if (editor.getContentAssist()) {
				editor.getContentAssist().setAutoTriggerEnabled(prefs.contentAssistAutoTrigger);	
			}

			this.dispatchEvent({
				type: "Settings", //$NON-NLS-0$
				newSettings: this.settings
			});
		},
		updateStyler: function(prefs) {
			var styler = this.syntaxHighlighter.getStyler();
			if (styler) {
				if (styler.setWhitespacesVisible) {
					styler.setWhitespacesVisible(prefs.showWhitespaces, true);
				}
			}
		},
		showKeyBindings: function(keyAssist) {
			var editor = this.editor;
			if (editor && editor.getTextView && editor.getTextView()) {
				var textView = editor.getTextView();
				// Remove actions without descriptions
				var editorActions = textView.getActions(true).filter(function (element) {
					var desc = textView.getActionDescription(element);
					return desc && desc.name;
				});
				editorActions.sort(function (a, b) {
					return textView.getActionDescription(a).name.localeCompare(textView.getActionDescription(b).name);
				});
				keyAssist.createHeader(messages["Editor"]);
				var execute = function (actionID) {
					return function () {
						textView.focus();
						return textView.invokeAction(actionID);
					};
				};
				var scopes = {}, binding;
				for (var i = 0; i < editorActions.length; i++) {
					var actionID = editorActions[i];
					var actionDescription = textView.getActionDescription(actionID);
					var bindings = textView.getKeyBindings(actionID);
					for (var j = 0; j < bindings.length; j++) {
						binding = bindings[j];
						var bindingString = mUIUtils.getUserKeyString(binding);
						if (binding.scopeName) {
							if (!scopes[binding.scopeName]) {
								scopes[binding.scopeName] = [];
							}
							scopes[binding.scopeName].push({bindingString: bindingString, name: actionDescription.name, execute: execute(actionID)});
						} else {
							keyAssist.createItem(bindingString, actionDescription.name, execute(actionID));
						}
					}
				}
				for (var scopedBinding in scopes) {
					if (scopes[scopedBinding].length) {
						keyAssist.createHeader(scopedBinding);
						for (var k = 0; k < scopes[scopedBinding].length; k++) {
							binding = scopes[scopedBinding][k];
							keyAssist.createItem(binding.bindingString, binding.name, binding.execute);
						}
					}	
				}
			}
		},
		_init: function() {
			var editorPreferences = null;
			if(this.preferences) {
				editorPreferences = this.editorPreferences = new mEditorPreferences.EditorPreferences(this.preferences, function (prefs) {
					if (!prefs) {
						editorPreferences.getPrefs(this.updateSettings.bind(this));
					} else {
						this.updateSettings(prefs);
					}
				}.bind(this));
			}
			var themePreferences = null;
			if(this.preferences) {
				themePreferences = new mThemePreferences.ThemePreferences(this.preferences, new mThemeData.ThemeData());
				themePreferences.apply();
			}
			var localSettings;

			var self = this;

//			var editorDomNode = this._parent;
			var readonly = this.readonly;
			var commandRegistry = this.commandRegistry;
			var serviceRegistry = this.serviceRegistry;
			var fileClient = this.fileClient;
			var inputManager = this.inputManager;
			var searcher = this.searcher;
			var progress = this.progress;
			var contentTypeRegistry = this.contentTypeRegistry;

			var textViewFactory = function() {
				var options = self.updateViewOptions(self.settings);
				objects.mixin(options, {
					parent: self._parent,
					model: new mProjectionTextModel.ProjectionTextModel(self.model || new mTextModel.TextModel()),
					wrappable: true
				});
				var textView = new mTextView.TextView(options);
				return textView;
			};

			var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {

				var localSearcher = new mSearcher.TextSearcher(editor, serviceRegistry, commandRegistry, undoStack);

				var keyBindings = new mEditorFeatures.KeyBindingsFactory().createKeyBindings(editor, undoStack, contentAssist, localSearcher);
				self.updateSourceCodeActions(self.settings, keyBindings.sourceCodeActions);

				// Register commands that depend on external services, the registry, etc.  Do this after
				// the generic keybindings so that we can override some of them.
				var commandGenerator = new mEditorCommands.EditorCommandFactory({
					serviceRegistry: serviceRegistry,
					commandRegistry: commandRegistry,
					fileClient: fileClient,
					inputManager: inputManager,
					toolbarId: "toolsActions", //$NON-NLS-0$
					saveToolbarId: "fileActions", //$NON-NLS-0$
					editToolbarId: "editActions", //$NON-NLS-0$
					readonly: readonly,
					navToolbarId: "pageNavigationActions", //$NON-NLS-0$
					textSearcher: localSearcher,
					searcher: searcher,
					editorSettings: function() { return self.settings; },
					localSettings: localSettings
				});
				commandGenerator.generateEditorCommands(editor);

				var textView = editor.getTextView();
				var keyAssistCommand = commandRegistry.findCommand("orion.keyAssist"); //$NON-NLS-0$
				if (keyAssistCommand) {
					textView.setKeyBinding(new mKeyBinding.KeyStroke(191, false, true, !util.isMac, util.isMac), keyAssistCommand.id);
					textView.setAction(keyAssistCommand.id, keyAssistCommand.callback, keyAssistCommand);
				}
				textView.setAction("toggleWrapMode", function() { //$NON-NLS-0$
					textView.invokeAction("toggleWrapMode", true); //$NON-NLS-0$
					var wordWrap = textView.getOptions("wrapMode"); //$NON-NLS-0$
					self.settings.wordWrap = wordWrap;
					if(editorPreferences) {
						editorPreferences.setPrefs(self.settings);
					}
					return true;
				});
				
				textView.setKeyBinding(new mKeyBinding.KeyStroke('z', true, false, true), "toggleZoomRuler"); //$NON-NLS-1$ //$NON-NLS-0$
				textView.setAction("toggleZoomRuler", function() { //$NON-NLS-0$
					if (!self.settings.zoomRulerVisible) return false;
					self.settings.zoomRuler = !self.settings.zoomRuler;
					if(editorPreferences) {
						editorPreferences.setPrefs(self.settings);
					}
					return true;
				}, {name: messages.toggleZoomRuler});
				
				self.vi = self.emacs = null;
				self.updateKeyMode(self.settings, textView);

				return keyBindings;
			};

			// Content Assist
			var setContentAssistProviders = function(editor, contentAssist, event) {
				// Content assist is about to be activated; set its providers.
				var fileContentType = inputManager.getContentType();
				var fileName = editor.getTitle();
				var serviceRefs = serviceRegistry.getServiceReferences("orion.edit.contentAssist").concat(serviceRegistry.getServiceReferences("orion.edit.contentassist")); //$NON-NLS-1$ //$NON-NLS-0$
				var providerInfoArray = event && event.providers;
				if (!providerInfoArray) {
					providerInfoArray = serviceRefs.map(function(serviceRef) {
						var contentTypeIds = serviceRef.getProperty("contentType"), //$NON-NLS-0$
						    pattern = serviceRef.getProperty("pattern"); // backwards compatibility //$NON-NLS-0$
						if ((contentTypeIds && contentTypeRegistry.isSomeExtensionOf(fileContentType, contentTypeIds)) ||
								(pattern && new RegExp(pattern).test(fileName))) {
							var service = serviceRegistry.getService(serviceRef);
							var id = serviceRef.getProperty("service.id").toString();  //$NON-NLS-0$
							var charTriggers = serviceRef.getProperty("charTriggers"); //$NON-NLS-0$
							var excludedStyles = serviceRef.getProperty("excludedStyles");  //$NON-NLS-0$
							
							if (charTriggers) {
								charTriggers = new RegExp(charTriggers);
							}
							
							if (excludedStyles) {
								excludedStyles = new RegExp(excludedStyles);
							}
							
							return {provider: service, id: id, charTriggers: charTriggers, excludedStyles: excludedStyles};
						}
						return null;
					}).filter(function(providerInfo) {
						return !!providerInfo;
					});
				}
				
				// Produce a bound EditorContext that contentAssist can invoke with no knowledge of ServiceRegistry.
				var boundEditorContext = {};
				Object.keys(EditorContext).forEach(function(key) {
					if (typeof EditorContext[key] === "function") {
						boundEditorContext[key] = EditorContext[key].bind(null, serviceRegistry);
					}
				});
				contentAssist.setEditorContextProvider(boundEditorContext);
				contentAssist.setProviders(providerInfoArray);
				contentAssist.setAutoTriggerEnabled(self.settings.contentAssistAutoTrigger);
				contentAssist.setProgress(progress);
				contentAssist.setStyleAccessor(self.getStyleAccessor());
			};
			
			var contentAssistFactory = readonly ? null : {
				createContentAssistMode: function(editor) {
					var contentAssist = new mContentAssist.ContentAssist(editor.getTextView());
					
					contentAssist.addEventListener("Activating", setContentAssistProviders.bind(null, editor, contentAssist)); //$NON-NLS-0$
					var widget = new mContentAssist.ContentAssistWidget(contentAssist, "contentassist"); //$NON-NLS-0$
					var result = new mContentAssist.ContentAssistMode(contentAssist, widget);
					contentAssist.setMode(result);
					
					// preload content assist plugins to reduce the delay 
					// that happens when a user first triggers content assist
					setContentAssistProviders(editor, contentAssist);
					contentAssist.initialize();
					return result;
				}
			};

			var editor = this.editor = new mEditor.Editor({
				textViewFactory: textViewFactory,
				undoStackFactory: self.undoStack ? {createUndoStack: function(editor) {
					self.undoStack.setView(editor.getTextView());
					return self.undoStack;
				}}: new mEditorFeatures.UndoFactory(),
				textDNDFactory: new mEditorFeatures.TextDNDFactory(),
				annotationFactory: new mEditorFeatures.AnnotationFactory(),
				foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
				zoomRulerFactory: new mEditorFeatures.ZoomRulerFactory(),
				lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
				hoverFactory: new mHoverFactory.HoverFactory(serviceRegistry, inputManager),
				contentAssistFactory: contentAssistFactory,
				keyBindingFactory: keyBindingFactory,
				statusReporter: this.statusReporter,
				domNode: this._parent
			});
			editor.id = "orion.editor"; //$NON-NLS-0$
			editor.processParameters = function(params) {
				parseNumericParams(params, ["start", "end", "line", "offset", "length"]); //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				this.showSelection(params.start, params.end, params.line, params.offset, params.length);
			};

			this.dispatcher = new mDispatcher.Dispatcher(this.serviceRegistry, editor, inputManager);
			if(themePreferences && editorPreferences){
				localSettings = new EditorSettings({local: true, editor: editor, themePreferences: themePreferences, preferences: editorPreferences});
			}

			var liveEditSession = new LiveEditSession(serviceRegistry, editor);
			inputManager.addEventListener("InputChanged", function(event) { //$NON-NLS-0$
				var textView = editor.getTextView();
				if (textView) {
					liveEditSession.start(inputManager.getContentType(), event.title);
					textView.setOptions(this.updateViewOptions(this.settings));
					this.syntaxHighlighter.setup(event.contentType, editor.getTextView(), editor.getAnnotationModel(), event.title, true).then(function() {
						this.updateStyler(this.settings);
						if (editor.getContentAssist()) {
							// the file changed, we need to figure out the correct auto triggers to use
							setContentAssistProviders(editor, editor.getContentAssist());
						}
					}.bind(this));
				} else {
					liveEditSession.start();					
				}
			}.bind(this));
			inputManager.addEventListener("Saving", function(event) { //$NON-NLS-0$
				if (self.settings.trimTrailingWhiteSpace) {
					editor.getTextView().invokeAction("trimTrailingWhitespaces"); //$NON-NLS-0$
				}
			});
			
			var markerService = serviceRegistry.getService("orion.core.marker"); //$NON-NLS-0$
			if(markerService) {
				markerService.addEventListener("problemsChanged", function(event) { //$NON-NLS-0$
					editor.showProblems(event.problems);
				});
			}
			var blameService = serviceRegistry.getService("orion.core.blame"); //$NON-NLS-0$
			if(blameService) {
				blameService.addEventListener("blameChanged", function(event) { //$NON-NLS-0$
					editor.showBlame(event.blameInfo);
				});
			}
			var markOccurrences = this.markOccurrences = new mMarkOccurrences.MarkOccurrences(serviceRegistry, inputManager, editor);
			markOccurrences.setOccurrencesVisible(this.settings.occurrencesVisible);
			markOccurrences.findOccurrences();
			
			var syntaxChecker = new mSyntaxchecker.SyntaxChecker(serviceRegistry, editor);
			editor.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
				syntaxChecker.checkSyntax(inputManager.getContentType(), evt.title, evt.message, evt.contents);
				if (inputManager.getReadOnly()) {
					editor.reportStatus(messages.readonly, "error"); //$NON-NLS-0$
				}
			});

			var contextImpl = {};
			[
				"getCaretOffset", "setCaretOffset", //$NON-NLS-1$ //$NON-NLS-0$
				"getSelection", "setSelection", //$NON-NLS-1$ //$NON-NLS-0$
				"getText", "setText", //$NON-NLS-1$ //$NON-NLS-0$
				"getLineAtOffset", //$NON-NLS-0$
				"getLineStart", //$NON-NLS-0$
				"isDirty", //$NON-NLS-0$.
				"markClean", //$NON-NLS-0$.
			].forEach(function(method) {
				contextImpl[method] = editor[method].bind(editor);
			});
			contextImpl.showMarkers = function(markers) {
				serviceRegistry.getService("orion.core.marker")._setProblems(markers); //$NON-NLS-0$
			};
			// Forward status from plugin to orion.page.message
			contextImpl.setStatus = mEditorCommands.handleStatusMessage.bind(null, serviceRegistry);
			serviceRegistry.registerService("orion.edit.context", contextImpl, null); //$NON-NLS-0$
		},
		create: function() {
			this.editor.install();
			if(this.editorPreferences) {
				this.editorPreferences.getPrefs(this.updateSettings.bind(this));
			}
		},
		destroy: function() {
			this.editor.uninstall();
		},
		getStyleAccessor: function() {
			var styleAccessor = null;
			var styler = this.syntaxHighlighter.getStyler();
			if (styler && styler.getStyleAccessor) {
				styleAccessor = styler.getStyleAccessor();
			}
			return styleAccessor;
		}
	};
	mEventTarget.EventTarget.addMixin(EditorView.prototype);

	return {EditorView: EditorView};
});
