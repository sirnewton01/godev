/*******************************************************************************
 * Copyright (c) 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
// optimization script to concat/minify the Orion editor javascript code
 
({
    baseUrl: '../../',
	closure: {
		CompilerOptions: {
			languageIn: Packages.com.google.javascript.jscomp.CompilerOptions.LanguageMode.valueOf(Packages.com.google.javascript.jscomp.CompilerOptions.LanguageMode, "ECMASCRIPT5")
		},
		CompilationLevel: 'SIMPLE_OPTIMIZATIONS',
		loggingLevel: 'WARNING'
	},
	paths: {
        almond: 'requirejs/almond',
        i18n: 'requirejs/i18n',
        text: 'requirejs/text'
	},
	name: "almond",
	include: "compare/builder/compare",
	preserveLicenseComments: false,
	uglify: {
		ascii_only: true
	},
	wrap: {
		start: "/* orion compare */ ", //start cannot be empty
		end: "\
		orion = this.orion || (this.orion = {});\n\
		var compare = orion.compare || (orion.compare = {});\n\
		compare.comparer = require('compare/builder/compare');"
	}
})