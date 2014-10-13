/*******************************************************************************
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *	 IBM Corporation - initial API and implementation
 *******************************************************************************/
/*eslint-env amd */
define([
'../util'
], function(util) {

	return function(context) {

		var wrappers = ["String", "Number", "Math", "Boolean", "JSON"]; //$NON-NLS-4$ //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$

		return util.createNewBuiltinRule(wrappers, function(context, node, symbol) {
			context.report(node, "Do not use '${0}' as a constructor.", [symbol]); //$NON-NLS-1$
		}, context);
	};
});
