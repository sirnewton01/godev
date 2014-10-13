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
 /*eslint-env amd*/
define("javascript/contentAssist/indexFiles/postgresIndex", [
], function () {
	return {
		"!name": "pg",
  		"!define": {
  			"pg": {
    			"!proto": "EventEmitter",
    			"!type": "fn(config: Object)",
    			"prototype" : {
    				"end" : {
    					"!type" : "fn()"
    				},
    				"connect" : {
    					"!type" : "fn(config: Object, callback: fn())"
    				},
    				"cancel" : {
    					"!type" : "fn(config: Object, client: Client, query: Query)"
    				}
    			},
    			"Client" : "Client",
    			"Query" : "Query",
    			"pools" : "Pool",
    			"Connection" : "Connection",
    			"defaults" : "Defaults",
    		},
    		"ConnectionConfig" : {
    		    "!proto" : "Object",
    		    "user": "String",
                "database": "String",
                "password": "String",
                "port": "Number",
                "host": "String",
    		},
    		"Defaults": {
			    	"!proto": "ConnectionConfig",
		        "host": "String",
		        "port": "Number",
		        "rows": "Number",
		        "binary": "Boolean",
		        "poolSize": "Number",
		        "poolIdleTimeout": "Number",
		        "reapIntervalMillis": "Number",
		        "poolLog": "Boolean",
		        "client_encoding": "String",
		        "ssl": "Boolean"
      		},
      		"ClientConfig" : {
    		    "!proto" : "ConnectionConfig",
    		    "ssl": "Boolean",
    		    "user": "String",
                "database": "String",
                "password": "String",
                "port": "Number",
                "host": "String"
    		},
    		"QueryConfig" : {
    		    "!proto" : "Object",
    		    "name": "String",
    		    "text": "String",
                "values": {
    		        "!type": "[?]"
    		    }
    		},
    		"QueryResult" : {
    		    "!proto" : "Object",
                "rows": {
    		        "!type": "[?]"
    		    }
    		},
    		"ResultBuilder" : {
    		    "!proto" : "QueryResult",
                "rows": {
    		        "!type": "[?]"
    		    },
    		    "command": "String",
       		    "rowCount": "Number",
                "oid": "Number",
    		    "addRow": {
					"!type" : "fn(row: ?)"
				},
    		},
      		"Client": {
      			"!proto": "EventEmitter",
      			"!type": "fn(config: Object)",
        		"prototype": {
	          		"connect": {
    					"!type" : "fn(callback: fn(err:Error))"
    				},
	          		"getStartupConf": {
    					"!type" : "fn() -> Object"
    				},
	          		"cancel": {
    					"!type" : "fn(client: Client, query: Query)"
    				},
	          		"escapeIdentifier": {
	            		    "!type": "fn(str: String) -> String",
	          		},
	          		"escapeLiteral": {
	            		    "!type": "fn(str: String) -> String",
	          		},
	          		"copyFrom": {
    					"!type" : "fn(text: String) -> Writable"
    				},
	          		"copyTo": {
    					"!type" : "fn(text: String) -> Readable"
    				},
	          		"query": {
    					"!type" : "fn(config: Object, values: Object, callback: fn()) -> Object"
    				},
	          		"end": {
    					"!type" : "fn()"
    				},
                }
	        },
	        "Query": {
		        	"!proto": "EventEmitter",
		        	"!type": "fn(config: Object, values: Object, callback: fn()) -> Query",
		        "prototype": {
		          	"requiresPreparation": {
    					"!type" : "fn() -> Boolean"
    				},
		          	"handleRowDescription": {
		            	    "!type": "fn(msg: Message)",
		          	},
		          	"handleDataRow": {
    					"!type" : "fn(msg: Message)"
    				},
		          	"handleCommandComplete": {
    					"!type" : "fn(msg: Message, con: Connection)"
    				},
		          	"handleReadyForQuery": {
    					"!type" : "fn()"
    				},
		          	"handleError": {
    					"!type" : "fn(err: Boolean, connection: Connection)"
    				},
		          	"submit": {
    					"!type" : "fn(connection: Connection)"
    				},
		          	"hasBeenParsed": {
    					"!type" : "fn(connection: Connection) -> String"
    				},
		          	"handlePortalSuspended": {
    					"!type" : "fn(connection: Connection)"
    				},
		          	"prepare": {
    					"!type" : "fn(connection: Connection)"
    				},
		          	"handleCopyInResponse": {
    					"!type" : "fn(connection: Connection)"
    				},
		          	"handleCopyData": {
    					"!type" : "fn(msg: Message, connection: Connection)"
    				}
		        },
		        "portal": "String",
		        "isPreparedStatement": "Boolean"
		    },
			"Connection": {
			    	"!proto": "EventEmitter",
			    	"!type": "fn(config: Object)",
		        "prototype": {
		        	"connect": {
    					"!type" : "fn(port: Number, host: String)"
    				},
		          	"attachListeners": {
    					"!type" : "fn(stream: Object)"
    				},
		          	"requestSsl": {
    					"!type" : "fn(config: Object)"
    				},
		          	"startup": {
    					"!type" : "fn(config: Object)"
    				},
		          	"cancel": {
    					"!type" : "fn(processID: Number, secretKey: String)"
    				},
		          	"password": {
    					"!type" : "fn(password: String)"
    				},
		          	"query": {
    					"!type" : "fn(text: String)"
    				},
		          	"parse": {
		            	"!type": "fn(query: Query, more: Object)",
		          	},
		          	"bind": {
		            	"!type": "fn(config: Object, more: Object)",
		          	},
		          	"execute": {
		            	"!type": "fn(config: Object, more: Object)",
		         	 },
		          	"flush": {
    					"!type" : "fn()"
    				},
		          	"sync": {
    					"!type" : "fn()"
    				},
		          	"end": {
    					"!type" : "fn()"
    				},
		          	"describe": {
    					"!type" : "fn(msg: Message, more: Object)"
    				},
		          	"sendCopyFromChunk": {
    					"!type" : "fn(chunk: Object)"
    				},
		          	"endCopyFrom": {
    					"!type" : "fn()"
    				},
		          	"sendCopyFail": {
    					"!type" : "fn(msg: Message)"
    				},
		          	"setBuffer": {
		            	"!type": "fn(buffer: Buffer)",
		          	},
		          	"readSslResponse": {
    					"!type" : "fn()"
    				},
		          	"parseMessage": {
    					"!type" : "fn() -> Boolean"
    				},
		          	"parseR": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseS": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseK": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseC": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseZ": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseT": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseField": {
		            	"!type": "fn(buffer: Buffer) -> Object",
		          	},
		          	"parseD": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseE": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseN": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseA": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseG": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseH": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseGH": {
		            	"!type": "fn(buffer: Buffer, msg: String) -> Message",
		          	},
		          	"parsed": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Message",
		          	},
		          	"parseInt32": {
		            	"!type": "fn(buffer: Buffer) -> Number",
		          	},
		          	"parseInt16": {
		           		"!type": "fn(buffer: Buffer) -> Number",
		          	},
		          	"readString": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> String",
		          	},
		          	"readBytes": {
		            	"!type": "fn(buffer: Buffer, length: Number) -> Buffer",
		          	},
		          	"parseCString": {
		            	"!type": "fn(buffer: Buffer) -> String",
		          	}
		        },
		    },
		  	"Error": {
		  		"!proto": "Object",
		    	    "name": "String",
		    	    "length": "Number",
			    "salt": "Buffer",
			    "parameterName": "String",
			    "parameterValue": "String",
			    "processID": "Number",
			    "secretKey": "Number",
			    "text": "String",
			    "status": "String",
			    "fieldCount": "Number",
			    "fields": "[Object]",
			    "processId": "Number",
			    "channel": "String",
			    "payload": "String",
			    "binary": "Boolean",
			    "columnTypes": "[Number]",
			    "chunk": "Buffer"
		  	},
	      	"Pool": {
	      		"!proto": "Object",
		        "all": "Object",
		        "getOrCreate": "fn(clientConfig: Object)"
		    }
	    }
	};
});