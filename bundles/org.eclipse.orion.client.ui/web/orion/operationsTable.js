/*******************************************************************************
 * @license Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved.
 *          This program and the accompanying materials are made available under
 *          the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/operations/nls/messages', 'orion/webui/littlelib', 'orion/explorers/explorer', 'orion/operationsCommands'
	], function(messages, lib,	mExplorer, mOperationsCommands) {
	
	var exports = {};

	exports.OperationsExplorer = (function() {
		function OperationsExplorer(registry, commandRegistry, selection, operationsClient, parentId, toolbarId, selectionToolsId, actionScopeId) {
			this.parentId = parentId;
			this.registry = registry;
			this.commandRegistry = commandRegistry;
			this.selection = selection;
			this.toolbarId = toolbarId;
			this.selectionToolsId = selectionToolsId;
			this.operationsClient = operationsClient;
			this.actionScopeId = actionScopeId;
			this.renderer = new exports.OperationsRenderer({commandService: commandRegistry, actionScopeId: this.actionScopeId}, this);
		}

		OperationsExplorer.prototype = new mExplorer.Explorer();
		
		OperationsExplorer.prototype.loadOperations = function(){
			var that = this;
			function displayError(error){
				var display = [];
				display.Severity = "Error"; //$NON-NLS-0$
				display.HTML = false;
				
				try {
					var jsonData = JSON.parse(error);
					display.Message = jsonData.DetailedMessage ? jsonData.DetailedMessage : jsonData.Message;
				} catch (Exception) {
					display.Message = error;
				}
				
				that.serviceRegistry.getService("orion.page.message").setProgressResult(display); //$NON-NLS-0$
			}
			this.operationsClient.getOperations().then(function(globalOperations){
				var operationLocations = globalOperations.keys();
				var operations = {};
				for(var i=0; i<operationLocations.length; i++){
					var operationLocation = operationLocations[i];
					var operation = globalOperations.get(operationLocation);
					operation.Location = operationLocation;
					operations[operationLocation]= operation;
					if(operation.expires && new Date().getTime()>operation.expires){
						//operations expired
						globalOperations.remove(operationLocation);
						delete operations[operationLocation];
						continue;
					}
					var success = function (result){
						operations[this].operation = operations[this].operation || {};
						operations[this].operation.type = "loadend";
						that.changedItem(this);
					};
					var progress = function(operation){
						operations[this].operation = operation;
						that.changedItem(this);
					};
					var failure = function(error) {
						if(error.canceled){
							operation.deferred = that.operationsClient.getOperation(this);
							operation.deferred.then(success.bind(this), failure.bind(this), progress.bind(this));
							return;
						}
						if(error.HttpCode===404 && error.JsonData && error.JsonData.taskNotFound){
							globalOperations.remove(this);
							delete operations[this];
							that._loadOperationsList.bind(that)(operations);
							return;
						}
						operations[this].operation = operations[this].operation || {};
						if(error.Severity==="Cancel"){
							operations[this].operation.type = "abort";
						}else{
							operations[this].operation.type = "error";
						}
						operations[this].operation.error = error;
						that.changedItem(this);
					}; 
					operation.deferred = that.operationsClient.getOperation(operationLocation);
					operation.deferred.then(success.bind(operationLocation), failure.bind(operationLocation), progress.bind(operationLocation));
				}
				that._loadOperationsList.bind(that)(operations);
			}, displayError);
			
		};
		
		OperationsExplorer.prototype._loadOperationsList = function(operationsList){
			this.operations = operationsList;
			mOperationsCommands.updateNavTools(this.registry, this.commandRegistry, this, this.toolbarId, this.selectionToolsId, this.operations);
			this.model = new exports.OperationsModel(operationsList);
			this.createTree(this.parentId, this.model);
			this.getNavHandler().refreshModel(this.getNavDict(), this.model, operationsList);
		};
		
		OperationsExplorer.prototype.changedItem = function(location){
			var item = this.model.getItem.bind(this.model)(location);
			var row = this.getRow(item);
			lib.empty(row);
			this.renderer.renderRow(item, row);
		};
		
		return OperationsExplorer;
	}());
	
	exports.OperationsModel = (function(){
		
		function OperationsModel(operations){
			this.operations = operations;
			this.rootId = "operations";
			this.root = {type: "operations"};
		}
		
		OperationsModel.prototype = new mExplorer.ExplorerModel();
		
		OperationsModel.prototype.getRoot = function(onItem){
			onItem(this.root);
		};
		
		OperationsModel.prototype.getItem = function(location){
			var operationInfo = this.operations[location];
			operationInfo.Location = location;
			return operationInfo;
		};
		
		OperationsModel.prototype.getChildren = function(parentItem, onComplete){
			if(!parentItem || !parentItem.type==="operations"){
				onComplete([]);
				return;
			}
			var ret = [];
			for(var location in this.operations){
				ret.push(this.getItem(location));
			}
			onComplete(ret);
		};
		
		return OperationsModel;
	}());
	
	exports.OperationsRenderer = (function(){
		function OperationsRenderer (options, explorer) {
			this._init(options);
			this.options = options;
			this.explorer = explorer;
		}
		
		OperationsRenderer.prototype = new mExplorer.SelectionRenderer();
		
		OperationsRenderer.prototype.getCellHeaderElement = function(col_no){
			
			if (this.options['minimal']) //$NON-NLS-0$
				return;

			var col, h2;
			switch(col_no){
				case 0: 
					col = document.createElement("th");
					col.style.height = "8px;";
					h2 = document.createElement("h2");
					col.appendChild(h2);
					h2.textContent = messages["Name"];
					return col;
				case 1:
					col = document.createElement("th");
					col.style.height = "8px;";
					h2 = document.createElement("h2");
					col.appendChild(h2);
					h2.textContent = messages["Actions"];
					return col;
				case 2: 
					col = document.createElement("th");
					col.style.height = "8px;";
					h2 = document.createElement("h2");
					col.appendChild(h2);
					h2.textContent = messages["Status"];
					return col;
				case 3: 
					col = document.createElement("th");
					col.style.height = "8px;";
					h2 = document.createElement("h2");
					col.appendChild(h2);
					h2.textContent = messages["Scheduled"];
					return col;
			}
			
		};
		
		OperationsRenderer.prototype.getCellElement = function(col_no, item, tableRow){
			var col;
			switch(col_no){
			case 0:
				col = document.createElement("td"); //$NON-NLS-0$
				var div = document.createElement("div"); //$NON-NLS-0$
				col.appendChild(div);
				var operationIcon = document.createElement("span"); //$NON-NLS-0$
				div.appendChild(operationIcon);
				operationIcon.classList.add("imageSprite"); //$NON-NLS-0$

				var span = document.createElement("span"); //$NON-NLS-0$
				div.appendChild(span);
				span.classList.add("mainNavColumn");
				span.appendChild(document.createTextNode(item.Name)); 
				
				
				if(item.operation)
					switch(item.operation.type){
					case "Warning": //$NON-NLS-0$ //TODO no warning status
						operationIcon.classList.add("core-sprite-warning"); //$NON-NLS-0$
						break;
					case "error": //$NON-NLS-0$
						operationIcon.classList.add("core-sprite-error"); //$NON-NLS-0$
						break;
					case "loadstart":
					case "progress":
						operationIcon.classList.add("core-sprite-start"); //$NON-NLS-0$
						break;
					case "abort":
						operationIcon.classList.add("core-sprite-stop"); //$NON-NLS-0$
						break;
					case "load":
					case "loadend":
						operationIcon.classList.add("core-sprite-ok"); //$NON-NLS-0$
					}
				
				return col;
			case 1:
				return this.getActionsColumn(item, tableRow);
			case 2:
				var message = "";
				if(item.operation && item.operation.error){
					message = item.operation.error.Message || item.operation.error;
					if(item.operation.error.DetailedMessage && item.operation.error.DetailedMessage!=="")
						message += ": " + item.operation.error.DetailedMessage; //$NON-NLS-0$
				}
				col = document.createElement("td"); //$NON-NLS-0$
				col.textContent = message;
				return col;
			case 3:
				if(item.operation && item.operation.timestamp && parseInt(item.operation.timestamp)>0){
					col = document.createElement("td"); //$NON-NLS-0$
					col.textContent = new Date(parseInt(item.operation.timestamp)).toLocaleString();
					return col;
				}
				return document.createElement("td"); //$NON-NLS-0$
			}
		};
		
		return OperationsRenderer;
	}());

	return exports;
});