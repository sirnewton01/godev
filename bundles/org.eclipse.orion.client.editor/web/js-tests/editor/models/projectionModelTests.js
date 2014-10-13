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

/*eslint-env amd, browser, mocha*/

define(["chai/chai", 'orion/editor/textModel', 'orion/editor/projectionTextModel'], function(chai, mTextModel, mProjectionTextModel) {
	var assert = chai.assert;

	describe("ProjectionModel", function() {
		it("1", function() {
			var model, projectionModel, i, expected;
	//		                                      0          1          2          3          4           5         6 
	//		                                      0123456 78901 2345678901234 567890 12345678901 234567 8901234567890123
	//		                                      0xx1xxx xx234 5678xx9012345 67xx89 012xxxxxxxx xxxxx3 4567890123456789
	//		                                                           1             2                        3         
			model = new mTextModel.TextModel("silenio\nesta\naqui na casa\nworld\nabcdefghij\nxxxxl\nmxxxxxxxxxxxxxz", "\n");
	//		                                                 x             x      x                  x
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 1, end: 3, text: ""});// -2
			projectionModel.addProjection({start: 4, end: 9, text: ""});//-5
			projectionModel.addProjection({start: 16, end: 18, text: ""});//-2
			projectionModel.addProjection({start: 27, end: 29, text: ""});//-2
			projectionModel.addProjection({start: 34, end: 47, text: ""});//-13, total 24
			assertEquals("projectionModel.getCharCount", 40, projectionModel.getCharCount());
			assertEquals("model.getCharCount", 64, model.getCharCount());
			assertEquals("projectionModel.getLineCount", 5, projectionModel.getLineCount());
			assertEquals("model.getLineCount", 7, model.getLineCount());
			assertEquals("projectionModel.getText", "sesta\naquna casa\nwld\nabl\nmxxxxxxxxxxxxxz", projectionModel.getText());
			assertEquals("model.getText", "silenio\nesta\naqui na casa\nworld\nabcdefghij\nxxxxl\nmxxxxxxxxxxxxxz", model.getText());
			
			expected = [0,3,9,10,11,12,13,14,15,18,19,20,21,22,23,24,25,26,29,30,31,32,33,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset="+i, expected[i], projectionModel.mapOffset(i));
			}
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset(i,true)="+expected[i], i, projectionModel.mapOffset(expected[i], true));
			}
			expected = [1,2,4,5,6,7,8,16,17,27,28,34,35,36,37,38,39,40,41,42,43,44,45,46];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset(i,true)="+i, -1, projectionModel.mapOffset(expected[i], true));
			}
			expected = [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.getLineAtOffset="+i, expected[i], projectionModel.getLineAtOffset(i));
			}
		});
		
		it("2", function() {
			var model, projectionModel, i, expected;
			model = new mTextModel.TextModel("STARTEND", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 5, end: 5, text: "CENTER"});
			assertEquals("projectionModel.getText", "STARTCENTEREND", projectionModel.getText());
			assertEquals("projectionModel.getCharCount", 14, projectionModel.getCharCount());
			assertEquals("model.getCharCount", 8, model.getCharCount());
			expected = [0,1,2,3,4,-1,-1,-1,-1,-1,-1,5,6,7];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset="+i, expected[i], projectionModel.mapOffset(i));//to parent
			}
			expected = [0,1,2,3,4,11,12,13];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset(i,true)="+expected[i], expected[i], projectionModel.mapOffset(i, true));//from parent
			}
	//		                                  0123456789
			model = new mTextModel.TextModel("STARTXXEND", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 5, end: 7, text: "CENTER"});
			assertEquals("projectionModel.getText2", "STARTCENTEREND", projectionModel.getText());
			assertEquals("projectionModel.getCharCount2", 14, projectionModel.getCharCount());
			assertEquals("model.getCharCount2", 10, model.getCharCount());
			expected = [0,1,2,3,4,-1,-1,-1,-1,-1,-1,7,8,9];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset2="+i, expected[i], projectionModel.mapOffset(i));//to parent
			}
			expected = [0,1,2,3,4,-1,-1,11,12,13];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset2(i,true)="+expected[i], expected[i], projectionModel.mapOffset(i, true));//from parent
			}
			assertEquals("projectionModel.getLineCount2", 1, projectionModel.getLineCount());
			assertEquals("projectionModel.getLine(0)", "STARTCENTEREND", projectionModel.getLine(0));
			
			model = new mTextModel.TextModel("STARTEND", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 5, end: 5, text: "\nCENTER\n"});
	//		                                                     01234567 8901 2345
			assertEquals("projectionModel.getText(0,charCount)3", "START\nCENTER\nEND", projectionModel.getText(0, projectionModel.getCharCount()));
			assertEquals("projectionModel.getCharCount3", 16, projectionModel.getCharCount());
			assertEquals("model.getCharCount3", 8, model.getCharCount());
			assertEquals("projectionModel.getLineCount3", 3, projectionModel.getLineCount());
			assertEquals("model.getLineCount3", 1, model.getLineCount());
			expected = [0,0,0,0,0,0,1,1,1,1,1,1,1,2,2,2];
			for (i=0; i<projectionModel.getCharCount(); i++) {
				assertEquals("projectionModel.getLineAtOffset(="+i+")", expected[i], projectionModel.getLineAtOffset(i));//to parent
			}
			expected = ["START\n","CENTER\n","END"];
			for (i=0; i<projectionModel.getLineCount(); i++) {
				assertEquals("projectionModel.getLine(="+i+")", expected[i], projectionModel.getLine(i, true));//to parent
			}
			
			// test setText
			projectionModel.setText("hi", 0, 0);
			assertEquals("projectionModel1.setText()", "hiSTART\nCENTER\nEND", projectionModel.getText());
			projectionModel.setText("hello", 4, 10);
			assertEquals("projectionModel2.setText()", "hiSThelloNTER\nEND", projectionModel.getText());
			projectionModel.setText("NEW", 10, 11);
			assertEquals("projectionModel3.setText()", "hiSThelloNNEWER\nEND", projectionModel.getText());
			projectionModel.setText("1", 1, 17);
			assertEquals("projectionModel4.setText()", "h1ND", projectionModel.getText());
			projectionModel.setText("done");
			assertEquals("projectionModel5.setText()", "done", projectionModel.getText());
			
			var listener = {
				onChanging: function(e) {
					assertEquals("text"+expected[6], expected[0], e.text);
					assertEquals("start"+expected[6], expected[1], e.start);
					assertEquals("removedCharCount"+expected[6], expected[2], e.removedCharCount);
					assertEquals("addedCharCount"+expected[6], expected[3], e.addedCharCount);
					assertEquals("removedLineCount"+expected[6], expected[4], e.removedLineCount);
					assertEquals("addedLineCount"+expected[6], expected[5], e.addedLineCount);
				}
			};
			model = new mTextModel.TextModel("01234567", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 2, end: 2, text: "A\nB\nC"});
			assertEquals("a", "01A\nB\nC234567", projectionModel.getText());
			projectionModel.addEventListener("Changing", listener.onChanging);
			expected = ["", 0, 13, 0, 2, 0, "0"];
			projectionModel.setText("");
			
			//
			model = new mTextModel.TextModel("01234567", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 2, end: 2, text: "A\nB\nC"});
			assertEquals("b", "01A\nB\nC234567", projectionModel.getText());
			projectionModel.addEventListener("Changing", listener.onChanging);
			expected = ["", 4, 6, 0, 1, 0, "1"];
			projectionModel.setText("", 4, 10);
			assertEquals("c", "01A\n567", projectionModel.getText());
			
			model = new mTextModel.TextModel("01234567", "\n");
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 2, end: 2, text: "A\nB\nC"});
			assertEquals("d", "01A\nB\nC234567", projectionModel.getText());
			projectionModel.addEventListener("Changing", listener.onChanging);
			expected = ["", 1, 4, 0, 1, 0, "1"];
			projectionModel.setText("", 1, 5);
			assertEquals("e", "0\nC234567", projectionModel.getText());
		});
		
		it("3", function() {
			var model, projectionModel, i, expected;
	//		
	//line index                                  0      1        2             3      4    5        6              7  8	   9
	//line offsets                                0      6        14            27     33   37       45             59 61      68
	//		                                      0          1          2          3           4          5           6          7
	//		                                      01234 56789012 3456789012345 678901 23456 78901234 5678901234567 89 0123456 7890123456
			model = new mTextModel.TextModel("01234\n0123456\n012345678901\n01234\n012\n0123456\n0123456789012\n0\n012345\n012345678", "\n");
	// deletions                                  01  4\n0  34       345678901\n012          123456\n0123456789          23         5678 
	// inserts                                                          abcd       ABCDEFG                  abcd\nef\nghijlmn\nopqrst
	//                                                                                                                 ABCDE\nFGHIJK\nLMN
	// results                                    014\n034345abcd678901\n012ABCDEFG123456\n0123456abcd\nef\nghijlmn\nopqrst78923ABCDE\nFGHIJK\nLMN5678    
	//                                            012 34567890123456789 01234567890123456 789012345678 901 23456789 01234567890123456 7890123 45678901
	//                                                       1          2         3          4          5           6         7          8          9
			projectionModel = new mProjectionTextModel.ProjectionTextModel(model);
			projectionModel.addProjection({start: 2, end: 4, text: ""});//green remove 23 on line 0														-2
			projectionModel.addProjection({start: 7, end: 9, text: ""});//green remove 12 on line 1														-2
			projectionModel.addProjection({start: 11, end: 17, text: ""});//green remove from 5 on line 1 to 3 line 2 (56\n012)							-6
			projectionModel.addProjection({start: 20, end: 20, text: "abcd"});//orange add abcd to 6 on line 2												+4
			projectionModel.addProjection({start: 30, end: 38, text: "ABCDEFG"});//red replace 3 on line 3 to 1 on line 5 (34\n012\n0) by ABCDEFG		-8,+7 -1	
			projectionModel.addProjection({start: 52, end: 52, text: "abcd\nef\nghijlmn\nopqrst"});//orange add abcd\nef\nghijlmn\nopqrst to 7 on line 6   +22  
			projectionModel.addProjection({start: 55, end: 63, text: ""});//green remove from 10 on line 6 to 2 on line 8                                  -8
			projectionModel.addProjection({start: 65, end: 73, text: "ABCDE\nFGHIJK\nLMN"});//red replace 4 on line 8 to 5 on line 9  by ABCDE\nFGHIJK\nLMN -8, +16, +8
			assertEquals("model.getCharCount", 77, model.getCharCount());
			assertEquals("projectionModel.getCharCount", 92, projectionModel.getCharCount());
			assertEquals("model.getLineCount", 10, model.getLineCount());
			assertEquals("projectionModel.getLineCount", 9, projectionModel.getLineCount());
	//		
			//map to parent
			//    0                       1                             2                             3                             4                             5                             6                             7                             8                            9
			//    0 1 2 3 4 5 6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1 
			expected = [0,1,4,5,6,9,10,17,18,19,-1,-1,-1,-1,20,21,22,23,24,25,26,27,28,29,-1,-1,-1,-1,-1,-1,-1,38,39,40,41,42,43,44,45,46,47,48,49,50,51,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,52,53,54,63,64,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,73,74,75,76];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset="+i, expected[i], projectionModel.mapOffset(i));//to parent
			}
	
			//    0                       1                             2                             3                             4                             5                             6                             7                  
			//    0 1  2  3 4 5 6  7  8 9 0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6  7  8  9  0  1  2  3  4  5  6
			expected = [0,1,-1,-1,2,3,4,-1,-1,5,6,-1,-1,-1,-1,-1,-1, 7, 8, 9,14,15,16,17,18,19,20,21,22,23,-1,-1,-1,-1,-1,-1,-1,-1,31,32,33,34,35,36,37,38,39,40,41,42,43,44,67,68,69,-1,-1,-1,-1,-1,-1,-1,-1,70,71,-1,-1,-1,-1,-1,-1,-1,-1,88,89,90,91];
			for (i=0; i<expected.length; i++) {
				assertEquals("projectionModel.mapOffset(true)="+expected[i], expected[i], projectionModel.mapOffset(i, true));//from parent
			}
			
			//getLineAtOffset
			expected = [0,0,0,0,  1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,3,3,3,3, 4,4,4, 5,5,5,5,5,5,5,5, 6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6, 7,7,7,7,7,7,7, 8,8,8,8,8,8,8];
			for (i=0; i<projectionModel.getCharCount(); i++) {
				assertEquals("projectionModel.getLineAtOffset="+i, expected[i], projectionModel.getLineAtOffset(i));
			}
			
			//getLineStart
			expected = [0, 4, 21, 38, 50, 53, 61, 78, 85];
			for (i=0; i<projectionModel.getLineCount(); i++) {
				assertEquals("projectionModel.getLineStart="+i, expected[i], projectionModel.getLineStart(i));
			}
			expected = [4, 21, 38, 50, 53, 61, 78, 85, 92];
			for (i=0; i<projectionModel.getLineCount(); i++) {
				assertEquals("projectionModel.getLineEnd="+i, expected[i], projectionModel.getLineEnd(i, true));
			}
			expected = [3, 20, 37, 49, 52, 60, 77, 84, 92];
			for (i=0; i<projectionModel.getLineCount(); i++) {
				assertEquals("projectionModel.getLineEnd="+i, expected[i], projectionModel.getLineEnd(i));
			}
			expected = ["014\n", "034345abcd678901\n", "012ABCDEFG123456\n", "0123456abcd\n", "ef\n", "ghijlmn\n", "opqrst78923ABCDE\n", "FGHIJK\n", "LMN5678"];
			for (i=0; i<projectionModel.getLineCount(); i++) {
				assertEquals("projectionModel.getLine="+i, expected[i], projectionModel.getLine(i, true));
			}
			var resultText = "014\n034345abcd678901\n012ABCDEFG123456\n0123456abcd\nef\nghijlmn\nopqrst78923ABCDE\nFGHIJK\nLMN5678";
			assertEquals("getText=", resultText, projectionModel.getText());
			for (var j=1; j<projectionModel.getCharCount(); j++) {
				for (i=0; i+j<projectionModel.getCharCount(); i+=j) {
					assertEquals("getText(" + i + "-" + j + ")=", resultText.substring(i, i+j), projectionModel.getText(i, i+j));
				}
			}
		});
	});

	function assertEquals(msg, expected, actual) {
		assert.equal(actual, expected, msg);
	}
});

