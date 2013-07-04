/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*global define document window */

define(['orion/bootstrap', 'orion/webui/littlelib', 'orion/globalCommands', 'orion/selection', 'orion/commandRegistry', 'orion/fileClient', 'orion/searchClient', 'orion/progress', 'orion/operationsClient', 'orion/contentTypes',
	'projects/ProjectTree', 'projects/SFTPConfiguration', 'projects/ProjectNavigation', 'projects/ProjectData', 'projects/ProjectDataManager', 'orion/PageUtil'],
 
	function( mBootstrap, lib, mGlobalCommands, mSelection, mCommandRegistry, mFileClient, mSearchClient, mProgress, mOperationsClient, mContentTypes, mProjectTree, SFTPConfiguration, ProjectNavigation, mProjectData, ProjectDataManager, PageUtil ){
		
		var serviceRegistry;
		var preferences;
		var commandRegistry;
		var progressService;
		var contentTypeService;
		var fileClient;
		var projectDataManager;
		var myproject;
		var myworkspace;
		var mainPanel;
		var projectId;
		
		function addSubComponents( ){
			var sidePanel = document.getElementById( 'projectNavigation' );
			var projectTree = new ProjectNavigation( myproject, myworkspace, sidePanel, serviceRegistry, commandRegistry, progressService, fileClient, contentTypeService, projectDataManager );		
			lib.empty(mainPanel);
			var configuration = new SFTPConfiguration( myproject, projectDataManager, mainPanel, commandRegistry, serviceRegistry, fileClient );	
		}
		
		function startProjectComponents( project, workspace, dataManager ){
		
			var titleArea = document.getElementById( 'titleArea');
			
			if(project && titleArea){
				titleArea.innerHTML = '<strong>Project: </strong>' + project.name;
			}
			window.location.hash = '?project=' + project.id;
			
			myproject = project;
			myworkspace = workspace;
			
			/* Check to make sure we have workingsets */
			
			if( project && !project.workingsets ){
				project.workingsets = [];
				project.workingsets.push( project.workspace );
				dataManager.save( project, addSubComponents );
			}else{
				addSubComponents();
			}
		}
		
		function getProject(){	
			projectDataManager.getProject( projectId, startProjectComponents ); 
		}
		
		mBootstrap.startup().then(
		
		function(core) {
		
			/* Render the page */
			
			serviceRegistry = core.serviceRegistry;
			
			preferences = core.preferences;
		
			var selection = new mSelection.Selection(serviceRegistry);

			commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});

			var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
			
			progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
			
			fileClient = new mFileClient.FileClient( serviceRegistry );			
					
			contentTypeService = new mContentTypes.ContentTypeService(serviceRegistry);

			var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
			
			mGlobalCommands.generateBanner("orion-projects", serviceRegistry, commandRegistry, preferences, searcher );			
			
			projectId = PageUtil.matchResourceParameters();

			/* Create the content */
			
			mainPanel = document.getElementById( 'SFTPConfiguration' );
			
			mainPanel.appendChild(document.createTextNode("Loading project data..."));

			projectId = projectId.resource.split('=')[1];
			
			projectDataManager = new ProjectDataManager(serviceRegistry, fileClient);
			
			projectDataManager.startup( getProject );
		});
	}	
);