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
 
define([
	'orion/util',
	'orion/webui/littlelib',
	'orion/webui/dropdown',
	'text!orion/webui/dropdowntriggerbutton.html',
	'text!orion/webui/dropdowntriggerbuttonwitharrow.html',
	'text!orion/webui/submenutriggerbutton.html',
	'text!orion/webui/checkedmenuitem.html',
	'orion/webui/tooltip'
], function(util, lib, Dropdown, DropdownButtonFragment, DropdownButtonWithArrowFragment, SubMenuButtonFragment, CheckedMenuItemFragment, Tooltip) {
		/**
		 * @name orion.commands.NO_IMAGE
		 * @description Image data for 16x16 transparent png.
		 * @property
		 */
		var NO_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAQMAAAAlPW0iAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAAtJREFUCNdjIBEAAAAwAAFletZ8AAAAAElFTkSuQmCC"; //$NON-NLS-0$

		/* a function that can be set for retrieving bindings stored elsewhere, such as a command registry */
		var getBindings = null;
		
		/* key bindings registered locally
		 *
		 * object keyed by command id, value is { keyBinding: keyBinding, command: command, invocation: commandInvocation }
		 *
		 */
		var localKeyBindings = {};
		
		/*
		 * Set a function that will provide key bindings when key events are processed.  This is used when an external party
		 * (such as a command registry) wants its bindings to be honored by the command key listener.
		 */
		function setKeyBindingProvider(getBindingsFunction) {
			getBindings = getBindingsFunction;
		}

		/**
		 * Executes a binding if possible.
		 * @name orion.commands.executeBinding
		 * @function
		 * @static
		 * @param {Object} binding
		 * @returns {Boolean} <code>true</code> if the binding was executed, <code>false</code> otherwise.
		 */
		function executeBinding(binding) {
			var invocation = binding.invocation;
			if (invocation) {
				var command = binding.command;
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
					return true;
				} else if (invocation.commandRegistry) {
					// See https://bugs.eclipse.org/bugs/show_bug.cgi?id=411282
					invocation.commandRegistry._invoke(invocation);
					return true;
				} else if (command.onClick || command.callback) {
					// TODO: what is this timeout for?
					window.setTimeout(function() {
						(command.onClick || command.callback).call(invocation.handler || window, invocation);
					}, 0);
					return true;
				}
			}
			return false;
		}

		/*
		 * Process a key event against the provided bindings.
		 */
		function _processKey(event, bindings) {
			for (var id in bindings) {
				if (bindings[id] && bindings[id].keyBinding && bindings[id].command) {
					if (bindings[id].keyBinding.match(event)) {
						var activeBinding = bindings[id];
						var keyBinding = activeBinding.keyBinding;
						// Check for keys that are scoped to a particular part of the DOM
						if (!keyBinding.domScope || lib.contains(lib.node(keyBinding.domScope), event.target)) {
							if (executeBinding(activeBinding)) {
								lib.stop(event);
								return;
							}
						}
					}
				}
			}
		}
		
		function getKeyBindings() {
			var allBindings = {};
			
			if (getBindings) {
				var i, keys, objectKey;
				keys = Object.keys(localKeyBindings);
				for (i=0; i<keys.length; i++) {
					objectKey = keys[i];
					allBindings[objectKey] = localKeyBindings[objectKey];
				}
				var otherBindings = getBindings();
				keys = Object.keys(otherBindings);
				for (i=0; i<keys.length; i++) {
					objectKey = keys[i];
					allBindings[objectKey] = otherBindings[objectKey];
				}
			} else {
				allBindings = localKeyBindings;
			}
			return allBindings;
		}
		
		function processKey(evt) {
			_processKey(evt, getKeyBindings());
		}
		
		function handleKeyEvent(evt, processKeyFunc) {
			function isContentKey(e) {
				// adapted from handleKey in http://git.eclipse.org/c/platform/eclipse.platform.swt.git/plain/bundles/org.eclipse.swt/Eclipse%20SWT%20Custom%20Widgets/common/org/eclipse/swt/custom/StyledText.java
				if (util.isMac) {
					// COMMAND+ALT combinations produce characters on the mac, but COMMAND or COMMAND+SHIFT do not.
					if (e.metaKey && !e.altKey) {  //command without alt
						// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=390341
						// special case for select all, cut, copy, paste, and undo.  A slippery slope...
						if (!e.shiftKey && !e.ctrlKey && (e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 90)) {
							return true;
						}
						return false;
					}
					if (e.ctrlKey) {
						return false;
					}
				} else {
					// CTRL or ALT combinations are not characters, however both of them together (CTRL+ALT)
					// are the Alt Gr key on some keyboards.  See Eclipse bug 20953. If together, they might
					// be a character.
					if (e.ctrlKey && !e.altKey) {
						// special case for select all, cut, copy, paste, and undo.  
						if (!e.shiftKey && (e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88 || e.keyCode === 90)) {
							return true;
						}
						return false;
					}
					if (e.altKey && !e.ctrlKey) {
						return false;
					}
				}
				if (e['char']) { //$NON-NLS-0$
					return e['char'].length > 0;  // empty string for non characters //$NON-NLS-0$
				} else if (e.charCode || e.keyCode) {
					var keyCode= e.charCode || e.keyCode;
					// anything below SPACE is not a character except for line delimiter keys, tab, and delete.
					switch (keyCode) {
						case 8:  // backspace
						case 9:  // tab
						case 13: // enter
						case 46: // delete
							return true;
						default:
							return (keyCode >= 32 && keyCode < 112) || // space key and above until function keys
								keyCode > 123; // above function keys  
					}
				}
				// If we can't identify as a character, assume it's not
				return false;
			}
			
			evt = evt || window.event;
			if (isContentKey(evt)) {
				// bindings that are text content keys are ignored if we are in a text field or editor
				// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=375058
				if (evt.target.contentEditable === "true") { //$NON-NLS-0$
					return;
				}
				var tagType = evt.target.nodeName.toLowerCase();
				if (tagType === 'input') { //$NON-NLS-0$
					var inputType = evt.target.type.toLowerCase();
					// Any HTML5 input type that involves typing text should be ignored
					switch (inputType) {
						case "text": //$NON-NLS-0$
						case "password": //$NON-NLS-0$
						case "search": //$NON-NLS-0$
						case "color": //$NON-NLS-0$
						case "date": //$NON-NLS-0$
						case "datetime": //$NON-NLS-0$
						case "datetime-local": //$NON-NLS-0$
						case "email": //$NON-NLS-0$
						case "month": //$NON-NLS-0$
						case "number": //$NON-NLS-0$
						case "range": //$NON-NLS-0$
						case "tel": //$NON-NLS-0$
						case "time": //$NON-NLS-0$
						case "url": //$NON-NLS-0$
						case "week": //$NON-NLS-0$
							return;
					}
				} else if (tagType === 'textarea') { //$NON-NLS-0$
					return;
				}
			}
			if (processKeyFunc) {
				processKeyFunc(evt);
			} else {
				processKey(evt);
			}
		}
		
		function CommandsProxy() {
			this._init();
		}
		CommandsProxy.prototype = {
			setProxy: function(proxy) {
				this.proxy = proxy;
			},
			setKeyBindings: function(bindings) {
				this.bindings = bindings;
			},
			_init: function() {
				var self = this;
				document.addEventListener("keydown", function(evt) { //$NON-NLS-0$
					return handleKeyEvent(evt, function(evt) {
						var proxy = self.proxy;
						var bindings = self.bindings;
						if (!bindings || !proxy) {
							return;
						}
						for (var i=0; i<bindings.length; i++) {
							if (bindings[i].match(evt)) {
								proxy.processKey({
									type: evt.type,
									keyCode: evt.keyCode,
									altKey: evt.altKey,
									ctrlKey: evt.ctrlKey,
									metaKey: evt.metaKey,
									shiftKey: evt.shiftKey
								});
								lib.stop(evt);
							}
						}
					});
				});
			}
		};

		window.document.addEventListener("keydown", handleKeyEvent, false); //$NON-NLS-0$

	function _addImageToElement(command, element, name) {
		element.classList.add("commandImage"); //$NON-NLS-0$
		var node;
		if (command.imageClass) {
			if (command.addImageClassToElement) {
				element.classList.add(command.imageClass);
			} else {
				node = document.createElement("span"); //$NON-NLS-0$
				element.appendChild(node);
				node.classList.add(command.spriteClass);
				node.classList.add(command.imageClass);
			}
		} else {
			node = new Image();
			node.alt = command.name;
			node.name = name;
			node.id = name;
			node.src = command.image;
			element.appendChild(node);
		}
		return node;
	}

	function createDropdownMenu(parent, name, populateFunction, buttonClass, buttonIconClass, showName, selectionClass, positioningNode, displayDropdownArrow) {
		parent = lib.node(parent);
		if (!parent) {
			throw "no parent node was specified"; //$NON-NLS-0$
		}
		var range = document.createRange();
		range.selectNode(parent);
		var buttonFragment = displayDropdownArrow ? range.createContextualFragment(DropdownButtonWithArrowFragment) : range.createContextualFragment(DropdownButtonFragment);
		// bind name to fragment variable
		lib.processTextNodes(buttonFragment, {ButtonText: name});
		parent.appendChild(buttonFragment);
		var newMenu = parent.lastChild;
		var menuButton;
		var dropdownArrow;
		if (displayDropdownArrow) {
			menuButton = newMenu.previousSibling;
			dropdownArrow = menuButton.lastChild;
		} else {
			menuButton = newMenu.previousSibling;
		}
		if (buttonClass) {
			menuButton.classList.add(buttonClass); //$NON-NLS-0$
		} else {
			menuButton.classList.add("orionButton"); //$NON-NLS-0$
			menuButton.classList.add("commandButton"); //$NON-NLS-0$
		}
		if (buttonIconClass) {
			if(!showName) {
				menuButton.textContent = ""; //$NON-NLS-0$
				menuButton.setAttribute("aria-label", name); //$NON-NLS-0$
			}
			_addImageToElement({ spriteClass: "commandSprite", imageClass: buttonIconClass }, menuButton, name); //$NON-NLS-0$
			menuButton.classList.add("orionButton"); //$NON-NLS-0$
		}
		menuButton.dropdown = new Dropdown.Dropdown({
			dropdown: newMenu, 
			populate: populateFunction,
			selectionClass: selectionClass,
			skipTriggerEventListeners: !!dropdownArrow,
			positioningNode: positioningNode
		});
		newMenu.dropdown = menuButton.dropdown;
		return {menuButton: menuButton, menu: newMenu, dropdown: menuButton.dropdown, dropdownArrow: dropdownArrow};
	}
	
	function createCheckedMenuItem(parent, name, checked, onChange) {
		parent = lib.node(parent);
		if (!parent) {
			throw "no parent node was specified"; //$NON-NLS-0$
		}
		var range = document.createRange();
		range.selectNode(parent);
		var buttonFragment = range.createContextualFragment(CheckedMenuItemFragment);
		// bind name to fragment variable
		lib.processTextNodes(buttonFragment, {ItemText: name});
		parent.appendChild(buttonFragment);
		var itemParent = parent.lastChild;
		var checkbox = lib.$(".checkedMenuItem", itemParent); //$NON-NLS-0$
		checkbox.checked = checked;
		checkbox.addEventListener("change", onChange, false); //$NON-NLS-0$
		return checkbox;
	}

	function createCommandItem(parent, command, commandInvocation, id, keyBinding, useImage, callback) {
		var element;
		useImage = useImage || (!command.name && command.hasImage());
		if (command.hrefCallback) {
			element = document.createElement("a"); //$NON-NLS-0$
			element.id = id;
			if (useImage && command.hasImage()) {
				_addImageToElement(command, element, id);
			} else {
				element.className = "commandLink"; //$NON-NLS-0$
				element.appendChild(document.createTextNode(command.name));
			}
			var href = command.hrefCallback.call(commandInvocation.handler, commandInvocation);
			if (href.then){
				href.then(function(l){
					element.href = l;
				});
			} else if (href) {
				element.href = href; 
			} else {  // no href
				element.href = "#"; //$NON-NLS-0$
			}
		} else {
			element = document.createElement("button"); //$NON-NLS-0$
			element.className = "orionButton"; //$NON-NLS-0$
			if (useImage) {
				if (command.hasImage()) {
					_addImageToElement(command, element, id);
					// ensure there is accessible text describing this image
					if (command.name) {
						element.setAttribute("aria-label", command.name); //$NON-NLS-0$
					}
				} else {
					element.classList.add("commandButton"); //$NON-NLS-0$
					element.classList.add("commandMissingImageButton"); //$NON-NLS-0$
					element.appendChild(document.createTextNode(command.name));
				}
			} else {
				element.classList.add("commandButton"); //$NON-NLS-0$
				var text = document.createTextNode(command.name);
				element.appendChild(text);
			}
			var onClick = callback || command.callback;
			if (onClick) {
				command.onClick = onClick;
				element.addEventListener("click", function(e) { //$NON-NLS-0$
					onClick.call(commandInvocation.handler, commandInvocation);
				}, false);
			}
		}
		if (parent.nodeName.toLowerCase() === "ul") { //$NON-NLS-0$
			var li = document.createElement("li"); //$NON-NLS-0$
			parent.appendChild(li);
			parent = li;
		} else {
			element.classList.add("commandMargins"); //$NON-NLS-0$
		}
		parent.appendChild(element);
		if (command.tooltip) {
			element.commandTooltip = new Tooltip.Tooltip({
				node: element,
				text: command.tooltip,
				position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});
		}
		if (keyBinding) {
			localKeyBindings[command.id] = { keyBinding: keyBinding, command: command, invocation: commandInvocation };
		}
		return element;
	}
	
	function createCommandMenuItem(parent, command, commandInvocation, keyBinding, callback, keyBindingString) {
		var element, li;
		var dropdown = parent.dropdown;
		if (command.hrefCallback) {
			li = Dropdown.createMenuItem(command.name, "a"); //$NON-NLS-0$
			element = li.firstElementChild;
			var href = command.hrefCallback.call(commandInvocation.handler, commandInvocation);
			if (href.then){
				href.then(function(l){
					element.href = l;
				});
			} else if (href) {
				element.href = href; 
			} else {  // no href
				element.href = "#"; //$NON-NLS-0$
			}
			element.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
					element.click();
				}
			}, false);
		} else {
			li = Dropdown.createMenuItem(command.name); //$NON-NLS-0$
			element = li.firstElementChild;
			var onClick = callback || command.callback;
			if (onClick) {
				command.onClick = onClick;
				element.addEventListener("click", function(e) { //$NON-NLS-0$
					dropdown.close(true);
					onClick.call(commandInvocation.handler, commandInvocation);
				}, false);
				element.addEventListener("keydown", function(e) { //$NON-NLS-0$
					if (e.keyCode === lib.KEY.ENTER || e.keyCode === lib.KEY.SPACE) {
						e.preventDefault(); /* prevents dropdown from receiving event and re-opening */
						element.click();
					}
				}, false);
			}
		}

		if (command.tooltip) {
			/* nested menu items may represent commands, hence require tooltips */
			element.commandTooltip = new Tooltip.Tooltip({
				node: element,
				text: command.tooltip,
				position: ["above", "below", "right", "left"] //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});
		}
		
		if (keyBindingString) {
			Dropdown.appendKeyBindingString(element, keyBindingString);
		}
		
		parent.appendChild(li);
		
		if (keyBinding) {
			localKeyBindings[command.id] = { keyBinding: keyBinding, command: command, invocation: commandInvocation };
		}

		return element;
	}
	

	/**
	 * CommandInvocation is a data structure that carries all relevant information about a command invocation.
	 * It represents a unique invocation of a command by the user.  Each time a user invokes a command (by click, keystroke, URL),
	 * a new invocation is passed to the client.
	 * <p>Note:  When retrieving parameters from a command invocation, clients should always use {@link #parameters}
	 * rather than obtaining the parameter object originally specified for the command (using {@link #command}.parameters).
	 * This ensures that the parameter values for a unique invocation are used vs. any default parameters that may have been
	 * specified originally.  Similarly, if a client wishes to store data that will preserved across multiple invocations of a command,
	 * that data can be stored in the original parameters description and a reference maintained by the client.
	 * </p>
	 * 
	 * @name orion.commands.CommandInvocation
	 * @class Carries information about a command invocation.
	 * @param {Object} handler
	 * @param {Array} items
	 * @param {Object} [userData]
	 * @param {orion.commands.Command} command
	 * @param {orion.commandregistry.CommandRegistry} [commandRegistry]
	 */
	/**
	 * @name orion.commands.CommandInvocation#commandRegistry
	 * @type orion.commandregistry.CommandRegistry
	 */
	/**
	 * @name orion.commands.CommandInvocation#handler
	 * @type Object
	 */
	/**
	 * @name orion.commands.CommandInvocation#command
	 * @type orion.commands.Command
	 */
	/**
	 * @name orion.commands.CommandInvocation#items
	 * @type Array
	 */
	/**
	 * @name orion.commands.CommandInvocation#parameters
	 * @type orion.commands.ParametersDescription
	 */
	/**
	 * @name orion.commands.CommandInvocation#userData
	 * @type Object
	 */
	/**
	 * @name orion.commands.CommandInvocation#userData
	 * @type Object
	 */
	function CommandInvocation (handler, items, /* optional */userData, command, /* optional */ commandRegistry) {
		this.commandRegistry = commandRegistry;
		this.handler = handler;
		this.items = items;
		this.userData = userData;
		this.command = command;
		if (command.parameters) {
			this.parameters = command.parameters.makeCopy(); // so that we aren't retaining old values from previous invocations
		}
		this.id = command.id;
	}
	CommandInvocation.prototype = /** @lends orion.commands.CommandInvocation.prototype */ {
		/**
		 * Returns whether this command invocation can collect parameters.
		 * 
		 * @returns {Boolean} whether parameters can be collected
		 */
		collectsParameters: function() {
			return this.commandRegistry && this.commandRegistry.collectsParameters();
		},
	
		/**
		 * Makes and returns a (shallow) copy of this command invocation.
		 * @param {orion.commands.ParametersDescription} parameters A description of parameters to be used in the copy.  Optional.
		 * If not specified, then the existing parameters should be copied.
		 */
		makeCopy: function(parameters) {
			var copy =  new CommandInvocation(this.handler, this.items, this.userData, this.command, this.commandRegistry);
			copy.domNode = this.domNode;
			copy.domParent = this.domParent;
			if (parameters) {
				copy.parameters = parameters.makeCopy();
			} else if (this.parameters) {
				copy.parameters = this.parameters.makeCopy();
			}
			return copy;
		}

	};
	CommandInvocation.prototype.constructor = CommandInvocation;



	/**
	 * Constructs a new command with the given options.
	 * @param {Object} [options] The command options object.
	 * @param {String} [options.id] the unique id to be used when referring to the command in the command service.
	 * @param {String} [options.name] the name to be used when showing the command as text.
	 * @param {String} [options.tooltip] the tooltip description to use when explaining the purpose of the command.
	 * @param {Function} [options.callback] the callback to call when the command is activated.  The callback should either 
	 *  perform the command or return a deferred that represents the asynchronous performance of the command.  Optional.
	 * @param {Function} [options.hrefCallback] if specified, this callback is used to retrieve
	 *  a URL that can be used as the location for a command represented as a hyperlink.  The callback should return 
	 *  the URL.  In this release, the callback may also return a deferred that will eventually return the URL, but this 
	 *  functionality may not be supported in the future.  See https://bugs.eclipse.org/bugs/show_bug.cgi?id=341540.
	 *  Optional.
	 * @param {Function} [options.choiceCallback] a callback which retrieves choices that should be shown in a secondary
	 *  menu from the command itself.  Returns a list of choices that supply the name and image to show, and the callback
	 *  to call when the choice is made.  Optional.
	 * @param {String} [options.imageClass] a CSS class name suitable for showing a background image.  Optional.
	 * @param {Boolean} [options.addImageClassToElement] If true, the image class will be added to the element's
	 *  class list. Otherwise, a span element with the image class is created and appended to the element.  Optional.
	 * @param {String} [options.selectionClass] a CSS class name to be appended when the command button is selected. Optional.
	 * @param {String} [options.spriteClass] an additional CSS class name that can be used to specify a sprite background image.  This
	 *  useful with some sprite generation tools, where imageClass specifies the location in a sprite, and spriteClass describes the
	 *  sprite itself.  Optional.
	 * @param {Function} [options.visibleWhen] A callback that returns a boolean to indicate whether the command should be visible
	 *  given a particular set of items that are selected.  Optional, defaults to always visible.
	 * @param {orion.commands.ParametersDescription} [options.parameters] A description of parameters that should be collected before invoking
	 *  the command.
	 * @param {Image} [options.image] the image that may be used to represent the callback.  A text link will be shown in lieu
	 *  of an image if no image is supplied.  Optional.
	 * @class A command is an object that describes an action a user can perform, as well as when and
	 *  what it should look like when presented in various contexts.  Commands are identified by a
	 *  unique id.
	 * @name orion.commands.Command
	 */
	function Command (options) {
		this._init(options);
	}
	Command.prototype = /** @lends orion.commands.Command.prototype */ {
		_init: function(options) {
			this.id = options.id;  // unique id
			this.name = options.name;
			this.tooltip = options.tooltip;
			this.callback = options.callback; // optional callback that should be called when command is activated (clicked)
			this.hrefCallback = options.hrefCallback; // optional callback that returns an href for a command link
			this.choiceCallback = options.choiceCallback; // optional callback indicating that the command will supply secondary choices.  
														// A choice is an object with a name, callback, and optional image
			this.positioningNode = options.positioningNode; // optional positioning node choice command.
			this.image = options.image || NO_IMAGE;
			this.imageClass = options.imageClass;   // points to the location in a sprite
			this.addImageClassToElement = options.addImageClassToElement; // optional boolean if true will add the image class to the 
																		// element's class list
			this.selectionClass = options.selectionClass;
			this.spriteClass = options.spriteClass || "commandSprite"; // defines the background image containing sprites //$NON-NLS-0$
			this.visibleWhen = options.visibleWhen;
			this.parameters = options.parameters;  // only used when a command is used in the command registry. 
			this.isEditor = options.isEditor;
		},
		
		/**
		 * Populate the specified menu with choices using the choiceCallback.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		 populateChoicesMenu: function(parent, items, handler, userData, commandService) {
			var choices = this.getChoices(items, handler, userData);
			var addCheck = choices.some(function(choice) {
				return choice.checked;
			});
			choices.forEach(function(choice) {
				if (choice.name) {
					var itemNode = document.createElement("li"); //$NON-NLS-0$
					parent.appendChild(itemNode);
					var node = document.createElement("span"); //$NON-NLS-0$
					node.tabIndex = 0; 
					node.role = "menuitem"; //$NON-NLS-0$
					node.classList.add("dropdownMenuItem"); //$NON-NLS-0$
					if (addCheck) {
						var check = document.createElement("span"); //$NON-NLS-0$
						check.classList.add("check"); //$NON-NLS-0$
						check.appendChild(document.createTextNode(choice.checked ? "\u25CF" : "")); //$NON-NLS-1$ //$NON-NLS-0$
						node.appendChild(check);
					}
					var text = document.createTextNode(choice.name);
					node.appendChild(text);
					itemNode.appendChild(node);
					node.choice = choice;
					node.addEventListener("click", function(event) { //$NON-NLS-0$
						if (event.target.choice) {
							event.target.choice.callback.call(event.target.choice, items);
						}
					}, false); 
					node.addEventListener("keydown", function(event) { //$NON-NLS-0$
						if (event.keyCode === lib.KEY.ENTER || event.keyCode === lib.KEY.SPACE) {
							if (event.target.choice) {
								event.target.choice.callback.call(event.target.choice, items);
							}
						}
					}, false);
				} else {  // anything not named is a separator
					commandService._generateMenuSeparator(parent);
				}
			});
		},
		
		/**
		 * Get the appropriate choices using the choiceCallback.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		getChoices: function(items, handler, userData) {
			if (this.choiceCallback) {
				return this.choiceCallback.call(handler, items, userData);
			}
			return null;
		},
		
		/**
		 * Make a choice callback appropriate for the given choice and items.
		 * Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		makeChoiceCallback: function(choice, items) {
			return function(event) {
				if (choice.callback) {
					choice.callback.call(choice, items, event);
				}
			};
		},
		
		/**
		 * Return a boolean indicating whether this command has a specific image associated
		 * with it. Used internally by the command service.  Not intended to be overridden or called
		 * externally.
		 */
		hasImage: function() {
			return this.imageClass || this.image !== NO_IMAGE; //$NON-NLS-0$
		}
	};  // end Command prototype
	Command.prototype.constructor = Command;
	
	//return the module exports
	return {
		Command: Command,
		CommandInvocation: CommandInvocation,
		createDropdownMenu: createDropdownMenu,
		createCheckedMenuItem: createCheckedMenuItem,
		createCommandItem: createCommandItem,
		createCommandMenuItem: createCommandMenuItem,
		executeBinding: executeBinding,
		setKeyBindingProvider: setKeyBindingProvider,
		localKeyBindings: localKeyBindings,
		CommandsProxy: CommandsProxy,
		getKeyBindings: getKeyBindings,
		processKey: processKey,
		NO_IMAGE: NO_IMAGE,
		_testMethodProcessKey: _processKey  // only exported for test cases
	};
});
