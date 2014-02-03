/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andy Clement (vmware) - bug 344614
 *******************************************************************************/
/*jslint browser:true*/
/*global define orion window console*/

define(['i18n!orion/widgets/nls/messages', 'orion/crawler/searchCrawler', 'orion/contentTypes', 'require', 'orion/webui/littlelib', 'orion/util', 'orion/webui/dialog'], 
		function(messages, mSearchCrawler, mContentTypes, require, lib, util, dialog) {
	/**
	 * Usage: <code>new OpenResourceDialog(options).show();</code>
	 * 
	 * @name orion.webui.dialogs.OpenResourceDialog
	 * @class A dialog that searches for files by name or wildcard.
	 * @param {String} [options.title] Text to display in the dialog's titlebar.
	 * @param {orion.searchClient.Searcher} options.searcher The searcher to use for displaying results.
	 * @param {Function} options.onHide a function to call when the dialog is hidden.  Optional.
	 */
	function OpenResourceDialog(options) {
		this._init(options);
	}
	
	OpenResourceDialog.prototype = new dialog.Dialog();


	OpenResourceDialog.prototype.TEMPLATE = 
		'<div role="search">' + //$NON-NLS-0$
			'<div><label id="fileNameMessage" for="fileName">${Type the name of a file to open (? = any character, * = any string):}</label></div>' + //$NON-NLS-0$
			'<div><input id="fileName" type="text" class="setting-control" style="width:90%;"/></div>' + //$NON-NLS-0$
			'<div id="progress" style="padding: 2px 0 0; width: 100%;"><img src="'+ require.toUrl("../../../images/progress_running.gif") + '" class="progressPane_running_dialog" id="crawlingProgress"></img></div>' +  //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			'<div id="results" style="max-height:250px; height:auto; overflow-y:auto;" aria-live="off"></div>' + //$NON-NLS-0$
			'<div id="statusbar"></div>' + //$NON-NLS-0$
		'</div>'; //$NON-NLS-0$

	OpenResourceDialog.prototype._init = function(options) {
		this.title = options.title || messages['Find File Named'];
		this.modal = true;
		this.messages = messages;
		this._searcher = options.searcher;
		this._progress = options.progress;
		this._onHide = options.onHide;
		this._contentTypeService = new mContentTypes.ContentTypeRegistry(this._searcher.registry);
		if (!this._searcher) {
			throw new Error("Missing required argument: searcher"); //$NON-NLS-0$
		}	
		this._searchDelay = options.searchDelay || 500;
		this._time = 0;
		this._searcher.setCrawler(null);
		this._forceUseCrawler = false;
		this._initialText = options.initialText;
		this._message = options.message;
		this._nameSearch = true;
		if (options.nameSearch !== undefined) {
			this._nameSearch = options.nameSearch;
		}
		this._searchOnRoot = true;
		this._fileService = this._searcher.getFileService();
		if (!this._fileService) {
			throw new Error(messages['Missing required argument: fileService']);
		}
		this._searchRenderer = options.searchRenderer;
		if (!this._searchRenderer || typeof(this._searchRenderer.makeRenderFunction) !== "function") { //$NON-NLS-0$
			throw new Error(messages['Missing required argument: searchRenderer']);
		}
		this._initialize();
	};
	
	OpenResourceDialog.prototype._bindToDom = function(parent) {
		var self = this;
		self.$crawlingProgress.style.display = "none"; //$NON-NLS-0$
		if(this._nameSearch) {
			this.$fileName.setAttribute("placeholder", messages["FileName FolderName"]);  //$NON-NLS-0$
		} else {
			this.$fileName.setAttribute("placeholder", messages["Search"]);  //$NON-NLS-0$
		}
		this.$fileName.addEventListener("input", function(evt) { //$NON-NLS-0$
			self._time = + new Date();
			if (self._timeoutId) {
				clearTimeout(self._timeoutId);
			}
			self._timeoutId = setTimeout(self.checkSearch.bind(self), 0);
		}, false);
		this.$fileName.addEventListener("keydown",function(evt) { //$NON-NLS-0$
			if (evt.keyCode === lib.KEY.ENTER) {
				var link = lib.$("a", self.$results); //$NON-NLS-0$
				if (link) {
					lib.stop(evt);
					if(util.isMac ? evt.metaKey : evt.ctrlKey){
						window.open(link.href);
					} else {
						window.location.href = link.href;
						self.hide();
					}
				}
			}
		}, false);
		parent.addEventListener("keydown", function(evt) { //$NON-NLS-0$
			var links, searchFieldNode, currentFocus, currentSelectionIndex, ele;
			var incrementFocus = function(currList, index, nextEntry) {
				if (index < currList.length - 1) {
					return currList[index+1];
				} else {
					return nextEntry;
				}
			};
			var decrementFocus = function(currList, index, prevEntry) {
				if (index > 0) {
					return currList[index-1];
				} else {
					return prevEntry;
				}
			};
			
			if (evt.keyCode === lib.KEY.DOWN || evt.keyCode === lib.KEY.UP) {
				links = lib.$$array("a", self.$results); //$NON-NLS-0$
				currentFocus = document.activeElement;
				currentSelectionIndex = links.indexOf(currentFocus);
				if (evt.keyCode === lib.KEY.DOWN) {
					if (currentSelectionIndex >= 0) {
						currentFocus.classList.remove("treeIterationCursor");
						ele = incrementFocus(links, currentSelectionIndex, links[0]);
						ele.focus();
						ele.classList.add("treeIterationCursor");
					} else if (links.length > 0) {
						// coming from the searchFieldNode
						ele = incrementFocus(links, -1, links[0]);
						ele.focus();
						ele.classList.add("treeIterationCursor");
					}   
				} else {
					if (currentSelectionIndex >= 0) {
						// jump to searchFieldNode if index === 0
						currentFocus.classList.remove("treeIterationCursor");
						searchFieldNode = self.$fileName;
						ele = decrementFocus(links, currentSelectionIndex, searchFieldNode);
						ele.focus();
						if(currentSelectionIndex > 0) {
							ele.classList.add("treeIterationCursor");
						}
					} else if (links.length > 0) {
						// coming from the searchFieldNode go to end of list
						links[links.length-1].focus();
						links[links.length-1].classList.add("treeIterationCursor");
					}
				}
				lib.stop(evt);
			}
		});
		parent.addEventListener("mouseup", function(e) { //$NON-NLS-0$
			// WebKit focuses <body> after link is clicked; override that
			e.target.focus();
		}, false);
		setTimeout(function() {
			if(self._forceUseCrawler || !self._fileService.getService(self._searcher.getSearchLocation())["search"]){//$NON-NLS-0$
				var searchLoc = self._searchOnRoot ? self._searcher.getSearchRootLocation() : self._searcher.getChildrenLocation();
				var crawler = new mSearchCrawler.SearchCrawler(self._searcher.registry, self._fileService, "", {searchOnName: true, location: searchLoc}); 
				self._searcher.setCrawler(crawler);
				crawler.buildSkeleton(function() {
					self.$crawlingProgress.style.display = "inline"; //$NON-NLS-0$
					self.$progress.appendChild(document.createTextNode(messages['Building file skeleton...']));
					}, function(){
						self.$crawlingProgress.style.display = "none"; //$NON-NLS-0$
						self.$progress.removeChild(self.$progress.lastChild);
					});
			}
		}, 0);
		if (this._message) {
			this.$fileNameMessage.removeChild(this.$fileNameMessage.firstChild);
			this.$fileNameMessage.appendChild(document.createTextNode(this._message));
		}
		if (this._initialText) {
			this.$fileName.value = this._initialText;
			this.doSearch();
		}
	};

	/** @private */
	OpenResourceDialog.prototype.checkSearch = function() {
		clearTimeout(this._timeoutId);
		var now = new Date().getTime();
		if ((now - this._time) > this._searchDelay) {
			this._time = now;
			this.doSearch();
		} else {
			this._timeoutId = setTimeout(this.checkSearch.bind(this), 50); //$NON-NLS-0$
		}
	};

	/** @private */
	OpenResourceDialog.prototype._detectFolderKeyword = function(text) {
		var regex, match, keyword = text, folderKeyword = null;
		if(this._nameSearch){
			regex = /(\S+)\s*(.*)/;
			match = regex.exec(text);
			if(match && match.length === 3){
				if(match[1]){
					keyword = match[1];
				}
				if(match[2]){
					folderKeyword = match[2];
				}
			}
		} else {
			//TODO: content search has to do similar thing. E.g. "foo bar" folder123
		}
		return {keyword: keyword, folderKeyword: folderKeyword};
	};

	/** @private */
	OpenResourceDialog.prototype.doSearch = function() {
		var text = this.$fileName.value;

		// don't do a server-side query for an empty text box
		if (text) {
			// Gives Webkit a chance to show the "Searching" message
			var keyword = this._detectFolderKeyword(text);
			var searchParams = this._searcher.createSearchParams(keyword.keyword, this._nameSearch, this._searchOnRoot);
			var renderFunction = this._searchRenderer.makeRenderFunction(this._contentTypeService, this.$results, false, this.decorateResult.bind(this));
			this.currentSearch = renderFunction;
			var div = document.createElement("div"); //$NON-NLS-0$
			div.appendChild(document.createTextNode(this._nameSearch ? messages['Searching...'] : util.formatMessage(messages["Searching for occurrences of"], text)));
			lib.empty(this.$results);
			this.$results.appendChild(div);
			this._searcher.search(searchParams, keyword.folderKeyword, function() {
				if (renderFunction === this.currentSearch) {
					renderFunction.apply(null, arguments);
				}
			}.bind(this));
		}
	};
	
	/** @private */
	OpenResourceDialog.prototype.decorateResult = function(resultsDiv) {
		var self = this;
		var links = lib.$$array("a", resultsDiv); //$NON-NLS-0$
		function clicked(evt) { //$NON-NLS-0$
			if (evt.button === 0 && !evt.ctrlKey && !evt.metaKey) {
				self.hide();
			}
		}
		for (var i=0; i<links.length; i++) {
			var link = links[i];
			link.addEventListener("click", clicked, false);
		}
	};
	
	/** @private */
	OpenResourceDialog.prototype._beforeHiding = function() {
		clearTimeout(this._timeoutId);
	};
	
	OpenResourceDialog.prototype._afterHiding = function() {
		if (this._onHide) {
			this._onHide();
		}
	};
	
	OpenResourceDialog.prototype.constructor = OpenResourceDialog;
	//return the module exports
	return {OpenResourceDialog: OpenResourceDialog};
});
