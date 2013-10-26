/*******************************************************************************
 * @license
 * Copyright (c) 2011,2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window define orion URL*/
/*browser:true*/

/*
 * This file is basically a copy from the client root directory.  It provides functions
 * that are needed by the Shell page, but are marked as private and therefore can
 * break unsuspecting clients at any time.  If public equivalents offering the required
 * functionality become available in the future then it should be possible to get rid
 * of this copy.
 *
 * shellPage.js calls _createOpenWithCommands() and _createCommandOptions(), which
 * depend on everything else in the file. 
 */
 
define(["require", "orion/Deferred", "orion/commands", "orion/regex", "orion/contentTypes", "orion/URITemplate", "orion/i18nUtil", "orion/URL-shim", "orion/PageLinks"],
	function(require, Deferred, mCommands, mRegex, mContentTypes, URITemplate, i18nUtil, _, PageLinks){

	/**
	 * Utility methods
	 * @class This class contains static utility methods for creating and managing commands from extension points
	 * related to file management.
	 * @name orion.extensionCommands
	 */
	var extensionCommandUtils  = {};
	
	// TODO working around https://bugs.eclipse.org/bugs/show_bug.cgi?id=373450
	var orionHome = PageLinks.getOrionHome();
	
	extensionCommandUtils._cloneItemWithoutChildren = function clone(item){
	    if (item === null || typeof(item) !== 'object') { //$NON-NLS-0$
	        return item;
	      }
	
	    var temp = item.constructor(); // changed
	
	    for(var key in item){
			if(key!=="children" && key!=="Children") { //$NON-NLS-1$ //$NON-NLS-0$
				temp[key] = clone(item[key]);
			}
	    }
	    return temp;
	};

	/**
	 * Converts "orion.navigate.openWith" service contributions into orion.navigate.command that open the appropriate editors.
	 * @returns {Object[]} The "open with" fileCommands
	 */
	extensionCommandUtils._createOpenWithCommands = function(serviceRegistry, contentTypes) {
		function getEditors() {
			var serviceReferences = serviceRegistry.getServiceReferences("orion.edit.editor"); //$NON-NLS-0$
			var editors = [];
			for (var i=0; i < serviceReferences.length; i++) {
				var serviceRef = serviceReferences[i], id = serviceRef.getProperty("id"); //$NON-NLS-0$
				editors.push({
					id: id,
					name: serviceRef.getProperty("name"), //$NON-NLS-0$
					nameKey: serviceRef.getProperty("nameKey"), //$NON-NLS-0$
					nls: serviceRef.getProperty("nls"), //$NON-NLS-0$
					uriTemplate: serviceRef.getProperty("orionTemplate") || serviceRef.getProperty("uriTemplate") //$NON-NLS-1$ //$NON-NLS-0$
				});
			}
			return editors;
		}

		function getEditorOpenWith(serviceRegistry, editor) {
			var openWithReferences = serviceRegistry.getServiceReferences("orion.navigate.openWith"); //$NON-NLS-0$
			var types = [];
			for (var i=0; i < openWithReferences.length; i++) {
				var ref = openWithReferences[i];
				if (ref.getProperty("editor") === editor.id) { //$NON-NLS-0$
					var ct = ref.getProperty("contentType"); //$NON-NLS-0$
					if (ct instanceof Array) {
						types = types.concat(ct);
					} else if (ct !== null && typeof ct !== "undefined") { //$NON-NLS-0$
						types.push(ct);
					}
				}
			}
			return types;
		}
		function getDefaultEditor(serviceRegistry) {
			var openWithReferences = serviceRegistry.getServiceReferences("orion.navigate.openWith.default"); //$NON-NLS-0$
			for (var i=0; i < openWithReferences.length; i++) {
				return {editor: openWithReferences[i].getProperty("editor")}; //$NON-NLS-0$
			}
			return null;
		}
		
		var editors = getEditors(), defaultEditor = getDefaultEditor(serviceRegistry);
		var fileCommands = [];

		for (var i=0; i < editors.length; i++) {
			var editor = editors[i];
			var isDefaultEditor = (defaultEditor && defaultEditor.editor === editor.id);
			var editorContentTypes = getEditorOpenWith(serviceRegistry, editor);
			if (editorContentTypes.length) {
				var properties = {
					name: editor.name || editor.id,
					nameKey: editor.nameKey,
					id: "eclipse.openWithCommand." + editor.id, //$NON-NLS-0$
					tooltip: editor.name,
					tooltipKey: editor.nameKey,
					contentType: editorContentTypes,
					uriTemplate: editor.uriTemplate,
					nls: editor.nls,
					forceSingleItem: true,
					isEditor: (isDefaultEditor ? "default": "editor") // Distinguishes from a normal fileCommand //$NON-NLS-1$ //$NON-NLS-0$
				};
				fileCommands.push({properties: properties, service: {}});
			}
		}
		return fileCommands;
	};
	
	/**
	 * Create a validator for a given set of service properties.  The validator should be able to 
	 * validate a given item using the "contentType" and "validationProperties" service properties.
	 */
	extensionCommandUtils._makeValidator = function(info, serviceRegistry, contentTypes, validationItemConverter) {
		function checkItem(item, key, match, validationProperty, validator) {
			var valid = false;
			var value;
			// item has the specified property
			if (item[key]) {
				if (!match) {  // value doesn't matter, just the presence of the property is enough
					value = item[key];
					valid = true;
				} else if (typeof(match) === 'string') {  // the value is a regular expression that should match some string //$NON-NLS-0$
					if (!typeof(item[key] === 'string')) { //$NON-NLS-0$
						// can't pattern match on a non-string
						return false;
					}
					if (validationProperty.variableName) {
						var patternMatch = new RegExp(match).exec(item[key]);
						if (patternMatch) {
							var firstMatch = patternMatch[0];
							if (validationProperty.variableMatchPosition === "before") { //$NON-NLS-0$
								value = item[key].substring(0, patternMatch.index);
							} else if (validationProperty.variableMatchPosition === "after") { //$NON-NLS-0$
								value = item[key].substring(patternMatch.index + firstMatch.length);
							} else if (validationProperty.variableMatchPosition === "only") { //$NON-NLS-0$
								value = firstMatch;
							} else {  // "all"
								value = item[key];
							}
							valid = true;
						}
					} else {
						return new RegExp(match).test(item[key]);
					}
				} else {
					if (item[key] === match) {
						value = item[key];
						valid = true;
					}
				}
				// now store any variable values and look for replacements
				if (valid && validationProperty.variableName) {
					// store the variable values in the validator, keyed by variable name.  Also remember which item this value applies to.
					validator[validationProperty.variableName] = value;
					validator.itemCached = item;
					if (validationProperty.replacements) {
						for (var i=0; i<validationProperty.replacements.length; i++) {
							var invalid = false;
							if (validationProperty.replacements[i].pattern) {	
								var from = validationProperty.replacements[i].pattern;
								var to = validationProperty.replacements[i].replacement || "";
								validator[validationProperty.variableName] = validator[validationProperty.variableName].replace(new RegExp(from), to);
							} else {
								invalid = true;
							}
							if (invalid) {
								window.console.log("Invalid replacements specified in validation property.  " + validationProperty.replacements[i]); //$NON-NLS-0$
							}
						}
					}
				}
				return valid;
			}
			return false;
		}
		
		function matchSinglePattern(item, propertyName, validationProperty, validator){
			var value = validationProperty.match;
			var key, keyLastSegments;
			if (propertyName.indexOf("|") >= 0) { //$NON-NLS-0$
				// the pipe means that any one of the piped properties can match
				key = propertyName.substring(0, propertyName.indexOf("|")); //$NON-NLS-0$
				keyLastSegments = propertyName.substring(propertyName.indexOf("|")+1); //$NON-NLS-0$
				// if key matches, we can stop.  No match is not a failure, look in the next segments.
				if (matchSinglePattern(item, key, validationProperty, validator)) {
					return true;
				} else {
					return matchSinglePattern(item, keyLastSegments, validationProperty, validator);
				}
			} else if (propertyName.indexOf(":") >= 0) { //$NON-NLS-0$
				// the colon is used to drill into a property
				key = propertyName.substring(0, propertyName.indexOf(":")); //$NON-NLS-0$
				keyLastSegments = propertyName.substring(propertyName.indexOf(":")+1); //$NON-NLS-0$
				// must have key and then check the next value
				if (item[key]) {
					return matchSinglePattern(item[key], keyLastSegments, validationProperty, validator);
				} else {
					return false;
				}
			} else {
				// we are checking a single property
				return checkItem(item, propertyName, value, validationProperty, validator);
			}
		}
		
		function validateSingleItem(item, contentTypes, validator){
			// first validation properties
			if (validator.info.validationProperties) {
				for (var i=0; i<validator.info.validationProperties.length; i++) {
					var validationProperty = validator.info.validationProperties[i];
					if (validationProperty.source) {
						var matchFound = matchSinglePattern(item, validationProperty.source, validationProperty, validator);
						if (!matchFound){
							return false;
						} 
					} else {
						window.console.log("Invalid validationProperties in " + info.id + ".  No source property specified."); //$NON-NLS-1$ //$NON-NLS-0$
						return false;
					}
				}
			}
			// now content types
			if (validator.info.contentType && contentTypes) {
				var foundMatch = false;
				var contentType = mContentTypes.getFilenameContentType(item.Name, contentTypes);
				if (contentType) {
					for (var i=0; i<validator.info.contentType.length; i++) {
						if (contentType.id === validator.info.contentType[i]) {
							foundMatch = true;
							break;
						}
					}
				}
				return foundMatch;
			} else {	
				return true;
			}
		}
	
		var validator = {info: info};
		validator.validationFunction =  function(items){
			if (typeof validationItemConverter === "function") { //$NON-NLS-0$
				items = validationItemConverter.call(this, items);
			}
			if (items) {
				if (Array.isArray(items)){
					if ((this.info.forceSingleItem || this.info.uriTemplate) && items.length !== 1) {
						return false;
					}
					if (items.length < 1){
						return false;
					}
				} else {
					items = [items];
				}
				
				for (var i=0; i<items.length; i++){
					if(!validateSingleItem(items[i], contentTypes, this)){
						return false;
					}
				}
				return true;
			}
			return false;
		};
		validator.generatesURI = function() {
			return !!this.info.uriTemplate;
		};
		
		validator.getURI = function(item) {
			if (this.info.uriTemplate) {
				var variableExpansions = {};
				// we need the properties of the item
				for (var property in item){
					if(Object.prototype.hasOwnProperty.call(item, property)){
						variableExpansions[property] = item[property];
					}
				}
				// now we need the variable expansions collected during validation.  
				if (this.info.validationProperties) {
					for (var i=0; i<this.info.validationProperties.length; i++) {
						var validationProperty = this.info.validationProperties[i];
						if (validationProperty.source && validationProperty.variableName) {
							// we may have just validated this item.  If so, we don't need to recompute the variable value.
							var alreadyCached = this.itemCached === item && this[validationProperty.variableName];
							if (!alreadyCached) {
								matchSinglePattern(item, validationProperty.source, validationProperty, this);
							}
							if (!item[validationProperty.variableName]) {
								variableExpansions[validationProperty.variableName] = this[validationProperty.variableName];
							} else {
								window.console.log("Variable name " + validationProperty.variableName + " in the extension " + this.info.id + " conflicts with an existing property in the item metadata."); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							}
						}
					}
				}
				// special properties.  Should already be in metadata.  See bug https://bugs.eclipse.org/bugs/show_bug.cgi?id=373450
				variableExpansions.OrionHome = orionHome;
				var uriTemplate = new URITemplate(this.info.uriTemplate);
				return uriTemplate.expand(variableExpansions);
			} 
			return null;
		};
		return validator;
	};
	
	// Turns an info object containing the service properties and the service (or reference) into Command options.
	extensionCommandUtils._createCommandOptions = function(/**Object*/ info, /**Service*/ serviceOrReference, serviceRegistry, contentTypesMap, /**boolean*/ createNavigateCommandCallback, /**optional function**/ validationItemConverter) {
		
		var deferred = new Deferred();
		
		function enhanceCommandOptions(commandOptions, deferred){
			var validator = extensionCommandUtils._makeValidator(info, serviceRegistry, contentTypesMap, validationItemConverter);
			commandOptions.visibleWhen = validator.validationFunction.bind(validator);
			
			if (createNavigateCommandCallback) {
				if (validator.generatesURI.bind(validator)()) {
					commandOptions.hrefCallback = function(data){
						var item = Array.isArray(data.items) ? data.items[0] : data.items;
						return validator.getURI.bind(validator)(item);
					};
				} else {
					var inf = info;
					commandOptions.callback = function(data){
						var shallowItemsClone;
						if (inf.forceSingleItem) {
							var item = Array.isArray(data.items) ? data.items[0] : data.items;
							shallowItemsClone = extensionCommandUtils._cloneItemWithoutChildren(item);
						} else {
							if (Array.isArray(data.items)) {
								shallowItemsClone = [];
								for (var j = 0; j<data.items.length; j++) {
									shallowItemsClone.push(extensionCommandUtils._cloneItemWithoutChildren(data.items[j]));
								}
							} else {
								shallowItemsClone = extensionCommandUtils._cloneItemWithoutChildren(data.items);
							}
						}
						if(serviceRegistry){
							var progress = serviceRegistry.getService("orion.page.progress");
						}
						if(serviceOrReference.run) {
							if(progress){
								progress.progress(serviceOrReference.run(shallowItemsClone), "Running command: " + commandOptions.name);
							}else {
								serviceOrReference.run(shallowItemsClone);
							}
						} else if (serviceRegistry) {
							if(progress){
								progress.progress(serviceRegistry.getService(serviceOrReference).run(shallowItemsClone), "Running command: " + commandOptions.name);
							} else {
								serviceRegistry.getService(serviceOrReference).run(shallowItemsClone);
							}
						}
					};
				}  // otherwise the caller will make an appropriate callback for the extension
			}
			deferred.resolve(commandOptions);
		}
		
		if(info.nls){
			i18nUtil.getMessageBundle(info.nls).then(function(commandMessages){
				var commandOptions = {
						name: info.nameKey ? commandMessages[info.nameKey] : info.name,
						image: info.image,
						id: info.id || info.name,
						tooltip: info.tooltipKey ? commandMessages[info.tooltipKey] : info.tooltip,
						isEditor: info.isEditor
				};
				enhanceCommandOptions(commandOptions, deferred);
			});
		} else {
			var commandOptions = {
					name: info.name,
					image: info.image,
					id: info.id || info.name,
					tooltip: info.tooltip,
					isEditor: info.isEditor
			};
			enhanceCommandOptions(commandOptions, deferred);
		}
		
		return deferred;
	};
	
	extensionCommandUtils.getOpenWithCommands = function(commandService) {
		var openWithCommands = [];
		for (var commandId in commandService._commandList) {
			var command = commandService._commandList[commandId];
			if (command.isEditor) {
				openWithCommands.push(command);
			}
		}
		return openWithCommands;
	};
	
	return extensionCommandUtils;
});
