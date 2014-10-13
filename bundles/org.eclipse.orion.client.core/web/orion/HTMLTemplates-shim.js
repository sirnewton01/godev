/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env browser, amd*/
// HTML Templates Shim -- see http://dvcs.w3.org/hg/webcomponents/raw-file/tip/spec/templates/index.html

(function() {
	function shim() {
		document.body.insertAdjacentHTML("beforeend", "<template id='__testTemplate__'><div></div></template>");
		var testTemplate = document.getElementById("__testTemplate__");
		var supportsTemplate = !! testTemplate.content;
		document.body.removeChild(testTemplate);
		if (supportsTemplate) {
			return;
		}

		var templatesDoc = document.implementation.createHTMLDocument("");

		function shimTemplate(template) {
			if (template.ownerDocument !== document || template.content) {
				return;
			}
			templatesDoc = templatesDoc || document.implementation.createHTMLDocument("");
			Object.defineProperty(template, "content", {
				value: templatesDoc.createDocumentFragment(),
				enumerable: true
			});
			Object.defineProperty(template, "innerHTML", {
				set: function(text) {
					while (this.content.firstChild) {
						this.content.removeChild(this.content.firstChild);
					}
					var template = templatesDoc.createElement("template");
					template.innerHTML = text;
					while (template.firstChild) {
						this.content.appendChild(template.firstChild);
					}
				},
				get: function() {
					var template = templatesDoc.createElement("template");
					template.appendChild(this.content.cloneNode(true));
					return template.innerHTML;
				}
			});
			while (template.firstChild) {
				template.content.appendChild(template.firstChild);
			}
		}

		var templateStyle = document.createElement("style");
		templateStyle.textContent = "template{display:none;}";
		document.head.appendChild(templateStyle);

		Array.prototype.forEach.call(document.querySelectorAll("template"), function(template) {
			if (!template.content) {
				shimTemplate(template);
			}
		});

		var documentCreateElement = document.createElement;
		document.createElement = function(tagName) {
			var el = documentCreateElement.apply(document, arguments);
			if (tagName === "template") {
				shimTemplate(el);
			}
			return el;
		};

		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		if (MutationObserver) {
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					Array.prototype.forEach.call(mutation.addedNodes, function(node) {
						if (node.nodeType === 1 && node.localName === "template") {
							shimTemplate(node);
						}
					});
				});
			});
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true
			});
		} else {
			addEventListener("DOMNodeInserted", function(mutationEvent) {
				var node = mutationEvent.target;
				if (node.nodeType === 1 && node.localName === "template") {
					shimTemplate(node);
				}
			});
		}
	}

	if (document.readyState === "complete") {
		shim();
	} else {
		var once = function() {
			document.removeEventListener("DOMContentLoaded", once, false);
			removeEventListener("load", once, false);
			shim();
		};
		document.addEventListener("DOMContentLoaded", once, false);
		addEventListener("load", once, false);
	}
}());