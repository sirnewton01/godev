/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global orion window console define localStorage*/
/*jslint browser:true*/

define(['i18n!orion/settings/nls/messages', 'require', 'projects/ProjectData', 'orion/fileClient', 'orion/Deferred' ], 
	
	function(messages, require, mProjectData, mFileClient, Deferred) {
	
		var PROJECTS_FOLDER = 'projectData';
		var WORKSPACES_FOLDER = 'workspaces';
		var PROJECTS_METADATA = 'project.json';
		var WORKAREA = 'workspace';

		function ProjectDataManager( serviceRegistry, fileClient ){
			this.serviceRegistry = serviceRegistry;
			this.fileClient = fileClient;
			this.errorHandler = function(error) {
				// TODO this needs to be hooked into the status manager or else routed through the progress service
				console.log(error);
			};
		}
		
		function generateId(){
			var id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
			return id;
		}
		
		function _findInWorkspace( subtree, name ){
		
			var element;
		
			for( var item =0; item < subtree.length; item++ ){	
				if(subtree[item].Name === name ){
					element= item;
					break;
				}
			}
			
			return element;
		}
		
		function projectMaintainance( callback ){
			
			/* Moving from using project name as identifier to project id as identifier. 
			   So - adding in an id for those projects without one. */
			
			var project;
			var self = this;
			
			Deferred.when(this.projectsFile, function(file) {
				self.projectsFile = file;
				self.fileClient.read( file.Location ).then( function( content ){	
					var projects = JSON.parse( content );
					for( var p = 0; p < projects.length; p++ ){
						projects[p].id = this.generateId();
						self.save(project);
					}
				});
			});
		}
		
		function getProjectData( callback ){
			var self = this;
			Deferred.when(this.projectsFile, function(file) {
				self.fileClient.read( self.projectsFile.Location ).then( function( content ){	
					var projects = JSON.parse( content );
					callback( projects, self.loadedWorkspace );
				});
			}, this.errorHandler);
		}
		

		function addNewProject( callback ){
		
		}
		
		function getProject( projectId, callback ){
			var project;
			var self = this;
			Deferred.when(this.projectsFile, function(file) {
				self.projectsFile = file;
				self.fileClient.read( file.Location ).then( function( content ){	
					var projects = JSON.parse( content );
					for( var p = 0; p < projects.length; p++ ){
						if( projects[p].id === projectId ){
							project = projects[p];
							break;
						}
					}
					if (!project) {
						project = { name: "Project " + (projects.length + 1), address: "", description: "", drives: [] };
						project.id = self.generateId();
						self.save(project);
					}
					if (project.workspace) {
						callback(project, self.loadedWorkspace, self);
					} else {
						Deferred.when(self.workspacesFolder, function(workspacesFolder) {
							self.workspacesFolder = workspacesFolder;
							self.fileClient.createFolder( workspacesFolder.Location, project.name ).then( function( file ){
								project.workspace = file.Location;
								self.save( project );
								callback(project, self.loadedWorkspace, self);
							},
							function(error) {
								// handle the case where the workspace folder was there even though the project file had not been saved to indicate so.
								if (error.status === 412) {
									project.workspace = self.workspacesFolder.Location + project.name;
									self.save( project );
									callback(project, self.loadedWorkspace, self);
								} else {
									console.log(error);
								}
							});
						});
					}
				}, self.errorHandler );
			}, this.errorHandler);
		}
		
		// asynchronous, cannot rely that data is saved on return
		function save( projectData, callback ){
			var self = this;			
			Deferred.when(this.projectsFile, function(file) {
				self.projectsFile = file;
				self.fileClient.read( file.Location ).then( function( content ){	
					var projects = JSON.parse( content );
					
					projectData.date = new Date();
					
					var existingProject = false;
					
					for( var p = 0; p < projects.length; p++ ){
						if( projects[p].id === projectData.id ){
							projects[p] = projectData;
							existingProject = true;
							break;
						}
					}
					
					if( !existingProject ){
						projects.push( projectData );
					}
					
					var fileData = JSON.stringify( projects );
					self.fileClient.write( self.projectsFile.Location, fileData );

					callback( true );
					
				} );
			}, this.errorHandler);
						
		}
		
		function removeProject( projectId, callback ){
			var self = this;
			Deferred.when(this.projectsFile, function(file) {
				self.projectsFile = file;
				self.fileClient.read( file.Location ).then( function( content ){			
					var projects = JSON.parse( content );
					
					var index;
					
					for( var p = 0; p < projects.length; p++ ){
					
						if( projects[p].id === projectId ){
							index = p;
							break;
						}	
					}
					if( index >= 0 ){
						var project = projects[index];
						// remove the autogenerated folder
						// TODO we may want to prompt like Eclipse did.  Ask user if they mean to remove the contents of the project's main folder.
						if (project.workspace) {
							self.fileClient.deleteFile(project.workspace);
						}
						var newProjects = self._removeFromArray( projects, index );
						var fileData = JSON.stringify( projects );
						self.fileClient.write( self.projectsFile.Location, fileData ).then( function( outcome ){				
							callback();				
						}, self.errorHandler );
						
						
					}
				}, self.errorHandler);
			}, this.errorHandler);
		}
		
		function _removeFromArray( array, from, to) {
		  var rest = array.slice((to || from) + 1 || array.length);
		  array.length = from < 0 ? array.length + from : from;
		  return array.push.apply(array, rest);
		}
		
		// Startup the ProjectDataManager
		// Upon callback, we'll have cached everything we need for future API calls
				
		function startup(callback){
			// We will cache the following
				// this.loadedWorkspace
				// this.projectsFolder
				// this.projectsFile
				// this.workspacesFolder				
			var fileClient = this.fileClient;
			var projectDataManager = this;
			this.fileClient.loadWorkspace("").then(function(workspace) {
				// Cache workspace
				projectDataManager.loadedWorkspace = workspace;
				
				var projectsIndex = projectDataManager._findInWorkspace( workspace.Children, PROJECTS_FOLDER );
				
				if( !projectsIndex ){
					projectDataManager.projectsFolder = fileClient.createFolder( workspace.ChildrenLocation, PROJECTS_FOLDER );
					projectDataManager.projectsFolder.then( function(projectData){
						// Cache projects folder
						projectDataManager.projectsFolder = projectData;
						projectDataManager.projectsFile = fileClient.createFile( projectData.ContentLocation, PROJECTS_METADATA );
						projectDataManager.projectsFile.then( function( projectsFile ){
							// Cache projects file
							projectDataManager.projectsFile = projectsFile;
						    fileClient.write(projectsFile.Location, '[]' );
						});
						
						projectDataManager.workspacesFolder = fileClient.createFolder( projectData.ContentLocation, WORKSPACES_FOLDER );
						projectDataManager.workspacesFolder.then(function(workspacesFolder) {
							// Cache workspaces folder
							projectDataManager.workspacesFolder = workspacesFolder;
							callback();
						});
					});
				} else {
					projectDataManager.projectsFolder = workspace.Children[projectsIndex];
					projectDataManager.projectsFile = projectDataManager.workspacesFolder = fileClient.fetchChildren(projectDataManager.projectsFolder.ChildrenLocation);
					projectDataManager.projectsFile.then(function(children) {
						var index = _findInWorkspace(children, PROJECTS_METADATA);
						projectDataManager.projectsFile = children[index];
						index = _findInWorkspace(children, WORKSPACES_FOLDER);
						projectDataManager.workspacesFolder = children[index];
						callback();
					});
				}
			});
		}
		
		ProjectDataManager.prototype.generateId = generateId;
		ProjectDataManager.prototype.projectMaintainance = projectMaintainance;
		ProjectDataManager.prototype._findInWorkspace = _findInWorkspace;
		ProjectDataManager.prototype._removeFromArray = _removeFromArray;
		ProjectDataManager.prototype.startup = startup;
		ProjectDataManager.prototype.getProjectData = getProjectData;
		ProjectDataManager.prototype.getProject = getProject;
		ProjectDataManager.prototype.addNewProject = addNewProject;
		ProjectDataManager.prototype.save = save;
		ProjectDataManager.prototype.removeProject = removeProject;
		ProjectDataManager.prototype.constructor = ProjectDataManager;
		
		return ProjectDataManager;
	}
);