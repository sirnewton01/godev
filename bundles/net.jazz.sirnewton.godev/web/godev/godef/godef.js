/*global window define document*/
/*browser:true*/

define(['orion/bootstrap', 'orion/xhr'], 
function(mBootstrap, xhr) {

	mBootstrap.startup().then(function(core) {
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
		
		var lineIdx = url.indexOf("&line=");
		var line = "";
		if (lineIdx !== -1) {
			line = url.substring(lineIdx);
			line = line.replace("&line=", "");
		}

		// Canceling the dialog preserves the selection the user had before
		//  opening the dialog
		var cancel = function() {
			// We must close the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				var result = {selection: {start: selectionInt, end: selectionInt}};
				
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.godef",
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
				   source: "go.godef",
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
		
		var linkAreaNode = document.getElementById("linkArea");		
		
		var link = document.createElement("a");
		link.setAttribute("tabindex", "0");
		
		link.setAttribute("href", "/edit/edit.html#"+resource);
		link.setAttribute("target", "_top");
		link.innerHTML = resource.replace("/file", "");
		if (line !== "") {
			link.setAttribute("href", link.getAttribute("href")+",line="+line);
			link.innerHTML = link.innerHTML + ":"+line;
		}
		link.setAttribute("href", link.getAttribute("href")+",random="+Math.random());
		linkAreaNode.appendChild(link);
		link.addEventListener("mouseup", function(evt) {
			if (evt.ctrlKey) {
				close();
			} else {
				shutdown();
			}
		});
		link.addEventListener("keydown", function(evt) {
			if (evt.keyCode === 13) {
				if (evt.ctrlKey) {
					close();
				} else {
					shutdown();
				}
			}
		});
		
		link.focus();
	});
});