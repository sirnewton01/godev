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
define('javascript/contentAssist/indexFiles/redisIndex', [], 
function () {
	return {
		"!name": "redis",
		"commands" : "Commands",
		"!define": {
			"redis": {
        		"debug_mode": "Boolean",
        		"createClient": {
		        	    "!type": "fn(port_arg: Number, host_arg: String, options: Object) -> +RedisClient",
		        },
        		"print": {
  					"!type" : "fn(err: Error, reply: Object)"
  				}
		    },
		    "RedisClient": {
    			"!type": "fn(stream: Object, options: Object)",
      			"prototype": {
            			"initialize_retry_vars": {
  						"!type" : "fn()"
  					},
            			"unref": {
  						"!type" : "fn()"
  					},
            			"flush_and_error": {
              			"!type": "fn(message: String)",
            			},
	            		"on_error": {
  						"!type" : "fn(msg: String)"
  					},
	            		"do_auth": {
  						"!type" : "fn()"
  					},
			        "on_connect": {
  					    "!type" : "fn()"
  					},
			        "init_parser": {
  					    "!type" : "fn()"
  					},
			        "on_ready": {
  					    "!type" : "fn()"
  					},
			        "on_info_cmd": {
  						"!type" : "fn(err: Error, res: Object)"
  					},
			        "ready_check": {
  						"!type" : "fn()"
  					},
			        "send_offline_queue": {
  						"!type" : "fn()"
  					},
			        "connection_gone": {
  						"!type" : "fn(why: String)"
  					},
			        "on_data": {
  						"!type" : "fn(data: Object)"
  					},
			        "return_error": {
  						"!type" : "fn(err: Error)"
  					},
			        "return_reply": {
  						"!type" : "fn(reply: Object)"
  					},
			        "send_command": {
  						"!type" : "fn(command: String, args: Object, callback: fn()) -> Object"
  					},
			        "pub_sub_command": {
  						"!type" : "fn(command_obj: Object)"
  					},
			        "end": {
  						"!type" : "fn()"
  					},
		            "select": {
			            	"!type": "fn(db: Object, callback: fn())",
		            },
		            "auth": {
		            	    "!type": "fn()",
		            },
		            "hmget": {
  						"!type" : "fn(arg1: Object, arg2: Object, arg3: Object)"
  					},
		            "hmset": {
  						"!type" : "fn(args: Object, callback: fn())"
  					},
		           "multi": {
  						"!type" : "fn(args: Object) -> +Multi"
  					},
		            "MULTI": {
		              "!type": "fn(args: Object) -> +Multi",
		            },
		            "EVAL": {
  						"!type" : "fn()"
  					},
		            "SELECT": {
						"!type" : "fn()"
					},
		            "AUTH": {
  						"!type" : "fn()"
  					},
		            "HMGET": {
  						"!type" : "fn(arg1: Object, arg2: Object, arg3: Object)"
  					},
		            "HMSET": {
  						"!type" : "fn(args: Object, callback: fn())"
  					},
		            "eval": {
  						"!type" : "fn()"
  					}
       			},
       		},
		    "Multi": {
		    	    "!proto" : "Object",
		    	    "!type" : "fn(client: RedisClient, args: Object)",
		    	    "prototype": {
		            "hmset": {
		              "!type": "fn() -> +Multi",
		            },
		            	"exec": {
						"!type" : "fn(callback: fn()) -> Boolean"
  					},
		            	"HMSET": {
  						"!type" : "fn()"
  					},
		            	"EXEC": {
  						"!type" : "fn()"
  					}
	        	    },
  		    },
	      	"Commands": {
	      		"!proto" : "Object",
			    "append" : "String",
			    "auth" : "String",
			    "bgrewriteaof" : "String",
			    "bgsave" : "String",
			    "bitcount" : "String",
			    "bitop" : "String",
			    "blpop" : "String",
			    "brpop" : "String",
			    "brpoplpush" : "String",
			    "client kill" : "String",
			    "client list" : "String",
			    "client getname" : "String",
			    "client setname" : "String",
			    "config get" : "String",
			    "config rewrite" : "String",
			    "config set" : "String",
			    "config resetstat" : "String",
			    "dbsize" : "String",
			    "debug object" : "String",
			    "debug segfault" : "String",
			    "decr" : "String",
			    "decrby" : "String",
			    "del" : "String",
			    "discard" : "String",
			    "dump" : "String",
			    "echo" : "String",
			    "eval" : "String",
			    "evalsha" : "String",
			    "exec" : "String",
			    "exists" : "String",
			    "expire" : "String",
			    "expireat" : "String",
			    "flushall" : "String",
			    "flushdb" : "String",
			    "get" : "String",
			    "getbit" : "String",
			    "getrange" : "String",
			    "getset" : "String",
			    "hdel" : "String",
			    "hexists" : "String",
			    "hget" : "String",
			    "hgetall" : "String",
			    "hincrby" : "String",
			    "hincrbyfloat" : "String",
			    "hkeys" : "String",
			    "hlen" : "String",
			    "hmget" : "String",
			    "hmset" : "String",
			    "hset" : "String",
			    "hsetnx" : "String",
			    "hvals" : "String",
			    "incr" : "String",
			    "incrby" : "String",
			    "incrbyfloat" : "String",
			    "info" : "String",
			    "keys" : "String",
			    "lastsave" : "String",
			    "lindex" : "String",
			    "linsert" : "String",
			    "llen" : "String",
			    "lpop" : "String",
			    "lpush" : "String",
			    "lpushx" : "String",
			    "lrange" : "String",
			    "lrem" : "String",
			    "lset" : "String",
			    "ltrim" : "String",
			    "mget" : "String",
			    "migrate" : "String",
			    "monitor" : "String",
			    "move" : "String",
			    "mset" : "String",
			    "msetnx" : "String",
			    "multi" : "String",
			    "object" : "String",
			    "persist" : "String",
			    "pexpire" : "String",
			    "pexpireat" : "String",
			    "ping" : "String",
			    "psetex" : "String",
			    "psubscribe" : "String",
			    "pubsub" : "String",
			    "pttl" : "String",
			    "publish" : "String",
			    "punsubscribe" : "String",
			    "quit" : "String",
			    "randomkey" : "String",
			    "rename" : "String",
			    "renamenx" : "String",
			    "restore" : "String",
			    "rpop" : "String",
			    "rpoplpush" : "String",
			    "rpush" : "String",
			    "rpushx" : "String",
			    "sadd" : "String",
			    "save" : "String",
			    "scard" : "String",
			    "script exists" : "String",
			    "script flush" : "String",
			    "script kill" : "String",
			    "script load" : "String",
			    "sdiff" : "String",
			    "sdiffstore" : "String",
			    "select" : "String",
			    "set" : "String",
			    "setbit" : "String",
			    "setex" : "String",
			    "setnx" : "String",
			    "setrange" : "String",
			    "shutdown" : "String",
			    "sinter" : "String",
			    "sinterstore" : "String",
			    "sismember" : "String",
			    "slaveof" : "String",
			    "slowlog" : "String",
			    "smembers" : "String",
			    "smove" : "String",
			    "sort" : "String",
			    "spop" : "String",
			    "srandmember" : "String",
			    "srem" : "String",
			    "strlen" : "String",
			    "subscribe" : "String",
			    "sunion" : "String",
			    "sunionstore" : "String",
			    "sync" : "String",
			    "time" : "String",
			    "ttl" : "String",
			    "type" : "String",
			    "unsubscribe" : "String",
			    "unwatch" : "String",
			    "watch" : "String",
			    "zadd" : "String",
			    "zcard" : "String",
			    "zcount" : "String",
			    "zincrby" : "String",
			    "zinterstore" : "String",
			    "zrange" : "String",
			    "zrangebyscore" : "String",
			    "zrank" : "String",
			    "zrem" : "String",
			    "zremrangebyrank" : "String",
			    "zremrangebyscore" : "String",
			    "zrevrange" : "String",
			    "zrevrangebyscore" : "String",
			    "zrevrank" : "String",
			    "zscore" : "String",
			    "zunionstore" : "String",
			    "scan" : "String",
			    "sscan" : "String",
			    "hscan" : "String",
			    "zscan" : "String"
      	    }
       }
    };
});