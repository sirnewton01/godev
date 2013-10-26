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

/*global define console window*/
/*jslint regexp:false browser:true forin:true*/

define(['i18n!orion/crawler/nls/messages', 'require', 'orion/i18nUtil', 'orion/searchUtils', 'orion/contentTypes', 'orion/Deferred'], 
		function(messages, require, i18nUtil, mSearchUtils, mContentTypes, Deferred) {
	
	/**
	 * SearchCrawler is an alternative when a file service does not provide the search API.
	 * It assumes that the file client at least provides the fetchChildren and read APIs.
	 * It basically visits all the children recursively under a given directory location and search on a given keyword, either literal or wild card.
	 * @param {serviceRegistry} serviceRegistry The service registry.
	 * @param {fileClient} fileClient The file client that provides fetchChildren and read APIs.
	 * @param {Object} searchParams The search parameters. 
	 * @param {Object} options Not used yet. For future use.
	 * @name orion.search.SearchCrawler
	 */
	function SearchCrawler(	serviceRegistry, fileClient, searchParams, options) {
		this.registry= serviceRegistry;
		this.fileClient = fileClient; 
		this.fileLocations = [];
		this.fileSkeleton = [];
		this._hitCounter = 0;
		this._totalCounter = 0;
		this._searchOnName = options && options.searchOnName;
		this._buildSkeletonOnly = options && options.buildSkeletonOnly;
		this._fetchChildrenCallBack = options && options.fetchChildrenCallBack;
		this._searchParams = searchParams;
		this.searchHelper = (this._searchOnName || this._buildSkeletonOnly) ? null: mSearchUtils.generateSearchHelper(searchParams);
		this._location = options && options.location;
		this._childrenLocation = options && options.childrenLocation ? options.childrenLocation : this._location;   
		this._cancelled = false;
		this.registry.getService("orion.page.message").setCancelFunction(function() {this._cancelFileContentsSearch();}.bind(this));
	}
	
	/**
	 * Do search based on this.searchHelper.
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.search = function(onComplete){
		var contentTypeService = this.registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
		this._onSearchComplete = onComplete;
		this._cancelled = false;
		this._deferredArray = [];
		contentTypeService.getContentTypes().then(function(ct) {
			this.contentTypesCache = ct;
			var crawler = this;
			this._visitRecursively(this._childrenLocation).then(function(){ //$NON-NLS-0$
				//self._searchFiles().then(function(){
					this._sort(this.fileLocations);
					var response = {numFound: this.fileLocations.length, docs: this.fileLocations };
					this._onSearchComplete({response: response});
				//});
			}.bind(crawler));
		}.bind(this));
	};
	
	/**
	 * Search file name on the query string from the file skeleton.
	 * @param {String} queryStr The query string. This is temporary for now. The format is "?sort=Path asc&rows=40&start=0&q=keyword+Location:/file/e/bundles/\*"
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.searchName = function(searchParams, onComplete){
		if(searchParams){
			this.searchHelper = mSearchUtils.generateSearchHelper(searchParams, true);
		}
		if(onComplete){
			this.onSearchNameComplete = onComplete;
		}
		var results = [];
		this._cancelled = false;
		this._deferredArray = [];
		this._sort(this.fileSkeleton);
		if(this.fileSkeleton.length > 0){
			for (var i = 0; i < this.fileSkeleton.length ; i++){
				var lineString = this.fileSkeleton[i].Name.toLowerCase();
				var result;
				if(this.searchHelper.inFileQuery.wildCard){
					result = mSearchUtils.searchOnelineRegEx(this.searchHelper.inFileQuery, lineString, true);
				} else {
					result = mSearchUtils.searchOnelineLiteral(this.searchHelper.inFileQuery, lineString, true);
				}
				if(result){
					results.push(this.fileSkeleton[i]);
					if(results.length >= this.searchHelper.params.rows){
						break;
					}
				}
			}
			var response = {numFound: results.length, docs: results };
			this.onSearchNameComplete({response: response});
		}
	};
	
	/**
	 * Do search based on this.searchHelper.
	 * @param {Function} onComplete The callback function on search complete. The array of hit file locations are passed to the callback.
	 */
	SearchCrawler.prototype.buildSkeleton = function(onBegin, onComplete){
		this._buildingSkeleton = true;
		var contentTypeService = this.registry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
		this._cancelled = false;
		this._deferredArray = [];
		var that = this;
		onBegin();
		contentTypeService.getContentTypes().then(function(ct) {
			that.contentTypesCache = ct;
			var result = that._visitRecursively(that._childrenLocation).then(function(){ //$NON-NLS-0$
					that._buildingSkeleton = false;
					onComplete();
					if(that.searchHelper && !that._buildSkeletonOnly){
						that.searchName();
					}
			});
		});
	};
	
	SearchCrawler.prototype._searchCompleted = function(){
		console.log("Search Completed.");//$NON-NLS-0$
	};
	
	SearchCrawler.prototype._searchFiles = function(){
		var results = [];
		if(this.fileLocations.length > 0){
			for (var i = 0; i < this.fileLocations.length ; i++){
				results.push(this._sniffSearch(this.fileLocations[i]));
			}
		}
		return Deferred.all(results);
	};
		
	SearchCrawler.prototype._sort = function(fileArray){
		fileArray.sort(function(a, b) {
			var n1 = a.Name && a.Name.toLowerCase();
			var n2 = b.Name && b.Name.toLowerCase();
			if (n1 < n2) { return -1; }
			if (n1 > n2) { return 1; }
			return 0;
		}); 
	};
		
	SearchCrawler.prototype._onFileType = function(contentType){
		if(this.searchHelper.params.fileType){
			if(this.searchHelper.params.fileType === mSearchUtils.ALL_FILE_TYPE){
				return true;
			}
			return contentType.extension.indexOf(this.searchHelper.params.fileType) >= 0;
		}
		return true;
	};

	SearchCrawler.prototype._visitRecursively = function(directoryLocation){
		var results = [];
		var _this = this;
		if(this._fetchChildrenCallBack){
			this._fetchChildrenCallBack(directoryLocation);
		}
		var progress = _this.registry.getService("orion.page.progress");
		return (progress ? progress.progress(_this.fileClient.fetchChildren(directoryLocation), "Crawling search for children of " + directoryLocation) : _this.fileClient.fetchChildren(directoryLocation)).then(function(children) { //$NON-NLS-0$
			for (var i = 0; i < children.length ; i++){
				if(children[i].Directory!==undefined && children[i].Directory===false){
					if(_this._searchOnName){
						results.push(_this._buildSingleSkeleton(children[i]));
					} else if(_this._buildSkeletonOnly){
						results.push(_this._buildSingleSkeleton(children[i]));
					}else if(!_this._cancelled) {
						var contentType = mContentTypes.getFilenameContentType(children[i].Name, _this.contentTypesCache);
						if(contentType && (contentType['extends'] === "text/plain" || contentType.id === "text/plain") && _this._onFileType(contentType)){ //$NON-NLS-0$ //$NON-NLS-0$ //$NON-NLS-0$
							var fileDeferred = _this._sniffSearch(children[i]);
							results.push(fileDeferred);
							_this._deferredArray.push(fileDeferred);
						}
					}
				} else if (children[i].Location) {
					if(_this._cancelled) {
						break;
					} else {
						var folderDeferred = _this._visitRecursively(children[i].ChildrenLocation);
						results.push(folderDeferred);
						_this._deferredArray.push(folderDeferred);
					}
				}
			}
			return Deferred.all(results);
		});
	};

	SearchCrawler.prototype._hitOnceWithinFile = function( fileContentText){
		var lineString = this._searchParams.caseSensitive ? fileContentText : fileContentText.toLowerCase();
		var result;
		if(this.searchHelper.inFileQuery.wildCard){
			result = mSearchUtils.searchOnelineRegEx(this.searchHelper.inFileQuery, lineString, true);
		} else {
			result = mSearchUtils.searchOnelineLiteral(this.searchHelper.inFileQuery, lineString, true);
		}
		return result;
	};

	SearchCrawler.prototype._reportSingleHit = function(fileObj){
		fileObj.LastModified = fileObj.LocalTimeStamp;
		this.fileLocations.push(fileObj);
		this._hitCounter++;
		this._sort(this.fileLocations);
		var response = {numFound: this.fileLocations.length, docs: this.fileLocations };
		this._onSearchComplete({response: response}, true);
	};
	
	SearchCrawler.prototype._cancelFileContentsSearch = function(){
		this._cancelled = true;
		if(this._cancelled) {
			this._deferredArray.forEach(function(result) {
				result.cancel();
			});
		}
		this._sort(this.fileLocations);
		var response = {numFound: this.fileLocations.length, docs: this.fileLocations };
		this._onSearchComplete({response: response});
		console.log("Crawling search cancelled. Deferred array length : " + this._deferredArray.length); //$NON-NLS-0$
		this.registry.getService("orion.page.message").setProgressResult({Message: messages["Search cancelled by user"], Severity: "Warning"});
	};
	
	SearchCrawler.prototype._sniffSearch = function(fileObj){
		this._totalCounter++;
		var self = this;
		if(this._cancelled){
			return;
		}
		if(this.searchHelper.params.keyword === ""){
			this._reportSingleHit(fileObj);
			this.registry.getService("orion.page.message").setProgressResult({Message: i18nUtil.formatMessage(messages["${0} files found out of ${1}"], this._hitCounter, this._totalCounter)});
		} else {
			return  this.registry.getService("orion.page.progress").progress(self.fileClient.read(fileObj.Location), "Reading file " + fileObj.Location).then(function(jsonData) { //$NON-NLS-0$
				//self.registry.getService("orion.page.message").setProgressResult({Message: messages['Searching file:'] + " " + fileObj.Name});
				if(self._hitOnceWithinFile(jsonData)){
					self._reportSingleHit(fileObj);
				}
				self.registry.getService("orion.page.message").setProgressResult({Message: i18nUtil.formatMessage(messages["${0} files found out of ${1}"], self._hitCounter, self._totalCounter)}, messages["Cancel"]);
				},
				function(error) {
					if(error && error.message && error.message.toLowerCase() !== "cancel") { //$NON-NLS-0$
						console.error("Error loading file content: " + error.message); //$NON-NLS-0$
					}
				}
			);
		}
	};
	
	SearchCrawler.prototype._buildSingleSkeleton = function(fileObj){
		this._totalCounter++;
		this.fileSkeleton.push(fileObj);
		if(this.searchHelper && !this._buildSkeletonOnly && this._totalCounter%100 === 0){
			this.searchName();
		}
		//console.log("skeltoned files : "+ this._totalCounter);
		//console.log(fileObj.Location);
		var df = new Deferred();
		df.resolve(this._totalCounter);
		return df;
	};
	
	SearchCrawler.prototype.constructor = SearchCrawler;
	
	//return module exports
	return {
		SearchCrawler: SearchCrawler
	};
});
