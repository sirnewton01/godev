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
		
		mGlobalCommands.generateBanner("godoc-searchResults", serviceRegistry, commandRegistry, preferences, searcher, searcher, null, null); //$NON-NLS-0$
		
		var pkgInput = document.getElementById("pkgInput");
		var nameInput = document.getElementById("nameInput");
		var output = document.getElementById("outputArea");
		var searchButton = document.getElementById("searchButton");
		
		var currentHash = window.location.hash;
		
		var pkg = "";
		var name = "";
		
		var updateFormFromHash = function() {
			if (currentHash.indexOf("#location=") === 0) {
				var locationMatch = /location=([^&]+)/.exec(currentHash);
				if (locationMatch) {
					pkg = locationMatch[1].substring(6);
					pkgInput.value = pkg;
					nameInput.value = name;
				}
			}
			
			if (currentHash.indexOf("#pkg=") === 0) {
				var pkgMatch = /pkg=([^&]+)/.exec(currentHash);
				if (pkgMatch) {
					pkg = pkgMatch[1];
					pkgInput.value = pkg;
				}
				var nameMatch = /&name=([^&]+)/.exec(currentHash);
				if (nameMatch) {
					name = nameMatch[1];
					nameInput.value = name;
				} else {
					name = "";
					nameInput.value = "";
				}
			}
		};
		updateFormFromHash();
		
		var runQuery = function() {
			if (pkg !== "") {
				var url = "/go/doc";

				pkgInput.value = pkg;
				url = url + "?pkg="+pkg;
				
				if (name !== "") {
					nameInput.value = name;
					url = url + "&name="+name;
				}
				
				if (pkg !== null) {
					xhr("GET", url, {
	                    headers: {},
	                    timeout: 60000
	                }).then(function (result) {
	                    output.innerHTML = result.response.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	                }, function(error) {
	                    output.innerHTML = error.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	                });
				}
			}
		};
		runQuery();
		
		var handleHashChange = function() {
			currentHash = window.location.hash;
			
			updateFormFromHash();
			runQuery();
		};
		
		if (window.onhashchange) {
			window.onhashchange = handleHashChange;
		} else {
			window.setInterval(function() {
				if (window.location.hash !== currentHash) {
					handleHashChange();
				}
			}, 100);
		}
		
		var searchFunction = function(e) {            
            var newHash = "pkg="+pkgInput.value;
                
            if (nameInput.value && nameInput.value !== "") {
                newHash = newHash + "&name="+nameInput.value;
            }
                
            window.location.hash = newHash;
		};
		
		pkgInput.addEventListener("keyup", function(e) {
			if (e.keyCode === 13) {
				searchFunction(e);
			}
		});
		nameInput.addEventListener("keyup", function(e) {
			if (e.keyCode === 13) {
				searchFunction(e);
			}
		});
		searchButton.addEventListener("click", searchFunction);
	});
});


