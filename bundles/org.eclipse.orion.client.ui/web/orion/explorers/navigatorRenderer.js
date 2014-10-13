/*******************************************************************************
 * @license
 * Copyright (c) 2009, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'i18n!orion/navigate/nls/messages',
	'orion/Deferred',
	'orion/explorers/explorer',
	'orion/explorers/navigationUtils',
	'orion/extensionCommands',
	'orion/objects',
	'orion/URITemplate',
	'orion/widgets/browse/commitInfoRenderer',
	'orion/contentTypes',
	'orion/webui/littlelib'
], function(messages, Deferred, mExplorer, mNavUtils, mExtensionCommands, objects, URITemplate, mCommitInfoRenderer, mContentTypes, lib) {
		
	var max_more_info_column_length = 60;
	/* Internal */
	function addImageToLink(contentType, link, location, replace) {
		if (contentType) {
			var image, imageClass = contentType.imageClass, imageURL = contentType.image;
			if (imageClass) {
				image = document.createElement("span"); //$NON-NLS-0$
				image.className += imageClass; // may be several classes in here
				image.classList.add("thumbnail"); //$NON-NLS-0$
			} else if (imageURL) {
				image = document.createElement("img"); //$NON-NLS-0$
				image.src = imageURL;
				// to minimize the height/width in case of a large one
				image.classList.add("thumbnail"); //$NON-NLS-0$
			}
			if (image) {
				link.replaceChild(image, replace);
			}
		}
	}
	
	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$
	
	var clickedItem;
	/**
	 * Returns the last item clicked by links created with #createLink.
	 * @name orion.explorer.NavigatorRenderer.getClickedItem
	 * @function
	 */
	function getClickedItem() {
		return clickedItem;
	}
		
	/**
	 * Exported so that it can be used by other UI that wants to use navigator-style links. commandService and contentTypeService  are necessary to compute 
	 * the proper editor for a file.
	 * @name orion.explorer.NavigatorRenderer.createLink
	 * @function
	 * @param {String} folderPageURL the page you want to direct folders to (such as navigator).  Using a blank string will just hash the current page.
	 * @param {Object} item a json object describing an Orion file or folder
	 * @param {Object} commandService necessary to compute the proper editor for a file. Must be a synchronous, in-page service, not retrieved 
	 * from the service registry.
	 * @param {Object[]} [openWithCommands] The "open with" commands used to generate link hrefs. If this parameter is not provided, the caller must
	 * have already processed the service extension and added to the command registry (usually by calling {@link orion.extensionCommands.createAndPlaceFileCommandsExtension}).
	 * @param {Object} [linkProperties] gives additional properties to mix in to the HTML anchor element.
	 * @param {Object} [uriParams] A map giving additional parameters that will be provided to the URI template that generates the href.
	 * @param {Object} [separateImageHolder] Separate image holder object. {holderDom: dom}. If separateImageHolder is not defined, the file icon image is rendered in the link as the first child.
	 * @param {NavigatorRenderer} [renderer] The renderer object. Optional. If defined, renderer.updateFileNode() is called to update the file element for sub classes.
	 * If separateImageHolder is defined with holderDom property, the file icon iamge is rendered in separateImageHolder.holderDom.
	 * IF separateImageHolder is defined as an empty object, {}, the file icon iamge is not rendered at all.
	 */
	function createLink(folderPageURL, item, commandService, contentTypeService, openWithCommands, linkProperties, uriParams, separateImageHolder, renderer) {
		// TODO FIXME folderPageURL is bad; need to use URITemplates here.
		// TODO FIXME refactor the async href calculation portion of this function into a separate function, for clients who do not want the <A> created.
		item = objects.clone(item);
		var link;
		if (item.Directory) {
			link = document.createElement("a"); //$NON-NLS-0$
			link.className = "navlinkonpage"; //$NON-NLS-0$
			var template = !folderPageURL ? uriTemplate : new URITemplate(folderPageURL + "#{,resource,params*}"); //$NON-NLS-0$
			link.href = template.expand({resource: item.ChildrenLocation});
			if(item.Name){
				link.appendChild(document.createTextNode(item.Name));
			}
		} else {
			if (!openWithCommands) {
				openWithCommands = mExtensionCommands.getOpenWithCommands(commandService);
			}
			link = document.createElement("a"); //$NON-NLS-0$
			link.className= "navlink targetSelector"; //$NON-NLS-0$
			if (linkProperties && typeof linkProperties === "object") { //$NON-NLS-0$
				Object.keys(linkProperties).forEach(function(property) {
					link[property] = linkProperties[property];
				});
			}
			var imageHolderDom = null, image = null;
			if(separateImageHolder) {
				imageHolderDom = separateImageHolder.holderDom;
			} else {
				imageHolderDom = link;
			}
			if(imageHolderDom) {
				image = document.createElement("span"); //$NON-NLS-0$
				image.className = "core-sprite-file modelDecorationSprite thumbnail"; //$NON-NLS-0$
				imageHolderDom.appendChild(image);
			}
			if(item.Name){
				link.appendChild(document.createTextNode(item.Name));
			}
			var href = item.Location;
			if (uriParams && typeof uriParams === "object") { //$NON-NLS-0$
				item.params = {};
				objects.mixin(item.params, uriParams);
			}
			var openWithCommand = mExtensionCommands.getOpenWithCommand(commandService, item, openWithCommands);
			if (openWithCommand) {
				href = openWithCommand.hrefCallback({items: item});
			}
			Deferred.when(contentTypeService.getFileContentType(item), function(contentType) {
				if(imageHolderDom) {
					addImageToLink(contentType, imageHolderDom, item.Location, image);
				}
				link.href = href;
				if(renderer && typeof renderer.updateFileNode === 'function') { //$NON-NLS-0$
					renderer.updateFileNode(item, link, mContentTypes.isImage(contentType));
				}
			});
		}
		link.addEventListener("click", function() { //$NON-NLS-0$
			clickedItem = item;
		}.bind(this), false);
		return link;
	}
		
	/**
	 * @name orion.explorer.NavigatorRenderer
	 * @class Renderer for a tree-table of files, like the Orion Navigator.
	 * @description Renderer for a tree-table of files, like the Orion Navigator.
	 * @param {Object} options
	 * @param {orion.explorer.Explorer} explorer
	 * @param {orion.commandregistry.CommandRegistry} commandRegistry
	 * @param {orion.core.ContentTypeRegistry} contentTypeService
	 */
	function NavigatorRenderer (options, explorer, commandService, contentTypeService) {
		this.explorer = explorer;
		this.commandService = commandService;
		this.contentTypeService = contentTypeService;
		this.openWithCommands = null;
		this.actionScopeId = options.actionScopeId;
		
		this._init(options);
	}
	NavigatorRenderer.prototype = new mExplorer.SelectionRenderer(); 

	NavigatorRenderer.prototype.wrapperCallback = function(wrapperElement) {
		wrapperElement.setAttribute("role", "tree"); //$NON-NLS-1$ //$NON-NLS-0$
	};

	NavigatorRenderer.prototype.tableCallback = function(tableElement) {
		tableElement.setAttribute("aria-label", messages["Navigator"]); //$NON-NLS-1$ //$NON-NLS-0$
		tableElement.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
	};

	/**
	 * @param {Element} rowElement
	 */
	NavigatorRenderer.prototype.rowCallback = function(rowElement, model) {
		rowElement.setAttribute("role", "treeitem"); //$NON-NLS-1$ //$NON-NLS-0$
	};
	
	
	/**
	 * @param {Element} bodyElement
	 */
	NavigatorRenderer.prototype.emptyCallback = function(bodyElement) {
		var tr = document.createElement("tr"); //$NON-NLS-0$
		var td = document.createElement("td"); //$NON-NLS-0$
		td.colSpan = this.oneColumn ? 1 : 3;
		var noFile = document.createElement("div"); //$NON-NLS-0$
		noFile.classList.add("noFile"); //$NON-NLS-0$
		noFile.textContent = messages["NoFile"];
		var plusIcon = document.createElement("span"); //$NON-NLS-0$
		plusIcon.appendChild(document.createTextNode(messages["File"]));
		lib.processDOMNodes(noFile, [plusIcon]);
		td.appendChild(noFile);
		tr.appendChild(td);
		bodyElement.appendChild(tr);
	};

	/**
	 * @param {int|string} the local time stamp
	 */
	NavigatorRenderer.prototype.getDisplayTime = function(timeStamp) {
		return new Date(timeStamp).toLocaleString();
	};
	
	/**
	 * @param {Element} parent the parent dom where the commit info is rendered
	 * @param {Object} commitInfo the commit info
	 */
	NavigatorRenderer.prototype.getCommitRenderer = function(parent, commitInfo) {
		return new mCommitInfoRenderer.CommitInfoRenderer({parent: parent, commitInfo: commitInfo});
	};
	
	/**
	 * Creates the column header element. We are really only using the header for a spacer at this point.
	 * @name orion.explorer.NavigatorRenderer.prototype.getCellHeaderElement
	 * @function
	 * @returns {Element}
	 */
	NavigatorRenderer.prototype.getCellHeaderElement = function(col_no){
		// TODO see https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121
		if (this.oneColumn && col_no !== 0) {
			return null;
		}

		switch(col_no){
		case 0:
		case 1:
		case 2:
			var th = document.createElement("th"); //$NON-NLS-0$
			th.style.height = "8px"; //$NON-NLS-0$
		}
	};
		
	/**
	 * Creates a image DOM Element for the specified folder.
	 * @name orion.explorer.NavigatorRenderer#getFolderImage
	 * @type {Function}
	 * @param {Object} folder The folder to create an image for.
	 * @returns {Element} The folder image element.
	 */
	NavigatorRenderer.prototype.getFolderImage = function(folder) {
		if (!this.showFolderImage) {
			return null;
		}
		var span = document.createElement("span"); //$NON-NLS-0$
		span.className = "core-sprite-folder modelDecorationSprite"; //$NON-NLS-0$
		return span;
	};

	/**
	* Subclasses can override this function to customize the DOM Element that is created to represent a folder.
	 * The default implementation creates either a hyperlink or a plain text node.
	 * @name orion.explorer.NavigatorRenderer#createFolderNode
	 * @type {Function}
	 * @see orion.explorer.NavigatorRenderer#showFolderLinks
	 * @see orion.explorer.NavigatorRenderer#folderLink
	 * @param {Object} folder The folder to create a node for.
	 * @returns {Element} The folder element.
	 */
	// The returned element must have an <code>id</code> property.
	NavigatorRenderer.prototype.createFolderNode = function(folder) {
		var itemNode;
		if (this.showFolderLinks) { //$NON-NLS-0$
			// TODO see https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121
			itemNode = createLink(this.folderLink || "", folder, this.commandService, this.contentTypeService); //$NON-NLS-0$
			var image = this.getFolderImage(folder);
			if (image) {
				itemNode.insertBefore(image, itemNode.firstChild);
			}
		} else {
			itemNode = document.createElement("span"); //$NON-NLS-0$
			itemNode.textContent = folder.Name;
		}
		return itemNode;
	};

	/**
	* Subclasses can override this function to customize the DOM Element that is created to represent a file.
	 * The default implementation does nothing.
	 * @name orion.explorer.NavigatorRenderer#updateFileNode
	 * @type {Function}
	 * @param {Object} file The file model to update for.
	 * @param {Element} fileNode The file node to update.
	 * @param {Boolean} isImage The flag to indicate if the file is an image file.
	 */
	// The returned element must have an <code>id</code> property.
	NavigatorRenderer.prototype.updateFileNode = function(file, fileNode, isImage) {
	};

	/**
	 * Whether the default implementation of {@link #createFolderNode} should show folders should as links (<code>true</code>),
	 * or just plain text (<code>false</code>).
	 * @name orion.explorer.NavigatorRenderer#showFolderLinks
	 * @type {Boolean}
	 * @default true
	 */
	NavigatorRenderer.prototype.showFolderLinks = true;
	/**
	 * Gives the base href to be used by the default implementation of {@link #createFolderNode} for creating folder links.
	 * This property only takes effect if {@link #showFolderLinks} is <code>true</code>. 
	 * TODO see <a href="https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121">Bug 400121</a>
	 * @name orion.explorer.NavigatorRenderer#folderLink
	 * @type {String}
	 * @default ""
	 */
	/**
	 * Generate the DOM element for a cell. If you override this function, you will most likely have to override {@link orion.explorers.FileExplorer#getNameNode}
	 * in your explorer class.
	 * @name orion.explorer.NavigatorRenderer#getCellElement
	 * @function
	 * @returns {Element}
	 */
	NavigatorRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var timeStampCase = item.LastCommit ? 2 : 1;
		var sizeCase = item.LastCommit ? 3 : 2;
		var commitCase = item.LastCommit ? 1 : -1;
		switch(col_no){
		case 0:
			var col = document.createElement('td'); //$NON-NLS-0$
			var span = document.createElement("span"); //$NON-NLS-0$
			span.id = tableRow.id+"MainCol"; //$NON-NLS-0$
			span.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
			col.appendChild(span);
			col.setAttribute("role", "presentation"); //$NON-NLS-1$ //$NON-NLS-0$
			span.className = "mainNavColumn"; //$NON-NLS-0$
			var itemNode;
			if (item.Directory) {
				// defined in ExplorerRenderer.  Sets up the expand/collapse behavior
				this.getExpandImage(tableRow, span);
				itemNode = this.createFolderNode(item);

				span.appendChild(itemNode);
				this.explorer._makeDropTarget(item, itemNode);
				this.explorer._makeDropTarget(item, tableRow);
			} else {
				if (!this.openWithCommands) {
					this.openWithCommands = mExtensionCommands.getOpenWithCommands(this.commandService);
				}
				itemNode = createLink("", item, this.commandService, this.contentTypeService, this.openWithCommands, null, null, null, this);
				span.appendChild(itemNode); //$NON-NLS-0$
			}
			if (itemNode) {
				// orion.explorers.FileExplorer#getNameNode
				itemNode.id = tableRow.id + "NameLink"; //$NON-NLS-0$
				if (itemNode.nodeType === 1) {
					mNavUtils.addNavGrid(this.explorer.getNavDict(), item, itemNode);
					itemNode.setAttribute("role", "link"); //$NON-NLS-1$ //$NON-NLS-0$
					itemNode.setAttribute("tabindex", "-1"); //$NON-NLS-1$ //$NON-NLS-0$
				}
			}
			// render any inline commands that are present.
			if (this.actionScopeId) {
				this.commandService.renderCommands(this.actionScopeId, span, item, this.explorer, "tool", null, true); //$NON-NLS-0$
			}
			return col;
		case timeStampCase:
			// TODO see https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121
			if (this.oneColumn) {
				return null;
			}
			var dateColumn = document.createElement('td'); //$NON-NLS-0$
			if (item.LocalTimeStamp) {
				dateColumn.textContent = this.getDisplayTime(item.LocalTimeStamp);
			}
			return dateColumn;
		case sizeCase:
			// TODO see https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121
			if (this.oneColumn) {
				return null;
			}
			var sizeColumn = document.createElement('td'); //$NON-NLS-0$
			if (!item.Directory && typeof item.Length === "number") { //$NON-NLS-0$
				var length = parseInt(item.Length, 10),
					kb = length / 1024;
				sizeColumn.textContent = Math.ceil(kb).toLocaleString() + " KB"; //$NON-NLS-0$
			}
			sizeColumn.style.textAlign = "right"; //$NON-NLS-0$
			return sizeColumn;
		case commitCase:// LastCommit field is optional. For file services that dod not return this properties, we do not have to render this column.
			if (this.oneColumn || !item.LastCommit) {
				return null;
			}
			var messageColumn = document.createElement('td'); //$NON-NLS-0$
			this.getCommitRenderer(messageColumn, item.LastCommit).renderSimple(max_more_info_column_length);
			return messageColumn;
		}
	};
	NavigatorRenderer.prototype.constructor = NavigatorRenderer;
	
	//return module exports
	return {
		NavigatorRenderer: NavigatorRenderer,
		getClickedItem: getClickedItem,
		createLink: createLink
	};
});
