/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/

/*eslint-env browser, amd*/
/*global URL*/
define(["require", "i18n!orion/help/nls/messages", "orion/bootstrap", "orion/commandRegistry", "orion/globalCommands", "orion/URITemplate",
		"orion/Deferred", "marked/marked", "orion/webui/littlelib","orion/objects", "orion/explorers/explorer", "orion/contentTypes",
		"orion/status", "orion/operationsClient", "orion/commands"],
	function(require, messages, mBootstrap, mCommandRegistry, mGlobalCommands, URITemplate, Deferred, marked,
		lib, objects, mExplorer, mContentTypes, mStatus, mOperationsClient, mCommands) {

	var serviceRegistry, progress, contentTypeService, statusService;
	var helpModel;
	var output, tableTree;
	var selectedItem;
	var anchorElement;
	var linkCounter = 0;
	var imageCounter = 0;
	var outputCSSloaded = false;

	var itemCache = {};
	var imageCache = {};
	var itemCreationListeners = {};
	var childFetchListeners = {};

	var ATTRIBUTE_ORIGINAL_HREF = "orionHref"; //$NON-NLS-0$
	var PREFIX_RELATIVE_IMAGE = "_help_img_"; //$NON-NLS-0$
	var PREFIX_RELATIVE_LINK = "_help_a_"; //$NON-NLS-0$
	var RELATIVE_IMAGE_REGEX = new RegExp("^" + PREFIX_RELATIVE_IMAGE); //$NON-NLS-0$
	var RELATIVE_LINK_REGEX = new RegExp("^" + PREFIX_RELATIVE_LINK); //$NON-NLS-0$
	var FILENAME_REGEX = /^([^?#]*)\.([^.?#]+)/i;
	var HTML_EXTENSION_REGEX = /^html?$/i;
	var LINK_START_REGEX = /<a/;
	var TAG_END_REGEX = /(?=>$)/;
	var ABOUT_BLANK = "about:blank"; //$NON-NLS-0$
	var HASH = "#"; //$NON-NLS-0$
	var SEPARATOR = "/"; //$NON-NLS-0$
	var ROOT_FILENODE = {Directory: true, Location: "/dev/null", Name: "<root>"}; //$NON-NLS-1$ //$NON-NLS-0$

	var MINIMUM_HEADER_LEVEL = 2, MAXIMUM_HEADER_LEVEL = 3;
	var HEADER_REGEX = new RegExp("^H([" + MINIMUM_HEADER_LEVEL + "-" + MAXIMUM_HEADER_LEVEL + "])$"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	var TEMPLATE = new URITemplate(require.toUrl("help/help.html") + "#{,resource}"); //$NON-NLS-1$ //$NON-NLS-0$

	function addItemCreationListener(location, fn) {
		var listeners = itemCreationListeners[location] || [];
		listeners.push(fn);
		itemCreationListeners[location] = listeners;
	}

	function createItem(node, content, anchor, dontCache) {
		var id = node.Location + (anchor ? HASH + anchor : "");
		if (id.charAt(id.length - 1) === SEPARATOR) {
			/* remove trailing '/', if there is one, to ensure consistency for id lookups */
			id = id.substring(0, id.length - 1);
		}

		if (anchor) {
			var element = content.getElementById(anchor);
			var title = element.textContent;
		} else {
			title = node.Name;
		}

		var result = itemCache[id] || {};
		result.id = id;
		result.fileNode = node;
		result.title = title;
		result.content = content;
		result.anchor = anchor;

		if (!dontCache) {
			itemCache[id] = result;
			if (itemCreationListeners[id]) {
				itemCreationListeners[id].forEach(function(current) {
					current(result);
				});
				delete itemCreationListeners[id];
			}
		}
		return result;
	}

	function displayErrorStatus(error) {
		if (!error.responseText) {
			error.Severity = "Error"; //$NON-NLS-0$
			if (error.status === 0) {
				error.Message = messages.noResponse;
			} else {
				try {
					error.Message = JSON.stringify(error);
				} catch (e) {
					error.Message = messages.unknownError;
				}
			}
		}
		statusService.setProgressResult(error);
	}

	function getPluginService(item) {
		while (!item.service && item.parent) {
			item = item.parent;
		}
		return item.service;
	}

	function getItem(id) {
		return itemCache[id];
	}

	function pageHash() {
		/* Similar to PageUtil.hash, but handles the possibility of multiple hashes in the url */

		/* See https://bugzilla.mozilla.org/show_bug.cgi?id=483304 */
		var index = window.location.href.indexOf("#"); //$NON-NLS-0$
		return index === -1 ? "" : window.location.href.substring(index);
	}

	function normalize(path, base) {
		if (base) {
			var index = base.lastIndexOf(SEPARATOR);
			path = base.substring(0, index + 1) + path;
		}

		var pathSegments = path.split(SEPARATOR);
		index = 0;
		while (index < pathSegments.length) {
			var segment = pathSegments[index];
			if (segment === ".") { //$NON-NLS-0$
				pathSegments.splice(index, 1);
			} else if (segment === "..") { //$NON-NLS-0$
				if (index === 0) {
					/* invalid, attempting to go further back than root */
					return "";
				}
				pathSegments.splice(index-- - 1, 2);
			} else {
				index++;
			}
		}

		return pathSegments.join(SEPARATOR);
	}

	/* create instance of marked with a custom renderer for handling relative urls and images */

	var customRenderer = new marked.Renderer();
	customRenderer.image = function(href, title, altText) {
		if (href.indexOf(":") === -1) { //$NON-NLS-0$
			var targetURL = href;
			href = "";
			/*
			 * Assign an id that's easily recognizable and consistent to images with relative
			 * locations that will be loaded and set at render time.
			 */
			var id = PREFIX_RELATIVE_IMAGE + imageCounter++;
		}
		var result = marked.Renderer.prototype.image.call(this, href, title, altText);
		if (id) {
			result = result.replace(TAG_END_REGEX, ' id="' + id + '" ' + ATTRIBUTE_ORIGINAL_HREF + '="' + targetURL + '"'); //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		}
		return result;
	};
	customRenderer.link = function(href, title, text) {
		var result = marked.Renderer.prototype.link.call(this, href, title, text);
		if (href.indexOf(":") === -1) { //$NON-NLS-0$
			/*
			 * Assign an id that's easily recognizable and consistent to links with relative
			 * locations that will have their targetted URL re-assigned at render time.
			 */
			var target = "_top"; //$NON-NLS-0$
			var id = PREFIX_RELATIVE_LINK + linkCounter++;
			result = result.replace(LINK_START_REGEX, '<a id="' + id + '"'); //$NON-NLS-1$ //$NON-NLS-0$
		} else {
			target = "_blank"; //$NON-NLS-0$
		}
		result = result.replace(LINK_START_REGEX, '<a target="' + target + '"'); //$NON-NLS-1$ //$NON-NLS-0$
		return result;
	};

	var markedOptions = marked.parse.defaults;
	markedOptions.sanitize = true;
	markedOptions.tables = true;
	markedOptions.renderer = customRenderer;

	/* define explorer model and renderer for displaying help items */

	var HelpModel = (function() {
		function HelpModel() {
			this._root = createItem(ROOT_FILENODE);
		}
		HelpModel.prototype = {
			getRoot: function(onItem) {
				onItem(this._root);
			},
			getChildren: function(parentItem, onComplete) {
				if (parentItem.children) {
					onComplete ? onComplete(parentItem.children) : null;
					return;
				}

				if (parentItem.fileNode === ROOT_FILENODE) {
					var children = this._getRootPages(parentItem);
					parentItem.children = children;
					onComplete ? onComplete(children) : null;
					children.forEach(function(current) {
						this.getChildren(current);
					}.bind(this));
					return;
				}

				var listeners = childFetchListeners[parentItem];
				if (listeners === undefined) {
					listeners = [];
					var doFetch = true;
				}
				if (onComplete) {
					listeners.push(onComplete);
				}
				childFetchListeners[parentItem] = listeners;
				if (!doFetch) {
					/* this fetch is already pending from another request, don't initiate a redundant one */
					return;
				}

				var notifyListeners = function(children) {
					listeners = childFetchListeners[parentItem];
					listeners.forEach(function(current) {
						current(children);
					});
					delete childFetchListeners[parentItem];
				};

				if (parentItem.fileNode.Directory) {
					var pluginService = getPluginService(parentItem);
					if (!pluginService.fetchChildren) {
						parentItem.children = [];
						notifyListeners(parentItem.children);
						return;
					}
					(progress ?
						progress.progress(pluginService.fetchChildren(parentItem.fileNode), "Retrieving children " + parentItem.fileNode.Location) : //$NON-NLS-0$
						pluginService.fetchChildren(parentItem.fileNode)).then(
							function(childNodes) {
								var children = [];
								childNodes.forEach(function(node) {
									var item = createItem(node);
									item.parent = parentItem;
									children.push(item);
								}.bind(this));
								parentItem.children = children;
								notifyListeners(children);
								children.forEach(function(current) {
									this.getChildren(current);
								}.bind(this));
							}.bind(this),
							function(error) {
								displayErrorStatus(error);
								notifyListeners([]);
							}
						);
					return;
				}

				var computeAnchorChildren = function(parentItem) {
					var document = parentItem.content;
					var children = [];
					var lastHeaderItems = [];
					var lastLevel = 1;
					var currentElement = document.body.children[0];
					while (currentElement) {
						var tagName = currentElement.tagName;
						var match = HEADER_REGEX.exec(tagName);
						if (match) {
							var level = parseInt(match[1]);
							if (level <= lastLevel + 1) {
								var item = createItem(parentItem.fileNode, document, currentElement.id);
								item.children = [];
								if (level === MINIMUM_HEADER_LEVEL) {
									var parent = parentItem;
									children.push(item);
								} else {
									parent = lastHeaderItems[level - 1];
									parent.children.push(item);
								}
								item.parent = parent;
								lastHeaderItems[level] = item;
								for (var i = level + 1; i <= MAXIMUM_HEADER_LEVEL; i++) {
									lastHeaderItems[i] = null;
								}
								lastLevel = level;
							}
						}
						currentElement = currentElement.nextElementSibling;
					}
					return children;
				}.bind(this);

				var computeChildren = function(parentItem) {
					/* only displayed html (markdown) content is parsed for TOC entries */
					if (parentItem.content.nodeName === "#document") { //$NON-NLS-0$
						var children = computeAnchorChildren(parentItem);
					} else {
						children = [];
					}
					parentItem.children = children;
					return children;
				};

				if (parentItem.content) {
					notifyListeners(computeChildren(parentItem));
				} else {
					retrieveContent(parentItem).then(
						function(content) {
							parentItem.content = content;
							notifyListeners(computeChildren(parentItem));
						},
						function(/*error*/) {
							notifyListeners([]);
						}
					);
				}
			},
			getId: function(item) {
				return item.id;
			},
			_getRootPages: function(parentItem) {
				var result = [];
				var refs = serviceRegistry.getServiceReferences("orion.help.pages"); //$NON-NLS-0$
				for (var i = 0; i < refs.length; ++i) {
					var ref = refs[i];
					var service = serviceRegistry.getService(ref);
					var root = ref.getProperty("root"); //$NON-NLS-0$
					if (root && service.read) {
						var item = createItem(root);
						item.parent = parentItem;
						item.service = service;
						result.push(item);
					}
				}
				return result;
			}
		};
		return HelpModel;
	}());

	helpModel = new HelpModel();

	function selectItem(item) {
		function ensureExposed(item) {
			var result = new Deferred();
			if (!item.parent) {
				result.resolve();
			} else {
				ensureExposed(item.parent).then(function() {
					tableTree.expand(item, result.resolve);
				});
			}
			return result;
		}
		function doit() {
			if (item === selectedItem) {
				return;
			}

			if (selectedItem) {
				selectedItem.selected = false;
				var element = lib.node(selectedItem.id);
				if (element) {
					element = lib.$(".navbar-item", element); //$NON-NLS-0$
					element.classList.remove("navbar-item-selected"); //$NON-NLS-0$
				}
			}
			selectedItem = item;
			selectedItem.selected = true;
			element = lib.node(item.id);
			if (element) {
				element = lib.$(".navbar-item", element); //$NON-NLS-0$
				element.classList.add("navbar-item-selected"); //$NON-NLS-0$
			}
		}

		if (tableTree.isExpanded(item)) {
			if (item === selectedItem) {
				tableTree.collapse(item);
			}
			doit();
		} else {
			ensureExposed(item).then(doit);
		}
	}

	function clickListener(event) {
		/* ensure that this selection does not get overridden by a page retrieval in progress */
		itemCreationListeners = {};

		var href = event.target.getAttribute("href"); //$NON-NLS-0$
		if (!href) {
			var element = lib.$(".targetSelector", event.target); //$NON-NLS-0$
			href = element.getAttribute("href"); //$NON-NLS-0$
		}
		var target = new URL(href, window.location.href);
		var itemId = target.hash;

		/*
		 * The following manual check for a navigate within the same page is done
		 * to work around an IE behaviour that causes a page reload on every TOC
		 * item selection otherwise.  This workaround is not needed on Chrome or
		 * Firefox, but still runs on them to maintain consistency.
		 */
		if (window.location.origin === target.origin) {
			event.preventDefault();
			if (window.location.href === target.href) {
				/*
				 * The current selection is being re-selected, which will not cause a
				 * hash change, so handle it manually here (selecting the item again
				 * should collapse it if it has children).
				 */
				itemId = decodeURIComponent(itemId);
				if (!itemId.indexOf(HASH)) {
					itemId = itemId.substring(1); /* remove leading '#' */
				}
				var item = getItem(itemId);
				if (item) {
					selectItem(item);
				}
			} else {
				window.location.hash = itemId;
			}
			return;
		}

		if (itemId !== pageHash()) {
			/* selection will be updated in the subsequent hashchange event */
			return;
		}

		if (!itemId.indexOf(HASH)) {
			itemId = itemId.substring(1); /* remove leading '#' */
		}
		itemId = decodeURIComponent(itemId);
		item = getItem(itemId);
		if (item) {
			selectItem(item);
		}
	}

	function createLink(item, id, document) {
		var result = document.createElement("a"); //$NON-NLS-0$
		result.className = "navlink targetSelector"; //$NON-NLS-0$
		result.appendChild(document.createTextNode(item.title));
		result.href = TEMPLATE.expand({resource: id});
		result.target = "_top"; //$NON-NLS-0$
		return result;
	}

	function HelpExplorer(options) {
		var renderer = new HelpRenderer({
			registry: options.registry,
			commandService: options.commandService,
			singleSelection: true,
			checkbox: false
		}, this);
		mExplorer.Explorer.call(this, options.registry, null, renderer, options.commandService);
		this.parentId = options.parentId;
	}

	HelpExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(HelpExplorer.prototype, {
		display: function() {
			var deferred = new Deferred();
			var model = helpModel;
			this.createTree(
				this.parentId,
				model,
				{
					setFocus: false, /* don't steal focus on load */
					onComplete: function() {
						deferred.resolve();
					}
				}
			);
			tableTree = this.myTree;
			return deferred;
		},
	});

	function HelpRenderer(options) {
		options.cachePrefix = null; /* don't persist table state */
		options.noRowHighlighting = true;
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	HelpRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(HelpRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow) {
			if (col_no !== 0) {
				return null;
			}

			var td = document.createElement("td"); //$NON-NLS-0$
			td.classList.add("navbar-item"); //$NON-NLS-0$
			if (item.selected) {
				td.classList.add("navbar-item-selected"); //$NON-NLS-0$
			}

			var span = document.createElement("span"); //$NON-NLS-0$
			span.appendChild(document.createTextNode(item.title));
			var href = TEMPLATE.expand({resource: tableRow.id});
			span.setAttribute("href", href); //$NON-NLS-0$
			span.classList.add("targetSelector"); //$NON-NLS-0$
			td.appendChild(span);
			return td;
		}
	});

	function hashChanged(hash) {
		hash = decodeURIComponent(hash);
		var index = hash.indexOf(HASH);
		if (!index) {
			hash = hash.substring(1); /* remove leading '#' */
			index = hash.indexOf(HASH);
		}

		var doit = function(item) {
			setOutput(item).then(
				function() {
					selectItem(item);
				}
			);
		};
		var item = getItem(hash);
		if (item) {
			/* the hash corresponds to a page in the TOC */
			doit(item);
			return;
		}

		/*
		 * The hash does not have a TOC entry, so it either is invalid or has not loaded
		 * yet (the latter is often the case if the help page is seeded with the hash at
		 * load time).  If the hash is resolved to point at a valid item then display
		 * its contents and select it in the TOC.
		 */
		addItemCreationListener(hash, function(item) {
			if (item.fileNode.Directory) {
				helpModel.getChildren(item, function(/*children*/) {
					doit(item);
				});
			} else {
				doit(item); /* file content should already be retrieved */
			}
		});
	}

	function outputData(item) {
		output.src = item.content || "";
	}

	function outputHTML(item) {
		var outputDocument = output.contentDocument;
		if (!selectedItem || selectedItem.fileNode.Location !== item.fileNode.Location) {
			outputDocument.body.scrollTop = 0;
			outputDocument.body.style = "";
			/* it's safe to use innerHTML here because the HTML content was generated from sanitized markdown */
			outputDocument.childNodes[0].innerHTML = item.content.documentElement.innerHTML;

			var link = outputDocument.createElement("link"); //$NON-NLS-0$
			link.href = require.toUrl("help/help.css"); //$NON-NLS-0$
			link.rel = "stylesheet"; //$NON-NLS-0$
			link.type = "text/css"; //$NON-NLS-0$

			var adjustScrollTop = false;
			if (item.anchor) {
				anchorElement = outputDocument.getElementById(item.anchor);
			}
			if (anchorElement) {
				link.onload = function() {
					link.onload = null;
					adjustScrollTop = true;
					anchorElement.scrollIntoView(true);
				};
			}
			outputDocument.head.appendChild(link);
			outputDocument.body.classList.add("orionMarkdown"); //$NON-NLS-0$

			var pluginService = getPluginService(item);
			if (pluginService.readBlob) {
				var elements = outputDocument.getElementsByTagName("IMG"); //$NON-NLS-0$
				for (var i = 0; i < elements.length; i++) {
					var current = elements[i];
					if (RELATIVE_IMAGE_REGEX.test(current.id)) {
						var bytes = imageCache[current.id];
						if (bytes) {
							var match = current.getAttribute(ATTRIBUTE_ORIGINAL_HREF).match(FILENAME_REGEX);
							if (match) {
								var mimeType = "image/" + match[2]; //$NON-NLS-0$
								var dataURL = URL.createObjectURL(new Blob([bytes], {type: mimeType}));
								current.src = dataURL;
							}
						} else {
							(function(element) {
								var filename = element.getAttribute(ATTRIBUTE_ORIGINAL_HREF);
								pluginService.readBlob(item.fileNode, filename).then(
									function(bytes) {
										imageCache[element.id] = bytes;
										var match = filename.match(FILENAME_REGEX);
										if (match) {
											var mimeType = match ? "image/" + match[2] : "image/png"; //$NON-NLS-1$ //$NON-NLS-0$
											dataURL = URL.createObjectURL(new Blob([bytes], {type: mimeType}));
	
											if (!adjustScrollTop || !anchorElement || anchorElement.offsetTop < element.offsetTop) {
												/* do not need to treat the image load specially */
												element.src = dataURL;
											} else {
												/*
												 * Image is above the anchor element and the final page styling has been applied,
												 * so must adjust the scrollTop to keep the viewport steady.
												 */
												var newImage = new Image();
												newImage.src = dataURL;
												newImage.onload = function() {
													newImage.onload = null;
													if (!element.parentElement) {
														return; /* page has likely been unloaded */
													}
													element.parentElement.replaceChild(newImage, element);
													outputDocument.body.scrollTop = anchorElement.offsetTop;
												};
											}
										}
									},
									function(/*error*/) {
										/* image load failed, don't display error text, image will be missing in output */
									}
								);
							})(current);
						}
					}
				}
			}

			/* update the targeted URLs for links with relative locations */
			elements = outputDocument.getElementsByTagName("A"); //$NON-NLS-0$
			for (i = 0; i < elements.length; i++) {
				current = elements[i];
				if (RELATIVE_LINK_REGEX.test(current.id)) {
					if (pluginService.resolveURL) {
						var hash = pluginService.resolveURL(item.fileNode, current.getAttribute("href")); //$NON-NLS-0$
					} else {
						hash = normalize(current.getAttribute("href"), item.fileNode.Location); //$NON-NLS-0$
					}
					current.href = TEMPLATE.expand({resource: hash});
				}
			}
		} else {
			/* just relocating within the current output content */
			if (item.anchor) {
				anchorElement = outputDocument.getElementById(item.anchor);
			}
			if (anchorElement) {
				anchorElement.scrollIntoView(true);
			} else {
				outputDocument.body.scrollTop = 0;
			}
		}
	}

	function outputTOC(item) {
		var outputDocument = output.contentDocument;
		var outputBody = outputDocument.body;
		outputBody.scrollTop = 0;
		outputBody.style = "";
		lib.empty(outputBody);

		/* the following attributes and style are left with invalid values after viewing a .pdf */
		outputBody.removeAttribute("marginwidth"); //$NON-NLS-0$
		outputBody.removeAttribute("marginheight"); //$NON-NLS-0$
		outputBody.style.backgroundColor = "initial"; //$NON-NLS-0$

		/* iframes do not inherit container stylesheets, must explicitly link on content document */
		var link = outputDocument.createElement("link"); //$NON-NLS-0$
		link.href = require.toUrl("help/help.css"); //$NON-NLS-0$
		link.rel = "stylesheet"; //$NON-NLS-0$
		link.type = "text/css"; //$NON-NLS-0$
		link.onload = function() {
			link.onload = null;
			var titleElement = outputDocument.createElement("h1"); //$NON-NLS-0$
			titleElement.textContent = item.title;
			outputBody.appendChild(titleElement);
			var contentsElement = outputDocument.createElement("h2"); //$NON-NLS-0$
			contentsElement.textContent = messages.Contents;
			outputBody.appendChild(contentsElement);
			var listElement = outputDocument.createElement("ul"); //$NON-NLS-0$
			outputBody.appendChild(listElement);

			helpModel.getChildren(item, function(children) {
				children.forEach(function(current) {
					var itemElement = outputDocument.createElement("li"); //$NON-NLS-0$
					listElement.appendChild(itemElement);
					var link = createLink(current, current.id, outputDocument);
					itemElement.appendChild(link);
				});
			});
		};
		outputDocument.head.appendChild(link);
		outputBody.classList.add("orionMarkdown"); //$NON-NLS-0$
	}

	function retrieveContent(item) {
		var node = item.fileNode;
		var result = new Deferred();
		var match = node.Location.match(FILENAME_REGEX);
		if (match) {
			var pluginService = getPluginService(item);
			if (match[2].toLowerCase() === "md") { //$NON-NLS-0$
				(progress ? progress.progress(pluginService.read(node), "Retrieving " + node.Location) : pluginService.read(node)).then( //$NON-NLS-0$
					function(content) {
						var html = "<html><body>" + marked(content, markedOptions) + "</body></html>"; //$NON-NLS-1$ //$NON-NLS-0$
			            content = document.implementation.createHTMLDocument("");
						/* it's safe to use innerHTML here because the HTML content was generated from sanitized markdown */
			            content.documentElement.innerHTML = html;
						result.resolve(content);
					}.bind(this),
					result.reject
				);
			} else if (pluginService.readBlob && !HTML_EXTENSION_REGEX.test(match[2])) { /* treat as binary */
				(progress ? progress.progress(pluginService.readBlob(node), "Retrieving " + node.Location) : pluginService.readBlob(node)).then( //$NON-NLS-0$
					function(bytes) {
						/*
						 * contentTypeService expects node.Name to be a filename with an extension, so
						 * create a temporary node that satisfies this to determine the file type
						 */
						var tempNode = {Name: node.Location};
						Deferred.when(contentTypeService.getFileContentType(tempNode), function(contentType) {
							var mimeType = contentType ? contentType.id : "text/plain"; //$NON-NLS-0$
							var content = URL.createObjectURL(new Blob([bytes], {type: mimeType}));
							result.resolve(content);
						});
					},
					result.reject
				);
			} else {
				result.resolve("");
			}
		}
		return result;
	}

	function setOutput(item) {
		var result = new Deferred();

		if (item.fileNode.Directory) {
			var outputFunction = outputTOC;
		} else if (item.content && item.content.nodeName === "#document") { //$NON-NLS-0$
			outputFunction = outputHTML;
		} else {
			outputFunction = outputData;
		}
		anchorElement = null;
		var outputDocument = output.contentDocument;

		var doit = function() {
			if (!outputCSSloaded) {
				var link = outputDocument.createElement("link"); //$NON-NLS-0$
				link.href = require.toUrl("help/help.css"); //$NON-NLS-0$
				link.rel = "stylesheet"; //$NON-NLS-0$
				link.type = "text/css"; //$NON-NLS-0$
				link.onload = function() {
					link.onload = null;
					outputCSSloaded = true;
					outputFunction(item);
					result.resolve();
				};
				outputDocument.head.appendChild(link);
			} else {
				outputFunction(item);
				result.resolve();
			}
		};

		if (outputFunction !== outputData && (!outputDocument || output.src !== ABOUT_BLANK)) {
			output.onload = function() {
				output.onload = null;
				outputDocument = output.contentDocument;
				doit();
			};
			output.src = ABOUT_BLANK;
		} else {
			doit();
		}

		return result;
	}

	mBootstrap.startup().then(function(core) {
		serviceRegistry = core.serviceRegistry;
		progress = serviceRegistry.getService("orion.page.progress"); //$NON-NLS-0$
		var commandRegistry = new mCommandRegistry.CommandRegistry({});
		contentTypeService = new mContentTypes.ContentTypeRegistry(serviceRegistry);
		var operationsClient = new mOperationsClient.OperationsClient(serviceRegistry);
		statusService = new mStatus.StatusReportingService(serviceRegistry, operationsClient, "statusPane", "notifications", "notificationArea"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		mGlobalCommands.generateBanner("orion-helpPage", serviceRegistry, commandRegistry, core.preferences); //$NON-NLS-0$
		mGlobalCommands.setPageTarget({task: messages.Help, serviceRegistry: serviceRegistry, commandService: commandRegistry});

		var sideBar = lib.node("sidebar"); //$NON-NLS-0$
		var outputDiv = lib.node("output"); //$NON-NLS-0$

		var treeDiv = document.createElement("div"); //$NON-NLS-0$
		treeDiv.style.overflow = "auto"; //$NON-NLS-0$
		treeDiv.addEventListener("click", clickListener); //$NON-NLS-0$
		sideBar.appendChild(treeDiv);

		output = document.createElement("iframe"); //$NON-NLS-0$
		output.frameBorder = 0;
		output.style.width = "100%"; //$NON-NLS-0$
		output.style.height = "100%"; //$NON-NLS-0$
		outputDiv.appendChild(output);

		var ID_PRINT = "orion.help.print"; //$NON-NLS-0$
		var printCommand = new mCommands.Command({
			imageClass: "core-sprite-printer", //$NON-NLS-0$
			tooltip: messages.Print,
			id: ID_PRINT,
			callback: function(/*data*/) {
				output.contentWindow.print();
			}
		});
		commandRegistry.addCommand(printCommand);
		commandRegistry.registerCommandContribution("pageNavigationActions", ID_PRINT, 1, null, false); //$NON-NLS-0$
		commandRegistry.renderCommands("pageNavigationActions", lib.node("pageNavigationActions"), {}, {}, "tool"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		new HelpExplorer({
			parentId: treeDiv,
			registry: serviceRegistry,
			commandService: commandRegistry
		}).display();
		
		window.addEventListener("hashchange", function(/*event*/) { //$NON-NLS-0$
			hashChanged(pageHash());
		});

		var hash = pageHash();
		if (hash) {
			hashChanged(hash);
		} else {
			var doit = function() {
				var outputDocument = output.contentDocument;
				var html = marked(messages.introMarkdown, markedOptions);
				var link = outputDocument.createElement("link"); //$NON-NLS-0$
				link.href = require.toUrl("help/help.css"); //$NON-NLS-0$
				link.rel = "stylesheet"; //$NON-NLS-0$
				link.type = "text/css"; //$NON-NLS-0$
				link.onload = function() {
					link.onload = null;
					/* it's safe to use innerHTML here because the HTML content was generated from sanitized markdown */
					outputDocument.body.innerHTML = html;
				};
				outputDocument.body.classList.add("orionMarkdown"); //$NON-NLS-0$
				outputDocument.head.appendChild(link);
			};

			if (output.contentDocument.readyState === "complete") { //$NON-NLS-0$
				doit(); /* typical case on Chrome */
			} else {
				/* typical case on Firefox and IE */
				output.contentWindow.onload = function() {
					output.contentWindow.onload = null;
					doit();
				};
			}
		}
	});
});

