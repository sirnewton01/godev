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
/*eslint-env browser, amd*/
define([
	'orion/explorers/explorer',
	'orion/objects',
	'orion/uiUtils',
	'orion/Deferred',
	'orion/webui/littlelib'
], function(mExplorer, objects, mUIUtils, Deferred, lib) {
	
	function JSONModel(root) {
		this._root = {key: "json", value: root, id: "json"}; //$NON-NLS-0$ //$NON-NLS-1$
		this._id = "json"; //$NON-NLS-0$
	}
	JSONModel.prototype = /** @lends orion.sites.SiteTreeModel.prototype */{
		getRoot: function(/**function*/ onItem) {
			onItem(this._root);
		},
		
		getChildren: function(/**Object*/ parentItem, /**Function(items)*/ onComplete) {
			if (parentItem.children) {
				onComplete(parentItem.children);
				return;
			}
			var children = [];
			var value = parentItem.value;
			if (Array.isArray(value)) {
				for (var i=0; i<value.length; i++) {
					children.push ({key: String(i), value: value[i], id: parentItem.id + "-" + i, parent: parentItem}); //$NON-NLS-0$
				}
			} else if (typeof value === "object" && value) { //$NON-NLS-0$
				Object.keys(value).sort().forEach(function(key) {
					children.push({key: key, value: value[key], id: parentItem.id + "-" + key, parent: parentItem}); //$NON-NLS-0$
				});
			}
			parentItem.children = children;
			onComplete(children);
		},
		getId: function(/**Object|String*/ item) {
			return item.id;
		}
	};
	
	function JSONRenderer(options, explorer) {
		this._init(options);
		this.options = options;
		this.explorer = explorer;
	}
	JSONRenderer.prototype = new mExplorer.SelectionRenderer();
	objects.mixin(JSONRenderer.prototype, {
		labelColumnIndex: 0,
		emptyCallback: function(bodyElement) {
			var msg = this.explorer.emptyMessage;
			if (!msg) { return; }
			var tr = document.createElement("tr"); //$NON-NLS-0$
			var td = document.createElement("td"); //$NON-NLS-0$
			td.colSpan = 3;
			var noContent = document.createElement("div"); //$NON-NLS-0$
			noContent.classList.add("emptyJSON"); //$NON-NLS-0$
			noContent.appendChild(document.createTextNode(msg));
			td.appendChild(noContent);
			tr.appendChild(td);
			bodyElement.appendChild(tr);
		},
		getCellElement: function(col_no, item, tableRow) {
			var col, span;
	        switch (col_no) {
				case 0:
					col = document.createElement('td'); //$NON-NLS-0$
					if (Array.isArray(item.value) || typeof item.value === "object") { //$NON-NLS-0$
						col.noWrap = true;
						this.getExpandImage(tableRow, col); //$NON-NLS-0$
	                } else {
	                	var img = document.createElement("scan"); //$NON-NLS-0$
	                	img.classList.add("typeimage"); //$NON-NLS-0$
	                	if (typeof item.value === "number") { //$NON-NLS-0$
							img.classList.add("numbertype"); //$NON-NLS-0$
						} else if (typeof item.value === "boolean") { //$NON-NLS-0$
							img.classList.add("booleantype"); //$NON-NLS-0$
						} else if (typeof item.value === "string") { //$NON-NLS-0$
							img.classList.add("stringtype"); //$NON-NLS-0$
						}
						col.appendChild(img);
	                }
					span = document.createElement("span"); //$NON-NLS-0$
					col.appendChild(span);
	                span.isKey = item.parent && !Array.isArray(item.parent.value);
					span.appendChild(document.createTextNode(item.key));
					span.classList.add("tablelabel"); //$NON-NLS-0$
	                return col;
	            case 1:
					col = document.createElement('td'); //$NON-NLS-0$
					span = document.createElement("span"); //$NON-NLS-0$
					var t = "";
					if (item.value === null) {
						t = "null"; //$NON-NLS-0$
					} else if (item.value === undefined) {
						t = "undefined"; //$NON-NLS-0$
					} else if (!(Array.isArray(item.value) || typeof item.value === "object")) { //$NON-NLS-0$
						t = item.value;
					} else if (Array.isArray(item.value)) {
						t = "[]"; //$NON-NLS-0$
					} else if (typeof item.value === "object") { //$NON-NLS-0$
						t = "{}"; //$NON-NLS-0$
					}
					span.isValue = true;
					span.appendChild(document.createTextNode(t));
					col.appendChild(span);
					span.classList.add("tablelabel"); //$NON-NLS-0$
	                return col;
	            case 2:
					col = document.createElement('td'); //$NON-NLS-0$
					span = document.createElement("span"); //$NON-NLS-0$
					var type = "object"; //$NON-NLS-0$
					if (Array.isArray(item.value)) {
						type = "array"; //$NON-NLS-0$
					} else if (typeof item.value === "number") { //$NON-NLS-0$
						type = "number"; //$NON-NLS-0$
					} else if (typeof item.value === "boolean") { //$NON-NLS-0$
						type = "boolean"; //$NON-NLS-0$
					} else if (typeof item.value === "string") { //$NON-NLS-0$
						type = "string"; //$NON-NLS-0$
					}
					span.appendChild(document.createTextNode(type));
					col.appendChild(span);
	                return col;
			}
		}
	});
	
	function JSONExplorer(options) {
		this.checkbox = false;
		this.parentId = options.parentId;
		this.update = options.update;
		var self = this;
		var parent = lib.node(this.parentId);
		parent.addEventListener("click", function(evt) { //$NON-NLS-0$
			var target = evt.target;
			if (target.isKey || target.isValue) {
				var itemNode = target, temp = itemNode;
				var id = itemNode.id+"EditBox"; //$NON-NLS-0$
				if (lib.node(id)) {
					return;
				}
				while (temp) {
					if (temp._item) {
						break;
					}
					temp = temp.parentNode;
				}
				var item = temp._item;
				var text = target.textContent;
				function doChange(name) {
					if (target.isValue) {
						var newValue = name;
						if (name === "null") { //$NON-NLS-0$
							newValue = null;
						} else if (name === "true") { //$NON-NLS-0$
							newValue = true;
						} else if (name === "false") { //$NON-NLS-0$
							newValue = false;
						} else if (name.charAt(0) >= '0' && name.charAt(0) <= "9") { //$NON-NLS-1$ //$NON-NLS-0$
							try {
								newValue = parseInt(name);
							} catch (e) {}
						} else if (name.charAt(0) === '"' || name.charAt(0) === "'") { //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							newValue = name.substring(1, name.length - 1);
						} else if (name.charAt(0) === '{' || name.charAt(0) === '[') { //$NON-NLS-1$ //$NON-NLS-0$
							try {
								newValue = JSON.parse(name);
							} catch (e) {}
						}
						item.parent.value[item.key] = newValue;
						self.update(item);
					} else {
						if (!item.parent.value[name]) {
							item.parent.value[name] = item.value;
							delete item.parent.value[item.key];
							self.update({key: name, value: item.value, id: item.parent.id + "-" + name, parent: item.parent}); //$NON-NLS-0$
						}
					}
				}

				mUIUtils.getUserText({
					id: id,
					refNode: target, 
					hideRefNode: true, 
					initialText: text, 
					onComplete: doChange
				});
			}
		});
	}
	JSONExplorer.prototype = new mExplorer.Explorer();
	objects.mixin(JSONExplorer.prototype, {
		display: function(json) {
			this.json = json;
			lib.empty(this.parentId);
			this.renderer = new JSONRenderer({}, this);
			this.createTree(this.parentId, new JSONModel(json || {}), {
				selectionPolicy: "cursorOnly", //$NON-NLS-0$
			});
		},
		expandItem: function(item) {
			var deferred = new Deferred();
			this.showItem(item).then(function(result) {
				if (this.myTree.isExpanded(result)) {
					deferred.resolve(result);
				} else {
					this.myTree.expand(this.model.getId(result), function() {
						deferred.resolve(result);
					});
				}
			}.bind(this), deferred.reject);
			return deferred;
		},
		reveal: function(item) {
			return this.showItem(item).then(function(result) {
				var navHandler = this.getNavHandler();
				if (navHandler) {
					navHandler.cursorOn(result, true);
				}
				return result;
			}.bind(this));
		},
		showItem: function(item) {
			var deferred = new Deferred();
			var row = this.getRow(item);
			if (row) {
				deferred.resolve(row._item || item);
			} else if (item.parent) {
				return this.expandItem(item.parent).then(function(parent) {
					var row = this.getRow(item);
					if (!row) {
						return new Deferred().reject();
					}
					return row._item || item;
				}.bind(this));
			}
			return deferred;
		}
	});
	
	return {
		JSONExplorer: JSONExplorer
	}
});
