/*******************************************************************************
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
/*global require*/
var fs = require('fs');
var path = require('path');

// Shim to support pre-0.7.1 versions of Node, where `fs.exists` was `path.exists`
if (!fs.exists) {
	fs.exists = path.exists;
}
