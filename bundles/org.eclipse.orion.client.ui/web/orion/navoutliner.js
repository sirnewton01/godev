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
 
/*eslint-env browser, amd*/
define(['i18n!orion/navigate/nls/messages', 'require', 'orion/webui/littlelib', 'orion/section', 'orion/explorers/explorer', 'orion/explorers/navigatorRenderer', 'orion/explorers/navigationUtils'], 
function(messages, require, lib, mSection, mExplorer, mNavRenderer, mNavUtils){

	function NavOutlineRenderer (options, explorer) {
		this.explorer = explorer;
		this._init(options);
	}
	NavOutlineRenderer.prototype = new mExplorer.SelectionRenderer();
	NavOutlineRenderer.prototype.constructor = NavOutlineRenderer;
	NavOutlineRenderer.prototype.getLabelColumnIndex = function() {
		return 0;
	};
	NavOutlineRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var href, clazz, name, link;
		var col = document.createElement("td"); //$NON-NLS-0$
		tableRow.appendChild(col);
		col.classList.add("mainNavColumn"); //$NON-NLS-0$
		col.classList.add("singleNavColumn"); //$NON-NLS-0$
		if (item.directory) {
			link = mNavRenderer.createLink(require.toUrl("edit/edit.html"), { Name: item.name, ChildrenLocation: item.path, Directory: true }, this.commandService, this.contentTypeService); //$NON-NLS-0$
		} else if (item.path) {
			link = mNavRenderer.createLink("", { Name: item.name, Location: item.path }, this.commandService, this.contentTypeService); //$NON-NLS-0$
		} else if (typeof(item.getProperty) === "function" && item.getProperty("Name") && item.getProperty("top")) { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			href = require.toUrl("edit/edit.html") + "#" + item.getProperty("top"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			clazz = "navlinkonpage"; //$NON-NLS-0$
			name = item.getProperty("Name"); //$NON-NLS-0$
		} else {
			href = "";
			name = messages["Unknown item"];
		}
		if (href === "#") { //$NON-NLS-0$
			href="";
		}
		if (!link) {
			link = document.createElement("a"); //$NON-NLS-0$
			link.href = href;
			link.className = clazz;
			link.appendChild(document.createTextNode(name));
		}
		col.appendChild(link);
		mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
	};

	function NavOutlineExplorer(serviceRegistry, selection, commandService) {
		this.selection = selection;
		this.registry = serviceRegistry;
		this.renderer = new NavOutlineRenderer({checkbox: false}, this);
		this.renderer.commandService = commandService;
		this.renderer.contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry");
	}
	NavOutlineExplorer.prototype = new mExplorer.Explorer();	
	NavOutlineExplorer.prototype.constructor = NavOutlineExplorer;

	

	/**
	 * Creates a new user interface element showing an outliner used for navigation
	 *
	 * @name orion.navoutliner.NavigationOutliner
	 * @class A user interface element showing a list of various navigation links.
	 * @param {Object} options The service options
	 * @param {Object} options.parent The parent of this outliner widget
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry
	 * @param {orion.commands.CommandService} options.commandService The in-page (synchronous) command service.
	 */
	function NavigationOutliner(options) {
		var parent = lib.node(options.parent);
		if (!parent) { throw "no parent"; } //$NON-NLS-0$
		if (!options.serviceRegistry) {throw "no service registry"; } //$NON-NLS-0$
		this._parent = parent;
		this._registry = options.serviceRegistry;
		this.commandService = options.commandService;
		this.render();
	}
	NavigationOutliner.prototype = /** @lends orion.navoutliner.NavigationOutliner.prototype */ {
		render: function() {
			var serviceRegistry = this._registry;
			var commandService = this.commandService;
			var that = this;
			if (serviceRegistry) {
				var allReferences = serviceRegistry.getServiceReferences("orion.core.file"); //$NON-NLS-0$
				// top level folder outline if there is more than one file service.  We never show this if there is only one file service,
				// because it's not an interesting concepts for users.
				if (allReferences.length > 1) {
					if (!this.fileSystemsSection) {
						this.fileSystemsSection = new mSection.Section(this._parent, {
							id: "fileSystemsSection", //$NON-NLS-0$
							title: "Places", //$NON-NLS-0$
							content: '<div id="fileSystemsContent"></div>', //$NON-NLS-0$
							preferenceService: serviceRegistry.getService("orion.core.preference"), //$NON-NLS-0$
							canHide: true,
							useAuxStyle: true,
							slideout: true,
							onExpandCollapse: function(isExpanded, section) {
								commandService.destroy(section.selectionNode);
								if (isExpanded) {
									commandService.renderCommands(section.selectionNode.id, section.selectionNode, null, that, "button"); //$NON-NLS-0$
								}
							}
						});
					}
					this.explorer = new NavOutlineExplorer(serviceRegistry, this.fileSystemSelection);
					this.fileSystemsTable = this.explorer.createTree("fileSystemsContent", new mExplorer.SimpleFlatModel(allReferences, "fs", function(item) { //$NON-NLS-1$ //$NON-NLS-0$
						if (typeof(item.getProperty) === "function" && item.getProperty("top")) { //$NON-NLS-1$ //$NON-NLS-0$
							return item.getProperty("top"); //$NON-NLS-0$
						}
						return "";
					}));
				}
			}
		}
	};//end navigation outliner prototype
	NavigationOutliner.prototype.constructor = NavigationOutliner;

	//return module exports
	return {
		NavigationOutliner: NavigationOutliner
	};
});
