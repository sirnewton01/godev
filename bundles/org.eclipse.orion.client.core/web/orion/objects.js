/*******************************************************************************
 * @license
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define*/
define([], function() {
	/**
	 * @name orion.objects
	 * @class Object-oriented helpers.
	 */
	return {
		/**
		 * Mixes all <code>source</code>'s own enumerable properties into <code>target</code>. Multiple source objects
		 * can be passed as varags.
		 * @name orion.objects.mixin
		 * @function
		 * @static
		 * @param {Object} target
		 * @param {Object} source
		 */
		mixin: function(target/**, source..*/) {
			Array.prototype.slice.call(arguments, 1).forEach(function(source) {
				var keys = Object.keys(source);
				for (var i=0; i < keys.length; i++) {
					var key = keys[i];
					target[key] = source[key];
				}
			});
		}
	};
});