/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global window define */
/*jslint forin:true devel:true*/

/** @namespace The global container for eclipse APIs. */

define(["orion/Deferred"], function(Deferred){
	
	var reameFile = {
		Directory: false,
		Length: 1159,
		LocaltimeStamp: 1389974936424,
		Location: "readme",
		Name: "README.md"
	};
	
	var reameFileMeta = {
		Directory: false,
		Length: 1159,
		LocaltimeStamp: 1389974936424,
		Location: "readme",
		Name: "README.md",
		Parents: []
	};
	
	var readmeContents = "The goal of Orion is to build developer tooling that works in the browser, at web scale.\n" +
						 "The vision behind Orion is to move software development to the web as a web experience, by\n" + 
						 "enabling open tool integration through HTTP and REST, JSON, OAuth, OpenID, and others.\n" + 
						"The idea is to exploit internet design principles throughout, instead of trying to bring\n" + 
						"existing desktop IDE concepts to the browser. See the [Orion wiki](http://wiki.eclipse.org/Orion) for more\n" + 
						"information about Orion.\n" +
						"\n" +
						"Contributing\n" +
						"------------\n" +
						"\n" +
						"Orion source code is available in an Eclipse Git repository, and there is also a mirror\n" +
						"on GitHub. For complete details on getting the source and getting setup to develop Orion,\n" +
						"see the [Orion wiki](http://wiki.eclipse.org/Orion/Getting_the_source).\n" +
						"\n" +
						"Bug reports and patches are welcome in [bugzilla](https://bugs.eclipse.org/bugs/enter_bug.cgi?product=Orion).\n" +
						"\n" +
						"License\n" +
						"-------\n" +
						"\n" +
						"This repository contains the Orion client and Node-based server. This source code is available\n" +
						"under the [Eclipse Public License](http://www.eclipse.org/legal/epl-v10.html)\n" +
						"and [Eclipse Distribution License](http://www.eclipse.org/org/documents/edl-v10.php).\n";
	
	var emptyRoot = {
		Children: [reameFile],
		ChildrenLocation: "children",
		Directory: true,
		Length: 0,
		LocaltimeStamp: 1389974936424,
		Location: "root",
		Name: ""
	};
	
	function FileClient() {
	}
	
	FileClient.prototype =  {
		/**
		 * Returns the name of the file service managing this location
		 * @param location The location of the item 
		 */
		fileServiceName: function(location) {
			return "Empty";
		},
		 
		/**
		 * Returns the root url of the file service managing this location
		 * @param location The location of the item 
		 */
		fileServiceRootURL: function(location) {
			return "";
		},
		 
		/**
		 * Obtains the children of a remote resource
		 * @param location The location of the item to obtain children for
		 * @return A deferred that will provide the array of child objects when complete
		 */
		fetchChildren: function(location) {
			return new Deferred().resolve([reameFile]);
		},

		/**
		 * Loads all the user's workspaces. Returns a deferred that will provide the loaded
		 * workspaces when ready.
		 */
		loadWorkspaces: function() {
			return new Deferred().resolve(emptyRoot);
		},
		
		/**
		 * Returns the contents or metadata of the file at the given location.
		 *
		 * @param {String} location The location of the file to get contents for
		 * @param {Boolean} [isMetadata] If defined and true, returns the file metadata, 
		 *   otherwise file contents are returned
		 * @return A deferred that will be provided with the contents or metadata when available
		 */
		read: function(location, isMetadata) {
			if(isMetadata){
				return new Deferred().resolve(reameFileMeta);
			}
			return new Deferred().resolve(readmeContents);
		},
		
		/**
		 * Loads the workspace with the given id and sets it to be the current
		 * workspace for the IDE. The workspace is created if none already exists.
		 * @param {String} location the location of the workspace to load
		 * @param {Function} onLoad the function to invoke when the workspace is loaded
		 */
		loadWorkspace: function(location) {
			return new Deferred().resolve(emptyRoot);
		}
	};//end FileClient prototype
	FileClient.prototype.constructor = FileClient;

	//return the module exports
	return {FileClient: FileClient};
});
