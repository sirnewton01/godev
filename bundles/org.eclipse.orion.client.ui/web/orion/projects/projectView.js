/*******************************************************************************
 * Copyright (c) 2013, 2014 IBM Corporation and others.
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
    'orion/projects/projectExplorer',
	'orion/selection',
	'orion/URITemplate',
	'orion/fileCommands'
], function(messages, mProjectExplorer, Selection, URITemplate, FileCommands) {
	
		var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	
		function ProjectView(options){
			this.progress = options.progress;
			this.fileClient = options.fileClient;
			this.serviceRegistry = options.serviceRegistry;
			this.commandRegistry = options.commandRegistry;
			this.projectClient = this.serviceRegistry.getService("orion.project.client"); //$NON-NLS-0$
			this.modelEventDispatcher = FileCommands.getModelEventDispatcher();
			var _self = this;
			this.modelListener = function(event){_self.changedItemEvent.call(_self, event);};
			this._eventTypes = ["copy", "create", "delete", "import", //$NON-NLS-5$//$NON-NLS-4$//$NON-NLS-3$//$NON-NLS-2$//$NON-NLS-1$//$NON-NLS-0$
		 		"move"];
			this._eventTypes.forEach(function(eventType) { //$NON-NLS-1$//$NON-NLS-0$
				_self.modelEventDispatcher.addEventListener(eventType, _self.modelListener);
			});
		}
		ProjectView.prototype = {
			display: function(workspace, parent){
				parent.classList.add("orionProject"); //$NON-NLS-0$
				this.projectExplorer = new mProjectExplorer.ProjectExplorer(parent, this.serviceRegistry, new Selection.Selection(this.serviceRegistry), this.commandRegistry);
				this.changedItem(workspace);
			},
			setCommandsVisible: function(visible){
				if(this.projectExplorer){
					this.projectExplorer.setCommandsVisible.call(this.projectExplorer, visible);
				}
			},
			changedItemEvent: function(event){
				if(!event.parent || !this.workspace || event.parent.Location!==this.workspace.Location || !this.projects){
					return;
				}
				this._handleChangedEvent(event.oldValue, event.newValue);

			},
			_handleChangedEvent: function(oldValue, newValue){
				var _self = this;
				
				if(oldValue && oldValue.ContentLocation && !oldValue.Children && !oldValue.ChildrenLocation){
					this.fileClient.loadWorkspace(oldValue.ContentLocation).then(function(fileMetadata){
						_self._handleChangedEvent(fileMetadata, newValue);
					});
					return;
				}
				
				if(newValue && newValue.ContentLocation && !newValue.Children && !newValue.ChildrenLocation){
					this.fileClient.loadWorkspace(newValue.ContentLocation).then(function(fileMetadata){
						_self._handleChangedEvent(oldValue, fileMetadata);
					});
					return;
				}
				
				if(newValue){
					this.projectClient.readProject(newValue, this.workspace).then(function(project){
						if(oldValue){
							for(var i=0; i<_self.projects.length; i++){
								if(oldValue.Location === _self.projects[i].ContentLocation){
									if(project){
										_self.projects[i] = project;
										_self.projectExplorer.loadProjects(_self.projects);
									} else {
										_self.projects.splice(i, 1);
										_self.projectExplorer.loadProjects(_self.projects);
									}
									return;
								}
							}
						} else {
							if(project){
								_self.projects.push(project);
								_self.projectExplorer.loadProjects(_self.projects);
							}
						}
					});
				} else if(oldValue){
					for(var i=0; i<_self.projects.length; i++){
						if(oldValue.Location === _self.projects[i].ContentLocation){
							_self.projects.splice(i, 1);
							_self.projectExplorer.loadProjects(_self.projects);
							return;
						}
					}
				}				
			},
			changedItem: function(parent, children, changeType){
				var _self = this;
				if(changeType === "created" && parent.ContentLocation){ //$NON-NLS-0$
					window.location = uriTemplate.expand({resource: parent.ContentLocation}); //$NON-NLS-0$
					return;
				}
				if(parent){
					_self.progress.progress(_self.projectClient.readAllProjects(parent), messages['listingProjects']).then(function(projects){
						_self.workspace = parent;
						_self.projects = projects;
						_self.projectExplorer.loadProjects(projects);
					});
				} else {
					_self.progress.progress(_self.fileClient.loadWorkspace(), messages['gettingWorkspaceInfo']).then(function(workspace){
						_self.progress.progress(_self.projectClient.readAllProjects(parent), messages['listingProjects']).then(function(projects){
							_self.workspace = workspace;
							_self.projects = projects;
							_self.projectExplorer.loadProjects(projects);
						});
					});
				}
			},
			destroy: function(){
				var _self = this;
				this._eventTypes.forEach(function(eventType) {
					_self.modelEventDispatcher.removeEventListener(eventType, _self.modelListener);
				});
			}
		};
		
	return {ProjectView: ProjectView};
});