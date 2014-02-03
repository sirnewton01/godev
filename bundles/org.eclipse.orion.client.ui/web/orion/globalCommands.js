/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global window document define login logout localStorage orion */
/*jslint browser:true sub:true */
define([
		'i18n!orion/nls/messages', 'require', 'orion/commonHTMLFragments', 'orion/keyBinding', 'orion/EventTarget', 'orion/commandRegistry', 'orion/commands',
		'orion/parameterCollectors', 'orion/extensionCommands', 'orion/uiUtils', 'orion/keyBinding', 'orion/breadcrumbs', 'orion/webui/littlelib',
		'orion/webui/splitter', 'orion/webui/dropdown', 'orion/webui/tooltip', 'orion/contentTypes', 'orion/URITemplate', 'orion/keyAssist',
		'orion/PageUtil', 'orion/widgets/themes/ThemePreferences', 'orion/widgets/themes/container/ThemeData', 'orion/Deferred',
		'orion/widgets/UserMenu', 'orion/PageLinks', 'orion/webui/dialogs/OpenResourceDialog', 'text!orion/banner/banner.html',
		'text!orion/banner/footer.html', 'text!orion/banner/toolbar.html', 'orion/widgets/input/DropDownMenu', 'orion/widgets/input/GroupedContent',
		'orion/util', 'orion/customGlobalCommands', 'orion/fileClient'
	],
	function (messages, require, commonHTML, KeyBinding, EventTarget, mCommandRegistry, mCommands, mParameterCollectors, mExtensionCommands, mUIUtils, mKeyBinding,
		mBreadcrumbs, lib, mSplitter, mDropdown, mTooltip, mContentTypes, URITemplate, mKeyAssist, PageUtil, mThemePreferences, mThemeData, Deferred,
		mUserMenu, PageLinks, openResource, BannerTemplate, FooterTemplate, ToolbarTemplate, DropDownMenu, GroupedContent, util, mCustomGlobalCommands, mFileClient) {
	/**
	 * This class contains static utility methods. It is not intended to be instantiated.
	 *
	 * @class This class contains static utility methods for creating and managing global commands.
	 * @name orion.globalCommands
	 */

	function qualifyURL(url) {
		var a = document.createElement('a'); //$NON-NLS-0$
		a.href = url; // set string url
		return a.href;
	}

	var notifyAuthenticationSite = qualifyURL(require.toUrl('auth/NotifyAuthentication.html')); //$NON-NLS-0$
	var authRendered = {};

	function getLabel(authService, serviceReference) {
		if (authService.getLabel) {
			return authService.getLabel();
		} else {
			var d = new Deferred();
			d.resolve(serviceReference.properties.name);
			return d;
		}
	}

	function setUserIcon() {
		var userTrigger = document.getElementById('userTrigger');
		var userTriggerClassName = userTrigger.className;
		userTriggerClassName = userTriggerClassName + ' imageSprite core-sprite-silhouette';
		userTrigger.className = userTriggerClassName;
	}

	var customGlobalCommands = {
		createMenuGenerator: mCustomGlobalCommands.createMenuGenerator || function (serviceRegistry, keyAssistFunction) {
			var userMenuPlaceholder = lib.node("userMenu"); //$NON-NLS-0$
			if (!userMenuPlaceholder) {
				return;
			}
			var dropdownNode = lib.node("userDropdown"); //$NON-NLS-0$
			var userDropdown = new mDropdown.Dropdown({
				dropdown: dropdownNode
			});
			var menuGenerator = new mUserMenu.UserMenu({
				dropdownNode: dropdownNode,
				dropdown: userDropdown,
				serviceRegistry: serviceRegistry
			});
			var dropdownTrigger = lib.node("userTrigger"); //$NON-NLS-0$

			new mTooltip.Tooltip({
				node: dropdownTrigger,
				text: messages['Options'],
				position: ["below", "left"] //$NON-NLS-1$ //$NON-NLS-0$
			});

			/*
			 * To add user name call: setUserName(serviceRegistry, dropdownTrigger);
			 */
			setUserIcon();

			menuGenerator.setKeyAssist(keyAssistFunction);

			return menuGenerator;
		},
		beforeGenerateRelatedLinks: mCustomGlobalCommands.beforeGenerateRelatedLinks || function (serviceRegistry, item, exclusions, commandRegistry, alternateItem) {
			var relatedLinksNode = lib.node('relatedLinks');
			lib.empty(relatedLinksNode);
			return true;
		},
		addRelatedLinkCommand: mCustomGlobalCommands.addRelatedLinkCommand || function (command, invocation) {
			var relatedLinksNode = lib.node('relatedLinks');
			var newRelatedLinkItem = mCommands.createCommandMenuItem(relatedLinksNode, command, invocation);
			newRelatedLinkItem.classList.remove('dropdownMenuItem');
		},
		afterGenerateRelatedLinks: mCustomGlobalCommands.afterGenerateRelatedLinks || function (serviceRegistry, item, exclusions, commandRegistry, alternateItem) {},
		afterSetPageTarget: mCustomGlobalCommands.afterSetPageTarget || function (options) {},
		generateNavigationMenu: mCustomGlobalCommands.generateNavigationMenu || function (parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor) {
			var nav = document.getElementById('centralNavigation');

			new mTooltip.Tooltip({
				node: nav,
				text: 'Navigation Menu',
				position: ["right"] //$NON-NLS-0$
			});

			var navDropDown = new DropDownMenu('primaryNav', 'centralNavigation');
			var groupedContent = new GroupedContent();
			navDropDown.addContent(groupedContent.getContentPane());
		},
		afterGenerateBanner: mCustomGlobalCommands.afterGenerateBanner || function (parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor) {}
	};

	var authenticationIds = [];

	function startProgressService(serviceRegistry) {
		var progressPane = lib.node("progressPane"); //$NON-NLS-0$
		progressPane.setAttribute("aria-label", messages['Operations - Press spacebar to show current operations']); //$NON-NLS-1$ //$NON-NLS-0$
		var progressService = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		if (progressService) {
			progressService.init.bind(progressService)("progressPane"); //$NON-NLS-0$
		}
	}

	function setUserName(registry, node) {
		var authService = registry.getService("orion.core.auth"); //$NON-NLS-0$
		if (authService !== null) {
			authService.getUser().then(function (jsonData) {
				if (!jsonData) {
					return;
				}
				var text;
				if (jsonData.Name) {
					text = document.createTextNode(jsonData.Name);
				} else if (jsonData.login) {
					text = document.createTextNode(jsonData.login);
				}
				if (text) {
					if (node.childNodes.length > 0) {
						if (node.childNodes[0].nodeType === 3) {
							// replace original text
							node.replaceChild(text, node.childNodes[0]);
						} else {
							node.insertBefore(text, node.childNodes[0]);
						}
					} else {
						node.appendChild(text);
					}
				}
			});
		}
	}

	/**
	 * Adds the user-related commands to the toolbar
	 *
	 * @name orion.globalCommands#generateUserInfo
	 * @function
	 */

	function generateUserInfo(serviceRegistry, keyAssistFunction) {
		var authServices = serviceRegistry.getServiceReferences("orion.core.auth"); //$NON-NLS-0$
		authenticationIds = [];

		var menuGenerator = customGlobalCommands.createMenuGenerator.apply(this, arguments);

		for (var i = 0; i < authServices.length; i++) {
			var servicePtr = authServices[i];
			var authService = serviceRegistry.getService(servicePtr);
			getLabel(authService, servicePtr).then(function (label) {
				authService.getKey().then(function (key) {
					authenticationIds.push(key);
					authService.getUser().then(function (jsonData) {
						menuGenerator.addUserItem(key, authService, label, jsonData);
					}, function (errorData, jsonData) {
						menuGenerator.addUserItem(key, authService, label, jsonData);
					});
					window.addEventListener("storage", function (e) { //$NON-NLS-0$
						if (authRendered[key] === localStorage.getItem(key)) {
							return;
						}

						authRendered[key] = localStorage.getItem(key);

						authService.getUser().then(function (jsonData) {
							menuGenerator.addUserItem(key, authService, label, jsonData);
						}, function (errorData) {
							menuGenerator.addUserItem(key, authService, label);
						});
					}, false);
				});
			});
		}

	}

	function continueOnError(error) {
		return error;
	}

	// Related links menu management. The related menu is reused as content changes. If the menu becomes empty, we hide the dropdown.
	var pageItem;
	var exclusions = [];
	var title;

	/**
	 * Adds the related links to the banner
	 *
	 * @name orion.globalCommands#generateRelatedLinks
	 * @function
	 */
	function generateRelatedLinks(serviceRegistry, item, exclusions, commandRegistry, alternateItem) {
		var globalArguments = arguments;
		var contentTypesCache;

		function getContentTypes() {
			if (contentTypesCache) {
				return contentTypesCache;
			}
			var contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			// TODO Shouldn't really be making service selection decisions at this level. See bug 337740
			if (!contentTypeService) {
				contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
				contentTypeService = serviceRegistry.getService("orion.core.contentTypeRegistry"); //$NON-NLS-0$
			}
			return contentTypeService.getContentTypes().then(function (ct) {
				contentTypesCache = ct;
				return contentTypesCache;
			});
		}

		var alternateItemDeferred;
		/**
		 * Calculates the CommandInvocation for a given Command.
		 * @returns {orion.Promise} A promise resolving to a 2-element array: [Command, CommandInvocation]
		 */
		function enhanceCommand(command) {
			if (command) {
				if (!command.visibleWhen || command.visibleWhen(item)) {
					var invocation = new mCommands.CommandInvocation(item, item, null, command, commandRegistry);
					return new Deferred().resolve([command, invocation]);
				} else if (typeof alternateItem === "function") { //$NON-NLS-0$
					if (!alternateItemDeferred) {
						alternateItemDeferred = alternateItem();
					}
					return Deferred.when(alternateItemDeferred, function (newItem) {
						if (newItem && (item === pageItem)) {
							// there is an alternate, and it still applies to the current page target
							if (!command.visibleWhen || command.visibleWhen(newItem)) {
								var invocation = new mCommands.CommandInvocation(newItem, newItem, null, command, commandRegistry);
								return [command, invocation];
							}
						}
					});
				}
			}
			return new Deferred().resolve();
		}

		var contributedLinks = serviceRegistry && serviceRegistry.getServiceReferences("orion.page.link.related"); //$NON-NLS-0$
		if (!contributedLinks || contributedLinks.length === 0) {
			return;
		}

		Deferred.when(getContentTypes(), function () {
			if (!customGlobalCommands.beforeGenerateRelatedLinks.apply(this, globalArguments)) {
				return;
			}

			// Array of promises, each resolving to either a Command, or a commandOptions object.
			var deferredCommandItems = [];

			// assemble the related links
			for (var i = 0; i < contributedLinks.length; i++) {
				var info = {};
				var j;
				var propertyNames = contributedLinks[i].getPropertyKeys();
				for (j = 0; j < propertyNames.length; j++) {
					info[propertyNames[j]] = contributedLinks[i].getProperty(propertyNames[j]);
				}
				if (info.id) {
					var command = null;
					var deferred = null;
					// exclude anything in the list of exclusions
					var position = exclusions.indexOf(info.id);
					if (position < 0) {
						// First see if we have a uriTemplate and name, which is enough to build a command internally.
						if (((info.nls && info.nameKey) || info.name) && info.uriTemplate) {
							deferred = mExtensionCommands._createCommandOptions(info, contributedLinks[i], serviceRegistry, contentTypesCache, true);
							deferredCommandItems.push(deferred);
							continue;
						}
						// We couldn't compose one, so see if one is already registered.
						if ((command = commandRegistry.findCommand(info.id))) {
							deferredCommandItems.push(new Deferred().resolve(command));
							continue;
						}
						// It's not registered, so look for it in orion.navigate.command and create it
						var commandsReferences = serviceRegistry.getServiceReferences("orion.navigate.command"); //$NON-NLS-0$
						for (j = 0; j < commandsReferences.length; j++) {
							var id = commandsReferences[j].getProperty("id"); //$NON-NLS-0$
							if (id === info.id) {
								var navInfo = {};
								propertyNames = commandsReferences[j].getPropertyKeys();
								for (var k = 0; k < propertyNames.length; k++) {
									navInfo[propertyNames[k]] = commandsReferences[j].getProperty(propertyNames[k]);
								}
								deferred = mExtensionCommands._createCommandOptions(navInfo, commandsReferences[j], serviceRegistry,
									contentTypesCache, true);
								deferredCommandItems.push(deferred);
								break;
							}
						}
					}
				}
			}
			Deferred.all(deferredCommandItems, continueOnError).then(function(items) {
				var commands = items.map(function(item) {
					return (item instanceof mCommands.Command) ? item : new mCommands.Command(item);
				}).sort(function(a, b) {
					return a.name.localeCompare(b.name);
				});
				return Deferred.all(commands.map(enhanceCommand), continueOnError).then(function(enhanced) {
					enhanced.forEach(function(array) {
						if (array) {
							customGlobalCommands.addRelatedLinkCommand(array[0], array[1]);
						}
					});
					customGlobalCommands.afterGenerateRelatedLinks.apply(this, globalArguments);
				});
			});
		});
	}

	function renderGlobalCommands(commandRegistry) {
		var globalTools = lib.node("globalActions"); //$NON-NLS-0$
		if (globalTools) {
			commandRegistry.destroy(globalTools);
			commandRegistry.renderCommands(globalTools.id, globalTools, {}, {}, "tool"); //$NON-NLS-0$
		}
	}

	/**
	 * Support for establishing a page item associated with global commands and related links
	 */
	function setPageCommandExclusions(excluded) {
		exclusions = excluded;
	}

	/**
	 * Set a dirty indicator for the page. An in-page indicator will always be set. If the document has a title (set via setPageTarget), then
	 * the title will also be updated with a dirty indicator.
	 */
	function setDirtyIndicator(isDirty) {
		if (title) {
			if (title.charAt(0) === '*' && !isDirty) { //$NON-NLS-0$
				title = title.substring(1);
			}
			if (isDirty && title.charAt(0) !== '*') { //$NON-NLS-0$
				title = '*' + title; //$NON-NLS-0$
			}
			window.document.title = title;
		}

		var dirty = lib.node("dirty"); //$NON-NLS-0$f
		if (dirty) {
			if (isDirty) {
				dirty.textContent = "*"; //$NON-NLS-0$
			} else {
				dirty.textContent = ""; //$NON-NLS-0$
			}
		}
	}

	/**
	 * Set the target of the page so that common infrastructure (breadcrumbs, related menu, etc.) can be added for the page.
	 * @name orion.globalCommands#setPageTarget
	 * @function
	 *
	 * @param {Object} options The target options object.
	 * @param {String} options.task the name of the user task that the page represents.
	 * @param {Object} options.target the metadata describing the page resource target. Optional.
	 * @param {String|DomNode} options.breadCrumbContainer the dom node or id of the bread crumb container. Optional. If not defined, 'location' is used as 
	 * the bread crumb container id, which is always in the page banner.
	 * @param {String} options.name the name of the resource that is showing on the page. Optional. If a target parameter is supplied, the
	 * target metadata name will be used if a name is not specified in the options.
	 * @param {String} options.title the title to be used for the page. Optional. If not specified, a title will be constructed using the task
	 * and/or name.
	 * @param {String} options.breadcrumbRootName the name used for the breadcrumb root. Optional. If not specified, the breadcrumbTarget,
	 * fileService, task, and name will be consulted to form a root name.
	 * @param {Object} options.breadcrumbTarget the metadata used for the breadcrumb target. Optional. If not specified, options.target is
	 * used as the breadcrumb target.
	 * @param {Function} options.makeAlternate a function that can supply alternate metadata for the related pages menu if the target does not
	 * validate against a contribution. Optional.
	 * @param {Function} options.makeBreadcrumbLink a function that will supply a breadcrumb link based on a location shown in a breadcrumb.
	 * Optional. If not specified, and if a target is specified, the breadcrumb link will refer to the Navigator.
	 * @param {orion.serviceregistry.ServiceRegistry} options.serviceRegistry the registry to use for obtaining any unspecified services. Optional. If not specified, then
	 * any banner elements requiring Orion services will not be provided.
	 * @param {orion.commandregistry.CommandRegistry} options.commandService the commandService used for accessing related page commands. Optional. If not specified, a
	 * related page menu will not be shown.
	 * @param {orion.searchClient.Searcher} options.searchService the searchService used for scoping the searchbox. Optional. If not specified, the searchbox will
	 * not be scoped.
	 * @param {orion.fileClient.FileClient} options.fileService the fileService used for retrieving additional metadata and managing the breadcrumb for multiple
	 * file services. If not specified, there may be reduced support for multiple file implementations.
	 */
	function setPageTarget(options) {
		var name;
		var fileSystemRootName;
		var breadcrumbRootName = options.breadcrumbRootName;
		var serviceRegistry = options.serviceRegistry;
		if (options.target) { // we have metadata
			if (options.searchService) {
				options.searchService.setLocationByMetaData(options.target);
			}
			if (options.fileService && !options.breadcrumbTarget) {
				fileSystemRootName = breadcrumbRootName ? breadcrumbRootName + " " : ""; //$NON-NLS-1$ //$NON-NLS-0$
				fileSystemRootName = fileSystemRootName + options.fileService.fileServiceName(options.target.Location);
				breadcrumbRootName = null;
			}
			name = options.name || options.target.Name;
			pageItem = options.target;
			generateRelatedLinks(serviceRegistry, options.target, exclusions, options.commandService, options.makeAlternate);
		} else {
			if (!options.breadcrumbTarget) {
				breadcrumbRootName = breadcrumbRootName || options.task || options.name;
			}
			name = options.name;
			generateRelatedLinks(serviceRegistry, {
				NoTarget: ""
			}, exclusions, options.commandService, options.makeAlternate);
		}
		title = options.title;
		if (!title) {
			if (name) {
				title = name + " - " + options.task; //$NON-NLS-0$
			} else {
				title = options.task;
			}
		}
		window.document.title = title;
		customGlobalCommands.afterSetPageTarget.apply(this, arguments);
		var locationNode = options.breadCrumbContainer ? lib.node(options.breadCrumbContainer) : lib.node("location"); //$NON-NLS-0$
		if (locationNode) {
			lib.empty(locationNode);
			var fileClient = serviceRegistry && new mFileClient.FileClient(serviceRegistry);
			var resource = options.breadcrumbTarget || options.target;
			var workspaceRootURL = (fileClient && resource && resource.Location) ? fileClient.fileServiceRootURL(resource.Location) : null;
			new mBreadcrumbs.BreadCrumbs({
				container: locationNode,
				resource: resource,
				rootSegmentName: breadcrumbRootName,
				workspaceRootSegmentName: fileSystemRootName,
				workspaceRootURL: workspaceRootURL,
				makeFinalHref: options.makeBreadcrumFinalLink,
				makeHref: options.makeBreadcrumbLink
			});
		}
	}

	function boundingNode(node) {
		var style = window.getComputedStyle(node, null);
		if (style === null) {
			return node;
		}
		var position = style.getPropertyValue("position"); //$NON-NLS-0$
		if (position === "absolute" || !node.parentNode || node === document.body) { //$NON-NLS-0$
			return node;
		}
		return boundingNode(node.parentNode);
	}

	function getToolbarElements(toolNode) {
		var elements = {};
		var toolbarNode = null;
		if (typeof toolNode === "string") { //$NON-NLS-0$
			toolNode = lib.node(toolNode);
		}
		// no reference node has been given, so use the main toolbar.
		if (!toolNode) {
			toolNode = lib.node("pageActions"); //$NON-NLS-0$
		}
		var node = toolNode;
		// the trickiest part is finding where to start looking (section or main toolbar).
		// We need to walk up until we find a "toolComposite"
		while (node && node.classList) {
			if (node.classList.contains("toolComposite")) { //$NON-NLS-0$
				toolbarNode = node;
				break;
			}
			node = node.parentNode;
		}
		if (toolNode.classList.contains("commandMarker")) { //$NON-NLS-0$
			elements.commandNode = toolNode;
		}
		if (toolbarNode) {
			elements.slideContainer = lib.$(".slideParameters", toolbarNode); //$NON-NLS-0$
			elements.parameterArea = lib.$(".parameters", toolbarNode); //$NON-NLS-0$
			elements.dismissArea = lib.$(".parametersDismiss", toolbarNode); //$NON-NLS-0$
			elements.notifications = lib.$("#notificationArea", toolbarNode); //$NON-NLS-0$
			if (toolbarNode.parentNode) {
				elements.toolbarTarget = lib.$(".toolbarTarget", toolbarNode.parentNode); //$NON-NLS-0$
				if (elements.toolbarTarget) {
					var bounds = lib.bounds(elements.toolbarTarget);
					var parentBounds = lib.bounds(boundingNode(elements.toolbarTarget.parentNode));
					elements.toolbarTargetY = bounds.top - parentBounds.top;
					elements.toolbar = toolbarNode;
				}
			}
		}
		return elements;
	}

	function layoutToolbarElements(elements) {
		if (elements.toolbarTarget && elements.toolbarTargetY) {
			var heightExtras = 0;
			var bounds;
			if (elements.notifications && elements.notifications.classList.contains("slideContainerActive")) { //$NON-NLS-0$
				bounds = lib.bounds(elements.notifications);
				heightExtras += bounds.height;
			}
			if (elements.slideContainer && elements.slideContainer.classList.contains("slideContainerActive")) { //$NON-NLS-0$
				bounds = lib.bounds(elements.slideContainer);
				heightExtras += bounds.height;
			}
			if (heightExtras > 0) {
				heightExtras += 8; // padding
			}
			if (heightExtras) {
				elements.toolbarTarget.style.top = elements.toolbarTargetY + heightExtras + "px"; //$NON-NLS-0$
				elements.toolbar.style.paddingBottom = heightExtras + "px"; //$NON-NLS-0$ 
			} else {
				elements.toolbarTarget.style.top = elements.toolbar.style.paddingBottom = "";
			}
		}
	}

	var mainSplitter = null;

	function getMainSplitter() {
		return mainSplitter;
	}
	
	var keyAssist = null;
	function getKeyAssist() {
		return keyAssist;
	}
	
	var globalEventTarget = new EventTarget();
	function getGlobalEventTarget() {
		return globalEventTarget;
	}
	

	/**
	 * Generates the banner at the top of a page.
	 *
	 * @name orion.globalCommands#generateBanner
	 * @function
	 * 
	 * @param parentId
	 * @param serviceRegistry
	 * @param commandRegistry
	 * @param prefsService
	 * @param searcher
	 * @param handler
	 * @param editor - no longer used
	 * @param {Boolean} closeSplitter true to make the splitter's initial state "closed".
	 */
	function generateBanner(parentId, serviceRegistry, commandRegistry, prefsService, searcher, handler, /* optional */ editor, closeSplitter) {
		new mThemePreferences.ThemePreferences(prefsService, new mThemeData.ThemeData()).apply();

		var parent = lib.node(parentId);

		if (!parent) {
			throw messages["could not find banner parent, id was "] + parentId;
		}
		// place the HTML fragment for the header.
		var range = document.createRange();
		range.selectNode(parent);
		var headerFragment = range.createContextualFragment(BannerTemplate);
		// do the i18n string substitutions
		lib.processTextNodes(headerFragment, messages);

		if (parent.firstChild) {
			parent.insertBefore(headerFragment, parent.firstChild);
		} else {
			parent.appendChild(headerFragment);
		}
		// TODO not entirely happy with this. Dynamic behavior that couldn't be in the html template, maybe it could be
		// dynamically bound in a better way like we do with NLS strings
		var home = lib.node("home"); //$NON-NLS-0$
		home.href = require.toUrl("edit/edit.html"); //$NON-NLS-0$
		home.setAttribute("aria-label", messages['Orion Home']); //$NON-NLS-1$ //$NON-NLS-0$
		var progressPane = lib.node("progressPane"); //$NON-NLS-0$
		progressPane.src = require.toUrl("images/none.png"); //$NON-NLS-0$

		var toolbar = lib.node("pageToolbar"); //$NON-NLS-0$
		if (toolbar) {
			toolbar.classList.add("toolbarLayout"); //$NON-NLS-0$
			toolbar.innerHTML = ToolbarTemplate + commonHTML.slideoutHTMLFragment("mainToolbar"); //$NON-NLS-0$
		}
		var closeNotification = lib.node("closeNotifications"); //$NON-NLS-0$
		if (closeNotification) {
			closeNotification.setAttribute("aria-label", messages['Close notification']); //$NON-NLS-1$ //$NON-NLS-0$
		}

		//Hack for FF17 Bug#415176
		if (util.isFirefox <= 17) {
			var staticBanner = lib.node("staticBanner"); //$NON-NLS-0$
			if (staticBanner) {
				staticBanner.style.width = "100%"; //$NON-NLS-0$
				staticBanner.style.MozBoxSizing = "border-box"; //$NON-NLS-0$
			}
		}
		
		var footer = lib.node("footer"); //$NON-NLS-0$
		if (footer) {
			footer.innerHTML = FooterTemplate;
			// do the i18n string substitutions
			lib.processTextNodes(footer, messages);
		}

		// Set up a custom parameter collector that slides out of adjacent tool areas.
		commandRegistry.setParameterCollector(new mParameterCollectors.CommandParameterCollector(getToolbarElements, layoutToolbarElements));

		document.addEventListener("keydown", function (e) { //$NON-NLS-0$
			if (e.keyCode === lib.KEY.ESCAPE) {
				var statusService = serviceRegistry.getService("orion.page.message"); //$NON-NLS-0$
				if (statusService) {
					statusService.setProgressMessage("");
				}
			}
		}, false);

		customGlobalCommands.generateNavigationMenu.apply(this, arguments);

		// generate primary nav links.
		var primaryNav = lib.node("navigationlinks"); //$NON-NLS-0$
		if (primaryNav) {
			PageLinks.getPageLinksInfo(serviceRegistry, "orion.page.link").then(function(pageLinksInfo) {
				pageLinksInfo.createLinkElements().forEach(function (link) {
					var li = document.createElement('li'); //$NON-NLS-0$
					li.appendChild(link);
					primaryNav.appendChild(li);
				});
			});
		}

		// hook up split behavior - the splitter widget and the associated global command/key bindings.
		var splitNode = lib.$(".split"); //$NON-NLS-0$
		if (splitNode) {
			var side = lib.$(".sidePanelLayout"); //$NON-NLS-0$
			var main = lib.$(".mainPanelLayout"); //$NON-NLS-0$
			if (side && main) {
				mainSplitter = {
					side: side,
					main: main
				};
				mainSplitter.splitter = new mSplitter.Splitter({
					node: splitNode,
					sidePanel: side,
					mainPanel: main,
					toggle: true,
					closeByDefault: closeSplitter
				});
				var toggleSidePanelCommand = new mCommands.Command({
					name: messages["Toggle side panel"],
					tooltip: messages["Open or close the side panel"],
					id: "orion.toggleSidePane", //$NON-NLS-0$
					callback: function () {
						mainSplitter.splitter.toggleSidePanel();
					}
				});
				commandRegistry.addCommand(toggleSidePanelCommand);
				commandRegistry.registerCommandContribution("pageActions", "orion.toggleSidePane", 1, null, true, new KeyBinding.KeyBinding('l', util.isMac ? false : true, true, false, util.isMac ? true : false)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			}
		}

		// Assemble global commands, those that could be available from any page due to header content or common key bindings.

		// open resource
		var showingResourceDialog = false;
		var openResourceDialog = function (searcher, serviceRegistry) {
			if (showingResourceDialog) {
				return;
			}
			var progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
			var dialog = new openResource.OpenResourceDialog({
				searcher: searcher,
				progress: progress,
				searchRenderer: searcher.defaultRenderer,
				onHide: function () {
					showingResourceDialog = false;
				}
			});
			window.setTimeout(function () {
				showingResourceDialog = true;
				dialog.show();
			}, 0);
		};

		var openResourceCommand = new mCommands.Command({
			name: messages["Find File Named..."],
			tooltip: messages["Choose a file by name and open an editor on it"],
			id: "orion.openResource", //$NON-NLS-0$
			callback: function (data) {
				openResourceDialog(searcher, serviceRegistry);
			}
		});

		commandRegistry.addCommand(openResourceCommand);
		commandRegistry.registerCommandContribution("globalActions", "orion.openResource", 100, null, true, new KeyBinding.KeyBinding('f', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		// Toggle trim command
		var toggleBanner = new mCommands.Command({
			name: messages["Toggle banner and footer"],
			tooltip: messages["Hide or show the page banner and footer"],
			id: "orion.toggleTrim", //$NON-NLS-0$
			callback: function () {
				var header = lib.node("banner"); //$NON-NLS-0$
				var footer = lib.node("footer"); //$NON-NLS-0$
				var content = lib.$(".content-fixedHeight"); //$NON-NLS-0$
				var maximized = header.style.visibility === "hidden"; //$NON-NLS-0$
				if (maximized) {
					header.style.visibility = "visible"; //$NON-NLS-0$
					footer.style.visibility = "visible"; //$NON-NLS-0$
					content.classList.remove("content-fixedHeight-maximized"); //$NON-NLS-0$
				} else {
					header.style.visibility = "hidden"; //$NON-NLS-0$
					footer.style.visibility = "hidden"; //$NON-NLS-0$
					content.classList.add("content-fixedHeight-maximized"); //$NON-NLS-0$
				}
				getGlobalEventTarget().dispatchEvent({type: "toggleTrim", maximized: !maximized}); //$NON-NLS-0$
				return true;
			}
		});
		commandRegistry.addCommand(toggleBanner);
		commandRegistry.registerCommandContribution("globalActions", "orion.toggleTrim", 100, null, true, new KeyBinding.KeyBinding("m", true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		// Open configuration page, Ctrl+Shift+F1
		var configDetailsCommand = new mCommands.Command({
			name: messages["System Configuration Details"],
			tooltip: messages["System Config Tooltip"],
			id: "orion.configDetailsPage", //$NON-NLS-0$
			hrefCallback: function () {
				return require.toUrl("help/about.html"); //$NON-NLS-0$
			}
		});

		commandRegistry.addCommand(configDetailsCommand);
		commandRegistry.registerCommandContribution("globalActions", "orion.configDetailsPage", 100, null, true, new KeyBinding.KeyBinding(112, true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		// Background Operations Page, Ctrl+Shift+O
		var operationsCommand = new mCommands.Command({
			name: messages["Background Operations"],
			tooltip: messages["Background Operations Tooltip"],
			id: "orion.backgroundOperations", //$NON-NLS-0$
			hrefCallback: function () {
				return require.toUrl("operations/list.html"); //$NON-NLS-0$
			}
		});

		commandRegistry.addCommand(operationsCommand);
		commandRegistry.registerCommandContribution("globalActions", "orion.backgroundOperations", 100, null, true, new KeyBinding.KeyBinding('o', true, true)); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		// Key assist
		keyAssist = new mKeyAssist.KeyAssistPanel({
			commandRegistry: commandRegistry
		});
		var keyAssistCommand = new mCommands.Command({
			name: messages["Show Keys"],
			tooltip: messages["Show a list of all the keybindings on this page"],
			id: "orion.keyAssist", //$NON-NLS-0$
			callback: function () {
				if (keyAssist.isVisible()) {
					keyAssist.hide();
				} else {
					keyAssist.show();
				}
				return true;
			}
		});
		commandRegistry.addCommand(keyAssistCommand);
		commandRegistry.registerCommandContribution("globalActions", "orion.keyAssist", 100, null, true, new KeyBinding.KeyBinding(191, false, true)); //$NON-NLS-1$ //$NON-NLS-0$

		renderGlobalCommands(commandRegistry);

		generateUserInfo(serviceRegistry, keyAssistCommand.callback);

		// now that footer containing progress pane is added
		startProgressService(serviceRegistry);

		// check for commands in the hash
		window.addEventListener("hashchange", function () { //$NON-NLS-0$
			commandRegistry.processURL(window.location.href);
		}, false);

		function setTarget(target) {
			target = target;

			var nodes = lib.$$array(".targetSelector"); //$NON-NLS-0$
			for (var i = 0; i < nodes.length; i++) {
				nodes[i].target = target;
			}
		}

		function readTargetPreference(serviceRegistry) {
			serviceRegistry.registerService("orion.cm.managedservice", //$NON-NLS-0$
				{
					updated: function (properties) {
						var target;
						if (properties && properties["links.newtab"] !== "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
							target = properties["links.newtab"] ? "_blank" : "_self"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
						} else {
							target = "_self"; //$NON-NLS-0$
						}
						setTarget(target);
					}
				}, {
					pid: "nav.config" //$NON-NLS-0$
				}); //$NON-NLS-0$
		}
		window.setTimeout(function () {
			readTargetPreference(serviceRegistry);
		}, 0);

		customGlobalCommands.afterGenerateBanner.apply(this, arguments);
	}

	// return the module exports
	return {
		generateBanner: generateBanner,
		getToolbarElements: getToolbarElements,
		getMainSplitter: getMainSplitter,
		getKeyAssist: getKeyAssist,
		getGlobalEventTarget: getGlobalEventTarget,
		layoutToolbarElements: layoutToolbarElements,
		setPageTarget: setPageTarget,
		setDirtyIndicator: setDirtyIndicator,
		setPageCommandExclusions: setPageCommandExclusions,
		notifyAuthenticationSite: notifyAuthenticationSite
	};
});