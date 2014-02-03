/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global define*/

define("orion/editor/stylers/text_html/syntax", ["orion/editor/stylers/shared/syntax", "orion/editor/stylers/application_javascript/syntax", "orion/editor/stylers/text_css/syntax", "orion/editor/stylers/text_x-php/syntax"], //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
	function(mShared, mJS, mCSS, mPHP) {
	
	var grammars = mShared.grammars.concat(mJS.grammars).concat(mCSS.grammars).concat(mPHP.grammars);
	grammars.push({
		id: "orion.html",
		contentTypes: ["text/html"],
		patterns: [
			{
				begin: "(<!(?:doctype|DOCTYPE))",
				end: "(>)",
				captures: {
					1: {name: "entity.name.tag.doctype.html"},
				},
				name: "meta.tag.doctype.html",
			}, {
				begin: "(?i)(<style)([^>]*)(>)",
				end: "(?i)(</style>)",
				captures: {
					1: {name: "entity.name.tag.html"},
					3: {name: "entity.name.tag.html"}
				},
				contentName: "source.css.embedded.html",
				patterns: [
					{
						include: "orion.css"
					}
				]
			}, {
				begin: "(?i)(<script(?:\\s+language\\s*=\\s*(?:'javascript'|\"javascript\"))?\\s*>)",
				end: "(?i)(</script>)",
				captures: {
					1: {name: "entity.name.tag.html"}
				},
				contentName: "source.js.embedded.html",
				patterns: [
					{
						include: "orion.js"
					}
				]
			}, {
				begin: "(?i)(<script(?:\\s+language\\s*=\\s*(?:'php'|\"php\"))?\\s*>)",
				end: "(?i)(</script>)",
				captures: {
					1: {name: "entity.name.tag.html"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}, {
				begin: "(?i)(<\\?(?:=|php)?(?:\\s|$))",
				end: "(\\?>)",
				captures: {
					1: {name: "entity.name.tag.html"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}, {
				begin: "(<%=?(?:\\s|$))",
				end: "(%>)",
				captures: {
					1: {name: "entity.name.tag.html"}
				},
				contentName: "source.php.embedded.html",
				patterns: [
					{
						include: "orion.php"
					}
				]
			}, {
				id: "comment",
				begin: "<!--",
				end: "-->",
				name: "comment.block.html",
				patterns: [
					{
						match: "(\\b)(TODO)(\\b)(.*)",
						name: "meta.annotation.task.todo",
						captures: {
							2: {name: "keyword.other.documentation.task"},
							4: {name: "comment.line"}
						}
					}
				]
			}, {
				begin: "(</?[A-Za-z0-9]+)",
				end: "(/?>)",
				captures: {
					1: {name: "entity.name.tag.html"},
				},
				name: "meta.tag.html",
				patterns: [
					{
						include: "#comment"
					}, {
						include: "orion.patterns#string"
					}, {
						include: "orion.patterns#string_singleQuote"
					}
				]
			}
		]
	});
	return {
		id: grammars[grammars.length - 1].id,
		grammars: grammars,
		keywords: []
	};
});
