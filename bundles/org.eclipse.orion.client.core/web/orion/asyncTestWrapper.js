/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*global jstestdriver AsyncTestCase fail*/
/*global eclipse console define*/

define( ['orion/Deferred', 'orion/serviceregistry', 'orion/pluginregistry'], function(Deferred, mServiceregistry, mPluginregistry){
	
	function TestLoader(test) {
		/* This loader is a single test on the main suite, the loader test
		 * is finished once we have loaded the test plugin and retrieved the list of tests it contains.
		 * Once the all the suite's load tests are done, then the real tests are ready to go.
		 */

		var noop, errback;
		var deferred = new Deferred();
		var testSuite = {};
		
				
		this.testName = test;
		
		/* This is the TestCase which will hold all the tests for the given test plugin */
		this.testCase = function() {}; //AsyncTestCase(test);	
		
		function _launch(queue) {
			/* The entire test service is run in the queue for the first jstestdriver test
			   This is because in between jstestdriver tests, the html body is cleared and we lose the 
			   service registry.
			 */
			for (var property in testSuite) {
				if (property.match(/^test.+/)) {
					testSuite[property].testMethod(queue);
				}
			}
			
			var loaderServiceRegistry = new mServiceregistry.ServiceRegistry();
			var loaderPluginRegistry = new mPluginregistry.PluginRegistry(loaderServiceRegistry, {storage:{}});
			loaderPluginRegistry.installPlugin(test).then(function(plugin) {
				return plugin.start();
			}).then(function() {
				var references = loaderServiceRegistry.getServiceReferences("orion.test.runner");
				var testRunDeferreds = [];
				
				for(var i =0; i < references.length; i++) {
					var service = loaderServiceRegistry.getService(references[i]);
					service.addEventListener("testDone", function(event) {
						if (typeof testSuite[event.name] !== "undefined") {
							testSuite[event.name].testDone(event.result);
						}
					});
					console.log("Launching test suite: " + test);
					testRunDeferreds.push(service.run());
				}
				return Deferred.all(testRunDeferreds, function(){}).then( function() {
					loaderPluginRegistry.stop();
				});
			});
		}
		
		var first = true;
		function createTest(testName) {
			return function(queue) {
				if (first) {
					_launch(queue);
					first = false;
				}
	
				queue.call("Results: " + testName, function(callbacks) {
					/* At this point, all tests are finished, we are just reporting results */
					if (testSuite[testName].testResult.result !== true) {
						fail(testSuite[testName].testResult.message);
					}
				});
			};
		}
			
		/* Loading the test methods, #ready is called once we have the set of tests to run 
		   #error is called if there is a problem loading the test plugin */
		this.loadMethod = function(queue) {
			queue.call("Load test " + test, function(callbacks) {
				noop = callbacks.noop();
				errback = callbacks.addErrback('Error');
				deferred.resolve();
			});
		};
		
		this.ready = function(suite) {
			var that = this;
			deferred.then(function() { 
				testSuite = suite;
							
				for(var testName in suite) {
					if(suite.hasOwnProperty(testName)) {
						that.testCase.prototype[testName] = createTest(testName);
					}
				}
				
				var testCaseInfo = new jstestdriver.TestCaseInfo(test, that.testCase, jstestdriver.TestCaseInfo.ASYNC_TYPE);		
				jstestdriver.testRunner.testRunsConfiguration_.push(testCaseInfo.getDefaultTestRunConfiguration());
				noop(); 
			});
		};
		
		this.error = function(e) {
			deferred.then(function(msg) {
				errback(msg);
			}(e));
		};
	}
	
	function createAsyncTest(testName, test) {
		/* This is a single jstestdriver async test case, it is just a placeholder and 
		 * testDone() will be called when the real test is finished
		 */
		var noop, errback, deferred = new Deferred();
		
		function testMethod(queue) {
			/* jstestdriver calls this method to run the test */
			queue.call("Run test " + testName, function(callbacks) {
				noop = callbacks.noop();
				errback = callbacks.addErrback("Error");
				deferred.resolve();
			});
		}
		
		function testDone(testResult) {
			this.testResult = testResult;
			/* the real test has completed, mark the jstestdriver test as complete */
			
			deferred.then(function() {
				if (testResult.result) {
					noop();
				} else {
					errback(testResult.message);
				}
			});
		}
		
		return {testMethod: testMethod, testDone: testDone};
	}
	
	
	function _loadTests(fileURI) {	 
		var loader = new TestLoader(fileURI);
		var testServiceRegistry = new mServiceregistry.ServiceRegistry();
		var testPluginRegistry = new mPluginregistry.PluginRegistry(testServiceRegistry, {storage:{}});
		
		/* Install the test plugin and get the list of tests it contains */
		return testPluginRegistry.installPlugin(fileURI).then(function(plugin) {
			return plugin.start();
		}).then(function() {
			var references = testServiceRegistry.getServiceReferences("orion.test.runner");
			var testRunDeferreds = [];

			var testSuite = {};				
			for(var i =0; i < references.length; i++) {
				var service = testServiceRegistry.getService(references[i]);

				testRunDeferreds.push(service.list().then(function(testNames) {
					var testName;
					/* for each test in the suite, hook up an jstestdriver async test */
					for (var j = 0; j < testNames.length; j++) {
						testName = testNames[j];
						testSuite[testName] = createAsyncTest(testName);
					} 
					console.log(fileURI + " : registered " + testNames.length + " tests" );
				}));
			}
			
			return Deferred.all(testRunDeferreds, function(){}).then( function() {
				testPluginRegistry.stop();
				loader.ready(testSuite);
				return loader;
			});
		});
	}

	function JSTestAdapter() {
	}
	
	JSTestAdapter.runTests = function(suiteName, testURIs) {
		var loaders = [];
		for (var i = 0; i < testURIs.length; i++) {
			loaders.push(_loadTests(testURIs[i]));
		}
		return Deferred.all(loaders, function(){}).then(function(results) {
			var OrionTestLoader = new AsyncTestCase(suiteName);
			for(var i = 0; i < results.length; i++) {
				var test = results[i][1];		
				if (test.testName) {
					OrionTestLoader.prototype["testLoader " + test.testName] = test.loadMethod;
				}
			}
			
			var testCaseInfo = new jstestdriver.TestCaseInfo(suiteName, OrionTestLoader, jstestdriver.TestCaseInfo.ASYNC_TYPE);		
			jstestdriver.testRunner.testRunsConfiguration_.push(testCaseInfo.getDefaultTestRunConfiguration());
		});
	};
	return {JSTestAdapter: JSTestAdapter};

});
