/*******************************************************************************
 * @license
 * Copyright (c) 2013, 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global esprima*/
/*jslint amd:true*/
define([
	'javascript/astManager',
	'javascript/contentAssist/indexFiles/mongodbIndex',
	'javascript/contentAssist/indexFiles/mysqlIndex',
	'javascript/contentAssist/indexFiles/postgresIndex',
	'javascript/contentAssist/indexFiles/redisIndex',
	'javascript/contentAssist/indexFiles/expressIndex',
	'javascript/contentAssist/indexFiles/amqpIndex',
	'javascript/contentAssist/contentAssist',
	'javascript/contentAssist/indexer',
	'javascript/eslint/validator',
	'javascript/occurrences',
	'javascript/outliner',
	'orion/i18nUtil',
	'orion/plugin',
	'orion/editor/jsTemplateContentAssist',
	'orion/editor/stylers/application_javascript/syntax',
	'orion/editor/stylers/application_json/syntax',
	'orion/editor/stylers/application_schema_json/syntax',
	'orion/editor/stylers/application_x-ejs/syntax'
], function(ASTManager, MongodbIndex, MysqlIndex, PostgresIndex, RedisIndex, ExpressIndex, AMQPIndex, ContentAssist, Indexer, EslintValidator, Occurrences, Outliner,
		i18nUtil, PluginProvider, jsTemplateContentAssist, mJS, mJSON, mJSONSchema, mEJS) {

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion JavaScript Tool Support",
		version: "1.0",
		description: "This plugin provides JavaScript tools support for Orion, like editing, search, navigation, validation, and code completion."
	};
	var provider = new PluginProvider(headers);
	
	/**
	 * Register the JavaScript content types
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, {
		contentTypes: [
			{	id: "application/javascript",
				"extends": "text/plain",
				name: "JavaScript",
				extension: ["js"],
				imageClass: "file-sprite-javascript modelDecorationSprite"
			}, {id: "application/json",
				"extends": "text/plain",
				name: "JSON",
				extension: ["json"],
				imageClass: "file-sprite-javascript modelDecorationSprite"
			}, {id: "application/x-ejs",
				"extends": "text/plain",
				name: "Embedded Javascript",
				extension: ["ejs"],
				imageClass: "file-sprite-javascript modelDecorationSprite"
			}
		]
	});

	/**
	 * Create the AST manager
	 */
	var astManager = new ASTManager.ASTManager();

	/**
	 * Register AST manager as Model Change listener
	 */
	provider.registerServiceProvider("orion.edit.model", {
			onModelChanging: astManager.updated.bind(astManager)
		},
		{
			contentType: ["application/javascript"],
			types: ["ModelChanging"]
	});

	/**
	 * Register the jsdoc-based outline
	 */
	provider.registerServiceProvider("orion.edit.outliner", new Outliner.JSOutliner(astManager),
		{ contentType: ["application/javascript"],
		  name: "Source Outline",
		  title: "JavaScript source outline",
		  id: "orion.javascript.outliner.source"
	});

	/**
	 * Register the mark occurrences support
	 */
	provider.registerService("orion.edit.occurrences", new Occurrences.JavaScriptOccurrences(astManager),
		{
			contentType: ["application/javascript"]	//$NON-NLS-0$
	});
	
	/**
	 * Register the content assist support
	 */
	provider.registerService("orion.edit.contentassist",
		new jsTemplateContentAssist.JSTemplateContentAssistProvider(),
		{	name: "JavaScript content assist",
			contentType: ["application/javascript"]
		});
	provider.registerServiceProvider("orion.edit.contentassist", new ContentAssist.JSContentAssist(astManager, new Indexer()), 
		{
			contentType: ["application/javascript"],
			name: "JavaScript content assist",
			id: "orion.edit.contentassist.javascript",
			charTriggers: "[.]",
			excludedStyles: "(comment.*|string.*)"
	});	

	/**
	 * Register the ESLint validator
	 */
	provider.registerServiceProvider(["orion.edit.validator", "orion.cm.managedservice"], new EslintValidator(astManager),
		{
			contentType: ["application/javascript"],
			pid: 'eslint.config'
		});

	/**
	 * ESLint settings
	 */
	provider.registerService("orion.core.setting",
		{},
		{	settings: [
				{	pid: "eslint.config",
					name: "ESLint Validator",
					tags: "validation javascript js eslint".split(" "),
					category: "validation",
					properties: [
						{	id: "validate_eqeqeq",
							name: "Discouraged '==' use",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_func_decl",
							name: "No JSDoc on function declarations",
							type: "number",
							defaultValue: 0,
							options: [
							    {label: "Ignore", value:0},
							    {label: "Warning", value:1},
							    {label: "Error", value:2}
							]
						},
						{	id: "validate_func_expr",
							name: "No JSDoc on function expressions",
							type: "number",
							defaultValue: 0,
							options: [
							    {label: "Ignore", value:0},
							    {label: "Warning", value:1},
							    {label: "Error", value:2}
							]
						},
						{	id: "validate_use_before_define",
							name: "Member used before definition",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_missing_semi",
							name: "Missing semicolons",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_no_undef",
							name: "Undefined member use",
							type: "number",
							defaultValue: 2,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_unnecessary_semi",
							name: "Unnecessary semicolons",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_no_unused_vars",
							name: "Unused variables",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						},
						{	id: "validate_no_redeclare",
							name: "Variable re-declarations",
							type: "number",
							defaultValue: 1,
							options: [
								{label: "Ignore", value:0},
								{label: "Warning", value:1},
								{label: "Error", value:2}
							]
						}
					]
				}
			]
		});

	/**
	 * Register syntax styling for js, json and json schema content
	 */
	var grammars = mJS.grammars.concat(mJSON.grammars).concat(mJSONSchema.grammars).concat(mEJS.grammars);
	grammars.forEach(function(current) {
		provider.registerServiceProvider("orion.edit.highlighter", {}, current);	
	}.bind(this));

	/**
	 * Register type definitions for known JS libraries
	 */
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.redis",
		type: "tern",
		defs: RedisIndex
	});
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.mysql",
		type: "tern",
		defs: MysqlIndex
	});
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.postgres",
		type: "tern",
		defs: PostgresIndex
	});
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.mongodb",
		type: "tern",
		defs: MongodbIndex
	});
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.express",
		type: "tern",
		defs: ExpressIndex
	});
	provider.registerServiceProvider("orion.core.typedef", {}, {
		id: "node.amqp",
		type: "tern",
		defs: AMQPIndex
	});

	provider.connect();
});
