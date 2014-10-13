/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(['i18n!orion/stringexternalizer/nls/messages', 'orion/section', 'orion/webui/littlelib', 'orion/commands', 'orion/webui/dialogs/DirectoryPrompterDialog'], function(messages, mSection, lib, mCommands, DirPrompter) {
	function StringExternalizerConfig(options) {
		this.parent = lib.node(options.parent);
		this.fileClient = options.fileClient;
		this.commandService = options.commandService;
		this.serviceRegistry = options.serviceRegistry;
		this.setConfig = options.setConfig;
		this.createCommands();
	}

	StringExternalizerConfig.prototype = {
		createCommands: function() {
			var changeMessagesDirectory = new mCommands.Command({
				name: messages["Change Directory"],
				tooltip: messages["ChgMessageDir"],
				id: "eclipse.changeMessagesDirectory", //$NON-NLS-0$
				callback: function(data) {
					var dialog = new DirPrompter.DirectoryPrompterDialog({
						serviceRegistry: this.serviceRegistry,
						fileClient: this.fileClient,
						func: function(folder) {
							this.serviceRegistry.getService("orion.page.progress").progress(this.fileClient.read(folder.Location, true), "Getting metadata of " + folder.Location).then(function(metadata) {
								//read metadata again, because the returned item does not contain all info
								this.config.directory = metadata;
								this.render(this.config.root);
								this.configChanged(true);
							}.bind(this));
						}.bind(this)
					});
					dialog.show();
				},
				visibleWhen: function(item) {
					return !!item;
				}
			});
			this.commandService.addCommand(changeMessagesDirectory);
		},

		render: function(root) {
			lib.empty(this.parent);
			if (!this.config) {
				var savedConfig = localStorage.getItem("StringExternalizerConfig_" + root.Location); //$NON-NLS-0$
				try {
					this.config = JSON.parse(savedConfig);
				} catch (e) {}
				this.config = this.config || {
					root: root
				};
			}
			if (!this.config.directory) {
				this.config.directory = {
					Location: root.Location[root.Location.length - 1] === '/' ? root.Location + "nls" : root.Location + "/nls", //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
					Name: "nls", //$NON-NLS-0$
					Parents: [root].concat(root.Parents)
				};
			}
			if (!this.config.file) {
				this.config.file = "messages.js"; //$NON-NLS-0$
			}
			if (!this.config.module) {
				this.config.module = "i18n!messages"; //$NON-NLS-0$
			}
			if (this.config.marknls === null) {
				this.config.marknls = true;
			}
			var section = new mSection.Section(this.parent, {
				id: "stringexternalizerConfigSection", //$NON-NLS-0$
				title: messages["ExternalizeStrConfig"],
				content: '<div id="stringexternalizerConfigContent"></div>', //$NON-NLS-0$
				preferenceService: this.serviceRegistry.getService("orion.core.preference"), //$NON-NLS-0$
				canHide: false,
				useAuxStyle: true
			});

			this.commandService.registerCommandContribution(section.actionsNode.id, "eclipse.changeMessagesDirectory", 1); //$NON-NLS-0$
			this.commandService.renderCommands(section.actionsNode.id, section.actionsNode.id, this.config, this, "button"); //$NON-NLS-0$


			var sectionContent = lib.node('stringexternalizerConfigContent'); //$NON-NLS-0$
			var p = document.createElement("p"); //$NON-NLS-0$
			sectionContent.appendChild(p);
			var b = document.createElement("b"); //$NON-NLS-0$
			p.appendChild(b);
			b.appendChild(document.createTextNode(messages["Messages directory:"]));
			p.appendChild(document.createElement("br"));  //$NON-NLS-0$
			if (this.config.directory.Parents) {
				for (var i = this.config.directory.Parents.length - 1; i >= 0; i--) {
					p.appendChild(document.createTextNode(this.config.directory.Parents[i].Name + "/")); //$NON-NLS-0$
				}
			} else if (this.config.directory.parent) {
				var parent = this.config.directory.parent;
				var path = "";
				while (parent) {
					path = parent.Name + "/" + path; //$NON-NLS-0$
					if (parent.Id) {
						break; // this is a project
					}
					parent = parent.parent;
				}
				p.appendChild(document.createTextNode(path)); //$NON-NLS-0$
			}
			p.appendChild(document.createTextNode(this.config.directory.Name + "/"));  //$NON-NLS-0$

			p = document.createElement("p"); //$NON-NLS-0$
			sectionContent.appendChild(p);
			b = document.createElement("b"); //$NON-NLS-0$
			p.appendChild(b);
			b.appendChild(document.createTextNode(messages["Messages file name:"])); 
			p.appendChild(document.createElement("br")); //$NON-NLS-0$
			var fileName = document.createElement("input"); //$NON-NLS-0$
			fileName.value = this.config.file;
			fileName.size = 40;
			p.appendChild(fileName);
			var self = this;
			fileName.addEventListener("change", function() { //$NON-NLS-0$
				self.config.file = fileName.value;
				self.configChanged.bind(self)(true);
			}, false);

			p = document.createElement("p"); //$NON-NLS-0$
			sectionContent.appendChild(p);
			b = document.createElement("b"); //$NON-NLS-0$
			p.appendChild(b);
			b.appendChild(document.createTextNode(messages["Messages module:"])); 
			p.appendChild(document.createElement("br")); //$NON-NLS-0$

			var moduleName = document.createElement("input"); //$NON-NLS-0$
			moduleName.value = this.config.module;
			moduleName.size = 40;
			p.appendChild(moduleName);
			moduleName.addEventListener("change", function() { //$NON-NLS-0$
				self.config.module = moduleName.value;
				self.configChanged.bind(self)(false);
			}, false);

			p = document.createElement("p"); //$NON-NLS-0$
			sectionContent.appendChild(p);
			b = document.createElement("b"); //$NON-NLS-0$
			p.appendChild(b);
			b.appendChild(document.createTextNode(messages["MarkNotNON-NLS"]));
			p.appendChild(document.createElement("br")); //$NON-NLS-0$
			var markNls = document.createElement("input"); //$NON-NLS-0$
			markNls.type = "checkbox"; //$NON-NLS-0$
			markNls.checked = this.config.marknls;
			p.appendChild(markNls);
			markNls.addEventListener("change", function() { //$NON-NLS-0$
				self.config.marknls = markNls.checked;
				self.configChanged.bind(self)(false);
			}, false);
			this.configChanged(true);
		},
		configChanged: function(changedFile) {
			var that = this;
			localStorage.setItem("StringExternalizerConfig_" + this.config.root.Location, JSON.stringify(this.config)); //$NON-NLS-0$
			if (changedFile) {
				this.config.fileLocation = this.config.directory.Location + "/root/" + this.config.file; //$NON-NLS-0$
				this.serviceRegistry.getService("orion.page.progress").progress(this.fileClient.read(this.config.fileLocation), "Reading nls configuration file " + this.config.fileLocation).then(function(contents) {
					var match = new RegExp("define\\(\\{(.*\\r?\\n*)*\\}\\);", "gmi").exec(contents); //$NON-NLS-1$ //$NON-NLS-0$
					var messages = {};
					if (match) {
						var messagesString = match[0].substring("define(".length, match[0].length - ");".length); //$NON-NLS-1$ //$NON-NLS-0$
						messages = JSON.parse(messagesString);
					}
					that.config.messages = {};
					for (var message in messages) {
						that.config.messages[message] = messages[message];
					}
					if (that.setConfig) {
						that.setConfig(that.config);
					}
				}, function(error) {
					that.config.messages = {};
					if (that.setConfig) {
						that.setConfig(that.config);
					}
				});
			} else {
				if (this.setConfig) {
					this.setConfig(that.config);
				}
			}
		}
	};

	StringExternalizerConfig.prototype.constructor = StringExternalizerConfig;

	return {
		StringExternalizerConfig: StringExternalizerConfig
	};
});