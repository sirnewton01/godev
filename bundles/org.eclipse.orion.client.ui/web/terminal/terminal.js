/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 * 	IBM Corporation - initial API and implementation
 *******************************************************************************/

/*global define window document*/

define(["require", "orion/browserCompatibility", "orion/bootstrap", "orion/xhr", "orion/Deferred",
	"orion/commandRegistry", "orion/fileClient", "orion/searchClient", "orion/globalCommands",
	"orion/status", "orion/progress", "orion/operationsClient", "terminal/term"],

function(require, mBrowserCompatibility, mBootstrap, xhr, Deferred, mCommandRegistry, mFileClient,
mSearchClient, mGlobalCommands, mStatus, mProgress, mOperationsClient, terminal) {

	var orionTerminal = {
		connect: function() {
			return xhr("POST", "../docker/connect", { //$NON-NLS-1$ //$NON-NLS-0$
				headers: {
					"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000,
				responseType: "text",
				handleAs: "json" //$NON-NLS-0$
			});
		},
		disconnect: function() {
			return xhr("POST", "../docker/disconnect", { //$NON-NLS-1$ //$NON-NLS-0$
				headers: {
					"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000
			});
		}
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
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);
		mGlobalCommands.generateBanner("orion-terminalPage", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: "Orion Terminal",
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry
		});
		
		var autoresize;
		var rows;
		var cols;
		var color;
		var pageTrim;
		var term;
		var websocket;
		
		serviceRegistry.registerService("orion.cm.managedservice", //$NON-NLS-0$
		{
			updated: function (properties) {
				var target;
				if (properties) {
					if (properties["cols"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
						cols = properties["cols"]; //$NON-NLS-0$ 
					}
					if (properties["rows"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
						rows = properties["rows"]; //$NON-NLS-0$ 
					}
					if (properties["autoresize"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
						autoresize = properties["autoresize"]; //$NON-NLS-0$ 
					}
					if (properties["color"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
						color = properties["color"]; //$NON-NLS-0$ 
					}
					if (properties["pageTrim"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
						pageTrim = properties["pageTrim"]; //$NON-NLS-0$ 
					}
					
					//update term with new settings
					if (term && websocket && !autoresize) {
						websocket.send(" stty -echo\r"); //$NON-NLS-0$
						websocket.send(" stty columns " + cols + " rows " + rows + "\r"); //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
						websocket.send(" stty echo\r"); //$NON-NLS-0$
						term.resize(cols, rows);
						websocket.send(" clear\r"); //$NON-NLS-0$
					}
				}
			}
		}, {
			pid: "orion.terminal.settings" //$NON-NLS-0$
		}); //$NON-NLS-0$
				
		function getFirstChild(element) {
			var el = element.firstChild;
			while (el != null && el.nodeType == 3) {
				el = el.nextSibling;
			}
			return el;
		}
		
		function resize() {
			if (!autoresize) {
				return;
			}
			var terminalDiv = getFirstChild(document.getElementById("mainNode")); //$NON-NLS-0$
			var div1 = document.createElement("div"); //$NON-NLS-0$
			div1.style.position = "fixed"; //$NON-NLS-0$
			div1.style.left = "-1000px"; //$NON-NLS-0$
			div1.innerHTML = "\u00A0"; //$NON-NLS-0$
 			terminalDiv.appendChild(div1);
			var oneCharWidth  = div1.getBoundingClientRect();
			var terminalCharWidth = oneCharWidth.right - oneCharWidth.left;
			terminalDiv.removeChild(div1);
			var terminalWidth = terminalDiv.clientWidth; 
			var calcWidth = Math.floor(terminalWidth / terminalCharWidth);
			var terminalHeight = terminalDiv.clientHeight; 
			var terminalCharHeight = oneCharWidth.bottom - oneCharWidth.top;
			var calcHeight = Math.floor(terminalHeight / terminalCharHeight);
			//ctrl-u copy
			//websocket.send("\u0015"); //$NON-NLS-0$ 
			websocket.send(" stty -echo\r"); //$NON-NLS-0$
			websocket.send(" stty columns " + calcWidth + " rows " + calcHeight + "\r"); //$NON-NLS-0$ //$NON-NLS-1$ //$NON-NLS-2$
			websocket.send(" stty echo\r"); //$NON-NLS-0$
			//ctrl-y paste
			//websocket.send("\u0019"); //$NON-NLS-0$
			term.resize(calcWidth, calcHeight);
			//term.reset();
			websocket.send(" clear\r"); //$NON-NLS-0$
		}
		window.onresize = resize;

		var connect = function() {
			orionTerminal.connect().then(function(result) {
				var jsonObject = JSON.parse(result.responseText);
				var attachWsURI = jsonObject.attachWsURI;
				term.reset();
				websocket = new WebSocket(attachWsURI);
				websocket.onopen = function(evt) {
					onOpen(evt);
				};
				websocket.onclose = function(evt) {
					onClose(evt);
				};
				websocket.onmessage = function(evt) {
					onMessage(evt);
				};
				websocket.onerror = function(evt) {
					onError(evt);
				};
				term.on('data', function(data) {
					websocket.send(data);
				});

				function onOpen(evt) {	
					resize();
					websocket.send("\r");
				}

				function onClose(evt) {}

				function onMessage(evt) {
					term.write(evt.data);
				}

				function onError(evt) {
					window.console.log(evt.data);
				}
				term.focus();
			}, function(error) {
				var display = {};
				display.Severity = "Error"; //$NON-NLS-0$
				display.HTML = false;
				try {
					var resp = JSON.parse(error.responseText);
					display.Message = resp.DetailedMessage ? resp.DetailedMessage : resp.Message;
				} catch (Exception) {
					display.Message = error.message;
				}
				statusService.setProgressResult(display); //$NON-NLS-0$
			});
		};

		var disconnect = function() {
			orionTerminal.disconnect().then(function(result) {
				websocket.close();
				term.reset();
			}, function(error) {
				window.console.log(error);
			});
		};

		var onHashChange = function() {
			connect();
		};
		window.addEventListener("hashchange", onHashChange);

		window.onbeforeunload = function() {
			disconnect();
		};
		
		// Initialize
		(function() {
		
			term = new Terminal({
				cols: cols,
				rows: rows,
				useStyle: true,
				screenKeys: true
			});
			term.open(document.getElementById("mainNode"));

			onHashChange();
		}());

	});
});