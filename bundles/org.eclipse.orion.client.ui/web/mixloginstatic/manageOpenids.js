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
/*global alert confirm console define document window */

define(["orion/xhr", "orion/webui/littlelib", "domReady!"], function(xhr, lib) {
	var lastHash;
	var jsonData;

	var loadAttachedOpenIds, loadUserData;

	function removeOpenId(openid) {
		if (confirm("Are you sure you want to remove " + openid + " from the list of your external accounts?")) {
			var openids = jsonData.properties.openid.split('\n');
			var newopenids = "";
			for (var i = 0; i < openids.length; i++) {
				if (openids[i] !== openid) {
					newopenids += (openids[i] + '\n');
				}
			}
			jsonData.properties.openid = newopenids;

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
	
	loadAttachedOpenIds = function(userjsonData) {
		jsonData = userjsonData;
		var list = lib.node("openidList"); //$NON-NLS-0$
		if (list.childNodes.length) {
			/* there's already a table that is now to be replaced */
			list.removeChild(list.childNodes[0]);
		}
		var table = document.createElement("table"); //$NON-NLS-0$
		table.classList.add("manageOpenIdsTable"); //$NON-NLS-0$
		list.appendChild(table); //$NON-NLS-0$
		if (jsonData.properties && jsonData.properties.openid) {
	
			var openids = jsonData.properties.openid ? jsonData.properties.openid.split('\n') : []; //$NON-NLS-0$
			for (var i = openids.length - 1; i >= 0; i--) {
				if (openids[i] === "") {
					openids.splice(i, 1);
				}
			}

			if (openids.length) {
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

			for (var i = 0; i < openids.length; i++) {
				var openid = openids[i];
				var tr = document.createElement("tr"); //$NON-NLS-0$
				tr.classList.add(i % 2 === 0 ? "lightTreeTableRow" : "darkTreeTableRow");  //$NON-NLS-1$ //$NON-NLS-0$
				tr.classList.add("manageOpenIdRow"); //$NON-NLS-0$
				tr.style.verticalAlign = "baseline"; //$NON-NLS-0$
				table.appendChild(tr);

				var td = document.createElement("td"); //$NON-NLS-0$
				td.classList.add("navColumn"); //$NON-NLS-0$
				tr.appendChild(td);
				var span = document.createElement("span"); //$NON-NLS-0$
				span.title = openid;
				td.appendChild(span);
				var textNode = document.createTextNode(openid.length > 70 ? (openid.substring(0, 65) + "...") : openid);
				span.appendChild(textNode);

				td = document.createElement("td"); //$NON-NLS-0$
				td.classList.add("navColumn"); //$NON-NLS-0$
				tr.appendChild(td);
				var removeLink = document.createElement("a"); //$NON-NLS-0$
				removeLink.classList.add("removeOpenId"); //$NON-NLS-0$
				removeLink.id = "remlink" + i; //$NON-NLS-0$
				removeLink.innerHTML = "Remove";
				removeLink.style.visibility = "hidden"; //$NON-NLS-0$
				removeLink.title = "Remove " + openid;
				td.appendChild(removeLink);

				removeLink.addEventListener("click", function(openid) { //$NON-NLS-0$
					removeOpenId(openid);
				}.bind(this, openid));
			}
		}
	};
	
	loadUserData = function(userLocation){
		xhr("GET", userLocation, { //$NON-NLS-0$
			headers : {
				"Orion-Version" : "1"
			},
			timeout : 15000
		}).then(function(xhrResult) {
			loadAttachedOpenIds(JSON.parse(xhrResult.response));
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
	
	
	// this function is directly invoked by ManageOpenidsServlet, must be global
	window.handleOpenIDResponse = function(openid) {

		var openids = jsonData.properties.openid ? jsonData.properties.openid.split('\n') : [];
		for (var i = 0; i < openids.length; i++) {
			if (openids[i] === openid) {
				return;
			}
		}
	
		if (!jsonData.properties.openid) {
			jsonData.properties.openid = openid;
		} else {
			jsonData.properties.openid += '\n' + openid;
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
	
	function confirmOpenId(openid) {
		if (openid !== "" && openid !== null) {
			window.open("../mixlogin/manageopenids/openid?openid=" + encodeURIComponent(openid), "openid_popup", "width=790,height=580");
		}
	}

	function createProviderLink(name, imageUrl, onclick) {
		var img = document.createElement("img");
		img.className = "loginWindow";
		img.id = img.alt = img.title = name;
		img.src = imageUrl;

		var a = document.createElement("a");
		a.className = "loginWindow";
		a.onclick = onclick;
		a.setAttribute("aria-labelledby", "addExternalAccount " + name);
		a.appendChild(img);
		return a;
	}

	// Page glue code starts here
	window.addEventListener("hashchange", function() {
		onHashChange(window.location.hash.substring(1));
	});

	onHashChange(window.location.hash.substring(1));

	xhr("GET", "../mixlogin/manageopenids") //$NON-NLS-1$ //$NON-NLS-0$
		.then(function(xhrResult) {
			var providers = JSON.parse(xhrResult.response);
			var providerElements = providers.map(function(provider) {
				return createProviderLink(provider.Name, provider.Image, confirmOpenId.bind(null, provider.Url));
			});
			providerElements.push(createProviderLink("Mozilla Persona", "../mixloginstatic/images/persona.png",
				alert.bind(null, "To link your account with a Persona, set your Orion email address above to match your Persona email address.")));

			var openIdContainer = document.getElementById("newOpenId");
			providerElements.forEach(function(provider) {
				openIdContainer.appendChild(provider);
				openIdContainer.appendChild(document.createTextNode(" "));
			});
		});
});
