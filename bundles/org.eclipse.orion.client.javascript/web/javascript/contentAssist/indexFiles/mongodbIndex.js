/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - Initial API and implementation
 ******************************************************************************/
 /*global define */
define('javascript/contentAssist/indexFiles/mongodbIndex', [], 
function () {
	return {
		"!name": "mongodb",
		"this": "<top>",
		"global": "<top>",
		"mongodb" : "mongodb",
		"MongoClient" : "mongodb.MongoClient",
		"Db" : "mongodb.Db",
  		"!define": {
  			"mongodb": {
	  			"MongoClient" : {
	  				"!proto": "Object",
	  				"!type" : "fn(serverConfig: Object, options: Object)",
	  				"prototype" : {
	  					"connect" : {
	  						"!type" : "fn(url: String, options: Object, callback: fn())"
	  					},
	  					"open" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"close" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"db" : {
	  						"!type" : "fn(dbName: String) -> Db"
	  					}
	  				},
	  				"connect" : {
	  					"!type" : "fn(url: String, options: Object, callback: fn())"
	  				}
	  			},
	  			"Db" : {
	  				"!proto": "Object",
	  				"!type" : "fn(databaseName: String, serverConfig: Object, options: Object)",
	  				"prototype" : {
	  					"addUser" : {
	  						"!type" : "fn(username: String, password: String, options: Object, callback: fn())"
	  					},
	  					"admin" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"authenticate" : {
	  						"!type" : "fn(username: String, password: String, options: Object, callback: fn())"
	  					},
	  					"close" : {
	  						"!type" : "fn(forceClose: Boolean, callback: fn())"
	  					},
	  					"createCollection" : {
	  						"!type" : "fn(collectionName: String, options: Object, callback: fn())"
	  					},
	  					"createIndex" : {
	  						"!type" : "fn(collectionName: String, fieldOrSpec: Object, options: Object, callback: fn())"
	  					},
	  					"command" : {
	  						"!type" : "fn(selector: Object, options: Object, callback: fn())"
	  					},
	  					"collection" : {
	  						"!type" : "fn(collectionName: String, options: Object, callback: fn())"
	  					},
	  					"collectionsInfo" : {
	  						"!type" : "fn(collectionName: String, callback: fn())"
	  					},
	  					"collectionNames" : {
	  						"!type" : "fn(collectionName: String, options: Object, callback: fn())"
	  					},
	  					"collections" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"cursorInfo" : {
	  						"!type" : "fn(options: Object, callback: fn())"
	  					},
	  					"db" : {
	  						"!type" : "fn(dbName: String) -> Db"
	  					},
	  					"dereference" : {
	  						"!type" : "fn(dbRef: DBRef, callback: fn())"
	  					},
	  					"dropCollection" : {
	  						"!type" : "fn(collectionName: String, callback: fn())"
	  					},
	  					"dropDatabase" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"dropIndex" : {
	  						"!type" : "fn(collectionName: String, indexName: String, callback: fn())"
	  					},
	  					"ensureIndex" : {
	  						"!type" : "fn(collectionName: String, fieldOrSpec: Object, options: Object, callback: fn())"
	  					},
	  					"executeDbAdminCommand" : {
	  						"!type" : "fn(command_hash: String, options: Object, callback: fn())"
	  					},
	  					"executeDbCommand" : {
	  						"!type" : "fn(command_hash: String, options: Object, callback: fn())"
	  					},
	  					"eval" : {
	  						"!type" : "fn(code: Code, parameters: Object, options: Object, callback: fn())"
	  					},
	  					"indexInformation" : {
	  						"!type" : "fn(collectionName: String, options: Object, callback: fn())"
	  					},
	  					"logout" : {
	  						"!type" : "fn(options: Object, callback: fn())"
	  					},
	  					"open" : {
	  						"!type" : "fn(callback: fn())"
	  					},
	  					"reIndex" : {
	  						"!type" : "fn(collectionName: String, callback: fn())"
	  					},
	  					"removeAllEventListeners" : {
	  						"!type" : "fn()"
	  					},
	  					"renameCollection" : {
	  						"!type" : "fn(fromCollection: String, toCollection: String, options: Object, callback: fn())"
	  					},
	  					"removeUser" : {
	  						"!type" : "fn(username: String, options: Object, callback: fn())"
	  					},
	  					"stats" : {
	  						"!type" : "fn(options: Object, callback: fn())"
	  					}
	  				},
	  				"connect" : {
	  					"!type" : "fn(url: String, options: Object, callback: fn())"
	  				},
	  				"DEFAULT_URL" : "String",
	  				"wrap" : {
	  					"!type" : "fn()"
	  				}
	  			}
  				
  			}
  		}
  	}
 });