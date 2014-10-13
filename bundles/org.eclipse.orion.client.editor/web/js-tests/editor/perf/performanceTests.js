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

/*eslint-env browser, amd, mocha*/
/*global console*/
define(['examples/editor/demoSetup', 'orion/Deferred'], function(mSetup, Deferred) {
	function log() {
		if (typeof console !== "undefined" && console.log) {
			console.log.apply(console, Array.prototype.slice.call(arguments));
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

	describe("Performance Tests", function() {
		// These are heavy duty tests -- use a long timeout for each test.
		this.timeout(30000);

		before(function() {
			var body = document.getElementsByTagName("body")[0];
			body.setAttribute("spellcheck", "false");
			if (!document.getElementById("divParent")) {
				var divParent = document.createElement("div");
				divParent.id = "divParent";
				divParent.style.border = "1px solid gray;";
				divParent.style.width = "1000px";
				divParent.style.height = "800px";
				body.appendChild(divParent);
			}
			// Set the Mocha UI element to display:none just in case its style/position affects our test times
			document.getElementById("mocha").classList.add("hide");
		});

		after(function() {
			var divParent = document.getElementById("divParent");
			if (divParent) {
				divParent.parentNode.removeChild(divParent);
			}
			// Show Mocha UI again
			document.getElementById("mocha").classList.remove("hide");
		});

		describe("Page", function() {
			var count = 40;
			it("PageDown", function() {
				return doAction("pageDown", count);
			});
			it("SelectPageDown", function() {
				return doAction("selectPageDown", count);
			});
			it("PageUp", function() {
				return doAction("pageUp", count);
			});
			it("SelectPageUp", function() {
				return doAction("selectPageUp", count);
			});
		});

		describe("Line", function() {
			var count = 300;
			it("LineDown", function() {
				return doAction("lineDown", count);
			});
			it("SelectLineDown", function() {
				return doAction("selectLineDown", count);
			});
			it("LineUp", function() {
				return doAction("lineUp", count);
			});
			it("SelectLineUp", function() {
				return doAction("selectLineUp", count);
			});
		});

		it("CaretUpDown", function() {
			var d = new Deferred();
			var buffer = "", i;
			for (i = 0; i < 256;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
			buffer += "\n";
			for (i = 0; i < 256;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
	
			var max = 25;
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
		});
		
		it("InsertText", function() {
			var d = new Deferred();
			var buffer = "", i;
			for (i = 0; i < 512;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
	
			var max = 5;
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
		});
		
		it("AppendText", function() {
			var d = new Deferred();
			var buffer = "", i;
			for (i = 0; i < 512;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
	
			var max = 5;
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
		});
		
		it("ChangeText", function() {
			var d = new Deferred();
			var buffer = "", i;
			for (i = 0; i < 512;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
	
			var max = 5;
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
		});
		
		it("CaretNextPrevious", function() {
			var d = new Deferred();
			var buffer = "", i;
			for (i = 0; i < 256;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
			buffer += "\n";
			for (i = 0; i < 256;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
	
			var max = 15;
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
		});

		it("ScrollLeft", function() {
			var d = new Deferred();
			var buffer = "";
			for (var i = 0; i < 1000;i++) {
				buffer += "var id; function() {return 30;} var foo; ";
			}
			var max = 128;
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
		});

		it("GetLocationAtOffset", function() {
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
		});
		it("GetLocationAtOffsetStyled", function() {
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
		});
		it("GetOffsetAtLocation", function() {
			var d = new Deferred();
			var count = 15;
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
		});
		it("GetOffsetAtLocationStyled", function() {
			var d = new Deferred();
			var count = 15;
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
		});
	}); // describe()
});