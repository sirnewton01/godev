/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors: IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
define(['orion/objects', 'orion/commands', 'orion/outliner', 'orion/webui/littlelib',
		'orion/widgets/nav/mini-nav',
		'orion/widgets/nav/project-nav',
		'orion/globalCommands',
		'i18n!orion/edit/nls/messages',
		'orion/search/InlineSearchPane',
		'orion/keyBinding',
		'orion/webui/Slideout'],
		function(objects, mCommands, mOutliner, lib, MiniNavViewMode, ProjectNavViewMode, mGlobalCommands, messages, InlineSearchPane, mKeyBinding, mSlideout) {

	/**
	 * @name orion.sidebar.Sidebar
	 * @class Sidebar that appears alongside an {@link orion.editor.Editor} in the Orion IDE.
	 * @param {Object} params
	 * @param {orion.commandregistry.CommandRegistry} params.commandRegistry
	 * @param {orion.preferences.PreferencesService} params.preferences
	 * @param {orion.core.ContentTypeRegistry} params.contentTypeRegistry
	 * @param {orion.fileClient.FileClient} params.fileClient
	 * @param {orion.editor.InputManager} params.editorInputManager
	 * @param {orion.outliner.OutlineService} params.outlineService
	 * @param {orion.progress.ProgressService} params.progressService
	 * @param {orion.selection.Selection} params.selection
	 * @param {orion.serviceregistry.ServiceRegistry} params.serviceRegistry
	 * @param {Object} [params.sidebarNavInputManager]
	 * @param {Element|String} params.parent
	 * @param {Element|String} params.toolbar
	 * @param {Element|String} params.switcherScope
	 */
	function Sidebar(params) {
		this.params = params;
		this.preferences = params.preferences;
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.outlineService = params.outlineService;
		this.parentNode = lib.node(params.parent);
		this.toolbarNode = lib.node(params.toolbar);
		this.selection = params.selection;
		this.serviceRegistry = params.serviceRegistry;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.menuBar = params.menuBar;
		this.viewModes = {};
		this.activeViewMode = null;
		this.switcherScope = params.switcherScope;
		this.switcherNode = null;
	}
	objects.mixin(Sidebar.prototype, /** @lends orion.sidebar.Sidebar.prototype */ {
		/**
		 * @name orion.sidebar.Sidebar#defaultViewMode
		 * @type String
		 */
		defaultViewMode: "nav", //$NON-NLS-0$
		show: function() {
			if (this.created) {
				return;
			}
			this.created = true;
			var commandRegistry = this.commandRegistry;
			var contentTypeRegistry = this.contentTypeRegistry;
			var fileClient = this.fileClient;
			var editorInputManager = this.editorInputManager;
			var outlineService = this.outlineService;
			var parentNode = this.parentNode;
			var progressService = this.progressService;
			var selection = this.selection;
			var serviceRegistry = this.serviceRegistry;
			var toolbarNode = this.toolbarNode;

			var switcherNode = this.switcherNode = lib.node(this.switcherScope);
			
			var changeViewModeCommand = new mCommands.Command({
				name: messages["SidePanel"],
				imageClass: "core-sprite-outline", //$NON-NLS-0$
				selectionClass: "dropdownSelection", //$NON-NLS-0$
				tooltip: messages["SidePanelTooltip"],
				id: "orion.sidebar.viewmode", //$NON-NLS-0$
				visibleWhen: function(item) {
					var mainSplitter = mGlobalCommands.getMainSplitter();
					if (mainSplitter) {
						return !mainSplitter.splitter.isClosed();
					}
					return true;
				},
				choiceCallback: this.viewModeMenuCallback.bind(this)
			});
			commandRegistry.addCommand(changeViewModeCommand);
			commandRegistry.registerCommandContribution(switcherNode.id, "orion.sidebar.viewmode", 2, "orion.menuBarViewGroup"); //$NON-NLS-1$ //$NON-NLS-0$
			
			this.addViewMode("nav", new MiniNavViewMode({ //$NON-NLS-0$
				commandRegistry: commandRegistry,
				contentTypeRegistry: contentTypeRegistry,
				preferences: this.preferences,
				fileClient: fileClient,
				editorInputManager: editorInputManager,
				parentNode: parentNode,
				sidebarNavInputManager: this.sidebarNavInputManager,
				serviceRegistry: serviceRegistry,
				toolbarNode: toolbarNode,
				sidebar: this
			}));
			
			this.projectViewMode = new ProjectNavViewMode({
				commandRegistry: commandRegistry,
				contentTypeRegistry: contentTypeRegistry,
				preferences: this.preferences,
				fileClient: fileClient,
				editorInputManager: editorInputManager,
				parentNode: parentNode,
				sidebarNavInputManager: this.sidebarNavInputManager,
				serviceRegistry: serviceRegistry,
				toolbarNode: toolbarNode,
				sidebar: this
			});
			
			this._slideout = new mSlideout.Slideout(this.toolbarNode.parentNode);
			
			// add Slideout menu group to View menu
			commandRegistry.addCommandGroup(switcherNode.id, 
				"orion.slideoutMenuGroup", //$NON-NLS-0$
				3, 
				messages["Slideout"], //$NON-NLS-0$
				"orion.menuBarViewGroup", //$NON-NLS-0$
				null, 
				null, 
				null, 
				"dropdownSelection"); //$NON-NLS-0$
			
			
			// Outliner is responsible for adding its view mode(s) to this sidebar
			this.outliner = new mOutliner.Outliner(this._slideout,
			{
				toolbar: toolbarNode,
				serviceRegistry: serviceRegistry,
				contentTypeRegistry: contentTypeRegistry,
				preferences: this.preferences,
				outlineService: outlineService,
				commandService: commandRegistry,
				selectionService: selection,
				inputManager: editorInputManager,
				progressService: progressService,
				sidebar: this,
				switcherNode: switcherNode
			});
			this.setViewMode(this.defaultViewMode);
			
			this._createInlineSearchPane();
		},
		showToolbar: function() {
			this.toolbarNode.style.display = "block"; //$NON-NLS-0$
			this.parentNode.classList.remove("toolbarTarget-toolbarHidden"); //$NON-NLS-0$
		},
		hideToolbar: function() {
			this.toolbarNode.style.display = "none"; //$NON-NLS-0$
			this.parentNode.classList.add("toolbarTarget-toolbarHidden"); //$NON-NLS-0$
		},
		/** @private */
		viewModeMenuCallback: function() {
			var _self = this;
			var active = this.getActiveViewModeId();
			return Object.keys(this.viewModes).map(function(modeId) {
				var mode = _self.getViewMode(modeId);
				return {
					checked: modeId === active,
					name: mode.label || modeId,
					callback: _self.setViewMode.bind(_self, modeId)
				};
			});
		},
		getActiveViewModeId: function() {
			return this.activeViewModeId;
		},
		/**
		 * @param {String} id
		 * @param {orion.sidebar.ViewMode} mode
		 */
		addViewMode: function(id, mode) {
			if (!id) {
				throw new Error("Invalid id: " + id); //$NON-NLS-0$
			}
			if (!mode || typeof mode !== "object") { //$NON-NLS-0$
				throw new Error("Invalid mode: "  + mode); //$NON-NLS-0$
			}
			if (!Object.prototype.hasOwnProperty.call(this.viewModes, id)) {
				this.viewModes[id] = mode;
			}
		},
		/**
		 * @param {String} id
		 */
		removeViewMode: function(id) {
			var mode = this.getViewMode(id);
			if (mode && typeof mode.destroy === "function") { //$NON-NLS-0$
				mode.destroy();
			}
			delete this.viewModes[id];
		},
		/**
		 * @param {String} id
		 */
		getViewMode: function(id) {
			if (Object.prototype.hasOwnProperty.call(this.viewModes, id)) {
				return this.viewModes[id];
			}
			return null;
		},
		/**
		 * @param {String} id
		 */
		setViewMode: function(id) {
			var mode = this.activeViewMode;
			if (mode && typeof mode.destroy === "function") { //$NON-NLS-0$
				mode.destroy();
			}
			// clean out any toolbar contributions
			if (this.toolbarNode) {
				this.commandRegistry.destroy(this.toolbarNode);
			}
			lib.empty(this.parentNode);
			mode = this.activeViewMode = this.getViewMode(id);
			this.activeViewModeId = mode ? id : null;
			if (mode && typeof mode.create === "function") { //$NON-NLS-0$
				mode.create();
			}
		},
		renderViewModeMenu: function() {
			var switcher = this.switcherNode;
			this.commandRegistry.destroy(switcher);
			this.commandRegistry.renderCommands(switcher.id, switcher, null, this, "button"); //$NON-NLS-0$
		},
		_createInlineSearchPane: function() {
			this._inlineSearchPane = new InlineSearchPane(this._slideout,
			{
				serviceRegistry: this.serviceRegistry,
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				preferences: this.preferences
			});
			
			this._lastSearchRoot = null;
			// set the scope to the explorer's root
			this.sidebarNavInputManager.addEventListener("rootChanged", function(event){ //$NON-NLS-0$
				this._lastSearchRoot = event.root;
			}.bind(this));
			
			this.toolbarNode.parentNode.addEventListener("scroll", function(){ //$NON-NLS-0$
				if (this._inlineSearchPane.isVisible()) {
					this.toolbarNode.parentNode.scrollTop = 0;
				}
			}.bind(this));
			
			var searchInFolderCommand = new mCommands.Command({
				name: messages["searchInFolder"], //$NON-NLS-0$
				id: "orion.searchInFolder", //$NON-NLS-0$
				visibleWhen: function(item) {
					if (Array.isArray(item)) {
						if(item.length === 1 && item[0].Directory){
							return true;
						}
					}
					return false;
				},
				callback: function (data) {
					var item = data.items[0];
					this._inlineSearchPane.setSearchScope(item);
					this._inlineSearchPane.show();
					this._inlineSearchPane.showSearchOptions();	
				}.bind(this)
			});
			
			var openSearchCommand = new mCommands.Command({
				name: messages["Global Search"], //$NON-NLS-0$
				id: "orion.openInlineSearchPane", //$NON-NLS-0$
				visibleWhen: function() {
					return true;
				},
				callback: function (data) {
					if (this._inlineSearchPane.isVisible()) {
						this._inlineSearchPane.hide();
					} else {
						var mainSplitter = mGlobalCommands.getMainSplitter();
						if (mainSplitter.splitter.isClosed()) {
							mainSplitter.splitter.toggleSidePanel();
						}
						this._inlineSearchPane.setSearchScope(this._lastSearchRoot); //reset search scope
						this._inlineSearchPane.show();
						this._inlineSearchPane.showSearchOptions();	
					}
				}.bind(this)
			});
			
			var activeViewModeId = this.getActiveViewModeId();
			var explorer = this.getViewMode(activeViewModeId).explorer;
			var editActionsScope = explorer.getEditActionsScope();
	
			this.commandRegistry.addCommand(searchInFolderCommand);
			this.commandRegistry.addCommand(openSearchCommand);
			
			this.commandRegistry.registerCommandContribution(editActionsScope, "orion.searchInFolder", 99, "orion.menuBarEditGroup/orion.findGroup");  //$NON-NLS-1$ //$NON-NLS-0$
			this.commandRegistry.registerCommandContribution(editActionsScope, "orion.openInlineSearchPane", 100, "orion.menuBarEditGroup/orion.findGroup", false, new mKeyBinding.KeyBinding('h', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
 		},
 		getInlineSearchPane: function() {
 			return this._inlineSearchPane;
 		}
	});

	/**
	 * @name orion.sidebar.ViewMode
	 * @class Interface for a view mode that can provide content to a {@link orion.sidebar.Sidebar}.
	 */
	/**
	 * @name orion.sidebar.ViewMode#create
	 * @function
	 */
	/**
	 * @name orion.sidebar.ViewMode#destroy
	 * @function
	 */
	/**
	 * @name orion.sidebar.ViewMode#label
	 * @type String
	 */
	return Sidebar;
});
