/*global console define*/
/*jslint browser:true sub:true*/
define(['orion/Deferred', 'orion/objects', 'orion/commands', 'orion/outliner', 'orion/webui/littlelib',
		'orion/widgets/nav/mini-nav',
		'orion/widgets/nav/project-nav',
		'i18n!orion/edit/nls/messages'],
		function(Deferred, objects, mCommands, mOutliner, lib, MiniNavViewMode, ProjectNavViewMode, messages) {
	/**
	 * @name orion.sidebar.Sidebar
	 * @class Sidebar that appears alongside an {@link orion.editor.Editor} in the Orion IDE.
	 * @param {Object} params
	 * @param {orion.commandregistry.CommandRegistry} params.commandRegistry
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
	 */
	function Sidebar(params) {
		this.params = params;
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
		this.viewModes = {};
		this.activeViewMode = null;
		this.modeContributionToolbar = null;
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

			// Create toolbar contribution area for use by viewmodes
			var modeContributionToolbar = this.modeContributionToolbar = document.createElement("div"); //$NON-NLS-0$
			modeContributionToolbar.id = toolbarNode.id + "childModes"; //$NON-NLS-0$
			toolbarNode.appendChild(modeContributionToolbar);
			var switcherNode = this.switcherNode = document.createElement("ul"); //$NON-NLS-0$
			switcherNode.id = toolbarNode.id + "viewmodeSwitch"; //$NON-NLS-0$
			switcherNode.classList.add("layoutRight"); //$NON-NLS-0$
			switcherNode.classList.add("commandList"); //$NON-NLS-0$
			switcherNode.classList.add("pageActions"); //$NON-NLS-0$
			toolbarNode.appendChild(switcherNode);

			var changeViewModeCommand = new mCommands.Command({
				name: messages["View"],
				imageClass: "core-sprite-outline", //$NON-NLS-0$
				selectionClass: "dropdownSelection", //$NON-NLS-0$
				tooltip: messages["ViewTooltip"],
				id: "orion.sidebar.viewmode", //$NON-NLS-0$
				visibleWhen: function(item) {
					return true;
				},
				choiceCallback: this.viewModeMenuCallback.bind(this)
			});
			commandRegistry.addCommand(changeViewModeCommand);
			commandRegistry.registerCommandContribution(switcherNode.id, "orion.sidebar.viewmode", 1); //$NON-NLS-0$

			this.addViewMode("nav", new MiniNavViewMode({ //$NON-NLS-0$
				commandRegistry: commandRegistry,
				contentTypeRegistry: contentTypeRegistry,
				fileClient: fileClient,
				editorInputManager: editorInputManager,
				parentNode: parentNode,
				sidebarNavInputManager: this.sidebarNavInputManager,
				serviceRegistry: serviceRegistry,
				toolbarNode: modeContributionToolbar
			}));
			
			var _self = this;
			
			if(this.serviceRegistry.getServiceReferences("orion.projects").length>0){
				var projectViewMode = new ProjectNavViewMode({ //$NON-NLS-0$
					commandRegistry: commandRegistry,
					contentTypeRegistry: contentTypeRegistry,
					fileClient: fileClient,
					editorInputManager: editorInputManager,
					parentNode: parentNode,
					sidebarNavInputManager: this.sidebarNavInputManager,
					serviceRegistry: serviceRegistry,
					toolbarNode: modeContributionToolbar,
					scopeUp: function(){_self.setViewMode("nav");}
				});
				if(this.editorInputManager.getFileMetadata()){
					this.addViewMode("project", projectViewMode);
					this.renderViewModeMenu();
				}
				this.editorInputManager.addEventListener("InputChanged", function(event){
					if(event.input){
						_self.addViewMode("project", projectViewMode);
						_self.renderViewModeMenu();
						if(event.metadata && event.metadata.Directory){
							if(event.metadata.Children){
								for(var i=0; i<event.metadata.Children.length; i++){
									if(event.metadata.Children[i].Name === "project.json"){
										_self.setViewMode("project");
										return;
									}
								}
							} else if(event.metadata.ChildrenLocation){
								_self.fileClient.fetchChildren(event.metadata.ChildrenLocation).then(function(children){
									for(var i=0; i<children.length; i++){
										if(children[i].Name === "project.json"){
											_self.setViewMode("project");
											return;											
										}
									}
								});
							}
						}
					} else {
						_self.removeViewMode("project");
						_self.renderViewModeMenu();
					}
				});
				this.sidebarNavInputManager.addEventListener("InputChanged", function(event){
					if(_self.editorInputManager.getFileMetadata()){
						//if there is a file opened we display its project
						return;
					}
					if(event.input){
						_self.addViewMode("project", projectViewMode);
						_self.renderViewModeMenu();
					} else {
						_self.removeViewMode("project");
						_self.renderViewModeMenu();
					}
				});
			}

			// Outliner is responsible for adding its view mode(s) to this sidebar
			this.outliner = new mOutliner.Outliner({
				parent: parentNode,
				toolbar: modeContributionToolbar,
				serviceRegistry: serviceRegistry,
				contentTypeRegistry: contentTypeRegistry,
				outlineService: outlineService,
				commandService: commandRegistry,
				selectionService: selection,
				inputManager: editorInputManager,
				progressService: progressService,
				sidebar: this
			});
			this.setViewMode(this.defaultViewMode);
		},
		/** @private */
		viewModeMenuCallback: function() {
			var _self = this;
			return Object.keys(this.viewModes).map(function(modeId) {
				var mode = _self.getViewMode(modeId);
				return {
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
				throw new Error("Invalid id: " + id);
			}
			if (!mode || typeof mode !== "object") { //$NON-NLS-0$
				throw new Error("Invalid mode: "  + mode);
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
			this.commandRegistry.destroy(this.modeContributionToolbar);
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
			var modes = Object.keys(this.viewModes);
			if (modes.length > 1) {
				this.commandRegistry.renderCommands(switcher.id, switcher, {}, this, "button"); //$NON-NLS-0$
			}
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
