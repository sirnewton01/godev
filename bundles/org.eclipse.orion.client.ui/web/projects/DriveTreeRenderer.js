/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. 
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global define window orion document */
/*jslint browser:true */

define(['i18n!orion/widgets/nls/messages', 'require', 'orion/explorers/navigatorRenderer'], 
function(messages, require, mNavigatorRenderer) {

	function DriveTreeRenderer(){
		mNavigatorRenderer.NavigatorRenderer.apply(this, arguments);
	}
	
	DriveTreeRenderer.prototype = Object.create( mNavigatorRenderer.NavigatorRenderer.prototype ); 
	
	// TODO see https://bugs.eclipse.org/bugs/show_bug.cgi?id=400121
	DriveTreeRenderer.prototype.folderLink = require.toUrl("navigate/table.html"); //$NON-NLS-0$
	DriveTreeRenderer.prototype.oneColumn = true;
	
	return DriveTreeRenderer;
});