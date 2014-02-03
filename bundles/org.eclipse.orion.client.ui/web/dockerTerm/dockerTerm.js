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
	"orion/status", "orion/progress", "orion/operationsClient", "dockerTerm/term"],

function(require, mBrowserCompatibility, mBootstrap, xhr, Deferred, mCommandRegistry, mFileClient,
mSearchClient, mGlobalCommands, mStatus, mProgress, mOperationsClient, terminal) {

	var dockerTerminal = {
		connect: function() {
			return xhr("POST", "/docker/connect", { //$NON-NLS-1$ //$NON-NLS-0$
				headers: {
					"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000,
				responseType: "text",
				handleAs: "json" //$NON-NLS-0$
			});
		},
		disconnect: function() {
			return xhr("POST", "/docker/disconnect", { //$NON-NLS-1$ //$NON-NLS-0$
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
		mGlobalCommands.generateBanner("orion-dockerTerminalPage", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: "Docker Terminal",
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry
		});

		var term;
		var websocket;

		var connect = function() {
			dockerTerminal.connect().then(function(result) {
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
			dockerTerminal.disconnect().then(function(result) {
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
				cols: 80,
				rows: 24,
				useStyle: true,
				screenKeys: true
			});
			term.open(document.getElementById("terminal"));

			onHashChange();
		}());

	});
});