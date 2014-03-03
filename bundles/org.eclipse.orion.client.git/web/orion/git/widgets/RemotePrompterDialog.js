/*******************************************************************************
 * @license Copyright (c) 2011, 2014 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window document */

define([ 'i18n!git/nls/gitmessages', 'orion/webui/dialog', 'orion/explorers/explorer', 'orion/selection'], function(messages, dialog, mExplorer, mSelection) {

	var GitClonesModel = function() {
		/**
		 * Creates a new Git repository model
		 * 
		 * @name orion.git.widgets.GitClonesModel
		 */
		function GitClonesModel(gitClient, rootPath, fetchItems, root) {
			this.gitClient = gitClient;
			this.rootPath = rootPath;
			this.fetchItems = fetchItems;
			this.root = root ? root : null;
		}
		GitClonesModel.prototype = new mExplorer.ExplorerModel();

		GitClonesModel.prototype.getRoot = function(onItem) {
			var that = this;

			if (this.root) {
				onItem(this.root);
				return;
			}
			this.fetchItems(this.rootPath).then(function(item) {
				that.root = item;
				onItem(item);
			});
		};

		GitClonesModel.prototype.getIdentity = function(/* item */item) {
			var result;
			if (item.Location) {
				result = item.Location;
				// remove all non valid chars to make a dom id.
				result = result.replace(/[^\.\:\-\_0-9A-Za-z]/g, "");
			} else {
				result = "ROOT"; //$NON-NLS-0$
			}
			return result;
		};

		GitClonesModel.prototype.getChildren = function(parentItem, onComplete) {
			// the parent already has the children fetched
			parentItem.children = [];

			if (parentItem.Children) {
				for ( var i = 0; i < parentItem.Children.length; i++) {
					parentItem.Children[i].parent = parentItem;
					parentItem.children[i] = parentItem.Children[i];
				}
				onComplete(parentItem.Children);
			} else if (parentItem.BranchLocation && parentItem.RemoteLocation) {
				parentItem.children = [ { GroupNode : "true", //$NON-NLS-0$
				Location : parentItem.BranchLocation,
				Name : "Branches", //$NON-NLS-0$
				parent : parentItem
				}, { GroupNode : "true", //$NON-NLS-0$
				Location : parentItem.RemoteLocation,
				BranchLocation : parentItem.BranchLocation,
				Name : "Remotes", //$NON-NLS-0$
				parent : parentItem
				}, { GroupNode : "true", //$NON-NLS-0$
				Location : parentItem.TagLocation,
				Name : "Tags", //$NON-NLS-0$
				parent : parentItem
				} ];
				onComplete(parentItem.children);
			} else if (parentItem.GroupNode) {
				this.gitClient.getGitBranch(parentItem.Location).then(function(children) {
					parentItem.children = children.Children;
					for ( var i = 0; i < children.Children.length; i++) {
						children.Children[i].parent = parentItem;
					}
					onComplete(children.Children);
				});
			} else if (parentItem.Type === "Remote") { //$NON-NLS-0$
				this.gitClient.getGitBranch(parentItem.Location).then(function(children) {
					parentItem.children = children.Children;
					for ( var i = 0; i < children.Children.length; i++) {
						children.Children[i].parent = parentItem;
					}
					onComplete(children.Children);
				});
			}
		};

		return GitClonesModel;
	}();

	function RemotePrompterRenderer (options, explorer) {
		this.explorer = explorer;
		this._init(options);
	}
	RemotePrompterRenderer.prototype = new mExplorer.SelectionRenderer(); 
	RemotePrompterRenderer.prototype.constructor = RemotePrompterRenderer;
	RemotePrompterRenderer.prototype.getLabelColumnIndex = function() {
		return 0;
	};
	RemotePrompterRenderer.prototype.getCellElement = function(col_no, item, tableRow){
		var col = document.createElement("td"); //$NON-NLS-0$
		tableRow.appendChild(col);
		var span = document.createElement("span"); //$NON-NLS-0$
		span.id = tableRow.id+"navSpan"; //$NON-NLS-0$
		col.appendChild(span);
		span.className = "mainNavColumn singleNavColumn"; //$NON-NLS-0$
		if (item.children || item.Children || item.GroupNode || item.Type === "Remote" || (item.BranchLocation && item.RemoteLocation)) { //$NON-NLS-0$
			this.getExpandImage(tableRow, span);
		}
		var name = item.Name;
		if (item.Type === "RemoteTrackingBranch" && !item.Id) { //$NON-NLS-0$
			name = item.Name + messages[" [New branch]"];
		}
		span.appendChild(document.createTextNode(name)); 
	};

	function RemotePrompterDialog(options) {
		this._init(options);
	}

	RemotePrompterDialog.prototype = new dialog.Dialog();

	RemotePrompterDialog.prototype.TEMPLATE = '<div>'
			+ '<div id="treeContentPane" style="width:25em; min-height: 25em; max-height: 30em; height: auto; overflow-y: auto; padding: 8px"></div>'
			+ '<div id="newBranchPane" style="padding: 8px">' + '<label for="newBranch">${New Branch:}</label>'
			+ '<input id="newBranch" value="" disabled=true/>' + '</div>' + '</div>';

	RemotePrompterDialog.prototype._init = function(options) {
		var that = this;

		this.title = options.title || messages['Choose a Folder'];
		this.modal = true;
		this.messages = messages;
		this.func = options.func;
		this.treeRoot = options.treeRoot;
		this.gitClient = options.gitClient;
		this.hideNewBranch = options.hideNewBranch;
		this.serviceRegistry = options.serviceRegistry;

		this.buttons = [];

		this.buttons.push({ callback : function() {
			if (that.$remoteOk.classList.contains(this.DISABLED)) {
				return;
			}
			that.destroy();
			that._execute.bind(that)();
		},
		text : 'OK',
		isDefault: true,
		id: "remoteOk"
		});
	};

	RemotePrompterDialog.prototype._bindToDom = function(parent) {
		var that = this;

		this.$newBranch.addEventListener("input", function(evt) { //$NON-NLS-0$
			that._validate();
		});
		
		this.$newBranch.placeholder = messages["No remote selected"];

		if (this.hideNewBranch) {
			this.$newBranchPane.style.display = "none"; //$NON-NLS-0$
		}
	};

	RemotePrompterDialog.prototype._beforeShowing = function() {
		// Start the dialog initialization.
		this._initialize();
		this._loadRemoteChildren();
	};
	
	RemotePrompterDialog.prototype._afterShowing = function() {
		this.$treeContentPane.focus();
		this._validate();
	};

	RemotePrompterDialog.prototype._loadRemoteChildren = function() {
		var myTreeModel = new GitClonesModel(this.gitClient, null, this.gitClient.getGitClone, this.treeRoot);
		this._createTree(myTreeModel);
	};

	RemotePrompterDialog.prototype._createTree = function(myTreeModel) {
		var that = this;
		
		var selection = this.serviceRegistry.getService("orion.remotePrompter.selection"); //$NON-NLS-0$
		if (!selection) {
			selection = new mSelection.Selection(this.serviceRegistry, "orion.remotePrompter.selection"); //$NON-NLS-0$
		}
		var renderer = new RemotePrompterRenderer({checkbox: false, singleSelection: true, treeTableClass: "directoryPrompter"}); //$NON-NLS-0$
		this.explorer = new mExplorer.Explorer(this.serviceRegistry, selection, renderer);
		// TODO yuck.  Renderer needs to know explorer.  See https://bugs.eclipse.org/bugs/show_bug.cgi?id=389529
		renderer.explorer = this.explorer;
		this.explorer.createTree("treeContentPane", myTreeModel); //$NON-NLS-0$
		selection.addEventListener("selectionChanged", function(event) { //$NON-NLS-1$ //$NON-NLS-0$
			if (event.selection && event.selection.Type === "Remote") { //$NON-NLS-0$
				that.$newBranch.disabled = false;
				that.$newBranch.placeholder = messages["Enter a name..."];
			} else {
				that.$newBranch.disabled = true;
				that.$newBranch.placeholder = messages["No remote selected"];
			}
			that._validate(event.selection);
		});
	};

	RemotePrompterDialog.prototype._validate = function(selection) {
		var validateFunction = function(theSelection) {
			if (theSelection && theSelection.Type === "RemoteTrackingBranch") { //$NON-NLS-0$
				this.$remoteOk.classList.remove(this.DISABLED);
				return;
			} else if (theSelection && theSelection.Type === "Remote") { //$NON-NLS-0$
				if (this.$newBranch.value !== "") {
					this.$remoteOk.classList.remove(this.DISABLED);
					return;
				}
			}
			this.$remoteOk.classList.add(this.DISABLED);
		};
		if (selection) {
			validateFunction.bind(this)(selection);
		} else {
			this.serviceRegistry.getService("orion.remotePrompter.selection").getSelection(validateFunction.bind(this)); //$NON-NLS-0$
		}
	};

	RemotePrompterDialog.prototype._execute = function() {
		var that = this;
		this.serviceRegistry.getService("orion.remotePrompter.selection").getSelection(function(selection) { //$NON-NLS-0$
			if (that.func) {
				if (selection.Type === "RemoteTrackingBranch") { //$NON-NLS-0$
					that.func(selection, selection.parent);
				} else {
					var fileLocation = selection.CloneLocation.substring(selection.CloneLocation.indexOf(selection.CloneLocation.split("/")[3]));
					var newBranchObject = { };
					newBranchObject.parent = selection;
					newBranchObject.FullName = "refs/remotes/" + selection.Name + "/" + that.$newBranch.value; //$NON-NLS-1$ //$NON-NLS-0$
					newBranchObject.Name = selection.Name + "/" + that.$newBranch.value; //$NON-NLS-0$
					newBranchObject.Type = "RemoteTrackingBranch"; //$NON-NLS-0$
					newBranchObject.Location = "/gitapi/remote/" + selection.Name + "/" + //$NON-NLS-1$ //$NON-NLS-0$
						encodeURIComponent(encodeURIComponent(that.$newBranch.value)) + "/" + fileLocation; //$NON-NLS-0$
					that.func(null, selection, newBranchObject);
				}
			}		
		}); //$NON-NLS-0$

	};

	RemotePrompterDialog.prototype.constructor = RemotePrompterDialog;

	// return the module exports
	return { RemotePrompterDialog : RemotePrompterDialog
	};
});
