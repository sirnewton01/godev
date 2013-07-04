/*global define document URL window*/
define(["orion/plugin", "orion/xhr", "orion/URL-shim", "domReady!"], function(PluginProvider, xhr) {
	var temp = document.createElement('a');
	temp.href = "../mixloginstatic/LoginWindow.html";
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
		uriTemplate: "{OrionHome}/git/git-repository.html#"
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
		uriTemplate: "{OrionHome}/git/git-status2.html#{GitStatusLocation}",
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
		uriTemplate: "{OrionHome}/git/git-log.html#{GitLogLocation}?page=1",
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
		uriTemplate: "{OrionHome}/git/git-log.html#{GitRemoteLocation}?page=1",
		forceSingleItem: true
	});
	
	provider.registerService("orion.core.content", null, {
		id: "orion.content.gitClone",
		nls: "git/nls/gitmessages",
		nameKey: "Clone Git Repository",
		descriptionKey: "Go to the Orion repositories page to provide a git repository URL. Once the repository is created, it will appear in the Navigator.",
		uriTemplate: "{OrionHome}/git/git-repository.html#,cloneGitRepository=URL"
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
		uriTemplate: "{OrionHome}/git/git-status2.html#{GitStatusLocation}"
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
		uriTemplate: "{OrionHome}/git/git-log.html#{GitBranchLocation}?page=1",
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
		uriTemplate: "{OrionHome}/git/git-log.html#{GitRemoteLocation}?page=1",
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
		uriTemplate: "{OrionHome}/git/git-repository.html#{GitCloneLocation}"
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
		uriTemplate: "{OrionHome}/git/git-repository.html#{GitRepoLocation}"
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
		uriTemplate: "http://git.eclipse.org/c{EclipseGitLocation}"
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
		uriTemplate: "https://{GitHubLocation}"
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
		uriTemplate: "https://{GitHubLocation}/commit/{commitName}"
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
		uriTemplate: "http://git.eclipse.org/c{EclipseGitLocation}/commit/?id={commitName}"
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
	provider.connect();
});
