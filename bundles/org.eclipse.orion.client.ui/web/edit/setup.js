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
/*jslint browser:true devel:true sub:true*/
/*global define eclipse:true orion:true window*/

define([
	'i18n!orion/edit/nls/messages',
	'require',
	'orion/EventTarget',
	'orion/webui/littlelib',
	'orion/selection',
	'orion/status',
	'orion/progress',
	'orion/dialogs',
	'orion/commandRegistry',
	'orion/favorites',
	'orion/extensionCommands',
	'orion/fileClient',
	'orion/operationsClient',
	'orion/searchClient',
	'orion/globalCommands',
	'orion/outliner',
	'orion/problems',
	'orion/editor/contentAssist',
	'orion/editorCommands',
	'orion/editor/editorFeatures',
	'orion/editor/editor',
	'orion/syntaxchecker',
	'orion/editor/textView',
	'orion/editor/textModel',
	'orion/editor/projectionTextModel',
	'orion/keyBinding',
	'orion/editor/emacs',
	'orion/editor/vi',
	'orion/searchAndReplace/textSearcher',
	'orion/contentTypes',
	'orion/PageUtil',
	'orion/inputManager',
	'orion/i18nUtil',
	'orion/widgets/themes/ThemePreferences',
	'orion/widgets/themes/editor/ThemeData',
	'orion/widgets/themes/editor/LocalEditorSettings',
	'edit/editorPreferences',
	'orion/URITemplate',
	'orion/sidebar'
], function(messages, require, EventTarget, lib, mSelection, mStatus, mProgress, mDialogs, mCommandRegistry, mFavorites, mExtensionCommands, 
			mFileClient, mOperationsClient, mSearchClient, mGlobalCommands, mOutliner, mProblems, mContentAssist, mEditorCommands, mEditorFeatures, mEditor,
			mSyntaxchecker, mTextView, mTextModel, mProjectionTextModel, mKeyBinding, mEmacs, mVI, mSearcher,
			mContentTypes, PageUtil, mInputManager, i18nUtil, mThemePreferences, mThemeData, LocalEditorSettings, mEditorPreferences, URITemplate, Sidebar) {
	
var exports = exports || {};
	
exports.setUpEditor = function(serviceRegistry, preferences, isReadOnly){
	var document = window.document;
	var selection;
	var commandRegistry;
	var statusReportingService;
	var problemService;
	var outlineService;
	var contentTypeService;
	var progressService;
	var dialogService;
	var favoriteService;
	var fileClient;
	var searcher;
	
	// Initialize the plugin registry
	(function() {
		selection = new mSelection.Selection(serviceRegistry);
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		statusReportingService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		dialogService = new mDialogs.DialogService(serviceRegistry);
		commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});
		progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		// Editor needs additional services
		problemService = new mProblems.ProblemService(serviceRegistry);
		outlineService = new mOutliner.OutlineService({serviceRegistry: serviceRegistry, preferences: preferences});
		favoriteService = new mFavorites.FavoritesService({serviceRegistry: serviceRegistry});
		contentTypeService = new mContentTypes.ContentTypeService(serviceRegistry);
		fileClient = new mFileClient.FileClient(serviceRegistry);
		searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
	}());

	var sidebarDomNode = lib.node("sidebar"), //$NON-NLS-0$
	    sidebarToolbar = lib.node("sidebarToolbar"), //$NON-NLS-0$
		editorDomNode = lib.node("editor"); //$NON-NLS-0$

	var editor, inputManager, settings;
	function renderToolbars(metadata) {
		if (!metadata) { return; }
		var toolbar = lib.node("pageActions"); //$NON-NLS-0$
		if (toolbar) {
			// now add any "orion.navigate.command" commands that should be shown in non-nav pages.
			mExtensionCommands.createAndPlaceFileCommandsExtension(serviceRegistry, commandRegistry, "pageActions", 500).then(function() { //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.destroy(toolbar);
				commandRegistry.renderCommands("pageActions", toolbar, metadata, editor, "button"); //$NON-NLS-1$ //$NON-NLS-0$
			});
		}
		var rightToolbar = lib.node("pageNavigationActions"); //$NON-NLS-0$
		if (rightToolbar) {	
			commandRegistry.destroy(rightToolbar);
			commandRegistry.renderCommands(rightToolbar.id, rightToolbar, metadata, editor, "button");  // use true when we want to force toolbar items to text //$NON-NLS-0$
		}
	}
	
	var statusReporter =  function(message, type, isAccessible) {
		if (type === "progress") { //$NON-NLS-0$
			statusReportingService.setProgressMessage(message);
		} else if (type === "error") { //$NON-NLS-0$
			statusReportingService.setErrorMessage(message);
		} else {
			statusReportingService.setMessage(message, null, isAccessible);
		}
	};
		
	var emacs;
	var vi;
	function updateKeyMode(textView) {
		if (emacs) {
			textView.removeKeyMode(emacs);
		}
		if (vi) {
			textView.removeKeyMode(vi);
		}
		//TODO should load emacs and vi modules only when needed
		if (settings.keyBindings === "Emacs") { //$NON-NLS-0$
			if (!emacs) {
				emacs = new mEmacs.EmacsMode(textView);
			}
			textView.addKeyMode(emacs);
		} else if (settings.keyBindings === "vi") { //$NON-NLS-0$
			if (!vi) {
				vi = new mVI.VIMode(textView, statusReporter);
			}
			textView.addKeyMode(vi);
		}
	}
	
	var updateSettings = function(prefs) {
		settings = prefs;
		inputManager.setAutoLoadEnabled(prefs.autoLoadEnabled);
		inputManager.setAutoSaveTimeout(prefs.autoSaveEnabled ? prefs.autoSaveTimeout : -1);
		var textView = editor.getTextView();
		if (textView) {
			updateKeyMode(textView);
			var options = {
				tabSize: settings.tabSize || 4,
				expandTab: settings.expandTab,
				scrollAnimation: settings.scrollAnimationEnabled ? settings.scrollAnimation : 0
			};
			textView.setOptions(options);
		}
		renderToolbars(inputManager.getFileMetadata());
	};
	var editorPreferences = new mEditorPreferences.EditorPreferences (preferences, function (prefs) {
		if (!prefs) {
			editorPreferences.getPrefs(updateSettings);
		} else {
			updateSettings(prefs);
		}
	});
	var themePreferences = new mThemePreferences.ThemePreferences(preferences, new mThemeData.ThemeData());
	themePreferences.apply();
	var localSettings = new LocalEditorSettings( themePreferences, editorPreferences );
	
	editorPreferences.getPrefs(function(prefs) {
		settings = prefs;
		
		var textViewFactory = function() {
			var textView = new mTextView.TextView({
				parent: editorDomNode,
				model: new mProjectionTextModel.ProjectionTextModel(new mTextModel.TextModel()),
				wrappable: true,
				tabSize: settings.tabSize || 4,
				expandTab: settings.expandTab,
				scrollAnimation: settings.scrollAnimationEnabled ? settings.scrollAnimation : 0,
				readonly: isReadOnly
			});
			return textView;
		};

		var keyBindingFactory = function(editor, keyModeStack, undoStack, contentAssist) {
			
			var localSearcher = new mSearcher.TextSearcher(editor, commandRegistry, undoStack);
			
			new mEditorFeatures.KeyBindingsFactory().createKeyBindings(editor, undoStack, contentAssist, localSearcher);
		
			// Register commands that depend on external services, the registry, etc.  Do this after
			// the generic keybindings so that we can override some of them.
			var commandGenerator = new mEditorCommands.EditorCommandFactory(serviceRegistry, commandRegistry, fileClient, inputManager, "pageActions", isReadOnly, "pageNavigationActions", localSearcher, searcher, function() { return settings; }); //$NON-NLS-1$ //$NON-NLS-0$
			commandGenerator.generateEditorCommands(editor);
				
			var textView = editor.getTextView();
			updateKeyMode(textView);
		};
		
		// Content Assist
		var contentAssistFactory = isReadOnly ? null : {
			createContentAssistMode: function(editor) {
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var contentAssist = new mContentAssist.ContentAssist(editor.getTextView());
				contentAssist.addEventListener("Activating", function() { //$NON-NLS-0$
					// Content assist is about to be activated; set its providers.
					var fileContentType = inputManager.getContentType();
					var fileName = editor.getTitle();
					var serviceReferences = serviceRegistry.getServiceReferences("orion.edit.contentAssist"); //$NON-NLS-0$
					var providers = [];
					for (var i=0; i < serviceReferences.length; i++) {
						var serviceReference = serviceReferences[i],
						    contentTypeIds = serviceReference.getProperty("contentType"), //$NON-NLS-0$
						    pattern = serviceReference.getProperty("pattern"); // backwards compatibility //$NON-NLS-0$
						if ((contentTypeIds && contentTypeService.isSomeExtensionOf(fileContentType, contentTypeIds)) || 
								(pattern && new RegExp(pattern).test(fileName))) {
							providers.push(serviceRegistry.getService(serviceReference));
						}
					}
					contentAssist.setProviders(providers);
					contentAssist.setProgress(progress);
				});
				var widget = new mContentAssist.ContentAssistWidget(contentAssist, "contentassist"); //$NON-NLS-0$
				var result = new mContentAssist.ContentAssistMode(contentAssist, widget);
				contentAssist.setMode(result);
				return result;
			}
		};

		var sidebarNavBreadcrumb = function(/**HTMLAnchorElement*/ segment, folderLocation, folder) {
			// Link to this page (edit page)
			segment.href = new URITemplate("#{,resource,params*}").expand({ //$NON-NLS-0$
				resource: inputManager.getInput() || "", //$NON-NLS-0$
				params: {
					navigate: folder ? folder.ChildrenLocation : fileClient.fileServiceRootURL(folderLocation || "")  //$NON-NLS-0$
				}
			});
		};

		editor = new mEditor.Editor({
			textViewFactory: textViewFactory,
			undoStackFactory: new mEditorFeatures.UndoFactory(),
			textDNDFactory: new mEditorFeatures.TextDNDFactory(),
			annotationFactory: new mEditorFeatures.AnnotationFactory(),
			foldingRulerFactory: new mEditorFeatures.FoldingRulerFactory(),
			lineNumberRulerFactory: new mEditorFeatures.LineNumberRulerFactory(),
			contentAssistFactory: contentAssistFactory,
			keyBindingFactory: keyBindingFactory, 
			statusReporter: statusReporter,
			domNode: editorDomNode
		});
		
		inputManager = new mInputManager.InputManager({
			editor: editor,
			serviceRegistry: serviceRegistry,
			fileClient: fileClient,
			progressService: progressService,
			selection: selection,
			contentTypeService: contentTypeService
		});
		inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
			if (evt.input === null || typeof evt.input === "undefined") {//$NON-NLS-0$
				var noFile = document.createElement("div"); //$NON-NLS-0$
				noFile.classList.add("noFile"); //$NON-NLS-0$
				noFile.textContent = messages["NoFile"];
				var plusIcon = document.createElement("span"); //$NON-NLS-0$
				plusIcon.classList.add("core-sprite-addcontent"); //$NON-NLS-0$
				plusIcon.classList.add("icon-inline"); //$NON-NLS-0$
				plusIcon.classList.add("imageSprite"); //$NON-NLS-0$
				lib.processDOMNodes(noFile, [plusIcon]);

				lib.empty(editorDomNode);
				editorDomNode.appendChild(noFile);
				return;
			}
			var metadata = evt.metadata;
			renderToolbars(metadata);
			mGlobalCommands.addSettings( localSettings );
			mGlobalCommands.setPageTarget({
				task: "Coding", //$NON-NLS-0$
				name: evt.name,
				target: metadata,
				makeAlternate: function() {
					if (metadata.Parents && metadata.Parents.length > 0) {
						// The mini-nav in sidebar wants to do the same work, can we share it?
						return progressService.progress(fileClient.read(metadata.Parents[0].Location, true), i18nUtil.formatMessage(messages["Reading metedata of"], metadata.Parents[0].Location));
					}
				},
				makeBreadcrumbLink: sidebarNavBreadcrumb,
				serviceRegistry: serviceRegistry,
				commandService: commandRegistry,
				searchService: searcher,
				fileService: fileClient
			});
	
			// Put the make favorite command in our toolbar."
			//commandRegistry.registerCommandContribution("pageActions", "orion.makeFavorite", 2); //$NON-NLS-1$ //$NON-NLS-0$
	
			commandRegistry.processURL(window.location.href);
		});
	
		// Sidebar
		function SidebarNavInputManager() {
			EventTarget.attach(this);
		}
		SidebarNavInputManager.prototype.processHash = function() {
			var newParams = PageUtil.matchResourceParameters(location.hash), navigate = newParams.navigate;
			if (typeof navigate === "string" || !newParams.resource) { //$NON-NLS-0$
				var input = navigate || ""; //$NON-NLS-0$
				this.dispatchEvent({type: "InputChanged", input: input}); //$NON-NLS-1$ //$NON-NLS-0$
			}
		};
		var sidebarNavInputManager = new SidebarNavInputManager();
		var sidebar = new Sidebar({
			commandRegistry: commandRegistry,
			contentTypeRegistry: contentTypeService,
			editorInputManager: inputManager,
			editor: editor,
			fileClient: fileClient,
			outlineService: outlineService,
			parent: sidebarDomNode,
			progressService: progressService,
			selection: selection,
			serviceRegistry: serviceRegistry,
			sidebarNavInputManager: sidebarNavInputManager,
			toolbar: sidebarToolbar
		});
		sidebar.show();
	
		// Establishing dependencies on registered services
		serviceRegistry.getService("orion.core.marker").addEventListener("problemsChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
			editor.showProblems(event.problems);
		});
		var syntaxChecker = new mSyntaxchecker.SyntaxChecker(serviceRegistry, editor);
		editor.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
			syntaxChecker.checkSyntax(inputManager.getContentType(), evt.title, evt.message, evt.contents);
		});
		sidebarNavInputManager.addEventListener("rootChanged", function(evt) { //$NON-NLS-0$
			var root = evt.root;
			// update the navigate param, if it's present, or if this was a user action
			var pageParams = PageUtil.matchResourceParameters(location.hash);
			if (evt.force || Object.hasOwnProperty.call(pageParams, "navigate")) {//$NON-NLS-0$
				var params = {};
				params.resource = pageParams.resource || ""; //$NON-NLS-0$
				params.params = { navigate: root.Path };
				window.location = new URITemplate("#{,resource,params*}").expand(params); //$NON-NLS-0$
			}
			if (!pageParams.resource) {
				// No primary resource (editor file), so target the folder being navigated in the sidebar.
				mGlobalCommands.setPageTarget({
					task: "Coding", //$NON-NLS-0$
					name: root.Name,
					target: root,
					makeBreadcrumbLink: sidebarNavBreadcrumb,
					serviceRegistry: serviceRegistry,
					commandService: commandRegistry,
					searchService: searcher,
					fileService: fileClient
				});
			}
		});
		sidebarNavInputManager.addEventListener("editorInputMoved", function(evt) { //$NON-NLS-0$
			var newInput = evt.newInput, parent = evt.parent;
			var params = {};
			// If we don't know where the file went, go to "no editor"
			params.resource = newInput || ""; //$NON-NLS-0$
			params.params = {
				navigate: parent
			};
			window.location = new URITemplate("#{,resource,params*}").expand(params); //$NON-NLS-0$
		});

		editor.addEventListener("DirtyChanged", function(evt) { //$NON-NLS-0$
			inputManager.setDirty(editor.isDirty());
		});
		
		// Generically speaking, we respond to changes in selection.  New selections change the editor's input.
		selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
			inputManager.setInput(event.selection);
		});
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			inputManager.setInput(window.location.hash);
		});
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			// inform the sidebar
			sidebarNavInputManager.processHash(window.location.hash);
		});
		inputManager.setInput(window.location.hash);
		sidebarNavInputManager.processHash(window.location.hash);
		
		//mGlobalCommands.setPageCommandExclusions(["orion.editFromMetadata"]); //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.generateBanner("orion-editor", serviceRegistry, commandRegistry, preferences, searcher, editor, editor); //$NON-NLS-0$
	
		// Editor Settings
		updateSettings(settings);

		window.onbeforeunload = function() {
			if (editor.isDirty()) {
				 return messages["There are unsaved changes."];
			}
		};
	});
};
return exports;
});
