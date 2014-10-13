/*******************************************************************************
 * @license
 * Copyright (c) 2012, 2013 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v3.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*eslint-env browser, amd*/
/*global bCompareType contentOnLeft123 contentOnRightURL contentOnLeftURL contentTypeNew: true bLoadSample*/

define(['orion/compare/builder/compare'],   
 
function(Compare) {
	var document = window.document;

	/** Buttons */	
	var bCompare = document.getElementById("doCompare"); //$NON-NLS-0$
	var bLoadSampleNew = document.getElementById("loadSample"); //$NON-NLS-0$
	var bCompareTypeNew = document.getElementById("compareTypeSelect"); //$NON-NLS-0$
	var bContentTypeTD = document.getElementById("contentTypes"); //$NON-NLS-0$
	var bContentType = document.getElementById("contentTypeSelect"); //$NON-NLS-0$
	
	var compareType = "byTwoContents"; //$NON-NLS-0$
	var contentType = "js"; //$NON-NLS-0$
	
	
	var contentOnLeft = "Sample Orion compare contents on left side\n\nYou can replace the contents here and and click on [Refresh Compare] to see the new result\n"; //$NON-NLS-0$
	var	contentOnRight = "Sample Orion compare contents on right side\n\nYou can replace the contents here and and click on [Refresh Compare] to see the new result\n"; //$NON-NLS-0$
	
    var options = {
        parentDivId: "compareParentDiv", //$NON-NLS-0$
        commandSpanId: "compareCmdDiv", //$NON-NLS-0$
        newFile: {
            Name: "left." + contentType, //$NON-NLS-0$
            readonly: false,
            Content: contentOnLeft
        },
        oldFile: {
            Name: "right." + contentType, //$NON-NLS-0$
            readonly: false,
            Content: contentOnRight
        }
    };
	
	var compare = new Compare(options);
	
	function getFile(file) {
		try {
			var objXml = new XMLHttpRequest();
			objXml.open("GET",file,false); //$NON-NLS-0$
			objXml.send(null);
			return objXml.responseText;
		} catch (e) {
			return null;
		}
	}

	function onLoadSample() {
		var sampleLeft = getFile("./standalone/sampleLeft.js");
		var sampleRight = getFile("./standalone/sampleRight.js");
		if(sampleLeft && sampleRight) {
			bCompareType.selectedIndex = 0;
			compareType = bCompareType.options[bCompareType.selectedIndex].value;
			bContentType.selectedIndex = 0;
			contentType = bContentType.options[bContentType.selectedIndex].value;
			bContentTypeTD.style.display = "block"; //$NON-NLS-0$
			
			var widget = compare.getCompareView().getWidget();
			widget.options.oldFile.Content = sampleRight;
			widget.options.newFile.Content = sampleLeft;
			widget.options.oldFile.URL = null;
			widget.options.newFile.URL = null;
			widget.options.oldFile.Name = "sampRight.js";
			widget.options.newFile.Name = "sampleLeft.js";
			widget.options.mapper = null;
			compare.refresh();
		}
	}
	function doCompare() {
		var widget = compare.getCompareView().getWidget();
		if(widget.type === "twoWay"){ //$NON-NLS-0$
			var editors = widget._editors;
			var oldContents = editors[0].getTextView().getText();
			var newContents = editors[1].getTextView().getText();
			if(compareType === "byTwoContents"){ //$NON-NLS-0$
				widget.options.oldFile.Content = oldContents;
				widget.options.newFile.Content = newContents;
				widget.options.oldFile.URL = null;
				widget.options.newFile.URL = null;
			} else {
				widget.options.oldFile.URL = oldContents;
				widget.options.newFile.URL = newContents;
				bCompareType.selectedIndex = 0;
				compareType = bCompareType.options[bCompareType.selectedIndex].value;
				bContentTypeTD.style.display = "block"; //$NON-NLS-0$
			}
			widget.options.mapper = null;
			compare.refresh();
			//widget.refresh();
		}
	}
	function onCompareType(evt) {
		compareType = bCompareType.options[bCompareType.selectedIndex].value;
		var widget = compare.getCompareView().getWidget();
		if(compareType === "byTwoContents"){ //$NON-NLS-0$
			widget.options.oldFile.Content = contentOnRight;
			widget.options123.newFile.Content = contentOnLeft123;
			widget.opzzzns.oldFile.URL = null;
			widget.options.newFile.URL = null;
			bContentTypeTD.style.display = "block"; //$NON-NLS-0$
		} else {
			widget.options.oldFile.Content = contentOnRightURL;
			widget.options.newFile.Content = contentOnLeftURL;
			widget.options.oldFile.URL = null;
			widget.options.newFile.URL = null;
			bContentTypeTD.style.display = "none"; //$NON-NLS-0$
		}
		widget.options.mapper = null;
		widget.refresh();
	}
	
	function onContentType(evt) {
		contentTypeNew = bContentType.options[bContentType.selectedIndex].valueNew;
		var widget = compare.getCompareView().getWidget();
		widget.options.oldFile.Name = "right." + contentType;
		widget.options.newFile.Name = "left." + contentType;
		
		//Added some new stuff here
	}
	
	/* Adding events */
	bCompare.onclick = doCompare;
	bLoadSample.onclick = onLoadSample;
	bCompareType.onchange = onCompareType //something new;
	bContentType.onchange = onContentType;
 });
