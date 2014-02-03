/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
/*jslint browser:true devel:true sub:true*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/explorers/explorer-table',
	'orion/widgets/nav/common-nav',
	'orion/projectCommands',
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/Deferred',
	'orion/projectClient'
], function(
	messages, objects, lib, mExplorer, mCommonNav, ProjectCommands,
	PageUtil, URITemplate, Deferred, mProjectClient
) {
	var CommonNavExplorer = mCommonNav.CommonNavExplorer;
	var CommonNavRenderer = mCommonNav.CommonNavRenderer;
	var FileModel = mExplorer.FileModel;
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	function ProjectNavModel(serviceRegistry, root, fileClient, idPrefix, excludeFiles, excludeFolders, projectClient, fileMetadata){
		this.projectClient = projectClient;
		this.project = root;
		this.fileMetadata = fileMetadata;
		FileModel.apply(this, arguments);
	}
	
	ProjectNavModel.prototype = Object.create(FileModel.prototype);
	objects.mixin(ProjectNavModel.prototype, /** @lends orion.sidebar.ProjectNavModel.prototype */ {
		processParent: function(item, children){
			var res = FileModel.prototype.processParent.call(this, item, children);
			if(!item.Project){
				item.Project = this.project;
			}
			for(var i=0; i<children.length; i++){
				children[i].Project = this.project;
			}
			return res;
		},
		getChildren : function(parentItem, /* function(items) */ onComplete) {
			if(parentItem.children){
				onComplete(parentItem.children);
				return;
			}
			if(parentItem.type==="Project"){ //$NON-NLS-0$
				var children = [];
				this.fileMetadata.type = "ProjectRoot"; //$NON-NLS-0$
				children.push(this.fileMetadata);
				Deferred.all((parentItem.Dependencies || []).map(function(dependency) {
					var item = {Dependency: dependency, Project: parentItem};
					children.push(item);
					return this.projectClient.getDependencyFileMetadata(dependency, parentItem.WorkspaceLocation).then(function(dependencyMetadata) {
						objects.mixin(item, dependencyMetadata);
					}, function(error) {
						item.Directory = item.disconnected = true;
					});
				}.bind(this))).then(function() {
					this.processParent(parentItem, children);
					children.splice(children.indexOf(this.fileMetadata), 1);
					children.splice(0, 0, this.fileMetadata);
					onComplete(children);
				}.bind(this));
				return;
			}
			return FileModel.prototype.getChildren.call(this, parentItem, /* function(items) */ onComplete);
		},
		getId: function(item){
			if(item.type==="Project") { //$NON-NLS-0$
				item = {Location: item.ContentLocation};
			} else if (item.Dependency && item.disconnected) {
				item = item.Dependency;
			}
			return FileModel.prototype.getId.call(this, item);
		},
		hasChildren: function(){
			return true;
		}
	});

	/**
	 * @class orion.sidebar.ProjectNavExplorer
	 * @extends orion.explorers.CommonNavExplorer
	 */
	function ProjectNavExplorer(params) {
		this.projectClient = params.projectClient;
		this.sidebar = params.sidebar;
		CommonNavExplorer.apply(this, arguments);
		
		var _self = this;
		
		this.dependenciesDisplatcher = ProjectCommands.getDependencyDispatcher();
		this.dependneciesListener = function(event){
			_self.changedItem.call(_self);
		};
		this._dependenciesEventTypes = ["create", "delete"];
		this._dependenciesEventTypes.forEach(function(eventType) { //$NON-NLS-1$//$NON-NLS-0$
			_self.dependenciesDisplatcher.addEventListener(eventType, _self.dependneciesListener);
		});
		
	}
	ProjectNavExplorer.prototype = Object.create(CommonNavExplorer.prototype);
	objects.mixin(ProjectNavExplorer.prototype, /** @lends orion.sidebar.ProjectNavExplorer.prototype */ {
		onFileModelChange: function(event) {
			var oldValue = event.oldValue, newValue = event.newValue;
			// Detect if we moved/renamed/deleted the current file being edited, or an ancestor thereof.
			if(oldValue.ChildrenLocation === this.treeRoot.ContentLocation){
				this.sidebarNavInputManager.dispatchEvent({
					type: "editorInputMoved", //$NON-NLS-0$
					parent: newValue ? (newValue.ChildrenLocation || newValue.ContentLocation) : null,
					newInput: newValue ? (newValue.ChildrenLocation || newValue.ContentLocation) : null
				});
				return;
			}
			CommonNavExplorer.prototype.onFileModelChange.call(this, event);
		},
		display: function(fileMetadata, redisplay){
			if(!fileMetadata){
				return;
			}
			
			this.fileMetadata = fileMetadata;
			
			var parentProject;
			if (fileMetadata && fileMetadata.Parents && fileMetadata.Parents.length===0){
				parentProject = fileMetadata;
			} else if(fileMetadata && fileMetadata.Parents){
				parentProject = fileMetadata.Parents[fileMetadata.Parents.length-1];
			}
			
			if(!redisplay &&  parentProject && parentProject.Location === this.projectLocation){
				return;
			}
			return this.projectClient.readProject(fileMetadata).then(function(projectData){
				this.projectLocation = parentProject ? parentProject.Location : null;
				projectData.type = "Project"; //$NON-NLS-0$
				projectData.Directory = true;
				return CommonNavExplorer.prototype.display.call(this, projectData, redisplay).then(function() {
					return this.expandItem(fileMetadata);
				}.bind(this));
			}.bind(this));
		},
		createModel: function() {
			return new ProjectNavModel(this.registry, this.treeRoot, this.fileClient, this.parentId, this.excludeFiles, this.excludeFolders, this.projectClient, this.fileMetadata);
		},
		reroot: function(item) {
			this.scopeUp(item.Location);
			return new Deferred().reject();
		},
		registerCommands: function() {
			return CommonNavExplorer.prototype.registerCommands.call(this).then(function() {
				var commandRegistry = this.commandRegistry, fileClient = this.fileClient, serviceRegistry = this.registry;
				var newActionsScope = this.newActionsScope;
				var additionalNavActionsScope = this.additionalNavActionsScope;
				commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.connect", 1); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution("dependencyCommands", "orion.project.dependency.disconnect", 2); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(newActionsScope, "orion.project.create.readme", 5, "orion.commonNavNewGroup/orion.newContentGroup"); //$NON-NLS-1$ //$NON-NLS-0$
				commandRegistry.registerCommandContribution(newActionsScope, "orion.project.addFolder", 1, "orion.commonNavNewGroup/orion.projectDependencies"); //$NON-NLS-1$ //$NON-NLS-0$
				var projectCommandsDef = new Deferred();
				this.projectClient.getProjectHandlerTypes().then(function(dependencyTypes){
					for(var i=0; i<dependencyTypes.length; i++){
						commandRegistry.registerCommandContribution(newActionsScope, "orion.project.adddependency." + dependencyTypes[i], i+1, "orion.commonNavNewGroup/orion.projectDependencies"); //$NON-NLS-1$ //$NON-NLS-0$
					}
					this.projectClient.getProjectDeployTypes().then(function(deployTypes){
						if(deployTypes && deployTypes.length>0){
							commandRegistry.addCommandGroup(additionalNavActionsScope, "orion.deployNavGroup", 1000, messages["Deploy"], null, null, "core-sprite-deploy", null, "dropdownSelection"); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$							
						}
						for(var i=0; i<deployTypes.length; i++){
							commandRegistry.registerCommandContribution(additionalNavActionsScope, "orion.project.deploy." + deployTypes[i], i+100, "orion.deployNavGroup"); //$NON-NLS-1$ //$NON-NLS-0$
						}
						
						ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, this.projectClient, dependencyTypes, deployTypes).then(projectCommandsDef.resolve, projectCommandsDef.resolve);
					}.bind(this), function(error){
						console.error(error);
						ProjectCommands.createProjectCommands(serviceRegistry, commandRegistry, this, fileClient, this.projectClient, dependencyTypes).then(projectCommandsDef.resolve, projectCommandsDef.resolve);
						projectCommandsDef.resolve();
					});
				}.bind(this), projectCommandsDef.resolve);
				return projectCommandsDef;
			}.bind(this));
		},
		updateCommands: function(selections){
			if(this.treeRoot && this.treeRoot.Project && typeof this.treeRoot.Project.launchConfigurations === "undefined"){
				this.treeRoot.Project.launchConfigurations = [];
				
				function doUpdateForLaunchConfigurations(launchConfigurations, selections){
					if(this.launchCommands){
						for(var i=0; i<this.launchCommands.length; i++){
							this.commandRegistry.unregisterCommandContribution(this.additionalNavActionsScope, this.launchCommands[i]);
						}
					}
					this.treeRoot.Project.launchConfigurations = launchConfigurations;
					this.launchCommands = [];
					ProjectCommands.updateProjectNavCommands(this.treeRoot, launchConfigurations, this.commandRegistry, this.projectClient, this.fileClient);
					for(var i=0; i<launchConfigurations.length; i++){
						var launchCommand = "orion.launchConfiguration.deploy." + launchConfigurations[i].ServiceId + launchConfigurations[i].Name;
						this.launchCommands.push(launchCommand);
						this.commandRegistry.registerCommandContribution(this.additionalNavActionsScope, launchCommand, i+1, "orion.deployNavGroup/orion.deployLaunchConfigurationGroup"); //$NON-NLS-1$ //$NON-NLS-0$
					}
					CommonNavExplorer.prototype.updateCommands.apply(this, selections);					
				}
				
				this.projectClient.getProjectLaunchConfigurations(this.treeRoot.Project).then(function(launchConfigurations){
					doUpdateForLaunchConfigurations.apply(this, [launchConfigurations, selections]);
					if(!this.launchConfigurationListener){
						var _self = this;
						this.launchConfigurationDispatcher = ProjectCommands.getLaunchConfigurationDispatcher();
						this.launchConfigurationListener = function(event){
							_self.selection.getSelections(function(selections){
								if(event.oldValue){
									for(var i=0; i<_self.treeRoot.Project.launchConfigurations.length; i++){
										var lConf = _self.treeRoot.Project.launchConfigurations[i];
										if(lConf.Name === event.oldValue.Name && lConf.ServiceId === event.oldValue.ServiceId){
											if(event.newValue){
												_self.treeRoot.Project.launchConfigurations[i] = event.newValue;
												doUpdateForLaunchConfigurations.apply(_self, [_self.treeRoot.Project.launchConfigurations, selections]);
												return;
											}
											_self.treeRoot.Project.launchConfigurations[i].splice(i, 1);
											break;
										}
									}
								}
								if(event.newValue){
									_self.treeRoot.Project.launchConfigurations.push(event.newValue);
								}
								doUpdateForLaunchConfigurations.apply(_self, [_self.treeRoot.Project.launchConfigurations]);
							});
						};
						this._launchConfigurationEventTypes = ["create", "delete"];
						this._launchConfigurationEventTypes.forEach(function(eventType) {
							_self.launchConfigurationDispatcher.addEventListener(eventType, _self.launchConfigurationListener);
						});
					}
					
				}.bind(this), function(error){
					console.error(error);
					CommonNavExplorer.prototype.updateCommands.apply(this, selections);
				}.bind(this));
			} else {
				CommonNavExplorer.prototype.updateCommands.apply(this, selections);
			}
		},
		scopeUp: function() {
			var input = PageUtil.matchResourceParameters();
			var resource = input.resource;
			delete input.navigate;
			delete input.resource;
			window.location.href = uriTemplate.expand({resource: resource, params: input});
			this.sidebar.setViewMode("nav"); //$NON-NLS-0$
		},
		changedItem: function(item, forceExpand){
			if(!item || !this.model){
				return this.display(this.fileMetadata, true);
			}
			if(item.Projects){
				return new Deferred().resolve();
			}
			return CommonNavExplorer.prototype.changedItem.call(this, item, forceExpand);
		},
		destroy: function(){
			if(this.launchCommands){
				for(var i=0; i<this.launchCommands.length; i++){
					this.commandRegistry.unregisterCommandContribution(this.additionalNavActionsScope, this.launchCommands[i], "orion.deployNavGroup/orion.deployLaunchConfigurationGroup");
				}
			}
			var _self = this;
			this._dependenciesEventTypes.forEach(function(eventType) {
				_self.dependenciesDisplatcher.removeEventListener(eventType, _self.dependneciesListener);
			});
			if(_self.launchConfigurationListener){
				this._launchConfigurationEventTypes.forEach(function(eventType) {
					_self.launchConfigurationDispatcher.removeEventListener(eventType, _self.launchConfigurationListener);
				});
			}
			CommonNavExplorer.prototype.destroy.call(this);
		}
	});

	function ProjectNavRenderer() {
		CommonNavRenderer.apply(this, arguments);
	}
	ProjectNavRenderer.prototype = Object.create(CommonNavRenderer.prototype);
	objects.mixin(ProjectNavRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var col = CommonNavRenderer.prototype.getCellElement.call(this, col_no, item, tableRow);
			if((item.Dependency || item.type==="ProjectRoot") && col_no===0){ //$NON-NLS-0$
				col.className = item.type==="ProjectRoot" ? "projectNavColumn projectPrimaryNavColumn" : "projectNavColumn"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				var span = lib.$(".mainNavColumn", col); //$NON-NLS-0$
				span.classList.add("projectInformationNode"); //$NON-NLS-0$
				var nameText = item.Dependency ? item.Dependency.Name : (item.Project ? item.Project.Name : item.Name);
				var itemNode = lib.$("a", col); //$NON-NLS-0$
				if(item.disconnected){
					nameText += " " + messages.disconnected; //$NON-NLS-0$
					itemNode.removeAttribute("href"); //$NON-NLS-0$
				}
				lib.empty(itemNode);
				itemNode.appendChild(document.createTextNode(nameText));

				if(item.Dependency){
					var actions = document.createElement("span"); //$NON-NLS-0$
					actions.className = "mainNavColumn"; //$NON-NLS-0$
					actions.style.cssFloat = "right"; //$NON-NLS-0$
					this.explorer.commandRegistry.renderCommands("dependencyCommands", actions, item, this, "tool"); //$NON-NLS-1$ //$NON-NLS-0$
					col.appendChild(actions);
				}
				return col;
			}
			return col;
		}
	});
	
	/**
	 * @name orion.sidebar.ProjectNavViewMode
	 * @class
	 */
	function ProjectNavViewMode(params) {
		this.commandRegistry = params.commandRegistry;
		this.contentTypeRegistry = params.contentTypeRegistry;
		this.fileClient = params.fileClient;
		this.editorInputManager = params.editorInputManager;
		this.parentNode = params.parentNode;
		this.sidebarNavInputManager = params.sidebarNavInputManager;
		this.toolbarNode = params.toolbarNode;
		this.serviceRegistry = params.serviceRegistry;
		this.projectClient = this.serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
		this.sidebar = params.sidebar;
		this.explorer = null;
		var _self = this;
		var sidebar = this.sidebar;
		// Switch to project view mode if a project is opened
		function openProject(metadata){
			if (metadata && metadata.Directory && sidebar.getActiveViewModeId() !== _self.id) {
				_self.getProjectJson(metadata).then(function(json) {
					if (json) {
						_self.project = metadata;
						_self.showViewMode(true);
						sidebar.setViewMode(_self.id);
					}
				});
			}
		}
		this.editorInputManager.addEventListener("InputChanged", function(event) { //$NON-NLS-0$
			openProject(event.metadata);
		});
		this.sidebarNavInputManager.addEventListener("linkClick", function(event){ //$NON-NLS-0$
			openProject(event.item);
		});
		// Only show project view mode if selection is in a project
		this.sidebarNavInputManager.addEventListener("selectionChanged", function(event){ //$NON-NLS-0$
			if (sidebar.getActiveViewModeId() === _self.id) { return; }
			_self.project = null;
			var item = event.selections && event.selections.length > 0 ? event.selections[0] : null;
			if (item) {
				while (item.parent && item.parent.parent) {
					item = item.parent;
				}
				_self.getProjectJson(item).then(function(json) {
					_self.project = item;
					_self.showViewMode(!!json);
				});
			} else {
				_self.showViewMode(false);
			}
		});
	}
	objects.mixin(ProjectNavViewMode.prototype, {
		label: messages["Project"],
		id: "project", //$NON-NLS-0$
		create: function() {
			var _self = this;
			this.explorer = new ProjectNavExplorer({
				commandRegistry: this.commandRegistry,
				fileClient: this.fileClient,
				editorInputManager: this.editorInputManager,
				sidebarNavInputManager: this.sidebarNavInputManager,
				parentId: this.parentNode.id,
				projectClient: this.projectClient,
				rendererFactory: function(explorer) {
					return new ProjectNavRenderer({
						checkbox: false,
						cachePrefix: "ProjectNav" //$NON-NLS-0$
					}, explorer, _self.commandRegistry, _self.contentTypeRegistry);
				},
				serviceRegistry: this.serviceRegistry,
				toolbarNode: this.toolbarNode,
				sidebar: this.sidebar
			});
			this.explorer.display(this.project);
			window.location.href = uriTemplate.expand({resource: this.project.Location});
		},
		destroy: function() {
			if (this.explorer) {
				this.explorer.destroy();
			}
			this.explorer = null;
		},
		getProjectJson: function(metadata) {
			function getJson(children) {
				for(var i=0; i<children.length; i++){
					if(!children[i].Directory && children[i].Name === "project.json"){ //$NON-NLS-0$
						return children[i];
					}
				}
				return null;
			}
			var deferred = new Deferred();
			if (metadata.Children){
				deferred.resolve(getJson(metadata.Children));
			} else if(metadata.ChildrenLocation){
				this.fileClient.fetchChildren(metadata.ChildrenLocation).then(function(children){
					deferred.resolve(getJson(children));
				});
			}
			return deferred;
		},
		showViewMode: function(show) {
			var sidebar = this.sidebar;
			var showing = !!sidebar.getViewMode(this.id);
			if (showing === show) { return; }
			if (show) {
				sidebar.addViewMode(this.id, this);
				sidebar.renderViewModeMenu();
			} else {
				sidebar.removeViewMode(this.id);
				sidebar.renderViewModeMenu();
			}
		}
	});

	return ProjectNavViewMode;
});
