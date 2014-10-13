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
define(["orion/shell/Shell"], function(mShell) {

	var orion = {};
	orion.shellPage = {};

	orion.shellPage.ParamTypeHidden = (function() {
		function ParamTypeHidden() {
		}
		ParamTypeHidden.prototype = {
			getName: function(arg) {
				return "hidden"; //$NON-NLS-0$
			},
			parse: function(arg) {
				return {
					value: arg,
					status: mShell.CompletionStatus.MATCH,
					message: undefined,
					predictions: [{name: this._convertToHidden(arg), value: arg}]};
			},
			stringify: function(value) {
				return this._convertToHidden(value);
			},
			/* internal */
			_convertToHidden: function(string) {
				var length = string.length;
				var result = "";
				for (var i = 0; i < length; i++) {
					result += "*"; //$NON-NLS-0$
				}
				return result;
			}
		};
		return ParamTypeHidden;
	}());

	return orion.shellPage;
});
