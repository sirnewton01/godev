/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*globals define window document*/
define([
	'i18n!orion/edit/nls/messages',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/webui/littlelib',
	'orion/explorers/explorer',
	'orion/section'
], function(messages, Deferred, URITemplate, lib, mExplorer, mSection){
	
	var editTemplate = new URITemplate("../edit/edit.html#{,resource,params*}"); //$NON-NLS-0$
			
	function ProjectsRenderer(options){
		this._init(options);
	}
	
	var newActionsScope = "newProjectActions";
	
	ProjectsRenderer.prototype = new mExplorer.SelectionRenderer();
	
	ProjectsRenderer.prototype.getCellHeaderElement = function(){
		return null;
	};
	
	ProjectsRenderer.prototype.emptyCallback = function(bodyElement) {
		var tr = document.createElement("tr"); //$NON-NLS-0$
		var td = document.createElement("td"); //$NON-NLS-0$
		td.colSpan = this.oneColumn ? 1 : 3;
		var noProjects = document.createElement("div"); //$NON-NLS-0$
		noProjects.classList.add("noFile"); //$NON-NLS-0$
		noProjects.textContent = messages.NoProjects;
		var plusIcon = document.createElement("span"); //$NON-NLS-0$
		plusIcon.classList.add("core-sprite-addcontent"); //$NON-NLS-0$
		plusIcon.classList.add("icon-inline"); //$NON-NLS-0$
		plusIcon.classList.add("imageSprite"); //$NON-NLS-0$
		lib.processDOMNodes(noProjects, [plusIcon]);
		td.appendChild(noProjects);
		tr.appendChild(td);
		bodyElement.appendChild(tr);
	};

	ProjectsRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var cell = document.createElement("td");
		
		function getDescription(item){
			if(!item.Description){
				return " ";
			}
			if(item.Description.length>200){
				return item.Description.substring(0, 180) + "...";
			}
			return item.Description;
		}
		
		switch(col_no){
			case 0:
				cell.className = "navColumnNoIcon";
				var a = document.createElement("a");
				a.appendChild(document.createTextNode(item.Name));
				a.href = editTemplate.expand({resource: item.ContentLocation}); //$NON-NLS-0$
				cell.appendChild(a);
				return cell;
			case 1:
				cell.appendChild(document.createTextNode(getDescription(item)));
				return cell;
			case 2:
				if(item.Url){
					a = document.createElement("a");
					a.appendChild(document.createTextNode(item.Url));
					a.href = item.Url;
					cell.appendChild(a);
				} else {
					cell.appendChild(document.createTextNode(" "));
				}
				return cell;
		}
		return null;
	};

	function ProjectExplorer(parentId, serviceRegistry, selection, commandRegistry) {
		this.registry = serviceRegistry;
		this.selection = selection;
		this.commandRegistry = commandRegistry;
		this.parentId = parentId;
		this.renderer = new ProjectsRenderer({});
		this.renderer.explorer = this;
		this.myTree = null;
		this.newActionsScope = newActionsScope;
		this.actionsSections = [this.newActionsScope];
		this._init();
	}
	
	ProjectExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	
	ProjectExplorer.prototype._init = function(){
		var projectsSection = new mSection.Section(lib.node(this.parentId), {id: "projectsSection", title: "Projects", canHide: true});
		var div = document.createElement("div");
		div.id = "projectsExplorer";
		projectsSection.embedExplorer(this, div);
	};
	
	ProjectExplorer.prototype.loadProjects = function(projects){
		
		this.model = new mExplorer.SimpleFlatModel(projects, "orion.project.", function(item){
			if(item.ContentLocation){
				return item.ContentLocation.replace(/[\\\/]/g, "");
			}
		});
		this.myTree = this.createTree(this.parent, this.model, {indent: '8px', selectionPolicy: this.renderer.selectionPolicy});
		this.updateCommands();
	};
	
	return{
		ProjectExplorer: ProjectExplorer,
		newActionsScope: newActionsScope
	};

//end of define
});

