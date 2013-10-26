/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     Manu Sridharan (IBM) - Initial API and implementation
 ******************************************************************************/
 /*global define */
define("plugins/esprima/indexFiles/nodeIndex", [], function () {
	return {
		"console": "Console",
		"process": "Process",
		"!define": {
			"assert": {
				"fail": {
					"!type": "fn(actual: Object, expected: Object, message: Object, operator: Object)"
				},
				"assert": {
					"!type": "fn(value: Object, message: Object)"
				},
				"ok": {
					"!type": "fn(value: Object, message?: Object)"
				},
				"equal": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"notEqual": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"deepEqual": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"notDeepEqual": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"strictEqual": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"notStrictEqual": {
					"!type": "fn(actual: Object, expected: Object, message?: Object)"
				},
				"throws": {
					"!type": "fn(block: Object, error?: Object, message?: Object)"
				},
				"doesNotThrow": {
					"!type": "fn(block: Object, message?: Object)"
				},
				"ifError": {
					"!type": "fn(value: Object)"
				}
			},
			"buffer": {
				"INSPECT_MAX_BYTES": {
					"!type": "Number"
				},
				"Buffer": {
					"!type": "fn()",
					"prototype": {
						"write": {
							"!type": "fn(string: Object, offset?: Object, length?: Object, encoding?: Object)"
						},
						"toString": {
							"!type": "fn(encoding?: Object, start?: Object, end?: Object)"
						},
						"toJSON": {
							"!type": "fn()"
						},
						"copy": {
							"!type": "fn(targetBuffer: Object, targetStart?: Object, sourceStart?: Object, sourceEnd?: Object)"
						},
						"slice": {
							"!type": "fn(start?: Object, end?: Object)"
						},
						"readUInt8": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readUInt16LE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readUInt16BE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readUInt32LE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readUInt32BE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readInt8": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readInt16LE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readInt16BE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readInt32LE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readInt32BE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readFloatLE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readFloatBE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readDoubleLE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"readDoubleBE": {
							"!type": "fn(offset: Object, noAssert?: Object)"
						},
						"writeUInt8": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeUInt16LE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeUInt16BE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeUInt32LE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeUInt32BE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeInt8": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeInt16LE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeInt16BE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeInt32LE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeInt32BE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeFloatLE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeFloatBE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeDoubleLE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"writeDoubleBE": {
							"!type": "fn(value: Object, offset: Object, noAssert?: Object)"
						},
						"fill": {
							"!type": "fn(value: Object, offset?: Object, end?: Object)"
						},
						"[index]": {
							"!type": "Object"
						},
						"length": {
							"!type": "Object"
						}
					},
					"isEncoding": {
						"!type": "fn(encoding: Object)"
					},
					"isBuffer": {
						"!type": "fn(obj: Object)"
					},
					"byteLength": {
						"!type": "fn(string: Object, encoding?: Object)"
					},
					"concat": {
						"!type": "fn(list: Object, totalLength?: Object)"
					}
				},
				"SlowBuffer": {
					"!type": "fn()",
					"prototype": {}
				}
			},
			"child_process": {
				"spawn": {
					"!type": "fn(command: Object, args?: Object, options?: Object) -> ChildProcessobject"
				},
				"exec": {
					"!type": "fn(command: Object, options: Object, callback: Object)"
				},
				"execFile": {
					"!type": "fn(file: Object, args: Object, options: Object, callback: Object)"
				},
				"fork": {
					"!type": "fn(modulePath: Object, args?: Object, options?: Object)"
				},
				"ChildProcess": {
					"!type": "fn()",
					"prototype": {
						"kill": {
							"!type": "fn(signal?: Object)"
						},
						"send": {
							"!type": "fn(message: Object, sendHandle?: Object)"
						},
						"disconnect": {
							"!type": "fn()"
						},
						"stdin": {
							"!type": "Object"
						},
						"stdout": {
							"!type": "Object"
						},
						"stderr": {
							"!type": "Object"
						},
						"pid": {
							"!type": "Object"
						}
					}
				}
			},
			"cluster": {
				"setupMaster": {
					"!type": "fn(settings?: Object)"
				},
				"fork": {
					"!type": "fn(env?: Object) -> Workerobject"
				},
				"disconnect": {
					"!type": "fn(callback?: Object)"
				},
				"settings": {
					"!type": "Object"
				},
				"isMaster": {
					"!type": "Object"
				},
				"isWorker": {
					"!type": "Object"
				},
				"worker": {
					"!type": "Object"
				},
				"workers": {
					"!type": "Object"
				},
				"Worker": {
					"!type": "fn()",
					"prototype": {
						"send": {
							"!type": "fn(message: Object, sendHandle?: Object)"
						},
						"kill": {
							"!type": "fn(signal?: Object)"
						},
						"disconnect": {
							"!type": "fn()"
						},
						"id": {
							"!type": "Object"
						},
						"process": {
							"!type": "Object"
						},
						"suicide": {
							"!type": "Object"
						}
					}
				}
			},
			"Console": {
				"log": {
					"!type": "fn(data?: Object, other?: Object)"
				},
				"info": {
					"!type": "fn(data?: Object, other?: Object)"
				},
				"error": {
					"!type": "fn(data?: Object, other?: Object)"
				},
				"warn": {
					"!type": "fn(data?: Object, other?: Object)"
				},
				"dir": {
					"!type": "fn(obj: Object)"
				},
				"time": {
					"!type": "fn(label: Object)"
				},
				"timeEnd": {
					"!type": "fn(label: Object)"
				},
				"trace": {
					"!type": "fn(label: Object)"
				},
				"assert": {
					"!type": "fn(expression: Object, message?: Object)"
				}
			},
			"crypto": {
				"getCiphers": {
					"!type": "fn()"
				},
				"getHashes": {
					"!type": "fn()"
				},
				"createCredentials": {
					"!type": "fn(details: Object)"
				},
				"createHash": {
					"!type": "fn(algorithm: Object)"
				},
				"createHmac": {
					"!type": "fn(algorithm: Object, key: Object)"
				},
				"createCipher": {
					"!type": "fn(algorithm: Object, password: Object)"
				},
				"createCipheriv": {
					"!type": "fn(algorithm: Object, key: Object, iv: Object)"
				},
				"createDecipher": {
					"!type": "fn(algorithm: Object, password: Object)"
				},
				"createDecipheriv": {
					"!type": "fn(algorithm: Object, key: Object, iv: Object)"
				},
				"createSign": {
					"!type": "fn(algorithm: Object)"
				},
				"createVerify": {
					"!type": "fn(algorithm: Object)"
				},
				"createDiffieHellman": {
					"!type": "fn(prime: Object, encoding?: Object)"
				},
				"getDiffieHellman": {
					"!type": "fn(group_name: Object)"
				},
				"pbkdf2": {
					"!type": "fn(password: Object, salt: Object, iterations: Object, keylen: Object, callback: Object)"
				},
				"pbkdf2Sync": {
					"!type": "fn(password: Object, salt: Object, iterations: Object, keylen: Object)"
				},
				"randomBytes": {
					"!type": "fn(size: Object, callback?: Object)"
				},
				"pseudoRandomBytes": {
					"!type": "fn(size: Object, callback?: Object)"
				},
				"DEFAULT_ENCODING": {
					"!type": "Object"
				},
				"Hash": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object, input_encoding?: Object)"
						},
						"digest": {
							"!type": "fn(encoding?: Object)"
						}
					}
				},
				"Hmac": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object)"
						},
						"digest": {
							"!type": "fn(encoding?: Object)"
						}
					}
				},
				"Cipher": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object, input_encoding?: Object, output_encoding?: Object)"
						},
						"final": {
							"!type": "fn(output_encoding?: Object)"
						},
						"setAutoPadding": {
							"!type": "fn(auto_padding: Object)"
						}
					}
				},
				"Decipher": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object, input_encoding?: Object, output_encoding?: Object)"
						},
						"final": {
							"!type": "fn(output_encoding?: Object)"
						},
						"setAutoPadding": {
							"!type": "fn(auto_padding: Object)"
						}
					}
				},
				"Sign": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object)"
						},
						"sign": {
							"!type": "fn(private_key: Object, output_format?: Object)"
						}
					}
				},
				"Verify": {
					"!type": "fn()",
					"prototype": {
						"update": {
							"!type": "fn(data: Object)"
						},
						"verify": {
							"!type": "fn(object: Object, signature: Object, signature_format?: Object)"
						}
					}
				},
				"DiffieHellman": {
					"!type": "fn()",
					"prototype": {
						"generateKeys": {
							"!type": "fn(encoding?: Object)"
						},
						"computeSecret": {
							"!type": "fn(other_public_key: Object, input_encoding?: Object, output_encoding?: Object)"
						},
						"getPrime": {
							"!type": "fn(encoding?: Object)"
						},
						"getGenerator": {
							"!type": "fn(encoding?: Object)"
						},
						"getPublicKey": {
							"!type": "fn(encoding?: Object)"
						},
						"getPrivateKey": {
							"!type": "fn(encoding?: Object)"
						},
						"setPublicKey": {
							"!type": "fn(public_key: Object, encoding?: Object)"
						},
						"setPrivateKey": {
							"!type": "fn(private_key: Object, encoding?: Object)"
						}
					}
				}
			},
			"dgram": {
				"createSocket": {
					"!type": "fn(type: Object, callback?: Object)"
				},
				"Socket": {
					"!type": "fn()",
					"prototype": {
						"send": {
							"!type": "fn(buf: Object, offset: Object, length: Object, port: Object, address: Object, callback?: Object)"
						},
						"bind": {
							"!type": "fn(port: Object, address?: Object, callback?: Object)"
						},
						"close": {
							"!type": "fn()"
						},
						"address": {
							"!type": "fn()"
						},
						"setBroadcast": {
							"!type": "fn(flag: Object)"
						},
						"setTTL": {
							"!type": "fn(ttl: Object)"
						},
						"setMulticastTTL": {
							"!type": "fn(ttl: Object)"
						},
						"setMulticastLoopback": {
							"!type": "fn(flag: Object)"
						},
						"addMembership": {
							"!type": "fn(multicastAddress: Object, multicastInterface?: Object)"
						},
						"dropMembership": {
							"!type": "fn(multicastAddress: Object, multicastInterface?: Object)"
						},
						"unref": {
							"!type": "fn()"
						},
						"ref": {
							"!type": "fn()"
						}
					}
				}
			},
			"dns": {
				"lookup": {
					"!type": "fn(domain: Object, family: Object, callback: Object)"
				},
				"resolve": {
					"!type": "fn(domain: Object, rrtype: Object, callback: Object)"
				},
				"resolve4": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolve6": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolveMx": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolveTxt": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolveSrv": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolveNs": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"resolveCname": {
					"!type": "fn(domain: Object, callback: Object)"
				},
				"reverse": {
					"!type": "fn(ip: Object, callback: Object)"
				}
			},
			"domain": {
				"create": {
					"!type": "fn() -> Domain"
				},
				"Domain": {
					"!type": "fn()",
					"prototype": {
						"run": {
							"!type": "fn(fn: Object)"
						},
						"add": {
							"!type": "fn(emitter: Object)"
						},
						"remove": {
							"!type": "fn(emitter: Object)"
						},
						"bind": {
							"!type": "fn(callback: Object) -> Function"
						},
						"intercept": {
							"!type": "fn(callback: Object) -> Function"
						},
						"enter": {
							"!type": "fn()"
						},
						"exit": {
							"!type": "fn()"
						},
						"dispose": {
							"!type": "fn()"
						},
						"members": {
							"!type": "Object"
						}
					}
				}
			},
			"events": {
				"EventEmitter": {
					"!type": "fn()",
					"prototype": {
						"addListener": {
							"!type": "fn(event: Object, listener: Object)"
						},
						"on": {
							"!type": "fn(event: Object, listener: Object)"
						},
						"once": {
							"!type": "fn(event: Object, listener: Object)"
						},
						"removeListener": {
							"!type": "fn(event: Object, listener: Object)"
						},
						"removeAllListeners": {
							"!type": "fn(event?: Object)"
						},
						"setMaxListeners": {
							"!type": "fn(n: Object)"
						},
						"listeners": {
							"!type": "fn(event: Object)"
						},
						"emit": {
							"!type": "fn(event: Object, arg1?: Object, arg2?: Object, other?: Object)"
						}
					},
					"listenerCount": {
						"!type": "fn(emitter: Object, event: Object)"
					}
				}
			},
			"fs": {
				"rename": {
					"!type": "fn(oldPath: Object, newPath: Object, callback: Object)"
				},
				"renameSync": {
					"!type": "fn(oldPath: Object, newPath: Object)"
				},
				"ftruncate": {
					"!type": "fn(fd: Object, len: Object, callback: Object)"
				},
				"ftruncateSync": {
					"!type": "fn(fd: Object, len: Object)"
				},
				"truncate": {
					"!type": "fn(path: Object, len: Object, callback: Object)"
				},
				"truncateSync": {
					"!type": "fn(path: Object, len: Object)"
				},
				"chown": {
					"!type": "fn(path: Object, uid: Object, gid: Object, callback: Object)"
				},
				"chownSync": {
					"!type": "fn(path: Object, uid: Object, gid: Object)"
				},
				"fchown": {
					"!type": "fn(fd: Object, uid: Object, gid: Object, callback: Object)"
				},
				"fchownSync": {
					"!type": "fn(fd: Object, uid: Object, gid: Object)"
				},
				"lchown": {
					"!type": "fn(path: Object, uid: Object, gid: Object, callback: Object)"
				},
				"lchownSync": {
					"!type": "fn(path: Object, uid: Object, gid: Object)"
				},
				"chmod": {
					"!type": "fn(path: Object, mode: Object, callback: Object)"
				},
				"chmodSync": {
					"!type": "fn(path: Object, mode: Object)"
				},
				"fchmod": {
					"!type": "fn(fd: Object, mode: Object, callback: Object)"
				},
				"fchmodSync": {
					"!type": "fn(fd: Object, mode: Object)"
				},
				"lchmod": {
					"!type": "fn(path: Object, mode: Object, callback: Object)"
				},
				"lchmodSync": {
					"!type": "fn(path: Object, mode: Object)"
				},
				"stat": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"lstat": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"fstat": {
					"!type": "fn(fd: Object, callback: Object)"
				},
				"statSync": {
					"!type": "fn(path: Object)"
				},
				"lstatSync": {
					"!type": "fn(path: Object)"
				},
				"fstatSync": {
					"!type": "fn(fd: Object)"
				},
				"link": {
					"!type": "fn(srcpath: Object, dstpath: Object, callback: Object)"
				},
				"linkSync": {
					"!type": "fn(srcpath: Object, dstpath: Object)"
				},
				"symlink": {
					"!type": "fn(srcpath: Object, dstpath: Object, type: Object, callback: Object)"
				},
				"symlinkSync": {
					"!type": "fn(srcpath: Object, dstpath: Object, type?: Object)"
				},
				"readlink": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"readlinkSync": {
					"!type": "fn(path: Object)"
				},
				"realpath": {
					"!type": "fn(path: Object, cache: Object, callback: Object)"
				},
				"realpathSync": {
					"!type": "fn(path: Object, cache?: Object)"
				},
				"unlink": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"unlinkSync": {
					"!type": "fn(path: Object)"
				},
				"rmdir": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"rmdirSync": {
					"!type": "fn(path: Object)"
				},
				"mkdir": {
					"!type": "fn(path: Object, mode: Object, callback: Object)"
				},
				"mkdirSync": {
					"!type": "fn(path: Object, mode?: Object)"
				},
				"readdir": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"readdirSync": {
					"!type": "fn(path: Object)"
				},
				"close": {
					"!type": "fn(fd: Object, callback: Object)"
				},
				"closeSync": {
					"!type": "fn(fd: Object)"
				},
				"open": {
					"!type": "fn(path: Object, flags: Object, mode: Object, callback: Object)"
				},
				"openSync": {
					"!type": "fn(path: Object, flags: Object, mode?: Object) -> Number"
				},
				"utimes": {
					"!type": "fn(path: Object, atime: Object, mtime: Object)"
				},
				"utimesSync": {
					"!type": "fn(path: Object, atime: Object, mtime: Object)"
				},
				"futimes": {
					"!type": "fn(fd: Object, atime: Object, mtime: Object)"
				},
				"futimesSync": {
					"!type": "fn(fd: Object, atime: Object, mtime: Object)"
				},
				"fsync": {
					"!type": "fn(fd: Object, callback: Object)"
				},
				"fsyncSync": {
					"!type": "fn(fd: Object)"
				},
				"write": {
					"!type": "fn(fd: Object, buffer: Object, offset: Object, length: Object, position: Object, callback: Object)"
				},
				"writeSync": {
					"!type": "fn(fd: Object, buffer: Object, offset: Object, length: Object, position: Object)"
				},
				"read": {
					"!type": "fn(fd: Object, buffer: Object, offset: Object, length: Object, position: Object, callback: Object)"
				},
				"readSync": {
					"!type": "fn(fd: Object, buffer: Object, offset: Object, length: Object, position: Object)"
				},
				"readFile": {
					"!type": "fn(filename: Object, options: Object, callback: Object)"
				},
				"readFileSync": {
					"!type": "fn(filename: Object, options?: Object)"
				},
				"writeFile": {
					"!type": "fn(filename: Object, data: Object, options: Object, callback: Object)"
				},
				"writeFileSync": {
					"!type": "fn(filename: Object, data: Object, options?: Object)"
				},
				"appendFile": {
					"!type": "fn(filename: Object, data: Object, options: Object, callback: Object)"
				},
				"appendFileSync": {
					"!type": "fn(filename: Object, data: Object, options?: Object)"
				},
				"watchFile": {
					"!type": "fn(filename: Object, options: Object, listener: Object)"
				},
				"unwatchFile": {
					"!type": "fn(filename: Object, listener?: Object)"
				},
				"watch": {
					"!type": "fn(filename: Object, options?: Object, listener?: Object)"
				},
				"exists": {
					"!type": "fn(path: Object, callback: Object)"
				},
				"existsSync": {
					"!type": "fn(path: Object)"
				},
				"createReadStream": {
					"!type": "fn(path: Object, options?: Object)"
				},
				"createWriteStream": {
					"!type": "fn(path: Object, options?: Object)"
				},
				"Stats": {
					"!type": "fn()",
					"prototype": {}
				},
				"ReadStream": {
					"!type": "fn()",
					"prototype": {}
				},
				"WriteStream": {
					"!type": "fn()",
					"prototype": {
						"bytesWritten": {
							"!type": "Object"
						}
					}
				},
				"FSWatcher": {
					"!type": "fn()",
					"prototype": {
						"close": {
							"!type": "fn()"
						}
					}
				}
			},
			"http": {
				"createServer": {
					"!type": "fn(requestListener?: Object)"
				},
				"createClient": {
					"!type": "fn(port?: Object, host?: Object)"
				},
				"request": {
					"!type": "fn(options: Object, callback: Object)"
				},
				"get": {
					"!type": "fn(options: Object, callback: Object)"
				},
				"STATUS_CODES": {
					"!type": "Object"
				},
				"globalAgent": {
					"!type": "Object"
				},
				"IncomingMessage": {
					"!type": "Object"
				},
				"Server": {
					"!type": "fn()",
					"prototype": {
						"listen": {
							"!type": "fn(handle: Object, callback?: Object)"
						},
						"close": {
							"!type": "fn(callback?: Object)"
						},
						"setTimeout": {
							"!type": "fn(msecs: Object, callback: Object)"
						},
						"maxHeadersCount": {
							"!type": "Object"
						},
						"timeout": {
							"!type": "Object"
						}
					}
				},
				"ServerResponse": {
					"!type": "fn()",
					"prototype": {
						"writeContinue": {
							"!type": "fn()"
						},
						"writeHead": {
							"!type": "fn(statusCode: Object, reasonPhrase?: Object, headers?: Object)"
						},
						"setTimeout": {
							"!type": "fn(msecs: Object, callback: Object)"
						},
						"setHeader": {
							"!type": "fn(name: Object, value: Object)"
						},
						"getHeader": {
							"!type": "fn(name: Object)"
						},
						"removeHeader": {
							"!type": "fn(name: Object)"
						},
						"write": {
							"!type": "fn(chunk: Object, encoding?: Object)"
						},
						"addTrailers": {
							"!type": "fn(headers: Object)"
						},
						"end": {
							"!type": "fn(data?: Object, encoding?: Object)"
						},
						"statusCode": {
							"!type": "Object"
						},
						"headersSent": {
							"!type": "Object"
						},
						"sendDate": {
							"!type": "Object"
						}
					}
				},
				"Agent": {
					"!type": "fn()",
					"prototype": {
						"maxSockets": {
							"!type": "Object"
						},
						"sockets": {
							"!type": "Object"
						},
						"requests": {
							"!type": "Object"
						}
					}
				},
				"ClientRequest": {
					"!type": "fn()",
					"prototype": {
						"write": {
							"!type": "fn(chunk: Object, encoding?: Object)"
						},
						"end": {
							"!type": "fn(data?: Object, encoding?: Object)"
						},
						"abort": {
							"!type": "fn()"
						},
						"setTimeout": {
							"!type": "fn(timeout: Object, callback?: Object)"
						},
						"setNoDelay": {
							"!type": "fn(noDelay?: Object)"
						},
						"setSocketKeepAlive": {
							"!type": "fn(enable?: Object, initialDelay?: Object)"
						}
					}
				}
			},
			"https": {
				"createServer": {
					"!type": "fn(options: Object, requestListener?: Object)"
				},
				"request": {
					"!type": "fn(options: Object, callback: Object)"
				},
				"get": {
					"!type": "fn(options: Object, callback: Object)"
				},
				"globalAgent": {
					"!type": "Object"
				},
				"Server": {
					"!type": "fn()",
					"prototype": {}
				},
				"Agent": {
					"!type": "fn()",
					"prototype": {}
				}
			},
			"net": {
				"createServer": {
					"!type": "fn(options?: Object, connectionListener?: Object)"
				},
				"connect": {
					"!type": "fn(path: Object, connectListener?: Object)"
				},
				"createConnection": {
					"!type": "fn(path: Object, connectListener?: Object)"
				},
				"isIP": {
					"!type": "fn(input: Object)"
				},
				"isIPv4": {
					"!type": "fn(input: Object)"
				},
				"isIPv6": {
					"!type": "fn(input: Object)"
				},
				"Server": {
					"!type": "fn()",
					"prototype": {
						"listen": {
							"!type": "fn(handle: Object, callback?: Object)"
						},
						"close": {
							"!type": "fn(callback?: Object)"
						},
						"address": {
							"!type": "fn()"
						},
						"unref": {
							"!type": "fn()"
						},
						"ref": {
							"!type": "fn()"
						},
						"getConnections": {
							"!type": "fn(callback: Object)"
						},
						"maxConnections": {
							"!type": "Object"
						},
						"connections": {
							"!type": "Object"
						}
					}
				},
				"Socket": {
					"!type": "fn()",
					"prototype": {
						"Socket": {
							"!type": "fn(options?: Object)"
						},
						"connect": {
							"!type": "fn(path: Object, connectListener?: Object)"
						},
						"setEncoding": {
							"!type": "fn(encoding?: Object)"
						},
						"write": {
							"!type": "fn(data: Object, encoding?: Object, callback?: Object)"
						},
						"end": {
							"!type": "fn(data?: Object, encoding?: Object)"
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
						"setTimeout": {
							"!type": "fn(timeout: Object, callback?: Object)"
						},
						"setNoDelay": {
							"!type": "fn(noDelay?: Object)"
						},
						"setKeepAlive": {
							"!type": "fn(enable?: Object, initialDelay?: Object)"
						},
						"address": {
							"!type": "fn()"
						},
						"unref": {
							"!type": "fn()"
						},
						"ref": {
							"!type": "fn()"
						},
						"bufferSize": {
							"!type": "Object"
						},
						"remoteAddress": {
							"!type": "Object"
						},
						"remotePort": {
							"!type": "Object"
						},
						"localAddress": {
							"!type": "Object"
						},
						"localPort": {
							"!type": "Object"
						},
						"bytesRead": {
							"!type": "Object"
						},
						"bytesWritten": {
							"!type": "Object"
						}
					}
				}
			},
			"os": {
				"tmpdir": {
					"!type": "fn()"
				},
				"endianness": {
					"!type": "fn()"
				},
				"hostname": {
					"!type": "fn()"
				},
				"type": {
					"!type": "fn()"
				},
				"platform": {
					"!type": "fn()"
				},
				"arch": {
					"!type": "fn()"
				},
				"release": {
					"!type": "fn()"
				},
				"uptime": {
					"!type": "fn()"
				},
				"loadavg": {
					"!type": "fn()"
				},
				"totalmem": {
					"!type": "fn()"
				},
				"freemem": {
					"!type": "fn()"
				},
				"cpus": {
					"!type": "fn()"
				},
				"networkInterfaces": {
					"!type": "fn()"
				},
				"EOL": {
					"!type": "Object"
				}
			},
			"path": {
				"normalize": {
					"!type": "fn(p: Object)"
				},
				"join": {
					"!type": "fn(path1?: Object, path2?: Object, other?: Object)"
				},
				"resolve": {
					"!type": "fn(from: Object, to: Object)"
				},
				"relative": {
					"!type": "fn(from: Object, to: Object)"
				},
				"dirname": {
					"!type": "fn(p: Object)"
				},
				"basename": {
					"!type": "fn(p: Object, ext?: Object)"
				},
				"extname": {
					"!type": "fn(p: Object)"
				},
				"sep": {
					"!type": "Object"
				},
				"delimiter": {
					"!type": "Object"
				}
			},
			"Process": {
				"abort": {
					"!type": "fn()"
				},
				"chdir": {
					"!type": "fn(directory: Object)"
				},
				"cwd": {
					"!type": "fn()"
				},
				"exit": {
					"!type": "fn(code?: Object)"
				},
				"getgid": {
					"!type": "fn()"
				},
				"setgid": {
					"!type": "fn(id: Object)"
				},
				"getuid": {
					"!type": "fn()"
				},
				"setuid": {
					"!type": "fn(id: Object)"
				},
				"getgroups": {
					"!type": "fn()"
				},
				"setgroups": {
					"!type": "fn(groups: Object)"
				},
				"initgroups": {
					"!type": "fn(user: Object, extra_group: Object)"
				},
				"kill": {
					"!type": "fn(pid: Object, signal?: Object)"
				},
				"memoryUsage": {
					"!type": "fn()"
				},
				"nextTick": {
					"!type": "fn(callback: Object)"
				},
				"umask": {
					"!type": "fn(mask?: Object)"
				},
				"uptime": {
					"!type": "fn()"
				},
				"hrtime": {
					"!type": "fn()"
				},
				"stdout": {
					"!type": "+stream.Writable"
				},
				"stderr": {
					"!type": "Object"
				},
				"stdin": {
					"!type": "Object"
				},
				"argv": {
					"!type": "Object"
				},
				"execPath": {
					"!type": "Object"
				},
				"execArgv": {
					"!type": "Object"
				},
				"env": {
					"!type": "Object"
				},
				"version": {
					"!type": "Object"
				},
				"versions": {
					"!type": "Object"
				},
				"config": {
					"!type": "Object"
				},
				"pid": {
					"!type": "Object"
				},
				"title": {
					"!type": "Object"
				},
				"arch": {
					"!type": "Object"
				},
				"platform": {
					"!type": "Object"
				},
				"maxTickDepth": {
					"!type": "Object"
				}
			},
			"punycode": {
				"decode": {
					"!type": "fn(string: Object)"
				},
				"encode": {
					"!type": "fn(string: Object)"
				},
				"toUnicode": {
					"!type": "fn(domain: Object)"
				},
				"toASCII": {
					"!type": "fn(domain: Object)"
				},
				"ucs2": {
					"!type": "Object"
				},
				"version": {
					"!type": "Object"
				}
			},
			"querystring": {
				"stringify": {
					"!type": "fn(obj: Object, sep?: Object, eq?: Object)"
				},
				"parse": {
					"!type": "fn(str: Object, sep?: Object, eq?: Object, options?: Object)"
				},
				"escape": {
					"!type": "Object"
				},
				"unescape": {
					"!type": "Object"
				}
			},
			"readline": {
				"createInterface": {
					"!type": "fn(options: Object)"
				},
				"Interface": {
					"!type": "fn()",
					"prototype": {
						"setPrompt": {
							"!type": "fn(prompt: Object, length: Object)"
						},
						"prompt": {
							"!type": "fn(preserveCursor?: Object)"
						},
						"question": {
							"!type": "fn(query: Object, callback: Object)"
						},
						"pause": {
							"!type": "fn()"
						},
						"resume": {
							"!type": "fn()"
						},
						"close": {
							"!type": "fn()"
						},
						"write": {
							"!type": "fn(data: Object, key?: Object)"
						}
					}
				}
			},
			"repl": {
				"start": {
					"!type": "fn(options: Object)"
				}
			},
			"stream": {
				"Readable": {
					"!type": "fn()",
					"prototype": {
						"read": {
							"!type": "fn(size?: Object) -> String"
						},
						"setEncoding": {
							"!type": "fn(encoding: Object)"
						},
						"resume": {
							"!type": "fn()"
						},
						"pause": {
							"!type": "fn()"
						},
						"pipe": {
							"!type": "fn(destination: Object, options?: Object)"
						},
						"unpipe": {
							"!type": "fn(destination?: Object)"
						},
						"unshift": {
							"!type": "fn(chunk: Object)"
						},
						"wrap": {
							"!type": "fn(stream: Object)"
						}
					}
				},
				"Writable": {
					"!type": "fn()",
					"prototype": {
						"write": {
							"!type": "fn(chunk: Object, encoding?: Object, callback?: Object) -> Boolean"
						},
						"end": {
							"!type": "fn(chunk?: Object, encoding?: Object, callback?: Object)"
						}
					}
				},
				"Duplex": {
					"!type": "fn()",
					"prototype": {}
				},
				"Transform": {
					"!type": "fn()",
					"prototype": {}
				}
			},
			"string_decoder": {
				"StringDecoder": {
					"!type": "fn()",
					"prototype": {
						"write": {
							"!type": "fn(buffer: Object)"
						},
						"end": {
							"!type": "fn()"
						}
					}
				}
			},
			"timers": {
				"setTimeout": {
					"!type": "fn(callback: Object, delay: Object, arg?: Object, other?: Object)"
				},
				"clearTimeout": {
					"!type": "fn(timeoutId: Object)"
				},
				"setInterval": {
					"!type": "fn(callback: Object, delay: Object, arg?: Object, other?: Object)"
				},
				"clearInterval": {
					"!type": "fn(intervalId: Object)"
				},
				"unref": {
					"!type": "fn()"
				},
				"ref": {
					"!type": "fn()"
				},
				"setImmediate": {
					"!type": "fn(callback: Object, arg?: Object, other?: Object)"
				},
				"clearImmediate": {
					"!type": "fn(immediateId: Object)"
				}
			},
			"tls": {
				"getCiphers": {
					"!type": "fn()"
				},
				"createServer": {
					"!type": "fn(options: Object, secureConnectionListener?: Object)"
				},
				"connect": {
					"!type": "fn(port: Object, host?: Object, options?: Object, callback?: Object)"
				},
				"createSecurePair": {
					"!type": "fn(credentials?: Object, isServer?: Object, requestCert?: Object, rejectUnauthorized?: Object)"
				},
				"SLAB_BUFFER_SIZE": {
					"!type": "Object"
				},
				"SecurePair": {
					"!type": "fn()",
					"prototype": {}
				},
				"Server": {
					"!type": "fn()",
					"prototype": {
						"listen": {
							"!type": "fn(port: Object, host?: Object, callback?: Object)"
						},
						"close": {
							"!type": "fn()"
						},
						"address": {
							"!type": "fn()"
						},
						"addContext": {
							"!type": "fn(hostname: Object, credentials: Object)"
						},
						"maxConnections": {
							"!type": "Object"
						},
						"connections": {
							"!type": "Object"
						}
					}
				},
				"CryptoStream": {
					"!type": "fn()",
					"prototype": {
						"bytesWritten": {
							"!type": "Object"
						}
					}
				},
				"CleartextStream": {
					"!type": "fn()",
					"prototype": {
						"getPeerCertificate": {
							"!type": "fn()"
						},
						"getCipher": {
							"!type": "fn()"
						},
						"address": {
							"!type": "fn()"
						},
						"authorized": {
							"!type": "Object"
						},
						"authorizationError": {
							"!type": "Object"
						},
						"remoteAddress": {
							"!type": "Object"
						},
						"remotePort": {
							"!type": "Object"
						}
					}
				}
			},
			"tty": {
				"isatty": {
					"!type": "fn(fd: Object)"
				},
				"setRawMode": {
					"!type": "fn(mode: Object)"
				},
				"ReadStream": {
					"!type": "fn()",
					"prototype": {
						"setRawMode": {
							"!type": "fn(mode: Object)"
						},
						"isRaw": {
							"!type": "Object"
						}
					}
				},
				"WriteStream": {
					"!type": "fn()",
					"prototype": {
						"columns": {
							"!type": "Object"
						},
						"rows": {
							"!type": "Object"
						}
					}
				}
			},
			"url": {
				"parse": {
					"!type": "fn(urlStr: Object, parseQueryString?: Object, slashesDenoteHost?: Object)"
				},
				"format": {
					"!type": "fn(urlObj: Object)"
				},
				"resolve": {
					"!type": "fn(from: Object, to: Object)"
				}
			},
			"util": {
				"format": {
					"!type": "fn(format: Object, other?: Object)"
				},
				"debug": {
					"!type": "fn(string: Object)"
				},
				"error": {
					"!type": "fn(other?: Object)"
				},
				"puts": {
					"!type": "fn(other?: Object)"
				},
				"print": {
					"!type": "fn(other?: Object)"
				},
				"log": {
					"!type": "fn(string: Object)"
				},
				"inspect": {
					"!type": "fn(object: Object, options?: Object)"
				},
				"isArray": {
					"!type": "fn(object: Object)"
				},
				"isRegExp": {
					"!type": "fn(object: Object)"
				},
				"isDate": {
					"!type": "fn(object: Object)"
				},
				"isError": {
					"!type": "fn(object: Object)"
				},
				"pump": {
					"!type": "fn(readableStream: Object, writableStream: Object, callback?: Object)"
				},
				"inherits": {
					"!type": "fn(constructor: Object, superConstructor: Object)"
				}
			},
			"vm": {
				"runInThisContext": {
					"!type": "fn(code: Object, filename?: Object)"
				},
				"runInNewContext": {
					"!type": "fn(code: Object, sandbox?: Object, filename?: Object)"
				},
				"runInContext": {
					"!type": "fn(code: Object, context: Object, filename?: Object)"
				},
				"createContext": {
					"!type": "fn(initSandbox?: Object)"
				},
				"createScript": {
					"!type": "fn(code: Object, filename?: Object)"
				},
				"Script": {
					"!type": "fn()",
					"prototype": {
						"runInThisContext": {
							"!type": "fn()"
						},
						"runInNewContext": {
							"!type": "fn(sandbox?: Object)"
						}
					}
				}
			},
			"zlib": {
				"createGzip": {
					"!type": "fn(options?: Object)"
				},
				"createGunzip": {
					"!type": "fn(options?: Object)"
				},
				"createDeflate": {
					"!type": "fn(options?: Object)"
				},
				"createInflate": {
					"!type": "fn(options?: Object)"
				},
				"createDeflateRaw": {
					"!type": "fn(options?: Object)"
				},
				"createInflateRaw": {
					"!type": "fn(options?: Object)"
				},
				"createUnzip": {
					"!type": "fn(options?: Object)"
				},
				"deflate": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"deflateRaw": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"gzip": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"gunzip": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"inflate": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"inflateRaw": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"unzip": {
					"!type": "fn(buf: Object, callback: Object)"
				},
				"Zlib": {
					"!type": "fn()",
					"prototype": {
						"flush": {
							"!type": "fn(callback: Object)"
						},
						"reset": {
							"!type": "fn()"
						}
					}
				},
				"Gzip": {
					"!type": "fn()",
					"prototype": {}
				},
				"Gunzip": {
					"!type": "fn()",
					"prototype": {}
				},
				"Deflate": {
					"!type": "fn()",
					"prototype": {}
				},
				"Inflate": {
					"!type": "fn()",
					"prototype": {}
				},
				"DeflateRaw": {
					"!type": "fn()",
					"prototype": {}
				},
				"InflateRaw": {
					"!type": "fn()",
					"prototype": {}
				},
				"Unzip": {
					"!type": "fn()",
					"prototype": {}
				}
			}
		},
		"!name": "node",
		"this": "<top>",
		"global": "<top>",
		"buffer": "buffer",
		"Buffer": "buffer.Buffer",
		"require": {
			"!type": "fn(name: String) -> Object"
		},
		"__filename": "String",
		"__dirname": "String",
		"module": "Object",
		"exports": "Object",
		"setTimeout": {
			"!type": "fn(cb: Object, ms: Number) -> Object"
		},
		"clearTimeout": {
			"!type": "fn(t: Object)"
		},
		"setInterval": {
			"!type": "fn(cb: Object, ms: Number) -> Object"
		},
		"clearInterval": {
			"!type": "fn(t: Object)"
		}
	};
});