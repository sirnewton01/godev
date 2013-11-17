/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global define window */

define(['i18n!orion/nls/messages', 'require', 'orion/regex', 'orion/commandRegistry', 'orion/PageUtil', 'orion/URITemplate'], function(messages, require, mRegex, mCommands, PageUtil, URITemplate) {

/**
 * @name orion.searchUtils.SearchParams
 * @class
 * @property {String} fileType
 * @property {String} keyword
 * @property {Boolean} regEx
 * @property {Boolean} nameSearch
 * @property {Boolean} caseSensitive
 */

/**
 * @namespace Search utility functions.
 * @name orion.searchUtils
 */
var searchUtils = {};

searchUtils.ALL_FILE_TYPE = "*.*"; //$NON-NLS-0$

function _generateSearchHelperRegEx(inFileQuery, searchParams, fromStart){
	var prefix = "";
	if(fromStart){
		prefix = "^"; //$NON-NLS-0$
	}
	var regexp = mRegex.parse("/" + prefix + inFileQuery.searchStr + "/"); //$NON-NLS-1$ //$NON-NLS-0$
	if (regexp) {
		var pattern = regexp.pattern;
		var flags = regexp.flags;
		if(flags.indexOf("i") === -1 && !searchParams.caseSensitive){ //$NON-NLS-0$ 
			//If the regEx flag does not include 'i' then we have to add it by searchParams.caseSensitive
			flags = flags + "i";//$NON-NLS-0$
		}
		inFileQuery.regExp = {pattern: pattern, flags: flags};
		inFileQuery.wildCard = true;
	}
}

searchUtils.doSearch = function(searcher, serviceRegistry, searchStr, advOptions){
	if (searcher) {
		var newSearchStr = searchStr, commitSearch = true;
		if(newSearchStr === "*"){ //$NON-NLS-0$
			newSearchStr = "";
		}
		if(newSearchStr === ""){
			commitSearch = advOptions && advOptions.type !== searchUtils.ALL_FILE_TYPE;
		}
		if (commitSearch) {
			if(newSearchStr !== ""){
				searchUtils.addRecentSearch(serviceRegistry, newSearchStr, advOptions ? advOptions.regEx: false);
			}
			var searchParams = searcher.createSearchParams(newSearchStr, false, false, advOptions);
			var href = searchUtils.generateSearchHref(searchParams);
			searchUtils.getOpenSearchPref(serviceRegistry, function(openInNewTab){
				if(openInNewTab){
					window.open(href);
				} else {
					window.location = href;
				}
			});
		}
	} else {
		window.alert(messages["Can't search: no search service is available"]);
	}
};

/**
 * Generate a helper query object used for search result renderer.
 * @param {orion.searchUtils.SearchParams} searchParams The search parameters.
 * @param {Boolean} fromStart True if doing file name search, otherwise false.
 * @returns {Object} An object having the properties:<ul>
 * <li><code>{@link orion.searchUtils.SearchParams}</code> <code>params</code> The search parameters.</li>
 * <li><code>{@link Object}</code> <code>inFileQuery</code> The query object for in file search.</li>
 * <li><code>{@link String}</code> <code>displayedSearchTerm</code> The search term display string.</li>
 * </ul>
 * @name orion.searchUtils.generateSearchHelper
 * @function
 */
searchUtils.generateSearchHelper = function(searchParams, fromStart) {
	var searchStr = searchParams.keyword;
	var displayedSearchTerm = searchStr;
	var inFileQuery = {};
	if(searchParams.fileType && searchParams.fileType !== searchUtils.ALL_FILE_TYPE && searchStr === ""){
		displayedSearchTerm = "*." + searchParams.fileType; //$NON-NLS-0$
	}
	if(!searchParams.regEx){
		var hasStar = (searchStr.indexOf("*") > -1); //$NON-NLS-0$
		var hasQMark = (searchStr.indexOf("?") > -1); //$NON-NLS-0$
		if(hasStar){
			searchStr = searchStr.split("*").join(".*"); //$NON-NLS-1$ //$NON-NLS-0$
		}
		if(hasQMark){
			searchStr = searchStr.split("?").join("."); //$NON-NLS-1$ //$NON-NLS-0$
		}
		if(!hasStar && !hasQMark && !searchParams.nameSearch){
			inFileQuery.searchStr = searchParams.caseSensitive ? searchStr.split("\\").join("") : searchStr.split("\\").join("").toLowerCase(); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			inFileQuery.wildCard = false;
		} else {
			inFileQuery.searchStr = searchParams.caseSensitive ? searchStr : searchStr.toLowerCase();
			_generateSearchHelperRegEx(inFileQuery, searchParams, fromStart);
			inFileQuery.wildCard = true;
		}
	} else {
		inFileQuery.searchStr =searchStr;
		_generateSearchHelperRegEx(inFileQuery, searchParams, fromStart);
	}
	inFileQuery.searchStrLength = inFileQuery.searchStr.length;
	return {params: searchParams, inFileQuery: inFileQuery, displayedSearchTerm: displayedSearchTerm};
};

searchUtils.convertSearchParams = function(searchParams) {
	if(searchParams.rows !== undefined){
		searchParams.rows = parseInt(searchParams.rows, 10);
	}
	if(searchParams.start !== undefined){
		searchParams.start = parseInt(searchParams.start, 10);
	}
	if(typeof searchParams.regEx === "string"){ //$NON-NLS-0$
		searchParams.regEx = (searchParams.regEx.toLowerCase() === "true"); //$NON-NLS-0$
	}
	if(typeof searchParams.caseSensitive === "string"){ //$NON-NLS-0$
		searchParams.caseSensitive = (searchParams.caseSensitive.toLowerCase() === "true"); //$NON-NLS-0$
	}
	if(typeof searchParams.nameSearch === "string"){ //$NON-NLS-0$
		searchParams.nameSearch = (searchParams.nameSearch.toLowerCase() === "true"); //$NON-NLS-0$
	}
};

searchUtils.copySearchParams = function(searchParams, copyReplace) {
	var result = {};
	for (var prop in searchParams) {
		if(searchParams[prop] !== undefined && searchParams[prop] !== null){
			if(!copyReplace && prop === "replace") { //$NON-NLS-0$
				continue;
			}
			result[prop] = searchParams[prop];
		}
	}
	return result;	
};

searchUtils.generateSearchHref = function(options) {
	var base =  require.toUrl("search/search.html"); //$NON-NLS-0$
	var sParams = searchUtils.copySearchParams(options, true);
	var searchLocation = sParams.resource;
	sParams.resource = undefined;
	var href;
	if(typeof sParams.keyword !== "undefined"){ //$NON-NLS-0$
		href = new URITemplate(base + "#{,resource,params*}").expand({ //$NON-NLS-0$
			resource: searchLocation,
			params: sParams
		});
	} else {
		href = new URITemplate(base + "#{,resource}").expand({ //$NON-NLS-0$
			resource: searchLocation
		});
	}
	return href;
};

searchUtils.generateFindURLBinding = function(searchParams, inFileQuery, lineNumber, replaceStr, paramOnly) {
	var params = {
		find: inFileQuery.searchStr,
		regEx: inFileQuery.wildCard ? true : undefined,
		caseSensitive: searchParams.caseSensitive ? true : undefined,
		replaceWith: typeof(replaceStr) === "string" ? replaceStr : undefined, //$NON-NLS-0$
		atLine: typeof(lineNumber) === "number" ? lineNumber : undefined //$NON-NLS-0$
	};
	if(paramOnly){
		return params;
	}
	var binding = new URITemplate("{,params*}").expand({ //$NON-NLS-0$
		params: params
	});
	return "," + binding; //$NON-NLS-0$
};

searchUtils.convertFindURLBinding = function(findParams) {
	if(typeof findParams.regEx === "string"){ //$NON-NLS-0$
		findParams.regEx = (findParams.regEx.toLowerCase() === "true"); //$NON-NLS-0$
	}
	if(typeof findParams.caseSensitive === "string"){ //$NON-NLS-0$
		findParams.caseSensitive = (findParams.caseSensitive.toLowerCase() === "true"); //$NON-NLS-0$
	}
	if(typeof findParams.atLine === "string"){ //$NON-NLS-0$
		findParams.atLine = parseInt(findParams.atLine, 10);
	}
};

searchUtils.replaceRegEx = function(text, regEx, replacingStr){
	var regexp = new RegExp(regEx.pattern, regEx.flags);
	return text.replace(regexp, replacingStr); 
	
};

searchUtils.replaceStringLiteral = function(text, keyword, replacingStr){
	var regexp = mRegex.parse("/" + keyword + "/gim"); //$NON-NLS-1$ //$NON-NLS-0$
	return searchUtils.replaceRegEx(text,regexp, replacingStr);
};

searchUtils.searchOnelineLiteral =  function(inFileQuery, lineString, onlyOnce){
	var i,startIndex = 0;
	var found = false;
	var result = [];
	while(true){
		i = lineString.indexOf(inFileQuery.searchStr, startIndex);
		if (i < 0) {
			break;
		} else {
			result.push({startIndex: i, length: inFileQuery.searchStrLength});
			found = true;
			if(onlyOnce){
				break;
			}
			startIndex = i + inFileQuery.searchStrLength;
		}
	}
	if(found) {
		return result;
	}
	return null;
	
};

/**
 * Helper for finding regex matches in text contents.
 *
 * @param {String}
 *            text Text to search in.
 * @param {String}
 *            pattern A valid regexp pattern.
 * @param {String}
 *            flags Valid regexp flags. Allowed flags are: <code>"i"</code>, <code>"s"</code>, and any combination thereof.
 * @param {Number}
 *            [startIndex] Index to begin searching from.
 * @return {Object} An object giving the match details, or
 *         <code>null</code> if no match found. The
 *         returned object will have the properties:<br />
 *         <code>{Number} index</code><br />
 *         <code>{Number} length</code>
 * @name orion.searchUtils.findRegExp
 * @function
 */
searchUtils.findRegExp =  function(text, pattern, flags, startIndex) {
	if (!pattern) {
		return null;
	}
	flags = flags || "";
	// 'g' makes exec() iterate all matches, 'm' makes ^$
	// work linewise
	flags += (flags.indexOf("g") === -1 ? "g" : "") + //$NON-NLS-1$ //$NON-NLS-0$
			(flags.indexOf("m") === -1 ? "m" : ""); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var regexp = new RegExp(pattern, flags);
	var result = null;
	result = regexp.exec(text.substring(startIndex));
	return result && {
		startIndex: result.index + startIndex,
		length: result[0].length
	};
};

searchUtils.searchOnelineRegEx =  function(inFileQuery, lineString, onlyOnce){
	var startIndex = 0;
	var found = false;
	var result = [];
	while(true){
		var regExResult = searchUtils.findRegExp(lineString, inFileQuery.regExp.pattern, inFileQuery.regExp.flags, startIndex);
		if(regExResult){
			result.push(regExResult);
			found = true;
			if(onlyOnce){
				break;
			}
			startIndex = regExResult.startIndex + regExResult.length;
		} else {
			break;
		}
	}
	if(found) {
		return result;
	}
	return null;
};

searchUtils.generateNewContents = function( updating, oldContents, newContents, fileModelNode, replaceStr, searchStrLength){
	if(fileModelNode && oldContents){
		if(!updating){
			newContents.contents = [];
		}
		for(var i = 0; i < oldContents.length ; i++){
			var lineStringOrigin = oldContents[i];
			var changingLine = false;
			var checked = false;
			var fullChecked = false;
			var checkedMatches = [];
			var originalMatches;
			var k, startNumber = 0;
			for(var j = 0; j < fileModelNode.children.length; j++){
				var lnumber = fileModelNode.children[j].lineNumber - 1;
				if(lnumber === i){
					startNumber = j;
					for(k = 0; k < fileModelNode.children[j].matches.length; k++ ){
						if(fileModelNode.children[j+k].checked !== false){
							checkedMatches.push(k);
						}
					}
					checked = (checkedMatches.length > 0);
					fullChecked = (checkedMatches.length === fileModelNode.children[j].matches.length);
					originalMatches = fileModelNode.children[j].matches; 
					changingLine = true;
					break;
				}
			}
			if(changingLine){
				var newStr;
				if(!checked){
					newStr = lineStringOrigin;
					for(k = 0; k < fileModelNode.children[startNumber].matches.length; k++ ){
						fileModelNode.children[startNumber+k].newMatches = fileModelNode.children[startNumber+k].matches;
					}
				} else{
					var result =  searchUtils.replaceCheckedMatches(lineStringOrigin, replaceStr, originalMatches, checkedMatches, searchStrLength);
					newStr = result.replacedStr;
					for(k = 0; k < fileModelNode.children[startNumber].matches.length; k++ ){
						fileModelNode.children[startNumber+k].newMatches = result.newMatches;
					}
				}
				if(updating){
					newContents.contents[i] = newStr;
				} else {
					newContents.contents.push(newStr);
				}
			} else if(!updating){
				newContents.contents.push(lineStringOrigin);
			}
		}
	}
};

searchUtils.generateMatchContext = function(contextAroundLength, fileContents, lineNumber/*zero based*/){
	var context = [];
	var totalContextLength = contextAroundLength*2 + 1;
	var startFrom, endTo;
	if(fileContents.length <= totalContextLength){
		startFrom = 0;
		endTo = fileContents.length -1;
	} else {
		startFrom = lineNumber - contextAroundLength;
		if(startFrom < 0){
			startFrom = 0;
			endTo = startFrom + totalContextLength - 1;
		} else {
			endTo = lineNumber + contextAroundLength;
			if(endTo > (fileContents.length -1)){
				endTo = fileContents.length -1;
				startFrom = endTo - totalContextLength + 1;
			}
			
		}
	}
	for(var i = startFrom; i <= endTo; i++){
		context.push({context: fileContents[i], current: (i === lineNumber)});
	}
	return context;
};

/**
 * Split file contents into lines. It also handles the mixed line endings with "\n", "\r" and "\r\n".
 *
 * @param {String} text The file contents.
 * @returns {String[]} Split file lines. 
 * @name orion.searchUtils.splitFile
 * @function
 */
searchUtils.splitFile = function(text) {
	var cr = 0, lf = 0, index = 0, start = 0;
	var splitLines = [];
	while (true) {
		if (cr !== -1 && cr <= index) { 
			cr = text.indexOf("\r", index);  //$NON-NLS-0$
		}
		if (lf !== -1 && lf <= index) { 
			lf = text.indexOf("\n", index);  //$NON-NLS-0$
		}
		if (lf === -1 && cr === -1) {
			splitLines.push(text.substring(start));
			break; 
		}
		var offset = 1;
		if (cr !== -1 && lf !== -1) {
			if (cr + 1 === lf) {
				offset = 2;
				index = lf + 1;
			} else {
				index = (cr < lf ? cr : lf) + 1;
			}
		} else if (cr !== -1) {
			index = cr + 1;
		} else {
			index = lf + 1;
		}
		splitLines.push(text.substring(start, index - offset));
		start = index;
	}
	return splitLines;
};

searchUtils.searchWithinFile = function( inFileQuery, fileModelNode, fileContentText, lineDelim, replacing, caseSensitive){
	var fileContents = searchUtils.splitFile(fileContentText);
	if(replacing){
		fileModelNode.contents = fileContents;
	}
	if(fileModelNode){
		fileModelNode.children = [];
		var totalMatches = 0;
		for(var i = 0; i < fileContents.length ; i++){
			var lineStringOrigin = fileContents[i];
			if(lineStringOrigin && lineStringOrigin.length > 0){
				var lineString = caseSensitive ? lineStringOrigin : lineStringOrigin.toLowerCase();
				var result;
				if(inFileQuery.wildCard){
					result = searchUtils.searchOnelineRegEx(inFileQuery, lineString);
				} else {
					result = searchUtils.searchOnelineLiteral(inFileQuery, lineString);
				}
				if(result){
					var detailNode, lineNumber = i+1;
					if(!replacing){
						detailNode = {parent: fileModelNode, context: searchUtils.generateMatchContext(2, fileContents, i), checked: fileModelNode.checked, 
										  type: "detail", matches: result, lineNumber: lineNumber, name: lineStringOrigin, //$NON-NLS-0$ 
										  location: fileModelNode.location + "-" + lineNumber}; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						fileModelNode.children.push(detailNode);
					} else {
						for(var j = 0; j < result.length; j++){
							var matchNumber = j+1;
							detailNode = {parent: fileModelNode, checked: fileModelNode.checked, type: "detail", matches: result, lineNumber: lineNumber, matchNumber: matchNumber, name: lineStringOrigin, location: fileModelNode.location + "-" + lineNumber + "-" + matchNumber}; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							fileModelNode.children.push(detailNode);
						}
					}
					totalMatches += result.length;
				}
			}
		}
		fileModelNode.totalMatches = totalMatches;
	}
};

searchUtils.replaceCheckedMatches = function(text, replacingStr, originalMatches, checkedMatches, defaultMatchLength){
	var gap = defaultMatchLength;
	var startIndex = 0;
	var replacedStr = "";
	var newMatches = [];
	for(var i = 0; i < originalMatches.length; i++){
		if(startIndex !== originalMatches[i].startIndex){
			replacedStr = replacedStr + text.substring(startIndex, originalMatches[i].startIndex);
		}
		if(originalMatches[i].length){
			gap = originalMatches[i].length;
		}
		var needReplace = false;
		for (var j = 0; j < checkedMatches.length; j++){
			if(checkedMatches[j] === i){
				needReplace = true;
				break;
			}
		}
		if(needReplace){
			newMatches.push({startIndex: replacedStr.length, length: replacingStr.length});
			replacedStr = replacedStr + replacingStr;
		} else {
			newMatches.push({startIndex: replacedStr.length, length: gap});
			replacedStr = replacedStr + text.substring(originalMatches[i].startIndex, originalMatches[i].startIndex + gap);
		}
		startIndex = originalMatches[i].startIndex + gap;
	}
	if(startIndex < text.length){
		replacedStr = replacedStr + text.substring(startIndex);
	}
	return {replacedStr: replacedStr, newMatches: newMatches};
};

searchUtils.fullPathNameByMeta = function(parents){
	var parentIndex = parents.length;
	var fullPath = "";
	//add parents chain top down if needed
	if(parentIndex > 0){
		for(var j = parentIndex - 1; j > -1; j--){
			var separator = (fullPath === "") ? "" : "/"; //$NON-NLS-1$ //$NON-NLS-0$
			fullPath = fullPath + separator + parents[j].Name;
		}
	}
	return fullPath;
};

searchUtils.path2FolderName = function(filePath, fileName, keepTailSlash){
	var tail = keepTailSlash ? 0: 1;
	return filePath.substring(0, filePath.length-fileName.length-tail);
};

var MAX_RECENT_SEARCH_NUMBER = 20;

searchUtils._storeRecentSearch = function(serviceRegistry, searches, eventTarget){
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		prefs.put("recentSearch", searches); //$NON-NLS-0$
		if(eventTarget) {
			window.setTimeout(function() {
				eventTarget.dispatchEvent({type:"recentSearchesChanged"}); //$NON-NLS-0$
			}.bind(this), 20);
		}
	});
};

