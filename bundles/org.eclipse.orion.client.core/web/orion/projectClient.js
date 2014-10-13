/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define([
	'orion/Deferred',
	'orion/extensionCommands',
	'orion/i18nUtil',
], function(Deferred, mExtensionCommands, i18nUtil){

	function _toJSON(text) {
		try {
			return text ? JSON.parse(text) : {};
		} catch (e) {
			return {__TEXT__: String(text)};
		}
	}

	/**
	 * @param {Object} target
	 * @param {orion.serviceregistry.ServiceReference} serviceReference
	 */
	function mixinProperties(target, serviceReference) {
		serviceReference.getPropertyKeys().forEach(function(key) {
			target[key] = serviceReference.getProperty(key);
		});
	}

	/**
	 * Creates a new project client.
	 * @class Project client provides client-side API to handle projects based on given file client.
	 * @name orion.projectClient.ProjectClient
	 */
	function ProjectClient(serviceRegistry, fileClient) {
		this.serviceRegistry = serviceRegistry;
		this.fileClient = fileClient;
		this.allProjectHandlersReferences = serviceRegistry.getServiceReferences("orion.project.handler"); //$NON-NLS-0$
		this.allProjectDeployReferences = serviceRegistry.getServiceReferences("orion.project.deploy"); //$NON-NLS-0$
		this._serviceRegistration = serviceRegistry.registerService("orion.project.client", this); //$NON-NLS-0$ 
		this._launchConfigurationsDir = "launchConfigurations"; //$NON-NLS-0$ 
	}

	ProjectClient.prototype = /**@lends orion.ProjectClient.ProjectClient.prototype */ {
		_getProjectJsonData : function(folderMetadata, children, workspace){
			var deferred = new Deferred();
			for(var i=0; i<children.length; i++){
				if(children[i].Name === "project.json"){
					this.fileClient.read(children[i].Location).then(function(content) {
						var projectJson = _toJSON(content);
						projectJson.Name = projectJson.Name || folderMetadata.Name;
						projectJson.ContentLocation = folderMetadata.Location;
						projectJson.WorkspaceLocation = workspace.Location;
						var projectId;
						workspace.Children.some(function(child) {
							if (child.Location === folderMetadata.Location) {
								projectId = child.Id;
								return true;
							}
							return false;
						});
						workspace.Projects && workspace.Projects.some(function(project) {
							if (project.Id === projectId) {
								projectJson.ProjectLocation = project.Location;
								return true;
							}
							return false;
						});
						projectJson.ProjectJsonLocation = children[i].Location;
						deferred.resolve(projectJson);
					}, function(error) {
						deferred.reject(error);
					}, function(progress) {
						deferred.progress(progress);
					});
					return deferred;
				}
			}
			deferred.resolve(null);
			return deferred;
		},
		readAllProjects : function(workspaceMetadata){
			var deferred = new Deferred();

			if(!workspaceMetadata.Children){
				deferred.resolve([]);
				return deferred;
			}	
			var projects = [];
			var projectDeferrds = [];
			for(var i=0; i<workspaceMetadata.Children.length; i++){
				var projectDeferred = new Deferred();
				this.readProject(workspaceMetadata.Children[i], workspaceMetadata).then(projectDeferred.resolve,
					function(error){
						this.resolve(null);
					}.bind(projectDeferred));
				projectDeferrds.push(projectDeferred);
				projectDeferred.then(function(projectMetadata){
					if(projectMetadata){
						projects.push(projectMetadata);
					}
				});
			}
			Deferred.all(projectDeferrds).then(function(){
				deferred.resolve(projects);
			});
			return deferred;
		},
		readProject : function(fileMetadata, workspaceMetadata){
			var that = this;
			var deferred = new Deferred();
			
			function readProjectFromWorkspace(fileMetadata, workspace, deferred){
				if(fileMetadata.Parents && fileMetadata.Parents.length>0){
					var topFolder = fileMetadata.Parents[fileMetadata.Parents.length-1];
					if(topFolder.Children){
						that._getProjectJsonData.bind(that)(topFolder, topFolder.Children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					} else if(topFolder.ChildrenLocation) {
						this.fileClient.fetchChildren(topFolder.ChildrenLocation).then(function(children){
							that._getProjectJsonData.bind(that)(topFolder, children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
						},
						deferred.reject,
						deferred.progress);
					} else {
						deferred.resolve(null);
					}
					return deferred;
				} else if(fileMetadata.Children) {
					that._getProjectJsonData.bind(that)(fileMetadata, fileMetadata.Children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					return deferred;
				} else if(fileMetadata.ChildrenLocation){
					this.fileClient.fetchChildren(fileMetadata.ChildrenLocation).then(function(children){
						that._getProjectJsonData.bind(that)(fileMetadata, children, workspace).then(deferred.resolve, deferred.reject, deferred.progress);
					},
					deferred.reject,
					deferred.progress);
					return deferred;
				} else {
					deferred.resolve(null);
					return deferred;
				}
			}
			if(workspaceMetadata){
				readProjectFromWorkspace.call(that, fileMetadata, workspaceMetadata, deferred);
			} else {
				this.fileClient.loadWorkspace().then(function(workspace){
					readProjectFromWorkspace.call(that, fileMetadata, workspace, deferred);
				});
			}
			return deferred;
		},
		
		/**
		 * Initializes a project in a folder.
		 * @param {String} contentLocation The location of the parent folder
		 * @return {Object} projectMetadata JSON representation of the created folder
		 */
		initProject : function(contentLocation, projectMetadata){
			var that = this;
			var deferred = new Deferred();
			this.fileClient.createFile(contentLocation, "project.json").then(function(fileMetadata){
				if(projectMetadata){
					that.fileClient.write(fileMetadata.Location, JSON.stringify(projectMetadata)).then(function(){
						deferred.resolve({ContentLocation: contentLocation, projectMetadata: projectMetadata});
					}, deferred.reject, deferred.progress);
				} else {
					deferred.resolve({fileMetadata: fileMetadata});
				}
			}, 
				deferred.reject,
				deferred.progress);
			
			return deferred;
		},
		
		createProject: function(workspaceLocation, projectMetadata){
			var deferred = new Deferred();
			
			this.fileClient.createProject(workspaceLocation, projectMetadata.Name, projectMetadata.ContentLocation, true).then(
				function(fileMetadata){
					delete projectMetadata.Name;
					deferred.resolve(this.initProject(fileMetadata.ContentLocation, projectMetadata));
				}.bind(this), 
				function(error){
					deferred.reject(error);
				},
				function(progress){
					deferred.progress(progress);
				}
			);
			
			return deferred;
		},
		
		getDependencyFileMetadata : function(dependency, workspaceLocation){
		var deferred = new Deferred();
		var that = this;
		function getLastChild(childrenLocation, path){
			this.fileClient.fetchChildren(childrenLocation).then(function(children){
				for(var i=0; i<children.length; i++){
					if(children[i].Name === path[0]){
						if(path.length===1){
							deferred.resolve(children[i]);
						} else {
							getLastChild.bind(that)(children[i].ChildrenLocation, path.splice(1, path.length-1));
						}
						return;
					}
				}
					deferred.reject(dependency.Location + " could not be found in your workspace");
			}, function(error){deferred.reject(error);});
		}
		
		if(dependency.Type==="file"){
			var path = dependency.Location.split("/");
			this.fileClient.loadWorkspace(workspaceLocation).then(function(workspace){
						for(var i=0; i<workspace.Children.length; i++){
							if(workspace.Children[i].Name===path[0]){
								if(path.length===1){
									deferred.resolve(workspace.Children[i]);
								} else {
									getLastChild.bind(that)(workspace.Children[i].ChildrenLocation, path.splice(1, path.length-1));
								}
								return;
							}
						}
						deferred.reject(dependency.Location + " could not be found in your workspace");
			}, function(error){deferred.reject(error);});
			return deferred;
		}
		return this.getProjectHandler(dependency.Type).then(function(handler) {
			if(handler===null){
				deferred.reject(dependency.Type + " is not supported.");
				return deferred;
			}

			var validator;
			if(handler.validationProperties){
				validator = mExtensionCommands._makeValidator(handler, this.serviceRegistry, []);
			}
			
			this.fileClient.loadWorkspace(workspaceLocation).then(function(workspace){
				var checkdefs = [];
				var found = false;
				for(var i=0; i<workspace.Children.length; i++){
					if(found===true){
						break;
					}
					if(validator && validator.validationFunction(workspace.Children[i])){
						var def = handler.getDependencyDescription(workspace.Children[i]);
						checkdefs.push(def);
						(function(i, def){
							def.then(function(matches){
								if(matches && matches.Location === dependency.Location){
									found = true;
									deferred.resolve(workspace.Children[i]);
								}
							});
						})(i, def);
					}
				}
				Deferred.all(checkdefs).then(function(){
					if(!found){
						deferred.reject(dependency.Name + " could not be found in your workspace");
					}
				});
			}, deferred.reject);
			return deferred;
		}.bind(this));
	},
	/**
		* @param {Object} projectMetadata Project metadata
		* @param {Object} dependency The JSON representation of the dependency
		* @param {String} dependency.Type Type of the dependency (i.e. "file")
		* @param {String} dependency.Name String description of the dependency (i.e. folder name)
		* @param {String} dependency.Location Location of the dependency understood by the plugin of given type
		*/
	addProjectDependency: function(projectMetadata, dependency){
		var deferred = new Deferred();
		this.fileClient.fetchChildren(projectMetadata.ContentLocation).then(function(children){
			for(var i=0; i<children.length; i++){
				if(children[i].Name==="project.json"){
					this.fileClient.read(children[i].Location).then(function(content){
						try{
							var projectJson = _toJSON(content);
							if(!projectJson.Dependencies){
								projectJson.Dependencies = [];
							}
							for(var j=0; j<projectJson.Dependencies.length; j++){
								if(projectJson.Dependencies[j].Location === dependency.Location){
									deferred.resolve(projectJson);	
									return;
								}
							}
							projectJson.Dependencies.push(dependency);
							this.fileClient.write(children[i].Location, JSON.stringify(projectJson)).then(
								function(){
									projectJson.ContentLocation = projectMetadata.ContentLocation;
									projectJson.Name = projectMetadata.Name;
									deferred.resolve(projectJson);
								},
								deferred.reject
							);
							
							deferred.resolve(projectJson);
						} catch (e){
							deferred.reject(e);
						}
					}.bind(this), deferred.reject, deferred.progress);
					return;
				}
			}
		}.bind(this), deferred.reject);
		return deferred;
	},
	
	removeProjectDependency: function(projectMetadata, dependency){
		var deferred = new Deferred();
		this.fileClient.fetchChildren(projectMetadata.ContentLocation).then(function(children){
			for(var i=0; i<children.length; i++){
				if(children[i].Name==="project.json"){
					this.fileClient.read(children[i].Location).then(function(content){
						try{
							var projectJson = _toJSON(content);
							if(!projectJson.Dependencies){
								projectJson.Dependencies = [];
							}
							for(var j=projectJson.Dependencies.length-1; j>=0; j--){
								if(projectJson.Dependencies[j].Location === dependency.Location && projectJson.Dependencies[j].Type === dependency.Type){
									projectJson.Dependencies.splice(j,1);
								}
							}
							this.fileClient.write(children[i].Location, JSON.stringify(projectJson)).then(
								function(){
									projectJson.ContentLocation = projectMetadata.ContentLocation;
									projectJson.Name = projectMetadata.Name;
									deferred.resolve(projectJson);
								},
								deferred.reject
							);
							
						} catch (e){
							deferred.reject(e);
						}
					}.bind(this), deferred.reject, deferred.progress);
					return;
				}
			}
		}.bind(this), deferred.reject);
		return deferred;
	},
	
	changeProjectProperties: function(projectMetadata, properties){
		if(!properties){
			return;
		}
		var deferred = new Deferred();
		
		function saveProperties(projectJsonLocation){
			this.fileClient.read(projectJsonLocation).then(function(content){
				try{
					var projectJson = _toJSON(content);
					for(var key in properties){
						projectJson[key] = properties[key];
					}
					this.fileClient.write(projectJsonLocation, JSON.stringify(projectJson)).then(
						function(){
							projectJson.ContentLocation = projectMetadata.ContentLocation;
							projectJson.ProjectJsonLocation = projectJsonLocation;
							projectJson.Name = projectMetadata.Name;
							deferred.resolve(projectJson);
						},
						deferred.reject
					);
					
				} catch (e){
					deferred.reject(e);
				}
			}.bind(this), deferred.reject);
		}
		
		if(projectMetadata.ProjectJsonLocation){
			saveProperties.bind(this)(projectMetadata.ProjectJsonLocation);
		}
		return deferred;
	},
	
	getProjectHandlerTypes: function(){
		var types = [];
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			types.push(this.allProjectHandlersReferences[i].getProperty("type"));
		}
		return types;
	},
	
	_getProjectDeployService: function(serviceReference){
		var service = this.serviceRegistry.getService(serviceReference);
		mixinProperties(service, serviceReference);
		/*
		Expected properties:
		id, nls, name{Key}, tooltip{Key}, parameters, optionalParameters, validationProperties, logLocationTemplate
		*/
		service.id = serviceReference.getProperty("id");
		service.name = serviceReference.getProperty("name");
		service.tooltip = serviceReference.getProperty("tooltip");
		service.parameters = serviceReference.getProperty("parameters");
		service.optionalParameters = serviceReference.getProperty("optionalParameters");
		service.validationProperties = serviceReference.getProperty("validationProperties");
		service.logLocationTemplate = serviceReference.getProperty("logLocationTemplate");
		return service;
	},
	
	matchesDeployService: function(item, service){
		var validator = mExtensionCommands._makeValidator(service, this.serviceRegistry, []);
		return validator.validationFunction(item);
	},
	
	getProjectDeployTypes: function(){
		function compareByPriority(ref1,ref2) {
			var prio1 = ref1.getProperty("priorityForDefault") || 0;
			var prio2 = ref2.getProperty("priorityForDefault") || 0;
		  if (prio1 > prio2)
		     return -1;
		  if (prio1 < prio2)
		    return 1;
		  return 0;
		}
		var sortedReferences = this.allProjectDeployReferences.sort(compareByPriority);
		var types = [];
		for(var i=0; i<sortedReferences.length; i++){
			types.push(sortedReferences[i].getProperty("id"));
		}
		return types;
	},

	getProjectDelpoyService: function(serviceId, type){
		var foundRef;
		// Find by id
		this.allProjectDeployReferences.some(function(serviceRef) {
			if(serviceRef.getProperty("id") === serviceId){
				return (foundRef = serviceRef); // break
			}
			return false;
		});
		if(type){
			// Find by type
			this.allProjectDeployReferences.some(function(serviceRef) {
				if ((serviceRef.getProperty("deployTypes") || []).indexOf(type) !== -1) {
					return (foundRef = serviceRef); // break
				}
				return false;
			});
		}
		return this._nlsService(this._getProjectDeployService(foundRef));
	},

	_getProjectHandlerService: function(serviceReference){
		/*
		Expected properties:
		id, nls, type,
		addParameters || addParamethers,
		optionalParameters || optionalParamethers,
		addDependencyName{Key}, addDependencyTooltip{Key}, addProjectName{Key} addProjectTooltip{Key},
		actionComment, validationProperties
		*/
		var service = this.serviceRegistry.getService(serviceReference);
		mixinProperties(service, serviceReference);

		// Canonicalize legacy names
		service.addParameters = service.addParameters || service.addParamethers;
		service.optionalParameters = service.optionalParameters || service.optionalParamethers;
		delete service.addParamethers;
		delete service.optionalParamethers;
		return service;
	},

	
	_translateKeys: function(target, messages) {
		var isI18nKey = RegExp.prototype.test.bind(/Key$/);
		Object.keys(target).filter(isI18nKey).forEach(function(key) {
			var translated = messages[target[key]],
			    baseName = key.substring(0, key.length - "Key".length), //$NON-NLS-0$
			    fallback = target[baseName] || key;
			target[baseName] = translated || fallback;
			delete target[key]; // target.F is translated so delete target.FKey
		});
	},
	
	_translateParamArray: function(parameters, messages) {
		if( Array.isArray(parameters)) {
			parameters.forEach(function(parameters) {
				this._translateKeys(parameters, messages);
			}.bind(this));
		}
	},
	
	/**
	 * Translates service's i18nable fields. A field F is i18nable if there's another field named FKey,
	 * giving the message key to use for translating F. `service.nls` gives the message bundle path.
	 *
	 * @param {Object} service
	 * @returns {orion.Promise} A promise resolving to the service, after its i18nable fields are translated.
	 */
	_nlsService: function(service) {
		var _this = this;
		function replaceNlsFields(target, messages) {
			messages = messages || {};
			_this._translateKeys(target, messages);
			_this._translateParamArray(target.addParameters, messages);
			_this._translateParamArray(target.optionalParameters, messages);
			return target;
		}
		var loadMessages = service.nls ? i18nUtil.getMessageBundle(service.nls) : new Deferred().resolve();
		var nlsService = replaceNlsFields.bind(null, service);
		return loadMessages.then(nlsService, nlsService);
	},

	/**
	 * @returns {orion.Promise} A promise resolving to the handler (the returned handler is localized)
	 */
	getProjectHandler: function(type){
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			if(this.allProjectHandlersReferences[i].getProperty("type") === type){
				var handler = this._getProjectHandlerService(this.allProjectHandlersReferences[i]);
				return this._nlsService(handler);
			}
		}
	},
	
	getMatchingProjectHandlers: function(item){
		var handlers = [];
		for(var i=0; i<this.allProjectHandlersReferences.length; i++){
			var handlerInfo = this.allProjectHandlersReferences[i]._properties;
			var validator = mExtensionCommands._makeValidator(handlerInfo, this.serviceRegistry, []);
			if(validator.validationFunction(item)){
				handlers.push(this._getProjectHandlerService(this.allProjectHandlersReferences[i]));
			}
		}
		return handlers;
	},
	
	_getLaunchConfigurationsDir: function(projectMetadata, create){
		var deferred = new Deferred();
		var fetchLocation = projectMetadata.ContentLocation;
		if(fetchLocation) {
			if (fetchLocation.indexOf("?depth=") === -1) { //$NON-NLS-0$
				fetchLocation += "?depth=1"; //$NON-NLS-0$
			}
			this.fileClient.read(fetchLocation, true).then(function(projectDir){
				var children = projectDir.Children;
				for(var i=0; i<children.length; i++){
					if(children[i].Name && children[i].Name===this._launchConfigurationsDir){
						deferred.resolve(children[i]);
						return deferred;
					}
				}
				if(create){
					this.fileClient.createFolder(projectMetadata.ContentLocation, this._launchConfigurationsDir).then(
						function(result){
							result.parent = projectDir;
							deferred.resolve(result);
						}, deferred.reject);
				} else {
					deferred.resolve(null);
				}
			}.bind(this), deferred.reject);
		} else {
			deferred.reject();
		}
		return deferred;
	},
	
	getProjectLaunchConfigurations: function(projectMetadata){
		var deferred = new Deferred();
		var combinedResult = new Deferred();
		
		this._getLaunchConfigurationsDir(projectMetadata).then(function(launchConfMeta){
			if(!launchConfMeta){
				deferred.resolve([]);
				return deferred;
			}
			if(launchConfMeta.Children){
				var readConfigurationDeferreds = [];
				for(var i=0; i<launchConfMeta.Children.length; i++){
					var def = new Deferred();
					var file = launchConfMeta.Children[i];
					readConfigurationDeferreds.push(def);
					(function(def, file){
					this.fileClient.read(file.Location).then(function(launchConf){
						try{
							launchConf = JSON.parse(launchConf);
							launchConf.Name = launchConf.Name || launchConfMeta.Name.replace(".launch", "");
							launchConf.project = projectMetadata;
							launchConf.File = file;
							launchConf.File.parent = launchConfMeta;
							def.resolve(launchConf);
						} catch(e){
							console.error(e);
							def.resolve();
						}
					}.bind(this), function(e){
						console.error(e);
						def.resolve();
					});
					}).bind(this)(def, file);
				}
				Deferred.all(readConfigurationDeferreds).then(function(result){
					if(!result || !result.length){
						deferred.resolve([]);
						return;
					}
					
					for(var i=result.length-1; i>=0; i--){
						if(!result[i]){
							result.splice(i, 1);
						}
					}
					deferred.resolve(result);
				}, deferred.reject);
			} else {
				var func = arguments.callee.bind(this);
				this.fileClient.fetchChildren(launchConfMeta.ChildrenLocation).then(function(children){
					launchConfMeta.Children = children;
					func(launchConfMeta);
				}.bind(this), deferred.reject);
			}	
		}.bind(this), deferred.reject);
		
		deferred.then(function(results){
			var i = 0;
			function addPluginLaunchConfugurations(i, deferred){
				if(i >= this.allProjectDeployReferences.length){
					return deferred;
				}
				var deployServiceRef = this.allProjectDeployReferences[i];
				var deployService = this._getProjectDeployService(deployServiceRef);
				if(deployService.getLaunchConfigurations){
					var retDef = new Deferred();
					deferred.then(function(lConfs){
						i++;
						var tempDef = new Deferred();
						deployService.getLaunchConfigurations(projectMetadata, lConfs).then(function(lConfs1){
							lConfs1.forEach(function(lc){
								if(!lc.ServiceId){
									lc.ServiceId = deployService.id;
								}
							});
							tempDef.resolve(lConfs1);
						}, tempDef.reject);
						addPluginLaunchConfugurations.bind(this)(i, tempDef).then(retDef.resolve, retDef.reject);
					}.bind(this), retDef.reject);
					return retDef;
				} else {
					i++;
					return addPluginLaunchConfugurations.bind(this)(i, deferred);
				}
			};
			
			var lConfs = [];
			results.forEach(function(lc){
				lConfs.push(this.formPluginLaunchConfiguration(lc));
			}.bind(this));
			
			var tempDef = new Deferred();
			tempDef.resolve(lConfs);
			addPluginLaunchConfugurations.bind(this)(i, tempDef).then(function(lConfs){
				for(var i=0; i<lConfs.length; i++){
						var lConf = lConfs[i];
						lConfs[i] = this.formLaunchConfiguration(lConf.ConfigurationName, lConf.ServiceId, lConf.Parameters, lConf.Url, lConf.ManageUrl, lConf.Path, lConf.Type, lConf.File);
					}
					combinedResult.resolve(lConfs);
			}.bind(this), combinedResult.reject);
		}.bind(this), combinedResult.reject);
			
		return combinedResult;
	},
	
	formLaunchConfiguration: function(configurationName, serviceId, params, url, manageUrl, path, deployType, file){
		var launchConfigurationEnry = {
			Name: configurationName,
			ServiceId: serviceId,
			Params: params,
			Url: url,
			ManageUrl: manageUrl,
			Path: path,
			File: file
		};
		
		if(deployType){
			launchConfigurationEnry.Type = deployType;
		}
		return launchConfigurationEnry;
	},
	formPluginLaunchConfiguration: function(lc){
		return this._formPluginLaunchConfiguration(lc.Name, lc.ServiceId, lc.Params, lc.Url, lc.ManageUrl, lc.Path, lc.Type, lc.File)
	},
	_formPluginLaunchConfiguration: function(configurationName, serviceId, params, url, manageUrl, path, deployType, file){
		return {
			ConfigurationName: configurationName,
			Parameters: params,
			Url: url,
			Type: deployType,
			ManageUrl: manageUrl,
			Path: path,
			File: file,
			ServiceId: serviceId
		}
	},
	
	saveProjectLaunchConfiguration: function(projectMetadata, configurationName, serviceId, params, url, manageUrl, path, deployType){
		var deferred = new Deferred();
		var configurationFile = configurationName;
		configurationFile = configurationFile.replace(/\ /g,' ');
		configurationFile = configurationFile.replace(/[^\w\d\s]/g, '');
		if(configurationFile.indexOf(".launch")<0){
			configurationFile+=".launch";
		}
		var launchConfigurationEnry = this.formLaunchConfiguration(configurationName, serviceId, params, url, manageUrl, path, deployType);
		
		this._getLaunchConfigurationsDir(projectMetadata, true).then(function(launchConfDir){
			if(launchConfDir.Children){
				for(var i=0; i<launchConfDir.Children.length; i++){
					if(launchConfDir.Children[i].Name === configurationFile){
						//not sure if we won't need this later, see Bug 428460						
						//if(window.confirm("Launch configuration " + configurationFile + " already exists, do you want to replace it?")){
							
							this.fileClient.write(launchConfDir.Children[i].Location, JSON.stringify(launchConfigurationEnry, null, 2)).then(
							function(){
								launchConfigurationEnry.File = launchConfDir.Children[i];
								launchConfigurationEnry.File.parent = launchConfDir;
								deferred.resolve(launchConfigurationEnry);
							}, deferred.reject);
							return;
						//						} else {
						//deferred.reject("Launch configuration already exists");
						//return;
						//}
					}
				}
				this.fileClient.createFile(launchConfDir.Location, configurationFile).then(function(result){
					delete launchConfigurationEnry.File;
					this.fileClient.write(result.Location, JSON.stringify(launchConfigurationEnry, null, 2)).then(
					function(){
						launchConfigurationEnry.File = result;
						launchConfigurationEnry.File.parent = launchConfDir;
						deferred.resolve(launchConfigurationEnry);
					}, deferred.reject);
				}.bind(this), deferred.reject);
			} else {
				var func = arguments.callee.bind(this);
				this.fileClient.fetchChildren(launchConfDir.ChildrenLocation).then(function(children){
					launchConfDir.Children = children;
					func(launchConfDir);
				}.bind(this), deferred.reject);	
			}
		}.bind(this));
		return deferred;
	}
		
	};//end ProjectClient prototype
	ProjectClient.prototype.constructor = ProjectClient;

	//return the module exports
	return {ProjectClient: ProjectClient};
});
