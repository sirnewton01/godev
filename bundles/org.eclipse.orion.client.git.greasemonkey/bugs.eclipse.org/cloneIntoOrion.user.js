// ==UserScript==
// @name           Clone from Bugzilla into Orion
// @version        0.4
// @namespace      http://eclipse.org/orion
// @description    Allows to clone repository for the selected bug into Orion
// @include        https://bugs.eclipse.org/bugs/show_bug.cgi?id=*
// ==/UserScript==

/*
 * An excerpt from a bug page from bugs.eclipse.org:
 * 
 * for a logged user:
 *
 * <td id="bz_show_bug_column_1" class="bz_show_bug_column">
 * 	<table>
 *   ...
 *   <tr>
 *    <th class="field_label" id="field_label_product"><a href="describecomponents.cgi">Product:</a></th>
 *    <td class="field_value" id="field_container_product">
 *     <select id="product" name="product">
 *      <option value="ACTF" id="v98_product">ACTF</option>
 *      <option ...>...</option>
 *     </select> 
 *     <script>...</script>
 *    </td>
 *   </tr>
 *   <tr>
 *    <td class="field_label"><label for="component" accesskey="m"><b><a href="describecomponents.cgi?product=Orion">Co<u>m</u>ponent</a>:</b></label></td>
 *    <td>
 *     <select id="component" name="component">
 *      <option value="Client" selected>Client</option>
 *      <option ...>...</option>
 *     </select> 
 *    </td>
 *   </tr>
 *   ...  
 *
 * for guest:
 *
 * <td id="bz_show_bug_column_1" class="bz_show_bug_column">
 * 	<table>
 *   ...
 *   <tr>
 *    <th class="field_label" id="field_label_product"><a href="describecomponents.cgi">Product:</a></th>
 *    <td class="field_value" id="field_container_product">Orion</td>
 *   </tr>
 *   <tr>
 *    <td class="field_label"><label for="component" accesskey="m"><b><a href="describecomponents.cgi?product=Orion">Co<u>m</u>ponent</a>:</b></label></td>
 *    <td>Client</td>
 *   </tr>
 *   ...
 */
(function () {

	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g, "");
	};

	var map = {};
	map["Orion_Client"] = "git://git.eclipse.org/gitroot/orion/org.eclipse.orion.client.git";
	map["Orion_Editor"] = "git://git.eclipse.org/gitroot/orion/org.eclipse.orion.client.git";
	map["Orion_Git"] = "git://git.eclipse.org/gitroot/orion/org.eclipse.orion.server.git";
	map["Orion_Server"] = "git://git.eclipse.org/gitroot/orion/org.eclipse.orion.server.git";
	map["Platform_Ant"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.git";
	map["Platform_Compare"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.team.git";
	map["Platform_CVS"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.team.git";
	map["Platform_Debug"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.debug.git";
	map["Platform_Doc"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.common.git";
	map["Platform_Releng"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.releng.maps.git";
	map["Platform_Resources"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.resources.git";
	map["Platform_Runtime"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.runtime.git";
	map["Platform_SWT"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.swt.git";
	map["Platform_Team"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.team.git";
	map["Platform_Text"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.text.git";
	map["Platform_UI"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.ui.git";
	map["Platform_User Assistance"] = "git://git.eclipse.org/gitroot/platform/eclipse.platform.ua.git";
	// TODO: add more

	var product = document.getElementById("product");
	var component = document.getElementById("component");
	var guest = false;

	if (product && component) {
		product = product.options[product.selectedIndex].value;
		component = component.options[component.selectedIndex].value;
	} else {
		guest = true;
		product = document.getElementById("field_container_product").textContent.trim();
		component = document.getElementById("field_container_product").parentNode.nextElementSibling.nextElementSibling.children[1].textContent.trim();
	}

	var gitRepoUrl = map[product + "_" + component];
	if (gitRepoUrl) {
		
		var url = document.createElement("a");
		url.id = "anchor";
		url.innerHTML = gitRepoUrl;
		url.href = "http://orionhub.org/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		url.target = "_blank";
		
		var radio1 = document.createElement("input");
		var orionhub = true;
		radio1.name = "select";
		radio1.id = "radio1";
		radio1.style.fontWeight = "normal";
		radio1.value = orionhub;
		radio1.type = "radio";
		radio1.checked = "true";
		radio1.onclick = function(){
			    if (document.getElementById("radio1").checked){
			    document.getElementById("anchor").href = "http:/orionhub.org/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
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
			    document.getElementById("anchor").href = "http:/orion.eclipse.org.org/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
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
			    document.getElementById("anchor").href = "http:/" + document.getElementById('hostid').value + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		    }
		}
		
		var host = document.createElement("input");
		host.className = "txt";
		host.size = "20";
		host.placeholder = "address";
		host.id = "hostid";
		host.onblur=function(){
		    if(document.getElementById("radio3").checked){
		    document.getElementById("anchor").href = "http:/" + document.getElementById('hostid').value + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		    }
		}
		
		host.onchange=function(){
		    if(document.getElementById("radio3").checked){
		    document.getElementById("anchor").href = "http:/" + document.getElementById('hostid').value + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		    }
		}
		
		host.onkeydown=function(){
		    if(document.getElementById("radio3").checked){
		    document.getElementById("anchor").href = "http:/" + document.getElementById('hostid').value + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		    }
		}
		host.onkeyup=function(){
		    if(document.getElementById("radio3").checked){
		    document.getElementById("anchor").href = "http:/" + document.getElementById('hostid').value + "/git/git-repository.html#,cloneGitRepository=" + gitRepoUrl;
		    }
		}
		
		var div = document.createElement("div");
		var hint = document.createElement("div");
		hint.innerHTML = "Select the Orion instance: ";
		hint.style.fontStyle = "normal";
		hint.style.fontWeight = "lighter";
		hint.style.marginTop = "10px";
		var hr = document.createElement("hr");;
		var table = document.getElementById("bz_big_form_parts");
		table.width = "100%";
		var row = table.insertRow(0);
		var cloneTh = row.insertCell(0);
		cloneTh.innerHTML = "Work with the bug in Orion";
		cloneTh.style.fontStyle = "bold";
		cloneTh.style.fontWeight = "bold";
		cloneTh.style.marginTop = "10px";
		cloneTh.style.marginBottom = "10px";
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
		node4.innerHTML = "and click the link below to clone ";
		node4.style.fontWeight = "normal";
		cloneTh.appendChild(node4);

		var row2 = table.insertRow(1);
		var cloneTh2 = row2.insertCell(0);
		cloneTh2.appendChild(url);
		var cloneTh3 = row2.insertCell(1);
		hr.width = "100%";
		url.style.paddingTop = "20px";
		var row3 = table.insertRow(2);
		row3.width = "100%";
		row3.appendChild(hr);
		
	}
})();