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
/*global importScripts*/
/*jslint amd:true*/

// This file bootstraps RequireJS in the worker context, then loads the JavaScript plugin impl

if (typeof importScripts !== "function") {
	throw new Error("This script must be run from a Worker");
}
importScripts("../../requirejs/require.js");

require.config({
	baseUrl: "../../",
	paths: {
		text: "requirejs/text",
		esprima: "esprima/esprima",
		estraverse: "estraverse/estraverse",
		escope: "escope/escope"
	},
	packages: [
		{
			name: "eslint",
			location: "eslint/lib",
			main: "eslint"
		},
		{
			name: "eslint/conf",
			main: "eslint/conf"
	}]
});

require(["javascript/plugins/javascriptPlugin"]);
