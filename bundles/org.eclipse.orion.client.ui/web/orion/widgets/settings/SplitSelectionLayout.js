/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: Anton McConville - IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/

/* This SettingsContainer widget is a container with a left and right side. The left is for choosing a 
   category, the right shows the resulting HTML for that category. */

define(['orion/webui/littlelib', 'orion/objects'], function(lib, objects) {
	/**
	 * @name orion.widgets.settings.SplitSelectionLayout
	 * @class
	 * @param {Object} options.pageActions
	 * @param {DomNode} selectionNode The parent node to use for display the categories.
	 * @param {DomNode} contentNode The parent node to use for display the selected category's content.
	 */
	function SplitSelectionLayout(options, selectionNode, contentNode) {
		objects.mixin(this, options);
		this.selectionNode = selectionNode;
		this.contentNode = contentNode;
		this.itemToIndexMap = null;
		this.toolbar = lib.node( this.pageActions );

		this.selectionNode.innerHTML = this.categoriesTemplateString;
		this.contentNode.innerHTML = this.contentTemplateString;
		this.navbar = lib.$('.navbar', this.selectionNode);
		this.table = lib.$('.split-selection-table', this.contentNode);
	}
	objects.mixin(SplitSelectionLayout.prototype, /** @lends orion.widgets.settings.SplitSelectionLayout.prototype */ {
		categoriesTemplateString: '' + //$NON-NLS-0$
				'<div id="categoryNode" class="sidePanelMargins">' + //$NON-NLS-0$
					'<ul class="navbar" role="tablist" aria-labelledby="content-title"></ul>' +  //$NON-NLS-0$
				'</div>', //$NON-NLS-0$
		contentTemplateString: '' + //$NON-NLS-0$
			'<div class="settings" role="tabpanel">' + //$NON-NLS-0$
			'	<div class="split-selection-table"></div>' + //$NON-NLS-0$
			'</div>', //$NON-NLS-0$

		/**
		 * Renders this widget.
		 */
		show: function() {
			this.itemToIndexMap = {};
			this.drawUserInterface();
		},

		// The knowledge that "pageActions" is the toolbar is something only "page glue" code should know.
		// We don't like widgets, etc. knowing this detail.
		updateToolbar: function(id) {
			// right now we only have tools for "plugins" category and the widget is handling those.
			// So our only job here is to empty the toolbar of any previous contributions.  
			// In the future, we might also want to ask each "category" to render its toolbar commands, and the plugin
			// category would know that the widget would handle this.
			if (this.toolbar) {
				lib.empty(this.toolbar);
			}
		},

		/**
		 * @param {Object} item A hash of properties that will be applied to the DOM element.
		 * @param {String} [item.id]
		 * @param {Function} [item.onclick] Special case: click handler for the category.
		 * @param {Number} [index]
		 */
		addCategory: function(item, index) {
			index = (typeof index === "undefined") ? 0 : index; //$NON-NLS-0$
			var li = document.createElement("li"); //$NON-NLS-0$
			li.classList.add('navbar-item'); //$NON-NLS-0$
			li.setAttribute('role', 'tab'); //$NON-NLS-1$ //$NON-NLS-0$
			li.setAttribute('aria-selected', 'false'); //$NON-NLS-1$ //$NON-NLS-0$
			li.tabIndex = -1;
			li.textContent = item.textContent;
			Object.keys(item).forEach(function(property) {
				if (property === 'show' || property === 'onclick') {
					li.addEventListener('click', item[property]);
				} else {
					li.setAttribute(property, item[property]);
				}
			});
			this.navbar.appendChild(li);
			this.itemToIndexMap[item.id] = index;
		},


		selectCategory: function(id) {

			if (this.selectedCategory) {
				this.selectedCategory.classList.remove("navbar-item-selected"); //$NON-NLS-0$
				this.selectedCategory.setAttribute("aria-selected", "false"); //$NON-NLS-1$ //$NON-NLS-0$
				this.selectedCategory.tabIndex = -1;
			}

			if (id) {
				this.selectedCategory = lib.node(id);
			}

			this.selectedCategory.classList.add("navbar-item-selected"); //$NON-NLS-0$
			this.selectedCategory.setAttribute("aria-selected", "true"); //$NON-NLS-1$ //$NON-NLS-0$
			this.contentNode.setAttribute("aria-labelledby", id); //$NON-NLS-0$
			this.selectedCategory.tabIndex = 0;
			this.selectedCategory.focus();
		},

		showSettings: function(id) {
			this.selectCategory(id);
			this.updateToolbar(id);
		},
		
		
		drawUserInterface: function() {
			lib.empty(this.navbar);

			var that = this, click;
			this.navbar.addEventListener('keydown', function(evt) { //$NON-NLS-0$
				if (evt.keyCode === lib.KEY.LEFT || evt.keyCode === lib.KEY.UP) {
					if (that.selectedCategory.previousSibling) {
						click = document.createEvent("MouseEvents"); //$NON-NLS-0$
						click.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null); //$NON-NLS-0$
						that.selectedCategory.previousSibling.dispatchEvent(click);
					}
				} else if (evt.keyCode === lib.KEY.RIGHT || evt.keyCode === lib.KEY.DOWN) {
					if (that.selectedCategory.nextSibling) {
						click = document.createEvent("MouseEvents"); //$NON-NLS-0$
						click.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null); //$NON-NLS-0$
						that.selectedCategory.nextSibling.dispatchEvent(click);
					}
				}
			});
		}
	});
	return SplitSelectionLayout;
});