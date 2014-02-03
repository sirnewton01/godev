/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global clearTimeout console define document setTimeout window */
/*jslint regexp:false forin:true*/

define([
	'i18n!orion/navigate/nls/messages',
	'orion/Deferred',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/fileUtils',
	'orion/explorers/explorer',
	'orion/EventTarget',
	'orion/objects',
	'orion/util'
], function(messages, Deferred, lib, i18nUtil, mFileUtils, mExplorer, EventTarget, objects, util){

	/**
	 * Tree model used by the FileExplorer
	 */
	function FileModel(serviceRegistry, root, fileClient, idPrefix, excludeFiles, excludeFolders) {
		this.registry = serviceRegistry;
		this.root = root;
		this.fileClient = fileClient;
		this.idPrefix = idPrefix || "";
		this.excludeFiles = !!excludeFiles;
		this.excludeFolders = !!excludeFolders;
	}
	FileModel.prototype = new mExplorer.ExplorerModel(); 
	objects.mixin(FileModel.prototype, /** @lends orion.explorer.FileModel.prototype */ {
		getRoot: function(onItem){
			onItem(this.root);
		},
	
		/*
		 *	Process the parent and children, doing any filtering or sorting that may be necessary.
		 */
		processParent: function(parent, children) {
			if (this.excludeFiles || this.excludeFolders) {
				var filtered = [];
				for (var i in children) {
					var exclude = children[i].Directory ? this.excludeFolders : this.excludeFiles;
					if (!exclude) {
						filtered.push(children[i]);
						children[i].parent = parent;
					}
				}
				children = filtered;
			} else {
				for (var j in children) {
					children[j].parent = parent;
				}
			}
		
			//link the parent and children together
			parent.children = children;
	
			// not ideal, but for now, sort here so it's done in one place.
			// this should really be something pluggable that the UI defines
			parent.children.sort(function(a, b) {
				var isDir1 = a.Directory;
				var isDir2 = b.Directory;
				if (isDir1 !== isDir2) {
					return isDir1 ? -1 : 1;
				}
				var n1 = a.Name && a.Name.toLowerCase();
				var n2 = b.Name && b.Name.toLowerCase();
				if (n1 < n2) { return -1; }
				if (n1 > n2) { return 1; }
				return 0;
			}); 
			return children;
		},
			
		getChildren: function(parentItem, /* function(items) */ onComplete) {
			var self = this;
			// the parent already has the children fetched
			if (parentItem.children) {
				onComplete(parentItem.children);
			} else if (parentItem.Directory!==undefined && parentItem.Directory===false) {
				onComplete([]);
			} else if (parentItem.Location) {
				var progress = null;
				if(this.registry) {
					progress = this.registry.getService("orion.page.progress"); //$NON-NLS-0$
				}
				(progress ? progress.progress(this.fileClient.fetchChildren(parentItem.ChildrenLocation), messages["Fetching children of "] + parentItem.Name) : this.fileClient.fetchChildren(parentItem.ChildrenLocation)).then( //$NON-NLS-0$
					function(children) {
						if (self.destroyed) { return; }
						onComplete(self.processParent(parentItem, children));
					},
					function() {
						onComplete([]);
					}
				);
			} else {
				onComplete([]);
			}
		},
		
		hasChildren: function() {
			var result = false;
			if (this.root.Children) {
				result = this.root.Children.length > 0;
			}
			return result;
		}
	});
	
	FileModel.prototype.constructor = FileModel;


	/**
	 * Creates a new file explorer.
	 * @name orion.explorer.FileExplorer
	 * @class A user interface component that displays a table-oriented file explorer
	 * @extends orion.explorer.Explorer
	 *
	 * @param {Object} options.treeRoot an Object representing the root of the tree.
	 * @param {orion.selection.Selection} options.selection the selection service used to track selections.
	 * @param {orion.fileClient.FileClient} options.fileClient the file service used to retrieve file information
	 * @param {String|Element} options.parentId the id of the parent DOM element, or the parent DOM element itself.
	 * @param {Function} options.rendererFactory a factory that creates a renderer
	 * @param {Boolean} options.excludeFiles specifies that files should not be shown. Optional.
	 * @param {Boolean} options.excludeFolders specifies that folders should not be shown.  Optional.
	 * @param {Object} [options.navHandlerFactory] Optional factory to use for creating the explorer's nav handler. Must provide a function
	 * <code>createNavHandler(explorer, explorerNavDict, options)</code>.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry  the service registry to use for retrieving other
	 *	Orion services.  Optional.  If not specified, then some features of the explorer will not be enabled, such as status reporting,
	 *  honoring preference settings, etc.
	 * @param {Boolean} [options.setFocus=true] Whether the explorer should steal keyboard focus when rendered. The default is to steal focus.
	 */
	/**
	 * Root model item of the tree.
	 * @name orion.explorer.FileExplorer#treeRoot
	 * @field
	 * @type Object
	 */
	/**
	 * Dispatches events describing model changes.
	 * @name orion.explorer.FileExplorer#modelEventDispatcher
	 * @type orion.EventTarget
	 */
	/**
	 * Handles model changes.
	 * @name orion.explorer.FileExplorer#modelHandler
	 * @type orion.explorer.FileExplorer.ModelHandler
	 */
	function FileExplorer(options) {
		EventTarget.attach(this);
		this.registry = options.serviceRegistry;
		this.treeRoot = options.treeRoot;
		this.selection = options.selection;
		this.fileClient = options.fileClient;
		this.excludeFiles = options.excludeFiles;
		this.excludeFolders = options.excludeFolders;
		this.navHandlerFactory = options.navHandlerFactory;
		this.parentId = options.parentId;
		this.renderer = options.rendererFactory(this);
		this.dragAndDrop = options.dragAndDrop;
		this.setFocus = options.setFocus;
		this.model = null;
		this.myTree = null;
		this.checkbox = false;
		this._hookedDrag = false;
		var modelEventDispatcher = options.modelEventDispatcher ? options.modelEventDispatcher : new EventTarget();
		this.modelEventDispatcher = modelEventDispatcher;

		// Listen to model changes from fileCommands
		var _self = this;
		this._modelListeners = {};
		["copy", "copyMultiple", "create", "delete", "deleteMultiple", "import", //$NON-NLS-5$//$NON-NLS-4$//$NON-NLS-3$//$NON-NLS-2$//$NON-NLS-1$//$NON-NLS-0$
		 "move", "moveMultiple"].forEach(function(eventType) { //$NON-NLS-1$//$NON-NLS-0$
				modelEventDispatcher.addEventListener(eventType, _self._modelListeners[eventType] = _self.modelHandler[eventType].bind(_self));
			});
			
		this._clickListener = function(evt) {
			if (evt.target.tagName === "A") { //$NON-NLS-0$
				var temp = evt.target;
				while (temp) {
					if (temp._item) {
						break;
					}
					temp = temp.parentNode;
				}
				if (temp && temp._item) {
					_self.onLinkClick({type: "linkClick", item: temp._item}); //$NON-NLS-0$
				}
			}
		};
		var parent = lib.node(this.parentId);
		if (parent) {
			parent.addEventListener("click", this._clickListener); //$NON-NLS-0$
		}

		// Same tab/new tab setting
		var renderer = this.renderer;
		if (this.registry) {
			this.registry.registerService("orion.cm.managedservice", //$NON-NLS-0$
				{	updated: function(properties) {
						var target;
						if (properties && properties["links.newtab"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
							target = properties["links.newtab"] ? "_blank" : "_self"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						} else {
							target = "_self"; //$NON-NLS-0$
						}
						if (renderer.setTarget) {
							renderer.setTarget(target);
						}
					}
				}, {pid: "nav.config"}); //$NON-NLS-0$
		}
	}
	
	var dragStartTarget, dropEffect;

	FileExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(FileExplorer.prototype, /** @lends orion.explorer.FileExplorer.prototype */ {
		destroy: function() {
			var _self = this;
			Object.keys(this._modelListeners).forEach(function(eventType) {
				_self.modelEventDispatcher.removeEventListener(eventType, _self._modelListeners[eventType]);
			});
			var parent = lib.node(this.parentId);
			if (parent) {
				parent.removeEventListener("click", this._clickListener); //$NON-NLS-0$
			}
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		onLinkClick: function(clickEvent) {
			this.dispatchEvent(clickEvent);
		},
		onModelCreate: function(modelEvent) {
			return this.changedItem(modelEvent.parent, true);
		},
		onModelCopy: function(modelEvent) {
			var ex = this, changedLocations = {};
			(modelEvent.items || [modelEvent]).forEach(function(item) {
				var itemParent = item.parent;
				itemParent = itemParent || ex.treeRoot;
				changedLocations[itemParent.Location] = itemParent;
			});
			return Deferred.all(Object.keys(changedLocations).map(function(loc) {
				return ex.changedItem(changedLocations[loc], true);
			}));
		},
		onModelMove: function(modelEvent) {
			var ex = this, changedLocations = {};
			(modelEvent.items || [modelEvent]).forEach(function(item) {
				if (ex.treeRoot.Location === item.Location) {
					// the treeRoot was moved
					var oldRoot = ex.treeRoot;
					var newItem = item.newValue;
					var realNewItem = newItem.ChildrenLocation ? newItem : this.fileClient.read(newItem.ContentLocation, true);
					return Deferred.when(realNewItem, function(newItem) {
						ex.dispatchEvent({ type: "rootMoved", oldValue: oldRoot, newValue: newItem }); //$NON-NLS-0$
						ex.loadResourceList(newItem);
					});
				}
				var itemParent = item.oldValue.parent;
				itemParent = itemParent || ex.treeRoot;
				changedLocations[itemParent.Location] = itemParent;
				
				itemParent = item.parent;
				itemParent = itemParent || ex.treeRoot;
				changedLocations[itemParent.Location] = itemParent;
				
				// If the renamed item was an expanded directory, force an expand.
				if (item.oldValue.Directory && item.newValue && ex.isExpanded(item.oldValue)) {
					changedLocations[item.newValue.Location] = item.newValue;
				}
			});
			return Deferred.all(Object.keys(changedLocations).map(function(loc) {
				return ex.changedItem(changedLocations[loc], true);
			}));
		},
		onModelDelete: function(modelEvent) {
			var items = modelEvent.items || [modelEvent];
			var ex = this;
			var newRoot;
			var treeRootDeleted = items.some(function(item) {
				if (item.oldValue.Location === ex.treeRoot.Location) {
					newRoot = item.parent;
					return true;
				}
				return false;
			});
			if (treeRootDeleted) {
				return this.loadResourceList(newRoot);
			} else {
				// Refresh every parent folder
				var changedLocations = {};
				items.forEach(function(item) {
					var parent = item.parent;
					changedLocations[parent.Location] = parent;
				});
				return Deferred.all(Object.keys(changedLocations).map(function(loc) {
					return ex.changedItem(changedLocations[loc], true);
				}));
			}
		},
	
		/**
		 * Handles model changes. Subclasses can override these methods to control how the FileExplorer reacts to various types of model changes.
		 * The default implementations generally just refresh the affected row(s) in the explorer.
		 * @name orion.explorer.FileExplorer.ModelHandler
		 * @class Handles model changes in a FileExplorer.
		 */
		modelHandler: /** @lends orion.explorer.FileExplorer.ModelHandler.prototype */ {
			copy: function(modelEvent) {
				if (modelEvent.count) {
					return; // Handled in copyMultiple
				}
				return this.onModelCopy(modelEvent);
			},
			copyMultiple: function(modelEvent) {
				return this.onModelCopy(modelEvent);
			},
			create: function(modelEvent) {
				// refresh the node
				return this.onModelCreate(modelEvent);
			},
			"delete": function(modelEvent) { //$NON-NLS-0$
				if (modelEvent.count) {
					return; //Handled in deleteMultiple
				}
				return this.onModelDelete(modelEvent);
			},
			deleteMultiple: function(modelEvent) {
				return this.onModelDelete(modelEvent);
			},
			"import": function(modelEvent) { //$NON-NLS-0$
				var target = modelEvent.target;
				return this.changedItem(target, true);
			},
			move: function(modelEvent) {
				if (modelEvent.count) {
					return; //Handled in moveMultiple
				}
				return this.onModelMove(modelEvent);
			},
			moveMultiple: function(modelEvent) {
				return this.onModelMove(modelEvent);
			}
		},

		_makeDropTarget: function(item, node, persistAndReplace) {
			function dropFileEntry(entry, path, target, explorer, performDrop, fileClient) {
				path = path || "";
				if (entry.isFile) {
					// can't drop files directly into workspace.
					if (mFileUtils.isAtRoot(target.Location)){ //$NON-NLS-0$
						if(explorer.registry) {
							explorer.registry.getService("orion.page.message").setProgressResult({ //$NON-NLS-0$
								Severity: "Error", Message: messages["You cannot copy files directly into the workspace.  Create a folder first."]});	 //$NON-NLS-1$ //$NON-NLS-0$ 
						}
					} else {
						entry.file(function(file) {
							performDrop(target, file, explorer, file.name.indexOf(".zip") === file.name.length-4 && window.confirm(i18nUtil.formatMessage(messages["Unzip ${0}?"], file.name))); //$NON-NLS-1$ //$NON-NLS-0$ 
						});
					}
				} else if (entry.isDirectory) {
					var dirReader = entry.createReader();
					var traverseChildren = function(folder) {
						dirReader.readEntries(function(entries) {
							for (var i=0; i<entries.length; i++) {
								dropFileEntry(entries[i], path + entry.name + "/", folder, explorer, performDrop, fileClient); //$NON-NLS-0$
							}
						});
					};
					var progress = null;
					if(explorer.registry) {
						progress = explorer.registry.getService("orion.page.progress"); //$NON-NLS-0$
					}
					if (mFileUtils.isAtRoot(target.Location)){ //$NON-NLS-0$
						(progress ? progress.progress(fileClient.createProject(target.ChildrenLocation, entry.name), i18nUtil.formatMessage(messages["Creating ${0}"], entry.name)) : 
									fileClient.createProject(target.ChildrenLocation, entry.name)).then(function(project) {
							explorer.loadResourceList(explorer.treeRoot.Path, true);					
							(progress ? progress.progress(fileClient.read(project.ContentLocation, true), messages["Loading "] + project.name) :
										fileClient.read(project.ContentLocation, true)).then(function(folder) {
									traverseChildren(folder);
								});
						});
					} else {
						(progress ? progress.progress(fileClient.createFolder(target.Location, entry.name), i18nUtil.formatMessage(messages["Creating ${0}"], entry.name)) :
									fileClient.createFolder(target.Location, entry.name)).then(function(subFolder) {
							var dispatcher = explorer.modelEventDispatcher;
							dispatcher.dispatchEvent({ type: "create", parent: item, newValue: subFolder }); //$NON-NLS-0$
							traverseChildren(subFolder);
						});
					}
				}
			}
			
			if (this.dragAndDrop) {
				var explorer = this;
				var performDrop = this.dragAndDrop;
				
				var dragStart = function(evt) {
					dragStartTarget = evt.target;
				};
				if (persistAndReplace) {
					if (this._oldDragStart) {
						node.removeEventListener("dragstart", this._oldDragStart, false); //$NON-NLS-0$
					}
					this._oldDragStart = dragStart;
				}
				node.addEventListener("dragstart", dragStart, false); //$NON-NLS-0$
				
				
				var dragEnd = function(evt) {
					dragStartTarget = null;
				};
				if (persistAndReplace) {
					if (this._oldDragEnd) {
						node.removeEventListener("dragend", this._oldDragEnd, false); //$NON-NLS-0$
					}
					this._oldDragEnd = dragEnd;
				}
				node.addEventListener("dragend", dragEnd, false); //$NON-NLS-0$
				
				var dragLeave = function(evt) { //$NON-NLS-0$
					node.classList.remove("dragOver"); //$NON-NLS-0$
					evt.preventDefault();
					evt.stopPropagation();
				};
				// if we are rehooking listeners on a node, unhook old before hooking and remembering new
				if (persistAndReplace) {
					if (this._oldDragLeave) {
						node.removeEventListener("dragleave", this._oldDragLeave, false); //$NON-NLS-0$
					}
					this._oldDragLeave = dragLeave;
				}
				node.addEventListener("dragleave", dragLeave, false); //$NON-NLS-0$
	
				var dragEnter = function (evt) {
					if (dragStartTarget) {
						var copy = util.isMac ? evt.altKey : evt.ctrlKey;
						dropEffect = evt.dataTransfer.dropEffect = copy ? "copy" : "move"; //$NON-NLS-1$ //$NON-NLS-0$
					} else {
						/* accessing dataTransfer.effectAllowed here throws an error on IE */
						if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||   //$NON-NLS-0$
							evt.dataTransfer.effectAllowed === "uninitialized" ||  //$NON-NLS-0$
							evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) {   //$NON-NLS-0$
								evt.dataTransfer.dropEffect = "copy";  //$NON-NLS-0$
						}
					}
					node.classList.add("dragOver"); //$NON-NLS-0$
					lib.stop(evt);
				};
				if (persistAndReplace) {
					if (this._oldDragEnter) {
						node.removeEventListener("dragenter", this._oldDragEnter, false); //$NON-NLS-0$
					}
					this._oldDragEnter = dragEnter;
				}
				node.addEventListener("dragenter", dragEnter, false); //$NON-NLS-0$
	
				// this listener is the same for any time, so we don't need to remove/rehook.
				var dragOver = function (evt) {
					if (dragStartTarget) {
						var copy = util.isMac ? evt.altKey : evt.ctrlKey;
						dropEffect = evt.dataTransfer.dropEffect = copy ? "copy" : "move"; //$NON-NLS-1$ //$NON-NLS-0$
					} else {
						// default behavior is to not trigger a drop, so we override the default
						// behavior in order to enable drop.  
						// we have to specify "copy" again here, even though we did in dragEnter
						/* accessing dataTransfer.effectAllowed here throws an error on IE */
						if (!util.isIE && (evt.dataTransfer.effectAllowed === "all" ||   //$NON-NLS-0$
							evt.dataTransfer.effectAllowed === "uninitialized" ||  //$NON-NLS-0$
							evt.dataTransfer.effectAllowed.indexOf("copy") >= 0)) {   //$NON-NLS-0$
								evt.dataTransfer.dropEffect = "copy";  //$NON-NLS-0$
						}   
					}
					lib.stop(evt);
				};
				if (persistAndReplace && !this._oldDragOver) {
					node.addEventListener("dragover", dragOver, false); //$NON-NLS-0$
					this._oldDragOver = dragOver;
				}
	
				var drop = function(evt) {
					var i;
					node.classList.remove("dragOver"); //$NON-NLS-0$
					if (dragStartTarget) {
						var fileClient = explorer.fileClient;
						var tmp = dragStartTarget;
						var source;
						while (tmp) {
							if (tmp._item) {
								source = tmp._item;
								break;
							}
							tmp = tmp.parentNode;
						}
						if (!source) {
							return;
						}
						var progress = null;
						if(explorer.registry) {
							progress = explorer.registry.getService("orion.page.progress"); //$NON-NLS-0$
						}
						var isCopy = dropEffect === "copy"; //$NON-NLS-0$
						var func = isCopy ? fileClient.copyFile : fileClient.moveFile;
						(progress ? progress.showWhile(func.apply(fileClient, [source.Location, item.Location]), i18nUtil.formatMessage(messages[isCopy ? "Copying ${0}" : "Moving ${0}"], source.Location)) : 
									func.apply(fileClient, [source.Location, item.Location])).then(function(result) {
							var dispatcher = explorer.modelEventDispatcher;
							dispatcher.dispatchEvent({type: isCopy ? "copy" : "move", oldValue: source, newValue: result, parent: item}); //$NON-NLS-1$ //$NON-NLS-0$
						}, function(error) {
							if (progress) {
								progress.setProgressResult(error);
							} else {
								window.console.log(error);
							}
						});
						
					// webkit supports testing for and traversing directories
					// http://wiki.whatwg.org/wiki/DragAndDropEntries
					} else if (evt.dataTransfer.items && evt.dataTransfer.items.length > 0) {
						for (i=0; i<evt.dataTransfer.items.length; i++) {
							var entry = null;
							if (typeof evt.dataTransfer.items[i].getAsEntry === "function") { //$NON-NLS-0$
								entry = evt.dataTransfer.items[i].getAsEntry();
							} else if (typeof evt.dataTransfer.items[i].webkitGetAsEntry === "function") { //$NON-NLS-0$
								entry = evt.dataTransfer.items[i].webkitGetAsEntry();
							}
							if (entry) {
								dropFileEntry(entry, null, item, explorer, performDrop, explorer.fileClient);
							}
						}
					} else if (evt.dataTransfer.files && evt.dataTransfer.files.length > 0) {
						for (i=0; i<evt.dataTransfer.files.length; i++) {
							var file = evt.dataTransfer.files[i];
							// this test is reverse engineered as a way to figure out when a file entry is a directory.
							// The File API in HTML5 doesn't specify a way to check explicitly (when this code was written).
							// see http://www.w3.org/TR/FileAPI/#file
							if (!file.length && (!file.type || file.type === "")) {
								if(explorer.registry) {
									explorer.registry.getService("orion.page.message").setProgressResult( //$NON-NLS-0$
										{Severity: "Error", Message: i18nUtil.formatMessage(messages["Did not drop ${0}.  Folder drop is not supported in this browser."], file.name)}); //$NON-NLS-1$ //$NON-NLS-0$ 
								}
							} else if (mFileUtils.isAtRoot(item.Location)){ //$NON-NLS-0$
								if(explorer.registry) {
									explorer.registry.getService("orion.page.message").setProgressResult({ //$NON-NLS-0$
										Severity: "Error", Message: messages["You cannot copy files directly into the workspace.  Create a folder first."]});	 //$NON-NLS-1$ //$NON-NLS-0$ 
								}
							} else {
								performDrop(item, file, explorer, file.name.indexOf(".zip") === file.name.length-4 && window.confirm(i18nUtil.formatMessage(messages["Unzip ${0}?"], file.name))); //$NON-NLS-1$ //$NON-NLS-0$ 
							}
						}
					}
					lib.stop(evt);
				};
				if (persistAndReplace) {
					if (this._oldDrop) {
						node.removeEventListener("drop", this._oldDrop, false); //$NON-NLS-0$
					}
					this._oldDrop = drop;
				}
				node.addEventListener("drop", drop, false); //$NON-NLS-0$
			}
		},

		/**
		 * @name orion.explorer.FileExplorer#createModel
		 * @function Creates the explorer model.
		 * @returns {orion.explorer.FileModel}
		 */
		createModel: function() {
			return new FileModel(this.registry, this.treeRoot, this.fileClient, this.parentId, this.excludeFiles, this.excludeFolders);
		},

		/**
		 * @name orion.explorer.FileExplorer#changedItem
		 * @function
		 * we have changed an item on the server at the specified parent node
		 * @param {Object} parent The parent item under which the change occurred.
		 * @param {Boolean} forceExpand
		 * @returns {orion.Promise}
		 */
		changedItem: function(parent, forceExpand) {
			if (this.treeRoot && this.treeRoot.Location === parent.Location) {
				return this.loadResourceList(this.treeRoot, forceExpand);
			}
			var that = this;
			var deferred = new Deferred();
			parent.children = null;
			this.model.getChildren(parent, function(children) {
				//If a key board navigator is hooked up, we need to sync up the model
				if(that.getNavHandler()){
					//that._initSelModel();
				}
				that.myTree.refresh.bind(that.myTree)(parent, children, forceExpand);
				deferred.resolve(children);
			});
			return deferred;
		},

		/**
		 * Shows the given item.
		 * @param {Object} The item to be shown.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		showItem: function(item, reroot) {
			var deferred = new Deferred();
			if (!item || !this.model || !this.myTree || (!this.myTree.showRoot && item.Location === this.treeRoot.Location)) {
				return deferred.reject();
			}
			var row = this.getRow(item);
			if (row) {
				deferred.resolve(row._item || item);
			} else if (item.Parents && item.Parents.length>0) {
				item.Parents[0].Parents = item.Parents.slice(1);
				return this.expandItem(item.Parents[0], reroot).then(function(parent) {
					// Handles model out of sync
					var row = this.getRow(item);
					if (!row) {
						return this.changedItem(parent, true).then(function() {
							var row = this.getRow(item);
							return row ? row._item : new Deferred().reject();
						}.bind(this));
					}
					return row._item || item;
				}.bind(this));
			} else {
				// Handles file not in current tree
				if (reroot === undefined || reroot) {
					return this.reroot(item);
				}
				return deferred.reject();
			}
			return deferred;
		},

		/**
		 * Expands the given item.
		 * @param {Object} The item to be expanded.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		expandItem: function(item, reroot) {
			var deferred = new Deferred();
			this.showItem(item, reroot).then(function(result) {
				if (this.myTree.isExpanded(result)) {
					deferred.resolve(result);
				} else {
					this.myTree.expand(this.model.getId(result), function() {
						deferred.resolve(result);
					});
				}
			}.bind(this), deferred.reject);
			return deferred;
		},

		/**
		 * Shows and selects the given item.
		 * @param {Object} The item to be revealed.
		 * @param {Booelan} [reroot=true] whether the receiver should re-root the tree if the item is not displayable.
		 * @returns {orion.Promise}
		 */
		reveal: function(item, reroot) {
			return this.showItem(item, reroot).then(function(result) {
				var navHandler = this.getNavHandler();
				if (navHandler) {
					navHandler.cursorOn(result, true);
					navHandler.setSelection(result);
				}
				return result;
			}.bind(this));
		},

		/**
		 * Re-roots the tree so that the given item is displayable.
		 * @param {Object} The item to be expanded.
		 * @returns {orion.Promise}
		 */
		reroot: function(item) {
			// Do nothing by default
			return new Deferred().reject();
		},

		/**
		 * Returns whether the given item is expanded.
		 * @param {Object} The item to be expanded.
		 * @returns {orion.Promise}
		 */
		isExpanded: function(item) {
			var rowId = this.model.getId(item);
			return this.renderer.tableTree.isExpanded(rowId);
		},

		/**
		 * Returns the node that a rename text input box should appear over top of.
		 * @name orion.explorer.FileExplorer#getNameNode
		 * @function
		 * @param {Object} item Item being renamed
		 * @returns {Element}
		 */
		getNameNode: function(item) {
			var rowId = this.model.getId(item);
			if (rowId) {
				// I know this from my renderer below.
				// TODO This approach fails utterly for a custom renderer, better hope they override this method.
				return lib.node(rowId+"NameLink"); //$NON-NLS-0$
			}
		},

		/**
		 * The explorerNavHandler hooked up by the explorer will call this function when left arrow key is pressed on a 
		 * top level item that is aleady collapsed. The default implementation does nothing.
		 * @name orion.explorer.FileExplorer#scopeUp
		 * @function
		 */
		scopeUp: function() {
		},

		/**
		 * The explorerNavHandler hooked up by the explorer will call this function when the focus into command is clicked.
		 * The default implementation does nothing.
		 * @name orion.explorer.FileExplorer#scopeDown
		 * @function
		 */
		scopeDown: function(item) {
		},

		/**
		 * Load the resource at the given path.
		 * @name orion.explorer.FileExplorer#loadResourceList
		 * @function
		 * @param {String|Object} path The path of the resource to load, or an object with a ChildrenLocation or ContentLocation field giving the path.
		 * @param {Boolean} [force] If true, force reload even if the path is unchanged. Useful
		 * when the client knows the resource underlying the current path has changed.
		 * @param {Function} postLoad a function to call after loading the resource. <b>Deprecated</b>: use the returned promise instead.
		 * @returns {orion.Promise}
		 */
		loadResourceList: function(path, force, postLoad) {
			if (path && typeof path === "object") { //$NON-NLS-0$
				path = path.ChildrenLocation || path.ContentLocation;
			}
			path = mFileUtils.makeRelative(path);
			if (!force && path === this._lastPath) {
				return new Deferred().resolve(this.treeRoot);
			}			
			this._lastPath = path;
			var self = this;
			if (force || (path !== this.treeRoot.Path)) {
				return this.load(this.fileClient.loadWorkspace(path), messages["Loading "] + path).then(function(p) {
					self.treeRoot.Path = path;
					if (typeof postLoad === "function") { //$NON-NLS-0$
						postLoad();
					}
					self.dispatchEvent({ type: "rootChanged", root: self.treeRoot }); //$NON-NLS-0$
					return new Deferred().resolve(self.treeRoot);
				}, function(err) {
					self.treeRoot.Path = null;
					self.dispatchEvent({ type: "rootChanged", root: self.treeRoot }); //$NON-NLS-0$
					return new Deferred().reject(err);
				});
			}
			return new Deferred().resolve(self.treeRoot);
		},

		/**
		 * Load the explorer with the given root
		 * @name orion.explorer.FileExplorer#load
		 * @function
		 * @param {Object} root a root object or a deferred that will return the root of the FileModel
		 * @param {String} progress a string progress message describing the fetch of the root
		 * @returns {orion.Promise} A promise that resolves to the loaded <code>treeRoot</code>, or rejects with an error.
		 */
		load: function(root, progressMessage, postLoad) {
			var parent = lib.node(this.parentId);			
	
			// Progress indicator
			var progress = lib.node("progress");  //$NON-NLS-0$
			if(!progress){
				progress = document.createElement("div"); //$NON-NLS-0$
				progress.id = "progress"; //$NON-NLS-0$
				lib.empty(parent);
				parent.appendChild(progress);
			}
			lib.empty(progress);
			
			var progressTimeout = setTimeout(function() {
				lib.empty(progress);
				progress.appendChild(document.createTextNode(progressMessage));
			}, 500); // wait 500ms before displaying
						
			var self = this;
			return Deferred.when(root,
				function(root) {
					clearTimeout(progressTimeout);
					if (self.destroyed) { return; }
					self.treeRoot = {};
					// copy properties from root json to our object
					for (var property in root) {
						self.treeRoot[property] = root[property];
					}
					self.model = self.createModel();
					if (self.dragAndDrop) {
						if (self._hookedDrag) {
							// rehook on the parent to indicate the new root location
							self._makeDropTarget(self.treeRoot, parent, true);
						} else {
							// uses two different techniques from Modernizr
							// first ascertain that drag and drop in general is supported
							var supportsDragAndDrop = parent && (('draggable' in parent) || ('ondragstart' in parent && 'ondrop' in parent));  //$NON-NLS-2$  //$NON-NLS-1$  //$NON-NLS-0$ 
							// then check that file transfer is actually supported, since this is what we will be doing.
							// For example IE9 has drag and drop but not file transfer
							supportsDragAndDrop = supportsDragAndDrop && !!(window.File && window.FileList && window.FileReader);
							self._hookedDrag = true;
							if (supportsDragAndDrop) {
								self._makeDropTarget(self.treeRoot, parent, true);
							} else {
								self.dragAndDrop = null;
								window.console.log("Local file drag and drop is not supported in this browser."); //$NON-NLS-0$
							}
						}
					}
					
					var deferred = new Deferred();
					self.createTree(self.parentId, self.model, {
						onComplete: function(tree) {
							deferred.resolve(tree);
						},
						navHandlerFactory: self.navHandlerFactory,
						setFocus: (typeof self.setFocus === "undefined" ? true : self.setFocus), //$NON-NLS-0$
						selectionPolicy: self.renderer.selectionPolicy, 
						onCollapse: function(model) {
							if(self.getNavHandler()){
								self.getNavHandler().onCollapse(model);
							}
						}
					});
					
					return deferred.then(function() {
						if (typeof postLoad === "function") { //$NON-NLS-0$
							try {
								postLoad();
							} catch(e){
								if (self.registry) {
									self.registry.getService("orion.page.message").setErrorMessage(e);	 //$NON-NLS-0$
								}
							}
						}				
						if (typeof self.onchange === "function") { //$NON-NLS-0$
							self.onchange(self.treeRoot);
						}
						return self.treeRoot;
					});
				},
				function(error) {
					clearTimeout(progressTimeout);
					// Show an error message when a problem happens during getting the workspace
					if (self.registry) {
						self.registry.getService("orion.page.message").setProgressResult(error); //$NON-NLS-0$
					}
					return new Deferred().reject(error);
				}
			);
		},
		/**
		 * Called when the root item changes. This can be overridden.
		 * @name orion.explorer.FileExplorer#onchange
		 * @function
		 * @param {Object} item
		 */
		onchange: function(item) {
		}
	});
	FileExplorer.prototype.constructor = FileExplorer;

	//return module exports
	return {
		FileExplorer: FileExplorer,
		FileModel: FileModel
	};
});
