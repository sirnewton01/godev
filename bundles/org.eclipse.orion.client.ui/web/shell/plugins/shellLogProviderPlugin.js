/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
define(['require', 'orion/plugin', 'orion/xhr', 'orion/Deferred', 'orion/i18nUtil'],
 function(require, PluginProvider, _xhr, Deferred, i18nUtil) {
	
	/* log service server scope */
	var LOG_API_SCOPE = "logapi/";
	
	var headers = {
		name: "Orion Log Provider Service",
		version: "1.0",
		description: "This plugin provides shell access to Orion log service."
	};

	var temp = document.createElement('a');
	function createLocation(location) {
		temp.href = location;
		var absLocation = temp.href;
		if(temp.host){
			return absLocation.substring(absLocation.indexOf(temp.host) + temp.host.length);
		}
		
		return absLocation;
	}
	
	var temp2 = document.createElement('a');
	function toAbsoluteLocation(location) {
		temp2.href = location;
		var absLocation = temp2.href;
		return absLocation;
	}
	
	/* used to generate absolute download links */
	function qualifyURL(location){
		return toAbsoluteLocation(createLocation(require.toUrl(location)));
	}

	function handleLogServiceErrorMessage(error){
		//TODO: Should rely on server error messages, not error statuses.
		var status = error.status;
		switch(status){
			case 405:
				return '(405) Unsupported log service request.';
			case 404:
				return '(404) Could not find the log service resource.';
			case 403:
				return '(403) Unauthorized log service request.';
			case 401:
				return '(403) Unauthorized log service request.';
			default:
				return 'Unexpected log service exception.';
		}
	}

	function GET(url, raw){
		var d = new Deferred();
		var handler = raw ? "text/plain" : "json";
		
		_xhr("GET", url, {
			headers : {
				"Orion-Version" : "1",
				"Content-Type" : handler + "; charset=UTF-8"
			},
			timeout : 15000,
			handleAs : handler
		}).then(function(resp) {
			if(raw){ d.resolve(resp.responseText); }
			else { d.resolve(JSON.parse(resp.responseText)); }
		}, function(error){
			d.reject(error);
		});
		
		return d;
	}
	
	function PUT(url, dataJSON){
		var d = new Deferred();
		_xhr("PUT", url, { 
			headers : { 
				"Orion-Version" : "1",
				"Content-Type" : "application/json; charset=UTF-8"
			},
			timeout : 15000,
			handleAs : "json", //$NON-NLS-0$
			data: JSON.stringify(dataJSON)
		}).then(function(resp) {
			d.resolve(JSON.parse(resp.responseText));
		}, function(error){
			d.reject(error);
		});
		
		return d;
	}
	
	function getFileAppenders(){
		var deferred = new Deferred();
		var location = LOG_API_SCOPE + "fileAppender/";
		GET(createLocation(require.toUrl(location))).then(function(resp){
			deferred.resolve(resp.Children);
		}, function(error){
			deferred.reject(handleLogServiceErrorMessage(error));
		});
		
		return deferred;
	}
	
	function getRollingFileAppenders(){
		var deferred = new Deferred();
		var location = LOG_API_SCOPE + "rollingFileAppender/";
		GET(createLocation(require.toUrl(location))).then(function(resp){
			deferred.resolve(resp.Children);
		}, function(error){
			deferred.reject(handleLogServiceErrorMessage(error));
		});
		
		return deferred;
	}
	
	function getLoggers(){
		var deferred = new Deferred();
		var location = LOG_API_SCOPE + "logger/";
		GET(createLocation(require.toUrl(location))).then(function(resp){
			deferred.resolve(resp.Children);
		}, function(error){
			deferred.reject(handleLogServiceErrorMessage(error));
		});
		
		return deferred;
	}
	
	function updateLogger(loggerName, level){
		var deferred = new Deferred();
		var location = LOG_API_SCOPE + "logger/" + loggerName;
		
		var dataJSON = {
			"Level" : level
		};
		
		PUT(createLocation(require.toUrl(location)), dataJSON).then(function(resp){
			deferred.resolve(resp);
		}, function(error){
			deferred.reject(handleLogServiceErrorMessage(error));
		});
		
		return deferred;
	}
	
	function renderDownloadLink(url, linkName){
		var name = linkName || "Download";
		return "[" + name + "](" + url + ")";
	}

	var provider = new PluginProvider(headers);
	
	var CompletionStatus = {
	   MATCH: 0,
	   PARTIAL: 1,
	   ERROR: 2
	};
	
	var loggerLevelProperties = { 
	   name: "level"
	 };
	 
	var loggerLevelTypeImpl = {	
	   parse: function(arg, typeSpec, context) {
	     var potentialPredictions = [{
	         name: 'ALL',
	         value: 'ALL'
	       }, {
	         name: 'DEBUG',
	         value: { name: 'DEBUG' }
	       }, {
	         name: 'ERROR',
	         value: { name: 'ERROR' }
	       }, {
	         name: 'INFO',
	         value: { name: 'INFO' }
	       }, {
	         name: 'OFF',
	         value: { name: 'OFF' }
	       }, {
	         name: 'TRACE',
	         value: { name: 'TRACE' }
	       }, {
	         name: 'WARN',
	         value: { name: 'WARN' }
	       }
	     ];
	
	     var value; /* undefined until a valid value is fully typed */
	     var status; /* one of the CompletionStatus values above */
	     var predictions = []; /* an [] of {name: typedString, value: object} */
	
	     for (var i = 0; i < potentialPredictions.length; i++) {
	       if (potentialPredictions[i].name.indexOf(arg.text) === 0) {
	         predictions.push(potentialPredictions[i]);
	         if (potentialPredictions[i].name === arg.text) {
	           value = potentialPredictions[i].value;
	         }
	       }
	     }
	
	     status = CompletionStatus.ERROR;
	     if (predictions.length > 0) {
	       status = value ? CompletionStatus.MATCH : CompletionStatus.PARTIAL;
	     }
	     var result = {
	       value: value,
	       message: (status === CompletionStatus.ERROR ? ("'" + arg.text + "' is not valid") : undefined),
	       status: status,
	       predictions: predictions
	     };
	
	     return result;
	   }
	 };
		
	provider.registerServiceProvider("orion.shell.type", loggerLevelTypeImpl, loggerLevelProperties);
	
	var appenderProperties = { 
	   name: "appender-name"
	 };
	 
	var appenderTypeImpl = {	
	   parse: function(arg, typeSpec, context) {
	     var deferred = new Deferred();	     
	     getFileAppenders().then(function(resp){
	     
			var potentialPredictions = [];
			for(var i=0; i<resp.length; ++i){
				var child = resp[i];
				potentialPredictions.push({
					name: child.Name,
					value: { name: child.Name }
				});
			}
			
			var value; /* undefined until a valid value is fully typed */
		    var status; /* one of the CompletionStatus values above */
		    var predictions = []; /* an [] of {name: typedString, value: object} */
		
		    for (var i = 0; i < potentialPredictions.length; i++) {
		      if (potentialPredictions[i].name.indexOf(arg.text) === 0) {
		        predictions.push(potentialPredictions[i]);
		        if (potentialPredictions[i].name === arg.text) {
		          value = potentialPredictions[i].value;
		        }
		      }
		    }
		
		    status = CompletionStatus.ERROR;
		    if (predictions.length > 0) {
		      status = value ? CompletionStatus.MATCH : CompletionStatus.PARTIAL;
		    }
		     
		    var result = {
		      value: value,
		      message: (status === CompletionStatus.ERROR ? ("'" + arg.text + "' is not valid") : undefined),
		      status: status,
		      predictions: predictions
		    };
	
			deferred.resolve(result);
			
	     }, function(error){
			deferred.reject('ERROR: ' + error);
	     });
	
	     return deferred;
	   }
	 };
		
	provider.registerServiceProvider("orion.shell.type", appenderTypeImpl, appenderProperties);
	
	var rollingFileAppenderProperties = { 
	   name: "rolling-appender-name"
	};
	 
	var rollingFileAppenderTypeImpl = {	
	   parse: function(arg, typeSpec, context) {
	     var deferred = new Deferred();	     
	     getRollingFileAppenders().then(function(resp){
	     
			var potentialPredictions = [];
			for(var i=0; i<resp.length; ++i){
				var child = resp[i];
				potentialPredictions.push({
					name: child.Name,
					value: { name: child.Name }
				});
			}
			
			var value; /* undefined until a valid value is fully typed */
		    var status; /* one of the CompletionStatus values above */
		    var predictions = []; /* an [] of {name: typedString, value: object} */
		
		    for (var i = 0; i < potentialPredictions.length; i++) {
		      if (potentialPredictions[i].name.indexOf(arg.text) === 0) {
		        predictions.push(potentialPredictions[i]);
		        if (potentialPredictions[i].name === arg.text) {
		          value = potentialPredictions[i].value;
		        }
		      }
		    }
		
		    status = CompletionStatus.ERROR;
		    if (predictions.length > 0) {
		      status = value ? CompletionStatus.MATCH : CompletionStatus.PARTIAL;
		    }
		     
		    var result = {
		      value: value,
		      message: (status === CompletionStatus.ERROR ? ("'" + arg.text + "' is not valid") : undefined),
		      status: status,
		      predictions: predictions
		    };
	
			deferred.resolve(result);
			
	     }, function(error){
			deferred.reject('ERROR: ' + error);
	     });
	
	     return deferred;
	   }
	 };
		
	provider.registerServiceProvider("orion.shell.type", rollingFileAppenderTypeImpl, rollingFileAppenderProperties);
	
	var loggerProperties = { 
	   name: "logger-name"
	 };
	 
	var loggerTypeImpl = {	
	   parse: function(arg, typeSpec, context) {
	     var deferred = new Deferred();	     
	     getLoggers().then(function(resp){
	     
			var potentialPredictions = [];
			for(var i=0; i<resp.length; ++i){
				var child = resp[i];
				potentialPredictions.push({
					name: child.Name,
					value: { name: child.Name }
				});
			}
			
			var value; /* undefined until a valid value is fully typed */
		    var status; /* one of the CompletionStatus values above */
		    var predictions = []; /* an [] of {name: typedString, value: object} */
		
		    for (var i = 0; i < potentialPredictions.length; i++) {
		      if (potentialPredictions[i].name.indexOf(arg.text) === 0) {
		        predictions.push(potentialPredictions[i]);
		        if (potentialPredictions[i].name === arg.text) {
		          value = potentialPredictions[i].value;
		        }
		      }
		    }
		
		    status = CompletionStatus.ERROR;
		    if (predictions.length > 0) {
		      status = value ? CompletionStatus.MATCH : CompletionStatus.PARTIAL;
		    }
		     
		    var result = {
		      value: value,
		      message: (status === CompletionStatus.ERROR ? ("'" + arg.text + "' is not valid") : undefined),
		      status: status,
		      predictions: predictions
		    };
	
			deferred.resolve(result);
			
	     }, function(error){
			deferred.reject('ERROR: ' + error);
	     });
	
	     return deferred;
	   }
	 };
		
	provider.registerServiceProvider("orion.shell.type", loggerTypeImpl, loggerProperties);
	
	/* register base command */
	provider.registerServiceProvider(
        "orion.shell.command", null, {
        name: "logs",
        description: "Commands for accessing Orion logs."
    });
    
	/* downloads appender active log-file */
	var logsDownloadImpl = {
		callback: function(args){			
			var deferred = new Deferred();
			var appenderName = args['appender-name'] ? args['appender-name'].name : undefined;

			getFileAppenders().then(function(resp){
				if(resp.length === 0){
					var errorMessage = i18nUtil.formatMessage("ERROR: No file appenders were found in the current logger context.",
						resp.length);
							
					deferred.reject(errorMessage);
					return; // failed
				}
				
				if(resp.length === 1){
					var child = resp[0];
					if(appenderName && appenderName !== child.Name){
						/* user is looking for a different appender then the default one */
						var errorMessage = i18nUtil.formatMessage("ERROR: No file appender named ${0} found in the current logger context.",
							appenderName);
							
						deferred.reject(errorMessage);
						return; // failed
					}
					
					/* provide the default one */
					deferred.resolve(renderDownloadLink(qualifyURL(child.Location)));
					return; // success
				}
				
				/* multiple appenders in context */
					
				if(!appenderName){
					/* there's no default appender, fail */
					var errorMessage = i18nUtil.formatMessage("ERROR: Found ${0} file appenders in the current logger context. " +
						"Could not determine which appender to use by default.", resp.Children.length);
					
					deferred.reject(errorMessage);
					return; // failed
				}
					
				for(var i=0; i<resp.length; ++i){
					var child = resp[i];
					if(child.Name === appenderName){
						deferred.resolve(renderDownloadLink(qualifyURL(child.Location)));
						return; // success
					}
				}
				
				/* no suitable appender could be found */
				var errorMessage = i18nUtil.formatMessage("ERROR: No file appender named ${0} found in the current logger context.",
					appenderName);
							
				deferred.reject(errorMessage);
				return; // failed
					
			}, function(error){
				deferred.reject('ERROR: ' + error);
			});
		
			return deferred;
		}
	};

	/* downloads appender active log-file */	
	var logsDownload = {
		name: "logs download",
		description: "Provides an active log-file download link for the given appender. If none provided, the default appender will be used.",
		returnType: "string",
		parameters: [{
			name: "appender-name",
			type: { name: "appender-name" },
			description: "Appedner name which active log-file download link should be provided.",
			defaultValue: null
		}]
	};

	provider.registerServiceProvider("orion.shell.command",
		logsDownloadImpl, logsDownload);
		
	function getAppenderJSON(appenderName){
		var deferred = new Deferred();
		getFileAppenders().then(function(resp){
				
			if(resp.length === 0){
				var errorMessage = i18nUtil.formatMessage("ERROR: No file appenders were found in the current logger context.",
					resp.Children.length);
						
				deferred.reject(errorMessage);
				return; // failed
			}
			
			var appender;
			
			/* there's only one appender, provide default one */
			if(resp.length === 1){
				var child = resp[0];
				
				/* provide the default one */
				appender = child;
			}
				
			/* get appender metadata */
			for(var i=0; i<resp.length; ++i){
				var child = resp[i];
				if(child.Name === appenderName){
					appender = child;
				}
			}
			
			if(appender){
				GET(appender.Location + "?parts=meta").then(function(response){
					deferred.resolve(response);
				}, function(error){
					deferred.reject('ERROR: ' + handleLogServiceErrorMessage(error));
				});
				return;
			}
					
			/* no suitable appender could be found */
			var errorMessage = i18nUtil.formatMessage("ERROR: No file appender named ${0} found in the current logger context.",
				appenderName);
								
			deferred.reject(errorMessage);
			return; // failed
			
		}, function(error){
			deferred.reject('ERROR: ' + error);
		});
			
		return deferred;
	}
	
	function getLoggerJSON(loggerName){
		var deferred = new Deferred();
		getLoggers().then(function(resp){
				
			if(resp.length === 0){
				var errorMessage = i18nUtil.formatMessage("ERROR: No loggers were found in the current logger context.",
					resp.length);
						
				deferred.reject(errorMessage);
				return; // failed
			}
			
			var logger;
			
			/* get logger metadata */
			for(var i=0; i<resp.length; ++i){
				var child = resp[i];
				if(child.Name === loggerName){
					logger = child;
				}
			}
			
			if(logger){
				GET(logger.Location).then(function(response){
					deferred.resolve(response);
				}, function(error){
					deferred.reject('ERROR: ' + handleLogServiceErrorMessage(error));
				});
				return;
			}
					
			/* no suitable appender could be found */
			var errorMessage = i18nUtil.formatMessage("ERROR: No logger ${0} found in the current logger context.",
				loggerName);
								
			deferred.reject(errorMessage);
			return; // failed
			
		}, function(error){
			deferred.reject('ERROR: ' + error);
		});
			
		return deferred;
	}
	
	/* determines whether the given variable is a JSON or not */
	function _isJSON(object){
		return object !== null && typeof object === 'object';
	}
	
	/* appenders the text with tab symbols for pretty print */
	function _appendTabs(text, k){
		if(k === 0){ return text; }
		else { return "\t" + _appendTabs(text, k - 1); }
	}
	
	/* used for better JSON responses representation */
	function prettyPrint(json, tabs){
		var result = "";
		
		for (var property in json) {
		    var value = json[property];
		    
		    if(value === undefined) {
				continue;
		    }
		    
		    if(_isJSON(value)){ result += prettyPrint(value, tabs + 1); }
		    else { result += _appendTabs(property + " : " + value + "\n", tabs); }
		}
		
		return result;
	}
		
	/* shows appenders in current logger context */
    var logsShowImpl = {
		callback: function(args){
			var deferred = new Deferred();
			var appenderName = args['appender-name'] ? args['appender-name'].name : undefined;
			
			if(!appenderName){
				/* list all appender names */
				getFileAppenders().then(function(resp){
					if(resp.length === 0){
						var errorMessage = i18nUtil.formatMessage("ERROR: No file appenders were found in the current logger context.",
							resp.length);
								
						deferred.reject(errorMessage);
						return deferred; // failed
					}
					
					/* there's only one appender, provide default one metadata */
					if(resp.length === 1){
						var child = resp[0];
						
						/* provide the default one */
						getAppenderJSON(child.Name).then(function(appender){
							/* spare the user appender log-file history at this point */
							appender.ArchivedLogFiles = undefined;
							deferred.resolve(prettyPrint(appender, 0));
						}, function(errorMessage){
							/* pass error message */
							deferred.reject(errorMessage);
						});
						
						return deferred;
					}
					
					var names = [];
					for(var i=0; i<resp.length; ++i){
						var child = resp[i];
						names.push(child.Name);
					}
					
					deferred.resolve(names.join("\n"));
				}, function(error){
					deferred.reject("ERROR: " + error);
				});
				
				return deferred;
			}
			
			getAppenderJSON(appenderName).then(function(appender){
				/* spare the user appender log-file history at this point */
				appender.ArchivedLogFiles = undefined;
				deferred.resolve(prettyPrint(appender, 0));
			}, function(errorMessage){
				/* pass error message */
				deferred.reject(errorMessage);
			});
			
			return deferred;
		}
    };
    
    /* shows appenders in current logger context */
	var logsShow = {
		name: "logs show",
		description: "Provides metadata for the given appender. If none provided, lists all file-based appender names in the current logger context.",
		returnType: "string",
		parameters: [{
			name: "appender-name",
			type: { name: "appender-name" },
			description: "Appedner name which metadata should be provided.",
			defaultValue: null
		}]
	};
	
	provider.registerServiceProvider("orion.shell.command",
		logsShowImpl, logsShow);
		
	/* shows appender history */
    var logsHistoryImpl = {
		callback: function(args){
			var deferred = new Deferred();
			var appenderName = args['appender-name'] ? args['appender-name'].name : undefined;
			
			if(!appenderName){
				/* fall back to the default appender is present */
				getRollingFileAppenders().then(function(resp){
					if(resp.length === 0){
						var errorMessage = i18nUtil.formatMessage("ERROR: No rolling file appenders were found in the current logger context.",
							resp.length);
								
						deferred.reject(errorMessage);
						return deferred; // failed
					}
					
					/* there's only one appender, provide default one history */
					if(resp.length === 1){
						var child = resp[0];
						appenderName = child.Name;
						
						getAppenderJSON(appenderName).then(function(appender){
							if(!appender.ArchivedLogFiles){
								var errorMessage = i18nUtil.formatMessage("ERROR: ${0} does not support log-file history access.",
									appenderName);
										
								deferred.reject(errorMessage);
								return; // failed
							}
							
							if(appender.ArchivedLogFiles.length === 0){
								var errorMessage = i18nUtil.formatMessage("ERROR: ${0} has no log-file history.",
									appenderName);
										
								deferred.reject(errorMessage);
								return; // failed
							}
			
							var names = [];
							for(var i=0; i<appender.ArchivedLogFiles.length; ++i){
								var log = appender.ArchivedLogFiles[i];
								names.push(log.Name + " : " + renderDownloadLink(qualifyURL(log.Location)));
							}
							
							deferred.resolve(names.join("\n"));
							
						 }, function(errorMessage){
							/* pass error message */
							deferred.reject(errorMessage);
						 });
						
						return deferred;
					}
					
					/* there's no default appender, fail */
					var errorMessage = i18nUtil.formatMessage("ERROR: Found ${0} file appenders in the current logger context. " +
						"Could not determine which appender to use by default.", resp.length);
					
					deferred.reject(errorMessage);
					return; // failed
					
				}, function(error){
					deferred.reject("ERROR: " + error);
				});
				
				return deferred;
			}
			
			getAppenderJSON(appenderName).then(function(appender){
				if(!appender.ArchivedLogFiles){
					var errorMessage = i18nUtil.formatMessage("ERROR: ${0} does not support log-file history access.",
						appenderName);
							
					deferred.reject(errorMessage);
					return; // failed
				}
				
				if(appender.ArchivedLogFiles.length === 0){
					var errorMessage = i18nUtil.formatMessage("ERROR: ${0} has no log-file history.",
						appenderName);
							
					deferred.reject(errorMessage);
					return; // failed
				}

				var names = [];
				for(var i=0; i<appender.ArchivedLogFiles.length; ++i){
					var log = appender.ArchivedLogFiles[i];
					names.push(log.Name + " : " + renderDownloadLink(qualifyURL(log.Location)));
				}
				
				deferred.resolve(names.join("\n"));
				
			 }, function(errorMessage){
				/* pass error message */
				deferred.reject(errorMessage);
			 });
			
			return deferred;
		}
	};
	
	/* shows appender history */
    var logsHistory = {
		name: "logs history",
		description: "Provides a list of archived log-file download links for the given appender. If none provided, the default appender will be used.",
		returnType: "string",
		parameters: [{
			name: "appender-name",
			type: { name: "rolling-appender-name" },
			description: "Appedner name which archived log-file download links should be provided.",
			defaultValue: null
		}]
    };
    
    provider.registerServiceProvider("orion.shell.command",
		logsHistoryImpl, logsHistory);
		
	/* register base command */
	provider.registerServiceProvider(
        "orion.shell.command", null, {
        name: "loggers",
        description: "Commands for accessing Orion loggers."
    });
    
    /* shows loggers in current logger context */
    var loggerShowImpl = {
		callback: function(args){
			var deferred = new Deferred();
			var loggerName = args['logger-name'] ? args['logger-name'].name : undefined;
			
			if(!loggerName){
				/* list all appender names */
				getLoggers().then(function(resp){
					
					if(resp.length === 0){
						var errorMessage = i18nUtil.formatMessage("ERROR: No loggers were found in the current logger context.",
							resp.length);
								
						deferred.reject(errorMessage);
						return deferred; // failed
					}
					
					/* logger with levels first */
					resp.sort(function(a, b){
						if(a.Level && !b.Level) { return -1; }
						if(!a.Level && b.Level) { return 1; }
						return a.Name.localeCompare(b.Name);
					});
					
					var names = [];
					for(var i=0; i<resp.length; ++i){
						var child = resp[i];
						if(child.Level) { names.push(child.Name + " : " + child.Level); }
						else { names.push(child.Name + " : (" + child.EffectiveLevel + ")"); }
					}
					
					deferred.resolve(names.join("\n"));
				}, function(error){
					deferred.reject("ERROR: " + error);
				});
				
				return deferred;
			}
			
			getLoggerJSON(loggerName).then(function(logger){
				deferred.resolve(prettyPrint(logger, 0));
			}, function(errorMessage){
				/* pass error message */
				deferred.reject(errorMessage);
			});
			
			return deferred;
		}
    };
    
    /* shows appenders in current logger context */
	var loggerShow = {
		name: "loggers show",
		description: "Provides metadata for the given logger. If none provided, lists all loggers in the current logger context.",
		returnType: "string",
		parameters: [{
			name: "logger-name",
			type: { name: "logger-name" },
			description: "Logger name which metadata should be provided.",
			defaultValue: null
		}]
	};
	
	provider.registerServiceProvider("orion.shell.command",
		loggerShowImpl, loggerShow);
		
	/* shows loggers in current logger context */
    var loggerUpdateLevelImpl = {
		callback: function(args){
			var deferred = new Deferred();
			var loggerName = args['logger-name'] ? args['logger-name'].name : undefined;
			
			updateLogger(loggerName, args.level.name).then(function(logger){
				deferred.resolve(prettyPrint(logger, 0));
			}, function(errorMessage){
				/* pass error message */
				deferred.reject(errorMessage);
			});
			
			return deferred;
		}
    };
    
    /* shows appenders in current logger context */
	var loggerUpdateLevel = {
		name: "loggers update",
		description: "Updates logging level for the given logger.",
		returnType: "string",
		parameters: [{
			name: "logger-name",
			type: { name: "logger-name" },
			description: "Logger name which level should be updated."
		}, {
	     name: "level",
	     type: { name: "level" },
	     description: "Valid logback logging level."
	   }]
	};
	
	provider.registerServiceProvider("orion.shell.command",
		loggerUpdateLevelImpl, loggerUpdateLevel);
	
	provider.connect();
});