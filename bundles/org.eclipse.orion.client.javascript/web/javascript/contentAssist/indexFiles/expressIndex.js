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
define('javascript/contentAssist/indexFiles/expressIndex', [], 
function () {
	return {
  		"!name": "express",
  		"!define": {
      		"express": {
        		"createServer": {
        			"!type" : "fn() -> application"
        		},
		        "application": "application",
		        "request": "request",
		        "response": "response",
		        "Route": "Route",
		        "Router": "Router",
		        "!proto" : "Object",
		        "!type": "fn() -> application"
      		},
      		"Route": {
  				"prototype": {
    				"match": {
      					"!type": "fn(path: String) -> Boolean"
			    	}
  				},
  				"!proto" : "Object",
  				"!type": "fn(method: String, path: String, callbacks: [fn()], options: Object)"
			},
			"Router": {
  				"prototype": {
    				"param": {
				     	"!type": "fn(name: String, fn: fn()) -> Object"
					},
				    "matchRequest": {
				      "!type": "fn(req: IncomingMessage, i: Number, head: String) -> Route"
				    },
				    "match": {
				      "!type": "fn(method: String, url: String, i: Number, head: String) -> Route"
				    },
				    "route": {
				      "!type": "fn(method: String, path: String, callbacks: fn()) -> Router"
				    },
				    "all": {
				      "!type": "fn(path: String) -> Router"
				    }
			  	},
			  	"!proto" : "Object",
			  	"!type": "fn(options: Object)"
			},
      		"application": {
      			"!proto" : "Object",
		        "init": {
		          "!type": "fn()"
		        },
		        "defaultConfiguration": {
		          "!type": "fn()"
		        },
		        "use": {
		          "!type": "fn(route: String, fn: fn()) -> Object"
		        },
		        "engine": {
		          "!type": "fn(ext: String, fn: fn()) -> Object"
		        },
		        "param": {
		          "!type": "fn(name: String, fn: fn()) -> Object"
		        },
		        "set": {
		          "!type": "fn(setting: String, val: String) -> Object"
		        },
		        "path": {
		          "!type": "fn() -> String"
		        },
		        "enabled": {
		          "!type": "fn(setting: String) -> Boolean"
		        },
		        "disabled": {
		          "!type": "fn(setting: String) -> Boolean"
		        },
		        "enable": {
		          "!type": "fn(setting: String) -> Object"
		        },
		        "disable": {
		          "!type": "fn(setting: String) -> Object"
		        },
		        "configure": {
		          "!type": "fn(env: String, fn: fn()) -> Object"
		        },
		        "all": {
		          "!type": "fn(path: String) -> Object"
		        },
		        "render": {
		          "!type": "fn(name: String, options: Object, fn: fn())"
		        },
		        "listen": {
		          "!type": "fn()"
		        }
			},
      		"request": {
      			"!proto" : "Object",
        		"header": {
		          "!type": "fn(name: String) -> Object"
		         },
		        "accepts": {
		          "!type": "fn(type: Object)"
		         },
		        "acceptsEncoding": {
		          "!type": "fn(encoding: String) -> Boolean"
		        },
		        "acceptsCharset": {
		          "!type": "fn(charset: String) -> Boolean"
		        },
		        "acceptsLanguage": {
		          "!type": "fn(lang: String) -> Boolean"
		        },
		        "range": {
		          "!type": "fn(size: Number)"
		        },
		        "param": {
		          "!type": "fn(name: String, defaultValue: Object) -> String"
		        },
		        "is": {
		          "!type": "fn(type: String) -> Boolean"
		         },
		        "get": {
		          "!type": "fn(name: String) -> Object"
		         }
      		},
      		"response": {
      			"!proto" : "Object",
        		"status": {
		          "!type": "fn(code: Number) -> response"
		        },
		        "links": {
		          "!type": "fn(links: Object) -> response"
		        },
		        "send": {
		          "!type": "fn(body: String) -> response"
		        },
		        "json": {
		          "!type": "fn(obj: Object) -> response"
		        },
		        "jsonp": {
		          "!type": "fn(obj: Object) -> response"
		        },
		        "sendfile": {
		          "!type": "fn(path: String, options: Object, fn: fn())"
		        },
		        "download": {
		          "!type": "fn(path: String, filename: String, fn: fn())"
		        },
		        "type": {
		        	"!type" : "fn(type: String)"
		        },
		        "format": {
		          "!type": "fn(obj: Object) -> response"
		        },
		        "attachment": {
		          "!type": "fn(filename: String) -> response"
		        },
		        "header": {
		        	"!type" : "fn(field: Object, val: String) -> response"
		        },
		        "get": {
		          "!type": "fn(field: String) -> String"
		        },
		        "clearCookie": {
		          "!type": "fn(name: String, options: Object) -> response"
		        },
		        "cookie": {
		          "!type": "fn(name: String, val: Object, options: Object) -> response"
		        },
		        "location": {
		          "!type": "fn(url: String) -> response"
		        },
		        "redirect": {
		          "!type": "fn(url: String)"
		        },
		        "vary": {
		          "!type": "fn(field: Object) -> response"
		        },
		        "render": {
		          "!type": "fn(view: String, options: Object, fn: fn())"
		        },
		        "contentType":  {
		        	"!type" : "fn(type: String)"
		        },
		        "set":  {
		        	"!type" : "fn(field: Object, val: String) -> response"
		        }
      		},
      		"middleware": {
      			"!proto" : "Object",
  				"init": {
    				"!type": "fn(app: fn())"
  				}
			}
        }
	}
});