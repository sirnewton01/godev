/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
 
/*global window define setTimeout document*/
/*jslint forin:true regexp:false sub:true*/

define([
	'i18n!orion/search/nls/messages',
	'require',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/section',
	'orion/commands',
	'orion/commandRegistry',
	'orion/keyBinding',
	'orion/selection',
	'orion/explorers/explorer',
	'orion/EventTarget',
	'orion/globalSearch/advSearchOptContainer',
	'orion/webui/splitter'
],  function(messages, require, lib, i18nUtil, mSection, mCommands, mCommandRegistry, mKeyBinding, mSelection, mExplorer, EventTarget, mAdvSearchOptContainer, splitter){

	/**
	 * Instantiates the saved search service. This service is used internally by the
	 * search outliner and is not intended to be used as API.  It is serving as
	 * a preference holder and triggers listeners when the preference changes.
	 * When preference changes trigger listeners, this class would no longer be needed.
	 *
	 * @name orion.searches.SavedSearches
	 * @class A service for creating and managing saved searches.
	 */
	function SavedSearches(serviceRegistry) {
		this._searches = [];
		EventTarget.attach(this);
		this._init(serviceRegistry);
		this._initializeSearches();
	}
	
	SavedSearches.prototype = /** @lends orion.searches.SavedSearches.prototype */ {
		_init: function(options) {
			this._registry = options.serviceRegistry;
			this._serviceRegistration = this._registry.registerService("orion.core.savedSearches", this); //$NON-NLS-0$
		},
		
		_notifyListeners: function() {
			this.dispatchEvent({type:"searchesChanged", searches: this._searches, registry: this._registry}); //$NON-NLS-0$
		},

		
		_initializeSearches: function () {
			var savedSearches = this;
			this._registry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
				var i;
				var searches = prefs.get("search"); //$NON-NLS-0$
				if (typeof searches === "string") { //$NON-NLS-0$
					searches = JSON.parse(searches);
				}
				if (searches) {
					for (i in searches) {
						savedSearches._searches.push(searches[i]);
					}
				}
				savedSearches._notifyListeners();
			});
		}, 
				
		_storeSearches: function() {
			var storedSearches = this._searches;
			this._registry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs){ //$NON-NLS-1$ //$NON-NLS-0$
				prefs.put("search", storedSearches); //$NON-NLS-0$
			}); 
		},

		addSearch: function(theName, theQuery) {
			var alreadyFound = false;
			for (var i in this._searches) {
				if (this._searches[i].query === theQuery) {
					this._searches[i].name = theName;
					alreadyFound = true;
				}
			}
			if (alreadyFound) {
				this._registry.getService("orion.page.message").setProgressResult({Message: i18nUtil.formatMessage(messages["${0} is already saved"], theName), Severity: "Warning"}); //$NON-NLS-1$ //$NON-NLS-0$
			} else {
				this._searches.push({ "name": theName, "query": theQuery}); //$NON-NLS-1$ //$NON-NLS-0$
			}
			this._searches.sort(this._sorter);
			this._storeSearches();
			this._notifyListeners();
		},
		
		removeSearch: function(query) {
			for (var i in this._searches) {
				if (this._searches[i].query === query) {
					this._searches.splice(i, 1);
					break;
				}
			}
			this._searches.sort(this._sorter);
			this._storeSearches();
			this._notifyListeners();
		},
		
		renameSearch: function(query, newName) {
			var changed = false;
			for (var i in this._searches) {
				if (this._searches[i].query === query) {
					var search = this._searches[i];
					if (search.name !== newName) {
						search.name = newName;
						changed = true;
					}
				}
			}
			if (changed) {
				this._searches.sort(this._sorter);
				this._storeSearches();
				this._notifyListeners();
			}
		}, 
		
		getSearches: function() {
			return {searches: this._searches};
		}, 
		
		_sorter: function(fav1,fav2) {
			var name1 = fav1.name.toLowerCase();
			var name2 = fav2.name.toLowerCase();
			if (name1 > name2) {
				return 1;
			} else if (name1 < name2) {
				return -1;
			} else {
				return 0;
			}
		}
	};
	function SearchRenderer (options, explorer) {
		this.explorer = explorer;
		this._init(options);
	}
	SearchRenderer.prototype = mExplorer.SelectionRenderer.prototype;
	SearchRenderer.prototype.constructor = SearchRenderer;
	SearchRenderer.prototype.getLabelColumnIndex = function() {
		return 0;
	};
	SearchRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var href;
		if (item.query) {
			href=require.toUrl("search/search.html") + "#" + item.query; //$NON-NLS-1$ //$NON-NLS-0$
			var col = document.createElement("td"); //$NON-NLS-0$
			tableRow.appendChild(col);
			col.classList.add('mainNavColumn'); //$NON-NLS-0$
			col.classList.add('singleNavColumn'); //$NON-NLS-0$
			var link = document.createElement('a'); //$NON-NLS-0$
			link.href = href;
			link.className = 'navlinkonpage'; //$NON-NLS-0$
			col.appendChild(link);
			link.appendChild(window.document.createTextNode(item.name));
		} 
	};

	function SearchExplorer(serviceRegistry, selection) {
		this.selection = selection;
		this.registry = serviceRegistry;
		this.renderer = new SearchRenderer({checkbox: false}, this);
	}
	SearchExplorer.prototype = mExplorer.Explorer.prototype;	
	SearchExplorer.prototype.constructor = SearchExplorer;

	

	/**
	 * Creates a new user interface element showing stored searches
	 *
	 * @name orion.Searches.SearchList
	 * @class A user interface element showing a list of saved searches.
	 * @param {Object} options The service options
	 * @param {Object} options.parent The parent 
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry
	 */
	function SearchOutliner(options) {
		var parent = lib.node(options.parent);
		if (!parent) { throw "no parent"; } //$NON-NLS-0$
		if (!options.serviceRegistry) {throw "no service registry"; } //$NON-NLS-0$
		this._parent = parent;
		this._registry = options.serviceRegistry;
		this.commandService = options.commandService;
		
		var renameSearchCommand = new mCommands.Command({
			name: messages["Rename"],
			imageClass: "core-sprite-rename", //$NON-NLS-0$
			id: "eclipse.renameSearch", //$NON-NLS-0$
			parameters: new mCommandRegistry.ParametersDescription([new mCommandRegistry.CommandParameter("name", "text", 'Name:', '')]), //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			visibleWhen: function(items) {
				items = Array.isArray(items) ? items : [items];
				return items.length === 1 && items[0].query;
			},
			callback: function(data) {
				var item = Array.isArray(data.items) ? data.items[0] : data.items;
				if (data.parameters && data.parameters.valueFor('name')) { //$NON-NLS-0$
					this._registry.getService("orion.core.savedSearches").renameSearch(item.query, data.parameters.valueFor('name')); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}.bind(this)
		});
		var deleteSearchCommand = new mCommands.Command({
			name: "Delete", //$NON-NLS-0$
			imageClass: "core-sprite-delete", //$NON-NLS-0$
			id: "eclipse.deleteSearch", //$NON-NLS-0$
			visibleWhen: function(items) {
				items = Array.isArray(items) ? items : [items];
				if (items.length === 0) {
					return false;
				}
				for (var i=0; i<items.length; i++) {
					if (!items[i].query) {
						return false;
					}
				}
				return true;
			},
			callback: function(data) {
				var items = Array.isArray(data.items) ? data.items : [data.items];
				var confirmMessage = items.length === 1 ? i18nUtil.formatMessage("Are you sure you want to delete '${0}' from the searches?", items[0].name) : i18nUtil.formatMessage("Are you sure you want to delete these ${0} searches?", items.length); //$NON-NLS-1$ //$NON-NLS-0$
				if(window.confirm(confirmMessage)) {
					for (var i=0; i<items.length; i++) {
						options.serviceRegistry.getService("orion.core.savedSearches").removeSearch(items[i].query); //$NON-NLS-0$
					}
				}
			}
		});
		// register commands 
		this.commandService.addCommand(renameSearchCommand);	
		this.commandService.addCommand(deleteSearchCommand);	
		var savedSearches = this._registry.getService("orion.core.savedSearches"); //$NON-NLS-0$
		var searchOutliner = this;
		if (savedSearches) {
			// render the searches
			var registry = this._registry;
			savedSearches.getSearches().then(function(searches) {
				this.render(searches.searches, registry);
			}.bind(searchOutliner));

			savedSearches.addEventListener("searchesChanged", //$NON-NLS-0$
				function(event) {
					this.render(event.searches, event.registry);
				}.bind(searchOutliner));
		}
	}
	SearchOutliner.prototype = /** @lends orion.navoutliner.SearchOutliner.prototype */ {

		render: function(searches, serviceRegistry) {
			// Searches if we have them
			var commandService = this.commandService;
			// first time setup
			if (!this.searchesSection) {
				this.searchesSection = new mSection.Section(this._parent, {
					id: "searchSection", //$NON-NLS-0$
					title: messages["My Saved Searches"],
					content: '<div id="searchContent"></div>', //$NON-NLS-0$
					useAuxStyle: true,
					preferenceService: serviceRegistry.getService("orion.core.preference"), //$NON-NLS-0$
					slideout: true
				});
				this.searchSelection = new mSelection.Selection(serviceRegistry, "orion.searches.selection"); //$NON-NLS-0$
				// add commands to the search section heading
				var selectionId = this.searchesSection.selectionNode.id;
				var binding;
				binding = new mKeyBinding.KeyBinding(113);
				binding.domScope = "searchContent"; //$NON-NLS-0$
				binding.scopeName = messages["My Saved Searches"];
				this.commandService.registerCommandContribution(selectionId, "eclipse.renameSearch", 1, null, false, binding); //$NON-NLS-0$
				binding = new mKeyBinding.KeyBinding(46);
				binding.domScope = "searchContent"; //$NON-NLS-0$
				binding.scopeName = messages["My Saved Searches"];
				this.commandService.registerCommandContribution(selectionId, "eclipse.deleteSearch", 2, null, false, binding); //$NON-NLS-0$
				commandService.registerSelectionService(selectionId, this.searchSelection);
				serviceRegistry.getService("orion.searches.selection").addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
					var selectionTools = lib.node(selectionId);
					if (selectionTools) {
						commandService.destroy(selectionTools);
						commandService.renderCommands(selectionId, selectionTools, event.selections, this, "button"); //$NON-NLS-0$
					}
				});
			}
			if (searches.length > 0) {
				var explorer = new SearchExplorer(serviceRegistry, this.searchSelection);
				this.searchTable = explorer.createTree("searchContent", new mExplorer.SimpleFlatModel(searches, "srch", function(item) { //$NON-NLS-1$ //$NON-NLS-0$
					return item.query;
				}));	
			} else {
				var sContents = lib.node("searchContent"); //$NON-NLS-0$
				if(sContents){
					var saveSearchTip = document.createElement("p"); //$NON-NLS-0$
					saveSearchTip.textContent = messages["Save frequently used searches by clicking on the ${0} button above."]; //$NON-NLS-0$
					var saveLabel = document.createElement("b"); //$NON-NLS-0$
					saveLabel.textContent = messages["Save"]; //$NON-NLS-0$
					lib.processDOMNodes(saveSearchTip, [saveLabel]);

					lib.empty(sContents);
					sContents.appendChild(saveSearchTip);
				}
			}
		}
	};//end navigation outliner prototype
	SearchOutliner.prototype.constructor = SearchOutliner;
	
	/**
	 * Creates a new user interface element to build all the search options and do the search
	 *
	 * @name orion.Searches.SearchBuilder
	 * @class A user interface element building a search.
	 * @param {Object} options The service options
	 * @param {Object} options.parent The parent DOM node or id to hold all the builder controls
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry
	 */
	function SearchBuilder(options) {
		var parent = lib.node(options.parent);
		if (!parent) { throw "no parent"; } //$NON-NLS-0$
		if (!options.serviceRegistry) {throw "no service registry"; } //$NON-NLS-0$
		this._parent = parent;
		this._registry = options.serviceRegistry;
		this.commandService = options.commandService;
		this.advSearchOptContainer = new mAdvSearchOptContainer.AdvSearchOptContainer(this._parent, options.searcher, this._registry, this.commandService);
		var outlinerParent = lib.node("outlineContainer"); //$NON-NLS-0$
		var top = lib.$("#outlineTop", outlinerParent); //$NON-NLS-0$
		var bottom = lib.$("#outlineBottom", outlinerParent); //$NON-NLS-0$
		var splitNode = lib.$(".outlinerSplitLayout", outlinerParent); //$NON-NLS-0$
		splitNode.id = "searchOutlineSplitter"; //$NON-NLS-0$
		//The vertical splitter has to adjust the top and bottm pane when the outliner is refreshed by the click on browser's refresh.
		//Otherwise there the bottom pane is a little offset.
		window.setTimeout(function() { 
			this._splitter = new splitter.Splitter({node: splitNode, sidePanel: top, mainPanel: bottom, toggle: true, vertical: true, closeReversely: true});
		}, 100);
	}
	SearchBuilder.prototype = /** @lends orion.navoutliner.SearchOutliner.prototype */ {
		loadSearchParams: function(searchParams) {
			this.advSearchOptContainer.getRenderer().loadSearchParams(searchParams);
		}
	};
	SearchBuilder.prototype.constructor = SearchOutliner;

	//return module exports
	return {
		SavedSearches: SavedSearches,
		SearchOutliner: SearchOutliner,
		SearchBuilder: SearchBuilder
	};
});
