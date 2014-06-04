/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*jslint amd:true browser:true*/
/*global URL console*/
/*
 * Allows the implementation of the JS tooling plugin to be loaded either in this Window or in a web worker.
 */
define([
	'orion/URL-shim'
], function(_) {
	var pref = localStorage.getItem("jstools.worker"),
	    useWorker = false;
	try {
		useWorker = pref === null ? false : !!JSON.parse(pref);
	} catch (e) {
		if (typeof console !== "undefined" && console)
			console.log(e);
	}

	if (!useWorker) {
		// Non-worker case
		require(["javascript/plugins/javascriptPlugin"]);
		return;
	}

	// Worker case. Talk directly to the framework message plumbing
	var framework;
	if (window !== window.parent) {
		framework = window.parent;
	}
	else {
		framework = window.opener;
	}
	if (!framework)
		console.log(new Error("No valid plugin target"));

	addEventListener("message", onFrameworkMessage);

	// Start the worker
	var worker = new Worker(new URL("javascriptWorker.js", window.location.href).href);
	worker.addEventListener("message", onWorkerMessage);
	worker.addEventListener("error", onWorkerError);

	function onWorkerError(err) {
		if (typeof console !== "undefined" && console) {
			console.log(err);
		}
	}

	function onWorkerMessage(event) {
		var msg = event.data;
		// Plugin-related messages have either a "method" field (for regular messages) or an "id" field (for errors)
		if (msg && (msg.method || msg.id)) {
			framework && framework.postMessage(event.data, "*");
			return;
		}
	}

	function onFrameworkMessage(event) {
		if (event.source !== framework) {
			return;
		}
		worker.postMessage(event.data);
	}
});