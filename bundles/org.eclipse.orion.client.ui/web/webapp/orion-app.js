/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
window.onload = function() {
	var request = window.navigator.mozApps.getInstalled();
	request.onsuccess = function(e) {
		var installApp = document.getElementById("install-app");
		installApp.disabled = false;
		for (var i in request.result) {
			if (request.result[i].manifest.name === "Orion Web Development Environment") {
				installApp.textContent = "Orion App Already Installed";
				installApp.disabled = true;
				return;
			}
		}

	};
};
(function() {
	var installApp = document.getElementById("install-app");
	if (installApp) {
		installApp.addEventListener("click", function() {
			var mozApps = navigator.mozApps;
			if (mozApps) {
				var installing = navigator.mozApps.install("http://orion.eclipse.org/webapp/orion-manifest.webapp");
				installing.onsuccess = function(e) {
					var installApp = document.getElementById("install-app");
					installApp.textContent = "Orion App Already Installed";
					installApp.disabled = true;
				};
			}
		});
	}
})();
