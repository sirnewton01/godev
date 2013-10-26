/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andrew Eisenberg (VMware) - added entry for esprima tests
 *******************************************************************************/
/*global console TestCase require jstestdriver*/
var requireJSConfig = {
	baseUrl: '/',
	paths: {
		text: 'requirejs/text',
		i18n: 'requirejs/i18n',
		domReady: 'requirejs/domReady'
	}
};
require(requireJSConfig);

var ORION_TYPE = 'orion test case';
var ORION_UI_TYPE = 'orion ui test case';
function OrionTestCase(name, uri) {
	return TestCase(name, {uri: uri}, ORION_TYPE);
}
function OrionUITestCase(name, uri) {
	return TestCase(name, {uri: uri}, ORION_UI_TYPE);
}

jstestdriver.pluginRegistrar.register({
	name: 'orion',
	getTestRunsConfigurationFor: function (testCaseInfos, expressions, testRunsConfiguration) {
		for (var i = 0; i < testCaseInfos.length; i++) {
		var type = testCaseInfos[i].getType();
			if (type === ORION_TYPE || type === ORION_UI_TYPE) {
				testRunsConfiguration.push(new jstestdriver.TestRunConfiguration(testCaseInfos[i], []));
			}
		}
		return false;
	},
	runTestConfiguration: function (config, onTestDone, onComplete) {
		var type = config.getTestCaseInfo().getType();
		if (type !== ORION_TYPE && type !== ORION_UI_TYPE) {
			return false;
		}

		var testCaseName = config.getTestCaseInfo().getTestCaseName();
		var testURI = config.getTestCaseInfo().getTemplate().prototype.uri;

		require(['orion/Deferred', 'orion/serviceregistry', 'orion/pluginregistry'], function (Deferred, mServiceregistry, mPluginregistry) {
			var loaderServiceRegistry = new mServiceregistry.ServiceRegistry();
			var loaderPluginRegistry = new mPluginregistry.PluginRegistry(loaderServiceRegistry, {storage:{}, visible: type === ORION_UI_TYPE});
			loaderPluginRegistry.start().then(function() {
				loaderPluginRegistry.installPlugin(testURI).then(function(plugin) {
					plugin.start();
				}).then(function() {
					var references = loaderServiceRegistry.getServiceReferences("orion.test.runner");
					var testRunDeferreds = [];
	
					for (var i = 0; i < references.length; i++) {
						var service = loaderServiceRegistry.getService(references[i]);
						service.addEventListener("testDone", function (event) {
							onTestDone(new jstestdriver.TestResult(testCaseName, event.name, event.result ? "passed" : "failed", event.message || "", "", event.elapsed));
						});
						testRunDeferreds.push(service.run());
					}
					return Deferred.all(testRunDeferreds, function() {}).then(function () {
						return loaderPluginRegistry.stop().then(onComplete);
					});
				});
			}, function() {
				onTestDone(new jstestdriver.TestResult(testCaseName, "testSuiteLoader", "error", "failed to load " + testURI, "", 0));
				return loaderPluginRegistry.stop().then(onComplete);
			});
		});
		return true;
	}
});

// list your test cases here....
OrionTestCase("commonjs-unittesting", "/js-tests/commonjs-unittesting/test.html");
OrionTestCase("charDiff", "/js-tests/charDiff/test.html");
OrionTestCase("compare", "/js-tests/compare/test.html");
OrionTestCase("globalSearch", "/js-tests/globalSearch/test.html");
OrionTestCase("urlUtils", "/js-tests/urlUtils/test.html");
OrionTestCase("serviceRegistry", "/js-tests/serviceRegistry/test.html");
OrionTestCase("preferences", "/js-tests/preferences/test.html");
OrionTestCase("pluginRegistry", "/js-tests/pluginRegistry/test.html");
OrionTestCase("testRunAsynch", "/js-tests/testRunAsynch/test.html");
OrionTestCase("editor", "/js-tests/editor/test.html");
OrionTestCase("textMateStyler", "/js-tests/editor/textMateStyler/test.html");
OrionTestCase("textview", "/js-tests/editor/test-models.html");
OrionTestCase("contentAssist", "/js-tests/editor/contentAssist/test.html");
OrionTestCase("jsTemplateContentAssist", "/js-tests/jsTemplateContentAssist/test.html");
OrionTestCase("contentTypes", "/js-tests/contentTypes/test.html");
OrionTestCase("extensionParsing", "/js-tests/extensionParsing/test.html");
OrionTestCase("xhr", "/js-tests/xhr/test.html");
OrionTestCase("config", "/js-tests/config/test.html");
OrionTestCase("metatype", "/js-tests/metatype/test.html");
OrionTestCase("setting", "/js-tests/settings/test.html");
OrionTestCase("esprima-content-assist", "/js-tests/esprima/esprimaJsContentAssistTests.html");
OrionTestCase("index-file-parsing", "/js-tests/esprima/indexFileParsingTests.html");
OrionTestCase("asyncStyler", "/js-tests/asyncStyler/test.html");
//OrionTestCase("ast", "/js-tests/ast/test.html");
OrionTestCase("commands", "/js-tests/commands/test.html");

//OrionTestCase("searchRendering", "/js-tests/searchRendering/test.html");
//OrionUITestCase("textviewPerformance", "/js-tests/editor/test-performance.html");



