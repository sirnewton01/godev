/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define window */

define(['orion/Deferred'], function(Deferred) {

var SyntaxChecker = (function () {
	function SyntaxChecker(serviceRegistry, editor) {
		this.registry = serviceRegistry;
		this.editor = editor;
	}
	SyntaxChecker.prototype = {
		/* Looks up applicable validator services, calls validators, passes result to the marker service. */
		checkSyntax: function (contentType, title, message, contents) {
			function getValidators(registry, contentType) {
				var contentTypeService = registry.getService("orion.core.contenttypes"); //$NON-NLS-0$
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
				getValidators(this.registry, contentType).then(function(validators) {
					var extractProblems = function(data) {
						return data.problems || data.errors;
					};
					var problemPromises = [];
					var progress = self.registry.getService("orion.page.progress");
					for (var i=0; i < validators.length; i++) {
						var validator = validators[i];
						problemPromises.push(progress.progress(self.registry.getService(validator).checkSyntax(title, contents), "Validating " + title).then(extractProblems));
					}
					
					Deferred.all(problemPromises, function(error) {return {_error: error}; })
						.then(function(results) {
							var problems = [];
							for (i=0; i < results.length; i++) {
								var probs = results[i];
								if (!probs._error) {
									self._fixup(probs);
									problems = problems.concat(probs);
								}
							}
							self.registry.getService("orion.core.marker")._setProblems(problems); //$NON-NLS-0$
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
				problem.end = (typeof problem.end === "number") ? problem.end : problem.start + 1; //$NON-NLS-0$
				
				// Range check
				var lineLength = model.getLine(problem.line - 1, false).length;
				problem.start = Math.max(1, problem.start);
				problem.start = Math.min(problem.start, lineLength);
				problem.end = Math.min(problem.end, lineLength);
				problem.end = Math.max(problem.start, problem.end);
			}
		}
	};
	return SyntaxChecker;
}());
return {SyntaxChecker: SyntaxChecker};
});
