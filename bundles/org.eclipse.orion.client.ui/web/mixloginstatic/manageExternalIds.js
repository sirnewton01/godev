/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
/*global confirm*/
define(["i18n!orion/mixloginstatic/nls/messages", "orion/xhr", "orion/webui/littlelib", "domReady!"], function(messages, xhr, lib) {
	var lastHash;
	var jsonData;

	var loadAttachedExternalIds, loadUserData;

	function removeOAuth(oauth) {
		if (confirm("Are you sure you want to remove " + oauth + " from the list of your external accounts?")) {
			var oauths = jsonData.properties.oauth.split('\n');
			var newoauths = "";
			for (var i = 0; i < oauths.length; i++) {
				if (oauths[i] !== oauth) {
					newoauths += (oauths[i] + '\n');
				}
			}
			jsonData.properties.oauth = newoauths;

			xhr("PUT", jsonData.Location, { //$NON-NLS-0$
				data: JSON.stringify(jsonData),
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(xhrResult) {
				loadUserData(jsonData.Location);
			}, function(xhrResult) {
				console.error(xhrResult.error);
			});
		}
	}

	loadAttachedExternalIds = function(userjsonData) {
		jsonData = userjsonData;
		var list = lib.node("externalIdList"); //$NON-NLS-0$
		if (list.childNodes.length) {
			/* there's already a table that is now to be replaced */
			list.removeChild(list.childNodes[0]);
		}
		var table = document.createElement("table"); //$NON-NLS-0$
		table.classList.add("manageExternalIdsTable"); //$NON-NLS-0$
		list.appendChild(table); //$NON-NLS-0$
		if (jsonData.properties && jsonData.properties.oauth) {

			var oauths = jsonData.properties.oauth ? jsonData.properties.oauth.split('\n') : []; //$NON-NLS-0$
			for (var i = oauths.length - 1; i >= 0; i--) {
				if (oauths[i] === "") {
					oauths.splice(i, 1);
				}
			}

			if (oauths.length) {
				var thead = document.createElement("thead"); //$NON-NLS-0$
				thead.classList.add("navTableHeading"); //$NON-NLS-0$
				table.appendChild(thead);

				var tr = document.createElement("tr"); //$NON-NLS-0$
				thead.appendChild(tr);
				var td = document.createElement("td"); //$NON-NLS-0$
				td.classList.add("navColumn"); //$NON-NLS-0$
				td.innerHTML = "<h2>External Id</h2>"; //$NON-NLS-0$
				tr.appendChild(td);
			}

			for (var i = 0; i < oauths.length; i++) {
				var oauth = oauths[i];
				addAuthenticationEntry(oauth, i, table, removeOAuth);
			}
		}
	};

	function addAuthenticationEntry(externalId, i, table, removeFunction){
		var tr = document.createElement("tr"); //$NON-NLS-0$
		tr.classList.add(i % 2 === 0 ? "lightTreeTableRow" : "darkTreeTableRow");  //$NON-NLS-1$ //$NON-NLS-0$
		tr.classList.add("manageExternalIdRow"); //$NON-NLS-0$
		tr.style.verticalAlign = "baseline"; //$NON-NLS-0$
		table.appendChild(tr);

		var td = document.createElement("td"); //$NON-NLS-0$
		td.classList.add("navColumn"); //$NON-NLS-0$
		tr.appendChild(td);
		var span = document.createElement("span"); //$NON-NLS-0$
		span.title = externalId;
		td.appendChild(span);
		var textNode = document.createTextNode(externalId.length > 70 ? (externalId.substring(0, 65) + "...") : externalId);
		span.appendChild(textNode);

		td = document.createElement("td"); //$NON-NLS-0$
		td.classList.add("navColumn"); //$NON-NLS-0$
		tr.appendChild(td);
		var removeLink = document.createElement("a"); //$NON-NLS-0$
		removeLink.classList.add("removeExternalId"); //$NON-NLS-0$
		removeLink.id = "remlink" + i; //$NON-NLS-0$
		removeLink.innerHTML = "Remove";
		removeLink.style.visibility = "hidden"; //$NON-NLS-0$
		removeLink.title = "Remove " + externalId;
		td.appendChild(removeLink);

		removeLink.addEventListener("click", function(externalId) { //$NON-NLS-0$
			removeFunction(externalId);
		}.bind(this, externalId));
	}

	loadUserData = function(userLocation){
		xhr("GET", userLocation, { //$NON-NLS-0$
			headers : {
				"Orion-Version" : "1"
			},
			timeout : 15000
		}).then(function(xhrResult) {
			loadAttachedExternalIds(JSON.parse(xhrResult.response));
		}, function(xhrResult) {
			console.error(xhrResult.error);
		});
	};

	function onHashChange(hash) {
		if (lastHash === hash) {
			return;
		}

		loadUserData(hash);

		lastHash = hash;
	}

	window.handleOAuthResponse = function(oauthid) {
		var oauthids = jsonData.properties.oauth ? jsonData.properties.oauth.split('\n') : [];
		for (var i = 0; i < oauthids.length; i++) {
			if (oauthids[i] === oauthid) {
				return;
			}
		}

		if (!jsonData.properties.oauth) {
			jsonData.properties.oauth = oauthid;
		} else {
			jsonData.properties.oauth += '\n' + oauthid;
		}

		xhr("PUT", jsonData.Location, { //$NON-NLS-0$
			data: JSON.stringify(jsonData),
			headers: {
				"Orion-Version": "1"
			},
			timeout: 15000
		}).then(function(xhrResult) {
			loadUserData(jsonData.Location);
		}, function(xhrResult) {
			console.error(xhrResult.error);
		});
	};

	function confirmOAuth(oauth) {
		if (oauth !== "" && oauth !== null) {
			window.open("../mixlogin/manageoauth/oauth?oauth=" + encodeURIComponent(oauth), "oauth_popup", "width=790,height=580");
		}
	}

	function createProviderLink(name, imageUrl, clazz, onclick) {
		var img = document.createElement("img");
		img.className = "loginWindow " + clazz;
		img.id = img.alt = img.title = name;
		img.src = imageUrl;

		var a = document.createElement("a");
		a.className = "loginWindow " + clazz;
		a.onclick = onclick;
		a.setAttribute("aria-labelledby", "addExternalAccount " + name);
		a.appendChild(img);
		return a;
	}

	function attachExternalAccountsHeader(){
		var externalIdContainer = document.getElementById("newExternalId");
		var h2 = document.createElement("h2"); //$NON-NLS-0$
		h2.style.margin = "10px 5px 10px 0"; //$NON-NLS-0$
		h2.style.cssFloat = "left";//$NON-NLS-0$
		h2.id = "addExternalAccount";//$NON-NLS-0$
		h2.innerHTML = messages["AddExternalAccount"];//$NON-NLS-0$
		externalIdContainer.appendChild(h2);
	}

	function attachExternalProviders(){
		var providerElements = [];
		// Add OAuth Providers
		providerElements.push(createProviderLink("Google OAuth", "../mixloginstatic/images/google.png", "", confirmOAuth.bind(null, "google")));
		providerElements.push(createProviderLink("GitHub OAuth", "../mixloginstatic/images/GitHub-Mark-Light-32px.png", "githubImage", confirmOAuth.bind(null, "github")));

		var oauthContainer = document.getElementById("newExternalId");
		providerElements.forEach(function(provider) {
			oauthContainer.appendChild(provider);
			oauthContainer.appendChild(document.createTextNode(" "));
		});
	}

	// Page glue code starts here
	window.addEventListener("hashchange", function() {
		onHashChange(window.location.hash.substring(1));
	});

	onHashChange(window.location.hash.substring(1));
	attachExternalAccountsHeader();
	attachExternalProviders();
});
