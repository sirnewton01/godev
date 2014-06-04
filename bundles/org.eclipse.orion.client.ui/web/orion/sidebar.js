/*global console define*/
/*jslint browser:true sub:true*/
define(['orion/Deferred', 'orion/objects', 'orion/commands', 'orion/outliner', 'orion/webui/littlelib',
		'orion/PageUtil',
		'orion/widgets/nav/mini-nav',
		'orion/widgets/nav/project-nav',
		'orion/globalCommands',
		'i18n!orion/edit/nls/messages'],
		function(Deferred, objects, mCommands, mOutliner, lib, PageUtil, MiniNavViewMode, ProjectNavViewMode, mGlobalCommands, messages) {

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

			// Outliner is responsible for adding its view mode(s) to this sidebar
			this.outliner = new mOutliner.Outliner({
				parent: parentNode,
				toolbar: toolbarNode,
				serviceRegistry: serviceRegistry,
				contentTypeRegistry: contentTypeRegistry,
				preferences: this.preferences,
				outlineService: outlineService,
				commandService: commandRegistry,
				selectionService: selection,
				inputManager: editorInputManager,
				progressService: progressService,
				sidebar: this
			});
			this.setViewMode(this.defaultViewMode);
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
