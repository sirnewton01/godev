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
/*eslint-env amd, browser, mocha*/
define([
	'orion/Deferred',
	'chai/chai',
	'orion/editor/textModel',
	'js-tests/editor/mockTextView',
	'orion/editor/contentAssist'
], function(Deferred, chai, mTextModel, mMockTextView, mContentAssist) {
	var assert = chai.assert;
	var ContentAssist = mContentAssist.ContentAssist,
		ContentAssistWidget = mContentAssist.ContentAssistWidget,
		ContentAssistMode = mContentAssist.ContentAssistMode,
	    TextModel = mTextModel.TextModel,
	    MockTextView = mMockTextView.MockTextView;

	describe("Content Assist framework", function() {
		describe("ContentAssist", function() {
			it("#getProviders(), #setProviders()", function() {
				withData(function(view, contentAssist) {
					var p1 = { computeContentAssist: function() {} };
					var p2 = {
						id: "test.provider2", provider: { computeContentAssist: function() {} }
					};
					contentAssist.setProviders([p1, p2]);
					var providers = contentAssist.getProviders();
					assert.equal(providers.length, 2);
					assert.equal(providers[0].provider, p1); // p1 should have been wrapped into a provider info
					assert.equal(providers[1], p2); // p2 should have been returned as-is
				});
			});
			// Make sure we can't mutate the backing array of content assist providers from outside
			it("mutating #getProviders() array should not affect backing store", function() {
				withData(function(view, contentAssist) {
					var p1 = { computeContentAssist: function() {} },
					    providersIn = [p1];
					contentAssist.setProviders(providersIn);
					providersIn.pop();
					assert.equal(contentAssist.getProviders().length, 1, "Mutation does not change backing array");
					contentAssist.getProviders().pop();
					assert.equal(contentAssist.getProviders().length, 1, "Mutation does not change backing array");
				});
			});
		});

		describe("provider", function() {
			// Test that the provider having charTriggers leads to automatic invocation of that provider
			it("should be auto invoked when it has 'charTriggers'", function() {
				var d = new Deferred();
				withData(function(view, contentAssist) {
					var p1 = {
							id: "p1",
							charTriggers: /</,
							provider : {
								computeContentAssist: function() {
									d.resolve("we were invoked");
								}
							}
					};
					contentAssist.setProviders([p1]);
					contentAssist.setAutoTriggerEnabled(true);
					setEditorContextProvider(contentAssist);
					view._handleKeyPress(createKeyPressEvent('<'));
				});
				return d;
			});
			it("should have its #computeProposals() invoked", function() {
				var text = 'this is the first line\nthis is the second line@@@';
				return assertProviderInvoked(text, function(getProposalsFunction) {
					return {
						computeProposals: getProposalsFunction
					};
				});
			});
			// Tests that 'getProposals' works as an alias of 'computeProposals' (backwards compatibility)
			it("should have its #getProposals() invoked", function() {
				var text = 'this is the first line\nthis is the second line@@@';
				return assertProviderInvoked(text, function(getProposalsFunction) {
					return {
						getProposals: getProposalsFunction
					};
				});
			});
			it("should have its #computeContentAssist() called", function() {
				return assertProviderInvoked_v4("line1\nline@@@2", function(checkParamsCallback) {
					return {
						computeContentAssist: checkParamsCallback
					};
				});
			});
			// Tests that contentAssist.initialize() calls each provider's initialize method
			it("should have its #initialize() called", function() {
				withData(function(view, contentAssist) {
					var d1 = new Deferred(), d2 = new Deferred();
					var provider1 = {
						initialize: d1.resolve.bind(d1),
						computeContentAssist: function() {}
					},
					provider2 = {
						initialize: d2.resolve.bind(d2),
						computeContentAssist: function() {}
					};
					contentAssist.setProviders([provider1, provider2]);
					contentAssist.initialize();
					return Deferred.all([d1, d2]);
				});
			});
			// Test that some provider throwing or rejecting does not prevent other providers from being invoked.
			it("should be able to throw/reject without affecting other providers", function() {
				var d1 = new Deferred(),
				    d2 = new Deferred(),
				    d3 = new Deferred();
				withData(function(view, contentAssist) {
					contentAssist.setProviders([
						{
							computeProposals: function() {
								d1.resolve();
								throw new Error('i threw');
							}
						},
						{
							computeProposals: function() {
								d2.resolve();
								return new Deferred().reject(new Error('i rejected'));
							}
						},
						{
							computeProposals: function() {
								d3.resolve();
							}
						}
					]);
					contentAssist.activate();
				});
				return Deferred.all([d1, d2, d3]);
			});
		}); // Provider

		describe("Events", function() {
			// Tests that Activating, Deactivating events are fired as expected.
			it("should emit Activating, Deactivating", function() {
				var d1 = new Deferred(),
				    d2 = new Deferred(),
				    deferred = Deferred.all([d1, d2]);
				withData(function(view, contentAssist) {
					setText(view, 'fizz bu');
					contentAssist.addEventListener('Activating', function(event) {
						d1.resolve();
					});
					contentAssist.activate();
					d1.then(function() {
						contentAssist.addEventListener('Deactivating', function(event) {
							d2.resolve();
						});
						contentAssist.deactivate();
					});
		
				});
				return deferred;
			});
			// Tests that ProposalsComputed, ProposalsApplied events are fired as expected.
			it("should emit ProposalsComputed, ProposalsApplied", function() {
				var d1 = new Deferred(),
				    d2 = new Deferred(),
				    deferred = Deferred.all([d1, d2]);
				withData(function(view, contentAssist) {
					setText(view, 'foo@@@baz');
					var proposal = {proposal: ' bar ', description: 'Metasyntactic variable completion'};
					contentAssist.setProviders([
						{	computeProposals: function() {
								return [proposal];
							}
						}
					]);
					contentAssist.addEventListener('ProposalsComputed', function(event) {
						try {
							var numUnselectable = event.data.proposals.reduce(function(previous, current){
								if (current.unselectable) {
									previous++;
								}
								return previous;
							}, 0);
							assert.strictEqual(1, event.data.proposals.length - numUnselectable, 'Got right # of proposals');
							assert.deepEqual(event.data.proposals[0], proposal);
							d1.resolve();
						} catch (e) { d1.reject(e); }
					});
					contentAssist.activate();
					d1.then(function() {
						contentAssist.addEventListener('ProposalApplied', function(event) {
							try {
								assert.deepEqual(event.data.proposal, proposal, 'Applied proposal matches what we provided');
								assert.strictEqual(view.getText(), 'foo bar baz', 'Proposal was applied to TextView');
								d2.resolve();
							} catch (e) { d2.reject(e); }
						});
						contentAssist.activate();
						contentAssist.apply(proposal);
					});
				});
				return deferred;
			});
		}); // Events

		describe("filtering", function() {
			// Tests that active ContentAssist will not call providers as we type but rather
			// will filter the proposals itself.
			it("with 0ms delay", function() {
				return filterTestImpl(0);
			});
			// Tests that content assist filtering will behave as expected if a 
			// delay is introduced between the sequence of events
			it("with 20ms delay", function() {
				return filterTestImpl(20);
			});
			it("with 50ms delay", function() {
				return filterTestImpl(50);
			});
			it("Test filtering 2", function() {
				return testFiltering2();
			});
		});

// TODO Test ContentAssistMode
//	tests.testContentAssistMode = function() {
//		// lineUp lineDown enter selection
//	};

	}); //describe(Content Assist framework)

	/*****************************************************************************
	 *
	 * Test helpers
	 *
	 *****************************************************************************/

	function getNewView() {
		return new MockTextView({parent: document.createElement("div")});
	}
	
	function getNewContentAssist(view) {
		return new ContentAssist(view);
	}
	
	function withData(func) {
		var view = getNewView();
		var contentAssist = getNewContentAssist(view);
		return func(view, contentAssist);
	}
	
	/**
	 * Sets the text in a TextView. An appearance of '@@@' in the text will be replaced by the editing caret.
	 * @returns {Number} The caret offset
	 */
	function setText(view, text) {
		var model = new TextModel();
		model.setText(text);
		view.setModel(model);
		if (text.indexOf('@@@') !== -1) {
			var offset = model.find({string: '@@@'}).next().start;
			model.setText(text.replace('@@@', ''));
			view.setCaretOffset(offset);
		}
		return view.getCaretOffset();
	}

	function getContentAssistPrefix(view, index) {
		var start = index;
		while (start > 0 && /[A-Za-z0-9_]/.test(view.getText(start - 1, start))) {
			start--;
		}
		return view.getText(start, index);
	}

	function createKeyPressEvent(chr) {
		return {
			charCode: chr.charCodeAt(0)
		};
	}
	
	/**
	 * Creates a provider using the given callback and tests that its method receives the expected params properly.
	 * @param {Function} providerCallback Callback that returns a {@link orion.editor.ContentAssistProvider}.
	 * Takes 1 parameter, which is the body of the provider's <code>computeProposals</code> that performs assertions.
	 * @returns {Deferred} A deferred that rejects on assertion failure or error.
	 */
	function assertProviderInvoked(text, providerCallback) {
		var deferred = new Deferred();
		withData(function(view, contentAssist) {
			var offset = setText(view, text);
			text = text.replace('@@@', '');
			var expectedLine = view.getModel().getLine(view.getModel().getLineAtOffset(offset));
			var expectedPrefix = getContentAssistPrefix(view, offset);
			var checkParams = function(buffer, actualOffset, context) {
				try {
					assert.strictEqual(buffer, text);
					assert.strictEqual(actualOffset, offset);
					assert.strictEqual(context.line, expectedLine);
					assert.strictEqual(context.prefix, expectedPrefix);
					assert.strictEqual(context.selection.start, offset);
					assert.strictEqual(context.selection.end, offset);
					deferred.resolve();
				} catch (e) {
					deferred.reject(e);
				}
			};
			var provider = providerCallback(checkParams);
			contentAssist.setProviders([ provider ]);
			contentAssist.activate();
		});
		return deferred;
	}

	/**
	 * Sets up a dummy editorContextProvider on the contentAssist so we can test the Orion 5.0+ API.
	 */
	function setEditorContextProvider(contentAssist) {
		var mockEditorContext = {
			foo: function() {}
		};
		contentAssist.setEditorContextProvider({
			getEditorContext: function() {
				return mockEditorContext;
			},
			getOptions: function() {
				return {
					__contributed: "blort"
				};
			}
		});
	}

	/**
	 * Like assertProviderInvoked(), but tests the v4 content assist API.
	 */
	function assertProviderInvoked_v4(text, providerCallback) {
		var deferred = new Deferred();
		withData(function(view, contentAssist) {
			var expectedOffset = setText(view, text);
			text = text.replace('@@@', '');
			var expectedLine = view.getModel().getLine(view.getModel().getLineAtOffset(expectedOffset));
			var expectedPrefix = getContentAssistPrefix(view, expectedOffset);

			var checkParams = function(editorContext, context) {
				try {
					assert.equal(typeof editorContext.foo, "function");
					assert.equal(context.offset, expectedOffset);
					assert.equal(context.line, expectedLine);
					assert.equal(context.prefix, expectedPrefix);
					assert.equal(context.selection.start, expectedOffset);
					assert.equal(context.selection.end, expectedOffset);
					assert.equal(context.__contributed, "blort");
					deferred.resolve();
				} catch (e) {
					deferred.reject(e);
				}
			};

			var provider = providerCallback(checkParams);
			setEditorContextProvider(contentAssist);
			contentAssist.setProviders([ provider ]);
			contentAssist.activate();
		});
		return deferred;
	}

	/*****************************************************************************
	 * 
	 * Filtering helpers
	 * 
	 *****************************************************************************/

	function filterTestImpl(delayMS) {
		var init = new Deferred(),
			first = new Deferred(),
		    second = new Deferred(),
		    compute = new Deferred(),
		    deferred = Deferred.all([init, first, second, compute]);
		withData(function(view, contentAssist) {
			setText(view, 'foo @@@');
			var provider = {
				computeProposals: function() {
					return [{proposal: "b"}, {proposal: "ba"}, {proposal: "ab"}];
				}
			};
			
			var initialComputedEvent = function(event) {
				try {
					assert.strictEqual("foo ", view.getText());
					assert.strictEqual(view.getCaretOffset(), view.getModel().getCharCount());
					var numUnselectable = event.data.proposals.reduce(function(previous, current){
						if (current.unselectable) {
							previous++;
						}
						return previous;
					}, 0);
					assert.strictEqual(3, event.data.proposals.length - numUnselectable); // applicable proposals: "b", "ba", "ab"
					
					if (delayMS) {
						window.setTimeout(function(){
							init.resolve();
						}, delayMS);
					} else {
						init.resolve();
					}
					
				} catch (e) {
					init.reject(e); 
				}
			};
			
			var firstFilter = function(event) {
				try {
					assert.strictEqual("foo b", view.getText());
					assert.strictEqual(view.getCaretOffset(), view.getModel().getCharCount());
					assert.strictEqual(2, event.data.proposals.length); // applicable proposals: "b", "ba"
					if (delayMS) {
						window.setTimeout(function(){
							first.resolve();
						}, delayMS);
					} else {
						first.resolve();
					}
				} catch (e) {
					first.reject(e); 
				}
			};
			
			var secondFilter = function(event) {
				try {
					assert.strictEqual("foo ba", view.getText());
					assert.strictEqual(view.getCaretOffset(), view.getModel().getCharCount());
					assert.strictEqual(1, event.data.proposals.length); // applicable proposals: "b"
					second.resolve();
					compute.resolve(); //all passed
				} catch (e) {
					second.reject(e); 
				}
			};
			
			contentAssist.setProviders([ provider ]);
			contentAssist.addEventListener('ProposalsComputed', initialComputedEvent);
			contentAssist.activate();

			// ensure computeProposals is no longer called, 
			// filtering should be done internally by contentAssist
			provider.computeProposals = function(buffer, actualOffset, context) {
				compute.reject(new Error("should not be called"));
			};
			
			
			init.then(function() {
				// 'foo '
				contentAssist.removeEventListener('ProposalsComputed', initialComputedEvent);
				contentAssist.addEventListener('ProposalsComputed', firstFilter);

				// Start filtering
				// 'foo b'
				if (delayMS) {
					window.setTimeout(function(){
						view._handleKeyPress(createKeyPressEvent('b'));
					}, delayMS);
				} else {
					view._handleKeyPress(createKeyPressEvent('b'));
				}
			});
			first.then(function() {
				// Continue filtering
				// 'foo ba'
				contentAssist.removeEventListener('ProposalsComputed', firstFilter);
				contentAssist.addEventListener('ProposalsComputed', secondFilter);

				// continue filtering
				// 'foo a'
				if (delayMS) {
					window.setTimeout(function(){
						view._handleKeyPress(createKeyPressEvent('a'));
					}, delayMS);
				} else {
					view._handleKeyPress(createKeyPressEvent('a'));
				}
			});
		});
		return deferred;
	}

	function testFiltering2() {
		var init = new Deferred(),
			first = new Deferred(),
		    second = new Deferred(),
		    third = new Deferred(),
		    fourth = new Deferred(),
		    fifth = new Deferred(),
		    deferred = Deferred.all([init, first, second, third, fourth, fifth]);
		var view = getNewView();
		var contentAssist = getNewContentAssist(view);
		var dummyNode = document.createElement("div");
		var contentAssistWidget = new ContentAssistWidget(contentAssist, dummyNode);
		contentAssistWidget.selectNode = function(){}; //override selectNode() since we aren't testing it here
		// creating a mode so that deactivation is triggered by it
		var contentAssistMode = new ContentAssistMode(contentAssist, contentAssistWidget);
		var delayMS = 10;
		
		setText(view, 'foo @@@');
		var expectedText = "foo ";
		
		var provider = {
			computeProposals: function(buffer, actualOffset, context) {
				return undefined;
			}
		};
		
		var provider2 = {
			computeProposals: function(buffer, actualOffset, context) {
				return [{proposal: "b"}, {proposal: "baa"}, {proposal: "ab"}];
			}
		};
		
		var provider3 = {
			computeProposals: function(buffer, actualOffset, context) {
				return [undefined];
			}
		};
		
		contentAssist.setProviders([ provider, provider2, provider3 ]);

		function proposalsComputedListener(boundUserArgs, event) {
			var boundDeferred = boundUserArgs.boundDeferred;
			try {
				contentAssist.removeEventListener('ProposalsComputed', boundUserArgs.currentFunction);
				assert.strictEqual(expectedText, view.getText());
				assert.strictEqual(view.getCaretOffset(), view.getModel().getCharCount());
				var numUnselectable = event.data.proposals.reduce(function(previous, current){
					if (current.unselectable) {
						previous++;
					}
					return previous;
				}, 0);
				assert.strictEqual(boundUserArgs.expectedNumProposals, event.data.proposals.length - numUnselectable);
				if (delayMS) {
					window.setTimeout(function(){
						boundDeferred.resolve();
					}, delayMS);
				} else {
					boundDeferred.resolve();
				}
			} catch (e) {
				boundDeferred.reject(e); 
			}
		}
		
		function addProposalsComputedListener(boundDeferred, expectedNumProposals) {
			var boundUserArgs = {
				boundDeferred: boundDeferred,
				expectedNumProposals: expectedNumProposals
			};
			boundUserArgs.currentFunction = proposalsComputedListener.bind(this, boundUserArgs);
			contentAssist.addEventListener('ProposalsComputed', boundUserArgs.currentFunction);
		}
		
		addProposalsComputedListener(init, 3);
		contentAssist.activate();
		
		init.then(function() {
			expectedText = "foo b";
			addProposalsComputedListener(first, 2);

			// Start filtering
			// 'foo b'
			if (delayMS) {
				window.setTimeout(function(){
					view._handleKeyPress(createKeyPressEvent('b'));
				}, delayMS);
			} else {
				view._handleKeyPress(createKeyPressEvent('b'));
			}
		});
		
		first.then(function() {
			// Continue filtering
			// 'foo ba'
			expectedText = "foo ba";
			addProposalsComputedListener(second, 1);
			
			if (delayMS) {
				window.setTimeout(function(){
					view._handleKeyPress(createKeyPressEvent('a'));
				}, delayMS);
			} else {
				view._handleKeyPress(createKeyPressEvent('a'));
			}
		});
		
		function deactivatingHandler(){
			contentAssist.removeEventListener('Deactivating', deactivatingHandler);
			third.resolve();
			window.setTimeout(function(){
				third.resolve();
			}, 500);
		}
		
		second.then(function(){
			contentAssist.addEventListener('Deactivating', deactivatingHandler);
			
			view._handleKeyPress(createKeyPressEvent('x'));
		});

		third.then(function(){
			setText(view, 'foo b@@@');
			expectedText = "foo b";
			addProposalsComputedListener(fourth, 3);
			
			provider.computeProposals = function(buffer, actualOffset, context) {
				return [undefined];
			};
			
			provider2.computeProposals = function(buffer, actualOffset, context) {
				return [{proposal: "aa"}];
			};
			
			provider3.computeProposals = function(buffer, actualOffset, context) {
				return [{proposal: "ab"}, {proposal: "za"}];
			};
			
			contentAssist.activate();	
		});
		
		fourth.then(function(){
			// Continue filtering
			// 'foo ba'
			expectedText = "foo ba";
			addProposalsComputedListener(fifth, 2);
			
			if (delayMS) {
				window.setTimeout(function(){
					view._handleKeyPress(createKeyPressEvent('a'));
				}, delayMS);
			} else {
				view._handleKeyPress(createKeyPressEvent('a'));
			}
		});
		
		return deferred;
	}

}); //define