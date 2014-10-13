/******************************************************************************* 
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

/** @namespace The global container for eclipse APIs. */

define(['require', "orion/xhr", "orion/Deferred", 'orion/operation'], function(require, xhr, Deferred, operation) {

var eclipse = eclipse || {};

eclipse.GitService = (function() {
	
	var contentType = "application/json; charset=UTF-8";
	
	/**
	 * Creates a new Git service.
	 * @class Provides operations for browsing and manipulating Git repositories.
	 * @name orion.git.GitService
	 */
	function GitService(serviceRegistry) {
		if (serviceRegistry) {
			this._serviceRegistry = serviceRegistry;
			this._serviceRegistration = serviceRegistry.registerService(
					"orion.git.provider", this); //$NON-NLS-0$
		}
	}

	GitService.prototype = /** @lends eclipse.GitService.prototype */
	{
		checkGitService : function() {
		},
		
		cloneGitRepository : function(gitName, gitRepoUrl, targetPath, repoLocation, gitSshUsername, gitSshPassword, gitSshKnownHost, privateKey, passphrase, userInfo, initProject) {
			var service = this;
			var postData = {};
			if(gitName){
				postData.Name = gitName;
			}
			if(targetPath){
				postData.Path = targetPath;
			}
			if(gitRepoUrl){
				postData.GitUrl=gitRepoUrl;
			}
			postData.Location = repoLocation;
			if(gitSshUsername){
				postData.GitSshUsername = gitSshUsername;
			}
			if(gitSshPassword){
				postData.GitSshPassword = gitSshPassword;
			}
			if(gitSshKnownHost){
				postData.GitSshKnownHost = gitSshKnownHost;
			}
			if(privateKey) {
				postData.GitSshPrivateKey=privateKey;
			}
			if(passphrase) {
				postData.GitSshPassphrase=passphrase;
			}
			if(userInfo){
				if( userInfo.GitMail ){
					postData.GitMail = userInfo.GitMail;
				}
				if( userInfo.GitName ){
					postData.GitName = userInfo.GitName;
				}
			}
			if(initProject){
				postData.initProject = initProject;
			}
			//NOTE: require.toURL needs special logic here to handle "gitapi/clone"
			var gitapiCloneUrl = require.toUrl("gitapi/clone/._"); //$NON-NLS-0$
			gitapiCloneUrl = gitapiCloneUrl.substring(0,gitapiCloneUrl.length-2);
			
			var clientDeferred = new Deferred();
			xhr("POST", gitapiCloneUrl, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify(postData)
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		removeGitRepository : function(repositoryLocation){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", repositoryLocation, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
	
		getGitStatus: function(url){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", url, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		stage: function(location){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		stageMultipleFiles: function(gitCloneURI, paths){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Path" : paths //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		unstageAll: function(location , resetParam){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Reset" : resetParam //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		unstage: function(location , paths){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$,
				data: JSON.stringify({
					"Path" : paths //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		checkoutPath: function(gitCloneURI, paths){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Path" : paths, //$NON-NLS-0$
					"RemoveUntracked" : "true" //$NON-NLS-1$ //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		ignorePath: function(gitIgnoreURI, paths){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitIgnoreURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Path" : paths, //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		commitAll: function(location , message , body){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: body
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		getGitClone : function(gitCloneURI) {
			var service = this;

			var clientDeferred = new Deferred();
			xhr("GET", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		getGitCloneConfig : function(gitCloneConfigURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitCloneConfigURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		getGitBranch : function(gitBranchURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitBranchURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		getGitRemote : function(gitRemoteURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitRemoteURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		checkoutBranch : function(gitCloneURI, branchName) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Branch" : branchName //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		resetIndex : function(gitIndexURI, refId, mode) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitIndexURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Commit" : refId, //$NON-NLS-0$
					"Reset" : mode ? mode : "HARD" //$NON-NLS-1$ //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		addBranch : function(gitBranchParentURI, branchName, startPoint) {
			var service = this;
			
			var postData = {};
			if (branchName) postData.Name = branchName;
			if (startPoint) postData.Branch = startPoint;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitBranchParentURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify(postData)
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		removeBranch : function(gitBranchURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", gitBranchURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		addRemote : function(gitRemoteParentURI, remoteName, remoteURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitRemoteParentURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Remote" : remoteName, //$NON-NLS-0$
					"RemoteURI" : remoteURI //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		removeRemote : function(gitRemoteURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", gitRemoteURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doGitLog : function(gitLogURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitLogURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		getDiff : function(gitDiffURI, commitName) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitDiffURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"New" : commitName //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doGitDiff : function(gitDiffURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitDiffURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});

			return clientDeferred;
		},
		
		doFetch : function(gitRemoteBranchURI, force, gitSshUsername, gitSshPassword, gitSshKnownHost, gitPrivateKey, gitPassphrase) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitRemoteBranchURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Fetch" : "true", //$NON-NLS-1$ //$NON-NLS-0$
					"Force" : force, //$NON-NLS-0$
					"GitSshUsername" : gitSshUsername, //$NON-NLS-0$
					"GitSshPassword" : gitSshPassword, //$NON-NLS-0$
					"GitSshKnownHost" : gitSshKnownHost, //$NON-NLS-0$
					"GitSshPrivateKey" : gitPrivateKey, //$NON-NLS-0$
					"GitSshPassphrase" : gitPassphrase //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doPull : function(gitCloneURI, force, gitSshUsername, gitSshPassword, gitSshKnownHost, gitPrivateKey, gitPassphrase) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Pull" : "true", //$NON-NLS-1$ //$NON-NLS-0$
					"Force" : force, //$NON-NLS-0$
					"GitSshUsername" : gitSshUsername, //$NON-NLS-0$
					"GitSshPassword" : gitSshPassword, //$NON-NLS-0$
					"GitSshKnownHost" : gitSshKnownHost, //$NON-NLS-0$
					"GitSshPrivateKey" : gitPrivateKey, //$NON-NLS-0$
					"GitSshPassphrase" : gitPassphrase //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doMerge : function(gitHeadURI, commitName, squash) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitHeadURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Merge" : commitName, //$NON-NLS-0$
					"Squash" : squash
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doCherryPick : function(gitHeadURI, commitName) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitHeadURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Cherry-Pick" : commitName //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doRevert : function(gitHeadURI, commitName) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitHeadURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Revert" : commitName //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doRebase : function(gitHeadURI, commitName, operation) {
			var service = this;
			var postData = {};
			postData.Rebase = commitName;
			if (operation) postData.Operation = operation;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitHeadURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify(postData)
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doPush : function(gitBranchURI, srcRef, tags, force, gitSshUsername, gitSshPassword, gitSshKnownHost, gitPrivateKey, gitPassphrase) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitBranchURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"PushSrcRef" : srcRef, //$NON-NLS-0$
					"PushTags" : tags, //$NON-NLS-0$
					"Force" : force, //$NON-NLS-0$
					"GitSshUsername" : gitSshUsername, //$NON-NLS-0$
					"GitSshPassword" : gitSshPassword, //$NON-NLS-0$
					"GitSshKnownHost" : gitSshKnownHost, //$NON-NLS-0$
					"GitSshPrivateKey" : gitPrivateKey, //$NON-NLS-0$
					"GitSshPassphrase" : gitPassphrase //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		getLog : function(gitCommitURI, commitName) {
			var service = this;
			var clientDeferred = new Deferred();
			var clientDeferred1 = new Deferred();
			
			xhr("POST", gitCommitURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"New" : commitName //$NON-NLS-0$
				})
			}).then(function(result) {
				clientDeferred1.resolve(result.xhr.getResponseHeader("Location")); //TODO bug 367344 //$NON-NLS-0$
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			clientDeferred1.then(function(scopedGitCommitURI){
				xhr("GET", scopedGitCommitURI, { 
					headers : { 
						"Orion-Version" : "1",
						"Content-Type" : contentType
					},
					timeout : 15000,
					handleAs : "json" //$NON-NLS-0$
				}).then(function(result) {
					service._getGitServiceResponse(clientDeferred, result);
				}, function(error){
					service._handleGitServiceResponseError(clientDeferred, error);
				});
			});	
			
			return clientDeferred;			
		},
		
		getDefaultRemoteBranch : function(gitRemoteURI) {
			var service = this;
			var clientDeferred = new Deferred();
			var clientDeferred1 = new Deferred();
			
			xhr("GET", gitRemoteURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred1, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			clientDeferred1.then(function(remoteJsonData){
				xhr("GET", remoteJsonData.Children[0].Location, { 
					headers : { 
						"Orion-Version" : "1",
						"Content-Type" : contentType
					},
					timeout : 15000,
					handleAs : "json" //$NON-NLS-0$
				}).then(function(result) {
					service._getGitServiceResponse(clientDeferred, result);
				}, function(error){
					service._handleGitServiceResponseError(clientDeferred, error);
				});
			});	

			return clientDeferred;
		},
		
		doAddTag : function(gitCommitURI, tagName) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitCommitURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Name" : tagName  //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		doRemoveTag : function(gitTagURI) {
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", gitTagURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		checkoutTag : function(gitCloneURI, tag, branchName){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitCloneURI, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Tag" : tag, //$NON-NLS-0$
					"Branch" : branchName //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		/**
		 * Performs git stash create
		 * @param gitStashLocation
		 * @param indexMessage [optional)
		 * @param workingDirectoryMessage [optional]
		 * @param includeUntracked [optional]
		 * @returns {Deferred}
		 */
		doStashCreate : function(gitStashLocation, indexMessage, workingDirectoryMessage, includeUntracked){
			var service = this;
			
			var payload = {};
			if(indexMessage != null) /* note that undefined == null */
				payload.IndexMessage = indexMessage;
			
			if(workingDirectoryMessage != null) /* note that undefined == null */
				payload.WorkingDirectoryMessage = workingDirectoryMessage;
			
			if(includeUntracked === true)
				payload.IncludeUntracked = true;
			
			var clientDeferred = new Deferred();
			xhr("POST", gitStashLocation, {
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify(payload)
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		/**
		 * Performs git stash pop
		 * @param gitStashLocation
		 * @returns {Deferred}
		 */
		doStashPop : function(gitStashLocation){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitStashLocation, {
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		/**
		 * Performs git stash apply on the given change
		 * @param gitStashApplyLocation /gitapi/stash/<changeRev>/(..)
		 * @returns {Deferred}
		 */
		doStashApply : function(gitStashApplyLocation){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", gitStashApplyLocation, {
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		/**
		 * Performs git stash list
		 * @param gitStashLocation
		 * @returns {Deferred}
		 */
		doStashList : function(gitStashLocation){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("GET", gitStashLocation, {
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		/**
		 * Performs git stash drop on the given change
		 * @param gitStashDropLocation /gitapi/stash/<changeRev>/(..)
		 * @returns {Deferred}
		 */
		doStashDrop : function(gitStashDropLocation){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", gitStashDropLocation, {
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		addCloneConfigurationProperty: function(location, newKey, newValue){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Key" : newKey, //$NON-NLS-0$
					"Value" : newValue //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		editCloneConfigurationProperty: function(location, newValue){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("PUT", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"Value" : newValue //$NON-NLS-0$
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		deleteCloneConfigurationProperty: function(location){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("DELETE", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json" //$NON-NLS-0$
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},
		
		sendCommitReviewRequest: function(commit, location, login, url, authorName, message){
			var service = this;
			
			var clientDeferred = new Deferred();
			xhr("POST", location, { 
				headers : { 
					"Orion-Version" : "1",
					"Content-Type" : contentType
				},
				timeout : 15000,
				handleAs : "json", //$NON-NLS-0$
				data: JSON.stringify({
					"ReviewReqCommit": commit,
					"ReviewReqUrl" : url, //$NON-NLS-0$
					"ReviewReqNotifyLogin" : login, //$NON-NLS-0$	
					"ReviewReqAuthorName" : authorName,
					"ReviewMessage" : message
				})
			}).then(function(result) {
				service._getGitServiceResponse(clientDeferred, result);
			}, function(error){
				service._handleGitServiceResponseError(clientDeferred, error);
			});
			
			return clientDeferred;
		},

		_getGitServiceResponse : function(deferred, result) {
			var response =  result.response ? JSON.parse(result.response) : null;
			
			if (result.xhr && result.xhr.status === 202) {
				var def = operation.handle(response.Location);
				def.then(deferred.resolve, function(data) {
					data.failedOperation = response.Location;
					deferred.reject(data);
				}, deferred.progress);
				deferred.then(null, function(error){def.reject(error);});
				return;
			}
			deferred.resolve(response);
			return;
		},
		
		_handleGitServiceResponseError: function(deferred, error){
			deferred.reject(error);
		}
	};
	return GitService;
}());

return eclipse;
});
