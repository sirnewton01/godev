/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define document window URL console*/
define([
	'marked/marked',
	'orion/editor/editor',
	'orion/objects',
	'orion/webui/littlelib',
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/section', 
	'orion/URL-shim'
], function(marked, mEditor, objects, lib, URITemplate, PageUtil, mSection) {

	var uriTemplate = new URITemplate("#{,resource,params*}"); //$NON-NLS-0$

	function filterOutputLink(outputLink, resourceURL, isRelative) {
		return function(cap, link) {
			if (link.href.indexOf(":") === -1) { //$NON-NLS-0$
				
				try {
					var linkURL;
					if (resourceURL.protocol === "filesystem:") { //$NON-NLS-0$
						linkURL = {
							href: "filesystem:" + (new URL(link.href, resourceURL.pathname)).href //$NON-NLS-0$
						};
					} else {
						linkURL = new URL(link.href, resourceURL);
						if (isRelative) {
							linkURL.protocol = "";
							linkURL.host = "";
						}
					}
					if (cap[0][0] !== '!') { //$NON-NLS-0$
						link.href = uriTemplate.expand({
							resource: linkURL.href
						});
					} else {
						link.href = linkURL.href;
					}
				} catch(e) {
					console.log(e); // best effort
				}				
			}
			return outputLink.call(this, cap, link);
		};
	}

	function createMarked(markdown) {
		// relativizing marked's outputLink
		var outputLink = marked.InlineLexer.prototype.outputLink;
		var resource = PageUtil.matchResourceParameters().resource;
		var resourceURL = new URL(resource, window.location.href);
		marked.InlineLexer.prototype.outputLink = filterOutputLink(outputLink, resourceURL, resource.indexOf(":") === -1); //$NON-NLS-0$
		var result = marked(markdown, {
			sanitize: true
		});
		marked.InlineLexer.prototype.outputLink = outputLink;
		return result;
	}


	function MarkdownView(options) {
		this.fileClient = options.fileClient;
		this.progress = options.progress;
		this.canHide = options.canHide;
		this._node = null;
	}
	MarkdownView.prototype = {
		display: function(node, markdown) {
			node.classList.add("orionMarkdown"); //$NON-NLS-0$
			node.innerHTML = createMarked(markdown);
		},
		displayContents: function(node, file) {
			var location = file.Location || file;
			lib.empty(node);
			var div = document.createElement("div"); //$NON-NLS-0$
			(this.progress ? this.progress.progress(this.fileClient.read(location), "Reading file " + (file.Name || location)) : this.fileClient.read(location)).then(function(markdown) {
				this.display.bind(this)(div, markdown);
			}.bind(this));
			node.appendChild(div);
		},
		displayInFrame: function(node, file, headerClass) {
			var markdownSection = new mSection.Section(node, {id: "markdownSection", title: file.Name || "readme", headerClass: headerClass, canHide: this.canHide}); //$NON-NLS-0$
			this.displayContents.call(this, markdownSection.getContentElement(), file);
		}
	};

	var BaseEditor = mEditor.BaseEditor;
	function MarkdownEditor(options) {
		this.id = "orion.markdownViewer"; //$NON-NLS-0$
		BaseEditor.apply(this, arguments);
	}
		
	MarkdownEditor.prototype = Object.create(BaseEditor.prototype);
	objects.mixin(MarkdownEditor.prototype, /** @lends orion.edit.MarkdownEditor.prototype */ {
		install: function() {
			var root = this._rootDiv = document.createElement("div"); //$NON-NLS-0$
			root.style.width = "100%"; //$NON-NLS-0$
			root.style.height = "100%"; //$NON-NLS-0$
			var div = this._contentDiv = document.createElement("div"); //$NON-NLS-0$
			div.classList.add("orionMarkdown"); //$NON-NLS-0$
			root.appendChild(div);
			var parent = lib.node(this._domNode);
			parent.appendChild(root);
			this._contentDiv.innerHTML = createMarked(this.getModel().getText());
			BaseEditor.prototype.install.call(this);
		},
		setInput: function(title, message, contents, contentsSaved) {
			BaseEditor.prototype.setInput.call(this, title, message, contents, contentsSaved);
			if (!message && !contentsSaved) {
				this._contentDiv.innerHTML = createMarked(contents);
			}
		},
		uninstall: function() {
			lib.empty(this._domNode);
			BaseEditor.prototype.uninstall.call(this);
		}
	});

	function MarkdownEditorView(options) {
		this._parent = options.parent;
		this.serviceRegistry = options.serviceRegistry;
		this.contentTypeRegistry = options.contentTypeRegistry;
		this.commandRegistry = options.commandRegistry;
		this.progress = options.progressService;
		this.model = options.model;
		this.undoStack = options.undoStack;
	}
	MarkdownEditorView.prototype = {
		create: function() {
			this.editor = new MarkdownEditor({
				domNode: this._parent,
				model: this.model,
				undoStack: this.undoStack
			});
			this.editor.install();
		},
		destroy: function() {
			if (this.editor) {
				this.editor.destroy();
			}
			this.editor = null;
		}
	};

	return {
		MarkdownEditorView: MarkdownEditorView,
		MarkdownView: MarkdownView
	};
});