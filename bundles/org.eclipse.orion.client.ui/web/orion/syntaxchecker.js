/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window */

define([
	'orion/Deferred',
	'orion/edit/editorContext'
], function(Deferred, EditorContext) {

var SyntaxChecker = (function () {
	/**
	 * @name orion.SyntaxChecker
	 * @class Provides access to validation services registered with the service registry.
	 * @description Provides access to validation services registered with the service registry.
	 */
	function SyntaxChecker(serviceRegistry, editor) {
		this.registry = serviceRegistry;
		this.editor = editor;
	}

	function clamp(n, min, max) {
		n = Math.max(n, min);
		n = Math.min(n, max);
		return n;
	}

	SyntaxChecker.prototype = /** @lends orion.SyntaxChecker.prototype */ {
		/**
		 * Looks up applicable validators, calls them to obtain problems, passes problems to the marker service.
		 */
		checkSyntax: function (contentType, title, message, contents) {
			function getValidators(registry, contentType) {
				var contentTypeService = registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
				function getFilteredValidator(registry, validator, contentType) {
					var contentTypeIds = validator.getProperty("contentType"); //$NON-NLS-0$
					return contentTypeService.isSomeExtensionOf(contentType, contentTypeIds).then(function(result) {
						return result ? validator : null;
					});
				}
				var validators = registry.getServiceReferences("orion.edit.validator"); //$NON-NLS-0$
				var filteredValidators = [];
				for (var i=0; i < validators.length; i++) {
					var serviceReference = validators[i];
					var pattern = serviceReference.getProperty("pattern"); // backwards compatibility //$NON-NLS-0$
					if (serviceReference.getProperty("contentType")) { //$NON-NLS-0$
						filteredValidators.push(getFilteredValidator(registry, serviceReference, contentType));
					} else if (pattern && new RegExp(pattern).test(title)) {
						var d = new Deferred();
						d.resolve(serviceReference);
						filteredValidators.push(d);
					}
				}
				// Return a promise that gives the validators that aren't null
				return Deferred.all(filteredValidators, function(error) {return {_error: error}; }).then(
					function(validators) {
						var capableValidators = [];
						for (var i=0; i < validators.length; i++) {
							var validator = validators[i];
							if (validator && !validator._error) {
								capableValidators.push(validator);
							}
						}
						return capableValidators;
					});
			}
			
			if (!contentType) {
				return;
			}
			if (!message) {
				var self = this;
				var serviceRegistry = this.registry;
				getValidators(serviceRegistry, contentType).then(function(validators) {
					var extractProblems = function(data) {
						var problems = data && (data.problems || data.errors);
						return problems || [];
					};
					var progress = serviceRegistry.getService("orion.page.progress");
					var problemPromises = validators.map(function(validator) {
						var service = serviceRegistry.getService(validator);
						var promise;
						if (service.computeProblems) {
							var context = {
								contentType: contentType.id,
								title: title
							};
							promise = service.computeProblems(EditorContext.getEditorContext(serviceRegistry), context);
						} else if (service.checkSyntax) {
							// Old API
							promise = service.checkSyntax(title, contents);
						}
						return progress.progress(promise, "Validating " + title).then(extractProblems);
					});
					
					Deferred.all(problemPromises, function(error) {return {_error: error}; })
						.then(function(results) {
							var problems = [];
							for (var i=0; i < results.length; i++) {
								var probs = results[i];
								if (!probs._error) {
									self._fixup(probs);
									problems = problems.concat(probs);
								}
							}
							serviceRegistry.getService("orion.core.marker")._setProblems(problems); //$NON-NLS-0$
						});
				});
			}
		},
		_fixup: function(problems) {
			var model = this.editor.getModel();
			for (var i=0; i < problems.length; i++) {
				var problem = problems[i];
				
				problem.description = problem.description || problem.reason;
				problem.severity = problem.severity || "error"; //$NON-NLS-0$
				problem.start = (typeof problem.start === "number") ? problem.start : problem.character; //$NON-NLS-0$

				// Range check
				if (typeof problem.line === "number") {//$NON-NLS-0$
					// start, end are line offsets (1-based)
					var lineLength = model.getLine(problem.line - 1, false).length;
					problem.start = clamp(problem.start, 1, lineLength - 1); // leave room for end
					problem.end = (typeof problem.end === "number") ? problem.end : -1; //$NON-NLS-0$
					problem.end = clamp(problem.end, problem.start + 1, lineLength);

					// TODO probably need similar workaround for bug 423482 here
				} else {
					// start, end are document offsets (0-based)
					var charCount = model.getCharCount();
					problem.start = clamp(problem.start, 0, charCount); // leave room for end
					problem.end = (typeof problem.end === "number") ? problem.end : -1; //$NON-NLS-0$
					problem.end = clamp(problem.end, problem.start, charCount);

					// Workaround: if problem falls on the empty, last line in the buffer, move it to a valid line.
					// https://bugs.eclipse.org/bugs/show_bug.cgi?id=423482
					if (problem.end === charCount && model.getLineCount() > 1 && charCount === model.getLineStart(model.getLineCount() - 1)) {
						var prevLine = model.getLineCount() - 2, prevLineStart = model.getLineStart(prevLine), prevLineEnd = model.getLineEnd(prevLine);
						if (prevLineStart === prevLineEnd) {
							// Empty range on an empty line seems to be OK, if not at EOF
							problem.start = problem.end = prevLineEnd;
						} else {
							problem.start = prevLineEnd - 1;
							problem.end = prevLineEnd;
						}
					}
				}
			}
		}
	};
	return SyntaxChecker;
}());
return {SyntaxChecker: SyntaxChecker};
});
