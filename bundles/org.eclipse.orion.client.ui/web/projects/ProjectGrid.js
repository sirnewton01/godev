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

define(['i18n!orion/settings/nls/messages', 'require', 'orion/URITemplate' ], 
	
	function(messages, require, URITemplate) {

		function ProjectGrid( node, projects ){
		
			this.projectData = projects;				
			this.anchorNode = node;
			this.anchorNode.innerHTML = this.template;	
			this.projectNode = this.anchorNode.firstChild;
			this.tileButton = this.projectNode.firstChild.firstChild;
			this.listButton = this.projectNode.firstChild.lastChild;
			this.tileButton.onclick = this.showProjectTiles.bind(this);
			this.listButton.onclick = this.showProjectTable.bind(this);
			
			this.listNode = document.getElementById( 'listNode' );
			this.listNode.innerHTML = '';
		
			var tableTemplate = '<table><th>Project Name</th><th>Description</th><th>Last Modified</th></table>';
			
			this.listNode.innerHTML = tableTemplate;
		}
		
		ProjectGrid.prototype.constructor = ProjectGrid;
		
		var projectData;		
		ProjectGrid.prototype.projectData = projectData;
		
		var anchorNode;
		ProjectGrid.prototype.anchorNode = anchorNode;

		var projectNode;
		ProjectGrid.prototype.projectNode = projectNode;

		var listNode;
		ProjectGrid.prototype.listNode = listNode;

		var template =	'<div id="projects" class="projects">' +
							'<div class="buttonBox">' +
								'<div role="button" class="leftButton" tabindex="0" aria-pressed="false" style="-webkit-user-select: none;" aria-label="Switch to List" data-tooltip="Switch to List">' +
									'<div class="core-sprite-thumbnail"></div>' +
								'</div>' +
								'<div role="button" class="rightButton" tabindex="0" aria-pressed="false" style="-webkit-user-select: none;" aria-label="Switch to List" data-tooltip="Switch to List">' +
									'<div class="core-sprite-list"></div>' +
								'</div>' +
							'</div>' +
							'<div id="listNode" class="projectListNode"></div>' +
						'</div>';							
											
		ProjectGrid.prototype.template = template;
		
		function showProjectTiles(){
		
			this.tileButton.style.background = '#E0E0E0';
			this.listButton.style.background = 'white';
		
			this.listNode = document.getElementById( 'listNode' );
			this.listNode.innerHTML = '';
		
			var tileTemplate = '<ol class="thumb-grid group"></ol>';
			
			this.listNode.innerHTML = tileTemplate;
			
			for( var count = 0; count< this.projectData.length; count++ ){
				
				var uriTemplate = "{OrionHome}/projects/projectPage.html#?project={project}";
				
				var projectId = this.projectData[count].id;
				
				var template = new URITemplate(uriTemplate);
				var url = template.expand({
					project: projectId
				});

				var listItem = document.createElement('li');
				
				var date = this.projectData[count].date.getMonth() + 1 + "." + this.projectData[count].date.getDate() + "." + this.projectData[count].date.getFullYear();
				
				var w = this.listNode.clientWidth * 0.79;
				
				var h = w * 0.75;
				
				var content = '<a href="#" height="' + h + 'px"></a>';
				
				if( this.projectData[count].address ){
				
					/* iframe.sandbox = "allow-scripts allow-same-origin" */
					content = '<div class="tab"><a href="../../projects/projectPage.html#?project=' + projectId + '"><div class="iframeOverlay"></div><iframe src="' + this.projectData[count].address + '"height="' + h + 'px" width="' + w + 'px" scrolling="no"></iframe></a></div>';
				}else{
					content = '<div class="tab"><a href="../../projects/projectPage.html#?project=' + projectId + '"><div class="iframeOverlay"></div><img src="../images/placeholder.png"></img></a></div>';
				}
				
				listItem.innerHTML = content + '<div class="tileTitle">' + this.projectData[count].name + '</div><div class="tileDate">Last modified: ' + date + '</div>';
				
				var reference = this.listNode.lastChild.appendChild( listItem );
			}
		}
		
		ProjectGrid.prototype.showProjectTiles = showProjectTiles;
		
		function showProjectTable(){
		
			this.tileButton.style.background = 'white';
			this.listButton.style.background = '#E0E0E0';
		
			this.listNode = document.getElementById( 'listNode' );
			this.listNode.innerHTML = '';
		
			var tableTemplate = '<table><th>Project Name</th><th>Description</th><th>Last Modified</th></table>';
			
			this.listNode.innerHTML = tableTemplate;
			
			for( var count = 0; count< this.projectData.length; count++ ){
			
				var projectId = this.projectData[count].id;
				
				var uriTemplate = "{OrionHome}/projects/projectPage.html#?project={project}";
				
				var template = new URITemplate(uriTemplate);
				var url = template.expand({
					project: projectId
				});
			
				var row = document.createElement('tr');
				
				row.onclick = function(){ window.location.href = url; };
				
				var date = this.projectData[count].date.getMonth() + 1 + "." + this.projectData[count].date.getDate() + "." + this.projectData[count].date.getFullYear();
		
				row.innerHTML = '<td><a href="../../projects/projectPage.html#?project=' + projectId + '">' + this.projectData[count].name + '</a></td><td>' + 
				this.projectData[count].description + '</td><td>' + date + '</td>';
		
				this.listNode.firstChild.appendChild( row );
			}
		}
		
		ProjectGrid.prototype.showProjectTable = showProjectTable;
		
		function setProjectData( projects ){
			this.projectData = projects;
			this.showProjectTable();
		}
		
		ProjectGrid.prototype.setProjectData = setProjectData;

		return ProjectGrid;
	}
);