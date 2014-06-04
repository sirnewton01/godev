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

/*global define document console window*/
/*jslint forin:true regexp:false sub:true*/

define(['i18n!orion/search/nls/messages', 'require', 'orion/Deferred', 'orion/webui/littlelib', 'orion/contentTypes', 'orion/i18nUtil', 'orion/explorers/explorer', 
	'orion/explorers/explorerNavHandler', 'orion/fileClient', 'orion/commands', 'orion/searchUtils', 'orion/globalSearch/search-features', 
	'orion/compare/compareUIFactory', 'orion/compare/compareView', 'orion/highlight', 'orion/explorers/navigationUtils', 'orion/webui/tooltip',
	'orion/explorers/navigatorRenderer', 'orion/extensionCommands'],

function(messages, require, Deferred, lib, mContentTypes, i18nUtil, mExplorer, mNavHandler, mFileClient, mCommands, 
	mSearchUtils, mSearchFeatures, mCompareUIFactory, mCompareView, mHighlight, mNavUtils, mTooltip, navigatorRenderer, extensionCommands) {
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

    function _createLink(classNames, id, href, parent, linkName) {
        var link = _createElement('a', classNames, id, parent); //$NON-NLS-0$
        link.href = href;
        if (linkName) {
            link.appendChild(document.createTextNode(linkName));
        }
        return link;
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

    SearchResultRenderer.prototype.getCellHeaderElement = function(col_no) {
        if (col_no > 2) {
            return null;
        }
        var title, header;
        if (col_no !== 0) {
            title = _createElement("th"); //$NON-NLS-0$
            header = _createElement("h2", "search_header", null, title); //$NON-NLS-1$  //$NON-NLS-0$
            if (col_no === 1) {
                header.textContent = _headerString(this.explorer.model);
                return title;
            } else if (col_no === 2) {
                header.textContent = messages["Location"]; //$NON-NLS-0$
            }
            return title;
        } else {
            return _createElement("th"); //$NON-NLS-0$
        }
    };

    SearchResultRenderer.prototype.focus = function() {
        var resultParentDiv = lib.node(this.explorer.getParentDivId());
        window.setTimeout(function() {
            resultParentDiv.focus();
        }, 10);
    };

    SearchResultRenderer.prototype.staleFileElement = function(item, displayName) {
        if (item.stale) {
            var navGridHolder = this.explorer.getNavDict() ? this.explorer.getNavDict().getGridNavHolder(item, true) : null;
            mNavUtils.removeNavGrid(navGridHolder, lib.node(this.getItemLinkId(item)));
            var span = lib.node(this.getFileSpanId(item));
            _empty(span);
            _place(document.createTextNode(displayName ? displayName : this.explorer.model.getFileName(item)), span, "last"); //$NON-NLS-0$
            span = lib.node(this.getFileIconId(item));
            _empty(span);
        } else {
			this.explorer._prepareFilter(item);
        }
    };

    SearchResultRenderer.prototype.replaceFileElement = function(item) {
        var renderName = item.totalMatches ? this.explorer.model.getFileName(item) + " (" + i18nUtil.formatMessage(messages["${0} matches"], item.totalMatches) + ")" :  //$NON-NLS-1$ //$NON-NLS-0$
						 this.explorer.model.getFileName(item) + " (" + messages["No matches"] + ")"; //$NON-NLS-1$ //$NON-NLS-0$
		if(item.totalMatches) {
			var linkDiv = lib.node(this.getItemLinkId(item));
	        _place(document.createTextNode(renderName), linkDiv, "only"); //$NON-NLS-0$
	    } else {
			item.stale = true;
			this.staleFileElement(item, renderName);
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

    SearchResultRenderer.prototype.renderFileElement = function(item, spanHolder, renderName) {
        var helper = null;
        if (this.explorer.model._provideSearchHelper) {
            helper = this.explorer.model._provideSearchHelper();
        }
        //var href = item.linkLocation + (helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, null, helper.params.replace) : "");
        //var link = _createLink('navlink', this.getItemLinkId(item), href, spanHolder, this.explorer.model._filterText ? null : renderName); //$NON-NLS-0$
		var params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, null, helper.params.replace, true) : null;
		var name = this.explorer.model._filterText ? null : renderName;
		var link = navigatorRenderer.createLink(null, {Location: item.location, Name: name}, this.explorer._commandService, this.explorer._contentTypeService,
			this.explorer._openWithCommands, {id:this.getItemLinkId(item)}, params, {holderDom: this._lastFileIconDom});
        spanHolder.appendChild(link);
        mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
        if(this.explorer.model._filterText){
			var parentSpan = _createElement('span', null, null, link); //$NON-NLS-0$
			var filteredResults = mSearchUtils.searchOnelineLiteral({searchStr: this.explorer.model._filterText.toLowerCase(), searchStrLength: this.explorer.model._filterText.length}, renderName.toLowerCase(), false);
			var newSegments = [];
			newSegments.push({name: renderName, startIndex: 0, bold: false, highlight: false});
			if(filteredResults) {
				filteredResults.forEach(function(result) {
					newSegments = this._mergesingleSegment(newSegments, {start: result.startIndex, end: result.startIndex + result.length});
				}.bind(this));
			}
			this._renderSegments(newSegments, parentSpan);
        }
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

    SearchResultRenderer.prototype._mergeFilteredSegments = function(segments, stringToFilter) {
		if(!this.explorer.model._filterText ) {
			return segments;
		}
		var filteredResults = mSearchUtils.searchOnelineLiteral({searchStr: this.explorer.model._filterText.toLowerCase(), searchStrLength: this.explorer.model._filterText.length}, stringToFilter.toLowerCase(), false);
		var newSegments = segments;
		if(filteredResults) {
			filteredResults.forEach(function(result) {
				newSegments = this._mergesingleSegment(newSegments, {start: result.startIndex, end: result.startIndex + result.length});
			}.bind(this));
		}
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

    SearchResultRenderer.prototype.generateDetailHighlight = function(detailModel, parentSpan, useFilter) {
        var detailInfo = this.explorer.model.getDetailInfo(detailModel);
        var segments = this._generateDetailSegments(detailInfo);
        if(useFilter) {
			segments = this._mergeFilteredSegments(segments, detailInfo.lineString);
        }
        this._renderSegments(segments, parentSpan);
    };

    SearchResultRenderer.prototype.renderDetailElement = function(item, tableRow, spanHolder, renderNumber) {
        var linkSpan = this.getDetailElement(item, tableRow, spanHolder);
        if (renderNumber) {
            this.renderDetailLineNumber(item, linkSpan);
        }
        this.generateDetailHighlight(item, linkSpan, true);
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

    SearchResultRenderer.prototype.getDetailElement = function(item, tableRow, spanHolder) {
        var that = this;
        var helper = null;
        if (this.explorer.model._provideSearchHelper) {
            helper = this.explorer.model._provideSearchHelper();
        }
        //var linkLocation = item.parent.linkLocation + (helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, item.lineNumber, helper.params.replace) : "");
        //var link = _createLink('navlink', this.getItemLinkId(item), linkLocation, spanHolder); //$NON-NLS-0$
       
		var params = helper ? mSearchUtils.generateFindURLBinding(helper.params, helper.inFileQuery, item.lineNumber, helper.params.replace, true) : null;
		var name = null;
		var link = navigatorRenderer.createLink(null, {Location: item.parent.location, Name: name}, this.explorer._commandService, this.explorer._contentTypeService,
			this.explorer._openWithCommands, {id:this.getItemLinkId(item)}, params, {});
        spanHolder.appendChild(link);
       
       mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
        _connect(link, "click", function() { //$NON-NLS-0$
            that.explorer.getNavHandler().cursorOn(item);
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

    SearchResultRenderer.prototype.renderLocationElement = function(item, onSpan) {
        var spanHolder = onSpan ? onSpan : lib.node(this.getLocationSpanId(item));
        _empty(spanHolder);
        var scopeParams = this.explorer.model.getScopingParams(item);
        var link = _createLink('navlink', null, scopeParams.href, spanHolder, this.explorer.model._filterText ? null: scopeParams.name); //$NON-NLS-0$
        link.title = scopeParams.tooltip;
        mNavUtils.addNavGrid(this.explorer.getNavDict(), item, link);
        var that = this;
        _connect(link, "click", function() { //$NON-NLS-0$
            that.explorer.closeContextTip();
        });
        if(this.explorer.model._filterText){
			var parentSpan = _createElement('span', null, null, link); //$NON-NLS-0$
			var filteredResults = mSearchUtils.searchOnelineLiteral({searchStr: this.explorer.model._filterText.toLowerCase(), searchStrLength: this.explorer.model._filterText.length}, scopeParams.name.toLowerCase(), false);
			var newSegments = [];
			newSegments.push({name: scopeParams.name, startIndex: 0, bold: false, highlight: false});
			if(filteredResults) {
				filteredResults.forEach(function(result) {
					newSegments = this._mergesingleSegment(newSegments, {start: result.startIndex, end: result.startIndex + result.length});
				}.bind(this));
			}
			this._renderSegments(newSegments, parentSpan);
        }
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
        var col, span;
        switch (col_no) {
            case 0:
                col = _createElement('td'); //$NON-NLS-0$
                if (item.type === "file") { //$NON-NLS-0$
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
                    span = _createSpan(null, null, col, null);
                    col.noWrap = true;
                    col.align = "right"; //$NON-NLS-0$
                    this.renderDetailLineNumber(item, span);
                }
                return col;
            case 1:
                 col = _createElement('td'); //$NON-NLS-0$
                span = _createSpan(null, this.getFileSpanId(item), col, null);
                if (item.type === "file") { //$NON-NLS-0$
                    var renderName = item.totalMatches ? this.explorer.model.getFileName(item) + " (" + item.totalMatches + " matches)" : this.explorer.model.getFileName(item); //$NON-NLS-1$ //$NON-NLS-0$
                    this.renderFileElement(item, span, renderName);
                } else {
                    this.renderDetailElement(item, tableRow, span);
                    var iconSpan = _createSpan(null, this.getDetailIconId(item), span, null);
                    var icon = _createSpan(null, null, iconSpan, null);
                    icon.classList.add('imageSprite'); //$NON-NLS-0$
                    icon.classList.add('core-sprite-none'); //$NON-NLS-0$
                }
                return col;

            case 2:
                col = _createElement('td'); //$NON-NLS-0$
                if (item.type === "file") { //$NON-NLS-0$
                    span = _createSpan(null, this.getLocationSpanId(item), col, null);
                    if (item.parentLocation) {
                        this.renderLocationElement(item, span);
                    }
                }
                return col;
        }
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
            case 1:
                th = _createElement('th', "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-0$
                h2 = _createElement('h2', null, null, th); //$NON-NLS-0$
                h2.textContent = messages["Status"];
                break;
        }
    };

    SearchReportRenderer.prototype.getCellElement = function(col_no, item, tableRow) {
        switch (col_no) {
            case 0:
                var col = _createElement('td', "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-0$
                var div = _createElement('div', null, null, col); //$NON-NLS-0$
                var span = _createElement('span', "primaryColumn", null, div); //$NON-NLS-1$ //$NON-NLS-0$

                _place(document.createTextNode(item.model.fullPathName + "/" + this.explorer.resultModel.getFileName(item.model)), span, "only"); //$NON-NLS-1$ //$NON-NLS-0$
                _connect(span, "click", function() { //$NON-NLS-0$
                    window.open(item.model.linkLocation);
                });
                _connect(span, "mouseover", function() { //$NON-NLS-0$
                    span.style.cursor = "pointer"; //$NON-NLS-0$
                });
                _connect(span, "mouseout", function() { //$NON-NLS-0$
                    span.style.cursor = "default"; //$NON-NLS-0$
                });

                var operationIcon = _createElement('span', null, null, div); //$NON-NLS-1$ //$NON-NLS-0$
                operationIcon.classList.add('imageSprite'); //$NON-NLS-0$
                if (item.status) {
                    switch (item.status) {
                        case "warning": //$NON-NLS-0$
                            operationIcon.classList.add('core-sprite-warning'); //$NON-NLS-0$
                            return col;
                        case "failed": //$NON-NLS-0$
                            operationIcon.classList.add('core-sprite-error'); //$NON-NLS-0$
                            return col;
                        case "pass": //$NON-NLS-0$
                            operationIcon.classList.add('core-sprite-ok'); //$NON-NLS-0$
                            return col;
                    }
                }
                return col;
            case 1:
                var statusMessage;
                if (item.status) {
                    switch (item.status) {
                        case "warning": //$NON-NLS-0$
                            statusMessage = item.message;
                            break;
                        case "failed": //$NON-NLS-0$
                            statusMessage = item.message;
                            break;
                        case "pass": //$NON-NLS-0$
                            statusMessage = item.model.totalMatches ? i18nUtil.formatMessage(messages["${0} out of ${1}  matches replaced."], item.matchesReplaced, item.model.totalMatches) : item.message;
                            break;
                    }
                    var td = _createElement('td', "search_report", null, null); //$NON-NLS-1$ //$NON-NLS-0$
                    td.textContent = statusMessage;
                    return td;
                }
        }
    };

    SearchReportRenderer.prototype.constructor = SearchReportRenderer;

    function SearchReportExplorer(parentId, reportList, resultModel) {
        this.parentId = parentId;
        this.reportList = reportList;
        this.resultModel = resultModel;
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
     * @name orion.SearchResultExplorer
     */
    function SearchResultExplorer(registry, commandService) {
        this.registry = registry;
        this._commandService = commandService;
        this.fileClient = new mFileClient.FileClient(this.registry);
        this.defaulRows = 40;
		this._contentTypeService = new mContentTypes.ContentTypeRegistry(this.registry);
        this.declareCommands();
    }

    SearchResultExplorer.prototype = new mExplorer.Explorer();

    /**
     * Clients can connect to this function to receive notification when the root item changes.
     * @param {Object} item
     */
    SearchResultExplorer.prototype.onchange = function(item) {};

    SearchResultExplorer.prototype.setResult = function(parentNode, model) {
        var that = this;
        this.parentNode = parentNode;
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
        this._uiFactory = null;
        this._currentPreviewModel = null;
        this._currentReplacedContents = {
            contents: null
        };
        this._popUpContext = false;
        this.timerRunning -= false;
        this._timer = null;
        this._filterTimer = null;
        this.twoWayCompareView = null;
    };

    /* one-time setup of commands */
    SearchResultExplorer.prototype.declareCommands = function() {
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

        var hideCompareCommand = new mCommands.Command({
            name: messages["Hide Compare"],
            tooltip: messages["Hide compare view of changes"],
            id: "orion.globalSearch.hideCompare", //$NON-NLS-0$
            callback: function(data) {
                that.toggleCompare(false);
            },
            visibleWhen: function(item) {
                return that.model && that.model.replaceMode() && !that._reporting && that._uiFactory;
            }
        });

        var showCompareCommand = new mCommands.Command({
            name: messages["Show Compare"],
            tooltip: messages["Show compare view of changes"],
            id: "orion.globalSearch.showCompare", //$NON-NLS-0$
            callback: function(data) {
                that.toggleCompare(true);
            },
            visibleWhen: function(item) {
                return that.model && that.model.replaceMode() && !that._reporting && !that._uiFactory;
            }
        });

        this._commandService.addCommand(hideCompareCommand);
        this._commandService.addCommand(showCompareCommand);
        this._commandService.addCommand(replaceAllCommand);
        this._commandService.addCommandGroup("pageActions", "orion.searchActions.unlabeled", 200); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageActions", "orion.globalSearch.hideCompare", 1, "orion.searchActions.unlabeled"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageActions", "orion.globalSearch.showCompare", 2, "orion.searchActions.unlabeled"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageActions", "orion.globalSearch.replaceAll", 3, "orion.searchActions.unlabeled"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

        var showAllCmd = new mCommands.Command({
            name: messages["Show All"],
            tooltip: messages["Show all the results in one page"],
            id: "orion.search.showAll", //$NON-NLS-0$
            hrefCallback: function() {
                if (!this.model._provideSearchHelper) {
                    return null;
                }
                var qParams = mSearchUtils.copySearchParams(this.model._provideSearchHelper().params, true);
				qParams.start = 0;
				qParams.rows = this.model.getPagingParams().totalNumber;
                return mSearchUtils.generateSearchHref(qParams);
            }.bind(this),
            visibleWhen: function(item) {
				var pagingParam = this.model.getPagingParams();
                return ( !this._crawling && pagingParam.totalNumber > pagingParam.rows);
            }.bind(this)
        });
		var previousPage = new mCommands.Command({
            name: messages["< Previous Page"],
            tooltip: messages["Show previous page of search result"],
            id: "orion.search.prevPage", //$NON-NLS-0$
            hrefCallback: function() {
                if (!that.model._provideSearchHelper) {
                    return null;
                }
                var prevPage = that.caculatePrevPage();
                var qParams = mSearchUtils.copySearchParams(that.model._provideSearchHelper().params, true);
                qParams.start = prevPage.start;
                return mSearchUtils.generateSearchHref(qParams);
            },
            visibleWhen: function(item) {
                var prevPage = that.caculatePrevPage();
                return ( !this._crawling && prevPage.start !== that.model.getPagingParams().start);
            }.bind(this)
        });
        var nextPage = new mCommands.Command({
            name: messages["Next Page >"],
            tooltip: messages["Show next page of search result"],
            id: "orion.search.nextPage", //$NON-NLS-0$
            hrefCallback: function() {
                if (!that.model._provideSearchHelper) {
                    return null;
                }
                var nextPage = that.caculateNextPage();
                var qParams = mSearchUtils.copySearchParams(that.model._provideSearchHelper().params, true);
                qParams.start = nextPage.start;
                return mSearchUtils.generateSearchHref(qParams);
            },
            visibleWhen: function(item) {
                var nextPage = that.caculateNextPage();
                return ( !this._crawling && nextPage.start !== that.model.getPagingParams().start);
            }.bind(this)
        });
        var nextResultCommand = new mCommands.Command({
            tooltip: messages["Next result"],
            imageClass: "core-sprite-move-down", //$NON-NLS-0$
            id: "orion.search.nextResult", //$NON-NLS-0$
            groupId: "orion.searchGroup", //$NON-NLS-0$
            visibleWhen: function(item) {
                return !that._reporting;
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
                return !that._reporting;
            },
            callback: function() {
                that.gotoNext(false, true);
            }
        });
        this._commandService.addCommand(showAllCmd);
        this._commandService.addCommand(previousPage);
        this._commandService.addCommand(nextPage);
        this._commandService.addCommand(nextResultCommand);
        this._commandService.addCommand(prevResultCommand);
        mExplorer.createExplorerCommands(this._commandService, function(item) {
			var emptyKeyword = false;
			if(that.model._provideSearchHelper && that.model._provideSearchHelper().params.keyword === ""){
				emptyKeyword = true;
			}
			return !item._reporting && !emptyKeyword;
        });
        // Register command contributions
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.explorer.expandAll", 1); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.explorer.collapseAll", 2); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.search.nextResult", 3); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.search.prevResult", 4); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.search.showAll", 5); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.search.prevPage", 6); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.registerCommandContribution("pageNavigationActions", "orion.search.nextPage", 7); //$NON-NLS-1$ //$NON-NLS-0$
    };

    SearchResultExplorer.prototype._checkStale = function(model) {
        return this.registry.getService("orion.page.progress") //$NON-NLS-0$
            .progress(this.fileClient.read(model.location), "Checing file " + model.location + " for stale") //$NON-NLS-1$ //$NON-NLS-0$
            .then(function(contents) {
            if (this.model.staleCheck(contents)) {
                model.stale = false;
            }
        }.bind(this), function(error) {
            console.error("Error loading file contents: " + error.message); //$NON-NLS-0$
            throw error;
        }.bind(this));
    }; 
    
    SearchResultExplorer.prototype.staleCheck = function(){
        var promises = [];
		_validFiles(this.model).forEach(function(fileItem) {
			promises.push(this._loadFileMetaData(fileItem));
		}.bind(this));
		return Deferred.all(promises, function(error) { return {_error: error}; });
    };
    
    SearchResultExplorer.prototype._loadFileMetaData = function(fileItem) {
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
	            } else {
					this._prepareFilter(fileItem);
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
    
    SearchResultExplorer.prototype.setCrawling = function(crawling) {
        this._crawling = crawling;
    };

    SearchResultExplorer.prototype.preview = function() {
        var that = this;
        this._commandService.openParameterCollector("pageActions", function(parentDiv) { //$NON-NLS-0$
            // create replace text
            var replaceStringDiv = _createElement('input', null, "globalSearchReplaceWith", parentDiv); //$NON-NLS-1$  //$NON-NLS-0$
            replaceStringDiv.type = "text"; //$NON-NLS-0$
            replaceStringDiv.name = "ReplaceWith:"; //$NON-NLS-0$
            replaceStringDiv.placeholder = "Replace With"; //$NON-NLS-0$
            replaceStringDiv.onkeydown = function(e) {
                if (e.keyCode === 13 /*Enter*/ ) {
                    var replaceInputDiv = lib.node("globalSearchReplaceWith"); //$NON-NLS-0$
                    that._commandService.closeParameterCollector();
                    return that._doPreview(replaceInputDiv.value);
                }
                if (e.keyCode === 27 /*ESC*/ ) {
                    that._commandService.closeParameterCollector();
                    return false;
                }
            };

            // create the command span for Replace
            _createElement('span', 'parameters', "globalSearchReplaceCommands", parentDiv); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
            return replaceStringDiv;
        });

        var replaceDiv = document.getElementById("globalSearchReplaceWith"); //$NON-NLS-0$
        replaceDiv.value = this.model.defaultReplaceStr;
        window.setTimeout(function() {
            replaceDiv.select();
            replaceDiv.focus();
        }, 10);


        var innerReplaceAllCommand = new mCommands.Command({
            name: "Preview Changes", //$NON-NLS-0$
            image: require.toUrl("images/replaceAll.gif"), //$NON-NLS-0$
            id: "orion.globalSearch.innerReplaceAll", //$NON-NLS-0$
            groupId: "orion.searchGroup", //$NON-NLS-0$
            callback: function() {
                var replaceInputDiv = lib.node("globalSearchReplaceWith"); //$NON-NLS-0$
                that._commandService.closeParameterCollector();
                return that._doPreview(replaceInputDiv.value);
            }
        });

        this._commandService.addCommand(innerReplaceAllCommand);

        // Register command contributions
        this._commandService.registerCommandContribution("globalSearchReplaceCommands", "orion.globalSearch.innerReplaceAll", 1); //$NON-NLS-1$ //$NON-NLS-0$
        this._commandService.renderCommands("globalSearchReplaceCommands", "globalSearchReplaceCommands", this, this, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
    };

    SearchResultExplorer.prototype._fileExpanded = function(fileIndex, detailIndex) {
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

    SearchResultExplorer.prototype._doPreview = function(replacingStr, all) {
        if (!this.model._provideSearchHelper) {
            return;
        }
        if (this.model._storeGlobalStatus) {
            this.model._storeGlobalStatus(replacingStr);
        }
        var qParams = mSearchUtils.copySearchParams(this.model._provideSearchHelper().params, true);
        qParams.replace = replacingStr;
        if (all) {
            qParams.start = 0;
            qParams.rows = this.model.getPagingParams().totalNumber;
        }
        var href = mSearchUtils.generateSearchHref(qParams);
        window.location.href = href;
    };

    SearchResultExplorer.prototype.searchAgain = function() {
        if (!this.model._provideSearchHelper) {
            return;
        }
        var qParams = mSearchUtils.copySearchParams(this.model._provideSearchHelper().params, true);
        qParams.replace = null;
        if (qParams.rows > this.defaulRows) {
            qParams.rows = this.defaulRows;
        }
        var href = mSearchUtils.generateSearchHref(qParams);
        if (href === window.location.href) {
            window.location.reload();
        } else {
            window.location.href = href;
        }
    };

    SearchResultExplorer.prototype.replaceAll = function() {
        var reportList = [];
        var that = this;
        this._reporting = true;
        this.initCommands();
        this.reportStatus(messages["Writing files..."]);
        this.model.writeReplacedContents(reportList).then(function(modellist) {
            _empty(that.getParentDivId());
            var reporter = new SearchReportExplorer(that.getParentDivId(), reportList, that.model);
            reporter.report();
            that.reportStatus("");
        });
    };

    SearchResultExplorer.prototype.toggleCompare = function(show) {
        this.replacePreview(false, show);
    };

    SearchResultExplorer.prototype.replacePreview = function(init, comparing) {
        _empty(this.getParentDivId());
        if (comparing) {
            this._uiFactory = new mSearchFeatures.SearchUIFactory({
                parentDivID: this.getParentDivId()
            });
            this._uiFactory.buildUI();
            this.twoWayCompareView = null;
            this._currentPreviewModel = null;
        } else {
            if (this._uiFactory) {
                this._uiFactory.destroy();
            }
            this._uiFactory = null;
            this.twoWayCompareView = null;
            this._currentPreviewModel = null;
        }
        this.initCommands();
        if (init) {
            this.reportStatus(messages["Preparing preview..."]);
        }
        var that = this;
        this.createTree(this._uiFactory ? this._uiFactory.getMatchDivID() : this.getParentDivId(), this.model, {
            selectionPolicy: "singleSelection", //$NON-NLS-0$
            indent: 0,
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

    SearchResultExplorer.prototype.getItemChecked = function(item) {
        if (item.checked === undefined) {
            item.checked = true;
        }
        return item.checked;
    };

    SearchResultExplorer.prototype._checkedItem = function() {
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

    SearchResultExplorer.prototype.onRowChecked = function(rowId, checked, manually) {
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

    SearchResultExplorer.prototype.onNewContentChanged = function(fileItem) {
        if (fileItem === _getFileModel(this.getNavHandler().currentModel())) {
            this.buildPreview(true);
        }
    };

    SearchResultExplorer.prototype.onItemChecked = function(item, checked, manually) {
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

    SearchResultExplorer.prototype.buildPreview = function(updating) {
        if (!this._uiFactory) {
            return;
        }
        if (_validFiles(this.model).length === 0) {
            return;
        }
        var uiFactory = this._uiFactory;
        var fileItem = _getFileModel(this.getNavHandler().currentModel());
        this._currentPreviewModel = fileItem;
        var that = this;
        this.model.provideFileContent(fileItem, function(fileItem) {
            if (that.model.onMatchNumberChanged) {
                that.model.onMatchNumberChanged(fileItem);
            }
			that.model.getReplacedFileContent(that._currentReplacedContents, updating, fileItem);
			var replacedContents = that._currentReplacedContents.contents;
			if(Array.isArray(replacedContents)){
				replacedContents = that._currentReplacedContents.contents.join(that._currentReplacedContents.lineDelim);
			}
            // Diff operations
            var fileName = that.model.getFileName(fileItem);
            var fType = that._contentTypeService.getFilenameContentType(fileName);
            var options = {
                readonly: true,
                hasConflicts: false,
                newFileOnRight: true,
                oldFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: that.model.getFileContents(fileItem)
                },
                newFile: {
                    Name: fileItem.location,
                    Type: fType,
                    Content: replacedContents
                }
            };
            if (!that.twoWayCompareView) {
                that.uiFactoryCompare = new mCompareUIFactory.TwoWayCompareUIFactory({
                    parentDivID: uiFactory.getCompareDivID(),
                    showTitle: true,
                    rightTitle: i18nUtil.formatMessage(messages["Replaced File (${0})"], fileName),
                    leftTitle: i18nUtil.formatMessage(messages["Original File (${0})"], fileName),
                    showLineStatus: false
                });
                that.uiFactoryCompare.buildUI();
                options.uiFactory = that.uiFactoryCompare;
                options.parentDivID =  uiFactory.getCompareDivID();
                that.twoWayCompareView = new mCompareView.TwoWayCompareView(options);
				that.twoWayCompareView.setOptions({highlighters: [new CompareStyler(that.registry), new CompareStyler(that.registry)]});
                that.twoWayCompareView.startup();
                that._uiFactory.setCompareWidget(that.twoWayCompareView);
            } else {
                that.twoWayCompareView.setOptions(options);
                that.twoWayCompareView.refresh(true);
            }
             _empty(that.uiFactoryCompare.getTitleDiv());
            _place(document.createTextNode(i18nUtil.formatMessage(messages['Replaced File (${0})'], fileName)), that.uiFactoryCompare.getTitleDiv(), "only"); //$NON-NLS-1$ //$NON-NLS-0$
            _empty(that.uiFactoryCompare.getTitleDiv(true));
            _place(document.createTextNode(i18nUtil.formatMessage(messages['Original File (${0})'], fileName)), that.uiFactoryCompare.getTitleDiv(true), "only"); //$NON-NLS-1$ //$NON-NLS-0$
           window.setTimeout(function() {
                that.renderer.focus();
            }, 100);
        });
    };
    
    SearchResultExplorer.prototype.caculateNextPage = function() {
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

    SearchResultExplorer.prototype.caculatePrevPage = function() {
        var pagingParams = this.model.getPagingParams();
        var start = pagingParams.start - pagingParams.rows;
        if (start < 0) {
            start = 0;
        }
        return {
            start: start
        };
    };

    SearchResultExplorer.prototype.initCommands = function() {
        var that = this;
        this._commandService.destroy("pageActions"); //$NON-NLS-0$
        this._commandService.renderCommands("pageActions", "pageActions", that, that, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

        this._commandService.destroy("pageNavigationActions"); //$NON-NLS-0$
        this._commandService.renderCommands("pageNavigationActions", "pageNavigationActions", that, that, "button"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
    };

    SearchResultExplorer.prototype.reportStatus = function(message) {
        this.registry.getService("orion.page.message").setProgressMessage(message); //$NON-NLS-0$
    };

    SearchResultExplorer.prototype.isExpanded = function(model) {
        return this.myTree.isExpanded(this.model.getId(model));
    };

    SearchResultExplorer.prototype.popupContext = function(model) {
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
        //toolTipContent.classList.add("parameterPopup"); //$NON-NLS-0$
        toolTipContent.appendChild(tableNode);
        this.contextTip.show();
    };

    SearchResultExplorer.prototype.closeContextTip = function(remainFlag) {
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

    SearchResultExplorer.prototype.onCollapse = function(model) {
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

    SearchResultExplorer.prototype.onExpand = function(modelToExpand, childPosition, callback) {
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

    SearchResultExplorer.prototype.forceExpandFunc = function(modelToExpand, childPosition, callback) {
        this.myTree.expand(modelToExpand, function() {
            this.onExpand(modelToExpand, childPosition, callback);
        }.bind(this));
        return null;
    };

    //Provide the key listening div.If not provided this._myTree._parent will be used.
    SearchResultExplorer.prototype.keyEventListeningDiv = function(secondLevel) {
        return lib.node(this.getParentDivId(secondLevel));

    };

    SearchResultExplorer.prototype.onFocus = function(focus) {
        if (!focus) {
            this.closeContextTip();
        }
    };

    SearchResultExplorer.prototype.preventDefaultFunc = function(e, model) {
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

    SearchResultExplorer.prototype.onReplaceCursorChanged = function(prevModel, currentModel) {
        if (!_onSameFile(this._currentPreviewModel, currentModel)) {
            this.buildPreview();
        }
        if (currentModel.type === "detail") { //$NON-NLS-0$
			//TODO:This has to be removed but not quite sure why it was there
			/*
			if (!currentModel.newMatches) {
			    that.renderer.focus();
			    return;
			}*/
            var detailInfo = this.model.getDetailInfo(currentModel);
            this.twoWayCompareView.gotoDiff(detailInfo.lineNumber, detailInfo.matches[detailInfo.matchNumber].startIndex, false);
        }
    };

    SearchResultExplorer.prototype.onCursorChanged = function(prevModel, currentModel) {
        this.renderer.replaceDetailIcon(prevModel, "none"); //$NON-NLS-0$
        if (this.model.storeLocationStatus) {
            this.model.storeLocationStatus(currentModel);
        }
        var that = this;
        if (this.model.replaceMode()) {
            if (!this._uiFactory) {
                return;
            }
            if (!this._timer) {
                this._timer = window.setTimeout(function() {
                    that.onReplaceCursorChanged(prevModel, currentModel);
                    that.timerRunning = false;
                    that._timer = null;
                }, 500);
            } else if (this.timerRunning) {
                window.clearTimeOut(this._timer);
                this._timer = window.setTimeout(function() {
                    that.onReplaceCursorChanged(prevModel, currentModel);
                    that.timerRunning = false;
                    that._timer = null;
                }, 500);
            }
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

    SearchResultExplorer.prototype._prepareFilter = function(fileItem) {
		if(!this._validateFilter()){
			return;
		}
		if(fileItem) {
			this.model.getChildren(fileItem, function(item){});
		} else {
			_validFiles(this.model).forEach(function(fileItem) {
				this.model.getChildren(fileItem, function(item){});
			}.bind(this));
		}
	};
	
    SearchResultExplorer.prototype._validateFilter = function() {
		return (!this.model.replaceMode() && typeof this.model.filterOn === "function"); //$NON-NLS-0$
    };
    
    SearchResultExplorer.prototype._startUp = function() {
		var filterBox = _empty("filterBox");
		var pagingParams = this.model.getPagingParams();
		if(this.model._provideSearchHelper){
			window.document.title = this.model._provideSearchHelper().displayedSearchTerm + " - " +  i18nUtil.formatMessage(messages["${0} matches"], pagingParams.totalNumber);//$NON-NLS-0$
		}
		if (pagingParams.numberOnPage === 0) {
	        if(filterBox){
				filterBox.style.visibility = "hidden"; //$NON-NLS-0$
	        }
			var message = messages["No matches"];
			if(this.model._provideSearchHelper){
				message = i18nUtil.formatMessage(messages["No matches found for ${0}"], this.model._provideSearchHelper().displayedSearchTerm);
			}
		    this.parentNode.textContent = "";
		    var textBold = _createElement('b', null, null, this.parentNode); //$NON-NLS-1$ //$NON-NLS-0$
		    _place(document.createTextNode(message), textBold, "only"); //$NON-NLS-0$
            this.reportStatus("");
		    return;
		} 
        var that = this;
        if(filterBox && this._validateFilter()){
			filterBox.style.visibility = "visible"; //$NON-NLS-0$
			var filterInput = _createElement('input', ["search-control", "search-filter-input"], null, filterBox); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			filterInput.type = "text";//$NON-NLS-0$
			filterInput.placeholder = messages["Type filter text"];
			filterInput.addEventListener("input", function(e) {//$NON-NLS-0$
				if(this._filterTimer){
					window.clearTimeout(this._filterTimer);
				}
				var explorer = this;
				this._filterTimer = window.setTimeout(function(){
					this._filterTimer = null;
					this._renderFiltered(filterInput.value);
				}.bind(explorer), 1000);
			}.bind(this));
         }
        
        this.model.buildResultModel();
        if (!this.model.replaceMode()) {
            this.initCommands();
            _empty(this.getParentDivId());
            this.createTree(this.getParentDivId(), this.model, {
                selectionPolicy: "singleSelection", //$NON-NLS-0$
                indent: 0,
				getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
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
            } else {
				that._prepareFilter();
            }
        } else {
            that.replacePreview(true, true);
        }
    };

    SearchResultExplorer.prototype.startUp = function() {
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

    SearchResultExplorer.prototype._incrementalRender = function() {
        var that = this;
        this.model.buildResultModel();
        this.createTree(this.getParentDivId(), this.model, {
            selectionPolicy: "singleSelection", //$NON-NLS-0$
            getChildrenFunc: function(model) {return this.model.getFilteredChildren(model);}.bind(this),
            indent: 0,
            onCollapse: function(model) {
                that.onCollapse(model);
            }
        });
    };

    SearchResultExplorer.prototype.incrementalRender = function() {
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

    SearchResultExplorer.prototype._renderFiltered = function(filterText) {
        this.model.filterOn(filterText);
        this.createTree(this.getParentDivId(), this.model, {
            selectionPolicy: "singleSelection", //$NON-NLS-0$
            indent: 0,
            onCollapse: function(model) {
                this.onCollapse(model);
            }.bind(this)
        });
        if(filterText) {
			this.expandAll();
        }
    };

    SearchResultExplorer.prototype.refreshValidFiles = function() {
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
    SearchResultExplorer.prototype.getItemCount = function() {
        return this.model.getListRoot().children.length;
    };

    SearchResultExplorer.prototype.getParentDivId = function(secondLevel) {
        if (!this.model.replaceMode() || !secondLevel) {
            return this.parentNode.id;
        } else {
            return this._uiFactory ? this._uiFactory.getMatchDivID() : this.parentNode.id;
        }
    };

    SearchResultExplorer.prototype.gotoCurrent = function(cachedItem) {
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
        this.getNavHandler().cursorOn(modelToExpand, true);
        if (modelToExpand && detailIndex && detailIndex !== "none") { //$NON-NLS-0$
            this.myTree.expand(modelToExpand, function() {
                this.onExpand(modelToExpand, detailIndex);
            }.bind(this));
        }
    };

    SearchResultExplorer.prototype.gotoNext = function(next, forceExpand) {
        if (_validFiles(this.model).length === 0) {
            return;
        }
        this.getNavHandler().iterate(next, forceExpand);
    };

    SearchResultExplorer.prototype.constructor = SearchResultExplorer;

    //return module exports
    return {
        SearchResultExplorer: SearchResultExplorer
    };
});
