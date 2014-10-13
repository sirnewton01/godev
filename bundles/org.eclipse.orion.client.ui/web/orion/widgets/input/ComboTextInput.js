/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/objects',
	'orion/webui/littlelib',
	'text!orion/widgets/input/ComboTextInput.html',
	'i18n!orion/widgets/nls/messages',
	'orion/inputCompletion/inputCompletion'
], function(objects, lib, ComboTextInputTemplate, messages, InputCompletion) {

	/**
	 * Creates a text input box combined with:
	 * 1) [Optional] An attached button.
	 * 2) [Optional] Input completion based on recent entries.
	 * 
	 * @param {Object} options Contains the set of properties that describe this ComboTextInput.
	 *	{String} options.id The id of this ComboTextInput's wrapping DOM node
	 *	{Object} options.parentNode The DOM node that will act as the parent of this ComboTextInput's wrapping DOM node
	 *	{Object} options.insertBeforeNode [Optional] The DOM node that this ComboTextInput's wrapper node should be inserted before in the parentNode
	 *	{Boolean} options.hasButton true if this ComboTextInput should have an attached button, false otherwise
	 *		[if options.hasButton === true]
	 *		{String} options.buttonText The text to display on this ComboTextInput's button
	 *		{Function} options.buttonClickListener The event listener function that should be called when the button is clicked
	 *	{Boolean} options.hasInputCompletion true if this ComboTextInput should create and use input completion, false otherwise
	 *		[if options.hasInputCompletion === true]
	 *		{Object} options.serviceRegistry The service registry that the InputCompletion instance will use
	 *		{Function} options.defaultRecentEntryProposalProvider [Optional] The default proposal provider that the input completion should use
	 *		{Function} options.extendedRecentEntryProposalProvider [Optional] The extended proposal provider that the input completion should use
	 *		{Function} options.onRecentEntryDelete [Optional] The function that should be called when the user attempts to delete an entry from the input completion list
	 */
	function ComboTextInput(options){
		this._domNodeId = options.id;
		this._parentNode = options.parentNode;
		this._insertBeforeNode = options.insertBeforeNode;
		
		this._hasButton = options.hasButton;
		this._buttonText = options.buttonText;
		this._buttonClickListener = options.buttonClickListener;

		this._hasInputCompletion = options.hasInputCompletion;
		this._serviceRegistry = options.serviceRegistry;
		this._defaultRecentEntryProposalProvider = options.defaultRecentEntryProposalProvider;
		this._extendedRecentEntryProposalProvider = options.extendedRecentEntryProposalProvider;
		this._onRecentEntryDelete = options.onRecentEntryDelete;
		
		this._initializeDomNodes();
	}
	objects.mixin(ComboTextInput.prototype, {
		_initializeDomNodes: function() {
			var range = document.createRange();
			range.selectNode(this._parentNode);
			var domNodeFragment = range.createContextualFragment(ComboTextInputTemplate);
			
			// using a throw-away container to prevent the element from being added
			// to the page before any unnecessary subnodes have been removed from it
			var throwawayContainer = document.createElement("span"); //$NON-NLS-0$
			throwawayContainer.appendChild(domNodeFragment);
			this._domNode = throwawayContainer.lastChild;
			this._domNode.id = this._domNodeId;
			
			this._textInputNode = lib.$(".comboTextInputField", this._domNode); //$NON-NLS-0$
			this._textInputNode.addEventListener("focus", function() { //$NON-NLS-0$
				this._domNode.classList.add("comboTextInputWrapperFocussed"); //$NON-NLS-0$ 
			}.bind(this));
			
			this._textInputNode.addEventListener("blur", function() { //$NON-NLS-0$
				this._domNode.classList.remove("comboTextInputWrapperFocussed"); //$NON-NLS-0$ 
			}.bind(this));
			
			this._recentEntryButton = lib.$(".recentEntryButton", this._domNode); //$NON-NLS-0$
			if (this._hasInputCompletion) {
				this._initializeCompletion();
			} else {
				this._domNode.removeChild(this._recentEntryButton);
				this._recentEntryButton = undefined;
			}

			this._comboTextInputButton = lib.$(".comboTextInputButton", this._domNode); //$NON-NLS-0$
			if (this._hasButton) {
				this._comboTextInputButton = lib.$(".comboTextInputButton", this._domNode); //$NON-NLS-0$
				if (this._buttonText) {
					this._comboTextInputButton.appendChild(document.createTextNode(this._buttonText));	
				}
				if (this._buttonClickListener) {
					this._comboTextInputButton.addEventListener("click", function(event){ //$NON-NLS-0$
						this._buttonClickListener(event);
					}.bind(this)); //$NON-NLS-0$
				}
			} else {
				this._domNode.removeChild(this._comboTextInputButton);
				this._comboTextInputButton = undefined;
			}
			
			if (this._insertBeforeNode) {
				this._parentNode.insertBefore(this._domNode, this._insertBeforeNode);
			} else {
				this._parentNode.appendChild(this._domNode);
			}
		},
		
		_initializeCompletion: function() {
			this._localStorageKey = this._domNodeId + "LocalStorageKey"; //$NON-NLS-0$
			
			var forceShowRecentEntryButton = false;
			
			if (this._defaultRecentEntryProposalProvider) {
				forceShowRecentEntryButton = true;
			} else {
				this._defaultRecentEntryProposalProvider = function(uiCallback) {
					var recentEntryArray = this.getRecentEntryArray();
					if (!recentEntryArray) {
						recentEntryArray = [];
					}
					uiCallback(recentEntryArray);
				}.bind(this);
			}
			
			if (this._onRecentEntryDelete === undefined) {
				this._onRecentEntryDelete = function(item, evtTarget) {
					var recentEntryArray = this.getRecentEntryArray();
					
					//look for the item in the recentEntryArray
					var indexOfElement = this._getIndexOfValue(recentEntryArray, item);
					
					if (-1 < indexOfElement) {
						//found the item in the array, remove it and update localStorage
						recentEntryArray.splice(indexOfElement, 1);
						this._storeRecentEntryArray(recentEntryArray);
						
						if (0 === recentEntryArray.length) {
							this._hideRecentEntryButton();
						}
						
						if(evtTarget) {
							window.setTimeout(function() {
								evtTarget.dispatchEvent({type:"inputDataListChanged", deleting: true}); //$NON-NLS-0$
							}.bind(this), 20);
						}
					}
				}.bind(this);
			}
			
			//Create and hook up the inputCompletion instance with the search box dom node.
			//The defaultProposalProvider provides proposals from the recent and saved searches.
			//The exendedProposalProvider provides proposals from plugins.
			this._inputCompletion = new InputCompletion.InputCompletion(this._textInputNode, this._defaultRecentEntryProposalProvider, {
				serviceRegistry: this._serviceRegistry, 
				group: this._domNodeId + "InputCompletion", //$NON-NLS-0$
				extendedProvider: this._extendedRecentEntryProposalProvider, 
				onDelete: this._onRecentEntryDelete,
				deleteToolTips: messages["DeleteSearchTrmMsg"] //$NON-NLS-0$
			});
			
			this._recentEntryButton.addEventListener("click", function(event){ 
				this._textInputNode.focus();
				this._inputCompletion._proposeOn();
				lib.stop(event);
			}.bind(this)); //$NON-NLS-0$

			var recentEntryArray = this.getRecentEntryArray();
			if (forceShowRecentEntryButton || (recentEntryArray && (0 < recentEntryArray.length)) ) {
				this._showRecentEntryButton();
			} else {
				this._hideRecentEntryButton();
			}
	    },
		
		/**
		 * @returns {Object} The DOM node which wraps all the other nodes in this ComboTextInput
		 */
		getDomNode: function() {
			return this._domNode;
		},
		
		/**
		 * @returns {Object} The DOM node of this ComboTextInput's <input type="text"> field
		 */
		getTextInputNode: function() {
			return this._textInputNode;
		},
		
		/**
		 * @returns {String} The value of this ComboTextInput's <input type="text"> field
		 */
		getTextInputValue: function() {
			return this._textInputNode.value;	
		},
		
		/**
		 * Sets the value of this ComboTextInput's <input type="text"> field
		 * @param {String} value
		 */
		setTextInputValue: function(value) {
			this._textInputNode.value = value;	
		},

		/**
		 * @returns {Object} 	The DOM node of this ComboTextInput's <button> or null if 
		 * 						options.hasButton was set to false.
		 */
		getButton: function() {
			return this._comboTextInputButton;	
		},
		
		/**
		 * @returns {Object} 	The DOM node of this ComboTextInput's recent entry button 
		 * 						or null if options.hasInputCompletion was set to false.
		 */
		getRecentEntryButton: function() {
			return this._recentEntryButton;
		},
		
		/**
		 * Sets the HTML title of the recentyEntryButton 
		 * belonging to this combo text input.
		 * 
		 * @param {String} title The title of the recentEntryButton
		 */
		setRecentEntryButtonTitle: function(title){
			if (this._recentEntryButton) {
				this._recentEntryButton.title = title;
			}
		},
		
		/**
		 * Adds the value that is in the text input field to the
		 * recent entries in localStorage. Empty and duplicate
		 * values are ignored.
		 */
		addTextInputValueToRecentEntries: function() {
			var value = this.getTextInputValue();
			if (value) {
				var recentEntryArray = this.getRecentEntryArray();
				if (!recentEntryArray) {
					recentEntryArray = [];
				}
				
				var indexOfElement = this._getIndexOfValue(recentEntryArray, value); //check if a duplicate entry exists
				if (0 !== indexOfElement) {
					// element is either not in array, or not in first position
					if (-1 !== indexOfElement) {
						// element is in array, remove it because we want to add it to beginning
						recentEntryArray.splice(indexOfElement, 1);
					}
					
					//add new entry to beginning of array
					recentEntryArray.unshift({
						type: "proposal", //$NON-NLS-0$
						label: value, 
						value: value
					});
					this._storeRecentEntryArray(recentEntryArray);
					
					this._showRecentEntryButton();
				}
			}
		},
		
		/**
		 * Looks for an entry in the specified recentEntryArray with 
		 * a value that is equivalent to the specified value parameter.
		 *
		 * @returns The index of the matching entry in the array or -1 
		 */
		_getIndexOfValue: function(recentEntryArray, value) {
			var indexOfElement = -1;
			
			recentEntryArray.some(function(entry, index){
				if (entry.value === value) {
					indexOfElement = index;
					return true;
				}
				return false;
			});
			
			return indexOfElement;
		},
		
		/**
		 * Makes this ComboTextInput's button visible.
		 * Should only be called if this ComboTextInput was created
		 * with options.hasButton set to true.
		 */
		showButton: function() {
			this._comboTextInputButton.classList.remove("isHidden"); //$NON-NLS-0$
		},
		
		/**
		 * Hides this ComboTextInput's button.
		 * Should only be called if this ComboTextInput was created
		 * with options.hasButton set to true.
		 */
		hideButton: function() {
			this._comboTextInputButton.classList.add("isHidden"); //$NON-NLS-0$
		},
		
		/**
		 * @returns an array of the recent entries that were
		 * saved by this combo text input, or null
		 */
		getRecentEntryArray: function() {
			var recentEntryArray = null;

			if (this._localStorageKey) {
				var recentEntryString = localStorage.getItem(this._localStorageKey);
				if (recentEntryString) {
					recentEntryArray = JSON.parse(recentEntryString);
				}
			}

			return recentEntryArray;
		},
		
		/**
		 * Private helper method that saves the specified recentEntryArray to localStorage.
		 * @param {Array} recentEntryArray An array containing recent entries that should be saved.
		 */
		_storeRecentEntryArray: function(recentEntryArray) {
			var recentEntryString = JSON.stringify(recentEntryArray);
			localStorage.setItem(this._localStorageKey, recentEntryString);
		},
		
		_showRecentEntryButton: function() {
			this._recentEntryButton.classList.remove("isHidden"); //$NON-NLS-0$
		},
		
		_hideRecentEntryButton: function() {
			this._recentEntryButton.classList.add("isHidden"); //$NON-NLS-0$
		}
	});
	return ComboTextInput;
});