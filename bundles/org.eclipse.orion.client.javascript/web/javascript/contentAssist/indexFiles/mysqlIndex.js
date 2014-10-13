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
define('javascript/contentAssist/indexFiles/mysqlIndex', [], 
function () {
	return {
		"!name": "mysql",
  		"!define": {
  			"mysql": {
    			"createConnection": {
	  				"!type": "fn(config: Object) -> +Connection"
	  			},
    			"createPool": {
	  				"!type": "fn(config: Object) -> +Pool"
	  			},
    			"createPoolCluster": {
	  				"!type": "fn(config: Object) -> +PoolCluster"
	  			},
    			"createQuery": {
	  				"!type": "fn(sql: String, values: Object, cb: fn()) -> +Query"
	  			},
    			"escape": {
	  				"!type": "fn(val: String, stringifyObjects: Boolean, timeZone: String) -> String"
	  			},
    			"escapeId": {
	  				"!type": "fn(val: String, forbidQualified: Boolean) -> String"
	  			},
    			"format": {
	  				"!type": "fn(sql: String, values: [String], stringifyObjects: Boolean, timeZone: String) -> String"
	  			},
	  			"Types": {
	  				"!proto": "Object",
			        "DECIMAL": "Number",
			        "TINY": "Number",
			        "SHORT": "Number",
			        "LONG": "Number",
			        "FLOAT": "Number",
			        "DOUBLE": "Number",
			        "NULL": "Number",
			        "TIMESTAMP": "Number",
			        "LONGLONG": "Number",
			        "INT24": "Number",
			        "DATE": "Number",
			        "TIME": "Number",
			        "DATETIME": "Number",
			        "YEAR": "Number",
			        "NEWDATE": "Number",
			        "VARCHAR": "Number",
			        "BIT": "Number",
			        "NEWDECIMAL": "Number",
			        "ENUM": "Number",
			        "SET": "Number",
			        "TINY_BLOB": "Number",
			        "MEDIUM_BLOB": "Number",
			        "LONG_BLOB": "Number",
			        "BLOB": "Number",
			        "VAR_STRING": "Number",
			        "STRING": "Number",
			        "GEOMETRY": "Number"
			    },
  			},
	  		"Connection" : {
	  			"!proto": "EventEmitter",
	  			"!type": "fn(options: Object)",
	    		"createQuery": {
	  				"!type": "fn(sql: String, values: Object, cb: fn()) -> +Query"
	  			},
	    		"prototype": {
	      			"connect": {
	  					"!type": "fn(cb: fn())"
	  				},
			      	"changeUser": {
	  					"!type": "fn(options: Object, cb: fn()) -> Object"
	  				},
			      	"beginTransaction": {
	  					"!type": "fn(cb: fn()) -> Object"
	  				},
			      	"commit": {
	  					"!type": "fn(cb: fn()) -> Object"
	  				},
			      	"rollback": {
	  					"!type": "fn(cb: fn()) -> Object"
	  				},
			      	"query": {
	  					"!type": "fn(sql: Object, values: Object, cb: fn()) -> Object"
	  				},
			      	"ping": {
	  					"!type": "fn(cb: fn())"
	  				},
			      	"statistics": {
	  					"!type": "fn(cb: fn())"
	  				},
			      	"end": {
	  					"!type": "fn(cb: fn())"
	  				},
			      	"destroy": {
	  					"!type": "fn()"
	  				},
			      	"pause": {
	  					"!type": "fn()"
	  				},
			      	"resume": {
	  					"!type": "fn()"
	  				},
			      	"escape": {
	  					"!type": "fn(value: String) -> String"
	  				},
			      	"format": {
	  					"!type": "fn(sql: Object, values: [String]) -> String"
	  				},
	    		},
	  		},
  			"Pool": {
  				"!proto": "EventEmitter",
  				"!type": "fn(options: Object)",
    			"prototype": {
      				"getConnection": {
	  					"!type": "fn(cb: fn(err: Error, conn: Connection))"
	  				},
      				"releaseConnection": {
	  					"!type": "fn(connection: Connection)"
	  				},
      				"end": {
	  					"!type": "fn(cb: fn(err: Error)) -> Object"
	  				},
      				"query": {
	  					"!type": "fn(sql: String, values: Object, cb: fn())"
	  				},
      				"escape": {
	  					"!type": "fn(value: String) -> String"
	  				}
    			}
 			},
  			"PoolCluster": {
  				"!proto": "Object",
  				"!type": "fn(config: Object)",
    			"prototype": {
	          		"of": {
		            	"!type": "fn(pattern: String, selector: String) -> Object",
		        	},
	          		"add": {
	  					"!type": "fn(id: String, config: String)"
	  				},
	          		"getConnection": {
	  					"!type": "fn(pattern: String, selector: String, cb: fn())"
	  				},
	          		"end": {
	  					"!type": "fn()"
	  				},
	        	},
	      	},
		    "Query": {
    		    	"!proto": "Sequence",
    		    	"!type": "fn(options: Object, callback: fn())",
        		"prototype": {
      				"start": {
	  					"!type": "fn()"
	  				},
      				"determinePacket": {
	  					"!type": "fn(firstByte: Number, parser: Object)"
	  				},
      				"OkPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
      				"ErrorPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
      				"ResultSetHeaderPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
      				"FieldPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
      				"EofPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
      				"RowDataPacket": {
	  					"!type": "fn(packet: Object, parser: Parser, connection: Connection)"
	  				},
      				"stream": {
	  					"!type": "fn(options: Object) -> Object"
	  				}
    			}
    		},
		    "Sequence": {
    		    	"!proto" : "Object",
    		    	"!type": "fn(callback: fn())",
            		"determinePacket": {
    	  				"!type": "fn(byte: Number)"
    	  			},
		        "prototype": {
		          	"hasErrorHandler": {
	  					"!type": "fn() -> Boolean"
	  				},
		          	"end": {
		            	"!type": "fn(err: Error)",
		          	},
		          	"OkPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
		          	"ErrorPacket": {
	  					"!type": "fn(packet: Object)"
	  				},
		          	"start": {
		            	"!type": "fn()",
		          	}
        		}
      		}
		}
    };
});