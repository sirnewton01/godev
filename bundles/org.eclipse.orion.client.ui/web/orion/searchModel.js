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

/*eslint-env browser, amd*/
define(['i18n!orion/search/nls/messages', 'orion/Deferred', 'orion/i18nUtil', 'orion/explorers/explorer', 'orion/searchUtils'],

function(messages, Deferred, i18nUtil, mExplorer, mSearchUtils) {

    /*** Internal model wrapper functions ***/

    function _getFileModel(modelItem) {
        if (!modelItem) {
            return null;
        }
        if (modelItem.type === "file") { //$NON-NLS-0$
            return modelItem;
        }
        return modelItem.parent;
    }

    /*
     *	The model to support the search result.
     */
    function SearchResultModel(serviceRegistry, fileClient, resultLocation, totalNumber, searchParams, options) {
        this.registry = serviceRegistry;
        this.fileClient = fileClient;
        this._resultLocation = resultLocation;
        this._numberOnPage = resultLocation.length;
        this._totalNumber = totalNumber;
        this._listRoot = {
            isRoot: true,
            children: []
        };
        this._filteredRoot = {
            isRoot: true,
            children: []
        };
        this._filterText = null;
        this._indexedFileItems = [];
        this._location2ModelMap = [];
        this._lineDelimiter = "\n"; //$NON-NLS-0$
        this.onMatchNumberChanged = options.onMatchNumberChanged;
        this._searchHelper = mSearchUtils.generateSearchHelper(searchParams);
    }
    SearchResultModel.prototype = new mExplorer.ExplorerModel();

    /*** Over write all the prototypes defined by mExplorer.ExplorerModel ***/
    SearchResultModel.prototype.getRoot = function(onItem) {
        onItem(this.getListRoot());
    };

    SearchResultModel.prototype.getChildren = function(parentItem, onComplete) {
        if (!parentItem) {
            return;
        }
        if(parentItem.type === "file" && this._filterText){
			if(parentItem.filteredChildren) {
				onComplete(parentItem.filteredChildren);
			} else {
				onComplete([]);
			}
			return;
        }
        if (parentItem.children) {
			onComplete(parentItem.children);
        } else if (parentItem.type === "detail") { //$NON-NLS-0$
            onComplete([]);
        } else if (parentItem.type === "file" && parentItem.location) { //$NON-NLS-0$
            if (this._searchHelper.params.keyword === "") {
                return;
            }
            this.registry.getService("orion.page.progress").progress(this.fileClient.read(parentItem.location), "Getting file contents " + parentItem.name).then( //$NON-NLS-1$ //$NON-NLS-0$

            function(jsonData) {
                mSearchUtils.searchWithinFile(this._searchHelper.inFileQuery, parentItem, jsonData, this._lineDelimiter, this.replaceMode(), this._searchHelper.params.caseSensitive);
                if (this.onMatchNumberChanged) {
                    this.onMatchNumberChanged(parentItem);
                }
                onComplete(parentItem.children);
            }.bind(this),

            function(error) {
                console.error("Error loading file content: " + error.message); //$NON-NLS-0$
                onComplete([]);
            }.bind(this));
        } else {
            onComplete([]);
        }
    };

    SearchResultModel.prototype.getId = function(item) {
        var result;
        if (item === this.getListRoot()) {
            result = this.rootId;
        } else {
            result = item.location;
            // remove all non valid chars to make a dom id. 
            result = result.replace(/[^\.\:\-\_0-9A-Za-z]/g, "");
        }
        return result;
    };

    /*** Prototypes required by the search/replace renderer and explorer ***/

    /**
     * Return the root model. Required function.
     * There should be three layers of the root model. Any model item in each layer must have a string property called type.
     * The top layer is the root model whose type is "root". It should have a property callded children which is an array object.
     * The middle layer is the files whose type is "file". It should have a property callded children which is an array object and a property called parent which points to the root model.
     * The bottom layer is the detail matches within a file, whose type is "detail". It should have a property called parent which points to the file item.
     */
    SearchResultModel.prototype.getListRoot = function() {
        return this._filterText ? this._filteredRoot : this._listRoot;
    };

    /**
     * build the model tree. Required function.
     * There should be three layers of the root model. Any model item in each layer must have a string property called type.
     * The top layer is the root model whose type is "root". It should have a property callded children which is an array object.
     * The middle layer is the files whose type is "file". It should have a property callded children which is an array object and a property called parent which points to the root model.
     * The bottom layer is the detail matches within a file, whose type is "detail". It should have a property called parent which points to the file item.
     */
    SearchResultModel.prototype.buildResultModel = function() {
        this._restoreGlobalStatus();
        this._indexedFileItems = [];
        this.getListRoot().children = [];
        for (var i = 0; i < this._resultLocation.length; i++) {
            var childNode = {
                parent: this.getListRoot(),
                type: "file", //$NON-NLS-0$
                name: this._resultLocation[i].name,
                lastModified: this._resultLocation[i].lastModified, //$NON-NLS-0$
                linkLocation: this._resultLocation[i].linkLocation,
                location: this._resultLocation[i].location,
                parentLocation: mSearchUtils.path2FolderName(this._resultLocation[i].location, this._resultLocation[i].name, true),
                fullPathName: mSearchUtils.path2FolderName(this._resultLocation[i].path, this._resultLocation[i].name)
            };
            this._location2ModelMap[childNode.location] = childNode;
            this.getListRoot().children.push(childNode);
            this._indexedFileItems.push(childNode);
        }
    };

    /**
     * Determines if the model is in replace mode. Required function.
     */
    SearchResultModel.prototype.replaceMode = function() {
        return (typeof this._searchHelper.params.replace === "string"); //$NON-NLS-0$
    };

    /**
     * Get the paging paramerterss. Required function.
     * The return value is an object containing the following properties:
     * totalNumber: the total number of files in the model
     * start: the zero-based number of the starting number of the file in this page.
     * rows: max number of files per page.
     * numberOnPage: current file numbers on the page
     */
    SearchResultModel.prototype.getPagingParams = function() {
        return {
            totalNumber: this._totalNumber,
            start: this._searchHelper.params.start,
            rows: this._searchHelper.params.rows,
            numberOnPage: this._numberOnPage
        };
    };

    /**
     * Get the scoping paramerters by a given model item. Required function.
     * This function is for customizing each link on the "Location" column. Each link represents an URL that can scope down the search.
     * @param {Object} modelItem The given model item.
     * The return value is an object containing the following properties:
     * name: String. The name of the link.
     * href: String. The href of the link.
     * tooltip: String. The tooltip of the link.
     */
    SearchResultModel.prototype.getScopingParams = function(modelItem) {
        var qParams = mSearchUtils.copySearchParams(this._searchHelper.params, true);
        qParams.resource = modelItem.parentLocation;
        qParams.start = 0;
        var tooltip = i18nUtil.formatMessage(messages["Search again in this folder with \"${0}\""], this._searchHelper.displayedSearchTerm);
        return {
            name: modelItem.fullPathName,
            tooltip: tooltip
        };
    };

    /**
     * Get the detail match infomation by a given model item. Required function.
     * This function is for matching the compare widget diff annotation when a detail match item is selected.
      * @param {Object} modelItem The given detail match model item.
     * The return value is an object containing the following properties:
     * lineString: String. The lline string of hte detail match.
     * lineNumber: Number. The zero-based line number of the detail match, in the file.
     * name: Number. The zero-based line number of the detail match, in the file.
     * matches: Array. All the matches on this line.  Each item of the array contains:
     *         startIndex: The zero-based offset of the match in the line. If line is "foo bar foo" and the match is "bar", then the offset is 4.
     *         length: The length of the match in characters.
     * matchNumber: Number. The zero-based match number in matches.
     */
    SearchResultModel.prototype.getDetailInfo = function(modelItem) {
		return {lineString: modelItem.name, lineNumber: modelItem.lineNumber -1, matches:modelItem.matches, matchNumber: (modelItem.matchNumber ? modelItem.matchNumber - 1 : 0)};
    };

    /**
     * Get the file name by a given model item. Required function.
     */
    SearchResultModel.prototype.getFileName = function(modelItem) {
		return modelItem.name;
    };

    /**
     * Get the file contents by a given file model. Async call. Required function.
     */
    SearchResultModel.prototype.provideFileContent = function(fileItem, onComplete) {
		this._provideFileContent(fileItem).then(function() { onComplete(fileItem);});
    };

    SearchResultModel.prototype._provideFileContent = function(fileItem) {
        if (fileItem.contents) {
            return new Deferred().resolve(fileItem);
        } else {
            return this.registry.getService("orion.page.progress").progress(this.fileClient.read(fileItem.location), "Getting file contents " + fileItem.Name).then( //$NON-NLS-1$ //$NON-NLS-0$

            function(jsonData) {
                mSearchUtils.searchWithinFile(this._searchHelper.inFileQuery, fileItem, jsonData, this._lineDelimiter, this.replaceMode(), this._searchHelper.params.caseSensitive);
                return fileItem;
            }.bind(this),

            function(error) {
                console.error("Error loading file content: " + error.message); //$NON-NLS-0$
                return fileItem;
            }.bind(this));
        }
    };    
    
    /**
     * Get the file contents by a given file model. Sync call. Required function.
     */
    SearchResultModel.prototype.getFileContents = function(fileItem) {
        return fileItem.contents.join(this._lineDelimiter);
    };

    /**
     * Get the replaced file contents by a given file model. Sync call. Required function.
     * @param {Object} newContentHolder The returned replaced file content holder. The content holder has to have a property called "contents". It can be either type of the below:
     *		   String type: the pure contents of the file
     *		   Array type: the lines of the file exclude the line delimeter. If an array type of contents is provided, the lineDelim property has to be defined. Otherwise "\n" is used.
     * @param {Boolean} updating The flag indicating if getting replaced file contets based on existing newContentHolder.contents. It can be ignored if over riding this function does not care the case below.
     *         The explorer basically caches the current file's replaced contents. If only check box is changed on the same file, the falg is set to true when call this fucntion.
     *         Lets say a file with 5000 lines has been changed only because one line is changed, then we do not have to replace the whole 5000 lines but only one line.
     * @param {Object} fileItem The file item that generates the replaced contents.
     */
    SearchResultModel.prototype.getReplacedFileContent = function(newContentHolder, updating, fileItem) {
		mSearchUtils.generateNewContents(updating, fileItem.contents, newContentHolder, fileItem, this._searchHelper.params.replace, this._searchHelper.inFileQuery.searchStrLength);
		newContentHolder.lineDelim = this._lineDelimiter;
    };

    /**
     * Write the replace file contents. Required function.
     * @param {Array} reportList The array of the report items.
     * Each item of the reportList contains the following properties
     * model: the file item
     * matchesReplaced: The number of matches that replaced in this file
     * status: "pass" or "failed"
     * message: Optional. The error message when writing fails.
	 * @returns {orion.Promise} A new promise. The returned promise is generally fulfilled to an <code>Array</code> whose elements
	 * writes all the new contetns by checking the checked flag on all details matches. A file with no checked flag on all detail matches should not be written a new replaced contents.
	 */
    SearchResultModel.prototype.writeReplacedContents = function(reportList){
        var promises = [];
		var validFileList = this.getValidFileList();
		validFileList.forEach(function(fileItem) {
			promises.push(this._writeOneFile(fileItem, reportList));
		}.bind(this));
		return Deferred.all(promises, function(error) { return {_error: error}; });
    };
    
    /**
     * Return the string that describe the header of the file column. Optional.
     * If not defined, "Results" is used.
     */
    SearchResultModel.prototype.getHeaderString = function() {
        var headerStr = messages["Results"]; //$NON-NLS-0$
        if (this._searchHelper.displayedSearchTerm) {
            var pagingParams = this.getPagingParams();
            if (pagingParams.numberOnPage > 0) {
                var startNumber = pagingParams.start + 1;
                var endNumber = startNumber + pagingParams.numberOnPage - 1;
                headerStr = "";
                if (!this.replaceMode()) {
                    headerStr = i18nUtil.formatMessage(messages["FilesAofBmatchingC"],
                    startNumber + "-" + endNumber, pagingParams.totalNumber, this._searchHelper.displayedSearchTerm); //$NON-NLS-0$
                } else {
                    headerStr = i18nUtil.formatMessage(messages["ReplaceAwithBforCofD"],
                    this._searchHelper.displayedSearchTerm,
                    this._searchHelper.params.replace,
                    startNumber + "-" + endNumber, //$NON-NLS-0$
                    pagingParams.totalNumber);
                }
            }
        }
        return headerStr;
    };

    /**
     * The function to return the list of valid files. Optional.
     * If not defined, this.getListRoot().children is used.
     * For example, if staled files appear in the children of the root model, theses files have to be filtered out so that the valid file list will exclude them.
     */
    SearchResultModel.prototype.getValidFileList = function() {
        return this._indexedFileItems;
    };

    /**
     * Set the list of valid files. Optional.
     */
    SearchResultModel.prototype.setValidFileList = function(validList) {
        this._indexedFileItems = validList;
    };

    /**
     * Store the current selected model in to a session storage. Optional.
     * If defined, this function is called every time a selection on the model is changed by user.
     */
    SearchResultModel.prototype.storeLocationStatus = function(currentModel) {
        if (currentModel) {
            var fileItem = _getFileModel(currentModel);
            if(!fileItem){
				return;
            }
            window.sessionStorage[this._searchHelper.params.keyword + "_search_result_currentFileLocation"] = fileItem.location; //$NON-NLS-0$
            if (currentModel.type === "file") { //$NON-NLS-0$
                window.sessionStorage[this._searchHelper.params.keyword + "_search_result_currentDetailIndex"] = "none"; //$NON-NLS-1$ //$NON-NLS-0$
            } else {
                window.sessionStorage[this._searchHelper.params.keyword + "_search_result_currentDetailIndex"] = JSON.stringify(this._model2Index(currentModel)); //$NON-NLS-0$
            }
        }
    };

    /**
     * Restore the previously selected model when the page is restored. Optional.
     * If defined, this function is called every time when the page is loaded.
     */
    SearchResultModel.prototype.restoreLocationStatus = function() {
        var currentFileLocation = window.sessionStorage[this._searchHelper.params.keyword + "_search_result_currentFileLocation"]; //$NON-NLS-0$
        var fileModel = this._location2Model(currentFileLocation);
        var currentDetailIndex = "none"; //$NON-NLS-0$
        var detailIndexCached = window.sessionStorage[this._searchHelper.params.keyword + "_search_result_currentDetailIndex"]; //$NON-NLS-0$
        if (typeof detailIndexCached === "string") { //$NON-NLS-0$
            if (detailIndexCached.length > 0) {
                currentDetailIndex = detailIndexCached;
            }
        }
        return {
            file: fileModel,
            detail: currentDetailIndex
        };
    };
    
    /**
     * Check if the given file content still contain the search term. Optional.
     * If defined, the explorer will check all the files that has different time stamp between the search result and the file meta data. Then ask this function to do the final judge.
     */
    SearchResultModel.prototype.staleCheck = function(fileContentText) {
        var lineString = fileContentText.toLowerCase();
        var result;
        if (this._searchHelper.inFileQuery.wildCard) {
            result = mSearchUtils.searchOnelineRegEx(this._searchHelper.inFileQuery, lineString, true);
        } else {
            result = mSearchUtils.searchOnelineLiteral(this._searchHelper.inFileQuery, lineString, true);
        }
        return result;
    };

    /**
     * Filter the model by the given filter text. Optional.
     * If defined, the explorer will render a filter input box in the tool bar. Typing in the input field filters the result on the fly.
     */
    SearchResultModel.prototype.filterOn = function(filterText) {
		this._filterText = filterText;
		if(this._filterText) {
			var keyword = this._filterText.toLowerCase();
			this._filteredRoot.children = [];
			this._indexedFileItems.forEach(function(fileItem) {
				var hitFlag = false;
				if(this._filterSingleString(fileItem.name, keyword) || this._filterSingleString(fileItem.fullPathName, keyword)){
					hitFlag = true;
				} 
				if( fileItem.children){
					fileItem.filteredChildren = [];
					fileItem.children.forEach(function(detailItem) {
					    if (this._filterSingleString(detailItem.name, keyword)) {
					        fileItem.filteredChildren.push(detailItem);
					        hitFlag = true;
					    }
					}.bind(this));
				}
				if(hitFlag) {
					this._filteredRoot.children.push(fileItem);
				}
			}.bind(this));
		}
    };

    /**
     * Get the filtered model children.
     * If defined, the explorer will render only the filtered children.
     */
    SearchResultModel.prototype.getFilteredChildren = function(model) {
        if(model.type === "file" && this._filterText && model.filteredChildren) {
			return model.filteredChildren;
        } else if(model.isRoot && this._filterText) {
			return this._filteredRoot.children;
        }
        return model.children;
    };

    /*** Internal model functions ***/

    SearchResultModel.prototype._provideSearchHelper = function() {
        return this._searchHelper;
    };

    SearchResultModel.prototype._filterSingleString = function(stringToFilter, keyword) {
        var lowerCaseStr = stringToFilter.toLowerCase();
        return (lowerCaseStr.indexOf(keyword) >= 0 );
    };

    SearchResultModel.prototype._model2Index = function(model, list) {
        var lookAt = list;
        if (!lookAt && model.parent) {
            lookAt = model.parent.children;
        }
        if (lookAt) {
            for (var i = 0; i < lookAt.length; i++) {
                if (lookAt[i] === model) {
                    return i;
                }
            }
        }
        return -1;
    };

    SearchResultModel.prototype._location2Model = function(location) {
        if (location && this._location2ModelMap[location]) {
            return this._location2ModelMap[location];
        }
        if (this._indexedFileItems.length > 0) {
            return this._indexedFileItems[0];
        }
        return null;
    };

    SearchResultModel.prototype._restoreGlobalStatus = function() {
        this.defaultReplaceStr = this._searchHelper.displayedSearchTerm;
        var defaultReplaceStr = window.sessionStorage["global_search_default_replace_string"]; //$NON-NLS-0$
        if (typeof defaultReplaceStr === "string") { //$NON-NLS-0$
            if (defaultReplaceStr.length > 0) {
                this.defaultReplaceStr = defaultReplaceStr;
            }
        }
        this.sortByName = (this._provideSearchHelper().params.sort.indexOf("Name") > -1); //$NON-NLS-0$
    };

    SearchResultModel.prototype._storeGlobalStatus = function(replacingStr) {
        window.sessionStorage["global_search_default_replace_string"] = replacingStr; //$NON-NLS-0$
    };

    SearchResultModel.prototype._writeOneFile = function(fileItem, reportList) {
       var matchesReplaced = this._matchesReplaced(fileItem);
       if (matchesReplaced > 0) {
           return this._provideFileContent(fileItem).then(function() {
			   matchesReplaced = this._matchesReplaced(fileItem);
               var newContents = {};
               mSearchUtils.generateNewContents(false, fileItem.contents, newContents, fileItem, this._searchHelper.params.replace, this._searchHelper.inFileQuery.searchStrLength);
               var contents = newContents.contents.join(this._lineDelimiter);
               var etag = fileItem.ETag;
               var args = etag ? {
                   "ETag": etag //$NON-NLS-0$
               } : null;
               return this.registry.getService("orion.page.progress").progress(this.fileClient.write(fileItem.location, contents, args), "Saving changes to " + fileItem.location).then( //$NON-NLS-1$ //$NON-NLS-0$

               function(result) {
                   reportList.push({
                       model: fileItem,
                       matchesReplaced: matchesReplaced,
                       status: "pass" //$NON-NLS-0$
                   });
               }.bind(this),

               function(error) {
                   // expected error - HTTP 412 Precondition Failed 
                   // occurs when file is out of sync with the server
                   if (error.status === 412) {
                       reportList.push({
                           model: fileItem,
                           message: messages["ResourceChanged."],
                           matchesReplaced: matchesReplaced,
                           status: "failed" //$NON-NLS-0$
                       });
                   }
                   // unknown error
                   else {
                       error.log = true;
                       reportList.push({
                           model: fileItem,
                           message: messages["Failed to write file."],
                           matchesReplaced: matchesReplaced,
                           status: "failed" //$NON-NLS-0$
                       });
                   }
               }.bind(this));
           }.bind(this));
       } else {
           return new Deferred().resolve(fileItem);
       }	
	};    
   
    SearchResultModel.prototype._matchesReplaced = function(model) {
        var matchesReplaced = 0;
        if (!model.children) {
            return model.checked === false ? 0 : 1;
        }
        if (model.children) {
            for (var j = 0; j < model.children.length; j++) {
                if (model.children[j].checked !== false) {
                    matchesReplaced += 1;
                }
            }
        }
        return matchesReplaced;
    };
    
    SearchResultModel.prototype.removeChild = function(model, item) {
        var index = model.children.indexOf(item);
        if (-1 < index) {
        	model.children.splice(index, 1);
        	item.stale = true;
        }
    };

    SearchResultModel.prototype.constructor = SearchResultModel;

    //return module exports
    return {
        SearchResultModel: SearchResultModel
    };
});