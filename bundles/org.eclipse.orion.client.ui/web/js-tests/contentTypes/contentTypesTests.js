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
/*global define window*/
define([
	'orion/assert',
	'orion/contentTypes',
	'orion/serviceregistry'
], function(assert, mContentTypes, mServiceRegistry) {
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
	 * @param {Boolean} [useServiceRegistry=true] true: use Service Registry to construct the ContentTypeRegistry. false:
	 * use array of content type data.
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
				filename: ['build.xml']
			}, {
				id: 'orion/test4',
				name: 'Basic 4',
				image: 'http://example.org/foo.png',
				imageClass: 'imageFoo'
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

	/**
	 * Constructs a "with serviceRegistry" and "without serviceRegistry" test.
	 * @param {Function} testBody should call `this.withTestData` to perform its setup, or check `this.useServiceRegistry`
	 * to see what kind of test it should be running.
	 */
	function makeTests(tests, basename, testBody) {
		tests["test_" + basename] = testBody.bind({
			useServiceRegistry: true,
			withTestData: _withTestData.bind(null, true)
		});
		tests["test_" + basename + "_no_serviceRegistry"] = testBody.bind({
			useServiceRegistry: false,
			withTestData: _withTestData.bind(null, false)
		});
	}

	var tests = {};

	tests.test_new_ContentTypeRegistry = function() {
		assert.throws(function() { new ContentTypeRegistry(); });
		assert.throws(function() { new ContentTypeRegistry(null); });
		assert.throws(function() { new ContentTypeRegistry("zzzz"); });
	};

	makeTests(tests, "getContentTypes", function() {
		this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
			contentTypeService.getContentTypes().every(function(type, i) {
				assertContentTypesEqual(basicTypes[i], type);
			});
		});
	});

	makeTests(tests, "getContentTypesMap", function() {
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
	});

	makeTests(tests, "getContentType", function() {
		this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
			basicTypes.forEach(function(contentType) {
				assertContentTypesEqual(contentType, contentTypeService.getContentType(contentType.id));
			});
		});
	});

	makeTests(tests, "getFileContentType", function() {
		this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
			var fileMetadata1 = {
				Name: "aaaaaaaaaaa"
			},
			fileMetadata2 = {
				Name: "test.file.xml"
			},
			fileMetadata3 = {
				Name: "test.file.txt"
			},
			fileMetadata4 = {
				Name: "build.xml"
			};
			assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata1), null, "No content type for unrecognized file");
			assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata2), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata3), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFileContentType(fileMetadata4), basicTypes[3], "filename match beats extension match");
		});
	});

	makeTests(tests, "getFilenameContentType", function() {
		this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
			assertContentTypesEqual(contentTypeService.getFilenameContentType("aaaaaaa"), null, "No content type for unrecognized file");
			assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.xml"), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.txt"), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFilenameContentType("build.xml"), basicTypes[3], "filename match beats extension match");
		});
	});

	makeTests(tests, "isExtensionOf", function() {
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
	});

	// Note this one does not call `withTestData`
	tests.test_isExtensionOf_bad = function() {
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
		assert.throws(function() {
			contentTypeService.isExtensionOf(bad, bad);
		}, Error, "Cycle detected");
	};

	makeTests(tests, "isSomeExtensionOf", function() {
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
	});

	makeTests(tests, "extensionsCaseMismatch", function() {
		this.withTestData(function(serviceRegistry, contentTypeService, basicTypes) {
			var type1 = contentTypeService.getFilenameContentType('test.TXT');
			var type2 = contentTypeService.getFilenameContentType('test.txt');
			var type3 = contentTypeService.getFilenameContentType('test.TxT');
			assertContentTypesEqual(type1, type2);
			assertContentTypesEqual(type2, type3);
		});
	});

	makeTests(tests, "image", function() {
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
	});

	return tests;
});
