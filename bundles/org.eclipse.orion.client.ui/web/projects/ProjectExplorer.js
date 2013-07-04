/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window orion document */
/*jslint browser:true */

define(['i18n!orion/widgets/nls/messages', 'orion/Deferred', 'orion/explorers/explorer-table', 'orion/webui/littlelib'], 
function(messages, Deferred, mFileExplorer, lib) {

	function ProjectExplorer(){
		mFileExplorer.FileExplorer.apply( this, arguments );
	}
	
	ProjectExplorer.prototype = Object.create( mFileExplorer.FileExplorer.prototype ); 
	
	ProjectExplorer.prototype.includeDrive = function( driveName ){
	
		var outcome = false;
		
		if( this.driveNames ){
			for( var drive = 0; drive < this.driveNames.length; drive++ ){
			
				if( this.driveNames[drive] === driveName ){
					outcome = true;
					break;
				}
			}
		}
		
		return outcome;
	};
	
	
	ProjectExplorer.prototype.loadWorkingSets = function( workspace, workingsets ) {
	
		var self = this;
		this.workingSets = workingsets;
		// Create a root that will contain the folders from the working set.
		var workingSetList = {};
		workingSetList.Children = [];
		
		// read the metadata for each working set folder location
		var deferreds = [];
		
		// TODO a future optimization might be to first look in workspace.Children to see if we already have metadata.  For now, just request it.
		workingsets.forEach(function(folderLink) {
			deferreds.push(self.fileClient.read(folderLink, true));
		});
		
		Deferred.all(deferreds, function(error) { return {failure: error}; }).then(function(foldersOrErrors) {
			foldersOrErrors.forEach(function(folderOrError) {
				if (folderOrError.failure) {
					self.registry.getService("orion.page.message").setErrorMessage(folderOrError.failure);
				} else if (folderOrError.Directory) {
					workingSetList.Children.push(folderOrError);
				}
			});
			self.load(workingSetList, "Loading Working Sets...");
		});
	};
	
	ProjectExplorer.prototype.loadDriveList = function( workspace, driveNames ) {
		var self = this;
		this.driveNames = driveNames;
		// Create a root that represents the workspace (Orion file system) root.  But rename it "Orion Content".  Renaming it is a cheat, we know that
		// we are dealing with the Orion file system.
		var orionFileSystem = {};
		for (var property in workspace) {
			orionFileSystem[property] = workspace[property];
		}
		orionFileSystem.Name = "Godev Content"; //$NON-NLS-0$
		var treeRoots = [];
		var result;
		if (workspace.DriveLocation) {
			result = new Deferred();
			self.fileClient.loadWorkspace(workspace.DriveLocation).then(function (driveRoot) {
				driveRoot.Children.forEach(function(drive) {
					// drives relevant to the project should be pushed onto the treeRoots array.
					
					if( self.includeDrive( drive.Name ) ){
						treeRoots.push(drive);
					}
				});
				treeRoots.push(orionFileSystem);
				result.resolve({Children: treeRoots});
			});
		} else {
			treeRoots.push(orionFileSystem);
			result = {Children: treeRoots};
		}
		this.load(result, "Loading Drives...");	
	};
	
	return ProjectExplorer;
});
