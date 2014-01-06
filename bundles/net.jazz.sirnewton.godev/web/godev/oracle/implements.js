/*global window define document*/
/*browser:true*/

define(['orion/bootstrap', 'orion/xhr'], 
function(mBootstrap, xhr) {

	mBootstrap.startup().then(function(core) {
		var url = document.URL;
		
		var resource = url.substring(url.indexOf("?resource="), url.indexOf("&"));
		resource = resource.replace("?resource=", "");
		
		var selection = url.substring(url.indexOf("&pos="));
		selection = selection.replace("&pos=", "");
		
		var selectionInt = parseInt(selection);
		
		// Cancel preserves the initial selection before the dialog was opened
		var cancel = function() {
			// We must shut down the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.implements",
				   result: {selection: {start: selectionInt, end: selectionInt}}
				}), "*");
			}, 100);
		};
		
		// Shutdown does not attempt to set the selection because the editor
		//  could be showing new contents.
		var shutdown = function() {
			// We must shut down the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.implements",
				   cancelled: true
				}), "*");
			}, 100);
		};
		
		// Close the window when escape key is pressed
		document.addEventListener("keyup", function(evt) {
			if (evt.keyCode === 27) {
				cancel();
			}
		});
		
		document.getElementById("closeDialog").addEventListener("click", function(evt) {
			cancel();
		});
		
		var commandsNode = document.getElementById("command");		
		var resultsNode = document.getElementById("results");
		
		var runQuery = function(evt) {
			resultsNode.innerHTML = "&lt;Loading...&gt;";
			
			var cmd = commandsNode.options[commandsNode.selectedIndex].value;
			
			// Set the cookie to this command so that it is the default next time
			document.cookie = "implements.scope=" + cmd + "; path=/";
			
			xhr("GET", "/go/oracle/implements/" + resource + "?pos=" + selection + "&scope=" + cmd,
			{
				headers: {},
				timeout: 60000
			}).then(function(result) {
				var empty = true;
				
				if (result.response !== "" && result.response !== '""') {
					var value = JSON.parse(result.response);
					resultsNode.innerHTML = "";
					
					// Parse the JSON again
					if (typeof value === "string") {
						value = JSON.parse(value);
					}
					
					var impl = value["implements"];
					
					if (impl && (impl.fromptr || impl.to)) {
						// TODO provide some kind of output indicating that implementors or implementees are being displayed
						var hits = impl.fromptr;
						
						if (!hits) {
							hits = impl.to;
						}
						
						var table = "";
						var row = "";
						var cell = "";
						var entry = "";
						var file = "";
						var line = "";
						var pos = "";
						
						for (var idx = 0; idx < hits.length; idx++) {
							if (empty) {
								empty = false;
								
								table = document.createElement("table");
								resultsNode.appendChild(table);
							}
							empty = false;
							
							row = document.createElement("tr");
							table.appendChild(row);
							cell = document.createElement("td");
							row.appendChild(cell);
							
							entry = document.createElement("a");
							entry.innerHTML = hits[idx].name;
							
							pos = hits[idx].logicalPos;
							file = pos.split(":")[0];
							line = pos.split(":")[1];
							
							entry.href = "/edit/edit.html#/file" + file + ",line="+line+",random="+Math.random();
							entry.target = "_top";
							entry.addEventListener("mouseup", function(evt) {
								// If the user is opening additional tabs/windows then leave
								//  the dialog open in case they want to open multiple.
								if (!evt.ctrlKey) {
									shutdown();
								}
							});
							entry.addEventListener("keydown", function(evt) {
								if (evt.keyCode === 13) {
									shutdown();
								}
							});
							cell.appendChild(entry);
						}
					}
				}
				
				if (empty) {
					resultsNode.innerHTML = "&lt;None&gt;";
				}
			}, function(err) {
				resultsNode.innerHTML = "The Go oracle is not installed. Install it using 'go get code.google.com/p/go.tools/cmd/oracle'";
				resultsNode.focus();
			});
		};
		
		commandsNode.addEventListener("change", runQuery);
		
		var option = document.createElement("option");
		var text = document.createTextNode("Loading list of commands ...");
		option.appendChild(text);
		commandsNode.appendChild(option);

		xhr("GET", "/debug/commands",
			{
				headers: {},
				timeout: 60000
			}).then(function(result) {
				commandsNode.innerHTML = "";
				var execs = JSON.parse(result.response);
				
				for (var idx = 0; idx < execs.length; idx++) {
					var option = document.createElement("option");
					var text = document.createTextNode(execs[idx]);
					option.appendChild(text);
					commandsNode.appendChild(option);
				}
				
				// Select the default from last time
				var beginIdx = document.cookie.indexOf("implements.scope");
				if (beginIdx !== -1) {
					var endIdx = document.cookie.indexOf(";", beginIdx);
					
					if (endIdx === -1) {
						endIdx = document.cookie.length;
					}
					
					var cmd = document.cookie.substring(beginIdx + 17, endIdx);
					
					for (var idx = 0; idx < commandsNode.options.length; idx++) {
						if (commandsNode.options[idx].value === cmd) {
							commandsNode.selectedIndex = idx;
							runQuery(null);
							break;
						}
					}
				}
				
				if (execs.length === 0) {
					var option = document.createElement("option");
					var text = document.createTextNode("<None>");
					option.appendChild(text);
					commandsNode.appendChild(option);
				}
				
				commandsNode.focus();
			}, function(err) {
				
			});
	});
});