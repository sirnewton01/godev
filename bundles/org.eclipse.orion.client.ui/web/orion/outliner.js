/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define document window*/
/*jslint sub:true*/
define([
	'i18n!orion/nls/messages',
	'orion/Deferred',
	'orion/webui/littlelib',
	'orion/uiUtils',
	'orion/section',
	'orion/explorers/explorer',
	'orion/commands',
	'orion/URITemplate',
	'orion/EventTarget',
	'orion/i18nUtil',
	'orion/edit/editorContext'
], function(messages, Deferred, lib, mUIUtils, mSection, mExplorer, mCommands, URITemplate, EventTarget, i18nUtil, EditorContext) {

	function OutlineRenderer (options, explorer, title, selectionService) {
		this.explorer = explorer;
		this._init(options);
		this.title = title;
		this.selectionService = selectionService;
	}
	
	OutlineRenderer.prototype = mExplorer.SelectionRenderer.prototype;
	OutlineRenderer.prototype.constructor = OutlineRenderer;
	OutlineRenderer.prototype.getLabelColumnIndex = function() {
		return 0;
	};
	OutlineRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		if (!item) {
			return;
		}
		var elementNode = document.createElement("span"); //$NON-NLS-0$
		tableRow.appendChild(elementNode);
		if (item.className) {
			elementNode.classList.add(item.className);
		}
		if (item.children) {
			this.getExpandImage(tableRow, elementNode);
		}
		if (item.href) {
			this._createLink(item.label, item.href, elementNode);
		} else if (item.line || item.column || item.start) {
			var href = new URITemplate("#{,resource,params*}").expand({resource: this.title, params: item}); //$NON-NLS-0$
			this._createLink(item.label, href, elementNode);
		} else if (item.label) {
			elementNode.appendChild(document.createTextNode(item.label)); //$NON-NLS-0$
		}
	};
	
	OutlineRenderer.prototype._createLink = function(text, href, parentNode) {
		var link = document.createElement("a"); //$NON-NLS-0$
		parentNode.appendChild(link);
		// if there is no selection service, we rely on normal link following
		if (!this.selectionService) {
			link.href = href;
		} else {
			link.style.cursor = "pointer"; //$NON-NLS-0$
		}
		link.classList.add("navlinkonpage"); //$NON-NLS-0$
		link.appendChild(document.createTextNode(text));
		// if a selection service has been specified, we will use it for link selection.
		// Otherwise we assume following the href in the anchor tag is enough.
		if (this.selectionService) {
			var selectionService = this.selectionService;
			var url = href;
			link.addEventListener("click", function(event) { //$NON-NLS-0$
				if (mUIUtils.openInNewWindow(event)) {
					mUIUtils.followLink(url, event);
				} else {
					selectionService.setSelections(url);
				}
			}, false);
		}
		return link;
	};
	

	function OutlineExplorer(serviceRegistry, selection, title) {
		/*	we intentionally do not do this:
				this.selection = selection;
			Our renderer is going to trigger the selection events using specialized URL's when an outline
			link is clicked.  We don't want the explorer triggering selection events on the outline model item
		*/
		this.registry = serviceRegistry;
		this.renderer = new OutlineRenderer({checkbox: false, treeTableClass: "outlineExplorer"}, this, title, selection);  //$NON-NLS-0$ 
	}
	OutlineExplorer.prototype = mExplorer.Explorer.prototype;	
	OutlineExplorer.prototype.constructor = OutlineExplorer;
	
	function OutlineModel(items, rootId) {
		this.items = items;
		this.root = {children: items};
		this.root.outlinerId = rootId;
		this.idItemMap = {};
	}
	OutlineModel.prototype.constructor = OutlineModel;
	
	OutlineModel.prototype.getRoot = function(onItem){
		onItem(this.root);
	};
	
	OutlineModel.prototype.destroy = function() {
	};
	
	OutlineModel.prototype.getId = function(/* item */ item){
		// Do we have a cached id?
		if (item.outlinerId) {
			return item.outlinerId;
		}
		// Generate an id.  Since these id's are used in the DOM, we strip out characters that shouldn't be in a DOM id.
		var id = item.label.replace(/[\\\/\.\:\-\_]/g, "");
		// We might have duplicate id's if the outline items are duplicated, or if we happen to have another dom id using
		// this name.  Check for this case and use a timestamp in lieu of the generated id.
		if ((this.idItemMap[id] && this.idItemMap[id]!== item) ||
			lib.node(id)) {// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=389760
			id = new Date().getTime().toString();
			this.idItemMap[id] = item;
			item.outlinerId = id;
		} else {
			this.idItemMap[id] = item;
		}
		return id;
	};
		
	OutlineModel.prototype.getChildren = function(parentItem, /* function(items) */ onComplete){
		if (parentItem.children) {
			// The tree model iterator assumes that there are back links to the parent
			for (var i=0; i<parentItem.children.length; i++) {
				parentItem.children[i].parent = parentItem;
			}
			onComplete(parentItem.children);
		} else {
			onComplete([]);
		}
	};
	
	OutlineModel.prototype.doExpansions = function(tree) {
		// for now, just expand the first level of the model
		// see https://bugs.eclipse.org/bugs/show_bug.cgi?id=389547
		for (var i=0; i < this.root.children.length; i++) {
			if (this.root.children[i].children) {
				tree.expand(this.root.children[i]);
			}
		}
	};


	/**
	 * Constructs a new Outliner with the given options.
	 * @name orion.outliner.Outliner
	 * @class An Outliner is a visual component that renders an itemized overview of a resource and acts as 
	 * a selection provider on that resource. The itemized overview is obtained from the {@link orion.outliner.OutlineService}.
	 * @param {Object} options The options object
	 * @param {Element} options.parent The parent DOM element to put this outliner inside.
	 * @param {Element} options.toolbar The DOM element to render toolbar commands in.
	 * @param {orion.serviceRegistry.ServiceRegistry} options.serviceRegistry The service registry.
	 * @param {orion.commands.CommandService} options.commandService
	 * @param {Service of type orion.outliner.OutlineService} options.outlineService The outline service to use.
	 * @param {orion.selection.Selection} [options.selectionService] If provided, the 
	 * selection service will be notified on outline selection rather than using anchor tag hrefs.
	 * @param {orion.sidebar.Sidebar} Parent sidebar
	 */
	function Outliner(options) {
		this._init(options);
	}
	Outliner.prototype = /** @lends orion.outliner.Outliner.prototype */ {
		_init: function(options) {
			var parent = lib.node(options.parent), toolbar = lib.node(options.toolbar);
			if (!parent) { throw new Error("no parent"); } //$NON-NLS-0$
			if (!options.outlineService) {throw new Error("no outline service"); } //$NON-NLS-0$
			this._parent = parent;
			this._toolbar = toolbar;
			this._serviceRegistry = options.serviceRegistry;
			this._contentTypeRegistry = options.contentTypeRegistry;
			this._outlineService = options.outlineService;
			this._commandService = options.commandService;
			this._selectionService = options.selectionService;
			this._inputManager = options.inputManager;
			this._sidebar = options.sidebar;
			var _self = this;

			this._inputManager.addEventListener("InputChanged", function(event) { //$NON-NLS-0$
				_self.setContentType(event.contentType, event.location);
			});

			this._inputManager.getEditor().addEventListener("InputChanged", this.generateOutline.bind(this)); //$NON-NLS-0$

			Deferred.when(_self._outlineService, function(service) {
				service.addEventListener("outline", function(event) { //$NON-NLS-0$
					_self.providerId = event.providerId;
//					_self._updateViewModes(self.outlineProviders);
					_self._renderOutline(event.outline, event.title);
				});
			});
		},
		/** Invokes the outline service to produce an outline */
		generateOutline: function() {
			if (!this._isActive()) {
				return;
			}
			// Bail we're in the process of looking up capable providers
			if (this._providerLookup) {
				return;
			}
			this._outlineService.emitOutline(this._inputManager);
		},
		setSelectedProvider: function(/** orion.serviceregistry.ServiceReference */ provider) {
			this.providerId = provider.getProperty("id"); //$NON-NLS-0$
			this.providerName = provider.getProperty("name"); //$NON-NLS-0$
			this._outlineService.setProvider(provider);
		},
		setOutlineProviders: function(providers) {
			var oldProviders = this.outlineProviders;
			var isActive = this._isActive();
			this.outlineProviders = providers;
			this._updateViewModes(oldProviders, this.outlineProviders);
			if (isActive) {
				this._selectNewProvider();
			}
		},
		_renderOutline: function(outlineModel, title) {
			var contentNode = this._parent;
			lib.empty(contentNode);
			outlineModel = outlineModel instanceof Array ? outlineModel : [outlineModel];
			if (outlineModel) {
				var treeModel = new OutlineModel(outlineModel);
				this.explorer = new OutlineExplorer(this._serviceRegistry, this._selectionService, title);
				this.explorer.createTree(contentNode, treeModel, {selectionPolicy: "cursorOnly", setFocus: false}); //$NON-NLS-1$ //$NON-NLS-0$
				treeModel.doExpansions(this.explorer.myTree);
			}
		},
		_selectNewProvider: function() {
			var newProviders = this.outlineProviders;
			// If the currently selected provider is not among the new set of providers, pick another one
			var _self = this, sidebar = _self._sidebar;
			var isStaleProvider = newProviders.every(function(provider) {
				return _self.providerId !== provider.getProperty("id"); //$NON-NLS-0$
			});
			if (isStaleProvider) {
				var next = newProviders[0];
				if (next) {
					sidebar.setViewMode(this._viewModeId(next));
				} else {
					sidebar.setViewMode(sidebar.defaultViewMode);
				}
			}
		},
		/** @returns {String} view mode id for the outline provider */
		_viewModeId: function(provider) {
			return "outline." + provider.getProperty("id"); //$NON-NLS-1$ //$NON-NLS-0$
		},
		/**
		 * @param {orion.serviceregistry.ServiceReference[]} oldProviders
		 * @param {orion.serviceregistry.ServiceReference[]} newProviders
		 */
		_updateViewModes: function(oldProviders, newProviders) {
			var _self = this;
			if (oldProviders) {
				oldProviders.forEach(function(provider) {
					_self._sidebar.removeViewMode(_self._viewModeId(provider));
				});
			}
			newProviders.forEach(function(provider) {
				_self._sidebar.addViewMode(_self._viewModeId(provider), { //$NON-NLS-0$
					label: provider.displayName || provider.getProperty("name") || (provider.name + provider.serviceId) || "undefined", //$NON-NLS-1$ //$NON-NLS-0$
					create: _self.createViewMode.bind(_self, provider),
					destroy: _self.destroyViewMode.bind(_self, provider)
				});
			});
			var sidebar = _self._sidebar;
			sidebar.renderViewModeMenu();
		},
		_isActive: function() {
			var viewModeId = this._sidebar.getActiveViewModeId();
			if (!viewModeId) {
				return false;
			}
			var _self = this;
			return this.outlineProviders && this.outlineProviders.some(function(provider) {
				return viewModeId === _self._viewModeId(provider);
			});
		},
		createViewMode: function(provider) {
			this.setSelectedProvider(provider);
			this.generateOutline();
		},
		destroyViewMode: function(provider) {
		},
		/**
		 * Called when the inputManager's contentType has changed, so we need to look up the capable outline providers.
		 * @param {String} fileContentType
		 * @param {String} title TODO this is deprecated, should be removed along with "pattern" property of outliners.
		 */
		setContentType: function(fileContentType, title) {
			var allOutlineProviders = this._serviceRegistry.getServiceReferences("orion.edit.outliner"); //$NON-NLS-0$
			var _self = this;
			// Filter to capable providers
			var filteredProviders = this.filteredProviders = allOutlineProviders.filter(function(serviceReference) {
				var contentTypeIds = serviceReference.getProperty("contentType"), //$NON-NLS-0$
				    pattern = serviceReference.getProperty("pattern"); // for backwards compatibility //$NON-NLS-0$
				if (contentTypeIds) {
					return contentTypeIds.some(function(contentTypeId) {
						return _self._contentTypeRegistry.isExtensionOf(fileContentType, contentTypeId);
					});
				} else if (pattern && new RegExp(pattern).test(title)) {
					return true;
				}
				return false;
			});
			// Load resource bundles
			this._providerLookup = true;
			var deferreds = filteredProviders.map(function(provider) {
				if(provider.getProperty("nameKey") && provider.getProperty("nls")){ //$NON-NLS-1$ //$NON-NLS-0$
					var deferred = new Deferred();
					var getDisplayName = function(provider, deferred, commandMessages) { //$NON-NLS-0$
						provider.displayName = commandMessages[provider.getProperty("nameKey")]; //$NON-NLS-0$
						deferred.resolve();
					};
					i18nUtil.getMessageBundle(provider.getProperty("nls")).then(getDisplayName.bind(null, provider, deferred), deferred.reject); //$NON-NLS-0$
					return deferred;
				} else {
					provider.displayName = provider.getProperty("name"); //$NON-NLS-0$
					return new Deferred().resolve();
				}
			});
			Deferred.all(deferreds, function(error) { return error; }).then(function(){
				_self._providerLookup = false;
				_self._outlineService.setOutlineProviders(filteredProviders);
				_self.setOutlineProviders(filteredProviders);
			});
		}
	};
	Outliner.prototype.constructor = Outliner;
	
	/**
	 * Constructs a new outline service. Clients should obtain an outline service by requesting
	 * the service <code>orion.edit.outline</code> from the service registry. This service constructor
	 * is only intended to be used by page service registry initialization code.
	 * @name orion.outliner.OutlineService
	 * @class <code>OutlineService</code> dispatches an event when an outline for a resource is available.
	 * Clients may listen to the service's <code>outline</code> event to receive notification when this occurs.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry The service registry to use for obtaining
	 * outline providers.
	 * @param {orion.preferences.PreferencesService} options.preferences The preferences service to use.
	 */
	function OutlineService(options) {
		this._serviceRegistry = options.serviceRegistry;
		this._preferences = options.preferences;
		EventTarget.attach(this);
		this._serviceRegistration = this._serviceRegistry.registerService("orion.edit.outline", this); //$NON-NLS-0$
		this._outlinePref = this._preferences.getPreferences("/edit/outline"); //$NON-NLS-0$
		this._provider = new Deferred();
		this._providerResolved = false;

		this.filteredProviders = [];
		//this.setOutlineProviders(this.filteredProviders);
	}
	OutlineService.prototype = /** @lends orion.outliner.OutlineService.prototype */ {
		setOutlineProviders: function(/** orion.serviceregistry.ServiceReference[] */ providers) {
			this.providers = providers;
			// Check pref to see if user has chosen a preferred outline provider
			var self = this;
			Deferred.when(this._outlinePref, function(pref) {
				var provider;
				for (var i=0; i < providers.length; i++) {
					provider = providers[i];
					if (pref.get("outlineProvider") === providers[i].getProperty("id")) { //$NON-NLS-1$ //$NON-NLS-0$
						break;
					}
				}
				if (provider) {
					self.setProvider(provider);
				}
			});
		},
		setProvider: function(/** orion.serviceregistry.ServiceReference */ provider) {
			if (this._providerResolved) {
				this._provider = new Deferred();
			}
			this._provider.resolve(provider);
			this._providerResolved = true;
			var id = provider.getProperty("id"); //$NON-NLS-0$
			if (id) {
				this._outlinePref.then(function(pref) {
					pref.put("outlineProvider", id); //$NON-NLS-0$
				});
			}
		},

		getProvider: function() {
			return this._provider.promise;
		},
		emitOutline: function(inputManager) {
			var self = this;
			Deferred.when(this.getProvider(), function(provider) {
				var editor = inputManager.getEditor(), title = editor.getTitle();
				var serviceRegistry = self._serviceRegistry;
				var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
				var outlineProviderService = serviceRegistry.getService(provider);
				var method, args;
				if ((method = outlineProviderService.computeOutline)) {
					var contentType = inputManager.getContentType();
					args = [EditorContext.getEditorContext(serviceRegistry), {
						contentType: contentType && contentType.id
					}];
				} else if ((method = outlineProviderService.getOutline)) {
					args = [editor.getText(), title];
				}
				progress.progress(method.apply(outlineProviderService, args), i18nUtil.formatMessage(messages["OutlineProgress"], title, provider.displayName)).then(function(outline) { //$NON-NLS-0$
					if (outline) {
						self.dispatchEvent({ type:"outline", outline: outline, title: title, providerId: provider.getProperty("id") }); //$NON-NLS-1$ //$NON-NLS-0$
					}
				});
			});
		}
	};
	OutlineService.prototype.constructor = OutlineService;
	
	//return module exports
	return {
		Outliner: Outliner,
		OutlineService: OutlineService
	};
});

