/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/EventTarget', 'orion/webui/littlelib', 'orion/commonHTMLFragments', 'orion/objects', 	'orion/selection'], function(EventTarget, lib, mHTMLFragments, objects, Selection){
	
	/**
	 * Generates a section
	 * 
	 * @name orion.widgets.Section
	 * @class Generates a section
	 * @param {DomNode} parent parent node
	 * @param {DomNode} sibling if specified, the section will be inserted after the sibling
	 * @param {String} options.id id of the section header
	 * @param {String} options.title title (in HTML) of the section
	 * @param {orion.preferences.PreferencesService} [options.preferenceService] used to store the hidden/shown state of the section if specified
	 * @param {String|Array} [options.headerClass] a class or array of classes to use in the section header, in addition to the default header classes
	 * @param {String|Array} [options.iconClass] a class or array of classes to use in the icon decorating section, no icon displayed if not provided
	 * @param {Function} [options.getItemCount] function to return the count of items in the section. If not provided, no count is shown.
	 * @param {String|DomNode} [options.content] HTML or DOM node giving the Section's initial contents. May be set later using {@link #setContent()}
	 * @param {Boolean} [options.slideout] if true section will contain generated slideout
	 * @param {Boolean} [options.canHide] if true section may be hidden
	 * @param {Boolean} [options.hidden] if true section will be hidden at first display
	 * @param {Boolean} [options.useAuxStyle] if true the section will be styled for an auxiliary pane
	 * @param {Boolean} [options.keepHeader] if true the embedded explorer will keep its header
	 * @param {Boolean} [options.noTwisties] if true the twisties will not be displayed
	 * @param {Boolean} [options.dropdown] if true the section is dropdown
	 * @param {Function} [options.onExpandCollapse] a function that will be called when the expanded/collapsed state changes
	 *
	 * @borrows orion.editor.EventTarget#addEventListener as #addEventListener
	 * @borrows orion.editor.EventTarget#removeEventListener as #removeEventListener
	 * @borrows orion.editor.EventTarget#dispatchEvent as #dispatchEvent
	 */
	function Section(parent, options) {
		EventTarget.attach(this);
		
		var that = this;
		
		this._expandImageClass = "core-sprite-openarrow"; //$NON-NLS-0$
		this._collapseImageClass = "core-sprite-closedarrow"; //$NON-NLS-0$
		this._progressImageClass = "core-sprite-progress"; //$NON-NLS-0$
		this._twistieSpriteClass = "modelDecorationSprite"; //$NON-NLS-0$
		
		// ...
		
		if (!options.id) {
			throw new Error("Missing required argument: id"); //$NON-NLS-0$
		}
		this.id = options.id;
				
		if (!options.title) {
			throw new Error("Missing required argument: title"); //$NON-NLS-0$
		}

		// setting up the section
		var wrapperClasses = options.useAuxStyle ? ["sectionWrapper", "sectionWrapperAux", "toolComposite"] : ["sectionWrapper", "toolComposite"]; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		this.domNode = document.createElement("div"); //$NON-NLS-0$
		if (options.sibling) {
			parent.insertBefore(this.domNode, options.sibling);
		} else {
			parent.appendChild(this.domNode);
		}
		for(var i=0; i<wrapperClasses.length; i++) {
			this.domNode.classList.add(wrapperClasses[i]);
		}
		this.domNode.id = options.id;

		// if canHide, add twistie and stuff...
		this.canHide = options.canHide;
		if(options.canHide){
			this.domNode.style.cursor = "pointer"; //$NON-NLS-0$
			if (!options.noTwistie) {
				this.twistie = document.createElement("span"); //$NON-NLS-0$
				this.twistie.classList.add("modelDecorationSprite"); //$NON-NLS-0$
				this.twistie.classList.add("layoutLeft"); //$NON-NLS-0$
				this.twistie.classList.add("sectionTitleTwistie"); //$NON-NLS-0$
				this.domNode.appendChild(this.twistie);
			}
			this.domNode.tabIndex = 0; //$NON-NLS-0$
			this.domNode.addEventListener("click", function(evt) { //$NON-NLS-0$
				if (evt.target === that.titleNode || evt.target === that.twistie || evt.target === that.domNode || evt.target === that._iconNode || evt.target === that.dropdownArrow) {
					that._changeExpandedState();
				}
			}, false);
			this.domNode.addEventListener("keydown", function(evt) { //$NON-NLS-0$
				if (evt.target === that.domNode || evt.target === that.titleNode || evt.target === that.twistie) {
					if(evt.keyCode === lib.KEY.ENTER) {
						that._changeExpandedState();
					} else if(evt.keyCode === lib.KEY.DOWN && that.dropdown) {
						that.setHidden(false);
					} else if(evt.keyCode === lib.KEY.UP && that.dropdown) {
						that.setHidden(true);
					} else if(evt.keyCode === lib.KEY.ESCAPE) {
						that.setHidden(true);
					}
				}
			}, false);
		}
		var classes;
		if(options.iconClass){
			var icon = this._iconNode = document.createElement("span"); //$NON-NLS-0$
			icon.classList.add("sectionIcon"); //$NON-NLS-0$
			this.domNode.appendChild(icon);
			classes = Array.isArray(options.iconClass) ? options.iconClass : [options.iconClass];
			classes.forEach(function(aClass) {
				icon.classList.add(aClass);
			});
		}
		
		if(options.headerClass){
			classes = Array.isArray(options.headerClass) ? options.headerClass : [options.headerClass];
			classes.forEach(function(aClass) {
				this.domNode.classList.add(aClass);
			}.bind(this));
		}
		
		if(options.keepHeader){
			this._keepHeader = options.keepHeader;
		}

		this.titleActionsNode = document.createElement("div"); //$NON-NLS-0$
		this.titleActionsNode.id = options.id + "TitleActionsArea"; //$NON-NLS-0$
		this.titleActionsNode.classList.add("layoutLeft"); //$NON-NLS-0$
		this.titleActionsNode.classList.add("sectionActions"); //$NON-NLS-0$
		this.domNode.appendChild(this.titleActionsNode);

		this.titleNode = document.createElement("div"); //$NON-NLS-0$
		this.titleNode.id = options.id + "Title"; //$NON-NLS-0$
		this.titleNode.classList.add("sectionAnchor"); //$NON-NLS-0$
		this.titleNode.classList.add("sectionTitle"); //$NON-NLS-0$
		this.titleNode.classList.add("layoutLeft"); //$NON-NLS-0$
		this.domNode.appendChild(this.titleNode);
		this.titleNode.textContent = options.title;

		// Add item count
		if (typeof options.getItemCount === "function") { //$NON-NLS-0$
			var count = document.createElement("div"); //$NON-NLS-0$
			count.classList.add("layoutLeft"); //$NON-NLS-0$
			count.classList.add("sectionItemCount"); //$NON-NLS-0$
			this.domNode.appendChild(count);
			count.textContent = options.getItemCount(this);
		}

		this._progressNode = document.createElement("div"); //$NON-NLS-0$
		this._progressNode.id = options.id + "Progress"; //$NON-NLS-0$
		this._progressNode.classList.add("sectionProgress"); //$NON-NLS-0$
		this._progressNode.classList.add("sectionTitle"); //$NON-NLS-0$
		this._progressNode.classList.add("layoutLeft"); //$NON-NLS-0$
		this._progressNode.style.display = "none"; //$NON-NLS-0$
		this._progressNode.textContent = "..."; //$NON-NLS-0$ 
		this.domNode.appendChild(this._progressNode);
		
		this.titleLeftActionsNode = document.createElement("div"); //$NON-NLS-0$
		this.titleLeftActionsNode.id = options.id + "LeftTitleActionsArea"; //$NON-NLS-0$
		this.titleLeftActionsNode.classList.add("layoutLeft"); //$NON-NLS-0$
		this.titleLeftActionsNode.classList.add("sectionActions"); //$NON-NLS-0$
		this.domNode.appendChild(this.titleLeftActionsNode);
		
		if (options.dropdown && !options.noArrow) {
			this.dropdownArrow = document.createElement("div"); //$NON-NLS-0$
			this.dropdownArrow.classList.add("modelDecorationSprite"); //$NON-NLS-0$
			this.dropdownArrow.classList.add("layoutLeft"); //$NON-NLS-0$
			this.dropdownArrow.classList.add("sectionDropdownArrow"); //$NON-NLS-0$
			this.dropdownArrow.classList.add(this._expandImageClass);
			this.domNode.appendChild(this.dropdownArrow);
		}
		
		// add filter search box
		var searchbox = this.searchBox = document.createElement("div"); //$NON-NLS-0$
		searchbox.id = options.id + "FilterSearchBox"; //$NON-NLS-0$
		this.domNode.appendChild(searchbox);
		
		this._toolActionsNode = document.createElement("div"); //$NON-NLS-0$
		this._toolActionsNode.id = options.id + "ToolActionsArea"; //$NON-NLS-0$
		this._toolActionsNode.classList.add("layoutRight"); //$NON-NLS-0$
		this._toolActionsNode.classList.add("sectionActions"); //$NON-NLS-0$
		this.domNode.appendChild(this._toolActionsNode);
		this.actionsNode = document.createElement("ul"); //$NON-NLS-0$
		this.actionsNode.id = options.id + "ActionArea"; //$NON-NLS-0$
		this.actionsNode.classList.add("layoutRight"); //$NON-NLS-0$
		this.actionsNode.classList.add("commandList"); //$NON-NLS-0$
		this.actionsNode.classList.add("sectionActions"); //$NON-NLS-0$
		this.domNode.appendChild(this.actionsNode);
		this.selectionNode = document.createElement("ul"); //$NON-NLS-0$
		this.selectionNode.id = options.id + "SelectionArea"; //$NON-NLS-0$
		this.selectionNode.classList.add("layoutRight"); //$NON-NLS-0$
		this.selectionNode.classList.add("commandList"); //$NON-NLS-0$
		this.selectionNode.classList.add("sectionActions"); //$NON-NLS-0$
		this.domNode.appendChild(this.selectionNode);
		
		if(options.slideout){
			var slideoutFragment = mHTMLFragments.slideoutHTMLFragment(options.id);
			var range = document.createRange();
			range.selectNode(this.domNode);
			slideoutFragment = range.createContextualFragment(slideoutFragment);
			this.domNode.appendChild(slideoutFragment);
		}

		this._contentParent = document.createElement("div"); //$NON-NLS-0$
		this._contentParent.id = this.id + "Content"; //$NON-NLS-0$
		this._contentParent.role = "region"; //$NON-NLS-0$
		this._contentParent.classList.add("sectionTable"); //$NON-NLS-0$
		this._contentParent.setAttribute("aria-labelledby", this.titleNode.id); //$NON-NLS-0$
		if (options.sibling) {
			parent.insertBefore(this._contentParent, options.sibling);
		} else {
			parent.appendChild(this._contentParent);
		}

		if(options.content){
			this.setContent(options.content);
		}
		
		if (typeof(options.onExpandCollapse) === "function") { //$NON-NLS-0$
			this._onExpandCollapse = options.onExpandCollapse;
		}
		this._preferenceService = options.preferenceService;
		// initially style as hidden until we determine what needs to happen
		this._collapse();
		if (!options.dropdown) {
			// should we consult a preference?
			if (this._preferenceService) {
				var self = this;
				this._preferenceService.getPreferences("/window/views").then(function(prefs) {  //$NON-NLS-0$
					var isExpanded = prefs.get(self.id);
					
					if (isExpanded === undefined){
						// pref not found, check options
						if (!options.hidden) {
							self._expand();
						}
					} else if (isExpanded) {
						self._expand();
					}
					
					self._updateExpandedState(false);
				});
			} else {
				if (!options.hidden) {
					this._expand();
				}
				this._updateExpandedState(false);
			}
		} else {
			this._updateExpandedState(true);
			this.dropdown = true;
			this.positionNode = options.positionNode;
			lib.addAutoDismiss([this._contentParent, this.positionNode || this.domNode], function (event) {
				var temp = event.target;
				while (temp) {
					if (temp.classList && temp.classList.contains("tooltipContainer")) { //$NON-NLS-0$
						return;
					}
					temp = temp.parentNode;
				}
				this.setHidden(true);
			}.bind(this));
		}
		this._commandService = options.commandService;
		this._lastMonitor = 0;
		this._loading = {};
	}
	
	Section.prototype = /** @lends orion.widgets.Section.prototype */ {
		
		/**
		 * Destroy the section by removing the title and content from the parent.
		 */
		destroy: function() {
			var parent;
			if (this.domNode) {
				parent = this.domNode.parentNode;
				if (parent) parent.removeChild(this.domNode);
				this.domNode = null;
			}
			if (this._contentParent) {
				parent = this._contentParent.parentNode;
				if (parent) parent.removeChild(this._contentParent);
				this._contentParent = null;
			}
		},
			
		/**
		 * Changes the title of section
		 * @param title
		 */
		setTitle: function(title){
			this.titleNode.textContent = title;
		},
		
		/**
		 * Get the header DOM node
		 * @returns {DomNode} The dom node that holds the section header.
		 */
		getHeaderElement: function(title){
			return this.domNode;
		},
		
		/**
		 * Get the title DOM node
		 * @returns {DomNode} The dom node that holds the section title.
		 */
		getTitleElement: function(title){
			return this.titleNode;
		},
		
		/**
		 * Get the title DOM node
		 * @returns {DomNode} The dom node that holds the section title.
		 */
		getActionElement: function(title){
			return this._toolActionsNode;
		},
		
		/**
		 * Changes the contents of the section.
		 * @param {String|DomNode} content
		 */
		setContent: function(content){
			if (typeof content === 'string') {  //$NON-NLS-0$
				this._contentParent.innerHTML = content;
			} else {
				this._contentParent.innerHTML = ""; //NON-NLS-0$
				this._contentParent.appendChild(content);
			}
		},
		
		setHidden: function(hidden) {
			if (this.hidden === hidden) return;
			if (!this.canHide) return;
			this._changeExpandedState();
		},
		
		/**
		 * 
		 * @param {Function} func
		 */
		setOnExpandCollapse: function(func){
			this._onExpandCollapse = func;
		},

		/**
		 * @returns {DomNode} The dom node that holds the section contents.
		 */
		getContentElement: function() {
			return this._contentParent;
		},
		
		embedExplorer: function(explorer, parent, noSelection){
			this._contentParent.innerHTML = ""; //NON-NLS-0$
			if(!explorer.parent){
				explorer.parent = parent;
			}
			this._contentParent.appendChild(explorer.parent);
			explorer.section = this;
			objects.mixin(explorer, {
				createActionSections: function(){
					if(this.actionsSections)
					this.actionsSections.forEach(function(id) {
						if (!lib.node(id)) {
							var elem = document.createElement("ul"); //$NON-NLS-0$
							elem.id = id;
							elem.classList.add("commandList"); //$NON-NLS-0$
							elem.classList.add("layoutRight"); //$NON-NLS-0$
							this.section.actionsNode.appendChild(elem);
						}
					}.bind(this));
				},
				getCommandsVisible: function() {
					return this.section.actionsNode.style.visibility!=="hidden";
				},
				setCommandsVisible: function(visible, selectionPolicy) {
					this.section.actionsNode.style.visibility = visible ? "" : "hidden";
					if (undefined === selectionPolicy){
						selectionPolicy = visible ? null : "cursorOnly"; //$NON-NLS-0$	
					} 
					this.renderer.selectionPolicy = selectionPolicy;
					var navHandler = this.getNavHandler();
					if (navHandler) {
						navHandler.setSelectionPolicy(selectionPolicy);
					}
					if (visible) {
						this.updateCommands();
					} else {
						if(this.actionsSections)
						this.actionsSections.forEach(function(id) {
							if(lib.node(id)) this.commandRegistry.destroy(id);
						}.bind(this));
					}
				},
				destroy: function(){
					Object.getPrototypeOf(this).destroy.call(this);
					var _self = this;
					if(!this.actionsSections){
						return;
					}
					this.actionsSections.forEach(function(id) {
						delete _self[id];
					});
					delete this.actionsSections;
				},
				updateCommands: function(selections){
					if (!this.section.actionsNode || !this.getCommandsVisible()) {
						return;
					}
					this.createActionSections();
					Object.getPrototypeOf(this).updateCommands.call(this, selections);
				},
				loaded: function(){
					var self = this;
					if(!this.selection && !noSelection){
						if(this.serviceRegistry || this.registry){
							this.selection = new Selection.Selection(this.serviceRegistry || this.registry, this.parent.id + "Selection"); //$NON-NLS-0$
							this.selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-0$
								self.updateCommands(event.selections);
							});
						} else {
							window.console.error("Could not create a Selection for the explorer because of lack of serviceRegistry");
						}
					}
					var commandsRegistered = this.registerCommands();
					if(!commandsRegistered || !commandsRegistered.then){
						self.updateCommands();
					} else {
						commandsRegistered.then(function() {
							self.updateCommands();
						});
					}
				}
			});
			if(explorer.renderer){
				explorer.renderer.section = this;
				if(!this._keepHeader){
					objects.mixin(explorer.renderer, {
						getCellHeaderElement: function(col_no){
							var firstHeader = Object.getPrototypeOf(this).getCellHeaderElement.call(this, col_no);
							if(firstHeader){
								this.section.setTitle(firstHeader.innerHTML);
							}
							return null;
						}
					});
				}
			}
		},

		createProgressMonitor: function(){
			return new ProgressMonitor(this);
		},
		
		_setMonitorMessage: function(monitorId, message){
			this._progressNode.style.display = "block"; //$NON-NLS-0$
			this._loading[monitorId] = message;
			var progressTitle = "";
			for(var loadingId in this._loading){
				if(progressTitle!==""){
					progressTitle+="\n"; //$NON-NLS-0$
				}
				progressTitle+=this._loading[loadingId];
			}
			this._progressNode.title = progressTitle;
			this._updateExpandedState(false);
		},
		
		_monitorDone: function(monitorId){
			delete this._loading[monitorId];
			var progressTitle = "";
			for(var loadingId in this._loading){
				if(progressTitle!==""){
					progressTitle+="\n"; //$NON-NLS-0$
				}
				progressTitle+=this._loading[loadingId];
			}
			this._progressNode.title = progressTitle;
			if(progressTitle===""){
				this._progressNode.style.display = "none"; //$NON-NLS-0$
			}
			this._updateExpandedState(false);
		},
		
		_changeExpandedState: function() {
			if (this.hidden){
				this._expand();
			} else {
				this._collapse();
			}
			
			this._updateExpandedState(true);
		},
		
		_updateExpandedState: function(storeValue) {
			var isExpanded = !this.hidden;
			var isProgress = this.working;
			var expandImage = this.twistie;
			var id = this.id;
			if (expandImage) {
				expandImage.classList.remove(this._expandImageClass);
				expandImage.classList.remove(this._collapseImageClass);
				expandImage.classList.remove(this._progressImageClass);
				expandImage.classList.add(isProgress ? this._progressImageClass : isExpanded ? this._expandImageClass : this._collapseImageClass); //$NON-NLS-0$
			}
			// if a preference service was specified, we remember the state.
			if (this._preferenceService && storeValue) {
				this._preferenceService.getPreferences("/window/views").then(function(prefs){ //$NON-NLS-0$
					prefs.put(id, isExpanded);
				}); 
			}
			
			// notify the client
			if (this._onExpandCollapse) {
				this._onExpandCollapse(isExpanded, this);
			}
			this.dispatchEvent({type: "toggle", isExpanded: isExpanded}); //$NON-NLS-0$
		},
		
		_expand: function() {
			this._positionDropdown();
			this._contentParent.classList.remove("sectionClosed"); //$NON-NLS-0$
			this.domNode.classList.remove("sectionClosed"); //$NON-NLS-0$
			this._contentParent.classList.add("sectionOpened"); //$NON-NLS-0$
			this.domNode.classList.add("sectionOpened"); //$NON-NLS-0$
			this.hidden = false;
		},
		
		_positionDropdown: function() {
			if (!this.dropdown) return;
			var bounds = lib.bounds(this.positionNode || this.domNode);
			var parentBounds = lib.bounds(this._boundingNode(this.domNode));
			var bodyBounds = lib.bounds(document.body);
			var contentBounds = lib.bounds(this._contentParent);
			if (bounds.left + contentBounds.width > (bodyBounds.left + bodyBounds.width)) {
				this._contentParent.style.left = (bounds.left  - parentBounds.left - contentBounds.width + bounds.width) + "px"; //$NON-NLS-0$
			} else {
				this._contentParent.style.left = (bounds.left - parentBounds.left) + "px"; //$NON-NLS-0$
			}
			this._contentParent.style.top = (bounds.top + bounds.height - parentBounds.top) + "px"; //$NON-NLS-0$
		},
		
		_boundingNode: function(node) {
			var style = window.getComputedStyle(node, null);
			if (style === null) {
				return node;
			}
			var position = style.getPropertyValue("position"); //$NON-NLS-0$
			if (position === "absolute" || !node.parentNode || node === document.body) { //$NON-NLS-0$
				return node;
			}
			return this._boundingNode(node.parentNode);
		},
		
		_collapse: function() {
			this.hidden = true;
			this._contentParent.classList.add("sectionClosed"); //$NON-NLS-0$
			this.domNode.classList.add("sectionClosed"); //$NON-NLS-0$
			this._contentParent.classList.remove("sectionOpened"); //$NON-NLS-0$
			this.domNode.classList.remove("sectionOpened"); //$NON-NLS-0$
		}
	};
	
	Section.prototype.constructor = Section;
	
	// ProgressMonitor
	
	function ProgressMonitor(section){
		this._section = section;
		this._id = ++section._lastMonitor;
	}
	
	ProgressMonitor.prototype = {
		begin: function(message){
			this._section.working = true;
			this.status = message;
			this._section._setMonitorMessage(this.id, message);
		},
		
		worked: function(message){
			this.status = message;
			this._section._setMonitorMessage(this.id, message);
		},
		
		done: function(status){
			this._section.working = false;
			this.status = status;
			this._section._monitorDone(this.id);
		}
	};
	
	ProgressMonitor.prototype.constructor = ProgressMonitor;

	return {Section: Section};
});
