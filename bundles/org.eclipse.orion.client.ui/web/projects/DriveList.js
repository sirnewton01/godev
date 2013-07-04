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
/*global window console define localStorage*/
/*jslint browser:true sub:true*/

define(['i18n!orion/settings/nls/messages', 'require', 'orion/Deferred', 'orion/commands', 'orion/commonHTMLFragments', 'orion/objects', 'projects/Drive', 'orion/webui/littlelib' ], 
	function(messages, require, Deferred, mCommands, mHTMLFragments, objects, Drive, lib) {

	function DriveList(options, parentNode, commandService, serviceRegistry ) {
		objects.mixin(this, options);
		this.node = parentNode || document.createElement("div"); //$NON-NLS-0$
		this.commandService = commandService;
		this.serviceRegistry = serviceRegistry;
		this.driveElements = [];
	}
	
	objects.mixin(DriveList.prototype, {
		templateString: '' +  //$NON-NLS-0$
						'<div id="pluginSectionHeader" class="pluginSectionHeader sectionWrapper sectionWrapperAux toolComposite">' +  /* pluginSectionHeader */
							'<div class="sectionAnchor sectionTitle layoutLeft"></div>' + /* driveTitle */
							'<div class="sectionItemCount layoutLeft">0</div>' + /* driveCount */
							'<div id="driveCommands" class="driveCommands layoutRight sectionActions"></div>' + /* driveCommands */
						'</div>' + //$NON-NLS-0$

				        '<div class="displaytable layoutBlock">' + //$NON-NLS-0$
							'<div class="plugin-list-container">' + //$NON-NLS-0$
								'<div class="plugin-list" style="overflow:hidden;"></div>' + //$NON-NLS-0$ /* DriveList */
							'</div>' + //$NON-NLS-0$
						'</div>', //$NON-NLS-0$

		target: "_self", //$NON-NLS-0$

		createElements: function() {
			this.node.innerHTML = this.templateString;
			this.pluginSectionHeader = lib.$(".pluginSectionHeader", this.node); //$NON-NLS-0$
			this.driveTitle = lib.$(".sectionAnchor", this.node); //$NON-NLS-0$
			this.driveCount = lib.$(".sectionItemCount", this.node); //$NON-NLS-0$
			this.driveCommands = lib.$(".driveCommands", this.node); //$NON-NLS-0$
			this.DriveList = lib.$(".plugin-list", this.node); //$NON-NLS-0$
			this.postCreate();
		},

		destroy: function() {
			if (this.node) {
				lib.empty(this.node);
				this.node = this.pluginSectionHeader = this.driveTitle = this.driveCount = this.driveCommands = this.DriveList = null;
			}
		},
				
		postCreate: function(){
		
			var _this = this;
			if (this.pluginSectionHeader) {
				var slideout = document.createDocumentFragment();
				slideout.innerHTML = mHTMLFragments.slideoutHTMLFragment("pluginSectionHeader"); //$NON-NLS-0$
				_this.pluginSectionHeader.appendChild(slideout);
			}
			this.addRows();
//			this.show();
		},

		updateToolbar: function(id){
			if(this.driveCommands) {
//				this.commandService.destroy(this.driveCommands);
			}
		},
				
		show: function(){
			this.createElements();

			this.updateToolbar();
			
			var driveListContainer = this;

			// set up the toolbar level commands	
			var addDriveCommand = new mCommands.Command({
				name: 'Add a new drive', //messages["Install"],
				tooltip: 'Adds a new drive configuration',
				id: "orion.addDrive", //$NON-NLS-0$
				callback: function(data) {
					driveListContainer.newDriveAndShow();
				}.bind(this)
			});
			
			this.commandService.addCommand(addDriveCommand);
			this.commandService.registerCommandContribution("driveCommands", "orion.addDrive", 1, /* not grouped */ null, false, /* no key binding yet */ null, null ); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			
			// Render the commands in the heading, emptying any old ones.
			this.commandService.renderCommands("driveCommands", "driveCommands", this, this, "button"); //$NON-NLS-0$
		},
		
		getDrives: function(){
			return this.driveElements;
		},
		
		getJSONDrives: function(){
		
			var JSONDrives = [];
		
			for( var d = 0; d < this.driveElements.length; d++ ){
			
				var data = this.driveElements[d].toJSONData();
				
				JSONDrives.push( data );
			}
			
			return JSONDrives;	
		},
		
		addRows: function(){

			var list = this.DriveList;

			lib.empty( list );
			var DriveList = this.driveElements;
			this.driveTitle.textContent = 'Drives' /* messages['Plugins'] */;
			this.driveCount.textContent = DriveList.length;

			for( var p = 0; p < DriveList.length; p++ ){
				var entry = DriveList[p];
				list.appendChild( entry.entryNode );
			}
		},
				
		newDrive: function(driveData){
		
			var driveName = 'New Drive ' + ( this.driveElements.length + 1 );
		
			var emptyDrive = { drivename: driveName, type:'SFTP', address:'', port:'', password:'', username:'' };
			
			if( !driveData ){ driveData = emptyDrive; }
			
			var id = this.driveElements.length + 1;
			
			this.driveElements.push( new Drive( driveData, this.commandService, this.serviceRegistry,  id ) );
		},
		
		newDriveAndShow: function(driveData){
			this.newDrive(driveData);
			this.addRows();
		},

		handleError: function( error ){
			this.statusService.setErrorMessage(error);
		},


		setTarget: function(target) {
			this.target = target;
		},

		removeDrive: function( url ){

		}
	});
	return DriveList;
});