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
 *     Mihai Sucan (Mozilla Foundation) - fix for bug 350636
 *******************************************************************************/
 
/*globals define window */

define(['examples/editor/demoSetup', 'tests/editor/test-performance', 'orion/util'],   
 
function(mSetup, mTestPerformance, util) {
	
	/** Console */
	var document = window.document;
	var console = document.getElementById('console'); //$NON-NLS-0$
	var consoleCol = document.getElementById('consoleParent'); //$NON-NLS-0$
	
	/** Testing */
	var bClearLog = document.getElementById("clearLog"); //$NON-NLS-0$
	var bHideLog = document.getElementById("hideLog"); //$NON-NLS-0$
	var bTest = document.getElementById("test"); //$NON-NLS-0$
	var sTest = document.getElementById("testSelect"); //$NON-NLS-0$

	/** Options */	
	var bSetOptions = document.getElementById("setOptions"); //$NON-NLS-0$
	var sContents = document.getElementById("contentsSelect"); //$NON-NLS-0$
	var sTheme = document.getElementById("themeSelect"); //$NON-NLS-0$
	var sBindings = document.getElementById("bindingsSelect"); //$NON-NLS-0$
	var sTabSize = document.getElementById('tabSize'); //$NON-NLS-0$
	var sScrollAnimation = document.getElementById('scrollAnimation'); //$NON-NLS-0$
	var bReadOnly = document.getElementById('readOnly'); //$NON-NLS-0$
	var bFullSel = document.getElementById('fullSelection'); //$NON-NLS-0$
	var bWrap = document.getElementById('wrap'); //$NON-NLS-0$
	var bExpandTab = document.getElementById('expandTab'); //$NON-NLS-0$
	var bAutoSet = document.getElementById('autoSetOptions'); //$NON-NLS-0$
	var table = document.getElementById('table'); //$NON-NLS-0$
	
	var keyBindings = "";

	function resize() {
		var height = document.documentElement.clientHeight;
		table.style.height = (height - (util.isIE ? 8 : 0)) + "px"; //$NON-NLS-0$
		if (mSetup.view) { mSetup.view.resize(); }
	}
	resize();
	window.onresize = resize;

	function clearConsole () {
		if (!console) { return; }
		while (console.hasChildNodes()) { console.removeChild(console.lastChild); }
	}
	
	function showConsole () {
		if (!console) { return; }
		consoleCol.style.display = "block"; //$NON-NLS-0$
		if (mSetup.view) { mSetup.view.resize(); }
	}
	
	function hideConsole () {
		if (!console) { return; }
		consoleCol.style.display = "none"; //$NON-NLS-0$
		if (mSetup.view) { mSetup.view.resize(); }
	}
	
	function log (text) {
		if (!console) { return; }
		showConsole();
		for (var n = 1; n < arguments.length; n++) {
			text += " "; //$NON-NLS-0$
			text += arguments[n];
		}
		console.appendChild(document.createTextNode(text));
		console.appendChild(util.createElement(document, "br")); //$NON-NLS-0$
		console.scrollTop = console.scrollHeight;
	}
	window.log = log;

	function getOptions() {
		return {
			readonly: bReadOnly.checked,
			fullSelection: bFullSel.checked,
			expandTab: bExpandTab.checked,
			tabSize: parseInt(sTabSize.value, 10),
			scrollAnimation: parseInt(sScrollAnimation.value, 10),
			wrapMode: bWrap.checked,
			keyBindings: (keyBindings = sBindings.value),
			themeClass: sTheme.value
		};
	}
	
	function updateOptions() {
		var view = mSetup.view;
		var options = view.getOptions();
		bReadOnly.checked = options.readonly;
		bFullSel.checked = options.fullSelection;
		bWrap.checked = options.wrapMode;
		bExpandTab.checked = options.expandTab;
		sTabSize.value = options.tabSize;
		sScrollAnimation.value = options.scrollAnimation;
		sTheme.value = options.themeClass;
		sBindings.value = keyBindings;
	}

	var contents, currentContents;
	function setOptions() {
		mSetup.checkView(getOptions());
		updateOptions();
		window.setTimeout(function() {
			if (currentContents !== sContents.value) {
				contents[sContents.value]();
				currentContents = sContents.value;
			}
		}, 0);
	}

	function setupView(text, lang) {
		var view = mSetup.setupView(text, lang, getOptions());
		view.focus();
		updateOptions();
		return view;
	}
	
	function createJavaSample() {
		return setupView(mSetup.getFile("text.txt"), "java"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	function createJavaScriptSample() {
		return setupView(mSetup.getFile("/orion/editor/textView.js"), "js"); //$NON-NLS-1$ //$NON-NLS-0$
	}

	function createHtmlSample() {
		return setupView(mSetup.getFile("/examples/editor/demo.html"), "html"); //$NON-NLS-1$ //$NON-NLS-0$
	}
	
	function createPlainTextSample() {
		var lineCount = 50000;
		var lines = [];
		for(var i = 0; i < lineCount; i++) {
			lines.push("This is the line of text number "+i); //$NON-NLS-0$
		}
		return setupView(lines.join("\r\n"), null); //$NON-NLS-0$
	}
	
	function createBidiTextSample() {
		var lines = [];
		lines.push("Hello \u0644\u0645\u0646\u0647"); //$NON-NLS-0$
		return setupView(lines.join(util.platformDelimiter), null);
	}
	
	contents = {
		createJavaSample: createJavaSample,
		createJavaScriptSample: createJavaScriptSample,
		createHtmlSample: createHtmlSample,
		createPlainTextSample: createPlainTextSample,
		createBidiTextSample: createBidiTextSample
	};
	
	function updateSetOptionsButton() {
		if (bAutoSet.checked) {
			bSetOptions.style.display = "none"; //$NON-NLS-0$
			setOptions();
		} else {
			bSetOptions.style.display = "block"; //$NON-NLS-0$
		}
	}
	function checkSetOptions() {
		if (bAutoSet.checked) {
			setOptions();
		}
	}
	updateSetOptionsButton();
	
	/* Adding events */
	bSetOptions.onclick = setOptions;
	sContents.onchange = checkSetOptions;
	sTheme.onchange = checkSetOptions;
	sBindings.onchange = checkSetOptions;
	bReadOnly.onchange = checkSetOptions;
	sTabSize.onchange = checkSetOptions;
	sScrollAnimation.onchange = checkSetOptions;
	bFullSel.onchange = checkSetOptions;
	bWrap.onchange = checkSetOptions;
	bExpandTab.onchange = checkSetOptions;
	bAutoSet.onchange = updateSetOptionsButton;
	
	/* Adding console actions */
	bClearLog.onclick = clearConsole;
	bHideLog.onclick = hideConsole;

	/* Adding testing actions */
	var tests = {};
	function test() {
		log("test"); //$NON-NLS-0$
	}
	tests.test = test;
	
	function runTest() {
		tests[sTest.value]();
	}
	bTest.onclick = runTest;
	var option = util.createElement(document, "option"); //$NON-NLS-0$
	option.setAttribute("value", "test"); //$NON-NLS-1$ //$NON-NLS-0$
	option.appendChild(document.createTextNode("Test")); //$NON-NLS-0$
	sTest.appendChild(option);
	var prefix = "test"; //$NON-NLS-0$
	for (var property in mTestPerformance) {
		if (property.indexOf(prefix) === 0) {
			option = util.createElement(document, "option"); //$NON-NLS-0$
			option.setAttribute("value", property); //$NON-NLS-0$
			option.appendChild(document.createTextNode(property.substring(prefix.length	)));
			sTest.appendChild(option);
			tests[property] = mTestPerformance[property];
		}
	}
	
	document.body.style.display = "block"; //$NON-NLS-0$
	setOptions();
 });
