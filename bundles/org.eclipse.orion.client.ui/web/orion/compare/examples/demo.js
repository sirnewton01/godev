/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
 
/*eslint-env browser, amd*/
define(['compare/builder/compare'],   
 
function(Compare) {
	var document = window.document;

	/** Buttons */	
	var bCompare = document.getElementById("doCompare"); //$NON-NLS-0$
	var bLoadSample = document.getElementById("loadSample"); //$NON-NLS-0$
	var bAnimateDiffs = document.getElementById("animateDiffs"); //$NON-NLS-0$
	
	var bCompareType = document.getElementById("compareTypeSelect"); //$NON-NLS-0$
	var bContentTypeTD = document.getElementById("contentTypes"); //$NON-NLS-0$
	var bContentType = document.getElementById("contentTypeSelect"); //$NON-NLS-0$
	var bAnimateInterval = document.getElementById("animateInterval"); //$NON-NLS-0$
	
	var compareType = "byTwoContents"; //$NON-NLS-0$
	var contentType = "js"; //$NON-NLS-0$
	
	
	var contentOnLeft = "Sample Orion compare contents on left side\n\nYou can replace the contents here and and click on [Compare Again] to see the new result\n"; //$NON-NLS-0$
	var	contentOnRight = "Sample Orion compare contents on right side\n\nYou can replace the contents here and and click on [Compare Again] to see the new result\n"; //$NON-NLS-0$
	var contentOnLeftURL = "Put file URL here\n"; //$NON-NLS-0$
	var	contentOnRightURL = "Put file URL here\n"; //$NON-NLS-0$
	
    var options = {
        parentDivId: "compareParentDiv", //$NON-NLS-0$
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
	
	var compare = new Compare(options, "compareCmdDiv", "twoWay", true, "toggleCmd"); //$NON-NLS-1$ //$NON-NLS-0$
	
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
		var sampleLeft = getFile("./standalone/sampleLeft.js"); //$NON-NLS-0$
		var sampleRight = getFile("./standalone/sampleRight.js"); //$NON-NLS-0$
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
			widget.options.oldFile.Name = "sampRight.js"; //$NON-NLS-0$
			widget.options.newFile.Name = "sampleLeft.js"; //$NON-NLS-0$
			widget.options.mapper = null;
			compare.refresh(true);
		}
	}
	function animateDiffs() {
		var widget = compare.getCompareView().getWidget();
		if(widget.nextChange()){
			var interval = parseInt(bAnimateInterval.options[bAnimateInterval.selectedIndex].value, 10);
			window.setTimeout(animateDiffs, interval);
		}
	}
	function onAnimateDiffs() {
		var widget = compare.getCompareView().getWidget();
		widget.initDiffNav();
		var interval = parseInt(bAnimateInterval.options[bAnimateInterval.selectedIndex].value, 10);
		window.setTimeout(animateDiffs, interval);
	}
	function doCompare() {
		var widget = compare.getCompareView().getWidget();
		if(widget.type === "twoWay"){ //$NON-NLS-0$
			var editors = widget.getEditors();
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
			compare.refresh(true);
			//widget.refresh();
		}
	}
	function onCompareType(evt) {
		compareType = bCompareType.options[bCompareType.selectedIndex].value;
		var widget = compare.getCompareView().getWidget();
		if(compareType === "byTwoContents"){ //$NON-NLS-0$
			widget.options.oldFile.Content = contentOnRight;
			widget.options.newFile.Content = contentOnLeft;
			widget.options.oldFile.URL = null;
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
		widget.refresh(true);
	}
	
	function onContentType(evt) {
		contentType = bContentType.options[bContentType.selectedIndex].value;
		var widget = compare.getCompareView().getWidget();
		widget.options.oldFile.Name = "right." + contentType; //$NON-NLS-0$
		widget.options.newFile.Name = "left." + contentType; //$NON-NLS-0$
	}
	
	/* Adding events */
	bCompare.onclick = doCompare;
	bLoadSample.onclick = onLoadSample;
	bAnimateDiffs.onclick = onAnimateDiffs;
	bCompareType.onchange = onCompareType;
	bContentType.onchange = onContentType;
 });
