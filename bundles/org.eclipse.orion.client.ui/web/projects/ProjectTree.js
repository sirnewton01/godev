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

define(['i18n!orion/settings/nls/messages', 'require', 'projects/ProjectTypes', 'projects/ProjectType', 'orion/webui/littlelib', 'orion/URITemplate' ], 
	
	function( messages, require, mProjectTypes, mProjectType, lib, URITemplate ) {

		function ProjectTree( node ){

			this.anchorNode = node;
			
			this.addProjectTypes();
	
			this.anchorNode.innerHTML = this.template;
			
			this.creationButton = node.firstChild.firstChild;
			
			this.creationButton.onclick = this.createProject.bind(this);
		}
		
		ProjectTree.prototype.constructor = ProjectTree;
		
		function addProjectTypes(){
			
			var basic = new mProjectType.ProjectType( 'Basic HTML5 Project', 'A hosted HTML5 project with a HTML page, CSS file, and JS file' );
			var sftp = new mProjectType.ProjectType( 'SFTP Project', 'A project associated with an SFTP hosted website' );
			
			
			var uriTemplate = "{OrionHome}/projects/projectPage.html#?project={project}";
			
			var template = new URITemplate(uriTemplate);

			
			basic.create = function(){
				console.log( 'basic create' );
				var url = template.expand({
					project: 'basic'
				});
				
				window.location.href = url;
			};
			
			sftp.create = function(){
				console.log( 'sftp create' );
				
				var url = template.expand({
					project: 'sftp'
				});
				
				window.location.href = url;
			};
			
			
			this.projectTypes = new mProjectTypes.ProjectTypes();
			this.projectTypes.addType( basic );
			this.projectTypes.addType( sftp );
		}
		
		ProjectTree.prototype.addProjectTypes = addProjectTypes;
		
		var projectTypes;
		ProjectTree.prototype.projectTypes = projectTypes;

		var template = '<div id="projectCreation" class="projectCreation">' +
							'<div role="button" class="projectInlineBlock projectButton projectButtonMain" tabindex="0" aria-expanded="false" aria-haspopup="true">' +
								'<div class="projectInlineBlock">' +
									'<div class="projectInlineBlock">' +
										'<div class="projectInlineBlock">Create A Project</div>' +
											'<div class="projectInlineBlock">&nbsp;</div>' + 
										'</div>' +
									'</div>' +
								'</div>' +			
								'<div class="menudataview"></div>' + 
							'</div>' +
						'</div>';
//						'<div class="projectTreeContainer">' +
//						'<div class="projectTreeNode" style="background-position:-100px 0;" role="group">' + 
//							'<div class="projectTreeItem" role="treeitem" aria-selected="true" >' +
//								'<div class="projectTreeRow selected projectTreeRowHover" style="padding-left:0px">' + 
//									'<span type="expand" class="projectInlineBlock" role="presentation"></span>' + 
//									'<span style="display:inline-block" class="projectTreeIcon projectTreeOpenFolder" role="presentation"></span>' +
//									'<div class="projectInlineBlock"></div>' + 
//									'<span class="projectTreeItemLabel projectInlineBlock">' + 
//									'<span class="projectTreeRootNode">All Projects &nbsp;</span>' +
//								'</div>' + 
//							'</div>' + 
//						'</div>';
											
		ProjectTree.prototype.template = template;
		
		var creationButton;
		ProjectTree.prototype.creationButton = creationButton;
		
		var anchorNode;
		ProjectTree.prototype.anchorNode = anchorNode;
		
		function getPosition(element) {
		    var xPosition = 0;
		    var yPosition = 0;
		  
		    while(element) {
		        xPosition += (element.offsetLeft - element.scrollLeft + element.clientLeft);
		        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
		        element = element.offsetParent;
		    }
		    return { x: xPosition, y: yPosition };
		}
		
		ProjectTree.prototype.getPosition = getPosition;
		
		function createProject(){
		
			var pos = this.getPosition( this.creationButton );
			
			if( !this.menu ){
			
				this.menu = document.createElement('div');
				
				this.menu.className = 'projectCreationMenu';
				
				this.menu.style.position = 'absolute';
				this.menu.style.marginLeft = '' + pos.x + 'px';
				this.menu.style.top = pos.y + 30 + 'px';
	
				for( var p = 0; p < this.projectTypes.types.length; p++ ){
					
					var menuItem = document.createElement( 'div' );
					
					menuItem.className = 'projectMenuitem';
					menuItem.innerHTML = this.projectTypes.types[p].typeName + ' ...';
					menuItem.onclick = this.projectTypes.types[p].create;
					
					this.menu.appendChild( menuItem );			
				}
				
				var projectNode = document.getElementById( 'orion-projects' );
				projectNode.appendChild( this.menu );
				
				var m = this.menu;
				
				lib.addAutoDismiss( projectNode, function() {
					m.style.visibility = 'hidden';
				});	
				
			}else{
				this.menu.style.visibility = '';
			}	
		}
		
		ProjectTree.prototype.createProject = createProject;
		
		function addFolder(parent, name){	
	
		}
		
		function showProjectTypes(){
	
		}

		return{
			ProjectTree:ProjectTree
		};
	}
);