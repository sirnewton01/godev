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

/*global define */

define(["chai/chai", 'orion/editor/textModel', 'orion/editor/annotations'], function(chai, mTextModel, mAnnotations) {
	var assert = chai.assert;
	var tests = {};
	
	tests.testAnnotationModel1 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 0, end: 5};
		var annotation2 = {start: 10, end: 15};
		var annotation3 = {start: 20, end: 30};
		var annotation4 = {start: 25, end: 35};
		var annotation5 = {start: 40, end: 60};
		var annotation6 = {start: 35, end: 45};
		var annotation7 = {start: 35, end: 65};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		annotationModel.addAnnotation(annotation4);
		annotationModel.addAnnotation(annotation5);
		annotationModel.addAnnotation(annotation6);
		annotationModel.addAnnotation(annotation7);
		var iter;
		
		iter = annotationModel.getAnnotations(0, 30);
		assert.equal(iter.hasNext(), true);
		assert.equal(iter.next(), annotation1);
		assert.equal(iter.hasNext(), true);
		assert.equal(iter.next(), annotation2);
		assert.equal(iter.hasNext(), true);
		assert.equal(iter.next(), annotation3);
		assert.equal(iter.hasNext(), true);
		assert.equal(iter.next(), annotation4);
		assert.equal(iter.hasNext(), false);
	};
	
	tests.testAnnotationModel2 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		var iter;
		
		iter = annotationModel.getAnnotations(65, 67);
		assert.equal(iter.hasNext(), true, "a1");
		assert.equal(iter.next(), annotation1, "a2");
		assert.equal(iter.hasNext(), false, "a3");
		
		iter = annotationModel.getAnnotations(40, 41);
		assert.equal(iter.hasNext(), true, "b1");
		assert.equal(iter.next(), annotation1, "b2");
		assert.equal(iter.hasNext(), false, "b3");
		
		iter = annotationModel.getAnnotations(70, 71);
		assert.equal(iter.hasNext(), false, "c3");
		
		iter = annotationModel.getAnnotations(0, 1);
		assert.equal(iter.hasNext(), false, "d3");
		
		iter = annotationModel.getAnnotations(28, 30);
		assert.equal(iter.hasNext(), true, "e1");
		assert.equal(iter.next(), annotation1, "e2");
		assert.equal(iter.hasNext(), false, "e3");
		
		iter = annotationModel.getAnnotations(48, 50);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation1, "f2");
		assert.equal(iter.hasNext(), false, "f3");
		
		iter = annotationModel.getAnnotations(30, 40);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation1, "f2");
		assert.equal(iter.hasNext(), true, "f3");
		assert.equal(iter.next(), annotation2, "f4");
		assert.equal(iter.hasNext(), false, "f5");
		
		iter = annotationModel.getAnnotations(50, 60);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation1, "f2");
		assert.equal(iter.hasNext(), true, "f3");
		assert.equal(iter.next(), annotation3, "f4");
		assert.equal(iter.hasNext(), false, "f5");
		
		iter = annotationModel.getAnnotations(0, 70);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation1, "f2");
		assert.equal(iter.hasNext(), true, "f3");
		assert.equal(iter.next(), annotation2, "f4");
		assert.equal(iter.hasNext(), true, "f5");
		assert.equal(iter.next(), annotation3, "f6");
		assert.equal(iter.hasNext(), false, "f7");
	};
	
	tests.testAnnotationModel2 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		var iter;
		
		annotationModel.removeAnnotation(annotation1);
		iter = annotationModel.getAnnotations(0, 80);
		assert.equal(iter.hasNext(), true, "a1");
		assert.equal(iter.next(), annotation2, "a2");
		assert.equal(iter.hasNext(), true, "a3");
		assert.equal(iter.next(), annotation3, "a3");
		assert.equal(iter.hasNext(), false, "a4");
	};
	
	tests.testAnnotationModel3 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 2, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation2, "a4");
			assert.equal(e.changed[0], annotation1, "a5");
			assert.equal(e.changed[1], annotation3, "a6");
		});
		textModel.setText("", 30, 40);
	};
	
	tests.testAnnotationModel4 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 2, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation2, "a4");
			assert.equal(e.changed[0], annotation1, "a5");
			assert.equal(e.changed[1], annotation3, "a6");
		});
		textModel.setText("", 35, 40);
	};
	
	tests.testAnnotationModel5 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 2, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation2, "a4");
			assert.equal(e.changed[0], annotation1, "a5");
			assert.equal(e.changed[1], annotation3, "a6");
		});
		textModel.setText("", 25, 35);
	};
	
	tests.testAnnotationModel6 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation1 = {start: 1, end: 70};
		var annotation2 = {start: 30, end: 40};
		var annotation3 = {start: 50, end: 60};
		annotationModel.addAnnotation(annotation1);
		annotationModel.addAnnotation(annotation2);
		annotationModel.addAnnotation(annotation3);
		
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 2, "a1");
			assert.equal(e.changed.length, 1, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation2, "a4");
			assert.equal(e.removed[1], annotation3, "a6");
			assert.equal(e.changed[0], annotation1, "a5");
		});
		textModel.setText("", 25, 55);
	};
	
	//test annotation before range
	tests.testAnnotationModel7 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 10, end: 20};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.fail("f0");
		});
		textModel.setText("", 25, 55);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation, "f2");
		assert.equal(iter.hasNext(), false, "f3");
		assert.equal(iter.next(), null, "f4");
	};
	
	
	//test range at annotation start 
	tests.testAnnotationModel8 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 60, end: 70};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 0, "a1");
			assert.equal(e.changed.length, 1, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.changed[0], annotation, "a4");
			assert.equal(e.changed[0].start, 61, "a5");
			assert.equal(e.changed[0].end, 71, "a6");
		});
		textModel.setText("a", 60, 60);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation, "f2");
		assert.equal(iter.hasNext(), false, "f3");
		assert.equal(iter.next(), null, "f4");
	};
	
	//test annotation after range
	tests.testAnnotationModel9 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 60, end: 70};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 0, "a1");
			assert.equal(e.changed.length, 1, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.changed[0], annotation, "a4");
			assert.equal(e.changed[0].start, 51, "a5");
			assert.equal(e.changed[0].end, 61, "a6");
		});
		textModel.setText("a", 30, 40);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation, "f2");
		assert.equal(iter.hasNext(), false, "f3");
		assert.equal(iter.next(), null, "f4");
	};
	
	//test range includes annotation
	tests.testAnnotationModel10 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 30, end: 40};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 0, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation, "a4");
		});
		textModel.setText("a", 10, 60);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), false, "f1");
		assert.equal(iter.next(), null, "f2");
	};
	
	//test annotation includes range 
	tests.testAnnotationModel11 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 20, end: 60};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 0, "a1");
			assert.equal(e.changed.length, 1, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.changed[0], annotation, "a4");
			assert.equal(e.changed[0].start, 20, "a5");
			assert.equal(e.changed[0].end, 64, "a5");			
		});
		textModel.setText("abcd", 30, 30);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), true, "f1");
		assert.equal(iter.next(), annotation, "f2");
		assert.equal(iter.hasNext(), false, "f3");
		assert.equal(iter.next(), null, "f4");
	};
	
	//test annotation intersects range start
	tests.testAnnotationModel12 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 20, end: 40};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 0, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation, "a4");
		});
		textModel.setText("a", 30, 60);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), false, "f1");
		assert.equal(iter.next(), null, "f2");
	};
	
	//test annotation intersects range end
	tests.testAnnotationModel13 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		var annotation = {start: 30, end: 60};
		annotationModel.addAnnotation(annotation);
		annotationModel.addEventListener("Changed", function(e) {
			assert.equal(e.removed.length, 1, "a1");
			assert.equal(e.changed.length, 0, "a2");
			assert.equal(e.added.length, 0, "a3");
			assert.equal(e.removed[0], annotation, "a4");
		});
		textModel.setText("a", 20, 40);
		var iter = annotationModel.getAnnotations(0, text.length);
		assert.equal(iter.hasNext(), false, "f1");
		assert.equal(iter.next(), null, "f2");
	};

	//test getAnnotation() with no parameters returns everything
	tests.testAnnotationModel14 = function () {
//		                      1         2         3         4         5         6         7	
		var text = "01234567890123456789012345678901234567890123456789012345678901234567890123456789";
		var textModel = new mTextModel.TextModel(text, "\n");
		var annotationModel = new mAnnotations.AnnotationModel(textModel);
		annotationModel.addAnnotation({start: Number.NEGATIVE_INFINITY, end: Number.NEGATIVE_INFINITY});
		annotationModel.addAnnotation({start: Number.POSITIVE_INFINITY, end: Number.POSITIVE_INFINITY});

		var iter = annotationModel.getAnnotations();
		assert.equal(iter.hasNext(), true);
		var a1 = iter.next();
		assert.equal(iter.hasNext(), true);
		var a2 = iter.next();
		assert.equal(iter.hasNext(), false);
		assert.equal(a1.start, Number.NEGATIVE_INFINITY);
		assert.equal(a2.start, Number.POSITIVE_INFINITY);
	};

	return tests;

});
