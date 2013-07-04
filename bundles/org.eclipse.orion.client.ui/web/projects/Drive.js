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

define(['i18n!orion/settings/nls/messages', 'require', 'orion/commands', 'orion/fileClient', 'orion/selection', 'orion/explorers/navigationUtils', 'orion/explorers/explorer', 'orion/explorers/explorer-table', 'projects/DriveTreeRenderer', 'orion/fileUtils', 'orion/Deferred', 'projects/ProjectResponseHandler', 'projects/ProjectDataManager' ], 
	
	function(messages, require, mCommands, mFileClient, mSelection, mNavUtils, mExplorer, mExplorerTable, DriveTreeRenderer, mFileUtils, Deferred, ProjectResponseHandler) {
	
		var NAME_INDEX = 0;
		var ADDRESS_INDEX = NAME_INDEX + 1;
		var PORT_INDEX =  ADDRESS_INDEX + 1;
		var PATH_INDEX = PORT_INDEX + 1;
		var USERNAME_INDEX = PORT_INDEX + 1;	
		var PASSWORD_INDEX = USERNAME_INDEX + 1;
		var LAST_INDEX = PASSWORD_INDEX + 1;

		function Drive( details, commandService, serviceRegistry, identifier ){
			
			this.drivename = details.drivename;
			this.address = details.address;
			this.path = details.path;
			this.port = details.port;
			this.type = details.type;
			this.username = details.username;
			this.password = details.password;
			this.responseHandler = new ProjectResponseHandler( 'informationPane' );

			this.commandService = commandService;
			this.serviceRegistry = serviceRegistry;

			this.entryNode = document.createElement( 'div' );
			
			this.driveNameDomId = 'Name' + String( identifier );
			this.driveAddressDomId = 'Address' + String( identifier );
			this.drivePortDomId = 'Port' + String( identifier );
			this.titleNodeDomId = 'Title' + String( identifier );
			
			this.entryNode.innerHTML = this.getTemplateString();
			this.content = this.entryNode.firstChild.firstChild.children[1];
			
			this.elements[NAME_INDEX]  = this.makeDriveElement( 'Name', this.drivename, this.driveNameDomId );
			this.elements[ADDRESS_INDEX] = this.makeDriveElement( 'Address', this.address, this.driveAddressDomId );
			this.elements[PORT_INDEX] = this.makeDriveElement( 'Port', this.port, this.drivePortDomId );			
			
			for( var element = NAME_INDEX; element < this.elements.length; element++ ){
				this.content.appendChild( this.elements[element] );
			}
			
			var buttonArea = document.createElement( 'div' );
			buttonArea.className = "setting-property";
			buttonArea.innerHTML = '<div style="float:right;"></div><div style="float:right;"></div>';
			this.disconnectbutton = buttonArea.children[0];
			this.connectbutton = buttonArea.children[1];
			
			this.content.appendChild( buttonArea );
			
			var elements = this.elements;
			var registry = this.serviceRegistry;
			
			var thisDrive = this;
					
			// set up the toolbar level commands	
			var connectCommand = new mCommands.Command({
				name: 'Connect', //messages["Install"],
				tooltip: 'Connect to drive', //messages["Install a plugin by specifying its URL"],
				id: "orion.driveSave",
				callback: function(data) {
				
					var drivename = thisDrive.getDriveName();
				
					this.setDriveTitle( drivename );
					var evt = document.createEvent('Event');
					evt.initEvent('DriveEvent', true, true);
					this.entryNode.dispatchEvent(evt);
					
					var url = 'sftp://:@' + thisDrive.getDriveAddress() + ':' + thisDrive.getDrivePortNumber();
					
					var fileClient = new mFileClient.FileClient( this.serviceRegistry );			
					
					this.selection = new mSelection.Selection(this.serviceRegistry, "orion.directoryPrompter.selection"); //$NON-NLS-0$

					this.explorer = new mExplorerTable.FileExplorer({
						treeRoot: {children:[]}, 
						selection: this.selection, 
						serviceRegistry: this.serviceRegistry,
						fileClient: fileClient, 
						parentId: "Drives", 
						excludeFiles: true, 
						rendererFactory: function(explorer) {  //$NON-NLS-0$
							return new DriveTreeRenderer({checkbox: false, singleSelection: true, treeTableClass: "directoryPrompter" }, explorer);   //$NON-NLS-0$
					}}); //$NON-NLS-0$
					
					if (drivename) {
						var loadedWorkspace = fileClient.loadWorkspace("");
						
						var responseHandler = this;
						
						Deferred.when(loadedWorkspace, function(workspace) {
							fileClient.createProject( workspace.ChildrenLocation, drivename, url, true).then( responseHandler.handleSuccess.bind( responseHandler), responseHandler.handleError.bind( responseHandler) );
						});
					}

				}.bind(this)
			});
			
			this.commandService.addCommand(connectCommand);
			this.commandService.registerCommandContribution('driveCommand', "orion.driveSave", 1, /* not grouped */ null, false, /* no key binding yet */ null, null); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			var disconnectCommand = new mCommands.Command({
				name: 'Disconnect', //messages["Install"],
				tooltip: 'Disconnect drive', //messages["Install a plugin by specifying its URL"],
				id: "orion.driveDisconnect",
				callback: thisDrive.disconnect.bind(thisDrive)
			});
			
			this.commandService.addCommand(disconnectCommand);
			this.commandService.registerCommandContribution('driveCommand', "orion.driveDisconnect", 1, /* not grouped */ null, false, /* no key binding yet */ null, null); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this.commandService.renderCommands('driveCommand', this.connectbutton, this, this, "button"); //$NON-NLS-0$
		}
		
		var id;
		Drive.prototype.id = id;
		
		var elements = [];
		Drive.prototype.elements = elements;	
	
		function getTemplateString(){
	
			var templateString = '<div style="overflow:hidden;">' + //$NON-NLS-0$
									'<section class="setting-row" role="region" aria-labelledby="Navigation-header">' +
										'<h3 class="setting-header" id="' + this.titleNodeDomId + '">' + this.drivename + '</h3>' +
										'<div class="setting-content">' +
										'</div>' +
									'</section>' +
								'</div>'; //$NON-NLS-0$
					
			return templateString;
		}
						
		Drive.prototype.getTemplateString = getTemplateString;	
		
		function makeDriveElement( name, value, id, type ){

			if( !type ){ type = "text"; }
		
			var delement = document.createElement( 'div' );
			
			delement.className = "setting-property";
			
			delement.innerHTML = '<label>' + //$NON-NLS-0$
									'<span class="setting-label">' + name + ':</span>' + //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
									'<input class="setting-control" type="' + type + '" value="' + value + '" id="' + id + '">' + //$NON-NLS-0$
								'</label>';   //$NON-NLS-0$						
			return delement;
		}
		
		Drive.prototype.makeDriveElement = makeDriveElement;
		
		function disconnect(data){
		
			var fileClient = new mFileClient.FileClient( this.serviceRegistry );
					
			var loadedWorkspace = fileClient.loadWorkspace("");
			
			var self = this;
		
			Deferred.when( loadedWorkspace, function(workspace) {

				var drives = workspace.DriveLocation;
				
				fileClient.read( workspace.DriveLocation, true ).then( function(folders){
					
					var driveName = self.getDriveName();

					for( var folder = 0; folder < folders.Children.length;folder++ ){
					
						if( folders.Children[folder].Name === driveName ){
							for( var p =0; p< folders.Projects.length; p++ ){
								if( folders.Children[folder].Id === folders.Projects[p].Id ){
									fileClient.deleteFile( folders.Projects[p].Location, true ).then(
									self.handleSuccess.bind( self ), self.handleError.bind( self ) );	
									break;
								}
							}
						}
					}
				});
			});
		}
		
		var driveAddressDomId;
		var driveNameDomId;
		
		Drive.prototype.driveNameDomId = driveNameDomId;
		Drive.prototype.driveAddressDomId = driveAddressDomId;
		
		function getDriveName(){
			var drive = document.getElementById( this.driveNameDomId ).value;	
			return drive;
		}
		
		Drive.prototype.getDriveName = getDriveName;
		
		function getDrivePortNumber(){
			var drive = document.getElementById( this.drivePortDomId ).value;	
			return drive;
		}
		
		Drive.prototype.getDrivePortNumber = getDrivePortNumber;
		
		function getDriveAddress(){
			return document.getElementById( this.driveAddressDomId ).value;
		}
		
		Drive.prototype.getDriveAddress = getDriveAddress;
		
		function setDriveName( name ){
			document.getElementById( this.driveNameDomId ).value = name;
			this.setDriveTitle( name );
		}
		
		Drive.prototype.setDriveName = setDriveName;
		
		function setDrivePortNumber( port ){
			document.getElementById( this.drivePortDomId ).value = port;
		}
		
		Drive.prototype.setDrivePortNumber = setDrivePortNumber;
		
		function setDriveAddress( address ){
			document.getElementById( this.driveAddressDomId ).value = address;
		}
		
		Drive.prototype.setDriveAddress = setDriveAddress;

		function setDriveTitle( title ){
			document.getElementById( this.titleNodeDomId ).innerHTML = title;
		}
		
		Drive.prototype.setDriveTitle = setDriveTitle;

		function toJSONData(){
			
			var jsonDrive = { 'drivename': this.getDriveName(), 
							  'address': this.getDriveAddress(),
						      'port': this.getDrivePortNumber() };	
						      
			return jsonDrive;
		}
		
		Drive.prototype.toJSONData = toJSONData;
		
		function handleSuccess( result ){
		
			var evt = document.createEvent('Event');
			evt.initEvent('DriveEvent', true, true);
			this.entryNode.dispatchEvent(evt);
			
			this.responseHandler.handleSuccess( 'OK' );
		}
		
		Drive.prototype.handleSuccess = handleSuccess;
		
		function handleError( result ){
			var messageText = result.responseText;
			var message = JSON.parse( messageText );
			message = 'Unable to connect';
			this.responseHandler.handleError( message );
		}
		
		Drive.prototype.handleError = handleError;

		var name;
		var address;
		var port;
		var type;
		var username;
		var password;
		var path;
		
		Drive.prototype.disconnect = disconnect;
		
		Drive.prototype.path = path;
		Drive.prototype.name = name;
		Drive.prototype.type = type;
		Drive.prototype.port = port;
		Drive.prototype.address = address;
		Drive.prototype.username = username;
		Drive.prototype.password = password;
		Drive.prototype.constructor = Drive;
		
		return Drive;
	}
);