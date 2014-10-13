/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/**
 * Usage: node build.js [path_to_bundles_folder] [path_to_build.js_file]
 */

/*global __dirname Buffer console process require*/
/*jslint regexp:false laxbreak:true*/

// compat shim for v0.6-0.8 differences
require('../lib/compat');

var async = require('../lib/async');
var child_process = require('child_process');
var dfs = require('deferred-fs'), Deferred = dfs.Deferred;
var path = require('path');

var BUNDLE_WEB_FOLDER = './web/';
var IS_WINDOWS = process.platform === 'win32';

var pathToOrionClientBundlesFolder = path.resolve(__dirname, process.argv[2] || 'D:/JazzIntegration/OrionSource/org.eclipse.orion.client/bundles');
var pathToTempDir = path.resolve(__dirname, '../temp');

/**
 * Pass varargs to get numbered parameters, or a single object for named parameters.
 * eg. format('${0} dollars and ${1} cents', 3, 50);
 * eg. format('${dollars} dollars and ${cents} cents', {dollars:3, cents:50});
 * @param {String} str String to format.
 * @param {varags|Object} arguments 
 */
function format(str/*, args..*/) {
	var maybeObject = arguments[1];
	var args = (maybeObject !== null && typeof maybeObject === 'object') ? maybeObject : Array.prototype.slice.call(arguments, 1);
	return str.replace(/\$\{([^}]+)\}/g, function(match, param) {
		return args[param];
	});
}

/**
 * @param {Object} [options]
 * @returns {Deferred} Doesn't reject (but perhaps it should -- TODO)
 */
function execCommand(cmd, options, suppressError) {
	options = options || {};
	suppressError = typeof suppressError === 'undefined' ? false : suppressError;
	var d = new Deferred();
	console.log(cmd);
	child_process.exec(cmd, {
		cwd: options.cwd || pathToTempDir,
		stdio: options.stdio || 'inherit'
	}, function (error, stdout, stderr) {
		if (error && !suppressError) {
			console.log(error.stack || error);
		}
		if (stdout) { console.log(stdout); }
		d.resolve();
	});
	return d;
}

/** @returns {String} command for performing recursive copy of src directory to dest directory. */
function getCopyDirCmd(src, dest) {
	return IS_WINDOWS ? format('xcopy /e /h /q /y /i "${0}" "${1}"', src, dest) : format("cp -R ${0}/* ${1}", src, dest);
}

function section(name) {
	console.log('-------------------------------------------------------\n' + name + '...\n');
}

function build() {
	/*
	 * Build steps begin here
	 */
	// When debugging, change these to false to skip steps.
	return dfs.exists(pathToTempDir).then(function(exists) {
		if (exists) {
			section('Removing old temp dir ' + pathToTempDir);
			var buildDir = __dirname;
			var cleanCmd = IS_WINDOWS ? format('del /s /f /q "${0}\\*.*" 1> nul', pathToTempDir) : format('rm -rf ${0}', pathToTempDir);
			return execCommand(cleanCmd, {cwd: buildDir}).then(function() {
				if (IS_WINDOWS) {
					return execCommand(format('rmdir /s /q "${0}"', pathToTempDir), {cwd: buildDir});
				}
			});
		}
	}).then(function() {
		section('Creating temp dir ' + pathToTempDir);
		return dfs.mkdir(pathToTempDir);
	}).then(function() {
		// Copy all required files into the .temp directory for doing the build
		section('Copying client code to ' + pathToTempDir);

		// Get the list of bundles from the orion.client lib:
		var bundles = [];
		return dfs.readdir(pathToOrionClientBundlesFolder).then(function(contents) {
			return Deferred.all(contents.map(function(item) {
				return dfs.stat(path.join(pathToOrionClientBundlesFolder, item)).then(function(stats) {
					if (stats.isDirectory()) {
						bundles.push(item);
					}
				});
			}));
		}).then(function() {
			console.log('Copying orion.client');
			/* So. Because the file structure of the Orion source bundles doesn't match the URL/RequireJS module
			 * structure, we need to copy all the bundles' "./web/" folders into the temp dir, so that modules
			 * will resolve in later optimization steps.
			 */
			return async.sequence(bundles.map(function(bundle) {
					return function() {
						var bundleWebFolder = path.resolve(pathToOrionClientBundlesFolder, bundle, BUNDLE_WEB_FOLDER);
						return dfs.exists(bundleWebFolder).then(function(exists) {
							if (exists) {
								return execCommand(getCopyDirCmd(bundleWebFolder, pathToTempDir));
							} else {
								console.log('Bundle has no web/ folder, skip: ' + bundle);
								return;
							}
						});
					};
				}).concat([
					function() {
					}
				]));
		});
	}).then(function() {
		return new Deferred().resolve();
	});
}

function exitFail(error) {
	if (error) { console.log('An error occurred: ' + (error.stack || error)); }
	process.exit(1);
}

function exitSuccess() { process.exit(0); }

/**
 * @returns {Promise}
 */
function processFile() {
	var buildPromise = new Deferred();
	build().then(buildPromise.resolve, buildPromise.reject);
	return buildPromise;
}

/*
 * The fun starts here
 */
processFile().then(exitSuccess,	exitFail);
