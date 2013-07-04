/*******************************************************************************
 * @license
 * Copyright (c) 2010,2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*jslint sub:true*/
 /*global define document window Image */
 
define(['require', 'orion/commands', 'orion/uiUtils', 'orion/PageUtil', 'orion/webui/littlelib', 'orion/webui/dropdown', 
	'text!orion/webui/dropdowntriggerbutton.html', 'text!orion/webui/submenutriggerbutton.html', 'text!orion/webui/checkedmenuitem.html', 'orion/webui/tooltip', 'orion/explorers/navigationUtils'], 
	function(require, Commands, UIUtil, PageUtil, lib, mDropdown, DropdownButtonFragment, SubMenuButtonFragment, CheckedMenuItemFragment, mTooltip, mNavUtils) {

	/**
	 * Constructs a new command registry with the given options.
	 * @class CommandRegistry can render commands appropriate for a particular scope and DOM element.
	 * @name orion.commandregistry.CommandRegistry
	 * @param {Object} options The registry options object
	 * @param {orion.selection.Selection} [options.selection] Optional selection service.
	 */
	function CommandRegistry(options) {
		this._commandList = {};
		this._contributionsByScopeId = {};
		this._activeBindings = {};
		this._urlBindings = {};
		this._pendingBindings = {}; // bindings for as-yet-unknown commands
		this._init(options);
		this._parameterCollector = null;
	}
	CommandRegistry.prototype = /** @lends orion.commandregistry.CommandRegistry.prototype */ {
		_init: function(options) {
			this._selectionService = options.selection;
			var self = this;
			Commands.setKeyBindingProvider(function() { return self._activeBindings; });
		},
		
		/**
		 * Process the provided URL to determine whether any commands should be invoked.  Note that we never
		 * invoke a command callback by URL, only its parameter collector.  If a parameter collector is not
		 * specified, commands in the URL will be ignored.
		 *
		 * @param {String} url a url that may contain URL bindings.
		 */
		processURL: function(url) {
			for (var id in this._urlBindings) {
				if (this._urlBindings[id] && this._urlBindings[id].urlBinding && this._urlBindings[id].command) {
					var match = this._urlBindings[id].urlBinding.match(url);
					if (match) {
						var urlBinding = this._urlBindings[id];
						var command = urlBinding.command;
						var invocation = urlBinding.invocation;
						// If the command has not rendered (visibleWhen=false, etc.) we don't have an invocation.
						if (invocation && invocation.parameters && command.callback) {
							invocation.parameters.setValue(match.parameterName, match.parameterValue);
							var self = this;
							window.setTimeout(function() {
								self._invoke(invocation);
							}, 0);
							return;
						}
					}
				}
			}
		},
		
		/**
		 * @param {String} commandId
		 * @returns {orion.commands.Command}
		 */
		findCommand: function(commandId) {
			return this._commandList[commandId];
		}, 
		
		/**
		 * Run the command with the specified commandId.
		 *
		 * @param {String} commandId the id of the command to run.
		 * @param {Object} item the item on which the command should run.
		 * @param {Object} handler the handler for the command.
		 * @param {orion.commands.ParametersDescription} parameters used on this invocation.  Optional.
		 *
		 * Note:  The current implementation will only run the command if a URL binding has been
		 * specified, or if an item to run the command against has been specified.  
		 */
		runCommand: function(commandId, item, handler, parameters) {
			var self = this;
			if (item) {
				var command = this._commandList[commandId];
				var enabled = command && (command.visibleWhen ? command.visibleWhen(item) : true);
				if (enabled && command.callback) {
					self._invoke(new Commands.CommandInvocation(handler, item, null, command, self), parameters);
				}
			} else {
				//TODO should we be keeping invocation context for commands without bindings? 
				var binding = this._urlBindings[commandId];
				if (binding && binding.command) {
					if (binding.command.callback) {
						self._invoke(binding.invocation, parameters);
					}
				}
			}
		},
		
		/**
		 * Return the default selection service that is being used when commands should apply against a selection.
		 */
		getSelectionService: function() {
			return this._selectionService;
		},


		/**
		 * Interface for a parameter collector.
		 * @name orion.commandregistry.ParameterCollector
		 * @class
		 */
		/**
		 * Open a parameter collector and return the dom node where parameter information should be inserted.
		 * @name orion.commandregistry.ParameterCollector#open
		 * @function
		 * @param {String|DOMElement} commandNode the node containing the triggering command
		 * @param {Function} fillFunction a function that will fill the parameter area
		 * @param {Function} onClose a function that will be called when the parameter area is closed
		 * @returns {Boolean} Whether the node is open.
		 */
		/**
		 * Closes any active parameter collectors.
		 * @name orion.commandregistry.ParameterCollector#close
		 * @function
		 */
		/**
		 * Returns a function that can be used to fill a specified parent node with parameter information.
		 * @name orion.commandregistry.ParameterCollector#getFillFunction
		 * @function
		 * @param {orion.commands.CommandInvocation} the command invocation used when gathering parameters
		 * @param {Function} closeFunction an optional function called when the area must be closed. 
		 * @returns {Function} a function that can fill the specified dom node with parameter collection behavior
		 */
		/**
		 * Collect parameters for the given command.
		 * @name orion.commandregistry.ParameterCollector#collectParameters
		 * @function
		 * @param {orion.commands.CommandInvocation} commandInvocation The command invocation
		 * @returns {Boolean} Whether or not required parameters were collected.
		 */
		/**
		 * Provide an object that can collect parameters for a given "tool" command.  When a command that
		 * describes its required parameters is shown in a toolbar (as an image, button, or link), clicking
		 * the command will invoke any registered parameterCollector before calling the command's callback.
		 * This hook allows a page to define a standard way for collecting required parameters that is 
		 * appropriate for the page architecture.  If no parameterCollector is specified, then the command callback
		 * will be responsible for collecting parameters.
		 *
		 * @param {orion.commandregistry.ParameterCollector} parameterCollector
		 */
		setParameterCollector: function(parameterCollector) {
			this._parameterCollector = parameterCollector;
		},

		/**
		 * Open a parameter collector suitable for collecting information about a command.
		 * Once a collector is created, the specified function is used to fill it with
		 * information needed by the command.  This method is used for commands that cannot
		 * rely on a simple parameter description to collect parameters.  Commands that describe
		 * their required parameters do not need to use this method because the command framework
		 * will open and close parameter collectors as needed and call the command callback with
		 * the values of those parameters.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command, or a node in the parameter collector area
		 * @param {Function} fillFunction a function that will fill the parameter area
		 * @param {Function} onClose a function that will be called when the user closes the collector
		 */
		openParameterCollector: function(node, fillFunction, onClose) {
			if (this._parameterCollector) {
				this._parameterCollector.close();
				this._parameterCollector.open(node, fillFunction, onClose);
			}
		},
		
		/**
		 * Open a parameter collector to confirm a command.
		 *
		 * @param {DOMElement} node the dom node that is displaying the command
		 * @param {String} message the message to show when confirming the command
		 * @param {String} yesString the label to show on a yes/true choice
		 * @param {String} noString the label to show on a no/false choice
		 * @param {Boolean} modal indicates whether the confirmation prompt should be modal.
		 * @param {Function} onConfirm a function that will be called when the user confirms the command.  The function
		 * will be called with boolean indicating whether the command was confirmed.
		 */
		confirm: function(node, message, yesString, noString, modal, onConfirm) {
			var result = false;
			if (this._parameterCollector && !modal) {
				var self = this;
				this._parameterCollector.close();
				var opened = this._parameterCollector.open(node, 
					function(parent, buttonParent) {
						var label = document.createElement("span"); //$NON-NLS-0$
						label.classList.add("parameterPrompt"); //$NON-NLS-0$
						label.textContent = message;
						parent.appendChild(label);
						var yesButton = document.createElement("button"); //$NON-NLS-0$
						yesButton.addEventListener("click", function(event) { //$NON-NLS-0$
							result = true;
							self._parameterCollector.close();
						}, false);
						buttonParent.appendChild(yesButton);
						yesButton.appendChild(document.createTextNode(yesString)); //$NON-NLS-0$
						yesButton.className = "dismissButton"; //$NON-NLS-0$
						var button = document.createElement("button"); //$NON-NLS-0$
						button.addEventListener("click", function(event) { //$NON-NLS-0$
							result = false;
							self._parameterCollector.close();
						}, false);
						buttonParent.appendChild(button);
						button.appendChild(document.createTextNode(noString)); //$NON-NLS-0$
						button.className = "dismissButton"; //$NON-NLS-0$
						return yesButton;
					},
					function() {
						onConfirm(result);
					}
				);
				if (opened) {
					return;
				}
			} 
			result = window.confirm(message);
			onConfirm(result);
		},
		
		/**
		 * Close any active parameter collector.  This method should be used to deactivate a
		 * parameter collector that was opened with <code>openParameterCollector</code>.
		 * Commands that describe their required parameters do not need to use this method 
		 * because the command framework will open and close parameter collectors as needed and 
		 * call the command callback with the values of those parameters.
		 */
		closeParameterCollector: function() {
			if (this._parameterCollector) {
				this._parameterCollector.close();
			}
		},
		
		/**
		 * Returns whether this registry has been configured to collect command parameters
		 *
		 * @returns {Boolean} whether or not this registry is configured to collect parameters.
		 */
		collectsParameters: function() {
			return this._parameterCollector;
		},
		
		/*
		 * Invoke the specified command, collecting parameters if necessary.  This is used inside the framework
		 * when the user invokes a command. If parameters are specified, then these parameters should be used
		 * in lieu of the invocation's parameters.
		 *
		 */
		_invoke: function(commandInvocation, parameters) {
			return this._collectAndInvoke(commandInvocation.makeCopy(parameters), false);
		},
		
	
		/*
		 * This method is the actual implementation for collecting parameters and invoking a callback.
		 * "forceCollect" specifies whether we should always collect parameters or consult the parameters description to see if we should.
		 */
		_collectAndInvoke: function(commandInvocation, forceCollect) {
			if (commandInvocation) {
				// Establish whether we should be trying to collect parameters. 
				if (this._parameterCollector && commandInvocation.parameters && commandInvocation.parameters.hasParameters() && 
					(forceCollect || commandInvocation.parameters.shouldCollectParameters())) {
					var collecting = false;
					commandInvocation.parameters.updateParameters(commandInvocation);
					// Consult shouldCollectParameters() again to verify we still need collection. Due to updateParameters(), the CommandInvocation
					// could have dynamically set its parameters to null (meaning no collection should be done).
					if (commandInvocation.parameters.shouldCollectParameters()) {
						collecting = this._parameterCollector.collectParameters(commandInvocation);
						// The parameter collector cannot collect.  We will do a default implementation using a popup.
						if (!collecting) {
							var tooltip = new mTooltip.Tooltip({
								node: commandInvocation.domNode,
								trigger: "click", //$NON-NLS-0$
								position: ["below", "right", "above", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							});
							var parameterArea = tooltip.contentContainer();
							parameterArea.classList.add("parameterPopup"); //$NON-NLS-0$
							var originalFocusNode = window.document.activeElement;
							var focusNode = this._parameterCollector.getFillFunction(commandInvocation, function() {
								if (originalFocusNode) {
									originalFocusNode.focus();
								}
								tooltip.destroy();
							})(parameterArea);
							tooltip.show();
							window.setTimeout(function() {
								focusNode.focus();
								focusNode.select();
							}, 0);
							collecting = true;
						}
					}
					if (!collecting) {
						// Just call the callback with the information we had.
						commandInvocation.command.callback.call(commandInvocation.handler || window, commandInvocation);
					}
				} else {
					// We should not be trying to collect parameters, just call the callback.
					commandInvocation.command.callback.call(commandInvocation.handler || window, commandInvocation);
				}
			} else {
				window.console.log("Client attempted to invoke command without an available (rendered) command invocation"); //$NON-NLS-0$
			}
		},
		
		/**
		 * Collect the parameters specified in the given command invocation.  If parameters are
		 * collected successfully, invoke the command's callback. This method is used by clients who want to 
		 * control the timing of parameter collection.  For example, if a command must be executed before it can
		 * be determined what parameters are known, the client can try the command in the callback and then call
		 * this function if parameters are needed.  In this case, clients typically configure the parameters description
		 * options with "options.clientWillCollect" set to true.
		 *
		 * @see orion.commands.ParametersDescription
		 *
		 * @param {orion.commands.CommandInvocation} commandInvocation the current invocation of the command 
		 */
		collectParameters: function(commandInvocation) {
			this._collectAndInvoke(commandInvocation, true); 
		},
		
		/**
		 * Show the keybindings that are registered with the command registry inside the specified target node.
		 * @param {KeyAssistPanel} keyAssist the key assist panel
		 */
		showKeyBindings: function(keyAssist) {
			var scopes = {};
			var bindingString, binding;
			// see commands.js _processKey
			function executeBinding(activeBinding) {
				var invocation = activeBinding.invocation;
				if (invocation) {
					var command = activeBinding.command;
					if (command.hrefCallback) {
						var href = command.hrefCallback.call(invocation.handler || window, invocation);
						if (href.then){
							href.then(function(l){
								window.open(l);
							});
						} else {
							// We assume window open since there's no link gesture to tell us what to do.
							window.open(href);
						}
						return;
					} else if (command.onClick || command.callback) {
						(command.onClick || command.callback).call(invocation.handler || window, invocation);
						return;
					}
				}
			}
			function execute(activeBinding) {
				return function() {
					executeBinding(activeBinding);
				};
			}
			var bindings = [];
			for (var aBinding in this._activeBindings) {
				binding = this._activeBindings[aBinding];
				if (binding && binding.keyBinding && binding.command) {
					bindings.push(binding);
				}
			}
			bindings.sort(function (a, b) {
				return a.command.name.localeCompare(b.command.name);
			});
			for (var i=0; i<bindings.length; i++) {
				binding = bindings[i];
				// skip scopes and process at end
				if (binding.keyBinding.scopeName) {
					if (!scopes[binding.keyBinding.scopeName]) {
						scopes[binding.keyBinding.scopeName] = [];
					}
					scopes[binding.keyBinding.scopeName].push(binding);
				} else {
					bindingString = UIUtil.getUserKeyString(binding.keyBinding);
					keyAssist.createItem(bindingString, binding.command.name, execute(binding));
				}
			}
			for (var scopedBinding in scopes) {
				if (scopes[scopedBinding].length && scopes[scopedBinding].length > 0) {
					keyAssist.createHeader(scopedBinding);
					scopes[scopedBinding].forEach(function(binding) {
						bindingString = UIUtil.getUserKeyString(binding.keyBinding);
						keyAssist.createItem(bindingString, binding.command.name, execute(binding));
					});
				}	
			}
		},
		
		/** 
		 * Add a command to the command registry.  Nothing will be shown in the UI
		 * until this command is referenced in a contribution.
		 * @param {orion.commands.Command} command The command being added.
		 * @see #registerCommandContribution
		 */
		addCommand: function(command) {
			this._commandList[command.id] = command;
			// Resolve any pending key/url bindings against this command
			var pending = this._pendingBindings[command.id];
			if (pending) {
				var _self = this;
				pending.forEach(function(binding) {
					_self._addBinding(command, binding.type, binding.binding, binding.bindingOnly);
				});
				delete this._pendingBindings[command.id];
			}
		},
		
		/**
		 * Registers a command group and specifies visual information about the group.
		 * @param {String} scopeId The id of a DOM element in which the group should be visible.  Required.
		 *  When commands are rendered for a particular element, the group will be shown only if its scopeId
		 *  matches the id being rendered.
		 * @param {String} groupId The id of the group, must be unique.  May be used for a dom node id of
		 *  the element representing the group
		 * @param {Number} position The relative position of the group within its parent.  Required.
		 * @param {String} [title] The title of the group, optional
		 * @param {String} [parentPath] The path of parent groups, separated by '/'.  For example,
		 *  a path of "group1Id/group2Id" indicates that the group belongs as a child of 
		 *  group2Id, which is itself a child of group1Id.  Optional.
		 * @param {String} [emptyGroupMessage] A message to show if the group is empty and the user activates the UI element
		 *  representing the group.  Optional.  If not specified, then the group UI element won't be shown when it is empty.
		 * @param {String} [imageClass] CSS class of an image to use for this group.
		 * @param {String} [tooltip] Tooltip to show on this group. If not provided, and the group uses an <code>imageClass</code>,
		 * the <code>title</code> will be used as the tooltip.
		 */	
		addCommandGroup: function(scopeId, groupId, position, title, parentPath, emptyGroupMessage, imageClass, tooltip) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			var parentTable = this._contributionsByScopeId[scopeId];
			if (parentPath) {
				parentTable = this._createEntryForPath(parentTable, parentPath);		
			} 
			if (parentTable[groupId]) {
				// update existing group definition if info has been supplied
				if (title) {
					parentTable[groupId].title = title;
				}
				if (position) {
					parentTable[groupId].position = position;
				}
				if (imageClass) {
					parentTable[groupId].imageClass = imageClass;
				}
				if (tooltip) {
					parentTable[groupId].tooltip = tooltip;
				}

				parentTable[groupId].emptyGroupMessage = emptyGroupMessage;
			} else {
				// create new group definition
				parentTable[groupId] = {title: title, 
										position: position, 
										emptyGroupMessage: emptyGroupMessage,
										imageClass: imageClass,
										tooltip: tooltip,
										children: {}};
				parentTable.sortedContributions = null;
			}
		},
		
		_createEntryForPath: function(parentTable, parentPath) {
			if (parentPath) {
				var segments = parentPath.split("/"); //$NON-NLS-0$
				segments.forEach(function(segment) {
					if (segment.length > 1) {
						if (!parentTable[segment]) {
							// empty slot with children
							parentTable[segment] = {position: 0, children: {}};
						} 
						parentTable = parentTable[segment].children;
					}
				});
			}
			return parentTable;	
		},
		
		/**
		 * Register a selection service that should be used for certain command scopes.
		 * @param {String} scopeId The id describing the scope for which this selection service applies.  Required.
		 *  Only contributions made to this scope will use the selection service.
		 * @param {orion.selection.Selection} selectionService the selection service for the scope.
		 */
		registerSelectionService: function(scopeId, selectionService) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			this._contributionsByScopeId[scopeId].localSelectionService = selectionService;
		},
		
		/**
		 * Register a command contribution, which identifies how a command appears
		 * on a page and how it is invoked.
		 * @param {String} scopeId The id describing the scope of the command.  Required.
		 *  This scope id is used when rendering commands.
		 * @param {String} commandId the id of the command.  Required.
		 * @param {Number} position the relative position of the command within its parent.  Required.
		 * @param {String} [parentPath=null] the path of any parent groups, separated by '/'.  For example,
		 *  a path of "group1Id/group2Id/command" indicates that the command belongs as a child of 
		 *  group2Id, which is itself a child of group1Id.  Optional.
		 * @param {boolean} [bindingOnly=false] if true, then the command is never rendered, but the key or URL binding is hooked.
		 * @param {orion.editor.KeyBinding} [keyBinding] a keyBinding for the command.  Optional.
		 * @param {orion.commands.URLBinding} [urlBinding] a url binding for the command.  Optional.
		 */
		registerCommandContribution: function(scopeId, commandId, position, parentPath, bindingOnly, keyBinding, urlBinding) {
			if (!this._contributionsByScopeId[scopeId]) {
				this._contributionsByScopeId[scopeId] = {};
			}
			var parentTable = this._contributionsByScopeId[scopeId];
			if (parentPath) {
				parentTable = this._createEntryForPath(parentTable, parentPath);		
			} 
			
			// store the contribution
			parentTable[commandId] = {position: position};
			
			var command;
			// add to the bindings table now
			if (keyBinding) {
				command = this._commandList[commandId];
				if (command) {
					this._addBinding(command, "key", keyBinding, bindingOnly); //$NON-NLS-0$
				} else {
					this._addPendingBinding(commandId, "key", keyBinding, bindingOnly); //$NON-NLS-0$
				}
			}
			
			// add to the url key table
			if (urlBinding) {
				command = this._commandList[commandId];
				if (command) {
					this._addBinding(command, "url", urlBinding, bindingOnly); //$NON-NLS-0$
				} else {
					this._addPendingBinding(commandId, "url", urlBinding, bindingOnly); //$NON-NLS-0$
				}
			}
			// get rid of sort cache because we have a new contribution
			parentTable.sortedContributions = null;
		},

		/**
		 * @param {"key"|"url"} type
		 */
		_addBinding: function(command, type, binding, bindingOnly) {
			if (!command.id) {
				throw new Error("No command id: " + command);
			}
			if (type === "key") { //$NON-NLS-0$
				this._activeBindings[command.id] = {command: command, keyBinding: binding, bindingOnly: bindingOnly};
			} else if (type === "url") { //$NON-NLS-0$
				this._urlBindings[command.id] = {command: command, urlBinding: binding, bindingOnly: bindingOnly};
			}
		},

		/**
		 * Remembers a key or url binding that has not yet been resolved to a command.
		 *  @param {"key"|"url"} type
		 */
		_addPendingBinding: function(commandId, type, binding, bindingOnly) {
			this._pendingBindings[commandId] = this._pendingBindings[commandId] || [];
			this._pendingBindings[commandId].push({
				type: type,
				binding: binding,
				bindingOnly: bindingOnly
			});
		},

		_checkForTrailingSeparator: function(parent, style, autoRemove) {
			var last;
			if (style === "tool" || style === "button") { //$NON-NLS-1$ //$NON-NLS-0$
				last = parent.childNodes.length > 0 ? parent.childNodes[parent.childNodes.length-1] : null;
				if (last && last.classList.contains("commandSeparator")) { //$NON-NLS-0$
					if (autoRemove) {
						parent.removeChild(last);
						return false;
					} 
					return true;
				}
			}
			if (style === "menu") { //$NON-NLS-0$
				var items = lib.$$array("li > *", parent); //$NON-NLS-0$
				if (items.length > 0 && items[items.length - 1].classList.contains("dropdownSeparator")) { //$NON-NLS-0$
					last = items[items.length - 1];
					if (autoRemove) {
						// reachy reachy.  Remove the anchor's li parent
						last.parentNode.parentNode.removeChild(last.parentNode);
						return false;
					} else {
						return true;
					}
				}
			}
			return false;
		},

		/**
		 * Render the commands that are appropriate for the given scope.
		 * @param {String} scopeId The id describing the scope for which we are rendering commands.  Required.
		 *  Only contributions made to this scope will be rendered.
		 * @param {DOMElement} parent The element in which commands should be rendered.  If commands have been
		 *  previously rendered into this element, it is up to the caller to empty any previously generated content.
		 * @param {Object} [items] An item or array of items to which the command applies.  Optional.  If no
		 *  items are specified and a selection service was specified at creation time, then the selection
		 *  service will be used to determine which items are involved. 
		 * @param {Object} handler The object that should perform the command
		 * @param {String} renderType The style in which the command should be rendered.  "tool" will render
		 *  a tool image in the dom.  "button" will render a text button.  "menu" will render menu items.  
		 * @param {Object} [userData] Optional user data that should be attached to generated command callbacks
		 * @param {Object[]} [domNodeWrapperList] Optional an array used to record any DOM nodes that are rendered during this call.
		 *  If an array is provided, then as commands are rendered, an object will be created to represent the command's node.  
		 *  The object will always have the property "domNode" which contains the node created for the command.  If the command is
		 *  rendered using other means (toolkit widget) then the optional property "widget" should contain the toolkit
		 *  object that represents the specified dom node.
		 */	
		renderCommands: function(scopeId, parent, items, handler, renderType, userData, domNodeWrapperList) {
			if (typeof(scopeId) !== "string") { //$NON-NLS-0$
				throw "a scope id for rendering must be specified"; //$NON-NLS-0$
			}
			parent = lib.node(parent);
			if (!parent) { 
				throw "no parent";  //$NON-NLS-0$
			}

			var contributions = this._contributionsByScopeId[scopeId];

			if (!items && contributions) {
				var selectionService = contributions.localSelectionService || this._selectionService;
				var self = this;
				if (selectionService) {
					selectionService.getSelections(function(selections) {
						self.renderCommands(scopeId, parent, selections, handler, renderType, userData);
					});
				}
				return;
			} 
			if (contributions) {
				this._render(this._contributionsByScopeId[scopeId], parent, items, handler, renderType || "button", userData, domNodeWrapperList); //$NON-NLS-0$
				// If the last thing we rendered was a group, it's possible there is an unnecessary trailing separator.
				this._checkForTrailingSeparator(parent, renderType, true);
			}
		},
		
		/**
		 * Destroy all DOM nodes and any other resources used by rendered commands.
		 * This call does not remove the commands from the command registry.  Clients typically call this
		 * function to empty a command area when a client wants to render the commands again due to some 
		 * change in state.  
		 * @param {String|DOMElement} parent The id or DOM node that should be emptied.
		 */
		destroy: function(parent) {
			parent = lib.node(parent);
			if (!parent) { 
				throw "no parent";  //$NON-NLS-0$
			}
			while (parent.hasChildNodes()) {
				var node = parent.firstChild;
				if (node.commandTooltip) {
					node.commandTooltip.destroy();
				}
				if (node.emptyGroupTooltip) {
					node.emptyGroupTooltip.destroy();
				}
				this.destroy(node);
				parent.removeChild(node);
			}
		},
		
		_render: function(contributions, parent, items, handler, renderType, userData, domNodeWrapperList) {
			// sort the items
			var sortedByPosition = contributions.sortedContributions;
			if (!sortedByPosition) {
				sortedByPosition = [];
				var pushedItem = false;
				for (var key in contributions) {
				    if (!contributions.hasOwnProperty || contributions.hasOwnProperty(key)) {
						var item = contributions[key];
						if (item && typeof(item.position) === "number") { //$NON-NLS-0$
							item.id = key;
							sortedByPosition.push(item);
							pushedItem = true;
						}
					}
				}
				if (pushedItem) {
					sortedByPosition.sort(function(a,b) {
						return a.position-b.position;
					});
					contributions.sortedContributions = sortedByPosition;
				}
			}
			// now traverse the sorted contributions and render as we go
			var index = 0;
			var self = this;
			sortedByPosition.forEach(function(contribution) {
				var id, invocation;
				
				if( !contribution.imageClass ){
					contribution.imageClass = null;
				}
				
				if (contribution.children && Object.getOwnPropertyNames(contribution.children).length > 0) {
					var childContributions = contribution.children;
					var created;
					if (renderType === "tool" || renderType === "button") { //$NON-NLS-1$ //$NON-NLS-0$
						if (contribution.title) {
							// We need a named menu button.  We used to first render into the menu and only 
							// add a menu button in the dom when we knew items were actually rendered.
							// For performance, though, we need to be asynchronous in traversing children, so we will 
							// add the menu button always and then remove it if we don't need it.  
							// If we wait until the end of asynch processing to add the menu button, the layout will have 
							// to be redone. The down side to always adding the menu button is that we may find out we didn't
							// need it after all, which could cause layout to change.

							created = self._createDropdownMenu(parent, contribution.title, null /*nested*/, null /*populateFunc*/, contribution.imageClass, contribution.tooltip);
							if(domNodeWrapperList){
								mNavUtils.generateNavGrid(domNodeWrapperList, created.menuButton);
							}

							// render the children asynchronously
							window.setTimeout(function() {
								self._render(contribution.children, created.menu, items, handler, "menu", userData, domNodeWrapperList);  //$NON-NLS-0$
								// special post-processing when we've created a menu in an image bar.  We want to get rid 
								// of a trailing separator in the menu first, and then decide if our menu is necessary
								self._checkForTrailingSeparator(created.menu, "menu", true);  //$NON-NLS-0$
								// now determine if we actually needed the menu or not
								if (created.menu.childNodes.length === 0) {
									if (contribution.emptyGroupMessage) {
										if (!created.menuButton.emptyGroupTooltip) {
											created.menuButton.emptyGroupTooltip = new mTooltip.Tooltip({
												node: created.menuButton,
												text: contribution.emptyGroupMessage,
												trigger: "click", //$NON-NLS-0$
												position: ["below", "right", "above", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
											});
										}
									} else {
										if(domNodeWrapperList){
											mNavUtils.removeNavGrid(domNodeWrapperList, created.menuButton);
										}
										if (created.menu.parentNode) {
											created.menu.parentNode.removeChild(created.menu);
										}
										if (created.destroyButton && created.destroyButton.parentNode) {
											created.destroyButton.parentNode.removeChild(created.destroyButton);
										}
									}
								} else {
									created.menuButton.style.visibility = "visible";  //$NON-NLS-0$
								}
							}, 0);
						} else {  
							// rendering a group using a separator on each end. We do it synchronously because order matters with
							// non grouped items.
							var sep;
							// Only draw a separator if there is a non-separator preceding it.
							if (parent.childNodes.length > 0 && !self._checkForTrailingSeparator(parent, renderType)) {
								sep = self.generateSeparatorImage(parent);
							}
							self._render(childContributions, parent, items, handler, renderType, userData, domNodeWrapperList); 
	
							// make sure that more than just the separator got rendered before rendering a trailing separator
							if (parent.childNodes.length > 0) {
								var lastRendered = parent.childNodes[parent.childNodes.length - 1];
								if (lastRendered !== sep) {
									sep = self.generateSeparatorImage(parent);
								}
							}
						}
					} else {
						// group within a menu
						if (contribution.title) {
							var subMenu = self._createDropdownMenu(parent, contribution.title, true, null, null, contribution.imageClass);
							if (subMenu) {
								self._render(childContributions, subMenu.menu, items, handler, "menu", userData, domNodeWrapperList);  //$NON-NLS-0$
								// If no items rendered in the submenu, we don't need it.
								if (subMenu.menu.childNodes.length === 0 && subMenu.destroyButton) {
									parent.removeChild(subMenu.destroyButton);
								}
							}
						} else {  
							// menu items with leading and trailing separators
							// don't render a separator if there is nothing preceding
							if (parent.childNodes.length > 0) {
								self._generateMenuSeparator(parent);
							}
							// synchronously render the children since order matters
							self._render(childContributions, parent, items, handler, renderType, userData, domNodeWrapperList); 
							// Add a trailing separator if children rendered.
							self._generateMenuSeparator(parent);
						}
					}
				} else {
					// processing atomic commands
					var command = self._commandList[contribution.id];
					var render = command ? true : false;
					var keyBinding = null;
					var urlBinding = null;
					if (command) {
						invocation = new Commands.CommandInvocation(handler, items, userData, command, self);
						invocation.domParent = parent;
						var enabled = render && (command.visibleWhen ? command.visibleWhen(items) : true);
						// ensure that keybindings are bound to the current handler, items, and user data
						if (self._activeBindings[command.id] && self._activeBindings[command.id].keyBinding) {
							keyBinding = self._activeBindings[command.id];
							if (enabled) {
								keyBinding.invocation = invocation;
							} else {
								keyBinding.invocation = null;
							}
							// if it is a binding only, don't render the command.
							if (keyBinding.bindingOnly) {
								render = false;
							}
						}
						
						// same for url bindings
						if (self._urlBindings[command.id] && self._urlBindings[command.id].urlBinding) {
							urlBinding = self._urlBindings[command.id];
							if (enabled) {
								urlBinding.invocation = invocation;
							} else {
								urlBinding.invocation = null;
							}
							if (urlBinding.bindingOnly) {
								render = false;
							}
						}
						render = render && enabled;
					}
					if (render) {
						if (command.choiceCallback) {
							// special case.  The item wants to provide a set of choices
							var menuParent;
							var nodeClass;
							var nested;
							if (renderType === "tool" || renderType === "button") { //$NON-NLS-1$ //$NON-NLS-0$
								menuParent = parent;
								nested = false;
								if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
									menuParent = document.createElement("li"); //$NON-NLS-0$
									parent.appendChild(menuParent);
								} else {
									nodeClass = "commandMargins"; //$NON-NLS-0$
								}
							} else {
								menuParent = parent;
								nested = true;
							}
							// dropdown button
							var populateFunction = function(menu) {
								command.populateChoicesMenu(menu, items, handler, userData, self);
							};
							self._createDropdownMenu(menuParent, command.name, nested, populateFunction.bind(command), command.imageClass, command.tooltip || command.title);
						} else {
							// Rendering atomic commands as buttons or menus
							invocation.handler = invocation.handler || this;
							invocation.domParent = parent;
							var element;
							var onClick = function(event) {
								self._invoke(invocation);
							};
							if (renderType === "menu") { //$NON-NLS-0$
								element = Commands.createCommandMenuItem(parent, command, invocation, null, onClick);
							} else {
								id = renderType + command.id + index;  //$NON-NLS-0$ // using the index ensures unique ids within the DOM when a command repeats for each item
								element = Commands.createCommandItem(parent, command, invocation, id, null, renderType === "tool", onClick); //$NON-NLS-0$
							} 
							mNavUtils.generateNavGrid(domNodeWrapperList, element);
							invocation.domNode = element;
							index++;
						}
					} 
				}
			});
		},
		
		/*
		 * private.  Parent must exist in the DOM.
		 */
		_createDropdownMenu: function(parent, name, nested, populateFunction, icon, tooltip) {
			parent = lib.node(parent);
			// We create dropdowns asynchronously so it's possible that the parent has been removed from the document 
			// by the time we are called.  If so, don't bother building a submenu for an orphaned menu.
			if (!parent || !lib.contains(document.body, parent)) {
				return null;
			}
			var menuButton, newMenu;
			var destroyButton, menuParent = parent;
			if (nested) {
				var range = document.createRange();
				range.selectNode(parent);
				var buttonFragment = range.createContextualFragment(SubMenuButtonFragment);
				// bind name to fragment variable
				lib.processTextNodes(buttonFragment, {ButtonText: name});
				parent.appendChild(buttonFragment);
				destroyButton = parent.lastChild;
				newMenu = destroyButton.lastChild;
				menuButton = newMenu.previousSibling;
				menuButton.dropdown = new mDropdown.Dropdown({dropdown: newMenu, populate: populateFunction});
				newMenu.dropdown = menuButton.dropdown;
			} else {
				if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
					menuParent = document.createElement("li"); //$NON-NLS-0$
					parent.appendChild(menuParent);
					destroyButton = menuParent;
				}
				var buttonCss = null;
				if (icon) {
					buttonCss = "dropdownButtonWithIcon"; //$NON-NLS-0$ // This class distinguishes dropdown buttons with an icon from those without
					tooltip = tooltip || name; // No text and no tooltip => fallback to name
				}
				tooltip = icon ? (tooltip || name) : tooltip;
				var created = Commands.createDropdownMenu(menuParent, name, populateFunction, buttonCss, icon);
				menuButton = created.menuButton;
				newMenu = created.menu;
				if (tooltip) {
					menuButton.commandTooltip = new mTooltip.Tooltip({
						node: menuButton,
						text: tooltip,
						position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					});
				}
			}
			
			return {menuButton: menuButton, menu: newMenu, dropdown: menuButton.dropdown, destroyButton: destroyButton};
		},
		
		_generateMenuSeparator: function(dropdown) {
			if (!this._checkForTrailingSeparator(dropdown, "menu")) { //$NON-NLS-0$
				var item = document.createElement("li"); //$NON-NLS-0$
				item.classList.add("dropdownSeparator"); //$NON-NLS-0$
				var sep = document.createElement("span"); //$NON-NLS-0$
				sep.classList.add("dropdownSeparator"); //$NON-NLS-0$
				item.appendChild(sep);
				dropdown.appendChild(item);
			}
		},
		
				
		/**
		 * Add a dom node appropriate for using a separator between different groups
		 * of commands.  This function is useful when a page is precisely arranging groups of commands
		 * (in a table or contiguous spans) and needs to use the same separator that the command registry
		 * would use when rendering different groups of commands.
		 * @param {DOMElement} parent
		 */
		generateSeparatorImage: function(parent) {
			var sep;
			if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
				sep = document.createElement("li"); //$NON-NLS-0$
				parent.appendChild(sep);
			} else {
				sep = document.createElement("span"); //$NON-NLS-0$
				parent.appendChild(sep);
			}
			sep.classList.add("core-sprite-sep");  // location in sprite //$NON-NLS-0$
			sep.classList.add("imageSprite");  // sets sprite background //$NON-NLS-0$
			sep.classList.add("commandSeparator"); //$NON-NLS-0$
			return sep;
		}

	};  // end command registry prototype
	CommandRegistry.prototype.constructor = CommandRegistry;

	/**
	 * A URL binding defines how a URL token is bound to a command, and what parameter
	 * is provided
	 * @param {String} token the token in a URL query parameter that identifies the command
	 * @param {String} parameterName the name of the parameter being specified in the value of the query 
	 * 
	 * @name orion.commands.URLBinding
	 * @class
	 */
	function URLBinding (token, parameterName) {
		this.token = token;
		this.parameterName = parameterName;
	}
	URLBinding.prototype = /** @lends orion.commands.URLBinding.prototype */ {
		/**
		 * Returns whether this URL binding matches the given URL
		 * 
		 * @param url the URL.
		 * @returns {Boolean} whether this URL binding matches
		 */
		match: function (url) {
			//ensure this is only the hash portion
			var params = PageUtil.matchResourceParameters(url);
			if (typeof params[this.token] !== "undefined") { //$NON-NLS-0$
				this.parameterValue = params[this.token];
				return this;
			}
			return null;
		}
	};
	URLBinding.prototype.constructor = URLBinding;
	
	
	/**
	 * A CommandParameter defines a parameter that is required by a command.
	 *
	 * @param {String} name the name of the parameter
	 * @param {String} type the type of the parameter, one of the HTML5 input types, or "boolean"
	 * @param {String} [label] the (optional) label that should be used when showing the parameter
	 * @param {String} [value] the (optional) default value for the parameter
	 * @param {Number} [lines] the (optional) number of lines that should be shown when collecting the value.  Valid for type "text" only.
	 * 
	 * @name orion.commands.CommandParameter
	 * @class
	 */
	function CommandParameter (name, type, label, value, lines) {
		this.name = name;
		this.type = type;
		this.label = label;
		this.value = value;
		this.lines = lines || 1;
	}
	CommandParameter.prototype = /** @lends orion.commands.CommandParameter.prototype */ {
		/**
		 * Returns whether the user has requested to assign values to optional parameters
		 * 
		 * @returns {Boolean} whether the user has requested optional parameters
		 */
		optionsRequested: function () {
			return this.optionsRequested;
		}
	};
	CommandParameter.prototype.constructor = CommandParameter;
	
	/**
	 * A ParametersDescription defines the parameters required by a command, and whether there are additional
	 * optional parameters that can be specified.  The command registry will attempt to collect required parameters
	 * before calling a command callback.  The command is expected to provide UI for optional parameter, when the user has
	 * signalled a desire to provide optional information.
	 *
	 * @param {orion.commands.CommandParameter[]} parameters an array of CommandParameters that are required
	 * @param {Object} options The parameters description options object.
	 * @param {Boolean} options.hasOptionalParameters specifies whether there are additional optional parameters
	 *			that could be collected.  If true, then the collector will show an affordance for invoking an 
	 *			additional options collector and the client can use the optionsRequested flag to determine whether
	 *			additional parameters should be shown.  Default is false.
	 * @param {Boolean} options.clientCollect specifies whether the client will collect the parameters in its
	 *			callback.  Default is false, which means the callback will not be called until an attempt has
	 *			been made to collect parameters.
	 * @param {Function} [getParameters] a function used to define the parameters just before the command is invoked.  This is used
	 *			when a particular invocation of the command will change the parameters. The function will be passed
	 *          the CommandInvocation as a parameter. Any stored parameters will be ignored, and
	 *          replaced with those returned by this function. If no parameters (empty array or <code>null</code>) are returned,
	 *          then it is assumed that the command should not try to obtain parameters before invoking the command's callback
	 *          (similar to <code>options.clientCollect === true</code>).
	 * @name orion.commands.ParametersDescription
	 * @class
	 */
	function ParametersDescription (parameters, options, getParameters) {
		this._storeParameters(parameters);
		this._hasOptionalParameters = options && options.hasOptionalParameters;
		this._options = options;  // saved for making a copy
		this.optionsRequested = false;
		this.getParameters = getParameters;
		this.clientCollect = options && options.clientCollect;

	}
	ParametersDescription.prototype = /** @lends orion.commands.ParametersDescription.prototype */ {	
	
		_storeParameters: function(parameterArray) {
			this.parameterTable = null;
			if (parameterArray) {
				var table = this.parameterTable = {};
				parameterArray.forEach(function(parameter) {
					table[parameter.name] = parameter;
				});
			}
		},
		
		/**
		 * Update the stored parameters by running the stored function if one has been supplied.
		 */
		updateParameters: function(commandInvocation) {
			if (typeof this.getParameters === "function") { //$NON-NLS-0$
				this._storeParameters(this.getParameters(commandInvocation));
			}
		},
		
		/**
		 * Returns a boolean indicating whether any parameters have been specified.
		 *
		 * @returns {Boolean} whether there are parameters to collect.
		 */
		hasParameters: function() {
			return this.parameterTable !== null;
		},
		
		/**
		 * Returns a boolean indicating whether a collector should try to collect parameters.  If there
		 * are no parameters specified, or the client is expecting to collect them, this will return
		 * <code>false</code>.
		 *
		 * @returns {Boolean} indicating whether the caller should attempt to collect the parameters.
		 */
		shouldCollectParameters: function() {
			return !this.clientCollect && this.hasParameters();
		},
				
		/**
		 * Returns the CommandParameter with the given name, or <code>null</code> if there is no parameter
		 * by that name.
		 *
		 * @param {String} name the name of the parameter
		 * @returns {orion.command.CommandParameter} the parameter with the given name
		*/
		parameterNamed: function(name) {
			return this.parameterTable[name];
		},
		
		/**
		 * Returns the value of the parameter with the given name, or <code>null</code> if there is no parameter
		 * by that name, or no value for that parameter.
		 *
		 * @param {String} name the name of the parameter
		 * @returns {String} the value of the parameter with the given name
		 */
		valueFor: function(name) {
			var parm = this.parameterTable[name];
			if (parm) {
				return parm.value;
			}
			return null;
		},
		
		/**
		 * Sets the value of the parameter with the given name.
		 *
		 * @param {String} name the name of the parameter
		 * @param {String} value the value of the parameter with the given name
		 */
		setValue: function(name, value) {
			var parm = this.parameterTable[name];
			if (parm) {
				parm.value = value;
			}
		},
		 
		/**
		 * Evaluate the specified function for each parameter.
		 *
		 * @param {Function} func a function which operates on a provided command parameter
		 *
		 */
		forEach: function(func) {
			for (var key in this.parameterTable) {
				if (this.parameterTable[key].type && this.parameterTable[key].name) {
					func(this.parameterTable[key]);
				}
			}
		},
		
		/**
		 * Make a copy of this description.  Used for collecting values when a client doesn't want
		 * the values to be persisted across different objects.
		 *
		 */
		 makeCopy: function() {
			var parameters = [];
			this.forEach(function(parm) {
				var newParm = new CommandParameter(parm.name, parm.type, parm.label, parm.value, parm.lines);
				parameters.push(newParm);
			});
			var copy = new ParametersDescription(parameters, this._options, this.getParameters);
			// this value may have changed since the options
			copy.clientCollect = this.clientCollect;
			return copy;
			
		 },
		 /**
		  * Return a boolean indicating whether additional optional parameters are available.
		  */
		 hasOptionalParameters: function() {
			return this._hasOptionalParameters;
		 }
	};
	ParametersDescription.prototype.constructor = ParametersDescription;

	//return the module exports
	return {
		CommandRegistry: CommandRegistry,
		URLBinding: URLBinding,
		ParametersDescription: ParametersDescription,
		CommandParameter: CommandParameter
	};
});
