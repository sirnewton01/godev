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
define(['domReady', 'orion/xhr'], function(domReady, xhr) {
	domReady(function() {
		xhr("GET", "/server-status.json", { //$NON-NLS-0$
			timeout: 15000
		}).then(function(result) {
			var messagesDiv = document.getElementById("orionMessages");
			var loadingMessage = document.getElementById("loadingmessage");
			var results;
			try {
				results = JSON.parse(result.response);
			} catch (e) {
				results = { "messages" : [] };
			}				
			var messages = results.messages;
			if (messages.length === 0) {
				loadingMessage.textContent = "There are no messages.";
				return;
			}
			messagesDiv.removeChild(loadingMessage);			
			var newDL = document.createElement('dl');
			messagesDiv.appendChild(newDL);
			if (messages) {
				for (var i=0; i<messages.length; i++) {
				  var newDT = document.createElement('dt');
				  newDT.setAttribute('class', 'orion-messages-dt');
				  newDT.textContent = messages[i].startdate + " " + messages[i].title;
				  var newDD = document.createElement('dd');
				  newDD.setAttribute('class', 'orion-messages-dd');
				  newDD.textContent = messages[i].description;
				  newDL.appendChild(newDT);
				  newDL.appendChild(newDD);
				}
			}
		}, function(error) {
		});
	});
});