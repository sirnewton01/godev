/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['i18n!orion/widgets/nls/messages', 'orion/webui/dialog', 'orion/fileUtils', 'orion/selection', 'orion/explorers/explorer', 'orion/explorers/explorer-table'], 
function(messages, dialog, mFileUtils, mSelection, mExplorer, mExplorerTable) {

	function DirectoryPrompterRenderer (options, explorer) {
		this.explorer = explorer;
		this._init(options);
	}
	DirectoryPrompterRenderer.prototype = new mExplorer.SelectionRenderer(); 
	DirectoryPrompterRenderer.prototype.constructor = DirectoryPrompterRenderer;
	DirectoryPrompterRenderer.prototype.getLabelColumnIndex = function() {
		return 0;
	};
	DirectoryPrompterRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var col = document.createElement("td"); //$NON-NLS-0$
		tableRow.appendChild(col);
		var span = document.createElement("span"); //$NON-NLS-0$
		span.id = tableRow.id+"navSpan"; //$NON-NLS-0$
		col.appendChild(span);
		span.className = "mainNavColumn singleNavColumn"; //$NON-NLS-0$
		this.getExpandImage(tableRow, span);
		span.appendChild(document.createTextNode(item.Name)); 
	};

	/**
	* @param options {{
			func : function(item)     Function to be called with the selected item
			message : String          (Optional) Message to display in dialog.
			title : String            (Optional) Dialog title.
		}}
	 */
	 
	function DirectoryPrompterDialog(options) {
		this._init(options);
	}
	
	DirectoryPrompterDialog.prototype = new dialog.Dialog();


	DirectoryPrompterDialog.prototype.TEMPLATE = 
		'<div id="message" style="width: 25em; padding-bottom: 5px;"></div>' + //$NON-NLS-0$
		'<div id="directoryTree" class="explorerTreeClass" style="width:25em; min-height: 25em; max-height:30em; height: auto; overflow-y: auto;"></div>'; //$NON-NLS-0$

	DirectoryPrompterDialog.prototype._init = function(options) {
		this.title = options.title || messages['Choose a Folder'];
		this.modal = true;
		this.buttons = [{text: messages['OK'], isDefault: true, callback: this.done.bind(this)}]; 
		this.customFocus = true;
		this._fileClient = options.fileClient;
		this._serviceRegistry = options.serviceRegistry;
		this._message = options.message || "";
		this._func = options.func;
		this._initialize();
	};
	
	DirectoryPrompterDialog.prototype._bindToDom = function(parent) {
		// TODO this is assuming a particular file system
		this.loadFolderList("/");	// workspace root //$NON-NLS-0$
		if (this._message) {
			this.$message.appendChild(document.createTextNode(this._message));
		} else {
			this.$message.style.display = "none"; //$NON-NLS-0$
		}
		this.$directoryTree.focus();
	};
		
	DirectoryPrompterDialog.prototype.loadFolderList = function(path) {
		path = mFileUtils.makeRelative(path);
		this.selection = new mSelection.Selection(this._serviceRegistry, "orion.directoryPrompter.selection"); //$NON-NLS-0$

		this.explorer = new mExplorerTable.FileExplorer({treeRoot: {children:[]}, selection: this.selection, serviceRegistry: this._serviceRegistry,
				fileClient: this._fileClient, parentId: "directoryTree", excludeFiles: true, rendererFactory: function(explorer) {  //$NON-NLS-0$
					return new DirectoryPrompterRenderer({checkbox: false, singleSelection: true, treeTableClass: "directoryPrompter" }, explorer);   //$NON-NLS-0$
				}}); //$NON-NLS-0$
		this.explorer.loadResourceList(path, true, null);
	};
		
	DirectoryPrompterDialog.prototype.done = function() {
		this.selection.getSelection(function(selection) {
			this.hide();
			this._func(selection);
		}.bind(this));
	};
	
	DirectoryPrompterDialog.prototype.constructor = DirectoryPrompterDialog;
	//return the module exports
	return {DirectoryPrompterDialog: DirectoryPrompterDialog};

});