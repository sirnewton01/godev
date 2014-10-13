/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/

define(['i18n!orion/compare/nls/messages', 'orion/commands', 'orion/Deferred', 'orion/keyBinding', 'orion/webui/littlelib', 'orion/EventTarget'], 
function(messages, mCommands, Deferred, mKeyBinding, lib, EventTarget) {

var exports = {};
/**
 * @name orion.compare.CompareCommandFactory
 * @class Represents a command renderer to render all commands and key bindings of the command view.
 * @property {String} options.commandSpanId The DOM element id where the commands are rendered. Required.
 * @property {orion.commandregistry.CommandRegistry} options.commandService The command service that is used to register all the commands. Required.
 */
exports.CompareCommandFactory = (function() {
	function CompareCommandFactory(options){
		EventTarget.attach(this);
		this.setOptions(options, true);
	}	
	CompareCommandFactory.prototype = {
		setOptions: function(options, clearExisting){
			if(clearExisting){
				this.options = {};
			}
			if(!this.options) {
				this.options = {};
			}
			if(options) {
				Object.keys(options).forEach(function(option) {
					this.options[option] = options[option];
				}.bind(this));
			}
		},
		getOptions: function() {
			return this.options;
		},
		initCommands: function(compareWidget){	
			var commandSpanId = this.options.commandSpanId;
			var toggleCommandSpanId = this.options.toggleCommandSpanId;
			var commandService = this.options.commandService;
			if(!commandService || (!commandSpanId && !toggleCommandSpanId)){
				return;
			}
			var copyToLeftCommand = new mCommands.Command({
				name : messages["CpCurChangeRightToLeft"],
				tooltip : messages["CpCurChangeRightToLeft"],
				imageClass : "core-sprite-leftarrow", //$NON-NLS-0$
				id: "orion.compare.copyToLeft", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return compareWidget.type === "twoWay" && !compareWidget.getImageMode() && compareWidget.options.newFile && !compareWidget.options.newFile.readonly; //$NON-NLS-0$
				}.bind(this),
				callback : function(data) {
					data.items.copyToLeft();
			}});
			var copyToRightCommand = new mCommands.Command({
				name : messages["CpCurChangeLeftToRight"],
				tooltip : messages["CpCurChangeLeftToRight"],
				imageClass : "core-sprite-rightarrow", //$NON-NLS-0$
				id: "orion.compare.copyToRight", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return compareWidget.type === "twoWay" && !compareWidget.getImageMode() && compareWidget.options.oldFile && !compareWidget.options.oldFile.readonly; //$NON-NLS-0$
				}.bind(this),
				callback : function(data) {
					data.items.copyToRight();
			}});
			var ignoreWhitespaceCommand = new mCommands.Command({
				tooltip : messages["IgnoreWhitespaceTooltip"],
				name: messages["IgnoreWhitespace"],
				imageClass : "core-sprite-whitespace", //$NON-NLS-0$
				id: "orion.compare.ignoreWhitespace", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				type: "toggle",
				visibleWhen: function(item) {
					var isWhitespaceIgnored = item.isWhitespaceIgnored();
					ignoreWhitespaceCommand.checked = isWhitespaceIgnored;
					ignoreWhitespaceCommand.name = isWhitespaceIgnored ? messages["UseWhitespace"] : messages["IgnoreWhitespace"];
					ignoreWhitespaceCommand.tooltip = isWhitespaceIgnored ? messages["UseWhitespaceTooltip"] :  messages["IgnoreWhitespaceTooltip"];
					return true;
				},
				preCallback: function(data) {
					var widget = data.handler.getWidget();
					if(typeof widget.options.onSave === "function" && widget.isDirty()) { //$NON-NLS-0$
						var doSave = window.confirm(messages.confirmUnsavedChanges);
						if(!doSave) {
							return new Deferred().resolve();
						}
						return widget.options.onSave(doSave);
					}
					return new Deferred().resolve(true);
				},
				callback : function(data) {
					data.items.ignoreWhitespace(ignoreWhitespaceCommand.checked);
					this.dispatchEvent({type:"compareConfigChanged", name: "ignoreWhiteSpace", value: ignoreWhitespaceCommand.checked}); //$NON-NLS-0$
			}.bind(this)});
			var toggleInline2WayCommand = new mCommands.Command({
				tooltip : messages["Switch to unified diff"],
				name: messages["Unified"],
				imageClass : "compare-sprite-inline-2way", //$NON-NLS-0$
				id: "orion.compare.toggleInline2Way", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				type: "switch",
				visibleWhen: function(item) {
					if(!item.options.toggler) {
						return false;
					}
					var is2Way = item.options.toggler.getWidget().type === "twoWay";
					toggleInline2WayCommand.checked = !is2Way;
					toggleInline2WayCommand.name = is2Way ? messages["Unified"] : messages["Side by side"];
					toggleInline2WayCommand.tooltip = is2Way ? messages["Switch to unified diff"] :  messages["Switch to side by side diff"];
					return true;
				},
				preCallback: function(data) {
					var widget = data.handler.getWidget();
					if(typeof widget.options.onSave === "function" && widget.isDirty()) { //$NON-NLS-0$
						var doSave = window.confirm(messages.confirmUnsavedChanges);
						if(!doSave) {
							return new Deferred().resolve();
						}
						return widget.options.onSave(doSave);
					}
					return new Deferred().resolve(true);
				},
				callback : function(data) {
					this.dispatchEvent({type:"compareConfigChanged", name: "mode", value: data.items.options.toggler.getWidget().type === "twoWay" ? "inline" : "twoWay"}); //$NON-NLS-0$
					data.items.options.toggler.toggle();
			}.bind(this)});
			var nextDiffCommand = new mCommands.Command({
				name: messages["Next diff block"],
				tooltip : messages["Next diff block"],
				imageClass : "core-sprite-move-down", //$NON-NLS-0$
				id: "orion.compare.nextDiff", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return !compareWidget.getImageMode();
				},
				callback : function(data) {
					data.items.nextDiff();
			}});
			var prevDiffCommand = new mCommands.Command({
				name : messages["Previous diff block"],
				tooltip : messages["Previous diff block"],
				imageClass : "core-sprite-move-up", //$NON-NLS-0$
				id: "orion.compare.prevDiff", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return !compareWidget.getImageMode();
				},
				callback : function(data) {
					data.items.prevDiff();
			}});
			var nextChangeCommand = new mCommands.Command({
				name : messages["Next diff change"],
				tooltip : messages["Next diff change"],
				imageClass : "core-sprite-move-down", //$NON-NLS-0$
				id: "orion.compare.nextChange", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return !compareWidget.getImageMode();
				},
				callback : function(data) {
					data.items.nextChange();
			}});
			var prevChangeCommand = new mCommands.Command({
				name : messages["Previous diff change"],
				tooltip : messages["Previous diff change"],
				imageClass : "core-sprite-move-up", //$NON-NLS-0$
				id: "orion.compare.prevChange", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return !compareWidget.getImageMode();
				},
				callback : function(data) {
					data.items.prevChange(data);
			}});
			commandService.addCommand(copyToLeftCommand);
			commandService.addCommand(copyToRightCommand);
			commandService.addCommand(ignoreWhitespaceCommand);
			commandService.addCommand(toggleInline2WayCommand);
			commandService.addCommand(nextDiffCommand);
			commandService.addCommand(prevDiffCommand);
			commandService.addCommand(nextChangeCommand);
			commandService.addCommand(prevChangeCommand);
				
			// Register command contributions
			//If there is a separate DIV to render the toggle command, we use it here
			if(toggleCommandSpanId) {
				commandService.registerCommandContribution(toggleCommandSpanId, "orion.compare.toggleInline2Way", 108); //$NON-NLS-0$
			} else if(commandSpanId) {
				commandService.registerCommandContribution(commandSpanId, "orion.compare.toggleInline2Way", 108); //$NON-NLS-0$
			}
			//Render all other commands
			if(commandSpanId) {
				commandService.registerCommandContribution(commandSpanId, "orion.compare.copyToLeft", 110, null, false, new mKeyBinding.KeyBinding(37/*left arrow key*/, true, false, true)); //$NON-NLS-0$
				commandService.registerCommandContribution(commandSpanId, "orion.compare.copyToRight", 111, null, false, new mKeyBinding.KeyBinding(39/*left arrow key*/, true, false, true)); //$NON-NLS-0$
				commandService.registerCommandContribution(commandSpanId, "orion.compare.nextDiff", 112, null, false, new mKeyBinding.KeyBinding(40/*down arrow key*/, true)); //$NON-NLS-0$
				commandService.registerCommandContribution(commandSpanId, "orion.compare.prevDiff", 113, null, false, new mKeyBinding.KeyBinding(38/*up arrow key*/, true)); //$NON-NLS-0$
				if(compareWidget.options.wordLevelNav){
					commandService.registerCommandContribution(commandSpanId, "orion.compare.nextChange", 114, null, false, new mKeyBinding.KeyBinding(40/*down arrow key*/, true, true)); //$NON-NLS-0$
					commandService.registerCommandContribution(commandSpanId, "orion.compare.prevChange", 115, null, false, new mKeyBinding.KeyBinding(38/*up arrow key*/, true, true)); //$NON-NLS-0$
				} else {
					commandService.registerCommandContribution(commandSpanId, "orion.compare.nextChange", 114, null, true, new mKeyBinding.KeyBinding(40/*down arrow key*/, true, true)); //$NON-NLS-0$
					commandService.registerCommandContribution(commandSpanId, "orion.compare.prevChange", 115, null, true, new mKeyBinding.KeyBinding(38/*up arrow key*/, true, true)); //$NON-NLS-0$
				}
				commandService.registerCommandContribution(commandSpanId, "orion.compare.ignoreWhitespace", 109); //$NON-NLS-0$
			}
		},
		
		renderCommands: function(compareWidget){
			var commandSpanId = this.options.commandSpanId;
			var toggleCommandSpanId = this.options.toggleCommandSpanId;
			var commandService = this.options.commandService;
			if(!commandService || (!commandSpanId && !toggleCommandSpanId)){
				return;
			}
			if(toggleCommandSpanId) {
				lib.empty(lib.node(toggleCommandSpanId));
				commandService.renderCommands(toggleCommandSpanId, toggleCommandSpanId, compareWidget, compareWidget, "tool", null); //$NON-NLS-0$
			}
			if(commandSpanId) {
				lib.empty(lib.node(commandSpanId));
				if(this.options.gridRenderer && this.options.gridRenderer.navGridHolder){
					this.options.gridRenderer.navGridHolder.splice(0, this.options.gridRenderer.navGridHolder.length);
					if(this.options.gridRenderer.additionalCmdRender){
						if(this.options.gridRenderer.before){
							this.options.gridRenderer.additionalCmdRender(this.options.gridRenderer.navGridHolder);
							commandService.renderCommands(commandSpanId, commandSpanId, compareWidget, compareWidget, "tool", null, this.options.gridRenderer.navGridHolder); //$NON-NLS-0$
						} else {
							commandService.renderCommands(commandSpanId, commandSpanId, compareWidget, compareWidget, "tool", null, this.options.gridRenderer.navGridHolder); //$NON-NLS-0$
							this.options.gridRenderer.additionalCmdRender(this.options.gridRenderer.navGridHolder);
						}
					} else {
						commandService.renderCommands(commandSpanId, commandSpanId, compareWidget, compareWidget, "tool", null, this.options.gridRenderer.navGridHolder); //$NON-NLS-0$
					}
				} else {
					commandService.renderCommands(commandSpanId, commandSpanId, compareWidget, compareWidget, "tool", null); //$NON-NLS-0$
				}
			}
		}
	};
	return CompareCommandFactory;
}());

return exports;
});
