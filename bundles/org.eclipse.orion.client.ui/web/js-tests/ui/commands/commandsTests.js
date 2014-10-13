/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define(['chai/chai', 'orion/serviceregistry', 'orion/commandRegistry', 'orion/commands', 'orion/keyBinding', 'orion/selection', 'orion/Deferred', 'orion/webui/littlelib', 'orion/webui/dropdown'], 
			function(chai, mServiceregistry, mCommandRegistry, mCommands, mKeyBinding, mSelection, Deferred, lib, mDropdown) {
	var assert = chai.assert;		
	/**
	 * dom elements we need
	 */
	var parentDiv = document.createElement("div");
	document.body.appendChild(parentDiv);
	var parentUl = document.createElement("ul");
	document.body.appendChild(parentUl);
	var menuDiv = document.createElement("div");
	document.body.appendChild(menuDiv);
	var dropdownTrigger = document.createElement("span");
	menuDiv.appendChild(dropdownTrigger);
	dropdownTrigger.classList.add("dropdownTrigger");
	dropdownTrigger.classList.add("commandButton");
	var dropdownMenu = document.createElement("ul");
	menuDiv.appendChild(dropdownMenu);
	dropdownMenu.classList.add("dropdownMenu");
	var parentMenu = new mDropdown.Dropdown({dropdown: dropdownMenu});
		
	/**
	 * mock services
	 */
	var serviceRegistry = new mServiceregistry.ServiceRegistry();
	var selectionService = new mSelection.Selection(serviceRegistry);
	var commandRegistry = new mCommandRegistry.CommandRegistry({selection: selectionService});
	
	/**
	 * mock items
	 */
	var item1 = {
		Name: "Foo",
		Description: "I am Foo",
		IsValid: true
	};
	
	var item2 = {
		Name: "Bar",
		Description: "I am Bar",
		IsValid: true
	};
	
	var item3 = {
		Name: "Baz",
		Description: "I am Baz",
		IsValid: true
	};
	
	var allItems = [item1, item2, item3];
	selectionService.setSelections([item1, item2]);
	
	function initializeItems() {
		item1.IsValid = true;
		item2.IsValid = true;
		item3.IsValid = true;
	}
	
	/**
	 * helpers
	 */
	var isMac = window.navigator.platform.indexOf("Mac") !== -1;

	var visibleWhenAllValid = function(items) {
		if (Array.isArray(items)) {
			for (var i=0; i<items.length; i++) {
				if (!items[0].IsValid) {
					return false;
				}
			}
			return true;
		} else {
			return items.IsValid;
		}
	};
	
	var visibleWhenOnlyOne = function(items) {
		if (Array.isArray(items)) {
			return items.length === 1 && items[0].IsValid;
		} else {
			return items.IsValid;
		}
	};
	 
	var hitCounters = {};
	
	function hitCommand(id) {
		if (hitCounters[id]) {
			hitCounters[id] = hitCounters[id] + 1;
		} else {
			hitCounters[id] = 1;
		}
	}
	
	function fakeKeystroke(bindings, keyCode, mod1, mod2, mod3, mod4) {
		// We implement only the parts of event we know that the command framework uses.
		var event = {target: parentDiv};
		event.preventDefault = function() {};		
		event.stopPropagation = function() {};
		if (typeof(keyCode) === "string") {
			event.keyCode = keyCode.toUpperCase().charCodeAt(0);
		} else {
			event.keyCode = keyCode;
		} 
		if (isMac) {
			event.metaKey = !!mod1;
			event.ctrlKey = !!mod4;
		} else {
			event.ctrlKey = !!mod1;
		}
		event.shiftKey = !!mod2;
		event.altKey = !!mod3;
		event.type = "keydown";
		mCommands._testMethodProcessKey(event, bindings || commandRegistry._activeBindings);  // a total reach into the implementation
	}
	
	
	 
	/**
	 * mock commands
	 */ 
	 
	 var deleteCommand = new mCommands.Command({
		name: "Delete",
		tooltip: "Delete the selected items",
		imageClass: "core-sprite-delete",
		id: "test.delete",
		visibleWhen: visibleWhenAllValid,
		callback: function(data) {
			hitCommand("test.delete");		
		}
	});
	commandRegistry.addCommand(deleteCommand);
	
	var newCommand = new mCommands.Command({
		name: "New",
		tooltip: "Make a new thing",
		imageClass: "core-sprite-delete",
		id: "test.new",
		visibleWhen: visibleWhenOnlyOne,
		callback: function(data) {
			hitCommand("test.new");		
		}
	});
	commandRegistry.addCommand(newCommand);
	
	var noIconCommand = new mCommands.Command({
		name: "No Icon",
		tooltip: "This thing has no icon",
		id: "test.noIcon",
		visibleWhen: visibleWhenAllValid,
		callback: function(data) {
			hitCommand("test.noIcon");		
		}
	});
	commandRegistry.addCommand(noIconCommand);
	
	var linkCommand = new mCommands.Command({
		name: "Link",
		tooltip: "This thing is a link",
		id: "test.link",
		visibleWhen: visibleWhenOnlyOne,
		hrefCallback: function(data) {
			hitCommand("test.link");
			return "/foo.html";
		}
	});
	commandRegistry.addCommand(linkCommand);
	
	var parameters = new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter('name', 'text', 'Name:', 'New Thing')]);
	parameters.cumulativeCount = 0;
	var lastCommandInvocation;
	var commandWithParameters = new mCommands.Command({
		name: "Parameters",
		tooltip: "I have parameters",
		id: "test.parameters",
		parameters: parameters,
		visibleWhen: visibleWhenOnlyOne,
		callback: function(data) {
			hitCommand("test.parameters");
			assert.notStrictEqual(data.parameter, parameters);
			assert.notStrictEqual(data, lastCommandInvocation);
			assert.strictEqual(data.command.parameters, parameters);
			parameters.cumulativeCount++;
			parameters.lastValueForName = data.parameters.valueFor("name");
		}
	});
	commandRegistry.addCommand(commandWithParameters);

	var tests = {};

	var contributionId;
	
	function init(testId) {
		window.console.log("Initializing data for test " + testId);
		contributionId = testId;
		parentMenu.empty();
		commandRegistry.destroy(parentDiv);
		commandRegistry.destroy(parentUl);
		initializeItems();
	}
	
	describe("Test commands", function() {
		/**
		 * Test rendering of atomic commands as buttons
		 */
		it("RenderAtomicButtons", function() {
			init("testRenderAtomicButtons");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(parentDiv.childNodes.length, 2);
		});
		
		/**
		 * Test rendering of atomic commands as tools
		 */
		it("RenderAtomicTools", function() {
			init("testRenderAtomicTools");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "tool");
			assert.equal(parentDiv.childNodes.length, 2);
		});
		
		/**
		 * Test rendering mixed links and buttons
		 */
		it("RenderMixedLinksAndButtons", function() {
			init("testRenderMixedLinksAndButtons");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.link", 3);
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(parentDiv.childNodes.length, 3);
			assert.equal(lib.$$("a", parentDiv).length, 1);
		});
		
		/**
		 * Test rendering mixed links and tools
		 */
		it("RenderMixedLinksAndTools", function() {
			init("testRenderMixedLinksAndTools");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.link", 3);
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "tool");
			assert.equal(parentDiv.childNodes.length, 3);
			assert.equal(lib.$$("a", parentDiv).length, 1);
		});
		
		/**
		 * Test rendering of tools without images
		 */
		it("RenderMissingImageTools", function() {
			init("testRenderMissingImageTools");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 3);
			commandRegistry.renderCommands(contributionId, parentDiv, allItems, window, "tool");
			assert.equal(parentDiv.childNodes.length, 2);
			assert.equal(lib.$$(".commandSprite", parentDiv).length, 1);
			assert.equal(lib.$$(".commandMissingImageButton", parentDiv).length, 1);
		});
		
		/**
		 * Tests rendering a menu item
		 */
		it("RenderAtomicMenu", function() {
			init("testRenderAtomicMenu");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 3);
			commandRegistry.renderCommands(contributionId, dropdownMenu, item1, window, "menu");
			assert.equal(parentMenu.getItems().length, 3);
		});
		
		/**
		 * Test unnamed groups
		 */
		it("RenderUnnamedGroups", function() {
			init("testRenderUnnamedGroups");
			commandRegistry.addCommandGroup(contributionId, "testGroup", 1);
			commandRegistry.addCommandGroup(contributionId, "testGroup2", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 1, "testGroup2");
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(lib.$$(".commandSeparator", parentDiv).length, 1);
		});
		
		/**
		 * Test named groups produces a menu
		 */
		it("RenderNamedGroupDropDown", function() {
			init("testRenderUnnamedGroups");
			commandRegistry.addCommandGroup(contributionId, "testGroup", 1, "Menu");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 3, "testGroup");
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(lib.$$(".commandButton.dropdownTrigger", parentDiv).length, 1);
		});
		
		/**
		 * Test named group inside a menu
		 */
		it("RenderNamedGroupMenu", function() {
			init("testRenderNamedGroupMenu");
			commandRegistry.addCommandGroup(contributionId, "testGroup", 1, "SubMenu");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 3, "testGroup");
			commandRegistry.renderCommands(contributionId, dropdownMenu, item1, window, "menu");
			assert.equal(parentMenu.getItems().length, 1);  // everything is in a submenu
		});
		
		/**
		 * Test render nested groups
		 */
		it("RenderNestedGroups", function() {
			init("testRenderNestedGroupsMenu");
			commandRegistry.addCommandGroup(contributionId, "testGroup", 1, "Menu");
			commandRegistry.addCommandGroup(contributionId, "testGroup2", 1, "SubMenu", "testGroup");
			commandRegistry.addCommandGroup(contributionId, "testGroup3", 1, "SubSubMenu", "testGroup/testGroup2");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1, "testGroup");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2, "testGroup/testGroup2");
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 3, "testGroup/testGroup2/testGroup3");
			commandRegistry.renderCommands(contributionId, menuDiv, item1, window, "menu");
			assert.equal(lib.$$(".dropdownTrigger", menuDiv).length, 4);  // four menus
			assert.equal(lib.$$(".dropdownTrigger.dropdownMenuItem", menuDiv).length, 3);  // three sub menus
			assert.equal(lib.$$(".dropdownTrigger.commandButton", menuDiv).length, 1);  // one top menu
		});
		
		/**
		 * Test no items match
		 */
		it("NoItemsValidate", function() {
			init("testNoItemsValidate");
			item1.IsValid = false;
			item2.IsValid = false;
			item3.IsValid = false;
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.link", 3);
			commandRegistry.renderCommands(contributionId, parentDiv, allItems, window, "button");
			assert.equal(parentDiv.childNodes.length, 0);
		});	 
		
		/**
		 * Test selection service when no items
		 */
		it("NoItemsSpecified", function() {
			init("testNoItemsSpecified");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.link", 3);
			commandRegistry.renderCommands(contributionId, parentDiv, null, window, "button");
			assert.equal(parentDiv.childNodes.length, 2);  // selection service had two items in it so only two commands (delete and noIcon) validated against it
		});	
		
			/**
		 * Test rendered in ul parent
		 */
		it("RenderInUl", function() {
			init("testRenderInUl");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1);
			commandRegistry.registerCommandContribution(contributionId, "test.new", 2);
			commandRegistry.registerCommandContribution(contributionId, "test.link", 3);
			commandRegistry.renderCommands(contributionId, parentUl, item1, window, "button");
			assert.equal(lib.$$("a", parentUl).length, 1);
			assert.equal(lib.$$("li > a", parentUl).length, 1);
			assert.equal(parentUl.childNodes.length, 3);
			assert.equal(lib.$$("li", parentUl).length, 3);
		});	
		
		/**
		 * Test life cycle of parameters and invocations
		 */
		it("CommandParametersLifeCycle", function() {
			init("testCommandParametersLifeCycle");
			// URL binding is so we know we have a saved invocation for the test.
			commandRegistry.registerCommandContribution(contributionId, "test.parameters", 1, null, false, null,  new mCommandRegistry.URLBinding("foo", "name"));
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			hitCounters = {};
			commandRegistry.runCommand("test.parameters");
			commandRegistry.runCommand("test.parameters");
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(hitCounters["test.parameters"], 2);
					assert.equal(parameters.cumulativeCount, 2);
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 500);
			return d;
			// running the command has assertions built in for lifecycle
			
		});	
		
		/**
		 * Test key binding execution, rendered command
		 */
		it("KeyBindingRendered", function() {
			init("testKeyBindingRendered");
			commandRegistry.registerCommandContribution(contributionId, "test.delete", 1, null, false, new mKeyBinding.KeyBinding('z'));
			commandRegistry.renderCommands(contributionId, parentDiv, allItems, window, "button");
			assert.equal(parentDiv.childNodes.length, 1);
			hitCounters["test.delete"] = 0;
			fakeKeystroke(null, 'z');
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(hitCounters["test.delete"], 1);
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 500);
			return d;
		});	
		
		/**
		 * Test key binding execution, not rendered command
		 */
		it("KeyBindingNotRendered", function() {
			init("testKeyBindingNotRendered");
			commandRegistry.registerCommandContribution(contributionId, "test.noIcon", 1, null, true, new mKeyBinding.KeyBinding('z', true, true));
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(parentDiv.childNodes.length, 0);
			hitCounters["test.noIcon"] = 0;
			fakeKeystroke(null, 'z', true, true);
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(hitCounters["test.noIcon"], 1);
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 1000);
			return d;
		});
		
		/**
		 * Test key binding execution, rendered command
		 */
		it("UrlBindingRendered", function() {
			init("testUrlBindingRendered");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 1, null, false, null, new mCommandRegistry.URLBinding("foo", "name"));
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(parentDiv.childNodes.length, 1);
			commandRegistry.processURL("#,foo=fred");
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(parameters.lastValueForName, "fred");
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 500);
			return d;		
		});	
		
		/* for testing the unit test page, uncomment when we need to see failures 
		it("FailOnPurpose", function() {
			assert.equal(1,2);
		});
		*/
		
		/**
		 * Test url binding execution, not rendered command
		 */
		it("UrlBindingNotRendered", function() {
			init("testUrlBindingNotRendered");
			commandRegistry.registerCommandContribution(contributionId, "test.new", 1, null, true, null, new mCommandRegistry.URLBinding("foo", "name"));
			commandRegistry.renderCommands(contributionId, parentDiv, item1, window, "button");
			assert.equal(parentDiv.childNodes.length, 0);
			commandRegistry.processURL("#,foo=wilma");
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(parameters.lastValueForName, "wilma");
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 1000);
			return d;
		});	
		
		/**
		 * Test a command created without the command registry
		 */
		it("StandAloneCommand", function() {
			init("testStandAloneCommand");
			var commandInvocation = new mCommands.CommandInvocation(this, item1, null, newCommand);
			mCommands.createCommandItem(parentDiv, newCommand, commandInvocation, "myButton");
			assert.equal(parentDiv.childNodes.length, 1);
		});	
		
			/**
		 * Test a command with keybinding created without the command registry
		 */
		it("StandAloneCommandKeyBinding", function() {
			init("testStandAloneCommand");
			var commandInvocation = new mCommands.CommandInvocation(this, item1, null, newCommand);
			mCommands.createCommandItem(parentDiv, newCommand, commandInvocation, "myButton", new mKeyBinding.KeyBinding('q', true));
			hitCounters["test.new"] = 0;
			fakeKeystroke(mCommands.localKeyBindings, 'q', true);
			var d = new Deferred();
			window.setTimeout(function(){
				try {
					assert.equal(hitCounters["test.new"], 1);
					d.resolve();
				} catch (e) {
					d.reject(e);			
				}
			}, 500);
			return d;
		});	
	});	
});
