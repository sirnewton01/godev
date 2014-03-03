/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
 /*jslint browser:true devel:true sub:true*/
 /*global define window document*/

define(['i18n!profile/nls/messages', 'require', 'orion/webui/littlelib', 'orion/explorers/explorer', 'orion/profile/usersUtil', 'orion/explorers/navigationUtils'], function(messages, require, lib, mExplorer, mUsersUtil, mNavUtils) {


var eclipse = eclipse || {};

eclipse.UsersList = (function(){
	
	function UsersList(serviceRegistry, commandService, selection, searcher, parentId, toolbarId, pageNavId, selectionToolsId, actionScopeId) {
		this.registry = serviceRegistry;
		this.commandService = commandService;
		this.selection = selection;
		this.searcher = searcher;
		this.parentId = parentId;
		this.toolbarId = toolbarId;
		this.pageNavId = pageNavId;
		this.selectionToolsId = selectionToolsId;
		this.actionScopeId = actionScopeId;
		this.model = null;
		this.myTree = null;
		this.renderer = new eclipse.UsersRenderer({actionScopeId: this.actionScopeId, commandService: this.commandService, checkbox: false, cachePrefix: "UsersNavigator"}, this); //$NON-NLS-0$
	}
	
	UsersList.prototype = new mExplorer.Explorer();
	
	UsersList.prototype.queryObject = { start: 0, rows:100, length: 0};
	
	UsersList.prototype.calculateQuery = function(locationHash, queryObj) {
		var startQuery = locationHash.indexOf("?"); //$NON-NLS-0$
		if (startQuery !== -1) {
			var queryStr = locationHash.substring(startQuery + 1);
			var splitQ = queryStr.split("&"); //$NON-NLS-0$
			for(var i=0; i < splitQ.length; i++){
				var splitparameters = splitQ[i].split("="); //$NON-NLS-0$
				if(splitparameters.length === 2){
					if(splitparameters[0] === "rows"){  //$NON-NLS-0$
						queryObj.rows = parseInt(splitparameters[1], 10);
					} else if(splitparameters[0] === "start"){ //$NON-NLS-0$
						queryObj.start = parseInt(splitparameters[1], 10);
					}
				}
			}
		}
	};

	UsersList.prototype.loadUsers = function() {
		var parent = lib.node(this.parentId);
		var queryObj = UsersList.prototype.queryObject;

		// Progress indicator
		var progress = lib.node("progress");  //$NON-NLS-0$
		if(!progress){
			progress = document.createElement("div");  //$NON-NLS-0$
			lib.empty(parent);
			progress.id = "progress";  //$NON-NLS-0$
			parent.appendChild(progress);
		}
		lib.empty(progress);
		progress.appendChild(document.createTextNode(messages["Loading users..."]));
		
		var service = this.registry.getService("orion.core.user"); //$NON-NLS-0$
		UsersList.prototype.registry = this.registry;
		
		var locationHash = window.location.hash;
		UsersList.prototype.calculateQuery(locationHash, queryObj);
		var flatModel = new mExplorer.ExplorerFlatModel("../users", UsersList.prototype.getUsersListSubset.bind(this)); //$NON-NLS-0$
		flatModel.service = service;
		flatModel.queryObject = queryObj;
		this.queryObject = queryObj;
		this.createTree(this.parentId, flatModel, {setFocus: true}); //$NON-NLS-0$
		mUsersUtil.updateNavTools(this.registry, this.commandService, this, this.toolbarId, this.pageNavId, this.selectionToolsId, {});
	};
	
	UsersList.prototype.getUsersListSubset = function(root) {
	    var aService;
	    if (this.service) {
	        aService = this.service;
	    } else {
	        aService = this.registry.getService("orion.core.user"); //$NON-NLS-0$
	    }
		return aService.getUsersListSubset(this.queryObject.start, this.queryObject.rows).then(
			function(result) {
				this.queryObject.start = parseInt(result.users_start, 10);
				this.queryObject.rows = parseInt(result.users_rows, 10);
				this.queryObject.length = parseInt(result.users_length, 10);
				return result.users;
			}.bind(this));
	};

	return UsersList;
}());


eclipse.UsersRenderer = (function() {
	function UsersRenderer (options, explorer) {
		this._init(options);
		this.explorer = explorer;
	}
	UsersRenderer.prototype = new mExplorer.SelectionRenderer();
	
	UsersRenderer.prototype.getCellHeaderElement = function(col_no){
		var col = document.createElement("th"); //$NON-NLS-0$
		var h2 = document.createElement("h2"); //$NON-NLS-0$
		col.appendChild(h2);
		switch(col_no){
		case 0: 
			h2.textContent = messages["Login"];
			return col;
		case 1:
			h2.textContent = messages["Actions"];
			return col;
		case 2:
			h2.textContent = messages["Name"];
			return col;
		case 3:
			h2.textContent = messages["Last Login"];
			return col;
		}
	};
	
	UsersRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var td;
		switch(col_no){
		case 0:	
			var col, div, link;
			col = document.createElement('td'); //$NON-NLS-0$
			div = document.createElement('div'); //$NON-NLS-0$
			div.style.padding = "5px;"; //$NON-NLS-0$
			col.appendChild(div);
			link = document.createElement('a'); //$NON-NLS-0$
			link.className = "navlinkonpage"; //$NON-NLS-0$
			link.href = require.toUrl("profile/user-profile.html") +"#" + item.Location; //$NON-NLS-1$ //$NON-NLS-0$
			div.appendChild(link);
			link.appendChild(document.createTextNode(item.login));
			mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
			return col;
		case 1:
			return this.getActionsColumn(item, tableRow, null, null, true);
		case 2:
			td = document.createElement("td"); //$NON-NLS-0$
			td.textContent = item.Name ? item.Name : " "; //$NON-NLS-0$
			return td;
		case 3:
			td = document.createElement("td"); //$NON-NLS-0$
			td.textContent = item.LastLogInTimestamp ? new Date(parseInt(item.LastLogInTimestamp, 10)).toLocaleString() : '\u00a0'; //$NON-NLS-0$
			return td;
		}
		
	};
	
	return UsersRenderer;
}());

return eclipse;	
});
