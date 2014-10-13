/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser,amd*/
/*eslint no-new-func:0*/
/*global console:true TextEncoder*/

/**
 * Wrapper for mocha that exposes mocha test results to Sauce Labs.
 * 
 * To run on Sauce Labs, a test page must use the wrapped `mocha` object returned by this module,
 * instead of the regular global `mocha`. For example:
 * <pre>
 *     define(["mocha/sauce"], function(mochaSauce) {
 *         mochaSauce.setup("bdd");
 *         // load your tests here
 *         mochaSauce.run();
 *     });
 * </pre>
 */
define([
	"orion/Base64",
	"pako/pako",
	"orion/objects",
	"mocha/mocha", // no exports
	"orion/encoding-shim", // no exports
], function(Base64, pako, objects) {
	// this is done to allow us to get the global even in strict mode
	var global = new Function("return this")();
	// Try to filter non-xunit log messages, so tests that print junk to the console are less likely to break xunit report.
	function isXunit(message) {
		return /^<\/?test(case|suite)/.test(message);
	}

	function addxunit(mocha, runner, reportHolder) {
		// Unfortunately the xunit reporter is hardcoded to write directly to console.log()
		// So monkey patch console.log
		if (!console) {
			console = {};
		}
		var log = console.log;
		console.log = global.console.log = function(str) {
			if (isXunit(str)) {
				reportHolder.report += str + "\n";
			}
			log && log.apply(global.console, Array.prototype.slice.call(arguments));
		};
		reportHolder.report = "";
		// This is a hack to enable xunit as a 2nd reporter
		mocha.reporter("xunit");
		var oldStats = runner.stats;
		var xunitReporter = new mocha._reporter(runner); // new xUnit reporter
		runner.stats = xunitReporter.stats = oldStats; // Creating the new reporter clobbered stats, so restore them.
	}

	/**
	 * @param {String} A regular UCS-2 string
	 * @returns {String} A base64-encoded gzipped utf-8 string
	 */
	function compress(str) {
		return Base64.encode(pako.gzip(new TextEncoder("utf8").encode(str)));
	}

	function makeWrapper(mocha) {
		var wrapper = Object.create(Object.getPrototypeOf(mocha));
		objects.mixin(wrapper, mocha);
		// Override #run()
		wrapper.run = function() {
			var runner = mocha.run.apply(mocha, Array.prototype.slice.call(arguments));
			var xunitResult = {};

			addxunit(mocha, runner, xunitResult);

			var failed = [], passed = [];
			runner.on("pass", log);
			runner.on("fail", log);
			runner.on("test", function(test) {
				test._start = new Date();
			});
			runner.on("end", function() {
				// The `global.mochaResults` object gets sent to Sauce Labs, and later echoed back to Grunt build
				global.mochaResults = runner.stats;
				global.mochaResults.reports = failed;
				global.mochaResults.url = global.location.pathname;
				global.mochaResults.xunit = compress(xunitResult.report);
				if (JSON.stringify(global.mochaResults).length >= 64000) {
					console.log(new Error("Test report size exceeds Sauce Labs API limit. "
						+ "Full results will not be available. To fix this, split up this test page into smaller pages."));
					delete global.mochaResults.xunit;
				}
			});

			function flattenTitles(test){
				var titles = [];
				while (test.parent.title){
					titles.push(test.parent.title);
					test = test.parent;
				}
				return titles.reverse();
			}
			function log(test, err) {
				var report = {
					name: test.title,
					result: !err,
					message: err && err.message,
					stack: err && err.stack,
					titles: flattenTitles(test),
					duration: (new Date() - test._start)
				};
				if (err)
					failed.push(report);
				else
					passed.push(report);
			}
			return runner;
		};
		return wrapper;
	}

	return makeWrapper(global.mocha);
});