/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2014 IBM Corporation and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: 
 *	IBM Corporation - initial API and implementation
 *	Adrian Aichner - regular expression capture group support in replace
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!orion/search/nls/messages', 
	'orion/editor/find', 'orion/commands', 
	'orion/objects',
	'orion/inputCompletion/inputCompletion', 
	'orion/webui/littlelib' ], 
	function(messages, mFind, mCommands, objects, mInputCompletion, lib){
	
	var MAX_RECENT_FIND_NUMBER = 30;
	function TextSearcher(editor, serviceRegistry, cmdservice, undoStack, options) {
		mFind.Find.call(this, editor, undoStack, options);
		this._serviceRegistry = serviceRegistry;
		this._commandService = cmdservice;
	}
	
	TextSearcher.prototype = new mFind.Find();
	
	objects.mixin (TextSearcher.prototype, {
		getFindString: function() {
			var input = document.getElementById("localSearchFindWith"); //$NON-NLS-0$
			if (!input) {
				return mFind.Find.prototype.getFindString.call(this);
			}
			return input.value;
		},
		getReplaceString: function() {
			var input = document.getElementById("localSearchReplaceWith"); //$NON-NLS-0$
			if (!input) {
				return mFind.Find.prototype.getReplaceString(this);
			}
			return input.value;
		},
		hide: function() {
			var visible = this.isVisible();
			mFind.Find.prototype.hide.call(this);
			if(visible){
				this._commandService.closeParameterCollector();
			}
		},
		show: function(options) {
			mFind.Find.prototype.show.call(this, options);
			var findString = options.findString;
			this._addRecentfind(findString);
			var replaceString = options.replaceString;
			var findDiv = document.getElementById("localSearchFindWith"); //$NON-NLS-0$
			if (!findDiv) {
				this._createActionTable();
				findDiv = document.getElementById("localSearchFindWith"); //$NON-NLS-0$
			}
			if (findString) {
				findDiv.value = findString;
			}
			if (replaceString) {
				var replaceDiv = document.getElementById("localSearchReplaceWith"); //$NON-NLS-0$
				replaceDiv.value = replaceString;
			}
			window.setTimeout(function() {
				findDiv.select();
				findDiv.focus();
			}, 10);
		},
		_showReplaceInfo: function() {
			if(this._regex) {
				this._replaceInfo.src = "data:image/gif;base64,R0lGODlhBwAIAMQAAMzX6cbT5kh4qFiIuKC40FCIuGSXwmWZw2SaxGacxmadxmWcxbPM4GigyJW92JzC26DI0P///////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAEAABIALAAAAAAHAAgAAAUmoEQUQkFI0PBEz5A2yII0w9AwkUPbRpTsjUNEQUsFIgCXiGSShAAAOw==";//$NON-NLS-0$
				this._replaceInfo.title=messages["regexOptionOn"];
				this._replaceInfo.style.display = "";
			} else {
				this._replaceInfo.src ="data:image/gif;base64,R0lGODlhBwAIAEAAACH5BAEAABIALAAAAAAHAAgAhwAAAAAAMwAAZgAAmQAAzAAA/wArAAArMwArZgArmQArzAAr/wBVAABVMwBVZgBVmQBVzABV/wCAAACAMwCAZgCAmQCAzACA/wCqAACqMwCqZgCqmQCqzACq/wDVAADVMwDVZgDVmQDVzADV/wD/AAD/MwD/ZgD/mQD/zAD//zMAADMAMzMAZjMAmTMAzDMA/zMrADMrMzMrZjMrmTMrzDMr/zNVADNVMzNVZjNVmTNVzDNV/zOAADOAMzOAZjOAmTOAzDOA/zOqADOqMzOqZjOqmTOqzDOq/zPVADPVMzPVZjPVmTPVzDPV/zP/ADP/MzP/ZjP/mTP/zDP//2YAAGYAM2YAZmYAmWYAzGYA/2YrAGYrM2YrZmYrmWYrzGYr/2ZVAGZVM2ZVZmZVmWZVzGZV/2aAAGaAM2aAZmaAmWaAzGaA/2aqAGaqM2aqZmaqmWaqzGaq/2bVAGbVM2bVZmbVmWbVzGbV/2b/AGb/M2b/Zmb/mWb/zGb//5kAAJkAM5kAZpkAmZkAzJkA/5krAJkrM5krZpkrmZkrzJkr/5lVAJlVM5lVZplVmZlVzJlV/5mAAJmAM5mAZpmAmZmAzJmA/5mqAJmqM5mqZpmqmZmqzJmq/5nVAJnVM5nVZpnVmZnVzJnV/5n/AJn/M5n/Zpn/mZn/zJn//8wAAMwAM8wAZswAmcwAzMwA/8wrAMwrM8wrZswrmcwrzMwr/8xVAMxVM8xVZsxVmcxVzMxV/8yAAMyAM8yAZsyAmcyAzMyA/8yqAMyqM8yqZsyqmcyqzMyq/8zVAMzVM8zVZszVmczVzMzV/8z/AMz/M8z/Zsz/mcz/zMz///8AAP8AM/8AZv8Amf8AzP8A//8rAP8rM/8rZv8rmf8rzP8r//9VAP9VM/9VZv9Vmf9VzP9V//+AAP+AM/+AZv+Amf+AzP+A//+qAP+qM/+qZv+qmf+qzP+q///VAP/VM//VZv/Vmf/VzP/V////AP//M///Zv//mf//zP///wAAAAAAAAAAAAAAAAgsAPcpQzMJjbJ9xNAQQ6hwUqaHDws+3PeQoMN9DiUuzFRQ2ZiDyyYdHFhwYUAAOw==";
				this._replaceInfo.title=messages["regexOptionOff"];
				this._replaceInfo.style.display = "";
			}
		},
		_createActionTable: function() {
			var that = this;
			this._commandService.openParameterCollector("pageNavigationActions", function(parentDiv) { //$NON-NLS-0$
	
				// create the input box for searchTerm
				var searchStringInput = document.createElement('input'); //$NON-NLS-0$
				searchStringInput.type = "text"; //$NON-NLS-0$
				searchStringInput.name = messages["Find:"];
				searchStringInput.className = "parameterInput"; //$NON-NLS-0$
				searchStringInput.id = "localSearchFindWith"; //$NON-NLS-0$
				searchStringInput.placeholder=messages["Find With"];
				searchStringInput.oninput = function(evt){
					return that._handleInput(evt);
				};
				searchStringInput.onkeydown = function(evt){
					return that._handleKeyDown(evt);
				};
				parentDiv.appendChild(searchStringInput);
				that._initCompletion(searchStringInput);				
				that._createButton(messages["Next"], parentDiv, function() { //$NON-NLS-0$
					that._addRecentfind(that.getFindString());
					that.find(true);
				});			
				that._createButton(messages["Previous"], parentDiv, function() { //$NON-NLS-0$
					that._addRecentfind(that.getFindString());
					that.find(false);
				});			
				
				var readonly = that._editor.getTextView().getOptions("readonly"); //$NON-NLS-0$
				if (!readonly) {
					// create replace text
					var replaceStringInput = document.createElement('input'); //$NON-NLS-0$
					replaceStringInput.type = "text"; //$NON-NLS-0$
					replaceStringInput.name = messages["ReplaceWith:"];
					replaceStringInput.className = "parameterInput"; //$NON-NLS-0$
					replaceStringInput.id = "localSearchReplaceWith"; //$NON-NLS-0$
					replaceStringInput.placeholder=messages["Replace With"];
					replaceStringInput.onkeydown = function(evt){
						return that._handleKeyDown(evt);
					};
					parentDiv.appendChild(replaceStringInput);
					that._replaceInfo = that._createInfoImage(null, parentDiv, null);
					that._showReplaceInfo();
					that._createButton(messages["Replace"], parentDiv, function() {that.replace();}); //$NON-NLS-0$		
					that._createButton(messages["Replace All"], parentDiv, function() {that.replaceAll();});	//$NON-NLS-0$
				}

				var optionsDiv = document.createElement("div"); //$NON-NLS-0$
				parentDiv.appendChild(optionsDiv);
				optionsDiv.classList.add("findOptionsDiv"); //$NON-NLS-0$
				var optionMenu = mCommands.createDropdownMenu(optionsDiv, messages['Options'], null, "dismissButton", null, true); //$NON-NLS-0$
				optionMenu.menuButton.classList.add("parameterInlineButton"); //$NON-NLS-0$
				mCommands.createCheckedMenuItem(optionMenu.menu, messages["Show all"], that._showAll,
					function(event) {
						var checked = event.target.checked;
						that.setOptions({showAll: checked});
						optionMenu.dropdown.close(true);
					});
				
				mCommands.createCheckedMenuItem(optionMenu.menu, messages["Case sensitive"], !that._caseInsensitive,
					function(event) {
						that.setOptions({caseInsensitive: !event.target.checked});
						optionMenu.dropdown.close(true);
						that.find(true);
					});
				
				mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Wrap search"], that._wrap,
					function(event) {
						that.setOptions({wrap: event.target.checked});
						optionMenu.dropdown.close(true);
					});
					
				mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Incremental search"], that._incremental,
					function(event) {
						that.setOptions({incremental: event.target.checked});
						optionMenu.dropdown.close(true);
					});
					
				mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Whole Word"], that._wholeWord,
					function(event) {
						that.setOptions({wholeWord: event.target.checked});
						optionMenu.dropdown.close(true);
						that.find(true);
					});
					
				that._regExBox = mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Regular expression"], that._regex,
					function(event) {
						that.setOptions({regex: event.target.checked});
						optionMenu.dropdown.close(true);
						that.find(true);
						that._showReplaceInfo();
					});

				if (!readonly) {
					mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Find after replace"], that._findAfterReplace,
						function(event) {
							that.setOptions({findAfterReplace: event.target.checked});
							optionMenu.dropdown.close(true);
						});
				}
					
				return searchStringInput;
			},
			function(){that.hide();});
		},
		_storeRecentFind: function(recentFinds, eventTarget, deleting){
			this._serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
				prefs.put("recentFind", recentFinds); //$NON-NLS-0$
				if(eventTarget) {
					window.setTimeout(function() {
						eventTarget.dispatchEvent({type:"inputDataListChanged", deleting: deleting}); //$NON-NLS-0$
					}.bind(this), 20);
				}
			});
		},
		_addRecentfind: function(findString){
			if(typeof findString !== "string" || !findString ){ //$NON-NLS-0$
				return;
			}
			//If the string is already in the input completion list, do not bother asking preference service.
			if(this._completion && this._completion.hasValueOf(findString)){
				return;
			}
			this._serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
				var i;
				var searches = prefs.get("recentFind"); //$NON-NLS-0$
				if (typeof searches === "string") { //$NON-NLS-0$
					searches = JSON.parse(searches);
				}
				if (searches) {
					for (i in searches) {
						if (searches[i].name === findString) {
							return;
						}
					}
					if(searches.length >= MAX_RECENT_FIND_NUMBER){
						var len = searches.length;
						searches.splice(MAX_RECENT_FIND_NUMBER-1, len-MAX_RECENT_FIND_NUMBER+1);
					}
				} else {
					searches = [];
				}
				searches.splice(0,0,{ "name": findString});//$NON-NLS-0$
				this._storeRecentFind(searches, this._completion);
			}.bind(this));
		},
		_removeRecentSearch: function( searchName, eventTarget){
			if(typeof searchName !== "string" || !searchName ){ //$NON-NLS-0$
				return;
			}
			this._serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
				var i;
				var searches = prefs.get("recentFind"); //$NON-NLS-0$
				if (typeof searches === "string") { //$NON-NLS-0$
					searches = JSON.parse(searches);
				}
				if (searches) {
					for (i in searches) {
						if (searches[i].name === searchName) {
							searches.splice(i, 1);
							this._storeRecentFind(searches, eventTarget, true);
							break;
						}
					}
				}
			}.bind(this));
		},
	    _initCompletion: function(searchStringInput) {
			if(this._completion){
				this._completion.setInputField(searchStringInput);
			} else { //Create the inputCompletion lazily.
				//Required. Reading recent&saved search from user preference. Once done call the uiCallback
				var defaultProposalProvider = function(uiCallback){
					this._serviceRegistry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
						var searches = prefs.get("recentFind"); //$NON-NLS-0$
						if (typeof searches === "string") { //$NON-NLS-0$
							searches = JSON.parse(searches);
						}
						if (searches) {
							var fullSet = [];
							searches.forEach(function(find) {
								fullSet.push({type: "proposal", label: find.name, value: find.name});//$NON-NLS-0$
							});
							uiCallback(fullSet);
						}
					});
				}.bind(this);
				//Create and hook up the inputCompletion instance with the search box dom node.
				//The defaultProposalProvider provides proposals from the recent and saved searches.
				//The exendedProposalProvider provides proposals from plugins.
				this._completion = new mInputCompletion.InputCompletion(searchStringInput, defaultProposalProvider, {serviceRegistry: this._serviceRegistry, group: "localSearch", //$NON-NLS-0$
					onDelete: function(item, evtTarget) {
						this._removeRecentSearch(item, evtTarget);
					}.bind(this),
					deleteToolTips: messages['DeleteSearchTrmMsg']
				});
	    	}
	    },
		_createButton: function(text, parent, callback) {
			var button  = document.createElement("button"); //$NON-NLS-0$
			button.addEventListener("click", callback.bind(this), false); //$NON-NLS-0$
			var self = this;
			button.addEventListener("keydown", function(e) { //$NON-NLS-0$
				if (e.keyCode === lib.KEY.ESCAPE) {
					self.hide();
				}
			});
			button.appendChild(document.createTextNode(text)); //$NON-NLS-0$
			button.className = "dismissButton parameterInlineButton"; //$NON-NLS-0$
			
			parent.appendChild(button);
		},
		_createInfoImage: function(text, parent, callback) {
			var image = document.createElement("img"); //$NON-NLS-0$
			image.classList.add("replaceInfo"); //$NON-NLS-0$
			image.addEventListener("click", function(e) { //$NON-NLS-0$
				this._regExBox.checked = !this._regex;
				this.setOptions({regex: !this._regex});
				this.find(true);
				this._showReplaceInfo();
			}.bind(this));
			parent.appendChild(image);
			return image;
		},
		_handleInput: function(evt){
			if (this._incremental) {
				this.find(true, null, true);
			}
			return true;
		},
		_handleKeyDown: function(evt){
			var ctrlKeyOnly = (this.isMac ? evt.metaKey : evt.ctrlKey) && !evt.altKey && !evt.shiftKey;
			if(ctrlKeyOnly && evt.keyCode === 70/*"f"*/ ) {
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				return false;
			}
			//We can't use ctrlKeyOnly on "k" because ctrl+shift+k means find previous match when the find bar gets focus
			if(((this.isMac ? evt.metaKey : evt.ctrlKey) && !evt.altKey && evt.keyCode === 75/*"k"*/) || evt.keyCode === 13/*enter*/){
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				this._addRecentfind(this.getFindString());
				if (evt.keyCode === 13) {
					this.find(this._reverse ? evt.shiftKey : !evt.shiftKey);
				} else {
					this.find(!evt.shiftKey);
				}
				return false;
			}
			if( ctrlKeyOnly &&  evt.keyCode === 82 /*"r"*/){
				if( evt.stopPropagation ) { 
					evt.stopPropagation(); 
				}
				evt.cancelBubble = true;
				this.replace();
				return false;
			}
			if( evt.keyCode === 27/*ESC*/ ){
				this.hide();
				return false;
			}
			return true;
		}
	});

	return {TextSearcher: TextSearcher};
});