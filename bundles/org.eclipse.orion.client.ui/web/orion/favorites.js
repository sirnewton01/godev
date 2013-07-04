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
/*global window define */
 
/*jslint forin:true*/

define(['require', 'orion/fileUtils', 'orion/EventTarget'], function(require, mFileUtils, EventTarget){

	/**
	 * Instantiates the favorites service. Clients should obtain the 
	 * <tt>orion.core.favorite</tt> service from the service registry rather
	 * than instantiating this service directly. This constructor is intended
	 * for use by page initialization code that is initializing the service registry.
	 *
	 * @name orion.favorites.FavoritesService
	 * @class A service for creating and managing links that the user has identified
	 * as favorites.
	 */
	function FavoritesService(serviceRegistry) {
		this._favorites = [];
		EventTarget.attach(this);
		this._init(serviceRegistry);
		this._initializeFavorites();
	}
	FavoritesService.prototype = /** @lends orion.favorites.FavoritesService.prototype */ {
		_init: function(options) {
			this._registry = options.serviceRegistry;
			this._serviceRegistration = this._registry.registerService("orion.core.favorite", this); //$NON-NLS-0$
		},
		
		_notifyListeners: function() {
			this.dispatchEvent({type:"favoritesChanged", navigator: this._favorites, registry: this._registry}); //$NON-NLS-0$
		},
	
		/**
		 * Adds an item or array of items to the favorites list.
		 * @param items One or more file or directory objects
		 */
		makeFavorites: function(items) {
			items = Array.isArray(items) ? items : [items];
			for (var i=0; i < items.length; i++) {
				var item = items[i];
				
				// strip off the hostname and just use the path name
				var location = item.ChildrenLocation ? item.ChildrenLocation : item.Location;
				// it would be cool if the location were a real document location
				// for now I'll assume it's from the same host in order to get the pathname
				location = mFileUtils.makeRelative(location);
				this.addFavorite(item.Name, location, item.Directory);
			}
			this._storeFavorites();
			this._notifyListeners();
		},
		
		addFavoriteUrl: function(url) {
			this.addFavorite(url, url, false, true);
		},
						
		addFavorite: function(theName, thePath, isDirectory) {
			this._favorites.push({ "name": theName, "path": thePath, "directory": isDirectory, "isFavorite": true }); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			this._favorites.sort(this._sorter);
			this._storeFavorites();
			this._notifyListeners();
		},
		
		removeFavorite: function(path) {
			for (var i in this._favorites) {
				if (this._favorites[i].path === path) {
					this._favorites.splice(i, 1);
					break;
				}
			}
			this._favorites.sort(this._sorter);
			this._storeFavorites();
			this._notifyListeners();
		},

		renameFavorite: function(path, newName) {
			var changed = false;
			for (var i in this._favorites) {
				if (this._favorites[i].path === path) {
					var fave = this._favorites[i];
					if (fave.name !== newName) {
						fave.name = newName;
						changed = true;
					}
				}
			}
			if (changed) {
				this._favorites.sort(this._sorter);
				this._storeFavorites();
				this._notifyListeners();
			}
		},
		
		
		hasFavorite: function(path) {
			for (var i in this._favorites) {
				if (this._favorites[i].path === path) {
					return true;
				}
			}
			return false;
		},
		
		/** @private special characters in regex */
		_SPECIAL_CHARS : "^$\\+[]().", //$NON-NLS-0$

		
		/**
		 * Queries the favorites using s pseudo-regular expression.  
		 * The format of the regex is the same as that recognized by
		 * the open resources dialog: * represents any text, ? is a 
		 * single character.  And there is an implicit * at the end of
		 * the queryText.
		 *
		 * Empty queryText matches all favorites
		 * 
		 * @param queryText the name of the favorites to look for.  
		 * @return a possibly empty array of favorites that matches 
		 * the queryText
		 */
		queryFavorites: function(queryText) {
			var i;
			if (!queryText) {
				// matches all
				return this._favorites;
			}
			
			// convert query string
			// * --> .*
			// ? --> .?
			// $ --> \$  (and any other special chars
			var convertedQuery = "";
			for (i = 0; i < queryText.length; i++) {
				var c = queryText.charAt(i);
				if (c === "*") { //$NON-NLS-0$
					convertedQuery += ".*"; //$NON-NLS-0$
				} else if (c === "?") { //$NON-NLS-0$
					convertedQuery += ".?"; //$NON-NLS-0$
				} else if (this._SPECIAL_CHARS.indexOf(c) >= 0) {
					convertedQuery += ("\\" + c); //$NON-NLS-0$
				} else {
					convertedQuery += c;
				}
			}
			convertedQuery += ".*"; //$NON-NLS-0$
			var regex = new RegExp(convertedQuery);
			
			// for now, just search the beginning, but we need to support
			// the regex that is available in open resources dialog
			var result = [];
			for (i in this._favorites) {
				if (this._favorites[i].name.search(regex) === 0) {
					result.push(this._favorites[i]);
				}
			}
			return result;
		},
		
		_initializeFavorites: function () {
			var favorites = this;
			this._registry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs) {  //$NON-NLS-1$ //$NON-NLS-0$
				var i;
				var navigate = prefs.get("navigate"); //$NON-NLS-0$
				if (typeof navigate === "string") { //$NON-NLS-0$
					navigate = JSON.parse(navigate);
				}
				if (navigate) {
					for (i in navigate) {
						navigate[i].isFavorite = true;  // migration code, may not have been stored
						favorites._favorites.push(navigate[i]);
					}
				}

				favorites._favorites.sort(favorites._sorter);
				favorites._notifyListeners();
			});
		}, 
		
		_storeFavorites: function() {
			var storedFavorites = this._favorites;
			this._registry.getService("orion.core.preference").getPreferences("/window/favorites").then(function(prefs){ //$NON-NLS-1$ //$NON-NLS-0$
				prefs.put("navigate", storedFavorites); //$NON-NLS-0$
			}); 
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
		},
		
		getFavorites: function() {
			return {navigator: this._favorites};
		}
	};
	FavoritesService.prototype.constructor = FavoritesService;

	//return module exports
	return {
		FavoritesService: FavoritesService
	};
});
