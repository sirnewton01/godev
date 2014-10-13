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
define(['i18n!orion/sites/nls/messages', 'orion/commands', 'orion/explorers/explorer', 'orion/i18nUtil', 'orion/Deferred', 'orion/webui/littlelib', 'orion/EventTarget'],
		function(messages, mCommands, mExplorer, i18nUtil, Deferred, lib, EventTarget) {

var mSiteMappingsTable = {};

function mixin(target, source) {
	for (var p in source) {
		if (source.hasOwnProperty(p)) { target[p] = source[p]; }
	}
}

// TODO perhaps site service should be in charge of this.
function isWorkspacePath(/**String*/ path) {
	return new RegExp("^/").test(path); //$NON-NLS-0$
}

function safePath(str) {
	return str.replace(/[\r\n\t]/g, "");
}

mSiteMappingsTable.Model = (function() {
	function Model(rootPath, fetchItems, items) {
		this.rootPath = rootPath;
		this.fetchItems = fetchItems;
		this.items = items;
	}
	Model.prototype = new mExplorer.ExplorerFlatModel();
	mixin(Model.prototype, {
		getId: function(/**Object*/ item) {
			if (item === this.root) {
				item.removeAll = true; // This is a hack see treetable.js
				return this.rootId;
			}
			// Just generate an ID based on position in the table
			return "mapping_" + this.items.indexOf(item); //$NON-NLS-0$
		}
	});
	return Model;
}());

/**
 * @param {Function} options.onchange Callback with signature: <code>function(item, fieldName, newValue, event)</code>
 */
mSiteMappingsTable.Renderer = (function() {
	function Renderer(options, explorer) {
		this._init(options);
		this.options = options;
		this.explorer = explorer;
		this.commandService = options.commandService;
	}
	Renderer.prototype = new mExplorer.SelectionRenderer();
	mixin(Renderer.prototype, {
		getCellHeaderElement: function(/**Number*/ col_no) {
			var col;
			switch(col_no){
				case 0:
					col = document.createElement("th"); //$NON-NLS-1$ //$NON-NLS-0$
					col.textContent = " "; //$NON-NLS-0$
					col.classList.add("isValidColumn"); //$NON-NLS-0$
					return col;
				case 1:
					col = document.createElement("th"); //$NON-NLS-0$
					col.textContent = messages["Path"];
					return col;
				case 2:
					col = document.createElement("th"); //$NON-NLS-0$
					col.textContent = messages["Mount at (server path)"];
					return col;
				case 3:
					col = document.createElement("th"); //$NON-NLS-0$
					col.textContent = messages["Actions"];
					return col;
			}
		},
		getCellElement: function(/**Number*/ col_no, /**Object*/ item, /**HTMLTableRowElement*/ tableRow) {
			var col, input, handler;
			switch(col_no) {
				case 0:
					return this.getIsValidCell(col_no, item, tableRow);
				case 1: // Path
					col = document.createElement("td"); //$NON-NLS-0$
					input = document.createElement("input"); //$NON-NLS-0$
					input.classList.add("pathInput"); //$NON-NLS-0$
					// TODO
					input.value = typeof item.FriendlyPath !== "undefined" ? item.FriendlyPath : item.Target; //$NON-NLS-0$
					handler = function(event) {
							this.options.onchange(item, "FriendlyPath", event.target.value, event); //$NON-NLS-0$
						}.bind(this);
					input.onchange = handler;
					input.onkeyup = handler;
					col.appendChild(input);
					return col;
				case 2: // Mount at
					col = document.createElement("td"); //$NON-NLS-0$
					input = document.createElement("input"); //$NON-NLS-0$
					input.classList.add("serverPathInput"); //$NON-NLS-0$
					input.value = item.Source;
					handler = function(event) {
							this.options.onchange(item, "Source", event.target.value, event); //$NON-NLS-0$
						}.bind(this);
					input.onchange = handler;
					input.onkeyup = handler;
					col.appendChild(input);
					return col;
				case 3: // Actions
					return this.getActionsColumn(item, tableRow);
			}
		},
		getIsValidCell: function(/**Number*/ col_no, /**Object*/ item, /**HTMLTableRowElement*/ tableRow) {
			var target = item.Target;
			var col = document.createElement("td"); //$NON-NLS-0$
			var href, a;
			if (isWorkspacePath(target)) {
				var self = this;
				this.options.siteClient.toFileLocation(target).then(function(loc) {
					href = loc;
					var span = document.createElement("span"); //$NON-NLS-0$
					span.classList.add("validating"); //$NON-NLS-0$
					lib.empty(col);
					col.appendChild(span);
					span.textContent = "\u2026"; //$NON-NLS-0$
					// use file service directly to avoid retrying in case of failure
					var def = self.options.fileClient._getService(loc).read(loc, true);
					if(self.options.progress){
						self.options.progress.progress(def, "Reading metadata of " + loc);
					}
					def.then(
						function(object) {
							var isDirectory = object && object.Directory;
							var spriteClass = isDirectory ? "core-sprite-folder" : "core-sprite-file"; //$NON-NLS-1$ //$NON-NLS-0$
							var title = (isDirectory ? messages.WorkspaceFolder : messages.WorkspaceFile);
							a = document.createElement("a"); //$NON-NLS-0$
							a.href = href;
							a.target = "_new"; //$NON-NLS-0$
							var span = document.createElement("span"); //$NON-NLS-0$
							span.className += "imageSprite " + spriteClass; //$NON-NLS-0$
							span.title = i18nUtil.formatMessage(title, href);
							a.appendChild(span);
							lib.empty(col);
							col.appendChild(a);
						}, function(error) {
							a = document.createElement("a"); //$NON-NLS-0$
							a.href = href;
							a.target = "_new"; //$NON-NLS-0$
							var span = document.createElement("span"); //$NON-NLS-0$
							span.className += "imageSprite core-sprite-error"; //$NON-NLS-0$
							span.title = i18nUtil.formatMessage(messages.WorkspaceResourceNotFound, href);
							a.appendChild(span);
							lib.empty(col);
							col.appendChild(a);
						});
				});
			} else {
				href = target;
				a = document.createElement("a"); //$NON-NLS-0$
				a.href = href;
				a.target = "_new"; //$NON-NLS-0$
				lib.empty(col);
				var span = document.createElement("span"); //$NON-NLS-0$
				span.className += "imageSprite core-sprite-link"; //$NON-NLS-0$
				span.title = i18nUtil.formatMessage(messages.ExternalLinkTo, href);
				a.appendChild(span);
				col.appendChild(a);
			}
			col.classList.add("isValidCell"); //$NON-NLS-0$
			return col;
		}
	});
	return Renderer;
}());

/**
 * @name orion.sites.MappingsTable
 */
mSiteMappingsTable.MappingsTable = (function() {
	function MappingsTable(options) {
		this.registry = options.serviceRegistry;
		this.commandService = options.commandRegistry;
		this.registerCommands();
		this.siteClient = options.siteClient;
		this.parentId = options.parentId;
		this.selection = options.selection;
		this.renderer = new mSiteMappingsTable.Renderer({
				checkbox: false, /*TODO make true when we have selection-based commands*/
				onchange: this.fieldChanged.bind(this),
				siteConfiguration: options.siteConfiguration,
				siteClient: options.siteClient,
				fileClient: options.fileClient,
				commandService: this.commandService,
				progress: options.serviceRegistry.getService("orion.page.progress"),
				actionScopeId: "siteMappingCommand" //$NON-NLS-0$
			}, this);
		this.myTree = null;
		this._setSiteConfiguration(options.siteConfiguration);
		this.setDirty(false);
	}
	MappingsTable.prototype = Object.create(mExplorer.Explorer.prototype);
	EventTarget.attach(MappingsTable.prototype);
	mixin(MappingsTable.prototype, /** @lends orion.sites.MappingsTable.prototype */ {
		_setSiteConfiguration: function(site) {
			this.siteConfiguration = site;
			this.refresh();
		},
		refresh: function() {
			var fetchItems = function() {
				return new Deferred().resolve(this.siteConfiguration.Mappings);
			}.bind(this);
			// Refresh display names from the site service
			var self = this;
			this.siteClient.updateMappingsDisplayStrings(this.siteConfiguration).then(function(updatedSite) {
				self.siteConfiguration.Mappings = updatedSite.Mappings;
				// Build visuals
				self.createTree(self.parentId, new mSiteMappingsTable.Model(null, fetchItems, self.siteConfiguration.Mappings));
			});
		},
		render: function() {
			this.changedItem(this.siteConfiguration.Mappings, this.siteConfiguration.Mappings);
		},
		// Render the row of a single item, without rendering its siblings.
		renderItemRow: function(item, fieldName) {
			if (fieldName === "FriendlyPath") { //$NON-NLS-0$
				// Just update the "is valid" column
				var rowNode = document.getElementById(this.myTree._treeModel.getId(item));
				var oldCell = lib.$(".isValidCell", rowNode); //$NON-NLS-0$
				var col_no = lib.$$array("td", rowNode).indexOf(oldCell); //$NON-NLS-0$
				var cell = this.renderer.getIsValidCell(col_no, item, rowNode);
				// replace oldCell with cell
				oldCell.parentNode.replaceChild(cell, oldCell);
			}
		},
		registerCommands: function() {
			var deleteMappingCommand = new mCommands.Command({
				name: messages['Delete'],
				imageClass: "core-sprite-delete", //$NON-NLS-0$
				id: "orion.site.mappings.remove", //$NON-NLS-0$
				visibleWhen: function(item) {
					// Only show on a Mappings object
					return 'Source' in item || 'Target' in item || 'FriendlyPath' in item; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				},
				callback: function(data) {
					//table._hideTooltip();
					this.deleteMapping(data.items);
					this.render();
					this.setDirty(true);
				}.bind(this)});
			this.commandService.addCommand(deleteMappingCommand);
			this.commandService.registerCommandContribution("siteMappingCommand", "orion.site.mappings.remove", 0); //$NON-NLS-1$ //$NON-NLS-0$
			
			var moveUpCommand = new mCommands.Command({
				name: messages["Move Up"],
				imageClass: "core-sprite-move-up", //$NON-NLS-0$
				id: "orion.site.mappings.moveUp", //$NON-NLS-0$
				visibleWhen: function(item) {
					return 'Source' in item || 'Target' in item || 'FriendlyPath' in item; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}.bind(this),
				callback: function(data) {
					var index = this.getItemIndex(data.items);
					if (index === 0) { return; }
					var temp = this.siteConfiguration.Mappings[index-1];
					this.siteConfiguration.Mappings[index-1] = data.items;
					this.siteConfiguration.Mappings[index] = temp;
					this.render();
					this.setDirty(true);
				}.bind(this)});
			this.commandService.addCommand(moveUpCommand);
			this.commandService.registerCommandContribution("siteMappingCommand", "orion.site.mappings.moveUp", 1); //$NON-NLS-1$ //$NON-NLS-0$
			
			var moveDownCommand = new mCommands.Command({
				name: messages["Move Down"],
				imageClass: "core-sprite-move-down", //$NON-NLS-0$
				id: "orion.site.mappings.moveDown", //$NON-NLS-0$
				visibleWhen: function(item) {
					return 'Source' in item || 'Target' in item || 'FriendlyPath' in item; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				}.bind(this),
				callback: function(data) {
//					this._hideTooltip();
					var index = this.getItemIndex(data.items);
					if (index === this.siteConfiguration.Mappings.length - 1) { return; }
					var temp = this.siteConfiguration.Mappings[index+1];
					this.siteConfiguration.Mappings[index+1] = data.items;
					this.siteConfiguration.Mappings[index] = temp;
					this.render();
					this.setDirty(true);
				}.bind(this)});
			this.commandService.addCommand(moveDownCommand);
			this.commandService.registerCommandContribution("siteMappingCommand", "orion.site.mappings.moveDown", 2); //$NON-NLS-1$ //$NON-NLS-0$
		},
		getItemIndex: function(item) {
			return this.siteConfiguration.Mappings.indexOf(item);
		},
		_addMapping: function(object) {
			var source = object.Source, target = object.Target, friendlyPath = object.FriendlyPath;
			object.Source = safePath(typeof(source) === "string" ? source : this.getNextMountPoint(friendlyPath)); //$NON-NLS-0$
			object.Target = safePath(typeof(target) === "string" ? target : "/"); //$NON-NLS-1$ //$NON-NLS-0$
			if (!this.mappingExists(source, target)) {
				this.siteConfiguration.Mappings.push(object);
			}
		},
		addMapping: function(object) {
			this._addMapping(object);
			this.render();
			this.setDirty(true);
		},
		addMappings: function(mappings) {
			for (var i=0; i < mappings.length; i++) {
				this.addMapping(mappings[i]);
			}
			this.render();
			this.setDirty(true);
		},
		mappingExists: function(source, target) {
			if (typeof source === "object" && typeof target === "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
				target = source.Target;
				source = source.Source;
			}
			var mappings = this.siteConfiguration.Mappings;
			for (var i=0; i < mappings.length; i++) {
				if (mappings[i].Source === source && mappings[i].Target === target) {
					return true;
				}
			}
			return false;
		},
		getNextMountPoint: function(/**String*/ friendlyPath) {
			// Try root first
			var mappings = this.siteConfiguration.Mappings;
			var hasRoot = false;
			for (var i=0; i < mappings.length; i++) {
				if (mappings[i].Source === "/") { //$NON-NLS-0$
					hasRoot = true;
					break;
				}
			}
			if (!hasRoot) {
				return "/"; //$NON-NLS-0$
			}
			// Else base it on friendlyPath
			if (!friendlyPath) {
				return "/web/somePath"; //$NON-NLS-0$
			}
			var segments = friendlyPath.split("/"); //$NON-NLS-0$
			for (i = segments.length-1; i >= 0; i--) {
				if (!/\s+/.test(segments[i])) {
					return "/" + segments[i]; //$NON-NLS-0$
				}
			}
			return "/web/somePath"; //$NON-NLS-0$
		},
		deleteMapping: function(/**Object*/ mapping) {
			var index = this.siteConfiguration.Mappings.indexOf(mapping);
			if (index !== -1) {
				this.siteConfiguration.Mappings.splice(index, 1);
			}
		},
		deleteAllMappings: function() {
			this.siteConfiguration.Mappings.splice(0, this.siteConfiguration.Mappings.length);
		},
		fieldChanged: function(/**Object*/ item, /**String*/ fieldName, /**String*/ newValue, /**Event*/ event) {
			newValue = safePath(newValue);
			var oldValue = item[fieldName];
			if (oldValue !== newValue) {
				item[fieldName] = newValue;
				if (fieldName === "FriendlyPath") { //$NON-NLS-0$
					// Convert displayed string into the internal path representation, update the Target field
					var friendlyPath = newValue;
					var self = this;
					this.siteClient.parseInternalForm(this.siteConfiguration, friendlyPath).then(
						function(internalPath) {
							item.Target = internalPath || friendlyPath;
							self.renderItemRow(item, fieldName);
							self.setDirty(true);	
						});
				}
			}
		},
		/**
		 * @event setDirty
		 * Clients can listen for "dirty" event to receive notification of the dirty state change.
		 */
		setDirty: function(value) {
			this._isDirty = value;
			this.dispatchEvent({type: "dirty", value: value});
		},
		isDirty: function() {
			return this._isDirty;
		}
	});
	return MappingsTable;
}());

return mSiteMappingsTable;
});