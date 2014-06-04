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
	'orion/URITemplate',
	'orion/PageUtil',
	'orion/Deferred',
	'orion/dynamicContent',
	'orion/webui/littlelib',
	'orion/git/widgets/CommitTooltipDialog',
	'orion/objects'
], function(require, messages, URITemplate, PageUtil, Deferred, mDynamicContent, lib, mCommitTooltip, objects) {
		
	var repoPageTemplate = new URITemplate("git/git-repository.html#{,resource,params*}?page=1&pageSize=20"); //$NON-NLS-0$
	var commitTemplate = new URITemplate("git/git-commit.html#{,resource,params*}?page=1&pageSize=1"); //$NON-NLS-0$
	
	/**
	 * @class orion.git.GitTagListExplorer
	 * @extends orion.explorers.Explorer
	 */
	function GitTagListExplorer(options) {
		this.registry = options.serviceRegistry;
		this.commandService = options.commandRegistry;
		this.parentId = options.parentId;
		this.actionScopeId = options.actionScopeId;
		this.repository = options.repository;
		this.mode = options.mode;
		this.section = options.section;
		this.commit = options.commit;
	}
	
	objects.mixin(GitTagListExplorer.prototype, {
		decorateTag: function(tag, deferred){
			deferred = deferred || new Deferred();
			this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").doGitLog(tag.CommitLocation + "?page=1&pageSize=1"), "Getting tag last commit " + tag.Name).then(
				function(resp){
					tag.Commit = resp.Children[0];
					deferred.resolve();
				}, function(err){
					deferred.reject();
				}
			);
			return deferred;
		},
		display: function(){
			var that = this;
			var section = this.section;
			
			var url = document.createElement("a");
			var pageParams = PageUtil.matchResourceParameters();
			url.href = pageParams.resource;	
			var pageQuery = (url.search? url.search : "?page=1&pageSize=20");
							
			var progress = section.createProgressMonitor();
			progress.begin(messages["Getting tags"]);
	
			var tagsContainer = document.createElement("div");
			tagsContainer.className = "mainPadding";
			
			var repository = this.repository;
			var mode = this.mode;
			Deferred.when (this.commit || this.registry.getService("orion.page.progress").progress(this.registry.getService("orion.git.provider").getGitBranch(repository.TagLocation + (mode === "full" ? pageQuery : "?page=1&pageSize=5")), "Getting tags " + repository.Name), 
				function(resp){
				
					var tags = resp.Children;
					var isCommit = false;
					if (!tags) {
						 tags = resp.Tags;
						 isCommit = true;
					}
					var dynamicContentModel = new mDynamicContent.DynamicContentModel(tags,
						function(i){
							if (isCommit) return new Deferred().resolve();
							return that.decorateTag.bind(that)(tags[i]);
						});
							
					var dcExplorer = new mDynamicContent.DynamicContentExplorer(dynamicContentModel);
					var tagRenderer = {
						initialRender : function(){
							progress.done();
							var tagNode = lib.node(that.parentId);
							if (!tagNode) {
								return;
							}
							lib.empty(tagNode);
							tagNode.appendChild(tagsContainer);
							
							that.commandService.destroy(section.actionsNode.id);
							
							if (mode !== "full" && tags.length !== 0){ //$NON-NLS-0$
								that.commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.repositories.viewAllCommand", 10); //$NON-NLS-0$
								that.commandService.renderCommands(section.actionsNode.id, section.actionsNode.id,
										{"ViewAllLink":require.toUrl(repoPageTemplate.expand({resource: repository.TagLocation})), "ViewAllLabel":messages['View All'], "ViewAllTooltip":messages["View all tags"]}, that, "button"); //$NON-NLS-7$ //$NON-NLS-5$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
							} 
							else if (that.commit) {
								that.commandService.registerCommandContribution(section.actionsNode.id, "eclipse.orion.git.addTag", 100); //$NON-NLS-0$
								that.commandService.renderCommands(section.actionsNode.id, section.actionsNode, that.commit, that, "button"); //$NON-NLS-0$
							}
			
							if (tags.length === 0) {
								section.setTitle(messages['No Tags']);
							}
						},
						
						renderBeforeItemPopulation : function(i){
							var sectionItem = document.createElement("div");
							sectionItem.className = "sectionTableItem lightTreeTableRow";
							tagsContainer.appendChild(sectionItem);
	
							var horizontalBox = document.createElement("div");
							horizontalBox.style.overflow = "hidden";
							sectionItem.appendChild(horizontalBox);
							
							var detailsView = document.createElement("div");
							detailsView.className = "stretch";
							horizontalBox.appendChild(detailsView);
							
							var title = document.createElement("span");
							title.textContent = tags[i].Name;
							detailsView.appendChild(title);
		
							this.explorer.progressIndicators[i] = new this.explorer.progressIndicator(i, title);
							
							var div = document.createElement("div");
							div.id = "tagDetailsView"+i;
							detailsView.appendChild(div);
	
							var actionsArea = document.createElement("div");
							actionsArea.className = "sectionTableItemActions";
							actionsArea.id = "tagActionsArea";
							horizontalBox.appendChild(actionsArea);
							
							that.commandService.renderCommands(that.actionScopeId, actionsArea, tags[i], that, "tool");	 //$NON-NLS-0$
						},
							
						renderAfterItemPopulation : function(i){
							that.renderTag(tags[i], i);
						}			
					};
					
					dcExplorer.use(tagRenderer);
					dcExplorer.render();
				
				}, function(err){
					progress.done();
					that.handleError(err);
				}
			);
		},
		renderTag: function(tag, i){
			var description = document.createElement("span");
			description.className = "tag-description";
			
			lib.empty(lib.node("tagDetailsView"+i));
			lib.node("tagDetailsView"+i).appendChild(description);
	
			var commit = tag.Commit;
			if (commit) {
				var link = document.createElement("a");
				link.className = "navlinkonpage";
				link.href = require.toUrl(commitTemplate.expand({resource: commit.Location}));
				link.textContent = commit.Message;
				description.appendChild(link);
				
				description.appendChild(document.createTextNode(messages[" by "] + commit.AuthorName + messages[" on "] + 
						new Date(commit.Time).toLocaleString()));
								
				 new mCommitTooltip.CommitTooltipDialog({commit: commit, triggerNode: link});
			 }
		}
	});
	
	return {
		GitTagListExplorer: GitTagListExplorer
	};

});