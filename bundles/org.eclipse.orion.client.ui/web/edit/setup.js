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
	'orion/sidebar',
	'orion/inputManager',
	'orion/globalCommands',
	'orion/editor/textModel',
	'orion/editor/undoStack',
	'orion/folderView',
	'orion/editorView',
	'orion/editorPluginView',
	'orion/markdownView',
	'orion/markdownEditor',
	'orion/commandRegistry',
	'orion/contentTypes',
	'orion/fileClient',
	'orion/fileCommands',
	'orion/selection',
	'orion/status',
	'orion/progress',
	'orion/operationsClient',
	'orion/outliner',
	'orion/dialogs',
	'orion/extensionCommands',
	'orion/projectCommands',
	'orion/searchClient',
	'orion/problems',
	'orion/blameAnnotations',
	'orion/Deferred',
	'orion/EventTarget',
	'orion/URITemplate',
	'orion/i18nUtil',
	'orion/PageUtil',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/projectClient'
], function(
	messages, Sidebar, mInputManager, mGlobalCommands,
	mTextModel, mUndoStack,
	mFolderView, mEditorView, mPluginEditorView , mMarkdownView, mMarkdownEditor,
	mCommandRegistry, mContentTypes, mFileClient, mFileCommands, mSelection, mStatus, mProgress, mOperationsClient, mOutliner, mDialogs, mExtensionCommands, ProjectCommands, mSearchClient,
	mProblems, mBlameAnnotation,
	Deferred, EventTarget, URITemplate, i18nUtil, PageUtil, objects, lib, mProjectClient
) {

var exports = {};

	function MenuBar(options) {
		this.parentNode = options.parentNode;
		this.commandRegistry = options.commandRegistry;
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.inputManager = options.inputManager;
		this.parentNode = options.parentNode;
		this.fileActionsScope = "fileActions"; //$NON-NLS-0$
		this.editActionsScope = "editActions"; //$NON-NLS-0$
		this.viewActionsScope = "viewActions"; //$NON-NLS-0$
		this.toolsActionsScope = "toolsActions"; //$NON-NLS-0$
		this.additionalActionsScope = "extraActions"; //$NON-NLS-0$
		this.createActionSections();
	}
	MenuBar.prototype = {};
	objects.mixin(MenuBar.prototype, {
		createActionSections: function() {
			var _self = this;
			[this.fileActionsScope, this.editActionsScope, this.viewActionsScope, this.toolsActionsScope, this.additionalActionsScope].reverse().forEach(function(id) {
				if (!_self[id]) {
					var elem = document.createElement("ul"); //$NON-NLS-0$
					elem.id = id;
					elem.classList.add("commandList"); //$NON-NLS-0$
					elem.classList.add("layoutLeft"); //$NON-NLS-0$
					elem.classList.add("pageActions"); //$NON-NLS-0$
					if (id === _self.additionalActionsScope) {
						elem.classList.add("extraActions"); //$NON-NLS-0$
					}
					_self.parentNode.insertBefore(elem, _self.parentNode.firstChild);
					_self[id] = elem;
				}
			});

			var commandRegistry = this.commandRegistry;
			var fileActionsScope = this.fileActionsScope;
			var editActionsScope = this.editActionsScope;
			var viewActionsScope = this.viewActionsScope;
			var toolsActionsScope = this.toolsActionsScope;
			
			commandRegistry.addCommandGroup(fileActionsScope, "orion.menuBarFileGroup", 1000, messages["File"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(editActionsScope, "orion.menuBarEditGroup", 100, messages["Edit"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(viewActionsScope, "orion.menuBarViewGroup", 100, messages["View"], null, messages["noActions"], null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-0$	
			commandRegistry.addCommandGroup(toolsActionsScope, "orion.menuBarToolsGroup", 100, messages["Tools"], null, null, null, null, "dropdownSelection"); //$NON-NLS-1$ //$NON-NLS-0$
			
			commandRegistry.addCommandGroup(fileActionsScope, "orion.newContentGroup", 0, messages["New"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(fileActionsScope, "orion.importGroup", 100, messages["Import"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			commandRegistry.addCommandGroup(fileActionsScope, "orion.exportGroup", 1001, messages["Export"], "orion.menuBarFileGroup", null, null, null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		},
		createCommands: function() {
			var serviceRegistry = this.serviceRegistry;
			var commandRegistry = this.commandRegistry;
			var fileClient = this.fileClient;
			return mFileCommands.createFileCommands(serviceRegistry, commandRegistry, fileClient).then(function() {
				return mExtensionCommands.createFileCommands(serviceRegistry, null, "all", true, commandRegistry).then(function() { //$NON-NLS-0$
					var projectClient = serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
					return projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
						return projectClient.getProjectDeployTypes().then(function(deployTypes){
							return ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, fileClient, projectClient, dependencyTypes, deployTypes);
						}, function(error){
							return ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, fileClient, projectClient, dependencyTypes);
						});
					});
				});
			});
		},
		setActiveExplorer: function(explorer) {
			this.explorer = explorer;
		},
		updateCommands: function() {
			var explorer = this.explorer;
			var visible, selection, treeRoot;
			if (explorer) {
				visible = explorer.isCommandsVisible();
				selection = explorer.selection;
				treeRoot = explorer.treeRoot;
			}
			var metadata = this.inputManager.getFileMetadata();
			var commandRegistry = this.commandRegistry, serviceRegistry = this.serviceRegistry;
			commandRegistry.registerSelectionService(this.fileActionsScope, visible ? selection : null);
			commandRegistry.registerSelectionService(this.editActionsScope, visible ? selection : null);
			commandRegistry.registerSelectionService(this.viewActionsScope, visible ? selection : null);
			mFileCommands.setExplorer(explorer);
			ProjectCommands.setExplorer(explorer);
			mFileCommands.updateNavTools(serviceRegistry, commandRegistry, explorer, null, [this.fileActionsScope, this.editActionsScope, this.viewActionsScope], treeRoot, true);
			commandRegistry.destroy(this.toolsActionsScope);
			commandRegistry.renderCommands(this.toolsActionsScope, this.toolsActionsScope, metadata, explorer, "tool"); //$NON-NLS-0$
			commandRegistry.destroy(this.additionalActionsScope);
			commandRegistry.renderCommands(this.additionalActionsScope, this.additionalActionsScope, treeRoot, explorer, "button"); //$NON-NLS-0$
		}
	});

exports.setUpEditor = function(serviceRegistry, pluginRegistry, preferences, isReadOnly) {
	var selection;
	var commandRegistry;
	var statusService;
	var problemService;
	var blameService;
	var outlineService;
	var contentTypeRegistry;
	var progressService;
	var dialogService;
	var fileClient;
	var projectClient;
	var searcher;

	// Initialize the plugin registry
	(function() {
		selection = new mSelection.Selection(serviceRegistry);
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		dialogService = new mDialogs.DialogService(serviceRegistry);
		commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});
		progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		// Editor needs additional services
		problemService = new mProblems.ProblemService(serviceRegistry);
		outlineService = new mOutliner.OutlineService({serviceRegistry: serviceRegistry, preferences: preferences});
		contentTypeRegistry = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		fileClient = new mFileClient.FileClient(serviceRegistry);
		projectClient = new mProjectClient.ProjectClient(serviceRegistry, fileClient);
		searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		blameService = new mBlameAnnotation.BlameService(serviceRegistry);
	}());

	var sidebarDomNode = lib.node("sidebar"), //$NON-NLS-0$
		sidebarToolbar = lib.node("sidebarToolbar"), //$NON-NLS-0$
		pageToolbar = lib.node("pageToolbar"), //$NON-NLS-0$
		editorDomNode = lib.node("editor"); //$NON-NLS-0$

	// Do not collapse sidebar, https://bugs.eclipse.org/bugs/show_bug.cgi?id=418558
	var collapseSidebar = false; //PageUtil.hash() !== ""
	mGlobalCommands.generateBanner("orion-editor", serviceRegistry, commandRegistry, preferences, searcher, null, null, collapseSidebar); //$NON-NLS-0$

	var editor, editorDirtyListener, inputManager, sidebarNavInputManager, editorView, lastRoot, menuBar;
	function setEditor(newEditor) {
		if (editor === newEditor) { return; }
		if (editor) {
			editor.removeEventListener("DirtyChanged", editorDirtyListener); //$NON-NLS-0$
		}
		editor = newEditor;
		if (editor) {
			editor.addEventListener("DirtyChanged", editorDirtyListener = function(evt) { //$NON-NLS-0$
				mGlobalCommands.setDirtyIndicator(editor.isDirty());
			});
		}
	}
	function renderToolbars(metadata) {
		menuBar.updateCommands();
		var toolbar = lib.node("pageActions"); //$NON-NLS-0$
		if (toolbar) {
			commandRegistry.destroy(toolbar);
			if (metadata) {
				commandRegistry.renderCommands(toolbar.id, toolbar, metadata, editor, "button"); //$NON-NLS-0$
			}
		}
		var rightToolbar = lib.node("pageNavigationActions"); //$NON-NLS-0$
		if (rightToolbar) {
			commandRegistry.destroy(rightToolbar);
			if (metadata) {
				commandRegistry.renderCommands(rightToolbar.id, rightToolbar, metadata, editor, "button"); //$NON-NLS-0$
			}
		}
		var settingsToolbar = lib.node("settingsActions"); //$NON-NLS-0$
		if (settingsToolbar) {
			commandRegistry.destroy(settingsToolbar);
			if (metadata) {
				commandRegistry.renderCommands(settingsToolbar.id, settingsToolbar, metadata, editor, "button"); //$NON-NLS-0$
			}
		}		
	}
	
	function statusReporter(message, type, isAccessible) {
		if (type === "progress") { //$NON-NLS-0$
			statusService.setProgressMessage(message);
		} else if (type === "error") { //$NON-NLS-0$
			statusService.setErrorMessage(message);
		} else {
			statusService.setMessage(message, null, isAccessible);
		}
	}

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	var sidebarNavBreadcrumb = function(/**HTMLAnchorElement*/ segment, folderLocation, folder) {
		var resource = folder ? folder.Location : fileClient.fileServiceRootURL(folderLocation);
		segment.href = uriTemplate.expand({resource: resource});
		if (folder) {
			var metadata = inputManager.getFileMetadata();
			if (metadata && metadata.Location === folder.Location) {
				segment.addEventListener("click", function() { //$NON-NLS-0$
					sidebarNavInputManager.reveal(folder);
				});
			}
		}
	};
	
	var currentEditorView, defaultOptions;
	// Shared text model and undo stack
	var model = new mTextModel.TextModel();
	var undoStack = new mUndoStack.UndoStack(model, 500);
	var lastMetadata;
	var contextImpl = {};
	[	
		"getText", //$NON-NLS-0$
		"setText" //$NON-NLS-0$
	].forEach(function(method) {
		contextImpl[method] = model[method].bind(model);
	});
	serviceRegistry.registerService("orion.edit.model.context", contextImpl, null); //$NON-NLS-0$
	function getEditorView(input, metadata) {
		var view = null;
		if (metadata && input) {
			var options = objects.mixin({
				input: input,
				metadata: metadata,
			}, defaultOptions);
			//TODO better way of registering built-in editors
			if (metadata.Directory) {
				view = new mFolderView.FolderView(options);
			} else {
				var id = input.editor;
				editorView.setParent(editorDomNode);
				if (!id || id === "orion.editor") { //$NON-NLS-0$
					view = editorView;
				} else if (id === "orion.viewer.markdown") { //$NON-NLS-0$
					view = new mMarkdownView.MarkdownEditorView(options);
				} else if (id === "orion.editor.markdown") { //$NON-NLS-0$
					options.editorView = editorView;
					view = new mMarkdownEditor.MarkdownEditorView(options);
				} else {
					var editors = serviceRegistry.getServiceReferences("orion.edit.editor"); //$NON-NLS-0$
					for (var i=0; i<editors.length; i++) {
						if (editors[i].getProperty("id") === id) { //$NON-NLS-0$
							options.editorService = editors[i];
							view = new mPluginEditorView.PluginEditorView(options);
							break;
						}
					}
				}
			}
		}
		if (currentEditorView !== view) {
			commandRegistry.closeParameterCollector();
			if (currentEditorView) {
				currentEditorView.destroy();
			}
			if (lastMetadata && lastMetadata.Location !== metadata.Location) {
				model.setText("");
			}
			currentEditorView = view;
			if (currentEditorView) {
				currentEditorView.create();
			}
		}
		lastMetadata = metadata;
		return currentEditorView;
	}
	
//	var switchScope = "settingsActions"; //$NON-NLS-0$
//	commandRegistry.addCommandGroup(switchScope, "orion.edit.switch", 1000, messages.switchEditor, null, null, "core-sprite-outline", null, "dropdownSelection"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
//	Deferred.when(contentTypeRegistry.getContentTypes(), function(contentTypes) {
//		mExtensionCommands._getOpenWithNavCommandExtensions(serviceRegistry, contentTypes).forEach(function(command) {
//			var id = command.properties.id;
//			commandRegistry.registerCommandContribution(switchScope, id, 1, "orion.edit.switch/" + id); //$NON-NLS-0$
//		});
//	});

	inputManager = new mInputManager.InputManager({
		serviceRegistry: serviceRegistry,
		fileClient: fileClient,
		progressService: progressService,
		statusReporter: statusReporter,
		selection: selection,
		contentTypeRegistry: contentTypeRegistry
	});
	inputManager.addEventListener("InputChanged", function(evt) { //$NON-NLS-0$
		var metadata = evt.metadata;
		
		var view = getEditorView(evt.input, metadata);
		setEditor(view ? view.editor : null);
		evt.editor = editor;
	
		renderToolbars(metadata);
		var name = evt.name, target = metadata;
		if (evt.input === null || evt.input === undefined) {
			name = lastRoot ? lastRoot.Name : "";
			target = lastRoot;
		}
		// Exclude the "Show current folder" command: it's useless on editor page with built-in nav.
		// TODO the command exclusions should be an API and specified by individual pages (page links)?
		mGlobalCommands.setPageCommandExclusions(["orion.editFromMetadata"]); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: "Editor", //$NON-NLS-0$
			name: name,
			target: target,
			makeAlternate: function() {
				if (metadata && metadata.parent) {
					return metadata.parent;
				} else if (metadata && metadata.Parents && metadata.Parents.length > 0) {
					// The mini-nav in sidebar wants to do the same work, can we share it?
					return progressService.progress(fileClient.read(metadata.Parents[0].Location, true), i18nUtil.formatMessage(messages.ReadingMetadata, metadata.Parents[0].Location));
				}
			},
			makeBreadcrumbLink: sidebarNavBreadcrumb,
			makeBreadcrumFinalLink: true,
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry,
			searchService: searcher,
			fileService: fileClient
		});
		if (editor) {
			mGlobalCommands.setDirtyIndicator(editor.isDirty());
		}

		commandRegistry.processURL(window.location.href);
	});
	
	menuBar = new MenuBar({
		parentNode: pageToolbar,
		fileClient: fileClient,
		inputManager: inputManager,
		commandRegistry: commandRegistry,
		serviceRegistry: serviceRegistry
	});
	menuBar.createCommands().then(function() {
		
		defaultOptions = {
			parent: editorDomNode,
			model: model,
			menuBar: menuBar,
			undoStack: undoStack,
			serviceRegistry: serviceRegistry,
			pluginRegistry: pluginRegistry,
			commandRegistry: commandRegistry,
			contentTypeRegistry: contentTypeRegistry,
			renderToolbars: renderToolbars,
			inputManager: inputManager,
			readonly: isReadOnly,
			preferences: preferences,
			searcher: searcher,
			selection: selection,
			fileService: fileClient,
			statusReporter: statusReporter,
			statusService: statusService,
			progressService: progressService
		};
		editorView = new mEditorView.EditorView(defaultOptions);

		// Sidebar
		function SidebarNavInputManager() {
			EventTarget.attach(this);
		}
		sidebarNavInputManager = new SidebarNavInputManager();
		var sidebar = new Sidebar({
			commandRegistry: commandRegistry,
			contentTypeRegistry: contentTypeRegistry,
			editorInputManager: inputManager,
			preferences: preferences,
			fileClient: fileClient,
			outlineService: outlineService,
			parent: sidebarDomNode,
			progressService: progressService,
			selection: selection,
			serviceRegistry: serviceRegistry,
			sidebarNavInputManager: sidebarNavInputManager,
			switcherScope: "viewActions", //$NON-NLS-0$
			menuBar: menuBar,
			toolbar: sidebarToolbar
		});
		SidebarNavInputManager.prototype.processHash = function() {
			var navigate = PageUtil.matchResourceParameters().navigate;
			if (typeof navigate === "string" && this.setInput && sidebar.getActiveViewModeId() === "nav") { //$NON-NLS-1$ //$NON-NLS-0$
				this.setInput(navigate);
			}
		};
		sidebar.show();
		sidebarNavInputManager.addEventListener("rootChanged", function(evt) { //$NON-NLS-0$
			lastRoot = evt.root;
		});
		var gotoInput = function(evt) { //$NON-NLS-0$
			var newInput = evt.newInput || evt.parent || ""; //$NON-NLS-0$
			window.location = uriTemplate.expand({resource: newInput}); //$NON-NLS-0$
		};
		sidebarNavInputManager.addEventListener("filesystemChanged", gotoInput); //$NON-NLS-0$
		sidebarNavInputManager.addEventListener("editorInputMoved", gotoInput); //$NON-NLS-0$
		sidebarNavInputManager.addEventListener("create", function(evt) { //$NON-NLS-0$
			if (evt.newValue) {
				window.location = uriTemplate.expand({resource: evt.newValue.Location});
			}
		});
	
		selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
			inputManager.setInput(event.selection);
		});
		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			inputManager.setInput(PageUtil.hash());
			sidebarNavInputManager.processHash(PageUtil.hash());
		});
		inputManager.setInput(PageUtil.hash());
		sidebarNavInputManager.processHash(PageUtil.hash());
	});

	window.onbeforeunload = function() {
		if (editor && editor.isDirty()) {
			if (inputManager.getAutoSaveEnabled()) {
				inputManager.save();
				return messages.unsavedAutoSaveChanges;
			}
			return messages.unsavedChanges;
		}
	};
};
return exports;
});
