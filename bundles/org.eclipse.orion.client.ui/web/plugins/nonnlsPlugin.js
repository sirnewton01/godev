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
define([
	'orion/plugin',
	'stringexternalizer/nonnlsSearchUtil'
], function (PluginProvider, NlsSearchUtil) {

	var validatorEnabled = true;

	var provider = new PluginProvider();
	var serviceProvider = provider.registerService(["orion.edit.validator", "orion.cm.managedservice"],
	  {
	     updated: function(properties) {
		     if (properties && typeof properties.enabled !== 'undefined') {
		        validatorEnabled = !!properties.enabled;
		     }
	     },
	     computeProblems: function(editorContext, context) {
	         return editorContext.getText().then(this.checkText.bind(this));
	     },
	     checkText: function(contents) {
		       if (!validatorEnabled) {
		           return {problems: []};
		       }

		var excluded = NlsSearchUtil.getExcluded(contents);

	       var problems = [];
	       var stringRegExp = /("(\\"|[^"])+")|('(\\'|[^'])+')/g;
	       var nonnlsRegExp = /\/\/\$NON-NLS-[0-9]+\$/g;
	       var lines = contents.split(/\r?\n/);
	       var isBlockComment = false;
	       for (var i=0; i < lines.length; i++) {
	         var line = lines[i];
			var lineOffset = contents.indexOf(line);
	         var match = stringRegExp.exec(line);
	         var strings = [];
	         while (match) {
				if(!excluded.contains(match, lineOffset)){
						strings.push(match);
					}
				match = stringRegExp.exec(line);
	         }
	         if(strings.length>0){
		         var nonnls = {};
		         match = nonnlsRegExp.exec(line);
		         while(match){
					nonnls[parseInt(match[0].substring(11, match[0].length-1))] = true;
					match = nonnlsRegExp.exec(line);
		         }
		         
		         for(var j=0; j<strings.length; j++){
					if(!nonnls[j]){
						problems.push({
			             reason: "Non externalized string literal " + strings[j][0],
			             line: i + 1,
			             character: strings[j].index + 1,
			             end: strings[j].index + strings[j][0].length,
			             severity: "warning" });
					}
		         }
				}
	         }
	       var result = { problems: problems };
	       return result;
	       }
	  },
	  {
	     contentType: ["application/javascript"],
	     pid: 'nonnls.config'
	  });
	
	provider.registerService('orion.navigate.command', null, {
		id: 'orion.nonnls.externalize',
		nameKey: 'Strings Xtrnalizr',
		tooltipKey: 'Externalize strings',
		nls: 'orion/navigate/nls/messages',
		forceSingleItem: true,
		validationProperties:
					[
						{	source: 'Directory'
						}
					],
		uriTemplate: '{+OrionHome}/stringexternalizer/strExternalizer.html#{,Location}'
	});

	provider.registerService("orion.core.setting",
		{},
		{	settings: [
				{	pid: 'nonnls.config',
					name: 'NLS Validator',
					category: 'validation',
					tags: 'validation javascript js nls'.split(' '),
					properties: [
						{	id: 'enabled',
							name: 'Warn on unexternalized strings:',
							defaultValue: true,
							type: 'boolean'
						}
					]
				}
			]
		});

	provider.connect();
});