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
 *******************************************************************************/
/*eslint-env browser,amd*/
define(['orion/plugin', 'orion/i18nUtil', 'i18n!orion/nls/messages'], function (PluginProvider, i18nUtil, messages) { //$NON-NLS-0$

	/**
	 * Plug-in headers
	 */
	var headers = {
		name: "Orion Extended Markdown Language Tool Support", //$NON-NLS-0$
		version: "1.0", //$NON-NLS-0$
		description: "This plugin provides extended Markdown language tools support for Orion." //$NON-NLS-0$
	};
	var provider = new PluginProvider(headers);

	/**
	 * Register the Markdown content type
	 */
	provider.registerServiceProvider("orion.core.contenttype", {}, { //$NON-NLS-0$
	contentTypes: [
		{
			id: "text/x-markdown", //$NON-NLS-0$
			name: "Markdown", //$NON-NLS-0$
			extension: ["md"], //$NON-NLS-0$
			"extends": "text/plain" //$NON-NLS-0$ //$NON-NLS-0$
		}
	]});

	var emptyLineRegex = /^[ ]{0,3}$/;

	provider.registerServiceProvider("orion.edit.contentAssist", { //$NON-NLS-0$
		computeProposals: function (buffer, offset, context) {
			var selection = context.selection.start !== context.selection.end ?
				buffer.substring(context.selection.start, context.selection.end) :
				null;
			var NL = context.delimiter;
			var multilineSelection = selection && selection.indexOf(NL) !== -1;
			var onEmptyLine = emptyLineRegex.test(context.line);
			var result = [];

			result.push({
				description: messages["emphasis"],
				escapePosition: selection ? null : offset + 1,
				proposal: "*" + (selection ? selection : "") + "*" //$NON-NLS-1$ //$NON-NLS-0$
			});

			result.push({
				description: messages["strong"],
				escapePosition: selection ? null : offset + 2,
				proposal: "**" + (selection ? selection : "") + "**" //$NON-NLS-1$ //$NON-NLS-0$
			});

			if (!multilineSelection) {
				var headerText = onEmptyLine && !selection ? messages["text"] : "";
				result.push({
					description: i18nUtil.formatMessage(messages["header (${0})"], "atx"), //$NON-NLS-0$
					positions: onEmptyLine ? [{offset: offset + 1, length: headerText.length}] : null,
					proposal: (onEmptyLine ? "" : NL) + "#" + headerText + (selection ? selection : "") //$NON-NLS-0$
				});
			}

			if (!multilineSelection) {
				result.push({
					description: messages["link (auto)"],
					escapePosition: selection ? null : offset + 1,
					proposal: "<" + (selection ? selection : "") + ">" //$NON-NLS-1$ //$NON-NLS-0$
				});
			}

			var inlineLinkText = selection || messages["text"];
			var inlineLinkUrl = messages["url"];
			var inlineLinkTitle = messages["title (optional)"];
			result.push({
				description: messages["link (inline)"],
				positions: [
					{offset: offset + 1, length: inlineLinkText.length},
					{offset: offset + 3 + inlineLinkText.length, length: inlineLinkUrl.length},
					{offset: offset + 5 + inlineLinkText.length + inlineLinkUrl.length, length: inlineLinkTitle.length}],
				proposal: "[" + inlineLinkText + "](" + inlineLinkUrl + " \"" + inlineLinkTitle + "\")" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});

			var imageLinkText = selection || messages["alt text"];
			var imageLinkUrl = messages["url"];
			var imageLinkTitle = messages["title (optional)"];
			result.push({
				description: messages["link (image)"],
				positions: [
					{offset: offset + 2, length: imageLinkText.length},
					{offset: offset + 4 + imageLinkText.length, length: imageLinkUrl.length},
					{offset: offset + 6 + imageLinkText.length + imageLinkUrl.length, length: imageLinkTitle.length}],
				proposal: "![" + imageLinkText + "](" + imageLinkUrl + " \"" + imageLinkTitle + "\")" //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});

			var refLinkText = selection || messages["text"];
			var refLinkLabel = messages["link label (optional)"];
			result.push({
				description: messages["link (ref)"],
				positions: [
					{offset: offset + 1, length: refLinkText.length},
					{offset: offset + 3 + refLinkText.length, length: refLinkLabel.length}],
				proposal: "[" + refLinkText + "][" + refLinkLabel + "]" //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});

			if (!multilineSelection) {
				var linkLabelText = selection || messages["label"];
				var linkLabelUrl = messages["url"];
				var linkLabelTitle = messages["title (optional)"];
				var linkLabelNL = onEmptyLine ? "" : NL;
				result.push({
					description: messages["link label"],
					positions: [
						{offset: offset + linkLabelNL.length + 1, length: linkLabelText.length},
						{offset: offset + linkLabelNL.length + 4 + linkLabelText.length, length: linkLabelUrl.length},
						{offset: offset + linkLabelNL.length + 5 + linkLabelText.length + linkLabelUrl.length, length: linkLabelTitle.length}],
					proposal: linkLabelNL + "[" + linkLabelText + "]: " + linkLabelUrl + " " + linkLabelTitle + NL //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				});
			}

			if (!multilineSelection) {
				var codeBlockText = onEmptyLine && !selection ? messages["code"] : "";
				var indent = onEmptyLine ? "    ".substring(0, 4 - context.indentation.length) : NL + NL + "    "; //$NON-NLS-1$ //$NON-NLS-0$
				result.push({
					description: messages["code (block)"],
					positions: codeBlockText ? [{offset: offset + indent.length, length: codeBlockText.length}] : null,
					proposal: indent + codeBlockText + (selection ? selection : "")
				});
			}

			result.push({
				description: messages["code (span)"],
				escapePosition: selection ? null : offset + 1,
				proposal: "`" + (selection ? selection : "") + "`" //$NON-NLS-1$ //$NON-NLS-0$
			});

			result.push({
				description: messages["horizontal rule"],
				proposal: (onEmptyLine ? "" : NL) + "- - -" + NL + (selection ? selection : "") //$NON-NLS-0$
			});

			if (!multilineSelection) {
				var blockquoteText = onEmptyLine && !selection ? messages["text"] : "";
				result.push({
					description: messages["blockquote"],
					positions: onEmptyLine ? [{offset: offset + 2, length: blockquoteText.length}] : null,
					proposal: (onEmptyLine ? "" : NL) + "> " + blockquoteText + (selection ? selection : "") //$NON-NLS-0$
				});
			}

			var listItemText = onEmptyLine && !selection ? messages["text"] : "";
			result.push({
				description: messages["list item (numbered)"],
				positions: onEmptyLine ? [{offset: offset + 3, length: listItemText.length}] : null,
				proposal: (onEmptyLine ? "" : NL) + "1. " + listItemText + (selection ? selection : "") //$NON-NLS-0$
			});

			result.push({
				description: messages["list item (bullet)"],
				positions: onEmptyLine ? [{offset: offset + 2, length: listItemText.length}] : null,
				proposal: (onEmptyLine ? "" : NL) + "* " + listItemText + (selection ? selection : "") //$NON-NLS-0$
			});

			result.push({ /* gfm items separator */
				style: "hr" //$NON-NLS-0$
			});

			result.push({
				description: i18nUtil.formatMessage(messages["strikethrough (${0})"], "gfm"), //$NON-NLS-0$
				escapePosition: selection ? null : offset + 2,
				proposal: "~~" + (selection ? selection : "") + "~~" //$NON-NLS-1$ //$NON-NLS-0$
			});

			var tableNL = onEmptyLine ? "" : NL;
			result.push({
				description: i18nUtil.formatMessage(messages["table (${0})"], "gfm"), //$NON-NLS-0$
				positions: [
					{offset: offset + tableNL.length, length: 5},
					{offset: offset + tableNL.length + 7, length: 9},
					{offset: offset + tableNL.length + 16 + NL.length, length: 6},
					{offset: offset + tableNL.length + 23 + NL.length, length: 9},
					{offset: offset + tableNL.length + 32 + 2 * NL.length, length: 4},
					{offset: offset + tableNL.length + 39 + 2 * NL.length, length: 4}],
				proposal: tableNL + "hLeft |hCentered" + NL + ":-----|:-------:" + NL + "item  |item     " + NL + (selection ? selection : "") //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
			});

			result.push({
				description: i18nUtil.formatMessage(messages["fenced code (${0})"], "gfm"), //$NON-NLS-0$
				escapePosition: selection ? null : offset + 3,
				proposal: "```" + (selection ? selection : "") + "```" //$NON-NLS-1$ //$NON-NLS-0$
			});

			return result;
		}
	}, {
		name: "Markdown content assist", //$NON-NLS-0$
		contentType: ["text/x-markdown"] //$NON-NLS-0$
	});

//	provider.registerService("orion.edit.command", { //$NON-NLS-0$
//		execute : function(editorContext, context) {
//			editorContext.invokeAction("insertLinePrefix", false, {linePrefix: ">"}); //$NON-NLS-1$ //$NON-NLS-0$
//			return null;
//		}
//	}, {
//		id: "orion.editor.markdown.insertBlockquote", //$NON-NLS-0$
//		name: "Insert blockquote", //$NON-NLS-0$
//		key: ["i", true], //$NON-NLS-0$
//		tooltip: "Insert blockquote tooltip",
//		contentType: ["text/x-markdown"] //$NON-NLS-0$
//	});
//
//	provider.registerService("orion.edit.command", { //$NON-NLS-0$
//		execute : function(editorContext, context) {
//			editorContext.invokeAction("removeLinePrefix", false, {linePrefix: ">"}); //$NON-NLS-1$ //$NON-NLS-0$
//			return null;
//		}
//	}, {
//		id: "orion.editor.markdown.removeBlockquote", //$NON-NLS-0$
//		name: "Remove blockquote", //$NON-NLS-0$
//		key: [">", true], //$NON-NLS-0$
//		tooltip: "Remove blockquote tooltip",
//		contentType: ["text/x-markdown"] //$NON-NLS-0$
//	});

	provider.connect();
});
