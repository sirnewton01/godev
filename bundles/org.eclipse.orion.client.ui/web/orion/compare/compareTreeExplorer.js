/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['i18n!orion/compare/nls/messages', 'require', 'orion/webui/littlelib', 'orion/i18nUtil', 'orion/explorers/explorer', 'orion/fileClient', 'orion/commands', 
		'orion/explorers/navigationUtils', 'orion/crawler/searchCrawler', 'orion/compare/compareUtils', 'orion/searchUtils', 'orion/selection'], 
		function(messages, require, lib, i18nUtil, mExplorer, mFileClient, mCommands, mNavUtils, mSearchCrawler, mCompareUtils, mSearchUtils, mSelection) {
	var _DEBUG_ = false;
	function _logInfo(info) {
		if(_DEBUG_) {
			window.console.log(info);
		}
	}
	
	function _empty(nodeToEmpty){
		var node = lib.node(nodeToEmpty);
		if(node){
			lib.empty(node);
		}
	}
	
	function _connect(nodeOrId, event, eventHandler){
		var node = lib.node(nodeOrId);
		if(node){
			node.addEventListener(event, eventHandler, false); 
		}
	}
	
	function _place(nodeToPlace, parent, position){
		var parentNode = lib.node(parent);
		if(parentNode){
			if(position === "only"){ //$NON-NLS-0$
				lib.empty(parentNode);
			}
			parentNode.appendChild(nodeToPlace);
		}
	}
	
	function _addClass(nodeOrId, className){
		var node = lib.node(nodeOrId);
		if(node){
			node.classList.add(className); 
		}
	}
	
	function _createElement(elementTag, classNames, id, parent){
		var element = document.createElement(elementTag);
		if(classNames){
			if(Array.isArray(classNames)){
				for(var i = 0; i < classNames.length; i++){
					element.classList.add(classNames[i]);
				}
			} else if(typeof classNames === "string"){ //$NON-NLS-0$
				element.className = classNames;
			}
		}
		if(id){
			element.id = id;
		}
		var parentNode = lib.node(parent);
		if(parentNode){
			parentNode.appendChild(element);
		}
		return element;
	}
	
	/**
	 * Creates a new compare tree explorer.
	 * @name orion.CompareTreeExplorer
	 */
	function CompareTreeModel(rootPath, fetchItems, root) {
		this.rootPath = rootPath;
		this.fetchItems = fetchItems;
		this.root = root;
	}
	
	CompareTreeModel.prototype = new mExplorer.ExplorerFlatModel();
	
	CompareTreeModel.prototype.getId = function(item){
		return item.fileURL;
	};

	CompareTreeModel.prototype.constructor = CompareTreeModel;

	function CompareTreeExplorerRenderer(options, explorer){
		this._init(options);
		this.options = options;
		this.explorer = explorer;
	}
	
	CompareTreeExplorerRenderer.prototype = new mExplorer.SelectionRenderer();
	
	CompareTreeExplorerRenderer.prototype.getCellHeaderElement = function(col_no){
		var col, h2;
		switch(col_no){
			case 0:
				col = _createElement('th'); //$NON-NLS-0$
				h2 = _createElement('h2', "compare_tree_grid", null, col); //$NON-NLS-1$ //$NON-NLS-0$
				h2.textContent = this.explorer._compareResults.length + " of " + this.explorer._totalFiles + messages["files changed"]; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				return col;
			case 1: 
				col = _createElement('th'); //$NON-NLS-0$
				h2 = _createElement('h2', "compare_tree_grid", null, col); //$NON-NLS-1$ //$NON-NLS-0$
				h2.textContent = messages["Location"]; //$NON-NLS-0$
			return col;
		}
	};
	
	CompareTreeExplorerRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var col, div, span, linkRef;
		switch(col_no){
		case 0:
			col = _createElement('td'); //$NON-NLS-0$
			div = _createElement('div', "compare_tree_grid", null, col); //$NON-NLS-1$ //$NON-NLS-0$
			
			var diffStatusIcon = _createElement("span", null, null, div); //$NON-NLS-0$
			var displayName;
			if(item.type){
				switch (item.type) {
					case "added": //$NON-NLS-0$
						_addClass(diffStatusIcon, "imageSprite"); //$NON-NLS-0$
						_addClass(diffStatusIcon, "core-sprite-compare-addition"); //$NON-NLS-0$
						displayName = item.name;
						linkRef = require.toUrl("edit/edit.html") + "#" + item.fileURL; //$NON-NLS-1$ //$NON-NLS-0$
						break;
					case "removed": //$NON-NLS-0$
						_addClass(diffStatusIcon, "imageSprite"); //$NON-NLS-0$
						_addClass(diffStatusIcon, "core-sprite-compare-removal"); //$NON-NLS-0$
						displayName = item.name;
						linkRef = require.toUrl("edit/edit.html") + "#" + item.fileURL; //$NON-NLS-1$ //$NON-NLS-0$
						break;
					case "modified": //$NON-NLS-0$
						_addClass(diffStatusIcon, "imageSprite"); //$NON-NLS-0$
						_addClass(diffStatusIcon, "core-sprite-file"); //$NON-NLS-0$
						displayName = item.name;
						linkRef = mCompareUtils.generateCompareHref(item.fileURL, {compareTo: item.fileURLBase, readonly: this.explorer.readonly()});
						break;
				}
			}
			
			span = _createElement('span', "primaryColumn", null, div); //$NON-NLS-1$ //$NON-NLS-0$
			_place(document.createTextNode(displayName), span, "only");//$NON-NLS-0$
			mNavUtils.addNavGrid(this.explorer.getNavDict(), item, span);
			_connect(span, "click", function() { //$NON-NLS-0$
				window.open(linkRef);
			});
			_connect(span, "mouseover", function() { //$NON-NLS-0$
				span.style.cursor ="pointer"; //$NON-NLS-0$
			});
			_connect(span, "mouseout", function() { //$NON-NLS-0$
				span.style.cursor ="default"; //$NON-NLS-0$
			});
			return col;
		case 1:
			if(!item.fullPathName){
				return;
			}
			col = _createElement('td'); //$NON-NLS-0$
			div = _createElement('div', "compare_tree_grid", null, col); //$NON-NLS-1$ //$NON-NLS-0$
			
			span = _createElement('span', "primaryColumn", null, div); //$NON-NLS-1$ //$NON-NLS-0$
			linkRef = require.toUrl("edit/edit.html") + "#" + item.parentLocation; //$NON-NLS-1$ //$NON-NLS-0$
			var fileService = this.explorer.getFileServiceName(item);
			_place(document.createTextNode(fileService + "/" + item.fullPathName), span, "only"); //$NON-NLS-1$ //$NON-NLS-0$
			mNavUtils.addNavGrid(this.explorer.getNavDict(), item, span);
			_connect(span, "click", function() { //$NON-NLS-0$
				window.open(linkRef);
			});
			_connect(span, "mouseover", function() { //$NON-NLS-0$
				span.style.cursor ="pointer"; //$NON-NLS-0$
			});
			_connect(span, "mouseout", function() { //$NON-NLS-0$
				span.style.cursor ="default"; //$NON-NLS-0$
			});
			return col;
		}
	};
	
	CompareTreeExplorerRenderer.prototype.constructor = CompareTreeExplorerRenderer;
	
	function CompareTreeExplorer(registry, parentId, commandService){
		this.selection = new mSelection.Selection(registry, "orion.compare.selection"); //$NON-NLS-0$
		this.registry = registry;
		this._commandService = commandService;
		this._fileClient = new mFileClient.FileClient(this.registry);
		this._progress = registry.getService("orion.page.progress"); //$NON-NLS-0$
		this.parentId = parentId;
		this.renderer = new CompareTreeExplorerRenderer({checkbox: false}, this);
		//this.declareCommands();
	}
	CompareTreeExplorer.prototype = new mExplorer.Explorer();
	
	CompareTreeExplorer.prototype.reportStatus = function(message) {
		this.registry.getService("orion.page.message").setProgressMessage(message);	 //$NON-NLS-0$
	};

	CompareTreeExplorer.prototype._tailRelativePath = function(parentFullPath, childFullPath) {
		var containsParentPath = childFullPath.indexOf(parentFullPath);
		if(containsParentPath !== 0){
			throw new Error("File path does not contain the folder path"); //$NON-NLS-0$
		}
		var relativePath = childFullPath.substring(parentFullPath.length);
		if(relativePath.length > 0 && relativePath.indexOf("/") === 0){ //$NON-NLS-0$
			relativePath = relativePath.substring(1);
		}
		return relativePath;
	};
	
	CompareTreeExplorer.prototype._compareHitTest = function(files, OveralIndex) {
		_logInfo("compare hit testing on: " + OveralIndex ); //$NON-NLS-0$
		_logInfo(files[0].URL );
		_logInfo(files[1].URL);
		if(files[1].Content !== files[0].Content){
			this._compareResults.push({type: "modified", fileURL: files[0].URL, fileURLBase: files[1].URL, name: files[0].name}); //$NON-NLS-0$
			this._renderUI();		
			_logInfo("Different files..." ); //$NON-NLS-0$
		} else {
			_logInfo("Same files..." ); //$NON-NLS-0$
		}
		files[1].Content = null;
		files[0].Content = null;
	};
	
	CompareTreeExplorer.prototype._testSameFiles = function(currentIndex) {
		if(currentIndex === this._sameFiles.length){
			var that = this;
			if(this._compareResults.length > 0){
				this._loadOneFileMetaData(0,function(){that._renderUI(); that._addOptions();});
			} else {
				var message = i18nUtil.formatMessage(messages["NoFoldersIdentical"], this._totalFiles);
			    var parentNode = lib.node(this.parentId);
			    parentNode.textContent = "";
			    var textBold = _createElement('b', null, null, parentNode); //$NON-NLS-1$ //$NON-NLS-0$
			    _place(document.createTextNode(message), textBold, "only"); //$NON-NLS-0$
			}
			_logInfo("completed compare"); //$NON-NLS-0$
			this.reportStatus("");	
		} else {
			this.reportStatus(i18nUtil.formatMessage(messages['comparingFile'], this._sameFiles[currentIndex].fileNew.Location)); //$NON-NLS-0$
			this._getFileContent([{URL: this._sameFiles[currentIndex].fileNew.Location, name: this._sameFiles[currentIndex].fileNew.Name}, 
					{URL: this._sameFiles[currentIndex].fileBase.Location, name: this._sameFiles[currentIndex].fileBase.Name}], 0, currentIndex);
		}
	};
	
	CompareTreeExplorer.prototype._loadOneFileMetaData =  function(index, onComplete){
		var item = this._compareResults[index];
		this._progress.progress(this._fileClient.read(item.fileURL, true), i18nUtil.formatMessage(messages['readingFileMetadata'], item.fileURL)).then( //$NON-NLS-0$
			function(meta) {
				item.fullPathName = mSearchUtils.fullPathNameByMeta(meta.Parents);
				item.parentLocation = meta.Parents[0].ChildrenLocation;
				item.name = meta.Name;
				if(index === (this._compareResults.length-1)){	
					if(onComplete){
						onComplete();
					} else {
						return; 
					}
				} else {
					this._loadOneFileMetaData(index+1, onComplete);
				}
			}.bind(this),
			function(error) {
				window.console.error("Error loading file metadata: status " + error.status); //$NON-NLS-0$
				if(index === (this._compareResults.length-1)){
					if(onComplete){
						onComplete();
					} else {
						return; 
					}
				} else {
					this._loadOneFileMetaData( index+1, onComplete);
				}
			}.bind(this)
		);
	};

	CompareTreeExplorer.prototype._getChildrenLocation =  function(locations, index, onComplete){
		if(!this._fileClient){
			_logInfo("A file client is needed for getting file content"); //$NON-NLS-0$
			return;
		}
		var that = this;
		that._progress.progress(that._fileClient.read(locations[index].URL, true), i18nUtil.formatMessage(messages['readingFileMetadata'], locations[index].URL)).then(function(meta) { //$NON-NLS-0$
			locations[index].childrenLocation = meta.ChildrenLocation;
			if(index < (locations.length - 1)){
				that._getChildrenLocation(locations, index+1, onComplete);
			} else {
				onComplete();
			}
		}, function(error, ioArgs) {
			locations[index].childrenLocation = locations[index].URL;
			if(index < (locations.length - 1)){
				that._getChildrenLocation(locations, index+1, onComplete);
			} else {
				onComplete();
			}
		});
	};

	CompareTreeExplorer.prototype._getFileContent = function(files, currentIndex, OveralIndex) {
		if(!this._fileClient){
			_logInfo("A file client is needed for getting file content"); //$NON-NLS-0$
			return;
		}
		var that = this;
		that._progress.progress(that._fileClient.read(files[currentIndex].URL), i18nUtil.formatMessage(messages['readingFile'], files[currentIndex].URL)).then(function(contents) { //$NON-NLS-0$
			files[currentIndex].Content = contents;
			if(currentIndex < (files.length - 1)){
				that._getFileContent(files, currentIndex+1, OveralIndex);
			} else {
				that._compareHitTest(files, OveralIndex);
				that._testSameFiles(OveralIndex+1);
			}
		}, function(error, ioArgs) {
			if (error.status === 404) {
				files[currentIndex].Content = "";
				if(currentIndex < (files.length - 1)){
					that._getFileContent(files, currentIndex+1, OveralIndex);
				} else {
					that._compareHitTest(files, OveralIndex);
					that._testSameFiles(files, OveralIndex+1);
				}
			} else if (that.errorCallback) {
				that.errorCallback(error, ioArgs);
			}
		});
	};
	
	CompareTreeExplorer.prototype.getFileServiceName = function(item) {
		if(item.type === "removed"){ //$NON-NLS-0$
			return this._fileServiceNameBase;
		}
		return this._fileServiceNameNew;
	};

	CompareTreeExplorer.prototype._compareSkeletons = function(currentIndex) {
		this._compareResults = [];
		this._sameFiles = [];//To buffer a list of file pairs that have the same relative location
		var skeletonNew = this._fileSkeletonNew;
		var skeletonBase = this._fileSkeletonBase;
		var curResItemBase;
		for(var i = 0; i < skeletonNew.length; i++){//Loop on file skeleton to be compared
			var hasSameFile = false;
			var curResItemNew = skeletonNew[i];
			var relativePathNew = this._tailRelativePath(this._folderNew, curResItemNew.Location);
			for( var j = 0; j < skeletonBase.length; j++){//Loop on file skeleton to compare with
				curResItemBase = skeletonBase[j];
				var relativePathBase = this._tailRelativePath(this._folderBase, curResItemBase.Location);
				if(relativePathBase === relativePathNew){//If the relative path is the same, we treat them as same file
					curResItemNew._hasSameFile = true;
					curResItemBase._hasSameFile = true;
					hasSameFile = true;
					this._sameFiles.push({fileNew: curResItemNew, fileBase: curResItemBase});//Buffer the same files that will be tested later
					break;
				}
			}
			if(!hasSameFile){//If a file in the new file skeleton has no partner in the base file skeleton, it is treatede as added file.
				this._compareResults.push({type: "added", fileURL: curResItemNew.Location, name: curResItemNew.Name}); //$NON-NLS-0$
			}
		}
		for( var k = 0; k < skeletonBase.length; k++){//Loop on the base file skeleton(the opne to compare with) to filter out those that do not have "_hasSameFile" property.
			curResItemBase = skeletonBase[k];
			if(!curResItemBase._hasSameFile){
				this._compareResults.push({type: "removed", fileURL: curResItemBase.Location, name: curResItemBase.Name}); //$NON-NLS-0$
			}
		}
		this._totalFiles = this._compareResults.length + this._sameFiles.length;
		if(this._compareResults.length > 0){
			this._renderUI();
		}
		this._testSameFiles(0);
	};

	CompareTreeExplorer.prototype.prepareResults = function(compareParams) {
		this._compareParams = compareParams;
		if(this._compareParams.resource && this._compareParams.compareTo){
			this._folderNew = this._compareParams.resource;
			this._folderBase = this._compareParams.compareTo;
			this._fileServiceNameNew = this._fileClient.fileServiceName(this._folderNew);
			this._fileServiceNameBase = this._fileClient.fileServiceName(this._folderBase);
			
			var that = this;
			var locations = [{URL:this._folderNew},{URL:this._folderBase}];
			this._getChildrenLocation(locations, 0, function(){
				var crawlerNew = new mSearchCrawler.SearchCrawler(that.registry, that._fileClient, "", {buildSkeletonOnly: true, location: that._folderNew, childrenLocation: locations[0].childrenLocation,
									   fetchChildrenCallBack: function(folderURL){
									       that.reportStatus(i18nUtil.formatMessage(messages['fetchingFolder'], folderURL));  //$NON-NLS-0$
									   }
									}); 
				var crawlerBase = new mSearchCrawler.SearchCrawler(that.registry, that._fileClient, "", {buildSkeletonOnly: true, location: that._folderBase, childrenLocation: locations[1].childrenLocation,
									   fetchChildrenCallBack: function(folderURL){
									       that.reportStatus(i18nUtil.formatMessage(messages['fetchingFolder'], folderURL));  //$NON-NLS-0$
									   }
									}); 
				crawlerNew.buildSkeleton(
					function(){
					    //empty
					}, 
					function(){
						crawlerBase.buildSkeleton(
							function(){
							    //empty
							}, 
							function(){
								that._fileSkeletonNew = crawlerNew.fileSkeleton;
								that._fileSkeletonBase = crawlerBase.fileSkeleton;
								that._compareSkeletons(0);
						});
				});
			});
		} 
	};

	CompareTreeExplorer.prototype.startup = function(compareParams) {
		_empty(this.parentId);
		this.reportStatus(messages['generatingTreeResult']); //$NON-NLS-0$
		this.prepareResults(compareParams);
	};

	CompareTreeExplorer.prototype.readonly = function() {
		return (this._compareParams.readonly === "true" ? true : false); //$NON-NLS-0$
	};

	CompareTreeExplorer.prototype._addOptions = function() {
		var that = this;
		_empty("pageNavigationActions"); //$NON-NLS-0$
		var optionMenu = mCommands.createDropdownMenu("pageNavigationActions", messages['Options']); //$NON-NLS-1$ //$NON-NLS-0$
		mCommands.createCheckedMenuItem(optionMenu.menu, messages["Sort by folders"], false,
			function(event) {
				that._sortByFolder = event.target.checked;
				that._renderUI();
				optionMenu.dropdown.close(true);
			});
	};

	CompareTreeExplorer.prototype._renderUI = function() {
		var that = this;
		this._compareResults.sort( function(item1, item2){
				var name1 = that._sortByFolder ? (that.getFileServiceName(item1) + item1.fullPathName).toLowerCase(): item1.name.toLowerCase();
				var name2 = that._sortByFolder ? (that.getFileServiceName(item2) + item2.fullPathName).toLowerCase(): item2.name.toLowerCase();
				if (name1 > name2) {
					return 1;
				} else if (name1 < name2) {
					return -1;
				} else {
					return 0;
				}
			});
		this.createTree(this.parentId, new CompareTreeModel(null, null, this._compareResults), {selectionPolicy: "cursorOnly", setFocus: true}); //$NON-NLS-0$
	};
	
	CompareTreeExplorer.prototype.constructor = CompareTreeExplorer;

	//return module exports
	return {
		CompareTreeExplorer: CompareTreeExplorer
	};
});