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
define(['orion/Deferred', 'orion/xhr', 'orion/form', 'orion/URL-shim'], function(Deferred, xhr, form) {
	function debug(msg) { console.log('orion injector: ' + msg); }

	/**
	 * Transformer for errors returned by XHRs
	 */
	function xhrErrorSanitizer(err) {
		if (err && typeof err.xhr === 'object') {
			delete err.xhr;
		}
		return new Deferred().reject(err);
	}

	function Injector(fileClient, serviceRegistry) {
		this.fileClient = fileClient;
		this.serviceRegistry = serviceRegistry;
	}
	/**
	 * @param {Boolean} data.createUser True to create a new user, false to use an existing user.
	 * @param {Object} [data.userInfo=null] User data for creating new user, or for logging in.
	 * When <code>createUser</code> is true, an Orion account may created by providing the following parameters in userInfo:
	 * <dl>
	 *  <dt>{String} data.userInfo.Email</dt> <dd>Required. May be user for email validation.</dd>
	 *  <dt>{String} data.userInfo.Login</dt> <dd>Required.</dd>
	 *  <dt>{String} data.userInfo.Password</dt> <dd>Required.</dd>
	 *  <dt>{String} [data.userInfo.Name]</dt> <dd>Optional.</dd>
	 * </dl>
	 * If <code>createUser</code> is false and userInfo is not provided, the client assumed to be authenticated already.
	 * @param {Blob} data.zip
	 * @param {String} data.projectName
	 * @param {Boolean} [data.overwrite=false] Whether the project should be overwritten if it already exists.
	 */
	Injector.prototype.inject = function(data) {
//		var isCreateUser = data.createUser;
		var userInfo = data.userInfo;
		var projectZipData = data.zip;
		var projectName = data.projectName;
		var isOverwrite = typeof data.overwrite !== 'undefined' ? !!data.overwrite : false;

		projectName = projectName || 'Project';
		var fileClient = this.fileClient;
		var serviceRegistry = this.serviceRegistry;
		var authService = serviceRegistry.getService('orion.core.auth'); //$NON-NLS-0$
		var userService = serviceRegistry.getService('orion.core.user'); //$NON-NLS-0$
		if (!authService || !userService) {
			throw "Missing auth or user service";
		}

		// Log in -- TODO no service API for this, so it's hardcoded
		var doLogin = function(login, password) {
			debug('logging in...');
			var formData = {
				login: login
			};
			if (typeof password === 'string') {
				formData.password = password;
			}
			return xhr('POST', '../login/form', {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Orion-Version': '1'
				},
				data: form.encodeFormData(formData)
			}).then(function(xhrResult) {
				return JSON.parse(xhrResult.response);
			});
		};
//		var getLoggedInUser = function() {
//			return authService.getUser().then(function(user) {
//				if (!user) {
//					return new Deferred().reject("Not logged in");
//				}
//				return userService.getUserInfo(user.Location);
//			});
//		};
		var ensureUserLoggedIn = function() {
//			if (isCreateUser) {
//				var displayName = userInfo.Name;
//				return userService.createUser(userInfo).then(function(user) {
//					debug('user created');
//					return user;
//				}).then(function(user) {
//					debug('login: ' + user.login);
//					debug('password: ' + user.password);
//					return doLogin(user.login, user.password);
//				}).then(function(user) {
//					debug('set display name of ' + user.login + ' to ' + displayName);
//					user.Name = displayName;
//					return userService.updateUserInfo(user.Location, user).then(function(xhrResult) {
//						return user;
//					});
//				});
//			} else
			if (userInfo) {
				return doLogin(userInfo.login, userInfo.password);
			} else {
				// !createUser and !userInfo implies we're already authenticated, so just continue
				//return getLoggedInUser();
				return new Deferred().resolve();
			}
		};
		/**
		 * Creates project if necessary, and returns its metadata
		 * @returns {orion.Promise} Promise resolving to Object with the fields:
		 *   {Object} project The project metadata.<br />
		 *   {Boolean} created Whether we created the project (true) or it existed already (false).
		 */
		var ensureProjectExists = function(location, name) {
			return fileClient.read(location, true).then(function(workspace) {
				var projects = workspace.Children, existingProject;
				projects.some(function(p) {
					if (p.Name === name) {
						existingProject = p;
						console.log('Found existing project: ' + p.Location);
						return true;
					}
				});
				if (existingProject) {
					return fileClient.read(existingProject.ChildrenLocation /* !!! */, true).then(function(project) {
						return { project: project, created: false};
					});
				} else {
					return fileClient.createProject(location, name).then(function(newProject) {
						console.log('Created project: ' + newProject.Location);
						return fileClient.read(newProject.ContentLocation /* !!! */, true).then(function(project) {
							return { project: project, created: true};
						});
					});
				}
			});
		};
		var readProject = function(project) {
			return fileClient.read(project.ChildrenLocation, true);
		};
		var uploadZip = function(importLocation, zipData) {
			// TODO why don't file service impls support this??
			return xhr('POST', importLocation + (importLocation.indexOf("?") > 0 ? "&force=true": "?force=true"), {
				headers: {
					Slug: 'data.zip' // Doesn't matter -- will be unzipped anyway
				},
				data: zipData
			});
		};
		/**
		 * @param {Object} project
		 * @param {Boolean} created Whether the project was just created by us.
		 */
		var maybeWrite = function(project, created) {
			if (isOverwrite || created) {
				return readProject(project).then(function(projectMetadata) {
					console.log('Unzipping to ' + projectMetadata.ImportLocation);
					return uploadZip(projectMetadata.ImportLocation, projectZipData);
				});
			} else {
				console.log('Project exists; not overwriting: ' + project.Name);
				return new Deferred().resolve();
			}
		};
		var importContent = function() {
			return fileClient.loadWorkspace().then(function(workspace) {
				console.log('loaded workspace ' + workspace.Location);
				return ensureProjectExists(workspace.ChildrenLocation, projectName).then(function(projectResult) {
					var project = projectResult.project;
					var created = projectResult.created;
					return maybeWrite(project, created).then(function() {
						return readProject(project).then(function(projectMetadata) {
							return projectMetadata;
						});
					});
				});
			}, function() {
				// An error occurred, return false to indicate no project was created
				return false;
			});
		};

		return ensureUserLoggedIn().then(function(/*loggedInUser*/) {
			return importContent();
		}).then(null, xhrErrorSanitizer);
	};
	return Injector;
});