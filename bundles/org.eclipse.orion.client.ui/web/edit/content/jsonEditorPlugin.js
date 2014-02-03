/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define document */
define([
	'orion/plugin',
	'edit/content/jsonExplorer',
	'orion/Deferred',
	'orion/commands',
	'orion/keyBinding',
	'orion/webui/littlelib'
], function(PluginProvider, mJSONExplorer, Deferred, mCommands, mKeyBinding, lib) {
	
	var json, showItem, expandItem, model, explorer, commandsProxy = new mCommands.CommandsProxy();
	
	var EDITOR_ID = "orion.jsonEditor"; //$NON-NLS-0$
	
	function updateModel(item, expand) {
		if (model) {
			showItem = item;
			expandItem = expand;
			return model.setText(JSON.stringify(json, null, "\t")); //$NON-NLS-0$
		}
		return new Deferred().reject();
	}
	
	function updateExplorer() {
		if (model) {
			model.getText().then(function(text) {
				json = {};
				try {
					json = JSON.parse(text);
				} catch (e) {
					//TODO - display error
				}
				if (!explorer) {
					explorer = new mJSONExplorer.JSONExplorer({parentId: document.body, update: updateModel});
				}
				explorer.display(json);
				if (showItem) {
					if (expandItem) {
						explorer.expandItem(showItem).then(function() {
							explorer.reveal(showItem);
						});
					} else {
						explorer.reveal(showItem);
					}
				}
			});
		}
	}
	
	var headers = {
		name: "Orion JSON Editor Plugin",
		version: "1.0", //$NON-NLS-0$
		description: "This plugin provides editor for JSON files."
	};

	var provider = new PluginProvider(headers);
	
	provider.registerService("orion.edit.editor", { //$NON-NLS-0$
		setTextModel: function(textModel) {
			model = textModel;

			updateExplorer();
			
			//TODO the commands proxy should not be the text model
			commandsProxy.setProxy(model);
			
			// hold on to the text model
			return new Deferred();
		},
		onChanged: function(evt) {
			updateExplorer();
		},
		registerKeys: function(keys) {
			var bindings = [];
			keys.forEach(function(key) {
				bindings.push(new mKeyBinding.KeyBinding(key.keyCode, key.mod1, key.mod2, key.mod3, key.mod4));			
			});
			commandsProxy.setKeyBindings(bindings);
		}
	}, {
		id: EDITOR_ID,
		nameKey: "Orion JSON Editor", //$NON-NLS-0$
		nls: "orion/nls/messages", //$NON-NLS-0$
		uriTemplate: "../edit/edit.html#{,Location,params*},editor=" + EDITOR_ID //$NON-NLS-0$
	});
		
	provider.registerService("orion.navigate.openWith", {}, { //$NON-NLS-0$
		editor: EDITOR_ID,
		contentType: ["application/json"] //$NON-NLS-0$
	});
	
	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run : function(text) {
			var key = "NewKey";
			var newValue = "NewValue", value;
			var item = explorer.getNavHandler().currentModel() || explorer.model._root;
			while (item) {
				value = item.value;
				if (Array.isArray(value)) {
					key = value.length + "";
					value.push(newValue);
				} else if (typeof value === "object") { //$NON-NLS-0$
					value[key] = newValue;
				} else {
					item = item.parent;
					continue;
				}
				updateModel({key: key, value: newValue, id: item.id + "-" + key, parent: item}); //$NON-NLS-0$
				break;
			}
			return null;
		}
	}, {
		name : "Add",
		contentTypes: ["application/json"], //$NON-NLS-0$
		editor: EDITOR_ID,
		key : [ "a", true ] //$NON-NLS-0$
	});
	
	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run : function(text) {
			var item = explorer.getNavHandler().currentModel();
			if (item) {
				var value = item.parent.value;
				if (Array.isArray(value)) {
					value.splice(item.key, 1);
				} else {
					delete value[item.key];
				}
				updateModel(item.parent, true);
			}
			return null;
		}
	}, {
		name : "Delete",
		contentTypes: ["application/json"], //$NON-NLS-0$
		editor: EDITOR_ID,
		key : [ 46 ] //$NON-NLS-0$
	});

	provider.connect();
});
