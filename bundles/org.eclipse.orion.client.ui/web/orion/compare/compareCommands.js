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
/*global define */
/*jslint forin:true regexp:false sub:true*/

define(['i18n!orion/compare/nls/messages', 'orion/commands', 'orion/keyBinding', 'orion/webui/littlelib'], 
function(messages, mCommands, mKeyBinding, lib) {

var exports = {};
/**
 * @name orion.compare.CompareCommandFactory
 * @class Represents a command renderer to render all commands and key bindings of the command view.
 * @property {String} options.commandSpanId The DOM element id where the commands are rendered. Required.
 * @property {orion.commandregistry.CommandRegistry} options.commandService The command service that is used to register all the commands. Required.
 */
exports.CompareCommandFactory = (function() {
	function CompareCommandFactory(options){
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
			var commandService = this.options.commandService;
			if(!commandService || !commandSpanId){
				return;
			}
			var copyToLeftCommand = new mCommands.Command({
				name : messages["Copy current change from right to left"],
				tooltip : messages["Copy current change from right to left"],
				imageClass : "core-sprite-leftarrow", //$NON-NLS-0$
				id: "orion.compare.copyToLeft", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return compareWidget.type === "twoWay" && compareWidget.options.newFile && !compareWidget.options.newFile.readonly; //$NON-NLS-0$
				}.bind(this),
				callback : function(data) {
					data.items.copyToLeft();
			}});
			var copyToRightCommand = new mCommands.Command({
				name : messages["Copy current change from left to right"],
				tooltip : messages["Copy current change from left to right"],
				imageClass : "core-sprite-rightarrow", //$NON-NLS-0$
				id: "orion.compare.copyToRight", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return compareWidget.type === "twoWay" && compareWidget.options.oldFile && !compareWidget.options.oldFile.readonly; //$NON-NLS-0$
				}.bind(this),
				callback : function(data) {
					data.items.copyToRight();
			}});
			var toggle2InlineCommand = new mCommands.Command({
				tooltip : messages["Switch to unified diff"],
				name: messages["Unified"],
				//imageClass : "core-sprite-link", //$NON-NLS-0$
				id: "orion.compare.toggle2Inline", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return item.options.toggler && item.options.toggler.getWidget().type === "twoWay"; //$NON-NLS-0$
				},
				callback : function(data) {
					data.items.options.toggler.toggle();
			}});
			var toggle2TwoWayCommand = new mCommands.Command({
				tooltip : messages["Switch to side by side diff"],
				name: messages["Side by side"],
				//imageClass : "core-sprite-link", //$NON-NLS-0$
				id: "orion.compare.toggle2TwoWay", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				visibleWhen: function(item) {
					return item.options.toggler && item.options.toggler.getWidget().type === "inline"; //$NON-NLS-0$
				},
				callback : function(data) {
					data.items.options.toggler.toggle();
			}});
			var nextDiffCommand = new mCommands.Command({
				name: messages["Next diff block"],
				tooltip : messages["Next diff block"],
				imageClass : "core-sprite-move-down", //$NON-NLS-0$
				id: "orion.compare.nextDiff", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				callback : function(data) {
					data.items.nextDiff();
			}});
			var prevDiffCommand = new mCommands.Command({
				name : messages["Previous diff block"],
				tooltip : messages["Previous diff block"],
				imageClass : "core-sprite-move-up", //$NON-NLS-0$
				id: "orion.compare.prevDiff", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				callback : function(data) {
					data.items.prevDiff();
			}});
			var nextChangeCommand = new mCommands.Command({
				name : messages["Next diff change"],
				tooltip : messages["Next diff change"],
				imageClass : "core-sprite-move-down", //$NON-NLS-0$
				id: "orion.compare.nextChange", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				callback : function(data) {
					data.items.nextChange();
			}});
			var prevChangeCommand = new mCommands.Command({
				name : messages["Previous diff change"],
				tooltip : messages["Previous diff change"],
				imageClass : "core-sprite-move-up", //$NON-NLS-0$
				id: "orion.compare.prevChange", //$NON-NLS-0$
				groupId: "orion.compareGroup", //$NON-NLS-0$
				callback : function(data) {
					data.items.prevChange(data);
			}});
			commandService.addCommand(copyToLeftCommand);
			commandService.addCommand(copyToRightCommand);
			commandService.addCommand(toggle2TwoWayCommand);
			commandService.addCommand(toggle2InlineCommand);
			commandService.addCommand(nextDiffCommand);
			commandService.addCommand(prevDiffCommand);
			commandService.addCommand(nextChangeCommand);
			commandService.addCommand(prevChangeCommand);
				
			// Register command contributions
			commandService.registerCommandContribution(commandSpanId, "orion.compare.toggle2Inline", 108); //$NON-NLS-0$
			commandService.registerCommandContribution(commandSpanId, "orion.compare.toggle2TwoWay", 109); //$NON-NLS-0$
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
		},
		
		renderCommands: function(compareWidget){
			var commandSpanId = this.options.commandSpanId;
			var commandService = this.options.commandService;
			if(!commandService || !commandSpanId){
				return;
			}
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
	};
	return CompareCommandFactory;
}());

return exports;
});
