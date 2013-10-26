/*jslint browser:true*/
/*global define */
define(['orion/editor/mirror', 'orion/editor/eventTarget'], function(mMirror, mEventTarget) {
	
	/**
	 * This listens to highlight results obtained from the ModeApplier, does a small bit of mediation on the result,
	 * then dispatches a SendStyle event containing the results. The SendStyle event payload conforms to the 
	 * orion.editor.AsyncStyler API.
	 */
	function Highlighter(model, codeMirror) {
		this.model = model;
		this.codeMirror = codeMirror;
		this.modeApplier = new mMirror.ModeApplier(model, codeMirror);
		this.initialize(model);
	}
	Highlighter.prototype = {
		/** @private */
		initialize: function(model) {
			var self = this;
			this.listener = {
				onDestroy: function(e) {
					self._onDestroy(e);
				},
				onHighlight: function(e) {
					self.sendStyle(e);
				}
			};
			this.model.addEventListener("Destroy", this.listener.onDestroy);
			this.modeApplier.addEventListener("Highlight", this.listener.onHighlight);
		},
		destroy: function() {
			if (this.model) {
				this.model.removeEventListener("Destroy", this.listener.onDestroy);
			}
			if (this.modeApplier) {
				this.modeApplier.removeEventListener("Highlight", this.listener.onHighlight);
				this.modeApplier.destroy();
			}
			this.listener = null;
			this.model = null;
			this.codeMirror = null;
			this.modeApplier = null;
		},
		setMode: function(mode) {
			this.modeApplier.setMode(mode, true /* immediately rehighlight */);
		},
		setViewportIndex: function(topIndex) {
			// See Bug 365128. We should tell the ModeApplier to give priority to the topIndex
			// to increase perceived parsing speed in the jump-to-end-of-large-file use case.
		},
		// TODO: chunk sending? var tooManyLines = (e.end - e.start) > MAX_LINES_PER_PASS;
		sendStyle: function(e) {
			var start = e.start, end = e.end;
			var modeApplier = this.modeApplier, lines = modeApplier.getLineStyles();
			if (start < Number.MAX_VALUE && end > -1) { // TODO this check is probably redundant
				var style = {};
				for (var i=start; i <= end; i++) {
					var lineIndex = i, line = lines[lineIndex];
					var rangesErrors = line && modeApplier.toStyleRangesAndErrors(line /*omit 2nd param to get line-relative indices*/);
					if (rangesErrors) {
						var ranges = rangesErrors[0], errors = rangesErrors[1];
						var obj = {}, hasAnything = false;
						if (ranges && ranges.length) {
							obj.ranges = ranges;
							style[i] = obj;
							hasAnything = true;
						}
						if (errors && errors.length) {
							obj.errors = errors;
							style[i] = obj;
							hasAnything = true;
						}
						if (!hasAnything) {
							style[i] = null;
						}
					}
				}
				var event = {
					type: "StyleReady",
					lineStyles: style
				};
				this.dispatchEvent(event);
			}
//			console.debug("Fired " + (end - start) + " lines [" + start + ".." + end + "]");
		}
	};
	mEventTarget.EventTarget.addMixin(Highlighter.prototype);

	return {
		Highlighter: Highlighter
	};
});