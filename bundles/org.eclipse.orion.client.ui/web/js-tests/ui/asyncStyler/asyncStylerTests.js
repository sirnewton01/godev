/*******************************************************************************
 * @license
 * Copyright (c) 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd, mocha*/
define(['chai/chai', 'orion/Deferred', 'js-tests/editor/mockTextView', 'orion/editor/AsyncStyler',
		'orion/serviceregistry', 'orion/EventTarget'],
		function(chai, Deferred, mMockTextView, AsyncStyler, mServiceRegistry, EventTarget) {
	var assert = chai.assert;
var MockTextView = mMockTextView.MockTextView;

describe("AsyncStyler Test", function() {
	it('test AsyncStyler listens to highlight provider service', function() {
		var serviceRegistry = new mServiceRegistry.ServiceRegistry();
		var textView = new MockTextView();
		var asyncStyler = new AsyncStyler(textView, serviceRegistry);
	
		var highlightService = {
			dispatchStyleReady: function(styles) {
				this.dispatchEvent({
					type: 'orion.edit.highlighter.styleReady',
					lineStyles: styles
				});
			}
		};
		EventTarget.attach(highlightService);
		serviceRegistry.registerService('orion.edit.highlighter', highlightService, {
			type: 'highlighter',
			contentType: ['text/foo']
		});
		asyncStyler.setContentType('text/foo');
		textView.setText([
			'foo bar foo',
			'fizz buzz garbl'
		].join(textView.getModel().getLineDelimiter()));
	
		setTimeout(function() {
			highlightService.dispatchStyleReady({
				0: {ranges: [{start: 5, end: 9, style: {styleClass: 'style1'}}]},
				1: {ranges: [{start: 0, end: 5, style: {styleClass: 'style2'}}]}
			});
		}, 20);	
	
		// Get the line style for lines 0, 1 and ensure it matches the ranges our highlight service sent.
		var linesStyledCorrectly = new Deferred();
		var _super = textView.redrawLines;
		textView.redrawLines = function(start, end) {
			assert.equal(start, 0);
			assert.equal(end, 2);
			var model = this.getModel();
			var lineStyle0Event = {type:"LineStyle", textView: this, lineIndex: 0, lineText: model.getLine(0), lineStart: model.getLineStart(0)};
			var lineStyle1Event = {type:"LineStyle", textView: this, lineIndex: 1, lineText: model.getLine(1), lineStart: model.getLineStart(1)};
			this.onLineStyle(lineStyle0Event);
			this.onLineStyle(lineStyle1Event);
	
			try {
				assert.equal(lineStyle0Event.ranges[0].start, 5);
				assert.equal(lineStyle0Event.ranges[0].end, 9);
				assert.equal(lineStyle0Event.ranges[0].style.styleClass, 'style1');
				assert.equal(lineStyle1Event.ranges[0].start, 0 + model.getLineStart(1));
				assert.equal(lineStyle1Event.ranges[0].end, 5 + model.getLineStart(1));
				assert.equal(lineStyle1Event.ranges[0].style.styleClass, 'style2');
				linesStyledCorrectly.resolve();
			} catch (e) {
				linesStyledCorrectly.reject(e);
			}
			_super.apply(this, Array.prototype.slice.call(arguments));
		}.bind(textView);
		return linesStyledCorrectly;
	});
});
});