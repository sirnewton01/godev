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

/*global define document window*/

define([
	'require',
	'i18n!git/nls/gitmessages',
	'orion/Deferred',
	'orion/URITemplate',
	'orion/dynamicContent',
	'orion/webui/littlelib',
	'orion/section',
	'orion/i18nUtil',
	'orion/objects'
], function(require, messages, Deferred, URITemplate, mDynamicContent, lib, mSection, i18nUtil, objects) {
		
	var repoTemplate = new URITemplate("git/git-repository.html#{,resource,params*}"); //$NON-NLS-0$
	
	/**
	 * @class orion.git.GitRepoListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitRepoListExplorer(options) {
		this.registry = options.serviceRegistry;
		this.commandService = options.commandRegistry;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.repositories = options.repositories;
		this.mode = options.mode;
		this.links = options.links;
		this.loadingDeferred = options.loadingDeferred;
	}
	
	objects.mixin(GitRepoListExplorer.prototype, {
		/**
		 * @name _repositorySorter
		 * @description Simple function to sort repositories by name
		 * @function
		 * @private
		 * @memberof GitRepositoryExplorer.prototype
		 * @param {Object} The repository to compare to
		 * @param {Object} The repository to compare
		 * @since 5.0
		 */
		_repositorySorter: function(repo1, repo2) {
			return repo1.Name.localeCompare(repo2.Name);
		},
		decorateRepository: function(repository, mode, deferred){
			var that = this;
			deferred = deferred || new Deferred();
			
			if(!mode){
				mode = "full";
			}
			
			
			this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.core.file").loadWorkspace(repository.ContentLocation + "?parts=meta"), "Loading workspace info").then( //$NON-NLS-1$ //$NON-NLS-0$
					function(resp){
						try{
							repository.Content = {};
							
							var path = "root / "; //$NON-NLS-0$
							if (resp.Parents !== null)
								for (var i=resp.Parents.length; i>0; i--){
									path += resp.Parents[i-1].Name + " / "; //$NON-NLS-0$
								}
								
							path += resp.Name;
							repository.Content.Path = path;
							
							if (mode !== "full"){ //$NON-NLS-0$
								deferred.resolve();
								return;
							}
							
							that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitStatus(repository.StatusLocation), "Getting status for " + repository.Name).then( //$NON-NLS-0$
								function(resp){
									try{
										repository.Status = resp;
			
										that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getGitBranch(repository.BranchLocation), "Getting branches for " + repository.Name).then( //$NON-NLS-0$
											function(resp){
												try{
													var branches = resp.Children || [];
													var currentBranch;
													for (var i=0; i<branches.length; i++){
														if (branches[i].Current){
															currentBranch = branches[i];
															break;
														}
													}
													
													if (!currentBranch || currentBranch.RemoteLocation[0] === null){
														deferred.resolve();
														return;
													}
													
													var tracksRemoteBranch = (currentBranch.RemoteLocation.length === 1 && currentBranch.RemoteLocation[0].Children.length === 1);
													
													if (tracksRemoteBranch && currentBranch.RemoteLocation[0].Children[0].CommitLocation){
														that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").getLog(currentBranch.RemoteLocation[0].Children[0].CommitLocation + "?page=1&pageSize=20", "HEAD"), "Getting incomming commits " + repository.Name).then( //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
															function(resp){
																if(resp.Children === undefined) { repository.CommitsToPush = 0; }
																else { repository.CommitsToPush = resp.Children.length; }
																deferred.resolve();
																return;
															}, function(resp){
																deferred.reject();
																return;
															}
														);
													} else {
														that.registry.getService("orion.page.progress").progress(that.registry.getService("orion.git.provider").doGitLog(currentBranch.CommitLocation + "?page=1&pageSize=20"), "Getting outgoing commits " + repository.Name).then(  //$NON-NLS-1$ //$NON-NLS-0$
															function(resp){	
																if(resp.Children === undefined) { repository.CommitsToPush = 0; }
																else { repository.CommitsToPush = resp.Children.length; }
																deferred.resolve();
																return;
															}, function(resp){
																deferred.reject();
																return;
															}
														);	
													}
												}catch(e){
													deferred.reject();
												}
											}, function(resp){
												deferred.reject();
												return;
											}
										);
									}catch(e){
										deferred.reject();
									}
								}, function(resp){
									deferred.reject();
									return;
								}	
							);
						}catch(e){
							deferred.reject(e);
						}
					}, function(resp){
						deferred.reject();
						return;
					 }
				);
			
			return deferred;
		},
		display: function(){
			var that = this;
			var repositories = this.repositories;
			var mode = this.mode;
			var links = this.links;
			if(repositories) {
				repositories.sort(that._repositorySorter);
			}
			var dynamicContentModel = new mDynamicContent.DynamicContentModel(repositories,
				function(i){
					return that.decorateRepository.bind(that)(repositories[i]);
				}
			);
			
			var dcExplorer = new mDynamicContent.DynamicContentExplorer(dynamicContentModel);
			var repositoryRenderer = {
			
				initialRender : function(){
					var tableNode = lib.node(that.parentId);	
					if (!tableNode) {
						return;
					}
					lib.empty(tableNode);
					if(!repositories || repositories.length === 0){
						var titleWrapper = new mSection.Section(tableNode, {
							id: "repositorySection", //$NON-NLS-0$
							title: "Repository",
							iconClass: ["gitImageSprite", "git-sprite-repository"] //$NON-NLS-1$ //$NON-NLS-0$
						});
						titleWrapper.setTitle(mode === "full" ? messages["No Repositories"] : messages["Repository Not Found"]); //$NON-NLS-0$
						that.loadingDeferred.resolve();
						return;
					}
					
				},
				
				cleanupRender : function(){
					that.loadingDeferred.resolve();
				},
				
				renderBeforeItemPopulation : function(i){
					// Title area
					var repoSection = document.createElement("div");
					repoSection.className = "sectionWrapper toolComposite";
					lib.node("repositoryNode").appendChild(repoSection);
					
					var sectionAnchor = document.createElement("div");
					sectionAnchor.className = "sectionAnchor sectionTitle layoutLeft";
					repoSection.appendChild(sectionAnchor);
					
					var title = document.createElement("span");
					sectionAnchor.appendChild(title);
					
					if (links){
						var link = document.createElement("a");
						link.href = require.toUrl(repoTemplate.expand({resource: repositories[i].Location}));
						link.appendChild(document.createTextNode(repositories[i].Name));
						title.appendChild(link);
					} else { 
						title.appendChild(document.createTextNode(repositories[i].Name)); 
					}
					
					//create indicator
					this.explorer.progressIndicators[i] = new this.explorer.progressIndicator(i, title);
						
					if (mode === "full"){
						var actionsArea = document.createElement("div");
						actionsArea.className = "layoutRight sectionActions";
						actionsArea.id = "repositoryActionsArea";
						repoSection.appendChild(actionsArea);
						that.commandService.renderCommands(that.actionScopeId, actionsArea, repositories[i], that, "tool"); //$NON-NLS-0$
					}
					
					// Content area
					var repoSectionContent = document.createElement("div");
					repoSectionContent.className = "sectionTable sectionTableItem";
					lib.node("repositoryNode").appendChild(repoSectionContent);
											
					var detailsView = document.createElement("div");
					detailsView.className = "stretch";
					repoSectionContent.appendChild(detailsView);
					
					var div = document.createElement("div");
					detailsView.appendChild(div);
					
					var span = document.createElement("span");
					span.textContent = (repositories[i].GitUrl !== null ? messages["git url:"] + repositories[i].GitUrl : messages["(no remote)"]);
					detailsView.appendChild(span);
					
					div = document.createElement("div");
					detailsView.appendChild(div);
					
					span = document.createElement("span");
					span.id = "location"+i;
					detailsView.appendChild(span);
	
					if (mode === "full"){
						div = document.createElement("div");
						div.style.paddingTop = "10px";
						detailsView.appendChild(div);
						
						span = document.createElement("span");
						span.id = "repositoryState"+i;
						span.style.paddingLeft = "10px";
						detailsView.appendChild(span);
						
						span = document.createElement("span");
						span.id = "workspaceState"+i;
						span.style.paddingLeft = "10px";
						detailsView.appendChild(span);
						
						span = document.createElement("span");
						span.id = "commitsState"+i;
						span.style.paddingLeft = "10px";
						detailsView.appendChild(span);
					}
				},
				
				renderAfterItemPopulation : function(i){
					that.renderRepository(repositories[i], i, repositories.length, mode, links);
				}
			};
			
			dcExplorer.use(repositoryRenderer);
			dcExplorer.render();
		},
		renderRepository: function(repository, index, length, mode, links){
			var locationnode = lib.node("location"+index);
			if (!locationnode) {
				return;
			}
			locationnode.textContent = messages["location: "] + repository.Content.Path;
			var status = repository.Status;
			
			if (mode === "full"){ //$NON-NLS-0$
				var unstaged = status.Untracked.length + status.Conflicting.length + status.Modified.length + status.Missing.length;
				var staged = status.Changed.length + status.Added.length + status.Removed.length;
				
				var workspaceState = ((unstaged > 0 || staged > 0) 
					? i18nUtil.formatMessage(messages["${0} file(s) to stage and ${1} file(s) to commit."], unstaged, staged)
					: messages["Nothing to commit."]);
				
				
				if (status.RepositoryState !== "SAFE"){
					lib.node("repositoryState"+index).textContent = messages["Rebase in progress!"];
				}
				
				lib.node("workspaceState"+index).textContent = workspaceState;
				
				var commitsState = repository.CommitsToPush;
				lib.node("commitsState"+index).textContent = ((commitsState > 0) ? commitsState + messages[" commit(s) to push."] : messages["Nothing to push."]);	
			}
		}
	});
	
	return {
		GitRepoListExplorer: GitRepoListExplorer
	};

});