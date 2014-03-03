/*global define document window */
/*jslint */
define(['orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/fileClient', 'orion/operationsClient',
		'orion/searchClient', 'orion/globalCommands', 'orion/sites/siteUtils', 'orion/sites/siteCommands', 
		'orion/sites/viewOnSiteTree', 'orion/PageUtil', 'orion/webui/littlelib', 'orion/xhr', 'terminal/term'],
	function(mBootstrap, mStatus, mProgress, mCommandRegistry, mFileClient, mOperationsClient, mSearchClient, mGlobalCommands,
			mSiteUtils, mSiteCommands, ViewOnSiteTree, PageUtil, lib, xhr, terminal) {
				
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
		mGlobalCommands.generateBanner("debug-main", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({
			task: "Debug",
			serviceRegistry: serviceRegistry,
			commandService: commandRegistry
		});

		var executables = document.getElementById("executables");
		var executeButton = document.getElementById("execute");
		var debugButton = document.getElementById("debug");
		var raceButton = document.getElementById("race");
		var argumentsInput = document.getElementById("argInput");
		
		var currentHash = window.location.hash;
		var currentExecutable = "";
		var currentArgs = "";
		
		var updateFormFromHash = function() {
			if (currentHash.indexOf("#exec=") === 0) {
				var execMatch = /exec=([^&]+)/.exec(currentHash);
				if (execMatch) {
					currentExecutable = execMatch[1];
					
					// Picking the right executable is deferred until xhr
					//  comes back with the list of available executables.
				}
			}
			
			if (currentHash.indexOf("args=") !== -1) {
				var argsMatch = /args=([^&]+)/.exec(currentHash);
				if (argsMatch) {
					currentArgs = argsMatch[1];
					argumentsInput.value = currentArgs;
				}
			}
		};
		updateFormFromHash();
		
		// TODO Refresh button in case a new executable shows up
		xhr("GET", "/debug/commands", {
			headers: {},
			timeout: 60000
		}).then(function(result) {
			var execs = JSON.parse(result.response);
			
			for (var idx = 0; idx < execs.length; idx++) {
				var option = document.createElement("option");
				var text = document.createTextNode(execs[idx]);
				option.appendChild(text);
				executables.appendChild(option);
				
				if (execs[idx] === currentExecutable) {
					executables.selectedIndex = idx;
				}
			}
			
			if (execs.length === 0) {
				var option = document.createElement("option");
				var text = document.createTextNode("<None>");
				option.appendChild(text);
				executables.appendChild(option);
			}
		}, function(error) {
			window.alert(error.responseText);
		});
		
		var term = null;
		var ws = null;
		
		var executeFunc = function(e, debug, race) {
			if (executables.selectedIndex < 0) {
				return;
			}
			
			var arguments = [];
			var cmd = executables.options[executables.selectedIndex].value;
			if (cmd === "<None>") {
				return;
			}
			
			// Update the hash on the window
			currentExecutable = executables.options[executables.selectedIndex].innerHTML;
			currentArgs = argumentsInput.value;
			window.location.hash = "#exec="+currentExecutable+"&args="+currentArgs;
			
			var inputSplit = argumentsInput.value.split(" ");
			
			// TODO handling for quotes
			for (var idx = 0; idx < inputSplit.length; idx++) {
				arguments.push(inputSplit[idx]);
			}
			
			var request = {};
			if (debug) {
				request.Debug = true;
			}
			if (race) {
				request.Race = true;
			}
			
			request.Cmd = arguments;
			
			term.reset();
			
			var wsUrl = document.URL.replace("http://", "ws://");
			wsUrl = wsUrl.replace("https://", "wss://");
			wsUrl = wsUrl.substring(0, wsUrl.indexOf("/godev")) + "/debug/socket?debug="+request.Debug+"&race="+request.Race+"&cmd="+cmd+"&params="+arguments.join(" ");
			ws = new WebSocket(wsUrl);
			
			ws.onopen = function(evt) {
				term.write("[Process Started - Press Ctrl-C to stop]\r\n");
				executeButton.disabled = true;
				debugButton.disabled = true;
				raceButton.disabled = true;
			};
			
			ws.onmessage = function(evt) {
				term.write(evt.data);
			};
			
			ws.onclose = function(evt) {
				term.write("[Process Finished]\r\n");
				executeButton.disabled = false;
				debugButton.disabled = false;
				raceButton.disabled = false;
				term.off('data', ws.termListener);
			};
			
			ws.termListener = function(data) {
				ws.send(data);
			};
			
			term.on('data', ws.termListener);
			
			term.focus();
		};
		
		argumentsInput.addEventListener("keyup", function(e) {
			if (e.keyCode === 13) {
				executeFunc(e);
			}
		});
		
		// Execute button to launch the process
		executeButton.addEventListener("click", executeFunc);
		
		// Debug button to start up a debugging session
		debugButton.addEventListener("click", function(e) {
			xhr("GET", "/debug/debugSupport", {
				headers: {},
				timeout: 60000
			}).then(function(result) {
				executeFunc(e, true);
			}, function(error) {
				window.alert("Debug support is not available because the godbg tool is not installed or is not on the system path. Fetch it by running 'go get github.com/sirnewton01/godbg.'");
			});
		});
		
		raceButton.addEventListener("click", function(e) {
			executeFunc(e, false, true);
		});
		
		// Initialize
		(function() {
			term = new Terminal({
				cols: 90,
				rows: 35,
				useStyle: true,
				screenKeys: true
			});
			term.open(document.getElementById("terminal"));
		}());
	});
});
