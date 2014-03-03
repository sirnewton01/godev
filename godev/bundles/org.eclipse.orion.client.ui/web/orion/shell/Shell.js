/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Kris De Volder (VMWare) - initial API and implementation
 *******************************************************************************/

/*global define Range*/
/*jslint browser:true*/

define(["i18n!orion/widgets/nls/messages", "orion/i18nUtil", "gcli/index", "gcli/types", "gcli/types/selection", "gcli/argument", "gcli/ui/fields",
		"gcli/ui/fields/menu", "util/util", "gcli/settings", "gcli/canon", "gcli/cli", "gcli/commands/help", "util/promise"],
	function(messages, i18nUtil, mGCLI, mTypes, mSelectionType, mArgument, mFields, mMenu, mUtil, mSettings, mCanon, mCli, mHelp, mPromise) {

	function CustomType(typeSpec) {}
	CustomType.prototype = Object.create(mSelectionType.SelectionType.prototype);

	var orion = {};
	orion.shell = {};

	orion.shell.CompletionStatus = {
		/**
		 * @name orion.shell.CompletionStatus.MATCH
		 * the current text matches a valid argument value
		 */
		MATCH: 0,
		/**
		 * @name orion.shell.CompletionStatus.PARTIAL
		 * the current text matches a subset of the initial characters of a valid
		 * argument value (ie.- a value in the midst of being typed)
		 */
		PARTIAL: 1,
		/**
		 * @name orion.shell.CompletionStatus.ERROR
		 * the current text does not match a subset of the initial characters of any valid values
		 */
		ERROR: 2
	};

	/**
	 * @name orion.shell.Shell
	 * @class A Shell is a visual widget that provides a command line interface.
	 * Commands can be registered in the Shell, and as a user types commands in its input
	 * field the Shell provides visual hints about the expected arguments.
	 */
	orion.shell.Shell = (function() {
		/**
		 * Creates a new Shell.
		 * 
		 * @param {Object} options the options controlling the features of this Shell
		 * @param {Object} options.input the HTML element to parent the Shell's created input text on
		 * @param {Object} options.output the HTML element to parent the Shell's created output text on
		 */
		function Shell(options) {
			this._init(options.input, options.output);
		}
		Shell.prototype = /** @lends orion.shell.Shell.prototype */ {
			/**
			 * Clears the Shell's output area.
			 */
			clear: function() {
				var outputDiv = document.getElementsByClassName("gcli-output")[0]; //$NON-NLS-0$
				while (outputDiv.hasChildNodes()) {
					outputDiv.removeChild(outputDiv.lastChild);
				}				
				this.output(i18nUtil.formatMessage(messages["For a list of available commands type '${0}'."], "<b>help</b>")); //$NON-NLS-0$
			},
			/**
			 * Renders HTML content in the Shell's output area.
			 *
			 * @param {String} content the HTML content to output
			 */
			output: function(content) {
				var output = new mCli.Output();
				this.commandOutputManager.onOutput({output: output});
				output.complete(content);
			},
			/**
			 * @class Instances represent parameters that commands can accept.
			 * <p>
			 * <b>See:</b><br/>
			 * {@link orion.shell.Command}<br/>
			 * {@link orion.shell.ParameterType}<br/>
			 * </p>
			 * @name orion.shell.Parameter
			 * 
			 * @property {String|Object} type the name of the parameter's type (must be either
			 *     a built-in type or a custom type that has been registered with the Shell)
			 * @property {String} name the parameter's name
			 * @property {String} description the parameter's description
			 * @property {Object} defaultValue the parameter's default value (specifying this
			 * implies that the parameter is optional)
			 */
			/**
			 * @class Instances represent commands that can be registered in Shells.
			 * <p>
			 * <b>See:</b><br/>
			 * {@link orion.shell.Shell}<br/>
			 * </p>
			 * @name orion.shell.Command
			 * 
			 * @property {String} name the command's name
			 * @property {Function} callback the function to call when the command is invoked
			 * @property {orion.shell.Parameter[]} parameters the parameters accepted by the command
			 * @property {String} description the command's description
			 * @property {String} returnType the type of value to be displayed when the command has
			 *     completed, valid types are "string" (default) and "html" (a returned "html"
			 *     value is a DOM node)
			 */
			/**
			 * Registers a new command in the Shell.
			 *
			 * @param {orion.shell.Command} command the command to register in the Shell
			 */
			registerCommand: function(command) {
				if (!command.exec) {
					command.exec = command.callback;
				}
				if (!command.params) {
					command.params = command.parameters;
				}
				var fn = function(exec) {
					return function(args, context) {
						var result = exec(args, context);
						this.registeredTypes.forEach(function(current) {
							current.prototype.lastParseTimestamp = 0;
						});
						return result;
					}.bind(this);
				}.bind(this);
				if (command.exec) {
					command.exec = fn(command.exec);
				}
				mGCLI.addCommand(command);
			},
			/**
			 * @class Instances represent custom parameter types that can be registered
			 * in a Shell.  Commands registered in the Shell can then declare parameters
			 * of the registered type.
			 * 
			 * <p>
			 * <b>See:</b><br/>
			 * {@link orion.shell.Parameter}<br/>
			 * </p>
			 * @name orion.shell.ParameterType
			 * 
			 * @property {Function} getName a function that returns the name of the parameter type
			 * @property {Function} parse a function that returns completion suggestions
			 * @property {Function} stringify a function that returns the string representation
			 * for a given instance of its type
			 */
			/**
			 * Registers a custom parameter type in the Shell.
			 *
			 * @param {orion.shell.ParameterType} type the parameter type to register in the Shell
			 */
			registerType: function(type) {
				var NewType = (function(type) {
					function NewType(typeSpec) {
						this.typeSpec = typeSpec;
					}
					NewType.prototype = Object.create(CustomType.prototype);
					NewType.prototype.name = type.getName();
					NewType.prototype.lastParseTimestamp = 0;
					NewType.prototype.parse = function(arg) {
						var prototype = Object.getPrototypeOf(this);
						var lastParseTimestamp = prototype.lastParseTimestamp;
						prototype.lastParseTimestamp = Math.round(new Date().getTime() / 1000);
						/* argObj is equivalent to arg without the additional prototype functions */
						var argObj = JSON.parse(JSON.stringify(arg));
						return type.parse(argObj, this.typeSpec, {lastParseTimestamp: lastParseTimestamp}).then(function(completion) {
							var status = mTypes.Status.VALID;
							if (completion.status) {
								switch (completion.status) {
									case orion.shell.CompletionStatus.ERROR:
										status = mTypes.Status.ERROR;
										break;
									case orion.shell.CompletionStatus.PARTIAL:
										status = mTypes.Status.INCOMPLETE;
										break;
								}
							}
							var predictionsPromise = mPromise.defer();
							predictionsPromise.resolve(completion.predictions);
							return new mTypes.Conversion(completion.value, arg, status, completion.message, predictionsPromise.promise);
						});
					};
					NewType.prototype.lookup = function() {
						var prototype = Object.getPrototypeOf(this);
						var lastParseTimestamp = prototype.lastParseTimestamp;
						prototype.lastParseTimestamp = Math.round(new Date().getTime() / 1000);
						/* argObj is equivalent to "new mArgument.Argument()" without the additional prototype functions */
						var argObj = {prefix: "", suffix: "", text: ""};
						return type.parse(argObj, this.typeSpec, {lastParseTimestamp: lastParseTimestamp}).then(function(completion) {
							return completion.predictions;
						});
					};
					if (type.stringify) {
						NewType.prototype.stringify = function(arg) {
							return type.stringify(arg, this.typeSpec);
						};
					}
//					if (type.increment) {
//						NewType.prototype.increment = function(arg) {
//							return type.increment(arg, this.typeSpec);
//						};
//					}
//					if (type.decrement) {
//						NewType.prototype.decrement = function(arg) {
//							return type.decrement(arg, this.typeSpec);
//						};
//					}
					return NewType;
				}(type));
				mTypes.registerType(NewType);
				this.registeredTypes.push(NewType);
			},
			/**
			 * Sets focus to the Shell's input area.
			 */
			setFocusToInput: function() {
				this.inputText.focus();
			},
			/**
			 * Populates the Shell's input area with a string value.
			 */
			setInputText: function(value) {
				if (value) {
					this.inputText.value = value.toString();
				}
			},
			
			/** @private */

			addField: function(field) {
				// TODO
			},
			_init: function(input, output) {
				this.registeredTypes = [];

				var outputDiv = document.createElement("div"); //$NON-NLS-0$
				outputDiv.id = "gcli-display"; //$NON-NLS-0$
				outputDiv.style.height = "100%"; //$NON-NLS-0$
				outputDiv.style.width = "100%"; //$NON-NLS-0$
				output.appendChild(outputDiv);

				this.inputText = document.createElement("input"); //$NON-NLS-0$
				this.inputText.type = "text"; //$NON-NLS-0$
				this.inputText.id = "gcli-input"; //$NON-NLS-0$
				this.inputText.style.width = "100%"; //$NON-NLS-0$
				this.inputText.style.height = "100%"; //$NON-NLS-0$
				input.appendChild(this.inputText);

				mSettings.getSetting("hideIntro").value = true; //$NON-NLS-0$
				mSettings.getSetting("eagerHelper").value = 2; //$NON-NLS-0$

				/*
				 * Create the shell asynchronously to ensure that the client finishes its
				 * layout before GCLI computes the locations for its created widgets.
				 */
				setTimeout(function() {
					this.commandOutputManager = new mCanon.CommandOutputManager();
					mGCLI.createDisplay({commandOutputManager: this.commandOutputManager});
					this.output(i18nUtil.formatMessage(messages["For a list of available commands type '${0}'."], "<b>help</b>")); //$NON-NLS-0$
				}.bind(this), 1);
				mHelp.startup();
				mHelp.helpListHtml = mHelp.helpListHtml.replace("\"${includeIntro}\"","${false}"); //$NON-NLS-1$ //$NON-NLS-0$

				function CustomField(type, options) {
					mFields.Field.call(this, type, options);
					this.isImportant = true;
					this.element = mUtil.createElement(this.document, "div"); //$NON-NLS-0$
					this.element.className = "orion"; //$NON-NLS-0$
					this.menu = new mMenu.Menu({document: this.document, field: true, type: type});
					this.menu.onItemClick = this.onItemClick.bind(this);
					this.element.appendChild(this.menu.element);
					this.onFieldChange = mUtil.createEvent("CustomField.fieldChanged"); //$NON-NLS-0$
					this.onInputChange = this.onInputChange.bind(this);
				}

				CustomField.prototype = Object.create(mFields.Field.prototype);
				CustomField.prototype.destroy = function() {
					mFields.Field.prototype.destroy.call(this);
					this.menu.destroy();
					delete this.element;
					delete this.menu;
					delete this.document;
					delete this.onInputChange;
				};
				CustomField.prototype.setConversion = function(conversion) {
					this.setMessage(conversion.message);
					var items = [];
					var predictions = conversion.getPredictions();
					predictions.forEach(function(item) {
						if (!item.hidden) {
							items.push({
								name: item.name,
								complete: item.name,
								description: item.description || ""
							});
						}
					}, this);
					this.menu.show(items);

					if (conversion.then) {
						/*
						 * We only got a 'provisional' conversion. When caches are filled
						 * we'll get a callback and should try again.
						 */
						conversion.then(function() {
							if (this.element) { /* if there's no UI yet then ignore */
								this.setConversion(this.getConversion());
							}
						}.bind(this));
					}
				};
				CustomField.prototype.onItemClick = function(ev) {
					var conversion = ev.conversion;
					this.onFieldChange({conversion: conversion});
					this.setMessage(conversion.message);
				};
				CustomField.claim = function(type) {
					return type instanceof CustomType ? mFields.Field.MATCH + 1 : mFields.Field.NO_MATCH;
				};

				mFields.addField(CustomField);
			}
		};
		return Shell;
	}());

	return orion.shell;
});
