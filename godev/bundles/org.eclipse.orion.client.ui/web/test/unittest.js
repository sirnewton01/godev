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
/*global document console define window */


define([
	'require',
	'orion/webui/littlelib',
	'orion/serviceregistry',
	'orion/pluginregistry',
	'orion/bootstrap',
	'orion/commandRegistry',
	'orion/fileClient',
	'orion/searchClient',
	'orion/globalCommands',
	'orion/webui/treetable',
	"orion/URITemplate",
	'orion/PageUtil'
], function(require, lib, mServiceRegistry, mPluginRegistry, mBootstrap, mCommandRegistry, mFileClient,
	mSearchClient, mGlobalCommands, mTreetable, URITemplate, mPageUtil) {

	function UnitTestModel(root) {
		this.root = root;
	}
	UnitTestModel.prototype = {
		destroy: function() {},
		getRoot: function(onItem) {
			onItem(this.root);
		},
		getChildren: function(parentItem, /* function(items) */ onComplete) {
			if (parentItem.children) {
				onComplete(parentItem.children);
			} else {
				onComplete([]);
			}
		},
		getId: function( /* item */ item) {
			var result;
			if (item === this.root) {
				result = "treetable"; //$NON-NLS-0$
			} else {
				result = item.Name;
			}
			return result;
		}
	};


	function UnitTestRenderer() {}
	UnitTestRenderer.prototype = {
		initTable: function(tableNode, tableTree) {
			this.tableTree = tableTree;
			tableNode.classList.add('treetable'); //$NON-NLS-0$
		},

		render: function(item, tableRow) {

			tableRow.cellSpacing = "8px"; //$NON-NLS-0$
			tableRow.style.verticalAlign = "baseline"; //$NON-NLS-0$
			tableRow.classList.add("treeTableRow"); //$NON-NLS-0$
			var col, div, link, button;
			if (item.Directory) {
				col = document.createElement('td'); //$NON-NLS-0$
				tableRow.appendChild(col);
				var nameId = tableRow.id + "__expand"; //$NON-NLS-0$
				div = document.createElement("div"); //$NON-NLS-0$
				col.appendChild(div);
				var expandImg = document.createElement("img"); //$NON-NLS-0$
				expandImg.src = require.toUrl("images/collapsed-gray.png"); //$NON-NLS-0$
				expandImg.name = nameId;
				div.appendChild(expandImg);
				var folderImg = document.createElement("img"); //$NON-NLS-0$
				folderImg.src = require.toUrl("images/folder.gif"); //$NON-NLS-0$
				div.appendChild(folderImg);
				link = document.createElement("a"); //$NON-NLS-0$
				link.className = "navlinkonpage"; //$NON-NLS-0$
				link.href = "#" + item.ChildrenLocation; //$NON-NLS-0$
				div.appendChild(link);
				link.appendChild(document.createTextNode(item.Name));
				var tableTree = this.tableTree;
				expandImg.addEventListener("click", function(evt) { //$NON-NLS-0$
					tableTree.toggle(tableRow.id);
				}, false);
			} else {
				col = document.createElement('td'); //$NON-NLS-0$
				tableRow.appendChild(col);
				div = document.createElement("div"); //$NON-NLS-0$
				col.appendChild(div);
				div.className = (item.result ? "testSuccess" : "testFailure"); //$NON-NLS-1$ //$NON-NLS-0$
				div.id = item.Name;
				var img = document.createElement("img"); //$NON-NLS-0$
				img.src = item.result ? require.toUrl("images/unit_test/testok.gif") : require.toUrl("images/unit_test/testfail.gif"); //$NON-NLS-1$ //$NON-NLS-0$
				div.appendChild(img);
				div.appendChild(document.createTextNode(item.Name + " (" + (item.millis / 1000) + "s)")); //$NON-NLS-1$ //$NON-NLS-0$


				if (!item.result) {
					var msg = "[FAILURE][" + item.Name + "][" + item.message + "]\n" + ((item.stack !== undefined && item.stack) ? item.stack : ""); //$NON-NLS-0$
					button = document.createElement("button"); //$NON-NLS-0$
					button.appendChild(document.createTextNode("Show Failure"));
					button.orionState = true;
					div.appendChild(button);
					button.addEventListener("click", function(evt) { //$NON-NLS-0$
						if (evt.target.orionState) {
							// TODO we should make this prettier
							var pre = document.createElement("pre"); //$NON-NLS-0$
							pre.appendChild(document.createTextNode(msg));
							div.appendChild(pre);
							evt.target.textContent = "Hide Failure";
							evt.target.orionState = false;
						} else {
							var parentDiv = evt.target.parentNode;
							parentDiv.removeChild(parentDiv.lastChild);
							evt.target.textContent = "Show Failure";
							evt.target.orionState = true;
						}
					}, false);
					if (!item.logged) {
						console.log(msg);
						item.logged = true;
					}
				}

				// create a button to rerun the test:
				var browserURL = window.location.toString();
				var testlink = browserURL.split('#')[0] + "#"; //$NON-NLS-1$ //$NON-NLS-0$
				var testfile = mPageUtil.matchResourceParameters(window.location.toString()).resource;
				var hreflink = new URITemplate(testlink + "{+resource,params*}").expand({
					resource: testfile,
					params: {
						"test": item.Name
					}
				}); //$NON-NLS-1$ //$NON-NLS-0$
				button = document.createElement("button"); //$NON-NLS-0$
				button.appendChild(document.createTextNode("Rerun"));
				div.appendChild(button);
				button.addEventListener("click", function() { //$NON-NLS-0$
					window.location.href = hreflink;
					window.location.reload(true);
				}, false);
			}

			var resultColumn = document.createElement('td'); //$NON-NLS-0$
			tableRow.appendChild(resultColumn);
		},
		rowsChanged: function() {}
	};

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;
		var commandRegistry = new mCommandRegistry.CommandRegistry({});
		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry,
			fileService: fileClient
		});

		// global banner
		mGlobalCommands.generateBanner("orion-unittest", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$

		function runTests(testSelectionURI) {
			// testSelectionURI specifies a test file and optionally a specific test
			// e.g. "#foo/mytests.html,test=testThisSpecificThing"
			var matched = mPageUtil.matchResourceParameters(testSelectionURI); //$NON-NLS-0$
			var specificTest = matched.test;
			var fileURI = matched.resource;
//			 console.log("installing non-persistent plugin: " + fileURI);
			var testOverview = lib.node("test-overview"); //$NON-NLS-0$
			lib.empty(testOverview);
			var testTree = lib.node("test-tree"); //$NON-NLS-0$
			lib.empty(testTree);

			testOverview.appendChild(document.createTextNode("Running tests from: "));
			var link = document.createElement("a"); //$NON-NLS-0$
			link.className = "navlink"; //$NON-NLS-0$
			link.href = require.toUrl("edit/edit.html") + "#" + fileURI; //$NON-NLS-1$ //$NON-NLS-0$
			testOverview.appendChild(link);
			link.appendChild(document.createTextNode(fileURI));

			// these are isolated from the regular service and plugin registry
			var testServiceRegistry = new mServiceRegistry.ServiceRegistry();
			var testPluginRegistry = new mPluginRegistry.PluginRegistry(testServiceRegistry, {
				storage: {}
			});
			testPluginRegistry.start().then(function() {
				return testPluginRegistry.installPlugin(fileURI);
			}).then(function(plugin) {
				return plugin.start();
			}).then(function() {
				var service = testServiceRegistry.getService("orion.test.runner"); //$NON-NLS-0$
				//console.log("got service: " + service);

				var root = {
					children: []
				};

				var myTree = new mTreetable.TableTree({
					model: new UnitTestModel(root),
					showRoot: false,
					parent: "test-tree", //$NON-NLS-0$
					labelColumnIndex: 0, // 1 if with checkboxes
					renderer: new UnitTestRenderer()
				});

				var times = {};
				var testCount = 0;
				var _top;
				service.addEventListener("runStart", function(event) { //$NON-NLS-0$
					var n = event.name ? event.name : "<top>"; //$NON-NLS-0$
					if (!_top) {
						_top = n;
					}
//					console.log("[Test Run] - " + name + " start");
					times[n] = new Date().getTime();
				});
				service.addEventListener("runDone", function(event) { //$NON-NLS-0$
					var n = event.name ? event.name : "<top>"; //$NON-NLS-0$
//					var result = [];
//					result.push("[Test Run] - " + name + " done - ");
//					result.push("[Failures:" + obj.failures + (name === top ? ", Test Count:" + testCount : "") +"] ");
//					result.push("(" + (new Date().getTime() - times[name]) / 1000 + "s)");
					delete times[n];
//					console.log(result.join(""));
				});
				service.addEventListener("testStart", function(event) { //$NON-NLS-0$
					times[event.name] = new Date().getTime();
					testCount++;
				});
				service.addEventListener("testDone", function(event) { //$NON-NLS-0$
//					var result = [];
//					result.push(obj.result ? " [passed] " : " [failed] ");
//					result.push(name);
					var millis = new Date().getTime() - times[event.name];
//					result.push(" (" + (millis) / 1000 + "s)");
					delete times[event.name];
//					if (!obj.result) {
//						result.push("\n  " + obj.message);
//					}
//					console.log(result.join(""));
					root.children.push({
						Name: event.name,
						result: event.result,
						message: event.message,
						stack: event.stack,
						millis: millis
					});
					myTree.refresh(root, root.children);
				});
				if (specificTest) {
					service.run(specificTest).then(function(result) {
						testPluginRegistry.stop();
					});
				} else {
					service.run().then(function(result) {
						testPluginRegistry.stop();
					});
				}
			}, function(error) {
				var img = document.createElement("img"); //$NON-NLS-0$
				img.src = require.toUrl("images/unit_test/testfail.gif"); //$NON-NLS-0$
				testTree.appendChild(img);
				testTree.appendChild(document.createTextNode(error));
			});
		}

		window.addEventListener("hashchange", function() { //$NON-NLS-0$
			runTests(window.location.hash);
		}, false);
		runTests(window.location.hash);
	});
});