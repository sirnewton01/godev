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

/*eslint-env browser, amd*/
define(['i18n!orion/operations/nls/messages', 'orion/webui/littlelib', 'orion/commands'], 
        function(messages, lib, mCommands) {
	/**
	 * @namespace The global container for eclipse APIs.
	 */ 
	var exports = {};
	//this function is just a closure for the global "doOnce" flag
	(function() {
		var doOnce = false;

		exports.updateNavTools = function(registry, commandService, explorer, toolbarId, selectionToolbarId, item) {
			var service = commandService;
			var toolbar = lib.node(toolbarId);
			if (toolbar) {
				service.destroy(toolbar);
			} else {
				throw messages["could not find toolbar "] + toolbarId;
			}
			service.renderCommands(toolbarId, toolbar, item, explorer, "button");   //$NON-NLS-0$
			if (selectionToolbarId) {
				var selectionTools = lib.node(selectionToolbarId);
				if (selectionTools) {
					service.destroy(selectionTools);
					service.renderCommands(selectionToolbarId, selectionTools, null, explorer, "button");  //$NON-NLS-0$
				}
			}

			// Stuff we do only the first time
			if (!doOnce) {
				doOnce = true;
				registry.getService("orion.page.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					var selectionTools = lib.node(selectionToolbarId);
					if (selectionTools) {
						service.destroy(selectionTools);
						service.renderCommands(selectionToolbarId, selectionTools, event.selections, explorer, "button"); //$NON-NLS-0$
					}
				});
			}
		};
		
		exports.createOperationsCommands = function(commandService, explorer, operationsClient){
			
			function _isOperationRunning(item){
				if(!item.operation || !item.operation.type){
					return false;
				}
				return (item.operation.type==="loadstart" || item.operation.type==="progress"); //$NON-NLS-1$ //$NON-NLS-0$
			}
			
			function _isOperationCancelable(item){
				if(item.operation && item.operation.cancelable){
					return true;
				}
				return false;
			}
		
			var removeCompletedOperationsCommand = new mCommands.Command({
				name : messages["Remove Completed"],
				tooltip : messages["rmCompleted"],
				id : "eclipse.removeCompletedOperations", //$NON-NLS-0$
				callback : function(data) {
					operationsClient.removeCompletedOperations().then(function(item){
						explorer.loadOperations.bind(explorer)();
					});
				},
				visibleWhen : function(item) {
					return true;
				}
			});
			commandService.addCommand(removeCompletedOperationsCommand);
			
			var removeOperationCommand = new mCommands.Command({
				name : messages["Remove"],
				tooltip : messages["rmFromOpList"],
				imageClass: "core-sprite-delete", //$NON-NLS-0$
				id : "eclipse.removeOperation", //$NON-NLS-0$
				callback : function(data) {
					var items = Array.isArray(data.items) ? data.items : [data.items];
					for (var i=0; i < items.length; i++) {
						var item = items[i];
						operationsClient.removeOperation.bind(operationsClient)(item.Location).then(function(){explorer.loadOperations.bind(explorer)();}, function(){explorer.loadOperations.bind(explorer)();});
					}
				},
				visibleWhen : function(items) {
					if(!Array.isArray(items) || items.length===0)
						return !_isOperationRunning(items);
					for(var i in items){
						if(_isOperationRunning(items[i])){
							return false;
						}
					}
					return true;
				}
			});
			commandService.addCommand(removeOperationCommand);
			
			var cancelOperationCommand = new mCommands.Command({
				name : messages["Cancel"],
				tooltip : messages["CancelOp"],
				imageClass: "core-sprite-stop", //$NON-NLS-0$
				id : "eclipse.cancelOperation", //$NON-NLS-0$
				callback : function(data) {
					var items = Array.isArray(data.items) ? data.items : [data.items];
					for (var i=0; i < items.length; i++) {
						var item = items[i];
						if(item.deferred){
							item.deferred.cancel();
						}
					}
				},
				visibleWhen : function(items) {
					if(!Array.isArray(items) || items.length===0){
						return (_isOperationRunning(items) && _isOperationCancelable(items));
					}
					for(var i in items){
						if(!_isOperationRunning(items[i]) || !_isOperationCancelable(items[i])){
							return false;
						}
					}
					return true;
				}
			});
			commandService.addCommand(cancelOperationCommand);
		};
	
	}());	
	return exports;	
});