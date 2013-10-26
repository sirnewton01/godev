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

/*global define*/
define(['examples/editor/textStyler', 'orion/editor/textMateStyler', 'orion/editor/AsyncStyler', 'orion/Deferred'], 
		function(mTextStyler, mTextMateStyler, AsyncStyler, Deferred) {
	/**
	 * Returns a promise that will provide a styler for the given content type.
	 * @static
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {orion.core.ContentTypeRegistry} contentTypeService
	 * @param {orion.core.ContentType} contentType
	 * @param {orion.editor.TextView} textView
	 * @param {orion.editor.AnnotationModel} annotationModel
	 * @param {String} [fileName] Deprecated.
	 * @param {Boolean} [allowAsync=true]
	 * @returns {orion.Deferred}
	 */
	function createStyler(serviceRegistry, contentTypeService, contentType, textView, annotationModel, fileName, allowAsync) {
		// Returns a promise (if provider matches) or null (if it doesn't match).
		function getPromise(provider, extension) {
			var contentTypeIds = provider.getProperty("contentType"), //$NON-NLS-0$
			    fileTypes = provider.getProperty("fileTypes"); // backwards compatibility //$NON-NLS-0$
			if (contentTypeIds) {
				return contentTypeService.isSomeExtensionOf(contentType, contentTypeIds).then(
					function (isMatch) {
						return isMatch ? provider : null;
					});
			} else if (extension && fileTypes && fileTypes.indexOf(extension) !== -1) {
				var d = new Deferred();
				d.resolve(provider);
				return d;
			}
			return null;
		}
		function isAllowed(provider) {
			return allowAsync || provider.getProperty("type") !== "highlighter"; //$NON-NLS-1$ //$NON-NLS-0$
		}
		function createDefaultStyler(contentType) {
			var styler = null;
			switch (contentType && contentType.id) {
				case "application/javascript": //$NON-NLS-0$
				case "application/json": //$NON-NLS-0$
					styler = new mTextStyler.TextStyler(textView, "js", annotationModel); //$NON-NLS-0$
					break;
				case "text/x-java-source": //$NON-NLS-0$
					styler = new mTextStyler.TextStyler(textView, "java", annotationModel); //$NON-NLS-0$
					break;
				case "text/css": //$NON-NLS-0$
					styler = new mTextStyler.TextStyler(textView, "css", annotationModel); //$NON-NLS-0$
					break;
			}
			return styler;
		}
		// Check default styler
		var styler = createDefaultStyler(contentType);
		if (styler) {
			var result = new Deferred();
			result.resolve(styler);
			return result;
		}

		// Check services
		var extension = fileName && fileName.split(".").pop().toLowerCase(); //$NON-NLS-0$
		var serviceRefs = serviceRegistry.getServiceReferences("orion.edit.highlighter"); //$NON-NLS-0$
		var grammars = [], promises = [];
		for (var i=0; i < serviceRefs.length; i++) {
			var serviceRef = serviceRefs[i];
			if (serviceRef.getProperty("type") === "grammar") { //$NON-NLS-1$ //$NON-NLS-0$
				grammars.push(serviceRef.getProperty("grammar")); //$NON-NLS-0$
			}
			var promise = getPromise(serviceRef, extension);
			if (promise) {
				promises.push(promise);
			}
		}
		return Deferred.all(promises, function(error) {return {_error: error};}).then(function(promises) {
			// Take the last matching provider. Could consider ranking them here.
			var provider;
			for (var i = promises.length - 1; i >= 0; i--) {
				var promise = promises[i];
				if (promise && !promise._error && isAllowed(promise)) {
					provider = promise;
					break;
				}
			}
			var styler;
			if (provider) {
				var type = provider.getProperty("type"); //$NON-NLS-0$
				if (type === "highlighter") { //$NON-NLS-0$
					styler = new AsyncStyler(textView, serviceRegistry, annotationModel);
					styler.setContentType(contentType);
				} else if (type === "grammar" || typeof type === "undefined") { //$NON-NLS-1$ //$NON-NLS-0$
					var grammar = provider.getProperty("grammar"); //$NON-NLS-0$
					styler = new mTextMateStyler.TextMateStyler(textView, grammar, grammars);
				}
			}
			return styler;
		});
	}
	/**
	 * @name orion.highlight.SyntaxHighlighter
	 * @class
	 * @description 
	 * <p>Requires service {@link orion.core.ContentTypeRegistry}</p>
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry Registry to look up highlight providers from.
	 */
	function SyntaxHighlighter(serviceRegistry) {
		this.serviceRegistry = serviceRegistry;
		this.styler = null;
	}
	SyntaxHighlighter.prototype = /** @lends orion.highlight.SyntaxHighlighter.prototype */ {
		/**
		 * @param {orion.core.ContentType} contentType
		 * @param {orion.editor.TextView} textView
		 * @param {orion.editor.AnnotationModel} annotationModel
		 * @param {String} [fileName] <i>Deprecated.</i> For backwards compatibility only, service-contributed highlighters
		 * will be checked against the file extension instead of contentType.
		 * @param {Boolean} [allowAsync=true] If true, plugin-contributed asynchronous highlighters (i.e. <code>type == "highlighter"</code>
		 * will be consulted. If false, only rule-based highlighters will be consulted.
		 * @returns {orion.Deferred} A promise that is resolved when this highlighter has been set up.
		 */
		setup: function(fileContentType, textView, annotationModel, fileName, allowAsync) {
			allowAsync = typeof allowAsync === "undefined" ? true : allowAsync; //$NON-NLS-0$
			if (this.styler) {
				if (this.styler.destroy) {
					this.styler.destroy();
				}
				this.styler = null;
			}
			var self = this;
			return createStyler(this.serviceRegistry, this.serviceRegistry.getService("orion.core.contentTypeRegistry"), //$NON-NLS-0$
				fileContentType, textView, annotationModel, fileName, allowAsync).then(
					function(styler) {
						self.styler = styler;
						return styler;
					});
		},
		getStyler: function() {
			return this.styler;
		}
	};
	return {
		createStyler: createStyler,
		SyntaxHighlighter: SyntaxHighlighter
	};
});