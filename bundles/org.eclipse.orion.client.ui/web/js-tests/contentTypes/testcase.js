/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window*/
define(['orion/assert', 'orion/contentTypes', 'orion/serviceregistry'], function(assert, contentTypesModule, serviceRegistry) {
	// Helper to avoid having to deal with the asynchronousness of a real serviceregistry
	var MockServiceRegistry = (function() {
		function mixinMethods(target, source) {
			Object.keys(source).forEach(function(prop) {
				var method = source[prop];
				if (typeof method === "function") {
					this[prop] = method.bind(source);
				}
			});
		}

		function MockServiceReference(implementation, properties) {
			this.implementation = implementation;
			this.properties = properties;
			mixinMethods(this, implementation);
		}
		MockServiceReference.prototype = {
			getProperty: function(name) {
				return this.properties[name];
			}
		};

		function MockServiceRegistry() {
			this.services = {};
			this.serviceReferences = {};
		}
		MockServiceRegistry.prototype = {
			_registerServiceProvider: function(name, implementation, properties) {
				this.serviceReferences[name] = this.serviceReferences[name] || [];
				this.serviceReferences[name].push(new MockServiceReference(implementation, properties));
			},
			getServiceReferences: function(name) {
				return this.serviceReferences[name] || [];
			},
			registerService: function(id, implementation) {
				this.services[id] = {};
				mixinMethods(this.services[id], implementation);
			},
			getService: function(id) {
				return this.services[id];
			}
		};
		return MockServiceRegistry;
	}());

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

	function withTestData(testbody) {
		var mockRegistry, contentTypeService, basicTypes;
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
			} ];
		mockRegistry = new MockServiceRegistry();
		mockRegistry._registerServiceProvider("orion.core.contenttype", {}, {
				contentTypes: basicTypes
			});
		contentTypeService = new contentTypesModule.ContentTypeRegistry(mockRegistry);
		testbody(mockRegistry, contentTypeService, basicTypes);
	}

	var tests = {};
	tests.test_getContentTypes = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
			contentTypeService.getContentTypes().every(function(type, i) {
				assertContentTypesEqual(basicTypes[i], type);
			});
		});
	};

	tests.test_getContentTypesMap = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
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
	};

	tests.test_getContentType = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
			basicTypes.forEach(function(contentType) {
				assertContentTypesEqual(contentType, contentTypeService.getContentType(contentType.id));
			});
		});
	};

	tests.test_getFileContentType = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
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
	};

	tests.test_getFilenameContentType = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
			assertContentTypesEqual(contentTypeService.getFilenameContentType("aaaaaaa"), null, "No content type for unrecognized file");
			assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.xml"), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFilenameContentType("test.file.txt"), basicTypes[2]);
			assertContentTypesEqual(contentTypeService.getFilenameContentType("build.xml"), basicTypes[3], "filename match beats extension match");
		});
	};

	tests.test_isExtensionOf = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
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
	};

	tests.test_isExtensionOf2 = function() {
		var bad = {
			id: 'orion/test4',
			name: 'Bad',
			'extends': 'orion/test4'
		};
		var mockRegistry = new MockServiceRegistry();
		mockRegistry._registerServiceProvider("orion.core.contenttype", {}, {
			contentTypes: [ bad ]
		});
		var contentTypeService = new contentTypesModule.ContentTypeRegistry(mockRegistry);
		assert.throws(function() {
				contentTypeService.isExtensionOf(bad, bad);
			}, Error, "Cycle detected");
	};

	tests.test_isSomeExtensionOf = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
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
	};

	tests.testExtensionsCaseMismatch = function() {
		withTestData(function(mockRegistry, contentTypeService, basicTypes) {
			var type1 = contentTypeService.getFilenameContentType('test.TXT');
			var type2 = contentTypeService.getFilenameContentType('test.txt');
			var type3 = contentTypeService.getFilenameContentType('test.TxT');
			assertContentTypesEqual(type1, type2);
			assertContentTypesEqual(type2, type3);
		});
	};

	return tests;
});
