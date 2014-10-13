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

/*global define document console window*/
/*jslint forin:true regexp:false sub:true*/

define(['i18n!orion/search/nls/messages', 'require', 'orion/Deferred', 'orion/webui/littlelib', 'orion/contentTypes', 'orion/i18nUtil', 'orion/explorers/explorer', 
	'orion/fileClient', 'orion/commands', 'orion/searchUtils', 'orion/compare/compareView', 
	'orion/highlight', 'orion/explorers/navigationUtils', 'orion/webui/tooltip', 'orion/explorers/navigatorRenderer', 'orion/extensionCommands',
	'orion/searchModel', 'orion/crawler/searchCrawler'
],
function(messages, require, Deferred, lib, mContentTypes, i18nUtil, mExplorer, mFileClient, mCommands, 
	mSearchUtils, mCompareView, mHighlight, mNavUtils, mTooltip, 
	navigatorRenderer, extensionCommands, mSearchModel, mSearchCrawler
) {
    /* Internal wrapper functions*/
    function _empty(nodeToEmpty) {
        var node = lib.node(nodeToEmpty);
        if (node) {
            lib.empty(node);
        }
        return node;
    }

    function _connect(nodeOrId, event, eventHandler) {
        var node = lib.node(nodeOrId);
        if (node) {
            node.addEventListener(event, eventHandler, false);
        }
    }

    function _place(ndoeToPlace, parent, position) {
        var parentNode = lib.node(parent);
        if (parentNode) {
            if (position === "only") { //$NON-NLS-0$
                lib.empty(parentNode);
            }
            parentNode.appendChild(ndoeToPlace);
        }
    }

    function _createElement(elementTag, classNames, id, parent) {
        var element = document.createElement(elementTag);
        if (classNames) {
            if (Array.isArray(classNames)) {
                for (var i = 0; i < classNames.length; i++) {
                    element.classList.add(classNames[i]);
                }
            } else if (typeof classNames === "string") { //$NON-NLS-0$
                element.className = classNames;
            }
        }
        if (id) {
            element.id = id;
        }
        var parentNode = lib.node(parent);
        if (parentNode) {
            parentNode.appendChild(element);
        }
        return element;
    }

    function _createSpan(classNames, id, parent, spanName) {
        var span = _createElement('span', classNames, id, parent); //$NON-NLS-0$
        if (spanName) {
            span.appendChild(document.createTextNode(spanName));
        }
        return span;
    }

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

    function _onSameFile(modelItem1, modelItem2) {
        return _getFileModel(modelItem1) === _getFileModel(modelItem2);
    }

    function _validFiles(searchModel) {
        if (typeof searchModel.getValidFileList === "function") { //$NON-NLS-0$
            return searchModel.getValidFileList();
        }
        return searchModel.getListRoot().children;
    }

    function _headerString(searchModel) {
        if (typeof searchModel.getHeaderString === "function") { //$NON-NLS-0$
            return searchModel.getHeaderString();
        }
        return messages["Results"]; //$NON-NLS-0$;
    }
    
    //Renderer to render the model
    function SearchResultRenderer(options, explorer) {
        this._init(options);
        this.explorer = explorer;
    }
    SearchResultRenderer.prototype = new mExplorer.SelectionRenderer();
    
    // Overrides Explorer.SelectionRenderer.prototype.renderRow
    SearchResultRenderer.prototype.renderRow = function(item, tableRow) {
    	mExplorer.SelectionRenderer.prototype.renderRow.call(this, item, tableRow);
    	if (item.type !== "file") {
    		tableRow.classList.add("searchDetailRow"); //$NON-NLS-0$
    	}
    };

    // TODO:  this should be handled outside of here in a common select all command
    // see https://bugs.eclipse.org/bugs/show_bug.cgi?id=339500
    SearchResultRenderer.prototype.initCheckboxColumn = function(tableNode) {
        if (this._useCheckboxSelection) {
            var th = _createElement('th'); //$NON-NLS-0$
            var check = _createElement("span", null, null, th); //$NON-NLS-0$
            check.classList.add('selectionCheckmarkSprite'); //$NON-NLS-0$
            check.classList.add('core-sprite-check'); //$NON-NLS-0$
            if (this.getCheckedFunc) {
                check.checked = this.getCheckedFunc(this.explorer.model.getListRoot());
                check.classList.toggle("core-sprite-check_on"); //$NON-NLS-0$
            }
            _connect(check, "click", function(evt) { //$NON-NLS-0$
                var newValue = evt.target.checked ? false : true;
                this.onCheck(null, evt.target, newValue);
            }.bind(this));
            return th;
        }
    };
    
    SearchResultRenderer.prototype.getCheckboxColumn = function(item, tableRow){
    	if (!this.explorer.model.replaceMode() || (item.type === "file")) { //$NON-NLS-0$
    		return mExplorer.ExplorerRenderer.prototype.getCheckboxColumn.call(this, item, tableRow);
    	} else {
    		//detail row checkboxes should be placed in next column
    		return document.createElement('td'); //$NON-NLS-0$
    	}
	};

    SearchResultRenderer.prototype.getCellHeaderElement = function(col_no) {
        return null;
    };

    SearchResultRenderer.prototype.focus = function() {
        var resultParentDiv = lib.node(this.explorer.getParentDivId());
        window.setTimeout(function() {
            resultParentDiv.focus();
        }, 10);
    };

    SearchResultRenderer.prototype.staleFileElement = function(item) {
        if (item.stale) {
        	// replace file icon and twistie with a warning icon
        	var span = lib.node(this.getFileIconId(item));
            _empty(span);
            span.classList.add("imageSprite"); //$NON-NLS-0$
            span.classList.add("core-sprite-warning"); //$NON-NLS-0$
            span.classList.add("staleSearchResultIcon"); //$NON-NLS-0$
            
            // add tooltip to warning icon
            this.explorer.staleTooltips.push(new mTooltip.Tooltip({
	            node: span,
	            showDelay: 0,
	            position: ["above", "right", "below"],
	            text: messages["staleFileTooltip"]
	        }));
        }
    };
    
    SearchResultRenderer.prototype._getFileRenderName = function(item) {
    	var renderName;
    	if (item.totalMatches) {
    		renderName = this.explorer.model.getFileName(item) + " (" + i18nUtil.formatMessage(messages["${0} matches"], item.totalMatches) + ")"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
    	} else {
    		renderName = this.explorer.model.getFileName(item);
    	}
    	return renderName;
    };
    
    SearchResultRenderer.prototype._getFileNameElement = function(item) {
    	var renderName = this._getFileRenderName(item);
    	var fileSpan = document.createElement("span"); //$NON-NLS-0$
    	
    	fileSpan.classList.add("fileNameSpan"); //$NON-NLS-0$
		fileSpan.appendChild(document.createTextNode(renderName));
		
		return fileSpan;
    };

    SearchResultRenderer.prototype.replaceFileElement = function(item) {
		if(item.totalMatches) {
			var fileNameElement = this._getFileNameElement(item);
			var linkDiv = lib.node(this.getItemLinkId(item));
			linkDiv.removeChild(linkDiv.lastElementChild);
			linkDiv.appendChild(fileNameElement);
	    } else {
			item.stale = true;
			this.staleFileElement(item);
	    }
    };

    SearchResultRenderer.prototype.replaceDetailIcon = function(item, direction) {
        if (this.explorer.model.replaceMode()) {
            return;
        }
        if (!item || item.type !== "detail") { //$NON-NLS-0$
            return;
        }
        var iconSpan = lib.node(this.getDetailIconId(item));
        if (!iconSpan) {
            return;
        }
        _empty(iconSpan);
        var icon = _createSpan(null, null, iconSpan);
        icon.classList.add('imageSprite'); //$NON-NLS-0$
        if (direction === "right") { //$NON-NLS-0$
            icon.classList.add('core-sprite-rightarrow'); //$NON-NLS-0$
        } else if (direction === "left") { //$NON-NLS-0$
            icon.classList.add('core-sprite-leftarrow'); //$NON-NLS-0$
        } else {
            icon.classList.add('core-sprite-none'); //$NON-NLS-0$
        }
    };

    SearchResultRenderer.prototype.renderFileElement = function(item, spanHolder, resultModel) {
        var helper = null;
        if (resultModel._provideSearchHelper) {
            helper = resultModel._provideSearchHelper();
        }
		var params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, null, helper.params.replace, true) : null;
		var link = navigatorRenderer.createLink(null, 
				{Location: item.location}, 
				this.explorer._commandService, 
				this.explorer._contentTypeService,
				this.explorer._openWithCommands, 
				{id:this.getItemLinkId && this.getItemLinkId(item)}, 
				params, 
				{holderDom: this._lastFileIconDom});
		mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
		
		var scopeParams = resultModel.getScopingParams(item);
		var folders = decodeURIComponent(scopeParams.name).split("/"); //$NON-NLS-0$
		var parentFolder = folders.pop();
		parentFolder = parentFolder;
		
		if (0 < folders.length) {
			var fullPathSpan = document.createElement("span"); //$NON-NLS-0$
			fullPathSpan.classList.add("fullPathSpan"); //$NON-NLS-0$
			
			var fullPathText = folders.join("/"); //$NON-NLS-0$
			
			fullPathSpan.appendChild(document.createTextNode(fullPathText + "/")); //$NON-NLS-0$
			link.appendChild(fullPathSpan);
			
			var ellipsisSpan = document.createElement("span"); //$NON-NLS-0$
			ellipsisSpan.classList.add("ellipsisSpan"); //$NON-NLS-0$
			ellipsisSpan.appendChild(document.createTextNode(".../")); //$NON-NLS-0$
			link.appendChild(ellipsisSpan);
		}
				
		// create a direct parent folder span and prepend to link		
		var parentSpan = document.createElement("span"); //$NON-NLS-0$
		parentSpan.classList.add("fileParentSpan"); //$NON-NLS-0$
		parentSpan.appendChild(document.createTextNode(parentFolder + "/")); //$NON-NLS-0$
		link.appendChild(parentSpan);
				
		var fileSpan = this._getFileNameElement(item);
		link.appendChild(fileSpan);

		//trigger a click on the span when the link is clicked to set the selection cursor
		link.addEventListener("click", function(){ //$NON-NLS-0$
			spanHolder.click();
		});

		// append link to parent span
        spanHolder.appendChild(link);
        spanHolder.classList.add("filePathSpan"); //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.generateContextTip = function(detailModel) {
        var tableNode = _createElement('table'); //$NON-NLS-1$ //$NON-NLS-0$
        for (var i = 0; i < detailModel.context.length; i++) {
            var lineDiv = _createElement('tr', null, null, tableNode); //$NON-NLS-0$
            var lineTd;
            if (detailModel.context[i].current) {
                lineTd = _createElement('td', null, null, lineDiv); //$NON-NLS-0$
                lineTd.noWrap = true;
                var span = _createElement('span', null, null, lineTd); //$NON-NLS-1$ //$NON-NLS-0$
                this.generateDetailHighlight(detailModel, span); //$NON-NLS-1$ //$NON-NLS-0$
            } else {
                lineTd = _createElement('td', null, null, lineDiv); //$NON-NLS-0$
                lineTd.noWrap = true;
                lineTd.textContent = detailModel.context[i].context + "\u00a0"; //$NON-NLS-0$
            }
        }
        return tableNode;
    };

    SearchResultRenderer.prototype._generateDetailSegments = function(detailInfo) {
        var startIndex = 0;
        var segments = [];
        for (var i = 0; i < detailInfo.matches.length; i++) {
            if (startIndex >= detailInfo.lineString.length) {
				break;
            }
            if (this.explorer.model.replaceMode()) {
                if (i !== detailInfo.matchNumber) {
                    continue;
                }
            }
            if (startIndex !== detailInfo.matches[i].startIndex) {
                segments.push({name: detailInfo.lineString.substring(startIndex, detailInfo.matches[i].startIndex), startIndex: startIndex, bold: false, highlight: false});
            }
            var  gap = detailInfo.matches[i].length;
            segments.push({name: detailInfo.lineString.substring(detailInfo.matches[i].startIndex, detailInfo.matches[i].startIndex + gap), startIndex: detailInfo.matches[i].startIndex, bold: true, highlight: false});
            startIndex = detailInfo.matches[i].startIndex + gap;
            if (this.explorer.model.replaceMode()) {
                break;
            }
        }
        if (startIndex < (detailInfo.lineString.length - 1)) {
            segments.push({name: detailInfo.lineString.substring(startIndex), startIndex: startIndex, bold: false, highlight: false});
        }
        return segments;
    };

    SearchResultRenderer.prototype._mergesingleSegment = function(segments, range) {
		var newSegments = [];
		
		segments.forEach(function(segment) {
			var startIndex = segment.startIndex;
			var endIndex = segment.startIndex + segment.name.length;
			if(range.start > startIndex && range.end < endIndex){
				newSegments.push({name: segment.name.substring(0, range.start - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: false});
				newSegments.push({name: segment.name.substring(range.start - startIndex, range.end - startIndex), startIndex: range.start, bold: segment.bold, highlight: true});
				newSegments.push({name: segment.name.substring(range.end - startIndex), startIndex: range.end, bold: segment.bold, highlight: false});
			} else if(range.start > startIndex && range.start < endIndex){
				newSegments.push({name: segment.name.substring(0, range.start - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: false});
				newSegments.push({name: segment.name.substring(range.start - startIndex), startIndex: range.start, bold: segment.bold, highlight: true});
			} else if( startIndex >= range.start && endIndex <= range.end) {
				segment.highlight = true;
				newSegments.push(segment);
			} else if(range.end > startIndex && range.end < endIndex){
				newSegments.push({name: segment.name.substring(0, range.end - startIndex), startIndex: segment.startIndex, bold: segment.bold, highlight: true});
				newSegments.push({name: segment.name.substring(range.end - startIndex), startIndex: range.end, bold: segment.bold, highlight: false});
			} else {
				newSegments.push(segment);
			}
		}.bind(this));
		return newSegments;
    };

    SearchResultRenderer.prototype._renderSegments = function(segments, parentSpan) {
		segments.forEach(function(segment) {
			if(segment.bold){
				var matchSegBold = _createElement('b', null, null, parentSpan); //$NON-NLS-0$
				if(segment.highlight) {
					matchSegBold.classList.add("search-filter-text");
				}
				_place(document.createTextNode(segment.name), matchSegBold, "only"); //$NON-NLS-0$				
			} else {
				var matchSpan = _createElement('span', null, null, parentSpan); //$NON-NLS-0$
				if(segment.highlight) {
					matchSpan.classList.add("search-filter-text");
				}
	           _place(document.createTextNode(segment.name), matchSpan, "only"); //$NON-NLS-0$
			}
		}.bind(this));
    };

    SearchResultRenderer.prototype.generateDetailHighlight = function(detailModel, parentSpan) {
        var detailInfo = this.explorer.model.getDetailInfo(detailModel);
        var segments = this._generateDetailSegments(detailInfo);
        this._renderSegments(segments, parentSpan);
    };

    SearchResultRenderer.prototype.renderDetailElement = function(item, spanHolder) {
        var linkSpan = this.getDetailElement(item, spanHolder);
        this.generateDetailHighlight(item, linkSpan);
    };

    SearchResultRenderer.prototype.renderDetailLineNumber = function(item, spanHolder) {
		var detailInfo = this.explorer.model.getDetailInfo(item);
		var lineNumber = detailInfo.lineNumber + 1;
        if (!this.explorer.model.replaceMode() || detailInfo.matches.length <= 1) {
            _place(document.createTextNode(lineNumber + ":"), spanHolder, "last"); //$NON-NLS-1$ //$NON-NLS-0$
        } else {
			var matchNumber = detailInfo.matchNumber + 1;
            _place(document.createTextNode(lineNumber + "(" + matchNumber + "):"), spanHolder, "last"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
        }
    };

    SearchResultRenderer.prototype.getDetailElement = function(item, spanHolder) {
        var that = this;
        var helper = null;
        if (this.explorer.model._provideSearchHelper) {
            helper = this.explorer.model._provideSearchHelper();
        }
       
		var params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, item.lineNumber, helper.params.replace, true) : null;
		var name = item.parent.name;
		var location = item.parent.location;
		var link = navigatorRenderer.createLink(null, 
			{Location: location, Name: name}, 
			this.explorer._commandService, 
			this.explorer._contentTypeService,
			this.explorer._openWithCommands, 
			{id:this.getItemLinkId(item)}, 
			params, 
			{});
		link.removeChild(link.firstChild); //remove file name from link
        spanHolder.appendChild(link);
        link.classList.add("searchDetailLink"); //$NON-NLS-0$
       
       	mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
       	//trigger a click on the span when the link is clicked to set the selection cursor
       	_connect(link, "click", function() { //$NON-NLS-0$
       		spanHolder.click();
        });
        
        var span = _createElement('span', null, null, link); //$NON-NLS-0$
        return span;
    };

    //This is an optional function for explorerNavHandler. It provides the div with the "href" attribute.
    //The explorerNavHandler hooked up by the explorer will check if the href exist as the attribute and react on enter key press.
    SearchResultRenderer.prototype.getRowActionElement = function(tableRowId) {
        return lib.node(this.getItemLinkId(tableRowId));
    };

    SearchResultRenderer.prototype.getLocationSpanId = function(item) {
        return this.explorer.model.getId(item) + "_locationSpan"; //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.getFileSpanId = function(item) {
        return this.explorer.model.getId(item) + "_fileSpan"; //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.getFileIconId = function(item) {
        return this.explorer.model.getId(item) + "_fileIcon"; //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.getItemLinkId = function(itemOrId) {
        if (typeof itemOrId === "string") { //$NON-NLS-0$
            return itemOrId + "_itemLink"; //$NON-NLS-0$
        }
        return this.explorer.model.getId(itemOrId) + "_itemLink"; //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.getDetailIconId = function(item) {
        return this.explorer.model.getId(item) + "_detailIcon"; //$NON-NLS-0$
    };

    SearchResultRenderer.prototype.getPrimColumnStyle = function(item) {
        if(item && item.type === "file") { //$NON-NLS-0$
        	return "search_primaryColumn"; //$NON-NLS-0$
        } else {
        	return  "search_primaryColumn_Details"; //$NON-NLS-0$
        }
    };

    SearchResultRenderer.prototype.getSecondaryColumnStyle = function() {
        return "search_secondaryColumn"; //$NON-NLS-0$
    };
    
    SearchResultRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
        var col = null;
        var span;
        switch (col_no) {
            case 0:
                if (item.type === "file") { //$NON-NLS-0$
                	col = _createElement('td'); //$NON-NLS-0$
                    col.noWrap = true;
                    span = _createSpan(null, this.getFileIconId(item), col, null);
                    this._lastFileIconDom = span;
                    
                    if(this.explorer.model._provideSearchHelper && this.explorer.model._provideSearchHelper().params.keyword === ""){
                        //var decorateImage = _createSpan(null, null, col, null);
                        //decorateImage.classList.add('imageSprite'); //$NON-NLS-0$
                        //decorateImage.classList.add('core-sprite-file'); //$NON-NLS-0$
                    } else {
                        this.getExpandImage(tableRow, span); //$NON-NLS-0$
                    }
                } else {
                	if (this.explorer.model.replaceMode()) {
                		col = mExplorer.ExplorerRenderer.prototype.getCheckboxColumn.call(this, item, tableRow);
                	} else {
                		col = _createElement('td'); //$NON-NLS-0$
                		span = _createSpan(null, null, col, null);
                		this.renderDetailLineNumber(item, span);
                	}
                }
                break;
            case 1:
				col = _createElement('td'); //$NON-NLS-0$
                if (item.type === "file") { //$NON-NLS-0$
                	span = _createSpan(null, this.getFileSpanId(item), col, null);
                    this.renderFileElement(item, span, this.explorer.model);
                    
                    //render file location
                    if (item.parentLocation) {
						var scopeParams = this.explorer.model.getScopingParams(item);
						tableRow.title = decodeURI(scopeParams.name + "/" + item.name); //$NON-NLS-0$
                    }
                } else {
                	if (this.explorer.model.replaceMode()) {
                		this.renderDetailLineNumber(item, col);
                	}
                    this.renderDetailElement(item, col);
                }
                break;
			case 20: //TODO fix look and feel, re-enable
				if (item.type === "file") { //$NON-NLS-0$
					col = _createElement('td'); //$NON-NLS-0$
                    var button = _createElement("button", ["imageSprite", "core-sprite-delete", "dismissButton", "deleteSearchRowButton"], null, col); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					button.title = messages["Remove from search results"]; //$NON-NLS-0$
                    button.addEventListener("click", function(){ //$NON-NLS-0$
                    //TODO fix behavior in replace preview mode
                    	var model = this.explorer.model;
                    	model.removeChild(item.parent, item);
                    	this.explorer.getNavHandler().refreshModel(this.explorer.getNavDict(), model, model.children);
            			this.explorer.getNavHandler().cursorOn(null, true);
            			tableRow.parentNode.removeChild(tableRow);
            			
            			if (item.children) {
            				item.children.forEach(function(child){
	            				var childRow = this.explorer.getRow(child);
	            				childRow.parentNode.removeChild(childRow);
	            			}, this);
            			}
            			
            			//TODO update match count, maybe...
                    }.bind(this));
                }
				break;
        }
        
        return col;
    };
    SearchResultRenderer.prototype.constructor = SearchResultRenderer;


    function SearchReportRenderer(options, explorer) {
        this._init(options);
        this.options = options;
        this.explorer = explorer;
    }

    SearchReportRenderer.prototype = new mExplorer.SelectionRenderer();

    SearchReportRenderer.prototype.getCellHeaderElement = function(col_no) {
        var th, h2;
        switch (col_no) {
            case 0:
                th = _createElement('th', "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-0$
                h2 = _createElement('h2', null, null, th); //$NON-NLS-0$
                h2.textContent = messages["Files replaced"];
                break;
        }
        return th;
    };

    SearchReportRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
    	var td = null;
        switch (col_no) {
            case 0:
                td = _createElement("td", "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-0$
                
                var fileSpan = _createSpan(null, null, td, null);
                SearchResultRenderer.prototype.renderFileElement.call(this, item.model, fileSpan, this.explorer.resultModel);
                
                //render file location
                var scopeParams = this.explorer.resultModel.getScopingParams(item.model);
				tableRow.title = decodeURI(scopeParams.name + "/" + item.model.name); //$NON-NLS-0$
                
                if (item.status) {
                	var statusMessage;
                	var linkNode = lib.$(".navlink", fileSpan); //$NON-NLS-0$
                	var operationIcon = document.createElement("span"); //$NON-NLS-0$
	                operationIcon.classList.add("imageSprite"); //$NON-NLS-0$
	                
                    switch (item.status) {
                        case "warning": //$NON-NLS-0$
                            operationIcon.classList.add("core-sprite-warning"); //$NON-NLS-0$
                            statusMessage = item.message;
                            break;
                        case "failed": //$NON-NLS-0$
                            operationIcon.classList.add("core-sprite-error"); //$NON-NLS-0$
                            statusMessage = item.message;
                            break;
                        case "pass": //$NON-NLS-0$
                            operationIcon.classList.add("core-sprite-ok"); //$NON-NLS-0$
                            statusMessage = item.model.totalMatches ? i18nUtil.formatMessage(messages["matchesReplacedMsg"], item.matchesReplaced, item.model.totalMatches) : item.message; //$NON-NLS-0$
                            break;
                    }
                    
                    linkNode.insertBefore(operationIcon, linkNode.firstElementChild);

                    var statusMessageSpan = _createElement("span", "replacementStatusSpan", null, linkNode); //$NON-NLS-1$ //$NON-NLS-0$
                    statusMessageSpan.appendChild(document.createTextNode("(" + statusMessage + ")")); //$NON-NLS-1$ //$NON-NLS-0$
                }
        }
        return td;
    };
    
    SearchReportRenderer.prototype._getFileRenderName = function(item) {
    	return this.explorer.resultModel.getFileName(item);
    };
    
    SearchReportRenderer.prototype._getFileNameElement = function(item) {
    	return SearchResultRenderer.prototype._getFileNameElement.call(this, item);
    };

    SearchReportRenderer.prototype.constructor = SearchReportRenderer;

    function SearchReportExplorer(parentId, reportList, resultModel, commandService, contentTypeService, openWithCommands) {
        this.parentId = parentId;
        this.reportList = reportList;
        this.resultModel = resultModel;
        this._commandService = commandService;
        this._contentTypeService = contentTypeService;
        this._openWithCommands = openWithCommands;
        this.renderer = new SearchReportRenderer({
            checkbox: false
        }, this);
    }
    SearchReportExplorer.prototype = new mExplorer.Explorer();

    SearchReportExplorer.prototype.report = function() {
        this.createTree(this.parentId, new mExplorer.ExplorerFlatModel(null, null, this.reportList));
    };

    SearchReportExplorer.prototype.constructor = SearchReportExplorer;

	function CompareStyler(registry){
		this._syntaxHighlither = new mHighlight.SyntaxHighlighter(registry);
	}	
	CompareStyler.prototype = {
		highlight: function(fileName, contentType, editor) {
			return this._syntaxHighlither.setup(contentType, editor.getTextView(), 
										 null, //passing an AnnotationModel allows the styler to use it to annotate tasks/comment folding/etc, but we do not really need this in compare editor
										 fileName,
										 false /*bug 378193*/);
		}
	};

    /**
     * Creates a new search result explorer.
     * @name orion.InlineSearchResultExplorer
     */
    function InlineSearchResultExplorer(registry, commandService, inlineSearchPane, preferences) {
        this.registry = registry;
        this._commandService = commandService;
        this.fileClient = new mFileClient.FileClient(this.registry);
        this.defaulRows = 40;
		this._contentTypeService = new mContentTypes.ContentTypeRegistry(this.registry);
		this._inlineSearchPane = inlineSearchPane;
		this._preferences = preferences;
		this.staleTooltips = [];
		
		var gotPreferences = this._preferences.getPreferences("/inlineSearchPane").then(function(prefs) { //$NON-NLS-0$
			var show = prefs.get("showFullPath"); //$NON-NLS-0$
			if (show === undefined) {
				show = false;
				prefs.put("showFullPath", show); //$NON-NLS-0$
			}
			this._shouldShowFullPath = show;
		}.bind(this));
		
        gotPreferences.then(this.declareCommands.bind(this));
    }

    InlineSearchResultExplorer.prototype = new mExplorer.Explorer();

    /**
     * Clients can connect to this function to receive notification when the root item changes.
     * @param {Object} item
     */
    InlineSearchResultExplorer.prototype.onchange = function(item) {};

    InlineSearchResultExplorer.prototype.setResult = function(parentNode, model) {
        var that = this;
        this.parentNode = parentNode;
        if (this._shouldShowFullPath) { //$NON-NLS-0$
        	this.parentNode.classList.add("showFullPath"); //$NON-NLS-0$
        } else {
        	this.parentNode.classList.remove("showFullPath"); //$NON-NLS-0$
        }
        this.model = model;
        if (this.model.replaceMode()) {
            this._hasCheckedItems = true;
            this.checkbox = true;
            this.renderer = new SearchResultRenderer({
                checkbox: true,
                highlightSelection: false,
                getCheckedFunc: function(item) {
                    return that.getItemChecked(item);
                },
                onCheckedFunc: function(rowId, checked, manually) {
                    that.onRowChecked(rowId, checked, manually);
                }
            }, that);
        } else {
            this.checkbox = false;
            this.renderer = new SearchResultRenderer({
                checkbox: false,
                highlightSelection: false
            }, this);
        }

        this._reporting = false;
        this._currentPreviewModel = null;
        this._currentReplacedContents = {
            contents: null
        };
        this._popUpContext = false;
        this._timer = null;
        this.compareView = null;
    };

    /* one-time setup of commands */
    InlineSearchResultExplorer.prototype.declareCommands = function() {
        var that = this;
        // page actions for search
        var replaceAllCommand = new mCommands.Command({
            name: messages["Apply Changes"],
            tooltip: messages["Replace all selected matches"],
            id: "orion.globalSearch.replaceAll", //$NON-NLS-0$
            callback: function(data) {
                that.replaceAll();
            },
            visibleWhen: function(item) {
                return that.model && that.model.replaceMode() && !that._reporting && that._hasCheckedItems;
            }
        });
        
        var nextResultCommand = new mCommands.Command({
            tooltip: messages["Next result"],
            imageClass: "core-sprite-move-down", //$NON-NLS-0$
            id: "orion.search.nextResult", //$NON-NLS-0$
            groupId: "orion.searchGroup", //$NON-NLS-0$
            visibleWhen: function(item) {
                return !that._reporting && (that.getItemCount() > 0);
            },
            callback: function() {
                that.gotoNext(true, true);
            }
        });
        var prevResultCommand = new mCommands.Command({
            tooltip: messages["Previous result"],
            imageClass: "core-sprite-move-up", //$NON-NLS-0$
            id: "orion.search.prevResult", //$NON-NLS-0$
            groupId: "orion.searchGroup", //$NON-NLS-0$
            visibleWhen: function(item) {
                return !that._reporting && (that.getItemCount() > 0);
            },
            callback: function() {
                that.gotoNext(false, true);
            }
        });
        
        var switchFullPathCommand = new mCommands.Command({
        	name: messages["fullPath"], //$NON-NLS-0$
            tooltip: messages["switchFullPath"], //$NON-NLS-0$
            imageClass : "sprite-switch-full-path", //$NON-NLS-0$
            id: "orion.search.switchFullPath", //$NON-NLS-0$
            groupId: "orion.searchGroup", //$NON-NLS-0$
            type: "switch", //$NON-NLS-0$
            checked: this._shouldShowFullPath,
            visibleWhen: function(item) {
                return (that.getItemCount() > 0);
            },
            callback: function() {
                that.switchFullPath();
                //TODO toggle tooltip
            }
        });
        
        this._commandService.addCommand(nextResultCommand);
        this._commandService.addCommand(prevResultCommand);
        this._commandService.addCommand(replaceAllCommand);
        this._commandService.addCommand(switchFullPathCommand);
        
        this._commandService.addCommandGroup("searchPageActions", "orion.searchActions.unlabeled", 200); //$NON-NLS-1$ //$NON-NLS-0$
        
        mExplorer.createExplorerCommands(this._commandService, function(item) {
			var emptyKeyword = false;
			if(that.model._provideSearchHelper && that.model._provideSearchHelper().params.keyword === ""){
				emptyKeyword = true;
			}
			return !item._reporting && !emptyKeyword;
        });
        
        this._commandService.registerCommandContribution("searchPageActions", "orion.globalSearch.replaceAll", 1); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("searchPageActions", "orion.explorer.expandAll", 2); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("searchPageActions", "orion.explorer.collapseAll", 3); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("searchPageActions", "orion.search.nextResult", 4); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("searchPageActions", "orion.search.prevResult", 5); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("searchPageActions", "orion.search.switchFullPath", 6); //$NON-NLS-1$ //$NON-NLS-0$
    };

    InlineSearchResultExplorer.prototype._checkStale = function(model) {
        return this.registry.getService("orion.page.progress") //$NON-NLS-0$
            .progress(this.fileClient.read(model.location), "Checking file " + model.location + " for stale") //$NON-NLS-1$ //$NON-NLS-0$
            .then(function(contents) {
            if (this.model.staleCheck(contents)) {
                model.stale = false;
            }
        }.bind(this), function(error) {
            console.error("Error loading file contents: " + error.message); //$NON-NLS-0$
            throw error;
        }.bind(this));
    }; 
    
    InlineSearchResultExplorer.prototype.staleCheck = function(){
        var promises = [];
		_validFiles(this.model).forEach(function(fileItem) {
			promises.push(this._loadFileMetaData(fileItem));
		}.bind(this));
		return Deferred.all(promises, function(error) { return {_error: error}; });
    };
    
    InlineSearchResultExplorer.prototype._loadFileMetaData = function(fileItem) {
        return this.registry.getService("orion.page.progress").progress(this.fileClient.read(fileItem.location, true), "Getting file metadata " + fileItem.location).then( //$NON-NLS-1$ //$NON-NLS-0$
	        function(meta) {
	            fileItem.fullPathName = mSearchUtils.fullPathNameByMeta(meta.Parents);
	            fileItem.parentLocation = meta.Parents[0].Location;
	            fileItem.stale = (fileItem.lastModified !== meta.LocalTimeStamp);
	            fileItem.ETag = meta.ETag;
	            if (fileItem.stale) {
	                return this._checkStale(fileItem).then(function(){
	                   this.renderer.staleFileElement(fileItem);
	                }.bind(this));
	            }
				return fileItem;
	        }.bind(this),
	        function(error) {
	            console.error("Error loading file metadata: status " + error.status); //$NON-NLS-0$
	            //If we can't load file meta data we have to stale the file.
	            fileItem.stale = true;
	            this.renderer.staleFileElement(fileItem);
	            throw error;
	        }.bind(this)
		);
    };
    
    InlineSearchResultExplorer.prototype.setCrawling = function(crawling) {
        this._crawling = crawling;
    };

    InlineSearchResultExplorer.prototype._fileExpanded = function(fileIndex, detailIndex) {
        var filItem = _validFiles(this.model)[fileIndex];
        if (detailIndex === null || detailIndex === undefined) {
            return {
                childrenNumber: 0,
                childDiv: lib.node(this.model.getId(filItem))
            };
        }
        if (filItem.children && filItem.children.length > 0) {
            if (detailIndex < 0) {
                detailIndex = filItem.children.length - 1;
            } else if (detailIndex >= filItem.children.length) {
                detailIndex = 0;
            }
            return {
                childrenNumber: filItem.children.length,
                childDiv: lib.node(this.model.getId(filItem.children[detailIndex]))
            };
        }
        return {
            childrenNumber: 0,
            childDiv: null
        };
    };

    InlineSearchResultExplorer.prototype.replaceAll = function() {
        var reportList = [];
        this._reporting = true;
        this.initCommands();
        this.reportStatus(messages["Writing files..."]);
        this.model.writeReplacedContents(reportList).then(function(modellist) {
            _empty(this.getParentDivId());
            var reporter = new SearchReportExplorer(
            	this.getParentDivId(), 
            	reportList, 
            	this.model, 
            	this._commandService, 
            	this._contentTypeService, 
            	this._openWithCommands
            );
            reporter.report();
            this._inlineSearchPane.hideReplacePreview();
            this.reportStatus("");
        }.bind(this));
    };

    InlineSearchResultExplorer.prototype.toggleCompare = function(show) {
        this.replacePreview(false, show);
    };

    InlineSearchResultExplorer.prototype.replacePreview = function(init, comparing) {
        _empty(this.getParentDivId());
        if (comparing) {
            if (this.compareView) {
            	this.compareView.destroy();
            	this.compareView = null;
            }
            this._currentPreviewModel = null;
        } else {
            if (this.compareView) {
            	this.compareView.destroy();
            	this.compareView = null;
            }
            this._currentPreviewModel = null;
        }
        this.initCommands();
        if (init) {
            this.reportStatus(messages["Preparing preview..."]);
        }
        var that = this;
		this.createTree(this.getParentDivId(), this.model, {
            selectionPolicy: "singleSelection", //$NON-NLS-0$
            indent: 0,
            setFocus: false,
            onCollapse: function(model) {
                that.onCollapse(model);
            }
        }); //$NON-NLS-0$

        if (init) {
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
            this.reportStatus("");
            if(!this._crawling && this.model.staleCheck) {
	            this.staleCheck().then(function() {
	                that.refreshValidFiles();
	            });
            }
        } else {
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
        }
    };

    InlineSearchResultExplorer.prototype.getItemChecked = function(item) {
        if (item.checked === undefined) {
            item.checked = true;
        }
        return item.checked;
    };

    InlineSearchResultExplorer.prototype._checkedItem = function() {
        var fileList = _validFiles(this.model);
        for (var i = 0; i < fileList.length; i++) {
            if (fileList[i].checked) {
                return true;
            }
            if (!fileList[i].children) {
                continue;
            }
            for (var j = 0; j < fileList[i].children.length; j++) {
                if (fileList[i].children[j].checked) {
                    return true;
                }
            }
        }
        return false;
    };

    InlineSearchResultExplorer.prototype.onRowChecked = function(rowId, checked, manually) {
        var hasCheckedItems;
        if (!rowId) {
            hasCheckedItems = checked;
            this.onItemChecked(this.model.getListRoot(), checked, manually);
        } else {
            var row = lib.node(rowId);
            if (row && row._item) {
                this.onItemChecked(row._item, checked, manually);
            }
            hasCheckedItems = this._checkedItem();
        }
        if (hasCheckedItems !== this._hasCheckedItems) {
            this._hasCheckedItems = hasCheckedItems;
            this.initCommands();
        }
    };

    InlineSearchResultExplorer.prototype.onNewContentChanged = function(fileItem) {
        if (fileItem === _getFileModel(this.getNavHandler().currentModel())) {
            this.buildPreview(true);
        }
    };

    InlineSearchResultExplorer.prototype.onItemChecked = function(item, checked, manually) {
        item.checked = checked;
        if (item.type === "file" || item === this.model.getListRoot()) { //$NON-NLS-0$
            if (item.children) {
                for (var i = 0; i < item.children.length; i++) {
                    var checkBox = lib.node(this.renderer.getCheckBoxId(this.model.getId(item.children[i])));
                    if (checkBox) {
                        this.renderer.onCheck(null, checkBox, checked, false);
                    } else {
                        item.children[i].checked = checked;
                    }
                }
            }
            if (item.type === "file") { //$NON-NLS-0$
                this.onNewContentChanged(item);
            }
        } else if (manually) {
            this.onNewContentChanged(item.parent);
        }
    };

    InlineSearchResultExplorer.prototype.buildPreview = function(updating) {
        if (_validFiles(this.model).length === 0) {
            return;
        }
        var fileItem = _getFileModel(this.getNavHandler().currentModel());
        this._currentPreviewModel = fileItem;
        this.model.provideFileContent(fileItem, function(fileItem) {
            if (this.model.onMatchNumberChanged) {
                this.model.onMatchNumberChanged(fileItem);
            }
			this.model.getReplacedFileContent(this._currentReplacedContents, updating, fileItem);
			var replacedContents = this._currentReplacedContents.contents;
			if(Array.isArray(replacedContents)){
				replacedContents = this._currentReplacedContents.contents.join(this._currentReplacedContents.lineDelim);
			}
            // Diff operations
            var fileName = this.model.getFileName(fileItem);
            var fType = this._contentTypeService.getFilenameContentType(fileName);
            var options = {
                readonly: true,
                hasConflicts: false,
                oldFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: this.model.getFileContents(fileItem)
                },
                newFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: replacedContents
                }
            };
            if (!this.compareView) {           	
				options.parentDivId = this._inlineSearchPane.getReplaceCompareDiv();
                this.compareView = new mCompareView.InlineCompareView(options);
                this.compareView.setOptions({highlighters: [new CompareStyler(this.registry)]});
                this.compareView.startup();
            } else {
                this.compareView.setOptions(options);
                this.compareView.refresh(true);
            }
            
            var titleDiv = this._inlineSearchPane.getReplaceCompareTitleDiv();
            lib.empty(titleDiv);
            titleDiv.appendChild(document.createTextNode(messages["Preview: "] + fileName)); //$NON-NLS-0$
            
           window.setTimeout(function() {
                this.renderer.focus();
            }.bind(this), 100);
        }.bind(this));
    };
    
    InlineSearchResultExplorer.prototype.caculateNextPage = function() {
        var pagingParams = this.model.getPagingParams();
        if ((pagingParams.start + pagingParams.rows) >= pagingParams.totalNumber) {
            return {
                start: pagingParams.start
            };
        }
        return {
            start: pagingParams.start + pagingParams.rows
        };
    };

    InlineSearchResultExplorer.prototype.caculatePrevPage = function() {
        var pagingParams = this.model.getPagingParams();
        var start = pagingParams.start - pagingParams.rows;
        if (start < 0) {
            start = 0;
        }
        return {
            start: start
        };
    };

    InlineSearchResultExplorer.prototype.initCommands = function() {
        var that = this;
        this._commandService.destroy("searchPageActions"); //$NON-NLS-0$
        this._commandService.renderCommands("searchPageActions", "searchPageActions", that, that, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

        this._commandService.destroy("pageNavigationActions"); //$NON-NLS-0$
        this._commandService.renderCommands("pageNavigationActions", "pageNavigationActions", that, that, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
    };

    InlineSearchResultExplorer.prototype.reportStatus = function(message) {
        this.registry.getService("orion.page.message").setProgressMessage(message); //$NON-NLS-0$
    };

    InlineSearchResultExplorer.prototype.isExpanded = function(model) {
        return this.myTree.isExpanded(this.model.getId(model));
    };

    InlineSearchResultExplorer.prototype.popupContext = function(model) {
        if (this.contextTip) {
            this.contextTip.destroy();
            this.contextTip = null;
        }
        var modelLinkId = this.renderer.getDetailIconId(model);
        var tableNode = this.renderer.generateContextTip(model);
        var aroundNode = lib.node(modelLinkId);
        var orient = ["below", "right"]; //$NON-NLS-1$ //$NON-NLS-0$
        if (aroundNode) {
            var parentNode = this.myTree._parent;
            var parentRect = parentNode.getClientRects()[0];
            var rects = aroundNode.getClientRects();
            for (var i = 0, l = rects.length; i < l; i++) {
                var r = rects[i];
                if ((r.bottom + 100) > parentRect.bottom) {
                    orient = ["above", "right"]; //$NON-NLS-1$ //$NON-NLS-0$
                    break;
                }
            }
        }
        this.contextTip = new mTooltip.Tooltip({
            node: aroundNode,
            showDelay: 0,
            trigger: "none", //$NON-NLS-0$
            position: orient
        });
        var toolTipContent = this.contextTip.contentContainer();
        toolTipContent.appendChild(tableNode);
        this.contextTip.show();
    };

    InlineSearchResultExplorer.prototype.closeContextTip = function(remainFlag) {
        if (!this.model.replaceMode()) {
            if (this.contextTip) {
                this.contextTip.destroy();
                this.contextTip = null;
            }
            if (!remainFlag) {
                this._popUpContext = false;
            }
            this.renderer.replaceDetailIcon(this.getNavHandler().currentModel(), "right"); //$NON-NLS-0$
        }
    };

    InlineSearchResultExplorer.prototype.onCollapse = function(model) {
        var curModel = this.getNavHandler().currentModel();
        if (!curModel) {
            return;
        }
        if (curModel.type === "detail") { //$NON-NLS-0$
            var curFileModel = _getFileModel(model);
            if (curFileModel === model) {
                this.getNavHandler().cursorOn(model);
            }
        }
    };

    InlineSearchResultExplorer.prototype.onExpand = function(modelToExpand, childPosition, callback) {
        if (modelToExpand && modelToExpand.children && modelToExpand.children.length > 0 && typeof(childPosition) === "string") { //$NON-NLS-0$
            var childIndex = 0;
            if (childPosition === "first") { //$NON-NLS-0$
                childIndex = 0;
            } else if (childPosition === "last") { //$NON-NLS-0$
                childIndex = modelToExpand.children.length - 1;
            } else {
                childIndex = JSON.parse(childPosition);
            }
            if (typeof(childIndex) === "string" || childIndex < 0 || childIndex >= modelToExpand.children.length) { //$NON-NLS-0$
                childIndex = 0;
            }
            this.getNavHandler().cursorOn(modelToExpand.children[childIndex]);
        }
    };

    InlineSearchResultExplorer.prototype.forceExpandFunc = function(modelToExpand, childPosition, callback) {
        this.myTree.expand(modelToExpand, function() {
            this.onExpand(modelToExpand, childPosition, callback);
        }.bind(this));
        return null;
    };

    //Provide the key listening div.If not provided this._myTree._parent will be used.
    InlineSearchResultExplorer.prototype.keyEventListeningDiv = function(secondLevel) {
        return lib.node(this.getParentDivId(secondLevel));

    };

    InlineSearchResultExplorer.prototype.onFocus = function(focus) {
        if (!focus) {
            this.closeContextTip();
        }
    };

    InlineSearchResultExplorer.prototype.preventDefaultFunc = function(e, model) {
        if (!model) {
            return true;
        }
        if (!this.model.replaceMode() && !e.ctrlKey && model.type === "detail") { //$NON-NLS-0$
            if (e.keyCode === 37 /*left*/ && this._popUpContext) {
                this.closeContextTip();
                e.preventDefault();
                return true;
            }
            if (e.keyCode === 39 /*right*/ && !this._popUpContext) {
                this._popUpContext = true;
                this.renderer.replaceDetailIcon(model, "left"); //$NON-NLS-0$
                this.popupContext(model);
                e.preventDefault();
                return true;
            }
        }
        return false;
    };

    InlineSearchResultExplorer.prototype.onReplaceCursorChanged = function(prevModel, currentModel) {
    	this._inlineSearchPane.showReplacePreview();
        if (!_onSameFile(this._currentPreviewModel, currentModel)) {
            this.buildPreview();
        }
        if (this.compareView && (currentModel.type === "detail")) { //$NON-NLS-0$
        	if(currentModel.checked) {//If the change is checked we highlight the pair of the diff
	        	// Figure out change index. Unchecked elements are 
	        	// removed from diffs and must therefore be skipped.
				var changeIndex = 0;
				currentModel.parent.children.some(function(element){
					if (currentModel.location === element.location) {
						return true;
					} else if (element.checked) {
						changeIndex++;
					}
					return false;
				}, this);
			    this.compareView.gotoDiff(changeIndex);
			} else if (currentModel.lineNumber !== undefined) {//If the change is unchecked, scroll to the line and select the match
				var startIndex = currentModel.matches[currentModel.matchNumber - 1].startIndex;
				var endIndex = startIndex + currentModel.matches[currentModel.matchNumber - 1].length;
			    this.compareView.gotoLine(currentModel.lineNumber - 1, startIndex, endIndex);
			}
        }
    };

    InlineSearchResultExplorer.prototype.onCursorChanged = function(prevModel, currentModel) {
        this.renderer.replaceDetailIcon(prevModel, "none"); //$NON-NLS-0$
        if (this.model.storeLocationStatus) {
            this.model.storeLocationStatus(currentModel);
        }
        if (this.model.replaceMode()) {
			if (this._timer) {
				window.clearTimeout(this._timer);
			}			
            this._timer = window.setTimeout(function() {
            	this._timer = null;
                this.onReplaceCursorChanged(prevModel, currentModel);
            }.bind(this), 200);
        } else if (currentModel.type === "detail") { //$NON-NLS-0$
            if (this._popUpContext) {
                this.popupContext(currentModel);
                this.renderer.replaceDetailIcon(currentModel, "left"); //$NON-NLS-0$
            } else {
                this.renderer.replaceDetailIcon(currentModel, "right"); //$NON-NLS-0$
            }
        } else {
            if (this._popUpContext) {
                this.closeContextTip(true);
            }
        }
    };
 
    InlineSearchResultExplorer.prototype._startUp = function() {
		var pagingParams = this.model.getPagingParams();
		if(this.model._provideSearchHelper){
			window.document.title = this.model._provideSearchHelper().displayedSearchTerm + " - " +  i18nUtil.formatMessage(messages["${0} matches"], pagingParams.totalNumber);//$NON-NLS-0$
		}
		if (pagingParams.numberOnPage === 0) {
			var message = messages["No matches"];
			if(this.model._provideSearchHelper){
				message = i18nUtil.formatMessage(messages["NoMatchFound"], this.model._provideSearchHelper().displayedSearchTerm);
			}
		    this.parentNode.textContent = "";
		    var textBold = _createElement('b', null, null, this.parentNode); //$NON-NLS-1$ //$NON-NLS-0$
		    _place(document.createTextNode(message), textBold, "only"); //$NON-NLS-0$
            this.reportStatus("");
		    return;
		} 
        var that = this;       
        this.model.buildResultModel();
        if (this.model.replaceMode()) {
            that.replacePreview(true, true);
        } else {
            this.initCommands();
            _empty(this.getParentDivId());
            this.createTree(this.getParentDivId(), this.model, {
				selectionPolicy: "singleSelection", //$NON-NLS-0$
                indent: 0,
				getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
				setFocus: false,
                onCollapse: function(model) {
                    that.onCollapse(model);
                }
            });
            this.gotoCurrent(this.model.restoreLocationStatus ? this.model.restoreLocationStatus() : null);
            this.reportStatus("");
            if(!this._crawling && this.model.staleCheck) {
	            this.staleCheck().then(function() {
	                that.refreshValidFiles();
	            });
            }
        }
    };

    InlineSearchResultExplorer.prototype.startUp = function() {
        if(this._openWithCommands){
			this._startUp();
        } else {
			var openWithCommandsDeferred =  extensionCommands.createOpenWithCommands(this.registry, this._contentTypeService, this._commandService);
			Deferred.when(openWithCommandsDeferred, function(openWithCommands) {
					this._openWithCommands = openWithCommands;
					this._startUp();
				}.bind(this));
        }
    };

    InlineSearchResultExplorer.prototype._incrementalRender = function() {
        var that = this;
        this.model.buildResultModel();
        this.createTree(this.getParentDivId(), this.model, {
            selectionPolicy: "singleSelection", //$NON-NLS-0$
            getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
            indent: 0,
            setFocus: false,
            onCollapse: function(model) {
                that.onCollapse(model);
            }
        });
    };

    InlineSearchResultExplorer.prototype.incrementalRender = function() {
        if(this._openWithCommands){
			this._incrementalRender();
        } else {
			var openWithCommandsDeferred =  extensionCommands.createOpenWithCommands(this.registry, this._contentTypeService, this._commandService);
			Deferred.when(openWithCommandsDeferred, function(openWithCommands) {
					this._openWithCommands = openWithCommands;
					this._incrementalRender();
				}.bind(this));
        }
    };

    InlineSearchResultExplorer.prototype.refreshValidFiles = function() {
        var newIndex = [];
        var currentFileItem = _getFileModel(this.getNavHandler().currentModel());
        var fileList = _validFiles(this.model);
        for (var i = 0; i < fileList.length; i++) {
            if (!fileList[i].stale) {
                newIndex.push(fileList[i]);
            } else if (currentFileItem === fileList[i]) {
                currentFileItem = null;
            }
        }
        if(this.model.setValidFileList){
			this.model.setValidFileList(newIndex);
        }
        if (_validFiles(this.model).length === 0) {
            this.getNavHandler().refreshModel(this.getNavDict(), this.model, _validFiles(this.model));
            this.getNavHandler().cursorOn(null, true);
        } else if (!currentFileItem) {
            this.getNavHandler().cursorOn(null, true);
            this.getNavHandler().refreshModel(this.getNavDict(), this.model, _validFiles(this.model));
            this.gotoCurrent();
        } else {
            this.getNavHandler().refreshModel(this.getNavDict(), this.model, _validFiles(this.model), true);
        }
    };

    //provide to the expandAll/collapseAll commands
    InlineSearchResultExplorer.prototype.getItemCount = function() {
    	var count = 0;
    	if (this.model) {
    		count = this.model.getListRoot().children.length;
    	}
        return count;
    };

    InlineSearchResultExplorer.prototype.getParentDivId = function(secondLevel) {
    	return this.parentNode.id;
    };

    InlineSearchResultExplorer.prototype.gotoCurrent = function(cachedItem) {
        var modelToExpand = null;
        var detailIndex = "none"; //$NON-NLS-0$
        if (cachedItem) {
            modelToExpand = cachedItem.file;
            detailIndex = cachedItem.detail;
        } else {
            modelToExpand = this.getNavHandler().currentModel();
        }
        if(!modelToExpand){
			modelToExpand = _validFiles(this.model).length > 0 ? _validFiles(this.model)[0] : null;
        }
        this.getNavHandler().cursorOn(modelToExpand, true, null, true);
        if (modelToExpand && detailIndex && detailIndex !== "none") { //$NON-NLS-0$
            this.myTree.expand(modelToExpand, function() {
                this.onExpand(modelToExpand, detailIndex);
            }.bind(this));
        }
    };

    InlineSearchResultExplorer.prototype.gotoNext = function(next, forceExpand) {
        if (_validFiles(this.model).length === 0) {
            return;
        }
        this.getNavHandler().iterate(next, forceExpand, true);
        
        // skip unchecked matches in replace mode
        if (this.model.replaceMode()) {
        	var currentModel = this.getNavHandler().currentModel();
        	while (currentModel && !currentModel.checked) {
        		this.getNavHandler().iterate(next, forceExpand, true);
        		currentModel = this.getNavHandler().currentModel();
        	}
        }
    };
    
    InlineSearchResultExplorer.prototype.switchFullPath = function() {
    	this._preferences.getPreferences("/inlineSearchPane").then(function(prefs) { //$NON-NLS-0$
			var show = !prefs.get("showFullPath"); //$NON-NLS-0$
			if (show) { //$NON-NLS-0$
	        	this.parentNode.classList.add("showFullPath"); //$NON-NLS-0$
	        } else {
	        	this.parentNode.classList.remove("showFullPath"); //$NON-NLS-0$
	        }
	        prefs.put("showFullPath", show); //$NON-NLS-0$
			this._shouldShowFullPath = show;
		}.bind(this));
    };

	InlineSearchResultExplorer.prototype._renderSearchResult = function(crawling, resultsNode, searchParams, jsonData, incremental) {
		var foundValidHit = false;
		var resultLocation = [];
		lib.empty(lib.node(resultsNode));
		
		// cleanup dead tooltips
		var deadTooltip = this.staleTooltips.pop();
		while (deadTooltip) {
			deadTooltip.destroy();
			deadTooltip = this.staleTooltips.pop();
		}
		
		if (jsonData.response.numFound > 0) {
			for (var i=0; i < jsonData.response.docs.length; i++) {
				var hit = jsonData.response.docs[i];
				if (!hit.Directory) {
					if (!foundValidHit) {
						foundValidHit = true;
					}
					var loc = hit.Location;
					var path = hit.Path;
					if (!path) {
						var rootURL = this.fileClient.fileServiceRootURL(loc);
						path = loc.substring(rootURL.length); //remove file service root from path
					}
					resultLocation.push({linkLocation: require.toUrl("edit/edit.html") +"#" + loc, location: loc, path: path, name: hit.Name, lastModified: hit.LastModified}); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}
		}
		this.setCrawling(crawling);
		var that = this;
        var searchModel = new mSearchModel.SearchResultModel(this.registry, this.fileClient, resultLocation, jsonData.response.numFound, searchParams, {
            onMatchNumberChanged: function(fileItem) {
                that.renderer.replaceFileElement(fileItem);
            }
        });
		this.setResult(resultsNode, searchModel);
		if(incremental){
			this.incrementalRender();
		} else {
			this.startUp();
		}
		
		var resultTitleDiv = this._inlineSearchPane.getSearchResultsTitleDiv();
		lib.empty(resultTitleDiv);
		resultTitleDiv.appendChild(document.createTextNode(_headerString(this.model)));
	};

	/**
	 * Runs a search and displays the results under the given DOM node.
	 *
	 * @param {DOMNode} resultsNode Node under which results will be added.
	 * @param {Object} searchParams The search parameters to use for the search
	 * @param {Searcher} searcher
	 */
	InlineSearchResultExplorer.prototype._search = function(resultsNode, searchParams, searcher) {
		//For crawling search, temporary
		//TODO: we need a better way to render the progress and allow user to be able to cancel the crawling search
		var crawling = searchParams.regEx || searchParams.caseSensitive;
		var crawler;
		
		lib.empty(resultsNode);
		
		//If there is no search keyword defined, then we treat the search just as the scope change.
		if(typeof searchParams.keyword === "undefined"){ //$NON-NLS-0$
			return;
		}
		
		if (crawling) {
			resultsNode.appendChild(document.createTextNode(""));
			crawler = new mSearchCrawler.SearchCrawler(this.registry, this.fileClient, searchParams, {childrenLocation: searcher.getChildrenLocation()});
			crawler.search( function(jsonData, incremental) {
				this._renderSearchResult(crawling, resultsNode, searchParams, jsonData, incremental);
			}.bind(this));
		} else {
			this.registry.getService("orion.page.message").setProgressMessage(messages["Searching..."]); //$NON-NLS-0$
			try{
				this.registry.getService("orion.page.progress").progress(this.fileClient.search(searchParams), "Searching " + searchParams.keyword).then( //$NON-NLS-1$ //$NON-NLS-0$
					function(jsonData) {
						this.registry.getService("orion.page.message").setProgressMessage(""); //$NON-NLS-0$
						this._renderSearchResult(false, resultsNode, searchParams, jsonData);
					}.bind(this),
					function(error) {
						var message = i18nUtil.formatMessage(messages["${0}. Try your search again."], error && error.error ? error.error : "Error"); //$NON-NLS-0$
						this.registry.getService("orion.page.message").setProgressResult({Message: message, Severity: "Error"}); //$NON-NLS-0$
					}.bind(this)
				);
			} catch(error) {
				lib.empty(resultsNode);
				resultsNode.appendChild(document.createTextNode(""));
				if(typeof(error) === "string" && error.indexOf("search") > -1){ //$NON-NLS-1$ //$NON-NLS-0$
					crawler = new mSearchCrawler.SearchCrawler(this.registry, this.fileClient, searchParams, {childrenLocation: searcher.getChildrenLocation()});
					crawler.search( function(jsonData, incremental) {
						this._renderSearchResult(true, resultsNode, searchParams, jsonData, incremental);
					}.bind(this));
				} else {
					this.registry.getService("orion.page.message").setErrorMessage(error);	 //$NON-NLS-0$
				}
			}
		}
	};

	/**
	 * Performs the given query and generates the user interface 
	 * representation of the search results.
	 * @param {String} query The search query
	 * @param {String | DomNode} parentNode The parent node to display the results in
	 * @param {Searcher} searcher
	 */
	InlineSearchResultExplorer.prototype.runSearch = function(searchParams, parentNode, searcher) {
		var parent = lib.node(parentNode);
		this._search(parent, searchParams, searcher);
	};

    InlineSearchResultExplorer.prototype.constructor = InlineSearchResultExplorer;
    
    //return module exports
    return InlineSearchResultExplorer;
});
