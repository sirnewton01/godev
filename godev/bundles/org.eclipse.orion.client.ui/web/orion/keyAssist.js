/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window document define */
define([
	'i18n!orion/nls/messages',
	'orion/webui/littlelib',
	'orion/util'
], function (messages, lib, util) {

	function KeyAssistPanel(options) {
		this.commandRegistry = options.commandRegistry;
		this.create();
		this._filterString = "";
		this._providers = [];
	}
	KeyAssistPanel.prototype = {
		addProvider: function(provider) {
			this._providers.push(provider);	
		},
		create: function () {
			var keyAssistDiv = this._keyAssistDiv = document.createElement("div"); //$NON-NLS-0$
			keyAssistDiv.id = "keyAssist"; //$NON-NLS-0$
			keyAssistDiv.style.display = "none"; //$NON-NLS-0$
			keyAssistDiv.classList.add("keyAssistFloat"); //$NON-NLS-0$
			keyAssistDiv.setAttribute("role", "menu"); //$NON-NLS-1$ //$NON-NLS-0$
			var keyAssistInput = this._keyAssistInput = document.createElement("input"); //$NON-NLS-0$
			keyAssistInput.classList.add("keyAssistInput"); //$NON-NLS-0$
			keyAssistInput.type = "text"; //$NON-NLS-0$
			keyAssistInput.placeholder = messages["Filter bindings"];
			keyAssistDiv.appendChild(keyAssistInput);
			var keyAssistContents = this._keyAssistContents = document.createElement("div"); //$NON-NLS-0$
			keyAssistContents.classList.add("keyAssistContents"); //$NON-NLS-0$
			if (util.isIOS || util.isAndroid) {
				keyAssistContents.style.overflowY = "auto"; //$NON-NLS-0$
			}
			keyAssistDiv.appendChild(keyAssistContents);
			var keyAssistTable = this._keyAssistTable = document.createElement('table'); //$NON-NLS-0$
			keyAssistTable.tabIndex = 0;
			keyAssistTable.classList.add("keyAssistList"); //$NON-NLS-0$
			keyAssistContents.appendChild(keyAssistTable);
			document.body.appendChild(keyAssistDiv);
			keyAssistInput.addEventListener("keydown", function (e) { //$NON-NLS-0$
				this._keyDown(e);
			}.bind(this));
			keyAssistTable.addEventListener("keydown", function (e) { //$NON-NLS-0$
				this._keyDown(e);
			}.bind(this));
			keyAssistInput.addEventListener("input", function (e) { //$NON-NLS-0$
				this.filterChanged();
			}.bind(this));
			keyAssistContents.addEventListener(util.isFirefox ? "DOMMouseScroll" : "mousewheel", function (e) { //$NON-NLS-1$ //$NON-NLS-0$
				this._scrollWheel(e);
			}.bind(this));
			document.addEventListener("keydown", function (e) { //$NON-NLS-0$
				if (e.keyCode === lib.KEY.ESCAPE) {
					this.hide();
				}
			}.bind(this));
			lib.addAutoDismiss([keyAssistDiv], function () {
				this.hide();
			}.bind(this));
		},
		createContents: function () {
			var table = this._keyAssistTable;
			lib.empty(table);
			this._selectedIndex = -1;
			this._selectedRow = null;
			this._keyAssistContents.scrollTop = 0;
			this._idCount = 0;
			for (var i=0; i<this._providers.length; i++) {
				this._providers[i].showKeyBindings(this);
			}
			this.createHeader(messages["Global"]);
			this.commandRegistry.showKeyBindings(this);
		},
		createItem: function (bindingString, name, execute) {
			if (this._filterString) {
				var s = this._filterString.toLowerCase(),
					insensitive;
				if (s !== this._filterString) {
					s = this._filterString;
					insensitive = function (str) {
						return str;
					};
				} else {
					insensitive = function (str) {
						return str.toLowerCase();
					};
				}
				if (insensitive(name).indexOf(s) === -1 && insensitive(bindingString).indexOf(s) === -1 && insensitive(this._lastHeader).indexOf(s) === -1) {
					return;
				}
			}
			var row = this._keyAssistTable.insertRow(-1);
			row.id = "keyAssist-keyBinding-" + this._idCount++; //$NON-NLS-0$
			row.setAttribute("role", "menuitem"); //$NON-NLS-1$ //$NON-NLS-0$
			row._execute = execute;
			row.classList.add("keyAssistItem"); //$NON-NLS-0$
			row.addEventListener("click", function (e) { //$NON-NLS-0$
				this._selectedRow = row;
				this.execute();
				e.preventDefault();
			}.bind(this));
			var column = row.insertCell(-1);
			column.classList.add("keyAssistName"); //$NON-NLS-0$
			column.appendChild(document.createTextNode(name));
			column = row.insertCell(-1);
			column.classList.add("keyAssistAccel"); //$NON-NLS-0$
			column.appendChild(document.createTextNode(bindingString));
		},
		createHeader: function (name) {
			this._lastHeader = name;
			var row = this._keyAssistTable.insertRow(-1);
			row.classList.add("keyAssistSection"); //$NON-NLS-0$
			var column = row.insertCell(-1);
			var heading = document.createElement("h2"); //$NON-NLS-0$
			heading.appendChild(document.createTextNode(name));
			column.appendChild(heading);
		},
		execute: function () {
			window.setTimeout(function () {
				this.hide();
				var row = this._selectedRow;
				this._selectedRow = null;
				if (row && row._execute) {
					row._execute();
				}
			}.bind(this), 0);
		},
		filterChanged: function () {
			if (this._timeout) {
				window.clearTimeout(this._timeout);
			}
			this._timeout = window.setTimeout(function () {
				this._timeout = null;
				var value = this._keyAssistInput.value;
				if (this._filterString !== value) {
					this._filterString = value;
					this.createContents();
				}
			}.bind(this), 100);
		},
		hide: function () {
			if (!this.isVisible()) {
				return;
			}
			var activeElement = document.activeElement;
			var keyAssistDiv = this._keyAssistDiv;
			var hasFocus = keyAssistDiv === activeElement || (keyAssistDiv.compareDocumentPosition(activeElement) & 16) !== 0;
			keyAssistDiv.style.display = "none"; //$NON-NLS-0$
			if (hasFocus && document.compareDocumentPosition(this._previousActiveElement) !== 1) {
				this._previousActiveElement.focus();
			}
			this._previousActiveElement = null;
		},
		isVisible: function () {
			return this._keyAssistDiv.style.display === "block"; //$NON-NLS-0$
		},
		removeProvider: function(provider) {
			var index = this._providers.indexOf(provider);
			if (index !== -1) {
				this._providers.splice(index, 1);
			}
		},
		select: function (forward) {
			var rows = this._keyAssistTable.querySelectorAll(".keyAssistItem"), row; //$NON-NLS-0$
			if (rows.length === 0) {
				this._selectedIndex = -1;
				return;
			}
			var selectedIndex = this._selectedIndex;
			selectedIndex += forward ? 1 : -1;
			selectedIndex %= rows.length;
			if (selectedIndex < 0) {
				selectedIndex = rows.length - 1;
			}
			if (this._selectedIndex !== -1) {
				row = rows[this._selectedIndex];
				row.classList.remove("selected"); //$NON-NLS-0$
				this._selectedRow = null;
			}
			this._selectedIndex = selectedIndex;
			if (this._selectedIndex !== -1) {
				this._selectedRow = row = rows[this._selectedIndex];
				row.classList.add("selected"); //$NON-NLS-0$
				this._keyAssistTable.setAttribute("aria-activedescendant", row.id); //$NON-NLS-0$
				this._keyAssistTable.focus();
				var rowRect = row.getBoundingClientRect();
				var parent = this._keyAssistContents;
				var rect = parent.getBoundingClientRect();
				if (row.offsetTop < parent.scrollTop) {
					if (selectedIndex === 0) {
						parent.scrollTop = 0;
					} else {
						row.scrollIntoView(true);
					}
				} else if (rowRect.bottom > rect.bottom) {
					row.scrollIntoView(false);
				}
			}
		},
		show: function () {
			if (this.isVisible()) {
				return;
			}
			this._previousActiveElement = document.activeElement;
			this.createContents();
			this._keyAssistContents.style.height = Math.floor(this._keyAssistDiv.parentNode.clientHeight * 0.75) + "px"; //$NON-NLS-0$
			this._keyAssistDiv.style.display = "block"; //$NON-NLS-0$
			this._keyAssistInput.value = this._filterString;
			this._keyAssistInput.focus();
			this._keyAssistInput.select();
		},
		_keyDown: function (e) {
			if (e.keyCode === 40) {
				this.select(true);
			} else if (e.keyCode === 38) {
				this.select(false);
			} else if (e.keyCode === 13) {
				this.execute();
			} else {
				return;
			}
			e.preventDefault();
		},
		_scrollWheel: function (e) {
			var pixelY = 0;
			if (util.isIE || util.isOpera) {
				pixelY = -e.wheelDelta;
			} else if (util.isFirefox) {
				pixelY = e.detail * 40;
			} else {
				pixelY = -e.wheelDeltaY;
			}
			var parent = this._keyAssistContents;
			var scrollTop = parent.scrollTop;
			parent.scrollTop += pixelY;
			if (scrollTop !== parent.scrollTop) {
				if (e.preventDefault) {
					e.preventDefault();
				}
				return false;
			}
		}
	};

	return {
		KeyAssistPanel: KeyAssistPanel
	};
});