/*global window define document*/
/*browser:true*/

define(['orion/bootstrap', 'orion/xhr'], 
function(mBootstrap, xhr) {

	mBootstrap.startup().then(function(core) {
		var url = document.URL;
		
		var pkg = url.substring(url.indexOf("?pkg="), url.indexOf("&"));
		pkg = pkg.replace("?pkg=", "");
		
		var nameIdx = url.indexOf("&name=");
		var name = url.substring(nameIdx, url.indexOf("&", nameIdx+1));
		name = name.replace("&name=", "");
		
		var selectionIdx = url.indexOf("&sel=");
		var selection = url.substring(selectionIdx);
		selection = selection.replace("&sel=", "");
		
		var selectionInt = parseInt(selection);
		
		var shutdown = function() {
			// We must shut down the dialog in a timer because on firefox
			//  the shutdown will pre-empt the navigation of the parent page.
			window.setTimeout(function() {
				window.parent.postMessage(JSON.stringify({
				   pageService: "orion.page.delegatedUI",
				   source: "go.showgodoc",
				   result: {selection: {start: selectionInt, end: selectionInt}}
				}), "*");
			}, 100);
		};
		
		// Close the window when escape key is pressed
		document.addEventListener("keyup", function(evt) {
			if (evt.keyCode === 27) {
				shutdown();
			}
		});
		
		document.getElementById("closeDialog").addEventListener("click", function(evt) {
			shutdown();
		});
		
		var outputNode = document.getElementById("output");		
		
		outputNode.innerHTML = "Loading Go Docs for "+pkg+" "+name;
		outputNode.focus();
		
		xhr("GET", "/godoc/text?pkg="+pkg+"&name="+name,
		{
			headers: {},
			timeout: 15000
		}).then(function(result) {
			outputNode.innerHTML = result.response;
		});
	});
});