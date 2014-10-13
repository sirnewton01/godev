/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define([
	'chai/chai',
	'orion/contentTypes',
	'orion/serviceregistry',
	'orion/Deferred',
	'orion/objects',
], function(chai, mContentTypes, mServiceRegistry, Deferred, objects) {
	var assert = chai.assert;
	var ServiceRegistry = mServiceRegistry.ServiceRegistry;
	var ContentTypeRegistry = mContentTypes.ContentTypeRegistry;

	function assertContentTypesEqual(expected, actual){ 
		var a = expected, b = actual;
		if (!a || !b) {
			return assert.equal(a, b);
		}
		assert.equal(a.id, b.id, "ids match");
		assert.equal(a.name, b.name, "names match");
		if (a['extends'] || b['extends']) {
			assert.equal(a['extends'], b['extends'], "extends match");
		}
		if (a.extension || b.extension) {
			assert.deepEqual((a.extension && a.extension.length) || [], (b.extension && b.extension.length) || [], "extensions match");
		}
		if (a.filename || b.filename) {
			assert.deepEqual((a.filename && a.filename.length) || [], (b.filename && b.filename.length) || [], "filenames match");
		}
	}

	/**
	 * @param {Boolean} [useServiceRegistry=true] true: use Service Registry to construct the ContentTypeRegistry.
	 * false: use array of content type data.
	 * @param {Function} testbody
	 */
	function _withTestData(useServiceRegistry, testbody) {
		useServiceRegistry = typeof useServiceRegistry === "undefined" ? true : useServiceRegistry;
		var serviceRegistry, contentTypeService, basicTypes, dataSource;
		basicTypes = [
			{
				id: 'orion/test0',
				name: 'Basic 0'
			}, {
				id: 'orion/test1',
				name: 'Basic 1',
				'extends' : 'orion/test0'
			}, {
				id: 'orion/test2',
				name: 'Basic 2',
				extension: ['xml', 'txt']
			}, {
				id: 'orion/test3',
				name: 'Basic 3',
				filename: ['garbage', 'build.xml']
			}, {
				id: 'orion/test4',
				name: 'Basic 4',
				image: 'http://example.org/foo.png',
				imageClass: 'imageFoo'
			}, {
				id: 'orion/test5',
				name: 'Basic 5',
				extension: ['file.xml']
			}, {
				id: 'orion/test6',
				name: 'Basic 6',
				filename: ['exactfilematch', 'exactfilenamematch']
			} ];
		if (useServiceRegistry) {
			dataSource = serviceRegistry = new ServiceRegistry();
			serviceRegistry.registerService("orion.core.contenttype", {}, {
				contentTypes: basicTypes
			});
		} else {
			dataSource = basicTypes;
		}
		contentTypeService = new ContentTypeRegistry(dataSource);
		testbody(serviceRegistry, contentTypeService, basicTypes);
	}

	/*
	 * Common test data for constructing the 'with' and 'without' ServiceRegistry cases.
	 * Each test function should call `this.withTestData` to perform its setup, or check 
	 * `this.useServiceRegistry` to see what kind of test it should be running.
	 */
	var testData = {
		getContentTypes: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				contentTypeService.getContentTypes().every(function(type, i) {
					assertContentTypesEqual(basicTypes[i], type);
				});
			});
		},

		getContentTypesMap: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				var map = contentTypeService.getContentTypesMap();
				Object.keys(map).forEach(function(contentTypeId) {
					var type = null;
					basicTypes.some(function(elem, i) {
						if (elem.id === contentTypeId) {
							type = elem;
							return true;
						}
					});
					assert.notEqual(type, null);
					assertContentTypesEqual(type, map[contentTypeId]);
				});
			});
		},

		getContentType: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				basicTypes.forEach(function(contentType) {
					assertContentTypesEqual(contentType, contentTypeService.getContentType(contentType.id));
				});
			});
		},

		getFileContentType: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				var fileMetadata1 = {
					Name: "zzzdoesnotmatchanythingzzz"
				},
				fileMetadata2 = {
					Name: "test.foo.xml"
				},
				fileMetadata3 = {
					Name: "test.file.txt"
				},
				fileMetadata4 = {
					Name: "build.xml"
				},
				fileMetadata5 = {
					Name: "test.file.xml"
				},
				fileMetadata6 = {
					Name: "exactfilenamematch"
				};
				
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata1), null, "No content type for unrecognized file");
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata2), basicTypes[2], "Extension match");
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata3), basicTypes[2], "Extension match");
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata4), basicTypes[3], "Filename match beats extension match");
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata5), basicTypes[5], "Filename match");
				assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata6), basicTypes[6], "Extension match takes longest extension");
			});
		},

		getFilenameContentType: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				assertContentTypesEqual(contentTypeService.getFilenameContentType("zzzdoesnotmatchanythingzzz"), null, "No content type for unrecognized file");
				assertContentTypesEqual(contentTypeService.getFilenameContentType("test.foo.xml"), basicTypes[2], "Extension match");
				assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.txt"), basicTypes[2], "Extension match");
				assertContentTypesEqual(contentTypeService.getFilenameContentType("build.xml"), basicTypes[3], "Filename match beats extension match");
				assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.xml"), basicTypes[5], "Filename match");
				assertContentTypesEqual(contentTypeService.getFilenameContentType("exactfilenamematch"), basicTypes[6], "Extension match takes longest extension");
			});
		},

		isExtensionOf: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				function assertIsExtensionOf(typeA, typeB, expected, msg) {
					// Test calling both by ContentType object and by String ID:
					assert.equal(contentTypeService.isExtensionOf(typeA, typeB), expected, msg);
					assert.equal(contentTypeService.isExtensionOf(typeA.id, typeB.id), expected, msg);
				}
				assertIsExtensionOf(basicTypes[0], basicTypes[0], true, "Basic 0 extends itself");
				assertIsExtensionOf(basicTypes[1], basicTypes[0], true, "Basic 1 extends Basic 0");
				assertIsExtensionOf(basicTypes[2], basicTypes[0], false);
				assertIsExtensionOf(basicTypes[3], basicTypes[0], false);

				assertIsExtensionOf(basicTypes[0], basicTypes[1], false);
				assertIsExtensionOf(basicTypes[1], basicTypes[1], true);
				assertIsExtensionOf(basicTypes[2], basicTypes[1], false);
				assertIsExtensionOf(basicTypes[3], basicTypes[1], false);

				assertIsExtensionOf(basicTypes[0], basicTypes[2], false);
				assertIsExtensionOf(basicTypes[1], basicTypes[2], false);
				assertIsExtensionOf(basicTypes[2], basicTypes[2], true);
				assertIsExtensionOf(basicTypes[3], basicTypes[2], false);

				assertIsExtensionOf(basicTypes[0], basicTypes[3], false);
				assertIsExtensionOf(basicTypes[1], basicTypes[3], false);
				assertIsExtensionOf(basicTypes[2], basicTypes[3], false);
				assertIsExtensionOf(basicTypes[3], basicTypes[3], true);
			});
		},

		// Note this one does not call `withTestData`
		isExtensionOf_bad: function() {
			var bad = {
				id: 'orion/test4',
				name: 'Bad',
				'extends': 'orion/test4'
			};
			var contentTypeService;
			if (this.useServiceRegistry) {
				var serviceRegistry = new ServiceRegistry();
				serviceRegistry.registerService("orion.core.contenttype", {}, {
					contentTypes: [ bad ]
				});
				contentTypeService = new ContentTypeRegistry(serviceRegistry);
			} else {
				contentTypeService = new ContentTypeRegistry([ bad ]);
			}
			Deferred.when(contentTypeService.isExtensionOf(bad, bad)).then(assert.fail);
		},

		isSomeExtensionOf: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				function assertIsSomeExtensionOf(type, types, expected, msg) {
					assert.equal(contentTypeService.isSomeExtensionOf(type, types), expected, msg);
					var typeIds = types.map(function(type) { return type.id; });
					assert.equal(contentTypeService.isSomeExtensionOf(type.id, typeIds), expected, msg);
				}

				assertIsSomeExtensionOf(basicTypes[0], basicTypes, true);
				assertIsSomeExtensionOf(basicTypes[1], basicTypes, true);
				assertIsSomeExtensionOf(basicTypes[2], basicTypes, true);
				assertIsSomeExtensionOf(basicTypes[3], basicTypes, true);

				assertIsSomeExtensionOf(basicTypes[0], [ basicTypes[0] ], true);
				assertIsSomeExtensionOf(basicTypes[1], [ basicTypes[0] ], true);
				assertIsSomeExtensionOf(basicTypes[2], [ basicTypes[0] ], false);
				assertIsSomeExtensionOf(basicTypes[3], [ basicTypes[0] ], false);

				assertIsSomeExtensionOf(basicTypes[1], [ basicTypes[0], basicTypes[2] ], true);

				assertIsSomeExtensionOf(basicTypes[3], [], false);
			});
		},

		extensionsCaseMismatch: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				var type1 = contentTypeService.getFilenameContentType('test.TXT');
				var type2 = contentTypeService.getFilenameContentType('test.txt');
				var type3 = contentTypeService.getFilenameContentType('test.TxT');
				assertContentTypesEqual(type1, type2);
				assertContentTypesEqual(type2, type3);
			});
		},

		image: function() {
			this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
				var type4;
				contentTypeService.getContentTypes().some(function(ct) {
					if (ct.id === 'orion/test4') {
						type4 = ct;
						return true;
					}
				});
				assert.equal(type4.image, 'http://example.org/foo.png');
				assert.equal(type4.imageClass, 'imageFoo');
			});
		},
	};

	/**
	 * Constructs a "with serviceRegistry" and "without serviceRegistry" test.
	 * @param {Function} callback
	 */
	function forEachTestData(callback) {
		Object.keys(testData).forEach(function(name) {
			var testBody = testData[name];
			callback(name, testBody);
		});
	}

	describe("Content Types", function() {
		it("new ContentTypeRegistry", function() {
			assert.throws(function() { new ContentTypeRegistry(); });
			assert.throws(function() { new ContentTypeRegistry(null); });
			assert.throws(function() { new ContentTypeRegistry("zzzz"); });
		});

		/**
		 * Create tests that construct ContentTypesRegistry with a service registry.
		 */
		describe("with ServiceRegistry", function() {
			forEachTestData(function(basename, testBody) {
				var boundBody = testBody.bind({
					useServiceRegistry: true,
					withTestData: _withTestData.bind(null, true)
				});
				boundBody.toString = Function.prototype.toString.bind(testBody); // show original source
				it(basename, boundBody);
			});
		});

		/**
		 * Create tests that construct ContentTypesRegistry with static data, no service registry.
		 */
		describe("no ServiceRegistry", function() {
			forEachTestData(function(basename, testBody) {
				var boundBody = testBody.bind({
					useServiceRegistry: false,
					withTestData: _withTestData.bind(null, false)
				});
				boundBody.toString = Function.prototype.toString.bind(testBody);
				it(basename + " no ServiceRegistry", boundBody);
			});
		});
	});

});
