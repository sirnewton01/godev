/*global define*/
define(['orion/editor/textModel'], function(mTextModel) {
	function _dbgEvent(e) {
//		var r = [];
//		for (var p in e) {
//			if (e.hasOwnProperty(p) && p !== "text") {
//				r.push(p + ": " + e[p]);
//			}
//		}
//		console.debug( r.join(", ") );
	}
	
	/**
	 * @name orion.editor.MirrorTextModel
	 * @class An implementation of {@link orion.textview.TextModel} that keeps its text content in sync with another <code>TextModel</code>'s.
	 * @extends orion.textview.TextModel
	 */
	function MirrorTextModel() {
	}
	MirrorTextModel.prototype = new mTextModel.TextModel();
	// Called when the TextModel we're mirroring has dispatched a ModelChanging event.
	MirrorTextModel.prototype.onTargetModelChanging = function(e) {
		_dbgEvent(e);
		var end = e.start + e.removedCharCount;
		end = Math.min(end, this.getCharCount());
		end = Math.max(end, e.start);
		this.setText(e.text, e.start, end); // Superclass TextModel will dispatch Changing and Changed events.
											// TODO we should make this explicit.
	};
	
	return {MirrorTextModel: MirrorTextModel};
});