/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2014 IBM Corporation and others.
 * Copyright (c) 2012 VMware, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License v1.0
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html).
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *     Andrew Eisenberg - rename to jsTemplateContentAssist.js
 *******************************************************************************/
/*global define */

define("orion/editor/jsTemplateContentAssist", [ //$NON-NLS-0$
	'orion/editor/templates', //$NON-NLS-0$
	'orion/editor/stylers/application_javascript/syntax' //$NON-NLS-0$
], function(mTemplates, mJS) {

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

	var uninterestingChars = ":!@#$^&*.?<>"; //$NON-NLS-0$

	var templates = [
		{
			prefix: "if", //$NON-NLS-0$
			name: "if",  //$NON-NLS-0$
			description: " - if statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "if", //$NON-NLS-0$
			name: "if", //$NON-NLS-0$
			description: " - if else statement", //$NON-NLS-0$
			template: "if (${condition}) {\n\t${cursor}\n} else {\n\t\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for", //$NON-NLS-0$
			description: " - iterate over array with local var", //$NON-NLS-0$
			template: "for (var ${i}=0; ${i}<${array}.length; ${i}++) {\n\tvar ${value} = ${array}[${i}];\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "for", //$NON-NLS-0$
			name: "for..in", //$NON-NLS-0$
			description: " - iterate over properties of an object", //$NON-NLS-0$
			template: "for (var ${property} in ${object}) {\n\tif (${object}.hasOwnProperty(${property})) {\n\t\t${cursor}\n\t}\n}" //$NON-NLS-0$
		},
		{
			prefix: "while", //$NON-NLS-0$
			name: "while", //$NON-NLS-0$
			description: " - while loop with condition", //$NON-NLS-0$
			template: "while (${condition}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "do", //$NON-NLS-0$
			name: "do", //$NON-NLS-0$
			description: " - do while loop with condition", //$NON-NLS-0$
			template: "do {\n\t${cursor}\n} while (${condition});" //$NON-NLS-0$
		},
		{
			prefix: "switch", //$NON-NLS-0$
			name: "switch", //$NON-NLS-0$
			description: " - switch case statement", //$NON-NLS-0$
			template: "switch (${expression}) {\n\tcase ${value1}:\n\t\t${cursor}\n\t\tbreak;\n\tdefault:\n}" //$NON-NLS-0$
		},
		{
			prefix: "case", //$NON-NLS-0$
			name: "case", //$NON-NLS-0$
			description: " - case statement", //$NON-NLS-0$
			template: "case ${value}:\n\t${cursor}\n\tbreak;" //$NON-NLS-0$
		},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n}" //$NON-NLS-0$
			},
		{
			prefix: "try", //$NON-NLS-0$
			name: "try", //$NON-NLS-0$
			description: " - try..catch statement with finally block", //$NON-NLS-0$
			template: "try {\n\t${cursor}\n} catch (${err}) {\n} finally {\n}" //$NON-NLS-0$
		},
		{
			prefix: "typeof", //$NON-NLS-0$
			name: "typeof", //$NON-NLS-0$
			description: " - typeof statement", //$NON-NLS-0$
			template: "typeof ${object} === \"${type:" + JSON.stringify(typeofValues).replace("}", "\\}") + "}\"" //$NON-NLS-1$ //$NON-NLS-0$
		},
		{
			prefix: "instanceof", //$NON-NLS-0$
			name: "instanceof", //$NON-NLS-0$
			description: " - instanceof statement", //$NON-NLS-0$
			template: "${object} instanceof ${type}" //$NON-NLS-0$
		},
		{
			prefix: "with", //$NON-NLS-0$
			name: "with", //$NON-NLS-0$
			description: " - with statement", //$NON-NLS-0$
			template: "with (${object}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "function", //$NON-NLS-0$
			name: "function", //$NON-NLS-0$
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
			description: " - function expression",  //$NON-NLS-0$
			template: "/**\n"+  //$NON-NLS-0$
					  " * @name ${name}\n"+  //$NON-NLS-0$
					  " * @function\n"+  //$NON-NLS-0$
					  " * @param ${parameter}\n"+  //$NON-NLS-0$
					  " */\n"+  //$NON-NLS-0$
					  "${name}: function(${parameter}) {\n\t${cursor}\n}" //$NON-NLS-0$
		},
		{
			prefix: "define", //$NON-NLS-0$
			name: "define", //$NON-NLS-0$
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
			description: " - non NLS string", //$NON-NLS-0$
			template: "${cursor} //$NON-NLS-${0}$" //$NON-NLS-0$
		},
		{
			prefix: "log", //$NON-NLS-0$
			name: "log", //$NON-NLS-0$
			description: " - console log", //$NON-NLS-0$
			template: "console.log(${object});" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb", //$NON-NLS-0$
			description: " - Node.js require statement for MongoDB", //$NON-NLS-0$
			template: "var ${name} = require('mongodb');\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb client", //$NON-NLS-0$
			description: " - create a new MongoDB client", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "var Server = require('mongodb').Server;\n${cursor}"
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb open", //$NON-NLS-0$
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
			description: " - connect to an existing MongoDB database", //$NON-NLS-0$
			template: "var MongoClient = require('mongodb').MongoClient;\n" +//$NON-NLS-0$
					  "MongoClient.connect(${url}, function(error, db) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n"+ //$NON-NLS-0$
  					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb connect (Cloud Foundry)", //$NON-NLS-0$
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
			description: " - create a MongoDB database collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "mongodb", //$NON-NLS-0$
			name: "mongodb strict collection", //$NON-NLS-0$
			description: " - create a MongoDB database strict collection", //$NON-NLS-0$
			template: "${db}.collection(${id}, {strict:true}, function(${error}, collection) {\n"+//$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis", //$NON-NLS-0$
			description: " - Node.js require statement for Redis", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis client", //$NON-NLS-0$
			description: " - create a new Redis client", //$NON-NLS-0$
			template: "var ${name} = require('redis');\n" + //$NON-NLS-0$
					  "var ${client} = ${name}.createClient(${port}, ${host}, ${options});\n"  //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis connect", //$NON-NLS-0$
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
			description: " - create a new Redis client set call", //$NON-NLS-0$
			template: "client.set(${key}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis get", //$NON-NLS-0$
			description: " - create a new Redis client get call", //$NON-NLS-0$
			template: "client.get(${key}, function(${error}, ${reply}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "redis", //$NON-NLS-0$
			name: "redis on", //$NON-NLS-0$
			description: " - create a new Redis client event handler", //$NON-NLS-0$
			template: "client.on(${event}, function(${arg}) {\n"+  //$NON-NLS-0$
					  "\t${cursor}" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres", //$NON-NLS-0$
			description: " - Node.js require statement for Postgres DB", //$NON-NLS-0$
			template: "var pg = require('pg');\n" //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres client", //$NON-NLS-0$
			description: " - create a new Postgres DB client", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n"  //$NON-NLS-0$
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres connect", //$NON-NLS-0$
			description: " - create a new Postgres DB client and connect", //$NON-NLS-0$
			template: "var pg = require('pg');\n" + //$NON-NLS-0$
					  "var url = \"postgres://postgres:${port}@${host}/${database}\";\n" +  //$NON-NLS-0$
					  "var ${client} = new pg.Client(url);\n" + //$NON-NLS-0$
					  "${client}.connect(function(error) {\n" +  //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "pg", //$NON-NLS-0$
			name: "postgres query", //$NON-NLS-0$
			description: " - create a new Postgres DB query statement", //$NON-NLS-0$
			template: "${client}.query(${sql}, function(error, result) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql", //$NON-NLS-0$
			description: " - Node.js require statement for MySQL DB", //$NON-NLS-0$
			template: "var mysql = require('mysql');\n" //$NON-NLS-0$
		},
		{
			prefix: "mysql", //$NON-NLS-0$
			name: "mysql connection", //$NON-NLS-0$
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
			description: " - create a new MySQL DB query statement", //$NON-NLS-0$
			template: "${connection}.query(${sql}, function(error, rows, fields) {\n" + //$NON-NLS-0$
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express", //$NON-NLS-0$
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
			description: " - create an Express app configure statement", //$NON-NLS-0$
			template: "app.configure(function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express specific configure", //$NON-NLS-0$
			description: " - create a specific Express app configure statement", //$NON-NLS-0$
			template: "app.configure(${name}, function() {\n" +  //$NON-NLS-0$
  					  "\tapp.set(${id}, ${value});\n" +  //$NON-NLS-0$
					  "});"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app get", //$NON-NLS-0$
			description: " - create a new Express app.get call", //$NON-NLS-0$
			template: "var value = app.get(${id}, function(request, result){\n" + //$NON-NLS-0$
					  "\t${cursor}\n});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app set", //$NON-NLS-0$
			description: " - create a new Express app set call", //$NON-NLS-0$
			template: "app.set(${id}, ${value});\n"  //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app use", //$NON-NLS-0$
			description: " - create a new Express app use statement", //$NON-NLS-0$
			template: "app.use(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app engine", //$NON-NLS-0$
			description: " - create a new Express app engine statement", //$NON-NLS-0$
			template: "app.engine(${fnOrObject});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app param", //$NON-NLS-0$
			description: " - create a new Express app param statement", //$NON-NLS-0$
			template: "app.param(${id}, ${value});\n" //$NON-NLS-0$
		},
		{
			prefix: "express", //$NON-NLS-0$
			name: "express app error use", //$NON-NLS-0$
			description: " - create a new Express app error handling use statement", //$NON-NLS-0$
			template: "app.use(function(error, request, result, next) {\n" +  //$NON-NLS-0$
  					  "\tresult.send(${code}, ${message});\n" +  //$NON-NLS-0$
					  "});\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp", //$NON-NLS-0$
			description: " - Node.js require statement for AMQP framework", //$NON-NLS-0$
			template: "var amqp = require('amqp');\n" //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp connection", //$NON-NLS-0$
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
			description: " - create a new AMQP connection on statement", //$NON-NLS-0$
			template: "${connection}.on(${event}, function() {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
		{
			prefix: "amqp", //$NON-NLS-0$
			name: "amqp queue", //$NON-NLS-0$
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
			description: " - create a new AMQP connection exchange", //$NON-NLS-0$
			template: "var exchange = ${connection}.exchange(${id}, {type: \'topic\'}, function(exchange) {\n" +  //$NON-NLS-0$ 
					  "\t${cursor}\n" +  //$NON-NLS-0$
					  "});\n"  //$NON-NLS-0$
		},
	];

	/**
	 * @name orion.editor.JSTemplateContentAssistProvider
	 * @class Provides content assist for JavaScript keywords.
	 */
	function JSTemplateContentAssistProvider() {
	}
	JSTemplateContentAssistProvider.prototype = new mTemplates.TemplateContentAssist(mJS.keywords, templates);

	/**
	 * @description Determines if the invocation location is a valid place to use
	 * templates.  We are not being too precise here.  As an approximation,
	 * just look at the previous character.
	 * @function
	 * @public
	 * @param {String} prefix The prefix of the proposal, if any
	 * @param {String} buffer The entire buffer from the editor
	 * @param {Number} offset The offset into the buffer
	 * @param {Object} context The completion context object from the editor
	 * @return {Boolean} true if the current invocation location is
	 * a valid place for template proposals to appear.
	 * This means that the invocation location is at the start of a new statement.
	 */
	JSTemplateContentAssistProvider.prototype.isValid = function(prefix, buffer, offset, context) {
		var char = buffer.charAt(offset-prefix.length-1);
		return !char || uninterestingChars.indexOf(char) === -1;
	};

	return {
		JSTemplateContentAssistProvider: JSTemplateContentAssistProvider
	};
});
