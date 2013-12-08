/*global window define document*/
/*browser:true*/

define(['i18n!orion/search/nls/messages', 'require', 'orion/browserCompatibility', 'orion/bootstrap', 'orion/status', 'orion/progress','orion/dialogs',
        'orion/commandRegistry', 'orion/searchOutliner', 'orion/searchClient', 'orion/fileClient', 'orion/operationsClient', 'orion/searchResults', 'orion/globalCommands', 
        'orion/searchUtils', 'orion/PageUtil', 'orion/commands', 'orion/xhr'], 
		function(messages, require, mBrowserCompatibility, mBootstrap, mStatus, mProgress, mDialogs, mCommandRegistry, mSearchOutliner, 
				mSearchClient, mFileClient, mOperationsClient, mSearchResults, mGlobalCommands, mSearchUtils, PageUtil, mCommands, xhr) {

	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;

		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
//		var progress = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		
		mGlobalCommands.generateBanner("debug-main", serviceRegistry, commandRegistry, preferences, searcher, searcher, null, null); //$NON-NLS-0$

		// Clean up the alignment of the banner
		// TODO Figure out why this is necessary
		var primaryNav = document.getElementById("primaryNav");
		primaryNav.setAttribute("style", "display:inline-block;");
		var location = document.getElementById("location");
		location.parentNode.setAttribute("style", "display:inline-block;text-align:center;");
		var userMenu = document.getElementById("userMenu");
		userMenu.parentNode.setAttribute("style", "display:none;");

		var executables = document.getElementById("executables");
		var processes = document.getElementById("processes");
		var output = document.getElementById("outputArea");
		var executeButton = document.getElementById("execute");
		var debugButton = document.getElementById("debug");
		var argumentsInput = document.getElementById("argInput");
		var killButton = document.getElementById("killButton");
		var cmdInput = document.getElementById("cmdInput");
		var clearButton = document.getElementById("clear");
		
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
		
		var currentPid = -1;
		var ws = null;
		var outputCache = {};
		
		var updateOutput = function() {
			if (currentPid !== -1) {				
				var pid = currentPid;
				
				output.innerHTML = "";
				
				var cache = outputCache[""+pid];
				
				if (cache) {
					output.innerHTML = cache;
					output.scrollIntoView(false);
				} else {
					outputCache[""+pid] = "";
				}
				
				var wsUrl = document.URL.replace("http://", "ws://");
				wsUrl = wsUrl.replace("https://", "wss://");
				wsUrl = wsUrl.substring(0, wsUrl.indexOf("/godev")) + "/debug/console/output/" + currentPid;
				ws = new WebSocket(wsUrl);
				
				ws.onmessage = function(evt) {
					var textToAdd = evt.data;
					
					// Turn any http/https URL's into hyperlinks
					textToAdd = textToAdd.replace(/http:\/\/(\S+)/g,"<a href='http://$1' target='_blank'>http://$1</a>");
					textToAdd = textToAdd.replace(/https:\/\/(\S+)/g,"<a href='https://$1' target='_blank'>https://$1</a>");
					
					// Turn stack trace frames into hyperlinks
					textToAdd = textToAdd.replace(/([0-9A-Za-z./:]+):([0-9]+) \((0x[0-9a-f]+)\)/g, "<a href='/redirect?path=$1&line=$2' target='_blank'>$1:$2</a> ($3)");

					if (pid === currentPid) {
						output.innerHTML = output.innerHTML + textToAdd;
						output.scrollIntoView(false);
					}
					
					outputCache[""+pid] = outputCache[""+pid] + textToAdd;
				};
				ws.onclose = function(evt) {
					output.innerHTML = output.innerHTML + "\r\nPROCESS FINISHED";
					output.scrollIntoView(false);
				};
			} else if (currentPid === -1) {
				output.innerHTML = "";
			}
		};
		
		// Update the processes section
		var updateProcesses = function() {
			xhr("GET", "/debug", {
				headers: {},
				timeout: 60000
			}).then(function(result) {
				var procs = JSON.parse(result.response);
				var children = processes.childNodes;
				
				while (children.length > 0) {
					processes.removeChild(children[0]);
				}
				
				for (var idx = 0; idx < procs.length; idx++) {
					var option = document.createElement("option");
					var text = document.createTextNode(procs[idx].Label);
					option.setAttribute("pid", procs[idx].Id);
					option.appendChild(text);
					processes.appendChild(option);
					
					// Pick the last process entry as the default
					if (idx === procs.length-1 && currentPid === -1) {
						currentPid = procs[idx].Id;
						updateOutput();
					}
					
					if (procs[idx].Id === currentPid) {
						processes.selectedIndex = idx;
					}
				}
				
				if (procs.length === 0) {
					var option = document.createElement("option");
					var text = document.createTextNode("<None>");
					option.appendChild(text);
					processes.appendChild(option);
				}
			}, function(error) {
				window.alert(error.responseText);
			});
		};
		
		// Update the processes now
		updateProcesses();
		
		processes.addEventListener("change", function(e) {
			currentPid = processes.options[processes.selectedIndex].getAttribute("pid");
			updateOutput();
		});
		
		killButton.addEventListener("click", function(e) {
			if (currentPid !== -1) {
				xhr("POST", "/debug/kill/"+currentPid, {
					headers: {},
					timeout: 60000
					}).then(function(result) {
						updateOutput();
					}, function(error) {
						window.alert("POST:" + error.responseText);
					});
			}
		});
		
		cmdInput.addEventListener("keyup", function(e) {
			if (e.keyCode === 13 && currentPid !== -1) {
				xhr("POST", "/debug/input/"+currentPid, {
					headers: {},
					timeout: 60000,
					data: cmdInput.value
					}).then(function(result) {
						updateOutput();
					}, function(error) {
						window.alert("POST:" + error.responseText);
					});
					
				cmdInput.value = "";
			}
		});
		
		var executeFunc = function(e, debug) {
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
			
			arguments.push(cmd);
			
			var inputSplit = argumentsInput.value.split(" ");
			
			// TODO handling for quotes
			for (var idx = 0; idx < inputSplit.length; idx++) {
				arguments.push(inputSplit[idx]);
			}
			
			var request = {};
			if (debug) {
				request.Debug = true;
			}
			
			request.Cmd = arguments;  

			xhr("POST", "/debug", {
				headers: {},
				timeout: 60000,
				data: JSON.stringify(request)
				}).then(function(result) {
					var pid = JSON.parse(result.response);
					currentPid = pid;
					updateProcesses();
					updateOutput();
				}, function(error) {
					window.alert("POST:" + error.responseText);
				});
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
		
		clearButton.addEventListener("click", function(e) {
			xhr("POST", "/debug/clear", {
				headers: {},
				timeout: 60000
				}).then(function(result) {
					currentPid = -1;
					updateProcesses();
					updateOutput();
				}, function(error) {
					window.alert("POST:" + error.responseText);
				});
		});
	});
});
