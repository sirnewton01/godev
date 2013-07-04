// ==UserScript==
// @name           Clone from git.eclipse.org into Orion
// @version        0.4
// @namespace      http://eclipse.org/orion
// @description    Allows to clone repositories into Orion
// @include        http://git.eclipse.org/c/*
// ==/UserScript==

/*
 * An excerpt from a repo summary page from git.eclipse.org:
 * 
 * <div id='cgit'>
 * 	<table id='header'>...</table>
 * 	<table class='tabs'>...</table>
 * 	<div class='content'>
 * 	 <table ... class='list nowrap'>
 * 	  <tr ...>...</tr>
 *    ...
 *    <tr><th class='left' colspan='4'>Clone</th></tr>
 *    <tr><td colspan='4'>git://...</td></tr>
 *    <tr><td colspan='4'>ssh://...</td></tr>
 *    <tr><td colspan='4'>http://...</td></tr>
 *   </table>          
 * 	</div><!-- class=content -->
 * </div>
 */
(function () {
	function changeLinks(contentTableRows /*optional*/, host) {
		if (!contentTableRows)
			contentTableRows = document.getElementById("cgit").children[2].children[0].children[0].children;
		for (var i = contentTableRows.length - 3; i < contentTableRows.length; i++) {
			var gitRepoUrl = contentTableRows[i].children[0].textContent;
			contentTableRows[i].children[0].innerHTML = "<a href='http://" + host + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl + "' target='_blank'>" + gitRepoUrl + "</a>";
		}
    
	}

	try {
		var contentTableRows = document.getElementById("cgit").children[2].children[0].children[0].children;
		
		var radio1 = document.createElement("input");
		var orionhub = true;
		radio1.name = "select";
		changeLinks(contentTableRows, "orionhub.org");
		radio1.id = "radio1";
		radio1.style.fontWeight = "normal";
		radio1.value = orionhub;
		radio1.type = "radio";
		radio1.checked = "true";
		radio1.onclick = function(){
			    if (document.getElementById("radio1").checked){
		        changeLinks(contentTableRows, "orionhub.org", "80");
		    }
		}
		
		var radio2 = document.createElement("input");
		var oeo = false;
		radio2.name = "select";
		radio2.style.fontWeight = "normal";
		radio2.id = "radio2";
		radio2.value = oeo;
		radio2.type = "radio";
		radio2.onclick = function(){
			    if (document.getElementById("radio2").checked){
		        changeLinks(contentTableRows, "orion.eclipse.org", "80");
		    }
		}
		
		var radio3 = document.createElement("input");
		var other = false;
		radio3.name = "select";
		radio3.style.fontWeight = "normal";
		radio3.value = other;
		radio3.type = "radio";
		radio3.id = "radio3";
		radio3.onclick = function(){
			    if (document.getElementById("radio3").checked){
		        changeLinks(contentTableRows, document.getElementById('hostid').value);
		    }
		}
		
		
		var host = document.createElement("input");
		host.className = "txt nohover";
		host.size = "20";
		host.placeholder = "address";
		host.id = "hostid";
		host.onblur=function(){
		    if(document.getElementById("radio3").checked){
		    changeLinks(contentTableRows, document.getElementById('hostid').value);
		    }
		}
		
		host.onchange=function(){
		    if(document.getElementById("radio3").checked){
		    changeLinks(contentTableRows, document.getElementById('hostid').value);
		    }
		}
		
		host.onkeydown=function(){
		    if(document.getElementById("radio3").checked){
		    changeLinks(contentTableRows, document.getElementById('hostid').value);
		    }
		}
		
		host.onkeyup=function(){
		    if(document.getElementById("radio3").checked){
		    changeLinks(contentTableRows, document.getElementById('hostid').value);
		    }
		}
		
		var div = document.createElement("div");
		var hint = document.createElement("div");
		hint.innerHTML = "Select the Orion instance: ";
		hint.style.fontStyle = "normal";
		hint.style.fontWeight = "lighter";
		hint.style.paddingTop = "10px";
		
		var cloneTr = contentTableRows[contentTableRows.length - 4];
		cloneTr.className = "nohover";
		var cloneTh = contentTableRows[contentTableRows.length - 4].children[0];
		if (cloneTh.innerHTML === "Clone") {
			cloneTh.innerHTML = "Clone into Orion";
			cloneTh.style.fontStyle = "bold";
			cloneTh.style.fontWeight = "bold";
			cloneTh.style.paddingTop = "10px";
			cloneTh.style.paddingBottom = "10px";
			cloneTh.innerHTML.color = "black";
			cloneTh.appendChild(hint);
			cloneTh.appendChild(div);
			div.appendChild(radio1);
			var node1 = document.createElement("span");
			node1.innerHTML = "orionhub.org       ";
			node1.style.fontWeight = "normal";
			div.appendChild(node1);
			div.appendChild(radio2);
			var node2 = document.createElement("span");
			node2.innerHTML = "orion.eclipse.org      ";
			node2.style.fontWeight = "normal";
			div.appendChild(node2);
			div.appendChild(radio3);
			var node3 = document.createElement("span");
			node3.innerHTML = "other Orion at ";
			node3.style.fontWeight = "normal";
			div.appendChild(node3);
			div.appendChild(host);
			
			var node4 = document.createElement("span");
			node4.innerHTML = "and click one of the links below to clone ";
			node4.style.fontWeight = "normal";
			cloneTh.appendChild(node4);

		}
	} catch (e) {
		// silently ignore, not on the right page
	}
})();
