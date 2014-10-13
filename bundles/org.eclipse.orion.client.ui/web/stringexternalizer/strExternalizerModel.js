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
define(['i18n!orion/stringexternalizer/nls/messages', 'require', 'orion/Deferred', 'orion/i18nUtil', 'orion/explorers/explorer', 'orion/searchUtils', 'stringexternalizer/nonnlsSearchUtil'],

function(messages, require, Deferred, i18nUtil, mExplorer, mSearchUtils, mNonnlsSearchUtil) {
    
    function _writeReport(reportList, fileItem, passed, message) {
        reportList.push({
            model: fileItem,
            message: message ? message : (passed ? messages["Passed"] : messages["Failed"]),
            status: passed ? "pass" : "failed" //$NON-NLS-0$ //$NON-NLS-0$
        });
    }
    
    function _matchesReplaced(fileModel) {
        var matchesReplaced = 0;
        if (!fileModel.children) {
            return fileModel.checked === false ? 0 : 1;
        }
        if (fileModel.children) {
            for (var j = 0; j < fileModel.children.length; j++) {
                if (!(fileModel.children[j].checked === false)) {
                    matchesReplaced += 1;
                }
            }
        }
        return matchesReplaced;
    }

    /*
     *	The model to support the string externalizer in the generaic searchExplorer.
     */
    function StrExternalizerModel(serviceRegistry, fileClient, root) {
		this.registry = serviceRegistry;
		this.fileClient = fileClient;
		this._listRoot = {
			children: root.Children
		};
		this.messageService = this.registry.getService("orion.page.message"); //$NON-NLS-0$
    }
    StrExternalizerModel.prototype = new mExplorer.ExplorerModel();

    /*** Over write all the prototypes defined by mExplorer.ExplorerModel ***/
    StrExternalizerModel.prototype.getRoot = function(onItem) {
		onItem(this._listRoot);
    };

    StrExternalizerModel.prototype.getChildren = function(parentItem, onComplete) {
		if (!parentItem) {
			return;
		}
		if (parentItem.children) {
			onComplete(parentItem.children);
		} else if (parentItem.type === "detail") { //$NON-NLS-0$
			onComplete([]);
		} else if (parentItem.type === "file") { //$NON-NLS-0$
			parentItem.children = parentItem.nonnls; //Tree iterator (visitor) requires .children property. But this will be improved in the future without requiring this property.
			//Addressed in https://bugs.eclipse.org/bugs/show_bug.cgi?id=380687#c2.
			onComplete(parentItem.nonnls);
		} else {
			onComplete([]);
		}
    };

    StrExternalizerModel.prototype.getId = function(item) {
		var result;
		if (item === this._listRoot) {
			result = this.rootId;
		} else {
			if (item.Location) {
				result = item.Location;
				// remove all non valid chars to make a dom id. 
				result = result.replace(/[^\.\:\-\_0-9A-Za-z]/g, "");
			} else {
				result = this.getId(item.parent);
				result += item.lineNum;
				result += item.character;
			}
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
    StrExternalizerModel.prototype.getListRoot = function() {
        return this._listRoot;
    };

    /**
     * build the model tree. Required function.
     * There should be three layers of the root model. Any model item in each layer must have a string property called type.
     * The top layer is the root model whose type is "root". It should have a property callded children which is an array object.
     * The middle layer is the files whose type is "file". It should have a property callded children which is an array object and a property called parent which points to the root model.
     * The bottom layer is the detail matches within a file, whose type is "detail". It should have a property called parent which points to the file item.
     */
    StrExternalizerModel.prototype.buildResultModel = function() {
		for (var i = 0; i < this._listRoot.children.length; i++) {
			this._listRoot.children[i].type = "file"; //$NON-NLS-0$
			this._listRoot.children[i].linkLocation = require.toUrl("edit/edit.html") + "#" + this._listRoot.children[i].Location; //$NON-NLS-1$ //$NON-NLS-0$
			this._listRoot.children[i].fullPathName = mSearchUtils.fullPathNameByMeta(this._listRoot.children[i].Parents);
			this._listRoot.children[i].parentLocation = mSearchUtils.path2FolderName(this._listRoot.children[i].Location, this._listRoot.children[i].Name, true);
			for (var j = 0; j < this._listRoot.children[i].nonnls.length; j++) {
				this._listRoot.children[i].nonnls[j].type = "detail"; //$NON-NLS-0$
				this._listRoot.children[i].nonnls[j].parent = this._listRoot.children[i]; //.parent is reserved for tree visitor
				this._listRoot.children[i].nonnls[j].parentNum = i;
				this._listRoot.children[i].nonnls[j].checked = true;
			}
		}
    };

    /**
     * Determines if the model is in replace mode. Required function.
     */
    StrExternalizerModel.prototype.replaceMode = function() {
        return true;
    };

    /**
     * Get the paging paramerterss. Required function.
     * The return value is an object containing the following properties:
     * totalNumber: the total number of files in the model
     * start: the zero-based number of the starting number of the file in this page.
     * rows: max number of files per page.
     * numberOnPage: current file numbers on the page
     */
    StrExternalizerModel.prototype.getPagingParams = function() {
        return {
            totalNumber: this._listRoot.children.length,
            start: 0,
            rows: this._listRoot.children.length,
            numberOnPage: this._listRoot.children.length
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
    StrExternalizerModel.prototype.getScopingParams = function(modelItem) {
        return {
            name: modelItem.fullPathName,
            href: require.toUrl("stringexternalizer/strExternalizer.html") + "#" + modelItem.parentLocation, //$NON-NLS-1$ //$NON-NLS-0$,
            tooltip: i18nUtil.formatMessage(messages["ExternalizeStrMsg"], modelItem.fullPathName)
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
    StrExternalizerModel.prototype.getDetailInfo = function(modelItem) {
    	return {lineString: modelItem.line, 
    	lineNumber: modelItem.lineNum, 
    	matches:[{
				startIndex: modelItem.character,
				length: modelItem.string.length
			}], 
    	matchNumber: 0};
    };

    /**
     * Get the file name by a given model item. Required function.
     */
    StrExternalizerModel.prototype.getFileName = function(modelItem) {
    	return modelItem.Name;
    };

    /**
     * Get the file contents by a given file model. Async call. Required function.
     */
    StrExternalizerModel.prototype.provideFileContent = function(fileItem, onComplete) {
		if (fileItem.contents) {
			onComplete(fileItem);
		} else {
			this.registry.getService("orion.page.progress").progress(this.fileClient.read(fileItem.Location), "Reading file " + fileItem.Location).then(

			function(contents) {
				fileItem.contents = contents;
				onComplete(fileItem);
			}.bind(this),

			function(error) {
				console.error("Error loading file content: " + error.message); //$NON-NLS-0$
				onComplete(null);
			}.bind(this));
		}
    };

    /**
     * Get the file contents by a given file model. Sync call. Required function.
     */
    StrExternalizerModel.prototype.getFileContents = function(fileItem) {
        return fileItem.contents;
    };

    /**
     * Get the replaced file contents by a given file model. Sync call. Required function.
     * @param {Object} newContentHolder The returned replaced file content holder. The content holder has to have a property called "contents". It can be either type of the below:
     * 		   String type: the pure contents of the file
     * 		   Array type: the lines of the file exclude the line delimeter. If an array type of contents is provided, the lineDelim property has to be defined. Otherwise "\n" is used.
     * @param {Boolean} updating The flag indicating if getting replaced file contets based on existing newContentHolder.contents. It can be ignored if over riding this function does not care the case below.
     *         The explorer basically caches the current file's replaced contents. If only check box is changed on the same file, the falg is set to true when call this fucntion.
     *         Lets say a file with 5000 lines has been changed only because one line is changed, then we do not have to replace the whole 5000 lines but only one line.
     * @param {Object} fileItem The file item that generates the replaced contents.
     */
    StrExternalizerModel.prototype.getReplacedFileContent = function(newContentHolder, updating, fileItem) {
		//We do not want to simply check if fileItem.checked. We should ask if there is any detail item chekced no matter how file.checked is set. As file.checked is just a batch setting for the children.
    	var checked = false;
    	var children = fileItem.children || fileItem.nonnls;
    	if(children){
    		checked = children.some(function(detailItem){
    			return detailItem.checked || detailItem.checked === undefined;
    		});
    	}
		newContentHolder.contents = checked ? mNonnlsSearchUtil.replaceNls(fileItem.contents, fileItem.nonnls, this.config) : fileItem.contents;
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
    StrExternalizerModel.prototype.writeReplacedContents = function(reportList){
    	var promises = [];
		this._listRoot.children.forEach(function(fileItem) {
			promises.push(this._writeOneFile(fileItem, reportList));
		}.bind(this));
		var that = this;
		return Deferred.all(promises, function(error) { return {_error: error}; }).then(function () {
			if (that.config.messages && that.config.messages !== {}) {
	            return mNonnlsSearchUtil.writeMessagesFile(that.fileClient, that.config, that.config.messages, that.registry.getService("orion.page.progress")).then(function() {
	                return new Deferred().resolve();
	            }, function(error) {
	                console.error(error);
	                return new Deferred().resolve();
	            });
				
			} else {
				return new Deferred().resolve();
			}
		});
    };
    
	/*** Optional model functions ***/
    
    /**
     * Return the string that describe the header of the file column. Optional.
     * If not defined, "Results" is used.
     */
    StrExternalizerModel.prototype.getHeaderString = function() {
    	return messages["Files to externalize"];
    };

	StrExternalizerModel.prototype.setConfig = function(config) {
		this.config = config;
	};

    /*** Internal model functions ***/
    
    StrExternalizerModel.prototype._writeNonnls = function(fileItem, reportList) {
        var that = this;
        var newContents = mNonnlsSearchUtil.replaceNls(fileItem.contents, fileItem.nonnls, that.config, true);
        return that.registry.getService("orion.page.progress").progress(that.fileClient.write(fileItem.Location, newContents), "Writing changes to " + fileItem.Location).then(function() {
            _writeReport(reportList, fileItem, true);
        },
        function(error) {
            console.error(error);
            _writeReport(reportList, fileItem, false);
        });
    };    
    
    StrExternalizerModel.prototype._writeOneFile = function(fileItem, reportList) {
        var matchesReplaced = _matchesReplaced(fileItem);
        var that = this;
        if (matchesReplaced > 0) {
            return this.registry.getService("orion.page.progress").progress(this.fileClient.read(fileItem.Location, true), "Reading file metadata " + fileItem.Location).then(function(metadata) {
                //If the file has been modified by others when trying to write it, we should report this status in the report list
                if (fileItem.LocalTimeStamp !== metadata.LocalTimeStamp) {
                    _writeReport(reportList, fileItem, false, messages["ResourceChanged"]);
                } else if (!fileItem.contents) {//If fiel item does not have contents yet, we should get the contents first
                    return that.registry.getService("orion.page.progress").progress(that.fileClient.read(fileItem.Location), "Reading file " + fileItem.Location).then(function(contents) {
                        fileItem.contents = contents;
                        return that._writeNonnls(fileItem, reportList);
                    },

                    function(error) {
                        console.error(error);
                    });
                } else {
                    return that._writeNonnls(fileItem, reportList);
                }
            }, function(error) {
                console.error(error);
            });
        } else {
            return new Deferred().resolve(fileItem);
        }
    }; 
   
	StrExternalizerModel.prototype.constructor = StrExternalizerModel;
    return {
        StrExternalizerModel: StrExternalizerModel
    };
});