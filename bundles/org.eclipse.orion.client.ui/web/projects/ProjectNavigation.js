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

define(['i18n!orion/settings/nls/messages', 'orion/webui/littlelib', 'orion/commands', 'orion/keyBinding', 'orion/selection', 'orion/section', 'projects/DriveTreeRenderer', 'orion/Deferred', 'orion/fileCommands', 'orion/extensionCommands', 'projects/ProjectExplorer' ], 
	
	function(messages, lib, mCommands, mKeyBinding, mSelection, mSection, DriveTreeRenderer, Deferred, mFileCommands, ExtensionCommands, ProjectExplorer ) {

		function ProjectNavigation( project, workspace, anchor, serviceRegistry, commandService, progressService, fileClient, contentTypeService, projectDataManager ){
		
			this.commandService = commandService;
			
			this.serviceRegistry = serviceRegistry;
			
			this.projectDataManager = projectDataManager;
			
			this.project = project;
			
			this.anchor = anchor;
			
			this.progressService = progressService;
			
			this.fileClient = fileClient;
			
			this.contentTypeService = contentTypeService;
			
			this.workspace = workspace;
			
			this.anchor.innerHTML = this.template;
			
			this.addWorkingSet( this );
			
			this.addDrives( this );
			
			this.addCommands();	
			
			window.addEventListener( 'DriveEvent', this.refreshDrives.bind( this ) );
		}
		
		var workingSetNode;
		ProjectNavigation.prototype.workingSetNode = workingSetNode;
		
		var drivesNode;
		ProjectNavigation.prototype.workingSetNode = drivesNode;
		
		var streamsNode;
		ProjectNavigation.prototype.workingSetNode = streamsNode;
			
		var anchor;
		ProjectNavigation.prototype.anchor = anchor;
		
		var project;
		ProjectNavigation.prototype.project = project;
		
		var template = '<div>' +
							'<div id="configuration"></div>' +
							'<div id="workingSet">' +
							'</div>' +
							'<div id="drives">' +
							'</div>' +
							'<div id="streams">' +
							'</div>' +
						'</div>';
						
		ProjectNavigation.prototype.template = template;
		
		function createSection( node, content, id, title, scope ){
		
			var serviceRegistry = this.serviceRegistry;
			var commandService = this.commandService;
		
			var section = new mSection.Section( node, {
			
				id: id, //$NON-NLS-0$
				title: title, //$NON-NLS-0$
				content: content, //$NON-NLS-0$
				preferenceService: serviceRegistry.getService("orion.core.preference"), //$NON-NLS-0$
				canHide: true,
				useAuxStyle: true,
				slideout: true,
				onExpandCollapse: function(isExpanded, section) {
					commandService.destroy(section.selectionNode);
					if (isExpanded) {
						commandService.renderCommands(section.selectionNode.id, section.selectionNode, null, scope, "button"); //$NON-NLS-0$
					}
				}
			});
				
			return section;
		}
		
		function addWorkingSet( scope ){
			
			this.workingSetNode = this.anchor.firstChild.children[1];
			
			var workingSetContent = '<div id="WorkingSetContent"></div>';
		
			this.workingSetSection = this.createSection( this.workingSetNode, workingSetContent, 'workingSet', 'Working Set', scope );
			
			var self = this;
			this.workingSetSelection = new mSelection.Selection(this.serviceRegistry, "orion.workingSets.selection"); //$NON-NLS-0$
			this.workingSetExplorer = new ProjectExplorer({							
				selection: this.workingSetSelection, 
				serviceRegistry: this.serviceRegistry,
				fileClient: this.fileClient, 
				parentId: "WorkingSetContent",   // content DOM id
				rendererFactory: function(explorer) {  //$NON-NLS-0$
				
					var renderer = new DriveTreeRenderer({
						checkbox: false, 
						cachePrefix: "WorkingSet"}, explorer, self.commandService, self.contentTypeService);
						
					return renderer;
			}}); //$NON-NLS-0$
			
			if( this.project ){
			// TODO get the working sets from (wherever) and pass them in for filtering by the explorer
				this.workingSetExplorer.loadWorkingSets( this.workspace, this.project.workingsets );
			}
		}
		
		ProjectNavigation.prototype.addWorkingSet = addWorkingSet;
		
		function refreshDrives(){
		
			var self = this;
		
			this.projectDataManager.getProject( self.project.id, function( project, workspace, dataManager ){
			
				self.project = project;
		
				var drivenames = [];
				
				if( project ){
					for( var p = 0; p < project.drives.length; p++ ){
						drivenames.push( project.drives[p].drivename );
					}
				}
			
				self.drivesExplorer.loadDriveList( workspace, drivenames );	
			});
		}
		
		ProjectNavigation.prototype.refreshDrives = refreshDrives;
		
		function addDrives( scope ){
			var self = this;
	
			this.drivesNode = this.anchor.firstChild.children[2];
			
			var driveContent = '<div id="DriveContent"></div>';
			
			this.drivesSection = this.createSection( this.drivesNode, driveContent, 'drives', "Drives", scope );
			
			var drivenames = [];
			
			if( this.project ){
				for( var p = 0; p < this.project.drives.length; p++ ){
					drivenames.push( this.project.drives[p].drivename );
				}
			}
			
			this.drivesSelection = new mSelection.Selection(this.serviceRegistry, "orion.drives.selection"); //$NON-NLS-0$
			this.commandService.registerSelectionService(this.drivesSection.selectionNode.id, this.drivesSelection);

			var selectionId = this.drivesSection.selectionNode.id;
			this.serviceRegistry.getService("orion.drives.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
				var selectionTools = lib.node(selectionId);
				if (selectionTools) {
					self.commandService.destroy(selectionTools);
					self.commandService.renderCommands(selectionId, selectionTools, event.selections, self, "button"); //$NON-NLS-0$
				}
			});
			
			this.drivesExplorer = new ProjectExplorer({							
				selection: this.drivesSelection, 
				serviceRegistry: this.serviceRegistry,
				fileClient: this.fileClient, 
				parentId: "DriveContent",  //$NON-NLS-0$
				rendererFactory: function(explorer) {  //$NON-NLS-0$
				
					var renderer = new DriveTreeRenderer({
						checkbox: false, 
						cachePrefix: "Drives"}, explorer, self.commandService, self.contentTypeService); //$NON-NLS-0$
						
					return renderer;
			}}); //$NON-NLS-0$
			
			this.drivesExplorer.loadDriveList( this.workspace, drivenames );			
			// drive commands
			var copyToWorkingSetCommand = new mCommands.Command({

				tooltip: "Copy the folder to the working set", //$NON-NLS-0$
				id: "orion.copyToWorkingSet", //$NON-NLS-0$
				imageClass: 'core-sprite-copy-folder',
				visibleWhen: function(items) {  
					items = Array.isArray(items) ? items : [items];
					if (items.length === 0) {
						return false;
					}
					items.forEach(function(folder) {
						if (!folder.Directory) {
							return false;
						}
					});
					return true;
				},
				callback: function(data) {
					
					if( !this.project.workingsets ){
						this.project.workingsets = [];
					}
					
					for( var item = 0; item < data.items.length; item++ ){		
						this.project.workingsets.push( data.items[item].Location );
					}
					
					var uniqueWorkingsets = this.project.workingsets.filter( 
						function(element, position, self){
							return self.indexOf(element) === position;
						}
					);
					
					this.project.workingsets = uniqueWorkingsets;
					
					this.projectDataManager.save( this.project, this.handleSavedProject.bind(this) );
				}
			});
			this.commandService.addCommand(copyToWorkingSetCommand);
			this.commandService.registerCommandContribution(this.drivesSection.selectionNode.id, "orion.copyToWorkingSet", 200); //$NON-NLS-0$
			
			// create an actions menu
			this.commandService.addCommandGroup(this.drivesSection.selectionNode.id, "orion.driveSelectionGroup", 100, "Actions"); 

			// bring in the standard navigator commands
			// Contribute the navigator commands that don't have to do with SFTP or other import/export since presumably drives handle that already.
			mFileCommands.createFileCommands(this.serviceRegistry, this.commandService, this.drivesExplorer, this.fileClient);
			ExtensionCommands.createAndPlaceFileCommandsExtension(this.serviceRegistry, this.commandService, this.drivesExplorer, this.drivesSection.actionsNode.id, this.drivesSection.selectionNode.id, "orion.driveSelectionGroup");  //$NON-NLS-0$
			var menuid = this.drivesSection.selectionNode.id;
			//this.commandService.registerCommandContribution(menuid, "orion.makeFavorite", 1, "orion.driveSelectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var binding = new mKeyBinding.KeyBinding(113);
			binding.domScope = "DriveContent"; //$NON-NLS-0$
			binding.scopeName = "Drives"; //TODO should be externalized
			this.commandService.registerCommandContribution(menuid, "eclipse.renameResource", 2, "orion.driveSelectionGroup", false, binding); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(menuid, "eclipse.copyFile", 3, "orion.driveSelectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(menuid, "eclipse.moveFile", 4, "orion.driveSelectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			var binding = new mKeyBinding.KeyBinding(46);
			binding.domScope = "DriveContent"; //$NON-NLS-0$
			binding.scopeName = "Drives"; //TODO should be externalized
			this.commandService.registerCommandContribution(menuid, "eclipse.deleteFile", 5, "orion.driveSelectionGroup", false, binding); //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(menuid, "eclipse.compareWithEachOther", 6, "orion.driveSelectionGroup");  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(menuid, "eclipse.compareWith", 7, "orion.driveSelectionGroup");  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.registerCommandContribution(menuid, "eclipse.downloadFile", 3, "orion.driveSelectionGroup"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		}
		
		ProjectNavigation.prototype.addDrives = addDrives;
		
		function addStreams( scope ){
			this.streamsNode = this.anchor.firstChild.children[3];
			var streamsContent = '<div id="streams"></div>';		
			this.streamsSection = this.createSection( this.workingSetNode, streamsContent, 'streams', 'Streams', scope ); 
		}
		
		function handleSavedProject(){
			this.workingSetExplorer.loadWorkingSets( this.workspace, this.project.workingsets );
		}
		
		ProjectNavigation.prototype.handleSavedProject = handleSavedProject;
		
		ProjectNavigation.prototype.addStreams = addStreams;
		
		ProjectNavigation.prototype.createSection = createSection;
					
		function addCommands(){
		
			// navigation overview commands
			var configureCommand = new mCommands.Command({
				name: 'Configure', //messages["Install"],
				tooltip: 'Configure Project',
				id: "orion.projectConfiguration", //$NON-NLS-0$
				callback: function(data) {
					console.log( 'configure project' );
				}.bind(this)
			});
			
			this.commandService.addCommand(configureCommand);
			this.commandService.registerCommandContribution("projectConfiguration", "orion.projectConfiguration", 1, /* not grouped */ null, false, /* no key binding yet */ null, null ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.renderCommands("projectConfiguration", "projectConfiguration", this, this, "button"); //$NON-NLS-0$
		}
		
		ProjectNavigation.prototype.addCommands = addCommands;
		
		var workingSetSection;
		ProjectNavigation.prototype.workingSetSection = workingSetSection;
			
		return ProjectNavigation;
	}
);
			