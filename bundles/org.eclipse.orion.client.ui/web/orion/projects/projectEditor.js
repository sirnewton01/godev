/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*eslint-env browser, amd*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/i18nUtil',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/Deferred',
	'orion/objects',
	'orion/projectCommands',
	'orion/PageLinks',
	'orion/explorers/explorer',
	'orion/section',
	'orion/webui/tooltip'
], function(messages, i18nUtil, URITemplate, lib, Deferred, objects, mProjectCommands, PageLinks, mExplorer, mSection, mTooltip) {
	
	var editTemplate = new URITemplate("./edit.html#{,resource,params*}");
	
	function ProjectInfoModel(project){
		this.root = project;
	}
	
	ProjectInfoModel.prototype = new mExplorer.ExplorerModel();
	ProjectInfoModel.prototype.constructor = ProjectInfoModel;
	
	ProjectInfoModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};
	
	ProjectInfoModel.prototype.getChildren = function(parent, onComplete){
		if(parent === this.root){
			onComplete([
				{id: "Name", displayName: messages.Name, value: parent.Name, no: 1},
				{id: "Description", displayName: messages.Description, value: parent.Description, no: 2},
				{id: "Url", displayName: messages.Site, value: parent.Url, href: parent.Url, no: 3}
				]);
		} else {
			onComplete([]);
		}
	};
	
	ProjectInfoModel.prototype.getId = function(item){
		return "ProjectInfo" + item.id;
	};
	
	function ProjectInfoRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
	}
	
	ProjectInfoRenderer.prototype = new mExplorer.SelectionRenderer();
	ProjectInfoRenderer.prototype.constructor = ProjectInfoRenderer;
	
	ProjectInfoRenderer.prototype.getCellHeaderElement = function(col_no){
	};
	
	ProjectInfoRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if(col_no===0) {
			var td = document.createElement("td");
			var b = document.createElement("span");
			b.className = "discreetInputLabel";
			b.appendChild(document.createTextNode(item.displayName));
			td.classList.add("discreetInputLabel");
			td.appendChild(b);
			td.width = "20%";
			return td;
		}
		if(col_no===1){
			var td;
			if(item.href){
				td = document.createElement("td");
				td.style.verticalAlign = "top";
				
				var urlInput = document.createElement("input");
				urlInput.style.visibility = "hidden";
				
				var urlSelector = document.createElement("div");
				urlSelector.style.marginTop = "-15px";
				urlSelector.title = messages.ClickEditLabel;
				urlSelector.className = "discreetInput";
				urlSelector.tabIndex = item.no;	//this is the same as the urlInput's tab index but they will never be visible at the same time
				
				var urlLink = document.createElement("a");
				urlLink.href = item.value || "";
				urlLink.appendChild(document.createTextNode(item.value || ""));
				urlLink.tabIndex = item.no+1;
							
				urlSelector.appendChild(urlLink);
				urlSelector.title = "Click to edit";
		
				//show url input, hide selector
				urlSelector.onclick = function (event){
					urlSelector.style.visibility = "hidden";
					urlLink.style.visibility = "hidden";
					urlInput.style.visibility = "";
					urlInput.focus();
				}.bind(this.projectEditor);
				
				//make the url editable when the selector gains focus
				urlSelector.onfocus = urlSelector.onclick;
				
				//Make pressing "Enter" on the selector do the same think as clicking it
				urlSelector.onkeyup = function(event){
					if(event.keyCode === lib.KEY.ENTER){
						urlSelector.onclick(event);
					}
				}.bind(this.projectEditor);
				
				urlLink.urlSelector = urlSelector; //refer to selector to be able to make it visible from within _renderEditableFields
				
				this.projectEditor._renderEditableFields(urlInput, item.id, item.no, urlLink);
				td.appendChild(urlInput);
				td.appendChild(urlSelector);
				return td;
			}
			td = document.createElement("td");
			td.style.verticalAlign = "top";
			var input = item.id==="Description" ? document.createElement("textArea") : document.createElement("input");
			this.projectEditor._renderEditableFields(input, item.id, item.no, null);
			td.appendChild(input);
			return td;
		}

	};
	
	
	function AdditionalInfoModel(project){
		this.root = project;
	}
	
	AdditionalInfoModel.prototype = new mExplorer.ExplorerModel();
	AdditionalInfoModel.prototype.constructor = AdditionalInfoModel;
	
	AdditionalInfoModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};
	
	AdditionalInfoModel.prototype.getChildren = function(parent, onComplete){
		if(parent === this.root){
			for(var i=0; i<parent.Children.length; i++){
				parent.Children[i].parent = parent;
			}
			onComplete(parent.Children);
		} else {
			onComplete([]);
		}
	};
	
	AdditionalInfoModel.prototype.getId = function(item){
		return "AdditionalInfo" + mExplorer.ExplorerModel.prototype.getId.call(this, {Location: item.parent.Name + item.Name});
	};
	
	function AdditionalInfoRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
	}
	
	AdditionalInfoRenderer.prototype = new mExplorer.SelectionRenderer();
	AdditionalInfoRenderer.prototype.constructor = AdditionalInfoRenderer;
	
	AdditionalInfoRenderer.prototype.getCellHeaderElement = function(col_no){
		if(col_no===0){
			var td = document.createElement("td");
			td.colSpan = 2;
			td.appendChild(document.createTextNode(this.explorer.model.root.Name));
			return td;
		}
	};
	
	AdditionalInfoRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if(col_no===0) {
			var td = document.createElement("td");
			var b = document.createElement("span");
			b.className = "discreetInputLabel";
			b.appendChild(document.createTextNode(item.Name));
			td.classList.add("discreetInputLabel");
			td.appendChild(b);
			td.width = "20%";
			return td;
		}
		if(col_no===1){
			var td = document.createElement("td");
			if(item.Href){
				var a = document.createElement("a");
				var uriTemplate = new URITemplate(item.Href);
				a.href = uriTemplate.expand({OrionHome : PageLinks.getOrionHome()});
				a.appendChild(document.createTextNode(item.Value || " "));
				td.appendChild(a);
			} else {
				td.appendChild(document.createTextNode(item.Value || " "));
			}
			return td;
		}

	};	
	
	function DependenciesModel(project, projectClient){
		this.root = project;
		this.projectClient = projectClient;
	}
	
	DependenciesModel.prototype = new mExplorer.ExplorerModel();
	DependenciesModel.prototype.constructor = DependenciesModel;
	
	DependenciesModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};
	
	DependenciesModel.prototype.getChildren = function(parentItem, onComplete){
		if(parentItem === this.root){
			var children = [];
			Deferred.all((parentItem.Dependencies || []).map(function(dependency) {
				var item = {Dependency: dependency, Project: parentItem};
				children.push(item);
				return this.projectClient.getDependencyFileMetadata(dependency, parentItem.WorkspaceLocation).then(function(dependencyMetadata) {
					objects.mixin(item, dependencyMetadata);
				}, function(error) {
					item.Directory = item.disconnected = true;
				});
			}.bind(this))).then(function() {
				onComplete(children);
			}.bind(this));
			
		} else {
			onComplete([]);
		}
	};
	
	DependenciesModel.prototype.getId = function(item){
		return mExplorer.ExplorerModel.prototype.getId.call(this, item.Dependency);
	};
	
	function DependenciesRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
		this.commandService = options.commandRegistry;
		this.actionScopeId = options.actionScopeId;
	}
	
	DependenciesRenderer.prototype = new mExplorer.SelectionRenderer();
	DependenciesRenderer.prototype.constructor = DependenciesRenderer;
	
	DependenciesRenderer.prototype.getCellHeaderElement = function(col_no){
	};
	
	DependenciesRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if(col_no===0) {
			var td = document.createElement("td");
			
			if(item.Location){
				td.className = "navColumnNoIcon";
				var a = document.createElement("a");
				a.href = editTemplate.expand({resource: item.Location}); //$NON-NLS-0$
				a.appendChild(document.createTextNode(item.Dependency.Name));
				td.appendChild(a);
			} else {
				var name = item.Dependency.Name;
				if(item.disconnected){
					name = i18nUtil.format(messages.Disconnected, name);
				}
				td.appendChild(document.createTextNode(name));
			}
			return td;
		}
		if(col_no===1){
			var actionsColumn = this.getActionsColumn(item, tableRow, null, null, true);
		actionsColumn.style.textAlign = "right";
		return actionsColumn;
		}

	};
	
	function LaunchConfigurationModel(project, launchConfigurations, projectClient){
		this.root = project;
		this.launchConfigurations = launchConfigurations;
		this.projectClient = projectClient;
	}
	
	LaunchConfigurationModel.prototype = new mExplorer.ExplorerModel();
	LaunchConfigurationModel.prototype.constructor = LaunchConfigurationModel;
	
	LaunchConfigurationModel.prototype.getRoot = function(onItem){
		return onItem(this.root);
	};
	
	LaunchConfigurationModel.prototype.getChildren = function(parent, onComplete){
		if(parent === this.root){
			if(this.launchConfigurations){
				for(var i=0; i<this.launchConfigurations.length; i++){
					this.launchConfigurations[i].project = parent;
				}
				this.root.children = this.launchConfigurations;
				onComplete(this.launchConfigurations);
			} else {
				this.projectClient.getProjectLaunchConfigurations(parent).then(function(launchConfs){
						for(var i=0; i<launchConfs.length; i++){
							launchConfs[i].project = parent;
						}
						parent.children = launchConfs;
						onComplete(launchConfs);
					}
				);
			}
		} else {
			//TODO we may want to display some more properties
			onComplete([]);
		}
	};
	
	LaunchConfigurationModel.prototype.getId = function(item){
		return "LaunchConfiguration" + mExplorer.ExplorerModel.prototype.getId.call(this, {Location: item.Name});
	};

	function LaunchConfigurationRenderer(options, projectEditor, explorer){
		this._init(options);
		this.projectEditor = projectEditor;
		this.explorer = explorer;
		this.commandService = options.commandRegistry;
		this.actionScopeId = options.actionScopeId;
		this.projectClient = options.projectClient;
		this.emptyMessage = options.emptyMessage;
	}
	
	LaunchConfigurationRenderer.prototype = new mExplorer.SelectionRenderer();
	LaunchConfigurationRenderer.prototype.constructor = LaunchConfigurationRenderer;
	
	LaunchConfigurationRenderer.prototype.emptyCallback = function(bodyElement) {
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		var emptyMessage = document.createElement("div");
		emptyMessage.classList.add("noFile");
		emptyMessage.textContent = this.emptyMessage || "No project deployment information";
		td.appendChild(emptyMessage);
		tr.appendChild(td);
		bodyElement.appendChild(tr);
	};
	
	LaunchConfigurationRenderer.prototype.getCellHeaderElement = function(col_no){
	};
	
	LaunchConfigurationRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if(col_no===0) {
			var td = document.createElement("td");
			
			if(item.Name){
				td.className = "secondaryColumnLeft";
				td.appendChild(document.createTextNode(item.Name));
			}
			return td;
		}
		if(col_no===1){
			var td = document.createElement("td");
			if(tableRow.urlTooltip){
				tableRow.urlTooltip.destroy();
				delete tableRow.urlTooltip;
			}
			if(item.Url){
				var a = document.createElement("a");
				a.target = "_new";
				a.href = item.Url.indexOf("://")<0 ? "http://" + item.Url : item.Url;
				tableRow.urlTooltip = new mTooltip.Tooltip({
					node: a,
					text: item.Url,
					position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				});
				a.appendChild(document.createTextNode(item.Url || item.Params.Name || "View App"));
				td.appendChild(a);
			}
			return td;
		}
		if(col_no===2){
			var td = document.createElement("td");
			if(item.ServiceId){
				this.projectClient.getProjectDelpoyService(item.ServiceId, item.Type).then(function(service){
					if(!service){
						return;
					}
					if(service.getLogLocationTemplate){
						service.getLogLocationTemplate(item).then(function(template){
							if(!template){
								return;
							}
						var a = document.createElement("a");
						a.target = "_new";
						var uriTemplate = new URITemplate(template);
						var params = objects.clone(item.Params);
						objects.mixin(params, {OrionHome : PageLinks.getOrionHome()});
						a.href = uriTemplate.expand(params);
						a.appendChild(document.createTextNode("Logs"));
						td.appendChild(a);							
						});
					} else if(service.logLocationTemplate){
						var a = document.createElement("a");
						a.target = "_new";
						var uriTemplate = new URITemplate(service.logLocationTemplate);
						var params = objects.clone(item.Params);
						objects.mixin(params, {OrionHome : PageLinks.getOrionHome()});
						a.href = uriTemplate.expand(params);
						a.appendChild(document.createTextNode("Logs"));
						td.appendChild(a);
					}
				});
			}
			return td;
		}
		if(col_no===3){
			var td = document.createElement("td");
			td.classList.add("secondaryColumnRight");
			if(item.status && item.status.CheckState === true){
				delete item.status;
			} else if(item.status){
				if(tableRow.statusTooltip){
					tableRow.statusTooltip.destroy();
					delete tableRow.statusTooltip;
				}
				if(item.status.error && item.status.error.Retry){
					item.parametersRequested = item.status.error.Retry.parameters;
					item.optionalParameters = item.status.error.Retry.optionalParameters;
					return this.getActionsColumn(item, tableRow, null, "secondaryColumnRight", true);
				} else if(item.status.error){
					var span = document.createElement("span");
					span.appendChild(document.createTextNode("Error"));
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: item.status.error.Message,
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				} else if(item.status.State === "STARTED"){
					var span = document.createElement("span");
					span.className = "imageSprite core-sprite-applicationrunning";
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: item.status.Message || "Started",
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				} else if(item.status.State==="STOPPED"){
					var span = document.createElement("span");
					span.className = "imageSprite core-sprite-applicationstopped";
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: item.status.Message || "Stopped",
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				} else if(item.status.State==="NOT_DEPLOYED"){
					var span = document.createElement("span");
					span.className = "imageSprite core-sprite-applicationnotdeployed";
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: item.status.Message || "Not deployed",
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				} else if(item.status.State==="PROGRESS"){
					var span = document.createElement("span");
					span.className = "imageSprite core-sprite-progress";
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: "Checking application state",
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				} else {
					var span = document.createElement("span");
					span.appendChild(document.createTextNode("State unknown"));
					tableRow.statusTooltip = new mTooltip.Tooltip({
						node: span,
						text: item.status.Message,
						position: ['right', 'above', 'below', 'left'] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
					td.appendChild(span);
					return td;
				}
			}
			if(item.ServiceId){
				this.projectClient.getProjectDelpoyService(item.ServiceId, item.Type).then(function(service){
					if(service && service.getState){
						item.status = {State: "PROGRESS"};
						td.innerHTML = this.getCellElement(col_no, item, tableRow).innerHTML;
					
						service.getState(item.Params).then(function(result){
							item.status = result;
							var newTd = this.getCellElement(col_no, item, tableRow);
							for(var i=0; i<td.classList.length; i++){
								newTd.classList.toggle(td.classList[i], true);
							}
							var oldLogsColumn = td.previousSibling;
							tableRow.replaceChild(newTd, td);
							var newLogsColumn = this.getCellElement(col_no-1, item, tableRow);
							for(var i=0; i<oldLogsColumn.classList.length; i++){
								newLogsColumn.classList.toggle(oldLogsColumn.classList[i], true);
							}
							tableRow.replaceChild(newLogsColumn, oldLogsColumn);
							return;
						}.bind(this), function(error){
							item.status = {error: error};
							var newTd = this.getCellElement(col_no, item, tableRow);
							for(var i=0; i<td.classList.length; i++){
								newTd.classList.toggle(td.classList[i], true);
							}
							var oldLogsColumn = td.previousSibling;
							tableRow.replaceChild(newTd, td);
							var newLogsColumn = this.getCellElement(col_no-1, item, tableRow);
							for(var i=0; i<oldLogsColumn.classList.length; i++){
								newLogsColumn.classList.toggle(oldLogsColumn.classList[i], true);
							}
							tableRow.replaceChild(newLogsColumn, oldLogsColumn);
							return;
						}.bind(this));
					} else {
						td.appendChild(document.createTextNode("State unknown"));
					}
				}.bind(this));
			}
			return td;
		}

	};
	
	function LaunchConfigurationExplorer(serviceRegistry, selection, renderer, commandRegistry, launchConfigurationActions){
		mExplorer.Explorer.apply(this, arguments);
		this.actionScopeId = launchConfigurationActions;
		this.selectionActions = "LaunchConfigurationExplorerSelectionActions";
		this.actionsSections = [this.selectionActions];
	}
	
	LaunchConfigurationExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	
	objects.mixin(LaunchConfigurationExplorer.prototype, /** @lends orion.Explorer.prototype */ {
		registerCommands: function(){
			this.commandService.registerCommandContribution(this.selectionActions, "orion.launchConfiguration.manage", 1);
			this.commandService.registerCommandContribution(this.selectionActions, "orion.launchConfiguration.deploy", 2);
			this.commandService.registerCommandContribution(this.selectionActions, "orion.launchConfiguration.startApp", 3);
			this.commandService.registerCommandContribution(this.selectionActions, "orion.launchConfiguration.stopApp", 4);
		},
		updateCommands: function(selections){
			this.selectionActionsNode = lib.node(this.selectionActions);
			lib.empty(this.selectionActionsNode);
			this.commandService.renderCommands(this.selectionActions, this.selectionActionsNode, selections, this, "tool");
			lib.$$array(".commandLink", this.selectionActionsNode).forEach(function(node, i) {
				//There is no way to render commands with target, so setting after rendering
				node.target = "_new";
			});
		},
		load: function(parent, project, configurations, projectClient){
			this.createTree(parent, new LaunchConfigurationModel(project, configurations, projectClient),  {indent: '8px'});
			this.loaded();
		},
		constructor: LaunchConfigurationExplorer
	});
	
	function ProjectEditor(options){
		this.serviceRegistry = options.serviceRegistry;
		this.fileClient = options.fileClient;
		this.progress = options.progress;
		this.preferences = options.preferences;
		this.projectClient = this.serviceRegistry.getService("orion.project.client");
		this.commandRegistry = options.commandRegistry;
		this._node = null;
		this.dependencyActions = "dependencyActions";
		this.launchConfigurationActions = "launchConfigurationsActions";
		this.createCommands();
	}
	ProjectEditor.prototype = {
		createCommands: function(){
			this.launchConfigurationDispatcher = mProjectCommands.getLaunchConfigurationDispatcher();
			this.dependenciesDisplatcher = mProjectCommands.getDependencyDispatcher();
			var _self = this;
			this.launchConfigurationListener = function(event){_self.launchConfigurationChanged.call(_self, event);};
			this._launchConfigurationEventTypes = ["create", "delete", "changeState", "deleteAll"];
			this._launchConfigurationEventTypes.forEach(function(eventType) {
				_self.launchConfigurationDispatcher.addEventListener(eventType, _self.launchConfigurationListener);
			});
			
			this.dependneciesListener = function(event){_self.dependenciesChanged.call(_self, event);};
			this._dependenciesEventTypes = ["create", "delete"];
			this._dependenciesEventTypes.forEach(function(eventType) {
				_self.dependenciesDisplatcher.addEventListener(eventType, _self.dependneciesListener);
			});

			
//			mProjectCommands.createDependencyCommands(this.serviceRegistry, this.commandRegistry, this.fileClient, this.projectClient);
//			var dependencyTypes = this.projectClient.getProjectHandlerTypes();
			this.commandRegistry.registerCommandContribution(this.dependencyActions, "orion.project.dependency.connect", 1); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandRegistry.registerCommandContribution(this.dependencyActions, "orion.project.dependency.disconnect", 2); //$NON-NLS-0$
			this.commandRegistry.registerCommandContribution(this.launchConfigurationActions, "orion.launchConfiguration.checkStatus", 1);
			
			
		},
		changedItem: function(item){
			this.fileClient.read(this.parentFolder.Location, true).then(function(metadata){
				lib.empty(this.node);
				this.displayContents(this.node, metadata);
			}.bind(this));
		},
		display: function(node, projectData){
			this.node = node;
			this.node.className = "orionProject";				
			this.projectData = projectData;
			
			function renderSections(sectionsOrder, sectionNames, emptyMessages){
				sectionNames = sectionNames || {};
				sectionsOrder.forEach(function(sectionName){
					var span;
					switch (sectionName) {
						case "projectInfo":
							span = document.createElement("span");
							this.node.appendChild(span);
							this.renderProjectInfo(span, sectionNames[sectionName], emptyMessages[sectionName]);
							break;
						case "additionalInfo":
							span = document.createElement("span");
							this.node.appendChild(span);
							this.renderAdditionalProjectProperties(span);
							break;
						case "deployment":
							span = document.createElement("span");
							this.node.appendChild(span);
							this.renderLaunchConfigurations(span, null, sectionNames[sectionName], emptyMessages[sectionName]);
							break;
						case "dependencies":
							span = document.createElement("span");
							span.id = "projectDependenciesNode";
							this.node.appendChild(span);
							this.renderDependencies(span, sectionNames[sectionName], emptyMessages[sectionName]);
							break;
					}
				}.bind(this));
		}
			
			var sectionsOrder = ["projectInfo", "additionalInfo", "deployment", "dependencies"];
			this.preferences.getPreferences("/sectionsOrder").then(function(sectionsOrderPrefs){
				sectionsOrder = sectionsOrderPrefs.get("projectView") || sectionsOrder;
				var sectionsNames = sectionsOrderPrefs.get("projectViewNames") || [];
				var emptyMessages = sectionsOrderPrefs.get("emptyMessages") || [];
				renderSections.apply(this, [sectionsOrder, sectionsNames, emptyMessages]);
			}.bind(this), function(error){
				renderSections.apply(this, [sectionsOrder, {}, {}]);
				window.console.error(error);
			}.bind(this));
			
		},
		displayContents: function(node, parentFolder){
			this.parentFolder = parentFolder;
			this.projectClient.readProject(parentFolder).then(function(projectData){
				this.display.bind(this)(node, projectData);
			}.bind(this));
		},
		dependenciesChanged: function(event){
			var dependenciesNode = lib.node("projectDependenciesNode");
			if(!dependenciesNode){
				return;
			}
			if(event.project.ContentLocation === this.projectData.ContentLocation){
				if(event.type==="delete"){
					if(this.projectData.Dependencies && event.oldValue){
						for(var i=0; i<this.projectData.Dependencies.length; i++){
							if(this.projectData.Dependencies[i].Location === event.oldValue.Location){
								 this.projectData.Dependencies.splice(i, 1);
							}
						}
					}
				} else if(event.type === "create"){
					if(this.projectData.Dependencies && event.newValue){
						this.projectData.Dependencies.push(event.newValue);
					}
				}
			}
			lib.empty(dependenciesNode);
			this.renderDependencies(dependenciesNode, this.dependenciesSectionName);
		},
		_renderEditableFields: function(input, property, tabIndex, urlElement /*optional*/){	
			var saveInput = function(event) {
				var properties = {};
				properties[property] = event.target.value;
				this.progress.progress(this.projectClient.changeProjectProperties(this.projectData, properties), "Saving project " + this.projectData.Name).then(
					function(newProjectData){
						if(newProjectData){
							this.projectData = newProjectData;
							input.value = event.target.value;
							
							//behave differently for inputs associated with urls
							//hide the <input> element and show the <a> urlElement
							if(urlElement){
								lib.empty(urlElement);
								urlElement.appendChild(document.createTextNode(event.target.value) || "");
								urlElement.href = event.target.value;
								urlElement.style.visibility = "";
								if(urlElement.urlSelector){
									urlElement.urlSelector.style.visibility = "";
								}
								
								input.style.visibility = "hidden";
							}
						}
					}.bind(this)
				);
			}.bind(this);
			
			input.value = this.projectData[property] || "";
			input.title = messages.ClickEditLabel;
			input.className = "discreetInput";
			input.tabIndex = String(tabIndex);
						
			input.onkeyup = function(event){
				if(event.keyCode === lib.KEY.ENTER){
					// Excluding <textarea> because it is a multi-line input
					// which allows the user to press Enter for a new line
					if (input.tagName.toUpperCase() !== 'TEXTAREA') {
						input.blur();
					}
				}else if(event.keyCode === lib.KEY.ESCAPE){
					input.value = this.projectData[property] || ""; //restore previous value
					input.blur();
				}
			}.bind(this);
			input.onblur = function(event){
				saveInput(event);
			};
		},
		renderProjectInfo: function(parent, sectionName){
			
			var title = sectionName || messages.ProjectInfo;
			var projectInfoSection = new mSection.Section(parent, {id: "projectInfoSection", headerClass: ["sectionTreeTableHeader"], title: title, canHide: true});
			var explorerParent = document.createElement("div");
			explorerParent.id = "projectInformationNode";
			var projectInfoRenderer = new ProjectInfoRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				cachePrefix: "ProjectInfoExplorer" //$NON-NLS-0$
			}, this);
			var projectInfoExplorer = new mExplorer.Explorer(this.serviceRegistry, null, projectInfoRenderer, this.commandRegistry);
			projectInfoSection.embedExplorer(projectInfoExplorer, explorerParent);
			projectInfoExplorer.createTree(explorerParent, new ProjectInfoModel(this.projectData), {noSelection: true});
			return;
		},
		renderAdditionalProjectProperties: function(parent){
			this.projectClient.getMatchingProjectHandlers(this.parentFolder).then(function(matchingProjectHandlers){
			for(var projectHandlerIndex = 0; projectHandlerIndex<matchingProjectHandlers.length; projectHandlerIndex++){
				var projectHandler = matchingProjectHandlers[projectHandlerIndex];

				if(!projectHandler || !projectHandler.getAdditionalProjectProperties){
					continue;
				}
				this.progress.progress(projectHandler.getAdditionalProjectProperties(this.parentFolder, this.projectData), "Getting additional project information").then(function(additionalProperties){
					if(!additionalProperties || !additionalProperties.length || additionalProperties.length === 0){
						return;
					}
					for(var i=0; i<additionalProperties.length; i++){
						var cat = additionalProperties[i];
						if(!cat.Name){
							continue;
						}
						var addotopnalInfoSection = new mSection.Section(parent, {id: cat.Name + "Section", headerClass: ["sectionTreeTableHeader"], title: cat.Name, canHide: true});
						var explorerParent = document.createElement("div");
						var additionalInfoRenderer = new AdditionalInfoRenderer({
							treeTableClass: "sectionTreeTable",
							checkbox: false
						}, this);
						var additionalInfoExplorer = new mExplorer.Explorer(this.serviceRegistry, null, additionalInfoRenderer, this.commandRegistry);
						addotopnalInfoSection.embedExplorer(additionalInfoExplorer, explorerParent);
						additionalInfoExplorer.createTree(explorerParent, new AdditionalInfoModel(cat),  {noSelection: true});
					}
				}.bind(this));
			}
			}.bind(this));
		},
		renderDependencies: function(parent, sectionName){
			
			if(!this.projectData.Dependencies || this.projectData.Dependencies.length===0){
				return;
			}
			
			this.dependenciesSectionName = sectionName || "Associated Content";
			
			var dependenciesSection = new mSection.Section(parent, {id: "projectDependenciesSection", headerClass: ["sectionTreeTableHeader"], title: this.dependenciesSectionName, canHide: true});
			var dependenciesParent = document.createElement("div");
			dependenciesParent.id = "dependenciesNode";
			var dependenciesRenderer = new DependenciesRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				commandRegistry: this.commandRegistry,
				actionScopeId:  this.dependencyActions
			}, this);
			var dependenciesExplorer = new mExplorer.Explorer(this.serviceRegistry, null, dependenciesRenderer, this.commandRegistry);
			dependenciesExplorer.actionScopeId = this.dependencyActions;
			dependenciesSection.embedExplorer(dependenciesExplorer, dependenciesParent);
			dependenciesExplorer.createTree(dependenciesParent, new DependenciesModel(this.projectData, this.projectClient),  {indent: '8px', noSelection: true});
			
		},
		renderLaunchConfigurations: function(parent, configurations, sectionName, emptyMessage){
			this.configurationsParent = parent;
			this.configurationsEmptyMessage = emptyMessage;
			
			if(emptyMessage || (configurations && configurations.length > 0)){
				lib.empty(this.configurationsParent);
				this.launchCofunctionSectionsTitle = sectionName || messages.DeployInfo;
				var launchConfigurationSection = new mSection.Section(parent, {id: "projectLaunchConfigurationSection", headerClass: ["sectionTreeTableHeader"], title: this.launchCofunctionSectionsTitle, canHide: true});
				var launchConfigurationParent = document.createElement("div");
				launchConfigurationParent.id = "launchConfigurationsNode";
			}
			
			if(!configurations){
				var progressMonitor;
				if(launchConfigurationSection){
					progressMonitor = launchConfigurationSection.createProgressMonitor();
					progressMonitor.begin("Loading...");
				}
				this.projectClient.getProjectLaunchConfigurations(this.projectData).then(function(configurations){
					if(progressMonitor){
						progressMonitor.done();
					}
					this.configurations = configurations;
					if(!emptyMessage && (!configurations || configurations.length === 0)){
						return;
					}
					this.renderLaunchConfigurations(parent, configurations, sectionName, emptyMessage);
				}.bind(this));
				return;
			}
			
			//Destroy tooptips for app status
			if(lib.$(".sectionTreeTable", this.configurationsParent) || lib.$(".treetable", this.configurationsParent)) { //$NON-NLS-1$ //$NON-NLS-0$
				lib.$$array(".treeTableRow", this.configurationsParent).forEach(function(tableRow, i) { //$NON-NLS-0$
					if(tableRow.statusTooltip){
						tableRow.statusTooltip.destroy();
						delete tableRow.statusTooltip;
					}
					if(tableRow.urlTooltip){
						tableRow.urlTooltip.destroy();
						delete tableRow.urlTooltip;
					}
				});
			}
			
			var launchConfigurationRenderer = new LaunchConfigurationRenderer({
				checkbox: false,
				treeTableClass: "sectionTreeTable",
				commandRegistry: this.commandRegistry,
				actionScopeId:  this.launchConfigurationActions,
				projectClient: this.projectClient,
				emptyMessage: emptyMessage
			}, this);
			var launchConfigurationExplorer = new LaunchConfigurationExplorer(this.serviceRegistry, null, launchConfigurationRenderer, this.commandRegistry, this.launchConfigurationActions);
			launchConfigurationSection.embedExplorer(launchConfigurationExplorer, launchConfigurationParent);
			launchConfigurationExplorer.load(launchConfigurationParent, this.projectData, configurations, this.projectClient);
		},
		launchConfigurationChanged: function(event){
			if(!this.configurations){
				return;
			}
			if((event.type === "create" || event.type === "changeState") && event.newValue){
				for(var i=0; i<this.configurations.length; i++){
					var configuration = this.configurations[i];
					if(configuration.Name === event.newValue.Name && configuration.ServiceId === event.newValue.ServiceId){
						this.configurations[i] = event.newValue;
						this.renderLaunchConfigurations(this.configurationsParent, this.configurations, this.launchCofunctionSectionsTitle, this.configurationsEmptyMessage);
						return;
					}
				}
				if(event.type === "create"){
					this.configurations.push(event.newValue);
					this.renderLaunchConfigurations(this.configurationsParent, this.configurations, this.launchCofunctionSectionsTitle, this.configurationsEmptyMessage);
					return;
				}
			} else if(event.type === "delete"){
				if(!event.oldValue){
					return;
				}
				for(var i=0; i<this.configurations.length; i++){
					var configuration = this.configurations[i];
					if((configuration.Name === event.oldValue.Name && configuration.ServiceId === event.oldValue.ServiceId) || (configuration.File && event.oldValue.File && (configuration.File.Location === event.oldValue.File.Location))){
						this.configurations.splice(i, 1);
						this.renderLaunchConfigurations(this.configurationsParent, this.configurations, this.launchCofunctionSectionsTitle, this.configurationsEmptyMessage);
						return;
					}
				}
			} else if(event.type === "deleteAll"){
				for(var i=this.configurations.length-1; i>=0; i--){
					var configuration = this.configurations[i];
					if(configuration.File){
						this.configurations.splice(i, 1);
					}
				}
				this.renderLaunchConfigurations(this.configurationsParent, this.configurations, this.launchCofunctionSectionsTitle, this.configurationsEmptyMessage);
			}
		},
		destroy: function(){
			var _self = this;
			this._launchConfigurationEventTypes.forEach(function(eventType) {
					_self.launchConfigurationDispatcher.removeEventListener(eventType, _self.launchConfigurationListener);
				});
			this._dependenciesEventTypes.forEach(function(eventType) {
					_self.dependenciesDisplatcher.removeEventListener(eventType, _self.dependneciesListener);
				});
		}
	};
	
	return {ProjectEditor: ProjectEditor};
});
