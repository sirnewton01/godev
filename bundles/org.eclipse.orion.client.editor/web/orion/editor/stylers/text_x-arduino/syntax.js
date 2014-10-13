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

/*eslint-env browser, amd*/
define("orion/editor/stylers/text_x-arduino/syntax", ["orion/editor/stylers/text_x-csrc/syntax"], function(mC) { //$NON-NLS-1$ //$NON-NLS-0$
	var grammars = mC.grammars;
	var grammar = grammars[grammars.length - 1];
	grammar.id = "orion.arduino"; //$NON-NLS-0$
	grammar.contentTypes = ["text/x-arduino"]; // TODO could not find a commonly-used value for this //$NON-NLS-0$
	return {
		id: grammar.id,
		grammars: grammars,
		keywords: grammar.keywords
	};
});
