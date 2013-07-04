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
 
/*global define document */

define(['orion/bootstrap', 'orion/globalCommands', 'orion/webui/littlelib', 'orion/selection', 'orion/commandRegistry', 'orion/fileClient', 'orion/searchClient', 'projects/ProjectTree', 'projects/ProjectGrid', 'projects/ProjectData', 'projects/ProjectDataManager'],
 
	function( mBootstrap, mGlobalCommands, lib, mSelection, mCommandRegistry, mFileClient, mSearchClient, mProjectTree, ProjectGrid, ProjectData, ProjectDataManager ){
	
		var projectGrid, mainPanel;
		var projectMetaData;
	
		function showProjectGrid( projectData ){
			
			var projectList = [];
		
			for( var project = 0; project < projectData.length; project++ ){
				var orionProject = new ProjectData( projectData[project] );
				projectList.push( orionProject );
			}
			lib.empty(mainPanel);
			
			projectGrid = new ProjectGrid( mainPanel );

			projectGrid.setProjectData( projectList );
		}
		
		mBootstrap.startup().then(
		
			function(core) {
			
				/* Render the page */
				
				var serviceRegistry = core.serviceRegistry;
				
				var fileClient = new mFileClient.FileClient( serviceRegistry );			
				
				var preferences = core.preferences;
			
				var selection = new mSelection.Selection(serviceRegistry);
				
				var commandRegistry = new mCommandRegistry.CommandRegistry({selection: selection});
				
				var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
			
				mGlobalCommands.generateBanner("orion-projects", serviceRegistry, commandRegistry, preferences, searcher );	
				
				/* Create the content */
				
				var sidePanel = document.getElementById( 'projectTree' );
				
				var projectTree = new mProjectTree.ProjectTree( sidePanel );
				
				mainPanel = document.getElementById( 'projectGrid' );
				
				this.projectDataManager = new ProjectDataManager( serviceRegistry, fileClient );
				var projectDataManager = this.projectDataManager;
				mainPanel.appendChild(document.createTextNode("Loading projects..."));	
				this.projectDataManager.startup(function() { projectDataManager.getProjectData( showProjectGrid ); }); 
		});
	}	
);