/*******************************************************************************
 * @license Copyright (c) 2014 IBM Corporation and others. All rights
 *          reserved. This program and the accompanying materials are made
 *          available under the terms of the Eclipse Public License v1.0
 *          (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse
 *          Distribution License v1.0
 *          (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/

define([
	'i18n!git/nls/gitmessages',
	'orion/keyBinding',
	'orion/git/widgets/gitChangeList',
	'orion/git/widgets/gitFileList',
	'orion/git/widgets/gitCommitInfo',
	'orion/section',
	'orion/selection',
	'orion/commands',
	'orion/Deferred',
	'orion/explorers/explorer',
	'orion/commonHTMLFragments',
	'orion/git/gitCommands',
	'orion/i18nUtil',
	'orion/git/util',
	'orion/webui/littlelib',
	'orion/objects'
], function(messages, KeyBinding, mGitChangeList, mGitFileList, mGitCommitInfo, mSection, mSelection, mCommands, Deferred, mExplorer, mHTMLFragments, mGitCommands, i18nUtil, util, lib, objects) {

	var pageQuery = "page=1&pageSize=20"; //$NON-NLS-0$

	function GitCommitListModel(options) {
		this.root = options.root;
		this.showCommitChanges = options.showCommitChanges;
		this.section = options.section;
		this.handleError = options.handleError;
		this.repository = options.repository;
		this.progressService = options.progressService;
		this.statusService = options.statusService;
		this.gitClient = options.gitClient;
		this.progressService = options.progressService;
		this.simpleLog = options.simpleLog;
		this.parentId = options.parentId;
		this.targetRef = options.targetRef;
		this.log = options.log;
		this.location = options.location;
		if (!this.location && this.log) {
			if (this.log.toRef) {
				this.location = this.log.Location.substring(0, this.log.Location.length - this.log.RepositoryPath.length) || "";
			} else {
				this.location = this.log.Children[0].Location.substring(0, this.log.Children[0].Location.length - this.log.RepositoryPath.length) || "";
			}
		}
		if (!this.targetRef && this.log) {
			this.targetRef = this.log.toRef || this.log.Children[0];
		}
		this.repositoryPath = options.repositoryPath || (this.log && this.log.RepositoryPath) || "";
		this.filterQuery = "";
		this.authorQuery = "";
		this.committerQuery = "";
		this.sha1Query = "";
		this.fromDateQuery = "";
		this.toDateQuery = "";
	}
	GitCommitListModel.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitCommitListModel.prototype, /** @lends orion.git.GitCommitListModel.prototype */ {
		destroy: function(){
		},
		getRoot: function(onItem){
			onItem(this.root);
		},
		getQueries: function(extraQuery) {
			return util.generateQuery([pageQuery, this.filterQuery, this.authorQuery, this.committerQuery, this.sha1Query, this.fromDateQuery, this.toDateQuery, extraQuery]);
		},
		_getRepository: function(parentItem) {
			var that = this;
			return Deferred.when(that.log || that._getLog(parentItem), function(log) {
				return that.progressService.progress(that.gitClient.getGitClone(log.CloneLocation), "Getting repository details for " + log.Name).then(function(resp) { //$NON-NLS-0$
					var repository = resp.Children[0];
					log.Clone = repository;
					log.ContentLocation = repository.ContentLocation;
					return that.root.repository = repository;
				});
			}, function(error){
				that.handleError(error);
			});
		},
		_getLog: function(parentItem) {
			var that = this;
			var logMsg = that.location ? messages["Getting git log"] : i18nUtil.formatMessage(messages['Getting commits for \"${0}\" branch'], that.currentBranch.Name);
			var ref = that.simpleLog ? that.getTargetReference() : that.getActiveBranch();
			if (that.isNewBranch(ref)) {
				ref = that.getActiveBranch();
			}
			var location = parentItem.more ? parentItem.location : ((that.location || ref.CommitLocation || ref.Location) + that.repositoryPath + that.getQueries());
			return that.progressService.progress(that.gitClient.doGitLog(location), logMsg).then(function(resp) {
				if (that.location && resp.Type === "RemoteTrackingBranch") { //$NON-NLS-0$
					return that.progressService.progress(that.gitClient.doGitLog(resp.CommitLocation + that.repositoryPath + that.getQueries(), logMsg)).then(function(resp) { //$NON-NLS-0$
						return resp;
					}, function(error){
						that.handleError(error);
					});
				}
				return resp;
			}, function(error){
				that.handleError(error);
			});
		},
		_getOutgoing: function() {
			var that = this;
			var activeBranch = this.getActiveBranch();
			var targetRef = this.getTargetReference();
			var location = (targetRef.CommitLocation || targetRef.Location) + that.repositoryPath  + that.getQueries();
			var id = activeBranch.Name;
			return that.progressService.progress(that.gitClient.getLog(location, id), messages['Getting outgoing commits']).then(function(resp) {
				return that.outgoingCommits = resp;
			});
		},
		_getIncoming: function() {
			var that = this;
			var activeBranch = this.getActiveBranch();
			var targetRef = this.getTargetReference();
			var location = (activeBranch.CommitLocation || activeBranch.Location) + that.repositoryPath  + that.getQueries();
			var id = targetRef.Name;
			return that.progressService.progress(that.gitClient.getLog(location, id), messages['GetGitIncomingMsg']).then(function(resp) {
				return that.incomingCommits = resp;
			});
		},
		_getSync: function() {
			var that = this;
			var activeBranch = this.getActiveBranch();
			var targetRef = this.getTargetReference();
			var location = (targetRef.CommitLocation || targetRef.Location) + that.repositoryPath  + that.getQueries("mergeBase=true"); //$NON-NLS-0$
			var id = activeBranch.Name;
			return that.progressService.progress(that.gitClient.getLog(location, id), messages["Getting git log"]).then(function(resp) {
				return that.syncCommits = resp;
			});
		},
		getActiveBranch: function() {
			return this.currentBranch;
		},
		getTargetReference: function() {
			if (this.targetRef) {
				return this.targetRef;
			}
			var ref = this.currentBranch;
			return ref && ref.RemoteLocation[0] && ref.RemoteLocation[0].Children[ref.RemoteLocation[0].Children.length - 1];
		},
		tracksRemoteBranch: function(){
			if (this.targetRef) {
				if (this.isNewBranch(this.targetRef)) {
					return false;
				}
				return true;
			}
			return util.tracksRemoteBranch(this.currentBranch);
		},
		isFiltered: function() {
			return this.filterQuery || this.authorQuery || this.committerQuery || this.sha1Query || this.repositoryPath || this.fromDateQuery || this.toDateQuery;
		},
		isRebasing: function() {
			var repository = this.root.repository;
			return repository && repository.status && repository.status.RepositoryState === "REBASING_INTERACTIVE"; //$NON-NLS-0$
		},
		isNewBranch: function(branch) {
			return util.isNewBranch(branch);
		},
		getChildren: function(parentItem, onComplete) {
			var that = this;
			var tracksRemoteBranch = this.tracksRemoteBranch();
			var getSimpleLog = function() {
				return Deferred.when(that.log || that._getLog(parentItem), function(log) {
					that.log = parentItem.log = log;
					var children = log.Children.slice(0);
					onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, children, log)));
					return log;
				}, function(error){
					that.handleError(error);
				});
			};
			if (parentItem instanceof Array && parentItem.length > 0) {
				onComplete(parentItem);
			} else if (parentItem.children && !parentItem.more) {
				onComplete(parentItem.children);
			} else if (parentItem.Type === "CommitRoot") { //$NON-NLS-0$
				var section = this.section;
				var progress = section ? section.createProgressMonitor() : null;
				if (progress) progress.begin(messages["Getting git log"]);
				return Deferred.when(parentItem.repository || that._getRepository(parentItem), function(repository) {
					var currentBranchMsg = i18nUtil.formatMessage(messages['GettingCurrentBranch'], repository.Name);
					if (progress) progress.worked(currentBranchMsg);
					that.progressService.progress(that.gitClient.getGitBranch(repository.BranchLocation + "?commits=0&page=1&pageSize=1"), currentBranchMsg).then(function(resp) { //$NON-NLS-0$
						var currentBranch = resp.Children[0];
						that.currentBranch = currentBranch;
						if (!that.currentBranch && that.isRebasing()) {
							if (section) section.setTitle(messages["RebaseProgress"]);
							onComplete([]);
							if (progress) progress.done();
							return;
						}
						if (!that.currentBranch) {
							if (section) section.setTitle(messages["NoBranch"]);
							onComplete(that.processChildren(parentItem, []));
							if (progress) progress.done();
							return;
						}
						repository.ActiveBranch = currentBranch.CommitLocation;
						repository.CurrentBranch = currentBranch;
						var activeBranch = that.getActiveBranch();
						var targetRef = that.getTargetReference();
						if (section) {
							if (that.simpleLog && targetRef) {
								section.setTitle(i18nUtil.formatMessage(messages[targetRef.Type + ' (${0})'], util.shortenRefName(targetRef)));
							} else {
								section.setTitle(i18nUtil.formatMessage(messages['Active Branch (${0})'], util.shortenRefName(activeBranch)));
							}
						}
						if (progress) progress.done();
						if (that.simpleLog) {
							that.outgoingItem = that.incomingItem = that.syncItem = null;
							return getSimpleLog();
						} else {
							return Deferred.when(repository.status || (repository.status = that.progressService.progress(that.gitClient.getGitStatus(repository.StatusLocation), messages['Getting changes'])), function(status) { //$NON-NLS-0$
								repository.status = status;
								onComplete(that.processChildren(parentItem, [
									status,
									that.outgoingItem = {
										Type: "Outgoing", //$NON-NLS-0$
										selectable: false,
										isNotSelectable: true,
									},
									that.incomingItem = {
										Type: "Incoming", //$NON-NLS-0$
										selectable: false,
										isNotSelectable: true,
									},
									that.syncItem = {
										Type: "Synchronized", //$NON-NLS-0$
										selectable: false,
										isNotSelectable: true,
									}
								]));
							}, function(error){
								if (progress) progress.done();
								that.handleError(error);
							});
						}	
					}, function(error){
						if (progress) progress.done();
						that.handleError(error);
					});
				}, function(error){
					if (progress) progress.done();
					that.handleError(error);
				});
			} else if (parentItem.Type === "Incoming") { //$NON-NLS-0$
				if (tracksRemoteBranch) {
					return Deferred.when(parentItem.more ? that._getLog(parentItem) : that.incomingCommits || that._getIncoming(), function(incomingCommits) {
						incomingCommits.Children.forEach(function(commit) {
							commit.incoming = true;
						});
						onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, incomingCommits.Children.slice(0), incomingCommits)));
					}, function(error) {
						that.handleError(error);
					});
				} else {
					return Deferred.when(that.log || that._getLog(parentItem), function(log) {
						that.log = parentItem.log = log;
						var children = [];
						if (log.toRef.Type === "RemoteTrackingBranch") { //$NON-NLS-0$
							log.Children.forEach(function(commit) {
								commit.incoming = true;
							});
							children = that.processMoreChildren(parentItem, log.Children.slice(0), log);
						}
						onComplete(that.processChildren(parentItem, children));
					}, function(error){
						that.handleError(error);
					});
				}
			} else if (parentItem.Type === "Outgoing") { //$NON-NLS-0$
				if (tracksRemoteBranch) {
					return Deferred.when(parentItem.more ? that._getLog(parentItem) : that.outgoingCommits || that._getOutgoing(), function(outgoingCommits) {
						outgoingCommits.Children.forEach(function(commit) {
							commit.outgoing = true;
						});
						if (outgoingCommits.Children[0]) {
							outgoingCommits.Children[0].top = true;
						}
						onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, outgoingCommits.Children.slice(0), outgoingCommits)));
					}, function(error){
						that.handleError(error);
					});
				} else if (that.getTargetReference()) {
					return Deferred.when(that.log || that._getLog(parentItem), function(log) {
						that.log = parentItem.log = log;
						var children = [];
						if (log.toRef.Type === "Branch") { //$NON-NLS-0$
							log.Children.forEach(function(commit) {
								commit.outgoing = true;
							});
							if (log.Children[0]) {
								log.Children[0].top = true;
							}
							children = that.processMoreChildren(parentItem, log.Children.slice(0), log);
						} 
						onComplete(that.processChildren(parentItem, children));
					}, function(error){
						that.handleError(error);
					});
				} else {
					onComplete(that.processChildren(parentItem, []));
				}
			} else if (parentItem.Type === "Synchronized") { //$NON-NLS-0$
				if (tracksRemoteBranch) {
					return Deferred.when(parentItem.more ? that._getLog(parentItem) : that.syncCommits || that._getSync(), function(syncCommits) {
						syncCommits.Children.forEach(function(commit) {
							commit.history = true;
						});
						onComplete(that.processChildren(parentItem, that.processMoreChildren(parentItem, syncCommits.Children.slice(0), syncCommits)));
					}, function(error) {
						that.handleError(error);
					});
				} else if (!that.getTargetReference()) {
					getSimpleLog().then(function(syncCommits){
						syncCommits.Children.forEach(function(commit) {
							commit.history = true;
						});					
					});
				} else {
					onComplete(that.processChildren(parentItem, []));
				}
			} else if ((parentItem.Type === "Commit" || parentItem.Type === "StashCommit")  && that.showCommitChanges) { //$NON-NLS-1$ //$NON-NLS-0$
				onComplete(that.processChildren(parentItem, [{Type: "CommitChanges"}]));  //$NON-NLS-0$
			} else {
				onComplete([]);
			}
		},
		getId: function(/* item */ item){
			return this.parentId + (item.Name ? item.Name : "") + (item.Type ? item.Type : ""); //$NON-NLS-0$
		},
		processMoreChildren: function(parentItem, children, item, type) {
			type = type || "MoreCommits"; //$NON-NLS-0$ /* use more commits by default */
			
			var fullList = parentItem.children;
			if (fullList) {
				var args = [fullList.length - 1, 1].concat(children);
				Array.prototype.splice.apply(fullList, args);
			} else {
				fullList = children;
			}
			if (item.NextLocation) {
				fullList.push({Type: type, NextLocation: item.NextLocation, selectable: false, isNotSelectable: true}); //$NON-NLS-0$
			}
			return fullList;
		},
		processChildren: function(parentItem, items) {
			if (items.length === 0) {
				items = [{Type: "NoCommits", selectable: false, isNotSelectable: true}]; //$NON-NLS-0$
			}
			items.forEach(function(item) {
				item.parent = parentItem;
			});
			parentItem.children = items;
			return items;
		}
	});
	
	/**
	 * @class orion.git.GitCommitListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitCommitListExplorer(options) {
		var renderer = new GitCommitListRenderer({
			noRowHighlighting: true,
			registry: options.serviceRegistry,
			commandService: options.commandRegistry,
			actionScopeId: options.actionScopeId,
			cachePrefix: "LogNavigator", //$NON-NLS-0$
			checkbox: false
		}, this);
		mExplorer.Explorer.call(this, options.serviceRegistry, options.selection, renderer, options.commandRegistry);	
		this.checkbox = false;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.section = options.section;
		this.root = options.root;
		this.handleError = options.handleError;
		this.location = options.location;
		this.gitClient = options.gitClient;
		this.fileClient = options.fileClient;
		this.progressService = options.progressService;
		this.statusService = options.statusService;
		this.targetRef = options.targetRef;
		this.log = options.log;
		this.simpleLog = options.simpleLog;
		this.autoFetch = options.autoFetch;
		this.slideout = options.slideout;
		this.selectionPolicy = options.selectionPolicy;
		this.repositoryPath = options.repositoryPath || "";
		
		this.incomingActionScope = "IncomingActions"; //$NON-NLS-0$
		this.outgoingActionScope = "OutgoingActions"; //$NON-NLS-0$
		this.syncActionScope = "SynchronizedActions"; //$NON-NLS-0$

		if (this.selection) {
			this.selection.addEventListener("selectionChanged", function(e) { //$NON-NLS-0$
				this.updateSelectionCommands(e.selections);
			}.bind(this));
		}
		mGitCommands.getModelEventDispatcher().addEventListener("modelChanged", this._modelListener = function(event) { //$NON-NLS-0$
			switch (event.action) {
			case "addTag": //$NON-NLS-0$
				this.changedItem(event.commit.parent);
				break;
			case "removeTag": //$NON-NLS-0$
				var parent = event.tag.parent;
				if (parent && parent.Type === "Commit") { //$NON-NLS-0$
					parent = parent.parent;
				} else {
					parent = null;
				}
				this.changedItem(parent);
				break;
			case "fetch": //$NON-NLS-0$
			case "push": //$NON-NLS-0$
			case "pull": //$NON-NLS-0$
			case "sync": //$NON-NLS-0$
			case "rebase": //$NON-NLS-0$
			case "merge": //$NON-NLS-0$
			case "mergeSquash": //$NON-NLS-0$
			case "reset": //$NON-NLS-0$
				this.changedItem();
				break;
			case "commit": //$NON-NLS-0$
			case "revert": //$NON-NLS-0$
				this.changedItem(this.model.outgoingItem);
				break;
			case "applyPatch":  //$NON-NLS-0$
			case "stage": //$NON-NLS-0$
			case "unstage": //$NON-NLS-0$
			case "stash": //$NON-NLS-0$
			case "popStash": //$NON-NLS-0$
			case "applyStash": //$NON-NLS-0$
			case "checkoutFile": //$NON-NLS-0$
				Deferred.when(this.model.root.repository.status, function(status) {
					this.myTree.redraw(status);
				}.bind(this));
				break;
			}
		}.bind(this));
		this.createCommands();
	}
	GitCommitListExplorer.prototype = Object.create(mExplorer.Explorer.prototype);
	objects.mixin(GitCommitListExplorer.prototype, /** @lends orion.git.GitCommitListExplorer.prototype */ {
		destroy: function(){
			mGitCommands.getModelEventDispatcher().removeEventListener("modelChanged", this._modelListener); //$NON-NLS-0$
			mExplorer.Explorer.prototype.destroy.call(this);
		},
		changedItem: function(item) {
			var deferred = new Deferred();
			var that = this;
			var model = this.model;
			if (!item) {
				model.getRoot(function(root) {
					item = root;
				});
			}
			
			if (item.Type === "CommitRoot") { //$NON-NLS-0$
				model.syncCommits = model.incomingCommits = model.outgoingCommits = null;
			}
			if (item.Type === "Outgoing") { //$NON-NLS-0$
				model.outgoingCommits = null;
			}
			if (item.Type === "Incoming") { //$NON-NLS-0$
				model.incomingCommits = null;
			}
			if (item.Type === "Synchronized") { //$NON-NLS-0$
				model.syncCommits = null;
			}
			model.log = null;
			if (!item.more) {
				item.children = null;
			}
			var progress = this.section ? this.section.createProgressMonitor() : null;
			if (progress) progress.begin(messages["Getting git log"]);
			model.getChildren(item, function(children) {
				item.removeAll = true;
				that.myTree.refresh.bind(that.myTree)(item, children, false);
				if (item.Type === "CommitRoot") { //$NON-NLS-0$
					that.expandSections(children);
				}
				if (item.Type !== "Synchronized") { //$NON-NLS-0$
					that.updateCommands();
				}
				if (progress) progress.done();
				deferred.resolve(children);
			});
			return deferred;
		},
		createFilter: function() {
			if (!this.section) return;
			var sections = [], mainSection;
			var doFilter = function() {
				if (sections.every(function(s) {
					var prop = s.query.key + "Query"; //$NON-NLS-0$
					var field = lib.$(".gitFilterInput", s.domNode); //$NON-NLS-0$
					if (field.value && s.query.isValid) {
						if (!s.query.isValid(field.value)) {
							field.classList.add("invalidParam"); //$NON-NLS-0$
							field.select();
							return false;
						}
					} 
					if (s.query.setValue) {
						s.query.setValue(field.value);
					} else {
						s.query.value = field.value;
					}
					this.model[prop] = s.query.createQuery();
					field.classList.remove("invalidParam"); //$NON-NLS-0$
					return true;
				}.bind(this))) {
					mainSection.setHidden(true);
					this.changedItem();
				}
			}.bind(this);
			function doClear() {
				sections.forEach(function(s) {
					var field = lib.$(".gitFilterInput", s.domNode); //$NON-NLS-0$
					field.value = "";
				});
				doFilter();
			}
			var blurHandler = function(e) {
				var relatedTarget = e.relatedTarget || e.toElement;
				function check(focus) {
					if (!(focus === document.body || lib.contains(mainSection.domNode, focus) || lib.contains(mainSection.getContentElement(), focus))) {
						mainSection.setHidden(true);
					}
				}
				if (relatedTarget) {
					check(relatedTarget);
				} else {
					setTimeout(function () { check(document.activeElement); }, 10);
				}
			};
			var keyHandler = function(event){ //$NON-NLS-0$
				if (event.keyCode === lib.KEY.ENTER) {
					doFilter();
					event.preventDefault();
				}
				if (event.keyCode === lib.KEY.ESCAPE) {
					mainSection.setHidden(true);
					event.preventDefault();
				}
			};
			var createSection = function (parent, sibling, title, query, canHide, dropdown, noTwistie, expandOnFocus) {
				var section = new mSection.Section(parent, {
					id: title + "commitFilterSection", //$NON-NLS-0$
					title: title,
					canHide: canHide,
					hidden: true,
					sibling: sibling,
					dropdown: dropdown,
					noTwistie: noTwistie,
					preferenceService: this.preferencesService
				});
				section.domNode.classList.add("gitFilterBox"); //$NON-NLS-0$
				var filter = document.createElement("input"); //$NON-NLS-0$
				filter.className = "gitFilterInput"; //$NON-NLS-0$
				filter.placeholder = messages["Filter " + query.key];
				section.query = query;
				section.searchBox.appendChild(filter);
				filter.addEventListener("keydown", keyHandler); //$NON-NLS-0$
				filter.addEventListener("input", function(event) { //$NON-NLS-0$
					event.target.classList.remove("invalidParam"); //$NON-NLS-0$
				});
				
				if (expandOnFocus) {
					filter.addEventListener("focus", function(){ //$NON-NLS-0$
						section.setHidden(false);
					});
					filter.addEventListener("click", function(){ //$NON-NLS-0$
						section.setHidden(false);
					});
				}
				filter.addEventListener("blur", blurHandler); //$NON-NLS-0$
				return section;
			}.bind(this);
			
			var content = this.section.getContentElement();
			mainSection = this.filterSection = new mSection.Section(content, {
				id: "commitFilterSection", //$NON-NLS-0$
				title: "\u00A0", //$NON-NLS-0$
				canHide: true,
				hidden: true,
				sibling: content.firstChild,
				dropdown: true,
				positionNode: this.section.domNode,
				preferenceService: this.preferencesService
			});
			mainSection.domNode.classList.add("commitFilterHeader"); //$NON-NLS-0$
			mainSection.getContentElement().classList.add("commitFilterHeader"); //$NON-NLS-0$
			mainSection.domNode.tabIndex = -1;
			mainSection.addEventListener("toggle", function(event){ //$NON-NLS-0$
				if (event.isExpanded) {
					sections.forEach(function(s) {
						var field = lib.$(".gitFilterInput", s.domNode); //$NON-NLS-0$
						var result = s.query.getValue ? s.query.getValue() : s.query.value;
						if (result !== undefined) {
							field.value = result;
						}
					}.bind(this));
				} else {
					sections.forEach(function(s) {
						s.setHidden(true);
					});
				}
			}.bind(this));

			
			var createStringQuery = function() {
				return this.value ? this.key + "=" + encodeURIComponent(this.value) : ""; //$NON-NLS-0$ 
			};
			
			var createDateQuery = function() {
				return this.value ? this.key + "=" + new Date(this.calcDate ? this.calcDate : this.value).getTime() : ""; //$NON-NLS-0$ 
			};
			
			var calculateDate = function(date) {
				var relativePattern = /^([1-9][0-9]*)([hdwmy])$|^([N|n]ow)$/;
				var result = relativePattern.exec(date);
				if (result) {
					var number = result[1];
					var type = result[2];
					var now = result[3];
					if (number && type) {
						var tempDate = new Date();
						switch (type) {
							case "h":  //$NON-NLS-0$
								date = tempDate.setHours(tempDate.getHours() - number);
								break;
							case "d":  //$NON-NLS-0$
								date = tempDate.setDate(tempDate.getDate() - number);
								break;
							case "w":  //$NON-NLS-0$
								date = tempDate.setDate(tempDate.getDate() - (number*7));
								break;
							case "m":  //$NON-NLS-0$
								date = tempDate.setMonth(tempDate.getMonth() - number);
								break;
							case "y":  //$NON-NLS-0$
								date = tempDate.setFullYear(tempDate.getFullYear() - number);
								break;
						}
					} else if (now) {
						date = new Date();
					}
				}
				return date;
			};
			
			var isValidDate = function(date) {
				this.calcDate = calculateDate(date);
				var d = new Date(this.calcDate);
				return !isNaN(d.valueOf());
			};
			
			content = mainSection.getContentElement();
			var messageSection = createSection(content, null, messages["Message:"], {key: "filter", createQuery: createStringQuery}); //$NON-NLS-0$
			messageSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			messageSection.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$

			var authorSection = createSection(content, null, messages["Author:"],  {key: "author", createQuery: createStringQuery}); //$NON-NLS-0$
			authorSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			authorSection.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$

			var committerSection = createSection(content, null, messages["Committer:"],  {key: "committer", createQuery: createStringQuery}); //$NON-NLS-0$
			committerSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			committerSection.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$

			var sha1Section = createSection(content, null, messages["SHA1:"],  {key: "sha1", createQuery: createStringQuery}); //$NON-NLS-0$
			sha1Section.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			sha1Section.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$
			
			var fromDateSection = createSection(content, null, messages["fromDate:"],  {key: "fromDate", createQuery: createDateQuery, isValid: isValidDate, calcDate: ""}); //$NON-NLS-0$
			fromDateSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			fromDateSection.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$
			
			var toDateSection = createSection(content, null, messages["toDate:"],  {key: "toDate", createQuery: createDateQuery, isValid: isValidDate, calcDate: ""}); //$NON-NLS-0$
			toDateSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			toDateSection.getContentElement().classList.add("commitFilter"); //$NON-NLS-0$
			var that = this;
			var pathSection = createSection(content, null, messages["Path:"],  {
				key: "path", //$NON-NLS-0$
				createQuery: function() {return "";}, 
				getValue: function() {return that.model.repositoryPath;}, 
				setValue: function(s) {that.repositoryPath = that.model.repositoryPath = s;}
			}, true, false, true, true);
			pathSection.domNode.classList.add("commitFilter"); //$NON-NLS-0$
			pathSection.getContentElement().classList.add("pathFilter"); //$NON-NLS-0$
			pathSection.domNode.tabIndex = -1;
			var selection = this.treeSelection = new mSelection.Selection(this.registry, "orion.selection.commitTree"); //$NON-NLS-0$
			var explorer  = this.treeNavigator = new mGitFileList.GitFileListExplorer({
				serviceRegistry: this.registry,
				commandRegistry: this.commandService,
				parentId: pathSection.getContentElement(),
				repository: this.root.repository,
				fileClient: this.fileClient,
				section: pathSection,
				selection: selection,
				selectionPolicy: "singleSelection", //$NON-NLS-0$
				handleError: this.handleError.bind(this),
				gitClient: this.gitClient,
				progressService: this.progressService
			});
			pathSection.addEventListener("toggle", function(e) { //$NON-NLS-0$
				if (e.isExpanded) {
					var location;
					var model = this.model;
					var commit = this.selection && this.selection.getSelection();
					if (commit && commit.Type === "Commit") { //$NON-NLS-0$
						location = commit.TreeLocation;
					} else {
						location = (model.simpleLog ? model.getTargetReference() : model.getActiveBranch()).TreeLocation;
					}
					if (!location) return;
					explorer.display(location).then(function() {
						explorer.myTree.expand(explorer.model.root);
					}.bind(this));
				}
			}.bind(this));
			pathSection.getContentElement().addEventListener("keydown", keyHandler); //$NON-NLS-0$
			pathSection.getContentElement().addEventListener("blur", blurHandler); //$NON-NLS-0$
			selection.addEventListener("selectionChanged", function(e) { //$NON-NLS-0$
				var selected = e.selection;
				if (!selected || this.treePath === selected) return;
				var field = lib.$(".gitFilterInput", pathSection.domNode); //$NON-NLS-0$
				field.value = util.relativePath(selected);
			}.bind(this));
			
			
			var filterActions = document.createElement("div"); //$NON-NLS-0$
			filterActions.className = "commitFilterActions"; //$NON-NLS-0$
			content.appendChild(filterActions);
			var actionsArea = document.createElement("ul"); //$NON-NLS-0$
			actionsArea.className = "layoutRight commandList"; //$NON-NLS-0$
			actionsArea.id = "commitFilterActions"; //$NON-NLS-0$
			filterActions.appendChild(actionsArea);
			this.commandService.registerCommandContribution(actionsArea.id, "eclipse.orion.git.commit.clearFilter", 300); //$NON-NLS-0$
			this.commandService.registerCommandContribution(actionsArea.id, "eclipse.orion.git.commit.performFilter", 400); //$NON-NLS-0$
			this.commandService.renderCommands(actionsArea.id, actionsArea, {
				filter: doFilter,
				clear: doClear
			}, explorer, "button"); //$NON-NLS-0$
			[].forEach.call(lib.$$(".orionButton", filterActions), function(b) { //$NON-NLS-0$
				b.addEventListener("blur", blurHandler); //$NON-NLS-0$
			});

			sections.push(messageSection);
			sections.push(authorSection);
			sections.push(committerSection);
			sections.push(sha1Section);
			sections.push(fromDateSection);
			sections.push(toDateSection);
			sections.push(pathSection);
		},
		display: function() {
			var that = this;
			var deferred = new Deferred();
			var model = new GitCommitListModel({
				root: this.root,
				registry: this.registry,
				progressService: this.progressService,
				statusService: this.statusService,
				gitClient: this.gitClient,
				section: this.section,
				location: this.location,
				handleError: this.handleError,
				parentId: this.parentId,
				repositoryPath: this.repositoryPath,
				log: this.log,
				targetRef: this.targetRef,
				simpleLog: this.simpleLog
			});
			this.createFilter(this.parentId);
			this.createTree(this.parentId, model, {
				setFocus: false, // do not steal focus on load
				selectionPolicy: this.selectionPolicy,
				onComplete: function() {
					that.status = model.status;
					var fetched = function() {
						var children = [];
						that.model.getRoot(function(root) {
							that.model.getChildren(root, function(c) {
								children = c;
							});
						});
						that.expandSections(children).then(function() {
							that.updateCommands();
							deferred.resolve(model.log);
						});
					};
					that.fetch().then(fetched, fetched);
				}
			});
			return deferred;
		},
		expandSections: function(children) {
			var deferreds = [];
			if (!this.simpleLog && !this.model.isRebasing()) {
				for (var i = 0; i < children.length; i++) {
					var deferred = new Deferred();
					deferreds.push(deferred);
					this.myTree.expand(this.model.getId(children[i]), function (d) {
						d.resolve();
					}, [deferred]);
				}
			}
			return Deferred.all(deferreds);
		},
		isRowSelectable: function() {
			return !!this.selection;
		},
		createCommands: function() {
			var that = this;
			var commandService = this.commandService;
			
			var simpleLogCommand = new mCommands.Command({
				id: "eclipse.orion.git.commit.simpleLog", //$NON-NLS-0$
				callback: function(data) {
					var model = that.model;
					model.simpleLog = that.simpleLog = !simpleLogCommand.checked;
					data.handler.changedItem();
				},
				type: "switch", //$NON-NLS-0$
				visibleWhen: function() {
					simpleLogCommand.name = that.model.simpleLog ? messages["ShowActiveBranchCmd"] : messages["ShowReferenceCmd"];
					var targetRef = that.model.getTargetReference();
					if (!targetRef) return false;
					var imgClass;
					switch (targetRef.Type) {
						case "Tag": //$NON-NLS-0$ 
							imgClass = "git-sprite-branch-active-tag"; //$NON-NLS-0$
							break;
						case "Commit": //$NON-NLS-0$ 
							imgClass = "git-sprite-branch-active-commit"; //$NON-NLS-0$
							break;
						case "StashCommit": //$NON-NLS-0$ 
							imgClass = "git-sprite-branch-active-stash"; //$NON-NLS-0$
							break;
						case "Branch": //$NON-NLS-0$
						case "RemoteTrackingBranch": //$NON-NLS-0$
						default:
							imgClass = "git-sprite-branch-active-branch"; //$NON-NLS-0$
							
					}
					simpleLogCommand.imageClass = imgClass;
					var activeBranch = that.model.getActiveBranch();
					simpleLogCommand.tooltip = i18nUtil.formatMessage(messages[that.model.simpleLog ? "ShowActiveBranchTip" : "ShowReferenceTip"], activeBranch.Name, messages[targetRef.Type + "Type"], targetRef.Name);
					simpleLogCommand.checked = !that.model.simpleLog;
					return !that.model.isRebasing();
				}
			});
			commandService.addCommand(simpleLogCommand);
			
			var filterCommand = new mCommands.Command({
				id: "eclipse.orion.git.commit.toggleFilter", //$NON-NLS-0$
				name: messages["FilterCommits"],
				tooltip: messages["FilterCommitsTip"],
				callback: function(data) {
					if (data) this.filterSection.setHidden(!this.filterSection.hidden);
					data.domNode.focus();
				},
				visibleWhen: function() {
					filterCommand.imageClass = that.model.isFiltered() ? "core-sprite-show-filtered" : "core-sprite-filter"; //$NON-NLS-1$ //$NON-NLS-0$
					return !that.model.isRebasing();
				}
			});
			commandService.addCommand(filterCommand);
			
			var performFilterCommand = new mCommands.Command({
				id: "eclipse.orion.git.commit.performFilter", //$NON-NLS-0$
				name: messages["OK"],
				callback: function(data) {
					data.items.filter();
				},
				visibleWhen: function() {
					return true;
				}
			});
			commandService.addCommand(performFilterCommand);
			
			var clearFilterCommand = new mCommands.Command({
				id: "eclipse.orion.git.commit.clearFilter", //$NON-NLS-0$
				name: messages["Clear"],
				callback: function(data) {
					data.items.clear();
				},
				visibleWhen: function() {
					return true;
				}
			});
			commandService.addCommand(clearFilterCommand);
		},
		fetch: function() {
			var model = this.model;
			var activeBranch = model.getActiveBranch();
			if (this.autoFetch && !this.model.isRebasing() && activeBranch) {
				var remotes = [];
				var commandService = this.commandService;
				if (activeBranch.RemoteLocation) {
					activeBranch.RemoteLocation.forEach(function (remote) {
						if (remote) {
							remotes.push(commandService.runCommand("eclipse.orion.git.fetchRemote", {Remote: remote, noAuth: true}, this));  //$NON-NLS-0$
						}
					});
					if (remotes.length) return Deferred.all(remotes);
				}
			}
			return new Deferred().resolve();
		},
		updateSelectionCommands: function(items) {
			var commandService = this.commandService;
			var section = this.section;
			if (!section) return;
			var selectionNodeScope = section.selectionNode.id;
			if (lib.node(selectionNodeScope)) {
				commandService.destroy(selectionNodeScope);
			}
			commandService.renderCommands(selectionNodeScope, selectionNodeScope, items, this, "button"); //$NON-NLS-0$
		},
		updateCommands: function() {
			var model = this.model;
			var currentBranch = model.currentBranch;
			var repository = this.root.repository;
			var commandService = this.commandService;
			var section = this.section;
			if (!section) return;
			var actionsNodeScope = section.actionsNode.id;
			if (lib.node(actionsNodeScope)) {
				commandService.destroy(actionsNodeScope);
			}

			if (model.isRebasing()) {
				commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.rebaseContinueCommand", 200); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.rebaseSkipPatchCommand", 300); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.rebaseAbortCommand", 400); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandService.renderCommands(actionsNodeScope, actionsNodeScope, repository.status, this, "tool"); //$NON-NLS-0$
				return;
			}
			
			commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.commit.toggleFilter", 20, null, false, new KeyBinding.KeyBinding('h', true, true)); //$NON-NLS-1$ //$NON-NLS-0$
			commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.commit.simpleLog", 50); //$NON-NLS-0$
			commandService.registerCommandContribution(actionsNodeScope, "eclipse.orion.git.sync", 100); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

			var activeBranch = model.getActiveBranch();
			var targetRef = model.getTargetReference();
				
			if (currentBranch && !this.simpleLog) {
				var incomingActionScope = this.incomingActionScope;
				var outgoingActionScope = this.outgoingActionScope;
				
				if (lib.node(incomingActionScope)) {
					commandService.destroy(incomingActionScope);
				}
				if (lib.node(outgoingActionScope)) {
					commandService.destroy(outgoingActionScope);
				}
	
				commandService.addCommandGroup(incomingActionScope, "eclipse.gitFetchGroup", 500, messages['fetchGroup'], null, null, null, "Fetch", null, "eclipse.orion.git.fetch"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution(incomingActionScope, "eclipse.orion.git.fetch", 100, "eclipse.gitFetchGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				commandService.registerCommandContribution(incomingActionScope, "eclipse.orion.git.fetchForce", 200, "eclipse.gitFetchGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				
				commandService.registerCommandContribution(incomingActionScope, "eclipse.orion.git.merge", 300); //$NON-NLS-0$
				commandService.registerCommandContribution(incomingActionScope, "eclipse.orion.git.mergeSquash", 350); //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution(incomingActionScope, "eclipse.orion.git.rebase", 200); //$NON-NLS-0$
				commandService.renderCommands(incomingActionScope, incomingActionScope, targetRef, this, "tool"); //$NON-NLS-0$

				commandService.addCommandGroup(outgoingActionScope, "eclipse.gitPushGroup", 1000, messages['pushGroup'], null, null, null, "Push", null, "eclipse.orion.git.push"); //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				commandService.registerCommandContribution(outgoingActionScope, "eclipse.orion.git.push", 1100, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				commandService.registerCommandContribution(outgoingActionScope, "eclipse.orion.git.pushForce", 1200, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				commandService.registerCommandContribution(outgoingActionScope, "eclipse.orion.git.pushBranch", 1300, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				commandService.registerCommandContribution(outgoingActionScope, "eclipse.orion.git.pushForceBranch", 1400, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$
				commandService.registerCommandContribution(outgoingActionScope, "eclipse.orion.git.pushToGerrit", 1500, "eclipse.gitPushGroup"); //$NON-NLS-0$ //$NON-NLS-1$

				commandService.renderCommands(outgoingActionScope, outgoingActionScope, {LocalBranch: activeBranch, Remote: targetRef}, this, "tool"); //$NON-NLS-0$
			}
			commandService.renderCommands(actionsNodeScope, actionsNodeScope, {LocalBranch: activeBranch, Remote: targetRef}, this, "tool"); //$NON-NLS-0$
		}
	});
	
	function GitCommitListRenderer(options) {
		options.setFocus = false;   // do not steal focus on load
		options.cachePrefix = null; // do not persist table state
		mExplorer.SelectionRenderer.apply(this, arguments);
	}
	GitCommitListRenderer.prototype = Object.create(mExplorer.SelectionRenderer.prototype);
	objects.mixin(GitCommitListRenderer.prototype, {
		getCellElement: function(col_no, item, tableRow){
			var explorer = this.explorer;
			var commit = item;
			switch(col_no){
			case 0:
				var model = explorer.model;
				var td = document.createElement("td"); //$NON-NLS-0$

				if (item.Type === "MoreCommits") { //$NON-NLS-1$ //$NON-NLS-0$
					td.classList.add("gitCommitListMore"); //$NON-NLS-0$
					var ref = model.simpleLog ? model.getTargetReference() : model.getActiveBranch();
					var moreText;
					if (item.parent.Type === "Incoming" || item.parent.Type === "Outgoing") { //$NON-NLS-1$ //$NON-NLS-0$
						moreText = messages[item.parent.Type];
					} else {
						moreText = ref ? ref.Name : model.root.Name;
					}
					var moreButton = document.createElement("button"); //$NON-NLS-0$
					moreButton.className = "commandButton"; //$NON-NLS-0$
					moreButton.textContent = i18nUtil.formatMessage(messages[item.Type], moreText);
					td.appendChild(moreButton);
					var listener;
					moreButton.addEventListener("click", listener = function() { //$NON-NLS-0$
						moreButton.removeEventListener("click", listener); //$NON-NLS-0$
						moreButton.textContent = i18nUtil.formatMessage(messages[item.Type + "Progress"], ref ? ref.Name : model.root.Name);
						item.parent.location = item.NextLocation;
						item.parent.more = true;
						explorer.changedItem(item.parent).then(function() {
							item.parent.more = false;
						});
					});
					return td;
				}

				var sectionItem = document.createElement("div"); //$NON-NLS-0$
				td.appendChild(sectionItem);
				var horizontalBox = document.createElement("div"); //$NON-NLS-0$
				horizontalBox.classList.add("gitListCell"); //$NON-NLS-0$
				sectionItem.appendChild(horizontalBox);	
				var that = this;
				function createExpand() {
					var expandContainer = document.createElement("div"); //$NON-NLS-0$
					expandContainer.style.display = "inline-block"; //$NON-NLS-0$
					expandContainer.style.styleFloat = "left"; //$NON-NLS-0$
					expandContainer.style.cssFloat = "left"; //$NON-NLS-0$
					var expandImage = that.getExpandImage(tableRow, expandContainer);
					horizontalBox.appendChild(expandContainer);
					return expandImage;
				}
				var repository = explorer.model.root.repository;
				
				var detailsView, actionsArea, title;
				if (item.Type === "CommitChanges") { //$NON-NLS-0$
					tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
					commit = item.parent;
					var commitDetails = document.createElement("div"); //$NON-NLS-0$
					var info = new mGitCommitInfo.GitCommitInfo({
						parent: commitDetails,
						tagsCommandHandler: explorer,
						commit: commit,
						showTags: false,
						commitLink: false,
						showMessage: false,
						fullMessage: true,
						showImage: false,
						showAuthor: false,
						showParentLink: false
					});
					info.display();
					horizontalBox.appendChild(commitDetails);

					setTimeout(function() {
						var titleWrapper = new mSection.Section(horizontalBox, {
							id: "commitdDiffSection" + commit.Name, //$NON-NLS-0$
							title: messages["ChangedFiles"],
							slideout: true,
							canHide: false,
							preferenceService: explorer.preferencesService
						}); 
						var explorer2  = new mGitChangeList.GitChangeListExplorer({
							serviceRegistry: explorer.registry,
							commandRegistry: explorer.commandService,
							selection: null,
							parentId: titleWrapper.getContentElement(), 
							actionScopeId: "diffSectionItemActionArea", //$NON-NLS-0$
							prefix: "diff", //$NON-NLS-0$
							changes: commit.Diffs,
							location: repository.StatusLocation,
							repository: repository,
							section: titleWrapper
						});
						explorer2.display();
					}, 0);
				}  else if (item.Type === "Status") { //$NON-NLS-0$
				
					var image = document.createElement("span"); //$NON-NLS-0$
					image.className = "core-sprite-folder gitStatusIcon"; //$NON-NLS-0$
					horizontalBox.appendChild(image);
				
					sectionItem.classList.add("sectionTableItem"); //$NON-NLS-0$
					tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
					tableRow.classList.add("gitStatusSection"); //$NON-NLS-0$
					td.classList.add("gitStatusCell"); //$NON-NLS-0$
						
					detailsView = document.createElement("div"); //$NON-NLS-0$
					detailsView.className = "stretch"; //$NON-NLS-0$
					horizontalBox.appendChild(detailsView);
					
					title = document.createElement("div"); //$NON-NLS-0$
					title.textContent = messages["LocalChanges"];
					title.classList.add("gitStatusTitle"); //$NON-NLS-0$
					detailsView.appendChild(title);
					
					var status = item;
					var unstaged = status.Untracked.length + status.Conflicting.length + status.Modified.length + status.Missing.length;
					var staged = status.Changed.length + status.Added.length + status.Removed.length;
					var changed = unstaged + staged;
					var description = document.createElement("div"); //$NON-NLS-0$
					description.textContent = unstaged > 0 || staged > 0
							? i18nUtil.formatMessage(messages["FilesChangedVsReadyToCommit"], changed, messages[changed === 1 ? "file" : "files"], staged, messages[staged === 1 ? "file" : "files"])
							: messages["Nothing to commit."];
					detailsView.appendChild(description);
				} else if (item.Type !== "Commit" && item.Type !== "StashCommit") { //$NON-NLS-1$ //$NON-NLS-0$
					if (item.Type !== "NoCommits") { //$NON-NLS-0$
						sectionItem.className = "gitCommitSectionTableItem"; //$NON-NLS-0$
						createExpand();
						tableRow.classList.add("gitCommitListSection"); //$NON-NLS-0$
					} else {
						tableRow.classList.add("gitCommitListNoCommit"); //$NON-NLS-0$
						sectionItem.classList.add("sectionTableItem"); //$NON-NLS-0$
					}
					
					detailsView = document.createElement("div"); //$NON-NLS-0$
					detailsView.className = "stretch"; //$NON-NLS-0$
					horizontalBox.appendChild(detailsView);
					
					title = document.createElement("div"); //$NON-NLS-0$
					title.textContent = messages[item.Type];
					switch (item.Type) {
						case "Incoming":  //$NON-NLS-0$
						case "Outgoing":  //$NON-NLS-0$
							if (model.tracksRemoteBranch()) {
								Deferred.when(model.syncCommits || model._getSync(), function(syncCommits) {
									var count = item.Type === "Outgoing" ? syncCommits.AheadCount : syncCommits.BehindCount; //$NON-NLS-0$
									if (count !== undefined) {
										title.textContent =  i18nUtil.formatMessage(messages[item.Type + "WithCount"], count); //$NON-NLS-0$
									}
								});
							}
							break;
					}
					if (item.Type !== "NoCommits") { //$NON-NLS-0$
						title.classList.add("gitCommitListSectionTitle"); //$NON-NLS-0$
					}
					detailsView.appendChild(title);
			
					actionsArea = document.createElement("ul"); //$NON-NLS-0$
					actionsArea.className = "layoutRight commandList"; //$NON-NLS-0$
					actionsArea.id = item.Type + "Actions"; //$NON-NLS-0$
					horizontalBox.appendChild(actionsArea);
					
					horizontalBox.classList.add("toolComposite"); //$NON-NLS-0$
					if (explorer.slideout) {
						var slideoutFragment = mHTMLFragments.slideoutHTMLFragment(actionsArea.id);
						var slideoutDiv = document.createElement("div"); //$NON-NLS-0$
						slideoutDiv.innerHTML = slideoutFragment;
						horizontalBox.appendChild(slideoutDiv);
					}
				} else {
					if (model.showCommitChanges) {
						createExpand();
					}
					tableRow.classList.remove("selectableNavRow"); //$NON-NLS-0$
					sectionItem.className = "sectionTableItem"; //$NON-NLS-0$
					detailsView = document.createElement("div"); //$NON-NLS-0$
//					detailsView.className = "stretch"; //$NON-NLS-0$
					horizontalBox.appendChild(detailsView);
					
					var simple = !item.full;
					var commitInfo = new mGitCommitInfo.GitCommitInfo({
						parent: detailsView,
						tagsCommandHandler: explorer,
						commit: commit,
						showTags: true,
						showBranches: !simple,
						commitLink: false,
						showParentLink: false,
						showCommitter: !simple,
						showCommit: !simple,
						showGerrit: false,
						showMessage: simple,
						showAuthorEmail: false,
						showCommitterEmail: !simple,
						onlyFullMessage: !simple,
						fullMessage: !simple,
						showMore: true,
						simple: simple,
					});
					commitInfo.display();
					
					commitInfo.moreButton.addEventListener("click", function() { //$NON-NLS-0$
						item.full = !item.full;
						explorer.myTree.redraw(item);
					});
					
					var itemActionScope = "itemLevelCommands"; //$NON-NLS-0$
					actionsArea = document.createElement("ul"); //$NON-NLS-0$
					actionsArea.className = "layoutRight commandList"; //$NON-NLS-0$
					actionsArea.id = itemActionScope;
					horizontalBox.appendChild(actionsArea);
					
					item.Clone = repository;
					
					explorer.commandService.renderCommands(itemActionScope, actionsArea, item, explorer, "tool"); //$NON-NLS-0$
				}

				return td;
			}
		},
		emptyCallback:function(bodyElement) {
			var tr = document.createElement("tr"); //$NON-NLS-0$
			var td = document.createElement("td"); //$NON-NLS-0$
			td.colSpan = 1;
		
			var noCommit = document.createElement("div"); //$NON-NLS-0$
			noCommit.classList.add("sectionTableItem"); //$NON-NLS-0$
			
			if (this.explorer.model.isRebasing()) {
				noCommit.style.whiteSpace = "pre"; //$NON-NLS-0$
				noCommit.appendChild(document.createTextNode(messages["RebaseProgressDetails"]));
			} else {
				var title = document.createElement("div"); //$NON-NLS-0$
				title.textContent = messages["The branch is up to date."];
				noCommit.appendChild(title);
				
				var description = document.createElement("div"); //$NON-NLS-0$
				description.textContent = messages["NoOutgoingIncomingCommits"];
				noCommit.appendChild(description);
			}
			
			td.appendChild(noCommit);
			tr.appendChild(td);
			bodyElement.appendChild(tr);
		}
	});
	
	return {
		GitCommitListExplorer: GitCommitListExplorer,
		GitCommitListRenderer: GitCommitListRenderer
	};

});
