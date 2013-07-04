/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global window define require document*/
define(['i18n!orion/search/nls/messages', 'orion/EventTarget', 'orion/searchUtils'], function(messages, EventTarget, mSearchUtils){

	/**
	 * InputCompletion is an alternative to datalist support in html5.
	 * When binded with an html input element, it provides the input completion while user is typing in the input field.
	 * @param {DOMElement} inputFieldOrId The "text" type input html element. This is required.
	 * @param {function} binderFunc The callback function to provide a full set of proposal items that the proposal is based on.
	 * If a binder function is provided, every time when the input field is focused, we would ask for the full set of data and propose based on that.	 
	 * The parameter of the binderFunc is another call back function. The implementation of the binderFunc has to pass an array of 
	 * items to the call back.
	 * Each item must have 3 properties:
	 * <ul>
	 *   <li>type: can be either "proposal" or "category"</li>
	 *   <li>label: the display name of the item</li>
	 *   <li>value: the value that will be filtered on and send back to the input field</li>
	 * </ul>
	 *
	 * @param {Object} options The options that may affect how the proposal works.
	 * @param {Function} options.extendedProvider The extended provider function(keyword, callback(returnedProposals)) that provides additional proposals.
	 *        It basically provides a list of proposals by a given keyword and a call back. It should call the call back to return the proposals. 
	 * Each item in the return list must have properties as below:
	 * <ul>
	 *   <li>filterForMe: true or false. True means it asks inputCompletion to filter o nteh result. false means it is already filterd.
	 *   <li>proposals: A list/array of proposals. Each item has the properties {type, label, value} decribed above.</li>
	 * </ul>
	 * @param {String} options.group The group name of input completion. If there will be multiple input completion in one page, the group name is nice to provide.
	 * @param {Boolean} options.proposeFromStart The flag to propose strings that only match from start(index 0). If not provided, the flag is set to false.
	 * For example if this flag is true, "foo" will only match "fo" but not "oo". If false, "foo" will match both "fo" and "oo".
	 */
	function InputCompletion(inputFieldOrId, binderFunc, options) {
		this._inputField = inputFieldOrId;
		EventTarget.attach(this);
		if (typeof(this._inputField) === "string") { //$NON-NLS-0$
			this._inputField = document.getElementById(this._inputField);
		}
		this._binderFunc = binderFunc;
		var idFrefix = options ? options.group: null;
		if(!idFrefix){
			if(this._inputField.id){
				idFrefix = this._inputField.id;
			} else {
				idFrefix = "default__input__group"; //$NON-NLS-0$
			}
		}
		this._completionIdPrefix = idFrefix + "__completion__"; //$NON-NLS-0$
		this._proposeFromStart = options ? options.proposeFromStart : false;
		this._extendedProvider = options ? options.extendedProvider : null;
		this._serviceRegistry = options ? options.serviceRegistry : null;
		this._proposalIndex = -1;
		this._dismissed = true;
		this._mouseDown = false;
		this._dataList = [];
		this._initUI();
		
		this.addEventListener("recentSearchesChanged", function(event) {//$NON-NLS-0$
			if(this._binderFunc){// If a binder function is provided, every time when the input field is focused, we would ask for the full set of data and propose based on that
				var completion = this;
				this._binderFunc(function(dataList){
					this._bind(dataList);
					this._proposeOn(this._inputField.value);
				}.bind(completion));
			}
		}.bind(this));
		
		this._completionUIContainer.addEventListener("mousedown", function(e) {
			this._mouseDown = true;
		}.bind(this));
		this._completionUIContainer.addEventListener("mouseup", function(e) {
			this._mouseDown = false;
		}.bind(this));
		this._inputField.addEventListener("blur", function(e) {
			if(this._mouseDown){
				var completion = this;
				window.setTimeout(function(){ //wait a few milliseconds for the input field to focus 
					this._inputField.focus();
				}.bind(completion), 200);
			} else {
				this._dismiss();
			}
		}.bind(this));
		this._inputField.addEventListener("keydown", function(e) {
			this.onKeyDown(e);
		}.bind(this));
		this._inputField.addEventListener("input", function(e) {
			this._proposeOn(this._inputField.value);
		}.bind(this));
		this._inputField.addEventListener("focus", function(e) {
			if(!this._dismissed || !this._binderFunc){
				return;
			}
			if(this._dismissing){
				this._dismissing = false;
				return;
			}
			if(this._binderFunc){// If a binder function is provided, every time when the input field is focused, we would ask for the full set of data and propose based on that
				var completion = this;
				this._binderFunc(function(dataList){
					this._bind(dataList);
					if(this._inputField.value) {
						//this._proposeOn(this._inputField.value);
					}
				}.bind(completion));
			}
		}.bind(this));
	}
	
	/**
	 * The key listener on enter , down&up arrow and ESC keys.
	 * The user of the input completion has to listen on the key board events and call this function.
	 * If this function returns true, the caller's listener has to stop handling it.
	 */
	InputCompletion.prototype.onKeyDown = function(e){
		if(this._dismissed){
			return true;
		}
		var keyCode= e.charCode || e.keyCode;
		if (keyCode === 13/* Enter */) {//If there is already a selected/hightlighted item in the proposal list, then put hte proposal back to the input field and dismiss the proposal UI
			if(this._proposalList && this._proposalList.length > 0 && this._proposalIndex >= 0 && this._proposalIndex < this._proposalList.length){
				e.preventDefault();
				this._dismiss(this._proposalList[this._proposalIndex].item.value, e.ctrlKey);
				e.stopPropagation();
				return false;
			}
			return true;
		} else if((keyCode === 40 /* Down arrow */ || keyCode === 38 /* Up arrow */) && this._proposalList && this._proposalList.length > 0){
			e.preventDefault();
			this._walk(keyCode === 40);//In case of down or up arrows, jsut walk forward or backward in the list and highlight it.
			e.stopPropagation();
			return false;
		} else if(keyCode === 27/* ESC */) {
			e.preventDefault();
			this._dismiss();//Dismiss the proposal UI and do nothing.
			return false;
		} else if(keyCode === 46/* DELETE */) {
			if(this._proposalIndex > -1) { //If a proposal is highlighted in the suggestion, the delete key will delete the proposal.
				e.preventDefault();
				this._delete();
				e.stopPropagation();
				return false;
			}
			return true;
		}
		return true;
	};

	InputCompletion.prototype._bind = function(dataList){
		this._dataList = dataList;
	};
	
	InputCompletion.prototype._getUIContainerID = function(){
		return this._completionIdPrefix + "UIContainer";
	};

	InputCompletion.prototype._getUIProposalListId = function(){
		return this._completionIdPrefix + "UIProposalList";
	};
	
	InputCompletion.prototype._initUI = function(){
		this._completionUIContainer = document.getElementById(this._getUIContainerID());
		if(!this._completionUIContainer){
			this._completionUIContainer = document.createElement('div');
			this._completionUIContainer.id = this._getUIContainerID();
			this._completionUIContainer.style.display = "none"; //$NON-NLS-0$
			this._completionUIContainer.className = "inputCompletionContainer"; //$NON-NLS-0$
			this._completionUIContainer.setAttribute("role", "list");
			this._completionUIContainer.setAttribute("aria-atomic", "true");
			this._completionUIContainer.setAttribute("aria-live", "assertive");
			document.body.appendChild(this._completionUIContainer);
		}
		this._completionUIContainer.textContent = "";
		this._completionUL = document.getElementById(this._getUIProposalListId());
		if(!this._completionUL){
			this._completionUL = document.createElement('ul');//$NON-NLS-0$
			this._completionUL.id = this._getUIProposalListId();
			this._completionUL.className = "inputCompletionUL";//$NON-NLS-0$
		}
		this._completionUL.textContent = "";
		this._completionUIContainer.appendChild(this._completionUL);
	};
	
	InputCompletion.prototype._createProposalLink = function(name, href, boldIndex, boldLength) {
		var link = document.createElement("a"); //$NON-NLS-0$
		link.href = require.toUrl(href);
		link.appendChild(this._createBoldText(name, boldIndex, boldLength));
		return link;
	};
	
	InputCompletion.prototype._createBoldText = function(text, boldIndex, boldLength, parent){
		if(boldIndex < 0){
			return document.createTextNode(text);
		}
		var parentSpan = parent ? parent: document.createElement('span'); //$NON-NLS-0$
		var startIndex = 0;
		var textNode;
		if(startIndex !== boldIndex){
			textNode = document.createTextNode(text.substring(startIndex, boldIndex));
			parentSpan.appendChild(textNode);
		} 
		var matchSegBold = document.createElement('b'); //$NON-NLS-0$
		parentSpan.appendChild(matchSegBold);
		textNode = document.createTextNode(text.substring(boldIndex, boldIndex+boldLength));
		matchSegBold.appendChild(textNode);
		
		if((boldIndex + boldLength) < (text.length - 1)){
			textNode = document.createTextNode(text.substring(boldIndex + boldLength));
			parentSpan.appendChild(textNode);
		}
		return parentSpan;
	};
	
	InputCompletion.prototype._proposeOnCategory = function(categoryName, categoryList){
		if(categoryList.length === 0){
			return;
		}
		var listEle;
		if(categoryName){
			listEle = document.createElement('li');
			listEle.className = "inputCompletionLICategory"; //$NON-NLS-0$
			var liText = document.createTextNode(categoryName);
			listEle.appendChild(liText);
			this._completionUL.appendChild(listEle);
		}
		
		categoryList.forEach(function(category) {
			listEle = document.createElement('li');
			listEle.onmouseover = function(e){
				this._selectProposal(e.currentTarget);
			}.bind(this);
			listEle.onclick = function(e){
				this._dismiss(e.currentTarget.completionItem.value);
			}.bind(this);
			listEle.className = "inputCompletionLINormal"; //$NON-NLS-0$
			listEle.completionItem = category.item;
			var deleteBtn;
			if(typeof category.item.value === "string"){
				var tbl = document.createElement('table'); //$NON-NLS-0$
				tbl.style.width = "100%"; //$NON-NLS-0$
				tbl.style.tableLayout = 'fixed'; //$NON-NLS-0$
				tbl.style.borderSpacing = "0"; //$NON-NLS-0$
				var tr = document.createElement('tr');
				tr.style.width = this._inputField.offsetWidth + "px"; //$NON-NLS-0$
				tbl.appendChild(tr);
				var td1 = document.createElement('td'); //$NON-NLS-0$
				var liTextEle = this._createBoldText(category.item.value, category.boldIndex, category.boldLength);
				td1.appendChild(liTextEle);
				td1.style.overflow = 'hidden'; //$NON-NLS-0$
				tr.appendChild(td1);
				
				deleteBtn = document.createElement('button');
				deleteBtn.classList.add("dismissButton"); //$NON-NLS-0$
				deleteBtn.classList.add("layoutRight"); //$NON-NLS-0$
				deleteBtn.classList.add("core-sprite-close"); //$NON-NLS-0$
				deleteBtn.classList.add("imageSprite"); //$NON-NLS-0$
				deleteBtn.style.display = "none"; //$NON-NLS-0$
				deleteBtn.style.margin = "0 0 0"; //$NON-NLS-0$
				deleteBtn.title = messages['Click or use delete key to delete the search term'];
				deleteBtn.onclick = function(e){
					e.stopPropagation();
					this._proposalIndex = -1;
					mSearchUtils.removeRecentSearch(this._serviceRegistry, category.item.value, this);
				}.bind(this);
				
				var td2 = document.createElement('td'); //$NON-NLS-0$
				td2.style.width = "16px"; //$NON-NLS-0$
				td2.style.height = "16px"; //$NON-NLS-0$
				td2.appendChild(deleteBtn);
				tr.appendChild(td2);
				listEle.appendChild(tbl);
			} else if(category.item.value.name && category.item.value.type === "link"){ //$NON-NLS-0$
				listEle.appendChild(this._createProposalLink(category.item.value.name, category.item.value.value, category.boldIndex, category.boldLength));
			}
			this._completionUL.appendChild(listEle);
			this._proposalList.push({item: category.item, domNode: listEle, deleteBtn: deleteBtn});
		}.bind(this));
	};

	InputCompletion.prototype._domNode2Index = function(domNode){
		if(this._proposalList) {
			for(var i=0; i < this._proposalList.length; i++){
				if(this._proposalList[i].domNode === domNode){
					return i;
				}
			}
		}
		return -1;
	};
	
	InputCompletion.prototype._highlight = function(indexOrDomNode, selected){
		var domNode = indexOrDomNode;
		var deleteBtn;
		var fromIndex = false;
		if(!isNaN(domNode)){
			fromIndex = true;
			if(this._proposalList && indexOrDomNode >= 0 && indexOrDomNode < this._proposalList.length){
				domNode = this._proposalList[indexOrDomNode].domNode;
				deleteBtn = this._proposalList[indexOrDomNode].deleteBtn;
			} else {
				domNode = null;
			}
		}
		if(domNode){
			domNode.className = (selected ? "inputCompletionLISelected": "inputCompletionLINormal"); //$NON-NLS-1$ //$NON-NLS-0$
			if(deleteBtn){
				deleteBtn.style.display = selected ? "": "none"; //$NON-NLS-0$
			}
			if(selected && fromIndex){
				if (domNode.offsetTop < this._completionUIContainer.scrollTop) {
					domNode.scrollIntoView(true);
				} else if ((domNode.offsetTop + domNode.offsetHeight) > (this._completionUIContainer.scrollTop + this._completionUIContainer.clientHeight)) {
					domNode.scrollIntoView(false);
				}
			}
		}
	};

	InputCompletion.prototype._selectProposal = function(indexOrDomNode){
		var index = indexOrDomNode;
		if(isNaN(index)){
			index = this._domNode2Index(indexOrDomNode);
		}
		if(index !== this._proposalIndex){
			this._highlight(this._proposalIndex, false);
			this._proposalIndex = index;
			this._highlight(this._proposalIndex, true);
		}
	};
	
	InputCompletion.prototype._dismiss = function(valueToInputField, ctrlKey){
		if(this._mouseDown){
			return;
		}
		this._dismissed = true;
		this._proposalList = null;
		this._proposalIndex = -1;
		
		if(typeof valueToInputField === "string"){
			this._inputField.value = valueToInputField;
			this._dismissing = true;
			this._inputField.focus();
		} else if(valueToInputField && valueToInputField.name && valueToInputField.type === "link"){
			if(ctrlKey){
				window.open(valueToInputField.value);
			} else {
				window.location.href = valueToInputField.value;
			}
		}
		window.setTimeout(function(){ //wait a few milliseconds for the proposal pane to hide 
			this._completionUIContainer.style.display = "none"; //$NON-NLS-0$
		}.bind(this), 200);
	};
	
	InputCompletion.prototype._show = function(){
		if(this._proposalList && this._proposalList.length > 0){
			var curLeft=0, curTop=0;
			var offsetParent = this._inputField;
			while (offsetParent) {
				curLeft += offsetParent.offsetLeft;
				curTop += offsetParent.offsetTop;
		        offsetParent = offsetParent.offsetParent;
			}
			this._completionUIContainer.style.display = "block"; //$NON-NLS-0$
			this._completionUIContainer.style.top = curTop + this._inputField.offsetHeight + 2 + "px"; //$NON-NLS-0$
			this._completionUIContainer.style.left = curLeft + "px"; //$NON-NLS-0$
			this._completionUIContainer.style.width = this._inputField.offsetWidth + "px"; //$NON-NLS-0$
			this._mouseDown = false;
			this._dismissed = false;
		} else {
			this._dismissed = true;
			this._proposalList = null;
			this._proposalIndex = -1;
			this._completionUIContainer.style.display = "none"; //$NON-NLS-0$
		}
	};
	
	InputCompletion.prototype._walk = function(forwad){
		var index = this._proposalIndex + (forwad ? 1: -1);
		if(index < -1){
			index = this._proposalList.length -1;
		} else if( index >= this._proposalList.length){
			index = -1;
		}
		this._selectProposal(index);
	};
	
	InputCompletion.prototype._delete = function(){
		if(this._proposalIndex > -1) {
			mSearchUtils.removeRecentSearch(this._serviceRegistry, this._proposalList[this._proposalIndex].item.value, this);
			this._proposalIndex = -1;
			return true;
		}
		return false;
	};
	
	InputCompletion.prototype._proposeOnList = function(datalist, searchTerm, filterForMe){
		var categoryName = "";
		var categoryList = [];
		var searchTermLen = searchTerm ? searchTerm.length : 0;
		
		datalist.forEach(function(data) {
			if(data.type === "category"){ //$NON-NLS-0$
				this._proposeOnCategory(categoryName, categoryList);
				categoryName = data.label;
				categoryList = [];
			} else {
				var proposed = true;
				var pIndex = -1;
				if(searchTerm && filterForMe){
					var searchOn;
					if(typeof data.value === "string"){
						searchOn = data.value.toLowerCase();
					} else if(data.value.name){
						searchOn = data.value.name.toLowerCase();
					}
					pIndex = searchOn.indexOf(searchTerm);
					if(pIndex < 0){
						proposed = false;
					} else if(this._proposeFromStart){
						proposed = (pIndex === 0);
					} 
				}
				if(proposed){
					categoryList.push({item: data, boldIndex: pIndex, boldLength: searchTermLen});
				}
			}
		}.bind(this));
		this._proposeOnCategory(categoryName, categoryList);
	};
	
	InputCompletion.prototype._proposeOn = function(inputValue){
		this._completionUL.textContent = "";
		var searchTerm = inputValue ? inputValue.toLowerCase() : null;
		this._proposalList = [];
		//var topList = [{type: "proposal", value: {name: "Advanced Search", value: "/settings/settings.html", type: "link"}}]
		//this._proposeOnList(topList, searchTerm, false);
		this._proposeOnList(this._dataList, searchTerm, true);
		if(this._extendedProvider && searchTerm){
			this._extendedProvider(inputValue, function(extendedProposals){
				if(extendedProposals){
					var completion = this;
					extendedProposals.forEach(function(extendedProposal) {
						this._proposeOnList(extendedProposal.proposals, extendedProposal.filterForMe ? searchTerm : inputValue, extendedProposal.filterForMe);
					}.bind(completion));
				}
				this._show();	
			}.bind(this), []);
		} else {
			this._show();
		}
	};
	InputCompletion.prototype.constructor = InputCompletion;

	//return module exports
	return {
		InputCompletion: InputCompletion
	};
});
