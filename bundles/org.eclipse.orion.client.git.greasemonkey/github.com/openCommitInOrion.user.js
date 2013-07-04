// ==UserScript==
// @name           Open commit from Github in Orion
// @version        0.4
// @namespace      http://eclipse.org/orion
// @description    Allows to open commits from Github in Orion
// @include        https://github.com/*/commit/*
// ==/UserScript==

/*
 * An excerpt from a commit page from github.com:
 * 
 * <div class="commit full-commit ">
 *	<a class="browse-button" rel="nofollow" title="Browse the code at this point in the history" href="/szbra/test/tree/d6ae6aca7d4788d9a9209de43411b5ecb7ad8195">Browse code</a>
 *	<p class="commit-title"> commit title </p>
 *	<div class="commit-meta clearfix">
 *	</div>
 */
(function () {
	try {

		var commitHeaderDiv = document.getElementsByClassName("commit full-commit")[0];
		var browseButton = document.getElementsByClassName("browse-button")[0];
		var shaValue = document.getElementsByClassName("sha")[0].innerHTML;
		
		var a = document.createElement("a");
		a.className = "browse-button";
		a.href = "http://orionhub.org/git/git-repository.html#,openGitCommit=" + shaValue;
		a.title = "Open in Orion";
		a.innerHTML = "Open in Orion";
		a.style.marginLeft = "10px";
		
		commitHeaderDiv.insertBefore(a, browseButton);
				
	} catch (e) {
		// silently ignore, not on the right page
	}
})();