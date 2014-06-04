/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global URL*/
/*jslint amd:true browser:true*/

define([
	'orion/commands',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/PageLinks',
	'orion/PageUtil',
	'orion/URITemplate',
	'orion/URL-shim',
	'orion/util'
], function(mCommands, objects, lib, PageLinks, PageUtil, URITemplate) {

	function SideMenu(parentNode, contentNode){
		this.parentNode = lib.node(parentNode);
		this.contentNode = lib.node(contentNode);
		if (!this.parentNode) {
			throw new Error("Missing parentNode");
		}
		this.menuitems = Object.create(null); // Maps category id {String} to menuitem
		this.links = null;
		this.categories = null;

		this.anchor = document.createElement("ul"); //$NON-NLS-0$
		this.anchor.classList.add("sideMenuList"); //$NON-NLS-0$
		this.parentNode.appendChild(this.anchor);

		this.anchor.addEventListener("click", this._handleEvent.bind(this)); //$NON-NLS-0$
		this.anchor.addEventListener("touchstart", this._handleEvent.bind(this)); //$NON-NLS-0$
		// useCapture allows focus event from a submenu-trigger to bubble up to anchor
		this.anchor.addEventListener("focus", this._handleEvent.bind(this), true /*useCapture*/); //$NON-NLS-0$
		lib.addAutoDismiss([this.anchor], this._expandMenu.bind(this, null)); //$NON-NLS-0$
	}
	objects.mixin(SideMenu.prototype, {
		LOCAL_STORAGE_NAME: "sideMenuNavigation",
		OPEN_STATE: "open",
		CLOSED_STATE: "closed",
		DEFAULT_STATE: "open",
		SIDE_MENU_OPEN_WIDTH: "40px",
		TRANSITION_DURATION_MS: 301, /* this should always be greater than the duration of the left transition of .content-fixedHeight */
		
		addMenuItem: function( imageClassName, categoryId, isActive ){
			var anchor = this.anchor;
			
			var listItem = this.createListItem(imageClassName, categoryId);
			if (isActive)
				listItem.classList.add("sideMenuItemActive"); //$NON-NLS-0$
			
			anchor.appendChild( listItem );
		
			this.menuitems[categoryId] = listItem;
		},
		setSideMenu: function(){
			var sideMenuNavigation = this.getDisplayState();
			
			var parent = this.parentNode;
			
			if( parent ){
				
				if( sideMenuNavigation === this.CLOSED_STATE ){
					this.setPageContentLeft("0"); //$NON-NLS-0$
					if (this._timeout) {
						window.clearTimeout(this._timeout);
						this._timeout = null;
					}
					this._timeout = window.setTimeout(function() {
						parent.style.display = 'none'; //$NON-NLS-0$
					}, this.TRANSITION_DURATION_MS);
					parent.classList.add("animating"); //$NON-NLS-0$
				}
				
				if( sideMenuNavigation === this.OPEN_STATE ){
					if (this._timeout) {
						window.clearTimeout(this._timeout);
						this._timeout = null;
					}
					parent.classList.remove("animating"); //$NON-NLS-0$
					parent.style.display = 'block'; //$NON-NLS-0$
					parent.style.width = this.SIDE_MENU_OPEN_WIDTH;
					this.setPageContentLeft(this.SIDE_MENU_OPEN_WIDTH);
				}
				
			}
		},
		setPageContentLeft: function( left ){
			var pageContent = this.contentNode;
			if (pageContent) {
				pageContent.style.left = left;
			}
		},
		hideMenu: function (){
			localStorage.setItem(this.LOCAL_STORAGE_NAME, this.CLOSED_STATE);
			this.setPageContentLeft("0"); //$NON-NLS-0$
		},
		toggleSideMenu: function(){
			var sideMenuNavigation = this.getDisplayState();
			
			var newState;
			
			// add animation if necessary
			var pageContent = this.contentNode;
			if (pageContent) {
				pageContent.classList.add("content-fixedHeight-animation"); //$NON-NLS-0$
			}
			
			if( sideMenuNavigation === this.OPEN_STATE ){
				newState = this.CLOSED_STATE;
			} else {
				newState = this.OPEN_STATE;
			}
	
			if (newState === this.DEFAULT_STATE) {
				localStorage.removeItem(this.LOCAL_STORAGE_NAME);
			} else {
				localStorage.setItem(this.LOCAL_STORAGE_NAME, newState);
			}
			
			this.setSideMenu();
		},
		clearMenuItems: function() {
			this.menuitems = [];
			lib.empty(this.anchor);
		},
		getMenuItems: function() {
			var menuitems = this.menuitems;
			return Object.keys(menuitems).map(function(id) {
				return menuitems[id];
			});
		},
		getMenuItem: function(catId) {
			return this.menuitems[catId];
		},
		getDisplayState: function() {
			var state = localStorage.getItem(this.LOCAL_STORAGE_NAME);
			if (!state) {
				state = this.DEFAULT_STATE;
			}
			return state;
		},
		createListItem: function(imageClassName, categoryId) {
			var listItem = document.createElement( 'li' ); //$NON-NLS-0$
			listItem.className = imageClassName;
			listItem.classList.add("sideMenuItem"); //$NON-NLS-0$
			listItem.categoryId = categoryId;
			return listItem;
		},
		// Should only be called once
		setCategories: function(categories) {
			this.categories = categories;
			this.links = Object.create(null); // Maps category ID {String} to link DOM elements {Element[]}
		},
		// Should only be called once
		setPageLinks: function(pagelinks) {
			this.pageLinks = pagelinks;

			var _self = this;
			var elements = pagelinks.createLinkElements();
			pagelinks.getAllLinks().forEach(function(pagelink, i) {
				var linkElement = elements[i];
				linkElement.source = pagelink;
				var array = _self._getLinksBin(pagelink.category);
				array.push(linkElement);
			});
			this._renderLinks();
		},
		/**
		 * Called whenever the page target changes.
		 * @param {Object} relatedLinks
		 * @param {String[]} exclusions List of related link IDs that the page has requested to not be shown.
		 */
		setRelatedLinks: function(relatedLinks, exclusions) {
			this.relatedLinks = relatedLinks;

			var _self = this;
			// clean out existing related links
			Object.keys(this.links).forEach(function(catId) {
				var linkBin = _self._getLinksBin(catId);
				_self.links[catId] = linkBin.filter(isNotRelatedLink);
			});

			// add new ones
			var linkHolder = document.createDocumentFragment();
			relatedLinks.forEach(function(commandItem) {
				var relatedLink = commandItem.relatedLink;
				var linkBin = _self._getLinksBin(relatedLink.category);
				var relatedLinkElement = mCommands.createCommandMenuItem(linkHolder, commandItem.command, commandItem.invocation);
				relatedLinkElement.classList.remove("dropdownMenuItem");
				relatedLinkElement.isRelatedLink = true;
				relatedLinkElement.source = relatedLink;
				linkBin.push(relatedLinkElement);
			});
			this._renderLinks(exclusions);
		},
		/** @returns Array where link elements should be pushed for the given category */
		_getLinksBin: function(catId) {
			if (catId) {
				var links = this.links;
				links[catId] = links[catId] || [];
				return links[catId];
			} else {
				// TODO create a default "misc" category instead of ignoring 
				return [];
			}
		},
		_sort: function() {
			var links = this.links;
			var catIds = Object.keys(links);
			catIds.forEach(function(key) {
				// Sort the links within this category
				links[key].sort(compareLinkElements);
			});
		},
		_renderCategories: function() {
			var categories = this.categories, _self = this;
			var currentURL = new URL(window.location.href), pageParams = PageUtil.matchResourceParameters();
			pageParams.OrionHome = PageLinks.getOrionHome();
			var activeCategoryKnown = false;
			this.clearMenuItems();
			categories.getCategoryIDs().map(function(catId) {
				return categories.getCategory(catId);
			}).sort(compareCategories).forEach(function(cat) {
				var catLinks = _self._getLinksBin(cat.id);
				if (!catLinks.length)
					return; // do not render empty categories

				if (activeCategoryKnown) {
					_self.addMenuItem(cat.imageClass, cat.id, false);
				} else {
					var isActive = catLinks.some(function(link) {
						if (!link.source.uriTemplate) {
							// Should not happen -- every link has a uriTemplate
							return false;
						}
						var uriTemplate = new URITemplate(link.source.uriTemplate);
						var templateURL = new URL(uriTemplate.expand(pageParams), window.location);
						if (samePageURL(templateURL, currentURL)) {
							return (activeCategoryKnown = true);
						}
						return false;
					});
					_self.addMenuItem(cat.imageClass, cat.id, isActive);
				}
			});
		},
		_renderLinks: function(exclusions) {
			exclusions = exclusions || [];
			this._sort();

//			debug.call(this);

			// Start fresh. This creates menuitems anew
			this._renderCategories();

			var _self = this, windowHref = window.location.href;
			// Append link elements to each menu item
			Object.keys(this.menuitems).forEach(function(catId) {
				var menuitem = _self.getMenuItem(catId);
				if (!menuitem)
					return;
				var bin = _self._getLinksBin(catId).slice();
				bin = bin.filter(function(link) {
					// Don't render links that the page has requested we exclude, nor a non-default-link that links to the current page.
					// However! If the link has force==true then it wants to be shown despite being a no-op link.
					var source = link.source;
					if (exclusions.indexOf(source.id) >= 0 || (!source.default && !source.force && link.href === windowHref))
						return false;
					return true;
				});
				// Don't render a default link if (i) there are others available in this category and (ii) it isn't force'd
				bin = bin.filter(function(link) {
					var source = link.source;
					return !(bin.length > 1 && source.default && !source.force);
				});
				// Filter out duplicate links (we sorted bin earlier, so any duplicates are consecutive elements)
				for (var i = bin.length-1; i > 0; i--) {
					var a = bin[i], b = bin[i-1];
					if (a.href === b.href) {
						bin.splice(i, 1); // remove one of the dupes
					}
				}
				if (!bin.length) {
					// Empty category: can happen if the page has excluded every command in this category
					return;
				}

				// First link becomes the icon link
				menuitem.appendChild(_self._createCategoryElement(catId, menuitem, bin[0]));
			});
		},
		_createCategoryElement: function(catId, menuitem, linkElement) {
			var category = this.categories.getCategory(catId);
			var element = document.createElement("a"); //$NON-NLS-0$
			element.href = linkElement.href;
			element.classList.add("submenu-trigger"); //$NON-NLS-0$
			element.tabIndex = "0"; //$NON-NLS-0$
			element.title = catId;
			if (linkElement.source && (linkElement.source.tooltip || linkElement.source.tooltipKey || linkElement.source.textContent)) {
				element.title = linkElement.source.tooltip || linkElement.source.tooltipKey || linkElement.source.textContent;
			}
			if (category.imageClass) {
				element.classList.add(category.imageClass);
				menuitem.classList.remove(category.imageClass); // remove icon from menuitem; on link instead
			} else if (typeof category.imageDataURI === "string" && category.imageDataURI.indexOf("data:image") === 0) {
				var img = document.createElement("img");
				img.width="16";
				img.height="16";
				img.src = category.imageDataURI;
				element.appendChild(img);
			}
			return element;
		},
		_handleEvent: function(event) {
			var target = event.target, isFocus = event.type === "focus"; //$NON-NLS-0$
			if (target.tagName === "A" && !isFocus)
				return; // do not interfere with link clicking
			if (isMenuTrigger(target) && (isFocus)) {
				this._expandMenu(getMenu(target));
			}
		},
		/**
		 * @param {Element} [menu] Submenu to expand, or null to collapse all menus.
		 */
		_expandMenu: function(menu) {
			// Un-expand every other menu
			this.getMenuItems().forEach(function(item) {
				var itemMenu = lib.$(".sideMenuSubMenu", item); //$NON-NLS-0$
				if (menu === itemMenu)
					return;
				itemMenu.classList.remove("expanded"); //$NON-NLS-0$
			});
			if (menu)
				menu.classList.toggle("expanded"); //$NON-NLS-0$
		}
	});

	function isMenuTrigger(node) {
		return node.classList.contains("submenu-trigger"); //$NON-NLS-0$
	}

	function getMenu(triggerNode) {
		return lib.$(".sideMenuSubMenu", triggerNode.parentNode); //$NON-NLS-0$
	}

	function isNotRelatedLink(elem) {
		return !elem.isRelatedLink;
	}

	// Hack. Compare URLs, ignoring hashes, to determine "equality" as far as this menu is concerned
	function samePageURL(a, b) {
		return a.protocol === b.protocol && a.host === b.host && a.hostname === b.hostname && a.port === b.port
			&& a.pathname === b.pathname && a.search === b.search;
	}

	function compareCategories(c1, c2) {
		var o1 = c1.order, o2 = c2.order;
		if (o1 < o2)
			return -1;
		else if (o2 < o1)
			return 1;
		return 0;
	}

	function compareLinkElements(link1, link2) {
		var o1 = link1.source.order, o2 = link2.source.order;
		o1 = typeof o1 === "number" ? o1 : 100;
		o2 = typeof o2 === "number" ? o2 : 100;
		if (o1 === o2) // fall back to text compare
			return link1.textContent.localeCompare(link2.textContent);
		else if (o1 < o2)
			return -1;
		else
			return 1;
	}

	return SideMenu;
});