searchUtils.addRecentSearch = function(serviceRegistry, searchName, useRegEx){
	if(typeof searchName !== "string" || !searchName ){ //$NON-NLS-0$
		return;
	}
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		var i;
		var searches = prefs.get("recentSearch"); //$NON-NLS-0$
		if (typeof searches === "string") { //$NON-NLS-0$
			searches = JSON.parse(searches);
		}
		if (searches) {
			for (i in searches) {
				if (searches[i].name === searchName) {
					return;
				}
			}
			if(searches.length >= MAX_RECENT_SEARCH_NUMBER){
				var len = searches.length;
				searches.splice(MAX_RECENT_SEARCH_NUMBER-1, len-MAX_RECENT_SEARCH_NUMBER+1);
			}
		} else {
			searches = [];
		}
		searches.splice(0,0,{ "name": searchName, "regEx": useRegEx});//$NON-NLS-1$ //$NON-NLS-0$
		searchUtils._storeRecentSearch(serviceRegistry, searches);
		//prefs.put("recentSearch", searches); //$NON-NLS-0$
	});
};

searchUtils.removeRecentSearch = function(serviceRegistry, searchName, eventTarget){
	if(typeof searchName !== "string" || !searchName ){ //$NON-NLS-0$
		return;
	}
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		var i;
		var searches = prefs.get("recentSearch"); //$NON-NLS-0$
		if (typeof searches === "string") { //$NON-NLS-0$
			searches = JSON.parse(searches);
		}
		if (searches) {
			for (i in searches) {
				if (searches[i].name === searchName) {
					searches.splice(i, 1);
					searchUtils._storeRecentSearch(serviceRegistry, searches, eventTarget);
					break;
				}
			}
		}
	});
};

