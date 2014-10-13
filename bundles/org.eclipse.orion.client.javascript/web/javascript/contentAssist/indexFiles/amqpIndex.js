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
define('javascript/contentAssist/indexFiles/amqpIndex', [
], function () {
	return {
		"!name": "amqp",
		"this": "<top>",
		"global": "<top>",
		"!define": {
      		"amqp": {
      			"!proto" : "Object",
        		"Connection": "fn(connectionArgs: Object, options: Object, readyCallback: fn())",
		        "createConnection": "fn(options: Object, implOptions: Object, readyCallback: fn()) -> Connection"
		     },
      		"Connection": {
      			"!type": "fn(connectionArgs: ?, options: ?, readyCallback: ?)",
      			"!proto" : "EventEmitter",
        		"prototype": {
          			"setOptions": "fn(options: Object)",
          			"setImplOptions": "fn(options: Object)",
          			"connect": "fn()",
          			"reconnect": "fn()",
          			"addAllListeners": "fn()",
          			"heartbeat": "fn()",
          			"exchange": "fn(name: String, options: Object, openCallback: fn()) -> Exchange",
          			"exchangeClosed": "fn(name: String)",
          			"queue": "fn(name: String) -> Queue",
          			"queueClosed": "fn(name: String)",
          			"publish": "fn(routingKey: Object, body: Object, options: Object, callback: fn())",
          			"generateChannelId": "fn() -> String",
        		},
        
      		},
      		"Exchange": {
      			"!type": "fn(connection: Connection, channel: Channel, name: String, options: Object, openCallback: fn())",
      			"!proto" : "Channel",
        		"prototype": {
          			"publish": "fn(routingKey: Object, data: Object, options: Object, callback: fn())",
          			"cleanup": "fn()",
          			"destroy": "fn(ifUnused: Boolean)",
	          		"unbind": "fn()",
	          		"bind": "fn()",
	          		"bind_headers": "fn()"
        		}
      		},
      		"Queue": {
      			"!type": "fn(connection: Connection, channel: Channel, name: String, options: Object, callback: fn())",
      			"!proto" : "Channel",
        		"prototype": {
          			"subscribeRaw": "fn(options: Object, messageListener: fn())",
          			"unsubscribe": "fn(consumerTag: String)",
          			"subscribe": "fn(options: Object, messageListener: fn())",
          			"shift":  "fn(reject: Object, requeue: Object)",
          			"bind": "fn(exchange: Exchange, routingKey: String, callback: fn())",
          			"unbind": "fn(exchange: Exchange, routingKey: String)",
          			"bind_headers": "fn()",
          			"destroy": "fn(options: Object)",
          			"purge": "fn()",
          			"flow": "fn(active: Object)",
          			"subscribeJSON": "fn(options: Object, messageListener: fn())"
        		}
      		},
      		"Channel": {
      			"!type": "fn(connection: Connection, channel: Channel)",
      			"!proto" : "EventEmitter",
        		"prototype": {
          			"closeOK": "fn()",
          			"reconnect": "fn()",
          			"close": "fn()"
        		}
      		}
		}
	}
});