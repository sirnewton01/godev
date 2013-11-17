/*global define document URL window confirm*/
define(["orion/plugin", "orion/xhr", "orion/serviceregistry", "orion/git/gitClient", "orion/ssh/sshTools", "orion/i18nUtil", "orion/Deferred", "orion/URL-shim", "domReady!"], function(PluginProvider, xhr, mServiceregistry, mGitClient, mSshTools, i18nUtil, Deferred) {
	var temp = document.createElement('a');
	temp.href = "../mixloginstatic/LoginWindow.html";
	var serviceRegistry = new mServiceregistry.ServiceRegistry();
	var gitClient = new mGitClient.GitService(serviceRegistry);
	var sshService = new mSshTools.SshService(serviceRegistry);
	var login = temp.href;
	var headers = {
		name: "Orion Git Support",
		version: "1.0",
		description: "This plugin provides Git Support to the Orion File Service.",
		login: login
	};

	var provider = new PluginProvider(headers);
	
	provider.registerService("orion.page.link", {}, {
		nameKey: "Repositories",
		id: "orion.git.repositories",
		nls: "git/nls/gitmessages",
		uriTemplate: "{+OrionHome}/git/git-repository.html#"
	});
	
	provider.registerService("orion.navigate.command", {}, {
		nameKey: "Git Status",
		id: "eclipse.git.status",
		tooltipKey: "Go to Git Status",
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "Git:StatusLocation", variableName: "GitStatusLocation"},
			{source: "Directory", match: true}
		],
		uriTemplate: "{+OrionHome}/git/git-status.html#{,GitStatusLocation}",
		forceSingleItem: true
	});
	
	provider.registerService("orion.navigate.command", {}, {
		nameKey: "Git Log",
		id: "eclipse.git.log",
		tooltipKey: "Go to Git Log",
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "Git:CommitLocation", variableName: "GitLogLocation"}
		],
		uriTemplate: "{+OrionHome}/git/git-log.html#{,GitLogLocation}?page=1",
		forceSingleItem: true
	});

	provider.registerService("orion.navigate.command", {}, {
		nameKey: "Git Remote",
		id: "eclipse.git.remote",
		tooltipKey: "Go to Git Remote",
		nls: "git/nls/gitmessages",
		validationProperties: [{
			source: "Git:DefaultRemoteBranchLocation", 
			variableName: "GitRemoteLocation"
		}],
		uriTemplate: "{+OrionHome}/git/git-log.html#{,GitRemoteLocation}?page=1",
		forceSingleItem: true
	});
	
	provider.registerService("orion.core.content", null, {
		id: "orion.content.gitClone",
		nls: "git/nls/gitmessages",
		nameKey: "Clone Git Repository",
		descriptionKey: "Go to the Orion repositories page to provide a git repository URL. Once the repository is created, it will appear in the Navigator.",
		uriTemplate: "{+OrionHome}/git/git-repository.html#,cloneGitRepository=URL"
	});

	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.status"
	});
	
	provider.registerService("orion.page.link.related", null, {
		nameKey: "Git Status",
		id: "eclipse.git.status2",
		tooltipKey: "Go to Git Status",
		nls: "git/nls/gitmessages",
		validationProperties: [{
			source: "StatusLocation|Clone:StatusLocation", 
			variableName: "GitStatusLocation"
		}],
		uriTemplate: "{+OrionHome}/git/git-status.html#{,GitStatusLocation}"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.log"
	});
	/*
	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.remote"
	});
	*/
	provider.registerService("orion.page.link.related", null, {
		nameKey: "Active Branch Log",
		id: "eclipse.orion.git.switchToCurrentLocal",
		tooltipKey: "Show the log for the active local branch",
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "Clone:ActiveBranch", variableName: "GitBranchLocation"},
			{source: "toRef:Type", match: "RemoteTrackingBranch"}
		],
		uriTemplate: "{+OrionHome}/git/git-log.html#{,GitBranchLocation}?page=1",
		forceSingleItem: true
	});
	
	provider.registerService("orion.page.link.related", null, {
		nameKey: "Remote Branch Log",
		id: "eclipse.orion.git.switchToRemote2",
		tooltipKey: "Show the log for the corresponding remote tracking branch",
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "toRef:RemoteLocation:0:Children:0:CommitLocation", variableName: "GitRemoteLocation"}
		],
		uriTemplate: "{+OrionHome}/git/git-log.html#{,GitRemoteLocation}?page=1",
		forceSingleItem: true
	});
	
	provider.registerService("orion.page.link.related", null, {
		nameKey: "Git Repository",
		id: "eclipse.git.repository2",
		tooltipKey: "Go to the git repository",
		nls: "git/nls/gitmessages",
		validationProperties: [
			{source: "CloneLocation", variableName: "GitCloneLocation"},
			{source: "Type", match: "Commit"}
		],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitCloneLocation}"
	});

	provider.registerService("orion.page.link.related", null, {
		id: "eclipse.git.repository",
		nameKey: "Git Repository",
		tooltipKey: "Go to the git repository",
		nls: "git/nls/gitmessages",
		validationProperties: [{
			source: "Git:CloneLocation",
			variableName: "GitRepoLocation"
		}],
		uriTemplate: "{+OrionHome}/git/git-repository.html#{,GitRepoLocation}"
	});

	provider.registerService("orion.page.link.related", null, {
		id: "orion.git.gotoEclipseGit",
		nameKey: "Show Repository in eclipse.org",
		tooltipKey: "Show this repository in eclipse.org",
		nls: "git/nls/gitmessages",
		validationProperties: [{
			source: "GitUrl|Clone:GitUrl", 
			match: "git.eclipse.org/gitroot", 
			variableName: "EclipseGitLocation", 
			variableMatchPosition: "after"
		}],
		uriTemplate: "http://git.eclipse.org/c{+EclipseGitLocation}"
	});
	
	provider.registerService("orion.page.link.related", null, {
		id: "orion.git.gotoGithub",
		nameKey: "Show Repository in GitHub",
		nls: "git/nls/gitmessages",
		tooltipKey: "Show this repository in GitHub",
		validationProperties: [{
			source: "GitUrl|Clone:GitUrl", 
			match: "github\.com.*\.git", 
			variableName: "GitHubLocation", 
			variableMatchPosition: "only",
			replacements: [{pattern: ":", replacement: "/"}, {pattern: ".git$", replacement: ""}]
		}],
		uriTemplate: "https://{+GitHubLocation}"
	});
	
	provider.registerServiceProvider("orion.page.link.related", null, {
		id: "orion.git.gotoGithubCommit",
		nameKey: "Show Commit in GitHub",
		nls: "git/nls/gitmessages",
		tooltipKey: "Show this commit in GitHub",
		validationProperties: [{
			source: "GitUrl", 
			match: "github\.com.*\.git", 
			variableName: "GitHubLocation", 
			variableMatchPosition: "only",
			replacements: [{pattern: ":", replacement: "/"}, {pattern: ".git$", replacement: ""}]
		},
		{source: "Type", match: "Commit"},
		{source: "Name", variableName: "commitName"}
		],
		uriTemplate: "https://{+GitHubLocation}/commit/{+commitName}"
	});
	
	provider.registerServiceProvider("orion.page.link.related", null, {
		id: "orion.git.gotoEclipseGitCommit",
		nameKey: "Show Commit in eclipse.org",
		nls: "git/nls/gitmessages",
		tooltipKey: "Show this commit in eclipse.org",
		validationProperties: [{
			source: "GitUrl", 
			match: "git.eclipse.org/gitroot", 
			variableName: "EclipseGitLocation", 
			variableMatchPosition: "after"
		},
		{source: "Type", match: "Commit"},
		{source: "Name", variableName: "commitName"}
		],
		uriTemplate: "http://git.eclipse.org/c{+EclipseGitLocation}/commit/?id={+commitName}"
	});

	temp.href = "../../gitapi/diff/";
	var base = temp.href;
	provider.registerService("orion.core.diff", {
		getDiffContent: function(diffURI){	
			var url = new URL(diffURI, window.location);
			url.query.set("parts", "diff");
			return xhr("GET", url.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(xhrResult) {
				return xhrResult.responseText;
			});
		},			
		getDiffFileURI: function(diffURI){
			var url = new URL(diffURI, window.location);
			url.query.set("parts", "uris");
			return xhr("GET", url.href, {
				headers: {
					"Orion-Version": "1"
				},
				timeout: 15000
			}).then(function(xhrResult) {
				return JSON.parse(xhrResult.responseText);
			});
		}
	}, {
		pattern: base
	});
	
	function parseGitUrl(gitUrl){
		var gitPath = gitUrl;
		var gitInfo = {};
		if(gitUrl.indexOf("://")>0){
			gitPath = gitUrl.substring(gitUrl.indexOf("://")+3);
		}
		var segments = gitPath.split("/");
		gitInfo.serverName = segments[0];
		if(gitInfo.serverName.indexOf("@")){
			gitInfo.serverName = gitInfo.serverName.substring(gitInfo.serverName.indexOf("@")+1);
		}
		gitInfo.repoName = segments[segments.length-1];
		if(gitInfo.repoName.indexOf(".git")>0){
			gitInfo.repoName = gitInfo.repoName.substring(0, gitInfo.repoName.lastIndexOf(".git"));
		}
		return gitInfo;
	}
	
	function removeUserInformation(gitUrl){
		if(gitUrl.indexOf("@")>0 && gitUrl.indexOf("ssh://")>=0){
			return gitUrl.substring(0, gitUrl.indexOf("ssh://") + 6) + gitUrl.substring(gitUrl.indexOf("@")+1);
		}
		return gitUrl;
	}
	
	provider.registerService("orion.project.handler", {
		paramsToDependencyDescription: function(params){
			return {Type: "git", Location: removeUserInformation(params.url)};
		},
		_cloneRepository: function(gitUrl, params, workspaceLocation, isProject){
			var deferred = new Deferred();
			var knownHosts = sshService.getKnownHosts();
				gitClient.cloneGitRepository(null, gitUrl, null, workspaceLocation, params.sshuser, params.sshpassword, knownHosts, null, null, null, isProject).then(function(cloneResp){
					gitClient.getGitClone(cloneResp.Location).then(function(clone){
						if(clone.Children){
							clone = clone.Children[0];
						}
						var gitInfo = parseGitUrl(clone.GitUrl);
						if(isProject){
							deferred.resolve({ContentLocation: clone.ContentLocation});					
						} else {
							deferred.resolve({Type: "git", Location: removeUserInformation(clone.GitUrl), Name: (gitInfo.repoName || clone.Name) + " at " + gitInfo.serverName});					
						}
					}, deferred.reject, deferred.progress);
				}.bind(this), function(error){
					try{
						if (error && error.status !== undefined) {
							try {
								error = JSON.parse(error.responseText);
							} catch (e) {
								error = { 
									Message : "Problem while performing the action"
								};
							}
						}
					}catch(e){
						deferred.reject(error);
						return;
					}
					if(error.JsonData){
						if(error.JsonData.HostKey){
							if(confirm(i18nUtil.formatMessage('Would you like to add ${0} key for host ${1} to continue operation? Key fingerpt is ${2}.',
								error.JsonData.KeyType, error.JsonData.Host, error.JsonData.HostFingerprint))){
									sshService.addKnownHosts(error.JsonData.Host + " " + error.JsonData.KeyType + " " + error.JsonData.HostKey);
									this._cloneRepository(gitUrl, params, workspaceLocation);
							} else {
								deferred.reject(error);
							}
							return;
						} 
						if(error.JsonData.Host){
							error.retry = true;
							error.addParamethers = [{id: "sshuser", type: "text", name: "Ssh User:"}, {id: "sshpassword", type: "password", name: "Ssh Password:"}];
							deferred.reject(error);
							return;
						}
					}
					deferred.reject(error);
				}.bind(this), deferred.progress);
			return deferred;
		},
		initDependency: function(dependency, params, projectMetadata){
			var gitUrl = removeUserInformation(dependency.Location || params.url);
			return this._cloneRepository(gitUrl, params, projectMetadata.WorkspaceLocation);
		},
		initProject: function(params, projectMetadata){
			var gitUrl = removeUserInformation(params.url);
			return this._cloneRepository(gitUrl, params, projectMetadata.WorkspaceLocation, true);
		},
		getDependencyDescription: function(item){
			if(!item.Git){
				return null;
			}
			var deferred = new Deferred();
			gitClient.getGitClone(item.Git.CloneLocation).then(
				function(clone){
					if(clone.Children){
						clone = clone.Children[0];
					}
					if(clone.GitUrl){
						var gitInfo = parseGitUrl(clone.GitUrl);
						deferred.resolve({Type: "git", Location: removeUserInformation(clone.GitUrl), Name: (gitInfo.repoName || clone.Name) + " at " + gitInfo.serverName});
					}
				},deferred.reject, deferred.progress
			);
			return deferred;
		},
		getAdditionalProjectProperties: function(item, projectMetadata){
			if(!item.Git){
				return null;
			}
			var deferred = new Deferred();
			gitClient.getGitClone(item.Git.CloneLocation).then(
			function(clone){
				if(clone.Children){
					clone = clone.Children[0];
				}
				deferred.resolve([
					{
						name: "Git",
						children: [
							{
								name: "Git Url",
								value: clone.GitUrl
							},
							{
								name: "Git Status",
								value: "Git Status",
								href: "{+OrionHome}/git/git-status.html#" + item.Git.StatusLocation
							}
						]
					}
				]);
			},deferred.reject, deferred.progress
			);
			return deferred;
		}
	}, {
		id: "orion.git.projecthandler",
		type: "git",
		addParamethers: [{id: "url", type: "url", name: "Url:"}],
		addDependencyName: "Add Git Repository",
		addDependencyTooltip: "Clone git repository and add it to this project",
		addProjectName: "Create a project from a Git Repository",
		addProjectTooltip: "Clone a Git Repository and add it as a project",
		actionComment: "Cloning ${url}",
		validationProperties: [
			{source: "Git"} // alternate {soruce: "Children:[Name]", match: ".git"}
		]
	});
	
	provider.connect();
});
