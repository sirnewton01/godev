/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others. All rights reserved.
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: 
 *	IBM Corporation - initial API and implementation
 *	Adrian Aichner - regular expression capture group support in replace
 ******************************************************************************/
/*global define window document navigator*/
/*jslint sub:true*/

define(['i18n!orion/search/nls/messages', 'orion/editor/find', 'orion/commands', 'orion/objects', 'orion/webui/littlelib' ], 
	function(messages, mFind, mCommands, objects, lib){
	
	function TextSearcher(editor, cmdservice, undoStack, options) {
		mFind.Find.call(this, editor, undoStack, options);
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
				
				that._createButton("Next", parentDiv, function() {that.find(true);}); //$NON-NLS-0$			
				that._createButton("Previous", parentDiv, function() {that.find(false);}); //$NON-NLS-0$
				
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
					
				mCommands.createCheckedMenuItem(optionMenu.menu,  messages["Regular expression"], that._regex,
					function(event) {
						that.setOptions({regex: event.target.checked});
						optionMenu.dropdown.close(true);
						that.find(true);
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
