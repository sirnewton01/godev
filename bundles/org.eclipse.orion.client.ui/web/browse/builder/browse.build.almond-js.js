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
        text: 'requirejs/text',
        "orion/extensionCommands": "browse/builder/buildFrom/emptyExtensionCommands"
	},
	name: "almond",
	include: "browse/builder/browse",
	preserveLicenseComments: false,
	uglify: {
		ascii_only: true
	},
	wrap: {
		start: "/* orion browse */ ", //start cannot be empty
		end: "\
		orion = this.orion || (this.orion = {});\n\
		var browse = orion.browse || (orion.browse = {});\n\
		browse.browser = require('browse/builder/browse');"
	}
})