searchUtils.getSearches = function(serviceRegistry, type, callback){
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		var searches = prefs.get(type); //$NON-NLS-0$
		if (typeof searches === "string") { //$NON-NLS-0$
			searches = JSON.parse(searches);
		}
		if (searches && callback) {
			callback(searches);
		}
	});
};

searchUtils.getMixedSearches = function(serviceRegistry, mixed, checkDuplication, callback){
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		var searches = prefs.get("recentSearch"); //$NON-NLS-0$
		if (typeof searches === "string") { //$NON-NLS-0$
			searches = JSON.parse(searches);
		}
		if(mixed){
			var savedSearches = prefs.get("search"); //$NON-NLS-0$
			if (typeof savedSearches === "string") { //$NON-NLS-0$
				savedSearches = JSON.parse(savedSearches);
			}
			if(savedSearches){
				savedSearches.forEach(function(savedSearch) {
					if(checkDuplication){
						var qObj = searchUtils.parseQueryStr(savedSearch.query);
						var duplicated = searches.some(function(search) {
								return qObj.searchStrTitle === search.name;
						});
						if(!duplicated){
							searches.push({"name": qObj.searchStrTitle, "label": savedSearch.name}); //$NON-NLS-1$ //$NON-NLS-0$
						}
					} else {
						searches.push({"name": null, "label": savedSearch.name, value: savedSearch.query}); //$NON-NLS-1$ //$NON-NLS-0$
					}
				});
			}
		}
		if (searches && callback) {
			callback(searches);
		}
	});
};

searchUtils.getOpenSearchPref = function(serviceRegistry, callback){
	serviceRegistry.getService("orion.core.preference").getPreferences("/cm/configurations").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		var properties = prefs.get("nav.config"); //$NON-NLS-0$
		var openInNewTab;
		if (properties && properties["links.newtab"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
			openInNewTab = properties["links.newtab"] ? true : false; //$NON-NLS-0$ 
		} else {
			openInNewTab = false;
		}
		callback(openInNewTab);
	});
};

searchUtils.setOpenSearchPref = function(serviceRegistry, openInNewTab){
	serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
		prefs.put("openSearchPref", {"openInNewTab": openInNewTab}); //$NON-NLS-1$ //$NON-NLS-0$
	});
};

return searchUtils;
});
