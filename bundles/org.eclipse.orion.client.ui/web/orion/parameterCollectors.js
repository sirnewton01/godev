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
/*global window document define orion */
/*browser:true*/

define(['i18n!orion/nls/messages', 'require', 'orion/webui/littlelib'], 
        function(messages, require, lib) {

	
	/**
	 * Constructs a new command parameter collector.
	 * @name orion.parametercollectors.CommandParameterCollector
	 * @class <code>CommandParameterCollector</code> can collect parameters in a way that is integrated with the common 
	 * header elements of pages or sections.
	 * @param {Function} getElementsFunction
	 * @param {Function} toolbarLayoutFunction
	 * @extends orion.commandregistry.ParameterCollector
	 * @borrows orion.commandregistry.ParameterCollector#close as #close
	 * @borrows orion.commandregistry.ParameterCollector#collectParameters as #collectParameters
	 * @borrows orion.commandregistry.ParameterCollector#getFillFunction as #getFillFunction
	 * @borrows orion.commandregistry.ParameterCollector#open as #open
	 */	
	function CommandParameterCollector (getElementsFunction, toolbarLayoutFunction) {
		this._activeContainer = null;
		this._getElementsFunction = getElementsFunction;
		this._toolbarLayoutFunction = toolbarLayoutFunction;
	}
	
	CommandParameterCollector.prototype = /** @lends orion.parametercollectors.CommandParameterCollector.prototype */ {
	
		close: function () {
			if (this._activeElements) {
				if (this._activeElements.parameterArea) {
					lib.empty(this._activeElements.parameterArea);
				}
				if (this._activeElements.slideContainer) {
					this._activeElements.slideContainer.classList.remove("slideContainerActive"); //$NON-NLS-0$
				}
				if (this._activeElements.dismissArea) {
					 lib.empty(this._activeElements.dismissArea);
				}
				if (this._activeElements.commandNode) {
					this._activeElements.commandNode.classList.remove("activeCommand"); //$NON-NLS-0$
				}
				this._toolbarLayoutFunction(this._activeElements);
				if (this._activeElements.onClose) {
					this._activeElements.onClose();
				}
				if (this._oldFocusNode) {
					this._oldFocusNode.focus();
					this._oldFocusNode = null;
				}
			}
			this._activeElements = null;
		},
		
		open: function(commandNode, fillFunction, onClose) {
			if (typeof commandNode === "string") { //$NON-NLS-0$
				commandNode = lib.node(commandNode);
			}
			if (this._activeElements && this._activeElements.slideContainer && this._activeElements.commandNode === commandNode) {
				// already open.  Just return focus where it needs to be.
				if (this._activeElements.focusNode) {
					this._activeElements.focusNode.focus();
				}
				return true;
			}
			this.close();
			this._activeElements = null;
			// determine the closest parameter container to the command.
			this._activeElements = this._getElementsFunction(commandNode);
			if (this._activeElements && this._activeElements.parameterArea && this._activeElements.slideContainer) {
				this._activeElements.onClose = onClose;
				var focusNode = fillFunction(this._activeElements.parameterArea, this._activeElements.dismissArea);
				if (!focusNode) {
					// no parameters were generated.  
					return false;
				}
				this._activeElements.focusNode = focusNode;
				var close = lib.$$array("#closebox", this._activeElements.dismissArea || this._activeElements.parameterArea); //$NON-NLS-0$
				if (close.length === 0) {
					// add the close button if the fill function did not.
					var dismiss = this._activeElements.dismissArea || this._activeElements.parameterArea;
					close = document.createElement("button"); //$NON-NLS-0$
					close.id = "closebox"; //$NON-NLS-0$
					close.className ="imageSprite core-sprite-close dismissButton"; //$NON-NLS-0$
					close.title = messages['Close'];
					dismiss.appendChild(close);
					var self = this;
					close.addEventListener("click", function(event) { //$NON-NLS-0$
						self.close();
					}, false);
				}
				// all parameters have been generated.  Activate the area.
				this._activeElements.slideContainer.classList.add("slideContainerActive"); //$NON-NLS-0$
				this._toolbarLayoutFunction(this._activeElements);

				if (focusNode) {
					this._oldFocusNode = window.document.activeElement;
					window.setTimeout(function() {
						focusNode.focus();
						if (focusNode.select) {
							focusNode.select();
						}
					}, 0);
				}
				if (this._activeElements.commandNode) {
					this._activeElements.commandNode.classList.add("activeCommand"); //$NON-NLS-0$
				}
				return true;
			}
			return false;
		},
		
		_collectAndCall: function(commandInvocation, parent) {
			lib.$$array("input", parent).forEach(function(field) { //$NON-NLS-0$
				if (field.type === "checkbox") { //$NON-NLS-0$
					commandInvocation.parameters.setValue(field.parameterName, field.checked);
				} else if (field.type !== "button") { //$NON-NLS-0$
					commandInvocation.parameters.setValue(field.parameterName, field.value.trim());
				}
			});
			lib.$$array("textArea", parent).forEach(function(field) { //$NON-NLS-0$
				commandInvocation.parameters.setValue(field.parameterName, field.value.trim());
			});
			if (commandInvocation.command.callback) {
				commandInvocation.command.callback.call(commandInvocation.handler, commandInvocation);
			}

		},
		
		collectParameters: function(commandInvocation,cancelCallback) {
			if (commandInvocation.parameters) {
				if (commandInvocation.domNode) {
					commandInvocation.domNode.classList.add("commandMarker"); //$NON-NLS-0$
				}
				return this.open(commandInvocation.domNode || commandInvocation.domParent, this.getFillFunction(commandInvocation,null,cancelCallback));
			}
			return false;
		},
		
		getFillFunction: function(commandInvocation, closeFunction, cancelFunction) {
			var self = this;
			return function(parameterArea, dismissArea) {
				var first = null;
				var localClose = function() {
					if (closeFunction) {
						closeFunction();
					}
					self.close();
				};
				var keyHandler = function(event) {
					if (event.keyCode === lib.KEY.ENTER) {
						self._collectAndCall(commandInvocation, parameterArea);
						localClose();
						lib.stop(event);
					}
					if (event.keyCode === lib.KEY.ESCAPE) {
						if (typeof(cancelFunction) === 'function') cancelFunction();
						localClose();
						lib.stop(event);
					}
				};
				commandInvocation.parameters.forEach(function(parm) {
					var label = null;
					if (parm.label) {
						label = document.createElement("label"); //$NON-NLS-0$
						label.classList.add("parameterInput"); //$NON-NLS-0$
						label.setAttribute("for", parm.name + "parameterCollector"); //$NON-NLS-1$ //$NON-NLS-0$
						label.textContent = parm.label;
						parameterArea.appendChild(label);
					} 
					var type = parm.type;
					var id = parm.name + "parameterCollector"; //$NON-NLS-0$
					var field;
					var parent = label || parameterArea;
					if (type === "text" && typeof(parm.lines) === "number" && parm.lines > 1) { //$NON-NLS-1$ //$NON-NLS-0$
						field = document.createElement("textarea"); //$NON-NLS-0$
						field.rows = parm.lines;
						field.type = "textarea"; //$NON-NLS-0$
						field.id = id;
						parent.appendChild(field);
						// esc only
						keyHandler = function(event) {
							if (event.keyCode === lib.KEY.ESCAPE) {
								localClose();
								lib.stop(event);
							}
						};
					} else if (parm.type === "boolean") { //$NON-NLS-0$
						field = document.createElement("input"); //$NON-NLS-0$
						field.type = "checkbox"; //$NON-NLS-0$
						field.id = id;
						
						parent.appendChild(field);
						if (parm.value) {
							field.checked = true;
						}
					} else {
						field = document.createElement("input"); //$NON-NLS-0$
						field.type = parm.type;
						field.id = id;
						parent.appendChild(field);
						if (parm.value) {
							field.value = parm.value;
						}
					}
					field.classList.add("parameterInput"); //$NON-NLS-0$
					// for fun
					field.setAttribute("speech", "speech"); //$NON-NLS-1$ //$NON-NLS-0$
					field.setAttribute("x-webkit-speech", "x-webkit-speech"); //$NON-NLS-1$ //$NON-NLS-0$
					field.parameterName = parm.name;
					if (!first) {
						first = field;
					}
					
					// for more fun
					if(parm.eventListeners.length > 0){
						parm.eventListeners.forEach(function(listener){
							field.addEventListener(listener.event, function(evt){
								return listener.handler(evt, commandInvocation);
							}, listener.capture);
						});
					}
					
					field.addEventListener("keydown", keyHandler, false); //$NON-NLS-0$
				});
				var parentDismiss = dismissArea;
				if (!parentDismiss) {
					parentDismiss = document.createElement("span"); //$NON-NLS-0$
					parentDismiss.classList.add("layoutRight"); //$NON-NLS-0$
					parentDismiss.classList.add("parametersDismiss"); //$NON-NLS-0$
					parameterArea.appendChild(parentDismiss);
				}
				var finish = function (collector) {
					collector._collectAndCall(commandInvocation, parameterArea);
					localClose();
				};

				var makeButton = function(text, parent) {
					var button = document.createElement("button"); //$NON-NLS-0$
					parent.appendChild(button);
					if (text) {
						button.appendChild(document.createTextNode(text)); //$NON-NLS-0$
					}
					button.classList.add("dismissButton"); //$NON-NLS-0$
					return button;
				};
				
				if (commandInvocation.parameters.hasOptionalParameters()) {
					commandInvocation.parameters.optionsRequested = false;
					
					var options = makeButton(messages["More"], parentDismiss); //$NON-NLS-0$
					options.addEventListener("click", function() { //$NON-NLS-0$
						commandInvocation.parameters.optionsRequested = true;
						finish(self);
					}, false);
				}
				// OK and cancel buttons
				var ok = makeButton(messages["Submit"], parentDismiss);
					ok.addEventListener("click", function() { //$NON-NLS-0$
					finish(self);
				}, false);
				
				var close = makeButton(null, parentDismiss);
				close.id = "closebox"; //$NON-NLS-0$
				close.classList.add("imageSprite"); //$NON-NLS-0$
				close.classList.add("core-sprite-close"); //$NON-NLS-0$
				close.title = messages['Close'];
				close.addEventListener("click", function(event) { //$NON-NLS-0$
					localClose();
					if (typeof(cancelFunction) === 'function') cancelFunction();
				}, false);
				return first;
			};
		 }
	};
	CommandParameterCollector.prototype.constructor = CommandParameterCollector;
	
	//return the module exports
	return {
		CommandParameterCollector: CommandParameterCollector
	};
});
