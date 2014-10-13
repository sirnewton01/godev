/*******************************************************************************
 * @license
 * Copyright (c) 2010, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*eslint-env browser, amd*/
define(["orion/plugin", "orion/editor/textModel"], function(PluginProvider, mTextModel) {

	var headers = {
		name: "Orion Line Delimiter Converter",
		version: "1.0",
		description: "This plugin provides a editor commands to convert line delimiters to DOS or UNIX."
	};
	var provider = new PluginProvider(headers);
	
	function convert(text, delimiter) {
		var model = new mTextModel.TextModel(text);
		model.setLineDelimiter(delimiter, true); //$NON-NLS-0$
		return {text: model.getText()};
	}
	
	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run : function(selectionText, text) {
			return convert(text, "\n"); //$NON-NLS-0$
		}
	}, {
		id: "orion.edit.tounix", //$NON-NLS-0$
		name: "To UNIX",
		tooltip: "Convert delimiters to UNIX (\\n)"
	});
		
	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run : function(selectionText, text) {
			return convert(text, "\r\n"); //$NON-NLS-0$
		}
	}, {
		id: "orion.edit.todos", //$NON-NLS-0$
		name: "To DOS",
		tooltip: "Convert delimiters to DOS (\\r\\n)"
	});
		
	provider.registerService("orion.edit.command", { //$NON-NLS-0$
		run : function(selectionText, text) {
			return convert(text, "auto"); //$NON-NLS-0$
		}
	}, {
		id: "orion.edit.fixmixed", //$NON-NLS-0$
		name: "To File",
		tooltip: "Convert mixed delimiters"
	});
	
	provider.connect();

});