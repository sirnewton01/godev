/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 (http://www.eclipse.org/legal/epl-v10.html),
 * and the Eclipse Distribution License v1.0
 * (http://www.eclipse.org/org/documents/edl-v10.html).
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define(['orion/commandRegistry',
		'orion/Deferred',
		'orion/compare/compareView',
		'orion/compare/compareCommands',
		'orion/compare/compareHighlighter'],
function(mCommandRegistry, Deferred, mCompareView, mCompareCommands, mCompareHighlighter) {
	var commandService = new mCommandRegistry.CommandRegistry({
	});

	function _fileExt(fName){
		var splitName = fName.split("."); //$NON-NLS-0$
		var ext = "js"; //$NON-NLS-0$
		if(splitName.length > 1){
			ext = splitName[splitName.length - 1];
		}
		return ext;
	}
	
	function _contentType(fName){
		var ext = _fileExt(fName);
		var cType = {id: "application/javascript"}; //$NON-NLS-0$
		switch (ext) {
			case "java": //$NON-NLS-0$
				cType.id = "text/x-java-source"; //$NON-NLS-0$
				break;
			case "css": //$NON-NLS-0$
				cType.id = "text/css"; //$NON-NLS-0$
				break;
		}
		return cType;
	}
	
	function _getFile(fileURL){
		var d = new Deferred(); // create a promise
		var xhr = new XMLHttpRequest();
		xhr.open('GET', fileURL, true); //$NON-NLS-0$
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				var response = typeof xhr.response !== 'undefined' ? xhr.response : xhr.responseText; //$NON-NLS-0$
				var responseText = typeof response === 'string' ? response : null; //$NON-NLS-0$
				var statusCode = xhr.status;
				if (200 <= statusCode && statusCode < 400) {
					d.resolve(responseText);
				} else {
					d.reject(responseText);
				}
			}
		};
		xhr.send();	
		return d;
	}
	
	/**
	 * @class This object describes options of a file. Two instances of this object construct the core parameters of a compare view. 
	 * @name orion.compare.FileOptions
	 *
	 * @property {String} Content the text contents of the file unit. Requied.
	 * @property {String} Name the file name. Required for syntax highlight.
	 * @property {Boolean} [readonly=true] whether or not the file is in readonly mode. Optional.
	 */
	/**
	 * @class This object describes the options for <code>compare</code>.
	 * @name orion.compare.CompareOptions
	 *
	 * @property {String} parentDivID Required. the parent element id for the compare view. Required. The parentDivID is required to prefix the ids of sub components in case of side by side view.
	 * @property {orion.compare.FileOptions} [oldFile] Required. the options of the file that is original. Required. In the two way compare case, this file is dispalyed on the left hand side.
	 * @property {orion.compare.FileOptions} [newFile] Required. the options of the file that is compared against the original. Required. In the two way compare case, this file is dispalyed on the right hand side.
	 * @property {Boolean} [showTitle=false] Optional. whether or not to show the two file names on each side of the compare view.
	 * @property {Boolean} [showLineStatus=false] Optional. whether or not to show the current line and column number fo the caret on each side of the view. Not avaible for inline/unified compare view.
	 */
	/**
	 * Creates a compare view instance by given view options and othe parameters.
	 * 
	 * @param {orion.compare.CompareOptions} viewOptions Required. The comapre view option.
	 * @param {String} commandSpanId Optional. The dom element id to render all the commands that toggles compare view and navigates diffs. If not defined, no command is rendered.
	 * @param {String} [viewType="twoWay"] optional. The type of the compare view. Can be either "twoWay" or "inline". Id not defined default is "twoWay".
	 * "twoWay" represents a side by side comapre editor while "inline" represents a unified comapre view.
	 * @param {Boolean} [toggleable=false] optional. Weather or not the compare view is toggleable. A toggleable comapre view provides a toggle button which toggles between the "twoWay" and "inline" view.
	 * @param {String} toggleCommandSpanId Optional. The dom element id to render the toggle command. If this is defined the toggle command will be rendered in this DIV rather than the commandSpanId.
	 */
    function compare(viewOptions, commandSpanId, viewType, toggleable, toggleCommandSpanId){
		var vOptions = viewOptions;
		if(!vOptions.highlighters && vOptions.oldFile && vOptions.oldFile.Name && vOptions.newFile && vOptions.newFile.Name){
			vOptions.highlighters = [new mCompareHighlighter.DefaultHighlighter(), new mCompareHighlighter.DefaultHighlighter()];
		}
		if(vOptions.oldFile && vOptions.oldFile.Name){
			vOptions.oldFile.Type = _contentType(vOptions.oldFile.Name);
		}
		if(vOptions.newFile && vOptions.newFile.Name){
			vOptions.newFile.Type = _contentType(vOptions.newFile.Name);
		}
		if(commandSpanId || toggleCommandSpanId) {
			var cmdProvider = new mCompareCommands.CompareCommandFactory({commandService: commandService, commandSpanId: commandSpanId, toggleCommandSpanId: toggleCommandSpanId});
			vOptions.commandProvider = cmdProvider;
		}
		var vType = (viewType === "inline") ? "inline" : "twoWay"; //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
		if(toggleable) {
			this.compareView = new mCompareView.toggleableCompareView(vType, vOptions);
		} else if(vType === "inline") { //$NON-NLS-0$
			this.compareView = new mCompareView.inlineCompareView(vOptions);
		} else {
			this.compareView = new mCompareView.TwoWayCompareView(vOptions);
		}
		this.compareView.startup();
    }
	compare.prototype = {
		getCompareView: function(){
			return this.compareView;
		},
		refresh: function(){
			var options = this.getCompareView().getWidget().options;
			if(options.oldFile.URL && options.newFile.URL){
				var promises = [];
				promises.push( _getFile(options.oldFile.URL));
				promises.push( _getFile(options.newFile.URL));
				Deferred.all(promises, function(error) { return {_error: error}; }).then(function(results){
					this.getCompareView().getWidget().options.oldFile.Content = results[0];
					this.getCompareView().getWidget().options.newFile.Content = results[1];
					this.getCompareView().getWidget().refresh(true);
				}.bind(this));
			} else {
				this.getCompareView().getWidget().refresh(true);
			}
		}
	};
    return compare;
});
