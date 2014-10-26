/*global window define document*/
/*browser:true*/

define(['orion/bootstrap', 'orion/xhr', 'terminal/term'], 
function(mBootstrap, xhr, terminal) {

	mBootstrap.startup().then(function(core) {
		var term;
		var url = document.URL;
		
		var resource = url.substring(url.indexOf("?resource="), url.indexOf("&"));
		resource = resource.replace("?resource=", "");
		
		var selectionIdx = url.indexOf("&sel=");
		var selectionIdx2 = url.indexOf("&", selectionIdx + 1);
		if (selectionIdx2 === -1) {
			selectionIdx2 = url.length;
		}
		var selection = url.substring(url.indexOf("&sel="), selectionIdx2);
		selection = selection.replace("&sel=", "");
		var selectionInt = parseInt(selection);

		// Canceling the dialog preserves the selection the user had before
		//  opening the dialog
		var cancel = function() {
			// We must close the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				var result = {selection: {start: selectionInt, end: selectionInt}};
				
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.run",
				   result: result
				}), "*");
			}, 100);
		};
		
		// Shutting down the dialog does not attempt to restore the editor selection
		//  because the editor could be showing new contents.
		var shutdown = function(restoreSelection) {
			// We must close the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.run",
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
			shutdown(true);
		});
		
		var termAreaNode = document.getElementById("terminalArea");
		
		// Initialize
		term = new Terminal({
			cols: 80,
			rows: 24,
			useStyle: true,
			screenKeys: true
		});
		
		term.open(termAreaNode);

		var wsUrl = document.URL.replace("http://", "ws://");
		wsUrl = wsUrl.replace("https://", "wss://");
		wsUrl = wsUrl.substring(0, wsUrl.indexOf("/godev")) + "/debug/socket?run="+resource.substring(5);
		
		term.write("[Process Started - Press Ctrl-C to stop]\r\n");
		
		ws = new WebSocket(wsUrl);
		
		ws.onopen = function(evt) {
		};
		
		ws.onmessage = function(evt) {
			term.write(evt.data);
		};
		
		ws.onclose = function(evt) {
			term.write("[Process Finished - Press Esc to dismiss]\r\n");
			term.off('data', ws.termListener);
		};
		
		ws.termListener = function(data) {
			ws.send(data);
		};
		
		term.on('data', ws.termListener);
		
		term.focus();
		
		// Provide a link back to the debug page for this command
		var debugLinkDiv = document.createElement("div");
		debugLinkDiv.style.width = "200px";
		var debugLink = document.createElement("a");
		
		debugLinkDiv.appendChild(debugLink);
		debugLink.innerHTML = "Open in debug page";
		
		var cmd = resource.replace("/file/","");
		cmd = cmd.replace(/\/.*?go$/, "");
		
		debugLink.setAttribute("href", "/godev/debug/debug.html#exec=" + cmd);
		debugLink.setAttribute("target", "_top");
		
		termAreaNode.appendChild(debugLinkDiv);
	});
});