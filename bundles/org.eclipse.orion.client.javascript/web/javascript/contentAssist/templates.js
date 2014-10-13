/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env amd*/
define([
'orion/editor/templates' //$NON-NLS-0$
], function(mTemplates) {

	var typeofValues = {
		type: "link", //$NON-NLS-0$
		values: [
			"undefined", //$NON-NLS-0$
			"object", //$NON-NLS-0$
			"boolean", //$NON-NLS-0$
			"number", //$NON-NLS-0$
			"string", //$NON-NLS-0$
			"function", //$NON-NLS-0$
			"xml" //$NON-NLS-0$
		]
	};

	/**
	 * @description Array of template metadata objects. These get converted into
	 * {orion.editor.Template} objects lazily as they are asked for
	 * @private 
	 */
	var templates = [
	   {
	        prefix: "eslint", //$NON-NLS-0$
			name: "eslint",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, doc:true},
			description: " - ESLint rule enable or disable", //$NON-NLS-0$
			template: "eslint ${rule-id}:${0/1} ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "eslint-env", //$NON-NLS-0$
			name: "eslint-env",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, doc:true},
			description: " - ESLint environment directive", //$NON-NLS-0$
			template: "eslint-env ${library}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "eslint-enable", //$NON-NLS-0$
			name: "eslint-enable",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, doc:true},
			description: " - ESLint rule enablement directive", //$NON-NLS-0$
			template: "eslint-enable ${rule-id} ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "eslint-disable", //$NON-NLS-0$
			name: "eslint-disable",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, doc:true},
			description: " - ESLint rule disablement directive", //$NON-NLS-0$
			template: "eslint-disable ${rule-id} ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@author", //$NON-NLS-0$
			name: "@author",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Author JSDoc tag", //$NON-NLS-0$
			template: "@author ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@class", //$NON-NLS-0$
			name: "@class",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Class JSDoc tag", //$NON-NLS-0$
			template: "@class ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@constructor", //$NON-NLS-0$
			name: "@constructor",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Constructor JSDoc tag", //$NON-NLS-0$
			template: "@constructor ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@deprecated", //$NON-NLS-0$
			name: "@deprecated",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Deprecated JSDoc tag", //$NON-NLS-0$
			template: "@deprecated ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@description", //$NON-NLS-0$
			name: "@description",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Description JSDoc tag", //$NON-NLS-0$
			template: "@description ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@function", //$NON-NLS-0$
			name: "@function",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Function JSDoc tag", //$NON-NLS-0$
			template: "@function ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@lends", //$NON-NLS-0$
			name: "@lends",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Lends JSDoc tag", //$NON-NLS-0$
			template: "@lends ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@license", //$NON-NLS-0$
			name: "@license",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - License JSDoc tag", //$NON-NLS-0$
			template: "@license ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@name", //$NON-NLS-0$
			name: "@name",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Name JSDoc tag", //$NON-NLS-0$
			template: "@name ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@param", //$NON-NLS-0$
			name: "@param",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Param JSDoc tag", //$NON-NLS-0$
			template: "@param {${type}} ${cursor}" //$NON-NLS-0$
	    },
	    {
	        prefix: "@private", //$NON-NLS-0$
			name: "@private",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Private JSDoc tag", //$NON-NLS-0$
			template: "@private ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@public", //$NON-NLS-0$
			name: "@public",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Public JSDoc tag", //$NON-NLS-0$
			template: "@public ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@returns", //$NON-NLS-0$
			name: "@returns",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Returns JSDoc tag", //$NON-NLS-0$
			template: "@returns {${type}} ${cursor}" //$NON-NLS-0$
	    },
	    {
	        prefix: "@see", //$NON-NLS-0$
			name: "@see",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - See JSDoc tag", //$NON-NLS-0$
			template: "@see ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@since", //$NON-NLS-0$
			name: "@since",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Since JSDoc tag", //$NON-NLS-0$
			template: "@since ${cursor}" //$NON-NLS-0$  
	    },
	    {
	        prefix: "@throws", //$NON-NLS-0$
			name: "@throws",  //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, jsdoc:true},
			description: " - Throws JSDoc tag", //$NON-NLS-0$
			template: "@throws {${type}} ${cursor}" //$NON-NLS-0$
	    },
		{
			prefix: "if", //$NON-NLS-0$
			name: "if",  //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - if statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "if", //$NON-NLS-0$
			name: "if", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - if else statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - iterate over array", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - iterate over array with local var", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for..in", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - iterate over properties of an object", //$NON-NLS-0$
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}" //$NON-NLS-0$
		},
		{
			prefix: "while", //$NON-NLS-0$
			name: "while", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - while loop with condition", //$NON-NLS-0$
			template: "while (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "do", //$NON-NLS-0$
			name: "do", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - do while loop with condition", //$NON-NLS-0$
			template: "do {\n\t${cursor}\n} while (${condition});" //$NON-NLS-0$
		},
		{
		    prefix: "eslint", //$NON-NLS-0$
			name: "eslint", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			description: " - ESLint rule enable / disable directive", //$NON-NLS-0$
			template: "/* eslint ${rule-id}:${0/1}*/" //$NON-NLS-0$
		},
		{
		    prefix: "eslint-env", //$NON-NLS-0$
			name: "eslint-env", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			description: " - ESLint environment directive", //$NON-NLS-0$
			template: "/* eslint-env ${library}*/" //$NON-NLS-0$
		},
		{
		    prefix: "eslint-enable", //$NON-NLS-0$
			name: "eslint-enable", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			description: " - ESLint rule enablement directive", //$NON-NLS-0$
			template: "/* eslint-enable ${rule-id} */" //$NON-NLS-0$
		},
		{
		    prefix: "eslint-disable", //$NON-NLS-0$
			name: "eslint-disable", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false, doc:false, jsdoc:false},
			description: " - ESLint rule disablement directive", //$NON-NLS-0$
			template: "/* eslint-disable ${rule-id} */" //$NON-NLS-0$
		},
		{
			prefix: "switch", //$NON-NLS-0$
			name: "switch", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - switch case statement", //$NON-NLS-0$
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n}" //$NON-NLS-0$
		},
		{
			prefix: "case", //$NON-NLS-0$
			name: "case", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false, swtch: true},
			description: " - case statement", //$NON-NLS-0$
			template: "case ${value}:\n\t${cursor}\n\tbreak;" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - try..catch statement", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - try..catch statement with finally block", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} finally {\n}" //$NON-NLS-0$
		},
		{
			prefix: "typeof", //$NON-NLS-0$
			name: "typeof", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - typeof statement", //$NON-NLS-0$
			template: "typeof ${object} === \"${type:" + JSON.stringify(typeofValues).replace("}", "\\}") + "}\"" //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "instanceof", //$NON-NLS-0$
			name: "instanceof", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - instanceof statement", //$NON-NLS-0$
			template: "${object} instanceof ${type}" //$NON-NLS-0$
		},
		{
			prefix: "with", //$NON-NLS-0$
			name: "with", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - with statement", //$NON-NLS-0$
			template: "with (${object}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - function declaration",  //$NON-NLS-0$
			template: "/**\n"+  //$NON-NLS-0$
					  " * @name ${name}\n"+  //$NON-NLS-0$
					  " * @param ${parameter}\n"+  //$NON-NLS-0$
					  " */\n"+  //$NON-NLS-0$
					  "function ${name} (${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			nodes: {top:false, member:false, prop:false, obj:true},
			description: " - member function expression",  //$NON-NLS-0$
			template: "/**\n"+  //$NON-NLS-0$
					  " * @name ${name}\n"+  //$NON-NLS-0$
					  " * @function\n"+  //$NON-NLS-0$
					  " * @param ${parameter}\n"+  //$NON-NLS-0$
					  " */\n"+  //$NON-NLS-0$
					  "${name}: function(${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
			nodes: {top:false, member:false, prop:true, obj:false},
			description: " - member function expression",  //$NON-NLS-0$
			template: "function(${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "define", //$NON-NLS-0$
			name: "define", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - define function call",  //$NON-NLS-0$
			template: "/* global define */\n"+
					  "define('${name}',[\n"+  //$NON-NLS-0$
					  "'${import}'\n"+  //$NON-NLS-0$
					  "], function(${importname}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+  //$NON-NLS-0$
					  "});" //$NON-NLS-0$
		},
		{
			prefix: "nls", //$NON-NLS-0$
			name: "nls", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - non NLS string", //$NON-NLS-0$
			template: "${cursor} //$NON-NLS-${0}$" //$NON-NLS-0$
		},
		{
			prefix: "log", //$NON-NLS-0$
			name: "log", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - console log", //$NON-NLS-0$
			template: "console.log(${object});" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for MongoDB", //$NON-NLS-0$
			template: "var ${name} = require('mongodb');\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb client", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MongoDB client", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "var Server = require('mongodb').Server;\n${cursor}"
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb open", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MongoDB client and open a connection", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "var Server = require('mongodb').Server;\n"+  //$NON-NLS-0$
					  "var ${client} = new MongoClient(new Server(${host}, ${port}));\n"+ //$NON-NLS-0$
					  "try {\n" + //$NON-NLS-0$
					  "\t${client}.open(function(error, ${client}) {\n" + //$NON-NLS-0$
  					  "\t\tvar ${db} = ${client}.db(${name});\n" + //$NON-NLS-0$
  					  "\t\t${cursor}\n" + //$NON-NLS-0$
  					  "\t});\n" +  //$NON-NLS-0$
  					  "} finally {\n" + //$NON-NLS-0$
  					  "\t${client}.close();\n" + //$NON-NLS-0$
  					  "};" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb connect", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - connect to an existing MongoDB database", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "MongoClient.connect(${url}, function(error, db) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+ //$NON-NLS-0$
  					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb connect (Cloud Foundry)", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - connect to an existing MongoDB database using Cloud Foundry", //$NON-NLS-0$
			template: "if (${process}.env.VCAP_SERVICES) {\n" +  //$NON-NLS-0$
   					  "\tvar env = JSON.parse(${process}.env.VCAP_SERVICES);\n" +  //$NON-NLS-0$
   					  "\tvar mongo = env[\'${mongo-version}\'][0].credentials;\n" +  //$NON-NLS-0$
					  "} else {\n" +  //$NON-NLS-0$
					  "\tvar mongo = {\n" +  //$NON-NLS-0$
					  "\t\tusername : \'username\',\n" +  //$NON-NLS-0$
					  "\t\tpassword : \'password\',\n" +  //$NON-NLS-0$
					  "\t\turl : \'mongodb://username:password@localhost:27017/database\'\n" +  //$NON-NLS-0$
					  "\t};\n}\n" +  //$NON-NLS-0$
					  "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "MongoClient.connect(mongo.url, function(error, db) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+ //$NON-NLS-0$
  					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb collection", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a MongoDB database collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
				  "});"  //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb strict collection", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a MongoDB database strict collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, {strict:true}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for Redis", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis client", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Redis client", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" + //$NON-NLS-0$
					  "var ${client} = ${name}.createClient(${port}, ${host}, ${options});\n"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis connect", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Redis client and connect", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" + //$NON-NLS-0$
					  "var ${client} = ${name}.createClient(${port}, ${host}, ${options});\n" +  //$NON-NLS-0$
				  "try {\n" +  //$NON-NLS-0$
					  "\t${cursor}\n"+  //$NON-NLS-0$
					  "} finally {\n"+  //$NON-NLS-0$
					  "\t${client}.close();\n"+  //$NON-NLS-0$
				  "}\n"
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis set", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Redis client set call", //$NON-NLS-0$
			template: "client.set(${key}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis get", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Redis client get call", //$NON-NLS-0$
			template: "client.get(${key}, function(${error}, ${reply}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis on", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Redis client event handler", //$NON-NLS-0$
			template: "client.on(${event}, function(${arg}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "postgres", //$NON-NLS-0$
			name: "postgres", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for Postgres DB", //$NON-NLS-0$
			template: "var pg = require('pg');\n" //$NON-NLS-0$
		},
		{
			prefix: "postgres", //$NON-NLS-0$
			name: "postgres client", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Postgres DB client", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n"  //$NON-NLS-0$
		},
		{
			prefix: "postgres", //$NON-NLS-0$
			name: "postgres connect", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Postgres DB client and connect", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n" + //$NON-NLS-0$
					  "${client}.connect(function(error) {\n" +  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "postgres", //$NON-NLS-0$
			name: "postgres query", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Postgres DB query statement", //$NON-NLS-0$
			template: "${client}.query(${sql}, function(error, result) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for MySQL DB", //$NON-NLS-0$
			template: "var mysql = require('mysql');\n" //$NON-NLS-0$
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql connection", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MySQL DB connection", //$NON-NLS-0$
			template: "var mysql = require('mysql');\n" + //$NON-NLS-0$
					  "var ${connection} = mysql.createConnection({\n" +  //$NON-NLS-0$
  					  "\thost : ${host},\n" +  //$NON-NLS-0$
  					  "\tuser : ${username},\n" +  //$NON-NLS-0$
  					  "\tpassword : ${password}\n" +  //$NON-NLS-0$
					  "});\n" + //$NON-NLS-0$
					  "try {\n" +  //$NON-NLS-0$
					  "\t${connection}.connect();\n" +  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "} finally {\n" +  //$NON-NLS-0$
					  "\t${connection}.end();\n" +  //$NON-NLS-0$
					  "}"
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql query", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new MySQL DB query statement", //$NON-NLS-0$
			template: "${connection}.query(${sql}, function(error, rows, fields) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for Express", //$NON-NLS-0$
			template: "var ${name} = require('express');" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app", //$NON-NLS-0$
			description: " - create a new Express app", //$NON-NLS-0$
			template: "var express = require('express');\n" + //$NON-NLS-0$
					  "var ${app} = express();\n" +  //$NON-NLS-0$
					  "${cursor}\n"+  //$NON-NLS-0$
					  "app.listen(${timeout});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express configure", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create an Express app configure statement", //$NON-NLS-0$
			template: "app.configure(function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express specific configure", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a specific Express app configure statement", //$NON-NLS-0$
			template: "app.configure(${name}, function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app get", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app.get call", //$NON-NLS-0$
			template: "var value = app.get(${id}, function(request, result){\n" + //$NON-NLS-0$
					  "\t${cursor}\n});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app set", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app set call", //$NON-NLS-0$
			template: "app.set(${id}, ${value});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app use", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app use statement", //$NON-NLS-0$
			template: "app.use(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app engine", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app engine statement", //$NON-NLS-0$
			template: "app.engine(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
		    prefix: "express", //$NON-NLS-0$
			name: "express app param", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app param statement", //$NON-NLS-0$
			template: "app.param(${id}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app error use", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new Express app error handling use statement", //$NON-NLS-0$
			template: "app.use(function(error, request, result, next) {\n" +  //$NON-NLS-0$
  					  "\tresult.send(${code}, ${message});\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - Node.js require statement for AMQP framework", //$NON-NLS-0$
			template: "var amqp = require('amqp');\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp connection", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new AMQP connection ", //$NON-NLS-0$
			template: "var amqp = require('amqp');\n" + //$NON-NLS-0$
					  "var ${connection} = amqp.createConnection({\n" +  //$NON-NLS-0$ 
					  "\thost: ${host},\n" +  //$NON-NLS-0$
					  "\tport: ${port},\n" +  //$NON-NLS-0$
					  "\tlogin: ${login},\n" +  //$NON-NLS-0$
					  "\tpassword: ${password}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp on", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new AMQP connection on statement", //$NON-NLS-0$
			template: "${connection}.on(${event}, function() {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp queue", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new AMQP connection queue statement", //$NON-NLS-0$
			template: "${connection}.queue(${id}, function(queue) {\n" +  //$NON-NLS-0$
					  "\tqueue.bind(\'#\'); //catch all messages\n" + //$NON-NLS-0$
					  "\tqueue.subscribe(function (message, headers, deliveryInfo) {\n" + //$NON-NLS-0$
					  "\t\t// Receive messages\n" + //$NON-NLS-0$
					  "\t});\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp exchange", //$NON-NLS-0$
			nodes: {top:true, member:false, prop:false},
			description: " - create a new AMQP connection exchange", //$NON-NLS-0$
			template: "var exchange = ${connection}.exchange(${id}, {type: \'topic\'}, function(exchange) {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
	];

	/**
	 * @description Returns the corresponding {orion.editor.Template} object for the given metadata
	 * @private
	 * @param {Object} meta The metadata about the template
	 * @returns {orion.editor.Template} The corresponding template object
	 * @since 6.0
	 */
	function _getTemplate(meta) {
		if(meta.t) {
			return meta.t;
		}
		var t = new mTemplates.Template(meta.prefix, meta.description, meta.template, meta.name);
		meta.t = t;
		return t;
	}

	/**
	 * @description Returns the templates that apply to the given completion kind
	 * @public
	 * @param {String} kind The kind of the completion
	 * @returns {Array} The array of templates that apply to the given completion kind
	 * @since 6.0
	 */
	function getTemplatesForKind(kind) {
		var tmplates = [];
		var len = templates.length;
		for(var i = 0; i < len; i++) {
			var template = templates[i];
			if(template.nodes && template.nodes[kind]) {
				tmplates.push(template);
			}
		}
		return tmplates.map(_getTemplate, this);
	}
	
	return {
		getTemplatesForKind: getTemplatesForKind
	};
});
