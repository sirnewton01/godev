/*global define document window */
/*jslint */
define(['orion/bootstrap', 'orion/status', 'orion/progress', 'orion/commandRegistry', 'orion/fileClient', 'orion/operationsClient',
		'orion/searchClient', 'orion/globalCommands', 'orion/sites/siteUtils', 'orion/sites/siteCommands', 
		'orion/sites/viewOnSiteTree', 'orion/PageUtil', 'orion/webui/littlelib', 'orion/xhr'],
	function(mBootstrap, mStatus, mProgress, mCommandRegistry, mFileClient, mOperationsClient, mSearchClient, mGlobalCommands,
			mSiteUtils, mSiteCommands, ViewOnSiteTree, PageUtil, lib, xhr) {
				
	mBootstrap.startup().then(function(core) {
		var serviceRegistry = core.serviceRegistry;
		var preferences = core.preferences;

		// Register services
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		var statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, 'statusPane', 'notifications', 'notificationArea'); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		var commandRegistry = new mCommandRegistry.CommandRegistry({ });
		var progressService = new mProgress.ProgressService(serviceRegistry, operationsClient, commandRegistry);

		var fileClient = new mFileClient.FileClient(serviceRegistry);
		var searcher = new mSearchClient.Searcher({serviceRegistry: serviceRegistry, commandService: commandRegistry, fileService: fileClient});
		
		mGlobalCommands.generateBanner("godoc-searchResults", serviceRegistry, commandRegistry, preferences, searcher); //$NON-NLS-0$
		
		// Clean up the alignment of the banner
		// TODO Figure out why this is necessary
		var primaryNav = document.getElementById("primaryNav");
		//primaryNav.setAttribute("style", "display:inline-block;");
		var location = document.getElementById("location");
		location.parentNode.setAttribute("style", "display:inline-block;text-align:center;");
		var userMenu = document.getElementById("userMenu");
		userMenu.parentNode.setAttribute("style", "display:none;");
		
		// Display the current package at the top
		var pkgIdx = document.URL.indexOf("/godoc/pkg/");
		if (pkgIdx !== -1) {
			var pkg = document.URL.substring(pkgIdx + 11);
			var hash = pkg.indexOf("#");
			if (hash !== -1) {
				pkg = pkg.substring(0, hash);
			}
			
			if (pkg[pkg.length-1] === '/') {
				pkg = pkg.substring(0, pkg.length-1);
			}
			
			var locSpan = document.createElement("span");
			locSpan.innerHTML = pkg;
			location.appendChild(locSpan);
		}
		
		// Add search box
		var searchForm = document.createElement("form");
		searchForm.setAttribute("method", "GET");
		searchForm.setAttribute("action", "/godoc/search");
		searchForm.setAttribute("style", "display: inline; margin: 0px 0px 0px 10px;");
		var searchInput = document.createElement("input");
		searchInput.setAttribute("type", "text");
		searchInput.setAttribute("name", "q");
		searchInput.setAttribute("placeholder", "Search (Ctrl-S)");
		searchInput.setAttribute("style", "display: inline;");
		
		document.addEventListener("keydown", function(e) {
			if (e.keyCode === 83 && e.ctrlKey) {
				searchInput.focus();
				e.preventDefault();
				return true;
			}
			
			return false;
		});
		
		searchForm.appendChild(searchInput);
		location.appendChild(searchForm);
		
		// Force the content section as selected so that the user
		//  can scroll right away as soon as the page loads.
		document.getElementById("contentSection").focus();
	});
});


