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

/*global define require setTimeout window */

define(['examples/editor/demoSetup', 'orion/Deferred'], function(mSetup, Deferred) {

	var tests = {};
	
	function log() {
		if (window.log) {
			window.log.apply(this, arguments);
		}
	}
	
	function setupView(text, lang) {
		var options = null;
		if (!mSetup.view) {
			options = {
				fullSelection: true,
				tabSize: 4
			};
		}
		return mSetup.setupView(text, lang, options);
	}
	
	function doAction(action, max) {
		var d = new Deferred();
		var view = mSetup.view || setupView(mSetup.getFile("/examples/editor/text.txt"), "java");
		var model = view.getModel();
		if (action.toLowerCase().indexOf("down") !== -1) {
			view.setSelection(0, 0);
		} else {
			var charCount = model.getCharCount();
			view.setSelection(charCount, charCount);
		}
		view.focus();
		var start = new Date().getTime();
		function t() {
			var caretLine = model.getLineAtOffset(view.getCaretOffset());
			view.invokeAction(action);
			if (model.getLineAtOffset(view.getCaretOffset()) !== caretLine && (max === undefined || --max > 0)) {
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log("time(",action,")=", (new Date().getTime() - start));
			}
		}
		t();
		return d;
	}
	
	tests.testPageDown = function () {
		return doAction("pageDown");
	};
	tests.testSelectPageDown = function () {
		return doAction("selectPageDown");
	};
	tests.testPageUp = function () {
		return doAction("pageUp");
	};
	tests.testSelectPageUp = function () {
		return doAction("selectPageUp");
	};
	tests.testLineDown = function () {
		return doAction("lineDown", 300);
	};
	tests.testSelectLineDown = function () {
		return doAction("selectLineDown", 300);
	};
	tests.testLineUp = function () {
		return doAction("lineUp", 300);
	};
	tests.testSelectLineUp = function () {
		return doAction("selectLineUp", 300);
	};
	
	tests.testCaretUpDown = function () {
		var d = new Deferred();
		var buffer = "", i;
		for (i = 0; i < 256;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}
		buffer += "\n";
		for (i = 0; i < 256;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}

		var max = 50;
		var view = setupView(buffer, "js");
		var start = new Date().getTime();
		var caretLine = 0;
		function t() {
			if (caretLine === 0) {
				view.invokeAction("lineDown");
				caretLine = 1;
			} else {
				view.invokeAction("lineUp");
				caretLine = 0;
			}
			if (--max > 0) {			
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(CaretUpDown)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	
	tests.testInsertText = function () {
		var d = new Deferred();
		var buffer = "", i;
		for (i = 0; i < 512;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}

		var max = 10;
		var view = setupView(buffer, "js");
		var start = new Date().getTime();
		function t() {
			view.setText("a", 0, 0);
			if (--max > 0) {			
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(InsertText)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	
	tests.testAppendText = function () {
		var d = new Deferred();
		var buffer = "", i;
		for (i = 0; i < 512;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}

		var max = 10;
		var view = setupView(buffer, "js");
		var start = new Date().getTime();
		function t() {
			var charCount = view.getModel().getCharCount();
			view.setText("a", charCount, charCount);
			if (--max > 0) {			
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(AppendText)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	
	tests.testChangeText = function () {
		var d = new Deferred();
		var buffer = "", i;
		for (i = 0; i < 1024;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}

		var max = 10;
		var view = setupView(buffer, "js");
		var offset = 8, insert = false;
		var start = new Date().getTime();
		function t() {
			if (insert) {
				view.setText("f", offset, offset);
			} else {
				view.setText("", offset, offset+1);
			}
			insert = !insert;
			if (--max > 0) {			
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(ChangeText)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	
	tests.testCaretNextPrevious = function () {
		var d = new Deferred();
		var buffer = "", i;
		for (i = 0; i < 256;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}
		buffer += "\n";
		for (i = 0; i < 256;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}

		var max = 30;
		var view = setupView(buffer, "js");
		var start = new Date().getTime();
		var caret = buffer.indexOf("{"), initialCaret = caret;
		view.setCaretOffset(caret);
		function t() {
			if (caret === initialCaret) {
				view.invokeAction("charNext");
				caret++;
			} else {
				view.invokeAction("charPrevious");
				caret--;
			}
			if (--max > 0) {			
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(CaretNextPrevious)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	
	tests.testScrollLeft = function () {
		var d = new Deferred();
		var buffer = "";
		for (var i = 0; i < 1000;i++) {
			buffer += "var id; function() {return 30;} var foo; ";
		}
		var max = 256;
		var view = setupView(buffer, "js");
		var start = new Date().getTime();
		var hscroll = -1;
		function t() {
			var newHscroll = view.getHorizontalPixel();
			if (newHscroll !== hscroll && --max > 0) {			
				hscroll = newHscroll;
				view.setHorizontalPixel(hscroll + 4);
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log ("time(setHorizontalPixel)=", (new Date().getTime() - start));
			}
		}
		view.focus();
		t();
		return d;
	};
	tests.testGetLocationAtOffset = function () {
		var d = new Deferred();
		var count = 10;
		var buffer = "";
		for (var i = 0; i < 10;i++) {
			buffer += "var nada for nada function " + i + " ";
		}
		//test hit test without any styles
		var view = setupView(buffer, null);
		view.focus();
		var start = new Date().getTime();
		var length = buffer.length;
		function t() {
			for (var j = 0; j < length;j++) {
				view.getLocationAtOffset(j);
			}
			if (--count > 0) {
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log("time(getLocationAtOffset)=" + (new Date().getTime() - start));
			}
		}
		t();
		return d;
	};
	tests.testGetLocationAtOffsetStyled = function () {
		var d = new Deferred();
		var count = 10;
		var buffer = "";
		for (var i = 0; i < 10;i++) {
			buffer += "var nada for nada function " + i + " ";
		}
		//test hit test with styles
		var view = setupView(buffer, "js");
		view.focus();
		var start = new Date().getTime();
		var length = buffer.length;
		function t() {
			for (var j = 0; j < length;j++) {
				view.getLocationAtOffset(j);
			}
			if (--count > 0) {
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log("time(getLocationAtOffset)[styled]=" + (new Date().getTime() - start));
			}
		}
		t();
		return d;
	};
	tests.testGetOffsetAtLocation = function () {
		var d = new Deferred();
		var count = 100;
		var buffer = "";
		for (var i = 0; i < 3;i++) {
			buffer += "var nada for nada function " + i + " ";
		}
		//test hit test without any styles
		var view = setupView(buffer, null);
		view.focus();
		var location = view.getLocationAtOffset(buffer.length);
		var start = new Date().getTime();
		function t() {
			for (var j = 0; j < location.x; j++) {
				view.getOffsetAtLocation(j, location.y);
			}
			if (--count > 0) {
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log("time(getOffseAtLocation)=" + (new Date().getTime() - start));
			}
		}
		t();
		return d;
	};
	tests.testGetOffsetAtLocationStyled = function () {
		var d = new Deferred();
		var count = 100;
		var buffer = "";
		for (var i = 0; i < 3;i++) {
			buffer += "var nada for nada function " + i + " ";
		}
		//test hit test with styles
		var view = setupView(buffer, "js");
		view.focus();
		var location = view.getLocationAtOffset(buffer.length);
		var start = new Date().getTime();
		function t() {
			for (var j = 0; j < location.x; j++) {
				view.getOffsetAtLocation(j, location.y);
			}
			if (--count > 0) {
				setTimeout(t, 0);
			} else {
				d.resolve(true);
				log("time(getOffseAtLocation)[styled]=" + (new Date().getTime() - start));
			}
		}
		t();
		return d;
	};
	
	return tests;
});