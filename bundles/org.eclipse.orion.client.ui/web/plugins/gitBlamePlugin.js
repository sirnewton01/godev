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
/*eslint-env browser, amd*/
define(["require", "orion/xhr", "orion/plugin", "orion/Deferred", 'orion/operation'], function(require, xhr, PluginProvider, Deferred, operation) {
	var headers = {
		name: "Git Blame Plugin",
		version: "1.0", //$NON-NLS-0$
		description: "Git Blame Plugin"
	};
	var provider = new PluginProvider(headers);

	var tryParentRelative = true;
	function makeParentRelative(location) {
		if (tryParentRelative) {
			try {
				if (window.location.host === parent.location.host && window.location.protocol === parent.location.protocol) {
					return location.substring(parent.location.href.indexOf(parent.location.host) + parent.location.host.length);
				} else {
					tryParentRelative = false;
				}
			} catch (e) {
				tryParentRelative = false;
			}
		}
		return location;
	}

	
	var temp = document.createElement('a');
	temp.href = "../gitapi/blame/";
	var gitapiBase = makeParentRelative(temp.href);

	var blameRequest = {

		getBlameInfo: function(location, commit) {
			var service = this; //$NON-NLS-0$
			var clientDeferred = new Deferred();
	
			xhr("GET", require.toUrl(gitapiBase) + (commit ? commit : "HEAD") + location, { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				headers: {
					"Orion-Version": "1", //$NON-NLS-1$ //$NON-NLS-0$
						"Content-Type": "application/json; charset=UTF-8" //$NON-NLS-1$ //$NON-NLS-0$
				},
				timeout: 15000,
				handleAs: "json" //$NON-NLS-0$
			}).then(

			function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			},

			function(error) {
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},

		_getGitServiceResponse: function(deferred, result) {
			var response = result.response ? JSON.parse(result.response) : null;

			if (result.xhr && result.xhr.status === 202) {
				var def = operation.handle(response.Location);
				def.then(deferred.resolve, function(data) {
					data.failedOperation = response.Location;
					deferred.reject(data);
				}, deferred.progress);
				deferred.then(null, function(error) {
					def.reject(error);
				});
				return;
			}

			deferred.resolve(response);
			return;
		},

		_handleGitServiceResponseError: function(deferred, error) {
			deferred.reject(error);
		}
	};

	/*
	 * Makes a server requests for the blame data, as well as server
	 * requests for all of the commits that make up the blame data
	 */
	function blame(location) {
		
		//TODO this URL parsing needs to be done by the server
		var commit;
		var prefix = "/gitapi/commit/"; //$NON-NLS-0$
		var start = location.indexOf(prefix), end;
		if (start === 0) {
			start = prefix.length;
			end = location.indexOf("/", start); //$NON-NLS-0$
			commit = location.substring(start, end);
			start = location.indexOf("/file"); //$NON-NLS-0$
			end = location.indexOf("?", start); //$NON-NLS-0$
			if (end === -1) { end = location.length; }
			location = location.substring(start, end);
		}
		
		//TODO this URL parsing needs to be done by the server
		var filePrefix = "/file"; //$NON-NLS-0$
		var subBegin = location.indexOf(filePrefix);
		if(subBegin > 0){
			var subEnd = location.indexOf("?", subBegin); //$NON-NLS-0$
			if (subEnd === -1) { subEnd = location.length; }
			location = location.substring(subBegin, subEnd);
		}
		
		var wrappedResult = new Deferred();
		blameRequest.getBlameInfo(location, commit).then(function(response) {
			var annotations = [];
			Deferred.all(annotations, function(error) {
				return {
					_error: error
				};
			}).then(function() {
				var commits = response.Children;
				commits.sort(function compare(a, b) {
					if (a.Time < b.Time) {
						return 1;
					}
					if (a.Time > b.Time) {
						return -1;
					}
					return 0;
				});
				for (var i = 0; i < commits.length; i++) {
					for (var j = 0; j < commits[i].Children.length; j++) {
						var range = commits[i].Children[j];
						var c = commits[i];
						range.AuthorName = c.AuthorName;
						range.AuthorEmail = c.AuthorEmail;
						range.CommitterName = c.CommitterName;
						range.CommitterEmail = c.CommitterEmail;
						range.Message = c.Message;
						range.AuthorImage = c.AuthorImage;
						range.Name = c.Name;
						range.Time = new Date(c.Time).toLocaleString();
						range.Shade = (1 / (commits.length + 1)) * (commits.length - i + 1);
						range.CommitLink = "{+OrionHome}/git/git-repository.html#" + c.CommitLocation + "?page=1"; //$NON-NLS-1$ //$NON-NLS-0$
						annotations.push(range);
					}
				}
				wrappedResult.resolve(annotations);
			});
		});
		return wrappedResult;
	}

	var serviceImpl = {
		computeBlame: function(editorContext, context) {
			return blame(context.metadata.Location);
		}
	};
	var properties = {
		name: "Git Blame",
		validationProperties: [
			{source: "Git", variableName: "Git"} //$NON-NLS-1$ //$NON-NLS-0$
		]
	};
	provider.registerService("orion.edit.blamer", serviceImpl, //$NON-NLS-0$
	properties);
	provider.connect();
});