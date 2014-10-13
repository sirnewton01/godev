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

define(["chai/chai", 'orion/editor/textModel', 'orion/editor/annotations'], function(chai, mTextModel) {
	var assert = chai.assert;
	
	function assertEquals(msg, expected, actual) {
		assert.equal(actual, expected, msg);
	}

	describe("TextModel", function() {
		it("empty", function() {
			var content = new mTextModel.TextModel();
			assertEquals(":1a:", content.getLineCount(), 1);
			assertEquals(":1b:", content.getLine(0), "");
	
			content.setText("test");
			content.setText("", 0, 4);
			assertEquals(":2a:", content.getLineCount(), 1);
			assertEquals(":2b:", content.getLine(0), "");
		});

		it("insert", function() {
			var content = new mTextModel.TextModel();
			var newText;
			
			content.setText("This\nis a test\r");
			content.setText("test\n ", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":1a:", ("test\n This\nis a test\r"), newText);
			assertEquals(":1b:", 4, content.getLineCount());
			assertEquals(":1c:", ("test"), content.getLine(0));
			assertEquals(":1d:", (" This"), content.getLine(1));
			assertEquals(":1e:", ("is a test"), content.getLine(2));
			assertEquals(":1f:", (""), content.getLine(3));
	
			content.setText("This\nis a test\r");
			content.setText("*** ", 5, 5);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":2a:", ("This\n*** is a test\r"), newText);
			assertEquals(":2b:", 3, content.getLineCount());
			assertEquals(":2c:", ("This"), content.getLine(0));
			assertEquals(":2d:", ("*** is a test"), content.getLine(1));
			assertEquals(":2e:", (""), content.getLine(2));
	
			content.setText("Line 1\r\nLine 2");
			content.setText("\r", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":3a:", ("\rLine 1\r\nLine 2"), newText);
			assertEquals(":3b:", 3, content.getLineCount());
			assertEquals(":3c:", (""), content.getLine(0));
			assertEquals(":3d:", ("Line 1"), content.getLine(1));
			assertEquals(":3e:", ("Line 2"), content.getLine(2));
			content.setText("\r", 9, 9);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":3f:", ("\rLine 1\r\n\rLine 2"), newText);
			assertEquals(":3g:", 4, content.getLineCount());
			assertEquals(":3h:", (""), content.getLine(0));
			assertEquals(":3i:", ("Line 1"), content.getLine(1));
			assertEquals(":3j:", (""), content.getLine(2));
			assertEquals(":3k:", ("Line 2"), content.getLine(3));
	
			content.setText("This\nis a test\r");
			content.setText("\n", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":4a:", ("\nThis\nis a test\r"), newText);
			assertEquals(":4b:", 4, content.getLineCount());
			assertEquals(":4c:", (""), content.getLine(0));
			assertEquals(":4d:", ("This"), content.getLine(1));
			assertEquals(":4e:", ("is a test"), content.getLine(2));
			assertEquals(":4f:", (""), content.getLine(3));
			
			content.setText("This\nis a test\r");
			content.setText("\r\nnewLine", 7, 7);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":5a:", ("This\nis\r\nnewLine a test\r"), newText);
			assertEquals(":5b:", 4, content.getLineCount());
			assertEquals(":5c:", ("This"), content.getLine(0));
			assertEquals(":5d:", ("is"), content.getLine(1));
			assertEquals(":5e:", ("newLine a test"), content.getLine(2));
			assertEquals(":5f:", (""), content.getLine(3));
	
			content.setText("");
			content.setText("This\nis\r\nnewLine a test\r", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":6a:", ("This\nis\r\nnewLine a test\r"), newText);
			assertEquals(":6b:", 4, content.getLineCount());
			assertEquals(":6c:", ("This"), content.getLine(0));
			assertEquals(":6d:", ("is"), content.getLine(1));
			assertEquals(":6e:", ("newLine a test"), content.getLine(2));
			assertEquals(":6f:", (""), content.getLine(3));
	
			// insert at end
			content.setText("This");
			content.setText("\n ", 4, 4);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":7a:", ("This\n "), newText);
			assertEquals(":7b:", 2, content.getLineCount());
			assertEquals(":7c:", ("This"), content.getLine(0));
			assertEquals(":7d:", (" "), content.getLine(1));
			content.setText("This\n");
			content.setText("\n", 5, 5);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":7e:", ("This\n\n"), newText);
			assertEquals(":7f:", 3, content.getLineCount());
			assertEquals(":7g:", ("This"), content.getLine(0));
			assertEquals(":7h:", (""), content.getLine(1));
			assertEquals(":7i:", (""), content.getLine(2));
	
			// insert at beginning
			content.setText("This");
			content.setText("\n", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":8a:", ("\nThis"), newText);
			assertEquals(":8b:", 2, content.getLineCount());
			assertEquals(":8c:", (""), content.getLine(0));
			assertEquals(":8d:", ("This"), content.getLine(1));
	
			//insert at end
			content.setText("This");
			content.setText("\n", 4, 4);//passing 5, 5 runs into problem (text model doesn't not check range and fails)
			newText = content.getText(0, content.getCharCount());
			assertEquals(":8e:", "This\n", newText);
			//Note: This is different than StyledText, web editor always break line on \r \n \r\n, it uses lineDelimiter for enter key
			assertEquals(":8f:", 2, content.getLineCount());
			
			// insert text
			content.setText("This\nis a test\r");
			content.setText("*** ", 5, 5);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":9a:", newText, ("This\n*** is a test\r"));
			assertEquals(":9b:", 3, content.getLineCount());
			assertEquals(":9c:", ("This"), content.getLine(0));
			assertEquals(":9d:", ("*** is a test"), content.getLine(1));
			assertEquals(":9e:", (""), content.getLine(2));
			
			content.setText("This\n");
			content.setText("line", 5, 5);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":10a:", "This\nline", newText);
			assertEquals(":10b:", 2, content.getLineCount());
			assertEquals(":10c:", "This", content.getLine(0));
			assertEquals(":10d:", "line", content.getLine(1));
			assertEquals(":10e:", 1, content.getLineAtOffset(8));
			assertEquals(":10f:", 1, content.getLineAtOffset(9));
	
			// insert at beginning 
			content.setText("This\n");
			content.setText("line\n", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":11a:", ("line\nThis\n"), newText);
			assertEquals(":11b:", 3, content.getLineCount());
			assertEquals(":11c:", ("line"), content.getLine(0));
			assertEquals(":11d:", ("This"), content.getLine(1));
			assertEquals(":11e:", 1, content.getLineAtOffset(5));
	
			content.setText("Line 1\r\nLine 2\r\nLine 3");
			content.setText("\r", 0, 0);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":12a:", ("\rLine 1\r\nLine 2\r\nLine 3"), newText);
			assertEquals(":12b:", 4, content.getLineCount());
			assertEquals(":12c:", (""), content.getLine(0));
			assertEquals(":12d:", ("Line 1"), content.getLine(1));
			assertEquals(":12e:", ("Line 2"), content.getLine(2));
			assertEquals(":12f:", ("Line 3"), content.getLine(3));
	
			content.setText("Line 1\nLine 2\nLine 3");
			content.setText("Line1a\nLine1b\n", 7, 7);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":13a:", ("Line 1\nLine1a\nLine1b\nLine 2\nLine 3"), newText);
			assertEquals(":13b:", 5, content.getLineCount());
			assertEquals(":13c:", ("Line 1"), content.getLine(0));
			assertEquals(":13d:", ("Line1a"), content.getLine(1));
			assertEquals(":13e:", ("Line1b"), content.getLine(2));
			assertEquals(":13f:", ("Line 2"), content.getLine(3));
			assertEquals(":13g:", ("Line 3"), content.getLine(4));
	
			content.setText("Line 1\nLine 2\nLine 3");
			content.setText("l1a", 11, 11);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":14a:", ("Line 1\nLinel1a 2\nLine 3"), newText);
			assertEquals(":14b:", 3, content.getLineCount());
			assertEquals(":14c:", ("Line 1"), content.getLine(0));
			assertEquals(":14d:", ("Linel1a 2"), content.getLine(1));
			assertEquals(":14e:", ("Line 3"), content.getLine(2));
	
			content.setText("Line 1\nLine 2 is a very long line that spans many words\nLine 3");
			content.setText("very, very, ", 19, 19);
			newText = content.getText(0, content.getCharCount());
			assertEquals(":15a:", ("Line 1\nLine 2 is a very, very, very long line that spans many words\nLine 3"), newText);
			assertEquals(":15b:", 3, content.getLineCount());
			assertEquals(":15c:", ("Line 1"), content.getLine(0));
			assertEquals(":15d:", ("Line 2 is a very, very, very long line that spans many words"), content.getLine(1));
			assertEquals(":15e:", ("Line 3"), content.getLine(2));
		});

		it("#find()", function() {
			var content = new mTextModel.TextModel();
			
						   //0123 4567890123 4
			content.setText("This\nis a test\r");
			var iter, match, i;
			
			iter = content.find({string: "is"});
			match = iter.next();
			assertEquals(":1a:", match.start, 2);
			assertEquals(":1b:", match.end, 4);
			match = iter.next();
			assertEquals(":1c:", match.start, 5);
			assertEquals(":1d:", match.end, 7);
			match = iter.next();
			assertEquals(":1e:", match, null);
	
			iter = content.find({string: "is", wrap: true});
			for (i=0; i<10; i++) {
				match = iter.next();
				assertEquals(":2a:", match.start, 2);
				assertEquals(":2b:", match.end, 4);
				match = iter.next();
				assertEquals(":2c:", match.start, 5);
				assertEquals(":2d:", match.end, 7);
			}
	
			iter = content.find({string: "Is", caseInsensitive: true});
			match = iter.next();
			assertEquals(":3a:", match.start, 2);
			assertEquals(":3b:", match.end, 4);
			match = iter.next();
			assertEquals(":3c:", match.start, 5);
			assertEquals(":3d:", match.end, 7);
			match = iter.next();
			assertEquals(":3e:", match, null);
			
			iter = content.find({string: "Is", caseInsensitive: false});
			match = iter.next();
			assertEquals(":4c:", match, null);
	
			iter = content.find({string: "Is", caseInsensitive: true, start: 3});
			match = iter.next();
			assertEquals(":4a:", match.start, 5);
			assertEquals(":4b:", match.end, 7);
			match = iter.next();
			assertEquals(":4c:", match, null);
	
			iter = content.find({string: "Is", caseInsensitive: true, start: 3, wrap: true});
			for (i=0; i<10; i++) {
				match = iter.next();
				assertEquals(":5a:", match.start, 5);
				assertEquals(":5b:", match.end, 7);
				match = iter.next();
				assertEquals(":5c:", match.start, 2);
				assertEquals(":5d:", match.end, 4);
			}
	
			iter = content.find({string: "Is", caseInsensitive: true, start: 3, reverse: true});
			match = iter.next();
			assertEquals(":6a:", match.start, 2);
			assertEquals(":6b:", match.end, 4);
			match = iter.next();
			assertEquals(":6c:", match, null);
	
			iter = content.find({string: "Is", caseInsensitive: true, start: 3, wrap: true, reverse: true});
			for (i=0; i<10; i++) {
				match = iter.next();
				assertEquals(":5a:", match.start, 2);
				assertEquals(":5b:", match.end, 4);
				match = iter.next();
				assertEquals(":5c:", match.start, 5);
				assertEquals(":5d:", match.end, 7);
			}
		});
	});
});

